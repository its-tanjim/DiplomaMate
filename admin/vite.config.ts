import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const adminDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(adminDir, '..');

// The admin app reuses the main app's screens, context, services and styles
// from ../src. The dev server needs explicit permission to read outside its
// own root; the production build resolves those imports normally.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, ['VITE_', 'APP_URL']);
  const apiBaseUrl = (
    process.env.VITE_API_BASE_URL ||
    env.VITE_API_BASE_URL ||
    process.env.APP_URL ||
    env.APP_URL ||
    ''
  ).trim();

  if (apiBaseUrl) {
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
  }

  return {
    root: adminDir,
    // Relative asset paths so the same build works under /admin-app on the
    // Render host, under file:// (Electron) and in Capacitor.
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl.replace(/\/+$/, '')),
    },
    server: {
      fs: {
        allow: [repoRoot]
      }
    },
    build: {
      outDir: path.resolve(repoRoot, 'dist-admin'),
      emptyOutDir: true
    }
  };
});
