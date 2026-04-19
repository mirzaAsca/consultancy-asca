#!/usr/bin/env python3
"""Fill linkedin-private-cursor in 006 seed funds CSV using web search (ddgs bing)."""

from __future__ import annotations

import csv
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock
from urllib.parse import urlparse

from ddgs import DDGS

CSV_PATH = Path("datasets/006__html__the_ultimate_list_of_750_seed_funds_google_drive.csv")
CURSOR_COL = "linkedin-private-cursor"
WORKERS = 5
SLEEP_BETWEEN_QUERIES = 0.12

LINKEDIN_IN_RE = re.compile(
    r"https?://(?:[a-z]{2,3}\.)?linkedin\.com/in/([a-zA-Z0-9\-_%]+)/?",
    re.IGNORECASE,
)

_write_lock = Lock()


def norm_profile_url(s: str) -> str | None:
    m = LINKEDIN_IN_RE.search(s)
    if not m:
        return None
    slug = m.group(1)
    low = slug.lower()
    if low in {"company", "school", "showcase", "groups"}:
        return None
    return f"https://www.linkedin.com/in/{slug}"


def domain_from_website(website: str) -> str:
    w = (website or "").strip().lower()
    if not w:
        return ""
    if "://" not in w:
        w = "https://" + w
    try:
        host = urlparse(w).netloc.lower()
    except Exception:
        return ""
    if host.startswith("www."):
        host = host[4:]
    return host.split(":")[0]


def collect_urls_from_hit(hit: dict) -> list[str]:
    parts: list[str] = []
    for k in ("href", "title", "body"):
        v = hit.get(k)
        if isinstance(v, str):
            parts.append(v)
    text = " ".join(parts)
    out: list[str] = []
    for m in LINKEDIN_IN_RE.finditer(text):
        u = norm_profile_url(m.group(0))
        if u:
            out.append(u)
    return out


def search_partner_urls(firm: str, website: str) -> list[str]:
    dom = domain_from_website(website)
    firm_clean = (firm or "").strip()
    queries = [
        f"{firm_clean} venture capital partner site:linkedin.com/in",
        f"{firm_clean} VC investor site:linkedin.com/in",
    ]
    if dom:
        queries.insert(0, f"{firm_clean} {dom} site:linkedin.com/in")

    seen: set[str] = set()
    ordered: list[str] = []
    ddgs = DDGS()

    for q in queries:
        hits: list[dict] = []
        for attempt in range(2):
            try:
                hits = list(ddgs.text(q, max_results=10, backend="bing"))
                break
            except Exception:
                time.sleep(0.5 * (attempt + 1))
        for h in hits:
            for u in collect_urls_from_hit(h):
                if u not in seen:
                    seen.add(u)
                    ordered.append(u)
        if len(ordered) >= 3:
            break
        time.sleep(SLEEP_BETWEEN_QUERIES)

    return ordered[:8]


def process_row(args: tuple[int, str, str]) -> tuple[int, str]:
    idx, firm, website = args
    urls = search_partner_urls(firm, website)
    return idx, ", ".join(urls) if urls else ""


def write_csv(rows: list[dict], fieldnames: list[str]) -> None:
    with _write_lock:
        with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
            w.writeheader()
            w.writerows(rows)


def main() -> None:
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    fieldnames = list(rows[0].keys()) if rows else []

    jobs: list[tuple[int, str, str]] = []
    for i, r in enumerate(rows):
        if (r.get(CURSOR_COL) or "").strip():
            continue
        jobs.append(
            (
                i,
                (r.get("Firm") or "").strip(),
                (r.get("Website") or "").strip(),
            )
        )

    total = len(jobs)
    print(f"Rows to fill: {total} (workers={WORKERS})", flush=True)

    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futures = {ex.submit(process_row, j): j[0] for j in jobs}
        for fut in as_completed(futures):
            idx, value = fut.result()
            rows[idx][CURSOR_COL] = value
            done += 1
            if done % 20 == 0 or done == total:
                write_csv(rows, fieldnames)
                print(f"  checkpoint {done}/{total}", flush=True)

    write_csv(rows, fieldnames)
    filled = sum(1 for j in jobs if (rows[j[0]].get(CURSOR_COL) or "").strip())
    print(f"Done. Non-empty cursor for processed rows: {filled}/{total}")


if __name__ == "__main__":
    main()
