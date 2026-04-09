#!/usr/bin/env bun
/**
 * Exports full available history into durable local paper-creator files.
 *
 * Important:
 * - "Full history" for page-level metrics means the full available warehouse history in BigQuery.
 * - Query-level history is exported from the raw Search Console datasets and can have a different coverage window.
 * - Large raw artifacts are written as gzip-compressed NDJSON instead of pretty JSON blobs.
 */

import { createWriteStream, mkdirSync, writeFileSync } from "fs";
import { once } from "events";
import { join } from "path";
import { createGzip } from "zlib";
import { NativeReadonlyBigQueryClient } from "./native-readonly-bq";

const BASE = import.meta.dir;
const DATA = join(BASE, "data");
const V2 = join(DATA, "v2");

const PROJECT = process.env.BIGQUERY_MCP_PROJECT_ID || "gsc-bigquery-project-447113";
const DATASET = process.env.BIGQUERY_CENTRAL_DATASET_ID || "central_data_warehouse";
const START_ALL = "2020-01-01";
const QUERY_DATASET_PREFIX = "searchconsole_";
const QUERY_EXPORT_PATH = "data/v2/raw-query-history-full.ndjson.gz";
const PAGE_EXPORT_PATH = "data/v2/raw-feature-vector-full-history.ndjson.gz";

const client = new NativeReadonlyBigQueryClient();

type ArtifactRecord = {
  path: string;
  kind: string;
  row_count?: number;
  bytes?: number;
};

const artifacts: ArtifactRecord[] = [];

function table(name: string) {
  return `\`${PROJECT}.${DATASET}.${name}\``;
}

function wrap(rows: any[]) {
  return {
    row_count: rows.length,
    rows,
    errors: [],
    job_complete: true,
  };
}

function writeWrapped(pathname: string, rows: any[]) {
  const abs = join(BASE, pathname);
  mkdirSync(join(abs, ".."), { recursive: true });
  const payload = JSON.stringify(wrap(rows), null, 2);
  writeFileSync(abs, payload);
  artifacts.push({ path: pathname, kind: "wrapped_json", row_count: rows.length, bytes: Buffer.byteLength(payload) });
  console.log(`wrote ${pathname} (${rows.length} rows)`);
}

function writeRaw(pathname: string, payload: any) {
  const abs = join(BASE, pathname);
  mkdirSync(join(abs, ".."), { recursive: true });
  const body = JSON.stringify(payload, null, 2);
  writeFileSync(abs, body);
  const rowCount = typeof payload?.row_count === "number" ? payload.row_count : undefined;
  artifacts.push({ path: pathname, kind: "raw_json", row_count: rowCount, bytes: Buffer.byteLength(body) });
  console.log(`wrote ${pathname}`);
}

async function query(sql: string): Promise<any[]> {
  return client.query(sql);
}

function normalizeUrlSql(expr: string): string {
  return `LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(${expr}, r'^https?://(www\\\\.)?', ''), r'[#?].*$', ''), r'/$', ''))`;
}

async function writeNdjsonGz(pathname: string, rows: any[]): Promise<void> {
  const abs = join(BASE, pathname);
  mkdirSync(join(abs, ".."), { recursive: true });
  const gzip = createGzip({ level: 6 });
  const out = createWriteStream(abs);
  gzip.pipe(out);

  for (const row of rows) {
    if (!gzip.write(`${JSON.stringify(row)}\n`)) {
      await once(gzip, "drain");
    }
  }
  gzip.end();
  await once(out, "finish");
  artifacts.push({ path: pathname, kind: "ndjson_gzip", row_count: rows.length });
  console.log(`wrote ${pathname} (${rows.length} rows)`);
}

async function streamNdjsonGzRows(
  pathname: string,
  rowsByBatch: AsyncGenerator<any[], void, void>
): Promise<number> {
  const abs = join(BASE, pathname);
  mkdirSync(join(abs, ".."), { recursive: true });
  const gzip = createGzip({ level: 6 });
  const out = createWriteStream(abs);
  gzip.pipe(out);

  let rowCount = 0;
  for await (const rows of rowsByBatch) {
    for (const row of rows) {
      rowCount += 1;
      if (!gzip.write(`${JSON.stringify(row)}\n`)) {
        await once(gzip, "drain");
      }
    }
  }

  gzip.end();
  await once(out, "finish");
  artifacts.push({ path: pathname, kind: "ndjson_gzip", row_count: rowCount });
  console.log(`wrote ${pathname} (${rowCount} rows)`);
  return rowCount;
}

async function discoverQueryDatasets(): Promise<string[]> {
  const rows = await query(`
    SELECT table_schema AS dataset_name
    FROM \`region-us\`.INFORMATION_SCHEMA.TABLES
    WHERE table_catalog = '${PROJECT}'
      AND table_name = 'searchdata_url_impression'
      AND STARTS_WITH(table_schema, '${QUERY_DATASET_PREFIX}')
    ORDER BY table_schema
  `);

  return rows.map((row) => String(row.dataset_name));
}

async function* exportQueryHistoryBatches(
  historyStart: string,
  historyEnd: string,
  queryCoverage: {
    min_date: string | null;
    max_date: string | null;
    active_days: number;
    datasets_with_rows: number;
  }
): AsyncGenerator<any[], void, void> {
  const datasets = await discoverQueryDatasets();
  console.log(`query-history datasets discovered: ${datasets.length}`);

  let minDate: string | null = null;
  let maxDate: string | null = null;
  let activeDatasetCount = 0;

  for (const datasetName of datasets) {
    const rows = await query(`
      WITH content_urls AS (
        SELECT DISTINCT
          client_id,
          client_handle,
          content_id,
          content_title,
          content_handle,
          keyword AS primary_keyword,
          COALESCE(search_volume, 0) AS search_volume,
          COALESCE(word_count, 0) AS word_count,
          COALESCE(main_intent, 'unknown') AS main_intent,
          ${normalizeUrlSql("public_url")} AS normalized_url
        FROM ${table("all_content_data")}
        WHERE public_url IS NOT NULL
      )
      SELECT
        '${datasetName}' AS query_dataset,
        c.client_id,
        c.client_handle,
        c.content_id,
        c.content_title,
        c.content_handle,
        c.primary_keyword,
        c.search_volume,
        c.word_count,
        c.main_intent,
        q.query,
        MIN(q.data_date) AS first_seen_date,
        MAX(q.data_date) AS last_seen_date,
        COUNT(DISTINCT q.data_date) AS days_active,
        SUM(q.impressions) AS impressions_all,
        SUM(q.clicks) AS clicks_all,
        ROUND(SAFE_DIVIDE(SUM(q.clicks) * 100, NULLIF(SUM(q.impressions), 0)), 4) AS ctr_all,
        ROUND(SAFE_DIVIDE(SUM(q.sum_position), NULLIF(SUM(q.impressions), 0)), 4) AS avg_position_all,
        SUM(IF(q.data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY), q.impressions, 0)) AS impressions_recent,
        SUM(IF(q.data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY), q.clicks, 0)) AS clicks_recent,
        ROUND(
          SAFE_DIVIDE(
            SUM(IF(q.data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY), q.clicks, 0)) * 100,
            NULLIF(SUM(IF(q.data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY), q.impressions, 0)), 0)
          ),
          4
        ) AS ctr_recent,
        ROUND(
          SAFE_DIVIDE(
            SUM(IF(q.data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY), q.sum_position, 0)),
            NULLIF(SUM(IF(q.data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY), q.impressions, 0)), 0)
          ),
          4
        ) AS avg_position_recent,
        DATE('${historyStart}') AS page_history_start,
        DATE('${historyEnd}') AS page_history_end
      FROM \`${PROJECT}.${datasetName}.searchdata_url_impression\` q
      JOIN content_urls c
        ON ${normalizeUrlSql("q.url")} = c.normalized_url
      WHERE q.data_date BETWEEN DATE('${START_ALL}') AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
        AND q.search_type = 'WEB'
        AND q.url IS NOT NULL
        AND q.query IS NOT NULL
        AND q.impressions > 0
      GROUP BY
        query_dataset,
        c.client_id,
        c.client_handle,
        c.content_id,
        c.content_title,
        c.content_handle,
        c.primary_keyword,
        c.search_volume,
        c.word_count,
        c.main_intent,
        q.query,
        page_history_start,
        page_history_end
      ORDER BY c.client_id, c.content_id
    `);

    if (!rows.length) {
      console.log(`query-history: ${datasetName} -> 0 matched content-query rows`);
      continue;
    }

    activeDatasetCount += 1;
    const batchMin = String(rows[0].first_seen_date);
    const batchMax = String(rows[0].last_seen_date);
    minDate = !minDate || batchMin < minDate ? batchMin : minDate;
    maxDate = !maxDate || batchMax > maxDate ? batchMax : maxDate;
    console.log(`query-history: ${datasetName} -> ${rows.length} matched content-query rows`);
    yield rows;
  }

  queryCoverage.min_date = minDate;
  queryCoverage.max_date = maxDate;
  queryCoverage.active_days =
    minDate && maxDate
      ? Math.max(
          0,
          Math.round(
            (new Date(`${maxDate}T00:00:00Z`).getTime() - new Date(`${minDate}T00:00:00Z`).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        )
      : 0;
  queryCoverage.datasets_with_rows = activeDatasetCount;
}

async function main() {
  mkdirSync(DATA, { recursive: true });
  mkdirSync(V2, { recursive: true });

  console.log(
    `Exporting full available history (${client.usedReadonlyCredentials ? "dedicated read-only credentials" : "fallback credentials + read-only SQL guardrails"})`
  );

  const [coverage] = await query(`
    WITH perf AS (
      SELECT
        MIN(report_date) AS oldest_date,
        MAX(report_date) AS newest_date,
        COUNT(DISTINCT report_date) AS active_days,
        COUNT(DISTINCT client_id) AS clients_with_perf,
        COUNT(DISTINCT content_id) AS content_with_perf,
        SUM(gsc_impressions) AS total_impressions,
        SUM(gsc_clicks) AS total_clicks,
        SUM(ga4_sessions) AS total_sessions,
        SUM(sessions_ai) AS total_ai_sessions
      FROM ${table("daily_content_performance")}
      WHERE report_date BETWEEN DATE('${START_ALL}') AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    ),
    rev AS (
      SELECT
        SUM(purchase_revenue) AS total_revenue,
        SUM(landing_sessions) AS landing_sessions,
        SUM(purchase_count) AS purchases,
        COUNT(DISTINCT IF(purchase_revenue > 0, client_id, NULL)) AS revenue_clients
      FROM ${table("daily_content_revenue")}
      WHERE report_date BETWEEN DATE('${START_ALL}') AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    ),
    inventory AS (
      SELECT
        COUNT(*) AS client_count,
        SUM(total_content) AS total_content_inventory
      FROM ${table("v_client_scorecard")}
      WHERE client_id IS NOT NULL
    )
    SELECT
      'full_available_warehouse_history' AS history_mode,
      perf.oldest_date,
      perf.newest_date,
      perf.active_days,
      inventory.client_count,
      inventory.total_content_inventory,
      perf.clients_with_perf,
      perf.content_with_perf,
      perf.total_impressions,
      perf.total_clicks,
      perf.total_sessions,
      perf.total_ai_sessions,
      rev.total_revenue,
      rev.landing_sessions,
      rev.purchases,
      rev.revenue_clients
    FROM perf, rev, inventory
  `);

  writeWrapped("data/full-history-coverage.json", [coverage]);

  const historyStart = String(coverage.oldest_date);
  const historyEnd = String(coverage.newest_date);

  const clientScorecard = await query(`
    WITH perf AS (
      SELECT
        client_id,
        MIN(report_date) AS oldest_date,
        MAX(report_date) AS newest_date,
        COUNT(DISTINCT report_date) AS active_days,
        COUNT(DISTINCT content_id) AS content_with_perf,
        SUM(gsc_impressions) AS total_impressions,
        SUM(gsc_clicks) AS total_clicks,
        SUM(ga4_sessions) AS total_sessions,
        SUM(sessions_ai) AS total_ai_sessions
      FROM ${table("daily_content_performance")}
      WHERE report_date BETWEEN DATE('${historyStart}') AND DATE('${historyEnd}')
      GROUP BY 1
    ),
    rev AS (
      SELECT
        client_id,
        SUM(landing_sessions) AS landing_sessions,
        SUM(purchase_count) AS purchases,
        SUM(purchase_revenue) AS total_revenue
      FROM ${table("daily_content_revenue")}
      WHERE report_date BETWEEN DATE('${historyStart}') AND DATE('${historyEnd}')
      GROUP BY 1
    )
    SELECT
      s.client_id,
      s.client_handle,
      s.client_name,
      s.domain,
      'full_available_warehouse_history' AS history_mode,
      DATE('${historyStart}') AS history_start,
      DATE('${historyEnd}') AS history_end,
      perf.oldest_date,
      perf.newest_date,
      perf.active_days,
      s.total_content AS total_content_inventory,
      perf.content_with_perf,
      perf.total_impressions,
      perf.total_clicks,
      perf.total_sessions,
      perf.total_ai_sessions,
      ROUND(SAFE_DIVIDE(perf.total_clicks * 100, NULLIF(perf.total_impressions, 0)), 4) AS overall_ctr,
      ROUND(SAFE_DIVIDE(perf.total_ai_sessions * 100, NULLIF(perf.total_sessions, 0)), 4) AS ai_traffic_pct,
      ROUND(s.avg_health_score, 1) AS current_avg_health_score,
      COALESCE(rev.landing_sessions, 0) AS landing_sessions,
      COALESCE(rev.purchases, 0) AS purchases,
      ROUND(COALESCE(rev.total_revenue, 0), 2) AS total_revenue
    FROM ${table("v_client_scorecard")} s
    LEFT JOIN perf USING (client_id)
    LEFT JOIN rev USING (client_id)
    WHERE s.client_id IS NOT NULL
    ORDER BY perf.total_impressions DESC, s.client_id
  `);
  writeWrapped("data/full-history-client-scorecard.json", clientScorecard);

  const monthlyTrends = await query(`
    SELECT
      'full_available_warehouse_history' AS history_mode,
      FORMAT_DATE('%Y-%m', report_date) AS month,
      SUM(gsc_impressions) AS impressions,
      SUM(gsc_clicks) AS clicks,
      SUM(ga4_sessions) AS sessions,
      SUM(sessions_ai) AS ai_sessions,
      COUNT(DISTINCT IF(gsc_impressions > 0 OR ga4_sessions > 0 OR sessions_ai > 0, content_id, NULL)) AS active_content
    FROM ${table("daily_content_performance")}
    WHERE report_date BETWEEN DATE('${historyStart}') AND DATE('${historyEnd}')
    GROUP BY 1, 2
    ORDER BY month
  `);
  writeWrapped("data/full-history-monthly-trends.json", monthlyTrends);

  const contentSummary = await query(`
    WITH perf AS (
      SELECT
        client_id,
        content_id,
        MIN(report_date) AS first_seen_date,
        MAX(report_date) AS last_seen_date,
        COUNT(DISTINCT report_date) AS active_days,
        COUNT(DISTINCT IF(gsc_impressions > 0, report_date, NULL)) AS days_with_impressions_all,
        COUNT(DISTINCT IF(ga4_sessions > 0, report_date, NULL)) AS days_with_sessions_all,
        SUM(gsc_impressions) AS impressions_all,
        SUM(gsc_clicks) AS clicks_all,
        SUM(gsc_sum_position) AS sum_position_all,
        SUM(ga4_pageviews) AS pageviews_all,
        SUM(ga4_sessions) AS sessions_all,
        SUM(ga4_users) AS users_all,
        SUM(ga4_engaged_sessions) AS engaged_sessions_all,
        SUM(ga4_total_engagement_sec) AS total_engagement_sec_all,
        SUM(sessions_ai) AS ai_sessions_all,
        SUM(scroll_events) AS scroll_events_all
      FROM ${table("daily_content_performance")}
      WHERE report_date BETWEEN DATE('${historyStart}') AND DATE('${historyEnd}')
      GROUP BY 1, 2
    ),
    rev AS (
      SELECT
        client_id,
        content_id,
        SUM(landing_sessions) AS landing_sessions_all,
        SUM(purchase_count) AS purchases_all,
        SUM(purchase_revenue) AS revenue_all
      FROM ${table("daily_content_revenue")}
      WHERE report_date BETWEEN DATE('${historyStart}') AND DATE('${historyEnd}')
      GROUP BY 1, 2
    ),
    recent AS (
      SELECT
        client_id,
        content_id,
        age_tier,
        freshness_tier,
        health_score,
        trend_direction,
        impressions_90d,
        clicks_90d,
        sessions_90d,
        ai_sessions_90d,
        avg_position,
        ctr
      FROM ${table("v_content_90d_age_summary")}
    )
    SELECT
      c.client_id,
      c.client_handle,
      c.content_id,
      c.content_title,
      c.content_handle,
      c.public_url,
      c.keyword,
      COALESCE(c.search_volume, 0) AS search_volume,
      COALESCE(c.competition, 0) AS competition,
      c.competition_level,
      COALESCE(c.cpc, 0) AS cpc,
      c.content_type,
      c.main_intent,
      c.provider_used,
      c.model_used,
      COALESCE(c.word_count, 0) AS word_count,
      COALESCE(c.char_count, 0) AS char_count,
      DATE(c.content_created_at) AS content_created_at,
      DATE(c.content_updated_at) AS content_updated_at,
      DATE_DIFF(CURRENT_DATE(), DATE(c.content_created_at), DAY) AS content_age_days,
      DATE_DIFF(CURRENT_DATE(), DATE(COALESCE(c.content_updated_at, c.content_created_at)), DAY) AS days_since_update,
      DATE('${historyStart}') AS history_start,
      DATE('${historyEnd}') AS history_end,
      perf.first_seen_date,
      perf.last_seen_date,
      perf.active_days,
      COALESCE(perf.days_with_impressions_all, 0) AS days_with_impressions_all,
      COALESCE(perf.days_with_sessions_all, 0) AS days_with_sessions_all,
      COALESCE(perf.impressions_all, 0) AS impressions_all,
      COALESCE(perf.clicks_all, 0) AS clicks_all,
      COALESCE(perf.pageviews_all, 0) AS pageviews_all,
      COALESCE(perf.sessions_all, 0) AS sessions_all,
      COALESCE(perf.users_all, 0) AS users_all,
      COALESCE(perf.engaged_sessions_all, 0) AS engaged_sessions_all,
      COALESCE(perf.ai_sessions_all, 0) AS ai_sessions_all,
      ROUND(SAFE_DIVIDE(perf.clicks_all * 100, NULLIF(perf.impressions_all, 0)), 4) AS ctr_all,
      ROUND(SAFE_DIVIDE(perf.sum_position_all, NULLIF(perf.impressions_all, 0)), 4) AS avg_position_all,
      ROUND(SAFE_DIVIDE(perf.engaged_sessions_all * 100, NULLIF(perf.sessions_all, 0)), 4) AS engagement_rate_all,
      ROUND(SAFE_DIVIDE(perf.scroll_events_all * 100, NULLIF(perf.sessions_all, 0)), 4) AS scroll_rate_all,
      ROUND(SAFE_DIVIDE(perf.ai_sessions_all * 100, NULLIF(perf.sessions_all, 0)), 4) AS ai_traffic_pct_all,
      ROUND(SAFE_DIVIDE(perf.total_engagement_sec_all, NULLIF(perf.sessions_all, 0)), 4) AS avg_engagement_sec_all,
      COALESCE(rev.landing_sessions_all, 0) AS landing_sessions_all,
      COALESCE(rev.purchases_all, 0) AS purchases_all,
      ROUND(COALESCE(rev.revenue_all, 0), 2) AS revenue_all,
      recent.age_tier,
      recent.freshness_tier,
      COALESCE(recent.health_score, 0) AS health_score_recent,
      recent.trend_direction,
      COALESCE(recent.impressions_90d, 0) AS impressions_90d,
      COALESCE(recent.clicks_90d, 0) AS clicks_90d,
      COALESCE(recent.sessions_90d, 0) AS sessions_90d,
      COALESCE(recent.ai_sessions_90d, 0) AS ai_sessions_90d,
      recent.avg_position AS avg_position_recent,
      recent.ctr AS ctr_recent
    FROM ${table("all_content_data")} c
    LEFT JOIN perf
      ON perf.client_id = c.client_id
     AND perf.content_id = c.content_id
    LEFT JOIN rev
      ON rev.client_id = c.client_id
     AND rev.content_id = c.content_id
    LEFT JOIN recent
      ON recent.client_id = c.client_id
     AND recent.content_id = c.content_id
    WHERE c.client_id IS NOT NULL
    ORDER BY c.client_id, c.content_id
  `);

  await writeNdjsonGz(PAGE_EXPORT_PATH, contentSummary);
  writeRaw("data/v2/raw-feature-vector-full-history.manifest.json", {
    history_mode: "full_available_warehouse_history",
    history_start: historyStart,
    history_end: historyEnd,
    row_count: contentSummary.length,
    format: "ndjson.gz",
    source_tables: [
      `${PROJECT}.${DATASET}.all_content_data`,
      `${PROJECT}.${DATASET}.daily_content_performance`,
      `${PROJECT}.${DATASET}.daily_content_revenue`,
      `${PROJECT}.${DATASET}.v_content_90d_age_summary`,
    ],
    generated_at: new Date().toISOString(),
  });

  const queryCoverage = {
    min_date: null as string | null,
    max_date: null as string | null,
    active_days: 0,
    datasets_with_rows: 0,
  };
  const queryRowCount = await streamNdjsonGzRows(
    QUERY_EXPORT_PATH,
    exportQueryHistoryBatches(historyStart, historyEnd, queryCoverage)
  );

  writeRaw("data/v2/raw-query-history-full.manifest.json", {
    history_mode: "full_available_query_history",
    history_start: queryCoverage.min_date,
    history_end: queryCoverage.max_date,
    active_days: queryCoverage.active_days,
    datasets_with_rows: queryCoverage.datasets_with_rows,
    row_count: queryRowCount,
    format: "ndjson.gz",
    source_tables: ["region-us.INFORMATION_SCHEMA.TABLES", `${PROJECT}.searchconsole_*.searchdata_url_impression`, `${PROJECT}.${DATASET}.all_content_data`],
    generated_at: new Date().toISOString(),
  });

  writeRaw("data/v2/export-manifest.json", {
    generated_at: new Date().toISOString(),
    used_readonly_credentials: client.usedReadonlyCredentials,
    full_history_page_window: {
      history_mode: "full_available_warehouse_history",
      history_start: historyStart,
      history_end: historyEnd,
      active_days: coverage.active_days,
    },
    full_history_query_window: {
      history_mode: "full_available_query_history",
      history_start: queryCoverage.min_date,
      history_end: queryCoverage.max_date,
      active_days: queryCoverage.active_days,
      datasets_with_rows: queryCoverage.datasets_with_rows,
    },
    artifacts,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
