import { apiFetch } from './apiClient';

// Broadcast in-app notifications served by GET /api/notifications
// (authed; the server filters to the student's department/semester or
// "all"). No push/FCM — this is the in-app inbox only.

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

const AUTH_TOKEN_KEY = 'diplomamate_auth_token';
const SEEN_AT_KEY = 'diplomamate_notifications_seen_at';

function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function normalizeList(data: unknown): BroadcastNotification[] {
  const raw = Array.isArray(data)
    ? data
    : (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).notifications)
      ? (data as Record<string, unknown>).notifications
      : []);
  return (raw as Array<Record<string, unknown>>)
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      id: String(item.id ?? ''),
      title: String(item.title ?? ''),
      message: String(item.message ?? ''),
      createdAt: String(item.createdAt ?? '')
    }))
    .filter(item => item.id && item.title)
    .sort((a, b) => {
      const ta = Date.parse(a.createdAt) || 0;
      const tb = Date.parse(b.createdAt) || 0;
      return tb - ta; // newest first
    });
}

let listPromise: Promise<BroadcastNotification[]> | null = null;

export function fetchBroadcastNotifications(): Promise<BroadcastNotification[]> {
  if (!listPromise) {
    listPromise = (async () => {
      try {
        const token = getAuthToken();
        const res = await apiFetch('/api/notifications', {
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) return [];
        const data = await res.json();
        return normalizeList(data);
      } catch {
        return [];
      }
    })();
  }
  return listPromise;
}

/** Number of broadcast notifications newer than the last inbox visit. */
export async function fetchUnseenBroadcastCount(): Promise<number> {
  const items = await fetchBroadcastNotifications();
  let seenAt = 0;
  try {
    seenAt = Date.parse(localStorage.getItem(SEEN_AT_KEY) || '') || 0;
  } catch {
    seenAt = 0;
  }
  return items.filter(item => (Date.parse(item.createdAt) || 0) > seenAt).length;
}

/** Call when the inbox is opened — marks everything currently listed as seen. */
export function markBroadcastNotificationsSeen(items: BroadcastNotification[]): void {
  if (items.length === 0) return;
  const newest = items.reduce(
    (max, item) => Math.max(max, Date.parse(item.createdAt) || 0),
    0
  );
  if (newest <= 0) return;
  try {
    localStorage.setItem(SEEN_AT_KEY, new Date(newest).toISOString());
  } catch {
    // Ignore storage errors.
  }
}
