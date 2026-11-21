// DiplomaMate desktop shell (Windows / macOS / Linux).
// Loads the same Vite production build (dist/) that Capacitor ships on
// mobile, so the app and its Render backend work identically on desktop.
// Native Capacitor features are guarded by Capacitor.isNativePlatform()
// in src/services/nativeService.ts, so they no-op here on web.
const {app, BrowserWindow} = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'DiplomaMate',
    icon: path.join(__dirname, '..', 'public', 'diploma-mate-logo.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
