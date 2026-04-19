#!/usr/bin/env python3
"""Add linkedin-private-cursor column to all dataset CSVs if missing."""
from __future__ import annotations

import csv
import sys
from pathlib import Path

COL = "linkedin-private-cursor"
DATASETS = Path(__file__).resolve().parent.parent / "datasets"


def process_file(path: Path) -> tuple[str, int, bool]:
    with path.open(newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        rows = list(reader)
    if not rows:
        return path.name, 0, False
    header = rows[0]
    if COL in header:
        return path.name, len(rows) - 1, False
    new_header = header + [COL]
    new_rows = [new_header]
    for row in rows[1:]:
        pad = len(header) - len(row)
        if pad > 0:
            row = row + [""] * pad
        elif pad < 0:
            row = row[: len(header)]
        new_rows.append(row + [""])
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerows(new_rows)
    return path.name, len(rows) - 1, True


def main() -> int:
    if not DATASETS.is_dir():
        print(f"Missing datasets dir: {DATASETS}", file=sys.stderr)
        return 1
    updated = []
    skipped = []
    for path in sorted(DATASETS.glob("*.csv")):
        name, n_data, did = process_file(path)
        if did:
            updated.append((name, n_data))
        else:
            skipped.append(name)
    print(f"Added {COL} to {len(updated)} file(s):")
    for name, n in updated:
        print(f"  {name} ({n} data rows)")
    if skipped:
        print(f"Skipped (already had column): {len(skipped)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
