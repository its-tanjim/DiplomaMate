import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'APP_URL']);
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
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl.replace(/\/+$/, '')),
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
