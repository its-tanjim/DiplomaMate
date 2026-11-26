import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Download, ShieldAlert } from 'lucide-react';
import type { AppVersionControl } from '../../services/appConfigService';
import { evaluateVersionControl } from '../../services/appConfigService';
import { APP_VERSION_CODE, APP_VERSION_NAME } from '../../config/appVersion';
import { fetchLatestRelease } from '../../services/appUpdateService';
import { nativeService } from '../../services/nativeService';

// Mandatory full-screen update prompt. Shown only on native Android when
// the server's version control says this build is below minVersionCode
// with forceUpdate on. It blocks the whole app — there is no Later or
// dismiss. The Download button opens the server's updateUrl, or the
// release APK URL from the existing GitHub checker when updateUrl is
// empty. On the web the app updates itself through the deploy, so the
// prompt never appears there.
export const ForceUpdatePrompt: React.FC<{
  versionControl: AppVersionControl | null;
}> = ({ versionControl }) => {
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const result = evaluateVersionControl(versionControl);
  const forced = Capacitor.isNativePlatform() && result?.status === 'forced';

  useEffect(() => {
    if (!forced || versionControl?.updateUrl) return;
    let cancelled = false;
    (async () => {
      const release = await fetchLatestRelease();
      if (!cancelled && release?.downloadUrl) setFallbackUrl(release.downloadUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [forced, versionControl?.updateUrl]);

  if (!forced || !result) return null;

  const downloadUrl =
    versionControl?.updateUrl ||
    fallbackUrl ||
    `https://raw.githubusercontent.com/its-tanjim/DiplomaMate/main/releases/DiplomaMate-v1.0.${result.latestVersionCode}-debug.apk`;

  const downloadUpdate = async () => {
    try {
      await nativeService.openExternalUrl(downloadUrl);
    } catch {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-5"
    >
      <div className="bg-surface rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert aria-hidden="true" className="w-7 h-7" />
        </div>
        <div>
          <h2 id="force-update-title" className="text-lg font-bold text-text-primary">
            Update required to continue
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
            This version of DiplomaMate (v{APP_VERSION_NAME} · build {APP_VERSION_CODE}) is no
            longer supported. Please update to{' '}
            {result.latestVersionName
              ? `v${result.latestVersionName} (build ${result.latestVersionCode})`
              : `build ${result.latestVersionCode}`}{' '}
            to keep using the app.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void downloadUpdate()}
          className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download aria-hidden="true" className="w-4 h-4" />
          <span>Download Update</span>
        </button>
        <p className="text-[11px] text-slate-400">
          The download opens in your browser — install the APK once to update.
        </p>
      </div>
    </div>
  );
};
