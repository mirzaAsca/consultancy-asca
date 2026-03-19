#!/usr/bin/env python3
from __future__ import annotations

import concurrent.futures as cf
import json
import os
import re
import time
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import requests

ROOT = Path(__file__).resolve().parents[1]
CACHE_PATH = ROOT / "data-cache" / "linkedin_private_codex_cache.json"
PENDING_FIRMS_PATH = ROOT / "data-cache" / "linkedin_private_codex_pending_firms.jsonl"
PROCESSED_FIRMS_PATH = ROOT / "data-cache" / "linkedin_private_codex_processed_firms.jsonl"
BULK_CANDIDATES_PATH = ROOT / "data-cache" / "linkedin_private_codex_bulk_candidates_latest.json"

PERSONAL_RE = re.compile(r'https?://(?:www\.)?linkedin\.com/(?:in|pub)/[^\s"\'>)]+', re.IGNORECASE)
COMMON_PATHS = ["", "/", "/team", "/team/", "/about", "/about/", "/about-us", "/about-us/", "/people", "/people/"]
HEADERS = {"User-Agent": "Mozilla/5.0"}
TIMEOUT = 8
MAX_WORKERS = 12
MAX_TARGETS = 50


def normalize_key(value: str) -> str:
    lowered = re.sub(r"\s+", " ", (value or "").strip().casefold())
    lowered = re.sub(r"[^a-z0-9]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def normalize_base(url: str) -> str:
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    parsed = urlparse(url)
    if not parsed.netloc:
        return ""
    return urlunparse((parsed.scheme or "https", parsed.netloc, "", "", "", "")).rstrip("/")


def domain_key(url: str) -> str:
    base = normalize_base(url)
    if not base:
        return ""
    host = urlparse(base).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return normalize_key(host)


def load_processed_keys() -> set[str]:
    if not PROCESSED_FIRMS_PATH.exists():
        return set()
    keys: set[str] = set()
    with PROCESSED_FIRMS_PATH.open() as handle:
        for line in handle:
            if not line.strip():
                continue
            record = json.loads(line)
            for key in record.get("keys", []):
                if key:
                    keys.add(key)
    return keys


def load_cache_keys() -> set[str]:
    if not CACHE_PATH.exists():
        return set()
    cache = json.loads(CACHE_PATH.read_text())
    return set(cache.get("firms", {}).keys())


def choose_targets(limit: int) -> list[dict[str, str]]:
    cached_keys = load_cache_keys()
    processed_keys = load_processed_keys()
    targets: list[dict[str, str]] = []
    with PENDING_FIRMS_PATH.open() as handle:
        for line in handle:
            record = json.loads(line)
            keys = {
                normalize_key(record.get("firm_name", "")),
                domain_key(record.get("website", "")),
            }
            keys = {key for key in keys if key}
            if not keys or keys & cached_keys or keys & processed_keys:
                continue
            targets.append(record)
            if len(targets) >= limit:
                break
    return targets


def scan_record(record: dict[str, str]) -> dict[str, object]:
    base = normalize_base(record.get("website", ""))
    keys = [key for key in {normalize_key(record.get("firm_name", "")), domain_key(record.get("website", ""))} if key]
    result: dict[str, object] = {
        "firm_name": record.get("firm_name", ""),
        "website": record.get("website", ""),
        "rows": record.get("rows", 0),
        "keys": keys,
        "urls": [],
        "source": "",
    }
    if not base:
        return result

    best_urls: list[str] = []
    best_source = ""
    seen_fetch: dict[str, list[str]] = {}
    for path in COMMON_PATHS:
        url = base + path
        if url not in seen_fetch:
            try:
                response = requests.get(url, timeout=TIMEOUT, headers=HEADERS, allow_redirects=True)
                seen_fetch[url] = sorted(set(PERSONAL_RE.findall(response.text)))
            except Exception:
                seen_fetch[url] = []
        found = seen_fetch[url]
        if len(found) > len(best_urls):
            best_urls = found
            best_source = url

    result["urls"] = best_urls
    result["source"] = best_source
    return result


def append_processed(results: list[dict[str, object]]) -> None:
    with PROCESSED_FIRMS_PATH.open("a", encoding="utf-8") as handle:
        for result in results:
            handle.write(json.dumps(result, ensure_ascii=False) + "\n")


def main() -> None:
    max_targets = int(os.environ.get("MAX_TARGETS", str(MAX_TARGETS)))
    max_workers = int(os.environ.get("MAX_WORKERS", str(MAX_WORKERS)))
    targets = choose_targets(max_targets)
    print(f"chunk_targets {len(targets)}", flush=True)
    start = time.time()
    results: list[dict[str, object]] = []
    with cf.ThreadPoolExecutor(max_workers=max_workers) as executor:
        for index, result in enumerate(executor.map(scan_record, targets), start=1):
            results.append(result)
            if index % 10 == 0:
                hits = sum(1 for item in results if item["urls"])
                elapsed = round(time.time() - start, 1)
                print(f"processed {index} hits {hits} elapsed {elapsed}", flush=True)

    append_processed(results)
    candidates = [result for result in results if result["urls"]]
    BULK_CANDIDATES_PATH.write_text(json.dumps(candidates, ensure_ascii=False, indent=2))
    print(f"final_hits {len(candidates)}", flush=True)
    for item in sorted(candidates, key=lambda value: (-int(value["rows"]), str(value["firm_name"])))[:20]:
        print(
            item["firm_name"],
            "rows",
            item["rows"],
            "profiles",
            len(item["urls"]),
            item["source"],
            flush=True,
        )


if __name__ == "__main__":
    main()
