import { defineConfig, type ConfigEnv, type PluginOption, type UserConfig } from 'vite';
import baseConfig from './vite.config';

/**
 * Admin-only build (`npm run build:admin`).
 *
 * Extends the base vite config and changes only what the admin build
 * needs:
 * - Entry: `index-admin.html` -> `src/admin-main.tsx` (renders the
 *   AdminApp shell only). The main `src/App.tsx` is never imported, so
 *   no student/teacher screen, WelcomeScreen, or update checker ends
 *   up in the admin bundle. Vite emits the entry under its source name
 *   (`index-admin.html`), so the `build:admin` script copies it to
 *   `dist-admin/index.html` afterwards — Capacitor (`webDir: dist-admin`)
 *   and a Cloudflare Worker serving the directory at `/` both need the
 *   default document to be `index.html`.
 * - Output: `dist-admin/` instead of `dist/`.
 * - Defines `import.meta.env.VITE_ADMIN_ONLY` as 'true' (see
 *   `src/config/buildMode.ts`).
 * - Drops the VitePWA plugin: the admin build is a separate app/link,
 *   so it must not register the main app's service worker or ship the
 *   main app's PWA manifest.
 *
 * Everything else (base path, API-base define, aliases, plugins) is
 * inherited unchanged, so the admin build talks to the same backend
 * (VITE_API_BASE_URL) as the main app.
 */
function flattenPlugins(plugins: PluginOption[] | undefined): PluginOption[] {
  const out: PluginOption[] = [];
  const walk = (plugin: PluginOption): void => {
    if (!plugin) return;
    if (Array.isArray(plugin)) {
      plugin.forEach(walk);
      return;
    }
    out.push(plugin);
  };
  (plugins ?? []).forEach(walk);
  return out;
}

function isPwaPlugin(plugin: PluginOption): boolean {
  if (typeof plugin !== 'object' || plugin === null || !('name' in plugin)) return false;
  const name = (plugin as { name: unknown }).name;
  return typeof name === 'string' && (name === 'vite-plugin-pwa' || name.startsWith('vite-plugin-pwa:'));
}

export default defineConfig(async (env: ConfigEnv): Promise<UserConfig> => {
  const base = await baseConfig(env);
  return {
    ...base,
    plugins: flattenPlugins(base.plugins).filter((plugin) => !isPwaPlugin(plugin)),
    define: {
      ...base.define,
      'import.meta.env.VITE_ADMIN_ONLY': JSON.stringify('true'),
    },
    build: {
      ...base.build,
      outDir: 'dist-admin',
      emptyOutDir: true,
      rollupOptions: {
        ...(base.build?.rollupOptions ?? {}),
        input: 'index-admin.html',
      },
    },
  };
});
