"""Copy existing linkedin.com/in/ URLs from any column into linkedin-private-claude
for people-type files where the target column is empty. No web search — just column copy."""
import csv, re, sys, os

PEOPLE_FILES = [
    '009__native__folk_all_vcs_2026_02_15_people.csv',
    '011__native__folk_european_family_offices_founders_2026_02_15_people.csv',
    '014__native__people.csv',
    '016__zip__folk_200_ai_angel_investors_2026_02_15_people.csv',
    '017__zip__folk_300_australian_early_stage_investors_2026_02_15_people.csv',
    '019__zip__folk_350_most_active_angel_investors_in_usa_2026_02_15_people.csv',
    '020__zip__folk_all_vcs_2026_02_15_people_2.csv',
    '022__zip__folk_data_investors_in_asia_2026_02_15_people.csv',
    '023__zip__folk_early_stage_web_3_us_investors_2026_02_15_people.csv',
    '024__zip__folk_gen_ai_investors_in_asia_2026_02_15_people.csv',
    '025__zip__folk_les_vc_francais_399_options_pour_lever_des_fonds_2026_02_15_people.csv',
    '027__zip__folk_top_300_angel_investors_in_middle_east_2026_02_15_people.csv',
]

IN_RE = re.compile(r'https?://[^\s,;]*linkedin\.com/in/[^\s,;<>"\'\)]+', re.I)

def normalize(url):
    url = url.strip().rstrip('/.,);')
    if url.startswith('http://'):
        url = 'https://' + url[7:]
    return url

total_added = 0
for fn in PEOPLE_FILES:
    path = os.path.join(os.path.dirname(__file__), fn)
    if not os.path.exists(path):
        print('MISS', fn); continue
    with open(path, newline='', encoding='utf-8') as fh:
        r = csv.DictReader(fh)
        fields = r.fieldnames
        rows = list(r)
    if 'linkedin-private-claude' not in fields:
        print('NO COL', fn); continue
    added = 0
    for row in rows:
        if row.get('linkedin-private-claude', '').strip():
            continue
        found = []
        for k, v in row.items():
            if not v: continue
            for m in IN_RE.findall(v):
                u = normalize(m)
                if u not in found:
                    found.append(u)
        if found:
            row['linkedin-private-claude'] = ', '.join(found)
            added += 1
    with open(path, 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader(); w.writerows(rows)
    filled = sum(1 for row in rows if row.get('linkedin-private-claude','').strip())
    print(f'{fn[:55]:55} +{added:4} new, now filled={filled}/{len(rows)}')
    total_added += added
print(f'\nTOTAL ADDED: {total_added}')
