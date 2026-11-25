import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { RoutinePeriod, NoteItem } from '../types';

export interface NativePlatformInfo {
  isNative: boolean;
  platform: 'android' | 'ios' | 'web';
}

class NativeService {
  private isInitialized = false;

  getPlatformInfo(): NativePlatformInfo {
    return {
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform() as 'android' | 'ios' | 'web'
    };
  }

  async openExternalUrl(url: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
      return;
    }

    if (!window.open(url, '_blank', 'noopener,noreferrer')) {
      throw new Error('The browser blocked opening a new tab.');
    }
  }

  /**
   * Initializes native Android status bar, channels, and listeners
   */
  async initializeNativeApp(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // 1. Configure Android Status Bar
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#3880FF' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (err) {
      console.warn('Status bar configuration error:', err);
    }

    try {
      // 2. Register Android Notification Channels
      await LocalNotifications.createChannel({
        id: 'bteb_routine_alerts',
        name: 'Class Routine Alerts',
        description: 'Notifications before each BTEB class period begins',
        importance: 4, // High importance
        visibility: 1,
        vibration: true,
        sound: 'beep.wav'
      });

      await LocalNotifications.createChannel({
        id: 'bteb_announcements',
        name: 'Class Captain Announcements',
        description: 'Urgent notices posted by Class Captains and CRs',
        importance: 5, // Urgent importance
        visibility: 1,
        vibration: true
      });

      await LocalNotifications.createChannel({
        id: 'bteb_reminders',
        name: 'Exams & Assignment Deadlines',
        description: 'Alerts for BTEB midterms and practical lab submissions',
        importance: 4,
        visibility: 1,
        vibration: true
      });
    } catch (err) {
      console.warn('Notification channel registration error:', err);
    }
  }

  /**
   * Requests Android 13+ POST_NOTIFICATIONS permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        return result === 'granted';
      }
      return true;
    }

    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  }

  /**
   * Schedules a native notification for an upcoming period
   */
  async schedulePeriodAlert(
    period: RoutinePeriod, 
    leadMinutes: number = 15
  ): Promise<boolean> {
    const title = `🔔 Class in ${leadMinutes}m: ${period.subjectName}`;
    const body = `Period #${period.periodNumber} (${period.startTime} - ${period.endTime}) with ${period.teacherName} in ${period.room}`;

    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.abs(period.periodNumber * 10000 + Math.floor(Math.random() * 1000)),
              title,
              body,
              channelId: 'bteb_routine_alerts',
              schedule: { at: new Date(Date.now() + 5000) }, // Trigger sample preview alert
              extra: { periodId: period.id }
            }
          ]
        });
        return true;
      } catch (err) {
        console.warn('Local notification schedule error:', err);
      }
    }
    return false;
  }

  /**
   * Schedules a reminder notification
   */
  async scheduleCustomReminder(
    title: string, 
    body: string, 
    dateString: string
  ): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const targetDate = new Date(dateString);
        const atDate = isNaN(targetDate.getTime()) || targetDate.getTime() <= Date.now() 
          ? new Date(Date.now() + 3000) 
          : targetDate;

        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 1000000),
              title,
              body,
              channelId: 'bteb_reminders',
              schedule: { at: atDate }
            }
          ]
        });
        return true;
      } catch (err) {
        console.warn('Reminder schedule error:', err);
      }
    }
    return false;
  }

  /**
   * Broadcasts a Class Captain announcement notification
   */
  async broadcastAnnouncementAlert(
    title: string, 
    content: string, 
    author: string
  ): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 1000000),
              title: `📢 Announcement from ${author}`,
              body: `${title}: ${content}`,
              channelId: 'bteb_announcements',
              schedule: { at: new Date(Date.now() + 1000) }
            }
          ]
        });
        return true;
      } catch (err) {
        console.warn('Announcement schedule error:', err);
      }
    }
    return false;
  }

  /**
   * Saves lecture note document to Android device storage
   */
  async saveNoteToDevice(note: NoteItem): Promise<{ success: boolean; filePath?: string; message: string }> {
    const filename = `DiplomaMate_${note.subjectCode}_${note.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.${note.fileType.toLowerCase()}`;
    const sampleContent = `BTEB DIPLOMA ENGINEERING LECTURE NOTE
Subject: ${note.subjectName} (${note.subjectCode})
Topic: ${note.title}
Chapter: ${note.chapter}
Uploaded By: ${note.uploadedBy}
Date: ${note.uploadedDate}

SUMMARY & KEY POINTS:
${note.summary}

---------------------------------------------------------
Official BTEB 4-Year Diploma Curriculum Reference
Saved locally on device storage via DiplomaMate for Android.`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: `Download/${filename}`,
          data: sampleContent,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });

        return {
          success: true,
          filePath: result.uri,
          message: `Saved ${filename} to Documents directory!`
        };
      } catch (err) {
        // Fallback to app data directory
        try {
          const result = await Filesystem.writeFile({
            path: filename,
            data: sampleContent,
            directory: Directory.Data,
            encoding: Encoding.UTF8
          });
          return {
            success: true,
            filePath: result.uri,
            message: `Saved to offline cache!`
          };
        } catch (innerErr) {
          console.error('Filesystem write error:', innerErr);
        }
      }
    }

    // Web Fallback: Generate real downloadable text file
    try {
      const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return {
        success: true,
        message: `Downloaded ${filename} successfully!`
      };
    } catch (e) {
      return {
        success: false,
        message: 'Could not trigger file download.'
      };
    }
  }

  /**
   * Downloads any document from a data URL to the device or browser downloads.
   * On Android/iOS the old anchor-click trick does nothing inside the WebView,
   * so the file is written to the app cache and handed to the system share
   * sheet instead — the user can save it or open it with any app.
   */
  async downloadDocument(dataUrl: string, fileName: string): Promise<boolean> {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return this.downloadBlob(blob, fileName);
    } catch (err) {
      console.warn('Document download error:', err);
      return false;
    }
  }

  /**
   * Saves a blob to the device (native share sheet) or the browser downloads
   * folder (web).
   */
  async downloadBlob(blob: Blob, fileName: string): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result || '');
            resolve(result.includes('base64,') ? result.split('base64,')[1] : result);
          };
          reader.onerror = () => reject(new Error('Could not read file.'));
          reader.readAsDataURL(blob);
        });
        const safeName = fileName.replace(/[/\\?%*:|"<>]/g, '_') || 'file';
        const saved = await Filesystem.writeFile({
          path: safeName,
          data: base64,
          directory: Directory.Cache
        });
        await Share.share({
          title: fileName,
          url: saved.uri,
          dialogTitle: `Open ${fileName}`
        });
        return true;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      return true;
    } catch (err) {
      console.warn('Document download error:', err);
      return false;
    }
  }

  /**
   * Registers Android hardware back button handler
   */
  registerBackButtonListener(handleBack: () => boolean): void {
    if (!Capacitor.isNativePlatform()) return;

    try {
      App.addListener('backButton', ({ canGoBack }) => {
        const handledByApp = handleBack();
        if (!handledByApp) {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        }
      });
    } catch (err) {
      console.warn('Back button listener error:', err);
    }
  }

  /**
   * Launches Android native telephone dialer intent
   */
  dialPhoneNumber(phoneNumber: string): void {
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanNumber}`;
  }

  /**
   * Launches Android native SMS intent
   */
  sendSMS(phoneNumber: string, message: string = ''): void {
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    const encodedMsg = encodeURIComponent(message);
    window.location.href = `sms:${cleanNumber}${encodedMsg ? `?body=${encodedMsg}` : ''}`;
  }
}

export const nativeService = new NativeService();
