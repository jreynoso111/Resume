# Security Best Practices Report

## Executive Summary

Re-audit result: the two previous high-severity findings are now addressed.

- The CMS editor now strips event-handler attributes, validates URL-bearing attributes, sanitizes rich-text clipboard HTML, and sanitizes the final snapshot before publishing.
- Analytics no longer stores raw query strings or URL fragments, and the auth callback route is excluded from page-view tracking.

I did not find any remaining critical or high-severity issues in the current codebase. The residual findings are configuration and defense-in-depth items:

1. CSP is still weak on most public/admin pages because many pages continue to allow inline scripts and rely on meta-delivered CSP.
2. Password hardening is still incomplete: the UI minimum remains weak and the connected Supabase project still reports leaked-password protection disabled.
3. Public analytics ingestion is still open to spam/metric pollution by design.

## Resolved Findings

### RES-01: Stored XSS path in CMS rich-text publishing flow appears fixed

- Evidence:
  - URL-bearing attributes are now filtered and `on*` attributes are stripped:
    - `js/editor-auth.js:3620-3689`
  - Rich HTML paste now goes through a DOMParser-based allowlist sanitizer instead of relying on browser insertion:
    - `js/editor-auth.js:3746-3824`
  - The publish path sanitizes the cloned snapshot before serialization:
    - `js/editor-auth.js:3826-3845`
    - `js/editor-auth.js:4611`
- Assessment:
  - I no longer see the stored-XSS path that existed in the previous review.

### RES-02: Sensitive URL artifacts are no longer persisted by analytics

- Evidence:
  - Analytics metadata now stores only booleans for `has_search` and `has_hash`:
    - `js/site-shell.js:375-410`
  - Auth callback pages are excluded from page-view tracking:
    - `js/site-shell.js:440-445`
  - The auth callback scrubs the current URL before continuing:
    - `assets/js/account-pages.js:24-31`
    - `assets/js/account-pages.js:354-358`
- Assessment:
  - I no longer see the prior token-retention issue in analytics.

## Medium Severity

### SEC-01: CSP remains weak on most site pages

- Rule ID: JS-CSP-001
- Severity: Medium
- Location:
  - `index.html:6`
  - `admin/dashboard.html:6`
  - `js/editor-auth.js:1206`
- Evidence:
  - Representative public page CSP still allows inline scripts:
    - `script-src 'self' 'unsafe-inline';`
  - The editor also writes snapshots with the same weakened CSP:
    - `js/editor-auth.js:1206`
  - The policy is still delivered with `<meta http-equiv="Content-Security-Policy" ...>`.
- Impact:
  - CSP is still only a partial mitigation against future XSS bugs.
  - Meta-delivered CSP remains weaker than response-header CSP and cannot cover some directives such as `frame-ancestors`.
- Fix:
  - Move remaining inline scripts out of HTML pages, especially the admin dashboard and snapshot generation path.
  - Serve CSP as an HTTP response header where hosting allows it.
  - Remove `unsafe-inline` from `script-src` once the remaining inline code is externalized.
- Mitigation:
  - Keep the stricter account-page CSP pattern as the target baseline and extend it to the rest of the site incrementally.
- False positive notes:
  - This is defense-in-depth, not a standalone exploit by itself.

### SEC-02: Password hardening remains incomplete

- Rule ID: AUTH-001
- Severity: Medium
- Location:
  - `register.html:46`
  - Connected Supabase project advisor: `auth_leaked_password_protection`
- Evidence:
  - Registration still accepts passwords with `minlength="6"`.
  - The connected Supabase project still reports `Leaked Password Protection Disabled`.
- Impact:
  - Users can still select weak or previously breached passwords, increasing account-takeover risk.
- Fix:
  - Enable Supabase leaked-password protection.
  - Raise the minimum accepted password length in the registration flow and align it with the Auth policy.
- Mitigation:
  - Add UI feedback for password quality/length if the backend policy is changed.
- False positive notes:
  - The advisor result is live project state, not just static code analysis.

## Low Severity

### SEC-03: Public analytics ingestion can still be spammed

- Rule ID: ABUSE-001
- Severity: Low
- Location:
  - `db/supabase-security-baseline.sql:197-225`
  - `js/site-shell.js:418-433`
- Evidence:
  - `site_analytics_events` still permits inserts from `anon, authenticated`.
  - The browser inserts directly with the public anon key.
- Impact:
  - Attackers can distort metrics or create write-volume noise/cost without needing privileged access.
- Fix:
  - Move analytics ingestion behind an Edge Function with rate limiting and payload shaping, or accept this as a tradeoff and monitor for abuse.
- Mitigation:
  - Add anomaly detection and retention controls for analytics rows.
- False positive notes:
  - Current RLS limits reduce impact; this is mainly an abuse/cost concern.

## Verified Controls

- The connected Supabase project still has RLS enabled on the relevant tables, including `public.cms_pages`, `public.projects`, `public.blog_posts`, `public.profiles`, and `storage.objects`.
- The CMS upload Edge Function still enforces auth, elevated-role checks, path restrictions, MIME restrictions, and upload-size limits:
  - `supabase/functions/cms-upload/index.ts:33-50`
  - `supabase/functions/cms-upload/index.ts:100-195`
- Unsafe editor shortcuts remain disabled in public config:
  - `js/supabase-config.js:13-16`

## Recommended Remediation Order

1. Finish CSP hardening across the rest of the site and admin surfaces.
2. Enable leaked-password protection and strengthen the registration password policy.
3. Decide whether public-write analytics is an acceptable product tradeoff or should move behind a server-side ingestion layer.
