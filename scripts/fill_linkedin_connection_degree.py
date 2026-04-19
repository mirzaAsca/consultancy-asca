#!/usr/bin/env python3
"""Populate connection_degree in datasets/MASTER.csv from LinkedIn profile pages."""

from __future__ import annotations

import csv
import os
import random
import re
import socket
import subprocess
import shutil
import time
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parents[1]
INPUT_PATH = REPO_ROOT / "datasets" / "MASTER.csv"
PROGRESS_PATH = REPO_ROOT / "datasets" / "MASTER.connection_degree.progress.csv"
BACKUP_PATH = REPO_ROOT / "datasets" / "MASTER.connection_degree.backup.csv"
DEFAULT_PROFILE_DIR = REPO_ROOT / ".playwright-linkedin-profile"
SYSTEM_CHROME_USER_DATA = Path.home() / "Library" / "Application Support" / "Google" / "Chrome"
CHROME_BINARY = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
CDP_HOST = "127.0.0.1"
CDP_PORT = 9222

URL_COLUMN = "linkedin_url"
DEGREE_COLUMN = "connection_degree"

SAVE_EVERY = 25
MIN_SLEEP_SECONDS = 2.5
MAX_SLEEP_SECONDS = 5.0
LOGIN_WAIT_SECONDS = 180

DEGREE_RE = re.compile(r"\b(1st|2nd|3rd)\b", re.IGNORECASE)


def load_rows() -> tuple[list[str], list[dict[str, str]], Path]:
    source_path = PROGRESS_PATH if PROGRESS_PATH.exists() else INPUT_PATH
    with source_path.open(newline="", encoding="utf-8-sig", errors="replace") as handle:
        reader = csv.DictReader(handle)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)

    if URL_COLUMN not in fieldnames:
        raise ValueError(f"Missing required column: {URL_COLUMN}")
    if DEGREE_COLUMN not in fieldnames:
        fieldnames.append(DEGREE_COLUMN)
        for row in rows:
            row[DEGREE_COLUMN] = ""
    else:
        for row in rows:
            row.setdefault(DEGREE_COLUMN, "")

    return fieldnames, rows, source_path


def save_rows(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def extract_degree(text: str) -> str:
    if not text:
        return "unknown"
    match = DEGREE_RE.search(text)
    if not match:
        return "unknown"
    return match.group(1).lower()


def fetch_degree(page, url: str) -> str:
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(1200)
    except PlaywrightTimeoutError:
        return "timeout"
    except Exception:
        return "error"

    current_url = page.url.lower()
    if "/authwall" in current_url or "/checkpoint/" in current_url:
        return "auth_required"

    selectors = [
        "section.pv-top-card",
        "main .pv-text-details__left-panel",
        "main .text-body-small",
        "main",
    ]
    for selector in selectors:
        try:
            text = page.locator(selector).first.inner_text(timeout=2500)
            degree = extract_degree(text)
            if degree != "unknown":
                return degree
        except Exception:
            continue

    try:
        body_text = page.locator("body").inner_text(timeout=3500)
        return extract_degree(body_text)
    except Exception:
        return "unknown"


def wait_for_login(page) -> bool:
    page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=45000)
    start = time.time()
    while time.time() - start <= LOGIN_WAIT_SECONDS:
        current_url = page.url.lower()
        if "linkedin.com/feed" in current_url and "login" not in current_url:
            return True
        page.wait_for_timeout(3000)
        try:
            page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=45000)
        except Exception:
            pass
    return False


def resolve_profile_dir() -> tuple[Path, str]:
    profile_mode = (os.getenv("LINKEDIN_PROFILE_MODE", "isolated") or "isolated").strip().lower()
    if profile_mode == "system":
        return SYSTEM_CHROME_USER_DATA, (os.getenv("LINKEDIN_PROFILE_NAME", "Default") or "Default").strip()
    return DEFAULT_PROFILE_DIR, (os.getenv("LINKEDIN_PROFILE_NAME", "Default") or "Default").strip()


def wait_for_cdp(port: int, timeout_seconds: int = 20) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with socket.create_connection((CDP_HOST, port), timeout=1):
                return True
        except OSError:
            time.sleep(0.25)
    return False


def launch_system_chrome_for_cdp(profile_name: str) -> subprocess.Popen[str]:
    if not CHROME_BINARY.exists():
        raise FileNotFoundError(f"Chrome binary not found: {CHROME_BINARY}")
    args = [
        str(CHROME_BINARY),
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={SYSTEM_CHROME_USER_DATA}",
        f"--profile-directory={profile_name}",
        "--no-first-run",
        "--no-default-browser-check",
        "about:blank",
    ]
    return subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main() -> int:
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"Input file not found: {INPUT_PATH}")

    fieldnames, rows, source_path = load_rows()
    if source_path == INPUT_PATH and not BACKUP_PATH.exists():
        shutil.copy2(INPUT_PATH, BACKUP_PATH)
        print(f"Created backup: {BACKUP_PATH}")

    pending_indexes: list[int] = []
    for index, row in enumerate(rows):
        url = (row.get(URL_COLUMN) or "").strip()
        degree = (row.get(DEGREE_COLUMN) or "").strip()
        if not url:
            continue
        if "linkedin.com/in/" not in url.lower() and "linkedin.com/pub/" not in url.lower():
            continue
        if degree:
            continue
        pending_indexes.append(index)

    print(f"Source: {source_path}")
    print(f"Rows to process: {len(pending_indexes)}")

    if not pending_indexes:
        save_rows(INPUT_PATH, fieldnames, rows)
        print("No pending rows. MASTER.csv is already populated.")
        return 0

    processed = 0
    user_data_dir, profile_name = resolve_profile_dir()
    profile_mode = (os.getenv("LINKEDIN_PROFILE_MODE", "isolated") or "isolated").strip().lower()
    print(f"Profile mode dir: {user_data_dir}", flush=True)
    print(f"Profile directory name: {profile_name}", flush=True)

    with sync_playwright() as playwright:
        cdp_chrome_process = None
        browser = None

        if profile_mode == "system_cdp":
            print("Launching system Chrome with remote debugging...", flush=True)
            cdp_chrome_process = launch_system_chrome_for_cdp(profile_name)
            if not wait_for_cdp(CDP_PORT):
                if cdp_chrome_process and cdp_chrome_process.poll() is None:
                    cdp_chrome_process.terminate()
                print("Could not connect to Chrome CDP port.", flush=True)
                return 3
            browser = playwright.chromium.connect_over_cdp(f"http://{CDP_HOST}:{CDP_PORT}")
            if not browser.contexts:
                print("No browser contexts available via CDP.", flush=True)
                if browser:
                    browser.close()
                if cdp_chrome_process and cdp_chrome_process.poll() is None:
                    cdp_chrome_process.terminate()
                return 4
            context = browser.contexts[0]
            print("Connected to your system Chrome profile via CDP.", flush=True)
        else:
            print("Launching Chrome context...", flush=True)
            context = playwright.chromium.launch_persistent_context(
                user_data_dir=str(user_data_dir),
                channel="chrome",
                headless=False,
                viewport={"width": 1365, "height": 920},
                args=[f"--profile-directory={profile_name}"],
            )
            print("Chrome context launched.", flush=True)

        existing_pages = context.pages
        if existing_pages:
            page = existing_pages[0]
            print("Using existing Chrome tab.", flush=True)
        else:
            page = context.new_page()
            print("Created new Chrome tab.", flush=True)

        print("Waiting for LinkedIn authenticated session in opened Chrome window...", flush=True)
        if not wait_for_login(page):
            if browser:
                browser.close()
            else:
                context.close()
            if cdp_chrome_process and cdp_chrome_process.poll() is None:
                cdp_chrome_process.terminate()
            print("Could not confirm LinkedIn login within timeout window.", flush=True)
            return 2

        for count, row_index in enumerate(pending_indexes, start=1):
            url = (rows[row_index].get(URL_COLUMN) or "").strip()
            degree = fetch_degree(page, url)
            rows[row_index][DEGREE_COLUMN] = degree
            processed += 1

            if processed % SAVE_EVERY == 0:
                save_rows(PROGRESS_PATH, fieldnames, rows)
                print(f"Checkpoint saved: {processed}/{len(pending_indexes)}", flush=True)

            print(f"[{count}/{len(pending_indexes)}] {url} -> {degree}", flush=True)
            time.sleep(random.uniform(MIN_SLEEP_SECONDS, MAX_SLEEP_SECONDS))

        if browser:
            browser.close()
        else:
            context.close()
        if cdp_chrome_process and cdp_chrome_process.poll() is None:
            cdp_chrome_process.terminate()

    save_rows(INPUT_PATH, fieldnames, rows)
    save_rows(PROGRESS_PATH, fieldnames, rows)
    print(f"Completed. Updated file: {INPUT_PATH}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
