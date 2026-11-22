import { Capacitor } from '@capacitor/core';
import { APP_VERSION_CODE, APP_VERSION_NAME } from '../config/appVersion';

// In-app update checker. The latest APK is published as a GitHub Release
// (tag v1.0.<build>, APK attached as an asset). The app asks the public
// GitHub Releases API for the latest release and compares its build number
// with this binary's build number. No login or token is needed — the repo
// is public — and a failed check simply returns null so the app never
// breaks because an update could not be checked.

const LATEST_RELEASE_URL =
  'https://api.github.com/repos/its-tanjim/DiplomaMate/releases/latest';
const LAST_CHECK_KEY = 'diplomamate_update_last_check';
const DISMISSED_TAG_KEY = 'diplomamate_update_dismissed_tag';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface AppUpdateInfo {
  available: boolean;
  latestCode: number;
  tag: string;
  downloadUrl: string | null;
  notes: string;
}

export function parseReleaseTag(tag: string): number | null {
  const match = /v?1\.0\.(\d+)\s*$/.exec(tag.trim());
  return match ? Number(match[1]) : null;
}

export async function fetchLatestRelease(): Promise<AppUpdateInfo | null> {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    const res = await fetch(LATEST_RELEASE_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' }
    });
    window.clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    const latestCode = parseReleaseTag(String(data.tag_name || ''));
    if (latestCode === null) return null;
    const apk = Array.isArray(data.assets)
      ? data.assets.find(
          (asset: any) =>
            typeof asset?.name === 'string' && asset.name.endsWith('.apk')
        )
      : null;
    return {
      available: latestCode > APP_VERSION_CODE,
      latestCode,
      tag: String(data.tag_name || ''),
      downloadUrl: apk?.browser_download_url || null,
      notes: String(data.body || '')
    };
  } catch {
    return null;
  }
}

// Automatic check: native Android only, at most once a day. On the web the
// app updates itself through the Render deploy, so no check is needed.
export async function checkForAppUpdateAuto(): Promise<AppUpdateInfo | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    if (Date.now() - last < CHECK_INTERVAL_MS) return null;
  } catch {
    // Storage unavailable — still check.
  }
  const info = await fetchLatestRelease();
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors.
  }
  return info;
}

export function isTagDismissed(tag: string): boolean {
  try {
    return localStorage.getItem(DISMISSED_TAG_KEY) === tag;
  } catch {
    return false;
  }
}

export function dismissTag(tag: string): void {
  try {
    localStorage.setItem(DISMISSED_TAG_KEY, tag);
  } catch {
    // Ignore storage errors.
  }
}

export function clearDismissedTag(): void {
  try {
    localStorage.removeItem(DISMISSED_TAG_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function currentVersionLabel(): string {
  return `v${APP_VERSION_NAME} (build ${APP_VERSION_CODE})`;
}
