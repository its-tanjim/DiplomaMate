import { apiFetch } from './apiClient';
import { APP_VERSION_CODE } from '../config/appVersion';

// App config served by GET /api/app-config (public — no auth needed).
// Fetched once per session at boot and reused everywhere (maintenance
// banner, force-update gate, feature flags). A missing endpoint, a
// non-JSON answer (e.g. the SPA fallback) or any network error resolves
// to null so the app keeps its existing behaviour.

export interface AppVersionControl {
  minVersionCode: number;
  latestVersionCode: number;
  latestVersionName: string;
  forceUpdate: boolean;
  updateUrl: string;
}

export interface AppConfig {
  maintenanceMode: { enabled: boolean; message: string };
  featureFlags: Record<string, { enabled: boolean }>;
  appVersionControl: AppVersionControl;
}

export type VersionControlStatus = 'ok' | 'required' | 'forced';

export interface VersionControlResult {
  status: VersionControlStatus;
  minVersionCode: number;
  latestVersionCode: number;
  latestVersionName: string;
  forceUpdate: boolean;
  updateUrl: string;
}

const DEFAULT_CONFIG: AppConfig = {
  maintenanceMode: { enabled: false, message: '' },
  featureFlags: {},
  appVersionControl: {
    minVersionCode: 0,
    latestVersionCode: APP_VERSION_CODE,
    latestVersionName: '',
    forceUpdate: false,
    updateUrl: ''
  }
};

function normalizeConfig(raw: unknown): AppConfig {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const maintenance = (data.maintenanceMode && typeof data.maintenanceMode === 'object'
    ? data.maintenanceMode
    : {}) as Record<string, unknown>;
  const version = (data.appVersionControl && typeof data.appVersionControl === 'object'
    ? data.appVersionControl
    : {}) as Record<string, unknown>;
  const flags = (data.featureFlags && typeof data.featureFlags === 'object'
    ? data.featureFlags
    : {}) as Record<string, { enabled: boolean }>;
  return {
    maintenanceMode: {
      enabled: maintenance.enabled === true,
      message: typeof maintenance.message === 'string' ? maintenance.message : ''
    },
    featureFlags: flags,
    appVersionControl: {
      minVersionCode: Number(version.minVersionCode) || 0,
      latestVersionCode: Number(version.latestVersionCode) || APP_VERSION_CODE,
      latestVersionName: typeof version.latestVersionName === 'string' ? version.latestVersionName : '',
      forceUpdate: version.forceUpdate === true,
      updateUrl: typeof version.updateUrl === 'string' ? version.updateUrl : ''
    }
  };
}

let configPromise: Promise<AppConfig | null> | null = null;
let cachedConfig: AppConfig | null = null;

export function getAppConfig(): Promise<AppConfig | null> {
  if (!configPromise) {
    configPromise = (async () => {
      try {
        const res = await apiFetch('/api/app-config', {
          headers: { Accept: 'application/json' }
        });
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) return null;
        const data = await res.json();
        cachedConfig = normalizeConfig(data);
        return cachedConfig;
      } catch {
        return null;
      }
    })();
  }
  return configPromise;
}

/** Sync read of the config once getAppConfig() has resolved (null before that). */
export function getCachedAppConfig(): AppConfig | null {
  return cachedConfig;
}

export function isFeatureEnabled(config: AppConfig | null, key: string): boolean {
  return config?.featureFlags?.[key]?.enabled === true;
}

export function getDefaultAppConfig(): AppConfig {
  return DEFAULT_CONFIG;
}

/**
 * Compares this binary against the server's version control. Returns null
 * when there is no usable version-control block. Below minVersionCode the
 * update is 'forced' when the server says so, otherwise 'required'
 * (strong banner, no dismiss). At/above min the status is 'ok'.
 */
export function evaluateVersionControl(vc: AppVersionControl | null | undefined): VersionControlResult | null {
  if (!vc || !vc.minVersionCode) return null;
  if (APP_VERSION_CODE >= vc.minVersionCode) {
    return { status: 'ok', ...vc };
  }
  return { status: vc.forceUpdate ? 'forced' : 'required', ...vc };
}
