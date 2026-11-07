import type { CapacitorConfig } from '@capacitor/cli';
import 'dotenv/config';

const apiBaseUrl = (process.env.VITE_API_BASE_URL || process.env.APP_URL || '').trim();

if (!apiBaseUrl) {
  throw new Error('Set VITE_API_BASE_URL or APP_URL to the deployed HTTPS backend origin before syncing Android.');
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
  appId: 'bd.gov.bteb.diplomamate',
  appName: 'DiplomaMate',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#2563EB'
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#2563EB'
    }
  }
};

export default config;
