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
// Fallback source: a small JSON file committed to the repo. The GitHub
// Releases API is unauthenticated (60 req/hour per IP) and fails on shared
// mobile IPs, so when it fails the app reads this file from
// raw.githubusercontent.com instead — raw file serving has no API rate
// limit. Every release must update releases/latest.json to match the new
// version (see the release habit doc).
const LATEST_JSON_URL =
  'https://raw.githubusercontent.com/its-tanjim/DiplomaMate/main/releases/latest.json';
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
    if (!res.ok) return fetchLatestReleaseFromRepoFile();
    const data = await res.json();
    const latestCode = parseReleaseTag(String(data.tag_name || ''));
    if (latestCode === null) return fetchLatestReleaseFromRepoFile();
    const apk = Array.isArray(data.assets)
      ? data.assets.find(
          (asset: any) =>
            typeof asset?.name === 'string' && asset.name.endsWith('.apk')
        )
      : null;
    // Download source: the attached release asset when there is one,
    // otherwise the APK file committed to the repo under releases/
    // (release assets need uploads.github.com, which the GitHub token
    // used for publishing does not cover — the repo file is the reliable
    // path, and the release tag is the version marker).
    const downloadUrl =
      apk?.browser_download_url ||
      `https://raw.githubusercontent.com/its-tanjim/DiplomaMate/main/releases/DiplomaMate-v1.0.${latestCode}-debug.apk`;
    return {
      available: latestCode > APP_VERSION_CODE,
      latestCode,
      tag: String(data.tag_name || ''),
      downloadUrl,
      notes: String(data.body || '')
    };
  } catch {
    return fetchLatestReleaseFromRepoFile();
  }
}

// Fallback when the GitHub Releases API fails (e.g. its unauthenticated
// 60 req/hour per-IP rate limit on shared mobile IPs): read the small
// releases/latest.json file from raw.githubusercontent.com, which has no
// API rate limit. Returns null only when this source fails too.
async function fetchLatestReleaseFromRepoFile(): Promise<AppUpdateInfo | null> {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    const res = await fetch(LATEST_JSON_URL, { signal: controller.signal });
    window.clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    const versionCode = Number(data.versionCode);
    const tag = String(data.tag || '');
    if (!Number.isInteger(versionCode) || versionCode <= 0 || !tag) return null;
    const downloadUrl =
      typeof data.downloadUrl === 'string' && data.downloadUrl
        ? data.downloadUrl
        : `https://raw.githubusercontent.com/its-tanjim/DiplomaMate/main/releases/DiplomaMate-v1.0.${versionCode}-debug.apk`;
    return {
      available: versionCode > APP_VERSION_CODE,
      latestCode: versionCode,
      tag,
      downloadUrl,
      notes: ''
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
