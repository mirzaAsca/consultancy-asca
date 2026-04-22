import Papa from 'papaparse';
import { defaultProspectV2Fields } from './db';
import type { Prospect, ProspectInsert } from './types';
import {
  canonicalizeLinkedInProfileUrl,
  slugFromCanonicalProfileUrl,
} from './url';

const URL_HEADER_CELLS = new Set([
  'url',
  'profile_url',
  'linkedin_url',
  'url_normalized',
  'linkedin_profile_url',
]);

function looksLikeUrlHeaderCell(raw: string): boolean {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, '_');
  return URL_HEADER_CELLS.has(normalized);
}

export interface CsvImportSummary {
  /** Non-empty rows parsed from the file (pre-classification). */
  total: number;
  /** Unique canonical profile URLs ready to insert. */
  valid: number;
  /** Rows that did not canonicalize to a LinkedIn `/in/` URL. */
  invalid: number;
  /** Duplicate canonical URLs within the file itself. */
  duplicates: number;
  /** Canonical URLs in insertion order (deduped). Included in preview so the
   * popup can reuse the same array on confirm without re-parsing. */
  urls: string[];
  /** Sample of up to 5 invalid raw rows (for the modal preview). */
  invalid_samples: string[];
}

/**
 * Parse a raw CSV string (single column, no header) into an import summary.
 * - Canonicalizes every row via {@link canonicalizeLinkedInProfileUrl}.
 * - Dedupes by canonical URL, preserving first-seen order.
 * - Skips empty rows silently.
 */
export function summarizeCsvText(input: string): CsvImportSummary {
  const seen = new Set<string>();
  const urls: string[] = [];
  const invalid_samples: string[] = [];
  let total = 0;
  let invalid = 0;
  let duplicates = 0;
  let rowIndex = 0;

  const parsed = Papa.parse<string[]>(input, {
    header: false,
    skipEmptyLines: 'greedy',
  });

  for (const row of parsed.data) {
    const cell = Array.isArray(row) ? row[0] : undefined;
    const raw = cell ? String(cell).trim() : '';
    const isFirstRow = rowIndex === 0;
    rowIndex++;
    if (!raw) continue;
    if (isFirstRow && looksLikeUrlHeaderCell(raw)) continue;
    total++;

    const canonical = canonicalizeLinkedInProfileUrl(raw);
    if (!canonical) {
      invalid++;
      if (invalid_samples.length < 5) invalid_samples.push(raw);
      continue;
    }
    if (seen.has(canonical)) {
      duplicates++;
      continue;
    }
    seen.add(canonical);
    urls.push(canonical);
  }

  return {
    total,
    valid: urls.length,
    invalid,
    duplicates,
    urls,
    invalid_samples,
  };
}

/**
 * Stream-parse a File (preferred for 20–50k row uploads). Returns the same
 * summary shape; dedupe + classification happen incrementally as chunks arrive.
 */
export function summarizeCsvFile(file: File): Promise<CsvImportSummary> {
  return new Promise((resolve, reject) => {
    const seen = new Set<string>();
    const urls: string[] = [];
    const invalid_samples: string[] = [];
    let total = 0;
    let invalid = 0;
    let duplicates = 0;
    let rowIndex = 0;

    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: 'greedy',
      worker: false,
      chunkSize: 1024 * 256,
      chunk: (results) => {
        for (const row of results.data) {
          const cell = Array.isArray(row) ? row[0] : undefined;
          const raw = cell ? String(cell).trim() : '';
          const isFirstRow = rowIndex === 0;
          rowIndex++;
          if (!raw) continue;
          if (isFirstRow && looksLikeUrlHeaderCell(raw)) continue;
          total++;

          const canonical = canonicalizeLinkedInProfileUrl(raw);
          if (!canonical) {
            invalid++;
            if (invalid_samples.length < 5) invalid_samples.push(raw);
            continue;
          }
          if (seen.has(canonical)) {
            duplicates++;
            continue;
          }
          seen.add(canonical);
          urls.push(canonical);
        }
      },
      complete: () => {
        resolve({
          total,
          valid: urls.length,
          invalid,
          duplicates,
          urls,
          invalid_samples,
        });
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Build DB insert rows from a list of already-canonical URLs.
 * Callers should pass URLs that have already been canonicalized + deduped
 * (e.g. via {@link summarizeCsvText} / {@link summarizeCsvFile}).
 */
export function buildProspectInsertsFromCanonicalUrls(
  canonicalUrls: string[],
  now: number = Date.now(),
): ProspectInsert[] {
  const out: ProspectInsert[] = [];
  for (const url of canonicalUrls) {
    const slug = slugFromCanonicalProfileUrl(url);
    if (!slug) continue;
    out.push({
      url,
      slug,
      level: 'NONE',
      name: null,
      headline: null,
      company: null,
      location: null,
      scan_status: 'pending',
      scan_error: null,
      scan_attempts: 0,
      last_scanned: null,
      ...defaultProspectV2Fields(),
      activity: {
        connected: false,
        connected_at: null,
        commented: false,
        commented_at: null,
        messaged: false,
        messaged_at: null,
      },
      notes: '',
      created_at: now,
      updated_at: now,
    });
  }
  return out;
}

/** CSV export columns (order matters — matches MASTER spec §6.3). */
export const EXPORT_COLUMNS = [
  'url',
  'level',
  'name',
  'headline',
  'company',
  'location',
  'scan_status',
  'last_scanned',
  'connected',
  'commented',
  'messaged',
  'notes',
] as const;

export function prospectsToCsv(rows: Prospect[]): string {
  const data = rows.map((r) => ({
    url: r.url,
    level: r.level,
    name: r.name ?? '',
    headline: r.headline ?? '',
    company: r.company ?? '',
    location: r.location ?? '',
    scan_status: r.scan_status,
    last_scanned: r.last_scanned
      ? new Date(r.last_scanned).toISOString()
      : '',
    connected: r.activity.connected ? 'true' : 'false',
    commented: r.activity.commented ? 'true' : 'false',
    messaged: r.activity.messaged ? 'true' : 'false',
    notes: r.notes ?? '',
  }));
  return Papa.unparse(data, {
    columns: EXPORT_COLUMNS as unknown as string[],
    header: true,
    newline: '\n',
  });
}
