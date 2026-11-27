# DiplomaMate Website (www.diplomamate.online)

Public landing website for the DiplomaMate app. Built fresh 2026-11-28 — the old
`DiplomaMate-Web-site` repo is not used.

## What it is

A single self-contained page (`index.html`, inline CSS + JS): hero, features,
how-it-works, APK download, FAQ, footer. Mobile-first, DiplomaMate brand colours
(primary #3880FF, secondary #F7931E).

## Same data as the app — one source of truth

The website has **no database of its own**. All live data comes from the same
backend the app uses:

- **API:** `https://api.diplomamate.online` (Render Node/Express server)
- **Database:** Supabase Postgres (project `DiplomaMate`)
- The page fetches the latest APK version from
  `releases/latest.json` (the same file the in-app updater reads) and the live
  server status from `GET /api/admin/pin-status`.
- A user registering in the app, or an admin publishing a notice/routine, changes
  the same Supabase rows the website reads — so both places update together.

## Hosting

- **Live at:** https://www.diplomamate.online/
- **Worker:** `diplomamate-website` (Cloudflare Workers, static single-file site)
- **Route:** `www.diplomamate.online/*` → `diplomamate-website`
- The app stays at `diplomamate.online` (Worker `diplomamate`); admin stays at
  `admin.diplomamate.online` (Worker `diplomamate-admin`).

## Deploy

After editing `index.html`, re-deploy the Worker with the current file embedded
(the Worker script serves this exact file). Then verify:

- `curl -s -o /dev/null -w "%{http_code}" https://www.diplomamate.online/`
  → 200 and the page content
- `https://diplomamate.online/` still serves the app
- `https://api.diplomamate.online/api/admin/pin-status` still answers 200
