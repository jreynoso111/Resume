#!/usr/bin/env python3
"""Pre-render the project index and project metadata from public project data."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
PROJECTS_PAGE = ROOT / "pages" / "projects.html"
PROJECT_DETAILS_DIR = ROOT / "pages" / "projects"
CASE_STUDIES_PATH = ROOT / "data" / "project-case-studies.json"
SUPABASE_CONFIG_PATH = ROOT / "js" / "supabase-config.js"
SITE_ORIGIN = "https://jreynoso.net"
STATIC_START = "<!-- PROJECTS_STATIC_START -->"
STATIC_END = "<!-- PROJECTS_STATIC_END -->"
GENERIC_PROJECT_IMAGE = "../assets/images/projects/project-placeholder.svg"

FEATURED_PROJECT_SLUGS = (
    "techloc-fleet-service-control",
    "fare-card-batch-integrity-investigation",
    "fare-system-transaction-fraud-detection-metro-santo-domingo",
    "turnstile-deployment-management-line-2b-expansion",
)

LOCAL_PROJECTS = [
    {
        "title": "Fare System Transaction Fraud Investigation",
        "description": (
            "Investigated anomalous fare-card transaction behavior and identified three "
            "users exploiting a payment-system vulnerability that bypassed the normal "
            "recharge workflow."
        ),
        "href": "projects/fare-system-transaction-fraud-detection-metro-santo-domingo.html",
        "is_published": True,
        "sort_order": 42,
    },
    {
        "id": "local-fare-card-batch-integrity-investigation",
        "title": "MIFARE Fare Card Batch Integrity Investigation",
        "description": (
            "Identified a systematic mapping mismatch affecting approximately 125,000 "
            "MIFARE fare cards, isolated the affected inventory, supported its warranty "
            "replacement, and introduced a validation process that prevented recurrence."
        ),
        "href": "projects/fare-card-batch-integrity-investigation.html",
        "image_url": None,
        "is_published": True,
        "sort_order": 80,
    },
    {
        "id": "local-pulse-operational-workspace",
        "title": "Pulse Operational Workspace",
        "description": (
            "Operational work management with portfolio intelligence, flexible boards, "
            "service discovery, and guided execution."
        ),
        "href": "projects/pulse-operational-workspace.html",
        "image_url": "/assets/images/projects/pulse-operational-workspace/dashboard.jpg",
        "is_published": True,
        "sort_order": 999,
    }
]

LOCAL_PREVIEW_SLUGS = {
    "fleet-maintenance-analytics",
    "inventory-control-dashboard",
    "gps-movement-analytics",
    "techloc-fleet-service-control",
    "repossession-risk-monitoring",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate crawlable project cards and project metadata."
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Use the embedded project snapshot instead of querying Supabase.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero when generated output differs from committed files.",
    )
    return parser.parse_args()


def read_public_config() -> tuple[str, str, str]:
    source = SUPABASE_CONFIG_PATH.read_text(encoding="utf-8")
    url_match = re.search(r"\burl:\s*['\"]([^'\"]+)['\"]", source)
    key_match = re.search(r"\banonKey:\s*['\"]([^'\"]+)['\"]", source)
    bucket_match = re.search(r"\bassetsBucket:\s*['\"]([^'\"]+)['\"]", source)
    if not url_match or not key_match:
        raise RuntimeError("Supabase public URL or anon key was not found in js/supabase-config.js")
    return (
        url_match.group(1).rstrip("/"),
        key_match.group(1),
        bucket_match.group(1) if bucket_match else "resume-cms",
    )


def load_case_studies() -> dict[str, dict]:
    payload = json.loads(CASE_STUDIES_PATH.read_text(encoding="utf-8"))
    projects = payload.get("projects", {})
    return projects if isinstance(projects, dict) else {}


def load_embedded_projects(page_source: str) -> list[dict]:
    match = re.search(
        r'<script\s+type="application/json"\s+data-projects-fallback="1">([\s\S]*?)</script>',
        page_source,
    )
    if not match:
        return []
    payload = json.loads(match.group(1))
    return payload if isinstance(payload, list) else []


def fetch_public_projects(supabase_url: str, anon_key: str) -> list[dict]:
    query = quote("sort_order.asc,id.asc", safe=".,")
    url = (
        f"{supabase_url}/rest/v1/projects"
        f"?select=*&is_published=eq.true&order={query}"
    )
    request = Request(
        url,
        headers={
            "apikey": anon_key,
            "Authorization": f"Bearer {anon_key}",
            "Accept": "application/json",
        },
    )
    with urlopen(request, timeout=20) as response:
        payload = json.load(response)
    if not isinstance(payload, list):
        raise RuntimeError("Supabase projects response was not a list")
    return [item for item in payload if isinstance(item, dict)]


def href_to_slug(raw_href: object) -> str:
    href = str(raw_href or "").strip().split("#", 1)[0].split("?", 1)[0]
    filename = href.rstrip("/").rsplit("/", 1)[-1]
    return re.sub(r"\.html$", "", filename, flags=re.IGNORECASE)


def normalize_project_href(raw_href: object) -> str:
    href = str(raw_href or "").strip()
    if not href:
        return ""
    parsed = urlparse(href)
    path = parsed.path
    match = re.search(r"(?:^|/)projects/([a-z0-9][a-z0-9-]*\.html)$", path, re.IGNORECASE)
    if not match:
        return ""
    suffix = f"?{parsed.query}" if parsed.query else ""
    suffix += f"#{parsed.fragment}" if parsed.fragment else ""
    return f"projects/{match.group(1)}{suffix}"


def merge_projects(remote_projects: list[dict], case_studies: dict[str, dict]) -> list[dict]:
    merged = [dict(item) for item in remote_projects]
    for local_project in LOCAL_PROJECTS:
        local_slug = href_to_slug(local_project["href"])
        existing_index = next(
            (
                index
                for index, item in enumerate(merged)
                if href_to_slug(item.get("href")) == local_slug
            ),
            None,
        )
        if existing_index is None:
            merged.append(dict(local_project))
        else:
            merged[existing_index].update(local_project)

    normalized = []
    for project in merged:
        href = normalize_project_href(project.get("href"))
        if not href:
            continue
        project["href"] = href
        slug = href_to_slug(href)
        if slug in case_studies:
            case_study = case_studies[slug]
            project["case_study"] = case_study
            if str(case_study.get("summary") or "").strip():
                project["description"] = str(case_study["summary"]).strip()
        normalized.append(project)
    featured_rank = {slug: index for index, slug in enumerate(FEATURED_PROJECT_SLUGS)}
    normalized.sort(
        key=lambda project: featured_rank.get(
            href_to_slug(project.get("href")), len(FEATURED_PROJECT_SLUGS)
        )
    )
    return normalized


def normalize_asset_url(raw_url: object, supabase_url: str, bucket: str) -> str:
    url = str(raw_url or "").strip()
    if not url:
        return ""
    if re.match(r"^(?:https?:|data:|blob:)", url, re.IGNORECASE) or url.startswith("/"):
        return url
    cleaned = re.sub(r"^(?:\.\.?/)+", "", url)
    if cleaned.startswith("assets/"):
        cleaned = cleaned[len("assets/") :]
    if cleaned.startswith(("images/", "projects/")):
        return f"{supabase_url}/storage/v1/object/public/{bucket}/{cleaned}"
    return f"../{cleaned}"


def render_card(project: dict, supabase_url: str, bucket: str) -> str:
    title = str(project.get("title") or "Untitled project").strip()
    href = normalize_project_href(project.get("href")) or "#"
    slug = href_to_slug(href)
    case_study = project.get("case_study")
    case_study = case_study if isinstance(case_study, dict) else None
    description = str(
        (case_study or {}).get("summary") or project.get("description") or ""
    ).strip()
    project_id = str(project.get("id") or "").strip()

    image_url = normalize_asset_url(project.get("image_url"), supabase_url, bucket)
    if not image_url and slug in LOCAL_PREVIEW_SLUGS:
        image_url = f"../assets/images/projects/previews/{slug}.jpg"
    if not image_url:
        image_url = GENERIC_PROJECT_IMAGE

    fallback_attr = ""
    if image_url != GENERIC_PROJECT_IMAGE:
        fallback_attr = (
            f' data-fallback-src="{html.escape(GENERIC_PROJECT_IMAGE, quote=True)}"'
        )
    image_html = (
        f'<img src="{html.escape(image_url, quote=True)}"{fallback_attr} '
        f'alt="{html.escape(title, quote=True)}" loading="lazy">'
    )

    description_html = (
        f'<p class="project-desc">{html.escape(description)}</p>' if description else ""
    )
    case_study_html = ""
    if case_study:
        problem = str(case_study.get("problem") or "").strip()
        impact = str(case_study.get("impact") or "").strip()
        tools = case_study.get("tools")
        tools = tools if isinstance(tools, list) else []
        preview_rows = ""
        if problem:
            preview_rows += f'<p><span>Problem</span>{html.escape(problem)}</p>'
        if impact:
            preview_rows += f'<p><span>Value</span>{html.escape(impact)}</p>'
        tags = "".join(
            f"<span>{html.escape(str(tool))}</span>" for tool in tools[:3] if str(tool).strip()
        )
        tags_html = (
            f'<div class="project-card-tags" aria-label="Tools and domains">{tags}</div>'
            if tags
            else ""
        )
        case_study_html = (
            '<div class="project-case-study-marker">Professional case study</div>'
            f'<div class="project-case-study-preview">{preview_rows}</div>'
            f"{tags_html}"
        )

    modifier = " project-card--case-study" if case_study else ""
    id_attr = f' data-project-id="{html.escape(project_id, quote=True)}"' if project_id else ""
    safe_href = html.escape(href, quote=True)
    return (
        f'<article class="project-card{modifier}"{id_attr}>'
        f'<a href="{safe_href}" class="project-img-frame">{image_html}</a>'
        '<div class="project-content">'
        f'<h2 class="project-title"><a href="{safe_href}">{html.escape(title)}</a></h2>'
        f"{description_html}{case_study_html}"
        f'<a href="{safe_href}" class="project-link">View Case Study →</a>'
        "</div></article>"
    )


def safe_json(payload: object) -> str:
    return (
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
    )


def replace_static_projects(
    page_source: str,
    projects: list[dict],
    supabase_url: str,
    bucket: str,
) -> str:
    cards = "\n                ".join(
        render_card(project, supabase_url, bucket) for project in projects
    )
    static_content = f"{STATIC_START}\n                {cards}\n                {STATIC_END}"
    block_pattern = re.compile(
        re.escape(STATIC_START) + r"[\s\S]*?" + re.escape(STATIC_END)
    )
    if not block_pattern.search(page_source):
        raise RuntimeError("Project static markers were not found in pages/projects.html")
    page_source = block_pattern.sub(lambda _match: static_content, page_source, count=1)

    snapshot = safe_json(projects)
    snapshot_pattern = re.compile(
        r'(<script\s+type="application/json"\s+data-projects-fallback="1">)[\s\S]*?(</script>)'
    )
    if not snapshot_pattern.search(page_source):
        raise RuntimeError("Project fallback JSON element was not found in pages/projects.html")
    return snapshot_pattern.sub(
        lambda match: f"{match.group(1)}{snapshot}{match.group(2)}",
        page_source,
        count=1,
    )


def text_content(fragment: str) -> str:
    without_tags = re.sub(r"<[^>]+>", " ", fragment)
    return " ".join(html.unescape(without_tags).split())


def upsert_head_metadata(source: str, description: str, canonical_url: str) -> str:
    escaped_description = html.escape(description, quote=True)
    description_tag = f'<meta name="description" content="{escaped_description}">' 
    canonical_tag = f'<link rel="canonical" href="{html.escape(canonical_url, quote=True)}">'

    description_pattern = re.compile(r'<meta\s+name="description"\s+content="[^"]*"\s*/?>', re.IGNORECASE)
    canonical_pattern = re.compile(r'<link\s+rel="canonical"\s+href="[^"]*"\s*/?>', re.IGNORECASE)

    if description_pattern.search(source):
        source = description_pattern.sub(description_tag, source, count=1)
    else:
        source = re.sub(r"(\s*</title>)", rf"\1\n  {description_tag}", source, count=1)

    if canonical_pattern.search(source):
        source = canonical_pattern.sub(canonical_tag, source, count=1)
    else:
        source = source.replace(description_tag, f"{description_tag}\n  {canonical_tag}", 1)
    return source


def update_detail_metadata(path: Path, source: str) -> str:
    hero_match = re.search(
        r'<section\s+class="hero"[^>]*>[\s\S]*?<h1[^>]*>[\s\S]*?</h1>\s*<p[^>]*>([\s\S]*?)</p>',
        source,
        re.IGNORECASE,
    )
    if not hero_match:
        raise RuntimeError(f"Could not find a hero summary in {path.relative_to(ROOT)}")
    seo_description_match = re.search(
        r'<section\s+class="hero"[^>]*\sdata-seo-description="([^"]+)"',
        source,
        re.IGNORECASE,
    )
    description = (
        html.unescape(seo_description_match.group(1)).strip()
        if seo_description_match
        else text_content(hero_match.group(1))
    )
    canonical = f"{SITE_ORIGIN}/pages/projects/{path.name}"
    return upsert_head_metadata(source, description, canonical)


def write_or_check(path: Path, content: str, check: bool, stale: list[str]) -> None:
    current = path.read_text(encoding="utf-8")
    if current == content:
        return
    if check:
        stale.append(str(path.relative_to(ROOT)))
        return
    path.write_text(content, encoding="utf-8")
    print(f"Updated: {path.relative_to(ROOT)}")


def main() -> int:
    args = parse_args()
    page_source = PROJECTS_PAGE.read_text(encoding="utf-8")
    supabase_url, anon_key, bucket = read_public_config()
    case_studies = load_case_studies()

    if args.offline:
        projects = load_embedded_projects(page_source)
    else:
        try:
            projects = fetch_public_projects(supabase_url, anon_key)
        except Exception as exc:
            projects = load_embedded_projects(page_source)
            if not projects:
                raise RuntimeError(f"Could not fetch projects and no embedded snapshot exists: {exc}") from exc
            print(f"Warning: Supabase fetch failed; using embedded snapshot: {exc}", file=sys.stderr)

    projects = merge_projects(projects, case_studies)
    if not projects:
        raise RuntimeError("No published projects were available for pre-rendering")

    page_source = replace_static_projects(page_source, projects, supabase_url, bucket)
    page_source = upsert_head_metadata(
        page_source,
        "Professional case studies in technical operations, fleet maintenance, inventory control, and operational analytics.",
        f"{SITE_ORIGIN}/pages/projects.html",
    )

    stale: list[str] = []
    write_or_check(PROJECTS_PAGE, page_source, args.check, stale)

    for path in sorted(PROJECT_DETAILS_DIR.glob("*.html")):
        if path.name == "project-template.html":
            continue
        source = path.read_text(encoding="utf-8")
        updated = update_detail_metadata(path, source)
        write_or_check(path, updated, args.check, stale)

    if stale:
        print("Project pre-render output is stale:", file=sys.stderr)
        for item in stale:
            print(f"- {item}", file=sys.stderr)
        return 1

    print(f"Pre-rendered {len(projects)} published projects.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
