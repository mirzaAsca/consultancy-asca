# Claude Research Workflow

Comprehensive BigQuery CLI that queries through the **MCP read-only service account** with all connector guardrails active.

**BigQuery CLI:** `scripts/paper-creator/bq.ts`

## Quick Start

```bash
# Health check
bun scripts/paper-creator/bq.ts health

# List all views/tables
bun scripts/paper-creator/bq.ts list-tables

# Describe a view schema
bun scripts/paper-creator/bq.ts describe v_client_scorecard

# Run a template query
bun scripts/paper-creator/bq.ts query client_scorecard --limit 5

# Run raw SQL
bun scripts/paper-creator/bq.ts sql "SELECT client_id, client_name FROM \`gsc-bigquery-project-447113.central_data_warehouse.dim_clients\` LIMIT 10"
```

## Commands

### Exploration

| Command                      | Description                                                       |
| ---------------------------- | ----------------------------------------------------------------- |
| `health`                     | MCP connectivity check — verifies `execute_sql` tool is available |
| `list-tools`                 | Available MCP tools on the server                                 |
| `list-datasets`              | All datasets in the BigQuery project                              |
| `list-tables [dataset]`      | Tables and views in a dataset (default: `central_data_warehouse`) |
| `inventory [dataset]`        | INFORMATION_SCHEMA inventory with table types and creation dates  |
| `describe <table> [dataset]` | Full schema of a table/view — column names, types, modes          |
| `preview <table> [dataset]`  | Quick data preview (default: 5 rows, first 12 columns)            |

### Raw SQL

```bash
# Inline query
bun scripts/paper-creator/bq.ts sql "SELECT ..."

# From file
bun scripts/paper-creator/bq.ts sql --file path/to/query.sql

# From stdin
echo "SELECT 1" | bun scripts/paper-creator/bq.ts sql -

# Dry run (validate without executing)
bun scripts/paper-creator/bq.ts sql "SELECT ..." --dry-run
```

Safety checks apply to all raw SQL:

- Only `SELECT` statements allowed
- `INSERT`, `UPDATE`, `DELETE`, `DROP`, `MERGE`, etc. are blocked
- `EXTERNAL_QUERY`, `CREATE TEMP`, `REMOTE FUNCTION`, `ML.*` are blocked

### Template Queries

Template queries go through the `BigQueryMcpConnector` which adds:

- SQL generation from validated templates
- Allowed-views whitelist enforcement (14 views only)
- Scope enforcement (L1/L2/L3)
- Safety assertions on the generated SQL

```bash
bun scripts/paper-creator/bq.ts query <type> [options]
```

## Template Query Types

### Portfolio & Overview

| Type                | View                     | Description                                                                       |
| ------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| `client_scorecard`  | `v_client_scorecard`     | Portfolio KPIs: content counts, health, impressions, clicks, sessions, AI traffic |
| `dashboard_summary` | `view_dashboard_summary` | 30d vs prev-30d comparison with diffs and pct_change                              |

### Trends

| Type                 | View                 | Description                                                                     |
| -------------------- | -------------------- | ------------------------------------------------------------------------------- |
| `trend_daily`        | `v_trend_daily`      | Daily client-level totals. **Requires** `--date_start` and `--date_end`         |
| `ai_breakdown_daily` | `v_ai_breakdown_30d` | Daily AI traffic by source (ChatGPT, Perplexity, Gemini, Copilot, Claude, Meta) |

### Content Performance

| Type                      | View                              | Description                                                       |
| ------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| `top_performers`          | `v_top_performers`                | Ranked content. Use `--rank_by` (impressions, clicks, ai, health) |
| `biggest_decliners`       | `v_content_90d_summary`           | Content with `is_declining=TRUE`, worst trend first               |
| `content_age_summary`     | `v_content_30d_age_summary`       | Per-content 30d metrics with age/freshness tiers and action flags |
| `content_age_90d_summary` | `v_content_90d_age_summary`       | Per-content 90d metrics with decline/underperformer tracking      |
| `age_tiers_performance`   | `v_age_tiers_performance_summary` | Aggregated by age_tier and freshness_tier                         |

### AI Traffic

| Type               | View                    | Description                                                         |
| ------------------ | ----------------------- | ------------------------------------------------------------------- |
| `ai_visibility`    | `v_ai_breakdown`        | AI traffic by source and date. Supports `--date_start`/`--date_end` |
| `ai_opportunities` | `v_content_90d_summary` | Content with organic traffic but zero AI sessions                   |

### Optimization

| Type                 | View                      | Description                                                      |
| -------------------- | ------------------------- | ---------------------------------------------------------------- |
| `optimization_queue` | `v_optimization_queue`    | Priority-scored content with action types. Paginated             |
| `optimization_flags` | `view_optimization_flags` | Simple status labels: Fix CTR, Fix Content, Zombie Page, Healthy |

### Cannibalization

| Type                      | View                               | Description                           |
| ------------------------- | ---------------------------------- | ------------------------------------- |
| `cannibalization_summary` | `v_cannibalization_client_summary` | Client-level cannibalization overview |
| `cannibalization_actions` | `v_cannibalization_action_list`    | Keyword-level action items. Paginated |

## Flags Reference

### Global Flags

| Flag                 | Description                                         |
| -------------------- | --------------------------------------------------- |
| `--json`             | Output as JSON                                      |
| `--csv`              | Output as CSV                                       |
| `--format json\|csv` | Alternative to `--json`/`--csv`                     |
| `--dataset <name>`   | Override default dataset (`central_data_warehouse`) |
| `--dry-run`          | Validate SQL without executing                      |

### Query Filters

| Flag                        | Description                                                      | Used by                                                     |
| --------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| `--client_id <n>`           | Filter to specific client                                        | All query types                                             |
| `--limit <n>`               | Max rows, 1-100 (default: 25)                                    | All query types                                             |
| `--date_start YYYY-MM-DD`   | Date range start                                                 | trend_daily, ai_visibility, ai_breakdown_daily              |
| `--date_end YYYY-MM-DD`     | Date range end                                                   | trend_daily, ai_visibility, ai_breakdown_daily              |
| `--rank_by <dim>`           | impressions, clicks, ai, health                                  | top_performers                                              |
| `--page <n>`                | Page number (starts at 1)                                        | optimization*queue, cannibalization_actions, content_age*\* |
| `--page_size <n>`           | Page size, 1-100 (default: 25)                                   | Same as --page                                              |
| `--age_tier <tier>`         | 0-14, 15-30, 31-90, 91-180, 181-365, 365+                        | content*age*_, content*age_90d*_                            |
| `--freshness_tier <tier>`   | 0-30, 31-90, 91-180, 181+                                        | content*age*_, content*age_90d*_                            |
| `--content_type <type>`     | blog_post, landing_page, product_page, category_page, guide, faq | content*age*\*                                              |
| `--main_intent <intent>`    | informational, transactional, navigational, commercial           | content*age*\*                                              |
| `--optimization_status <s>` | "Fix CTR", "Fix Content", "Zombie Page", "Healthy"               | optimization_flags                                          |
| `--min_health_score <n>`    | Minimum health score (0-100)                                     | content*age*\*                                              |
| `--max_health_score <n>`    | Maximum health score (0-100)                                     | content*age*\*                                              |

### Preview Flags

| Flag                  | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `--limit <n>`         | Number of rows to preview (default: 5)                |
| `--columns col1,col2` | Explicit column selection (default: first 12 columns) |

## Examples

### Exploration workflow

```bash
# What datasets exist?
bun scripts/paper-creator/bq.ts list-datasets

# What's in central_data_warehouse?
bun scripts/paper-creator/bq.ts inventory

# What columns does a view have?
bun scripts/paper-creator/bq.ts describe v_trend_daily

# Quick peek at the data
bun scripts/paper-creator/bq.ts preview v_trend_daily --limit 3
```

### Client analysis

```bash
# All clients ranked by impressions
bun scripts/paper-creator/bq.ts query client_scorecard --limit 100

# Single client deep dive
bun scripts/paper-creator/bq.ts query dashboard_summary --client_id 3

# Client daily trends over a period
bun scripts/paper-creator/bq.ts query trend_daily --client_id 3 --date_start 2026-01-01 --date_end 2026-03-24

# AI traffic breakdown for a client
bun scripts/paper-creator/bq.ts query ai_breakdown_daily --client_id 58 --date_start 2026-01-01 --date_end 2026-03-24
```

### Content performance

```bash
# Top performers by AI traffic
bun scripts/paper-creator/bq.ts query top_performers --rank_by ai --limit 20

# Biggest decliners
bun scripts/paper-creator/bq.ts query biggest_decliners --limit 20

# Content with organic traffic but no AI sessions
bun scripts/paper-creator/bq.ts query ai_opportunities --limit 20

# Old content that needs refresh
bun scripts/paper-creator/bq.ts query content_age_summary --freshness_tier 181+ --limit 20
```

### Data export

```bash
# Export client scorecard as CSV
bun scripts/paper-creator/bq.ts query client_scorecard --limit 100 --csv > /tmp/scorecard.csv

# Export as JSON for processing
bun scripts/paper-creator/bq.ts query dashboard_summary --json > /tmp/dashboard.json

# Raw SQL export
bun scripts/paper-creator/bq.ts sql "SELECT * FROM \`gsc-bigquery-project-447113.central_data_warehouse.dim_clients\`" --csv > /tmp/clients.csv
```

## Architecture

```
bq.ts
  ├── Exploration commands ── BigQueryMcpClient (list/describe/preview)
  ├── Raw SQL ────────────── assertSafeSql() → BigQueryMcpClient.executeSql()
  └── Template queries ───── BigQueryMcpConnector.runQuery()
                              ├── Zod validation of input
                              ├── Scope enforcement (L1/L2/L3)
                              ├── SQL template generation
                              ├── assertSafeSql() (SELECT-only, view whitelist)
                              └── BigQueryMcpClient.executeSql()
```

All paths use the **MCP read-only service account** (`agent-mcp-readonly-357@...`).

Template queries additionally enforce the 14-view whitelist and scope policies from the connector.

## Available Data

### Base Tables

| Table                       | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `daily_content_performance` | Daily fact table: per-content, per-day metrics              |
| `dim_clients`               | Client metadata: handle, name, GSC/GA4 flags, active status |
| `all_content_data`          | Content synced from Supabase                                |
| `cannibalization_analysis`  | Raw cannibalization data (nested, requires UNNEST)          |
| `daily_content_revenue`     | Revenue attribution per content per day                     |

### Key Metrics

- **Health Score** (0-100): impressions (30pts) + position (30pts) + CTR (20pts) + scroll depth (20pts)
- **Position Tiers:** top_3 (1-3), page_1 (4-10), striking (11-20), page_3_5 (21-50), deep (50+)
- **AI Traffic Sources:** ChatGPT/OpenAI, Perplexity, Gemini, Copilot, Claude, Meta AI
- **Action Flags:** needs_indexing, is_quick_win, needs_ctr_fix, needs_engagement_fix, ai_opportunity, is_declining, is_underperformer

## Differences from bq:mcp

| Feature              | `bq:mcp` (bigquery-mcp.ts) | `bq-claude` (`scripts/paper-creator/bq.ts`) |
| -------------------- | -------------------------- | ------------------------------------------- |
| Exploration          | Yes                        | Yes                                         |
| Raw SQL              | Yes                        | Yes                                         |
| Template queries     | No                         | Yes (15 types via connector)                |
| Scope enforcement    | No                         | Yes (L1/L2/L3)                              |
| View whitelist       | No                         | Yes (14 allowed views)                      |
| Output formats       | JSON only                  | Table, JSON, CSV                            |
| File/stdin SQL       | Yes                        | Yes                                         |
| Dry-run              | Yes                        | Yes                                         |
| Schema normalization | Yes                        | Yes (fetches view schema for templates)     |
