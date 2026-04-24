# Analytics Agent Flow — BigQuery Handoff Architecture

> **Last updated:** 2026-02-27

## Module Tree

### Runtime tree

> **Color legend (status reference).**
> - <span style="color:#3b82f6;">**Blue** [implemented]</span> — shipped in codebase
> - <span style="color:#eab308;">**Yellow** [future]</span> — outside current scope, reserved path

<pre>
.
├── config
<span style="color:#3b82f6;">│   ├── flows.config.ts                               [implemented] scheduler allowed_targets includes workflow/agent.run</span>
<span style="color:#3b82f6;">│   ├── agent-flows.config.ts                         [implemented] manager/worker templates, flow defaults, scope/domain/report_type metadata</span>
<span style="color:#3b82f6;">│   ├── bigquery-catalog.ts                           [implemented] static BigQuery catalog constant for prompt variable injection</span>
<span style="color:#3b82f6;">│   └── babo-chat.config.ts                           [implemented] Babo chat model/prompt/tool config (thin wrapper over chat-agents/babo.config)</span>
├── app
<span style="color:#3b82f6;">│   ├── api/babo                                   [implemented] Babo-specific API routes (delegate to generalized chat services)</span>
<span style="color:#3b82f6;">│   │   ├── chat/route.ts                          [implemented] streaming chat endpoint (SSE)</span>
<span style="color:#3b82f6;">│   │   └── threads                                [implemented] thread list/create/get/delete endpoints</span>
<span style="color:#3b82f6;">│   ├── api/chat                                   [implemented] generalized chat API routes with agent_key support</span>
<span style="color:#3b82f6;">│   │   ├── route.ts                               [implemented] streaming chat endpoint (SSE, agent_key param)</span>
<span style="color:#3b82f6;">│   │   └── threads                                [implemented] thread list/create/get/delete with agent_key filtering</span>
<span style="color:#3b82f6;">│   └── (admin)/layout.tsx                          [implemented] mounts global Babo floating widget</span>
├── components
│   ├── custom-dialogs
<span style="color:#3b82f6;">│   │   ├── agent-dialog.tsx                          [implemented] Data Tools section in agent form</span>
<span style="color:#3b82f6;">│   │   └── agent-flow-dialog.tsx                     [implemented] handoff settings UI</span>
<span style="color:#3b82f6;">│   └── babo                                        [implemented] Babo chat frontend components</span>
<span style="color:#3b82f6;">│       ├── babo-chat-widget.tsx                     [implemented] global floating launcher + sheet shell</span>
<span style="color:#3b82f6;">│       ├── babo-chat.tsx                            [implemented] custom chat shell (sidebar + messages + composer)</span>
<span style="color:#3b82f6;">│       ├── babo-message-list.tsx                    [implemented] markdown message renderer + auto-scroll</span>
<span style="color:#3b82f6;">│       ├── babo-input.tsx                           [implemented] chat composer (Enter/Shift+Enter)</span>
<span style="color:#3b82f6;">│       ├── babo-thread-sidebar.tsx                  [implemented] thread list, search, rename, delete</span>
<span style="color:#3b82f6;">│       ├── babo-scope-selector.tsx                  [implemented] L2/L3 scope dropdown</span>
<span style="color:#3b82f6;">│       └── babo-welcome-state.tsx                   [implemented] branded empty state with tips</span>
├── lib
│   ├── agents
│   │   ├── core
<span style="color:#3b82f6;">│   │   │   └── agent-factory.ts                      [implemented] tool instantiation and wiring</span>
│   │   ├── tools
<span style="color:#3b82f6;">│   │   │   ├── descriptions.ts                       [implemented] tool description lookup handling</span>
<span style="color:#3b82f6;">│   │   │   ├── index.ts                              [implemented] exports for data tools</span>
<span style="color:#3b82f6;">│   │   │   ├── registry.ts                           [implemented] tool category and registry entries</span>
<span style="color:#3b82f6;">│   │   │   └── data                                  [implemented] data tool namespace</span>
<span style="color:#3b82f6;">│   │   │       ├── index.ts                          [implemented] data tool exports</span>
<span style="color:#3b82f6;">│   │   │       ├── query-bigquery.tool.ts            [implemented] allowlisted BigQuery query tool</span>
<span style="color:#3b82f6;">│   │   │       ├── explore-bigquery.tool.ts          [implemented] wraps 4 MCP discovery tools as fallback when static catalog may be outdated</span>
<span style="color:#eab308;">│   │   │       └── query-supabase.tool.ts            [future] allowlisted Supabase query tool</span>
<span style="color:#3b82f6;">│   ├── agent-data-clients                            [implemented] external data transport clients</span>
│   │   ├── bigquery
<span style="color:#3b82f6;">│   │   │   ├── mcp.client.ts                         [implemented] BigQuery MCP transport wrapper</span>
<span style="color:#eab308;">│   │   │   └── http.client.ts                        [future] alternative HTTP transport client</span>
<span style="color:#eab308;">│   │   └── supabase                                  [future]</span>
<span style="color:#eab308;">│   │       ├── mcp.client.ts                         [future] Supabase MCP transport client</span>
<span style="color:#eab308;">│   │       └── http.client.ts                        [future] alternative HTTP transport client</span>
│   ├── utils
<span style="color:#3b82f6;">│   │   └── prompt-interpolation.ts                   [implemented] viewCatalog variable for BigQuery catalog injection</span>
├── services
<span style="color:#3b82f6;">│   ├── agent-data                                    [implemented] agent retrieval service layer</span>
<span style="color:#3b82f6;">│   │   ├── index.ts                                  [implemented] gateway entrypoint and exports</span>
│   │   ├── contracts
<span style="color:#3b82f6;">│   │   │   └── query-contracts.ts                    [implemented] query contracts and schema types</span>
│   │   ├── gateways
<span style="color:#3b82f6;">│   │   │   └── analytics-data.gateway.ts             [implemented] gateway interface and orchestration</span>
│   │   └── connectors
│   │       ├── bigquery
<span style="color:#3b82f6;">│   │       │   ├── mcp.connector.ts                  [implemented] BigQuery MCP connector adapter</span>
<span style="color:#eab308;">│   │       │   └── http.connector.ts                 [future] HTTP connector adapter</span>
<span style="color:#eab308;">│   │       └── supabase                              [future]</span>
<span style="color:#eab308;">│   │           └── mcp.connector.ts                  [future] Supabase MCP connector adapter</span>
<span style="color:#3b82f6;">│   ├── babo                                          [implemented] Babo-specific wrappers</span>
<span style="color:#3b82f6;">│   │   ├── babo-scope.service.ts                     [implemented] extends UserScopeService (empty subclass)</span>
<span style="color:#3b82f6;">│   │   └── babo-chat.service.ts                      [implemented] extends ChatService with agentKey="babo"</span>
<span style="color:#3b82f6;">│   ├── chat                                          [implemented] generalized chat services</span>
<span style="color:#3b82f6;">│   │   ├── chat.service.ts                           [implemented] orchestration + SSE event mapping + persistence</span>
<span style="color:#3b82f6;">│   │   └── user-scope.service.ts                     [implemented] scope resolution (active stores -> L2/L3)</span>
├── inngest
<span style="color:#3b82f6;">│   ├── _hooks</span>
<span style="color:#3b82f6;">│   │   └── useAgentOrchestration.ts                  [implemented] handoff orchestration</span>
│   └── flow
│       └── nodeHandlers
<span style="color:#3b82f6;">│           └── agentRun.ts                           [implemented] flow output, artifact handling, envelope wrapping</span>
├── types
<span style="color:#3b82f6;">│   ├── agent.types.ts                                [implemented] agent and flow type updates</span>
<span style="color:#3b82f6;">│   ├── agent-data.types.ts                           [implemented] shared agent-data contracts</span>
<span style="color:#3b82f6;">│   ├── babo-chat.types.ts                            [implemented] re-exports from chat.types with Babo aliases</span>
<span style="color:#3b82f6;">│   └── chat.types.ts                                 [implemented] generalized thread/message/request/stream contracts</span>
├── tests                                              15 test files, 60 tests, all passing
└── docs
    ├── dev
    │   ├── analytics-agent-flow-bigquery-architecture.md   this file
    │   ├── bigquery-query-runtime-improvements.md          Phase 1/1b/2a/2b enhancement details
    │   └── babo-chat-widget-architecture.md                detailed widget implementation spec
    └── user
<span style="color:#3b82f6;">        └── AGENTS-AND-FLOWS-USER-MANUAL.md           [implemented] user-facing flow guidance (data tools, Scheduler placement, viewCatalog, handoff pattern)</span>
</pre>

## Goal
Build a production-ready MVP that runs daily, uses a 2-agent handoff flow, reads analytics data through BigQuery MCP with strict read-only controls, and produces structured analysis output that is easy to extend.

## Why this plan
- Uses the existing stream + agent runtime already in production.
- Uses `handoff` mode (not sequential) as requested.
- Keeps the data access contract modular so MCP can evolve without breaking agent prompts.
- Ships in small validated blocks: build -> test -> optimize -> rollout.
- Keeps existing built-in and custom tool areas unchanged; only adds a new `data` tool surface.

## MVP Scope
- In scope:
  - Daily scheduled stream.
  - Manager agent hands off to Worker agent.
  - Worker reads BigQuery analytics through an allowlisted tool and MCP gateway abstraction.
  - Shared retrieval capability for `L1`/`L2`/`L3` with level-based backend scope enforcement.
  - Structured JSON output persisted in existing flow execution logs/artifacts.
- Out of scope:
  - Autonomous write actions to Supabase or BigQuery.
  - Full reporting UI rebuild.
  - Open-ended SQL execution.
  - Runtime fallback between retrieval backends.
  - Unscoped cross-client querying from agent prompts.

## Architecture (Target)
`Scheduler Node -> Agent Flow Node (Handoff) -> Optional downstream nodes`

- Agent 1: `Data Analysis Manager`.
- Agent 2: `Data Analysis Worker`.
- Transition mode: `handoff`.
- Data access path: `query_bigquery` tool -> `AnalyticsDataGateway` -> `mcp.connector` (MVP default).
- Discovery fallback: `explore_bigquery` tool -> `BigQueryMcpClient` discovery methods (list_datasets, get_dataset_info, list_tables, describe_table). Available to Worker and Babo agents. No scope required.
- Retrieval policy path: `runtime scope context` -> `gateway scope validation` -> `connector SQL scope injection`.
- Output path: `flows_nodes_executions.output` and `agent_artifacts.outputs.<outputVariableName>`.
- `Babo` chat widget is shipped — global floating chat with SSE streaming, thread persistence, and L2/L3 scope enforcement. Generalized into a multi-agent chat system with `agent_key` support.

## Alignment with Native AI Architecture (L1-L4 + Babo)

### Operating model
- `Babo` is above level hierarchy and remains outside the MVP runtime execution path.
- `L1`/`L2`/`L3` use the same retrieval tool surface (`query_bigquery`) with strict scope filters.
- `L4` stays process-focused by default and does not get `query_bigquery` in this MVP unless explicitly enabled later.
- Manager/Worker level assignment is configurable per flow template (no hardcoded global `L3` mapping).

### Capability parity vs scope policy
| Level | Retrieval capability | Maximum data scope | Scope filter requirements |
| --- | --- | --- | --- |
| `L1` | `query_bigquery` enabled | All clients (portfolio) | no `client_id` filter, or explicit `allowed_client_ids = all` |
| `L2` | `query_bigquery` enabled | Assigned client(s) | `allowed_client_ids` required |
| `L3` | `query_bigquery` enabled | Assigned store(s) | `allowed_store_ids` required + resolved `client_id` mapping |
| `L4` | Disabled by default in MVP | Process-local only | N/A (no BigQuery tool assignment by default) |

Rule:
- Capability can be shared, scope cannot be shared.
- Scope is enforced in backend connectors/gateways, not by prompt instructions.
- Mapping reference for `L3` scope enforcement: `repositories/bigquery.repository.ts` maps `store.id -> client_id` during BigQuery sync.

### Metadata fields (implemented)
- Agents: `config.domain`, `config.report_type`, `config.output_contract_version`
- Flows: `config.domain`, `config.report_type`, `config.output_contract_version`
- Flows (scope): `config.scope_level`, `config.scope_ids`, `config.scope_policy_version`, `config.allow_l1_scope`

Runtime scope-source mapping:
- Source of truth: `agentFlow.config.scope_level` + `agentFlow.config.scope_ids`
- Propagation: resolved in `agentRun.ts` and passed as execution metadata into tool runtime
- Consumption: `query_bigquery` reads this runtime metadata and never accepts scope boundaries from prompt text

## Output Storage Strategy

### 1) Runtime source of truth (exists)
- `flows_nodes_executions.output` keeps full node output (results, logs, artifacts).
- `agent_executions.result` keeps per-agent execution-level details.

### 2) Artifact bus (exists)
- `agent_artifacts.outputs.<outputVariableName>` is the downstream variable channel.
- `agent_artifacts.outputs_meta.<outputVariableName>` stores origin metadata.

### 3) Canonical report envelope (implemented)
All generate-mode analysis outputs are wrapped in a standard envelope when `report_type === "daily_data_analysis"` and `output_contract_version` is set:

```json
{
  "schema_version": "1.0",
  "domain": "analytics",
  "report_type": "daily_data_analysis",
  "scope": {
    "scope_level": "L3",
    "client_ids": [123],
    "store_ids": [123],
    "flow_id": 456,
    "flow_node_id": 789
  },
  "producer": {
    "agent_flow_id": 42,
    "agent_flow_title": "Daily Data Analysis (Handoff)"
  },
  "run": {
    "flow_execution_id": 1001,
    "flow_node_execution_id": 2002,
    "triggered_by": "scheduler"
  },
  "payload": {}
}
```

### 4) Durable read model (optional after quality is validated)
- Add `agent_reports` table only when required for indexed cross-flow querying.
- Keep initial MVP on existing execution tables; avoid early schema churn.

## Scalable Module Boundaries

### Keep unchanged
- `lib/agents/tools/general/*` (existing content-edit tools)
- `lib/agents/tools/infographics/*` (existing infographic tools)
- Existing built-in tool wiring (`web_search`, `code_interpreter`) remains where it is.

### Implemented (MVP)
- `lib/agents/tools/data/query-bigquery.tool.ts`
- `lib/agents/tools/data/explore-bigquery.tool.ts`
- `services/agent-data/contracts/query-contracts.ts`
- `types/agent-data.types.ts` (shared export surface for cross-module contracts)
- `services/agent-data/gateways/analytics-data.gateway.ts`
- `services/agent-data/connectors/bigquery/mcp.connector.ts`
- `lib/agent-data-clients/bigquery/mcp.client.ts`
- `services/agent-data/index.ts`
- `config/bigquery-catalog.ts` (static BigQuery catalog for prompt injection)

### Reserved paths (create when feature starts)
- `services/agent-data/connectors/supabase/mcp.connector.ts`
- `services/agent-data/connectors/bigquery/http.connector.ts`
- `lib/agent-data-clients/supabase/mcp.client.ts`
- `lib/agent-data-clients/bigquery/http.client.ts`
- `lib/agents/tools/data/query-supabase.tool.ts`

Rule:
- Agent tools should only call gateway interfaces, never repositories directly.
- Gateways call service connectors.
- Service connectors call raw external transport clients in `lib/` when integration is MCP/HTTP.
- Shared contracts used outside `services/agent-data/*` must be exported from `types/agent-data.types.ts`.
- Retrieval connectors are read-only by contract; no mutation methods are exposed.
- `services/agent-data/*` must not import `services/content-performance.service.ts` or `repositories/content-performance/*`.

## Critical design decisions

### 1) Handoff behavior enforced by prompt + toolChoice
When a flow transition is configured as `handoff`, the Manager agent delegates via prompt instructions (`toolChoice: "auto"`), while the Worker agent is forced to use tools immediately (`toolChoice: "required"`). This approach has proven reliable in practice.

### 2) Query tool is allowlisted
No raw SQL in agent tool parameters.

Implementation rule:
- `query_type` enum only.
- Optional filters (`client_id`, `store_id`, `limit`, `date_range`, `rank_by`, `page`, `page_size`) validated and clamped.

### 3) Same capability, scoped access
`L1`/`L2`/`L3` can share retrieval capability, but not the same data scope.

Implementation rule:
- Scope context is provided by runtime (allowed entity IDs), not by prompt text.
- Gateway/connector must inject and enforce scope constraints on every query.
- Any requested filter outside runtime scope must hard-fail.
- `L4` does not receive `query_bigquery` by default.

### 4) MCP-only backend in MVP
MCP is the only retrieval backend. Failures are fail-fast.

Implementation rule:
- Data connector is fixed to BigQuery MCP.
- If MCP is unavailable, fail run explicitly; do not switch to another backend.

### 5) Read-only at all layers is mandatory
Both BigQuery and Supabase retrieval must remain read-only for all agents, at all times.

Implementation rule:
- Agent-facing tools accept only allowlisted `query_type` parameters, never raw mutation statements.
- BigQuery MCP connector executes only approved read templates and rejects any non-read pattern.
- Supabase retrieval connector (when introduced) must expose read-only views/RPCs only.
- Runtime principals must not be granted write roles for agent retrieval paths.

## Implemented Blocks

### Block 0: Preconditions and baseline checks
- [x] Confirm BigQuery MCP server contract (official endpoint, tools, limits, timeout).
- [x] Confirm required env vars for MCP in deployment targets.
  - MCP env contract (separate from existing sync/write `BIGQUERY_*` vars):
    - `BIGQUERY_MCP_ENDPOINT`, `BIGQUERY_MCP_PROJECT_ID`, `BIGQUERY_MCP_CLIENT_EMAIL`, `BIGQUERY_MCP_PRIVATE_KEY_ID`, `BIGQUERY_MCP_PRIVATE_KEY`, `BIGQUERY_MCP_CLIENT_ID`, `BIGQUERY_MCP_UNIVERSE_DOMAIN`, `BIGQUERY_MCP_LOCATION` (optional)
  - MCP identity vars isolated from existing `BIGQUERY_*` write-capable credentials used by sync/content pipelines.
- [x] Enable BigQuery Server for MCP in target GCP project.
- [x] Confirm OAuth token strategy (API keys are not supported).
- [x] Confirm IAM permissions for MCP usage.
- [x] Confirm dataset location strategy.
- [x] Confirm runtime transport constraints (serverless uses remote HTTP/streamable MCP transport).
- [x] Confirm scope context is always available at runtime.
- [ ] TODO: Verify SA key rotation schedule and permissions match production IAM role.
- [ ] TODO: Verify BigQuery view names match current `bigquery-catalog.ts` constants.

### Block 1: Stream scheduling unlock -- DONE
- [x] In `workflow/scheduler.metadata.allowed_targets`, add `'workflow/agent.run'`.
- Enables `Scheduler -> Run Agent Flow` connection in stream builder validation.

### Block 2 + 2.1: Data Access Layer + MCP safety model -- DONE

New files (all shipped):
- `services/agent-data/contracts/query-contracts.ts`
- `types/agent-data.types.ts`
- `services/agent-data/gateways/analytics-data.gateway.ts`
- `services/agent-data/connectors/bigquery/mcp.connector.ts`
- `lib/agent-data-clients/bigquery/mcp.client.ts`
- `services/agent-data/index.ts`

Implemented:
- [x] Strict query contract with 15 `query_type` templates (original 10 + 5 from Phase 1).
- [x] All 15 templates use explicit column lists (no `SELECT *`).
- [x] Gateway interface: `runQuery(input, scopeContext) -> { source, query_type, rows, row_count, truncated, metadata }`. The tool wrapper adds a `summary` string.
- [x] MCP connector with scope enforcement for L1/L2/L3.
- [x] SQL guardrails: reject non-`SELECT`, disallowed datasets/tables, disallowed patterns.
- [x] Scope guardrails: require `scope_level` + valid scope policy context, deny conflicting predicates.
- [x] 180s client-side timeout on MCP connection.
- [x] Result-size handling: SQL `LIMIT` in templates, `truncated` flag when job is incomplete (returns data with `truncated: true`).
- [x] Read-only principal policy enforced.

### Block 3: Agent data tool (`query_bigquery`) -- DONE

Files (all shipped):
- `lib/agents/tools/data/query-bigquery.tool.ts`
- `lib/agents/tools/data/index.ts`

Implemented:
- [x] `createQueryBigQueryTool()` with zod schema and allowlisted params.
- [x] Runtime scope context read from execution metadata (not from user prompt).
- [x] Wired in factory, registry, descriptions.
- [x] `data` category added to `ToolCategory` union and `getToolsByCategory()`.
- [x] Agent dialog renders Data Tools section.

### `explore_bigquery` tool -- DONE (new)

File: `lib/agents/tools/data/explore-bigquery.tool.ts`

Wraps 4 BigQuery MCP discovery tools as a single agent tool:
- `list_datasets` -- all available datasets
- `get_dataset_info` -- dataset metadata
- `list_tables` -- tables/views in a dataset
- `describe_table` -- full column schema for a specific table

Design:
- Fallback when the static catalog (`${viewCatalog}`) may be outdated.
- Returns metadata only, no data rows.
- Available to Worker and Babo agents.
- No scope required (discovery only).
- Wired into factory, registry, descriptions.

### Block 5: Handoff output correctness -- DONE
- [x] Final output in handoff runs preserves machine-readable payload.
- [x] Synthetic handoff agent results in orchestrator carry structured output.
- [x] `agent_artifacts.outputs.<outputVariableName>` is structured JSON from Worker in handoff mode.

### Block 6: Agent templates (L2->L3 variant) -- DONE

File: `config/agent-flows.config.ts`

Templates shipped:
- `Data Analysis Manager` (initiator): `gpt-5-mini`, minimal tools, produces analysis directive, calls transfer tool.
- `Data Analysis Worker` (specialist): `gpt-5-mini`, `query_bigquery` + `explore_bigquery`, structured output schema.
- `Daily Data Analysis (Handoff)` flow template (L2->L3 variant):
  - `modes: ["handoff"]`, `mode: "generate"`, `outputVariableName: "dailyAnalysis"`
  - `use_conversation_history: true`, `max_turns: 30`
  - L1->L2 and L3->L3 variants: create when needed.

### Block 6.1: Scope and domain metadata -- DONE

Implemented metadata keys:
- Agents: `config.domain`, `config.report_type`, `config.output_contract_version`
- Flows: `config.scope_level`, `config.scope_ids`, `config.scope_policy_version`, `config.allow_l1_scope`

L2->L3 variant values:
- Flow: `scope_level: "L3"`, `scope_ids: { store_ids: [] }` (populated at runtime), `scope_policy_version: "1.0"`
- Worker: `domain: "analytics"`, `report_type: "daily_data_analysis"`, `output_contract_version: "1.0"`

Scope enforcement is flow-level (`scope_level` on the flow config). Per-agent `level` was not needed -- flow-level scope is sufficient.

### Block 7: Built-in tool normalization -- DONE
- [x] Factory normalizes built-ins when stored as plain names (`web_search`, `code_interpreter`), not only `" (built-in)"` suffix.

### Block 9.2: Canonical output envelope -- DONE
- [x] `agent_artifacts.outputs.<outputVariableName>` wrapped in standard envelope (`schema_version`, `domain`, `report_type`, `scope`, `producer`, `run`, `payload`).
- [x] `buildAgentArtifactsOutput` accepts envelope metadata from flow config.
- [x] Applied scope metadata persisted in envelope.

### Block 10: Tests -- 15 files, 60 tests, all passing

Core MVP tests:
- `agent-data-query-contracts.test.ts` -- Zod schema validation for query inputs (6 tests)
- `bigquery-mcp-connector.test.ts` -- SQL template snapshots, scope enforcement for L1/L2/L3, clamping, truncation (17 tests)
- `agent-run-envelope.test.ts` -- output envelope wrapping (2 tests)
- `agent-tools-and-scheduler.test.ts` -- tool registry, scheduler target unlock (2 tests)
- `agent-factory-builtins.test.ts` -- built-in tool normalization (2 tests)
- `agent-orchestration-handoff.test.ts` -- handoff behavior and synthetic result shaping (2 tests)

Babo / generalized chat tests:
- `babo-chat.service.test.ts` -- service streaming, scope validation, thread management (5 tests)
- `babo-chat.route.test.ts` -- API auth and error handling (4 tests)
- `babo-scope.service.test.ts` -- L2/L3 scope resolution (5 tests)
- `babo-chat-streaming.test.ts` -- SSE event contracts, error propagation (2 tests)
- `babo-thread-routes.test.ts` -- thread CRUD routes (5 tests)
- `chat.route.test.ts` -- generalized chat route auth and streaming (3 tests)
- `chat-threads.route.test.ts` -- generalized thread routes (2 tests)

Other:
- `heartbeat.test.ts` -- health check (1 test)
- `keyword-processor-runs.route.test.ts` -- keyword processor routes (2 tests)

### Block 12: Babo chat widget + generalized chat -- DONE

> **Detailed spec**: [`babo-chat-widget-architecture.md`](./babo-chat-widget-architecture.md)

Shipped:
- Custom SSE streaming chat in Next.js with thread/message persistence.
- Babo-specific files are thin wrappers over generalized `Chat*` classes.
- Tables: `chat_threads`/`chat_messages` with `agent_key` column.
- Generalized API routes at `/api/chat/*` support multiple agent personas via `agent_key` param.
- Server-side scope resolution mandatory: client-provided scope is never trusted.
- "All Projects" resolves to L2 with all active store IDs via `UserScopeService`.
- Global bottom-right floating widget icon mounted in admin layout.
- Tool call persistence stores summary metadata only (no full row payloads).

## Remaining Work (TODO)

### Block 8: Stream wiring (Scheduler -> Agent Run) -- operational config
- [ ] Create a stream: Node 1 = `Scheduler`, Node 2 = `Run Agent Flow` (Daily Data Analysis Handoff flow).
- [ ] Scheduler fields: `frequency` = daily (24h bucket), `count` = `1`.
- [ ] Ensure Agent Flow is enabled (`status_id = 1`) and both agents enabled.

### Block 8.1: ANL naming convention
- [ ] Use naming convention: `ANL - <scope> - <purpose>` for analytics streams.
- [ ] Keep analytics streams separate from content-generation streams.
- [ ] Keep output in artifacts/logs and optional notification nodes only.

### Phase 0 operational checks
- [ ] Verify SA key rotation schedule and permissions in production.
- [ ] Verify BigQuery view names match current `bigquery-catalog.ts` constants.

## Delivery Sequence

| Step | Blocks | Status |
| --- | --- | --- |
| 1 | Block 1 + Block 7 | DONE |
| 2 | Block 2 + 2.1 + Block 3 + `explore_bigquery` | DONE |
| 3 | Block 5 | DONE |
| 4 | Block 6 + Block 6.1 | DONE |
| 5 | Block 9.2 | DONE |
| 6 | Block 10 (tests) | DONE -- 15 files, 60 tests |
| 7 | Block 12 (Babo chat) | DONE |
| 8 | Phase 3 hardening (explicit columns, timeout) | DONE |
| 9 | Block 8 + 8.1 (stream wiring + naming) | TODO -- operational config |
| 10 | Phase 0 operational checks | TODO |

## Definition of Done
- [x] Scheduler -> Agent Run connection is unlocked.
- [x] Manager delegates to Worker through actual handoff events.
- [x] Worker queries BigQuery through gateway-backed allowlisted query types on MCP.
- [x] `explore_bigquery` provides schema discovery fallback for Worker and Babo agents.
- [x] All 15 SQL templates use explicit column lists (no `SELECT *`). 180s client-side MCP timeout.
- [x] Retrieval capability is shared across `L1`/`L2`/`L3` with enforced runtime scope filters.
- [x] Final output is structured JSON in `agent_artifacts.outputs.dailyAnalysis`.
- [x] Output includes canonical envelope fields (`schema_version`, `domain`, `report_type`, `scope`, `producer`, `run`, `payload`).
- [x] Analytics flows tagged with scope/domain/report_type metadata for L1-L4 expansion.
- [x] `L4` process agents remain excluded from BigQuery tool assignment by default.
- [x] `Babo` chat widget shipped with server-enforced scope policy. Generalized into multi-agent chat system.
- [x] Failure modes are explicit (MCP unavailable, invalid query params, scope violations).
- [x] Retrieval permissions are read-only by design and by runtime credentials.
- [x] Tests pass: 15 files, 60 tests, all green.
- [ ] Daily stream runs via Scheduler (Block 8 -- operational config, pending).

## Risks and mitigations
- Risk: Manager does not hand off.
  - Mitigation: explicit manager instructions + Worker `toolChoice: "required"` + handoff-mode orchestration.
- Risk: MCP transport instability.
  - Mitigation: 180s client-side timeout + explicit failure; no implicit backend switch.
- Risk: Output becomes plain text in handoff chain.
  - Mitigation: handoff output normalization and synthetic result output preservation.
- Risk: Tool not instantiated due naming mismatch.
  - Mitigation: factory-level built-in normalization for plain names.
- Risk: L3 identity strategy assumes store_id === client_id.
  - Mitigation: Valid while the stores table uses the same ID space as BigQuery client_id. If this changes, callers must provide an explicit store_client_map or paired client_ids to `resolveStoreClientMapping()`.

## Phase: UI/UX Enhancements

### Chat Improvements (Babo)
- **Suggestion chips on welcome state**: 6 predefined analytics queries as clickable pills on the empty-state screen. Wired to `sendMessage` for one-click query dispatch.
- **Copy toolbar on assistant messages**: Hover-to-reveal copy button on assistant bubbles with visual feedback (check icon for 2s). Copies raw markdown content.
- **Enhanced tool call display**: Contextual `ToolCallCard` replaces raw JSON `<details>`:
  - `SUMMARY_QUERY_TYPES` (scorecard, dashboard_summary, etc.) → KPI metric pills
  - `TABLE_QUERY_TYPES` (optimization_queue, top_performers, etc.) → 3-row preview table with "Show all" toggle
  - Fallback → collapsible JSON for unknown types
- **Shared markdown utilities**: Extracted `sanitizeModelHtml()` and `renderMarkdown()` to `lib/utils/markdown.ts` for reuse across chat and report viewer.

### Streams Sub-Page (under Agents)
- **Navigation**: Horizontal tabs on Agents section — "Management" (existing page) + "Streams" (new page at `/{handle}/agents/streams`).
- **Page layout**: Follows Content Streams page pattern — `motion.div` animation, `DataTable`, tooltip header, filter by status.
- **Columns**: Stream name (with domain badge), agents, coordination mode, last updated, active toggle, actions dropdown.
- **Actions**: Run Stream (opens `FlowTestDialog`), Edit Stream (opens `AgentFlowDialog`), Delete Stream.
- **Scope**: Shows only DB instances (no config templates). Generic naming — not tied to analytics domain.

### Report Viewer Component
- **`AgentReportViewer`** (`components/agents/agent-report-viewer.tsx`): Reusable viewer for structured agent output.
  - Markdown rendering via shared `renderMarkdown()` with copy toolbar
  - Optional tabbed view when structured data (JSON rows) is present: Report tab + Data tab with expandable preview table
  - Metadata badges for execution context (query type, row count, etc.)

### Files
| File | Action |
|------|--------|
| `lib/utils/markdown.ts` | New — shared markdown utilities |
| `components/babo/babo-message-list.tsx` | Modified — copy toolbar, ToolCallCard, shared imports |
| `components/babo/babo-welcome-state.tsx` | Modified — suggestion chips |
| `components/babo/babo-chat.tsx` | Modified — wire suggestion click |
| `components/navigation/nav-header.tsx` | Modified — Agents section tabs |
| `app/(admin)/[storeHandle]/agents/streams/page.tsx` | New — Streams sub-page |
| `components/custom-tables/agent-streams/columns.tsx` | New — streams table columns |
| `components/agents/agent-report-viewer.tsx` | New — report viewer component |

## Post-MVP extensions

> **Lessons from MVP implementation:**
> - Static catalog injection via prompt variable is more useful than runtime schema discovery via tool call. Prefer giving agents curated context upfront.
> - `toolChoice: "required"` is more reliable than prompt-based behavioral rules for forcing immediate tool execution.
> - Production-quality prompts (Phase 1b) were the single highest-ROI change for analysis quality.
> - The enhancement plan (`bigquery-query-runtime-improvements.md`) covers Phase 2b (custom queries) details.

- Add Slack digest node after agent run.
- Add dedicated `data_analysis_reports` table only if analytics consumers need indexed queryability beyond existing flow logs.
- Add more query types as new BigQuery views become stable.
- Introduce per-client parallel runs by cloning stream with store-specific config.
- Add `query_supabase` tool via the same gateway/connector pattern.
- Add vector-memory retrieval tool for manager/worker historical context.
- Add upstream weekly/escalation report emitters for Babo-style aggregation.
- Optionally add ChatKit UI migration later if built-in feedback/widgets become priority.
- Add L1->L2 and L3->L3 flow template variants when those use cases are active.
