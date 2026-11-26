import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { AppConfig } from '../../services/appConfigService';

// Server maintenance banner: shown at the very top of the logged-in app
// only while app-config says maintenanceMode.enabled. Dismissible for the
// session; a new message shows again.
export const MaintenanceBanner: React.FC<{ config: AppConfig | null }> = ({ config }) => {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);

  const message = config?.maintenanceMode?.enabled ? config.maintenanceMode.message : '';

  useEffect(() => {
    // A new maintenance message must show again even after a dismiss.
    setDismissedMessage(null);
  }, [message]);

  if (!message || dismissedMessage === message) return null;

  return (
    <div
      role="alert"
      className="mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-xs"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
          <AlertTriangle aria-hidden="true" className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900">Maintenance notice</p>
          <p className="text-xs text-amber-800 leading-relaxed mt-0.5 whitespace-pre-line">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissedMessage(message)}
          className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 cursor-pointer shrink-0"
          aria-label="Dismiss maintenance notice"
          title="Dismiss"
        >
          <X aria-hidden="true" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
