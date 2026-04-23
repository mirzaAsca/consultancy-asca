import { describe, expect, it } from 'vitest';
import {
  buildRenderContextFromProspect,
  firstNameFromProspect,
  renderTemplate,
  TEMPLATE_PLACEHOLDERS,
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
