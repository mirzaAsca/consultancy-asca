#!/usr/bin/env python3
"""Merge agent-produced {firms, people, companies} JSON into linkedin_private_cursor_manual_mappings.json.

Usage:
  python3 scripts/merge_linkedin_private_cursor_payload.py research/payload_batch_a.json [...]

Company keys may be full URLs or paths; firm/people keys are matched using the same
normalization as apply_linkedin_private_cursor_mappings.py (lowercase, strip URL noise).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
MAPPINGS_PATH = REPO / "data-cache" / "linkedin_private_cursor_manual_mappings.json"


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


def normalize_company_map_key(url_or_path: str) -> str:
    text = (url_or_path or "").strip()
    if not text:
        return ""
    m = COMPANY_PATH_RE.search(text)
    if not m:
        return ""
    slug = m.group(1).split(",", 1)[0].strip().lower().rstrip("/")
    return f"linkedin.com/company/{slug}" if slug else ""


def merge_norm_bucket(
    base: dict[str, list[str]],
    incoming: dict[str, list[str]],
    *,
    kind: str,
) -> None:
    for raw_key, raw_urls in incoming.items():
        if not isinstance(raw_urls, list):
            continue
        if kind == "company":
            nk = normalize_company_map_key(raw_key)
        else:
            nk = normalize_key(raw_key)
        if not nk:
            continue
        urls = dedupe_urls([str(u) for u in raw_urls])
        if not urls:
            continue
        existing = base.get(nk, [])
        base[nk] = dedupe_urls(existing + urls)


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: merge_linkedin_private_cursor_payload.py <payload.json> [...]", file=sys.stderr)
        return 1
    data = json.loads(MAPPINGS_PATH.read_text(encoding="utf-8"))

    firm_norm_to_pretty: dict[str, str] = {}
    firms_by_norm: dict[str, list[str]] = {}
    for pretty, urls in data.get("firms", {}).items():
        nk = normalize_key(pretty)
        if not nk:
            continue
        firm_norm_to_pretty.setdefault(nk, pretty.strip())
        firms_by_norm[nk] = dedupe_urls(urls if isinstance(urls, list) else [])

    people: dict[str, list[str]] = {
        normalize_key(k): dedupe_urls(v if isinstance(v, list) else [])
        for k, v in data.get("people", {}).items()
        if normalize_key(k)
    }
    companies: dict[str, list[str]] = {}
    for k, v in data.get("companies", {}).items():
        nk = normalize_company_map_key(k)
        if nk:
            companies[nk] = dedupe_urls(v if isinstance(v, list) else [])

    for path_str in sys.argv[1:]:
        fragment = json.loads(Path(path_str).read_text(encoding="utf-8"))
        for raw_key, raw_urls in (fragment.get("firms") or {}).items():
            if not isinstance(raw_urls, list):
                continue
            nk = normalize_key(raw_key)
            if not nk:
                continue
            firm_norm_to_pretty.setdefault(nk, (raw_key or "").strip())
            urls = dedupe_urls([str(u) for u in raw_urls])
            if not urls:
                continue
            firms_by_norm[nk] = dedupe_urls(firms_by_norm.get(nk, []) + urls)
        merge_norm_bucket(people, fragment.get("people") or {}, kind="key")
        merge_norm_bucket(companies, fragment.get("companies") or {}, kind="company")

    data["firms"] = {
        firm_norm_to_pretty[nk]: firms_by_norm[nk]
        for nk in sorted(firm_norm_to_pretty.keys(), key=lambda x: firm_norm_to_pretty[x].lower())
        if firms_by_norm.get(nk)
    }
    data["people"] = {k: people[k] for k in sorted(people.keys()) if people[k]}
    data["companies"] = {k: companies[k] for k in sorted(companies.keys()) if companies[k]}
    MAPPINGS_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"Wrote firms={len(data['firms'])} people={len(data['people'])} "
        f"companies={len(data['companies'])} -> {MAPPINGS_PATH}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
