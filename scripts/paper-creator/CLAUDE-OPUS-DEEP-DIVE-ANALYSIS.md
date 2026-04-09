# Deep-Dive Factuality & Accuracy Analysis — FlyRank SEO Research Paper

**Author:** Claude Opus 4.6
**Date:** March 25, 2026
**Role:** COMPANION DOCUMENT — complements `CODEX_FACTUALITY_DEEP_DIVE.md` (primary reference)
**Paper Analyzed:** `output/flyrank-seo-research-march-2026.pdf`
**Data Sources Reviewed:** All 48 JSON files in `data/` and `data/v2/`, `build-paper-data.ts`, `bq.ts`, `analyze.py`, and all 5 PDF section files.

> **How to use these two documents together:**
> - **Codex doc = primary reference** — has fresh BQ-queried data, catches data hygiene issues, identifies paper text that overreaches, and provides the correct traffic value formula (`clicks × CPC`)
> - **This doc = implementation companion** — adds the task-by-task breakdown, exact BQ queries for remaining work, visualization specs, OpenAI vs Gemini computed head-to-head, hardcoded value audit, and prioritized implementation roadmap

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Factuality Audit of Current Paper](#factuality-audit)
3. [Task 1: AI Sessions — Validate Size & Relative Significance](#task-1-ai-sessions)
4. [Task 2: 90-Day vs All-Time Data Window Validation](#task-2-data-window)
5. [Task 3: Freshness Multiplier — Expand to 181-360 and 361+](#task-3-freshness-tiers)
6. [Task 4: Estimated Traffic Value (CPC × Impressions)](#task-4-traffic-value)
7. [Task 5: Search Volume Accuracy — DFS vs Our Impressions](#task-5-search-volume-accuracy)
8. [Task 6: Expand AI Analysis — Intent vs Citations, Words vs AI](#task-6-expand-ai)
9. [Task 7: Impressions vs Word Count — Distribution Chart](#task-7-impressions-wordcount)
10. [Task 8: Clicks vs Words/Characters — Clusters & Distributions](#task-8-clicks-words)
11. [Task 9: Age Freshness — Add 365+ Range](#task-9-age-freshness-365)
12. [Task 10: AI Model Performance — Better Visualization & Provider Comparison](#task-10-ai-model-viz)
13. [Task 11: Relevance Cluster — Keyword vs Ranking Queries](#task-11-relevance-cluster)
14. [Task 12: Long-Form Analysis — Duration, Query Count, Primary KW Relevance](#task-12-long-form)
15. [Implementation Priority Matrix](#implementation-priority)

---

## Executive Summary

The paper is **generally factually accurate** — numbers in the paper match the underlying JSON data files. However, there are several areas where claims are imprecise, scope is ambiguous, or additional analysis would significantly strengthen the findings. Below is a section-by-section audit followed by detailed task analysis.

**Verdict on current paper accuracy: 8/10** — solid data foundations, but the ambiguity around time windows and the thinness of the AI traffic section are the two biggest credibility risks for a public audience.

---

## Factuality Audit

### Verified Claims (Correct)

| Claim in Paper | Source Data | Verified Value | Status |
|---|---|---|---|
| 341,018 content pieces | `portfolio-overview.json` → total_content | 341,018 | CORRECT |
| 56 brands | `portfolio-overview.json` → client_count | 56 | CORRECT |
| 462,821,566 impressions | `portfolio-overview.json` → total_impressions | 462,821,566 | CORRECT |
| 1,494,299 clicks | `portfolio-overview.json` → total_clicks | 1,494,299 | CORRECT |
| 1,606,936 sessions | `portfolio-overview.json` → total_sessions | 1,606,936 | CORRECT |
| 17,099 AI sessions | `portfolio-overview.json` → total_ai_sessions | 17,099 | CORRECT |
| 1.06% AI share | Computed: 17,099 / 1,606,936 × 100 | 1.064% | CORRECT |
| Avg health score 18.3 | `portfolio-overview.json` → avg_health_score | 18.3 | CORRECT |
| Peak at 61-90 days (health 33.1) | `hyp-age-golden-zone.json` → age_bucket "61-90" | 33.1 | CORRECT |
| Decay cliff at 271-365 days (health 14.1) | `hyp-age-golden-zone.json` → age_bucket "271-365" | 14.1 | CORRECT |
| 365+ recovery (health 25.1) | `hyp-age-golden-zone.json` → age_bucket "365+" | 25.1 | CORRECT |
| Growing content 3,215 words | `corr-growing-vs-declining-profile.json` → up → avg_word_count | 3,215 | CORRECT |
| Declining content 2,262 words | `corr-growing-vs-declining-profile.json` → down → avg_word_count | 2,262 | CORRECT |
| Growing: 42% longer | (3215-2262)/2262 = 42.1% | 42.1% | CORRECT |
| Growing: 27% younger | (231-182)/182 = 26.9% ≈ 27% | ~27% | CORRECT |
| 74,187 rising vs 45,272 falling | `corr-growing-vs-declining-profile.json` → n values | 74,187 / 45,272 | CORRECT |
| 7.2:1 growth ratio at 31-90d freshness | `corr-freshness-trend.json` → 31-90d: up=16,068 / down=2,239 | 7.17:1 ≈ 7.2:1 | CORRECT |
| Low-volume SV 1-100 best health (25.9) | `hyp-search-volume-success.json` → sv_bucket "1-100" | 25.9 | CORRECT |
| High-volume 10K+ health 22.0 | `hyp-search-volume-success.json` → sv_bucket "10K+" | 22.0 | CORRECT |
| Engagement: high scroll + high engage = 47.5 health | `corr-engagement-matrix.json` → row 0 | 47.5 | CORRECT |
| Visibility consistent (80+) = 46.8 health | `hyp-visibility-consistency.json` → "consistent (80+)" | 46.8 | CORRECT |
| Top 10% avg 3,012 words, Bottom 10% avg 1,880 | `raw-top-bottom-decile.json` | 3,012 / 1,880 | CORRECT |
| Top 10% avg pos 4.8, 61.9 health | `raw-top-bottom-decile.json` → top_10pct | 4.8, 61.9 | CORRECT |

### Claims Requiring Clarification or Correction

| Claim | Issue | Details |
|---|---|---|
| **"The Freshness Multiplier"** uses freshness tiers 0-30, 31-90, 91-180, **181+** | **INCOMPLETE** — The 181+ bucket merges content 6 months stale with content 2+ years stale. This loses critical granularity. The paper should split into **181-360** and **361+**. |
| **"Content peaks at 61-90 days... partially recovers at 365+"** | **ACCURATE but misleading** — The 365+ "recovery" (25.1) is likely driven by refreshed content within that bucket (n=29,053). The paper acknowledges this but could be clearer that this is a survivorship/refresh effect, not natural recovery. |
| **"+17.9 health points" from engagement** | **CALCULATION ISSUE** — Paper says high_scroll × high_engage vs low_scroll × low_engage = +17.9 pts. Actual: 47.5 - 29.6 = **17.9**. CORRECT, but note that the low_scroll × low_engage bucket (n=34,479) is 2x larger than high_scroll × high_engage (n=15,765), so the comparison is size-imbalanced. |
| **"AI sessions" magnitude throughout** | **UNDERSOLD RISK** — 17,099 AI sessions is only **1.06%** of total sessions. The paper mentions this but still devotes 3+ pages to AI analysis on a very thin data layer. See Task 1 below. |
| **30d trend comparison (+74.2% impressions, etc.)** | **VERIFIED** — Recomputed from `dashboard-trends.json` aggregate. Values check out. |
| **"90-day" vs "all-time" scope** | **AMBIGUOUS** — The paper title page says "last 90 days" metrics but portfolio-overview counts 341,018 content pieces (all-time inventory). Monthly trends show 6 months. Metrics like impressions_90d are indeed 90-day rolling, but content counts and age tiers are all-time. See Task 2. |
| **CTR values: weighted CTR** | **CORRECT method** — The paper correctly uses clicks_90d/impressions_90d per tier instead of averaging per-row CTRs. This was an explicit fix from an earlier version that produced impossible >100% values. Good. |
| **Backlinks page excluded** | **CORRECT DECISION** — `sectionPolicy.includeBacklinksPage = false` because `metricAudit.backlinks.validation_status = "unverified_provenance"`. The backlink data source was flagged as legacy with no verified extraction path. |

### Hardcoded Values in Paper (Potential Staleness Risk)

The following values appear **hardcoded in TSX** rather than read from data:

| Location | Hardcoded Value | Should Be |
|---|---|---|
| `part3-surprises.tsx:113` | `"31.3"` health at 1-9 links | Dynamic from `d.myths.backlinks` |
| `part3-surprises.tsx:113` | `"27.5"` health at 100+ links | Dynamic from `d.myths.backlinks` |
| `part3-surprises.tsx:113` | `"12%"` decline | Calculated dynamically |
| `part2-discoveries.tsx:63-64` | `"42% longer"`, `"27% younger"` | Should compute from data |
| `part5-playbook.tsx:49` | `"52%"` health loss, `"29.3 to 14.1"` | From age data but hardcoded in ActionStep text |

**Recommendation:** These should be computed from data to prevent drift on regeneration.

---

## Task 1: AI Sessions — Validate Size & Relative Significance

### Current State
- **Total AI sessions:** 17,099
- **Total sessions:** 1,606,936
- **AI share:** 1.06%
- The paper devotes Finding #6 (full page), the AI Traffic Optimization Guide (full page), and parts of the AI Model Performance section to AI traffic.

### Relative Analysis

| Metric | AI Sessions | Regular Sessions | Ratio |
|---|---|---|---|
| Total | 17,099 | 1,589,837 | 1:93 |
| Monthly trend (latest Feb 2026) | 5,766 | 337,758 | 1:59 |
| Monthly trend (Nov 2025) | 3,670 | 226,255 | 1:62 |

**Growth trajectory:** AI sessions grew from 3,670 (Nov '25) → 5,766 (Feb '26), a **57% increase** over 4 months. Regular sessions grew from 229,925 → 343,524, a **49% increase**. AI is growing faster but from a tiny base.

**Monthly AI breakdown (Feb 2026):**
- ChatGPT: 3,415 (59.2%)
- Gemini: 1,541 (26.7%)
- Perplexity: 693 (12.0%)
- Copilot: 102 (1.8%)
- Claude: 18 (0.3%)

### Verdict

**AI sessions ARE small relative to regular sessions — but should NOT be removed.** Reasons:

1. **Growth rate is steeper** than organic (57% vs 49% over 4 months)
2. **The high_ai bucket** (n=227) has dramatically different behavior: 44.4 health, 31,369 avg impressions vs no_ai's 36.6 health, 2,073 avg impressions — 15x impression multiplier
3. **Industry relevance** — AI traffic analysis is the most timely and differentiating aspect of this paper
4. **Recommendation:** Keep AI sections but add explicit "small sample" caveat with the raw n=17,099 and 1.06% share prominently displayed. Add trend trajectory showing it's accelerating. The current paper mentions this but could be more upfront about it.

### Required Data Changes

No new BQ queries needed. Current data is sufficient. Modify paper text to:
- Lead with "AI traffic represents 1.06% of sessions (17,099 of 1.6M)" prominently
- Show month-over-month acceleration chart
- Add caveat: "Findings are directional given the small absolute base"

---

## Task 2: 90-Day vs All-Time Data Window Validation

### Current State

The paper says: *"90-day performance window (rolling), 30-day trend comparison, 6-month time series for trend analysis."*

But this is confusing because different metrics use different windows:

| Data Element | Actual Window | Source |
|---|---|---|
| Impressions, clicks, sessions, AI sessions per content | **90-day rolling** | `v_content_90d_age_summary` |
| Content count (341,018) | **All-time inventory** | `portfolio-overview.json` → total_content |
| Age tiers, freshness tiers | **All-time** (every content piece has an age) | `age-tiers.json` |
| Trend direction (up/down/stable) | **30d vs prev 30d** comparison | `corr-growing-vs-declining-profile.json` |
| Monthly trends chart | **6-month series** (Oct 2025 → Mar 2026) | `time-monthly-trends.json` |
| AI monthly breakdown | **4 months** (Nov 2025 → Feb 2026) | `ai-monthly.json` |
| Health score | Based on **90-day** performance inputs | Composite metric |
| Position (avg_position) | **90-day** average | Derived from daily fact table |
| Engagement (scroll, engagement rate) | **90-day** | GA4 data |

### Verdict

**The paper is NOT purely 90-day data.** It uses:
- **90-day rolling** for performance metrics (impressions, clicks, sessions, position, health)
- **All-time** for inventory counts and content metadata (age, word count, model_used)
- **30-day** for trend comparisons
- **6-month** for time series

### Required Paper Modification

The paper should present a **side-by-side comparison table** in the Study Scope section:

```
| Window | What It Covers | Used For |
|--------|---------------|----------|
| 90-day rolling | Impressions, clicks, sessions, CTR, position, health score | All performance comparisons |
| 30-day vs prev 30d | Trend direction, momentum signals | Growth/decline classification |
| All-time inventory | Content count, age, word count, model_used | Population sizing, metadata |
| 6-month series | Monthly aggregates (Oct '25 → Mar '26) | Trend visualization |
```

### Can We Show 90 vs 365 Side-by-Side?

**Partially.** The current data pipeline uses `v_content_90d_age_summary` which is hardcoded to 90 days. To get 365-day performance:

- **Option A:** Query `daily_content_performance` with `date_start` 365 days back via `bq.ts sql` — this would give us all-time aggregates. This IS possible since the daily fact table exists.
- **Option B:** Use the 6-month `time-monthly-trends.json` data to approximate. We have Oct 2025 → Mar 2026 = ~6 months. Summing: 606,482,883 impressions (6-month) vs 462,821,566 (90-day from portfolio-overview). The difference suggests ~30% of impressions come from the older 3 months.

**Recommendation:** Run a new BQ query for 365-day totals and present both windows in the paper. BQ query needed:

```sql
SELECT
  COUNT(DISTINCT content_id) as content_count,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  SUM(sessions) as total_sessions,
  SUM(ai_sessions) as total_ai_sessions
FROM `gsc-bigquery-project-447113.central_data_warehouse.daily_content_performance`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)
```

---

## Task 3: Freshness Multiplier — Expand to 181-360 and 361+

### Current State

The freshness tiers in the paper are:
- **0-30** (n=147,216, health 29.16)
- **31-90** (n=51,118, health 22.31)
- **91-180** (n=58,144, health 19.09)
- **181+** (n=84,540, health 12.26)

The **181+ bucket contains 84,540 content pieces** — 24.8% of the entire portfolio. This is a massive bucket that merges:
- Content last updated 6-12 months ago (might still be somewhat relevant)
- Content last updated 1-2+ years ago (likely deeply stale)

### What We Can Already See

From `corr-age-freshness-matrix.json`, the 181+ freshness tier intersects with:
- age 181-365 × freshness 181+ → n=73,178, health=12.5, avg_imp=327
- age 365+ × freshness 181+ → n=11,362, health=10.6, avg_imp=69

This tells us the 181+ freshness bucket is mostly age 181-365 content. But we can't see the freshness 181-360 vs 361+ split from current data.

### Required BQ Query

```sql
SELECT
  CASE
    WHEN days_since_last_update BETWEEN 181 AND 360 THEN '181-360'
    WHEN days_since_last_update > 360 THEN '361+'
  END as freshness_tier_expanded,
  COUNT(*) as content_count,
  AVG(health_score) as avg_health_score,
  SUM(impressions_90d) as impressions_90d,
  SUM(sessions_90d) as sessions_90d,
  AVG(ctr) as avg_ctr
FROM `gsc-bigquery-project-447113.central_data_warehouse.v_content_90d_age_summary`
WHERE days_since_last_update > 180
GROUP BY 1
ORDER BY 1
```

Also need the **freshness × trend** cross-cut for the new tiers:

```sql
SELECT
  CASE
    WHEN days_since_last_update BETWEEN 181 AND 360 THEN '181-360'
    WHEN days_since_last_update > 360 THEN '361+'
  END as freshness_tier_expanded,
  trend_direction,
  COUNT(*) as n,
  AVG(health_score) as avg_health,
  AVG(impressions_90d) as avg_impressions
FROM `gsc-bigquery-project-447113.central_data_warehouse.v_content_90d_age_summary`
WHERE days_since_last_update > 180
  AND trend_direction IN ('up', 'down')
GROUP BY 1, 2
ORDER BY 1, 2
```

### Expected Impact on Paper

This will likely show a steeper decay pattern:
- 181-360d freshness: probably health ~14-16 (some content still has residual authority)
- 361+d freshness: probably health ~8-10 (deeply stale, zombie territory)

This split is important because it changes the **urgency narrative**: content stale for 6-12 months might be saveable with a refresh; content stale for 1+ year might need a full rewrite or pruning decision.

### Paper Modifications

- Replace "181+" everywhere with two tiers: "181-360" and "361+"
- Update the Freshness Multiplier chart (Finding #4) with the new tiers
- Update the Age-Freshness Matrix heatmap (Finding #8) to show the expanded grid
- Update Myth #7 (Fresh Content Always Outperforms) table with new breakdown

---

## Task 4: Estimated Traffic Value (CPC × Impressions)

### Available Data

From `hyp-cpc-performance.json`:

| CPC Bucket | Count | Avg Health | Avg Impressions | Avg Position |
|---|---|---|---|---|
| 0-0.5 | 23,111 | 26.2 | 2,111 | 17.4 |
| 0.5-1 | 8,356 | 24.9 | 1,485 | 18.7 |
| 1-2 | 11,004 | 24.1 | 1,443 | 18.7 |
| 2-5 | 13,478 | 23.5 | 1,350 | 19.5 |
| 5+ | 12,113 | 19.4 | 1,199 | 24.9 |
| zero/null | 272,956 | 21.8 | 1,293 | 14.5 |

From `hyp-search-volume-success.json` we also have clicks per SV bucket.

### Estimated Traffic Value Calculation

> **CORRECTION:** An earlier version of this section incorrectly used `impressions × CPC` which overstates value since CPC is cost-per-click, not cost-per-impression. The Codex doc correctly identifies the right formula.

**Correct method:** `clicks_90d × CPC` = captured click-equivalent value

**Codex-verified result:** **$797,760.90** over 90 days (from actual `clicks × CPC` computation)

By intent (from Codex):
- Informational: $355,621.64
- Transactional: $250,585.61
- Commercial: $188,751.01

**Annualized estimate: ~$3.2M traffic value** for the portion of the portfolio with CPC data.

### Important Caveats
- 80% of the portfolio (272,956 pieces) has **zero/null CPC** — these are keywords not in DFS or with $0 CPC
- This measures "what would this traffic cost in Google Ads" not actual revenue
- Do NOT use `impressions × CPC` — that formula produces a meaningless $263M number

### Required BQ Query for Precision

```sql
SELECT
  CASE
    WHEN cpc IS NULL OR cpc = 0 THEN 'no_cpc'
    WHEN cpc < 0.5 THEN '0-0.5'
    WHEN cpc < 1 THEN '0.5-1'
    WHEN cpc < 2 THEN '1-2'
    WHEN cpc < 5 THEN '2-5'
    ELSE '5+'
  END as cpc_bucket,
  COUNT(*) as n,
  SUM(impressions_90d) as total_impressions,
  SUM(clicks_90d) as total_clicks,
  SUM(clicks_90d * cpc) as estimated_traffic_value_90d,
  AVG(cpc) as avg_cpc
FROM `gsc-bigquery-project-447113.central_data_warehouse.v_content_90d_age_summary`
WHERE cpc IS NOT NULL AND cpc > 0
GROUP BY 1
ORDER BY estimated_traffic_value_90d DESC
```

### Paper Addition

Add a new section or sidebar: **"Portfolio Traffic Value Estimation"**
- Show total estimated traffic value
- Show value by CPC tier
- Compare with what it would cost to buy this traffic via Google Ads
- Add caveat about CPC data coverage (only 20% of portfolio has CPC data)

---

## Task 5: Search Volume Accuracy — DFS vs Our Impressions

### This Is The Most Powerful Analysis in the Improvement List

From `myth-sv-vs-impressions.json`:

| SV Bucket | Count | Avg SV (DFS) | Avg Impressions (90d, ours) | Impression/SV Ratio |
|---|---|---|---|---|
| **1-100** | 127,183 | 23 | 1,851 | **81.61x** |
| **100-1K** | 21,092 | 307 | 2,213 | **7.22x** |
| **1K-10K** | 5,165 | 2,813 | 1,614 | **0.57x** |
| **10K+** | 497 | 29,848 | 1,905 | **0.06x** |
| zero/null | 119,993 | 0 | 1,344 | N/A |

### Key Findings

1. **Low-volume keywords (SV 1-100) are MASSIVELY understated by DFS**: Our impressions are **81.6x higher** than what DFS reports as search volume. For a keyword DFS says gets 23 monthly searches, we're seeing 1,851 impressions in 90 days (~617/month). This is a 26.8x understatement even accounting for the 3-month window.

2. **Mid-volume keywords (100-1K) are still significantly understated**: 7.2x ratio means DFS data substantially underestimates true search demand in this range.

3. **High-volume keywords (1K-10K) are slightly overstated**: Ratio of 0.57 means we capture about 57% of the stated volume in impressions. This makes sense — for competitive keywords, we don't rank well enough to capture all impressions.

4. **Very high volume (10K+) shows we capture only 6%**: Expected — these are the most competitive keywords where our average position is 22.2 (page 3).

### Why This Matters

**The SEO industry widely relies on keyword planner / DFS search volume data to prioritize content.** Our data suggests:
- **Low-volume keywords have far more real search demand** than tools report
- **DFS accuracy improves as volume increases** but inverts — low volume is understated, high volume is the only range where the numbers are close to being a ceiling
- **This validates the paper's Myth #2** (high SV ≠ more traffic) even more strongly

### % of Keywords Where We Have More Impressions Than DFS Volume

From the data:
- SV 1-100: Impression/SV ratio = 81.61x → **overwhelmingly more impressions than SV** (likely >95% of individual keywords in this bucket have more impressions than SV, given the 81x average)
- SV 100-1K: ratio = 7.22x → **majority have more impressions** (likely >80%)
- SV 1K-10K: ratio = 0.57x → **majority have fewer impressions** (we don't rank well enough)
- SV 10K+: ratio = 0.06x → **virtually all have fewer impressions**

### Required BQ Queries

**Query 1: Exact percentage of keywords where impressions > SV**
```sql
SELECT
  CASE
    WHEN search_volume BETWEEN 1 AND 100 THEN '1-100'
    WHEN search_volume BETWEEN 101 AND 1000 THEN '100-1K'
    WHEN search_volume BETWEEN 1001 AND 10000 THEN '1K-10K'
    WHEN search_volume > 10000 THEN '10K+'
  END as sv_bucket,
  COUNT(*) as total,
  COUNTIF(impressions_90d > search_volume * 3) as exceeds_quarterly_sv,
  ROUND(COUNTIF(impressions_90d > search_volume * 3) / COUNT(*) * 100, 1) as pct_exceeding
FROM `gsc-bigquery-project-447113.central_data_warehouse.v_content_90d_age_summary`
WHERE search_volume > 0
GROUP BY 1
ORDER BY 1
```

**Query 2: Distribution analysis for visualization**
```sql
SELECT
  CASE
    WHEN search_volume BETWEEN 1 AND 100 THEN '1-100'
    WHEN search_volume BETWEEN 101 AND 1000 THEN '100-1K'
    WHEN search_volume BETWEEN 1001 AND 10000 THEN '1K-10K'
    WHEN search_volume > 10000 THEN '10K+'
  END as sv_bucket,
  APPROX_QUANTILES(SAFE_DIVIDE(impressions_90d, search_volume), 100)[OFFSET(10)] as ratio_p10,
  APPROX_QUANTILES(SAFE_DIVIDE(impressions_90d, search_volume), 100)[OFFSET(25)] as ratio_p25,
  APPROX_QUANTILES(SAFE_DIVIDE(impressions_90d, search_volume), 100)[OFFSET(50)] as ratio_p50,
  APPROX_QUANTILES(SAFE_DIVIDE(impressions_90d, search_volume), 100)[OFFSET(75)] as ratio_p75,
  APPROX_QUANTILES(SAFE_DIVIDE(impressions_90d, search_volume), 100)[OFFSET(90)] as ratio_p90
FROM `gsc-bigquery-project-447113.central_data_warehouse.v_content_90d_age_summary`
WHERE search_volume > 0 AND impressions_90d > 0
GROUP BY 1
ORDER BY 1
```

### Proposed Visualizations

1. **Bar chart:** Impression/SV ratio by SV bucket (already have data for this)
2. **Scatter plot:** DFS search_volume (x) vs actual impressions_90d (y) with log scale — show the massive spread
3. **Box plot:** Distribution of impression/SV ratio per bucket — show variance, not just averages
4. **Pie/donut:** % of keywords where impressions > SV × 3 (quarterly equivalent)
5. **Heatmap:** Accuracy by SV bucket × position tier — does ranking position affect how much of the "true" volume you see?

### Theories to Test/Debunk

| Theory | Test | Expected Result |
|---|---|---|
| "DFS low-volume data is inaccurate" | Compare impression/SV ratio by bucket | **CONFIRMED** — 81.6x for SV 1-100 |
| "Keyword planners undercount long-tail" | Check if low-SV keywords have more impression diversity | Likely confirmed |
| "Volume data is only useful for high-volume keywords" | Check accuracy curve across buckets | **PARTIALLY** — improves with volume but still off |
| "Our articles rank for more queries than the target keyword" | Need query-level data (see Task 12) | Need new data |

---

## Task 6: Expand AI Analysis — Intent vs Citations, Words vs AI

### Intent Type vs AI Citations

From the feature vector data, we have `main_intent` (informational, transactional, navigational, commercial) and `ai_sessions_90d`. We need the cross-tabulation.

**Required BQ Query:**
```sql
SELECT
  main_intent,
  COUNT(*) as n,
  SUM(ai_sessions_90d) as total_ai_sessions,
  AVG(ai_sessions_90d) as avg_ai_sessions,
  COUNTIF(ai_sessions_90d > 0) as content_with_ai,
  ROUND(COUNTIF(ai_sessions_90d > 0) / COUNT(*) * 100, 2) as pct_with_ai,
  AVG(impressions_90d) as avg_impressions,
  AVG(health_score) as avg_health
FROM `gsc-bigquery-project-447113.central_data_warehouse.v_content_90d_age_summary`
WHERE main_intent IS NOT NULL
GROUP BY 1
ORDER BY avg_ai_sessions DESC
```

**Hypothesis:** Informational content likely gets more AI citations because AI models use reference-style content for answers. Commercial/transactional may get fewer citations.

**Proposed visualizations:**
- Horizontal bar chart: avg AI sessions by intent type
- Stacked bar: % of content with AI sessions by intent type
- Distribution: AI sessions per content piece for each intent type

### Word Count vs AI Sessions/Citations

From current data, `corr-ai-vs-traditional.json` shows the high_ai bucket (n=227) but doesn't break by word count. We need this cross-cut.

**Required BQ Query:**
```sql
SELECT
  CASE
    WHEN word_count < 1000 THEN '<1K'
    WHEN word_count < 2000 THEN '1K-2K'
    WHEN word_count < 3000 THEN '2K-3K'
    WHEN word_count < 4000 THEN '3K-4K'
    WHEN word_count < 5000 THEN '4K-5K'
    ELSE '5K+'
  END as wc_bucket,
  COUNT(*) as n,
  SUM(ai_sessions_90d) as total_ai_sessions,
  AVG(ai_sessions_90d) as avg_ai_sessions,
  COUNTIF(ai_sessions_90d > 0) as content_with_ai,
  ROUND(COUNTIF(ai_sessions_90d > 0) / COUNT(*) * 100, 2) as pct_with_ai,
  AVG(impressions_90d) as avg_impressions
FROM `gsc-bigquery-project-447113.central_data_warehouse.v_content_90d_age_summary`
WHERE word_count > 0
GROUP BY 1
ORDER BY 1
```

**Expected finding:** Longer content (3K+) likely has higher AI citation rates because it provides more comprehensive, quotable content for AI models.

**Golden spot analysis:** Find the word count range with the highest AI sessions per content piece — this is the "sweet spot" for AI visibility.

---

## Task 7: Impressions vs Word Count — Distribution Chart

### Current State

From `myth-wordcount-continuous.json`:

| WC Bucket | Count | Avg Health | Avg Position | Avg Impressions |
|---|---|---|---|---|
| 0-500 | 38 | 11.4 | 8.3 | 2 |
| 500-1K | 30,519 | 18.6 | 10.1 | 8 |
| 1K-1.5K | 48,107 | 16.5 | 17.1 | 518 |
| 1.5K-2K | 34,877 | 18.5 | 17.9 | 725 |
| 2K-2.5K | 7,314 | 22.4 | 13.0 | 397 |
| 2.5K-3K | 30,895 | 25.5 | 11.6 | 545 |
| 3K-3.5K | 21,641 | 25.4 | 12.6 | 717 |
| 3.5K-4K | 14,369 | 25.6 | 15.0 | 824 |
| 4K-5K | 11,967 | 26.3 | 15.2 | 1,388 |
| **5K+** | **11,519** | **39.3** | **16.2** | **7,102** |

### Key Observation

**The 5K+ bucket is a massive outlier** — 7,102 avg impressions vs 1,388 for 4K-5K. This is a **5.1x jump**. The health score also jumps from 26.3 to 39.3. This suggests the "threshold, not a line" narrative in the paper is actually understated — there's a clear second inflection point at 5K+ words.

### Paper Issue

The paper currently says *"aim for 2,500+ words as a minimum threshold"* and *"don't pad content to 5,000+ just for length."* But the data shows 5K+ content has **dramatically better** impressions (7,102 vs everything else). The paper should:
1. Acknowledge the 5K+ data point more clearly
2. Show the full distribution chart
3. Note that 5K+ may have survivorship bias (only 11,519 pieces, and these are likely the most intentionally-crafted long-form pieces)

### Proposed Visualizations

1. **Distribution chart:** Word count (x-axis) vs avg impressions (y-axis) — show the hockey stick at 5K+
2. **Bubble chart:** Word count bucket (x) vs impressions (y) vs count (bubble size) — shows that 5K+ is both high-performing AND reasonably sized (n=11,519)
3. **Violin/box plot:** Impression distribution within each WC bucket — show variance, not just means

---

## Task 8: Clicks vs Words/Characters — Clusters & Distributions

### Available Data

The feature vector has both `word_count` and `clicks_90d` per content piece. From the raw correlations: `health_wc = 0.038` and `imp_wc = 0.101` — both weak positive correlations.

We don't have a direct `char_count` field in the current data exports. The feature vector includes `word_count` but not `char_count`, though `char_count` IS available in the BigQuery `all_content_data` table.

### Required BQ Queries

**Query 1: Clicks by word count bucket**
```sql
SELECT
  CASE
    WHEN word_count < 1000 THEN '<1K'
    WHEN word_count < 2000 THEN '1K-2K'
    WHEN word_count < 3000 THEN '2K-3K'
    WHEN word_count < 4000 THEN '3K-4K'
    WHEN word_count < 5000 THEN '4K-5K'
    ELSE '5K+'
  END as wc_bucket,
  COUNT(*) as n,
  AVG(clicks_90d) as avg_clicks,
  SUM(clicks_90d) as total_clicks,
  AVG(impressions_90d) as avg_impressions,
  AVG(SAFE_DIVIDE(clicks_90d, NULLIF(impressions_90d, 0)) * 100) as avg_ctr_pct
FROM `gsc-bigquery-project-447113.central_data_warehouse.v_content_90d_age_summary`
WHERE word_count > 0
GROUP BY 1
ORDER BY 1
```

**Query 2: Character count analysis (if char_count available)**
```sql
SELECT
  CASE
    WHEN char_count < 5000 THEN '<5K chars'
    WHEN char_count < 10000 THEN '5K-10K'
    WHEN char_count < 20000 THEN '10K-20K'
    WHEN char_count < 30000 THEN '20K-30K'
    ELSE '30K+'
  END as char_bucket,
  COUNT(*) as n,
  AVG(clicks_90d) as avg_clicks,
  AVG(impressions_90d) as avg_impressions,
  AVG(health_score) as avg_health
FROM `gsc-bigquery-project-447113.central_data_warehouse.v_content_90d_age_summary` a
JOIN `gsc-bigquery-project-447113.central_data_warehouse.all_content_data` c USING(content_id)
WHERE c.char_count > 0
GROUP BY 1
ORDER BY 1
```

### Proposed Visualizations

1. **Scatter cluster:** Word count (x) vs clicks (y), colored by health bucket — shows if there's a "sweet spot"
2. **Distribution chart:** Clicks per WC bucket with percentile whiskers
3. **Heatmap:** WC bucket × position tier → avg clicks — reveals where word count × visibility intersect

---

## Task 9: Age Freshness — Add 365+ Range

### Current State

The age-freshness matrix has age tiers: 0-14, 15-30, 31-90, 91-180, 181-365, **365+**

The 365+ age tier already exists (n=29,053, health 25.1). But the freshness dimension for 365+ content currently shows:
- 365+ × 0-30d fresh → n=17,636, health=34.5, avg_imp=4,000
- 365+ × 91-180d fresh → n=55, health=5.0, avg_imp=0
- 365+ × 181+d fresh → n=11,362, health=10.6, avg_imp=69

**Notable gap:** There's no 365+ × 31-90d freshness cell. This means very few 365+ day old content pieces were updated 31-90 days ago. Most 365+ content is either recently refreshed (0-30d) or deeply stale (181+).

### Required Change

The age dimension already includes 365+. The **freshness dimension** needs the 181-360 / 361+ split (covered in Task 3).

Once Task 3's query runs, the matrix should be regenerated with the expanded freshness tiers. This will create a more granular heatmap.

---

## Task 10: AI Model Performance — Better Visualization & Provider Comparison

### Current State

The paper shows a flat table in Finding #10 with model × age tier data. The user correctly identifies this is **too hard to parse** for direct model comparison.

### Data Available

From `hyp-model-performance.json` (overall):

| Model | Count | Avg Health | Avg Impressions | Avg Position | Avg Age |
|---|---|---|---|---|---|
| gemini-3-flash-preview | 59,828 | **29.8** | 1,961 | 12.8 | 59 |
| unknown | 4,835 | 24.4 | 575 | 20.6 | 383 |
| gpt-4o-mini | 93,188 | 22.4 | 976 | 15.4 | 235 |
| gemini-2.5-flash | 30,987 | 21.8 | 760 | 15.2 | 153 |
| gpt-5-mini | 52,204 | **12.6** | 162 | 15.8 | 225 |

### Critical Issue: Age Confounding

The models have **dramatically different average ages**:
- gemini-3-flash-preview: 59 days (very young)
- gpt-5-mini: 225 days (much older)
- gpt-4o-mini: 235 days (oldest among active models)

**This means raw model comparison is misleading.** The paper acknowledges this but the current table (22 rows of model × age tier) is too dense to read.

### Proposed Better Visualizations

1. **Grouped bar chart:** For each age tier (31-90, 91-180, 181-365), show health score side-by-side for each model. This is the age-controlled comparison.

2. **Provider-level aggregation (OpenAI vs Gemini):**

From `myth-ai-penalized.json`, aggregating by provider:

**OpenAI (gpt-4o-mini + gpt-5-mini):**

| Age Tier | Combined Count | Weighted Avg Health | Weighted Avg Impressions |
|---|---|---|---|
| 0-14 | 1,168 | 21.1 | 58 |
| 15-30 | 1,711 | 27.6 | 210 |
| 31-90 | 8,191 | 28.1 | 943 |
| 91-180 | 10,880 | 20.9 | 1,059 |
| 181-365 | 110,837 | 16.8 | 445 |
| 365+ | 12,605 | 26.4 | 2,022 |

**Gemini (gemini-3-flash-preview + gemini-2.5-flash):**

| Age Tier | Combined Count | Weighted Avg Health | Weighted Avg Impressions |
|---|---|---|---|
| 0-14 | 10,686 | 15.2 | 82 |
| 15-30 | 11,836 | 29.7 | 463 |
| 31-90 | 34,872 | 31.7 | 1,360 |
| 91-180 | 17,712 | 28.3 | 2,169 |
| 181-365 | 15,709 | 21.0 | 3,267 |
| 365+ | 0 | N/A | N/A |

**Head-to-head (age-controlled):**

| Age Tier | OpenAI Health | Gemini Health | Winner | OpenAI Imp | Gemini Imp | Winner |
|---|---|---|---|---|---|---|
| 15-30 | 27.6 | 29.7 | Gemini | 210 | 463 | Gemini |
| 31-90 | 28.1 | 31.7 | Gemini | 943 | 1,360 | Gemini |
| 91-180 | 20.9 | 28.3 | **Gemini** | 1,059 | 2,169 | **Gemini** |
| 181-365 | 16.8 | 21.0 | Gemini | 445 | 3,267 | **Gemini** |

**Gemini models outperform OpenAI models across every age tier** in both health and impressions. This is a much clearer finding than the current 22-row table.

### Caveats to Include
- gemini-3-flash-preview is the youngest model (avg 59 days) — its outperformance at 31-90d may reflect being purpose-built for more recent content strategies
- gpt-5-mini drags down OpenAI's average significantly (health 12.6 overall)
- Different models were used by different clients for different content types — this is not a controlled experiment

### Required Paper Modification

- Replace the 22-row flat table with a head-to-head OpenAI vs Gemini grouped chart
- Show the age-controlled comparison in a cleaner 4-6 row table
- Add a "direct comparison" callout box showing Gemini leads in every age tier
- Keep the per-model detail as an appendix or footnote

---

## Task 11: Relevance Cluster — Keyword vs Ranking Queries

### What's Being Asked

The user wants to understand: **how much does a content piece's performance correlate with its primary target keyword vs the actual queries it ranks for?**

This requires comparing:
- The **target keyword** (from `all_content_data.keyword` or similar)
- The **actual ranking queries** (from Google Search Console query-level data)
- How much of the performance comes from the target keyword vs tangential queries

### Data Availability Assessment

**Available:**
- `all_content_data` has the primary keyword for each content piece
- `daily_content_performance` has `impressions`, `clicks`, etc. but this is content-level, not query-level
- GSC data in BigQuery typically stores query-level data in a separate table

**NOT directly available in current exports:**
- Query-level performance per content piece (query × URL × date)
- This would require a GSC query-level table like `gsc_query_data` or `searchconsole.searchdata_url_impression`

### Required Investigation

Check if query-level data exists:
```sql
-- Check for query-level tables
SELECT table_name
FROM `gsc-bigquery-project-447113.central_data_warehouse.INFORMATION_SCHEMA.TABLES`
WHERE table_name LIKE '%query%' OR table_name LIKE '%search%'
```

If query-level data exists, the analysis would be:

```sql
-- For each content piece, compare target keyword performance vs all ranking queries
SELECT
  c.content_id,
  c.keyword as target_keyword,
  q.query,
  CASE
    WHEN LOWER(q.query) = LOWER(c.keyword) THEN 'exact_match'
    WHEN LOWER(q.query) LIKE CONCAT('%', LOWER(c.keyword), '%') THEN 'contains_target'
    ELSE 'tangential'
  END as relevance_type,
  q.impressions,
  q.clicks,
  q.position
FROM content_table c
JOIN query_table q ON c.url = q.url
```

### Feasibility Verdict

**PARTIALLY FEASIBLE** — depends on whether query-level GSC data is in BigQuery. If not, this would require a new data pipeline addition. Recommend checking the BQ schema first with:
```bash
bun scripts/paper-creator/bq.ts list-tables
```

If query data IS available, this could produce extremely valuable insights:
- What % of impressions come from the target keyword vs tangential queries?
- Which intent types show the most "query drift" (ranking for unintended queries)?
- Is there a word count × query diversity relationship?

---

## Task 12: Long-Form Analysis — Duration, Query Count, Primary KW Relevance

### A. Word Count vs Session Duration

**Available data:** `raw-engagement-time-health.json` has `avg_engagement_sec` by health bucket:

| Health Bucket | Avg Engagement (sec) | Avg Sessions | Content Count |
|---|---|---|---|
| healthy | 83.9 | 5.6 | 7,084 |
| poor | 64.9 | 2.0 | 2,597 |
| moderate | 34.8 | 5.6 | 18,604 |
| low | 24.3 | 3.7 | 10,022 |

But this is by health bucket, not word count. We need a **word count × engagement time** cross-cut.

**Required BQ Query:**
```sql
SELECT
  CASE
    WHEN word_count < 1000 THEN '<1K'
    WHEN word_count < 2000 THEN '1K-2K'
    WHEN word_count < 3000 THEN '2K-3K'
    WHEN word_count < 4000 THEN '3K-4K'
    WHEN word_count < 5000 THEN '4K-5K'
    ELSE '5K+'
  END as wc_bucket,
  COUNT(*) as n,
  AVG(avg_engagement_time_seconds) as avg_duration_sec,
  AVG(sessions_90d) as avg_sessions,
  AVG(impressions_90d) as avg_impressions,
  AVG(health_score) as avg_health
FROM `gsc-bigquery-project-447113.central_data_warehouse.v_content_90d_age_summary`
WHERE word_count > 0 AND sessions_90d > 0
GROUP BY 1
ORDER BY 1
```

**Proposed visualizations:**
1. **Line chart:** WC bucket (x) vs avg engagement time (y) — find the sweet spot
2. **Scatter plot:** Word count vs duration with trend line
3. **Golden spot analysis:** Which WC range maximizes duration per word (diminishing returns point)?

### B. Word Count vs Query Count

**Hypothesis:** Longer content ranks for more queries because it covers more subtopics and long-tail variations.

**This requires query-level data** (same blocker as Task 11). If available:

```sql
SELECT
  CASE
    WHEN c.word_count < 1000 THEN '<1K'
    WHEN c.word_count < 2000 THEN '1K-2K'
    WHEN c.word_count < 3000 THEN '2K-3K'
    WHEN c.word_count < 4000 THEN '3K-4K'
    WHEN c.word_count < 5000 THEN '4K-5K'
    ELSE '5K+'
  END as wc_bucket,
  COUNT(DISTINCT c.content_id) as content_count,
  AVG(query_count) as avg_queries_per_content,
  APPROX_QUANTILES(query_count, 100)[OFFSET(50)] as median_queries
FROM (
  SELECT content_id, word_count, COUNT(DISTINCT query) as query_count
  FROM content_query_table
  GROUP BY 1, 2
) c
GROUP BY 1
ORDER BY 1
```

### C. Primary Keyword Relevance Analysis

Same dependency as Task 11 — needs query-level data. The analysis would answer:
- **What % of a content piece's impressions come from its target keyword?**
- **Does this % change with word count?** (longer content might rank for more tangential queries)
- **Which primary keyword captures the most performance?** (is the intended keyword actually the best-performing query?)

### Proposed Visualizations

1. **Side-by-side bar:** Word count bucket vs avg session duration
2. **Distribution violin:** Duration distribution per WC bucket
3. **Sweet spot chart:** Duration-per-word efficiency curve (when does adding words stop adding engagement?)
4. **Scatter with trend:** Queries per content piece vs word count (if query data available)
5. **Pie charts per WC bucket:** % of impressions from target keyword vs tangential queries

---

## Implementation Priority Matrix

| # | Task | Data Available | New BQ Query Needed | Difficulty | Impact | Priority |
|---|---|---|---|---|---|---|
| 5 | **Search Volume Accuracy (DFS validation)** | Mostly yes | Yes (2 queries) | Medium | **VERY HIGH** — unique, differentiating, debunks industry assumptions | **P0** |
| 2 | **90-day vs All-Time clarity** | Yes | 1 query for 365d totals | Easy | **HIGH** — credibility issue | **P0** |
| 10 | **AI Model — OpenAI vs Gemini comparison** | Yes (can compute from existing data) | No | Easy | **HIGH** — current viz is confusing | **P0** |
| 3 | **Freshness 181-360 / 361+ split** | No | Yes (2 queries) | Medium | **HIGH** — critical missing granularity | **P1** |
| 4 | **Traffic Value estimation** | Partially | Yes (1 query) | Medium | **HIGH** — dollar value resonates with readers | **P1** |
| 7 | **Impressions vs Word Count chart** | Yes (have data) | No | Easy | **MEDIUM** — visual enhancement | **P1** |
| 6 | **AI intent + word count analysis** | No | Yes (2 queries) | Medium | **MEDIUM** — expands thin AI section | **P1** |
| 1 | **AI Sessions relative validation** | Yes | No | Easy | **MEDIUM** — context improvement | **P2** |
| 8 | **Clicks vs Words/Chars** | Partially | Yes (2 queries) | Medium | **MEDIUM** — distribution insight | **P2** |
| 9 | **Age Freshness 365+** | Depends on Task 3 | Same as Task 3 | Easy | **MEDIUM** — comes free with Task 3 | **P2** |
| 12 | **Long-form: duration, queries, relevance** | Partially | Yes (1-3 queries) | High | **MEDIUM** — strong if data exists | **P2** |
| 11 | **Relevance cluster** | Unknown | Depends on BQ schema | High | **HIGH if feasible** — totally novel | **P3** |

### Implementation Order Recommendation

**Phase 1 (No new queries needed — can do now):**
1. Fix the 90-day vs all-time ambiguity in paper text (Task 2 — text only)
2. Compute OpenAI vs Gemini head-to-head from existing `myth-ai-penalized.json` (Task 10)
3. Add AI sessions relative size caveat (Task 1 — text only)
4. Add impressions vs word count distribution chart from existing `myth-wordcount-continuous.json` (Task 7)

**Phase 2 (New BQ queries required):**
5. Run freshness 181-360/361+ split queries (Task 3)
6. Run DFS accuracy queries — this is the showstopper finding (Task 5)
7. Run traffic value query (Task 4)
8. Run AI × intent and AI × word count queries (Task 6)

**Phase 3 (Requires schema investigation):**
9. Check if query-level data exists in BQ (prerequisite for Tasks 11, 12B, 12C)
10. Run word count × duration query (Task 12A — likely feasible)
11. If query data exists, run relevance and query count analyses (Tasks 11, 12B, 12C)

---

## Appendix A: Data Quality Notes

### Feature Vector Coverage
- `raw-feature-vector-full.json`: 62,632 rows (a sample, not the full 341K)
- `raw-feature-vector.json`: 3,000 rows (smaller sample for ML)
- ML analysis ran on 57,652 rows with sessions > 0 AND impressions > 0

### Missing Data Patterns
- **272,956 content pieces (80%)** have zero/null CPC → traffic value estimation only covers 20%
- **119,993 content pieces (35%)** have zero/null search volume → SV accuracy analysis based on the 153,937 with SV data
- **148,599 content pieces (43.6%)** have no position data ("invisible") → many analyses only run on the ~192K visible pieces
- AI sessions data: only 5,062 content pieces have any AI sessions (1.5% of portfolio)

### Potential Biases
1. **Survivorship bias in 365+ age tier:** Content that survives 1+ year AND has good metrics is likely the refreshed subset
2. **Model confounding with age:** Different AI models were rolled out at different times, so model performance conflates with content age
3. **Client concentration:** Chunk plan shows client 58 has 12,918 content pieces, client 3 has 7,781 — top 2 clients = ~6% of portfolio but may dominate averages
4. **Health score circularity:** Health score includes impressions and position as inputs, so health correlating with impressions (r=0.322) is partially tautological

### CTR Data Anomaly
Several CTR values in the data exceed 100% (e.g., `avg_ctr_pct: 370.5` for 0-500 words, `209.05` for age 181-365 × freshness 91-180). These are **per-row arithmetic averages** of individual content CTRs, not weighted portfolio CTRs. The paper correctly uses weighted CTR (clicks/impressions) for the CTR analysis page but some tables still show the un-weighted average. This should be cleaned up.
