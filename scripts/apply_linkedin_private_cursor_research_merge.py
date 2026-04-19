#!/usr/bin/env python3
"""Merge web-researched /in/ URLs from a session-owned JSON in research/ into linkedin-private-cursor.

Reads only the JSON path you pass (default: research/linkedin_private_cursor_research_session_20260418.json).
Does not read data-cache/linkedin_private_cursor_agent_enrichment.json or manual_mappings.

Same key rules as scripts/apply_linkedin_private_cursor_agent_enrichment.py (firms / people / companies).

Optional JSON field ``no_match_firms``: array of display names (or keys). For any dataset row whose
``firm_keys`` intersects that set, if ``linkedin-private-cursor`` is blank and ``research_target_urls``
finds no URLs from this file, the cell is set to ``-`` (researched, no verified /in/ URL). Does not
overwrite non-empty cells that already contain URLs.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DATASETS_DIR = REPO_ROOT / "datasets"
DEFAULT_RESEARCH_JSON = REPO_ROOT / "research" / "linkedin_private_cursor_research_session_20260418.json"


def normalize_key(value: str) -> str:
    value = (value or "").strip().lower()
    value = value.replace("&", " and ")
    value = re.sub(r"https?://", "", value)
    value = re.sub(r"www\.", "", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def clean_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    url = url.split("?", 1)[0].rstrip("/")
    if "linkedin.com/in/" not in url and "linkedin.com/pub/" not in url:
        return ""
    if "/pub/dir" in url:
        return ""
    return url


def dedupe_urls(urls: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for raw in urls:
        url = clean_url(raw)
        if not url:
            continue
        key = url.lower()
        if key in seen:
            continue
        seen.add(key)
        output.append(url)
    return output


COMPANY_PATH_RE = re.compile(
    r"(?:https?://)?(?:[\w-]+\.)?linkedin\.com/company/([^/?\s\"'<>]+)", re.IGNORECASE
)


def sanitize_company_slug(fragment: str) -> str:
    frag = (fragment or "").strip().lower().rstrip("/")
    if "," in frag:
        frag = frag.split(",", 1)[0].strip()
    return frag


def normalize_company_map_key(url_or_path: str) -> str:
    text = (url_or_path or "").strip()
    if not text:
        return ""
    m = COMPANY_PATH_RE.search(text)
    if not m:
        return ""
    slug = sanitize_company_slug(m.group(1))
    if not slug:
        return ""
    return f"linkedin.com/company/{slug}"


def company_keys_from_row(row: dict[str, str]) -> list[str]:
    seen: set[str] = set()
    keys: list[str] = []
    for value in row.values():
        if not value:
            continue
        for m in COMPANY_PATH_RE.finditer(value):
            key = normalize_company_map_key(m.group(0))
            if not key or key in seen:
                continue
            seen.add(key)
            keys.append(key)
    return keys


def load_research_mappings(path: Path) -> tuple[dict[str, list[str]], dict[str, list[str]], dict[str, list[str]], set[str]]:
    if not path.exists():
        return {}, {}, {}, set()
    with path.open(encoding="utf-8") as handle:
        payload = json.load(handle)

    firms = {
        normalize_key(key): dedupe_urls(value)
        for key, value in payload.get("firms", {}).items()
    }
    people = {
        normalize_key(key): dedupe_urls(value)
        for key, value in payload.get("people", {}).items()
    }
    companies: dict[str, list[str]] = {}
    for key, value in payload.get("companies", {}).items():
        nk = normalize_company_map_key(key)
        if not nk:
            continue
        companies[nk] = dedupe_urls(value)
    no_match: set[str] = set()
    for raw in payload.get("no_match_firms", []) or []:
        nk = normalize_key(str(raw))
        if nk:
            no_match.add(nk)
    return firms, people, companies, no_match


def person_keys(row: dict[str, str]) -> list[str]:
    full_name = " ".join(
        x for x in [(row.get("firstname") or "").strip(), (row.get("lastname") or "").strip()] if x
    ).strip()
    firm = (
        row.get("companies")
        or row.get("data_1")
        or row.get("investor_namesort_asc2")
        or row.get("Fund Name")
        or row.get("Investor name")
        or ""
    ).strip()
    keys: list[str] = []
    if full_name and firm:
        keys.append(normalize_key(f"{full_name}::{firm}"))
    if full_name:
        keys.append(normalize_key(full_name))
    if row.get("What's your full name?"):
        keys.append(normalize_key(row["What's your full name?"]))
    if row.get("investor_namesort_asc"):
        keys.append(normalize_key(row["investor_namesort_asc"]))
    return [key for key in keys if key]


def firm_keys(row: dict[str, str]) -> list[str]:
    candidates = [
        row.get("companies"),
        row.get("Fund Name"),
        row.get("Fund"),
        row.get("Firm"),
        row.get("Firm Name"),
        row.get("Investor name"),
        row.get("Name"),
        row.get("name") if row.get("contactType") == "company" else "",
        row.get("investor_namesort_asc2"),
        row.get("data_1"),
    ]
    return [normalize_key(value) for value in candidates if (value or "").strip()]


def research_target_urls(
    row: dict[str, str],
    firm_map: dict[str, list[str]],
    people_map: dict[str, list[str]],
    company_map: dict[str, list[str]],
) -> list[str]:
    urls: list[str] = []
    for key in person_keys(row):
        urls.extend(people_map.get(key, []))
    for key in company_keys_from_row(row):
        urls.extend(company_map.get(key, []))
    for key in firm_keys(row):
        urls.extend(firm_map.get(key, []))
    return dedupe_urls(urls)


def parse_cursor_cell(cell: str) -> list[str]:
    """Treat blank or '-' as no stored URLs (dash = researched, none verified)."""
    raw = (cell or "").strip()
    if not raw or raw == "-":
        return []
    parts = re.split(r",\s*", cell)
    return dedupe_urls(parts)


def merge_cursor(existing_cell: str, new_urls: list[str]) -> str:
    merged = dedupe_urls(parse_cursor_cell(existing_cell) + new_urls)
    return ", ".join(merged)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--json",
        type=Path,
        default=DEFAULT_RESEARCH_JSON,
        help=f"Path to research JSON (default: {DEFAULT_RESEARCH_JSON})",
    )
    args = parser.parse_args()
    path: Path = args.json
    if not path.is_absolute():
        path = (REPO_ROOT / path).resolve()

    if not DATASETS_DIR.is_dir():
        print(f"Missing datasets dir: {DATASETS_DIR}", file=sys.stderr)
        return 1
    firm_map, people_map, company_map, no_match_firms = load_research_mappings(path)
    if not firm_map and not people_map and not company_map and not no_match_firms:
        print(f"No mappings in {path}", file=sys.stderr)
        return 0

    changed_files: dict[str, int] = {}
    for csv_path in sorted(DATASETS_DIR.glob("*.csv")):
        if csv_path.name == "MASTER.csv":
            continue
        with csv_path.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            rows = list(reader)
            fieldnames = list(reader.fieldnames or [])

        if "linkedin-private-cursor" not in fieldnames:
            continue

        changed = 0
        for row in rows:
            prev = (row.get("linkedin-private-cursor") or "").strip()
            found = research_target_urls(row, firm_map, people_map, company_map)
            if found:
                merged = merge_cursor(prev, found)
                if merged != prev:
                    row["linkedin-private-cursor"] = merged
                    changed += 1
                continue
            if not no_match_firms:
                continue
            if parse_cursor_cell(prev):
                continue
            if prev == "-":
                continue
            keys = firm_keys(row)
            if not any(k in no_match_firms for k in keys):
                continue
            row["linkedin-private-cursor"] = "-"
            changed += 1

        if not changed:
            continue

        with csv_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        changed_files[csv_path.name] = changed

    print(json.dumps(changed_files, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
