#!/usr/bin/env python3
"""Keep admin/dashboard.html inline-script CSP hashes in sync.

The admin dashboard intentionally uses CSP hashes instead of unsafe-inline. Any edit to
an inline script changes its SHA-256 and otherwise makes the dashboard render with dead
controls. This script recomputes the hashes and updates the dashboard meta CSP plus the
/admin/dashboard.html rule in _headers.
"""

from __future__ import annotations

import base64
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DASHBOARD = ROOT / "admin" / "dashboard.html"
HEADERS = ROOT / "_headers"


def sha256_token(text: str) -> str:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    return "sha256-" + base64.b64encode(digest).decode("ascii")


def normalize_html_newlines(text: str) -> str:
    # HTML parsing normalizes CRLF/CR to LF before CSP hashes are evaluated.
    return text.replace("\r\n", "\n").replace("\r", "\n")


def extract_inline_scripts(html: str) -> list[str]:
    scripts: list[str] = []
    pattern = re.compile(r"<script(?P<attrs>[^>]*)>(?P<body>[\s\S]*?)</script>", re.I)
    for match in pattern.finditer(html):
        attrs = match.group("attrs") or ""
        if re.search(r"\bsrc\s*=", attrs, re.I):
            continue
        body = match.group("body")
        if body.strip():
            scripts.append(body)
    return scripts


def replace_script_src_hashes(csp: str, hashes: list[str]) -> str:
    replacement = "script-src 'self' " + " ".join(f"'{value}'" for value in hashes) + ";"
    updated, count = re.subn(r"script-src\s+'self'(?:\s+'sha256-[^']+')*\s*;", replacement, csp, count=1)
    if count != 1:
        raise RuntimeError("Could not locate script-src in CSP")
    return updated


def update_dashboard() -> tuple[list[str], bool]:
    raw = DASHBOARD.read_bytes().decode("utf-8")
    normalized = normalize_html_newlines(raw)
    scripts = extract_inline_scripts(normalized)
    if len(scripts) != 2:
        raise RuntimeError(f"Expected 2 non-empty inline scripts, found {len(scripts)}")

    hashes = [sha256_token(script) for script in scripts]

    meta_pattern = re.compile(
        r'(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)(">)',
        re.I,
    )
    match = meta_pattern.search(normalized)
    if not match:
        raise RuntimeError("Dashboard CSP meta tag not found")

    new_csp = replace_script_src_hashes(match.group(2), hashes)
    updated = normalized[: match.start(2)] + new_csp + normalized[match.end(2) :]
    changed = updated != normalized
    if changed:
        DASHBOARD.write_text(updated, encoding="utf-8", newline="\n")
    return hashes, changed


def update_headers(hashes: list[str]) -> bool:
    if not HEADERS.exists():
        return False
    text = normalize_html_newlines(HEADERS.read_bytes().decode("utf-8"))
    marker = "/admin/dashboard.html"
    idx = text.find(marker)
    if idx < 0:
        raise RuntimeError("_headers admin dashboard section not found")

    before = text[:idx]
    section = text[idx:]
    line_pattern = re.compile(r"(^\s*Content-Security-Policy:\s*)(.*)$", re.M)
    match = line_pattern.search(section)
    if not match:
        raise RuntimeError("Admin dashboard CSP header not found")

    new_csp = replace_script_src_hashes(match.group(2), hashes)
    section = section[: match.start(2)] + new_csp + section[match.end(2) :]
    updated = before + section
    changed = updated != text
    if changed:
        HEADERS.write_text(updated, encoding="utf-8", newline="\n")
    return changed


def main() -> int:
    hashes, dashboard_changed = update_dashboard()
    headers_changed = update_headers(hashes)
    print("Admin CSP hashes:")
    for value in hashes:
        print(f"  {value}")
    print(f"dashboard changed: {dashboard_changed}")
    print(f"_headers changed: {headers_changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
