#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CACHE_PATH = ROOT / "data-cache" / "linkedin_private_codex_cache.json"
LATEST_PATH = ROOT / "data-cache" / "linkedin_private_codex_bulk_candidates_latest.json"
SUMMARY_PATH = ROOT / "data-cache" / "linkedin_private_codex_summary.json"

DEFAULT_CHUNKS = 20
DEFAULT_MAX_TARGETS = 50
DEFAULT_MAX_WORKERS = 12


def normalize_key(value: str) -> str:
    lowered = re.sub(r"\s+", " ", (value or "").strip().casefold())
    lowered = re.sub(r"[^a-z0-9]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def domain_key(url: str) -> str:
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    host = urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return normalize_key(host)


def merge_latest() -> tuple[int, int, int]:
    if not LATEST_PATH.exists():
        return (0, 0, 0)

    candidates = json.loads(LATEST_PATH.read_text())
    cache = json.loads(CACHE_PATH.read_text())
    added_entries = 0
    new_profiles: set[str] = set()

    for item in candidates:
        urls = item.get("urls", [])
        if not urls:
            continue
        keys = {
            normalize_key(item.get("firm_name", "")),
            domain_key(item.get("website", "")),
        }
        keys = {key for key in keys if key}
        for key in keys:
            if key not in cache.setdefault("firms", {}):
                added_entries += 1
                new_profiles.update(urls)
            cache["firms"][key] = {
                "urls": urls,
                "sources": item.get("sources") or ([item.get("source")] if item.get("source") else []),
            }

    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2))
    return (len(candidates), added_entries, len(new_profiles))


def main() -> None:
    chunks = int(os.environ.get("CHUNKS", str(DEFAULT_CHUNKS)))
    max_targets = os.environ.get("MAX_TARGETS", str(DEFAULT_MAX_TARGETS))
    max_workers = os.environ.get("MAX_WORKERS", str(DEFAULT_MAX_WORKERS))

    for index in range(1, chunks + 1):
        print(f"chunk {index}/{chunks} start", flush=True)
        env = os.environ.copy()
        env["MAX_TARGETS"] = max_targets
        env["MAX_WORKERS"] = max_workers
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "scan_linkedin_private_bulk.py")],
            cwd=ROOT,
            env=env,
            text=True,
            capture_output=True,
        )
        if result.stdout:
            print(result.stdout, end="" if result.stdout.endswith("\n") else "\n", flush=True)
        if result.returncode != 0:
            if result.stderr:
                print(result.stderr, flush=True)
            raise SystemExit(result.returncode)

        candidates, entries, profiles = merge_latest()
        print(
            f"chunk {index}/{chunks} merged candidates={candidates} cache_entries_added={entries} distinct_profiles={profiles}",
            flush=True,
        )

    subprocess.run([sys.executable, str(ROOT / "scripts" / "enrich_linkedin_private_codex.py")], cwd=ROOT, check=True)
    summary = json.loads(SUMMARY_PATH.read_text())
    rows_with = sum(file_info["rows_with_linkedin_private_codex"] for file_info in summary["files"].values())
    print(f"final_rows_with {rows_with}", flush=True)
    print(f"cached_firm_keys {summary['totals']['cached_firm_keys']}", flush=True)
    print(f"pending_firms_unique {summary['totals']['pending_firms_unique']}", flush=True)


if __name__ == "__main__":
    main()
