PerformanceMedia — Cloudflare Pages Frontend Package
===================================================

Included
--------
- 14 static HTML pages from the approved source ZIP
- Existing inline CSS/JavaScript and visual interactions preserved
- Cloudflare Pages _headers file with baseline browser security headers

Deploy as a static site
-----------------------
1. Upload this project folder to a GitHub repository (keep the HTML files in the repository root).
2. In Cloudflare Dashboard, open Workers & Pages > Create > Pages > Connect to Git.
3. Select the repository.
4. Framework preset: None
5. Build command: leave blank
6. Build output directory: / (repository root)
7. Deploy and test the *.pages.dev URL.

Important scope notes
---------------------
This is the frontend deployment package only. It does NOT contain a working admin login,
backend API, database, or live content save/publish feature. Those must be built and securely
configured in the next phase. Do not expose secrets in frontend HTML or JavaScript.

Before public launch
--------------------
- Confirm the real business email and replace placeholder addresses.
- Review legal pages for your actual business practices and jurisdiction.
- Test navigation, responsive layout, browser console, and all interactive controls.
- Cloudflare Pages _headers are baseline protections, not a substitute for application security.
