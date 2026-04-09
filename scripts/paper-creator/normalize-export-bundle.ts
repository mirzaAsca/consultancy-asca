#!/usr/bin/env bun

import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { pipeline } from "stream/promises";
import { createGunzip, gunzipSync } from "zlib";

const BASE = import.meta.dir;
const EXPORTS = join(BASE, "data", "exports");

type FileKind = "json" | "gzip-json" | "csv" | "other";

type ManifestEntry = {
  source: string;
  destination: string;
  query: number;
  kind: FileKind;
  notes?: string;
  bytes: number;
};

function ensureDir(pathname: string) {
  mkdirSync(pathname, { recursive: true });
}

function detectKind(pathname: string): FileKind {
  const head = readFileSync(pathname).subarray(0, 2);
  if (head[0] === 0x1f && head[1] === 0x8b) return "gzip-json";
  try {
    const first = readFileSync(pathname, "utf8").trimStart();
    if (first.startsWith("{") || first.startsWith("[")) return "json";
    if (first.includes(",")) return "csv";
  } catch {
    return "other";
  }
  return "other";
}

function readFirstObjectFromGzip(pathname: string): Record<string, unknown> {
  const text = gunzipSync(readFileSync(pathname)).toString("utf8");
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) && parsed.length ? parsed[0] : {};
  }
  const firstLine = text.split("\n").find((line) => line.trim());
  if (!firstLine) return {};
  const parsed = JSON.parse(firstLine);
  if (Array.isArray(parsed?.rows) && parsed.rows.length) return parsed.rows[0];
  return parsed;
}

function classifyRecentView(pathname: string): string {
  const keys = Object.keys(readFirstObjectFromGzip(pathname));
  const has = (key: string) => keys.includes(key);

  if (has("total_content") && has("avg_health_score")) return "v_client_scorecard";
  if (has("sessions_prev_30d") && has("gsc_impressions_pct_change")) return "view_dashboard_summary";
  if (has("impressions_30d") && has("age_tier_order")) return "v_content_30d_age_summary";
  if (has("impressions_90d") && has("impressions_prev_30d") && has("age_tier_order")) return "v_content_90d_age_summary";
  if (has("report_date") && has("chatgpt_pct")) return "v_ai_breakdown";
  if (has("report_date") && has("content_with_ai_traffic")) return "v_ai_breakdown_30d";
  if (has("age_tier_sort") && has("freshness_tier_sort")) return "v_age_tiers_performance_summary";
  if (has("rank_by_impressions") && has("rank_by_health")) return "v_top_performers";
  if (has("priority_score") && has("all_action_types")) return "v_optimization_queue";
  if (has("optimization_status")) return "view_optimization_flags";
  if (has("true_cannibalization_count")) return "v_cannibalization_client_summary";
  if (has("cannibalization_severity")) return "v_cannibalization_action_list";
  if (has("active_clients_90d")) return "v_total_revenue";
  if (has("revenue_per_session") && has("content_id")) return "v_top_revenue_content";
  if (has("revenue_90d") && has("client_id") && !has("content_id")) return "v_client_revenue";

  return "unknown_view";
}

function moveFile(source: string, destination: string) {
  if (source === destination) return;
  if (existsSync(destination)) rmSync(destination);
  ensureDir(dirname(destination));
  renameSync(source, destination);
}

async function gunzipToNdjson(source: string, destination: string) {
  await pipeline(createReadStream(source), createGunzip(), createWriteStream(destination));
}

async function main() {
  const manifest: ManifestEntry[] = [];

  const q1 = join(EXPORTS, "1-full-history-coverage.json");
  const q2 = join(EXPORTS, "2-full-history-client-scorecard.json");
  const q3 = join(EXPORTS, "3-full-history-monthly-trends.json");
  const q4 = join(EXPORTS, "4-full-history-page-level-export");
  const q5 = join(EXPORTS, "5-big-query-downloads");
  const q6 = join(EXPORTS, "6-big-query-downloads");
  const q7 = join(EXPORTS, "7-big-query-downloads");
  const q8 = join(EXPORTS, "8-big-query-downloads");

  const q4Named = join(EXPORTS, "4-full-history-page-level-export.ndjson.gz");
  if (existsSync(q4) && !existsSync(q4Named)) {
    moveFile(q4, q4Named);
  }
  if (existsSync(q4Named)) {
    manifest.push({
      source: "4-full-history-page-level-export",
      destination: "4-full-history-page-level-export.ndjson.gz",
      query: 4,
      kind: detectKind(q4Named),
      bytes: statSync(q4Named).size,
    });
  }

  if (existsSync(q5)) {
    const files = readdirSync(q5).filter((name) => !name.startsWith(".")).sort();
    for (const name of files) {
      const source = join(q5, name);
      const view = classifyRecentView(source);
      const destination = join(q5, `${view}.ndjson.gz`);
      moveFile(source, destination);
      manifest.push({
        source: join("5-big-query-downloads", name),
        destination: join("5-big-query-downloads", `${view}.ndjson.gz`),
        query: 5,
        kind: detectKind(destination),
        bytes: statSync(destination).size,
      });
    }
    const dsStore = join(q5, ".DS_Store");
    if (existsSync(dsStore)) rmSync(dsStore);
  }

  for (const [query, folder, baseName] of [
    [6, q6, "query-history-unified-run1"],
    [7, q7, "query-history-unified-run2"],
  ] as const) {
    if (!existsSync(folder)) continue;
    const shardDir = join(folder, "parts");
    ensureDir(shardDir);
    const sourceFiles = readdirSync(folder)
      .filter((name) => !name.startsWith(".") && name.includes("bq-results") && name !== "parts")
      .sort();

    let index = 0;
    for (const name of sourceFiles) {
      const source = join(folder, name);
      const destination = join(shardDir, `${baseName}.part-${String(index).padStart(5, "0")}.ndjson.gz`);
      moveFile(source, destination);
      manifest.push({
        source: join(`${query}-big-query-downloads`, name),
        destination: join(`${query}-big-query-downloads`, "parts", `${baseName}.part-${String(index).padStart(5, "0")}.ndjson.gz`),
        query,
        kind: detectKind(destination),
        bytes: statSync(destination).size,
      });
      index += 1;
    }

    const combined = join(folder, `${baseName}.ndjson.gz`);
    if (!existsSync(combined)) {
      const parts = readdirSync(shardDir).filter((name) => name.endsWith(".ndjson.gz"));
      if (parts.length) {
        const writer = createWriteStream(combined);
        for (const part of parts.sort()) {
          const stream = createReadStream(join(shardDir, part));
          for await (const chunk of stream) {
            if (!writer.write(chunk)) {
              await new Promise((resolve) => writer.once("drain", resolve));
            }
          }
        }
        writer.end();
        await new Promise((resolve) => writer.once("finish", resolve));
      }
    }

    const unzipped = join(folder, `${baseName}.ndjson`);
    if (existsSync(unzipped)) rmSync(unzipped);

    if (existsSync(combined)) {
      manifest.push({
        source: `${query}-big-query-downloads/parts/*`,
        destination: `${query}-big-query-downloads/${baseName}.ndjson.gz`,
        query,
        kind: detectKind(combined),
        bytes: statSync(combined).size,
        notes: "Concatenated from wildcard shard export; gzip members preserved.",
      });
    }
  }

  if (existsSync(q8)) {
    const files = readdirSync(q8).filter((name) => !name.startsWith(".")).sort();
    if (files.length === 1) {
      const source = join(q8, files[0]);
      const gzDestination = join(q8, "ga4-url-daily-export.ndjson.gz");
      moveFile(source, gzDestination);
      const ndjsonDestination = join(q8, "ga4-url-daily-export.ndjson");
      if (!existsSync(ndjsonDestination)) {
        await gunzipToNdjson(gzDestination, ndjsonDestination);
      }
      manifest.push({
        source: join("8-big-query-downloads", files[0]),
        destination: join("8-big-query-downloads", "ga4-url-daily-export.ndjson.gz"),
        query: 8,
        kind: detectKind(gzDestination),
        bytes: statSync(gzDestination).size,
      });
    }
  }

  for (const pathname of [q1, q2, q3]) {
    if (!existsSync(pathname)) continue;
    manifest.push({
      source: pathname.replace(`${EXPORTS}/`, ""),
      destination: pathname.replace(`${EXPORTS}/`, ""),
      query: Number(pathname.match(/\/(\d+)-/)?.[1] ?? 0),
      kind: detectKind(pathname),
      bytes: statSync(pathname).size,
    });
  }

  writeFileSync(
    join(EXPORTS, "normalized-manifest.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        root: "scripts/paper-creator/data/exports",
        note: "Large NDJSON exports were kept compressed and also materialized as plain .ndjson where practical for downstream use.",
        entries: manifest,
      },
      null,
      2
    )
  );

  console.log(`Normalized ${manifest.length} export artifacts`);
}

await main();
