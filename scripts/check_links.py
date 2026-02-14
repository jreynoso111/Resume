#!/usr/bin/env python3
"""
Lightweight link/resource checker for the static site.

What it checks:
- <a href>, <link href>, <script src>, <img src>, <source src/srcset> in HTML files.
- Internal targets exist on disk (resolving relative paths like ../).
- Fragment identifiers (#foo) refer to an existing id/name in the target HTML.
- A small set of JS-generated navigation links (js/header.js + js/footer.js).

Usage:
  python3 scripts/check_links.py

Optional:
  --include-admin   Include admin/*.html in the scan (default: on).
  --check-external  Try to fetch external http(s) links (best-effort).
"""

from __future__ import annotations

import argparse
import html.parser
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


SKIP_SCHEMES = ("mailto:", "tel:", "javascript:", "data:", "blob:")


@dataclass(frozen=True)
class Ref:
    file: Path
    tag: str
    attr: str
    url: str


class HtmlScan(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[Ref] = []
        self.ids: set[str] = set()
        self.names: set[str] = set()
        self._current_file: Path | None = None

    def scan(self, file_path: Path, content: str) -> None:
        self._current_file = file_path
        self.refs.clear()
        self.ids.clear()
        self.names.clear()
        self.feed(content)
        self.close()
        self._current_file = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        file_path = self._current_file
        if file_path is None:
            return

        attr_map = {k.lower(): (v if v is not None else "") for k, v in attrs}

        el_id = attr_map.get("id", "").strip()
        if el_id:
            self.ids.add(el_id)

        if tag.lower() == "a":
            name = attr_map.get("name", "").strip()
            if name:
                self.names.add(name)

        # Collect refs
        def add(attr_name: str) -> None:
            value = attr_map.get(attr_name, "")
            if value:
                self.refs.append(Ref(file=file_path, tag=tag.lower(), attr=attr_name, url=value))

        if tag.lower() == "a":
            add("href")
        elif tag.lower() == "link":
            add("href")
        elif tag.lower() == "script":
            add("src")
        elif tag.lower() == "img":
            add("src")
            add("srcset")
        elif tag.lower() == "source":
            add("src")
            add("srcset")
        elif tag.lower() == "form":
            add("action")


def _iter_html_files(include_admin: bool) -> list[Path]:
    files: list[Path] = []

    index = REPO_ROOT / "index.html"
    if index.exists():
        files.append(index)

    pages_dir = REPO_ROOT / "pages"
    if pages_dir.exists():
        files.extend(sorted(pages_dir.rglob("*.html")))

    if include_admin:
        admin_dir = REPO_ROOT / "admin"
        if admin_dir.exists():
            files.extend(sorted(admin_dir.rglob("*.html")))

    # De-dupe while preserving order.
    seen: set[Path] = set()
    out: list[Path] = []
    for p in files:
        rp = p.resolve()
        if rp in seen:
            continue
        seen.add(rp)
        out.append(rp)
    return out


def _strip_query_and_fragment(url: str) -> tuple[str, str]:
    """Return (pathPart, fragment). pathPart excludes query + fragment."""
    value = str(url or "")
    if "#" in value:
        base, frag = value.split("#", 1)
    else:
        base, frag = value, ""
    base = base.split("?", 1)[0]
    return base, frag


def _is_external_http(url: str) -> bool:
    return url.startswith("http://") or url.startswith("https://")


def _should_skip(url: str) -> bool:
    v = url.strip()
    if not v:
        return True
    if v == "#":
        return True
    if v.startswith(SKIP_SCHEMES):
        return True
    return False


def _resolve_internal_path(from_file: Path, raw_url: str) -> Path | None:
    base, _frag = _strip_query_and_fragment(raw_url)
    base = base.strip()
    if not base:
        return None
    if _should_skip(base) or _is_external_http(base):
        return None

    # Protocol-relative (//example.com) counts as external.
    if base.startswith("//"):
        return None

    # Treat root-relative as repo-root relative.
    if base.startswith("/"):
        candidate = (REPO_ROOT / base.lstrip("/")).resolve()
    else:
        candidate = (from_file.parent / base).resolve()

    # Prevent escaping the repo.
    try:
        candidate.relative_to(REPO_ROOT.resolve())
    except Exception:
        return None
    return candidate


def _target_exists(path: Path) -> tuple[bool, Path]:
    """
    Returns (exists, canonicalPathChecked).
    Directories are considered existing only if they contain index.html.
    """
    if path.exists() and path.is_file():
        return True, path
    if path.exists() and path.is_dir():
        idx = path / "index.html"
        return (idx.exists() and idx.is_file()), idx
    # If url is a directory-like link (ends with '/'), allow index.html resolution.
    if str(path).endswith(os.sep):
        idx = path / "index.html"
        return (idx.exists() and idx.is_file()), idx
    return False, path


def _fetch_external(url: str, timeout: float = 7.5) -> str | None:
    """
    Best-effort external check. Returns error string if failed, else None.
    """
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            code = int(getattr(r, "status", 200))
            if 200 <= code < 400:
                return None
            return f"HTTP {code}"
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}"
    except Exception as e:  # noqa: BLE001
        return str(e)


def _load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def _collect_anchor_index(html_files: list[Path]) -> dict[Path, set[str]]:
    """
    Build a map: file -> { ids and named anchors }.
    """
    scan = HtmlScan()
    anchors: dict[Path, set[str]] = {}
    for p in html_files:
        try:
            scan.scan(p, _load_text(p))
        except Exception:
            anchors[p] = set()
            continue
        anchors[p] = set(scan.ids) | set(scan.names)
    return anchors


def _check_header_js(errors: list[str]) -> None:
    """
    Validate the static navigation set in js/header.js.
    This catches broken links that are injected client-side.
    """
    header_js = REPO_ROOT / "js" / "header.js"
    if not header_js.exists():
        errors.append("Missing js/header.js (header navigation cannot render).")
        return

    text = _load_text(header_js)

    # Extract projectLinks href values from the JS array.
    hrefs = re.findall(r"href:\s*'([^']+\.html)'", text)
    if not hrefs:
        errors.append("js/header.js: Could not find projectLinks href list (parser mismatch).")
        return

    # These are expected to exist under pages/projects/.
    for h in hrefs:
        target = (REPO_ROOT / "pages" / "projects" / h).resolve()
        if not target.exists():
            errors.append(f"js/header.js: missing project detail page: pages/projects/{h}")

    # Validate main nav targets for each variant.
    must_exist = [
        REPO_ROOT / "index.html",
        REPO_ROOT / "pages" / "projects.html",
        REPO_ROOT / "pages" / "about.html",
        REPO_ROOT / "admin" / "index.html",
        REPO_ROOT / "admin" / "dashboard.html",
    ]
    for p in must_exist:
        if not p.exists():
            errors.append(f"Missing required page: {p.relative_to(REPO_ROOT)}")


def _check_footer_js(errors: list[str]) -> None:
    footer_js = REPO_ROOT / "js" / "footer.js"
    if not footer_js.exists():
        errors.append("Missing js/footer.js (footer links cannot render).")

    # Ensure admin landing exists for the "Dashboard" footer link.
    admin_index = REPO_ROOT / "admin" / "index.html"
    if not admin_index.exists():
        errors.append("Missing admin/index.html (Dashboard link target).")


def _parse_supabase_config() -> tuple[str, str] | None:
    cfg_js = REPO_ROOT / "js" / "supabase-config.js"
    if not cfg_js.exists():
        return None
    text = _load_text(cfg_js)
    url_m = re.search(r"url:\s*'([^']+)'", text)
    key_m = re.search(r"anonKey:\s*'([^']+)'", text)
    url = (url_m.group(1) if url_m else "").strip()
    key = (key_m.group(1) if key_m else "").strip()
    if not url or not key:
        return None
    return url, key


def _fetch_supabase_json(url: str, anon_key: str, path_with_query: str) -> list[dict]:
    endpoint = url.rstrip("/") + path_with_query
    req = urllib.request.Request(endpoint)
    req.add_header("apikey", anon_key)
    req.add_header("Authorization", "Bearer " + anon_key)
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=20) as r:
        raw = r.read().decode("utf-8", errors="replace") or "[]"
    data = __import__("json").loads(raw)
    return data if isinstance(data, list) else []


def _check_supabase_projects(errors: list[str]) -> None:
    cfg = _parse_supabase_config()
    if not cfg:
        errors.append("Supabase config missing/invalid: js/supabase-config.js")
        return
    url, anon_key = cfg

    try:
        rows = _fetch_supabase_json(url, anon_key, "/rest/v1/projects?select=href,is_published")
    except Exception as e:  # noqa: BLE001
        errors.append(f"Supabase projects check failed: {e}")
        return

    # Project cards render on pages/projects.html, so relative hrefs are resolved from /pages/.
    base_dir = (REPO_ROOT / "pages").resolve()
    for row in rows:
        href = str(row.get("href") or "").strip()
        if not href:
            continue
        base, frag = _strip_query_and_fragment(href)
        base = base.strip()
        if _should_skip(base):
            continue
        if _is_external_http(base) or base.startswith("//"):
            # External is allowed; we don't attempt to validate reachability here.
            continue

        # Root-relative is repo-root relative.
        if base.startswith("/"):
            target = (REPO_ROOT / base.lstrip("/")).resolve()
        else:
            target = (base_dir / base).resolve()

        try:
            target.relative_to(REPO_ROOT.resolve())
        except Exception:
            errors.append(f"Supabase project href escapes repo root: {href!r}")
            continue

        ok, checked = _target_exists(target)
        if not ok:
            errors.append(f"Supabase project href missing target: {href!r} -> {checked.relative_to(REPO_ROOT)}")
            continue

        if frag and checked.suffix.lower() == ".html":
            # Best-effort anchor validation.
            anchor_set = anchors_cache.get(checked.resolve())
            if anchor_set is not None and frag not in anchor_set:
                errors.append(
                    f"Supabase project href missing anchor '#{frag}' in {checked.relative_to(REPO_ROOT)}"
                )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--include-admin", action="store_true", default=True)
    parser.add_argument("--no-include-admin", dest="include_admin", action="store_false")
    parser.add_argument("--check-external", action="store_true", default=False)
    parser.add_argument(
        "--check-supabase-projects",
        action="store_true",
        default=False,
        help="Fetch published projects from Supabase and validate their href targets exist in /pages/.",
    )
    args = parser.parse_args()

    html_files = _iter_html_files(include_admin=bool(args.include_admin))
    anchors = _collect_anchor_index(html_files)
    # Used by the optional Supabase projects check.
    global anchors_cache  # pylint: disable=global-statement
    anchors_cache = anchors

    scan = HtmlScan()
    errors: list[str] = []
    external: set[str] = set()

    for file_path in html_files:
        try:
            content = _load_text(file_path)
            scan.scan(file_path, content)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{file_path.relative_to(REPO_ROOT)}: failed to parse HTML: {e}")
            continue

        for ref in scan.refs:
            raw = ref.url.strip()
            if _should_skip(raw):
                continue

            base, frag = _strip_query_and_fragment(raw)

            if _is_external_http(raw) or raw.startswith("//"):
                if raw.startswith("//"):
                    external.add("https:" + raw)
                else:
                    external.add(raw)
                continue

            # Fragment-only links: validate anchor exists in this file.
            if base.strip() == "" and frag:
                if frag not in anchors.get(file_path, set()):
                    errors.append(
                        f"{file_path.relative_to(REPO_ROOT)}: missing anchor '#{frag}' (from {ref.tag}[{ref.attr}])"
                    )
                continue

            target = _resolve_internal_path(file_path, raw)
            if target is None:
                continue

            ok, checked = _target_exists(target)
            if not ok:
                errors.append(
                    f"{file_path.relative_to(REPO_ROOT)}: missing target for {ref.tag}[{ref.attr}] '{raw}' -> {checked.relative_to(REPO_ROOT)}"
                )
                continue

            if frag:
                # If the resolved target is a directory index.html, use that as the anchor source.
                anchor_file = checked if checked.suffix.lower() == ".html" else checked
                if anchor_file.suffix.lower() == ".html":
                    if frag not in anchors.get(anchor_file.resolve(), set()):
                        errors.append(
                            f"{file_path.relative_to(REPO_ROOT)}: missing anchor '#{frag}' in {anchor_file.relative_to(REPO_ROOT)}"
                        )

    _check_header_js(errors)
    _check_footer_js(errors)

    if args.check_supabase_projects:
        _check_supabase_projects(errors)

    if args.check_external and external:
        for url in sorted(external):
            err = _fetch_external(url)
            if err:
                errors.append(f"External link failed: {url} ({err})")

    if errors:
        print("Broken links/resources found:\n", file=sys.stderr)
        for line in errors:
            print(f"- {line}", file=sys.stderr)
        print(f"\nTotal: {len(errors)} issue(s)", file=sys.stderr)
        return 1

    print(f"OK: {len(html_files)} HTML file(s) scanned. No broken internal links/resources found.")
    if args.check_external and external:
        print(f"Checked {len(external)} external link(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
