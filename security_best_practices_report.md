# Security Best Practices Report

Audit date: 2026-08-12

## Executive Summary

The audit found one critical authorization flaw: an authenticated user could create or update their own `public.profiles` row with an `admin` or `editor` role, while both database policies and the CMS upload function treated that role as authoritative. This enabled privilege escalation from a normal account to CMS administration.

The repository now contains a tested migration that closes the escalation path, removes trust in user-editable JWT metadata, and restricts database grants. It also contains hardened upload validation, strict script CSP, URL allowlists, safer DOM rendering, stronger registration guidance, and a loopback/origin-protected local CMS server.

The connected Supabase MCP is read-only. It rejected both the migration and Edge Function deployment. Therefore the critical database fix and upload hardening are **implemented and tested locally but not deployed or verified in the live Supabase project**. Production must not be considered remediated until both artifacts are deployed through a write-enabled Supabase connection.

## Deployment-Blocking Finding

### SEC-01: Profile role privilege escalation may remain open in production

- Rule ID: AUTHZ-001
- Severity: Critical
- Status: Fixed in source; production deployment blocked by read-only MCP
- Affected trust chain:
  - `public.profiles.role`
  - `public.is_admin_user()`
  - CMS client authorization
  - `cms-upload` Edge Function authorization
- Evidence of the source fix:
  - The migration uses a recursion-safe `SECURITY DEFINER` role helper with a fixed `search_path` and trusts only `app_metadata`, not `user_metadata`: `supabase/migrations/20260813020343_harden_profile_roles_and_function_grants.sql:9`
  - Authenticated users can update only `full_name`; self-insert requires `role = 'viewer'`: `supabase/migrations/20260813020343_harden_profile_roles_and_function_grants.sql:45`
  - Client-side role checks no longer trust user-editable metadata: `js/editor-auth.js:676`, `admin/dashboard.html:686`
- Impact if not deployed:
  - A normal authenticated account may be able to assign itself an elevated role and then edit CMS data or upload public assets.
- Required action:
  - Apply `supabase/migrations/20260813020343_harden_profile_roles_and_function_grants.sql` to the live project.
  - Deploy `supabase/functions/cms-upload/index.ts` with JWT verification enabled.
  - Run Supabase Security Advisor and verify the effective grants and RLS policies afterward.
- Verification performed locally:
  - Real PostgreSQL integration test blocked self-insert with `role = 'admin'`.
  - Real PostgreSQL integration test blocked self-update of `role`.
  - The same test allowed updating `full_name` and returned false for anonymous admin checks.

## Resolved in Source

### RES-01: CMS upload validation and error disclosure

- Severity: High
- Status: Fixed in source; Edge Function deployment pending
- Changes:
  - Pinned `@supabase/supabase-js` to an exact version.
  - Enforced a 10 MiB file limit and bounded multipart overhead.
  - Required an allowed path extension, matching declared MIME type, and matching binary image signature.
  - Restricted the bucket and normalized object paths.
  - Replaced raw backend/exception responses with generic client errors while retaining server-side logging.
  - Added `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- Evidence: `supabase/functions/cms-upload/index.ts:24`, `supabase/functions/cms-upload/index.ts:86`, `supabase/functions/cms-upload/index.ts:114`, `supabase/functions/cms-upload/index.ts:176`
- Verification: `deno check supabase/functions/cms-upload/index.ts` passes.

### RES-02: Stored XSS through project navigation and legacy renderers

- Severity: High
- Status: Fixed
- Changes:
  - Project filenames are restricted to same-site slug-shaped `.html` files and labels are HTML-escaped before rendering.
  - Project cards reject cross-origin or malformed destinations.
  - The legacy admin renderer now escapes every Supabase-sourced field before assigning `innerHTML`.
- Evidence: `js/header.js:124`, `js/projects-page.js:75`, `admin/app.js:14`

### RES-03: Unsafe certificate proof URLs

- Severity: Medium
- Status: Fixed
- Changes:
  - Proof links now resolve through `URL` and allow only HTTP or HTTPS.
  - Invalid URLs are hidden when rendering and rejected before saving.
- Evidence: `assets/js/courses-certifications.js:533`, `assets/js/courses-certifications.js:903`, `assets/js/courses-certifications.js:1587`

### RES-04: Weak script CSP and executable placeholder links

- Severity: Medium
- Status: Fixed in HTML and supported-host configuration
- Changes:
  - Removed `'unsafe-inline'` from every `script-src` directive.
  - Added CSP to every HTML document.
  - Authorized the two required admin inline scripts with exact SHA-256 hashes.
  - Removed all `javascript:void(0)` links.
  - Added `noopener noreferrer` to new-tab links.
  - Added `nosniff`, clickjacking, referrer, and permissions headers to `_headers` and the local server.
- Evidence: `admin/dashboard.html:6`, `_headers:1`, `scripts/dev_server.py:74`
- Verification:
  - All 23 HTML files have CSP.
  - CSP hash verification matches the current admin script bytes.
  - Browser tests loaded the admin sign-in flow with zero console errors and no `javascript:` links.

### RES-05: Local CMS write endpoint exposure

- Severity: Medium
- Status: Fixed
- Changes:
  - CMS writes now require a loopback client and a same-port loopback Origin.
  - Save/upload bodies are bounded.
  - Realpath containment blocks traversal through symlinks.
- Evidence: `scripts/dev_server.py:18`, `scripts/dev_server.py:39`, `scripts/dev_server.py:129`
- Verification:
  - Cross-origin POST returned 403.
  - Same-origin loopback POST succeeded.
  - Oversized save request returned 400 without reading the body.

### RES-06: Registration password minimum

- Severity: Medium
- Status: Partially fixed; backend policy still requires verification
- Changes:
  - Registration now requires at least 12 characters in both HTML and JavaScript.
  - Existing users are not blocked from signing in with their current passwords.
- Evidence: `register.html:46`, `assets/js/account-pages.js:175`

## Residual Risks

### SEC-02: GitHub Pages does not deliver repository-defined security headers

- Rule ID: HTTP-HEADERS-001
- Severity: Medium
- Status: Open hosting limitation
- Evidence:
  - Live responses from `https://www.jreynoso.net/` and `/admin/dashboard.html` are served by GitHub Pages without CSP, `X-Frame-Options`, or `Permissions-Policy` response headers.
  - `_headers` contains the intended policy, but GitHub Pages does not consume this file.
- Current mitigation:
  - Every HTML page carries a strict meta CSP, including hash-based admin script authorization.
- Remaining impact:
  - Meta CSP cannot enforce `frame-ancestors`; the live admin page remains frameable until the site is served through a platform or proxy that supports custom response headers.
- Fix:
  - Move the custom domain behind a hosting layer that applies `_headers`, or configure equivalent headers at a reverse proxy/CDN.

### SEC-03: Live Supabase password protections could not be verified

- Rule ID: AUTH-002
- Severity: Medium
- Status: Open verification/configuration item
- Evidence:
  - An earlier project review reported leaked-password protection disabled.
  - The current Supabase MCP denied Security Advisor access, so the live state and server-side minimum length could not be rechecked.
- Fix:
  - Set the Supabase Auth minimum password length to at least 12.
  - Enable leaked-password protection when available on the project plan.
  - Re-run Security Advisor with a write/admin-enabled connection.

### SEC-04: Public analytics ingestion remains abuseable

- Rule ID: ABUSE-001
- Severity: Low
- Status: Accepted design risk unless server-side rate limiting is added
- Evidence:
  - The validated analytics RPC intentionally remains executable by `anon` and `authenticated`: `supabase/migrations/20260813020343_harden_profile_roles_and_function_grants.sql:72`
- Existing mitigation:
  - Payload validation, bounded fields, restricted event types, and a 15-minute duplicate check reduce accidental and low-effort abuse.
- Remaining impact:
  - An attacker can still vary client-generated identifiers and pollute metrics or consume database writes.
- Fix:
  - Move ingestion behind a rate-limited Edge Function or add upstream bot/rate controls.

### SEC-05: Inline styles remain allowed

- Rule ID: CSP-STYLE-001
- Severity: Low
- Status: Open defense-in-depth item
- Evidence:
  - `style-src` still contains `'unsafe-inline'` because the site and editor rely heavily on inline style attributes.
- Impact:
  - This does not re-enable script execution, but it weakens CSP protection against future style-injection issues.
- Fix:
  - Migrate inline style attributes and embedded styles into static stylesheets, then remove `'unsafe-inline'` from `style-src`.

## Additional Verification

- JavaScript syntax: all non-vendored `.js` files pass `node --check`.
- Python syntax: `scripts/dev_server.py` and `scripts/check_links.py` pass `py_compile`.
- Link integrity: 19 content HTML files scanned with no broken internal links or resources.
- Patch integrity: `git diff --check` passes.
- Secret scan: no private keys, service-role keys, environment files, or hard-coded passwords found. The browser Supabase key is an expected publishable/anon key.
- Browser regression: projects page renders seven cards with no console errors; the admin sign-in flow executes under the strict hash CSP.
- Sensitive Pulse screenshots: the four public images were visually reviewed; no phone numbers or company names are visible.

## Required Remediation Order

1. Apply the database migration and deploy the `cms-upload` Edge Function through a write-enabled Supabase connection.
2. Re-run Supabase Security Advisor and verify Auth password settings.
3. Serve the public domain through a host or proxy that emits the security headers in `_headers`.
4. Add rate limiting to analytics ingestion if metric integrity or write cost becomes material.
