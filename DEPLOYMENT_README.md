# PerformanceMedia — combined Cloudflare Worker package

This package keeps the existing 14 HTML pages and adds a Cloudflare Worker entry point that routes `/api/*` to a read-only API and serves other requests through the static assets binding.

## Important status
- Existing frontend files are included unchanged.
- `/api/health`, `/api/pages`, `/api/pages/:slug`, `/api/networks`, and `/api/faqs` are read-only routes.
- `/admin/` is an admin-area placeholder, not a completed secure CMS yet.
- Do not configure `SUPABASE_SECRET_KEY` as a frontend variable. The read-only API expects `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as Worker runtime variables. If only a secret key is currently configured, do not paste it into code; create/configure the publishable key for read-only calls.
- Do not deploy admin writes until Supabase Auth JWT verification and admin role authorization are implemented and tested.

## Before production deploy
1. Keep a backup of the current production Worker deployment.
2. Confirm the Supabase tables/column names match the queries in `src/index.js`.
3. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the Cloudflare Worker runtime settings.
4. Test a preview/staging deployment first; verify `/`, `/about-us.html`, `/api/health`, and all asset paths.
5. Only then merge into `main` and deploy production.
