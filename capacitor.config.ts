import type { CapacitorConfig } from '@capacitor/cli';

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
