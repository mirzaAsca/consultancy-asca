import { describe, expect, it } from 'vitest';
import {
  buildRenderContextFromProspect,
  firstNameFromProspect,
  lintTemplateAgainstCorpus,
  renderTemplate,
  TEMPLATE_CORPUS_LINT_THRESHOLD,
  TEMPLATE_PLACEHOLDERS,
  type TemplateRenderContext,
} from '../src/shared/templates';

describe('renderTemplate', () => {
  it('substitutes every supported placeholder', () => {
    const body = TEMPLATE_PLACEHOLDERS.map((p) => `{{${p}}}`).join('|');
    const { rendered, missing, unknown } = renderTemplate(body, {
      first_name: 'Alex',
      company: 'Sequoia',
      mutual_context: 'Mara',
      headline: 'Partner',
      mutual_count: 3,
      recent_post_snippet: 'AI infra',
    });
    expect(rendered).toBe('Alex|Sequoia|Mara|Partner|3|AI infra');
    expect(missing).toEqual([]);
    expect(unknown).toEqual([]);
  });

  it('reports null/empty placeholder values as missing', () => {
    const body = 'Hi {{first_name}} — {{mutual_context}} says hi.';
    const { rendered, missing } = renderTemplate(body, {
      first_name: 'Alex',
      company: null,
      mutual_context: null,
      headline: null,
      mutual_count: null,
      recent_post_snippet: null,
    });
    expect(rendered).toBe('Hi Alex —  says hi.');
    expect(missing).toEqual(['mutual_context']);
  });

  it('flags unknown placeholders and leaves them in the rendered body', () => {
    const body = 'Hi {{first_name}} — {{undeclared_token}} here.';
    const { rendered, unknown } = renderTemplate(body, {
      first_name: 'Alex',
      company: null,
      mutual_context: null,
      headline: null,
      mutual_count: null,
      recent_post_snippet: null,
    });
    expect(rendered).toContain('{{undeclared_token}}');
    expect(unknown).toEqual(['undeclared_token']);
  });

  it('tolerates whitespace inside the braces', () => {
    const { rendered } = renderTemplate('Hi {{ first_name }}', {
      first_name: 'Alex',
      company: null,
      mutual_context: null,
      headline: null,
      mutual_count: null,
      recent_post_snippet: null,
    });
    expect(rendered).toBe('Hi Alex');
  });

  it('renders mutual_count as a plain string number', () => {
    const { rendered } = renderTemplate('{{mutual_count}} mutuals', {
      first_name: null,
      company: null,
      mutual_context: null,
      headline: null,
      mutual_count: 12,
      recent_post_snippet: null,
    });
    expect(rendered).toBe('12 mutuals');
  });
});

describe('firstNameFromProspect', () => {
  it('uses the first token of a space-separated name', () => {
    expect(
      firstNameFromProspect({ name: 'Alex Turnbull', slug: 'alex-turnbull' }),
    ).toBe('Alex');
  });

  it('falls back to a capitalized slug segment when name is null', () => {
    expect(firstNameFromProspect({ name: null, slug: 'alex-turnbull' })).toBe(
      'Alex',
    );
  });

  it('returns null when both name and slug are missing', () => {
    expect(firstNameFromProspect({ name: null, slug: '' })).toBe(null);
  });
});

describe('buildRenderContextFromProspect', () => {
  it('maps prospect fields and accepts feed extras', () => {
    const ctx = buildRenderContextFromProspect(
      {
        name: 'Alex Turnbull',
        slug: 'alex-turnbull',
        company: 'Groove',
        headline: 'CEO @ Groove',
        mutual_count: 5,
      },
      { mutual_context: 'Mara', recent_post_snippet: 'SaaS pricing post' },
    );
    expect(ctx).toEqual({
      first_name: 'Alex',
      company: 'Groove',
      mutual_context: 'Mara',
      headline: 'CEO @ Groove',
      mutual_count: 5,
      recent_post_snippet: 'SaaS pricing post',
    });
  });
});

describe('lintTemplateAgainstCorpus', () => {
  const fullCtx: TemplateRenderContext = {
    first_name: 'Alex',
    company: 'Sequoia',
    mutual_context: 'Mara',
    headline: 'Partner',
    mutual_count: 3,
    recent_post_snippet: 'AI infra',
  };
  const partialCtx: TemplateRenderContext = {
    ...fullCtx,
    company: null,
  };

  it('reports zero missing when every context resolves every placeholder', () => {
    const res = lintTemplateAgainstCorpus(
      'Hi {{first_name}} from {{company}}',
      [fullCtx, fullCtx, fullCtx],
    );
    expect(res.sample_size).toBe(3);
    expect(res.any_missing_count).toBe(0);
    expect(res.empty_count).toBe(0);
    expect(res.missing_rate).toBe(0);
    expect(res.threshold_exceeded).toBe(false);
    expect(res.per_placeholder).toEqual({});
  });

  it('counts contexts where at least one referenced placeholder is empty', () => {
    const body = 'Hi {{first_name}} from {{company}}';
    const res = lintTemplateAgainstCorpus(body, [
      fullCtx,
      partialCtx,
      partialCtx,
    ]);
    expect(res.sample_size).toBe(3);
    expect(res.any_missing_count).toBe(2);
    expect(res.per_placeholder.company).toBe(2);
    expect(res.per_placeholder.first_name).toBeUndefined();
    expect(res.missing_rate).toBeCloseTo(2 / 3);
    expect(res.threshold_exceeded).toBe(true);
  });

  it('does not trip when missing rate equals the threshold (strict greater-than)', () => {
    const body = 'Hi {{company}}';
    // 1 of 5 missing = 0.20 — equal to default threshold, must NOT trip.
    const contexts: TemplateRenderContext[] = [
      fullCtx,
      fullCtx,
      fullCtx,
      fullCtx,
      partialCtx,
    ];
    const res = lintTemplateAgainstCorpus(body, contexts);
    expect(res.missing_rate).toBeCloseTo(0.2);
    expect(res.threshold).toBe(TEMPLATE_CORPUS_LINT_THRESHOLD);
    expect(res.threshold_exceeded).toBe(false);
  });

  it('flags fully empty renders separately from per-placeholder misses', () => {
    // Body that ONLY references company; partial ctx renders as a single space.
    const res = lintTemplateAgainstCorpus('{{company}}', [
      partialCtx,
      partialCtx,
    ]);
    expect(res.empty_count).toBe(2);
    expect(res.any_missing_count).toBe(2);
  });

  it('handles an empty corpus without dividing by zero', () => {
    const res = lintTemplateAgainstCorpus('Hi {{first_name}}', []);
    expect(res.sample_size).toBe(0);
    expect(res.missing_rate).toBeNull();
    expect(res.threshold_exceeded).toBe(false);
  });

  it('respects a custom threshold override', () => {
    const body = 'Hi {{company}}';
    // 1 of 4 missing = 0.25 > 0.10 custom threshold but < 0.30.
    const contexts = [fullCtx, fullCtx, fullCtx, partialCtx];
    expect(lintTemplateAgainstCorpus(body, contexts, 0.1).threshold_exceeded).toBe(
      true,
    );
    expect(lintTemplateAgainstCorpus(body, contexts, 0.3).threshold_exceeded).toBe(
      false,
    );
  });
});
