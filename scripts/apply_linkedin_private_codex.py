import csv
import glob
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATASETS = ROOT / "datasets"
RESEARCH = ROOT / "research"


COMPANY_KEYS = [
    "Investor name",
    "Fund Name",
    "Firm Name",
    "Fund",
    "name",
    "Name",
    "Firm",
    "investor_namesort_asc",
    "investor_namesort_asc2",
    "investor_namesort_asc3",
]

PERSON_NAME_KEYS = [
    "What's your full name?",
]


def load_mappings():
    merged = {}
    patterns = ["linkedin_batch_*.json", "linkedin_people_batch_*.json"]
    for pattern in patterns:
        for path in sorted(RESEARCH.glob(pattern)):
            with path.open(encoding="utf-8") as fh:
                data = json.load(fh)
            for key, values in data.items():
                clean = list(merged.get(key, []))
                seen = set(clean)
                for value in values:
                    value = value.strip()
                    if not value or value in seen:
                        continue
                    seen.add(value)
                    clean.append(value)
                if clean:
                    merged[key] = clean
    return merged


def row_entity_name(row):
    for key in PERSON_NAME_KEYS:
        value = (row.get(key) or "").strip()
        if value:
            return value
    first = (row.get("firstname") or "").strip()
    last = (row.get("lastname") or "").strip()
    if first or last:
        return f"{first} {last}".strip()
    for key in COMPANY_KEYS:
        value = (row.get(key) or "").strip()
        if value:
            return value
    return ""


def row_person_key(row):
    first = (row.get("firstname") or "").strip()
    last = (row.get("lastname") or "").strip()
    name = ""
    if first or last:
        name = f"{first} {last}".strip()
    full = (row.get("What's your full name?") or "").strip()
    if full:
        name = full

    company = ""
    for key in ["companies", "Parent Company"]:
        value = (row.get(key) or "").strip()
        if value:
            company = value
            break

    if name and company:
        return f"{name} | {company}"
    return ""


def main():
    mappings = load_mappings()
    updated_files = 0
    updated_rows = 0

    for path in sorted(DATASETS.glob("*.csv")):
        with path.open(newline="", encoding="utf-8-sig") as fh:
            rows = list(csv.DictReader(fh))
            fieldnames = rows[0].keys() if rows else []

        changed = False
        for row in rows:
            lookup_key = row_person_key(row) or row_entity_name(row)
            if lookup_key in mappings:
                new_value = ", ".join(mappings[lookup_key])
                if (row.get("linkedin-private-codex") or "").strip() != new_value:
                    row["linkedin-private-codex"] = new_value
                    updated_rows += 1
                    changed = True

        if changed:
            with path.open("w", newline="", encoding="utf-8") as fh:
                writer = csv.DictWriter(fh, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            updated_files += 1

    print(json.dumps({"updated_files": updated_files, "updated_rows": updated_rows}, ensure_ascii=True))


if __name__ == "__main__":
    main()
