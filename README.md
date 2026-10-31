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

## Admin Management

Sign in through the existing System Administrator login and open the **Management** tab in the Admin Portal. The dashboard reads registered student and captain profiles, registered teacher accounts, communities, and audit entries from the server. Student profiles from existing local sign-ins are synchronized to the server on their next session; captain applications continue through the existing teacher-endorsement workflow.

No separate database migration or new environment variable is required. The server adds account-registration flags, soft-deletion IDs, teacher account records, and admin audit entries to `data/academic-store.json` as it writes the existing JSON store. Back up that file before deploying. Deleted accounts and communities are deactivated rather than physically removed; their academic records, messages, and files are retained.

Existing System Administrator credentials and provisioning remain unchanged. If this installation has no administrator yet, provision one through the existing `npm run provision-admin` command or server-side initial-admin setup; keep credentials in a trusted server environment and out of frontend code.
