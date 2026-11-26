/**
 * Build-mode flags for the DiplomaMate builds.
 *
 * The main app and the admin-only app share one codebase but ship as
 * separate builds:
 * - Main build (`npm run build`): the student/teacher/captain app.
 *   VITE_ADMIN_ONLY is unset/false.
 * - Admin build (`npm run build:admin`): `vite.admin.config.ts` sets
 *   VITE_ADMIN_ONLY=true and builds the separate `src/admin-main.tsx`
 *   entry into dist-admin. That entry renders only the admin flow.
 *
 * NOTE: the admin entry deliberately does NOT wrap the app in
 * LanguageProvider. No admin screen uses `useLanguage`, and
 * LanguageProvider pulls in `src/i18n/strings.ts` — the shared
 * dictionary that holds every student welcome-screen string
 * (`welcome.createAccountTitle`, `welcome.boardRoll`, ...). Leaving it
 * out is what keeps those strings out of the admin bundle.
 */
export const IS_ADMIN_ONLY_BUILD: boolean =
  import.meta.env.VITE_ADMIN_ONLY === 'true';
