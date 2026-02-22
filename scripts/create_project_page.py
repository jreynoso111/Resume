#!/usr/bin/env python3
"""Create a standardized project page from pages/projects/project-template.html."""

from __future__ import annotations

import argparse
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_PATH = ROOT / "pages" / "projects" / "project-template.html"


DEFAULTS = {
    "{{PROJECT_SUMMARY}}": "Short summary of the project mission and value.",
    "{{PROJECT_OVERVIEW}}": "Describe context, scope, and operational objective.",
    "{{COMPONENT_1_TITLE}}": "Component 1",
    "{{COMPONENT_1_DESC}}": "Describe what this component solves.",
    "{{COMPONENT_2_TITLE}}": "Component 2",
    "{{COMPONENT_2_DESC}}": "Describe what this component solves.",
    "{{COMPONENT_3_TITLE}}": "Component 3",
    "{{COMPONENT_3_DESC}}": "Describe what this component solves.",
    "{{FEATURE_1}}": "Feature one.",
    "{{FEATURE_2}}": "Feature two.",
    "{{FEATURE_3}}": "Feature three.",
    "{{FEATURE_4}}": "Feature four.",
    "{{PROJECT_IMPACT}}": "Summarize measurable operational or business impact.",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a standardized project page.")
    parser.add_argument("--slug", required=True, help="Output slug, e.g. 'new-project-name'.")
    parser.add_argument("--title", required=True, help="Project title.")
    parser.add_argument("--force", action="store_true", help="Overwrite file if it already exists.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    template = TEMPLATE_PATH.read_text(encoding="utf-8")

    output_path = ROOT / "pages" / "projects" / f"{args.slug}.html"
    if output_path.exists() and not args.force:
        raise SystemExit(f"File already exists: {output_path}. Use --force to overwrite.")

    out = template.replace("{{PROJECT_SLUG}}", args.slug).replace("{{PROJECT_TITLE}}", args.title)
    for key, value in DEFAULTS.items():
        out = out.replace(key, value)

    output_path.write_text(out, encoding="utf-8")
    print(f"Created: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
