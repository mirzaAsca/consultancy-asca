import { BigQuery } from "@google-cloud/bigquery";

const READONLY_STATEMENT = /^\s*(SELECT|WITH)\b/i;
const MUTATION_PATTERN =
  /\b(INSERT|UPDATE|DELETE|MERGE|DROP|TRUNCATE|CREATE|ALTER|GRANT|REVOKE|EXECUTE|CALL|EXPORT)\b/i;
const DISALLOWED_PATTERN = /\b(EXTERNAL_QUERY|CREATE\s+TEMP|REMOTE\s+FUNCTION|ML\.)\b/i;

const PARTITION_GUARDS = [
  { table: "daily_content_performance", column: "report_date" },
  { table: "daily_content_revenue", column: "report_date" },
  { table: "cannibalization_analysis", column: "analysis_date" },
];

type ReadonlyEnv = {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  privateKeyId?: string;
  clientId?: string;
  universeDomain?: string;
  usedReadonlyCredentials: boolean;
};

function readEnv(): ReadonlyEnv {
  const useReadonly =
    Boolean(process.env.BIGQUERY_READONLY_PROJECT_ID) &&
    Boolean(process.env.BIGQUERY_READONLY_PRIVATE_KEY) &&
    Boolean(process.env.BIGQUERY_READONLY_CLIENT_EMAIL);

  const projectId = useReadonly
    ? process.env.BIGQUERY_READONLY_PROJECT_ID
    : process.env.BIGQUERY_PROJECT_ID;
  const privateKey = useReadonly
    ? process.env.BIGQUERY_READONLY_PRIVATE_KEY
    : process.env.BIGQUERY_PRIVATE_KEY;
  const clientEmail = useReadonly
    ? process.env.BIGQUERY_READONLY_CLIENT_EMAIL
    : process.env.BIGQUERY_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error(
      "Missing BigQuery credentials. Expected BIGQUERY_READONLY_* vars or fallback BIGQUERY_* vars."
    );
  }

  return {
    projectId,
    privateKey,
    clientEmail,
    privateKeyId: useReadonly
      ? process.env.BIGQUERY_READONLY_PRIVATE_KEY_ID
      : process.env.BIGQUERY_PRIVATE_KEY_ID,
    clientId: useReadonly
      ? process.env.BIGQUERY_READONLY_CLIENT_ID
      : process.env.BIGQUERY_CLIENT_ID,
    universeDomain: useReadonly
      ? process.env.BIGQUERY_READONLY_UNIVERSE_DOMAIN
      : process.env.BIGQUERY_UNIVERSE_DOMAIN,
    usedReadonlyCredentials: useReadonly,
  };
}

function assertSingleStatement(sql: string): void {
  const trimmed = sql.trim();
  const withoutTrailing = trimmed.replace(/;\s*$/, "");
  if (withoutTrailing.includes(";")) {
    throw new Error("Multiple SQL statements are blocked.");
  }
}

function assertPartitionFilters(sql: string): void {
  const normalized = sql.toLowerCase();
  for (const guard of PARTITION_GUARDS) {
    if (!normalized.includes(guard.table)) continue;
    if (!normalized.includes(guard.column)) {
      throw new Error(
        `Query touching ${guard.table} must include a ${guard.column} filter for partition elimination.`
      );
    }
  }
}

export function assertSafeReadonlySql(sql: string): void {
  if (!READONLY_STATEMENT.test(sql)) throw new Error("Only SELECT queries are allowed.");
  if (MUTATION_PATTERN.test(sql)) throw new Error("Mutation statements are blocked.");
  if (DISALLOWED_PATTERN.test(sql)) throw new Error("Disallowed SQL patterns detected.");
  assertSingleStatement(sql);
  assertPartitionFilters(sql);
}

function normalizeValue(value: any): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item));

  if (typeof value === "object") {
    if ("value" in value && Object.keys(value).length === 1) {
      return normalizeValue((value as { value: any }).value);
    }
    if (typeof value.toNumber === "function") {
      const n = value.toNumber();
      if (Number.isFinite(n)) return n;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalizeValue(nested)])
    );
  }

  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return value;
}

export class NativeReadonlyBigQueryClient {
  private readonly env = readEnv();
  private readonly client: BigQuery;
  readonly usedReadonlyCredentials: boolean;

  constructor() {
    this.client = new BigQuery({
      projectId: this.env.projectId,
      credentials: {
        type: "service_account",
        project_id: this.env.projectId,
        private_key_id: this.env.privateKeyId,
        private_key: this.env.privateKey.replace(/\\n/g, "\n"),
        client_email: this.env.clientEmail,
        client_id: this.env.clientId,
        universe_domain: this.env.universeDomain,
      },
    });
    this.usedReadonlyCredentials = this.env.usedReadonlyCredentials;
  }

  async query(sql: string, dryRun = false): Promise<any[]> {
    assertSafeReadonlySql(sql);

    const [job] = await this.client.createQueryJob({
      query: sql,
      useLegacySql: false,
      dryRun,
    });

    if (dryRun) return [];

    const [rows] = await job.getQueryResults({
      autoPaginate: true,
      wrapIntegers: false,
    } as any);

    return (rows as any[]).map((row) => normalizeValue(row));
  }
}
