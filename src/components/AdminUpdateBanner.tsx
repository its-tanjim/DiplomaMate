import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Download, RefreshCw, X } from 'lucide-react';
import {
  checkForAdminAppUpdateAuto,
  dismissAdminTag,
  isAdminTagDismissed,
  type AdminUpdateInfo
} from '../services/adminAppUpdateService';
import { nativeService } from '../services/nativeService';

// Admin update banner (v1.0.24): the admin app's own version of the main
// app's AppUpdateBanner. When a newer ADMIN APK is published (versionCode
// in releases/admin-latest.json above this binary's ADMIN_VERSION_CODE),
// the admin sees this once a day (per version) with a download button.
// The download opens in the system browser, which downloads the APK —
// the admin then taps it once to install over the old admin app. The
// banner NEVER offers the main-app APK: the source is admin-latest.json
// only, whose download URL always points at the admin APK.
export const AdminUpdateBanner: React.FC = () => {
  const [update, setUpdate] = useState<AdminUpdateInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Capacitor.isNativePlatform()) return;
      const info = await checkForAdminAppUpdateAuto();
      if (cancelled) return;
      if (info?.available && info.tag && !isAdminTagDismissed(info.tag)) {
        setUpdate(info);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update) return null;

  const downloadUpdate = async () => {
    if (!update.downloadUrl) return;
    try {
      await nativeService.openExternalUrl(update.downloadUrl);
    } catch {
      window.open(update.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dismiss = () => {
    dismissAdminTag(update.tag);
    setUpdate(null);
  };

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
          <RefreshCw aria-hidden="true" className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-teal-900">
            A new admin update is available — {update.tag}
          </p>
          <div className="flex flex-wrap gap-2 mt-2.5">
            <button
              type="button"
              onClick={() => void downloadUpdate()}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Download Update</span>
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="px-3.5 py-2 rounded-xl border border-teal-200 hover:bg-teal-100 text-teal-900 text-xs font-semibold cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="p-1.5 rounded-lg text-teal-700 hover:bg-teal-100 cursor-pointer shrink-0"
          aria-label="Dismiss"
          title="Dismiss"
        >
          <X aria-hidden="true" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
