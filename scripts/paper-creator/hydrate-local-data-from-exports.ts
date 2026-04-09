#!/usr/bin/env bun
/**
 * Rebuilds the canonical paper input files from the normalized export bundle.
 * This lets the existing paper pipeline run without querying BigQuery again.
 */

import { createReadStream, createWriteStream, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { once } from "events";
import { createGunzip, createGzip } from "zlib";
import readline from "readline";

const BASE = import.meta.dir;
const DATA = join(BASE, "data");
const V2 = join(DATA, "v2");
const EXPORTS = join(DATA, "exports");
const RECENT = join(EXPORTS, "recent-views");
const FULL = join(EXPORTS, "full-history");
const GA4 = join(EXPORTS, "ga4");
const EXPORT_MANIFEST_PATH = join(EXPORTS, "manifests", "export-bundle-manifest.json");

type AnyRow = Record<string, any>;

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pct(numerator: number, denominator: number, digits = 2): number {
  if (!denominator) return 0;
  return round((numerator / denominator) * 100, digits);
}

function avg(total: number, count: number, digits = 2): number {
  return count ? round(total / count, digits) : 0;
}

function safeDiv(numerator: number, denominator: number, digits = 2): number {
  return denominator ? round(numerator / denominator, digits) : 0;
}

function changePct(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0;
  return round(((current - previous) / previous) * 100, 2);
}

function normalizeUrl(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[#?].*$/, "")
    .replace(/\/$/, "");
}

function readJsonArray(pathname: string): any[] {
  const parsed = JSON.parse(readFileSync(pathname, "utf8"));
  if (Array.isArray(parsed)) return parsed;
  return parsed.rows ?? [];
}

async function loadNdjsonGz(pathname: string): Promise<any[]> {
  const rows: any[] = [];
  const rl = readline.createInterface({
    input: createReadStream(pathname).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    rows.push(JSON.parse(line));
  }
  return rows;
}

async function streamNdjsonGz(pathname: string, onRow: (row: any) => void | Promise<void>) {
  const rl = readline.createInterface({
    input: createReadStream(pathname).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    await onRow(JSON.parse(line));
  }
}

async function createNdjsonGzWriter(pathname: string) {
  mkdirSync(join(pathname, ".."), { recursive: true });
  const gzip = createGzip();
  const output = createWriteStream(pathname);
  gzip.pipe(output);
  return {
    async write(row: AnyRow) {
      gzip.write(`${JSON.stringify(row)}\n`);
    },
    async close() {
      const closed = once(output, "close");
      gzip.end();
      await closed;
    },
  };
}

function writeWrapped(pathname: string, rows: any[]) {
  mkdirSync(join(pathname, ".."), { recursive: true });
  writeFileSync(
    pathname,
    JSON.stringify(
      {
        row_count: rows.length,
        rows,
        errors: [],
        job_complete: true,
      },
      null,
      2
    )
  );
}

function writeRaw(pathname: string, value: any) {
  mkdirSync(join(pathname, ".."), { recursive: true });
  writeFileSync(pathname, JSON.stringify(value, null, 2));
}

function sortBy<T extends Record<string, any>>(rows: T[], key: string, order: string[]) {
  const rank = new Map(order.map((value, index) => [value, index]));
  return [...rows].sort((a, b) => (rank.get(String(a[key])) ?? 999) - (rank.get(String(b[key])) ?? 999));
}

function healthLabel(score: number) {
  if (score >= 45) return "healthy";
  if (score >= 20) return "moderate";
  return "poor";
}

function scrollBucket(scrollRate: number) {
  if (scrollRate >= 60) return "high_scroll";
  if (scrollRate >= 30) return "mid_scroll";
  return "low_scroll";
}

function engageBucket(rate: number) {
  if (rate >= 70) return "high_engage";
  if (rate >= 45) return "mid_engage";
  return "low_engage";
}

function aiBucket(aiTrafficPct: number) {
  if (aiTrafficPct <= 0) return "no_ai";
  if (aiTrafficPct >= 5) return "high_ai";
  return "some_ai";
}

function visibilityBucket(daysVisible: number) {
  if (daysVisible >= 80) return "consistent (80+ days)";
  if (daysVisible >= 50) return "frequent (50-79 days)";
  if (daysVisible >= 20) return "intermittent (20-49 days)";
  return "sporadic (<20 days)";
}

function searchVolumeBucket(sv: number) {
  if (sv < 1) return "0";
  if (sv < 100) return "1-100";
  if (sv < 1000) return "100-1K";
  if (sv < 10000) return "1K-10K";
  return "10K+";
}

function ageGoldenBucket(days: number) {
  if (days <= 14) return "0-14";
  if (days <= 30) return "15-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 180) return "91-180";
  if (days <= 270) return "181-270";
  if (days <= 365) return "271-365";
  return "365+";
}

function expandedFreshness(days: number) {
  if (days <= 30) return "0-30";
  if (days <= 90) return "31-90";
  if (days <= 180) return "91-180";
  if (days <= 360) return "181-360";
  return "361+";
}

function trendNumeric(direction: string) {
  if (direction === "up") return 1;
  if (direction === "down") return -1;
  return 0;
}

function pearson(xs: number[], ys: number[], digits = 4): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n;
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

async function main() {
  mkdirSync(DATA, { recursive: true });
  mkdirSync(V2, { recursive: true });

  const exportManifest = JSON.parse(readFileSync(EXPORT_MANIFEST_PATH, "utf8"));
  const preferredQueryRun = exportManifest.structure.query_history.preferred_run;
  const queryHistorySource = join(EXPORTS, "query-history", preferredQueryRun, "query-history.ndjson.gz");
  const pageHistorySource = join(FULL, "page-level-content-summary.ndjson.gz");
  const ga4Rows = await loadNdjsonGz(join(GA4, "url-daily.ndjson.gz"));

  const recentClientScorecard = await loadNdjsonGz(join(RECENT, "v_client_scorecard.ndjson.gz"));
  const dashboardSummary = await loadNdjsonGz(join(RECENT, "view_dashboard_summary.ndjson.gz"));
  const aiBreakdown30d = await loadNdjsonGz(join(RECENT, "v_ai_breakdown_30d.ndjson.gz"));
  const optimizationQueue = await loadNdjsonGz(join(RECENT, "v_optimization_queue.ndjson.gz"));
  const optimizationFlagsSource = await loadNdjsonGz(join(RECENT, "view_optimization_flags.ndjson.gz"));
  const cannibalizationClient = await loadNdjsonGz(join(RECENT, "v_cannibalization_client_summary.ndjson.gz"));
  const totalRevenueRows = await loadNdjsonGz(join(RECENT, "v_total_revenue.ndjson.gz"));

  const fullCoverage = readJsonArray(join(FULL, "coverage.json"))[0] ?? {};
  const fullClientScorecard = readJsonArray(join(FULL, "client-scorecard.json"));
  const fullMonthlyTrends = readJsonArray(join(FULL, "monthly-trends.json"));

  const pageJoinMap = new Map<string, AnyRow>();
  const urlClientMap = new Map<string, string>();
  const pubVelocityMap = new Map<string, { total_content: number; published_last_30d: number; published_last_90d: number }>();
  const revenueByAttrMap = new Map<string, AnyRow>();
  const aiRevenueBuckets = new Map<string, AnyRow>([
    ["has_ai_traffic", { ai_bucket: "has_ai_traffic", content_count: 0, landing_sessions: 0, purchases: 0, revenue: 0 }],
    ["no_ai_traffic", { ai_bucket: "no_ai_traffic", content_count: 0, landing_sessions: 0, purchases: 0, revenue: 0 }],
  ]);
  const publicationTimelineMap = new Map<string, AnyRow>();
  let pageRowCount = 0;

  await streamNdjsonGz(pageHistorySource, (row) => {
    pageRowCount += 1;
    const key = `${row.client_id}:${row.content_id}`;
    const compact = {
      client_id: String(row.client_id),
      client_handle: row.client_handle,
      content_id: String(row.content_id),
      content_title: row.content_title,
      content_handle: row.content_handle,
      public_url: row.public_url,
      keyword: row.keyword,
      search_volume: num(row.search_volume),
      competition: num(row.competition),
      competition_level: row.competition_level ?? "UNKNOWN",
      cpc: num(row.cpc),
      content_type: row.content_type ?? "unknown",
      main_intent: row.main_intent ?? "unknown",
      provider_used: row.provider_used ?? "unknown",
      model_used: row.model_used ?? "unknown",
      word_count: num(row.word_count),
      char_count: num(row.char_count),
      content_created_at: row.content_created_at,
      content_updated_at: row.content_updated_at,
      content_age_days: num(row.content_age_days),
      days_since_update: num(row.days_since_update),
      history_start: row.history_start ?? fullCoverage.oldest_date,
      history_end: row.history_end ?? fullCoverage.newest_date,
      first_seen_date: row.first_seen_date,
      last_seen_date: row.last_seen_date,
      active_days: num(row.active_days),
      days_with_impressions_all: num(row.days_with_impressions_all),
      days_with_sessions_all: num(row.days_with_sessions_all),
      impressions_all: num(row.impressions_all),
      clicks_all: num(row.clicks_all),
      pageviews_all: num(row.pageviews_all),
      sessions_all: num(row.sessions_all),
      users_all: num(row.users_all),
      engaged_sessions_all: num(row.engaged_sessions_all),
      ai_sessions_all: num(row.ai_sessions_all),
      landing_sessions_all: num(row.landing_sessions_all),
      purchases_all: num(row.purchases_all),
      revenue_all: num(row.revenue_all),
      age_tier: row.age_tier,
      freshness_tier: row.freshness_tier,
      health_score_recent: num(row.health_score_recent),
      trend_direction: row.trend_direction ?? "flat",
      impressions_90d: num(row.impressions_90d),
      clicks_90d: num(row.clicks_90d),
      sessions_90d: num(row.sessions_90d),
      ai_sessions_90d: num(row.ai_sessions_90d),
    };
    pageJoinMap.set(key, compact);
    const normalizedUrl = normalizeUrl(row.public_url);
    if (normalizedUrl) urlClientMap.set(normalizedUrl, String(row.client_id));

    const velocity = pubVelocityMap.get(String(row.client_handle ?? row.client_id)) ?? {
      total_content: 0,
      published_last_30d: 0,
      published_last_90d: 0,
    };
    velocity.total_content += 1;
    if (num(row.content_age_days) <= 30) velocity.published_last_30d += 1;
    if (num(row.content_age_days) <= 90) velocity.published_last_90d += 1;
    pubVelocityMap.set(String(row.client_handle ?? row.client_id), velocity);

    const attrKey = `${row.content_type ?? "unknown"}::${row.main_intent ?? "unknown"}`;
    const attr = revenueByAttrMap.get(attrKey) ?? {
      content_type: row.content_type ?? "unknown",
      main_intent: row.main_intent ?? "unknown",
      content_count: 0,
      landing_sessions: 0,
      purchases: 0,
      total_revenue: 0,
    };
    attr.content_count += 1;
    attr.landing_sessions += num(row.landing_sessions_all);
    attr.purchases += num(row.purchases_all);
    attr.total_revenue += num(row.revenue_all);
    revenueByAttrMap.set(attrKey, attr);

    const aiKey = num(row.ai_sessions_all) > 0 ? "has_ai_traffic" : "no_ai_traffic";
    const aiAttr = aiRevenueBuckets.get(aiKey)!;
    aiAttr.content_count += 1;
    aiAttr.landing_sessions += num(row.landing_sessions_all);
    aiAttr.purchases += num(row.purchases_all);
    aiAttr.revenue += num(row.revenue_all);

    const month = String(row.content_created_at ?? "").slice(0, 7);
    if (month) {
      const pub = publicationTimelineMap.get(month) ?? { month, published: 0, avg_health_now_total: 0, avg_imp_now_total: 0 };
      pub.published += 1;
      pub.avg_health_now_total += num(row.health_score_recent);
      pub.avg_imp_now_total += num(row.impressions_90d);
      publicationTimelineMap.set(month, pub);
    }
  });

  const aiDailyMap = new Map<string, AnyRow>();
  let aiDailyMaxDate = "";
  for (const row of aiBreakdown30d) {
    const reportDate = String(row.report_date ?? "");
    if (!reportDate) continue;
    aiDailyMaxDate = aiDailyMaxDate > reportDate ? aiDailyMaxDate : reportDate;
    const current = aiDailyMap.get(reportDate) ?? {
      report_date: reportDate,
      chatgpt: 0,
      perplexity: 0,
      gemini: 0,
      copilot: 0,
      claude: 0,
      meta: 0,
      total_ai: 0,
    };
    current.chatgpt += num(row.chatgpt_sessions);
    current.perplexity += num(row.perplexity_sessions);
    current.gemini += num(row.gemini_sessions);
    current.copilot += num(row.copilot_sessions);
    current.claude += num(row.claude_sessions);
    current.meta += num(row.meta_sessions);
    current.total_ai += num(row.total_ai_sessions);
    aiDailyMap.set(reportDate, current);
  }
  const aiDailyAll = [...aiDailyMap.values()].sort((a, b) => String(a.report_date).localeCompare(String(b.report_date)));
  const recent30Start = aiDailyMaxDate ? new Date(`${aiDailyMaxDate}T00:00:00Z`) : new Date();
  recent30Start.setUTCDate(recent30Start.getUTCDate() - 29);
  const recent30StartString = recent30Start.toISOString().slice(0, 10);
  const aiDailyRecent30 = aiDailyAll.filter((row) => String(row.report_date) >= recent30StartString);

  const aiMonthlyMap = new Map<string, AnyRow>();
  for (const row of aiDailyAll) {
    const month = String(row.report_date).slice(0, 7);
    const current = aiMonthlyMap.get(month) ?? {
      report_month: `${month}-01`,
      ai_sessions: 0,
      chatgpt: 0,
      perplexity: 0,
      gemini: 0,
      copilot: 0,
      claude: 0,
      ga4_sessions: 0,
      ai_pct: 0,
    };
    current.ai_sessions += num(row.total_ai);
    current.chatgpt += num(row.chatgpt);
    current.perplexity += num(row.perplexity);
    current.gemini += num(row.gemini);
    current.copilot += num(row.copilot);
    current.claude += num(row.claude);
    aiMonthlyMap.set(month, current);
  }
  for (const monthRow of fullMonthlyTrends) {
    const month = String(monthRow.month ?? "");
    const current = aiMonthlyMap.get(month) ?? {
      report_month: `${month}-01`,
      ai_sessions: 0,
      chatgpt: 0,
      perplexity: 0,
      gemini: 0,
      copilot: 0,
      claude: 0,
      ga4_sessions: 0,
      ai_pct: 0,
    };
    current.ga4_sessions = num(monthRow.sessions);
    current.ai_sessions = current.ai_sessions || num(monthRow.ai_sessions);
    current.ai_pct = pct(current.ai_sessions, current.ga4_sessions, 2);
    aiMonthlyMap.set(month, current);
  }
  const aiMonthly = [...aiMonthlyMap.values()].sort((a, b) => String(a.report_month).localeCompare(String(b.report_month)));

  const clientRowsSorted = [...recentClientScorecard].sort((a, b) => num(b.total_impressions) - num(a.total_impressions));
  const portfolioOverview = {
    total_content: clientRowsSorted.reduce((sum, row) => sum + num(row.total_content), 0),
    client_count: clientRowsSorted.length,
    total_impressions: clientRowsSorted.reduce((sum, row) => sum + num(row.total_impressions), 0),
    total_clicks: clientRowsSorted.reduce((sum, row) => sum + num(row.total_clicks), 0),
    total_sessions: clientRowsSorted.reduce((sum, row) => sum + num(row.total_sessions), 0),
    total_ai_sessions: clientRowsSorted.reduce((sum, row) => sum + num(row.total_ai_sessions), 0),
    avg_health_score: avg(
      clientRowsSorted.reduce((sum, row) => sum + num(row.avg_health_score) * num(row.total_content), 0),
      clientRowsSorted.reduce((sum, row) => sum + num(row.total_content), 0),
      1
    ),
    avg_ctr: pct(
      clientRowsSorted.reduce((sum, row) => sum + num(row.total_clicks), 0),
      clientRowsSorted.reduce((sum, row) => sum + num(row.total_impressions), 0),
      2
    ),
    avg_ai_traffic_pct: pct(
      clientRowsSorted.reduce((sum, row) => sum + num(row.total_ai_sessions), 0),
      clientRowsSorted.reduce((sum, row) => sum + num(row.total_sessions), 0),
      2
    ),
    healthy_content: clientRowsSorted.reduce((sum, row) => sum + num(row.healthy_content), 0),
    moderate_content: clientRowsSorted.reduce((sum, row) => sum + num(row.moderate_content), 0),
    poor_content: clientRowsSorted.reduce((sum, row) => sum + num(row.poor_content), 0),
    quick_wins: clientRowsSorted.reduce((sum, row) => sum + num(row.quick_wins_count), 0),
    underperformers: clientRowsSorted.reduce((sum, row) => sum + num(row.underperformers_count), 0),
    ctr_fix: clientRowsSorted.reduce((sum, row) => sum + num(row.ctr_fix_count), 0),
    needs_indexing: clientRowsSorted.reduce((sum, row) => sum + num(row.needs_indexing_count), 0),
  };

  const clientScorecard = clientRowsSorted.map((row) => ({
    client_id: row.client_id,
    client_handle: row.client_handle,
    client_name: row.client_name,
    domain: row.domain,
    total_content: num(row.total_content),
    total_impressions: num(row.total_impressions),
    total_clicks: num(row.total_clicks),
    total_sessions: num(row.total_sessions),
    total_ai_sessions: num(row.total_ai_sessions),
    overall_ctr: num(row.overall_ctr),
    ai_traffic_pct: num(row.ai_traffic_pct),
    avg_health_score: num(row.avg_health_score),
    healthy_content: num(row.healthy_content),
    moderate_content: num(row.moderate_content),
    poor_content: num(row.poor_content),
  }));

  const dashboardTrends = dashboardSummary.map((row) => ({
    ...row,
    client_id: row.client_id,
    client_name: row.client_name,
    gsc_impressions_30d: num(row.gsc_impressions_30d),
    gsc_impressions_prev_30d: num(row.gsc_impressions_prev_30d),
    gsc_impressions_diff: num(row.gsc_impressions_diff),
    gsc_impressions_pct_change: changePct(num(row.gsc_impressions_30d), num(row.gsc_impressions_prev_30d)),
    gsc_clicks_30d: num(row.gsc_clicks_30d),
    gsc_clicks_prev_30d: num(row.gsc_clicks_prev_30d),
    gsc_clicks_diff: num(row.gsc_clicks_diff),
    gsc_clicks_pct_change: changePct(num(row.gsc_clicks_30d), num(row.gsc_clicks_prev_30d)),
    sessions_30d: num(row.sessions_30d),
    sessions_prev_30d: num(row.sessions_prev_30d),
    ai_sessions_30d: num(row.ai_sessions_30d),
    ai_sessions_prev_30d: num(row.ai_sessions_prev_30d),
    ai_sessions_diff: num(row.ai_sessions_diff),
    ai_sessions_pct_change: changePct(num(row.ai_sessions_30d), num(row.ai_sessions_prev_30d)),
    gsc_avg_position_30d: num(row.gsc_avg_position_30d),
    gsc_avg_position_prev_30d: num(row.gsc_avg_position_prev_30d),
    gsc_avg_position_diff: num(row.gsc_avg_position_diff),
  }));

  const healthDistMap = new Map<string, AnyRow>();
  const ageTiersMap = new Map<string, AnyRow>();
  const freshnessTiersMap = new Map<string, AnyRow>();
  const positionDistMap = new Map<string, AnyRow>();
  const trendDistMap = new Map<string, AnyRow>();
  const lifecycleMap = new Map<string, AnyRow>();
  const freshTrendMap = new Map<string, AnyRow>();
  const engagementMatrixMap = new Map<string, AnyRow>();
  const aiVsTraditionalMap = new Map<string, AnyRow>();
  const ageFreshnessMap = new Map<string, AnyRow>();
  const wordPositionMap = new Map<string, AnyRow>();
  const competitionMap = new Map<string, AnyRow>();
  const svMap = new Map<string, AnyRow>();
  const modelMap = new Map<string, AnyRow>();
  const ageGoldenMap = new Map<string, AnyRow>();
  const flagStackMap = new Map<string, AnyRow>();
  const visibilityMap = new Map<string, AnyRow>();
  const intentCompMap = new Map<string, AnyRow>();
  const wordCountMythMap = new Map<string, AnyRow>();
  const mythAiPenalizedMap = new Map<string, AnyRow>();
  const mythPositionMap = new Map<string, AnyRow>();
  const freshnessControlledMap = new Map<string, AnyRow>();
  const mythSvMap = new Map<string, AnyRow>();
  const freshnessDecayMap = new Map<string, AnyRow>();
  const topBottomRows: AnyRow[] = [];
  const featureRows: AnyRow[] = [];
  const pubNowMap = new Map<string, { avg_imp_total: number; avg_health_total: number; count: number }>();
  const correlationVectors: Record<string, number[]> = {
    health: [],
    imp: [],
    clicks: [],
    sessions: [],
    ai: [],
    age: [],
    wc: [],
    sv: [],
  };

  await streamNdjsonGz(join(RECENT, "v_content_90d_age_summary.ndjson.gz"), (row) => {
    const key = `${row.client_id}:${row.content_id}`;
    const page = pageJoinMap.get(key) ?? {};
    const impressions90 = num(row.impressions_90d);
    const clicks90 = num(row.clicks_90d);
    const sessions90 = num(row.sessions_90d);
    const aiSessions90 = num(row.ai_sessions_90d);
    const engagedSessions90 = num(row.engaged_sessions_90d);
    const scrollEvents90 = num(row.scroll_events_90d);
    const healthScore = num(row.health_score);
    const avgPosition = impressions90 ? round(num(row.sum_position_90d) / impressions90, 2) : 0;
    const ctr = pct(clicks90, impressions90, 4);
    const aiTrafficPct = pct(aiSessions90, sessions90, 2);
    const engagementRate = pct(engagedSessions90, sessions90, 2);
    const scrollRate = pct(scrollEvents90, sessions90, 2);
    const trendPct = changePct(num(row.impressions_last_30d), num(row.impressions_prev_30d));
    const normalized = {
      client_id: String(row.client_id),
      client_handle: row.client_handle,
      content_id: String(row.content_id),
      content_created_at: row.content_created_at,
      content_updated_at: row.content_updated_at,
      content_type: page.content_type ?? row.content_type ?? "unknown",
      content_age_days: num(row.content_age_days),
      age_tier: row.age_tier ?? "unknown",
      days_since_update: num(row.days_since_last_update),
      freshness_tier: row.freshness_tier ?? "unknown",
      word_count: page.word_count ?? num(row.word_count),
      char_count: page.char_count ?? num(row.char_count),
      word_count_tier: row.word_count_tier ?? "unknown",
      char_count_tier: row.char_count_tier ?? "unknown",
      position_tier: row.position_tier ?? "unknown",
      impressions_90d: impressions90,
      clicks_90d: clicks90,
      sessions_90d: sessions90,
      ai_sessions_90d: aiSessions90,
      pageviews_90d: num(row.pageviews_90d),
      users_90d: num(row.users_90d),
      engaged_sessions_90d: engagedSessions90,
      scroll_events_90d: scrollEvents90,
      days_with_impressions: num(row.days_with_impressions),
      days_with_sessions: num(row.days_with_sessions),
      impressions_last_30d: num(row.impressions_last_30d),
      clicks_last_30d: num(row.clicks_last_30d),
      sessions_last_30d: num(row.sessions_last_30d),
      impressions_prev_30d: num(row.impressions_prev_30d),
      clicks_prev_30d: num(row.clicks_prev_30d),
      sessions_prev_30d: num(row.sessions_prev_30d),
      trend_direction: row.trend_direction ?? "flat",
      trend_pct: trendPct,
      trend_numeric: trendNumeric(String(row.trend_direction ?? "flat")),
      health_score: healthScore,
      health_label: healthLabel(healthScore),
      avg_position: avgPosition,
      ctr,
      ai_traffic_pct: aiTrafficPct,
      engagement_rate: engagementRate,
      scroll_rate: scrollRate,
      search_volume: page.search_volume ?? 0,
      cpc: page.cpc ?? 0,
      competition: page.competition ?? 0,
      competition_level: page.competition_level ?? "UNKNOWN",
      main_intent: page.main_intent ?? "unknown",
      provider_used: page.provider_used ?? row.provider_used ?? "unknown",
      model_used: page.model_used ?? row.model_used ?? "unknown",
      needs_indexing: Boolean(row.needs_indexing),
      is_quick_win: Boolean(row.is_quick_win),
      needs_ctr_fix: Boolean(row.needs_ctr_fix),
      needs_engagement_fix: Boolean(row.needs_engagement_fix),
      ai_opportunity: Boolean(row.ai_opportunity),
      is_underperformer: Boolean(row.is_underperformer),
      is_declining: Boolean(row.is_declining),
      is_initial_refresh_candidate: Boolean(row.is_initial_refresh_candidate),
    };

    const healthBucket = normalized.health_label;
    const healthAgg = healthDistMap.get(healthBucket) ?? { health_band: healthBucket, content_count: 0, impressions_90d: 0, clicks_90d: 0, sessions_90d: 0, avg_score_total: 0 };
    healthAgg.content_count += 1;
    healthAgg.impressions_90d += impressions90;
    healthAgg.clicks_90d += clicks90;
    healthAgg.sessions_90d += sessions90;
    healthAgg.avg_score_total += healthScore;
    healthDistMap.set(healthBucket, healthAgg);

    const ageAgg = ageTiersMap.get(normalized.age_tier) ?? { age_tier: normalized.age_tier, content_count: 0, impressions_90d: 0, clicks_90d: 0, sessions_90d: 0, ai_sessions_90d: 0, avg_health_score_total: 0 };
    ageAgg.content_count += 1;
    ageAgg.impressions_90d += impressions90;
    ageAgg.clicks_90d += clicks90;
    ageAgg.sessions_90d += sessions90;
    ageAgg.ai_sessions_90d += aiSessions90;
    ageAgg.avg_health_score_total += healthScore;
    ageTiersMap.set(normalized.age_tier, ageAgg);

    const freshnessAgg = freshnessTiersMap.get(normalized.freshness_tier) ?? { freshness_tier: normalized.freshness_tier, content_count: 0, impressions_90d: 0, sessions_90d: 0, avg_health_score_total: 0, clicks_90d: 0, declining_count: 0 };
    freshnessAgg.content_count += 1;
    freshnessAgg.impressions_90d += impressions90;
    freshnessAgg.sessions_90d += sessions90;
    freshnessAgg.clicks_90d += clicks90;
    freshnessAgg.avg_health_score_total += healthScore;
    freshnessAgg.declining_count += normalized.trend_direction === "down" ? 1 : 0;
    freshnessTiersMap.set(normalized.freshness_tier, freshnessAgg);

    const posAgg = positionDistMap.get(normalized.position_tier) ?? { position_tier: normalized.position_tier, content_count: 0, impressions_90d: 0, clicks_90d: 0, avg_health_total: 0 };
    posAgg.content_count += 1;
    posAgg.impressions_90d += impressions90;
    posAgg.clicks_90d += clicks90;
    posAgg.avg_health_total += healthScore;
    positionDistMap.set(normalized.position_tier, posAgg);

    const trendAgg = trendDistMap.get(normalized.trend_direction) ?? { trend_direction: normalized.trend_direction, content_count: 0, impressions_90d: 0, avg_trend_pct_total: 0 };
    trendAgg.content_count += 1;
    trendAgg.impressions_90d += impressions90;
    trendAgg.avg_trend_pct_total += trendPct;
    trendDistMap.set(normalized.trend_direction, trendAgg);

    const pubMonth = String(normalized.content_created_at ?? "").slice(0, 7);
    if (pubMonth) {
      const current = pubNowMap.get(pubMonth) ?? { avg_imp_total: 0, avg_health_total: 0, count: 0 };
      current.avg_imp_total += impressions90;
      current.avg_health_total += healthScore;
      current.count += 1;
      pubNowMap.set(pubMonth, current);
    }

    const isActive = impressions90 > 0 || sessions90 > 0 || aiSessions90 > 0;
    if (!isActive) return;
    featureRows.push(normalized);
    correlationVectors.health.push(healthScore);
    correlationVectors.imp.push(impressions90);
    correlationVectors.clicks.push(clicks90);
    correlationVectors.sessions.push(sessions90);
    correlationVectors.ai.push(aiSessions90);
    correlationVectors.age.push(normalized.content_age_days);
    correlationVectors.wc.push(normalized.word_count);
    correlationVectors.sv.push(normalized.search_volume);

    const life = lifecycleMap.get(normalized.trend_direction) ?? {
      trend_direction: normalized.trend_direction,
      n: 0,
      avg_word_count_total: 0,
      avg_age_days_total: 0,
      avg_imp_total: 0,
      avg_pos_total: 0,
      avg_health_total: 0,
      avg_ctr_pct_total: 0,
      avg_ai_pct_total: 0,
      avg_scroll_pct_total: 0,
      avg_engage_pct_total: 0,
      avg_days_since_update_total: 0,
    };
    life.n += 1;
    life.avg_word_count_total += normalized.word_count;
    life.avg_age_days_total += normalized.content_age_days;
    life.avg_imp_total += impressions90;
    life.avg_pos_total += normalized.avg_position;
    life.avg_health_total += healthScore;
    life.avg_ctr_pct_total += normalized.ctr;
    life.avg_ai_pct_total += normalized.ai_traffic_pct;
    life.avg_scroll_pct_total += normalized.scroll_rate;
    life.avg_engage_pct_total += normalized.engagement_rate;
    life.avg_days_since_update_total += normalized.days_since_update;
    lifecycleMap.set(normalized.trend_direction, life);

    const freshKey = `${normalized.freshness_tier}::${normalized.trend_direction}`;
    const fresh = freshTrendMap.get(freshKey) ?? { freshness_tier: normalized.freshness_tier, trend_direction: normalized.trend_direction, n: 0, avg_health_total: 0, avg_impressions_total: 0, avg_trend_pct_total: 0 };
    fresh.n += 1;
    fresh.avg_health_total += healthScore;
    fresh.avg_impressions_total += impressions90;
    fresh.avg_trend_pct_total += normalized.trend_pct;
    freshTrendMap.set(freshKey, fresh);

    const engKey = `${scrollBucket(normalized.scroll_rate)}::${engageBucket(normalized.engagement_rate)}`;
    const eng = engagementMatrixMap.get(engKey) ?? {
      scroll_bucket: scrollBucket(normalized.scroll_rate),
      engage_bucket: engageBucket(normalized.engagement_rate),
      n: 0,
      avg_ai_pct_total: 0,
      avg_health_total: 0,
      avg_imp_total: 0,
      avg_pos_total: 0,
    };
    eng.n += 1;
    eng.avg_ai_pct_total += normalized.ai_traffic_pct;
    eng.avg_health_total += healthScore;
    eng.avg_imp_total += impressions90;
    eng.avg_pos_total += normalized.avg_position;
    engagementMatrixMap.set(engKey, eng);

    const aiKey = aiBucket(normalized.ai_traffic_pct);
    const aiAgg = aiVsTraditionalMap.get(aiKey) ?? {
      ai_bucket: aiKey,
      n: 0,
      avg_age_total: 0,
      avg_ctr_pct_total: 0,
      avg_engage_pct_total: 0,
      avg_health_total: 0,
      avg_imp_total: 0,
      avg_pos_total: 0,
      avg_scroll_pct_total: 0,
    };
    aiAgg.n += 1;
    aiAgg.avg_age_total += normalized.content_age_days;
    aiAgg.avg_ctr_pct_total += normalized.ctr;
    aiAgg.avg_engage_pct_total += normalized.engagement_rate;
    aiAgg.avg_health_total += healthScore;
    aiAgg.avg_imp_total += impressions90;
    aiAgg.avg_pos_total += normalized.avg_position;
    aiAgg.avg_scroll_pct_total += normalized.scroll_rate;
    aiVsTraditionalMap.set(aiKey, aiAgg);

    const ageFreshnessTier = expandedFreshness(normalized.days_since_update);
    const ageFreshKey = `${normalized.age_tier}::${ageFreshnessTier}`;
    const ageFresh = ageFreshnessMap.get(ageFreshKey) ?? {
      age_tier: normalized.age_tier,
      freshness_tier: ageFreshnessTier,
      n: 0,
      declining_n: 0,
      avg_ai_pct_total: 0,
      avg_ctr_pct_total: 0,
      avg_health_total: 0,
      avg_imp_total: 0,
    };
    ageFresh.n += 1;
    ageFresh.declining_n += normalized.trend_direction === "down" ? 1 : 0;
    ageFresh.avg_ai_pct_total += normalized.ai_traffic_pct;
    ageFresh.avg_ctr_pct_total += normalized.ctr;
    ageFresh.avg_health_total += healthScore;
    ageFresh.avg_imp_total += impressions90;
    ageFreshnessMap.set(ageFreshKey, ageFresh);

    const wpKey = `${normalized.word_count_tier}::${normalized.position_tier}`;
    const wp = wordPositionMap.get(wpKey) ?? { word_count_tier: normalized.word_count_tier, position_tier: normalized.position_tier, n: 0, avg_ctr_pct_total: 0, avg_health_total: 0, avg_impressions_total: 0 };
    wp.n += 1;
    wp.avg_ctr_pct_total += normalized.ctr;
    wp.avg_health_total += healthScore;
    wp.avg_impressions_total += impressions90;
    wordPositionMap.set(wpKey, wp);

    const comp = competitionMap.get(normalized.competition_level) ?? { competition_level: normalized.competition_level, n: 0, avg_ai_pct_total: 0, avg_ctr_pct_total: 0, avg_health_total: 0, avg_imp_total: 0, avg_pos_total: 0, declining_n: 0, growing_n: 0 };
    comp.n += 1;
    comp.avg_ai_pct_total += normalized.ai_traffic_pct;
    comp.avg_ctr_pct_total += normalized.ctr;
    comp.avg_health_total += healthScore;
    comp.avg_imp_total += impressions90;
    comp.avg_pos_total += normalized.avg_position;
    comp.declining_n += normalized.trend_direction === "down" ? 1 : 0;
    comp.growing_n += normalized.trend_direction === "up" ? 1 : 0;
    competitionMap.set(normalized.competition_level, comp);

    const svBucket = searchVolumeBucket(normalized.search_volume);
    const sv = svMap.get(svBucket) ?? { sv_bucket: svBucket, n: 0, avg_clicks_total: 0, avg_ctr_pct_total: 0, avg_health_total: 0, avg_imp_total: 0, avg_pos_total: 0, declining: 0, growing: 0, avg_sv_total: 0 };
    sv.n += 1;
    sv.avg_clicks_total += clicks90;
    sv.avg_ctr_pct_total += normalized.ctr;
    sv.avg_health_total += healthScore;
    sv.avg_imp_total += impressions90;
    sv.avg_pos_total += normalized.avg_position;
    sv.growing += normalized.trend_direction === "up" ? 1 : 0;
    sv.declining += normalized.trend_direction === "down" ? 1 : 0;
    sv.avg_sv_total += normalized.search_volume;
    svMap.set(svBucket, sv);

    const model = modelMap.get(normalized.model_used) ?? { model_used: normalized.model_used, n: 0, avg_age_total: 0, avg_ctr_pct_total: 0, avg_health_total: 0, avg_imp_total: 0, avg_pos_total: 0 };
    model.n += 1;
    model.avg_age_total += normalized.content_age_days;
    model.avg_ctr_pct_total += normalized.ctr;
    model.avg_health_total += healthScore;
    model.avg_imp_total += impressions90;
    model.avg_pos_total += normalized.avg_position;
    modelMap.set(normalized.model_used, model);

    const goldenBucket = ageGoldenBucket(normalized.content_age_days);
    const golden = ageGoldenMap.get(goldenBucket) ?? { age_bucket: goldenBucket, n: 0, avg_ctr_pct_total: 0, avg_health_total: 0, avg_imp_total: 0 };
    golden.n += 1;
    golden.avg_ctr_pct_total += normalized.ctr;
    golden.avg_health_total += healthScore;
    golden.avg_imp_total += impressions90;
    ageGoldenMap.set(goldenBucket, golden);

    const flagCount =
      Number(normalized.needs_indexing) +
      Number(normalized.is_quick_win) +
      Number(normalized.needs_ctr_fix) +
      Number(normalized.needs_engagement_fix) +
      Number(normalized.ai_opportunity) +
      Number(normalized.is_underperformer) +
      Number(normalized.is_declining) +
      Number(normalized.is_initial_refresh_candidate);
    const flag = flagStackMap.get(String(flagCount)) ?? { flag_count: flagCount, n: 0, avg_health_total: 0, avg_imp_total: 0, avg_pos_total: 0 };
    flag.n += 1;
    flag.avg_health_total += healthScore;
    flag.avg_imp_total += impressions90;
    flag.avg_pos_total += normalized.avg_position;
    flagStackMap.set(String(flagCount), flag);

    const visibility = visibilityBucket(normalized.days_with_impressions);
    const vis = visibilityMap.get(visibility) ?? { visibility_bucket: visibility, n: 0, avg_ctr_pct_total: 0, avg_health_total: 0, avg_imp_total: 0, avg_pos_total: 0, declining: 0, growing: 0 };
    vis.n += 1;
    vis.avg_ctr_pct_total += normalized.ctr;
    vis.avg_health_total += healthScore;
    vis.avg_imp_total += impressions90;
    vis.avg_pos_total += normalized.avg_position;
    vis.declining += normalized.trend_direction === "down" ? 1 : 0;
    vis.growing += normalized.trend_direction === "up" ? 1 : 0;
    visibilityMap.set(visibility, vis);

    const intentCompKey = `${normalized.main_intent}::${normalized.competition_level}`;
    const intentComp = intentCompMap.get(intentCompKey) ?? { main_intent: normalized.main_intent, competition_level: normalized.competition_level, n: 0, avg_health_total: 0, avg_imp_total: 0, avg_pos_total: 0 };
    intentComp.n += 1;
    intentComp.avg_health_total += healthScore;
    intentComp.avg_imp_total += impressions90;
    intentComp.avg_pos_total += normalized.avg_position;
    intentCompMap.set(intentCompKey, intentComp);

    const wcMyth = wordCountMythMap.get(normalized.word_count_tier) ?? { wc_bucket: normalized.word_count_tier, n: 0, avg_ctr_pct_total: 0, avg_health_total: 0, avg_imp_total: 0, avg_pos_total: 0 };
    wcMyth.n += 1;
    wcMyth.avg_ctr_pct_total += normalized.ctr;
    wcMyth.avg_health_total += healthScore;
    wcMyth.avg_imp_total += impressions90;
    wcMyth.avg_pos_total += normalized.avg_position;
    wordCountMythMap.set(normalized.word_count_tier, wcMyth);

    const aiPenKey = `${normalized.age_tier}::${normalized.model_used}`;
    const aiPen = mythAiPenalizedMap.get(aiPenKey) ?? { age_tier: normalized.age_tier, model_used: normalized.model_used, n: 0, avg_health_total: 0, avg_imp_total: 0, avg_pos_total: 0 };
    aiPen.n += 1;
    aiPen.avg_health_total += healthScore;
    aiPen.avg_imp_total += impressions90;
    aiPen.avg_pos_total += normalized.avg_position;
    mythAiPenalizedMap.set(aiPenKey, aiPen);

    const posBucket = normalized.position_tier;
    const posMyth = mythPositionMap.get(posBucket) ?? { pos_bucket: posBucket, n: 0, total_clicks: 0, total_imp: 0, total_sessions: 0, avg_ctr_pct_total: 0, avg_health_total: 0 };
    posMyth.n += 1;
    posMyth.total_clicks += clicks90;
    posMyth.total_imp += impressions90;
    posMyth.total_sessions += sessions90;
    posMyth.avg_ctr_pct_total += normalized.ctr;
    posMyth.avg_health_total += healthScore;
    mythPositionMap.set(posBucket, posMyth);

    const freshnessExpandedTier = expandedFreshness(normalized.days_since_update);
    const freshCtrlKey = `${freshnessExpandedTier}::${normalized.word_count_tier}`;
    const freshCtrl = freshnessControlledMap.get(freshCtrlKey) ?? { freshness_tier: freshnessExpandedTier, word_count_tier: normalized.word_count_tier, n: 0, avg_health_total: 0, avg_imp_total: 0, avg_pos_total: 0 };
    freshCtrl.n += 1;
    freshCtrl.avg_health_total += healthScore;
    freshCtrl.avg_imp_total += impressions90;
    freshCtrl.avg_pos_total += normalized.avg_position;
    freshnessControlledMap.set(freshCtrlKey, freshCtrl);

    const mythSv = mythSvMap.get(svBucket) ?? { sv_bucket: svBucket, n: 0, avg_health_total: 0, avg_imp_total: 0, avg_pos_total: 0, avg_sv_total: 0 };
    mythSv.n += 1;
    mythSv.avg_health_total += healthScore;
    mythSv.avg_imp_total += impressions90;
    mythSv.avg_pos_total += normalized.avg_position;
    mythSv.avg_sv_total += normalized.search_volume;
    mythSvMap.set(svBucket, mythSv);

    const freshDecayKey = expandedFreshness(normalized.days_since_update);
    const freshDecay = freshnessDecayMap.get(freshDecayKey) ?? { freshness_bucket: freshDecayKey, n: 0, avg_health_total: 0, avg_imp_total: 0 };
    freshDecay.n += 1;
    freshDecay.avg_health_total += healthScore;
    freshDecay.avg_imp_total += impressions90;
    freshnessDecayMap.set(freshDecayKey, freshDecay);
  });

  const recent90Map = new Map(featureRows.map((row) => [`${row.client_id}:${row.content_id}`, row]));

  let queryRowCount = 0;
  let queryHistoryStart = "";
  let queryHistoryEnd = "";
  await streamNdjsonGz(queryHistorySource, async (row) => {
    queryRowCount += 1;
    const firstSeen = String(row.first_seen_date ?? "");
    const lastSeen = String(row.last_seen_date ?? "");
    if (firstSeen && (!queryHistoryStart || firstSeen < queryHistoryStart)) queryHistoryStart = firstSeen;
    if (lastSeen && (!queryHistoryEnd || lastSeen > queryHistoryEnd)) queryHistoryEnd = lastSeen;
  });

  const healthDistribution = ["healthy", "moderate", "poor"].map((band) => {
    const row = healthDistMap.get(band) ?? { health_band: band, content_count: 0, impressions_90d: 0, clicks_90d: 0, sessions_90d: 0, avg_score_total: 0 };
    return {
      health_band: band,
      content_count: row.content_count,
      impressions_90d: row.impressions_90d,
      clicks_90d: row.clicks_90d,
      sessions_90d: row.sessions_90d,
      avg_score: avg(row.avg_score_total, row.content_count, 1),
    };
  });

  const ageTierOrder = ["0-14", "15-30", "31-90", "91-180", "181-365", "365+"];
  const freshnessOrder = ["0-30", "31-90", "91-180", "181+"];
  const expandedFreshnessOrder = ["0-30", "31-90", "91-180", "181-360", "361+"];
  const positionOrder = ["top_3", "page_1", "striking", "page_3_5", "deep", "no_data"];
  const trendOrder = ["up", "flat", "down", "new"];
  const wordTierOrder = ["<1000", "1000-2000", "2000-3500", "3500+"];
  const ageGoldenOrder = ["0-14", "15-30", "31-60", "61-90", "91-180", "181-270", "271-365", "365+"];
  const competitionOrder = ["LOW", "MEDIUM", "HIGH", "UNKNOWN"];
  const visibilityOrder = ["consistent (80+ days)", "frequent (50-79 days)", "intermittent (20-49 days)", "sporadic (<20 days)"];

  const ageTiers = sortBy([...ageTiersMap.values()].map((row) => ({
    age_tier: row.age_tier,
    content_count: row.content_count,
    impressions_90d: row.impressions_90d,
    clicks_90d: row.clicks_90d,
    sessions_90d: row.sessions_90d,
    ai_sessions_90d: row.ai_sessions_90d,
    avg_ctr: pct(row.clicks_90d, row.impressions_90d, 2),
    avg_health_score: avg(row.avg_health_score_total, row.content_count, 1),
  })), "age_tier", ageTierOrder);

  const freshnessTiers = sortBy([...freshnessTiersMap.values()].map((row) => ({
    freshness_tier: row.freshness_tier,
    content_count: row.content_count,
    impressions_90d: row.impressions_90d,
    sessions_90d: row.sessions_90d,
    avg_ctr: pct(row.clicks_90d, row.impressions_90d, 2),
    avg_health_score: avg(row.avg_health_score_total, row.content_count, 1),
    declining_count: row.declining_count,
  })), "freshness_tier", freshnessOrder);

  const positionDistribution = sortBy([...positionDistMap.values()].map((row) => ({
    position_tier: row.position_tier,
    content_count: row.content_count,
    impressions_90d: row.impressions_90d,
    clicks_90d: row.clicks_90d,
    avg_ctr: pct(row.clicks_90d, row.impressions_90d, 3),
    avg_health: avg(row.avg_health_total, row.content_count, 1),
  })), "position_tier", positionOrder);

  const trendDistribution = sortBy([...trendDistMap.values()].map((row) => ({
    trend_direction: row.trend_direction,
    content_count: row.content_count,
    impressions_90d: row.impressions_90d,
    avg_trend_pct: avg(row.avg_trend_pct_total, row.content_count, 1),
  })), "trend_direction", trendOrder);

  const cannibalization = {
    total_cannibalized_queries: cannibalizationClient.reduce((sum, row) => sum + num(row.true_cannibalization_count), 0),
    total_cannibalized_impressions: cannibalizationClient.reduce((sum, row) => sum + num(row.cannibalized_impressions), 0),
    total_cannibalized_clicks: cannibalizationClient.reduce((sum, row) => sum + num(row.cannibalized_clicks), 0),
    clients_with_cannibalization: cannibalizationClient.filter((row) => num(row.true_cannibalization_count) > 0).length,
    critical_count: cannibalizationClient.reduce((sum, row) => sum + num(row.critical_count), 0),
    high_count: cannibalizationClient.reduce((sum, row) => sum + num(row.high_count), 0),
    medium_count: cannibalizationClient.reduce((sum, row) => sum + num(row.medium_count), 0),
    low_count: cannibalizationClient.reduce((sum, row) => sum + num(row.low_count), 0),
  };

  const optimizationActions = [...new Map(optimizationQueue.map((row) => [row.action_type, row])).values()].map((row) => {
    const matching = optimizationQueue.filter((candidate) => candidate.action_type === row.action_type);
    return {
      action_type: row.action_type,
      content_count: matching.length,
      avg_priority: avg(matching.reduce((sum, candidate) => sum + num(candidate.priority_score), 0), matching.length, 1),
    };
  }).sort((a, b) => b.content_count - a.content_count);

  const optimizationFlags = [...new Map(optimizationFlagsSource.map((row) => [row.optimization_status, row.optimization_status])).keys()].map((status) => {
    const matching = optimizationFlagsSource.filter((row) => row.optimization_status === status);
    return {
      optimization_status: status,
      content_count: matching.length,
      impressions_30d: matching.reduce((sum, row) => sum + num(row.imp_30), 0),
      clicks_30d: matching.reduce((sum, row) => sum + num(row.clicks_30), 0),
    };
  }).sort((a, b) => b.content_count - a.content_count);

  const indexingState = [
    { status: "confirmed_indexed", content_count: featureRows.filter((row) => !row.needs_indexing).length },
    { status: "never_indexed", content_count: featureRows.filter((row) => row.needs_indexing).length },
  ];

  const revenue = totalRevenueRows[0] ?? {
    revenue_30d: 0,
    revenue_prev_30d: 0,
    revenue_90d: 0,
    trend_30d: "flat",
    active_clients_90d: 0,
  };

  const corrGrowingDeclining = [...lifecycleMap.values()].map((row) => ({
    trend_direction: row.trend_direction,
    n: row.n,
    avg_word_count: avg(row.avg_word_count_total, row.n, 0),
    avg_age_days: avg(row.avg_age_days_total, row.n, 0),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
    avg_pos: avg(row.avg_pos_total, row.n, 1),
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_ctr_pct: avg(row.avg_ctr_pct_total, row.n, 2),
    avg_ai_pct: avg(row.avg_ai_pct_total, row.n, 2),
    avg_scroll_pct: avg(row.avg_scroll_pct_total, row.n, 2),
    avg_engage_pct: avg(row.avg_engage_pct_total, row.n, 2),
    avg_days_since_update: avg(row.avg_days_since_update_total, row.n, 0),
  })).sort((a, b) => trendOrder.indexOf(a.trend_direction) - trendOrder.indexOf(b.trend_direction));

  const corrFreshnessTrend = sortBy([...freshTrendMap.values()].map((row) => ({
    freshness_tier: row.freshness_tier,
    trend_direction: row.trend_direction,
    n: row.n,
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_impressions: avg(row.avg_impressions_total, row.n, 1),
    avg_trend_pct: avg(row.avg_trend_pct_total, row.n, 1),
  })), "freshness_tier", freshnessOrder).sort((a, b) => {
    const fd = freshnessOrder.indexOf(a.freshness_tier) - freshnessOrder.indexOf(b.freshness_tier);
    if (fd !== 0) return fd;
    return trendOrder.indexOf(a.trend_direction) - trendOrder.indexOf(b.trend_direction);
  });

  const corrEngagementMatrix = [...engagementMatrixMap.values()].map((row) => ({
    scroll_bucket: row.scroll_bucket,
    engage_bucket: row.engage_bucket,
    n: row.n,
    avg_ai_pct: avg(row.avg_ai_pct_total, row.n, 2),
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
    avg_pos: avg(row.avg_pos_total, row.n, 1),
  }));

  const corrAiVsTraditional = ["high_ai", "some_ai", "no_ai"].map((bucket) => {
    const row = aiVsTraditionalMap.get(bucket) ?? { ai_bucket: bucket, n: 0, avg_age_total: 0, avg_ctr_pct_total: 0, avg_engage_pct_total: 0, avg_health_total: 0, avg_imp_total: 0, avg_pos_total: 0, avg_scroll_pct_total: 0 };
    return {
      ai_bucket: bucket,
      n: row.n,
      avg_age: avg(row.avg_age_total, row.n, 1),
      avg_ctr_pct: avg(row.avg_ctr_pct_total, row.n, 2),
      avg_engage_pct: avg(row.avg_engage_pct_total, row.n, 2),
      avg_health: avg(row.avg_health_total, row.n, 1),
      avg_imp: avg(row.avg_imp_total, row.n, 1),
      avg_pos: avg(row.avg_pos_total, row.n, 1),
      avg_scroll_pct: avg(row.avg_scroll_pct_total, row.n, 2),
    };
  });

  const corrAgeFreshnessMatrix = sortBy([...ageFreshnessMap.values()].map((row) => ({
    age_tier: row.age_tier,
    freshness_tier: row.freshness_tier,
    n: row.n,
    declining_n: row.declining_n,
    decline_rate_pct: pct(row.declining_n, row.n, 1),
    avg_ai_pct: avg(row.avg_ai_pct_total, row.n, 2),
    avg_ctr_pct: avg(row.avg_ctr_pct_total, row.n, 2),
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
  })), "age_tier", ageTierOrder).sort((a, b) => {
    const ad = ageTierOrder.indexOf(a.age_tier) - ageTierOrder.indexOf(b.age_tier);
    if (ad !== 0) return ad;
    return expandedFreshnessOrder.indexOf(a.freshness_tier) - expandedFreshnessOrder.indexOf(b.freshness_tier);
  });

  const corrWordcountPosition = sortBy([...wordPositionMap.values()].map((row) => ({
    word_count_tier: row.word_count_tier,
    position_tier: row.position_tier,
    n: row.n,
    avg_ctr_pct: avg(row.avg_ctr_pct_total, row.n, 2),
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_impressions: avg(row.avg_impressions_total, row.n, 1),
  })), "word_count_tier", wordTierOrder).sort((a, b) => {
    const wd = wordTierOrder.indexOf(a.word_count_tier) - wordTierOrder.indexOf(b.word_count_tier);
    if (wd !== 0) return wd;
    return positionOrder.indexOf(a.position_tier) - positionOrder.indexOf(b.position_tier);
  });

  const corrCompetition = sortBy([...competitionMap.values()].map((row) => ({
    competition_level: row.competition_level,
    n: row.n,
    avg_ai_pct: avg(row.avg_ai_pct_total, row.n, 2),
    avg_ctr_pct: avg(row.avg_ctr_pct_total, row.n, 2),
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
    avg_pos: avg(row.avg_pos_total, row.n, 1),
    declining_n: row.declining_n,
    growing_n: row.growing_n,
  })), "competition_level", competitionOrder);

  const hypSearchVolume = sortBy([...svMap.values()].map((row) => ({
    sv_bucket: row.sv_bucket,
    n: row.n,
    avg_clicks: avg(row.avg_clicks_total, row.n, 2),
    avg_ctr_pct: avg(row.avg_ctr_pct_total, row.n, 2),
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
    avg_pos: avg(row.avg_pos_total, row.n, 1),
    growing: row.growing,
    declining: row.declining,
  })), "sv_bucket", ["0", "1-100", "100-1K", "1K-10K", "10K+"]);

  const hypModel = [...modelMap.values()].map((row) => ({
    model_used: row.model_used,
    n: row.n,
    avg_age: avg(row.avg_age_total, row.n, 1),
    avg_ctr_pct: avg(row.avg_ctr_pct_total, row.n, 2),
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
    avg_pos: avg(row.avg_pos_total, row.n, 1),
  })).sort((a, b) => b.n - a.n);

  const hypAgeGolden = sortBy([...ageGoldenMap.values()].map((row) => ({
    age_bucket: row.age_bucket,
    n: row.n,
    avg_ctr_pct: avg(row.avg_ctr_pct_total, row.n, 2),
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
  })), "age_bucket", ageGoldenOrder);

  const hypFlagStacking = [...flagStackMap.values()].map((row) => ({
    flag_count: row.flag_count,
    n: row.n,
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
    avg_pos: avg(row.avg_pos_total, row.n, 1),
  })).sort((a, b) => a.flag_count - b.flag_count);

  const hypVisibility = sortBy([...visibilityMap.values()].map((row) => ({
    visibility_bucket: row.visibility_bucket,
    n: row.n,
    avg_ctr_pct: avg(row.avg_ctr_pct_total, row.n, 2),
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
    avg_pos: avg(row.avg_pos_total, row.n, 1),
    declining: row.declining,
    growing: row.growing,
  })), "visibility_bucket", visibilityOrder);

  const hypIntentComp = [...intentCompMap.values()].map((row) => ({
    main_intent: row.main_intent,
    competition_level: row.competition_level,
    n: row.n,
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
    avg_pos: avg(row.avg_pos_total, row.n, 1),
  })).sort((a, b) => b.avg_health - a.avg_health);

  const rawRevenueByAttributes = [...revenueByAttrMap.values()].map((row) => ({
    content_type: row.content_type,
    main_intent: row.main_intent,
    content_count: row.content_count,
    landing_sessions: row.landing_sessions,
    purchases: row.purchases,
    total_revenue: round(row.total_revenue, 2),
    conversion_rate: pct(row.purchases, row.landing_sessions, 2),
    rev_per_session: safeDiv(row.total_revenue, row.landing_sessions, 2),
  })).sort((a, b) => b.total_revenue - a.total_revenue);

  const rawAiConversion = [...aiRevenueBuckets.values()].map((row) => ({
    ai_bucket: row.ai_bucket,
    content_count: row.content_count,
    landing_sessions: row.landing_sessions,
    purchases: row.purchases,
    revenue: round(row.revenue, 2),
    conversion_rate: pct(row.purchases, row.landing_sessions, 2),
  }));

  const rawPercentiles = [
    ["health_score", featureRows.map((row) => row.health_score)],
    ["impressions_90d", featureRows.map((row) => row.impressions_90d)],
    ["sessions_90d", featureRows.map((row) => row.sessions_90d)],
  ].map(([metric, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const pick = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))] ?? 0;
    return {
      metric,
      p10: round(pick(0.1), 2),
      p25: round(pick(0.25), 2),
      p50: round(pick(0.5), 2),
      p75: round(pick(0.75), 2),
      p90: round(pick(0.9), 2),
    };
  });

  const rawCorrelations = {
    health_imp: pearson(correlationVectors.health, correlationVectors.imp),
    health_clicks: pearson(correlationVectors.health, correlationVectors.clicks),
    health_sessions: pearson(correlationVectors.health, correlationVectors.sessions),
    health_ai: pearson(correlationVectors.health, correlationVectors.ai),
    health_age: pearson(correlationVectors.health, correlationVectors.age),
    health_wc: pearson(correlationVectors.health, correlationVectors.wc),
    health_sv: pearson(correlationVectors.health, correlationVectors.sv),
    imp_sessions: pearson(correlationVectors.imp, correlationVectors.sessions),
    imp_clicks: pearson(correlationVectors.imp, correlationVectors.clicks),
    imp_ai: pearson(correlationVectors.imp, correlationVectors.ai),
    imp_age: pearson(correlationVectors.imp, correlationVectors.age),
    imp_wc: pearson(correlationVectors.imp, correlationVectors.wc),
    clicks_ai: pearson(correlationVectors.clicks, correlationVectors.ai),
    clicks_sessions: pearson(correlationVectors.clicks, correlationVectors.sessions),
    age_wc: pearson(correlationVectors.age, correlationVectors.wc),
    age_sv: pearson(correlationVectors.age, correlationVectors.sv),
    wc_sv: pearson(correlationVectors.wc, correlationVectors.sv),
  };

  const sortedByHealth = [...featureRows].sort((a, b) => b.health_score - a.health_score);
  const decileSize = Math.max(1, Math.floor(sortedByHealth.length * 0.1));
  const topDecile = sortedByHealth.slice(0, decileSize);
  const bottomDecile = sortedByHealth.slice(-decileSize);
  const summarizeDecile = (label: string, rows: AnyRow[]) => ({
    decile: label,
    n: rows.length,
    avg_health: avg(rows.reduce((sum, row) => sum + row.health_score, 0), rows.length, 1),
    avg_imp: avg(rows.reduce((sum, row) => sum + row.impressions_90d, 0), rows.length, 1),
    avg_clicks: avg(rows.reduce((sum, row) => sum + row.clicks_90d, 0), rows.length, 2),
    avg_sessions: avg(rows.reduce((sum, row) => sum + row.sessions_90d, 0), rows.length, 2),
    avg_ai: avg(rows.reduce((sum, row) => sum + row.ai_sessions_90d, 0), rows.length, 2),
    avg_words: avg(rows.reduce((sum, row) => sum + row.word_count, 0), rows.length, 0),
    avg_age: avg(rows.reduce((sum, row) => sum + row.content_age_days, 0), rows.length, 0),
    avg_freshness: avg(rows.reduce((sum, row) => sum + row.days_since_update, 0), rows.length, 0),
    avg_pos: avg(rows.reduce((sum, row) => sum + row.avg_position, 0), rows.length, 1),
    avg_ctr_pct: avg(rows.reduce((sum, row) => sum + row.ctr, 0), rows.length, 2),
  });
  topBottomRows.push(summarizeDecile("top_10pct", topDecile));
  topBottomRows.push(summarizeDecile("bottom_10pct", bottomDecile));

  const timePublicationTimeline = [...publicationTimelineMap.values()]
    .sort((a, b) => String(a.month).localeCompare(String(b.month)))
    .map((row) => {
      const current = pubNowMap.get(row.month) ?? { avg_imp_total: 0, avg_health_total: 0, count: row.published };
      return {
        month: row.month,
        published: row.published,
        avg_health_now: avg(current.avg_health_total, current.count, 1),
        avg_imp_now: avg(current.avg_imp_total, current.count, 1),
      };
    });

  const timeFreshnessDecay = sortBy([...freshnessDecayMap.values()].map((row) => ({
    freshness_bucket: row.freshness_bucket,
    n: row.n,
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
  })), "freshness_bucket", ["0-30", "31-90", "91-180", "181-360", "361+"]);

  const mythWordcountContinuous = sortBy([...wordCountMythMap.values()].map((row) => ({
    wc_bucket: row.wc_bucket,
    n: row.n,
    avg_ctr_pct: avg(row.avg_ctr_pct_total, row.n, 2),
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
    avg_pos: avg(row.avg_pos_total, row.n, 1),
  })), "wc_bucket", wordTierOrder);

  const mythAiPenalized = [...mythAiPenalizedMap.values()].map((row) => ({
    age_tier: row.age_tier,
    model_used: row.model_used,
    n: row.n,
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
    avg_pos: avg(row.avg_pos_total, row.n, 1),
  })).sort((a, b) => b.n - a.n);

  const mythPosition1Value = sortBy([...mythPositionMap.values()].map((row) => ({
    pos_bucket: row.pos_bucket,
    n: row.n,
    total_clicks: row.total_clicks,
    total_imp: row.total_imp,
    total_sessions: row.total_sessions,
    avg_ctr_pct: avg(row.avg_ctr_pct_total, row.n, 3),
    avg_health: avg(row.avg_health_total, row.n, 1),
  })), "pos_bucket", positionOrder);

  const mythFreshnessControlled = sortBy([...freshnessControlledMap.values()].map((row) => ({
    freshness_tier: row.freshness_tier,
    word_count_tier: row.word_count_tier,
    n: row.n,
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
    avg_pos: avg(row.avg_pos_total, row.n, 1),
  })), "freshness_tier", expandedFreshnessOrder).sort((a, b) => {
    const fd = expandedFreshnessOrder.indexOf(a.freshness_tier) - expandedFreshnessOrder.indexOf(b.freshness_tier);
    if (fd !== 0) return fd;
    return wordTierOrder.indexOf(a.word_count_tier) - wordTierOrder.indexOf(b.word_count_tier);
  });

  const mythSvImpressions = sortBy([...mythSvMap.values()].map((row) => ({
    sv_bucket: row.sv_bucket,
    n: row.n,
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp_90d: avg(row.avg_imp_total, row.n, 1),
    avg_pos: avg(row.avg_pos_total, row.n, 1),
    avg_sv: avg(row.avg_sv_total, row.n, 1),
    impression_to_sv_ratio: safeDiv(avg(row.avg_imp_total, row.n, 1), avg(row.avg_sv_total, row.n, 1), 2),
  })), "sv_bucket", ["0", "1-100", "100-1K", "1K-10K", "10K+"]);

  const mythPublishVelocity = clientRowsSorted.map((row) => {
    const velocity = pubVelocityMap.get(String(row.client_handle ?? row.client_id)) ?? { total_content: num(row.total_content), published_last_30d: 0, published_last_90d: 0 };
    return {
      client_handle: row.client_handle,
      total_content: velocity.total_content,
      published_last_30d: velocity.published_last_30d,
      published_last_90d: velocity.published_last_90d,
      total_imp: num(row.total_impressions),
      avg_imp: safeDiv(num(row.total_impressions), velocity.total_content, 1),
      avg_health: num(row.avg_health_score),
    };
  }).sort((a, b) => b.total_imp - a.total_imp);

  const rawTrafficMixMap = new Map<string, AnyRow>();
  const dayOfWeekMap = new Map<number, AnyRow>();
  for (const row of ga4Rows) {
    const clientId = urlClientMap.get(normalizeUrl(row.url));
    if (!clientId) continue;
    const mix = rawTrafficMixMap.get(clientId) ?? {
      client_id: clientId,
      organic: 0,
      referral: 0,
      direct: 0,
      paid: 0,
      social: 0,
      ai: 0,
      total_sessions: 0,
    };
    mix.organic += num(row.sessions_organic);
    mix.referral += num(row.sessions_referral);
    mix.direct += num(row.sessions_direct);
    mix.ai += num(row.sessions_from_ai);
    mix.total_sessions += num(row.distinct_sessions);
    rawTrafficMixMap.set(clientId, mix);

    const date = new Date(`${row.event_date}T00:00:00Z`);
    const dow = date.getUTCDay();
    const current = dayOfWeekMap.get(dow) ?? {
      dow,
      day_name: date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
      observations: 0,
      avg_sessions_total: 0,
      avg_ai_total: 0,
      avg_impressions_total: 0,
      avg_clicks_total: 0,
    };
    current.observations += 1;
    current.avg_sessions_total += num(row.distinct_sessions);
    current.avg_ai_total += num(row.sessions_from_ai);
    dayOfWeekMap.set(dow, current);
  }
  const rawTrafficMix = [...rawTrafficMixMap.values()];
  const clientHealthMap = new Map(clientRowsSorted.map((row) => [String(row.client_id), num(row.avg_health_score)]));
  const rawTrafficDiversification = [1, 2, 3, 4].map((diversity) => {
    const matching = rawTrafficMix.filter((row) => ["organic", "referral", "direct", "ai"].filter((key) => num(row[key]) > 0).length === diversity);
    return {
      diversity,
      n: matching.length,
      avg_sessions: avg(matching.reduce((sum, row) => sum + num(row.total_sessions), 0), matching.length, 1),
      avg_health: avg(matching.reduce((sum, row) => sum + (clientHealthMap.get(String(row.client_id)) ?? 0), 0), matching.length, 1),
    };
  }).filter((row) => row.n > 0);

  const rawDayOfWeek = [...dayOfWeekMap.values()]
    .sort((a, b) => a.dow - b.dow)
    .map((row) => ({
      dow: row.dow,
      day_name: row.day_name,
      observations: row.observations,
      avg_sessions: avg(row.avg_sessions_total, row.observations, 1),
      avg_ai_sessions: avg(row.avg_ai_total, row.observations, 2),
      avg_impressions: 0,
      avg_clicks: 0,
    }));

  const rawScrollPosition = [...engagementMatrixMap.values()].map((row) => ({
    position_tier: "mixed",
    scroll_bucket: row.scroll_bucket,
    n: row.n,
    avg_ctr_pct: 0,
    avg_health: avg(row.avg_health_total, row.n, 1),
    avg_imp: avg(row.avg_imp_total, row.n, 1),
  }));

  const rawEngagementTimeHealth = ["healthy", "moderate", "poor"].map((bucket) => {
    const matching = featureRows.filter((row) => row.health_label === bucket);
    return {
      health_bucket: bucket,
      content_count: matching.length,
      avg_engagement_sec: avg(matching.reduce((sum, row) => sum + row.engagement_rate, 0), matching.length, 2),
      avg_scroll: avg(matching.reduce((sum, row) => sum + row.scroll_rate, 0), matching.length, 2),
      avg_sessions: avg(matching.reduce((sum, row) => sum + row.sessions_90d, 0), matching.length, 2),
    };
  });

  const sampleEvery = Math.max(1, Math.floor(featureRows.length / 3000));
  const featureVectorSample = featureRows.filter((_, index) => index % sampleEvery === 0).slice(0, 3000);

  writeWrapped(join(DATA, "portfolio-overview.json"), [portfolioOverview]);
  writeWrapped(join(DATA, "client-scorecard.json"), clientScorecard);
  writeWrapped(join(DATA, "dashboard-trends.json"), dashboardTrends);
  writeWrapped(join(DATA, "ai-monthly.json"), aiMonthly);
  writeWrapped(join(DATA, "ai-daily-breakdown.json"), aiDailyRecent30);
  writeWrapped(join(DATA, "health-distribution.json"), healthDistribution);
  writeWrapped(join(DATA, "age-tiers.json"), ageTiers);
  writeWrapped(join(DATA, "freshness-tiers.json"), freshnessTiers);
  writeWrapped(join(DATA, "position-distribution.json"), positionDistribution);
  writeWrapped(join(DATA, "trend-distribution.json"), trendDistribution);
  writeWrapped(join(DATA, "cannibalization.json"), [cannibalization]);
  writeWrapped(join(DATA, "optimization-actions.json"), optimizationActions);
  writeWrapped(join(DATA, "optimization-flags.json"), optimizationFlags);
  writeWrapped(join(DATA, "indexing-state.json"), indexingState);
  writeWrapped(join(DATA, "revenue.json"), [revenue]);
  writeWrapped(join(DATA, "full-history-coverage.json"), [fullCoverage]);
  writeWrapped(join(DATA, "full-history-client-scorecard.json"), fullClientScorecard);
  writeWrapped(join(DATA, "full-history-monthly-trends.json"), fullMonthlyTrends);
  writeWrapped(join(DATA, "corr-growing-vs-declining-profile.json"), corrGrowingDeclining);
  writeWrapped(join(DATA, "corr-freshness-trend.json"), corrFreshnessTrend);
  writeWrapped(join(DATA, "corr-engagement-matrix.json"), corrEngagementMatrix);
  writeWrapped(join(DATA, "corr-ai-vs-traditional.json"), corrAiVsTraditional);
  writeWrapped(join(DATA, "corr-age-freshness-matrix.json"), corrAgeFreshnessMatrix);
  writeWrapped(join(DATA, "corr-wordcount-position.json"), corrWordcountPosition);
  writeWrapped(join(DATA, "corr-type-intent-health.json"), []);
  writeWrapped(join(DATA, "corr-decline-risk-clusters.json"), []);
  writeWrapped(join(DATA, "corr-competition-performance.json"), corrCompetition);
  writeWrapped(join(DATA, "hyp-search-volume-success.json"), hypSearchVolume);
  writeWrapped(join(DATA, "hyp-model-performance.json"), hypModel);
  writeWrapped(join(DATA, "hyp-age-golden-zone.json"), hypAgeGolden);
  writeWrapped(join(DATA, "hyp-backlinks-performance.json"), []);
  writeWrapped(join(DATA, "hyp-flag-stacking.json"), hypFlagStacking);
  writeWrapped(join(DATA, "hyp-visibility-consistency.json"), hypVisibility);
  writeWrapped(join(DATA, "hyp-intent-competition.json"), hypIntentComp);
  writeWrapped(join(DATA, "hyp-ctr-position-curve.json"), []);

  writeWrapped(join(V2, "raw-traffic-mix.json"), rawTrafficMix);
  writeWrapped(join(V2, "raw-revenue-by-attributes.json"), rawRevenueByAttributes);
  writeWrapped(join(V2, "raw-ai-conversion.json"), rawAiConversion);
  writeWrapped(join(V2, "raw-engagement-time-health.json"), rawEngagementTimeHealth);
  writeWrapped(join(V2, "raw-cannibalization-detail.json"), []);
  writeWrapped(join(V2, "raw-dayofweek.json"), rawDayOfWeek);
  writeWrapped(join(V2, "raw-scroll-vs-position.json"), rawScrollPosition);
  writeWrapped(join(V2, "raw-traffic-diversification.json"), rawTrafficDiversification);
  writeWrapped(join(V2, "raw-percentiles.json"), rawPercentiles);
  writeWrapped(join(V2, "raw-correlations.json"), [rawCorrelations]);
  writeWrapped(join(V2, "raw-top-bottom-decile.json"), topBottomRows);
  writeWrapped(join(V2, "time-monthly-trends.json"), fullMonthlyTrends);
  writeWrapped(join(V2, "time-publication-timeline.json"), timePublicationTimeline);
  writeWrapped(join(V2, "time-freshness-decay.json"), timeFreshnessDecay);
  writeWrapped(join(V2, "myth-wordcount-continuous.json"), mythWordcountContinuous);
  writeWrapped(join(V2, "myth-ai-penalized.json"), mythAiPenalized);
  writeWrapped(join(V2, "myth-position1-value.json"), mythPosition1Value);
  writeWrapped(join(V2, "myth-freshness-controlled.json"), mythFreshnessControlled);
  writeWrapped(join(V2, "myth-sv-vs-impressions.json"), mythSvImpressions);
  writeWrapped(join(V2, "myth-backlinks-competition.json"), []);
  writeWrapped(join(V2, "myth-publish-velocity.json"), mythPublishVelocity);
  writeWrapped(join(V2, "raw-feature-vector-full.json"), featureRows);
  writeWrapped(join(V2, "raw-feature-vector.json"), featureVectorSample);

  writeRaw(join(V2, "raw-feature-vector-full-history.manifest.json"), {
    generated_at: new Date().toISOString(),
    history_mode: fullCoverage.history_mode ?? "full_available_warehouse_history",
    history_start: fullCoverage.oldest_date,
    history_end: fullCoverage.newest_date,
    active_days: num(fullCoverage.active_days),
    row_count: pageRowCount,
    source_export: "data/exports/full-history/page-level-content-summary.ndjson.gz",
  });
  writeRaw(join(V2, "raw-query-history-full.manifest.json"), {
    generated_at: new Date().toISOString(),
    history_mode: "full_available_query_history",
    history_start: queryHistoryStart,
    history_end: queryHistoryEnd,
    active_days: 0,
    row_count: queryRowCount,
    source_export: `data/exports/query-history/${preferredQueryRun}/query-history.ndjson.gz`,
  });
  writeRaw(join(V2, "export-manifest.json"), {
    generated_at: new Date().toISOString(),
    source: "normalized_export_bundle",
    preferred_query_run: preferredQueryRun,
    full_history_page_window: {
      history_mode: fullCoverage.history_mode ?? "full_available_warehouse_history",
      history_start: fullCoverage.oldest_date,
      history_end: fullCoverage.newest_date,
      active_days: num(fullCoverage.active_days),
      row_count: pageRowCount,
    },
    full_history_query_window: {
      history_mode: "full_available_query_history",
      history_start: queryHistoryStart,
      history_end: queryHistoryEnd,
      row_count: queryRowCount,
    },
    exports_root: "data/exports",
  });

  console.log("Hydrated canonical paper inputs from export bundle.");
  console.log(`  Active feature rows: ${featureRows.length}`);
  console.log(`  Page-history rows: ${pageRowCount}`);
  console.log(`  Query-history rows: ${queryRowCount}`);
  console.log(`  Preferred query run: ${preferredQueryRun}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
