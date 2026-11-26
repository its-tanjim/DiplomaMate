import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Download, RefreshCw, X } from 'lucide-react';
import {
  checkForAppUpdateAuto,
  dismissTag,
  fetchLatestRelease,
  isTagDismissed,
  type AppUpdateInfo
} from '../services/appUpdateService';
import { evaluateVersionControl, getAppConfig } from '../services/appConfigService';
import { nativeService } from '../services/nativeService';

// Global update banner: when a newer APK is published as a GitHub Release,
// the app tells the user once a day (per version) and offers the download.
// The download opens in the system browser, which downloads the APK —
// the user then taps it once to install, like any APK outside the Play
// Store. Android does not allow fully silent installs without the Play
// Store, so one tap is the closest an in-app checker can get.
//
// Server version control (GET /api/app-config) also feeds in, native only:
// below minVersionCode with forceUpdate the full-screen ForceUpdatePrompt
// blocks the app instead (this banner stays hidden); below minVersionCode
// without force the banner becomes a required prompt — no Later/dismiss.
export const AppUpdateBanner: React.FC = () => {
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);
  const [required, setRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Capacitor.isNativePlatform()) return;
      const [info, config] = await Promise.all([
        checkForAppUpdateAuto(),
        getAppConfig()
      ]);
      if (cancelled) return;
      const vc = evaluateVersionControl(config?.appVersionControl ?? null);
      if (vc && vc.status === 'forced') {
        // The full-screen prompt owns this case; no banner.
        return;
      }
      if (vc && vc.status === 'required') {
        // Strong prompt: prefer the GitHub release when it is newer,
        // otherwise build the prompt from the server version control.
        if (info?.available && info.downloadUrl) {
          setUpdate(info);
        } else {
          const release = await fetchLatestRelease();
          if (cancelled) return;
          setUpdate({
            available: true,
            latestCode: vc.latestVersionCode,
            tag: `v1.0.${vc.latestVersionCode}`,
            downloadUrl:
              vc.updateUrl ||
              release?.downloadUrl ||
              `https://raw.githubusercontent.com/its-tanjim/DiplomaMate/main/releases/DiplomaMate-v1.0.${vc.latestVersionCode}-debug.apk`,
            notes: ''
          });
        }
        setRequired(true);
        return;
      }
      if (info?.available && info.tag && !isTagDismissed(info.tag)) {
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
    dismissTag(update.tag);
    setUpdate(null);
  };

  if (required) {
    return (
      <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <RefreshCw aria-hidden="true" className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-900">
              Update required — {update.tag}
            </p>
            <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
              Your version is below the minimum supported version. Please update to keep using DiplomaMate.
            </p>
            <div className="flex flex-wrap gap-2 mt-2.5">
              <button
                type="button"
                onClick={() => void downloadUpdate()}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Download Update</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
          <RefreshCw aria-hidden="true" className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-teal-900">
            A new update is available — {update.tag}
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
