#!/usr/bin/env bun
/**
 * Refreshes the local paper-creator datasets from BigQuery for all current clients.
 *
 * Scope:
 * - Rewrites the core JSON exports consumed by build-paper-data.ts
 * - Rebuilds the active-content feature vector for all clients dynamically
 * - Keeps the existing local file format: { row_count, rows, errors, job_complete }
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { NativeReadonlyBigQueryClient } from "./native-readonly-bq";

const BASE = import.meta.dir;
const DATA = join(BASE, "data");
const V2 = join(DATA, "v2");

const PROJECT = process.env.BIGQUERY_MCP_PROJECT_ID || "gsc-bigquery-project-447113";
const DATASET = process.env.BIGQUERY_CENTRAL_DATASET_ID || "central_data_warehouse";
const START_ALL = "2020-01-01";

const client = new NativeReadonlyBigQueryClient();

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
  writeFileSync(abs, JSON.stringify(wrap(rows), null, 2));
  console.log(`wrote ${pathname} (${rows.length} rows)`);
}

function writeRaw(pathname: string, payload: any) {
  const abs = join(BASE, pathname);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, JSON.stringify(payload, null, 2));
  console.log(`wrote ${pathname}`);
}

async function query(sql: string): Promise<any[]> {
  return client.query(sql);
}

async function exportQuery(pathname: string, sql: string) {
  console.log(`query -> ${pathname}`);
  const rows = await query(sql);
  writeWrapped(pathname, rows);
}

function sampleRows<T>(rows: T[], maxRows: number): T[] {
  if (rows.length <= maxRows) return rows;
  const keyed = rows.map((row: any, index) => {
    const seed = Number(row.content_id ?? index * 7919);
    const hash = Math.abs((seed * 2654435761) % 2147483647);
    return { row, hash };
  });
  keyed.sort((a, b) => a.hash - b.hash);
  return keyed.slice(0, maxRows).map((item) => item.row);
}

async function refreshFeatureVector() {
  console.log("query -> data/v2/raw-feature-vector-full.json");

  const cols = [
    "client_id",
    "content_id",
    "client_handle",
    "search_volume",
    "competition",
    "competition_level",
    "cpc",
    "content_type",
    "main_intent",
    "content_created_at",
    "content_updated_at",
    "word_count",
    "char_count",
    "model_used",
    "provider_used",
    "impressions_90d",
    "clicks_90d",
    "pageviews_90d",
    "sessions_90d",
    "users_90d",
    "engaged_sessions_90d",
    "ai_sessions_90d",
    "scroll_events_90d",
    "days_with_impressions",
    "days_with_sessions",
    "impressions_last_30d",
    "clicks_last_30d",
    "sessions_last_30d",
    "impressions_prev_30d",
    "clicks_prev_30d",
    "sessions_prev_30d",
    "content_age_days",
    "age_tier",
    "COALESCE(days_since_last_update, 0) AS days_since_update",
    "freshness_tier",
    "word_count_tier",
    "char_count_tier",
    "ctr",
    "avg_position",
    "engagement_rate",
    "scroll_rate",
    "ai_traffic_pct",
    "position_tier",
    "CASE trend_direction WHEN 'up' THEN 1 WHEN 'stable' THEN 0 WHEN 'down' THEN -1 ELSE 0 END AS trend_numeric",
    "CASE WHEN health_score >= 60 THEN 'healthy' WHEN health_score >= 40 THEN 'moderate' ELSE 'poor' END AS health_label",
    "trend_direction",
    "trend_pct",
    "health_score",
    "needs_indexing",
    "is_quick_win",
    "needs_ctr_fix",
    "needs_engagement_fix",
    "ai_opportunity",
    "is_underperformer",
    "is_declining",
    "is_initial_refresh_candidate",
  ].join(",\n      ");

  const rows = await query(`
    SELECT
      ${cols}
    FROM ${table("v_content_90d_age_summary")}
    WHERE impressions_90d > 0
      AND sessions_90d > 0
    ORDER BY client_id, content_id
  `);

  const dedup = new Map<number, any>();
  for (const row of rows) {
    dedup.set(Number(row.content_id), row);
  }

  const fullRows = Array.from(dedup.values()).sort((a, b) => Number(a.content_id) - Number(b.content_id));
  writeRaw("data/v2/raw-feature-vector-full.json", {
    row_count: fullRows.length,
    rows: fullRows,
  });
  writeRaw("data/v2/raw-feature-vector.json", {
    row_count: Math.min(3000, fullRows.length),
    rows: sampleRows(fullRows, 3000),
  });
}

async function main() {
  mkdirSync(DATA, { recursive: true });
  mkdirSync(V2, { recursive: true });
  console.log(
    `Native BigQuery refresh starting (${client.usedReadonlyCredentials ? "dedicated read-only credentials" : "fallback credentials + read-only SQL guardrails"})`
  );

  await exportQuery("data/dim-clients.json", `
    SELECT
      client_id,
      client_handle,
      client_name,
      is_active,
      has_gsc_access,
      has_ga4_access
    FROM ${table("dim_clients")}
    ORDER BY is_active DESC, client_id
  `);

  await exportQuery("data/client-scorecard.json", `
    SELECT
      client_id,
      client_handle,
      client_name,
      domain,
      total_content,
      healthy_content,
      moderate_content,
      poor_content,
      total_impressions,
      total_clicks,
      total_sessions,
      total_ai_sessions,
      avg_health_score,
      overall_ctr,
      ai_traffic_pct
    FROM ${table("v_client_scorecard")}
    WHERE client_id IS NOT NULL
    ORDER BY total_impressions DESC, client_id
  `);

  await exportQuery("data/portfolio-overview.json", `
    SELECT
      COUNT(*) AS client_count,
      SUM(total_content) AS total_content,
      SUM(healthy_content) AS healthy_content,
      SUM(moderate_content) AS moderate_content,
      SUM(poor_content) AS poor_content,
      SUM(total_impressions) AS total_impressions,
      SUM(total_clicks) AS total_clicks,
      SUM(total_sessions) AS total_sessions,
      SUM(total_ai_sessions) AS total_ai_sessions,
      ROUND(SAFE_DIVIDE(SUM(avg_health_score * total_content), SUM(total_content)), 1) AS avg_health_score,
      ROUND(SAFE_DIVIDE(SUM(total_clicks) * 100, SUM(total_impressions)), 2) AS avg_ctr,
      ROUND(SAFE_DIVIDE(SUM(total_ai_sessions) * 100, SUM(total_sessions)), 2) AS avg_ai_traffic_pct,
      SUM(needs_indexing_count) AS needs_indexing,
      SUM(quick_wins_count) AS quick_wins,
      SUM(ctr_fix_count) AS ctr_fix,
      SUM(underperformers_count) AS underperformers
    FROM ${table("v_client_scorecard")}
    WHERE client_id IS NOT NULL
  `);

  await exportQuery("data/dashboard-trends.json", `
    SELECT *
    FROM ${table("view_dashboard_summary")}
    WHERE client_id IS NOT NULL
    ORDER BY gsc_impressions_30d DESC, client_id
  `);

  await exportQuery("data/ai-monthly.json", `
    SELECT
      FORMAT_DATE('%Y-%m-01', report_date) AS report_month,
      SUM(sessions_ai) AS ai_sessions,
      SUM(ga4_sessions) AS ga4_sessions,
      ROUND(SAFE_DIVIDE(SUM(sessions_ai) * 100, SUM(ga4_sessions)), 3) AS ai_pct,
      SUM(ai_chatgpt) AS chatgpt,
      SUM(ai_perplexity) AS perplexity,
      SUM(ai_gemini) AS gemini,
      SUM(ai_copilot) AS copilot,
      SUM(ai_claude) AS claude
    FROM ${table("daily_content_performance")}
    WHERE report_date BETWEEN DATE('${START_ALL}') AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    GROUP BY 1
    ORDER BY 1
  `);

  await exportQuery("data/ai-daily-breakdown.json", `
    SELECT
      report_date,
      SUM(sessions_ai) AS total_ai,
      SUM(ai_chatgpt) AS chatgpt,
      SUM(ai_perplexity) AS perplexity,
      SUM(ai_gemini) AS gemini,
      SUM(ai_copilot) AS copilot,
      SUM(ai_claude) AS claude,
      SUM(ai_meta) AS meta
    FROM ${table("daily_content_performance")}
    WHERE report_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    GROUP BY 1
    ORDER BY 1
  `);

  await exportQuery("data/health-distribution.json", `
    SELECT
      CASE
        WHEN health_score >= 60 THEN 'Healthy'
        WHEN health_score >= 40 THEN 'Moderate'
        ELSE 'Poor'
      END AS health_band,
      COUNT(*) AS content_count,
      SUM(impressions_90d) AS impressions_90d,
      SUM(clicks_90d) AS clicks_90d,
      SUM(sessions_90d) AS sessions_90d,
      ROUND(AVG(health_score), 1) AS avg_score
    FROM ${table("v_content_90d_age_summary")}
    GROUP BY 1
    ORDER BY CASE health_band WHEN 'Healthy' THEN 1 WHEN 'Moderate' THEN 2 ELSE 3 END
  `);

  await exportQuery("data/age-tiers.json", `
    SELECT
      age_tier,
      COUNT(*) AS content_count,
      ROUND(AVG(health_score), 2) AS avg_health_score,
      SUM(impressions_90d) AS impressions_90d,
      SUM(clicks_90d) AS clicks_90d,
      SUM(sessions_90d) AS sessions_90d,
      SUM(ai_sessions_90d) AS ai_sessions_90d,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 4) AS avg_ctr
    FROM ${table("v_content_90d_age_summary")}
    GROUP BY 1
    ORDER BY CASE age_tier
      WHEN '0-14' THEN 1
      WHEN '15-30' THEN 2
      WHEN '31-90' THEN 3
      WHEN '91-180' THEN 4
      WHEN '181-365' THEN 5
      WHEN '365+' THEN 6
      ELSE 99
    END
  `);

  await exportQuery("data/freshness-tiers.json", `
    SELECT
      freshness_tier,
      COUNT(*) AS content_count,
      ROUND(AVG(health_score), 2) AS avg_health_score,
      SUM(impressions_90d) AS impressions_90d,
      SUM(sessions_90d) AS sessions_90d,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 4) AS avg_ctr,
      COUNTIF(is_declining) AS declining_count
    FROM ${table("v_content_90d_age_summary")}
    GROUP BY 1
    ORDER BY CASE freshness_tier
      WHEN '0-30' THEN 1
      WHEN '31-90' THEN 2
      WHEN '91-180' THEN 3
      WHEN '181+' THEN 4
      ELSE 99
    END
  `);

  await exportQuery("data/position-distribution.json", `
    SELECT
      position_tier,
      COUNT(*) AS content_count,
      SUM(impressions_90d) AS impressions_90d,
      SUM(clicks_90d) AS clicks_90d,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 4) AS avg_ctr,
      ROUND(AVG(health_score), 1) AS avg_health
    FROM ${table("v_content_90d_age_summary")}
    GROUP BY 1
    ORDER BY CASE position_tier
      WHEN 'top_3' THEN 1
      WHEN 'page_1' THEN 2
      WHEN 'striking' THEN 3
      WHEN 'page_3_5' THEN 4
      WHEN 'deep' THEN 5
      WHEN 'no_data' THEN 6
      ELSE 99
    END
  `);

  await exportQuery("data/trend-distribution.json", `
    SELECT
      trend_direction,
      COUNT(*) AS content_count,
      ROUND(AVG(trend_pct), 1) AS avg_trend_pct,
      SUM(impressions_90d) AS impressions_90d
    FROM ${table("v_content_90d_age_summary")}
    GROUP BY 1
    ORDER BY CASE trend_direction
      WHEN 'flat' THEN 1
      WHEN 'stable' THEN 2
      WHEN 'up' THEN 3
      WHEN 'new' THEN 4
      WHEN 'down' THEN 5
      ELSE 99
    END
  `);

  await exportQuery("data/cannibalization.json", `
    SELECT
      COUNTIF(true_cannibalization_count > 0) AS clients_with_cannibalization,
      SUM(true_cannibalization_count) AS total_cannibalized_queries,
      SUM(cannibalized_impressions) AS total_cannibalized_impressions,
      SUM(cannibalized_clicks) AS total_cannibalized_clicks,
      SUM(critical_count) AS critical_count,
      SUM(high_count) AS high_count,
      SUM(medium_count) AS medium_count,
      SUM(low_count) AS low_count
    FROM ${table("v_cannibalization_client_summary")}
  `);

  await exportQuery("data/optimization-actions.json", `
    SELECT
      action_type,
      COUNT(DISTINCT content_id) AS content_count,
      ROUND(AVG(priority_score), 1) AS avg_priority
    FROM ${table("v_optimization_queue")}
    WHERE action_type IS NOT NULL
    GROUP BY 1
    ORDER BY content_count DESC
  `);

  await exportQuery("data/optimization-flags.json", `
    SELECT
      optimization_status,
      COUNT(DISTINCT content_id) AS content_count,
      SUM(imp_30) AS impressions_30d,
      SUM(clicks_30) AS clicks_30d
    FROM ${table("view_optimization_flags")}
    GROUP BY 1
    ORDER BY content_count DESC
  `);

  await exportQuery("data/indexing-state.json", `
    WITH base AS (
      SELECT
        CASE
          WHEN needs_indexing AND impressions_90d > 0 THEN 'got_unindexed'
          WHEN needs_indexing THEN 'never_indexed'
          ELSE 'confirmed_indexed'
        END AS status
      FROM ${table("v_content_90d_age_summary")}
    )
    SELECT status, COUNT(*) AS content_count
    FROM base
    GROUP BY 1
    ORDER BY CASE status
      WHEN 'got_unindexed' THEN 1
      WHEN 'confirmed_indexed' THEN 2
      WHEN 'never_indexed' THEN 3
      ELSE 99
    END
  `);

  await exportQuery("data/revenue.json", `
    WITH cur30 AS (
      SELECT
        SUM(purchase_revenue) AS revenue_30d
      FROM ${table("daily_content_revenue")}
      WHERE report_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    ),
    prev30 AS (
      SELECT
        SUM(purchase_revenue) AS revenue_prev_30d
      FROM ${table("daily_content_revenue")}
      WHERE report_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 31 DAY)
    ),
    cur90 AS (
      SELECT
        SUM(purchase_revenue) AS revenue_90d,
        COUNT(DISTINCT IF(purchase_revenue > 0, client_id, NULL)) AS active_clients_90d
      FROM ${table("daily_content_revenue")}
      WHERE report_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    )
    SELECT
      ROUND(cur30.revenue_30d, 2) AS revenue_30d,
      ROUND(prev30.revenue_prev_30d, 2) AS revenue_prev_30d,
      ROUND(cur90.revenue_90d, 2) AS revenue_90d,
      CASE
        WHEN cur30.revenue_30d > prev30.revenue_prev_30d THEN 'up'
        WHEN cur30.revenue_30d < prev30.revenue_prev_30d THEN 'down'
        ELSE 'flat'
      END AS trend_30d,
      cur90.active_clients_90d AS active_clients_90d
    FROM cur30, prev30, cur90
  `);

  await exportQuery("data/corr-growing-vs-declining-profile.json", `
    SELECT
      trend_direction,
      ROUND(AVG(content_age_days), 0) AS avg_age_days,
      ROUND(AVG(days_since_last_update), 0) AS avg_days_since_update,
      ROUND(AVG(word_count), 0) AS avg_word_count,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(scroll_rate), 2) AS avg_scroll_pct,
      ROUND(AVG(engagement_rate), 2) AS avg_engage_pct,
      ROUND(AVG(ai_traffic_pct), 2) AS avg_ai_pct,
      ROUND(AVG(avg_position), 1) AS avg_pos,
      COUNT(*) AS n
    FROM ${table("v_content_90d_age_summary")}
    WHERE trend_direction IN ('down', 'stable', 'up')
    GROUP BY 1
    ORDER BY CASE trend_direction WHEN 'down' THEN 1 WHEN 'stable' THEN 2 WHEN 'up' THEN 3 ELSE 99 END
  `);

  await exportQuery("data/corr-freshness-trend.json", `
    SELECT
      freshness_tier,
      trend_direction,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(trend_pct), 1) AS avg_trend_pct,
      ROUND(AVG(impressions_90d), 0) AS avg_impressions
    FROM ${table("v_content_90d_age_summary")}
    WHERE freshness_tier IN ('0-30', '31-90', '91-180', '181+')
      AND trend_direction IN ('down', 'stable', 'up')
    GROUP BY 1, 2
    ORDER BY CASE freshness_tier
      WHEN '0-30' THEN 1
      WHEN '31-90' THEN 2
      WHEN '91-180' THEN 3
      WHEN '181+' THEN 4
      ELSE 99
    END,
    CASE trend_direction WHEN 'down' THEN 1 WHEN 'stable' THEN 2 WHEN 'up' THEN 3 ELSE 99 END
  `);

  await exportQuery("data/corr-engagement-matrix.json", `
    WITH buckets AS (
      SELECT
        CASE WHEN scroll_rate >= 25 THEN 'high_scroll' ELSE 'low_scroll' END AS scroll_bucket,
        CASE
          WHEN engagement_rate >= 50 THEN 'high_engage'
          WHEN engagement_rate > 0 THEN 'mid_engage'
          ELSE 'low_engage'
        END AS engage_bucket,
        health_score,
        impressions_90d,
        ai_traffic_pct,
        avg_position
      FROM ${table("v_content_90d_age_summary")}
      WHERE impressions_90d > 0 AND sessions_90d > 0
    )
    SELECT
      scroll_bucket,
      engage_bucket,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(AVG(ai_traffic_pct), 2) AS avg_ai_pct,
      ROUND(AVG(avg_position), 1) AS avg_pos
    FROM buckets
    GROUP BY 1, 2
    HAVING COUNT(*) >= 50
    ORDER BY avg_health DESC
  `);

  await exportQuery("data/corr-ai-vs-traditional.json", `
    WITH buckets AS (
      SELECT
        CASE
          WHEN ai_sessions_90d >= 5 THEN 'high_ai'
          WHEN ai_sessions_90d >= 1 THEN 'some_ai'
          ELSE 'no_ai'
        END AS ai_bucket,
        health_score,
        impressions_90d,
        clicks_90d,
        scroll_rate,
        avg_position,
        engagement_rate,
        content_age_days
      FROM ${table("v_content_90d_age_summary")}
      WHERE impressions_90d > 0 AND sessions_90d > 0
    )
    SELECT
      ai_bucket,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(scroll_rate), 2) AS avg_scroll_pct,
      ROUND(AVG(avg_position), 1) AS avg_pos,
      ROUND(AVG(engagement_rate), 2) AS avg_engage_pct,
      ROUND(AVG(content_age_days), 0) AS avg_age,
      COUNT(*) AS n
    FROM buckets
    GROUP BY 1
    ORDER BY CASE ai_bucket WHEN 'high_ai' THEN 1 WHEN 'some_ai' THEN 2 ELSE 3 END
  `);

  await exportQuery("data/corr-age-freshness-matrix.json", `
    SELECT
      age_tier,
      freshness_tier,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(ai_traffic_pct), 2) AS avg_ai_pct,
      COUNTIF(is_declining) AS declining_n,
      ROUND(SAFE_DIVIDE(COUNTIF(is_declining) * 100, COUNT(*)), 1) AS decline_rate_pct
    FROM ${table("v_content_90d_age_summary")}
    GROUP BY 1, 2
    HAVING COUNT(*) >= 25
    ORDER BY CASE age_tier
      WHEN '0-14' THEN 1
      WHEN '15-30' THEN 2
      WHEN '31-90' THEN 3
      WHEN '91-180' THEN 4
      WHEN '181-365' THEN 5
      WHEN '365+' THEN 6
      ELSE 99
    END,
    CASE freshness_tier
      WHEN '0-30' THEN 1
      WHEN '31-90' THEN 2
      WHEN '91-180' THEN 3
      WHEN '181+' THEN 4
      ELSE 99
    END
  `);

  await exportQuery("data/corr-wordcount-position.json", `
    WITH buckets AS (
      SELECT
        CASE
          WHEN word_count < 1000 THEN '<1000'
          WHEN word_count < 2000 THEN '1000-2000'
          WHEN word_count < 3500 THEN '2000-3500'
          ELSE '3500+'
        END AS word_count_tier,
        position_tier,
        health_score,
        clicks_90d,
        impressions_90d
      FROM ${table("v_content_90d_age_summary")}
      WHERE position_tier IN ('top_3', 'page_1', 'striking', 'page_3_5', 'deep')
    )
    SELECT
      word_count_tier,
      position_tier,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(impressions_90d), 0) AS avg_impressions
    FROM buckets
    WHERE word_count_tier != '<1000'
    GROUP BY 1, 2
    ORDER BY CASE word_count_tier
      WHEN '1000-2000' THEN 1
      WHEN '2000-3500' THEN 2
      WHEN '3500+' THEN 3
      ELSE 99
    END,
    CASE position_tier
      WHEN 'top_3' THEN 1
      WHEN 'page_1' THEN 2
      WHEN 'striking' THEN 3
      WHEN 'page_3_5' THEN 4
      WHEN 'deep' THEN 5
      ELSE 99
    END
  `);

  await exportQuery("data/corr-type-intent-health.json", `
    SELECT
      content_type,
      main_intent,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(ai_traffic_pct), 2) AS avg_ai_pct
    FROM ${table("v_content_90d_age_summary")}
    WHERE content_type IS NOT NULL
      AND main_intent IS NOT NULL
    GROUP BY 1, 2
    HAVING COUNT(*) >= 100
    ORDER BY n DESC
    LIMIT 12
  `);

  await exportQuery("data/corr-decline-risk-clusters.json", `
    SELECT
      content_type,
      main_intent,
      position_tier,
      COUNTIF(is_declining) AS declining,
      COUNTIF(trend_direction = 'up') AS growing,
      COUNT(*) AS total,
      ROUND(SAFE_DIVIDE(COUNTIF(is_declining) * 100, COUNT(*)), 1) AS decline_rate_pct,
      ROUND(AVG(health_score), 1) AS avg_health
    FROM ${table("v_content_90d_age_summary")}
    WHERE position_tier IN ('top_3', 'page_1', 'striking', 'page_3_5', 'deep')
      AND content_type IS NOT NULL
      AND main_intent IS NOT NULL
    GROUP BY 1, 2, 3
    HAVING COUNT(*) >= 50
    ORDER BY decline_rate_pct ASC, total DESC
  `);

  await exportQuery("data/corr-competition-performance.json", `
    SELECT
      competition_level,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(avg_position), 1) AS avg_pos,
      ROUND(AVG(ai_traffic_pct), 2) AS avg_ai_pct,
      COUNTIF(trend_direction = 'up') AS growing_n,
      COUNTIF(trend_direction = 'down') AS declining_n,
      COUNT(*) AS n
    FROM ${table("v_content_90d_age_summary")}
    WHERE competition_level IN ('LOW', 'MEDIUM', 'HIGH')
    GROUP BY 1
    ORDER BY CASE competition_level WHEN 'LOW' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 99 END
  `);

  await exportQuery("data/hyp-search-volume-success.json", `
    WITH buckets AS (
      SELECT
        CASE
          WHEN search_volume IS NULL OR search_volume = 0 THEN 'zero/null'
          WHEN search_volume <= 100 THEN '1-100'
          WHEN search_volume <= 1000 THEN '100-1K'
          WHEN search_volume <= 10000 THEN '1K-10K'
          ELSE '10K+'
        END AS sv_bucket,
        *
      FROM ${table("v_content_90d_age_summary")}
    )
    SELECT
      sv_bucket,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(AVG(clicks_90d), 0) AS avg_clicks,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(avg_position), 1) AS avg_pos,
      COUNTIF(trend_direction = 'up') AS growing,
      COUNTIF(trend_direction = 'down') AS declining
    FROM buckets
    GROUP BY 1
    ORDER BY CASE sv_bucket
      WHEN '1-100' THEN 1
      WHEN '100-1K' THEN 2
      WHEN '10K+' THEN 3
      WHEN '1K-10K' THEN 4
      WHEN 'zero/null' THEN 5
      ELSE 99
    END
  `);

  await exportQuery("data/hyp-model-performance.json", `
    SELECT
      COALESCE(model_used, 'unknown') AS model_used,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(avg_position), 1) AS avg_pos,
      ROUND(AVG(content_age_days), 0) AS avg_age
    FROM ${table("v_content_90d_age_summary")}
    GROUP BY 1
    HAVING COUNT(*) >= 100
    ORDER BY n DESC
    LIMIT 8
  `);

  await exportQuery("data/hyp-age-golden-zone.json", `
    WITH buckets AS (
      SELECT
        CASE
          WHEN content_age_days <= 7 THEN '0-7'
          WHEN content_age_days <= 14 THEN '8-14'
          WHEN content_age_days <= 30 THEN '15-30'
          WHEN content_age_days <= 60 THEN '31-60'
          WHEN content_age_days <= 90 THEN '61-90'
          WHEN content_age_days <= 120 THEN '91-120'
          WHEN content_age_days <= 180 THEN '121-180'
          WHEN content_age_days <= 270 THEN '181-270'
          WHEN content_age_days <= 365 THEN '271-365'
          ELSE '365+'
        END AS age_bucket,
        *
      FROM ${table("v_content_90d_age_summary")}
    )
    SELECT
      age_bucket,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct
    FROM buckets
    GROUP BY 1
    ORDER BY CASE age_bucket
      WHEN '0-7' THEN 1
      WHEN '8-14' THEN 2
      WHEN '15-30' THEN 3
      WHEN '31-60' THEN 4
      WHEN '61-90' THEN 5
      WHEN '91-120' THEN 6
      WHEN '121-180' THEN 7
      WHEN '181-270' THEN 8
      WHEN '271-365' THEN 9
      WHEN '365+' THEN 10
      ELSE 99
    END
  `);

  await exportQuery("data/hyp-backlinks-performance.json", `
    WITH joined AS (
      SELECT
        CASE
          WHEN COALESCE(c.backlinks, 0) = 0 THEN '0'
          WHEN c.backlinks <= 9 THEN '1-9'
          WHEN c.backlinks <= 99 THEN '10-99'
          ELSE '100+'
        END AS backlink_bucket,
        v.health_score,
        v.impressions_90d,
        v.avg_position
      FROM ${table("v_content_90d_age_summary")} v
      JOIN ${table("all_content_data")} c
        USING (content_id)
    )
    SELECT
      backlink_bucket,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(AVG(avg_position), 1) AS avg_pos
    FROM joined
    GROUP BY 1
    ORDER BY CASE backlink_bucket
      WHEN '1-9' THEN 1
      WHEN '10-99' THEN 2
      WHEN '100+' THEN 3
      WHEN '0' THEN 4
      ELSE 99
    END
  `);

  await exportQuery("data/hyp-flag-stacking.json", `
    WITH base AS (
      SELECT
        CASE
          WHEN impressions_90d = 0 THEN NULL
          ELSE
            CAST(needs_indexing AS INT64) +
            CAST(is_quick_win AS INT64) +
            CAST(needs_ctr_fix AS INT64) +
            CAST(needs_engagement_fix AS INT64) +
            CAST(ai_opportunity AS INT64) +
            CAST(is_underperformer AS INT64) +
            CAST(is_declining AS INT64) +
            CAST(is_initial_refresh_candidate AS INT64)
        END AS flag_count,
        health_score,
        impressions_90d,
        avg_position
      FROM ${table("v_content_90d_age_summary")}
    )
    SELECT
      flag_count,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(AVG(avg_position), 1) AS avg_pos
    FROM base
    GROUP BY 1
    ORDER BY flag_count
  `);

  await exportQuery("data/hyp-visibility-consistency.json", `
    WITH buckets AS (
      SELECT
        CASE
          WHEN days_with_impressions = 0 THEN 'invisible (0)'
          WHEN days_with_impressions <= 19 THEN 'sporadic (1-19)'
          WHEN days_with_impressions <= 49 THEN 'intermittent (20-49)'
          WHEN days_with_impressions <= 79 THEN 'moderate (50-79)'
          ELSE 'consistent (80+)'
        END AS visibility_bucket,
        *
      FROM ${table("v_content_90d_age_summary")}
    )
    SELECT
      visibility_bucket,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(AVG(avg_position), 1) AS avg_pos,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      COUNTIF(trend_direction = 'up') AS growing,
      COUNTIF(trend_direction = 'down') AS declining
    FROM buckets
    GROUP BY 1
    ORDER BY CASE visibility_bucket
      WHEN 'consistent (80+)' THEN 1
      WHEN 'intermittent (20-49)' THEN 2
      WHEN 'moderate (50-79)' THEN 3
      WHEN 'sporadic (1-19)' THEN 4
      WHEN 'invisible (0)' THEN 5
      ELSE 99
    END
  `);

  await exportQuery("data/hyp-intent-competition.json", `
    SELECT
      main_intent,
      competition_level,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(AVG(avg_position), 1) AS avg_pos
    FROM ${table("v_content_90d_age_summary")}
    WHERE main_intent IN ('informational', 'commercial', 'transactional', 'navigational')
      AND competition_level IN ('LOW', 'MEDIUM', 'HIGH')
    GROUP BY 1, 2
    HAVING COUNT(*) >= 25
    ORDER BY CASE main_intent
      WHEN 'transactional' THEN 1
      WHEN 'commercial' THEN 2
      WHEN 'informational' THEN 3
      WHEN 'navigational' THEN 4
      ELSE 99
    END,
    CASE competition_level WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'HIGH' THEN 3 ELSE 99 END
  `);

  await exportQuery("data/hyp-ctr-position-curve.json", `
    WITH buckets AS (
      SELECT
        CASE
          WHEN avg_position <= 1.5 THEN 'pos 1'
          WHEN avg_position <= 3.5 THEN 'pos 2'
          WHEN avg_position <= 4.5 THEN 'pos 3'
          WHEN avg_position <= 5.5 THEN 'pos 4-5'
          WHEN avg_position <= 7.5 THEN 'pos 6-7'
          WHEN avg_position <= 10.5 THEN 'pos 8-10'
          WHEN avg_position <= 15.5 THEN 'pos 11-15'
          WHEN avg_position <= 20.5 THEN 'pos 16-20'
          WHEN avg_position <= 30.5 THEN 'pos 21-30'
          ELSE 'pos 30+'
        END AS position_bucket,
        *
      FROM ${table("v_content_90d_age_summary")}
      WHERE impressions_90d > 0
    )
    SELECT
      position_bucket,
      COUNT(*) AS n,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp
    FROM buckets
    GROUP BY 1
    ORDER BY CASE position_bucket
      WHEN 'pos 1' THEN 1
      WHEN 'pos 2' THEN 2
      WHEN 'pos 3' THEN 3
      WHEN 'pos 4-5' THEN 4
      WHEN 'pos 6-7' THEN 5
      WHEN 'pos 8-10' THEN 6
      WHEN 'pos 11-15' THEN 7
      WHEN 'pos 16-20' THEN 8
      WHEN 'pos 21-30' THEN 9
      WHEN 'pos 30+' THEN 10
      ELSE 99
    END
  `);

  await exportQuery("data/v2/raw-traffic-mix.json", `
    SELECT
      client_id,
      SUM(sessions_organic) AS organic,
      SUM(sessions_direct) AS direct,
      SUM(sessions_referral) AS referral,
      SUM(sessions_social) AS social,
      SUM(sessions_paid) AS paid,
      SUM(sessions_ai) AS ai,
      SUM(ga4_sessions) AS total_sessions
    FROM ${table("daily_content_performance")}
    WHERE report_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    GROUP BY 1
    HAVING SUM(ga4_sessions) > 0
    ORDER BY total_sessions DESC
  `);

  await exportQuery("data/v2/raw-revenue-by-attributes.json", `
    WITH revenue_90d AS (
      SELECT
        content_id,
        SUM(landing_sessions) AS landing_sessions,
        SUM(purchase_count) AS purchases,
        SUM(purchase_revenue) AS total_revenue
      FROM ${table("daily_content_revenue")}
      WHERE report_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
      GROUP BY 1
    )
    SELECT
      v.content_type,
      v.main_intent,
      COUNT(*) AS content_count,
      SUM(COALESCE(r.landing_sessions, 0)) AS landing_sessions,
      SUM(COALESCE(r.purchases, 0)) AS purchases,
      ROUND(SUM(COALESCE(r.total_revenue, 0)), 2) AS total_revenue,
      ROUND(SAFE_DIVIDE(SUM(COALESCE(r.total_revenue, 0)), NULLIF(SUM(COALESCE(r.landing_sessions, 0)), 0)), 2) AS rev_per_session,
      ROUND(SAFE_DIVIDE(SUM(COALESCE(r.purchases, 0)) * 100, NULLIF(SUM(COALESCE(r.landing_sessions, 0)), 0)), 2) AS conversion_rate
    FROM ${table("v_content_90d_age_summary")} v
    LEFT JOIN revenue_90d r
      USING (content_id)
    WHERE v.impressions_90d > 0 AND v.sessions_90d > 0
    GROUP BY 1, 2
    HAVING COUNT(*) >= 25
    ORDER BY content_count DESC
  `);

  await exportQuery("data/v2/raw-ai-conversion.json", `
    WITH revenue_90d AS (
      SELECT
        content_id,
        SUM(landing_sessions) AS landing_sessions,
        SUM(purchase_count) AS purchases,
        SUM(purchase_revenue) AS revenue
      FROM ${table("daily_content_revenue")}
      WHERE report_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
      GROUP BY 1
    ),
    buckets AS (
      SELECT
        CASE WHEN ai_sessions_90d > 0 THEN 'has_ai_traffic' ELSE 'no_ai_traffic' END AS ai_bucket,
        v.content_id
      FROM ${table("v_content_90d_age_summary")} v
      WHERE v.impressions_90d > 0 AND v.sessions_90d > 0
    )
    SELECT
      ai_bucket,
      COUNT(*) AS content_count,
      SUM(COALESCE(r.landing_sessions, 0)) AS landing_sessions,
      SUM(COALESCE(r.purchases, 0)) AS purchases,
      ROUND(SUM(COALESCE(r.revenue, 0)), 2) AS revenue,
      ROUND(SAFE_DIVIDE(SUM(COALESCE(r.purchases, 0)) * 100, NULLIF(SUM(COALESCE(r.landing_sessions, 0)), 0)), 2) AS conversion_rate
    FROM buckets b
    LEFT JOIN revenue_90d r
      USING (content_id)
    GROUP BY 1
    ORDER BY ai_bucket
  `);

  await exportQuery("data/v2/raw-engagement-time-health.json", `
    WITH engagement_90d AS (
      SELECT
        content_id,
        SAFE_DIVIDE(SUM(ga4_total_engagement_sec), NULLIF(SUM(ga4_sessions), 0)) AS avg_engagement_sec,
        SAFE_DIVIDE(SUM(scroll_events), NULLIF(SUM(ga4_sessions), 0)) AS avg_scroll,
        SAFE_DIVIDE(SUM(ga4_sessions), COUNT(DISTINCT report_date)) AS avg_sessions
      FROM ${table("daily_content_performance")}
      WHERE report_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
      GROUP BY 1
    )
    SELECT
      CASE
        WHEN v.health_score >= 60 THEN 'healthy'
        WHEN v.health_score >= 40 THEN 'moderate'
        WHEN v.health_score >= 20 THEN 'low'
        ELSE 'poor'
      END AS health_bucket,
      ROUND(AVG(e.avg_engagement_sec), 1) AS avg_engagement_sec,
      ROUND(AVG(e.avg_sessions), 1) AS avg_sessions,
      ROUND(AVG(e.avg_scroll), 1) AS avg_scroll,
      COUNT(*) AS content_count
    FROM ${table("v_content_90d_age_summary")} v
    JOIN engagement_90d e
      USING (content_id)
    WHERE v.sessions_90d > 0
    GROUP BY 1
    ORDER BY CASE health_bucket
      WHEN 'healthy' THEN 1
      WHEN 'poor' THEN 2
      WHEN 'moderate' THEN 3
      WHEN 'low' THEN 4
      ELSE 99
    END
  `);

  await exportQuery("data/v2/raw-dayofweek.json", `
    SELECT
      EXTRACT(DAYOFWEEK FROM report_date) AS dow,
      FORMAT_DATE('%A', report_date) AS day_name,
      ROUND(AVG(gsc_impressions), 0) AS avg_impressions,
      ROUND(AVG(gsc_clicks), 0) AS avg_clicks,
      ROUND(AVG(ga4_sessions), 1) AS avg_sessions,
      ROUND(AVG(sessions_ai), 2) AS avg_ai_sessions,
      COUNT(*) AS observations
    FROM ${table("daily_content_performance")}
    WHERE report_date BETWEEN DATE('${START_ALL}') AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    GROUP BY 1, 2
    ORDER BY dow
  `);

  await exportQuery("data/v2/raw-scroll-vs-position.json", `
    WITH buckets AS (
      SELECT
        position_tier,
        CASE WHEN scroll_rate >= 25 THEN 'high' ELSE 'low' END AS scroll_bucket,
        health_score,
        impressions_90d,
        clicks_90d
      FROM ${table("v_content_90d_age_summary")}
      WHERE position_tier IN ('top_3', 'page_1', 'striking', 'page_3_5', 'deep')
        AND impressions_90d > 0
        AND sessions_90d > 0
    )
    SELECT
      position_tier,
      scroll_bucket,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct
    FROM buckets
    GROUP BY 1, 2
    ORDER BY CASE position_tier
      WHEN 'deep' THEN 1
      WHEN 'page_1' THEN 2
      WHEN 'page_3_5' THEN 3
      WHEN 'striking' THEN 4
      WHEN 'top_3' THEN 5
      ELSE 99
    END,
    CASE scroll_bucket WHEN 'high' THEN 1 ELSE 2 END
  `);

  await exportQuery("data/v2/raw-traffic-diversification.json", `
    WITH per_content AS (
      SELECT
        content_id,
        SUM(ga4_sessions) AS total_sessions,
        IF(SUM(sessions_organic) > 0, 1, 0) +
        IF(SUM(sessions_direct) > 0, 1, 0) +
        IF(SUM(sessions_referral) > 0, 1, 0) +
        IF(SUM(sessions_social) > 0, 1, 0) +
        IF(SUM(sessions_paid) > 0, 1, 0) +
        IF(SUM(sessions_ai) > 0, 1, 0) AS channel_count
      FROM ${table("daily_content_performance")}
      WHERE report_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
      GROUP BY 1
      HAVING SUM(ga4_sessions) > 0
    )
    SELECT
      CASE
        WHEN channel_count >= 4 THEN '4+ channels'
        WHEN channel_count = 3 THEN '3 channels'
        WHEN channel_count = 2 THEN '2 channels'
        ELSE '1 channel'
      END AS diversity,
      COUNT(*) AS n,
      ROUND(AVG(v.health_score), 1) AS avg_health,
      ROUND(AVG(p.total_sessions), 0) AS avg_sessions
    FROM per_content p
    JOIN ${table("v_content_90d_age_summary")} v
      USING (content_id)
    GROUP BY 1
    ORDER BY CASE diversity
      WHEN '4+ channels' THEN 1
      WHEN '2 channels' THEN 2
      WHEN '3 channels' THEN 3
      WHEN '1 channel' THEN 4
      ELSE 99
    END
  `);

  await exportQuery("data/v2/raw-percentiles.json", `
    WITH q AS (
      SELECT
        APPROX_QUANTILES(avg_position, 100) AS pos_q,
        APPROX_QUANTILES(impressions_90d, 100) AS imp_q,
        APPROX_QUANTILES(health_score, 100) AS health_q
      FROM ${table("v_content_90d_age_summary")}
    )
    SELECT 'avg_position' AS metric, pos_q[OFFSET(10)] AS p10, pos_q[OFFSET(25)] AS p25, pos_q[OFFSET(50)] AS p50, pos_q[OFFSET(75)] AS p75, pos_q[OFFSET(90)] AS p90 FROM q
    UNION ALL
    SELECT 'impressions_90d' AS metric, imp_q[OFFSET(10)] AS p10, imp_q[OFFSET(25)] AS p25, imp_q[OFFSET(50)] AS p50, imp_q[OFFSET(75)] AS p75, imp_q[OFFSET(90)] AS p90 FROM q
    UNION ALL
    SELECT 'health_score' AS metric, health_q[OFFSET(10)] AS p10, health_q[OFFSET(25)] AS p25, health_q[OFFSET(50)] AS p50, health_q[OFFSET(75)] AS p75, health_q[OFFSET(90)] AS p90 FROM q
  `);

  await exportQuery("data/v2/raw-correlations.json", `
    SELECT
      ROUND(CORR(health_score, impressions_90d), 3) AS health_imp,
      ROUND(CORR(health_score, clicks_90d), 3) AS health_clicks,
      ROUND(CORR(health_score, sessions_90d), 3) AS health_sessions,
      ROUND(CORR(health_score, ai_sessions_90d), 3) AS health_ai,
      ROUND(CORR(health_score, content_age_days), 3) AS health_age,
      ROUND(CORR(health_score, word_count), 3) AS health_wc,
      ROUND(CORR(health_score, search_volume), 3) AS health_sv,
      ROUND(CORR(impressions_90d, clicks_90d), 3) AS imp_clicks,
      ROUND(CORR(impressions_90d, sessions_90d), 3) AS imp_sessions,
      ROUND(CORR(impressions_90d, ai_sessions_90d), 3) AS imp_ai,
      ROUND(CORR(impressions_90d, content_age_days), 3) AS imp_age,
      ROUND(CORR(impressions_90d, word_count), 3) AS imp_wc,
      ROUND(CORR(clicks_90d, sessions_90d), 3) AS clicks_sessions,
      ROUND(CORR(clicks_90d, ai_sessions_90d), 3) AS clicks_ai,
      ROUND(CORR(content_age_days, word_count), 3) AS age_wc,
      ROUND(CORR(content_age_days, search_volume), 3) AS age_sv,
      ROUND(CORR(word_count, search_volume), 3) AS wc_sv
    FROM ${table("v_content_90d_age_summary")}
    WHERE impressions_90d > 0 AND sessions_90d > 0
  `);

  await exportQuery("data/v2/raw-top-bottom-decile.json", `
    WITH ranked AS (
      SELECT
        *,
        NTILE(10) OVER (ORDER BY health_score DESC, impressions_90d DESC, content_id) AS decile_rank
      FROM ${table("v_content_90d_age_summary")}
    )
    SELECT
      'top_10pct' AS decile,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(AVG(clicks_90d), 0) AS avg_clicks,
      ROUND(AVG(sessions_90d), 0) AS avg_sessions,
      ROUND(AVG(ai_sessions_90d), 1) AS avg_ai,
      ROUND(AVG(content_age_days), 0) AS avg_age,
      ROUND(AVG(days_since_last_update), 0) AS avg_freshness,
      ROUND(AVG(word_count), 0) AS avg_words,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(avg_position), 1) AS avg_pos
    FROM ranked
    WHERE decile_rank = 1
    UNION ALL
    SELECT
      'bottom_10pct' AS decile,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(AVG(clicks_90d), 0) AS avg_clicks,
      ROUND(AVG(sessions_90d), 0) AS avg_sessions,
      ROUND(AVG(ai_sessions_90d), 1) AS avg_ai,
      ROUND(AVG(content_age_days), 0) AS avg_age,
      ROUND(AVG(days_since_last_update), 0) AS avg_freshness,
      ROUND(AVG(word_count), 0) AS avg_words,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(avg_position), 1) AS avg_pos
    FROM ranked
    WHERE decile_rank = 10
  `);

  await exportQuery("data/v2/time-monthly-trends.json", `
    SELECT
      FORMAT_DATE('%Y-%m', report_date) AS month,
      SUM(gsc_impressions) AS impressions,
      SUM(gsc_clicks) AS clicks,
      SUM(ga4_sessions) AS sessions,
      SUM(sessions_ai) AS ai_sessions,
      COUNT(DISTINCT IF(gsc_impressions > 0 OR ga4_sessions > 0 OR sessions_ai > 0, content_id, NULL)) AS active_content
    FROM ${table("daily_content_performance")}
    WHERE report_date BETWEEN DATE('${START_ALL}') AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    GROUP BY 1
    ORDER BY 1
  `);

  await exportQuery("data/v2/time-publication-timeline.json", `
    SELECT
      FORMAT_TIMESTAMP('%Y-%m', c.content_created_at) AS month,
      COUNT(*) AS published,
      ROUND(AVG(v.health_score), 1) AS avg_health_now,
      ROUND(AVG(v.impressions_90d), 0) AS avg_imp_now
    FROM ${table("all_content_data")} c
    LEFT JOIN ${table("v_content_90d_age_summary")} v
      USING (content_id)
    WHERE c.content_created_at IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  `);

  await exportQuery("data/v2/time-freshness-decay.json", `
    WITH buckets AS (
      SELECT
        CASE
          WHEN days_since_last_update <= 7 THEN '0-7d'
          WHEN days_since_last_update <= 14 THEN '8-14d'
          WHEN days_since_last_update <= 30 THEN '15-30d'
          WHEN days_since_last_update <= 60 THEN '31-60d'
          WHEN days_since_last_update <= 90 THEN '61-90d'
          WHEN days_since_last_update <= 120 THEN '91-120d'
          WHEN days_since_last_update <= 180 THEN '121-180d'
          WHEN days_since_last_update <= 270 THEN '181-270d'
          WHEN days_since_last_update <= 365 THEN '271-365d'
          ELSE '365d+'
        END AS freshness_bucket,
        *
      FROM ${table("v_content_90d_age_summary")}
    )
    SELECT
      freshness_bucket,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp
    FROM buckets
    GROUP BY 1
    ORDER BY CASE freshness_bucket
      WHEN '0-7d' THEN 1
      WHEN '8-14d' THEN 2
      WHEN '15-30d' THEN 3
      WHEN '31-60d' THEN 4
      WHEN '61-90d' THEN 5
      WHEN '91-120d' THEN 6
      WHEN '121-180d' THEN 7
      WHEN '181-270d' THEN 8
      WHEN '271-365d' THEN 9
      WHEN '365d+' THEN 10
      ELSE 99
    END
  `);

  await exportQuery("data/v2/myth-wordcount-continuous.json", `
    WITH buckets AS (
      SELECT
        CASE
          WHEN word_count < 500 THEN '0-500'
          WHEN word_count < 1000 THEN '500-1K'
          WHEN word_count < 1500 THEN '1K-1.5K'
          WHEN word_count < 2000 THEN '1.5K-2K'
          WHEN word_count < 2500 THEN '2K-2.5K'
          WHEN word_count < 3000 THEN '2.5K-3K'
          WHEN word_count < 3500 THEN '3K-3.5K'
          WHEN word_count < 4000 THEN '3.5K-4K'
          WHEN word_count < 5000 THEN '4K-5K'
          ELSE '5K+'
        END AS wc_bucket,
        *
      FROM ${table("v_content_90d_age_summary")}
    )
    SELECT
      wc_bucket,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(avg_position), 1) AS avg_pos,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(impressions_90d), 0) AS avg_imp
    FROM buckets
    GROUP BY 1
    ORDER BY CASE wc_bucket
      WHEN '0-500' THEN 1
      WHEN '500-1K' THEN 2
      WHEN '1K-1.5K' THEN 3
      WHEN '1.5K-2K' THEN 4
      WHEN '2K-2.5K' THEN 5
      WHEN '2.5K-3K' THEN 6
      WHEN '3K-3.5K' THEN 7
      WHEN '3.5K-4K' THEN 8
      WHEN '4K-5K' THEN 9
      WHEN '5K+' THEN 10
      ELSE 99
    END
  `);

  await exportQuery("data/v2/myth-ai-penalized.json", `
    SELECT
      COALESCE(model_used, 'unknown') AS model_used,
      age_tier,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(AVG(avg_position), 1) AS avg_pos
    FROM ${table("v_content_90d_age_summary")}
    WHERE COALESCE(model_used, 'unknown') IN ('gemini-2.5-flash', 'gemini-3-flash-preview', 'gpt-4o-mini', 'gpt-5-mini', 'unknown')
    GROUP BY 1, 2
    HAVING COUNT(*) >= 25
    ORDER BY model_used, CASE age_tier
      WHEN '0-14' THEN 1
      WHEN '15-30' THEN 2
      WHEN '31-90' THEN 3
      WHEN '91-180' THEN 4
      WHEN '181-365' THEN 5
      WHEN '365+' THEN 6
      ELSE 99
    END
  `);

  await exportQuery("data/v2/myth-position1-value.json", `
    WITH buckets AS (
      SELECT
        CASE
          WHEN avg_position <= 1.5 THEN 'pos_1'
          WHEN avg_position <= 3.5 THEN 'pos_2-3'
          WHEN avg_position <= 5.5 THEN 'pos_4-5'
          WHEN avg_position <= 7.5 THEN 'pos_6-7'
          WHEN avg_position <= 10.5 THEN 'pos_8-10'
          ELSE NULL
        END AS pos_bucket,
        *
      FROM ${table("v_content_90d_age_summary")}
      WHERE impressions_90d > 0
    )
    SELECT
      pos_bucket,
      COUNT(*) AS n,
      SUM(impressions_90d) AS total_imp,
      SUM(clicks_90d) AS total_clicks,
      ROUND(SAFE_DIVIDE(SUM(clicks_90d) * 100, NULLIF(SUM(impressions_90d), 0)), 2) AS avg_ctr_pct,
      ROUND(AVG(health_score), 1) AS avg_health,
      SUM(sessions_90d) AS total_sessions
    FROM buckets
    WHERE pos_bucket IS NOT NULL
    GROUP BY 1
    ORDER BY CASE pos_bucket
      WHEN 'pos_1' THEN 1
      WHEN 'pos_2-3' THEN 2
      WHEN 'pos_4-5' THEN 3
      WHEN 'pos_6-7' THEN 4
      WHEN 'pos_8-10' THEN 5
      ELSE 99
    END
  `);

  await exportQuery("data/v2/myth-freshness-controlled.json", `
    WITH buckets AS (
      SELECT
        freshness_tier,
        CASE
          WHEN word_count < 1000 THEN '<1000'
          WHEN word_count < 2000 THEN '1000-2000'
          WHEN word_count < 3500 THEN '2000-3500'
          ELSE '3500+'
        END AS word_count_tier,
        health_score,
        impressions_90d,
        avg_position
      FROM ${table("v_content_90d_age_summary")}
      WHERE freshness_tier IN ('0-30', '31-90', '91-180', '181+')
    )
    SELECT
      freshness_tier,
      word_count_tier,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(impressions_90d), 0) AS avg_imp,
      ROUND(AVG(avg_position), 1) AS avg_pos
    FROM buckets
    GROUP BY 1, 2
    ORDER BY CASE freshness_tier
      WHEN '0-30' THEN 1
      WHEN '31-90' THEN 2
      WHEN '91-180' THEN 3
      WHEN '181+' THEN 4
      ELSE 99
    END,
    CASE word_count_tier
      WHEN '1000-2000' THEN 1
      WHEN '2000-3500' THEN 2
      WHEN '3500+' THEN 3
      WHEN '<1000' THEN 4
      ELSE 99
    END
  `);

  await exportQuery("data/v2/myth-sv-vs-impressions.json", `
    WITH buckets AS (
      SELECT
        CASE
          WHEN search_volume IS NULL OR search_volume = 0 THEN 'zero'
          WHEN search_volume <= 100 THEN '1-100'
          WHEN search_volume <= 1000 THEN '100-1K'
          WHEN search_volume <= 10000 THEN '1K-10K'
          ELSE '10K+'
        END AS sv_bucket,
        search_volume,
        impressions_90d,
        avg_position,
        health_score
      FROM ${table("v_content_90d_age_summary")}
    )
    SELECT
      sv_bucket,
      COUNT(*) AS n,
      ROUND(AVG(search_volume), 0) AS avg_sv,
      ROUND(AVG(impressions_90d), 0) AS avg_imp_90d,
      ROUND(SAFE_DIVIDE(AVG(impressions_90d), NULLIF(AVG(search_volume), 0)), 2) AS impression_to_sv_ratio,
      ROUND(AVG(avg_position), 1) AS avg_pos,
      ROUND(AVG(health_score), 1) AS avg_health
    FROM buckets
    GROUP BY 1
    ORDER BY CASE sv_bucket
      WHEN '1-100' THEN 1
      WHEN '100-1K' THEN 2
      WHEN '10K+' THEN 3
      WHEN '1K-10K' THEN 4
      WHEN 'zero' THEN 5
      ELSE 99
    END
  `);

  await exportQuery("data/v2/myth-backlinks-competition.json", `
    WITH joined AS (
      SELECT
        CASE
          WHEN COALESCE(c.backlinks, 0) = 0 THEN '0'
          WHEN c.backlinks <= 9 THEN '1-9'
          ELSE '10+'
        END AS bl_bucket,
        v.competition_level,
        v.health_score,
        v.avg_position,
        v.impressions_90d
      FROM ${table("v_content_90d_age_summary")} v
      JOIN ${table("all_content_data")} c
        USING (content_id)
      WHERE v.competition_level IN ('LOW', 'MEDIUM', 'HIGH')
    )
    SELECT
      bl_bucket,
      competition_level,
      COUNT(*) AS n,
      ROUND(AVG(health_score), 1) AS avg_health,
      ROUND(AVG(avg_position), 1) AS avg_pos,
      ROUND(AVG(impressions_90d), 0) AS avg_imp
    FROM joined
    GROUP BY 1, 2
    ORDER BY CASE bl_bucket WHEN '1-9' THEN 1 WHEN '10+' THEN 2 WHEN '0' THEN 3 ELSE 99 END,
    CASE competition_level WHEN 'LOW' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 99 END
  `);

  await exportQuery("data/v2/myth-publish-velocity.json", `
    WITH publish_counts AS (
      SELECT
        client_id,
        client_handle,
        COUNT(*) AS total_content,
        COUNTIF(DATE(content_created_at) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)) AS published_last_30d,
        COUNTIF(DATE(content_created_at) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)) AS published_last_90d
      FROM ${table("all_content_data")}
      GROUP BY 1, 2
    )
    SELECT
      p.client_handle,
      p.total_content,
      p.published_last_30d,
      p.published_last_90d,
      ROUND(s.avg_health_score, 1) AS avg_health,
      ROUND(SAFE_DIVIDE(s.total_impressions, NULLIF(s.total_content, 0)), 0) AS avg_imp,
      s.total_impressions AS total_imp
    FROM publish_counts p
    JOIN ${table("v_client_scorecard")} s
      USING (client_id)
    WHERE s.client_id IS NOT NULL
    ORDER BY avg_health DESC, total_imp DESC
  `);

  await refreshFeatureVector();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
