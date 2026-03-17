#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATASETS_DIR = ROOT / "datasets"
CACHE_DIR = ROOT / "data-cache"
LINKEDIN_PRIVATE_COLUMN = "linkedin-private-codex"
CACHE_PATH = CACHE_DIR / "linkedin_private_codex_cache.json"
SUMMARY_PATH = CACHE_DIR / "linkedin_private_codex_summary.json"
PENDING_FIRMS_PATH = CACHE_DIR / "linkedin_private_codex_pending_firms.jsonl"
PENDING_PEOPLE_PATH = CACHE_DIR / "linkedin_private_codex_pending_people.jsonl"

LINKEDIN_RE = re.compile(r"linkedin\.com", re.IGNORECASE)
PERSONAL_RE = re.compile(r"linkedin\.com/(?:in|pub)/", re.IGNORECASE)
COMPANY_RE = re.compile(r"linkedin\.com/(?:company|school)/", re.IGNORECASE)


def load_cache() -> dict[str, dict[str, list[str]]]:
    if not CACHE_PATH.exists():
        return {"firms": {}, "people": {}}

    data = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {
        "firms": {
            key: dedupe_urls(value.get("urls", []))
            for key, value in data.get("firms", {}).items()
        },
        "people": {
            key: dedupe_urls(value.get("urls", []))
            for key, value in data.get("people", {}).items()
        },
    }


def normalize_raw_url(value: str) -> str:
    raw = value.strip().strip('"').strip("'")
    if not raw:
        return ""
    if raw.lower().startswith("linkedin.com"):
        raw = "https://" + raw
    elif raw.lower().startswith("www.linkedin.com") or raw.lower().startswith("ww.linkedin.com"):
        raw = "https://" + raw
    elif raw.lower().startswith("http://linkedin.com") or raw.lower().startswith("http://www.linkedin.com"):
        pass
    elif raw.lower().startswith("https://linkedin.com") or raw.lower().startswith("https://www.linkedin.com"):
        pass
    elif "linkedin.com" in raw.lower() and not raw.lower().startswith(("http://", "https://")):
        raw = "https://" + raw
    return raw


def normalize_linkedin_url(value: str) -> str:
    raw = normalize_raw_url(value)
    if not raw or "linkedin.com" not in raw.lower():
        return ""

    parsed = urlparse(raw)
    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    if host.startswith(("at.", "au.", "ca.", "de.", "es.", "fr.", "il.", "in.", "ph.", "pr.", "pt.", "sl.", "tw.", "uk.")):
        host = host.split(".", 1)[1]
    if host != "linkedin.com":
        return ""

    path = re.sub(r"/+", "/", parsed.path or "").rstrip("/")
    path = path.replace("/company-beta/", "/company/")
    path = path.replace("/company/", "/company/")
    if not path:
        return ""
    parts = [segment for segment in path.split("/") if segment]
    if len(parts) < 2:
        return ""

    kind = parts[0].lower()
    slug = parts[1]
    if kind not in {"in", "pub", "company", "school"}:
        return ""

    return f"https://www.linkedin.com/{kind}/{slug}"


def is_personal_linkedin(url: str) -> bool:
    return bool(PERSONAL_RE.search(url))


def is_company_linkedin(url: str) -> bool:
    return bool(COMPANY_RE.search(url))


def dedupe_urls(urls: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for url in urls:
        normalized = normalize_linkedin_url(url)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        ordered.append(normalized)
    return ordered


def row_existing_linkedins(row: dict[str, str]) -> tuple[list[str], list[str]]:
    personal: list[str] = []
    company: list[str] = []
    for value in row.values():
        if not value or "linkedin.com" not in value.lower():
            continue
        for fragment in re.split(r"[\s,;|]+", value):
            normalized = normalize_linkedin_url(fragment)
            if not normalized:
                continue
            if is_personal_linkedin(normalized):
                personal.append(normalized)
            elif is_company_linkedin(normalized):
                company.append(normalized)
    return dedupe_urls(personal), dedupe_urls(company)


def clean_name(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def normalize_key(value: str) -> str:
    lowered = clean_name(value).casefold()
    lowered = re.sub(r"[^a-z0-9]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def infer_person_name(row: dict[str, str]) -> str:
    firstname = clean_name(row.get("firstname", ""))
    lastname = clean_name(row.get("lastname", ""))
    if firstname or lastname:
        return clean_name(f"{firstname} {lastname}")

    for key in ("What's your full name?", "Investor name", "Lead", "Name"):
        value = clean_name(row.get(key, ""))
        if value:
            return value
    return ""


def infer_firm_name(row: dict[str, str]) -> str:
    for key in ("companies", "name", "Fund Name", "Firm", "Firm Name", "Fund", "Investor name", "Parent Company"):
        value = clean_name(row.get(key, ""))
        if value:
            return value
    return ""


def infer_context(row: dict[str, str]) -> dict[str, str]:
    return {
        "person_name": infer_person_name(row),
        "firm_name": infer_firm_name(row),
        "website": clean_name(row.get("favoriteUrl", "") or row.get("Website", "") or row.get("Web", "") or row.get("URL", "") or row.get("urls", "")),
        "location": clean_name(row.get("Location", "") or row.get("Global HQ", "") or row.get("Main HQ", "") or row.get("Country HQ", "") or row.get("Location (City)", "") or row.get("Country", "")),
        "job_title": clean_name(row.get("jobTitle", "") or row.get("Lead", "")),
        "description": clean_name(row.get("description", "") or row.get("Fund Description", "") or row.get("Investment thesis", "") or row.get("Keeping questions limited for now, so feel free to add anything extra here...", "")),
    }


def person_cache_key(person_name: str, firm_name: str) -> str:
    return f"{normalize_key(person_name)}::{normalize_key(firm_name)}"


def firm_cache_key(firm_name: str) -> str:
    return normalize_key(firm_name)


def choose_urls(row: dict[str, str], cache: dict[str, dict[str, list[str]]]) -> tuple[list[str], str, dict[str, str]]:
    context = infer_context(row)
    person_name = context["person_name"]
    firm_name = context["firm_name"]
    person_key = person_cache_key(person_name, firm_name)
    firm_key = firm_cache_key(firm_name)

    if person_key in cache["people"]:
        return cache["people"][person_key], "cache-person", context

    existing_personal, existing_company = row_existing_linkedins(row)
    if existing_personal:
        return existing_personal, "existing-personal", context

    if firm_key and firm_key in cache["firms"]:
        return cache["firms"][firm_key], "cache-firm", context

    if existing_company:
        return [], "needs-firm-research", context

    if person_name:
        return [], "needs-person-research", context

    if firm_name:
        return [], "needs-firm-research", context

    return [], "unclassified", context


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=True) + "\n")


def process_csv(path: Path, cache: dict[str, dict[str, list[str]]], summary: dict[str, Any], pending_people: list[dict[str, Any]], pending_firms: list[dict[str, Any]]) -> None:
    with path.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        fieldnames = list(reader.fieldnames or [])
        if LINKEDIN_PRIVATE_COLUMN not in fieldnames:
            fieldnames.append(LINKEDIN_PRIVATE_COLUMN)

        rows = list(reader)

    source_counter: Counter[str] = Counter()
    non_blank = 0

    for index, row in enumerate(rows, start=2):
        urls, source, context = choose_urls(row, cache)
        row[LINKEDIN_PRIVATE_COLUMN] = ", ".join(urls)
        source_counter[source] += 1
        if urls:
            non_blank += 1
        elif source == "needs-person-research":
            pending_people.append(
                {
                    "file": path.name,
                    "row_number": index,
                    "person_name": context["person_name"],
                    "firm_name": context["firm_name"],
                    "job_title": context["job_title"],
                    "location": context["location"],
                    "website": context["website"],
                    "description": context["description"][:280],
                }
            )
        elif source == "needs-firm-research":
            pending_firms.append(
                {
                    "file": path.name,
                    "row_number": index,
                    "firm_name": context["firm_name"],
                    "person_name": context["person_name"],
                    "location": context["location"],
                    "website": context["website"],
                    "description": context["description"][:280],
                }
            )

    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    summary["files"][path.name] = {
        "rows": len(rows),
        "rows_with_linkedin_private_codex": non_blank,
        "sources": dict(source_counter),
    }


def main() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache = load_cache()
    summary: dict[str, Any] = {"files": {}}
    pending_people: list[dict[str, Any]] = []
    pending_firms: list[dict[str, Any]] = []

    for path in sorted(DATASETS_DIR.glob("*.csv")):
        process_csv(path, cache, summary, pending_people, pending_firms)

    summary["totals"] = {
        "files": len(summary["files"]),
        "pending_people": len(pending_people),
        "pending_firms": len(pending_firms),
        "cached_people_keys": len(cache["people"]),
        "cached_firm_keys": len(cache["firms"]),
    }

    SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=True, indent=2), encoding="utf-8")
    write_jsonl(PENDING_PEOPLE_PATH, pending_people)
    write_jsonl(PENDING_FIRMS_PATH, pending_firms)


if __name__ == "__main__":
    main()
