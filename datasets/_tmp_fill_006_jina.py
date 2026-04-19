#!/usr/bin/env python3
"""Temporary: curl fund websites, extract linkedin /in/ URLs into linkedin-private-cursor."""
from __future__ import annotations

import csv
import html as html_lib
import os
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "006__html__the_ultimate_list_of_750_seed_funds_google_drive.csv"
CURSOR_COL = "linkedin-private-cursor"

IN_RE = re.compile(
    r"https?://(?:www\.|[a-z]{2}\.)?linkedin\.com/in/[a-zA-Z0-9\-_%]+/?",
    re.I,
)


def normalize_li_company(li: str) -> str | None:
    s = (li or "").strip()
    if not s or "linkedin.com/company" not in s.lower():
        return None
    if not s.startswith("http"):
        s = "https://" + s.lstrip("/")
    return s.split("?")[0].rstrip("/")


def normalize_site(website: str) -> str | None:
    w = (website or "").strip()
    if not w:
        return None
    if not w.startswith("http"):
        w = "https://" + w
    p = urlparse(w)
    if not p.netloc:
        return None
    return f"{p.scheme}://{p.netloc}"


def base_variants(base: str) -> list[str]:
    p = urlparse(base)
    h = p.netloc.lower()
    hosts = [h]
    if h.startswith("www."):
        hosts.append(h[4:])
    else:
        hosts.append("www." + h)
    seen: set[str] = set()
    out: list[str] = []
    for host in hosts:
        if host in seen:
            continue
        seen.add(host)
        out.append(f"{p.scheme}://{host}")
    return out


def direct_fetch(url: str, timeout: int = 22) -> str:
    r = subprocess.run(
        [
            "curl",
            "-sL",
            "--compressed",
            "--max-time",
            str(timeout),
            "-A",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            url,
        ],
        capture_output=True,
        timeout=timeout + 5,
    )
    raw = r.stdout or b""
    return raw.decode("utf-8", errors="replace")


def strip_intern_section(html: str) -> str:
    low = html.lower()
    for marker in (
        "intern program",
        "former interns",
        "internship program",
        "our interns",
        "student intern",
    ):
        i = low.find(marker)
        if i != -1:
            return html[:i]
    return html


def extract_in_urls(raw: str) -> list[str]:
    if not raw:
        return []
    text = html_lib.unescape(raw)
    text = strip_intern_section(text)
    seen: set[str] = set()
    out: list[str] = []
    for m in IN_RE.findall(text):
        u = m.split("?")[0].rstrip("/")
        u = u.replace("http://", "https://")
        u = re.sub(
            r"^https://([a-z]{2})\.linkedin\.com",
            r"https://www.linkedin.com",
            u,
            flags=re.I,
        )
        if not u.startswith("https://"):
            u = "https://" + u.lstrip("/")
        key = u.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(u)
    return out[:18]


def candidate_paths(base: str) -> list[str]:
    """A few high-signal paths × www/non-www (capped)."""
    urls: list[str] = []
    for b in base_variants(base):
        for pth in ("/people", "/team", "/about", ""):
            urls.append(b + pth)
    return urls[:8]


def main() -> None:
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    empty_idx = [i for i, r in enumerate(rows) if not (r.get(CURSOR_COL) or "").strip()]
    lim = int(os.environ.get("LIMIT", "0") or "0")
    if lim > 0:
        empty_idx = empty_idx[:lim]
    print("rows to fill:", len(empty_idx), flush=True)

    updates: dict[int, str] = {}
    for n, i in enumerate(empty_idx):
        row = rows[i]
        firm = row.get("Firm", "")
        base = normalize_site(row.get("Website", "") or "")
        li_co = normalize_li_company(row.get("LinkedIn URL", "") or "")
        if not base and not li_co:
            print(f"[{n+1}/{len(empty_idx)}] skip no url: {firm}", flush=True)
            continue
        collected: list[str] = []
        seen: set[str] = set()
        try_list: list[str] = []
        if base:
            try_list.extend(candidate_paths(base))
        if li_co:
            try_list.append(li_co)
        max_pages = 7
        for nurl, url in enumerate(try_list):
            if nurl >= max_pages:
                break
            try:
                page = direct_fetch(url)
            except Exception as exc:
                print(f"  fetch error {url}: {exc}", flush=True)
                continue
            for u in extract_in_urls(page):
                lk = u.lower()
                if lk not in seen:
                    seen.add(lk)
                    collected.append(u)
            if len(collected) >= 12:
                break
            time.sleep(0.05)
        if collected:
            updates[i] = ", ".join(collected)
            print(f"[{n+1}/{len(empty_idx)}] OK {firm} ({len(collected)})", flush=True)
        else:
            print(f"[{n+1}/{len(empty_idx)}] -- {firm}", flush=True)
        time.sleep(0.08)

    for i, val in updates.items():
        rows[i][CURSOR_COL] = val

    out = CSV_PATH.with_suffix(".csv.tmp_write")
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    out.replace(CSV_PATH)

    still = sum(1 for r in rows if not (r.get(CURSOR_COL) or "").strip())
    print("filled:", len(updates), "still empty:", still, flush=True)


if __name__ == "__main__":
    main()
