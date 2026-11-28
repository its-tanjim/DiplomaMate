# DiplomaMate Website (www.diplomamate.online)

Public landing website for the DiplomaMate app. Built fresh 2026-11-28; rebuilt
as v2 the same day with the syllabus / polytechnic / CGPA sections from the old
portal repo (see "Content sources" below). The old `DiplomaMate-Web-site` repo
itself is not used.

## What it is

A single self-contained page (`index.html`, inline CSS + JS): hero, features,
syllabus explorer, polytechnics directory, CGPA calculator, results, live BTEB
notices, how-it-works, APK download, FAQ, footer. Mobile-first, DiplomaMate
brand colours (primary #3880FF, secondary #F7931E). No CSS framework, no map
library — the page stays self-contained except for the data files and live API
calls below.

## Sections

- **Hero / Features / How it works / Download / FAQ** — as v1.
- **Syllabus Explorer** — pick one of 15 BTEB technologies, 2022 or 2016
  regulation, semester 1–8 → subject table (code, name, T/P/C, marks) with
  totals. Data: `website/data/syllabusData.js`.
- **Government Polytechnics** — search by name/district + division filter over
  all 54 government polytechnic institutes (name, Bangla name, district,
  division, established year, EIIN, code, technologies, seats, website).
  Data: `website/data/polytechnics.js`. No map — cards + filters cover it and
  keep the page light.
- **CGPA Calculator** — 8 semester GPA inputs (0–4.00), official BTEB weights
  (Sem 1–3: 5% each, Sem 4: 10%, Sem 5: 15%, Sem 6: 20%, Sem 7: 25%,
  Sem 8: 15%), letter grade + remark, Clear + Load-sample buttons. Same
  formula as the calculator in the app.
- **Results** — Board Roll input opens your result on **BTEB Result Zone**
  (`btebresultszone.com/results/<roll>?curriculumId=diploma_in_engineering`,
  Diploma in Engineering only), plus a link to the **Official BTEB** portal
  (result.bteb.gov.bd). No result data is invented or stored here.
- **Notices** — latest 6 notices fetched live from the app's API
  (`GET /api/notices/bteb`), each linked to its PDF/notice page, credited to
  Official BTEB. If the fetch fails, the section says so and points to the app
  — it never shows fake notices.

Deliberately NOT included: the old portal's attendance portal (it was
localStorage-only — it would duplicate app data and break the same-data rule),
the stale APK link `diplomamate.bd/download/diplomamate-v2.4.apk` (wrong domain
+ old version), and any link to the Admin Panel (admin stays unlinked publicly).

## Same data as the app — one source of truth

The website has **no database of its own**. All live data comes from the same
backend the app uses:

- **API:** `https://api.diplomamate.online` (Render Node/Express server)
- **Database:** Supabase Postgres (project `DiplomaMate`)
- The page fetches the latest APK version from
  `releases/latest.json` (the same file the in-app updater reads), the live
  server status from `GET /api/admin/pin-status`, and notices from
  `GET /api/notices/bteb`.
- The syllabus + polytechnic data files live in this repo under
  `website/data/` and are loaded at runtime from
  `https://raw.githubusercontent.com/its-tanjim/DiplomaMate/main/website/data/…`
  as plain `<script>` tags. If a data file fails to load, its section shows a
  "couldn't load" note and the rest of the page keeps working.
- A user registering in the app, or an admin publishing a notice/routine,
  changes the same Supabase rows the website reads — so both places update
  together.

## Content sources

- `website/data/syllabusData.js` — BTEB 2016 & 2022 regulation syllabus
  (15 technologies × 8 semesters; copied from the old portal repo, which is
  byte-identical in `DiplomaMate-Web-site---1`). Note: one subject code in
  this file differs from the app's subject catalog — CST Sem 4 lists
  `25831` (Business Communication) where the app catalog has `25837`.
  Flagged, not hand-edited; the file is used as-is.
- `website/data/polytechnics.js` — 54 government polytechnic institutes with
  division/district, EIIN, established year, departments, seats and contact
  (same source).

## Hosting

- **Live at:** https://www.diplomamate.online/
- **Worker:** `diplomamate-website` (Cloudflare Workers, static single-file site)
- **Route:** `www.diplomamate.online/*` → `diplomamate-website`
- The app stays at `diplomamate.online` (Worker `diplomamate`); admin stays at
  `admin.diplomamate.online` (Worker `diplomamate-admin`).

## Deploy

The Worker script serves `index.html` only — the data files are fetched from
GitHub at runtime, so **commit + push first** (so the raw data URLs exist),
then deploy:

1. Edit `index.html` / `website/data/*`, commit, push.
2. `python3 website/deploy-worker.py`
3. Verify:
   - `curl -s -o /dev/null -w "%{http_code}" https://www.diplomamate.online/` → 200
     and the page contains Syllabus / Polytechnics / CGPA / Results / Notices
   - `curl -s -o /dev/null -w "%{http_code}" https://raw.githubusercontent.com/its-tanjim/DiplomaMate/main/website/data/syllabusData.js` → 200
   - same for `polytechnics.js` → 200
   - `https://diplomamate.online/` still serves the app
   - `https://api.diplomamate.online/api/admin/pin-status` still answers 200
   - the hero still shows the latest version from `releases/latest.json`

If the deploy script fails, check the live state first — do not blindly retry a
deploy that already succeeded.
