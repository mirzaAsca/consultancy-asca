#!/usr/bin/env python3
"""Aggregate unique LinkedIn profile URLs from private columns across all dataset CSVs."""

import csv
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DATASETS_DIR = REPO_ROOT / "datasets"
OUTPUT_PATH = DATASETS_DIR / "MASTER.csv"

TARGET_COLUMNS = ("linkedin-private-codex", "linkedin-private-claude", "linkedin-private-cursor")

# Profile URLs inside cells (possibly comma- or newline-separated, quoted CSV fields).
LINKEDIN_PROFILE_URL_RE = re.compile(
    r"https?://(?:[\w-]+\.)?linkedin\.com/(?:in|pub)/[^,\s\"'<>|]+",
    re.IGNORECASE,
)


def clean_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    url = url.split("?", 1)[0].rstrip("/")
    while url.endswith((".", ",", ";", ")", "]", "}")):
        url = url[:-1].rstrip("/")
    if "linkedin.com/in/" not in url and "linkedin.com/pub/" not in url:
        return ""
    if "/pub/dir" in url:
        return ""
    return url


def extract_urls_from_cell(value: str) -> list[str]:
    if not value or not value.strip():
        return []
    found: list[str] = []
    for match in LINKEDIN_PROFILE_URL_RE.finditer(value):
        cleaned = clean_url(match.group(0))
        if cleaned:
            found.append(cleaned)
    return found


def main() -> None:
    seen_lower: set[str] = set()
    ordered_unique: list[str] = []

    csv_paths = sorted(p for p in DATASETS_DIR.glob("*.csv") if p.name != "MASTER.csv")
    for path in csv_paths:
        try:
            with path.open(newline="", encoding="utf-8-sig") as handle:
                reader = csv.DictReader(handle)
                if not reader.fieldnames:
                    continue
                name_by_stripped = {
                    (name or "").strip(): name for name in reader.fieldnames if name
                }
                cols = [name_by_stripped[c] for c in TARGET_COLUMNS if c in name_by_stripped]
                if not cols:
                    continue
                for row in reader:
                    for col in cols:
                        raw = row.get(col) or ""
                        for url in extract_urls_from_cell(raw):
                            key = url.lower()
                            if key in seen_lower:
                                continue
                            seen_lower.add(key)
                            ordered_unique.append(url)
        except OSError as err:
            print(f"skip {path.name}: {err}")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as out:
        writer = csv.writer(out)
        writer.writerow(["linkedin_url"])
        for url in ordered_unique:
            writer.writerow([url])

    print(f"Wrote {len(ordered_unique)} unique URLs to {OUTPUT_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
