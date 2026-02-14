#!/usr/bin/env python3
"""
Rewrite HTML image references from local assets (assets/images/...) to Supabase Storage public URLs.

This assumes you've already uploaded the images to the Storage bucket at object paths that match:
  assets/<objectPath>  ->  bucket/<objectPath>

Example:
  assets/images/home/profile.png
becomes:
  https://<project>.supabase.co/storage/v1/object/public/<bucket>/images/home/profile.png

Usage:
  python3 scripts/rewrite_image_refs_to_supabase.py

Optional:
  --dry-run  Print which files would change, but do not write.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def _parse_supabase_config(js_path: Path) -> dict:
    text = js_path.read_text(encoding="utf-8", errors="ignore")
    url_m = re.search(r"url:\s*'([^']+)'", text)
    bucket_m = re.search(r"assetsBucket:\s*'([^']+)'", text)
    return {
        "url": url_m.group(1) if url_m else "",
        "bucket": bucket_m.group(1) if bucket_m else "resume-cms",
    }


def _storage_base(supabase_url: str, bucket: str) -> str:
    return f"{supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/"


ASSET_RE = re.compile(r"(?P<prefix>(?:\./|\.\./)*)assets/images/(?P<rest>[^\s\"'\)<>]+)")


def _rewrite_content(content: str, base: str) -> tuple[str, int]:
    count = 0

    def repl(match: re.Match) -> str:
        nonlocal count
        raw = match.group(0)
        # Normalize to canonical "assets/images/..." by stripping "./" and "../" segments.
        canonical = raw
        while canonical.startswith("../") or canonical.startswith("./"):
            canonical = canonical[3:] if canonical.startswith("../") else canonical[2:]
        if not canonical.startswith("assets/images/"):
            return raw
        object_path = canonical[len("assets/") :]
        count += 1
        return f"{base}{object_path}"

    out = ASSET_RE.sub(repl, content)
    return out, count


def _iter_html_files(root: Path):
    # Rewrite public pages only (index + pages). Admin HTML is intentionally excluded.
    yield root / "index.html"
    pages_dir = root / "pages"
    if pages_dir.exists():
        for p in sorted(pages_dir.rglob("*.html")):
            yield p


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    cfg = _parse_supabase_config(REPO_ROOT / "js" / "supabase-config.js")
    supabase_url = str(cfg.get("url") or "").strip()
    bucket = str(cfg.get("bucket") or "resume-cms").strip() or "resume-cms"
    if not supabase_url:
        print("ERROR: Missing Supabase URL in js/supabase-config.js", file=sys.stderr)
        return 2

    base = _storage_base(supabase_url, bucket)
    changed_files = 0
    total_replacements = 0

    for path in _iter_html_files(REPO_ROOT):
        if not path.exists():
            continue
        original = path.read_text(encoding="utf-8", errors="ignore")
        updated, n = _rewrite_content(original, base)
        if n <= 0:
            continue
        changed_files += 1
        total_replacements += n
        if args.dry_run:
            print(f"[dry-run] {path.relative_to(REPO_ROOT)}: {n} replacements")
        else:
            path.write_text(updated, encoding="utf-8")
            print(f"updated {path.relative_to(REPO_ROOT)}: {n} replacements")

    if args.dry_run:
        print(f"[dry-run] Would update {changed_files} files ({total_replacements} replacements).")
    else:
        print(f"Done. Updated {changed_files} files ({total_replacements} replacements).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
