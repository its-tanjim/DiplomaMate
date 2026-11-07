<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d098f3d1-6127-49bb-8077-578331871dbe

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Android builds

The Android app is served from Capacitor's local HTTPS origin, so backend requests need the public HTTPS origin of the deployed server. Set `VITE_API_BASE_URL` (origin only, for example `https://api.example.com`) in the build environment before running `npm run cap:build`. `APP_URL` is accepted as a fallback when the deployment environment provides it. Android sync rejects a missing, non-HTTPS, or non-origin URL rather than generating an APK whose API requests point back to the phone.

The backend permits the Android Capacitor origin (`https://localhost`) and local development (`http://localhost:3000`). If the deployed web frontend uses a different origin from the backend, set `CORS_ALLOWED_ORIGINS` on the backend to a comma-separated list of its HTTPS frontend origins. The API base URL should be the backend origin; no API keys or secrets belong in `VITE_API_BASE_URL`.

Student result lookup uses official result files imported through the Admin Panel and labels matched records **DiplomaMate Official Gazette Database**. The official BTEB Result Search Portal requires a manual security check and fields such as registration number, semester, and exam year; DiplomaMate does not automate that challenge or call its portal-only result request from the backend. If a roll is not present in the imported Gazette records, the app offers the [official BTEB Result Search Portal](https://result.bteb.gov.bd/result-search) and [BTEB Results Zone](https://btebresultszone.com/results) as manually opened external sources. BTEB Results Zone describes itself as a third-party project; its public About and Privacy pages do not provide API integration documentation or written authorization for DiplomaMate to submit student data. Results viewed on that portal are not verified by DiplomaMate. Until documented API access and permission are provided, the app does not automatically send roll numbers to or retrieve results from either external portal. The app does not scrape either portal or use an undocumented result API. The in-app lookup request has a 15-second timeout and allows one retry for network errors or timeouts only.

During `npm run dev`, API requests use the local same-origin backend even when `VITE_API_BASE_URL` is set for deployment. Production builds continue to use `VITE_API_BASE_URL`.

### BTEB Gazette result storage

The backend reads and writes its Gazette batches and student records in `data/bteb-results.json` by default. This is a local JSON file, not a shared database: development imports are not automatically copied to the deployed backend, and instance-local files on Render can be lost when the service is replaced or restarted. Keep the web app and API pointed at the same backend when validating imported records.

For Render, attach a persistent disk and set `BTEB_RESULTS_STORE_PATH` to a file on its mount (for example `/var/data/bteb-results.json`). If that file does not exist on first startup, the backend seeds it from the bundled `data/bteb-results.json`. The `/api/results/batches` response reports the current batch/record totals and whether a custom store path is configured. A configured path is durable only if it is actually on the attached persistent disk.

Imports that existed only on an ephemeral instance cannot be recovered after they are lost; restore a backup or re-import the official Gazette files after configuring persistent storage. The Admin import now reports a failure if the JSON store cannot be saved, instead of claiming success.

## Admin Management

Sign in through the existing System Administrator login and open the **Management** tab in the Admin Portal. The dashboard reads registered student and captain profiles, registered teacher accounts, communities, and audit entries from the server. Student profiles from existing local sign-ins are synchronized to the server on their next session; captain applications continue through the existing teacher-endorsement workflow.

No separate database migration or new environment variable is required. The server adds account-registration flags, soft-deletion IDs, teacher account records, and admin audit entries to `data/academic-store.json` as it writes the existing JSON store. Back up that file before deploying. Deleted accounts and communities are deactivated rather than physically removed; their academic records, messages, and files are retained.

Existing System Administrator credentials and provisioning remain unchanged. If this installation has no administrator yet, provision one through the existing `npm run provision-admin` command or server-side initial-admin setup; keep credentials in a trusted server environment and out of frontend code.
