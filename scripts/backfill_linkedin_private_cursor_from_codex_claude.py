#!/usr/bin/env python3
"""Fill empty linkedin-private-cursor from linkedin-private-codex + linkedin-private-claude.

Only touches rows where cursor is blank or '-'. Parses /in/ (and /pub/) URLs with the same
rules as scripts/apply_linkedin_private_cursor_research_merge.py (clean_url + dedupe).
Does not remove or shorten existing non-empty cursor values.
"""
from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DATASETS = REPO_ROOT / "datasets"

COL = "linkedin-private-cursor"
COD = "linkedin-private-codex"
CLA = "linkedin-private-claude"


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


URL_FIND_RE = re.compile(
    r"https?://(?:[\w-]+\.)?linkedin\.com/(?:in|pub)/[^?\s,\"'<>]+", re.IGNORECASE
)


def urls_from_cell(cell: str) -> list[str]:
    return URL_FIND_RE.findall(cell or "")


def parse_cursor_cell(cell: str) -> list[str]:
    raw = (cell or "").strip()
    if not raw or raw == "-":
        return []
    parts = re.split(r",\s*", raw)
    return dedupe_urls(parts)


def merge_cursor(existing_cell: str, new_urls: list[str]) -> str:
    return ", ".join(dedupe_urls(parse_cursor_cell(existing_cell) + new_urls))


def needs_fill(cell: str) -> bool:
    return not (cell or "").strip() or (cell or "").strip() == "-"


def main() -> int:
    if not DATASETS.is_dir():
        print(f"Missing {DATASETS}", file=sys.stderr)
        return 1

    total_rows_updated = 0
    files_updated: list[tuple[str, int]] = []

    for path in sorted(DATASETS.glob("*.csv")):
        if path.name == "MASTER.csv":
            continue
        with path.open(newline="", encoding="utf-8-sig", errors="replace") as handle:
            reader = csv.DictReader(handle)
            fieldnames = list(reader.fieldnames or [])
            rows = list(reader)

        if COL not in fieldnames or (COD not in fieldnames and CLA not in fieldnames):
            continue

        changed = 0
        for row in rows:
            if not needs_fill(row.get(COL, "")):
                continue
            found: list[str] = []
            if COD in fieldnames:
                found.extend(urls_from_cell(row.get(COD) or ""))
            if CLA in fieldnames:
                found.extend(urls_from_cell(row.get(CLA) or ""))
            merged = merge_cursor(row.get(COL) or "", dedupe_urls(found))
            if not merged:
                continue
            row[COL] = merged
            changed += 1

        if not changed:
            continue

        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        files_updated.append((path.name, changed))
        total_rows_updated += changed

    for name, n in files_updated:
        print(f"{name}: {n} rows")
    print(f"Total rows updated: {total_rows_updated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
