#!/usr/bin/env python3
"""One-off: fill linkedin-private-cursor from firm websites (LinkedIn /in/ in HTML)."""
from __future__ import annotations

import asyncio
import csv
import re
from urllib.parse import urlparse

import aiohttp

CSV_PATH = "datasets/006__html__the_ultimate_list_of_750_seed_funds_google_drive.csv"
COL = "linkedin-private-cursor"
MAX_URLS = 25
CONCURRENCY = 10
TIMEOUT = aiohttp.ClientTimeout(total=14)

IN_RE = re.compile(
    r"https?://(?:[a-z]{2,3}\.)?linkedin\.com/in/([a-zA-Z0-9\-_%]+)/?",
    re.IGNORECASE,
)


def normalize_site(raw: str) -> str | None:
    s = (raw or "").strip()
    if not s:
        return None
    if not s.startswith(("http://", "https://")):
        s = "https://" + s
    p = urlparse(s)
    if not p.netloc:
        return None
    return f"{p.scheme}://{p.netloc}"


def extract_in_urls(html: str) -> list[str]:
    seen_slugs: set[str] = set()
    out: list[str] = []
    for m in IN_RE.finditer(html):
        slug = m.group(1)
        key = slug.lower().rstrip("_")
        if key in seen_slugs:
            continue
        seen_slugs.add(key)
        out.append(f"https://www.linkedin.com/in/{slug}")
        if len(out) >= MAX_URLS:
            break
    return out


def paths_to_try(base: str) -> list[str]:
    roots = [base.rstrip("/")]
    extras = ["/team", "/about", "/people", "/our-team"]
    urls = [roots[0] + "/"]
    for e in extras:
        urls.append(roots[0] + e)
    return urls


async def fetch_text(session: aiohttp.ClientSession, url: str) -> str | None:
    try:
        async with session.get(url, allow_redirects=True) as resp:
            if resp.status >= 400:
                return None
            return await resp.text(errors="ignore")
    except Exception:
        return None


async def scrape_firm(session: aiohttp.ClientSession, base: str) -> list[str]:
    collected: list[str] = []
    seen_slugs: set[str] = set()
    for url in paths_to_try(base):
        html = await fetch_text(session, url)
        if not html:
            continue
        for u in extract_in_urls(html):
            slug = u.rsplit("/", 1)[-1].lower()
            if slug in seen_slugs:
                continue
            seen_slugs.add(slug)
            collected.append(u)
            if len(collected) >= MAX_URLS:
                return collected
        if len(collected) >= 3:
            return collected
    return collected


async def run_all(bases: list[tuple[int, str, str]]) -> dict[int, str]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    connector = aiohttp.TCPConnector(limit=CONCURRENCY)

    out: dict[int, str] = {}
    sem = asyncio.Semaphore(CONCURRENCY)

    async with aiohttp.ClientSession(
        headers=headers,
        timeout=TIMEOUT,
        connector=connector,
    ) as session:

        async def one(idx: int, firm: str, site: str) -> None:
            async with sem:
                urls = await scrape_firm(session, site)
                if urls:
                    out[idx] = ", ".join(urls)

        await asyncio.gather(*(one(i, f, s) for i, f, s in bases))

    return out


def main() -> None:
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        dr = csv.DictReader(f)
        fieldnames = dr.fieldnames
        rows = list(dr)

    assert fieldnames and COL in fieldnames

    todo: list[tuple[int, str, str]] = []
    for i, r in enumerate(rows):
        if (r.get(COL) or "").strip():
            continue
        site = normalize_site(r.get("Website", ""))
        if site:
            todo.append((i, (r.get("Firm") or "").strip(), site))

    print(f"Rows to scrape: {len(todo)}")
    results = asyncio.run(run_all(todo))
    print(f"Filled from web scrape: {len(results)}")

    for i, val in results.items():
        rows[i][COL] = val

    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        w.writerows(rows)

    still = sum(1 for r in rows if not (r.get(COL) or "").strip())
    print(f"Still empty after scrape: {still}")


if __name__ == "__main__":
    main()
