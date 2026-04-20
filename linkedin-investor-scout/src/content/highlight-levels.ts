import type { ProspectLevel, Settings } from '@/shared/types';

const DEFAULT_HIGHLIGHT_COLORS: Settings['highlight']['colors'] = {
  first: '#22c55e',
  second: '#3b82f6',
  third: '#a855f7',
  out_of_network: '#6b7280',
};

const BADGE_LABELS: Record<ProspectLevel, string> = {
  NONE: '? · TARGET',
  '1st': '1st · TARGET',
  '2nd': '2nd · TARGET',
  '3rd': '3rd · TARGET',
  OUT_OF_NETWORK: 'OUT · TARGET',
};

const COLOR_VARS: Record<ProspectLevel, string> = {
  NONE: 'var(--lis-color-oon)',
  '1st': 'var(--lis-color-1st)',
  '2nd': 'var(--lis-color-2nd)',
  '3rd': 'var(--lis-color-3rd)',
  OUT_OF_NETWORK: 'var(--lis-color-oon)',
};

export function badgeLabelForLevel(level: ProspectLevel): string {
  return BADGE_LABELS[level];
}

export function cssVarForLevel(level: ProspectLevel): string {
  return COLOR_VARS[level];
}

export function buildHighlightLevelCss(
  containerAttr: string,
  colors?: Settings['highlight']['colors'] | null,
): string {
  const resolved = {
    ...DEFAULT_HIGHLIGHT_COLORS,
    ...(colors ?? {}),
  };

  return `
    :root {
      --lis-color-1st: ${resolved.first};
      --lis-color-2nd: ${resolved.second};
      --lis-color-3rd: ${resolved.third};
      --lis-color-oon: ${resolved.out_of_network};
    }
    [${containerAttr}="1st"] { box-shadow: 0 0 0 2px var(--lis-color-1st); }
    [${containerAttr}="2nd"] { box-shadow: 0 0 0 2px var(--lis-color-2nd); }
    [${containerAttr}="3rd"] { box-shadow: 0 0 0 2px var(--lis-color-3rd); }
    [${containerAttr}="OUT_OF_NETWORK"] { box-shadow: 0 0 0 2px var(--lis-color-oon); }
    [${containerAttr}="NONE"] { box-shadow: 0 0 0 2px var(--lis-color-oon); }
  `;
}
