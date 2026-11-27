import { Capacitor } from '@capacitor/core';
import { ADMIN_VERSION_CODE, ADMIN_VERSION_NAME } from '../config/adminAppVersion';

// Admin in-app update checker (v1.0.24). Mirrors the main app's checker
// (src/services/appUpdateService.ts), but the admin APK has no GitHub
// release, so the ONLY source is the small JSON file committed to the
// repo: releases/admin-latest.json, read from raw.githubusercontent.com
// (no API rate limit, no login). Every admin release must update
// releases/admin-latest.json to match the new version. The checker never
// offers the main-app APK — the download URL in admin-latest.json always
// points at the admin APK file under releases/.

const ADMIN_LATEST_JSON_URL =
  'https://raw.githubusercontent.com/its-tanjim/DiplomaMate/main/releases/admin-latest.json';
const LAST_CHECK_KEY = 'diplomamate_admin_update_last_check';
const DISMISSED_TAG_KEY = 'diplomamate_admin_update_dismissed_tag';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface AdminUpdateInfo {
  available: boolean;
  latestCode: number;
  tag: string;
  downloadUrl: string | null;
}

export async function fetchLatestAdminRelease(): Promise<AdminUpdateInfo | null> {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    const res = await fetch(ADMIN_LATEST_JSON_URL, { signal: controller.signal });
    window.clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    const versionCode = Number(data.versionCode);
    const tag = String(data.tag || '');
    if (!Number.isInteger(versionCode) || versionCode <= 0 || !tag) return null;
    const downloadUrl =
      typeof data.downloadUrl === 'string' && data.downloadUrl
        ? data.downloadUrl
        : `https://raw.githubusercontent.com/its-tanjim/DiplomaMate/main/releases/DiplomaMate-Admin-v1.0.${versionCode}-debug.apk`;
    return {
      available: versionCode > ADMIN_VERSION_CODE,
      latestCode: versionCode,
      tag,
      downloadUrl
    };
  } catch {
    return null;
  }
}

// Automatic check: native Android only, at most once a day. On the web
// the admin panel updates itself through the Worker deploy, so no check
// is needed.
export async function checkForAdminAppUpdateAuto(): Promise<AdminUpdateInfo | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    if (Date.now() - last < CHECK_INTERVAL_MS) return null;
  } catch {
    // Storage unavailable — still check.
  }
  const info = await fetchLatestAdminRelease();
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors.
  }
  return info;
}

export function isAdminTagDismissed(tag: string): boolean {
  try {
    return localStorage.getItem(DISMISSED_TAG_KEY) === tag;
  } catch {
    return false;
  }
}

export function dismissAdminTag(tag: string): void {
  try {
    localStorage.setItem(DISMISSED_TAG_KEY, tag);
  } catch {
    // Ignore storage errors.
  }
}

export function clearAdminDismissedTag(): void {
  try {
    localStorage.removeItem(DISMISSED_TAG_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function currentAdminVersionLabel(): string {
  return `v${ADMIN_VERSION_NAME} (build ${ADMIN_VERSION_CODE})`;
}
