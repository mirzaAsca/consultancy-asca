// @vitest-environment jsdom

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCAN_ARGS, scanProfilePageInTab } from '@/content/scan';
import type { ProspectLevel } from '@/shared/types';

const FIXTURE_PATH = path.resolve(__dirname, 'selectors.fixtures.html');
const FIXTURE_DOC = new DOMParser().parseFromString(
  fs.readFileSync(FIXTURE_PATH, 'utf-8'),
  'text/html',
);

function loadFixture(name: string): void {
  const tpl = FIXTURE_DOC.querySelector<HTMLTemplateElement>(
    `template[data-fixture="${name}"]`,
  );
  if (!tpl) {
    throw new Error(`Missing selector fixture: ${name}`);
  }
  document.body.innerHTML = tpl.innerHTML;
}

async function scanFixture(name: string) {
  loadFixture(name);
  return scanProfilePageInTab({
    ...DEFAULT_SCAN_ARGS,
    maxWaitMs: 25,
  });
}

describe('scan selector fixture contract', () => {
  it.each([
    ['1st', '1st'],
    ['2nd', '2nd'],
    ['3rd', '3rd'],
    ['oon', 'OUT_OF_NETWORK'],
  ] as const)('maps %s fixture to %s level', async (fixture, expected) => {
    const res = await scanFixture(fixture);
    expect(res.ok).toBe(true);
    expect(res.error).toBeNull();
    expect(res.data?.level).toBe(expected);
  });

  it('extracts key profile metadata from the 1st fixture', async () => {
    const res = await scanFixture('1st');
    expect(res.ok).toBe(true);
    expect(res.data).toMatchObject({
      level: '1st' satisfies ProspectLevel,
      name: 'Alice First',
      headline: 'Partner at Alpha Capital',
      company: 'Alpha Capital',
      location: 'Sarajevo, Bosnia and Herzegovina',
    });
  });

  it('flags profile_unavailable fixture as failed parse target', async () => {
    const res = await scanFixture('unavailable');
    expect(res.ok).toBe(false);
    expect(res.error).toBe('profile_unavailable');
    expect(res.data?.profile_unavailable).toBe(true);
  });
});
