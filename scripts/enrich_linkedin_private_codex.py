#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
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

PERSONAL_RE = re.compile(r"linkedin\.com/(?:in|pub)/", re.IGNORECASE)
COMPANY_RE = re.compile(r"linkedin\.com/(?:company|school)/", re.IGNORECASE)
ENTITY_HINT_RE = re.compile(
    r"\b("
    r"ventures?|capital|partners?|fund|funds|vc|ventures?studio|studio|labs?|"
    r"holdings?|group|global|collective|syndicate|family office|accelerator|"
    r"inc|llc|ltd|gmbh|sarl|sa|plc|bv|oy|ag|co|corporate|management|investments?"
    r")\b",
    re.IGNORECASE,
)

PERSON_FILE_MARKERS = (
    "003__html__global_active_investors_list_google_drive.csv",
    "009__native__folk_all_vcs_2026_02_15_people.csv",
    "011__native__folk_european_family_offices_founders_2026_02_15_people.csv",
    "013__native__mercury_com_2026_02_15.csv",
    "014__native__people.csv",
    "016__zip__folk_200_ai_angel_investors_2026_02_15_people.csv",
    "017__zip__folk_300_australian_early_stage_investors_2026_02_15_people.csv",
    "019__zip__folk_350_most_active_angel_investors_in_usa_2026_02_15_people.csv",
    "020__zip__folk_all_vcs_2026_02_15_people_2.csv",
    "022__zip__folk_data_investors_in_asia_2026_02_15_people.csv",
    "023__zip__folk_early_stage_web_3_us_investors_2026_02_15_people.csv",
    "024__zip__folk_gen_ai_investors_in_asia_2026_02_15_people.csv",
    "025__zip__folk_les_vc_francais_399_options_pour_lever_des_fonds_2026_02_15_people.csv",
    "027__zip__folk_top_300_angel_investors_in_middle_east_2026_02_15_people.csv",
)

FIRM_FILE_MARKERS = (
    "001__html__deep_tech_investors_mapping_public_version_google_drive.csv",
    "002__html__euro_tech_vc_funds_from_1_2016_please_read_first_tab_google_drive.csv",
    "004__html__micro_vc_seed_fund_spreadsheet_google_drive.csv",
    "005__html__pre_seed_vc_firms_google_drive.csv",
    "006__html__the_ultimate_list_of_750_seed_funds_google_drive.csv",
    "007__html__vc_firms_that_accept_cold_outreach_from_founders_google_drive.csv",
    "008__native__early_stage_nyc_vcs_grid_view.csv",
    "010__native__folk_corporate_venture_arms_2026_02_15_companies.csv",
    "012__native__list_5000_vc_family_office_angel_networks_accelerators_5_000_vc_250_fos_accelerators_angel_networks.csv",
    "015__zip__folk_100_best_vc_funds_in_uk_2026_02_15_companies.csv",
    "018__zip__folk_100_vc_firms_investing_in_saas_2026_02_15_companies.csv",
    "021__zip__folk_all_accelerators_2026_02_15_companies.csv",
    "026__zip__folk_most_prolific_investment_firms_number_of_investments_2026_02_15_companies.csv",
)


def load_cache() -> dict[str, Any]:
    if not CACHE_PATH.exists():
        return {"firms": {}, "people": {}}

    raw = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {
        "firms": {
            key: {"urls": dedupe_urls(value.get("urls", [])), "sources": value.get("sources", [])}
            for key, value in raw.get("firms", {}).items()
        },
        "people": {
            key: {"urls": dedupe_urls(value.get("urls", [])), "sources": value.get("sources", [])}
            for key, value in raw.get("people", {}).items()
        },
    }


def normalize_raw_url(value: str) -> str:
    raw = (value or "").strip().strip('"').strip("'")
    if not raw:
        return ""
    lowered = raw.lower()
    if lowered.startswith(("linkedin.com", "www.linkedin.com", "ww.linkedin.com")):
        return "https://" + raw
    if "linkedin.com" in lowered and not lowered.startswith(("http://", "https://")):
        return "https://" + raw
    return raw


def normalize_linkedin_url(value: str) -> str:
    raw = normalize_raw_url(value)
    if not raw or "linkedin.com" not in raw.lower():
        return ""

    parsed = urlparse(raw)
    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    if host.startswith(
        ("at.", "au.", "ca.", "de.", "es.", "fr.", "il.", "in.", "ph.", "pr.", "pt.", "sl.", "tw.", "uk.")
    ):
        host = host.split(".", 1)[1]
    if host != "linkedin.com":
        return ""

    path = re.sub(r"/+", "/", parsed.path or "").rstrip("/")
    path = path.replace("/company-beta/", "/company/")
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
        if not normalized or not is_personal_linkedin(normalized) or normalized in seen:
            continue
        seen.add(normalized)
        ordered.append(normalized)
    return ordered


def split_linkedin_fragments(value: str) -> list[str]:
    if not value or "linkedin.com" not in value.lower():
        return []
    return [fragment for fragment in re.split(r"[\s,;|]+", value) if "linkedin.com" in fragment.lower()]


def row_existing_linkedins(row: dict[str, str]) -> tuple[list[str], list[str]]:
    personal: list[str] = []
    company: list[str] = []
    for value in row.values():
        for fragment in split_linkedin_fragments(value):
            normalized = normalize_linkedin_url(fragment)
            if not normalized:
                continue
            if is_personal_linkedin(normalized):
                personal.append(normalized)
            elif is_company_linkedin(normalized):
                company.append(normalized)
    return dedupe_urls(personal), list(dict.fromkeys(company))


def clean_name(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def normalize_key(value: str) -> str:
    lowered = clean_name(value).casefold()
    lowered = re.sub(r"[^a-z0-9]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def normalize_domain(value: str) -> str:
    raw = clean_name(value)
    if not raw:
        return ""
    if not raw.startswith(("http://", "https://")):
        raw = "https://" + raw
    parsed = urlparse(raw)
    host = parsed.netloc.lower().strip()
    if host.startswith("www."):
        host = host[4:]
    return host


def looks_like_person_name(value: str) -> bool:
    name = clean_name(value)
    if not name:
        return False
    if ENTITY_HINT_RE.search(name):
        return False
    if any(char.isdigit() for char in name):
        return False
    tokens = [token for token in re.split(r"[\s/,&()-]+", name) if token]
    if len(tokens) < 2 or len(tokens) > 4:
        return False
    alpha_tokens = [token for token in tokens if re.search(r"[A-Za-z]", token)]
    return len(alpha_tokens) == len(tokens)


def detect_row_kind(path: Path, row: dict[str, str]) -> str:
    contact_type = clean_name(row.get("contactType", "")).casefold()
    if contact_type == "person":
        return "person"
    if contact_type == "company":
        return "firm"

    filename = path.name
    if filename in PERSON_FILE_MARKERS:
        return "person"
    if filename in FIRM_FILE_MARKERS:
        return "firm"

    filename = filename.casefold()
    if "_companies" in filename:
        return "firm"
    if "_people" in filename:
        return "person"

    if clean_name(row.get("firstname", "")) or clean_name(row.get("lastname", "")):
        return "person"
    if clean_name(row.get("What's your full name?", "")):
        return "person"
    if clean_name(row.get("investor_namesort_asc", "")) or clean_name(row.get("data", "")):
        return "person"

    if clean_name(row.get("Fund Name", "")) or clean_name(row.get("Firm Name", "")) or clean_name(row.get("Fund", "")):
        return "firm"
    if clean_name(row.get("name", "")):
        return "firm"
    if clean_name(row.get("Name", "")) and (
        clean_name(row.get("Type", "")) or clean_name(row.get("Parent Company", "")) or clean_name(row.get("Country HQ", ""))
    ):
        return "firm"

    investor_name = clean_name(row.get("Investor name", ""))
    if investor_name:
        return "person" if looks_like_person_name(investor_name) else "firm"

    return "unknown"


def infer_person_name(row: dict[str, str], row_kind: str) -> str:
    if row_kind != "person":
        return ""

    firstname = clean_name(row.get("firstname", ""))
    lastname = clean_name(row.get("lastname", ""))
    if firstname or lastname:
        return clean_name(f"{firstname} {lastname}")

    for key in ("What's your full name?", "investor_namesort_asc", "data", "Investor name", "Lead", "Name"):
        value = clean_name(row.get(key, ""))
        if value and (key not in {"Investor name", "Lead", "Name"} or looks_like_person_name(value)):
            return value
    return ""


def infer_firm_name(row: dict[str, str], row_kind: str) -> str:
    for key in (
        "companies",
        "investor_namesort_asc2",
        "data_1",
        "name",
        "Fund Name",
        "Firm",
        "Firm Name",
        "Fund",
        "Parent Company",
    ):
        value = clean_name(row.get(key, ""))
        if value:
            return value

    if row_kind == "firm":
        for key in ("Investor name", "Name"):
            value = clean_name(row.get(key, ""))
            if value:
                return value
    return ""


def infer_context(path: Path, row: dict[str, str]) -> dict[str, str]:
    row_kind = detect_row_kind(path, row)
    firm_linkedin = ""
    _, company_urls = row_existing_linkedins(row)
    if company_urls:
        firm_linkedin = company_urls[0]
    return {
        "row_kind": row_kind,
        "person_name": infer_person_name(row, row_kind),
        "firm_name": infer_firm_name(row, row_kind),
        "website": clean_name(
            row.get("favoriteUrl", "")
            or row.get("Website", "")
            or row.get("Web", "")
            or row.get("URL", "")
            or row.get("urls", "")
            or row.get("item_page_link", "")
        ),
        "location": clean_name(
            row.get("Location", "")
            or row.get("Global HQ", "")
            or row.get("Main HQ", "")
            or row.get("Country HQ", "")
            or row.get("Location (City)", "")
            or row.get("Country", "")
        ),
        "job_title": clean_name(row.get("jobTitle", "") or row.get("Lead", "") or row.get("stages", "")),
        "description": clean_name(
            row.get("description", "")
            or row.get("Fund Description", "")
            or row.get("Investment thesis", "")
            or row.get("Bio", "")
            or row.get("Keeping questions limited for now, so feel free to add anything extra here...", "")
        ),
        "firm_linkedin": firm_linkedin,
        "website_domain": normalize_domain(
            row.get("favoriteUrl", "") or row.get("Website", "") or row.get("Web", "") or row.get("URL", "") or row.get("urls", "")
        ),
    }


def person_cache_key(person_name: str, firm_name: str) -> str:
    return f"{normalize_key(person_name)}::{normalize_key(firm_name)}"


def firm_cache_keys(context: dict[str, str]) -> list[str]:
    candidates = [
        normalize_key(context["firm_name"]),
        normalize_key(context["person_name"]) if context["row_kind"] == "firm" else "",
        normalize_key(context["website_domain"]),
        normalize_key(context["firm_linkedin"].rsplit("/", 1)[-1]),
    ]
    return [candidate for candidate in candidates if candidate]


def normalize_existing_codex(row: dict[str, str]) -> list[str]:
    return dedupe_urls(split_linkedin_fragments(row.get(LINKEDIN_PRIVATE_COLUMN, "")))


def choose_urls(path: Path, row: dict[str, str], cache: dict[str, Any]) -> tuple[list[str], str, dict[str, str]]:
    context = infer_context(path, row)
    person_key = person_cache_key(context["person_name"], context["firm_name"])
    row_kind = context["row_kind"]
    existing_codex = normalize_existing_codex(row)
    existing_personal, existing_company = row_existing_linkedins(row)

    if existing_codex:
        return existing_codex, "existing-codex", context

    if row_kind == "person" and person_key in cache["people"] and cache["people"][person_key]["urls"]:
        return cache["people"][person_key]["urls"], "cache-person", context

    if existing_personal:
        return existing_personal, "existing-personal", context

    if row_kind == "firm" or existing_company:
        for firm_key in firm_cache_keys(context):
            cached = cache["firms"].get(firm_key)
            if cached and cached["urls"]:
                return cached["urls"], "cache-firm", context
        return [], "needs-firm-research", context

    if row_kind == "person" and context["person_name"]:
        return [], "needs-person-research", context

    if row_kind == "firm" and (context["firm_name"] or context["person_name"]):
        return [], "needs-firm-research", context

    return [], "unclassified", context


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=True) + "\n")


def summarize_pending(records: list[dict[str, Any]], key_fields: tuple[str, ...]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, ...], dict[str, Any]] = {}
    counts: defaultdict[tuple[str, ...], int] = defaultdict(int)
    for record in records:
        key = tuple(clean_name(str(record.get(field, ""))) for field in key_fields)
        counts[key] += 1
        if key not in grouped:
            grouped[key] = dict(record)
            grouped[key]["rows"] = 0
        grouped[key]["rows"] = counts[key]
    return sorted(grouped.values(), key=lambda item: (-int(item["rows"]), str(item.get(key_fields[0], ""))))


def process_csv(
    path: Path,
    cache: dict[str, Any],
    summary: dict[str, Any],
    pending_people: list[dict[str, Any]],
    pending_firms: list[dict[str, Any]],
) -> None:
    with path.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        fieldnames = list(reader.fieldnames or [])
        if LINKEDIN_PRIVATE_COLUMN not in fieldnames:
            fieldnames.append(LINKEDIN_PRIVATE_COLUMN)
        rows = list(reader)

    source_counter: Counter[str] = Counter()
    kind_counter: Counter[str] = Counter()
    non_blank = 0

    for index, row in enumerate(rows, start=2):
        urls, source, context = choose_urls(path, row, cache)
        row[LINKEDIN_PRIVATE_COLUMN] = ", ".join(urls)
        source_counter[source] += 1
        kind_counter[context["row_kind"]] += 1
        if urls:
            non_blank += 1
            continue

        if source == "needs-person-research":
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
                    "firm_name": context["firm_name"] or context["person_name"],
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
        "row_kinds": dict(kind_counter),
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

    unique_people = summarize_pending(pending_people, ("person_name", "firm_name"))
    unique_firms = summarize_pending(pending_firms, ("firm_name", "website"))

    summary["totals"] = {
        "files": len(summary["files"]),
        "pending_people_rows": len(pending_people),
        "pending_firms_rows": len(pending_firms),
        "pending_people_unique": len(unique_people),
        "pending_firms_unique": len(unique_firms),
        "cached_people_keys": len(cache["people"]),
        "cached_firm_keys": len(cache["firms"]),
    }

    SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=True, indent=2), encoding="utf-8")
    write_jsonl(PENDING_PEOPLE_PATH, unique_people)
    write_jsonl(PENDING_FIRMS_PATH, unique_firms)


if __name__ == "__main__":
    main()
