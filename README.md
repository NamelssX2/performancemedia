# PerformanceMedia Backend Starter

This is a **separate backend starter** for the `backend-setup` branch. It is not a replacement for the currently live website Worker.

## What's included
- Cloudflare Worker API starter (`src/index.js`)
- Wrangler configuration (`wrangler.toml`)
- Initial SQL migration (`supabase/002_admin_api_hardening.sql`)
- Setup and deployment notes

## Important safety notes
1. Do not overwrite the currently live `performancemedia` Worker with this starter.
2. First commit these files to the `backend-setup` branch and review them.
3. Keep all keys out of GitHub and frontend code.
4. The current `SUPABASE_SECRET_KEY` is highly privileged. This starter does not use it to perform arbitrary writes.
5. Before production use, configure and test Supabase Auth/JWT validation and admin-only write routes. The API currently exposes only health and public read routes.
6. This starter assumes the tables from the first migration already exist.

## Add these files to the repository root
- `src/index.js`
- `wrangler.toml`
- `supabase/002_admin_api_hardening.sql`

## Local configuration
Create a local `.dev.vars` file (do not commit it) with:
```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

For Cloudflare deployment, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as Worker variables. The publishable key is not a secret, but it should still not be confused with the secret/service-role key. Keep any privileged key server-side only.

## API routes
- `GET /api/health` — confirms the Worker API is running.
- `GET /api/pages` — published pages only.
- `GET /api/pages/:slug` — one published page and visible sections.
- `GET /api/networks` — published networks only.
- `GET /api/faqs` — published FAQs only.

These are read-only routes. They do not yet change database content or provide admin editing. Admin write routes should only be added after verifying Supabase Auth tokens and the matching `public.admin_users` record server-side.

## Deploy
Do not deploy this into the existing production Worker until the current Worker source has been backed up and the frontend serving behavior has been merged/tested. This starter's `wrangler.toml` uses a separate Worker name: `performancemedia-api-staging`.
