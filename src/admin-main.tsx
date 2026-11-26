import { createRoot } from 'react-dom/client';
import AdminApp from './AdminApp.tsx';
import { IS_ADMIN_ONLY_BUILD } from './config/buildMode';
import './index.css';

// Admin-only entry (see vite.admin.config.ts / `npm run build:admin`).
// This entry is admin-only by construction — it never imports the main
// App, so no student/teacher screen or update checker can end up in
// the admin bundle. The flag is a build-time marker; warn loudly if
// this entry is ever bundled without it.
if (!IS_ADMIN_ONLY_BUILD) {
  console.warn('[DiplomaMate Admin] VITE_ADMIN_ONLY is not set — this entry renders the admin flow only.');
}

createRoot(document.getElementById('root')!).render(<AdminApp />);
