#!/usr/bin/env python3
"""Fill linkedin-private-cursor in 004 CSV for empty rows via 006 join + DDG search."""
from __future__ import annotations

import csv
import json
import re
import time
import urllib.parse
from pathlib import Path

try:
    from ddgs import DDGS
except ImportError:
    from duckduckgo_search import DDGS  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
P004 = ROOT / "datasets" / "004__html__micro_vc_seed_fund_spreadsheet_google_drive.csv"
P006 = ROOT / "datasets" / "006__html__the_ultimate_list_of_750_seed_funds_google_drive.csv"
CACHE = Path("/tmp/004_linkedin_ddg_cache.json")

IN_URL = re.compile(
    r"https?://(?:[a-z]{2}\.)?linkedin\.com/in/([^\"\'\s<>\)\?]+)", re.I
)


def norm_name(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


def domain_from_url(raw: str) -> str | None:
    if not raw or not str(raw).strip():
        return None
    u = str(raw).strip().strip('"')
    if not re.match(r"https?://", u, re.I):
        u = "https://" + u
    try:
        host = urllib.parse.urlparse(u).netloc.lower()
        if host.startswith("www."):
            host = host[4:]
        return host or None
    except Exception:
        return None


def normalize_person_url(url: str) -> str | None:
    m = IN_URL.search(url)
    if not m:
        return None
    slug = m.group(1).split("/")[0].rstrip("/")
    if not slug or slug in ("company", "school", "showcase"):
        return None
    return f"https://www.linkedin.com/in/{slug}"


def extract_urls_from_text(text: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for m in IN_URL.finditer(text or ""):
        n = normalize_person_url(m.group(0))
        if n and n not in seen:
            seen.add(n)
            out.append(n)
    return out


def load_006_by_name() -> dict[str, list[str]]:
    by_name: dict[str, list[str]] = {}
    with open(P006, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            firm = (row.get("Firm") or "").strip()
            if not firm:
                continue
            merged: list[str] = []
            for col in (
                "linkedin-private-cursor",
                "linkedin-private-codex",
                "linkedin-private-claude",
            ):
                for u in extract_urls_from_text(row.get(col) or ""):
                    if u not in merged:
                        merged.append(u)
            if merged:
                by_name[norm_name(firm)] = merged
    return by_name


def ddg_search_firm(ddgs: DDGS, firm: str, url_hint: str) -> list[str]:
    domain = domain_from_url(url_hint) or ""
    queries = [
        f'"{firm}" venture capital partner site:linkedin.com/in',
        f'"{firm}" VC investor site:linkedin.com/in',
    ]
    if domain:
        queries.append(f'"{firm}" {domain} site:linkedin.com/in')
    found: list[str] = []
    seen: set[str] = set()
    for q in queries:
        try:
            for item in ddgs.text(q, max_results=12):
                blob = " ".join(
                    str(x)
                    for x in (
                        item.get("title"),
                        item.get("body"),
                        item.get("href"),
                    )
                    if x
                )
                for u in extract_urls_from_text(blob):
                    if u not in seen:
                        seen.add(u)
                        found.append(u)
                if len(found) >= 12:
                    break
        except Exception:
            continue
        if len(found) >= 6:
            break
        time.sleep(0.12)
    return found[:16]


def main() -> None:
    cache: dict[str, list[str]] = {}
    if CACHE.exists():
        try:
            cache = json.loads(CACHE.read_text(encoding="utf-8"))
        except Exception:
            cache = {}

    by_006 = load_006_by_name()
    with open(P004, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    fieldnames = list(rows[0].keys()) if rows else []

    updated = 0
    with DDGS() as ddgs:
        for i, row in enumerate(rows):
            cur = (row.get("linkedin-private-cursor") or "").strip()
            if cur:
                continue
            firm = row.get("Firm Name") or ""
            url = row.get("URL") or ""
            key = norm_name(firm)

            candidates: list[str] = []
            if key in by_006:
                candidates.extend(by_006[key])

            ck = f"{key}|{domain_from_url(url) or ''}"
            if ck in cache:
                candidates.extend(cache[ck])
            else:
                time.sleep(0.2)
                ddg_urls = ddg_search_firm(ddgs, firm, url)
                cache[ck] = ddg_urls
                if (i + 1) % 5 == 0:
                    CACHE.write_text(
                        json.dumps(cache, ensure_ascii=False, indent=0), encoding="utf-8"
                    )
                candidates.extend(ddg_urls)

            # de-dupe preserve order
            seen: set[str] = set()
            final: list[str] = []
            for u in candidates:
                if u not in seen:
                    seen.add(u)
                    final.append(u)
            final = final[:20]

            if final:
                row["linkedin-private-cursor"] = ", ".join(final)
                updated += 1

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=0), encoding="utf-8")

    with open(P004, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        w.writerows(rows)

    filled = sum(1 for r in rows if (r.get("linkedin-private-cursor") or "").strip())
    empty = len(rows) - filled
    print(json.dumps({"updated_empty_rows": updated, "filled": filled, "empty": empty, "total": len(rows)}))


if __name__ == "__main__":
    main()
