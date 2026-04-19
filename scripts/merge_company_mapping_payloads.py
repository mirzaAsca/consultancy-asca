#!/usr/bin/env python3
"""Normalize agent-produced JSON and merge into linkedin_private_cursor_manual_mappings.json."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
MAPPINGS_PATH = REPO / "data-cache" / "linkedin_private_cursor_manual_mappings.json"


def normalize_company_key(key: str) -> str:
    k = (key or "").strip().lower().rstrip("/")
    if not k:
        return ""
    k = k.split("?", 1)[0]
    m = re.search(r"linkedin\.com/company/([^/?\s]+)", k, re.I)
    if m:
        slug = m.group(1).split(",", 1)[0].strip()
    else:
        slug = k.split(",", 1)[0].strip().strip("/")
    return f"linkedin.com/company/{slug}" if slug else ""


def normalize_profile_url(u: str) -> str:
    u = (u or "").strip()
    if not u:
        return ""
    u = u.split("?", 1)[0].rstrip("/")
    if u.startswith("//"):
        u = "https:" + u
    if not u.startswith("http"):
        u = u.lstrip("/")
        if u.startswith("linkedin.com/in/"):
            u = "https://www." + u
        elif "linkedin.com/in/" not in u:
            u = "https://www.linkedin.com/in/" + u.split("/")[-1]
    if "linkedin.com/in/" not in u and "linkedin.com/pub/" not in u:
        return ""
    return u


def collect_in_urls(value: object) -> list[str]:
    """Flatten nested agent shapes (e.g. {\"investment_team_linkedin_in\": [...] })."""
    found: list[str] = []
    if isinstance(value, str):
        cu = normalize_profile_url(value)
        if cu:
            found.append(cu)
        return found
    if isinstance(value, list):
        for item in value:
            found.extend(collect_in_urls(item))
        return found
    if isinstance(value, dict):
        for subv in value.values():
            found.extend(collect_in_urls(subv))
    return found


def extract_companies(obj: dict) -> dict[str, list[str]]:
    if not isinstance(obj, dict):
        return {}
    inner: dict = obj["companies"] if isinstance(obj.get("companies"), dict) else obj
    out: dict[str, list[str]] = {}
    for key, value in inner.items():
        if key in ("people", "firms", "companies"):
            continue
        nk = normalize_company_key(key)
        if not nk:
            continue
        cleaned: list[str] = []
        if isinstance(value, list):
            for item in value:
                cu = normalize_profile_url(str(item)) if isinstance(item, str) else ""
                if cu:
                    cleaned.append(cu)
        else:
            cleaned = collect_in_urls(value)
        cleaned = dedupe_preserve(cleaned)
        if cleaned:
            out[nk] = cleaned
    return out


def dedupe_preserve(urls: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        k = u.lower().rstrip("/")
        if k in seen:
            continue
        seen.add(k)
        out.append(u)
    return out


def in_slug(u: str) -> str:
    low = u.lower()
    if "/in/" not in low:
        return ""
    return low.split("/in/", 1)[-1].split("?", 1)[0].rstrip("/")


def strip_profile_slugs(mapping: dict[str, list[str]], company_key: str, slugs: set[str]) -> None:
    nk = normalize_company_key(company_key)
    if nk not in mapping:
        return
    want = {s.lower() for s in slugs}
    mapping[nk] = [u for u in mapping[nk] if in_slug(u) not in want]


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: merge_company_mapping_payloads.py <payload.json> [...]", file=sys.stderr)
        return 1
    data = json.loads(MAPPINGS_PATH.read_text(encoding="utf-8"))
    companies: dict[str, list[str]] = {}
    for k, v in data.get("companies", {}).items():
        nk = normalize_company_key(k)
        if nk:
            companies[nk] = dedupe_preserve(list(v) if isinstance(v, list) else [])

    for path_str in sys.argv[1:]:
        fragment = json.loads(Path(path_str).read_text(encoding="utf-8"))
        merged = extract_companies(fragment)
        for k, urls in merged.items():
            companies[k] = dedupe_preserve(companies.get(k, []) + urls)

    strip_profile_slugs(companies, "linkedin.com/company/anthemis-group-sa", {"reshmasohoni"})
    strip_profile_slugs(companies, "linkedin.com/company/credo-ventures", {"reshmasohoni"})
    strip_profile_slugs(companies, "linkedin.com/company/la-famiglia-vc", {"judith-dada"})

    data["companies"] = {k: companies[k] for k in sorted(companies.keys()) if companies[k]}
    MAPPINGS_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(data['companies'])} company keys to {MAPPINGS_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
