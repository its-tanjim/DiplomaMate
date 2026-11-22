import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Clock, 
  Volume2, 
  ShieldCheck, 
  UserCheck, 
  RotateCcw, 
  RefreshCw,
  HelpCircle, 
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  Smartphone,
  CheckCircle2,
  FolderDown,
  GraduationCap
} from 'lucide-react';
import { Shift, Section, AccountType } from '../../types';
import { nativeService } from '../../services/nativeService';
import { ReminderLeadTimeSlider } from '../common/ReminderLeadTimeSlider';
import {
  clearDismissedTag,
  currentVersionLabel,
  fetchLatestRelease
} from '../../services/appUpdateService';

export const SettingsScreen: React.FC = () => {
  const { 
    notifications, 
    updateNotifications, 
    userProfile, 
    setUserProfile, 
    accountType, 
    setAccountType,
    resetAllData,
    showToast,
    setActiveScreen
  } = useApp();

  const platformInfo = nativeService.getPlatformInfo();
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Manual update check (Android app only — the web version updates itself
  // through the Render deploy). Opens the new APK download when one exists.
  const handleManualUpdateCheck = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const info = await fetchLatestRelease();
      if (!info) {
        showToast('Could not check for updates. Please try again later.');
      } else if (!info.available) {
        showToast(`You are on the latest version (${currentVersionLabel()}).`);
      } else if (info.downloadUrl) {
        clearDismissedTag();
        showToast(`Update ${info.tag} available — opening download…`);
        try {
          await nativeService.openExternalUrl(info.downloadUrl);
        } catch {
          window.open(info.downloadUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        showToast(`Update ${info.tag} is available.`);
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
            <SettingsIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">Settings & Preferences</h1>
            <p className="text-xs text-slate-500">Configure notifications, academic shift & student role</p>
          </div>
        </div>
      </div>

      {/* Account Type Card (Strict Role Separation) */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              accountType === 'teacher' ? 'bg-blue-50 text-blue-700' : accountType === 'class_captain' ? 'bg-teal-50 text-brand-teal' : 'bg-blue-50 text-brand-blue'
            }`}>
              {accountType === 'teacher' ? <GraduationCap className="w-4 h-4" /> : accountType === 'class_captain' ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Account Role</h2>
              <p className="text-[11px] text-slate-500">Security-enforced institutional identity</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            {accountType === 'teacher' ? 'Faculty Member' : accountType === 'class_captain' ? 'Class Captain (CR)' : 'General Student'}
          </span>
        </div>

        <p className="text-xs text-slate-600">
          {accountType === 'teacher' 
            ? `Signed in as faculty (${userProfile.designation || 'Instructor'}). You have administrative authority to verify captains, inspect rosters, and broadcast notices.`
            : accountType === 'class_captain'
              ? `Signed in as verified Class Captain for Section ${userProfile.section}. You have publishing rights for routine updates and study materials.`
              : 'Signed in as general diploma student. To obtain Class Captain privileges, submit an application verified by your guide teacher.'}
        </p>
      </div>

      {/* Notification Preferences */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Bell className="w-4 h-4 text-brand-blue" />
          <div>
            <h2 className="text-sm font-bold text-text-primary">Notification Preferences</h2>
            <p className="text-[11px] text-slate-500">Manage real-time class alerts and schedule notifications</p>
          </div>
        </div>

        {/* Routine Alerts Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-text-primary block">Class Routine Reminder</span>
            <span className="text-[11px] text-slate-500">Alert before each scheduled class period starts</span>
          </div>
          <button
            type="button"
            onClick={() => updateNotifications({ routineAlerts: !notifications.routineAlerts })}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              notifications.routineAlerts ? 'bg-brand-blue' : 'bg-slate-300'
            }`}
          >
            <div className={`bg-surface w-4 h-4 rounded-full shadow-md transform transition-transform ${
              notifications.routineAlerts ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Reusable Reminder Lead Time Slider */}
        {notifications.routineAlerts && (
          <ReminderLeadTimeSlider
            value={notifications.routineLeadMinutes}
            onChange={(mins) => updateNotifications({ routineLeadMinutes: mins })}
            label="Alert Lead Time Before Period"
            helperText="Set how many minutes before the class bell rings to trigger audio and visual alerts"
          />
        )}

        {/* Assignment Alerts Toggle */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div>
            <span className="text-xs font-bold text-text-primary block">Assignment Due Warnings</span>
            <span className="text-[11px] text-slate-500">Notify 24 hours before assignment deadline</span>
          </div>
          <button
            type="button"
            onClick={() => updateNotifications({ assignmentAlerts: !notifications.assignmentAlerts })}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              notifications.assignmentAlerts ? 'bg-brand-blue' : 'bg-slate-300'
            }`}
          >
            <div className={`bg-surface w-4 h-4 rounded-full shadow-md transform transition-transform ${
              notifications.assignmentAlerts ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* CR Announcements Alert */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div>
            <span className="text-xs font-bold text-text-primary block">Class Captain Announcements</span>
            <span className="text-[11px] text-slate-500">High priority notice broadcasts for Section {userProfile.section}</span>
          </div>
          <button
            type="button"
            onClick={() => updateNotifications({ crAnnouncements: !notifications.crAnnouncements })}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              notifications.crAnnouncements ? 'bg-brand-teal' : 'bg-slate-300'
            }`}
          >
            <div className={`bg-surface w-4 h-4 rounded-full shadow-md transform transition-transform ${
              notifications.crAnnouncements ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* BTEB Board Notices */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div>
            <span className="text-xs font-bold text-text-primary block">BTEB Board Examination Notices</span>
            <span className="text-[11px] text-slate-500">Form fill-up, admit cards & board final schedules</span>
          </div>
          <button
            type="button"
            onClick={() => updateNotifications({ btebNotices: !notifications.btebNotices })}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              notifications.btebNotices ? 'bg-brand-blue' : 'bg-slate-300'
            }`}
          >
            <div className={`bg-surface w-4 h-4 rounded-full shadow-md transform transition-transform ${
              notifications.btebNotices ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Sound & Vibration */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-xs font-bold text-text-primary block">Sound & Vibration</span>
              <span className="text-[11px] text-slate-500">Play pleasant chime on reminder triggers</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateNotifications({ soundVibration: !notifications.soundVibration })}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              notifications.soundVibration ? 'bg-brand-blue' : 'bg-slate-300'
            }`}
          >
            <div className={`bg-surface w-4 h-4 rounded-full shadow-md transform transition-transform ${
              notifications.soundVibration ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* Academic Shift & Section Selector */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
          Class Shift & Section Setup
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Active Shift</label>
            <select
              value={userProfile.shift}
              onChange={(e) => {
                const shift = e.target.value as Shift;
                setUserProfile(prev => ({ ...prev, shift }));
                showToast(`Shift updated to ${shift}`);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary font-medium"
            >
              <option value="Morning">Morning (১ম শিফট: 8am - 1pm)</option>
              <option value="Day">Day (২য় শিফট: 1:30pm - 6:45pm)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Class Section</label>
            <select
              value={userProfile.section}
              onChange={(e) => {
                const section = e.target.value as Section;
                setUserProfile(prev => ({ ...prev, section }));
                showToast(`Section updated to Section ${section}`);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-text-primary font-medium"
            >
              <option value="A1">Section A1</option>
              <option value="B1">Section B1</option>
              <option value="A2">Section A2</option>
              <option value="B2">Section B2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Android Native Features & Capacitor Card */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Android Native Integration</h2>
              <p className="text-[11px] text-slate-500">Capacitor 6 Android Bridge & System Permissions</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
            {platformInfo.isNative ? 'Native Android' : 'Android Ready (Web)'}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
            <div>
              <span className="font-semibold text-slate-800 block">Package ID:</span>
              <span className="text-[11px] font-mono text-slate-500">bd.gov.bteb.diplomamate</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-800 block">Status Bar Color:</span>
              <span className="text-[11px] font-mono text-brand-blue">#2563EB (Primary Blue)</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
            <div>
              <span className="font-semibold text-slate-800 block">Offline Document Storage:</span>
              <span className="text-[11px] text-slate-500">Scoped Documents Directory (/Download)</span>
            </div>
            <FolderDown className="w-4 h-4 text-slate-400" />
          </div>

          <div className="pt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={async () => {
                const granted = await nativeService.requestNotificationPermission();
                showToast(granted ? 'Notification permissions granted!' : 'Permission status checked.');
              }}
              className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-slate-500" />
              <span>Request Perms</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await nativeService.schedulePeriodAlert({
                  id: 'test_period',
                  day: 'Saturday',
                  periodNumber: 1,
                  startTime: '08:00 AM',
                  endTime: '08:45 AM',
                  subjectCode: '66661',
                  subjectName: 'Web Development Project',
                  teacherName: 'Engr. Md. Rafiqul Islam',
                  room: 'Software Lab 402',
                  type: 'Theory',
                  shift: 'Morning',
                  section: 'A1'
                }, 15);
                showToast('🔔 Android test notification scheduled (fires in 5s)!');
              }}
              className="py-2 px-3 rounded-xl bg-blue-50 border border-blue-200 text-brand-blue hover:bg-blue-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Test Period Alert</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reset Data Option */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-text-primary">Reset Local Demo Data</h3>
          <p className="text-[11px] text-slate-500">Reset routine and remove legacy notes, assignments, reminders, and teacher contacts</p>
        </div>
        <button
          onClick={resetAllData}
          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* App Update (Android app only) */}
      {platformInfo.isNative && (
        <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-text-primary">App Update</h3>
            <p className="text-[11px] text-slate-500">Current version {currentVersionLabel()} — check for a newer build</p>
          </div>
          <button
            onClick={() => void handleManualUpdateCheck()}
            disabled={checkingUpdate}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{checkingUpdate ? 'Checking…' : 'Check'}</span>
          </button>
        </div>
      )}

      {/* About Applet */}
      <div className="p-4 bg-slate-100/70 rounded-2xl text-center space-y-1 text-slate-500 text-xs">
        <div className="font-bold text-text-primary">DiplomaMate {currentVersionLabel()}</div>
        <p className="text-[11px]">
          Dedicated companion for 4-Year Diploma in Engineering students under Bangladesh Technical Education Board (BTEB).
        </p>
      </div>
    </div>
  );
};
