# Codex Deep-Dive Factuality And Expansion Review

Prepared by: Codex  
Revised with validated additions from the Claude review  
Date: 2026-03-25  
Scope reviewed: current paper source, local exports, and upstream BigQuery views/tables used by `scripts/paper-creator`

## How To Use This Memo

This is the working source of truth for the next paper pass.

- Use it as the factual guardrail for what stays, what gets rewritten, and what should not be claimed yet.
- Use it as the planning document for the next round of paper expansions.
- Keep the paper voice aligned with the current PDF creator: direct, public-safe, practical, and careful about what is measured versus inferred.

## Data Source Policy

Use local full scraped data first.

- If the required dataset already exists locally in full scraped form, use that as the source for analysis and planning.
- Do not refresh from BigQuery just because newer data may exist.
- Only fall back to BigQuery when the local datasets are missing the required field, missing the required grain, or are clearly unusable for the requested analysis.

Practical priority order:

1. Current local paper exports and full local feature exports
2. Other local derived JSON datasets already generated in `scripts/paper-creator/data/` and `scripts/paper-creator/data/v2/`
3. BigQuery only for gaps that local data cannot answer safely

Implication for this memo:

- Live BigQuery validations remain useful as methodology checks, but the next paper pass should prefer the existing local full scraped datasets where they already cover the task.
- Do not mix local-snapshot numbers with freshly pulled BigQuery numbers in the same regenerated paper unless the paper is intentionally being rebaselined.

## Snapshot Note

There are two valid number sets in play:

- The current paper snapshot, built from local cached exports
- The latest live BigQuery snapshot, which is slightly newer

That is not a contradiction. It is export lag.

Current paper snapshot:

- `341,018` content pieces
- `1,606,936` sessions
- `17,099` AI sessions

Latest live BQ snapshot validated during this review:

- `341,701` content pieces
- `1,635,404` sessions
- `17,344` AI sessions

Recommendation:

- Treat the current paper numbers as internally correct for the exported snapshot.
- Prefer the local full scraped snapshot for the next paper pass unless a task is blocked by missing local fields or missing local grain.
- Do not mix cached and live numbers in the same published paper.

## Executive Verdict

The paper is directionally strong on lifecycle, freshness, page-one CTR, and the narrow claim that AI-referral traffic behaves differently from classic organic traffic.

The main credibility risks are not the headline themes. They are:

1. Window ambiguity: the paper mixes `90-day`, `30-day`, and `historical monthly` views correctly in code, but not always clearly enough in prose.
2. AI proportionality: AI traffic is real, but still small at portfolio level and should be framed that way.
3. Metric hygiene: several exports contain impossible percentage fields, so any section using raw `avg_ctr_pct`, `avg_scroll_pct`, or `avg_engage_pct` from those files should be rebuilt or demoted.
4. Claim discipline: a few AI statements in the current draft sound stronger than the available data supports.

Safe conclusion:

The paper does not need a conceptual rewrite. It needs a stricter measurement layer and cleaner wording.

## Verified Claims In The Current Paper

These claims are correct for the current exported snapshot.

| Claim in paper | Verified value | Status |
| --- | ---: | --- |
| Content pieces analyzed | `341,018` | Correct |
| Brands | `56` | Correct |
| 90-day impressions | `462,821,566` | Correct |
| 90-day clicks | `1,494,299` | Correct |
| Sessions | `1,606,936` | Correct |
| AI sessions | `17,099` | Correct |
| AI share | `1.06%` | Correct |
| Avg health score | `18.3` | Correct |
| Peak age bucket | `61-90 days`, health `33.1` | Correct |
| Decay cliff | `271-365 days`, health `14.1` | Correct |
| 365+ recovery | Health `25.1` | Correct |
| Growing cohort avg words | `3,215` | Correct |
| Declining cohort avg words | `2,262` | Correct |
| Growing cohort is longer | `42.1%` longer | Correct |
| Growing cohort is younger | `~27%` younger | Correct |
| Rising vs falling counts | `74,187` vs `45,272` | Correct |
| 31-90 freshness growth ratio | `7.17:1`, presented as `7.2:1` | Correct |
| Low-SV best health bucket | `1-100`, health `25.9` | Correct |
| High-SV `10K+` health | `22.0` | Correct |
| Visibility consistency | `80+ days` visible = health `46.8` | Correct |
| Top vs bottom decile word count | `3,012` vs `1,880` | Correct |

## Claims That Need Clarification Or Rewriting

| Current idea | Assessment | Rewrite direction |
| --- | --- | --- |
| `181+` freshness bucket | Too broad | Split into `181-365` and `366+` |
| `365+ recovered` | Directionally true, but easy to overread | Make clear that recovery is mostly the refreshed subset, not natural age recovery |
| AI section scale | Under-caveated | Keep it, but lead with the small base |
| AI citation language | Not measured | Replace `citations` with `AI referrals` unless citation data is added |
| `AI systems parse heading hierarchy` style language | Hypothesis, not finding | Move to playbook guidance or remove |
| `AI platforms increasingly verify claims` | Hypothesis, not finding | Remove as a data claim |
| Long-form guidance as a universal rule | Too broad | Split traffic outcomes from duration outcomes |

## Voice And Language Guardrails For The Next Paper Pass

Keep the language consistent with the current PDF creator:

- Use direct aggregate comparisons first.
- Prefer `in this portfolio` over universal SEO claims.
- Use `measured`, `observed`, `directional`, and `exploratory` deliberately.
- Separate what is measured directly from what is inferred.
- Avoid phrases that sound like external truth if the paper only supports a portfolio-level pattern.

Safe phrasing examples:

- `In this portfolio, refreshed mature pages outperform similarly old stale pages by a wide margin.`
- `The safe conclusion is narrower: AI-referral visibility is real, growing, and behaviorally different from classic organic traffic.`
- `This pattern is descriptive, not causal.`

Avoid:

- `AI systems do X` unless directly measured here
- `Google rewards Y` when the paper only shows correlation
- `citations` when the data only measures AI sessions or AI referrals

## The Window Story, Side By Side

This should be made explicit in the next paper version.

| Paper element | Actual window |
| --- | --- |
| Scope cards: impressions, clicks, sessions, AI sessions | Last 90 complete days |
| Most portfolio findings | Last 90 complete days |
| Trend cards | Last 30 complete days vs previous 30 complete days |
| AI monthly trend chart | Complete historical months |
| Content count, age, word count, model/provider fields | Inventory metadata, not 90-day measures |

Concrete live-BQ validation:

- `341,701` pages
- `1,635,404` sessions
- `17,344` AI sessions
- AI share `1.06%`
- Complete monthly AI history currently available portfolio-wide: `2025-11-01`, `2025-12-01`, `2026-01-01`, `2026-02-01`

Recommendation:

- Add a small `Metric windows` box on the dataset page.
- Put `90d`, `30d`, or `monthly` in every chart subtitle.
- Do not use `all time` anywhere unless a true all-time series is added.

## AI: Keep It, But Make It Proportional

### What the data says

- AI sessions are `1.06%` of total sessions over the 90-day window.
- Only `1.51%` of pages have any AI sessions at all.
- 90-day provider totals:
  - OpenAI/ChatGPT: `9,889`
  - Gemini: `4,925`
  - Perplexity: `2,160`
  - Copilot: `279`
  - Claude: `100`
- OpenAI is about `2.0x` Gemini on 90-day referral sessions.
- AI page incidence by intent:
  - Commercial: `2.37%`
  - Transactional: `2.07%`
  - Informational: `1.48%`
  - Navigational: `0.84%`
- AI page incidence by word count:
  - `<1K`: `0.07%`
  - `1K-1.5K`: `0.77%`
  - `1.5K-2K`: `1.32%`
  - `3.5K-5K`: `2.87%`
  - `5K+`: `2.16%`

### What stays

- Keep the AI section.
- Keep the claim that AI-referral traffic behaves differently from classic organic traffic.
- Keep provider-level referral comparisons.

### What changes

- Lead with the small base: `17,344 of 1.64M sessions`.
- Demote AI from portfolio headline language if the goal is proportional public reporting.
- Replace `citations` with `AI referrals` unless citation data exists.
- Rewrite any AI playbook line that sounds like a measured platform rule rather than an editorial hypothesis.

### Current text that overreaches

- [part2-discoveries.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part2-discoveries.tsx#L366)
- [part2-discoveries.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part2-discoveries.tsx#L377)
- [part5-playbook.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part5-playbook.tsx#L99)
- [part5-playbook.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part5-playbook.tsx#L118)

### Best expansion ideas to keep

- Add a clean provider comparison chart: `OpenAI vs Gemini vs Perplexity`
- Add AI page rate by intent
- Add AI page rate by word-count bucket

### Important distinction to keep clear

There are two different comparisons:

- AI-referral providers: OpenAI, Gemini, Perplexity, and others
- Content-generation cohorts: `gpt-4o-mini`, `gpt-5-mini`, `gemini-3-flash-preview`, and others

Do not merge those into one story.

## Freshness And Age: Expand This First

### What the live data says

Rebuilt freshness buckets:

| Freshness bucket | Pages | Avg health | Avg impressions | Growth/decline ratio |
| --- | ---: | ---: | ---: | ---: |
| `0-30` | 148,109 | 29.10 | 2,614.3 | 1.08 |
| `31-90` | 50,771 | 22.45 | 649.0 | 6.24 |
| `91-180` | 55,155 | 19.36 | 380.8 | 1.76 |
| `181-365` | 84,477 | 12.34 | 332.3 | 3.04 |
| `366+` | 3,189 | 14.35 | 205.9 | 48.88 |

Important caveat:

- `366+` has only `16` declining pages, so the ratio is too unstable to use as a headline proof point.

Age x freshness also supports the split:

- `181-365 age x 181-365 freshness`: `76,249` pages, avg health `12.68`
- `365+ age x 181-365 freshness`: `8,228` pages, avg health `9.22`
- `365+ age x 366+ freshness`: `3,189` pages, avg health `14.35`

### What changes in the paper

- Replace every `181+` freshness bucket with `181-365` and `366+`.
- Keep the `365+ refreshed` result because it remains strong and actionable.
- Do not describe the whole `365+` age bucket as `the refreshed subset`.

### Current text to rewrite

- [part2-discoveries.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part2-discoveries.tsx#L90)
- [part2-discoveries.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part2-discoveries.tsx#L117)
- [part2-discoveries.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part2-discoveries.tsx#L192)
- [part2-discoveries.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part2-discoveries.tsx#L489)

## Search Volume / DFS Accuracy: Strongest Expansion Opportunity

### What the live data says

Overall:

- `51.48%` of pages with non-zero search volume have `impressions_90d > search_volume`
- Raw correlation between search volume and 90-day impressions: `r = 0.0014`
- Log correlation: `r = 0.1355`

By bucket:

| SV bucket | Pages | Avg SV | Avg 90d impressions | % with impressions > SV |
| --- | ---: | ---: | ---: | ---: |
| `1-100` | 127,316 | 22.7 | 1,875.7 | 55.64% |
| `100-1K` | 22,003 | 334.8 | 2,221.3 | 36.49% |
| `1K-10K` | 4,283 | 3,188.4 | 1,595.9 | 10.39% |
| `10K+` | 497 | 29,848.5 | 1,951.3 | 1.81% |

### Safe interpretation

- Search volume is not useless, but it is weak as a page-level expectation-setting number in this portfolio.
- Low-volume terms are where the portfolio most often exceeds the nominal volume benchmark.
- This is a stronger and more defensible section than the current `high SV is not the safest target` framing on its own.

### What changes in the paper

- Keep the low-SV story.
- Expand it into a real validation section:
  - DFS volume vs 90-day impressions
  - percent of pages where impressions exceed search volume
  - bucket calibration
  - raw vs log correlation

### Visuals worth adding

- Scatter plot: DFS search volume vs 90-day impressions on log scale
- Box plot: impression-to-volume ratio by SV bucket
- Simple bar: percent of pages with impressions above search volume

### Current text to rewrite

- [part3-surprises.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part3-surprises.tsx#L139)
- [part3-surprises.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part3-surprises.tsx#L184)

## Traffic Value / CPC: Use The Right Formula

### What the live data says

- Observed 90-day click-equivalent value from `clicks_90d * cpc`: `$797,760.90`
- Raw `impressions_90d * cpc`: `$263,681,579.08`

That second number is not traffic value. It is inflated because CPC is a cost-per-click metric, not a cost-per-impression metric.

### Safe recommendation

- If the paper wants `captured value`, use `clicks * CPC`
- If it wants `opportunity value`, use a modeled estimate such as `search_volume * expected CTR * CPC`
- Do not publish `impressions * CPC` as if it were traffic value

Portfolio split from validated click-equivalent value:

- Informational: `$355,621.64`
- Transactional: `$250,585.61`
- Commercial: `$188,751.01`

### Good companion visual

- Horizontal bar: click-equivalent value by intent

## Long-Form / Word Count: Split Traffic From Duration

### What the live data says

Correlations:

- Word count vs engagement seconds per session: `r = -0.0238`
- Word count vs impressions: `r = 0.2588`
- Log(word count) vs log(impressions): `r = 0.4000`
- Word count vs clicks: `r = 0.1569`

Bucket view:

| Word count bucket | Avg sessions | Avg impressions | Avg clicks | Avg engagement sec |
| --- | ---: | ---: | ---: | ---: |
| `<1K` | 0.17 | 8.1 | 0.19 | 3.76 |
| `1K-1.5K` | 3.93 | 523.2 | 1.72 | 4.59 |
| `1.5K-2K` | 4.87 | 732.3 | 2.39 | 4.78 |
| `2K-2.5K` | 1.83 | 407.3 | 1.67 | 6.50 |
| `2.5K-3.5K` | 2.97 | 638.0 | 2.94 | 5.47 |
| `3.5K-5K` | 8.59 | 1,103.7 | 3.70 | 3.58 |
| `5K+` | 14.35 | 2,497.6 | 7.62 | 5.78 |

### Safe interpretation

- Longer content does correlate with more visibility.
- It does not show a clean positive relationship with engagement seconds.
- If the paper wants a duration sweet spot, `2K-2.5K` is strongest in this cut.
- If it wants a traffic sweet spot, `5K+` dominates sessions, impressions, and clicks.

### What changes in the paper

- Keep the nuanced `threshold, not guarantee` framing.
- Do not turn `2,500+` into a universal rule.
- Split the story into:
  - visibility lift from depth
  - duration effects
  - AI-page incidence by word count

### Visuals worth adding

- Distribution chart: word count vs impressions
- Distribution chart: word count vs clicks
- Side-by-side bar: word count bucket vs average engagement seconds
- Bubble chart: word count bucket vs impressions, sized by page count

### Current text to rewrite

- [part3-surprises.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part3-surprises.tsx#L254)
- [part5-playbook.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part5-playbook.tsx#L56)
- [part5-playbook.tsx](/Users/mirzaasceric/Desktop/keyword-blogs-v2/scripts/paper-creator/paper/pdf-sections/part5-playbook.tsx#L118)

## AI Model Performance: Keep Exploratory, Improve The Visualization

Useful distinction:

- Referral-provider comparison is safe and clean
- Content-generation cohort comparison remains exploratory

What to keep from the Claude review:

- The current flat table is hard to read
- Age-controlled comparison is the only honest way to compare cohorts

What not to do:

- Do not turn the current cohort export into a headline `Gemini wins every tier` claim
- Do not present model-family differences as controlled experimental truth

Safe paper direction:

- Replace the current dense table with a simpler age-controlled grouped comparison
- Label it as `exploratory cohort comparison`
- Keep detailed per-model rows in appendix material, not in the main discovery text

## Hardcoded Values In TSX That Should Become Dynamic

This was a good catch from the Claude review and should be fixed before the next regeneration.

| Location | Hardcoded value | Better approach |
| --- | --- | --- |
| `part3-surprises.tsx` | `31.3`, `27.5`, `12%` backlink values | Compute from data if the section is ever restored |
| `part2-discoveries.tsx` | `42% longer`, `27% younger` | Compute from current dataset |
| `part5-playbook.tsx` | `52%` loss and `29.3 to 14.1` | Compute from current age data |

Recommendation:

- Make all public-facing numeric claims derive from `paper-data.json` or validated recomputation
- Avoid freezing numbers in prose when the paper is designed to regenerate

## Data Hygiene Risks To Fix Before Expanding The Paper

Several exports are unsafe for literal percentage claims:

- `hyp-model-performance.json` contains `avg_ctr_pct = 114.24`
- `myth-wordcount-continuous.json` contains `avg_ctr_pct = 370.5`
- `corr-age-freshness-matrix.json` contains `avg_ctr_pct = 209.05`
- `freshness-tiers.json` / freshness-derived exports include a `91-180` freshness case with avg CTR above `100%` in cached data
- `corr-ai-vs-traditional.json` contains `avg_scroll_pct = 1034.04`

That does not make the whole section false. It means those exports are averaging row-level rates in a way that should not be presented as literal public percentages.

Recommendation:

- Recompute public-facing CTR from total clicks / total impressions
- Recompute engagement from raw seconds and sessions
- Treat average scroll/engagement percentages from those exports as internal heuristics, not public proof points

## What Is Feasible Now

- Double-check AI sessions relative to regular sessions
- Show both `90-day` and `historical monthly` windows side by side
- Replace `181+` with `181-365` and `366+`
- Add traffic value using `clicks * CPC`
- Add DFS volume vs impressions calibration
- Add percent of pages where impressions exceed search volume
- Add AI intent analysis
- Add word count vs AI page rate
- Add impressions vs word count
- Add clicks vs word count
- Add word count vs duration
- Add referral-provider comparison: OpenAI vs Gemini vs Perplexity
- Add character-count analysis because `char_count` exists upstream

## What Still Needs New Data Or A New Export

- Citation count by page or intent
- `Which intent type is most relevant for citations`
- Full ranking-query vs primary-keyword relevance
- `Does longer content rank for more keywords`
- Percent of ranking queries relevant to the intended primary keyword

Important nuance:

- `cannibalization_analysis` does contain query-level data, but only for cannibalized queries, not for the full ranking-query universe
- The local cached file `raw-cannibalization-detail.json` is not usable as-is because it contains an error payload instead of valid JSON

## Validated Query Patterns For Remaining Work

These are safe directions if more upstream pulls are needed.

365-day portfolio totals:

```sql
SELECT
  COUNT(DISTINCT content_id) AS content_count,
  SUM(gsc_impressions) AS total_impressions,
  SUM(gsc_clicks) AS total_clicks,
  SUM(ga4_sessions) AS total_sessions,
  SUM(sessions_ai) AS total_ai_sessions
FROM `gsc-bigquery-project-447113.central_data_warehouse.daily_content_performance`
WHERE report_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
```

Character-count analysis:

```sql
SELECT
  CASE
    WHEN char_count < 5000 THEN '<5K chars'
    WHEN char_count < 10000 THEN '5K-10K'
    WHEN char_count < 20000 THEN '10K-20K'
    WHEN char_count < 30000 THEN '20K-30K'
    ELSE '30K+'
  END AS char_bucket,
  COUNT(*) AS pages,
  AVG(v.impressions_90d) AS avg_impressions_90d,
  AVG(v.clicks_90d) AS avg_clicks_90d,
  AVG(v.health_score) AS avg_health
FROM `gsc-bigquery-project-447113.central_data_warehouse.v_content_90d_age_summary` v
JOIN `gsc-bigquery-project-447113.central_data_warehouse.all_content_data` c
  ON v.content_id = c.content_id
GROUP BY char_bucket
ORDER BY char_bucket
```

## Recommended Rewrite Priorities

1. Add a `windows` explainer and label every chart by window.
2. Keep AI, but make it visibly proportional to the portfolio.
3. Expand search-volume validation into a real DFS accuracy section.
4. Split freshness into `181-365` and `366+`, and flag `366+` as small-sample.
5. Add traffic-value analysis using `clicks * CPC`, not `impressions * CPC`.
6. Expand long-form analysis with separate traffic and duration charts.
7. Fix hardcoded values in TSX before the next regeneration.
8. Do not add citation or full relevance-query sections until the right data exists.

## Implementation Matrix

| Priority | Task | Data status | Value |
| --- | --- | --- | --- |
| `P0` | Clarify `90d` vs `30d` vs `monthly` windows in the paper text | Ready now | High credibility gain |
| `P0` | Expand DFS accuracy section with validated numbers | Ready now | High differentiation |
| `P0` | Add AI small-base caveat and provider comparison | Ready now | High clarity gain |
| `P1` | Replace `181+` with `181-365` and `366+` | Ready now | High analytical gain |
| `P1` | Add click-equivalent traffic value section | Ready now | High reader value |
| `P1` | Add long-form traffic vs duration split | Ready now | High interpretive gain |
| `P1` | Make hardcoded values dynamic | Ready now | Regeneration safety |
| `P2` | Add character-count analysis | Upstream data exists | Useful complement |
| `P2` | Simplify AI model comparison into exploratory appendix-style view | Ready now | Medium value |
| `P3` | Add citation analysis | Blocked | Not publishable yet |
| `P3` | Add full primary-keyword vs ranking-query relevance | Blocked | High value later |

## Bottom Line

The strongest next version of the paper is:

- clearer about windows
- more modest about AI scale
- stronger on DFS volume validation
- more precise about freshness buckets
- more careful about what long-form actually improves
- explicit about what is measured directly versus inferred

That keeps the current PDF creator voice intact while making the new expansions stronger, cleaner, and safer to publish.
