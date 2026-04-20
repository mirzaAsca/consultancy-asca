import { describe, expect, it } from 'vitest';
import {
  badgeLabelForLevel,
  buildHighlightLevelCss,
  cssVarForLevel,
} from '@/content/highlight-levels';
import type { ProspectLevel } from '@/shared/types';

describe('highlight level labels', () => {
  it('maps each level to the expected badge label', () => {
    const cases: Array<[ProspectLevel, string]> = [
      ['1st', '1st · TARGET'],
      ['2nd', '2nd · TARGET'],
      ['3rd', '3rd · TARGET'],
      ['OUT_OF_NETWORK', 'OUT · TARGET'],
      ['NONE', '? · TARGET'],
    ];

    for (const [level, expected] of cases) {
      expect(badgeLabelForLevel(level)).toBe(expected);
    }
  });
});

describe('highlight level color vars', () => {
  it('keeps 3rd and out-of-network mapped to distinct CSS vars', () => {
    expect(cssVarForLevel('3rd')).toBe('var(--lis-color-3rd)');
    expect(cssVarForLevel('OUT_OF_NETWORK')).toBe('var(--lis-color-oon)');
    expect(cssVarForLevel('3rd')).not.toBe(cssVarForLevel('OUT_OF_NETWORK'));
  });
});

describe('buildHighlightLevelCss', () => {
  it('includes selectors for all level attributes', () => {
    const css = buildHighlightLevelCss('data-lis-match');
    expect(css).toContain('[data-lis-match="1st"]');
    expect(css).toContain('[data-lis-match="2nd"]');
    expect(css).toContain('[data-lis-match="3rd"]');
    expect(css).toContain('[data-lis-match="OUT_OF_NETWORK"]');
    expect(css).toContain('[data-lis-match="NONE"]');
  });

  it('applies provided third and out-of-network palette entries separately', () => {
    const css = buildHighlightLevelCss('data-lis-match', {
      first: '#111111',
      second: '#222222',
      third: '#333333',
      out_of_network: '#444444',
    });
    expect(css).toContain('--lis-color-3rd: #333333;');
    expect(css).toContain('--lis-color-oon: #444444;');
  });
});
