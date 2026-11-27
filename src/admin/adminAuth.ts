/**
 * Admin-only sign-in / first-admin bootstrap requests (A6).
 *
 * These two callers used to live in the main AppContext, which meant the
 * main (student/teacher) app tree shipped `/api/admin/login` and
 * `/api/admin/bootstrap` callers. They now live in this admin-only module,
 * imported ONLY by AdminLoginScreen (admin entry point). The main entry
 * (`src/main.tsx` -> `src/App.tsx`) never imports this file.
 *
 * These functions only perform the HTTP call and return the parsed
 * result — applying the session to app state stays with AppContext's
 * `applyAdminSession`, which the admin login screen calls on success.
 * No admin UI is reachable from the main app: App.tsx redirects /admin
 * to https://admin.diplomamate.online/ and renders no admin screen.
 */
import { apiFetch } from '../services/apiClient';
import {
  fetchWithNetworkRetry,
  NETWORK_ERROR_MESSAGE,
  type NetworkRetryOptions
} from '../services/networkRetry';
import type { SystemAdminProfile } from '../types';

export type AdminAuthResult =
  | { success: true; message: string; admin: SystemAdminProfile; sessionToken: string }
  | { success: false; message: string };

export const adminLoginRequest = async (
  email: string,
  password: string,
  pinToken?: string,
  options?: Pick<NetworkRetryOptions, 'onRetry'>
): Promise<AdminAuthResult> => {
  try {
    // Render free tier sleeps after ~15 min idle: the first login attempt
    // often fails at the network level. Retry network failures only (2
    // more attempts, ~3s then ~8s); HTTP error responses (401/403/...)
    // are real answers and are never retried.
    const response = await fetchWithNetworkRetry(
      () =>
        apiFetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password, ...(pinToken ? { pinToken } : {}) })
        }),
      { onRetry: options?.onRetry }
    );
    const data = await response.json();
    if (!response.ok || !data.success || !data.sessionToken || !data.admin) {
      return { success: false, message: data.error || 'System Administrator authentication failed.' };
    }

    return {
      success: true,
      message: data.message || 'Authenticated as System Administrator.',
      admin: data.admin as SystemAdminProfile,
      sessionToken: data.sessionToken as string
    };
  } catch (error) {
    console.error('Admin authentication error:', error);
    // Never surface a raw JS error string (e.g. "Failed to fetch") to
    // the admin: after all retries, report a human-readable message.
    return {
      success: false,
      message: NETWORK_ERROR_MESSAGE
    };
  }
};

export const adminBootstrapRequest = async (
  bootstrapToken: string,
  name: string,
  email: string,
  password: string,
  pinToken?: string
): Promise<AdminAuthResult> => {
  try {
    const response = await apiFetch('/api/admin/bootstrap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bootstrapToken, name, email, password, ...(pinToken ? { pinToken } : {}) })
    });
    const data = await response.json();
    if (!response.ok || !data.success || !data.sessionToken || !data.admin) {
      return { success: false, message: data.error || 'Administrator provisioning failed.' };
    }

    return {
      success: true,
      message: data.message || 'First System Administrator provisioned and signed in.',
      admin: data.admin as SystemAdminProfile,
      sessionToken: data.sessionToken as string
    };
  } catch {
    return { success: false, message: 'Could not connect to administrator provisioning service.' };
  }
};
