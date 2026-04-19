import { describe, expect, it } from 'vitest';
import {
  buildProspectInsertsFromCanonicalUrls,
  prospectsToCsv,
  summarizeCsvText,
} from '@/shared/csv';
import type { Prospect } from '@/shared/types';

describe('summarizeCsvText', () => {
  it('canonicalizes, dedupes within file, and counts invalid rows', () => {
    const csv = [
      'https://linkedin.com/in/john-doe',
      'www.linkedin.com/in/john-doe/',
      'https://www.linkedin.com/in/jane/',
      'not a url',
      'https://example.com/in/x/',
      '',
      '   ',
    ].join('\n');

    const summary = summarizeCsvText(csv);
    expect(summary.total).toBe(5);
    expect(summary.valid).toBe(2);
    expect(summary.duplicates).toBe(1);
    expect(summary.invalid).toBe(2);
    expect(summary.urls).toEqual([
      'https://www.linkedin.com/in/john-doe/',
      'https://www.linkedin.com/in/jane/',
    ]);
    expect(summary.invalid_samples).toHaveLength(2);
  });

  it('handles BOM, CRLF, and trailing newlines', () => {
    const csv = '\ufefflinkedin.com/in/a\r\nlinkedin.com/in/b\r\n\r\n';
    const summary = summarizeCsvText(csv);
    expect(summary.valid).toBe(2);
    expect(summary.urls[0]).toBe('https://www.linkedin.com/in/a/');
    expect(summary.urls[1]).toBe('https://www.linkedin.com/in/b/');
  });

  it('caps invalid_samples at 5', () => {
    const csv = Array.from({ length: 12 }, (_, i) => `bad-${i}`).join('\n');
    const summary = summarizeCsvText(csv);
    expect(summary.invalid).toBe(12);
    expect(summary.invalid_samples).toHaveLength(5);
  });

  it('returns zeros for empty input', () => {
    const summary = summarizeCsvText('');
    expect(summary.total).toBe(0);
    expect(summary.valid).toBe(0);
    expect(summary.urls).toEqual([]);
  });
});

describe('buildProspectInsertsFromCanonicalUrls', () => {
  it('maps canonical URLs into default prospect inserts', () => {
    const now = 1_700_000_000_000;
    const rows = buildProspectInsertsFromCanonicalUrls(
      ['https://www.linkedin.com/in/alpha/', 'https://www.linkedin.com/in/beta/'],
      now,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      url: 'https://www.linkedin.com/in/alpha/',
      slug: 'alpha',
      level: 'NONE',
      scan_status: 'pending',
      scan_attempts: 0,
      last_scanned: null,
      notes: '',
      created_at: now,
      updated_at: now,
    });
    expect(rows[0].activity.connected).toBe(false);
    expect(rows[1].slug).toBe('beta');
  });
});

describe('prospectsToCsv', () => {
  it('emits spec-order columns and serializes activity flags + timestamps', () => {
    const row: Prospect = {
      id: 1,
      url: 'https://www.linkedin.com/in/alpha/',
      slug: 'alpha',
      level: '2nd',
      name: 'Alpha Person',
      headline: null,
      company: 'Acme',
      location: null,
      scan_status: 'done',
      scan_error: null,
      scan_attempts: 1,
      last_scanned: Date.UTC(2026, 3, 18, 12, 0, 0),
      activity: {
        connected: true,
        connected_at: Date.UTC(2026, 3, 18, 13, 0, 0),
        commented: false,
        commented_at: null,
        messaged: false,
        messaged_at: null,
      },
      notes: 'follow up',
      created_at: 0,
      updated_at: 0,
    };
    const csv = prospectsToCsv([row]);
    const [header, data] = csv.trim().split('\n');
    expect(header).toBe(
      'url,level,name,headline,company,location,scan_status,last_scanned,connected,commented,messaged,notes',
    );
    expect(data).toContain('https://www.linkedin.com/in/alpha/');
    expect(data).toContain('2nd');
    expect(data).toContain('Alpha Person');
    expect(data).toContain('true');
    expect(data).toContain('2026-04-18T12:00:00.000Z');
  });
});
