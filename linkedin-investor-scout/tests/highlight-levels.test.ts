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
      ['NONE', '? · TARGET'],
    ];

    for (const [level, expected] of cases) {
      expect(badgeLabelForLevel(level)).toBe(expected);
    }
  });
});

describe('highlight level color vars', () => {
  it('maps 3rd to its own CSS var; NONE shares the 3rd palette as a fallback', () => {
    expect(cssVarForLevel('3rd')).toBe('var(--lis-color-3rd)');
    expect(cssVarForLevel('NONE')).toBe('var(--lis-color-3rd)');
  });
});

describe('buildHighlightLevelCss', () => {
  it('includes selectors for all surviving level attributes', () => {
    const css = buildHighlightLevelCss('data-lis-match');
    expect(css).toContain('[data-lis-match="1st"]');
    expect(css).toContain('[data-lis-match="2nd"]');
    expect(css).toContain('[data-lis-match="3rd"]');
    expect(css).toContain('[data-lis-match="NONE"]');
    expect(css).not.toContain('OUT_OF_NETWORK');
  });

  it('applies provided third palette entry', () => {
    const css = buildHighlightLevelCss('data-lis-match', {
      first: '#111111',
      second: '#222222',
      third: '#333333',
    });
    expect(css).toContain('--lis-color-3rd: #333333;');
    expect(css).not.toContain('--lis-color-oon');
  });
});
