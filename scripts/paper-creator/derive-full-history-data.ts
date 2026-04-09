#!/usr/bin/env bun
/**
 * Reads compressed full-history exports and produces compact, validated
 * aggregates for the paper build.
 */

import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { createGunzip } from "zlib";
import readline from "readline";

const BASE = import.meta.dir;
const DATA = join(BASE, "data");
const V2 = join(DATA, "v2");
const EXPORTS = join(DATA, "exports");

const PAGE_MANIFEST = join(V2, "raw-feature-vector-full-history.manifest.json");
const QUERY_MANIFEST = join(V2, "raw-query-history-full.manifest.json");
const EXPORT_MANIFEST = join(V2, "export-manifest.json");

function resolveRawExport(kind: "page" | "query") {
  if (kind === "page") {
    const local = join(V2, "raw-feature-vector-full-history.ndjson.gz");
    if (existsSync(local)) return local;
    return join(EXPORTS, "full-history", "page-level-content-summary.ndjson.gz");
  }

  const local = join(V2, "raw-query-history-full.ndjson.gz");
  if (existsSync(local)) return local;

  const exportBundleManifest = JSON.parse(readFileSync(join(EXPORTS, "manifests", "export-bundle-manifest.json"), "utf8"));
  const preferredRun = exportBundleManifest?.structure?.query_history?.preferred_run;
  if (!preferredRun) {
    throw new Error("Missing preferred query-history run in export bundle manifest.");
  }
  return join(EXPORTS, "query-history", preferredRun, "query-history.ndjson.gz");
}

const PAGE_EXPORT = resolveRawExport("page");
const QUERY_EXPORT = resolveRawExport("query");

function readJson(pathname: string) {
  return JSON.parse(readFileSync(pathname, "utf8"));
}

function safeNum(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pct(numerator: number, denominator: number, digits = 2) {
  if (!denominator) return 0;
  return round((numerator / denominator) * 100, digits);
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

function bucketSearchVolume(volume: number): string | null {
  if (volume < 1) return null;
  if (volume < 100) return "1-100";
  if (volume < 1000) return "100-1K";
  if (volume < 10000) return "1K-10K";
  return "10K+";
}

const WORD_BUCKET_ORDER = ["<1K", "1K-1.5K", "1.5K-2K", "2K-2.5K", "2.5K-3.5K", "3.5K-5K", "5K+"];
const SEARCH_VOLUME_ORDER = ["1-100", "100-1K", "1K-10K", "10K+"];
const INTENT_ORDER = ["informational", "commercial", "transactional", "navigational", "unknown"];

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function classifyQueryMatch(primaryKeyword: string | null | undefined, query: string | null | undefined) {
  const primary = normalizeText(primaryKeyword);
  const candidate = normalizeText(query);
  if (!primary || !candidate) {
    return { bucket: "off_target", similarity_score: 0 };
  }
  if (primary === candidate) {
    return { bucket: "exact_match", similarity_score: 1 };
  }

  const primaryTokens = new Set(primary.split(" ").filter(Boolean));
  const candidateTokens = new Set(candidate.split(" ").filter(Boolean));
  const intersection = [...primaryTokens].filter((token) => candidateTokens.has(token)).length;
  const union = new Set([...primaryTokens, ...candidateTokens]).size;
  const jaccard = union ? intersection / union : 0;
  const contains = candidate.includes(primary) || primary.includes(candidate);

  if (contains || jaccard >= 0.5) {
    return { bucket: "close_match", similarity_score: round(Math.max(jaccard, contains ? 0.85 : 0), 4) };
  }
  return { bucket: "off_target", similarity_score: round(jaccard, 4) };
}

async function streamGzipNdjson(pathname: string, onRow: (row: any) => void | Promise<void>) {
  const stream = createReadStream(pathname).pipe(createGunzip());
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    await onRow(JSON.parse(line));
  }
}

function sortByOrder<T extends Record<string, any>>(rows: T[], key: string, order: string[]) {
  const rank = new Map(order.map((value, index) => [value, index]));
  return [...rows].sort((a, b) => (rank.get(String(a[key])) ?? 999) - (rank.get(String(b[key])) ?? 999));
}

function writeWrapped(pathname: string, rows: any[]) {
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

async function main() {
  for (const required of [PAGE_EXPORT, PAGE_MANIFEST, QUERY_EXPORT, QUERY_MANIFEST, EXPORT_MANIFEST]) {
    if (!existsSync(required)) {
      throw new Error(`Missing required full-history input: ${required}`);
    }
  }

  const pageManifest = readJson(PAGE_MANIFEST);
  const queryManifest = readJson(QUERY_MANIFEST);
  const exportManifest = readJson(EXPORT_MANIFEST);
  const coverage = readJson(join(DATA, "full-history-coverage.json")).rows[0];

  const pageSearchRows: { sv: number; impressions: number }[] = [];
  const pageSearchMap = new Map<string, any>();
  const trafficIntentMap = new Map<string, any>();
  const wordBucketPageMap = new Map<string, any>();
  const aiIntentMap = new Map<string, any>();
  const aiWordBucketMap = new Map<string, any>();
  const pageMetaMap = new Map<
    string,
    {
      primary_keyword: string | null;
      search_volume: number;
      word_count: number;
      char_count: number;
      main_intent: string;
      cpc: number;
      impressions_all: number;
      clicks_all: number;
      sessions_all: number;
      avg_engagement_sec_all: number;
    }
  >();
  const wordEngagementPairs: { word_count: number; avg_engagement_sec_all: number }[] = [];
  const impressionsVsWordsScatterFullHistory: { x: number; y: number; health_label: string }[] = [];
  const clicksVsCharsScatterFullHistory: { x: number; y: number; health_label: string }[] = [];

  await streamGzipNdjson(PAGE_EXPORT, (row) => {
    const searchVolume = safeNum(row.search_volume);
    const impressionsAll = safeNum(row.impressions_all);
    const clicksAll = safeNum(row.clicks_all);
    const sessionsAll = safeNum(row.sessions_all);
    const aiSessionsAll = safeNum(row.ai_sessions_all);
    const avgPositionAll = safeNum(row.avg_position_all);
    const avgEngagementSecAll = safeNum(row.avg_engagement_sec_all);
    const cpc = safeNum(row.cpc);
    const wordBucket = bucketWordCount(safeNum(row.word_count));
    const intent = String(row.main_intent ?? "unknown");
    const contentIdNum = Number(row.content_id);
    const sampleForScatter = Number.isFinite(contentIdNum) && contentIdNum % 389 === 0;
    pageMetaMap.set(`${row.client_id}:${row.content_id}`, {
      primary_keyword: row.primary_keyword ?? row.keyword ?? null,
      search_volume: searchVolume,
      word_count: safeNum(row.word_count),
      char_count: safeNum(row.char_count),
      main_intent: intent,
      cpc,
      impressions_all: impressionsAll,
      clicks_all: clicksAll,
      sessions_all: sessionsAll,
      avg_engagement_sec_all: avgEngagementSecAll,
    });

    if (safeNum(row.word_count) > 0 && avgEngagementSecAll > 0) {
      wordEngagementPairs.push({
        word_count: safeNum(row.word_count),
        avg_engagement_sec_all: avgEngagementSecAll,
      });
    }

    if (sampleForScatter && safeNum(row.word_count) > 0 && impressionsAll > 0) {
      impressionsVsWordsScatterFullHistory.push({
        x: round(Math.log10(1 + safeNum(row.word_count)), 4),
        y: round(Math.log10(1 + impressionsAll), 4),
        traffic_band: impressionsAll >= 5000 ? "high" : impressionsAll >= 500 ? "mid" : "low",
      });
    }
    if (sampleForScatter && safeNum(row.char_count) > 0 && clicksAll > 0) {
      clicksVsCharsScatterFullHistory.push({
        x: round(Math.log10(1 + safeNum(row.char_count)), 4),
        y: round(Math.log10(1 + clicksAll), 4),
        traffic_band: clicksAll >= 20 ? "high" : clicksAll >= 3 ? "mid" : "low",
      });
    }

    const pageBucket = wordBucketPageMap.get(wordBucket) ?? {
      wc_bucket: wordBucket,
      pages: 0,
      total_impressions_all: 0,
      total_clicks_all: 0,
      total_sessions_all: 0,
      total_ai_sessions_all: 0,
      total_engagement_sec_all: 0,
      total_char_count: 0,
    };
    pageBucket.pages += 1;
    pageBucket.total_impressions_all += impressionsAll;
    pageBucket.total_clicks_all += clicksAll;
    pageBucket.total_sessions_all += sessionsAll;
    pageBucket.total_ai_sessions_all += aiSessionsAll;
    pageBucket.total_engagement_sec_all += avgEngagementSecAll;
    pageBucket.total_char_count += safeNum(row.char_count);
    wordBucketPageMap.set(wordBucket, pageBucket);

    const aiIntent = aiIntentMap.get(intent) ?? {
      main_intent: intent,
      pages: 0,
      ai_pages: 0,
      total_ai_sessions: 0,
      total_sessions: 0,
    };
    aiIntent.pages += 1;
    aiIntent.ai_pages += aiSessionsAll > 0 ? 1 : 0;
    aiIntent.total_ai_sessions += aiSessionsAll;
    aiIntent.total_sessions += sessionsAll;
    aiIntentMap.set(intent, aiIntent);

    const aiWord = aiWordBucketMap.get(wordBucket) ?? {
      wc_bucket: wordBucket,
      pages: 0,
      ai_pages: 0,
      total_ai_sessions: 0,
      total_sessions: 0,
      total_impressions_all: 0,
    };
    aiWord.pages += 1;
    aiWord.ai_pages += aiSessionsAll > 0 ? 1 : 0;
    aiWord.total_ai_sessions += aiSessionsAll;
    aiWord.total_sessions += sessionsAll;
    aiWord.total_impressions_all += impressionsAll;
    aiWordBucketMap.set(wordBucket, aiWord);

    const intentBucket = trafficIntentMap.get(intent) ?? {
      main_intent: intent,
      pages: 0,
      pages_with_cpc: 0,
      total_clicks: 0,
      click_equivalent_value: 0,
      impression_equivalent_value: 0,
      weighted_cpc_numerator: 0,
      weighted_cpc_denominator: 0,
    };
    intentBucket.pages += 1;
    intentBucket.total_clicks += clicksAll;
    if (cpc > 0) {
      intentBucket.pages_with_cpc += 1;
      intentBucket.click_equivalent_value += clicksAll * cpc;
      intentBucket.impression_equivalent_value += impressionsAll * cpc;
      intentBucket.weighted_cpc_numerator += clicksAll * cpc;
      intentBucket.weighted_cpc_denominator += clicksAll;
    }
    trafficIntentMap.set(intent, intentBucket);

    if (searchVolume > 0) {
      pageSearchRows.push({ sv: searchVolume, impressions: impressionsAll });
      const bucket = bucketSearchVolume(searchVolume);
      if (bucket) {
        const current = pageSearchMap.get(bucket) ?? {
          sv_bucket: bucket,
          n: 0,
          sv_total: 0,
          impressions_total: 0,
          clicks_total: 0,
          avg_pos_total: 0,
          above_volume_count: 0,
        };
        current.n += 1;
        current.sv_total += searchVolume;
        current.impressions_total += impressionsAll;
        current.clicks_total += clicksAll;
        current.avg_pos_total += avgPositionAll;
        current.above_volume_count += impressionsAll > searchVolume ? 1 : 0;
        pageSearchMap.set(bucket, current);
      }
    }
  });

  const pagesAboveVolume = pageSearchRows.filter((row) => row.impressions > row.sv).length;
  const searchVolumeValidationFullHistory = {
    sample_pages: pageSearchRows.length,
    pages_above_volume: pagesAboveVolume,
    pct_above_volume: pct(pagesAboveVolume, pageSearchRows.length, 2),
    raw_correlation: pearson(
      pageSearchRows.map((row) => row.sv),
      pageSearchRows.map((row) => row.impressions)
    ),
    log_correlation: pearson(
      pageSearchRows.map((row) => Math.log10(1 + row.sv)),
      pageSearchRows.map((row) => Math.log10(1 + row.impressions))
    ),
    buckets: sortByOrder(
      Array.from(pageSearchMap.values()).map((row) => ({
        sv_bucket: row.sv_bucket,
        n: row.n,
        avg_sv: round(row.sv_total / row.n, 1),
        avg_imp_all: round(row.impressions_total / row.n, 1),
        avg_clicks_all: round(row.clicks_total / row.n, 2),
        avg_pos_all: round(row.avg_pos_total / row.n, 2),
        pct_above_volume: pct(row.above_volume_count, row.n, 2),
      })),
      "sv_bucket",
      SEARCH_VOLUME_ORDER
    ),
  };

  const trafficValueFullHistory = {
    totalClickEquivalentValue: round(
      Array.from(trafficIntentMap.values()).reduce((total, row) => total + row.click_equivalent_value, 0),
      2
    ),
    totalImpressionEquivalentValue: round(
      Array.from(trafficIntentMap.values()).reduce((total, row) => total + row.impression_equivalent_value, 0),
      2
    ),
    byIntent: sortByOrder(
      Array.from(trafficIntentMap.values()).map((row) => ({
        main_intent: row.main_intent,
        pages: row.pages,
        pages_with_cpc: row.pages_with_cpc,
        total_clicks: row.total_clicks,
        click_equivalent_value: round(row.click_equivalent_value, 2),
        impression_equivalent_value: round(row.impression_equivalent_value, 2),
        weighted_cpc: row.weighted_cpc_denominator
          ? round(row.weighted_cpc_numerator / row.weighted_cpc_denominator, 2)
          : 0,
        captured_click_share_pct: pct(row.click_equivalent_value, row.impression_equivalent_value, 2),
      })),
      "main_intent",
      INTENT_ORDER
    ),
  };

  const wordCountPerformanceFullHistory = sortByOrder(
    Array.from(wordBucketPageMap.values()).map((row) => ({
      wc_bucket: row.wc_bucket,
      pages: row.pages,
      avg_impressions_all: round(row.total_impressions_all / row.pages, 1),
      avg_clicks_all: round(row.total_clicks_all / row.pages, 2),
      avg_sessions_all: round(row.total_sessions_all / row.pages, 2),
      avg_ai_sessions_all: round(row.total_ai_sessions_all / row.pages, 2),
      avg_engagement_sec_all: round(row.total_engagement_sec_all / row.pages, 2),
      avg_char_count: round(row.total_char_count / row.pages, 0),
    })),
    "wc_bucket",
    WORD_BUCKET_ORDER
  );

  const byContent = new Map<string, any>();
  let queryRowCount = 0;

  await streamGzipNdjson(QUERY_EXPORT, (row) => {
    queryRowCount += 1;
    const key = `${row.client_id}:${row.content_id}`;
    const impressionCount = safeNum(row.impressions_all);
    const pageMeta = pageMetaMap.get(key);
    const primaryKeyword = row.primary_keyword ?? pageMeta?.primary_keyword ?? null;
    const searchVolume = safeNum(row.search_volume ?? pageMeta?.search_volume);
    const wordCount = safeNum(row.word_count ?? pageMeta?.word_count);
    const charCount = safeNum(pageMeta?.char_count);
    const mainIntent = row.main_intent ?? pageMeta?.main_intent ?? "unknown";
    const classification = classifyQueryMatch(primaryKeyword, row.query);

    const current = byContent.get(key) ?? {
      client_id: row.client_id,
      client_handle: row.client_handle,
      content_id: row.content_id,
      content_title: row.content_title,
      content_handle: row.content_handle,
      primary_keyword: primaryKeyword,
      search_volume: searchVolume,
      word_count: wordCount,
      char_count: charCount,
      main_intent: mainIntent,
      page_impressions_all: safeNum(pageMeta?.impressions_all),
      page_clicks_all: safeNum(pageMeta?.clicks_all),
      page_sessions_all: safeNum(pageMeta?.sessions_all),
      avg_engagement_sec_all: safeNum(pageMeta?.avg_engagement_sec_all),
      query_count: 0,
      total_query_impressions: 0,
      total_query_clicks: 0,
      exact_match_query_count: 0,
      close_match_query_count: 0,
      off_target_query_count: 0,
      exact_match_impressions: 0,
      close_match_impressions: 0,
      off_target_impressions: 0,
      top_query: null,
      top_query_impressions: 0,
      top_query_clicks: 0,
      top_query_bucket: null,
      top_query_similarity_score: 0,
      first_seen_date: row.first_seen_date,
      last_seen_date: row.last_seen_date,
    };

    current.query_count += 1;
    current.total_query_impressions += impressionCount;
    current.total_query_clicks += safeNum(row.clicks_all);
    if (classification.bucket === "exact_match") {
      current.exact_match_query_count += 1;
      current.exact_match_impressions += impressionCount;
    } else if (classification.bucket === "close_match") {
      current.close_match_query_count += 1;
      current.close_match_impressions += impressionCount;
    } else {
      current.off_target_query_count += 1;
      current.off_target_impressions += impressionCount;
    }

    if (impressionCount > current.top_query_impressions) {
      current.top_query = row.query;
      current.top_query_impressions = impressionCount;
      current.top_query_clicks = safeNum(row.clicks_all);
      current.top_query_bucket = classification.bucket;
      current.top_query_similarity_score = classification.similarity_score;
    }

    current.first_seen_date =
      String(row.first_seen_date) < String(current.first_seen_date) ? row.first_seen_date : current.first_seen_date;
    current.last_seen_date =
      String(row.last_seen_date) > String(current.last_seen_date) ? row.last_seen_date : current.last_seen_date;
    byContent.set(key, current);
  });

  const queryRelevanceByContent = Array.from(byContent.values()).map((row) => ({
    client_id: row.client_id,
    client_handle: row.client_handle,
    content_id: row.content_id,
    content_title: row.content_title,
    content_handle: row.content_handle,
    primary_keyword: row.primary_keyword,
    search_volume: row.search_volume,
    word_count: row.word_count,
    char_count: row.char_count,
    main_intent: row.main_intent,
    page_impressions_all: row.page_impressions_all,
    page_clicks_all: row.page_clicks_all,
    page_sessions_all: row.page_sessions_all,
    avg_engagement_sec_all: row.avg_engagement_sec_all,
    query_count: row.query_count,
    total_query_impressions: row.total_query_impressions,
    total_query_clicks: row.total_query_clicks,
    exact_match_query_count: row.exact_match_query_count,
    close_match_query_count: row.close_match_query_count,
    off_target_query_count: row.off_target_query_count,
    exact_match_impression_share: pct(row.exact_match_impressions, row.total_query_impressions, 2),
    close_match_impression_share: pct(row.close_match_impressions, row.total_query_impressions, 2),
    off_target_impression_share: pct(row.off_target_impressions, row.total_query_impressions, 2),
    top_query: row.top_query,
    top_query_impressions: row.top_query_impressions,
    top_query_clicks: row.top_query_clicks,
    top_query_bucket: row.top_query_bucket,
    top_query_similarity_score: row.top_query_similarity_score,
    first_seen_date: row.first_seen_date,
    last_seen_date: row.last_seen_date,
  }));

  const queryWordBucketMap = new Map<string, any>();
  for (const row of queryRelevanceByContent) {
    const bucket = bucketWordCount(safeNum(row.word_count));
    const current = queryWordBucketMap.get(bucket) ?? {
      wc_bucket: bucket,
      pages_with_query_data: 0,
      total_query_count: 0,
      exact_share_total: 0,
      close_share_total: 0,
      off_share_total: 0,
      top_query_exact_pages: 0,
      top_query_close_pages: 0,
      top_query_off_pages: 0,
    };
    current.pages_with_query_data += 1;
    current.total_query_count += safeNum(row.query_count);
    current.exact_share_total += safeNum(row.exact_match_impression_share);
    current.close_share_total += safeNum(row.close_match_impression_share);
    current.off_share_total += safeNum(row.off_target_impression_share);
    if (row.top_query_bucket === "exact_match") current.top_query_exact_pages += 1;
    else if (row.top_query_bucket === "close_match") current.top_query_close_pages += 1;
    else current.top_query_off_pages += 1;
    queryWordBucketMap.set(bucket, current);
  }

  const totalQueryImpressions = queryRelevanceByContent.reduce((total, row) => total + safeNum(row.total_query_impressions), 0);
  const totalExactImpressions = queryRelevanceByContent.reduce(
    (total, row) => total + safeNum(row.total_query_impressions) * safeNum(row.exact_match_impression_share) / 100,
    0
  );
  const totalCloseImpressions = queryRelevanceByContent.reduce(
    (total, row) => total + safeNum(row.total_query_impressions) * safeNum(row.close_match_impression_share) / 100,
    0
  );
  const totalOffImpressions = queryRelevanceByContent.reduce(
    (total, row) => total + safeNum(row.total_query_impressions) * safeNum(row.off_target_impression_share) / 100,
    0
  );

  const queryRelevanceSummary = {
    generated_at: new Date().toISOString(),
    coverage: {
      history_mode: queryManifest.history_mode,
      history_start: queryManifest.history_start,
      history_end: queryManifest.history_end,
      active_days: queryManifest.active_days,
      row_count: queryManifest.row_count,
      matched_content_count: queryRelevanceByContent.length,
    },
    overall: {
      pages_with_query_data: queryRelevanceByContent.length,
      avg_query_count: queryRelevanceByContent.length
        ? round(
            queryRelevanceByContent.reduce((total, row) => total + safeNum(row.query_count), 0) / queryRelevanceByContent.length,
            2
          )
        : 0,
      top_query_exact_match_pct: pct(
        queryRelevanceByContent.filter((row) => row.top_query_bucket === "exact_match").length,
        queryRelevanceByContent.length,
        2
      ),
      top_query_close_match_pct: pct(
        queryRelevanceByContent.filter((row) => row.top_query_bucket === "close_match").length,
        queryRelevanceByContent.length,
        2
      ),
      top_query_off_target_pct: pct(
        queryRelevanceByContent.filter((row) => row.top_query_bucket === "off_target").length,
        queryRelevanceByContent.length,
        2
      ),
      impression_share_exact_match: pct(totalExactImpressions, totalQueryImpressions, 2),
      impression_share_close_match: pct(totalCloseImpressions, totalQueryImpressions, 2),
      impression_share_off_target: pct(totalOffImpressions, totalQueryImpressions, 2),
      pages_without_exact_match_query_pct: pct(
        queryRelevanceByContent.filter((row) => safeNum(row.exact_match_query_count) === 0).length,
        queryRelevanceByContent.length,
        2
      ),
    },
    wordBuckets: sortByOrder(
      Array.from(queryWordBucketMap.values()).map((row) => ({
        wc_bucket: row.wc_bucket,
        pages_with_query_data: row.pages_with_query_data,
        avg_query_count: round(row.total_query_count / row.pages_with_query_data, 2),
        avg_exact_impression_share: round(row.exact_share_total / row.pages_with_query_data, 2),
        avg_close_impression_share: round(row.close_share_total / row.pages_with_query_data, 2),
        avg_off_target_impression_share: round(row.off_share_total / row.pages_with_query_data, 2),
        top_query_exact_match_pct: pct(row.top_query_exact_pages, row.pages_with_query_data, 2),
        top_query_close_match_pct: pct(row.top_query_close_pages, row.pages_with_query_data, 2),
        top_query_off_target_pct: pct(row.top_query_off_pages, row.pages_with_query_data, 2),
      })),
      "wc_bucket",
      WORD_BUCKET_ORDER
    ),
  };

  const relevanceBucketsFullHistory = ["exact_match", "close_match", "off_target"].map((bucket) => {
    const rows = queryRelevanceByContent.filter((row) => row.top_query_bucket === bucket);
    return {
      bucket,
      pages: rows.length,
      avg_page_impressions_all: rows.length
        ? round(rows.reduce((total, row) => total + safeNum(row.page_impressions_all), 0) / rows.length, 1)
        : 0,
      avg_page_clicks_all: rows.length
        ? round(rows.reduce((total, row) => total + safeNum(row.page_clicks_all), 0) / rows.length, 2)
        : 0,
      avg_page_sessions_all: rows.length
        ? round(rows.reduce((total, row) => total + safeNum(row.page_sessions_all), 0) / rows.length, 2)
        : 0,
      avg_query_count: rows.length
        ? round(rows.reduce((total, row) => total + safeNum(row.query_count), 0) / rows.length, 2)
        : 0,
      avg_exact_impression_share: rows.length
        ? round(rows.reduce((total, row) => total + safeNum(row.exact_match_impression_share), 0) / rows.length, 2)
        : 0,
      avg_close_impression_share: rows.length
        ? round(rows.reduce((total, row) => total + safeNum(row.close_match_impression_share), 0) / rows.length, 2)
        : 0,
      avg_off_target_impression_share: rows.length
        ? round(rows.reduce((total, row) => total + safeNum(row.off_target_impression_share), 0) / rows.length, 2)
        : 0,
    };
  });

  const longFormAnalysisFullHistory = {
    word_count_vs_engagement_correlation: pearson(
      wordEngagementPairs.map((row) => row.word_count),
      wordEngagementPairs.map((row) => row.avg_engagement_sec_all)
    ),
    word_count_vs_query_count_correlation: pearson(
      queryRelevanceByContent
        .filter((row) => safeNum(row.word_count) > 0 && safeNum(row.query_count) > 0)
        .map((row) => safeNum(row.word_count)),
      queryRelevanceByContent
        .filter((row) => safeNum(row.word_count) > 0 && safeNum(row.query_count) > 0)
        .map((row) => safeNum(row.query_count))
    ),
  };
  const aiFullHistoryByIntent = sortByOrder(
    Array.from(aiIntentMap.values()).map((row) => ({
      main_intent: row.main_intent,
      pages: row.pages,
      ai_pages: row.ai_pages,
      ai_page_pct: pct(row.ai_pages, row.pages, 2),
      total_ai_sessions: row.total_ai_sessions,
      total_sessions: row.total_sessions,
      ai_session_share_pct: pct(row.total_ai_sessions, row.total_sessions, 2),
      avg_ai_sessions: row.pages ? round(row.total_ai_sessions / row.pages, 2) : 0,
    })),
    "main_intent",
    INTENT_ORDER
  );
  const aiFullHistoryByWordBucket = sortByOrder(
    Array.from(aiWordBucketMap.values()).map((row) => ({
      wc_bucket: row.wc_bucket,
      pages: row.pages,
      ai_pages: row.ai_pages,
      ai_page_pct: pct(row.ai_pages, row.pages, 2),
      total_ai_sessions: row.total_ai_sessions,
      total_sessions: row.total_sessions,
      ai_session_share_pct: pct(row.total_ai_sessions, row.total_sessions, 2),
      avg_ai_sessions: row.pages ? round(row.total_ai_sessions / row.pages, 2) : 0,
      avg_impressions_all: row.pages ? round(row.total_impressions_all / row.pages, 1) : 0,
    })),
    "wc_bucket",
    WORD_BUCKET_ORDER
  );

  const fullHistoryDerived = {
    generated_at: new Date().toISOString(),
    pageHistoryWindow: {
      history_mode: pageManifest.history_mode,
      history_start: pageManifest.history_start,
      history_end: pageManifest.history_end,
      row_count: pageManifest.row_count,
      active_days: coverage.active_days,
    },
    searchVolumeValidationFullHistory,
    trafficValueFullHistory,
    wordCountPerformanceFullHistory,
    longFormAnalysisFullHistory,
    relevanceBucketsFullHistory,
    aiFullHistoryByIntent,
    aiFullHistoryByWordBucket,
    impressionsVsWordsScatterFullHistory,
    clicksVsCharsScatterFullHistory,
  };

  writeFileSync(join(DATA, "full-history-derived.json"), JSON.stringify(fullHistoryDerived, null, 2));
  writeWrapped(join(DATA, "query-relevance-by-content.json"), queryRelevanceByContent);
  writeFileSync(join(DATA, "query-relevance-summary.json"), JSON.stringify(queryRelevanceSummary, null, 2));

  const paperInputManifest = {
    generated_at: new Date().toISOString(),
    inputs: [
      { path: "data/portfolio-overview.json", exists: existsSync(join(DATA, "portfolio-overview.json")), mtime: existsSync(join(DATA, "portfolio-overview.json")) ? statSync(join(DATA, "portfolio-overview.json")).mtime.toISOString() : null, kind: "recent_snapshot" },
      { path: "data/dashboard-trends.json", exists: existsSync(join(DATA, "dashboard-trends.json")), mtime: existsSync(join(DATA, "dashboard-trends.json")) ? statSync(join(DATA, "dashboard-trends.json")).mtime.toISOString() : null, kind: "recent_snapshot" },
      { path: "data/full-history-coverage.json", exists: true, mtime: statSync(join(DATA, "full-history-coverage.json")).mtime.toISOString(), kind: "full_history_coverage" },
      { path: "data/full-history-client-scorecard.json", exists: true, mtime: statSync(join(DATA, "full-history-client-scorecard.json")).mtime.toISOString(), kind: "full_history_client_scorecard" },
      { path: "data/full-history-monthly-trends.json", exists: true, mtime: statSync(join(DATA, "full-history-monthly-trends.json")).mtime.toISOString(), kind: "full_history_monthly" },
      { path: PAGE_EXPORT.replace(`${BASE}/`, ""), exists: true, mtime: statSync(PAGE_EXPORT).mtime.toISOString(), kind: "full_history_page_raw", row_count: pageManifest.row_count },
      { path: QUERY_EXPORT.replace(`${BASE}/`, ""), exists: true, mtime: statSync(QUERY_EXPORT).mtime.toISOString(), kind: "full_history_query_raw", row_count: queryManifest.row_count },
      { path: "data/full-history-derived.json", exists: true, mtime: statSync(join(DATA, "full-history-derived.json")).mtime.toISOString(), kind: "derived_full_history" },
      { path: "data/query-relevance-summary.json", exists: true, mtime: statSync(join(DATA, "query-relevance-summary.json")).mtime.toISOString(), kind: "derived_query_summary" },
      { path: "data/query-relevance-by-content.json", exists: true, mtime: statSync(join(DATA, "query-relevance-by-content.json")).mtime.toISOString(), kind: "derived_query_by_content" },
      { path: "data/v2/export-manifest.json", exists: true, mtime: statSync(EXPORT_MANIFEST).mtime.toISOString(), kind: "export_manifest" },
    ],
    windows: {
      page_history: exportManifest.full_history_page_window,
      query_history: exportManifest.full_history_query_window,
    },
  };
  writeFileSync(join(DATA, "paper-input-manifest.json"), JSON.stringify(paperInputManifest, null, 2));

  console.log(`derived full-history aggregates written`);
  console.log(`  page history rows: ${pageManifest.row_count}`);
  console.log(`  query history rows: ${queryRowCount}`);
  console.log(`  query-matched pages: ${queryRelevanceByContent.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
