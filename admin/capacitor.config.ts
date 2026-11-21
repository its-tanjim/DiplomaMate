import type { CapacitorConfig } from '@capacitor/cli';
import 'dotenv/config';

const apiBaseUrl = (process.env.VITE_API_BASE_URL || process.env.APP_URL || '').trim();

if (!apiBaseUrl) {
  throw new Error('Set VITE_API_BASE_URL or APP_URL to the deployed HTTPS backend origin before syncing the Admin app.');
}

const parsedApiBaseUrl = new URL(apiBaseUrl);
if (
  parsedApiBaseUrl.protocol !== 'https:' ||
  parsedApiBaseUrl.username ||
  parsedApiBaseUrl.password ||
  parsedApiBaseUrl.pathname !== '/' ||
  parsedApiBaseUrl.search ||
  parsedApiBaseUrl.hash
) {
  throw new Error('VITE_API_BASE_URL or APP_URL must be a public HTTPS origin without a path or credentials.');
}

const config: CapacitorConfig = {
  appId: 'bd.gov.bteb.diplomamate.admin',
  appName: 'DiplomaMate Admin',
  // The admin build output lives inside the main app's dist/ (dist/admin-app).
  webDir: '../dist/admin-app',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#2563EB'
    }
  }
};

export default config;
