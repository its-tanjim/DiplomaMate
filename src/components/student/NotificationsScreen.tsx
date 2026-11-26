import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Megaphone, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  fetchBroadcastNotifications,
  markBroadcastNotificationsSeen,
  type BroadcastNotification
} from '../../services/notificationsService';

// Broadcast inbox: admin announcements delivered in-app (GET
// /api/notifications, filtered server-side to the student's
// department/semester or "all"), newest first. No push/FCM. Opening the
// inbox marks everything listed as seen, which clears the bell dot.
export const NotificationsScreen: React.FC = () => {
  const { setActiveScreen } = useApp();
  const [items, setItems] = useState<BroadcastNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const list = await fetchBroadcastNotifications();
      setItems(list);
      markBroadcastNotificationsSeen(list);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // The service caches the list for the session; a reload reuses it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (value: string) => {
    const time = Date.parse(value);
    if (!time) return value;
    return new Date(time).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveScreen('home')}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer shrink-0"
            aria-label="Back to home"
            title="Back"
          >
            <ArrowLeft aria-hidden="true" className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
            <Bell aria-hidden="true" className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-text-primary">Notifications</h1>
            <p className="text-[11px] text-slate-500">Announcements for you</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
            aria-label="Refresh notifications"
            title="Refresh"
          >
            <RefreshCw aria-hidden="true" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-surface rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw aria-hidden="true" className="w-4 h-4 animate-spin text-teal-600" />
          <span>Loading notifications…</span>
        </div>
      ) : failed ? (
        <div className="bg-surface rounded-2xl border border-rose-200 p-6 text-center shadow-xs">
          <h3 className="text-xs sm:text-sm font-bold text-text-primary">Could not load notifications</h3>
          <p className="text-[11px] text-slate-500 mt-1">Please check your connection and try again.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-slate-200 p-6 text-center shadow-xs">
          <Megaphone aria-hidden="true" className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
          <h3 className="text-xs sm:text-sm font-bold text-text-primary">No notifications yet</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Announcements from your college and teachers will show up here.
          </p>
        </div>
      ) : (
        items.map(item => (
          <article
            key={item.id}
            className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-text-primary">{item.title}</h3>
              <span className="text-[11px] text-slate-400 font-medium shrink-0">
                {formatDate(item.createdAt)}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {item.message}
            </p>
          </article>
        ))
      )}
    </div>
  );
};
