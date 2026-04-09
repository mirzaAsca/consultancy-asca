#!/usr/bin/env bun
/**
 * bq-claude — Comprehensive BigQuery CLI through MCP read-only service account.
 *
 * Combines exploration, raw SQL, and template queries with full connector
 * guardrails (SELECT-only, allowed-views whitelist, scope enforcement).
 *
 * All queries go through the MCP read-only service account.
 * All template queries go through BigQueryMcpConnector safety assertions.
 *
 * Run `bun scripts/paper-creator/bq.ts help` for usage.
 */

import { readFile } from "fs/promises";
import { stdin as input } from "process";
import { BigQueryMcpClient } from "@/lib/agent-data-clients/bigquery/mcp.client";
import { BigQueryMcpConnector } from "@/services/agent-data/connectors/bigquery/mcp.connector";
import type { QueryInput, ScopeContext, QueryType } from "@/types/agent-data.types";
import { QUERY_TYPES } from "@/types/agent-data.types";

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_DATASET = process.env.BIGQUERY_CENTRAL_DATASET_ID || "central_data_warehouse";
const DEFAULT_PROJECT = process.env.BIGQUERY_MCP_PROJECT_ID || "";

const SELECT_STATEMENT = /^\s*SELECT\b/i;
const MUTATION_PATTERN =
  /\b(INSERT|UPDATE|DELETE|MERGE|DROP|TRUNCATE|CREATE|ALTER|GRANT|REVOKE|EXECUTE|CALL)\b/i;
const DISALLOWED_PATTERN = /\b(EXTERNAL_QUERY|CREATE\s+TEMP|REMOTE\s+FUNCTION|ML\.)\b/i;

/** Maps each template query_type to the underlying BigQuery view name. */
const QUERY_TYPE_TO_VIEW: Record<QueryType, string> = {
  client_scorecard: "v_client_scorecard",
  dashboard_summary: "view_dashboard_summary",
  trend_daily: "v_trend_daily",
  optimization_queue: "v_optimization_queue",
  top_performers: "v_top_performers",
  biggest_decliners: "v_content_90d_summary",
  ai_visibility: "v_ai_breakdown",
  ai_opportunities: "v_content_90d_summary",
  cannibalization_summary: "v_cannibalization_client_summary",
  cannibalization_actions: "v_cannibalization_action_list",
  content_age_summary: "v_content_30d_age_summary",
  content_age_90d_summary: "v_content_90d_age_summary",
  age_tiers_performance: "v_age_tiers_performance_summary",
  optimization_flags: "view_optimization_flags",
  ai_breakdown_daily: "v_ai_breakdown_30d",
};

/** L1 (admin) scope — full access to all clients. */
const CLI_SCOPE: ScopeContext = {
  scope_level: "L1",
  allowed_client_ids: "all",
  scope_policy_version: "cli-v1",
};

// ── BigQuery wire-format normalization ───────────────────────────────────────

type SchemaField = {
  name: string;
  type?: string;
  mode?: string;
  fields?: SchemaField[];
};

function decodeCellValue(value: unknown, field?: SchemaField): unknown {
  if (value === null || value === undefined) return null;

  if (field?.mode === "REPEATED" && Array.isArray(value)) {
    return value.map((item) =>
      decodeCellValue((item as { v?: unknown })?.v ?? item, { ...field, mode: undefined })
    );
  }

  if (field?.type === "RECORD" && field.fields && value && typeof value === "object") {
    const nested = (value as { f?: Array<{ v?: unknown }> }).f;
    if (!Array.isArray(nested)) return value;
    return Object.fromEntries(
      field.fields.map((f, i) => [f.name, decodeCellValue(nested[i]?.v, f)])
    );
  }

  if (field?.type === "BOOLEAN") return value === true || value === "true";

  if (
    typeof value === "string" &&
    field?.type &&
    ["INTEGER", "INT64", "FLOAT", "FLOAT64", "NUMERIC", "BIGNUMERIC"].includes(field.type)
  ) {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }

  return value;
}

/** Converts BigQuery wire-format rows ({f:[{v:...}]}) to plain objects using schema. */
function normalizeRows(
  schema: Record<string, unknown> | undefined,
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  if (rows.length === 0) return rows;

  const fields = Array.isArray((schema as any)?.fields)
    ? ((schema as any).fields as SchemaField[])
    : [];

  if (fields.length === 0) return rows;

  return rows.map((row) => {
    const cells = Array.isArray((row as any).f) ? ((row as any).f as Array<{ v?: unknown }>) : [];
    if (cells.length === 0) return row;
    return Object.fromEntries(
      fields.map((field, i) => [field.name, decodeCellValue(cells[i]?.v, field)])
    );
  });
}

/**
 * Fetches the schema of a view/table and uses it to normalize connector result rows.
 * Falls back to SQL-preview parsing if schema fetch fails.
 */
async function normalizeConnectorRows(
  client: BigQueryMcpClient,
  queryType: QueryType,
  rows: Record<string, unknown>[],
  sqlPreview: string
): Promise<Record<string, unknown>[]> {
  if (rows.length === 0 || !("f" in rows[0])) return rows;

  // Try to get the view schema for proper column names + type coercion
  const viewName = QUERY_TYPE_TO_VIEW[queryType];
  if (viewName) {
    try {
      const info = await client.getTableInfo(DEFAULT_DATASET, viewName);
      if (info.schema?.fields && info.schema.fields.length > 0) {
        // The view schema has ALL columns, but the query SELECT may only pick some.
        // Extract column names from the SQL preview to know which subset was selected.
        const selectedCols = extractColumnNames(sqlPreview);
        if (selectedCols.length > 0) {
          // Build a filtered schema with only the selected columns, in order
          const fieldMap = new Map(info.schema.fields.map((f) => [f.name, f]));
          const filteredFields = selectedCols
            .map((name) => fieldMap.get(name))
            .filter(Boolean) as SchemaField[];

          if (filteredFields.length === selectedCols.length) {
            return normalizeRows({ fields: filteredFields } as any, rows);
          }
        }

        // Fallback: use full schema if column count matches
        if (info.schema.fields.length >= (rows[0] as any).f?.length) {
          return normalizeRows({ fields: info.schema.fields } as any, rows);
        }
      }
    } catch {
      // Schema fetch failed — fall through to SQL parsing
    }
  }

  // Final fallback: parse column names from SQL preview
  return normalizeRowsFromSqlPreview(rows, sqlPreview);
}

/** Extracts column names from a SQL SELECT clause (handles truncated previews). */
function extractColumnNames(sql: string): string[] {
  const match = sql.match(/SELECT\s+([\s\S]+?)(?:\s+FROM\s|\s*$)/i);
  if (!match) return [];

  return match[1]
    .split(",")
    .map((c) => c.trim().split(/\s+/).pop()!)
    .filter((c) => c && !c.startsWith("`") && !c.includes("(") && /^[a-z_]\w*$/i.test(c));
}

/** Fallback normalization from SQL preview when schema is unavailable. */
function normalizeRowsFromSqlPreview(
  rows: Record<string, unknown>[],
  sqlPreview: string
): Record<string, unknown>[] {
  const colNames = extractColumnNames(sqlPreview);
  if (colNames.length === 0) return rows;

  return rows.map((row) => {
    const cells = (row as any).f as Array<{ v?: unknown }>;
    if (!Array.isArray(cells)) return row;
    return Object.fromEntries(cells.map((cell, i) => [colNames[i] ?? `col_${i}`, cell.v]));
  });
}

// ── CLI argument parsing ─────────────────────────────────────────────────────

type ParsedArgs = {
  command: string;
  positional: string[];
  flags: Map<string, string | boolean>;
};

function parseCliArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string | boolean>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const eqIdx = arg.indexOf("=");
    if (eqIdx !== -1) {
      // --key=value style
      flags.set(arg.slice(2, eqIdx), arg.slice(eqIdx + 1));
      continue;
    }

    const name = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags.set(name, true);
    } else {
      flags.set(name, next);
      i++;
    }
  }

  const command = positional.shift() || "help";
  return { command, positional, flags };
}

function getFlag(p: ParsedArgs, name: string): string | undefined {
  const v = p.flags.get(name);
  return typeof v === "string" ? v : undefined;
}

function getBool(p: ParsedArgs, name: string): boolean {
  return p.flags.get(name) === true;
}

function getInt(p: ParsedArgs, name: string, defaultVal: number): number {
  const v = getFlag(p, name);
  if (!v) return defaultVal;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Expected positive integer for --${name}, got: ${v}`);
  return n;
}

function getDataset(p: ParsedArgs, positionalIdx = 0): string {
  return getFlag(p, "dataset") || p.positional[positionalIdx] || DEFAULT_DATASET;
}

// ── Table reference parsing ──────────────────────────────────────────────────

function parseTableRef(value: string, fallbackDataset: string): { dataset: string; table: string } {
  const trimmed = value.replace(/`/g, "").trim();
  if (!trimmed) throw new Error("Table name is required.");

  // project:dataset.table
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":")[1].split(".");
    if (parts.length < 2) throw new Error(`Invalid table reference: ${value}`);
    return { dataset: parts[0], table: parts[1] };
  }

  const parts = trimmed.split(".");
  if (parts.length === 3) return { dataset: parts[1], table: parts[2] };
  if (parts.length === 2) return { dataset: parts[0], table: parts[1] };
  return { dataset: fallbackDataset, table: trimmed };
}

function quoteId(name: string): string {
  if (!SAFE_IDENTIFIER.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `\`${name}\``;
}

/**
 * Validates that a string is a safe BigQuery identifier (dataset name, table name).
 * Prevents SQL injection via interpolated identifiers in backtick-quoted refs.
 *
 * Dataset/table names: alphanumeric + underscores only.
 * Project IDs: also allows hyphens (e.g. gsc-bigquery-project-447113).
 */
const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SAFE_PROJECT_ID = /^[A-Za-z][A-Za-z0-9_-]*$/;

function assertSafeIdentifier(value: string, label: string): void {
  const pattern = label === "project" ? SAFE_PROJECT_ID : SAFE_IDENTIFIER;
  if (!pattern.test(value)) {
    throw new Error(`Invalid ${label}: "${value}". Contains disallowed characters.`);
  }
}

// ── SQL safety checks ────────────────────────────────────────────────────────

/**
 * Validates that a SQL string is read-only and does not contain mutation or
 * dangerous patterns. Called on ALL SQL before execution — both user-provided
 * and internally-constructed queries (belt + suspenders).
 */
function assertSafeSql(sql: string): void {
  if (!SELECT_STATEMENT.test(sql)) throw new Error("Only SELECT queries are allowed.");
  if (MUTATION_PATTERN.test(sql)) throw new Error("Mutation statements are blocked.");
  if (DISALLOWED_PATTERN.test(sql)) throw new Error("Disallowed SQL patterns detected.");
}

// ── stdin reader ─────────────────────────────────────────────────────────────

async function readStdin(): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of input) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function resolveSql(p: ParsedArgs): Promise<string> {
  const filePath = getFlag(p, "file");
  if (filePath) return readFile(filePath, "utf8");
  if (p.positional[0] === "-") return readStdin();
  return p.positional.join(" ");
}

// ── Output formatting ────────────────────────────────────────────────────────

type OutputFormat = "table" | "json" | "csv";

function resolveFormat(p: ParsedArgs): OutputFormat {
  if (getBool(p, "csv")) return "csv";
  if (getBool(p, "json")) return "json";
  if (getFlag(p, "format") === "csv") return "csv";
  if (getFlag(p, "format") === "json") return "json";
  return "table";
}

function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function printCsv(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);

  // Header
  console.log(cols.map(csvEscape).join(","));

  // Rows
  for (const row of rows) {
    console.log(cols.map((c) => csvEscape(String(row[c] ?? ""))).join(","));
  }
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function printTable(rows: Record<string, unknown>[], maxColWidth = 50): void {
  if (rows.length === 0) {
    console.log("(no rows)");
    return;
  }

  const cols = Object.keys(rows[0]);
  const widths: Record<string, number> = {};

  for (const col of cols) {
    widths[col] = col.length;
    for (const row of rows) {
      const len = String(row[col] ?? "").length;
      widths[col] = Math.max(widths[col], Math.min(len, maxColWidth));
    }
  }

  const header = cols.map((c) => c.padEnd(widths[c])).join(" | ");
  const separator = cols.map((c) => "─".repeat(widths[c])).join("─┼─");

  console.log(header);
  console.log(separator);

  for (const row of rows) {
    const line = cols
      .map((c) => {
        const val = String(row[c] ?? "");
        return val.length > maxColWidth
          ? val.slice(0, maxColWidth - 3) + "..."
          : val.padEnd(widths[c]);
      })
      .join(" | ");
    console.log(line);
  }
}

function outputRows(rows: Record<string, unknown>[], format: OutputFormat): void {
  switch (format) {
    case "json":
      printJson(rows);
      break;
    case "csv":
      printCsv(rows);
      break;
    case "table":
    default:
      printTable(rows);
      break;
  }
}

// ── Help ─────────────────────────────────────────────────────────────────────

function printUsage(): void {
  console.log(`
bq-claude — BigQuery CLI (MCP read-only, all guardrails active)

Usage:
  bun scripts/paper-creator/bq.ts <command> [args] [--flags]

Exploration:
  health                              MCP connectivity check
  list-tools                          Available MCP tools
  list-datasets                       All datasets in the project
  list-tables [dataset]               Tables/views in a dataset
  inventory [dataset]                 INFORMATION_SCHEMA inventory
  describe <table> [dataset]          Full schema of a table/view
  preview <table> [dataset]           Quick data preview

Raw SQL:
  sql "<SELECT ...>"                  Execute a SELECT query
  sql --file path/to/query.sql        Execute SQL from file
  sql -                               Read SQL from stdin

Template Queries (connector guardrails + scope enforcement):
  query <type> [options]              Run a template query

Query Types:
  ${QUERY_TYPES.join(", ")}

Global Flags:
  --json                  Output as JSON
  --csv                   Output as CSV
  --format json|csv       Same as above
  --dataset <name>        Override default dataset (${DEFAULT_DATASET})
  --dry-run               Dry-run SQL (validate without executing)

Query Flags:
  --client_id <n>         Filter by client ID
  --limit <n>             Max rows (1-100, default 25)
  --date_start YYYY-MM-DD Date range start
  --date_end YYYY-MM-DD   Date range end
  --rank_by <dim>         impressions | clicks | ai | health
  --page <n>              Page number (paginated queries)
  --page_size <n>         Page size (1-100)
  --age_tier <tier>       0-14 | 15-30 | 31-90 | 91-180 | 181-365 | 365+
  --freshness_tier <tier> 0-30 | 31-90 | 91-180 | 181+
  --content_type <type>   blog_post | landing_page | product_page | etc.
  --main_intent <intent>  informational | transactional | navigational | commercial
  --optimization_status   "Fix CTR" | "Fix Content" | "Zombie Page" | "Healthy"
  --min_health_score <n>  Minimum health score (0-100)
  --max_health_score <n>  Maximum health score (0-100)

Preview Flags:
  --limit <n>             Rows to preview (default: 5)
  --columns col1,col2     Explicit columns (default: first 12)

Examples:
  bun scripts/paper-creator/bq.ts health
  bun scripts/paper-creator/bq.ts inventory
  bun scripts/paper-creator/bq.ts describe v_client_scorecard
  bun scripts/paper-creator/bq.ts preview v_trend_daily --limit 3
  bun scripts/paper-creator/bq.ts sql "SELECT client_id, client_name FROM \`${DEFAULT_PROJECT}.${DEFAULT_DATASET}.dim_clients\` LIMIT 5"
  bun scripts/paper-creator/bq.ts query client_scorecard --limit 5
  bun scripts/paper-creator/bq.ts query dashboard_summary --client_id 3 --json
  bun scripts/paper-creator/bq.ts query trend_daily --date_start 2026-01-01 --date_end 2026-03-24
  bun scripts/paper-creator/bq.ts query top_performers --rank_by ai --limit 10 --csv
`.trim());
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function cmdHealth(client: BigQueryMcpClient, p: ParsedArgs): Promise<void> {
  const fmt = resolveFormat(p);
  const startedAt = Date.now();
  const tools = await client.listTools();
  const ok = tools.includes("execute_sql");
  const latencyMs = Date.now() - startedAt;

  if (fmt === "json") {
    printJson({ ok, latency_ms: latencyMs, tools });
  } else {
    console.log(ok ? `OK (${latencyMs}ms)` : `UNHEALTHY (${latencyMs}ms)`);
    console.log(`Tools: ${tools.join(", ")}`);
  }

  if (!ok) process.exit(1);
}

async function cmdListTools(client: BigQueryMcpClient, p: ParsedArgs): Promise<void> {
  const tools = await client.listTools();
  if (resolveFormat(p) === "json") {
    printJson({ tools });
  } else {
    console.log("MCP Tools:");
    for (const t of tools) console.log(`  ${t}`);
  }
}

async function cmdListDatasets(client: BigQueryMcpClient, p: ParsedArgs): Promise<void> {
  const datasets = await client.listDatasetIds();
  const fmt = resolveFormat(p);

  if (fmt === "json") {
    printJson({ count: datasets.length, datasets });
  } else {
    console.log(`Datasets (${datasets.length}):`);
    for (const d of datasets) {
      // Strip project prefix for readability
      const short = d.includes(":") ? d.split(":")[1] : d;
      console.log(`  ${short}`);
    }
  }
}

async function cmdListTables(client: BigQueryMcpClient, p: ParsedArgs): Promise<void> {
  const dataset = getDataset(p);
  const tables = await client.listTableIds(dataset);
  const fmt = resolveFormat(p);

  if (fmt === "json") {
    printJson({ dataset, count: tables.length, tables });
  } else {
    console.log(`Tables in ${dataset} (${tables.length}):`);
    for (const t of tables) {
      const short = t.includes(".") ? t.split(".").pop() : t;
      console.log(`  ${short}`);
    }
  }
}

async function cmdInventory(client: BigQueryMcpClient, p: ParsedArgs): Promise<void> {
  const dataset = getDataset(p);
  assertSafeIdentifier(dataset, "dataset");

  const query = `
    SELECT
      table_name,
      table_type,
      FORMAT_TIMESTAMP('%F %T UTC', creation_time) AS created_at
    FROM \`${DEFAULT_PROJECT}.${dataset}.INFORMATION_SCHEMA.TABLES\`
    ORDER BY table_name
  `.trim();

  assertSafeSql(query);
  const result = await client.executeSql({ query });
  const rows = normalizeRows(result.schema, result.rows);
  const fmt = resolveFormat(p);

  if (fmt === "json") {
    printJson({ dataset, row_count: rows.length, rows });
  } else {
    console.log(`Inventory of ${dataset}:\n`);
    outputRows(rows, fmt);
    console.log(`\n${rows.length} objects`);
  }
}

async function cmdDescribe(client: BigQueryMcpClient, p: ParsedArgs): Promise<void> {
  const rawTable = p.positional[0];
  if (!rawTable) throw new Error("describe requires a table name.");

  const { dataset, table } = parseTableRef(rawTable, getDataset(p, 1));
  assertSafeIdentifier(dataset, "dataset");
  assertSafeIdentifier(table, "table");
  const info = await client.getTableInfo(dataset, table);
  const fmt = resolveFormat(p);

  if (fmt === "json") {
    printJson({ dataset, table, info });
    return;
  }

  console.log(`Table: ${dataset}.${table} (${info.type})`);
  if (info.description) console.log(`Description: ${info.description}`);
  if (info.numRows) console.log(`Rows: ${Number(info.numRows).toLocaleString()}`);
  if (info.timePartitioning)
    console.log(`Partitioned by: ${info.timePartitioning.field || info.timePartitioning.type}`);
  if (info.clustering) console.log(`Clustered by: ${info.clustering.fields.join(", ")}`);

  if (info.schema?.fields && info.schema.fields.length > 0) {
    console.log(`\nSchema (${info.schema.fields.length} columns):`);
    for (const f of info.schema.fields) {
      const desc = f.description ? ` — ${f.description}` : "";
      console.log(`  ${f.name.padEnd(40)} ${f.type.padEnd(12)} ${f.mode}${desc}`);
    }
  }
}

async function cmdPreview(client: BigQueryMcpClient, p: ParsedArgs): Promise<void> {
  const rawTable = p.positional[0];
  if (!rawTable) throw new Error("preview requires a table name.");

  const { dataset, table } = parseTableRef(rawTable, getDataset(p, 1));
  assertSafeIdentifier(dataset, "dataset");
  assertSafeIdentifier(table, "table");
  const info = await client.getTableInfo(dataset, table);
  const schemaFields = info.schema?.fields || [];
  const limit = getInt(p, "limit", 5);

  const explicitCols = getFlag(p, "columns")
    ?.split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const columns =
    explicitCols && explicitCols.length > 0
      ? explicitCols
      : schemaFields.slice(0, Math.min(schemaFields.length, 12)).map((f) => f.name);

  if (columns.length === 0) throw new Error(`No columns available to preview for ${dataset}.${table}`);

  const query = `
    SELECT ${columns.map(quoteId).join(", ")}
    FROM \`${DEFAULT_PROJECT}.${dataset}.${table}\`
    LIMIT ${limit}
  `.trim();

  assertSafeSql(query);

  const dryRun = getBool(p, "dry-run");
  if (dryRun) {
    const result = await client.executeSql({ query, dryRun: true });
    printJson({ dry_run: true, query, schema: result.schema, errors: result.errors });
    return;
  }

  const result = await client.executeSql({ query });
  const rows = normalizeRows(result.schema, result.rows);
  const fmt = resolveFormat(p);

  if (fmt === "json") {
    printJson({ dataset, table, selected_columns: columns, row_count: rows.length, rows });
  } else {
    console.log(`Preview of ${dataset}.${table} (${limit} rows):\n`);
    outputRows(rows, fmt);
  }
}

async function cmdSql(client: BigQueryMcpClient, p: ParsedArgs): Promise<void> {
  const sql = (await resolveSql(p)).trim();
  if (!sql) throw new Error("sql requires a query string, --file, or stdin (-).");

  assertSafeSql(sql);

  const dryRun = getBool(p, "dry-run");
  const result = await client.executeSql({ query: sql, dryRun });
  const rows = normalizeRows(result.schema, result.rows);
  const fmt = resolveFormat(p);

  if (dryRun) {
    printJson({ dry_run: true, query: sql, schema: result.schema, errors: result.errors });
    return;
  }

  if (fmt === "json") {
    printJson({ row_count: rows.length, rows, errors: result.errors, job_complete: result.jobComplete });
  } else {
    outputRows(rows, fmt);
    if (fmt === "table") console.log(`\n${rows.length} rows`);
  }
}

async function cmdQuery(client: BigQueryMcpClient, p: ParsedArgs): Promise<void> {
  const queryType = p.positional[0] as QueryType;
  if (!queryType || !QUERY_TYPES.includes(queryType)) {
    console.error(`Invalid query_type: "${queryType}"`);
    console.error(`\nValid types:\n  ${QUERY_TYPES.join("\n  ")}`);
    process.exit(1);
  }

  const queryInput: QueryInput = {
    query_type: queryType,
    ...(getFlag(p, "client_id") && { client_id: Number(getFlag(p, "client_id")) }),
    ...(getFlag(p, "limit") && { limit: Number(getFlag(p, "limit")) }),
    ...(getFlag(p, "date_start") &&
      getFlag(p, "date_end") && {
      date_range: { start: getFlag(p, "date_start")!, end: getFlag(p, "date_end")! },
    }),
    ...(getFlag(p, "rank_by") && { rank_by: getFlag(p, "rank_by") as QueryInput["rank_by"] }),
    ...(getFlag(p, "page") && { page: Number(getFlag(p, "page")) }),
    ...(getFlag(p, "page_size") && { page_size: Number(getFlag(p, "page_size")) }),
    ...(getFlag(p, "age_tier") && { age_tier: getFlag(p, "age_tier") as QueryInput["age_tier"] }),
    ...(getFlag(p, "freshness_tier") && {
      freshness_tier: getFlag(p, "freshness_tier") as QueryInput["freshness_tier"],
    }),
    ...(getFlag(p, "content_type") && {
      content_type: getFlag(p, "content_type") as QueryInput["content_type"],
    }),
    ...(getFlag(p, "main_intent") && {
      main_intent: getFlag(p, "main_intent") as QueryInput["main_intent"],
    }),
    ...(getFlag(p, "optimization_status") && {
      optimization_status: getFlag(p, "optimization_status") as QueryInput["optimization_status"],
    }),
    ...(getFlag(p, "min_health_score") && { min_health_score: Number(getFlag(p, "min_health_score")) }),
    ...(getFlag(p, "max_health_score") && { max_health_score: Number(getFlag(p, "max_health_score")) }),
  };

  const scope: ScopeContext = getFlag(p, "client_id")
    ? { ...CLI_SCOPE, allowed_client_ids: [Number(getFlag(p, "client_id"))] }
    : CLI_SCOPE;

  const connector = new BigQueryMcpConnector(client);

  // Connector handles: SQL generation, safety assertions, scope enforcement, execution
  const result = await connector.runQuery(queryInput, scope);

  // Normalize wire-format rows using the view schema (fetches schema for proper column names)
  const rows = await normalizeConnectorRows(client, queryType, result.rows, result.metadata.query_preview);
  const fmt = resolveFormat(p);

  if (fmt === "json") {
    printJson({
      query_type: result.query_type,
      row_count: result.row_count,
      truncated: result.truncated,
      rows,
      metadata: {
        scope_level: result.metadata.scope_level,
        latency_ms: result.metadata.latency_ms,
        job_complete: result.metadata.job_complete,
        errors: result.metadata.errors,
      },
    });
  } else {
    outputRows(rows, fmt);
    if (fmt === "table") {
      console.log(
        `\n${result.row_count} rows | ${result.metadata.latency_ms}ms | scope: ${result.metadata.scope_level} | truncated: ${result.truncated}`
      );
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const parsed = parseCliArgs(process.argv.slice(2));

  if (parsed.command === "help" || parsed.command === "--help" || getBool(parsed, "help")) {
    printUsage();
    return;
  }

  const client = new BigQueryMcpClient();

  switch (parsed.command) {
    case "health":
      return cmdHealth(client, parsed);
    case "list-tools":
      return cmdListTools(client, parsed);
    case "list-datasets":
      return cmdListDatasets(client, parsed);
    case "list-tables":
      return cmdListTables(client, parsed);
    case "inventory":
      return cmdInventory(client, parsed);
    case "describe":
      return cmdDescribe(client, parsed);
    case "preview":
      return cmdPreview(client, parsed);
    case "sql":
      return cmdSql(client, parsed);
    case "query":
      return cmdQuery(client, parsed);
    default:
      console.error(`Unknown command: "${parsed.command}". Run with "help" for usage.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
