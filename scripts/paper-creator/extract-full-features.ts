#!/usr/bin/env bun
/**
 * Extracts full ML feature vector by sub-chunking large clients
 * (client_id + age_tier filter to stay under 3K per query).
 */

import { BigQueryMcpClient } from "@/lib/agent-data-clients/bigquery/mcp.client";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const V2 = join(import.meta.dir, "data", "v2");
const OUTPUT = join(V2, "raw-feature-vector-full.json");

const AGE_TIERS = ["'0-14'", "'15-30'", "'31-90'", "'91-180'", "'181-365'", "'365+'"];

// Clients that exceeded 3K rows (need sub-chunking by age_tier)
const LARGE_CLIENTS = [58, 3, 13, 14, 75, 71];
// All other clients (can be batched)
const SMALL_CLIENT_BATCHES = [
  [77], [8], [61], [78], [15], [2], [30],
  [72, 76], [83, 18, 32], [85, 35, 19, 39, 21, 50, 51, 53, 24, 84, 55, 12, 31, 79, 10, 65],
];

const COLS = `
  health_score, impressions_90d, clicks_90d, sessions_90d,
  ai_sessions_90d, COALESCE(scroll_rate, 0) AS scroll_rate,
  COALESCE(engagement_rate, 0) AS engagement_rate,
  COALESCE(ctr, 0) AS ctr, COALESCE(avg_position, 0) AS avg_position,
  content_age_days, COALESCE(days_since_last_update, 0) AS days_since_update,
  COALESCE(word_count, 0) AS word_count,
  COALESCE(search_volume, 0) AS search_volume,
  COALESCE(cpc, 0) AS cpc, COALESCE(competition, 0) AS competition,
  COALESCE(days_with_impressions, 0) AS days_with_impressions,
  CASE trend_direction WHEN 'up' THEN 1 WHEN 'stable' THEN 0 WHEN 'down' THEN -1 ELSE 0 END AS trend_numeric,
  CASE WHEN health_score >= 60 THEN 'healthy' WHEN health_score >= 40 THEN 'moderate' ELSE 'poor' END AS health_label,
  trend_direction, age_tier, freshness_tier, position_tier,
  content_type, main_intent, competition_level
`.trim();

const TABLE = "`gsc-bigquery-project-447113.central_data_warehouse.v_content_90d_age_summary`";
const BASE_WHERE = "sessions_90d > 0 AND impressions_90d > 0";

function normalize(schema: any, rows: any[]): any[] {
  const fields = schema?.fields;
  if (!fields) return rows;
  return rows.map((row: any) => {
    const cells = row.f;
    if (!Array.isArray(cells)) return row;
    const obj: any = {};
    fields.forEach((f: any, i: number) => {
      let v = cells[i]?.v;
      if (v != null && ["INTEGER", "INT64", "FLOAT", "FLOAT64", "NUMERIC"].includes(f.type)) {
        const n = Number(v);
        if (Number.isFinite(n)) v = n;
      }
      if (f.type === "BOOLEAN") v = v === true || v === "true";
      obj[f.name] = v ?? null;
    });
    return obj;
  });
}

async function query(client: BigQueryMcpClient, sql: string): Promise<any[]> {
  const result = await client.executeSql({ query: sql });
  return normalize(result.schema, result.rows);
}

async function main() {
  const client = new BigQueryMcpClient();
  const allRows: any[] = [];
  let queryCount = 0;

  // Sub-chunk large clients by age_tier
  console.log(`Extracting ${LARGE_CLIENTS.length} large clients (sub-chunked by age_tier)...`);
  for (const cid of LARGE_CLIENTS) {
    for (const tier of AGE_TIERS) {
      const sql = `SELECT ${COLS} FROM ${TABLE} WHERE ${BASE_WHERE} AND client_id = ${cid} AND age_tier = ${tier}`;
      try {
        const rows = await query(client, sql);
        allRows.push(...rows);
        queryCount++;
        if (rows.length > 0) process.stdout.write(`  client ${cid} / ${tier}: ${rows.length}\n`);
      } catch (e: any) {
        console.error(`  FAIL client ${cid} / ${tier}: ${e.message?.slice(0, 80)}`);
      }
    }
  }

  // Small clients in batches
  console.log(`\nExtracting ${SMALL_CLIENT_BATCHES.length} small client batches...`);
  for (const batch of SMALL_CLIENT_BATCHES) {
    const sql = `SELECT ${COLS} FROM ${TABLE} WHERE ${BASE_WHERE} AND client_id IN (${batch.join(",")})`;
    try {
      const rows = await query(client, sql);
      allRows.push(...rows);
      queryCount++;
      process.stdout.write(`  clients [${batch.slice(0, 3).join(",")}${batch.length > 3 ? ",..." : ""}]: ${rows.length}\n`);
    } catch (e: any) {
      console.error(`  FAIL batch [${batch.join(",")}]: ${e.message?.slice(0, 80)}`);
    }
  }

  console.log(`\n${queryCount} queries executed`);
  console.log(`Total rows: ${allRows.length.toLocaleString()}`);

  writeFileSync(OUTPUT, JSON.stringify({ row_count: allRows.length, rows: allRows }));
  const mb = (JSON.stringify({ row_count: allRows.length, rows: allRows }).length / 1024 / 1024).toFixed(1);
  console.log(`Written to ${OUTPUT} (${mb} MB)`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
