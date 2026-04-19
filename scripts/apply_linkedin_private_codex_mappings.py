#!/usr/bin/env python3
import csv
import json
import re
from pathlib import Path


DATASETS_DIR = Path("datasets")
MAPPINGS_PATH = Path("data-cache/linkedin_private_codex_manual_mappings.json")


def normalize_key(value: str) -> str:
    value = (value or "").strip().lower()
    value = value.replace("&", " and ")
    value = re.sub(r"https?://", "", value)
    value = re.sub(r"www\\.", "", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\\s+", " ", value).strip()


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
    seen = set()
    output = []
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


def load_mappings() -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    with MAPPINGS_PATH.open(encoding="utf-8") as handle:
        payload = json.load(handle)

    firms = {
        normalize_key(key): dedupe_urls(value)
        for key, value in payload.get("firms", {}).items()
    }
    people = {
        normalize_key(key): dedupe_urls(value)
        for key, value in payload.get("people", {}).items()
    }
    return firms, people


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
    keys = []
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


def target_urls(row: dict[str, str], firm_map: dict[str, list[str]], people_map: dict[str, list[str]]) -> list[str]:
    urls = []
    for key in person_keys(row):
        urls.extend(people_map.get(key, []))
    if urls:
        return dedupe_urls(urls)

    for key in firm_keys(row):
        urls.extend(firm_map.get(key, []))
    return dedupe_urls(urls)


def main() -> None:
    firm_map, people_map = load_mappings()
    changed_files = {}

    for csv_path in sorted(DATASETS_DIR.glob("*.csv")):
        with csv_path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            rows = list(reader)
            fieldnames = reader.fieldnames or []

        if "linkedin-private-codex" not in fieldnames:
            continue

        changed = 0
        for row in rows:
            urls = target_urls(row, firm_map, people_map)
            if not urls:
                continue
            value = ", ".join(urls)
            if (row.get("linkedin-private-codex") or "").strip() == value:
                continue
            row["linkedin-private-codex"] = value
            changed += 1

        if not changed:
            continue

        with csv_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        changed_files[csv_path.name] = changed

    print(json.dumps(changed_files, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
