#!/usr/bin/env python3
"""Apply mappings from data-cache/linkedin_private_cursor_own_mappings.json only.

Merges new personal /in/ URLs into linkedin-private-cursor alongside any URLs
already present (deduped). Does not read or write linkedin_private_cursor_manual_mappings.json.

Run: python3 scripts/apply_linkedin_private_cursor_own_mappings.py
"""
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path


DATASETS_DIR = Path("datasets")
OWN_MAPPINGS_PATH = Path("data-cache/linkedin_private_cursor_own_mappings.json")
COL = "linkedin-private-cursor"


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


def urls_from_cell(text: str) -> list[str]:
    if not (text or "").strip():
        return []
    parts = re.split(r"[\s,;]+", text)
    return dedupe_urls(parts)


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


def load_own_mappings() -> tuple[dict[str, list[str]], dict[str, list[str]], dict[str, list[str]]]:
    if not OWN_MAPPINGS_PATH.exists():
        print(f"Missing {OWN_MAPPINGS_PATH}", file=sys.stderr)
        return {}, {}, {}
    with OWN_MAPPINGS_PATH.open(encoding="utf-8") as handle:
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
    return firms, people, companies


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


def target_urls(
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


def merged_cursor_value(row: dict[str, str], new_urls: list[str]) -> str | None:
    existing_raw = (row.get(COL) or "").strip()
    existing_urls = urls_from_cell(existing_raw) if existing_raw else []
    merged = dedupe_urls(existing_urls + new_urls)
    if not merged:
        return None
    out = ", ".join(merged)
    if out == existing_raw:
        return None
    return out


def main() -> int:
    firm_map, people_map, company_map = load_own_mappings()
    if not firm_map and not people_map and not company_map:
        return 1

    changed_files: dict[str, int] = {}

    for csv_path in sorted(DATASETS_DIR.glob("*.csv")):
        with csv_path.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            rows = list(reader)
            fieldnames = list(reader.fieldnames or [])

        if COL not in fieldnames:
            continue

        changed = 0
        for row in rows:
            new_urls = target_urls(row, firm_map, people_map, company_map)
            if not new_urls:
                continue
            value = merged_cursor_value(row, new_urls)
            if value is None:
                continue
            row[COL] = value
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
