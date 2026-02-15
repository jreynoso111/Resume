#!/usr/bin/env python3
"""
Sync local HTML files into Supabase CMS snapshots (public.cms_pages by default).

This is useful when:
- You enabled CMS hydration (cms.autoHydrate=true) and the public site is showing an older snapshot.
- You deployed new HTML/CSS/JS and want Supabase `cms_pages` to start from the latest files.

Auth:
- Preferred: set SUPABASE_SERVICE_ROLE_KEY (does not require the admin password).
- Alternative: set SUPABASE_ADMIN_PASSWORD (sign in as cfg.adminEmail to obtain a JWT).

Usage:
  SUPABASE_ADMIN_PASSWORD='...' python3 scripts/sync_pages_to_supabase.py
  SUPABASE_SERVICE_ROLE_KEY='...' python3 scripts/sync_pages_to_supabase.py

Options:
  --dry-run     Print what would be uploaded without writing to Supabase.
  --source-url-base  Fetch HTML from a deployed site (for example GitHub Pages) instead of local files.
                    Use a trailing slash, e.g. https://example.com/Resume/
  --paths       Limit the sync to specific relative paths (defaults to all public HTML files).
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlencode


REPO_ROOT = Path(__file__).resolve().parents[1]


def _parse_supabase_config(js_path: Path) -> dict:
    text = js_path.read_text(encoding="utf-8", errors="ignore")
    url_m = re.search(r"url:\s*'([^']+)'", text)
    key_m = re.search(r"anonKey:\s*'([^']+)'", text)
    email_m = re.search(r"adminEmail:\s*'([^']+)'", text)
    pages_table_m = re.search(r"pagesTable:\s*'([^']+)'", text)
    return {
        "url": url_m.group(1) if url_m else "",
        "anonKey": key_m.group(1) if key_m else "",
        "adminEmail": email_m.group(1) if email_m else "",
        "pagesTable": pages_table_m.group(1) if pages_table_m else "cms_pages",
    }


def _sign_in_with_password(supabase_url: str, anon_key: str, email: str, password: str) -> str:
    endpoint = f"{supabase_url.rstrip('/')}/auth/v1/token?grant_type=password"
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(endpoint, data=payload, method="POST")
    req.add_header("apikey", anon_key)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            data = json.loads(r.read().decode("utf-8", errors="replace") or "{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Auth failed (HTTP {e.code}): {body[:300]}") from None
    token = str(data.get("access_token") or "").strip()
    if not token:
        raise RuntimeError("Auth succeeded but no access_token was returned.")
    return token


def _upsert_pages_via_rest(
    *,
    supabase_url: str,
    anon_key: str,
    bearer_token: str,
    table: str,
    rows: list[dict],
) -> None:
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/{table}?on_conflict=path"
    payload = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(endpoint, data=payload, method="POST")
    req.add_header("apikey", anon_key)
    req.add_header("Authorization", f"Bearer {bearer_token}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "resolution=merge-duplicates,return=minimal")
    req.add_header("Accept", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            _ = r.read()
            if r.status < 200 or r.status >= 300:
                raise RuntimeError(f"Upsert failed (HTTP {r.status})")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Upsert failed (HTTP {e.code}): {body[:400]}") from None


def _collect_html_files() -> list[Path]:
    files: list[Path] = []

    root_index = REPO_ROOT / "index.html"
    if root_index.exists():
        files.append(root_index)

    pages_dir = REPO_ROOT / "pages"
    if pages_dir.exists():
        files.extend([p for p in pages_dir.rglob("*.html") if p.is_file()])

    # Explicitly exclude admin/ pages from CMS snapshots.
    out: list[Path] = []
    for p in files:
        rel = p.relative_to(REPO_ROOT).as_posix()
        if rel.startswith("admin/"):
            continue
        if "/admin/" in rel:
            continue
        out.append(p)

    out.sort(key=lambda p: p.as_posix())
    return out


def _safe_rel_html_path(raw: str) -> str:
    value = (raw or "").strip().replace("\\", "/")
    value = value.split("?", 1)[0].split("#", 1)[0]
    value = value.lstrip("/")
    if not value:
        raise ValueError("Empty path")
    # Basic traversal guard.
    parts = [p for p in value.split("/") if p not in ("", ".")]
    if any(p == ".." for p in parts):
        raise ValueError(f"Invalid path: {raw}")
    clean = "/".join(parts)
    if not clean.endswith(".html"):
        raise ValueError(f"Only .html paths are supported, got: {raw}")
    if clean.startswith("admin/") or "/admin/" in clean:
        raise ValueError(f"Refusing to sync admin pages: {raw}")
    return clean


def _fetch_html(source_url_base: str, rel_path: str) -> str:
    base = (source_url_base or "").strip()
    if not base:
        raise ValueError("Missing source URL base")
    # Ensure we always join relative to the base directory, not to a file path.
    if not base.endswith("/"):
        base = f"{base}/"
    parsed = urlparse(base)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"source-url-base must be http(s), got: {base}")

    # Cache-bust but keep URL stable.
    qs = urlencode({"cb": str(int(time.time() * 1000))})
    url = urljoin(base, rel_path)
    sep = "&" if "?" in url else "?"
    url = f"{url}{sep}{qs}"

    req = urllib.request.Request(url, method="GET")
    req.add_header("Accept", "text/html,*/*")
    req.add_header("User-Agent", "ResumeCMS/1.0 (sync_pages_to_supabase.py)")
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
    return raw.decode("utf-8", errors="replace")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Only print what would be synced.")
    parser.add_argument(
        "--source-url-base",
        default="",
        help="If set, fetch HTML from this base URL instead of reading local files (example: https://jreynoso111.github.io/Resume/).",
    )
    parser.add_argument(
        "--paths",
        nargs="*",
        default=[],
        help="Optional list of relative .html paths to sync (example: index.html pages/about.html). Defaults to all public HTML files.",
    )
    args = parser.parse_args()

    cfg = _parse_supabase_config(REPO_ROOT / "js" / "supabase-config.js")
    supabase_url = str(cfg.get("url") or "").strip()
    anon_key = str(cfg.get("anonKey") or "").strip()
    admin_email = str(cfg.get("adminEmail") or "").strip()
    table = str(cfg.get("pagesTable") or "cms_pages").strip() or "cms_pages"

    if not supabase_url or not anon_key:
        print("ERROR: Missing Supabase URL/anonKey in js/supabase-config.js", file=sys.stderr)
        return 2
    if not admin_email:
        print("ERROR: Missing adminEmail in js/supabase-config.js", file=sys.stderr)
        return 2

    rel_paths: list[str] = []
    if args.paths:
        try:
            rel_paths = [_safe_rel_html_path(p) for p in args.paths]
        except ValueError as e:
            print(f"ERROR: {e}", file=sys.stderr)
            return 2
    else:
        html_files = _collect_html_files()
        if not html_files:
            print("No HTML files found to sync (expected index.html and/or pages/**/*.html).")
            return 0
        rel_paths = [p.relative_to(REPO_ROOT).as_posix() for p in html_files]

    rows: list[dict] = []
    source_url_base = str(args.source_url_base or "").strip()
    for rel in rel_paths:
        if source_url_base:
            rows.append({"path": rel, "html": ""})
        else:
            file_path = (REPO_ROOT / rel).resolve()
            if not file_path.exists():
                print(f"ERROR: Missing local file: {rel}", file=sys.stderr)
                return 2
            html = file_path.read_text(encoding="utf-8", errors="replace")
            rows.append({"path": rel, "html": html})

    if args.dry_run:
        for row in rows:
            src = source_url_base if source_url_base else "local"
            print(f"[dry-run] {row['path']} ({src}) -> {table}")
        print(f"[dry-run] Would sync {len(rows)} page(s).")
        return 0

    if source_url_base:
        print(f"Source: {source_url_base}")
        for i, row in enumerate(rows, 1):
            path = str(row.get("path") or "")
            try:
                html = _fetch_html(source_url_base, path)
            except Exception as e:
                print(f"ERROR: Fetch failed for {path}: {e}", file=sys.stderr)
                return 2
            rows[i - 1] = {"path": path, "html": html}

    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    bearer = service_role_key.strip()
    if not bearer:
        password = os.environ.get("SUPABASE_ADMIN_PASSWORD") or ""
        if not password:
            if sys.stdin.isatty():
                password = getpass.getpass(f"Supabase password for {admin_email}: ")
            else:
                print(
                    "ERROR: Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ADMIN_PASSWORD in your environment.",
                    file=sys.stderr,
                )
                return 2
        bearer = _sign_in_with_password(supabase_url, anon_key, admin_email, password)

    chunk_size = 2
    started = time.time()
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i : i + chunk_size]
        _upsert_pages_via_rest(
            supabase_url=supabase_url,
            anon_key=anon_key,
            bearer_token=bearer,
            table=table,
            rows=chunk,
        )
        # Keep output compact but visible.
        done = min(i + len(chunk), len(rows))
        print(f"synced {done}/{len(rows)} page(s)")

    elapsed = time.time() - started
    print(f"Done. Synced {len(rows)} page(s) to {table} in {elapsed:.1f}s.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
