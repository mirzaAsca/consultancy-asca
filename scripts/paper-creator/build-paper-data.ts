#!/usr/bin/env bun
/**
 * Builds paper-data.json from the current portfolio datasets and ML results.
 * This is the single data source consumed by the PDF generator.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA = join(import.meta.dir, "data");
const V2 = join(DATA, "v2");
const OUT = join(DATA, "paper-data.json");
const BQ_GUIDE = join(import.meta.dir, "README.md");

function load(dir: string, name: string): any[] {
  try { return JSON.parse(readFileSync(join(dir, name), "utf8")).rows ?? []; }
  catch { return []; }
}
function single(dir: string, name: string): any { return load(dir, name)[0] ?? {}; }
function loadRaw(path: string): any {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch { return {}; }
}
function loadRawRequired(path: string, label: string): any {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch {
    throw new Error(`Missing required paper input: ${label} (${path})`);
  }
}
function fmt(n: number): string { return Number(n).toLocaleString("en-US"); }
function safeNum(n: unknown): number {
  const value = Number(n);
  return Number.isFinite(value) ? value : 0;
}
function round(n: number, digits = 2): number {
  const power = 10 ** digits;
  return Math.round(n * power) / power;
}
function pct(numerator: number, denominator: number, digits = 2): number {
  if (!denominator) return 0;
  return round((numerator / denominator) * 100, digits);
}
function ratio(numerator: number, denominator: number, digits = 2): number | null {
  if (!denominator) return null;
  return round(numerator / denominator, digits);
}
function sum(rows: any[], key: string): number {
  return rows.reduce((total, row) => total + safeNum(row?.[key]), 0);
}
function humanMetric(name: string): string {
  return name
    .replace(/_90d/g, "")
    .replace(/_pct/g, " pct")
    .replace(/_/g, " ")
    .replace(/\b[a-z]/g, (match) => match.toUpperCase());
}
function featureLabel(name: string): string {
  const labels: Record<string, string> = {
    impressions_90d: "Impressions",
    clicks_90d: "Clicks",
    sessions_90d: "Sessions",
    ai_sessions_90d: "AI Sessions",
    scroll_rate: "Scroll Depth",
    engagement_rate: "Engagement Rate",
    ctr: "CTR",
    avg_position: "Average Position",
    content_age_days: "Content Age",
    days_since_update: "Days Since Update",
    word_count: "Word Count",
    search_volume: "Search Volume",
    cpc: "CPC",
    competition: "Competition",
    days_with_impressions: "Days Visible",
    health_score: "Health Score",
  };
  return labels[name] ?? humanMetric(name);
}
function changePct(c: number, p: number): string {
  if (p === 0) return c > 0 ? "+100%" : "0%";
  const ch = ((c - p) / p) * 100;
  return `${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%`;
}
function avg(rows: any[], key: string, digits = 2): number {
  if (!rows.length) return 0;
  return round(sum(rows, key) / rows.length, digits);
}
function weightedAvg(rows: any[], valueKey: string, weightKey: string, digits = 2): number {
  let weightedTotal = 0;
  let totalWeight = 0;
  for (const row of rows) {
    const weight = safeNum(row?.[weightKey]);
    const value = safeNum(row?.[valueKey]);
    weightedTotal += value * weight;
    totalWeight += weight;
  }
  if (!totalWeight) return 0;
  return round(weightedTotal / totalWeight, digits);
}
function pearson(xs: number[], ys: number[], digits = 4): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const meanX = xs.reduce((total, value) => total + value, 0) / n;
  const meanY = ys.reduce((total, value) => total + value, 0) / n;
  let numerator = 0;
  let xVariance = 0;
  let yVariance = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    xVariance += dx * dx;
    yVariance += dy * dy;
  }
  if (!xVariance || !yVariance) return 0;
  return round(numerator / Math.sqrt(xVariance * yVariance), digits);
}
function bucketWordCount(words: number): string {
  if (words < 1000) return "<1K";
  if (words < 1500) return "1K-1.5K";
  if (words < 2000) return "1.5K-2K";
  if (words < 2500) return "2K-2.5K";
  if (words < 3500) return "2.5K-3.5K";
  if (words < 5000) return "3.5K-5K";
  return "5K+";
}
function bucketFreshnessExpanded(days: number): string {
  if (days <= 30) return "0-30";
  if (days <= 90) return "31-90";
  if (days <= 180) return "91-180";
  if (days <= 360) return "181-360";
  return "361+";
}
function bucketSearchVolume(volume: number): string | null {
  if (volume < 1) return null;
  if (volume < 100) return "1-100";
  if (volume < 1000) return "100-1K";
  if (volume < 10000) return "1K-10K";
  return "10K+";
}
function modelProviderFamily(model: string): string {
  const normalized = String(model ?? "").toLowerCase();
  if (normalized.startsWith("gpt-")) return "OpenAI";
  if (normalized.startsWith("gemini-")) return "Gemini";
  if (normalized.includes("claude")) return "Claude";
  return "Other";
}

const AGE_TIER_ORDER = ["0-14", "15-30", "31-90", "91-180", "181-365", "365+"];
const FRESHNESS_BUCKET_ORDER = ["0-30", "31-90", "91-180", "181-360", "361+"];
const WORD_BUCKET_ORDER = ["<1K", "1K-1.5K", "1.5K-2K", "2K-2.5K", "2.5K-3.5K", "3.5K-5K", "5K+"];
const SEARCH_VOLUME_ORDER = ["1-100", "100-1K", "1K-10K", "10K+"];
const INTENT_ORDER = ["informational", "commercial", "transactional", "navigational", "unknown"];

function sortByOrder<T extends Record<string, any>>(rows: T[], key: string, order: string[]): T[] {
  const rank = new Map(order.map((value, index) => [value, index]));
  return [...rows].sort((a, b) => (rank.get(String(a[key])) ?? 999) - (rank.get(String(b[key])) ?? 999));
}
function sampleEvenly<T>(rows: T[], maxPoints = 1200): T[] {
  if (rows.length <= maxPoints) return rows;
  const step = Math.max(1, Math.ceil(rows.length / maxPoints));
  return rows.filter((_, index) => index % step === 0).slice(0, maxPoints);
}

// ── Load v1 data ─────────────────────────────────────────────────────────────

const portfolio = single(DATA, "portfolio-overview.json");
const clients = load(DATA, "client-scorecard.json");
const dashTrends = load(DATA, "dashboard-trends.json");
const aiMonthly = load(DATA, "ai-monthly.json");
const aiDaily = load(DATA, "ai-daily-breakdown.json");
const healthDist = load(DATA, "health-distribution.json");
const ageTiers = load(DATA, "age-tiers.json");
const freshnessTiers = load(DATA, "freshness-tiers.json");
const positionDist = load(DATA, "position-distribution.json");
const trendDist = load(DATA, "trend-distribution.json");
const cannibalization = single(DATA, "cannibalization.json");
const optActions = load(DATA, "optimization-actions.json");
const optFlags = load(DATA, "optimization-flags.json");
const indexingState = load(DATA, "indexing-state.json");
const revenue = single(DATA, "revenue.json");
const fullHistoryCoverage = single(DATA, "full-history-coverage.json");
const fullHistoryClientScorecard = load(DATA, "full-history-client-scorecard.json");
const fullHistoryMonthly = load(DATA, "full-history-monthly-trends.json");

// v1 correlations
const corrGrowDeclProfile = load(DATA, "corr-growing-vs-declining-profile.json");
const corrFreshnessTrend = load(DATA, "corr-freshness-trend.json");
const corrEngagementMatrix = load(DATA, "corr-engagement-matrix.json");
const corrAiVsTraditional = load(DATA, "corr-ai-vs-traditional.json");
const corrAgeFreshnessMatrix = load(DATA, "corr-age-freshness-matrix.json");
const corrWordcountPosition = load(DATA, "corr-wordcount-position.json");
const corrTypeIntentHealth = load(DATA, "corr-type-intent-health.json");
const corrDeclineRisk = load(DATA, "corr-decline-risk-clusters.json");
const corrCompetition = load(DATA, "corr-competition-performance.json");
const hypSearchVolume = load(DATA, "hyp-search-volume-success.json");
const hypModel = load(DATA, "hyp-model-performance.json");
const hypAgeGolden = load(DATA, "hyp-age-golden-zone.json");
const hypBacklinks = load(DATA, "hyp-backlinks-performance.json");
const hypFlagStacking = load(DATA, "hyp-flag-stacking.json");
const hypVisibility = load(DATA, "hyp-visibility-consistency.json");
const hypIntentComp = load(DATA, "hyp-intent-competition.json");
const hypCtrCurve = load(DATA, "hyp-ctr-position-curve.json");

const keywordDriftAnalysis = loadRawRequired(join(DATA, "keyword-drift-analysis.json"), "keyword-drift-analysis.json");

// ── Load extended data ───────────────────────────────────────────────────────

const rawTrafficMix = load(V2, "raw-traffic-mix.json");
const rawRevenueAttr = load(V2, "raw-revenue-by-attributes.json");
const rawAiConversion = load(V2, "raw-ai-conversion.json");
const rawEngagementTime = load(V2, "raw-engagement-time-health.json");
const rawCannibDetail = load(V2, "raw-cannibalization-detail.json");
const rawDayOfWeek = load(V2, "raw-dayofweek.json");
const rawScrollPosition = load(V2, "raw-scroll-vs-position.json");
const rawTrafficDiv = load(V2, "raw-traffic-diversification.json");
const rawPercentiles = load(V2, "raw-percentiles.json");
const rawCorrelations = single(V2, "raw-correlations.json");
const rawTopBottom = load(V2, "raw-top-bottom-decile.json");
const monthlyTrends = load(V2, "time-monthly-trends.json");
const pubTimeline = load(V2, "time-publication-timeline.json");
const freshnessDecay = load(V2, "time-freshness-decay.json");
const mythWordcount = load(V2, "myth-wordcount-continuous.json");
const mythAiPenalized = load(V2, "myth-ai-penalized.json");
const mythPosition1 = load(V2, "myth-position1-value.json");
const mythFreshnessCtrl = load(V2, "myth-freshness-controlled.json");
const mythSvImpressions = load(V2, "myth-sv-vs-impressions.json");
const mythBacklinksComp = load(V2, "myth-backlinks-competition.json");
const mythPublishVelocity = load(V2, "myth-publish-velocity.json");
const mythPublishVelocityEnhanced = loadRaw(join(V2, "myth-publish-velocity-enhanced.json"));
const mythCpcPerformance = loadRaw(join(V2, "myth-cpc-performance.json"));
const mythEngagementRankings = loadRaw(join(V2, "myth-engagement-rankings.json"));
const mythIntentPerformance = loadRaw(join(V2, "myth-intent-performance.json"));
const mythVisibilityGrowth = loadRaw(join(V2, "myth-visibility-growth.json"));
const featureVectorFull = load(V2, "raw-feature-vector-full.json");
const featureVectorSample = load(V2, "raw-feature-vector.json");
const fullHistoryDerived = loadRawRequired(join(DATA, "full-history-derived.json"), "full-history-derived.json");
const queryRelevanceSummary = loadRawRequired(join(DATA, "query-relevance-summary.json"), "query-relevance-summary.json");
const paperInputManifest = loadRawRequired(join(DATA, "paper-input-manifest.json"), "paper-input-manifest.json");
const pageHistoryManifest = loadRawRequired(join(V2, "raw-feature-vector-full-history.manifest.json"), "raw-feature-vector-full-history.manifest.json");
const queryHistoryManifest = loadRawRequired(join(V2, "raw-query-history-full.manifest.json"), "raw-query-history-full.manifest.json");

// ML results
const ml = loadRaw(join(V2, "ml-results.json"));
const optimizationResults = loadRaw(join(V2, "optimization-results.json"));
const discoveryV1 = loadRaw(join(V2, "discovery-results.json"));
const discoveryV2 = loadRaw(join(V2, "discovery-results-v2.json"));
const discoveryStabilityRaw = loadRaw(join(V2, "discovery-stability-results.json"));
const discoveryFinalRaw = loadRaw(join(V2, "discovery-final-results.json"));
const bqGuide = (() => {
  try {
    return readFileSync(BQ_GUIDE, "utf8");
  } catch {
    return "";
  }
})();

// ── Derived metrics ──────────────────────────────────────────────────────────

const growing = corrGrowDeclProfile.find((r: any) => r.trend_direction === "up");
const declining = corrGrowDeclProfile.find((r: any) => r.trend_direction === "down");
const latestAI = aiMonthly[aiMonthly.length - 1];
const top3Position = positionDist.find((r: any) => r.position_tier === "top_3");
const page35Position = positionDist.find((r: any) => r.position_tier === "page_3_5");
const strikingPosition = positionDist.find((r: any) => r.position_tier === "striking");
const noAIRevenue = rawAiConversion.find((r: any) => r.ai_bucket === "no_ai_traffic");
const hasAIRevenue = rawAiConversion.find((r: any) => r.ai_bucket === "has_ai_traffic");
const transactionalLow = hypIntentComp.find((r: any) => r.main_intent === "transactional" && r.competition_level === "LOW");
const informationalLow = hypIntentComp.find((r: any) => r.main_intent === "informational" && r.competition_level === "LOW");

const agg30d = dashTrends.reduce(
  (a: any, r: any) => {
    a.imp += r.gsc_impressions_30d ?? 0; a.impP += r.gsc_impressions_prev_30d ?? 0;
    a.cl += r.gsc_clicks_30d ?? 0; a.clP += r.gsc_clicks_prev_30d ?? 0;
    a.ai += r.ai_sessions_30d ?? 0; a.aiP += r.ai_sessions_prev_30d ?? 0;
    return a;
  },
  { imp: 0, impP: 0, cl: 0, clP: 0, ai: 0, aiP: 0 }
);

const old365Fresh = corrAgeFreshnessMatrix.find((r: any) => r.age_tier === "365+" && r.freshness_tier === "0-30");
const old365Stale =
  corrAgeFreshnessMatrix.find((r: any) => r.age_tier === "365+" && r.freshness_tier === "181-360") ??
  corrAgeFreshnessMatrix.find((r: any) => r.age_tier === "365+" && r.freshness_tier === "181+");
const highEngHighScroll = corrEngagementMatrix.find((r: any) => r.scroll_bucket === "high_scroll" && r.engage_bucket === "high_engage");
const lowEngLowScroll = corrEngagementMatrix.find((r: any) => r.scroll_bucket === "low_scroll" && r.engage_bucket === "low_engage");
const highAI = corrAiVsTraditional.find((r: any) => r.ai_bucket === "high_ai");
const noAI = corrAiVsTraditional.find((r: any) => r.ai_bucket === "no_ai");

const healthFormula =
  bqGuide.includes("impressions (30pts) + position (30pts) + CTR (20pts) + scroll depth (20pts)")
    ? "Impressions (30 pts) + position (30 pts) + CTR (20 pts) + scroll depth (20 pts)."
    : "Composite FlyRank score built from impressions, position, CTR, and scroll depth.";

const weightedCtrByPositionTier = positionDist
  .filter((row: any) => safeNum(row.impressions_90d) > 0 && safeNum(row.clicks_90d) >= 0)
  .map((row: any) => ({
    position_tier: row.position_tier,
    content_count: safeNum(row.content_count),
    impressions_90d: safeNum(row.impressions_90d),
    clicks_90d: safeNum(row.clicks_90d),
    ctr_pct: pct(safeNum(row.clicks_90d), safeNum(row.impressions_90d), 3),
    avg_health: safeNum(row.avg_health),
  }));

const ctrCurveValidated = weightedCtrByPositionTier.map((row: any) => ({
  ...row,
  label:
    row.position_tier === "top_3"
      ? "Top 3"
      : row.position_tier === "page_1"
        ? "Page 1 (4-10)"
        : row.position_tier === "page_3_5"
          ? "Page 3-5"
          : humanMetric(row.position_tier),
}));

const aiSharePct = pct(safeNum(portfolio.total_ai_sessions), safeNum(portfolio.total_sessions), 2);
const aiImpressionLift = ratio(safeNum(highAI?.avg_imp), safeNum(noAI?.avg_imp), 1);
const aiRevenueCoveragePct = pct(safeNum(revenue.active_clients_90d), safeNum(portfolio.client_count), 1);
const flagsCoverage = optFlags.map((row: any) => ({
  ...row,
  ctr_pct: pct(safeNum(row.clicks_30d), safeNum(row.impressions_30d), 3),
}));
const featureRows = featureVectorFull.length ? featureVectorFull : featureVectorSample;
const activeSampleSessions = sum(featureRows, "sessions_90d");
const activeSampleAISessions = sum(featureRows, "ai_sessions_90d");
const activeSampleAiPages = featureRows.filter((row: any) => safeNum(row.ai_sessions_90d) > 0).length;
const aiProviderTotals30d = aiDaily.reduce((totals: Record<string, number>, row: any) => {
  for (const key of ["chatgpt", "gemini", "perplexity", "copilot", "claude", "meta"]) {
    totals[key] = (totals[key] ?? 0) + safeNum(row?.[key]);
  }
  totals.total_ai = (totals.total_ai ?? 0) + safeNum(row?.total_ai);
  return totals;
}, {} as Record<string, number>);
const aiProviders30d = [
  { label: "OpenAI", key: "chatgpt", sessions: aiProviderTotals30d.chatgpt ?? 0 },
  { label: "Gemini", key: "gemini", sessions: aiProviderTotals30d.gemini ?? 0 },
  { label: "Perplexity", key: "perplexity", sessions: aiProviderTotals30d.perplexity ?? 0 },
  { label: "Copilot", key: "copilot", sessions: aiProviderTotals30d.copilot ?? 0 },
  { label: "Claude", key: "claude", sessions: aiProviderTotals30d.claude ?? 0 },
].filter((row) => row.sessions > 0);

const aiByIntentRecent = sortByOrder(
  INTENT_ORDER.map((intent) => {
    const rows = featureRows.filter((row: any) => (row.main_intent ?? "unknown") === intent);
    const aiRows = rows.filter((row: any) => safeNum(row.ai_sessions_90d) > 0);
    return {
      main_intent: intent,
      pages: rows.length,
      ai_pages: aiRows.length,
      ai_page_pct: pct(aiRows.length, rows.length, 2),
      total_ai_sessions: sum(rows, "ai_sessions_90d"),
      total_sessions: sum(rows, "sessions_90d"),
      ai_session_share_pct: pct(sum(rows, "ai_sessions_90d"), sum(rows, "sessions_90d"), 2),
      avg_ai_sessions: avg(rows, "ai_sessions_90d", 2),
    };
  }).filter((row) => row.pages > 0),
  "main_intent",
  INTENT_ORDER
);
const aiByIntent = fullHistoryDerived.aiFullHistoryByIntent ?? aiByIntentRecent;

const aiByWordCountRecent = sortByOrder(
  WORD_BUCKET_ORDER.map((bucket) => {
    const rows = featureRows.filter((row: any) => bucketWordCount(safeNum(row.word_count)) === bucket);
    const aiRows = rows.filter((row: any) => safeNum(row.ai_sessions_90d) > 0);
    return {
      wc_bucket: bucket,
      pages: rows.length,
      ai_pages: aiRows.length,
      ai_page_pct: pct(aiRows.length, rows.length, 2),
      avg_ai_sessions: avg(rows, "ai_sessions_90d", 2),
      avg_impressions: avg(rows, "impressions_90d", 1),
      avg_clicks: avg(rows, "clicks_90d", 2),
      avg_sessions: avg(rows, "sessions_90d", 2),
      avg_health: avg(rows, "health_score", 1),
    };
  }).filter((row) => row.pages > 0),
  "wc_bucket",
  WORD_BUCKET_ORDER
);
const aiByWordCount = fullHistoryDerived.aiFullHistoryByWordBucket ?? aiByWordCountRecent;
const fullHistoryAiPages = aiByIntent.reduce((total: number, row: any) => total + safeNum(row.ai_pages), 0);
const fullHistoryAiInventoryPages = aiByIntent.reduce((total: number, row: any) => total + safeNum(row.pages), 0);
const fullHistoryAiPagePct = pct(fullHistoryAiPages, fullHistoryAiInventoryPages, 2);

const queryWordBucketMap = new Map(
  (queryRelevanceSummary.wordBuckets ?? []).map((row: any) => [String(row.wc_bucket), row])
);
const wordCountPerformance = sortByOrder(
  (fullHistoryDerived.wordCountPerformanceFullHistory ?? []).map((row: any) => ({
    ...row,
    ...(queryWordBucketMap.get(String(row.wc_bucket)) ?? {}),
    recent_ai_page_pct:
      aiByWordCount.find((recent: any) => recent.wc_bucket === row.wc_bucket)?.ai_page_pct ?? 0,
  })),
  "wc_bucket",
  WORD_BUCKET_ORDER
);

const freshnessExpanded = sortByOrder(
  FRESHNESS_BUCKET_ORDER.map((bucket) => {
    const rows = featureRows.filter((row: any) => bucketFreshnessExpanded(safeNum(row.days_since_update)) === bucket);
    const growingN = rows.filter((row: any) => row.trend_direction === "up").length;
    const decliningN = rows.filter((row: any) => row.trend_direction === "down").length;
    return {
      freshness_bucket: bucket,
      pages: rows.length,
      avg_health: avg(rows, "health_score", 2),
      avg_impressions: avg(rows, "impressions_90d", 1),
      growing: growingN,
      declining: decliningN,
      growth_decline_ratio: ratio(growingN, decliningN, 2),
    };
  }).filter((row) => row.pages > 0),
  "freshness_bucket",
  FRESHNESS_BUCKET_ORDER
);

const ageFreshnessExpandedMap = new Map<string, any>();
for (const row of featureRows) {
  const ageTier = String(row.age_tier ?? "");
  const freshnessBucket = bucketFreshnessExpanded(safeNum(row.days_since_update));
  if (!ageTier || !AGE_TIER_ORDER.includes(ageTier)) continue;
  const key = `${ageTier}:${freshnessBucket}`;
  const current = ageFreshnessExpandedMap.get(key) ?? {
    age_tier: ageTier,
    freshness_tier: freshnessBucket,
    n: 0,
    health_total: 0,
    impressions_total: 0,
  };
  current.n += 1;
  current.health_total += safeNum(row.health_score);
  current.impressions_total += safeNum(row.impressions_90d);
  ageFreshnessExpandedMap.set(key, current);
}
const ageFreshnessExpanded = sortByOrder(
  Array.from(ageFreshnessExpandedMap.values()).map((row) => ({
    age_tier: row.age_tier,
    freshness_tier: row.freshness_tier,
    n: row.n,
    avg_health: round(row.health_total / row.n, 2),
    avg_imp: round(row.impressions_total / row.n, 1),
  })),
  "age_tier",
  AGE_TIER_ORDER
).sort((a: any, b: any) => {
  const ageDiff = AGE_TIER_ORDER.indexOf(a.age_tier) - AGE_TIER_ORDER.indexOf(b.age_tier);
  if (ageDiff !== 0) return ageDiff;
  return FRESHNESS_BUCKET_ORDER.indexOf(a.freshness_tier) - FRESHNESS_BUCKET_ORDER.indexOf(b.freshness_tier);
});

const searchVolumeValidation = fullHistoryDerived.searchVolumeValidationFullHistory ?? {};
const searchVolumeRecentRows = featureRows.filter((row: any) => safeNum(row.search_volume) > 0);
const searchVolumeRecent90 = {
  sample_pages: searchVolumeRecentRows.length,
  pages_above_volume_90d: searchVolumeRecentRows.filter((row: any) => safeNum(row.impressions_90d) > safeNum(row.search_volume)).length,
  pages_above_volume_monthlyized: searchVolumeRecentRows.filter((row: any) => (safeNum(row.impressions_90d) / 3) > safeNum(row.search_volume)).length,
  pct_above_volume_90d: pct(
    searchVolumeRecentRows.filter((row: any) => safeNum(row.impressions_90d) > safeNum(row.search_volume)).length,
    searchVolumeRecentRows.length,
    2
  ),
  pct_above_volume_monthlyized: pct(
    searchVolumeRecentRows.filter((row: any) => (safeNum(row.impressions_90d) / 3) > safeNum(row.search_volume)).length,
    searchVolumeRecentRows.length,
    2
  ),
  raw_correlation_90d: pearson(
    searchVolumeRecentRows.map((row: any) => safeNum(row.search_volume)),
    searchVolumeRecentRows.map((row: any) => safeNum(row.impressions_90d))
  ),
  log_correlation_90d: pearson(
    searchVolumeRecentRows.map((row: any) => Math.log10(1 + safeNum(row.search_volume))),
    searchVolumeRecentRows.map((row: any) => Math.log10(1 + safeNum(row.impressions_90d)))
  ),
  buckets: sortByOrder(
    SEARCH_VOLUME_ORDER.map((bucket) => {
      const rows = searchVolumeRecentRows.filter((row: any) => bucketSearchVolume(safeNum(row.search_volume)) === bucket);
      const avgImp90 = avg(rows, "impressions_90d", 1);
      const avgSv = avg(rows, "search_volume", 1);
      return {
        sv_bucket: bucket,
        n: rows.length,
        avg_sv: avgSv,
        avg_imp_90d: avgImp90,
        avg_imp_monthly_est: round(avgImp90 / 3, 1),
        avg_health: avg(rows, "health_score", 1),
        pct_above_volume_90d: pct(
          rows.filter((row: any) => safeNum(row.impressions_90d) > safeNum(row.search_volume)).length,
          rows.length,
          2
        ),
        pct_above_volume_monthlyized: pct(
          rows.filter((row: any) => (safeNum(row.impressions_90d) / 3) > safeNum(row.search_volume)).length,
          rows.length,
          2
        ),
        impression_to_sv_ratio_90d: ratio(avgImp90, avgSv, 2),
        impression_to_sv_ratio_monthlyized: ratio(round(avgImp90 / 3, 1), avgSv, 2),
      };
    }).filter((row) => row.n > 0),
    "sv_bucket",
    SEARCH_VOLUME_ORDER
  ),
};
const clickEquivalentValue = safeNum(fullHistoryDerived.trafficValueFullHistory?.totalClickEquivalentValue);
const impressionTimesCpc = safeNum(fullHistoryDerived.trafficValueFullHistory?.totalImpressionEquivalentValue);
const trafficValueByIntent = fullHistoryDerived.trafficValueFullHistory?.byIntent ?? [];
const trafficValueCapturedSharePct = pct(clickEquivalentValue, impressionTimesCpc, 2);
const longFormAnalysis = fullHistoryDerived.longFormAnalysisFullHistory ?? {};
const relevanceBuckets = fullHistoryDerived.relevanceBucketsFullHistory ?? [];
const impressionsVsWordsScatter = fullHistoryDerived.impressionsVsWordsScatterFullHistory ?? sampleEvenly(
  featureRows.filter((row: any) => safeNum(row.word_count) > 0 && safeNum(row.impressions_90d) > 0),
  900
).map((row: any) => ({
  x: round(Math.log10(1 + safeNum(row.word_count)), 4),
  y: round(Math.log10(1 + safeNum(row.impressions_90d)), 4),
  traffic_band: row.traffic_band ?? row.health_label ?? "moderate",
}));
const clicksVsCharsScatter = fullHistoryDerived.clicksVsCharsScatterFullHistory ?? sampleEvenly(
  featureRows.filter((row: any) => safeNum(row.char_count) > 0 && safeNum(row.clicks_90d) > 0),
  900
).map((row: any) => ({
  x: round(Math.log10(1 + safeNum(row.char_count)), 4),
  y: round(Math.log10(1 + safeNum(row.clicks_90d)), 4),
  traffic_band: row.traffic_band ?? row.health_label ?? "moderate",
}));

const aiModelProviderByAge = sortByOrder(
  Array.from(
    mythAiPenalized.reduce((map: Map<string, any>, row: any) => {
      const providerFamily = modelProviderFamily(row.model_used);
      const ageTier = String(row.age_tier ?? "");
      if (!["OpenAI", "Gemini"].includes(providerFamily) || !AGE_TIER_ORDER.includes(ageTier)) return map;
      const key = `${providerFamily}:${ageTier}`;
      const current = map.get(key) ?? {
        provider_family: providerFamily,
        age_tier: ageTier,
        n: 0,
        health_total: 0,
        imp_total: 0,
        pos_total: 0,
      };
      current.n += safeNum(row.n);
      current.health_total += safeNum(row.avg_health) * safeNum(row.n);
      current.imp_total += safeNum(row.avg_imp) * safeNum(row.n);
      current.pos_total += safeNum(row.avg_pos) * safeNum(row.n);
      map.set(key, current);
      return map;
    }, new Map<string, any>())
  ).map(([, row]) => ({
    provider_family: row.provider_family,
    age_tier: row.age_tier,
    n: row.n,
    avg_health: round(row.health_total / row.n, 2),
    avg_imp: round(row.imp_total / row.n, 1),
    avg_pos: round(row.pos_total / row.n, 1),
  })),
  "age_tier",
  AGE_TIER_ORDER
).sort((a: any, b: any) => {
  const ageDiff = AGE_TIER_ORDER.indexOf(a.age_tier) - AGE_TIER_ORDER.indexOf(b.age_tier);
  if (ageDiff !== 0) return ageDiff;
  return a.provider_family.localeCompare(b.provider_family);
});

const aiModelProviderSummary = ["OpenAI", "Gemini"].map((providerFamily) => {
  const rows = aiModelProviderByAge.filter((row: any) => row.provider_family === providerFamily);
  return {
    provider_family: providerFamily,
    n: sum(rows, "n"),
    avg_health: weightedAvg(rows, "avg_health", "n", 2),
    avg_imp: weightedAvg(rows, "avg_imp", "n", 1),
    avg_pos: weightedAvg(rows, "avg_pos", "n", 1),
  };
});

const lifecycleLongerPct =
  safeNum(declining?.avg_word_count) > 0
    ? round(((safeNum(growing?.avg_word_count) - safeNum(declining?.avg_word_count)) / safeNum(declining?.avg_word_count)) * 100, 1)
    : 0;
const lifecycleYoungerPct =
  safeNum(declining?.avg_age_days) > 0
    ? round(((safeNum(declining?.avg_age_days) - safeNum(growing?.avg_age_days)) / safeNum(declining?.avg_age_days)) * 100, 1)
    : 0;
const chartValidationErrors: string[] = [];

if (ctrCurveValidated.some((row: any) => row.ctr_pct > 100)) {
  chartValidationErrors.push("Validated position-tier CTR still exceeds 100%.");
}
if (!safeNum(portfolio.total_content) || !safeNum(portfolio.client_count)) {
  chartValidationErrors.push("Portfolio overview is missing total content or client count.");
}
if (String(fullHistoryCoverage.oldest_date ?? "") !== String(pageHistoryManifest.history_start ?? "")) {
  chartValidationErrors.push("Full-history coverage start does not match page-history manifest.");
}
if (String(fullHistoryCoverage.newest_date ?? "") !== String(pageHistoryManifest.history_end ?? "")) {
  chartValidationErrors.push("Full-history coverage end does not match page-history manifest.");
}
if (!queryHistoryManifest.history_start || !queryHistoryManifest.history_end) {
  chartValidationErrors.push("Query-history manifest is missing coverage dates.");
}
if (safeNum(fullHistoryCoverage.total_impressions) < safeNum(portfolio.total_impressions)) {
  chartValidationErrors.push("Full-history impressions should not be lower than recent 90-day impressions.");
}

const sanitizedClusters = (ml.clusters ?? []).map((cluster: any, index: number) => ({
  ...cluster,
  public_name: `Cluster ${index + 1}`,
  original_name: cluster.name,
  public_description: `Exploratory segment with ${cluster.pct}% of the sampled ML set (n=${cluster.n}).`,
}));

const sanitizedFeatureImportance = (ml.feature_importance ?? []).map((item: any) => ({
  ...item,
  public_label: featureLabel(item.feature),
}));

const sanitizedGrowthPredictors = {
  ...(ml.growth_predictors ?? {}),
  coefficients: (ml.growth_predictors?.coefficients ?? []).map((item: any) => ({
    ...item,
    public_label: featureLabel(item.feature),
  })),
};
const sanitizedOptimizationSignals = (signals: any[] = []) =>
  signals.map((signal: any) => ({
    ...signal,
    feature_label: signal.feature_label ?? featureLabel(signal.feature ?? ""),
    target_label: signal.target_label ?? featureLabel(signal.target ?? ""),
  }));
const normalizedInputTaxonomy = {
  creationTimeControllableInputs: optimizationResults.input_taxonomy?.creation_time_controllable_inputs ?? [],
  refreshTimeControllableInputs: optimizationResults.input_taxonomy?.refresh_time_controllable_inputs ?? [],
  contextConfounders: optimizationResults.input_taxonomy?.context_confounders ?? [],
  excludedOrLeakyInputs: optimizationResults.input_taxonomy?.excluded_or_leaky_inputs ?? [],
};
const normalizedOutputTaxonomy = {
  primaryOutputsToOptimize: optimizationResults.output_taxonomy?.primary_outputs_to_optimize ?? [],
  secondaryDiagnostics: optimizationResults.output_taxonomy?.secondary_diagnostics ?? [],
};
const normalizedContentArchetypes = (optimizationResults.content_archetypes ?? []).map((row: any) => ({
  clusterId: row.cluster_id,
  n: row.n,
  pct: row.pct,
  avgCoreQualityScore: row.avg_core_quality_score,
  avgRelevanceAdjustedQualityScore: row.avg_relevance_adjusted_quality_score,
  avgOpportunityScore: row.avg_opportunity_score,
  avgScoreConfidence: row.avg_score_confidence,
  avgWordCount: row.avg_word_count,
  avgDaysSinceUpdate: row.avg_days_since_update,
  modeContentType: row.mode_content_type,
  modeMainIntent: row.mode_main_intent,
  modeModelUsed: row.mode_model_used,
}));
const fallbackSignals = (
  preferred: any[] = [],
  fallback: any[] = [],
  scenarioGroup: string
) => preferred.length
  ? preferred
  : fallback.filter((signal: any) => signal.scenario_group === scenarioGroup).slice(0, 8);
const normalizedScoringComparison = {
  legacyMlRowsAnalyzed: optimizationResults.legacy_vs_new_comparison?.legacy_ml_rows_analyzed ?? 0,
  correlationHealthToCoreQuality: optimizationResults.legacy_vs_new_comparison?.correlation_health_to_core_quality ?? 0,
  correlationHealthToRelevanceAdjusted: optimizationResults.legacy_vs_new_comparison?.correlation_health_to_relevance_adjusted ?? 0,
  correlationHealthToOpportunity: optimizationResults.legacy_vs_new_comparison?.correlation_health_to_opportunity ?? 0,
  topDecileOverlapPct: optimizationResults.legacy_vs_new_comparison?.top_decile_overlap_pct ?? 0,
  bottomDecileOverlapPct: optimizationResults.legacy_vs_new_comparison?.bottom_decile_overlap_pct ?? 0,
  disagreementCohortSize: optimizationResults.legacy_vs_new_comparison?.disagreement_cohort_size ?? 0,
  queryCoveredDisagreementPct: optimizationResults.legacy_vs_new_comparison?.query_covered_disagreement_pct ?? 0,
  avgOffTargetShareInDisagreement: optimizationResults.legacy_vs_new_comparison?.avg_off_target_share_in_disagreement ?? 0,
};
const legacyScoringSummary = {
  rowsAnalyzed: safeNum(ml.meta?.rows_analyzed),
  legacyFeatureCount: (ml.meta?.features ?? []).length,
  rfR2Test: safeNum(ml.rf_r2_test),
  growthAccuracyTest: safeNum(ml.growth_predictors?.accuracy_test),
  topLegacyPredictors: sanitizedFeatureImportance.slice(0, 5),
};
const optimizationFramework = {
  meta: optimizationResults.meta ?? {},
  coverage: optimizationResults.coverage ?? {},
  inputTaxonomy: normalizedInputTaxonomy,
  outputTaxonomy: normalizedOutputTaxonomy,
  opportunityDefinition: optimizationResults.opportunity_definition ?? {},
  creationModels: optimizationResults.creation_models ?? {},
  refreshModels: optimizationResults.refresh_models ?? {},
  growthModels: optimizationResults.growth_models ?? {},
  significantStableInputs: sanitizedOptimizationSignals(optimizationResults.significant_stable_inputs ?? []),
  directionalOnlyInputs: sanitizedOptimizationSignals(optimizationResults.directional_only_inputs ?? []),
  excludedOrLeakyInputs: optimizationResults.excluded_or_leaky_inputs ?? [],
  contentArchetypes: normalizedContentArchetypes,
  appendixViews: {
    topCreationSignals: sanitizedOptimizationSignals(fallbackSignals(
      optimizationResults.appendix_views?.top_creation_signals ?? [],
      optimizationResults.directional_only_inputs ?? [],
      "creation"
    )),
    topRefreshSignals: sanitizedOptimizationSignals(fallbackSignals(
      optimizationResults.appendix_views?.top_refresh_signals ?? [],
      optimizationResults.directional_only_inputs ?? [],
      "refresh"
    )),
    topGrowthSignals: sanitizedOptimizationSignals(fallbackSignals(
      optimizationResults.appendix_views?.top_growth_signals ?? [],
      optimizationResults.directional_only_inputs ?? [],
      "growth"
    )),
  },
};
const newScoring = optimizationResults.new_scoring ?? {};
const scoringComparison = normalizedScoringComparison;

const metricAudit = {
  healthScore: {
    source_file: "scripts/paper-creator/README.md",
    upstream_origin: "v_content_30d_age_summary / v_content_90d_age_summary",
    sample_size: safeNum(portfolio.total_content),
    metric_type: "synthetic",
    formula: healthFormula,
    validation_status: "validated_from_repo_docs",
    public_safe: true,
  },
  optimizationFlags: {
    source_file: "scripts/paper-creator/README.md",
    upstream_origin: "view_optimization_flags / v_content_90d_summary",
    sample_size: sum(optFlags, "content_count"),
    metric_type: "synthetic",
    formula: "Internal optimization statuses and action flags triggered from FlyRank scoring and workflow logic.",
    validation_status: "validated_from_repo_docs",
    public_safe: true,
  },
  ctrCurve: {
    source_file: "scripts/paper-creator/data/position-distribution.json",
    upstream_origin: "position-distribution aggregate export",
    sample_size: sum(positionDist, "content_count"),
    metric_type: "derived",
    formula: "Weighted CTR = clicks_90d / impressions_90d * 100 by position tier.",
    validation_status: "validated_recomputed",
    public_safe: true,
  },
  revenueAttribution: {
    source_file: "scripts/paper-creator/data/revenue.json + scripts/paper-creator/data/v2/raw-ai-conversion.json",
    upstream_origin: "daily_content_revenue-derived local exports",
    sample_size: safeNum(revenue.active_clients_90d),
    metric_type: "derived",
    formula: "Content-level attributed landing sessions, purchases, and revenue over 90 days.",
    validation_status: "validated_with_coverage_limits",
    public_safe: false,
  },
};

const sectionPolicy = {
  includeRevenueCards: false,
  includeRevenueRiskBlock: false,
  includeCtrPage: true,
  includeFlagsPage: true,
  includeRisksPage: true,
};

const windowLabels = {
  recent30: "Last 30 complete days",
  recent90: "Last 90 complete days",
  fullHistoryPage: `Full available warehouse history (${fullHistoryCoverage.oldest_date} to ${fullHistoryCoverage.newest_date})`,
  fullHistoryQuery: `Full available query history (${queryHistoryManifest.history_start} to ${queryHistoryManifest.history_end})`,
};

const provenance = {
  lifecycle: {
    metric_window: windowLabels.recent90,
    source_artifact: "data/corr-growing-vs-declining-profile.json",
    sample_size: safeNum(growing?.n) + safeNum(declining?.n),
    exclusions: "Active-content recent snapshot only.",
  },
  freshness: {
    metric_window: windowLabels.recent90,
    source_artifact: "data/v2/raw-feature-vector-full.json",
    sample_size: featureRows.length,
    exclusions: "Requires pages with impressions_90d > 0 and sessions_90d > 0.",
  },
  seasonal: {
    metric_window: windowLabels.fullHistoryPage,
    source_artifact: "data/full-history-monthly-trends.json",
    sample_size: safeNum(fullHistoryCoverage.active_days),
    exclusions: "Monthly aggregation of full available warehouse history.",
  },
  trafficValue: {
    metric_window: windowLabels.fullHistoryPage,
    source_artifact: "data/full-history-derived.json",
    sample_size: safeNum(fullHistoryCoverage.content_with_perf),
    exclusions: "Value proxy uses clicks × CPC, not booked revenue.",
  },
  searchVolume: {
    metric_window: `${windowLabels.recent90} + ${windowLabels.fullHistoryPage}`,
    source_artifact: "data/v2/raw-feature-vector-full.json + data/full-history-derived.json",
    sample_size: safeNum(searchVolumeRecent90.sample_pages),
    exclusions: "Only pages with stored non-zero search volume are included. Search volume is monthly, so the paper now separates 90-day and longer-window comparisons.",
  },
  wordCount: {
    metric_window: `${windowLabels.fullHistoryPage} + ${windowLabels.fullHistoryQuery}`,
    source_artifact: "data/full-history-derived.json + data/query-relevance-summary.json",
    sample_size: safeNum(fullHistoryCoverage.content_with_perf),
    exclusions: "Query-level analysis uses the available Search Console query window, which is shorter than page-level warehouse history.",
  },
  queryRelevance: {
    metric_window: windowLabels.fullHistoryQuery,
    source_artifact: "data/query-relevance-summary.json",
    sample_size: safeNum(queryRelevanceSummary.coverage?.matched_content_count),
    exclusions: "Matched content-query rows only.",
  },
};

// ── Assemble ─────────────────────────────────────────────────────────────────

const paperData = {
  generatedAt: new Date().toISOString(),
  reportDate: "March 2026",
  studyGuide: {
    reportPeriod: `${windowLabels.recent90} | ${windowLabels.recent30} | ${windowLabels.fullHistoryPage} | ${windowLabels.fullHistoryQuery}`,
    windows: `${windowLabels.recent90} for current performance, ${windowLabels.recent30} for short-term momentum, ${windowLabels.fullHistoryPage} for structural analysis, and ${windowLabels.fullHistoryQuery} for ranking-query relevance and query-coverage analysis.`,
    evidenceStandard: "Headline findings prioritize direct aggregate comparisons. ML pages are exploratory appendix material and do not override direct portfolio evidence.",
    interpretationRule: "External SEO beliefs are treated as hypotheses, not proof. When direct portfolio evidence conflicts with industry narratives, the portfolio result wins.",
    unresolvedRule: "If a comparison is directionally interesting but support is thin or unstable, we treat it as unresolved rather than forcing a conclusion.",
    healthFormula,
    metricPolicy: "Use raw search metrics first where they are clearer and independently interpretable. Use health score as FlyRank composite context, not as a stand-alone public proof point.",
    localSnapshotRule: "This paper uses local recent-snapshot exports plus locally materialized full-history page and query exports. Each section is labeled with the window that matches the question being answered.",
  },
  metricAudit,
  validation: {
    errors: chartValidationErrors,
    passed: chartValidationErrors.length === 0,
  },
  sectionPolicy,
  windowLabels,
  provenance,
  paperInputManifest,

  coverage: {
    pageHistory: fullHistoryCoverage,
    queryHistory: queryRelevanceSummary.coverage ?? {},
  },

  scopeRecent: {
    totalContent: portfolio.total_content,
    totalContentFmt: fmt(portfolio.total_content),
    clientCount: portfolio.client_count,
    totalImpressions: portfolio.total_impressions,
    totalImpressionsFmt: fmt(portfolio.total_impressions),
    totalClicks: fmt(portfolio.total_clicks),
    totalSessions: portfolio.total_sessions,
    totalAISessions: portfolio.total_ai_sessions,
    aiSharePct,
    avgHealth: portfolio.avg_health_score,
  },

  scopeFullHistory: {
    totalContent: fullHistoryCoverage.total_content_inventory,
    totalContentFmt: fmt(fullHistoryCoverage.total_content_inventory),
    clientCount: fullHistoryCoverage.client_count,
    totalImpressions: fullHistoryCoverage.total_impressions,
    totalImpressionsFmt: fmt(fullHistoryCoverage.total_impressions),
    totalClicks: fmt(fullHistoryCoverage.total_clicks),
    totalSessions: fullHistoryCoverage.total_sessions,
    totalAISessions: fullHistoryCoverage.total_ai_sessions,
    totalRevenue: fullHistoryCoverage.total_revenue,
    activeDays: fullHistoryCoverage.active_days,
  },

  scope: {
    totalContent: portfolio.total_content,
    totalContentFmt: fmt(portfolio.total_content),
    clientCount: portfolio.client_count,
    totalImpressions: portfolio.total_impressions,
    totalImpressionsFmt: fmt(portfolio.total_impressions),
    totalClicks: fmt(portfolio.total_clicks),
    totalSessions: portfolio.total_sessions,
    totalAISessions: portfolio.total_ai_sessions,
    aiSharePct,
    avgHealth: portfolio.avg_health_score,
    healthyPct: ((portfolio.healthy_content / portfolio.total_content) * 100).toFixed(1),
    poorPct: ((portfolio.poor_content / portfolio.total_content) * 100).toFixed(1),
    activeSampleContent: featureRows.length,
    activeSampleSessions,
    activeSampleAISessions,
    activeSampleAiSharePct: pct(activeSampleAISessions, activeSampleSessions, 2),
    activeSampleAiPagePct: pct(activeSampleAiPages, featureRows.length, 2),
  },

  trends: {
    impressions: changePct(agg30d.imp, agg30d.impP),
    clicks: changePct(agg30d.cl, agg30d.clP),
    ai: changePct(agg30d.ai, agg30d.aiP),
  },

  // Part I: Study context
  healthDistribution: healthDist,
  positionDistribution: positionDist,
  trendDistribution: trendDist,
  ageTiers,
  freshnessTiers,

  // Part II: Discoveries (base hypotheses + extended data)
  discoveries: {
    lifecycle: { growing, declining },
    freshnessMultiplier: { crossTrend: corrFreshnessTrend, expanded: freshnessExpanded },
    refreshOld: { fresh365: old365Fresh, stale365: old365Stale },
    engagementMatrix: corrEngagementMatrix,
    aiProfile: {
      vsTraditional: corrAiVsTraditional,
      monthly: aiMonthly,
      daily: aiDaily,
      latestAIPct: latestAI?.ai_pct,
      base: {
        portfolioSessions: safeNum(portfolio.total_sessions),
        portfolioAiSessions: safeNum(portfolio.total_ai_sessions),
        portfolioAiSharePct: aiSharePct,
        fullHistoryPages: fullHistoryAiInventoryPages,
        fullHistoryAiPages,
        fullHistoryAiPagePct,
        activeSamplePages: featureRows.length,
        activeSampleSessions,
        activeSampleAiSessions: activeSampleAISessions,
        activeSampleAiSharePct: pct(activeSampleAISessions, activeSampleSessions, 2),
        activeSampleAiPagePct: pct(activeSampleAiPages, featureRows.length, 2),
      },
      providers30d: aiProviders30d,
      byIntent: aiByIntent,
      byWordCount: aiByWordCount,
    },
    ctrCurve: ctrCurveValidated,
    ageGoldenZone: hypAgeGolden,
    visibilityConsistency: hypVisibility,
    winningCombinations: { intentComp: hypIntentComp, wordcountPosition: corrWordcountPosition },
    ageFreshnessMatrix: ageFreshnessExpanded,
    aiModel: {
      legacy: hypModel,
      providerByAge: aiModelProviderByAge,
      providerSummary: aiModelProviderSummary,
    },
    trafficValue: {
      totalClickEquivalentValue: clickEquivalentValue,
      unsafeImpressionTimesCpc: impressionTimesCpc,
      capturedSharePct: trafficValueCapturedSharePct,
      byIntent: trafficValueByIntent,
      windowLabel: windowLabels.fullHistoryPage,
    },
    wordCountPerformance,
    contentDepth: {
      longForm: longFormAnalysis,
      relevanceBuckets,
      impressionsVsWordsScatter,
      clicksVsCharsScatter,
    },
    revenueByAttributes: rawRevenueAttr,
    aiConversion: rawAiConversion,
    trafficDiversification: rawTrafficDiv,
    dayOfWeek: rawDayOfWeek,
    monthlyTrends: fullHistoryMonthly,
    scrollPosition: rawScrollPosition,
    engagementTimeHealth: rawEngagementTime,
  },

  // Part III: Myths debunked
  myths: {
    searchVolume: hypSearchVolume,
    searchVolumeValidation,
    searchVolumeRecent90,
    flagStacking: hypFlagStacking,
    wordcountContinuous: mythWordcount,
    aiPenalized: mythAiPenalized,
    position1Value: mythPosition1,
    freshnessControlled: mythFreshnessCtrl,
    svVsImpressions: mythSvImpressions,
    publishVelocity: mythPublishVelocity,
    publishVelocityEnhanced: mythPublishVelocityEnhanced,
    competition: corrCompetition,
    cpcPerformance: mythCpcPerformance,
    engagementRankings: mythEngagementRankings,
    intentPerformance: mythIntentPerformance,
    visibilityGrowth: mythVisibilityGrowth,
  },

  // Part IV: ML insights
  ml: {
    correlationMatrix: ml.correlation_matrix ?? {},
    clusters: sanitizedClusters,
    featureImportance: sanitizedFeatureImportance,
    pca: ml.pca ?? {},
    growthPredictors: sanitizedGrowthPredictors,
    decisionTree: ml.decision_tree ?? {},
    percentiles: ml.percentiles ?? {},
  },
  legacyScoringSummary,
  newScoring,
  optimizationFramework,
  scoringComparison,

  // Root-level references (used by PDF sections that read from d.xxx directly)
  ctrCurve: ctrCurveValidated,
  ctrCurveValidated,
  ageGoldenZone: hypAgeGolden,
  flagStacking: hypFlagStacking,
  visibilityConsistency: hypVisibility,
  ageFreshnessMatrix: ageFreshnessExpanded,
  wordCountPerformance,
  validated: {
    lifecycle: {
      longerPct: lifecycleLongerPct,
      youngerPct: lifecycleYoungerPct,
    },
    ctrByPositionTier: ctrCurveValidated,
    ai: {
      sharePct: aiSharePct,
      highAiAvgImp: safeNum(highAI?.avg_imp),
      noAiAvgImp: safeNum(noAI?.avg_imp),
      impressionLift: aiImpressionLift,
      highAiAvgPos: safeNum(highAI?.avg_pos),
      noAiAvgPos: safeNum(noAI?.avg_pos),
      aiBucketRevenue: {
        hasAiTraffic: {
          landingSessions: safeNum(hasAIRevenue?.landing_sessions),
          purchases: safeNum(hasAIRevenue?.purchases),
          revenue: safeNum(hasAIRevenue?.revenue),
        },
        noAiTraffic: {
          landingSessions: safeNum(noAIRevenue?.landing_sessions),
          purchases: safeNum(noAIRevenue?.purchases),
          revenue: safeNum(noAIRevenue?.revenue),
        },
      },
      providers30d: aiProviders30d,
      byIntent: aiByIntent,
      byWordCount: aiByWordCount,
      fullHistoryAiPagePct,
    },
    freshnessExpanded,
    searchVolumeValidation,
    searchVolumeRecent90,
    trafficValue: {
      totalClickEquivalentValue: clickEquivalentValue,
      unsafeImpressionTimesCpc: impressionTimesCpc,
      capturedSharePct: trafficValueCapturedSharePct,
      byIntent: trafficValueByIntent,
      windowLabel: windowLabels.fullHistoryPage,
    },
    aiModelProviderByAge,
    aiModelProviderSummary,
    optimizationFlags: flagsCoverage,
    winningCombinations: {
      transactionalLow,
      informationalLow,
    },
    revenueCoveragePct: aiRevenueCoveragePct,
  },
  queryRelevance: queryRelevanceSummary,
  keywordDrift: keywordDriftAnalysis,

  // Part VIII: ML Discovery (statistically validated findings)
  discovery: {
    growthModel: {
      nSamples: discoveryV2.growth_model_v2?.n_samples ?? 0,
      accuracy: discoveryV2.growth_model_v2?.accuracy ?? {},
      auc: discoveryV2.growth_model_v2?.auc ?? {},
      features: discoveryV2.growth_model_v2?.features ?? [],
      permutationImportance: discoveryV2.growth_model_v2?.permutation_importance ?? {},
      confusionMatrix: discoveryV2.growth_model_v2?.confusion_matrix ?? {},
      calibration: discoveryV2.growth_model_v2?.calibration ?? [],
    },
    zombieRecovery: {
      nTotal: discoveryV2.zombie_recovery_v2?.n_total ?? 0,
      nRecovered: discoveryV2.zombie_recovery_v2?.n_recovered ?? 0,
      recoveryRate: discoveryV2.zombie_recovery_v2?.recovery_rate ?? 0,
      accuracy: discoveryV2.zombie_recovery_v2?.accuracy ?? {},
      auc: discoveryV2.zombie_recovery_v2?.auc ?? {},
      permutationImportance: discoveryV2.zombie_recovery_v2?.permutation_importance ?? {},
      recoverableProfile: discoveryV2.zombie_recovery_v2?.recoverable_profile ?? {},
      unrecoverableProfile: discoveryV2.zombie_recovery_v2?.unrecoverable_profile ?? {},
    },
    momentumPrediction: {
      nPages: discoveryV2.momentum_prediction?.n_pages ?? 0,
      improvedRate: discoveryV2.momentum_prediction?.improved_rate ?? 0,
      accuracy: discoveryV2.momentum_prediction?.accuracy ?? {},
      auc: discoveryV2.momentum_prediction?.auc ?? {},
      permutationImportance: discoveryV2.momentum_prediction?.permutation_importance ?? {},
    },
    refreshImpact: {
      strata: (discoveryV1.refresh_impact?.strata ?? []),
      significantStrata: discoveryV1.refresh_impact?.significant_strata ?? 0,
      totalStrata: discoveryV1.refresh_impact?.total_strata ?? 0,
    },
    thresholds: discoveryV1.thresholds ?? {},
    flowchartEffects: discoveryV2.flowchart_effects ?? [],
    significanceTests: discoveryV1.significance_tests ?? [],
    interactions: discoveryV1.interactions ?? {},
  },

  // Part VIII-b: ML Discovery stability (holdout-validated, 10-seed protocol)
  discoveryStability: {
    stability: {
      zombie: {
        mean: safeNum(discoveryStabilityRaw.stability?.zombie?.mean),
        std: safeNum(discoveryStabilityRaw.stability?.zombie?.std),
        min: safeNum(discoveryStabilityRaw.stability?.zombie?.min),
        max: safeNum(discoveryStabilityRaw.stability?.zombie?.max),
      },
      momentum: {
        mean: safeNum(discoveryStabilityRaw.stability?.momentum?.mean),
        std: safeNum(discoveryStabilityRaw.stability?.momentum?.std),
        min: safeNum(discoveryStabilityRaw.stability?.momentum?.min),
        max: safeNum(discoveryStabilityRaw.stability?.momentum?.max),
      },
      growth_baseline: {
        mean: safeNum(discoveryStabilityRaw.stability?.growth_baseline?.mean),
        std: safeNum(discoveryStabilityRaw.stability?.growth_baseline?.std),
        min: safeNum(discoveryStabilityRaw.stability?.growth_baseline?.min),
        max: safeNum(discoveryStabilityRaw.stability?.growth_baseline?.max),
      },
      significance_pass_rate: safeNum(discoveryStabilityRaw.stability?.significance_pass_rate),
    },
    best_growth_model: discoveryStabilityRaw.best_growth_model ?? {},
    meta: {
      protocol: discoveryStabilityRaw.meta?.protocol ?? "holdout_10_seed",
      seeds: safeNum(discoveryStabilityRaw.meta?.seeds),
      n_clients: safeNum(discoveryStabilityRaw.meta?.n_clients),
      n_rows: safeNum(discoveryStabilityRaw.meta?.n_rows),
    },
  },

  // Definitive ML validation: 80/20, cross-client + within-client, 10 seeds
  discoveryFinal: {
    crossClient: {
      growth: discoveryFinalRaw.cross_client?.growth ?? {},
      zombie: discoveryFinalRaw.cross_client?.zombie ?? {},
      momentum: discoveryFinalRaw.cross_client?.momentum ?? {},
    },
    withinClient: {
      growth: discoveryFinalRaw.within_client?.growth ?? {},
      zombie: discoveryFinalRaw.within_client?.zombie ?? {},
      momentum: discoveryFinalRaw.within_client?.momentum ?? {},
    },
    finalModels: {
      growth: discoveryFinalRaw.final_models?.growth ?? {},
      zombie: discoveryFinalRaw.final_models?.zombie ?? {},
      momentum: discoveryFinalRaw.final_models?.momentum ?? {},
    },
    significanceTests: discoveryFinalRaw.significance_tests ?? [],
    refreshImpact: discoveryFinalRaw.refresh_impact ?? {},
    flowchartEffects: discoveryFinalRaw.flowchart_effects ?? [],
    meta: discoveryFinalRaw.meta ?? {},
  },

  // Part V: Playbook supporting data
  cannibalization,
  optimization: { actions: optActions, flags: optFlags },
  indexing: indexingState,
  revenue: revenue.revenue_90d ? revenue : null,
  topBottom: rawTopBottom,
  percentiles: rawPercentiles,
  topClients: clients.slice(0, 10),
  pubTimeline,
  freshnessDecay,
  correlationPairs: rawCorrelations,
};

if (!paperData.validation.passed) {
  throw new Error(`Claude paper-data validation failed: ${paperData.validation.errors.join(" | ")}`);
}

writeFileSync(OUT, JSON.stringify(paperData, null, 2));
const size = (JSON.stringify(paperData).length / 1024).toFixed(0);
console.log(`paper-data.json written (${size} KB)`);
console.log(`  Scope: ${paperData.scope.totalContentFmt} content, ${paperData.scope.clientCount} clients`);
console.log(`  ML: ${ml.clusters?.length ?? 0} clusters, ${ml.feature_importance?.length ?? 0} features ranked`);
console.log(`  Optimization: ${optimizationFramework.significantStableInputs.length} stable signals, ${optimizationFramework.directionalOnlyInputs.length} directional`);
console.log(`  Myths: ${Object.keys(paperData.myths).length} tested`);
console.log(`  Discoveries: ${Object.keys(paperData.discoveries).length} findings`);
