import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components"];
const FILE_EXTENSIONS = new Set([".ts", ".tsx"]);
const RAW_COLOR_PATTERN =
  /\b(?:text|bg|border|ring|outline|from|to|via)-(?:white|black|gray|slate|zinc|neutral)(?:-[0-9]{2,3})?(?:\/[0-9]{1,3})?\b|\bdark:(?:text|bg|border|ring|outline)-(?:white|black|gray|slate|zinc|neutral)(?:-[0-9]{2,3})?(?:\/[0-9]{1,3})?\b/g;

const ALLOWLIST = [
  "app/(auth)/",
  "app/(admin)/[storeHandle]/content/",
  "app/(admin)/[storeHandle]/popovers/",
  "app/(admin)/[storeHandle]/seo/",
  "app/(admin)/admin/batch-queue/",
  "app/embed/",
  "components/admin-dashboard-",
  "components/content-explorer/",
  "components/content-performance/",
  "components/custom-dialogs/",
  "components/custom-sheets/",
  "components/ide/",
  "components/reports/",
  "components/pdf/",
  "components/magicui/",
  "components/popovers/",
  "components/promised-vs-delivered.tsx",
  "components/ui/favicon.tsx",
  "components/ui/safari.tsx",
  "components/content-analytics-chart.tsx",
  "components/content-analytics-cards.tsx",
  "components/content-breakdown-summary.tsx",
  "components/admin-dashboard-distribution-charts.tsx",
  "components/content-performance/shared/chart-tooltip.tsx",
  "components/content-performance/overview/health-distribution.tsx",
  "components/content-performance/overview/trend-charts.tsx",
  "components/content-performance/ai-visibility/ai-traffic-charts.tsx",
];

function shouldAllow(relativePath) {
  return ALLOWLIST.some((entry) => relativePath.startsWith(entry) || relativePath === entry);
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, files);
      continue;
    }

    if (!FILE_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    files.push(absolutePath);
  }
  return files;
}

const violations = [];

for (const scanDir of SCAN_DIRS) {
  const absoluteDir = path.join(ROOT, scanDir);
  if (!fs.existsSync(absoluteDir)) continue;

  for (const filePath of walk(absoluteDir)) {
    const relativePath = path.relative(ROOT, filePath);
    if (shouldAllow(relativePath)) continue;

    const source = fs.readFileSync(filePath, "utf8");
    const matches = [...source.matchAll(RAW_COLOR_PATTERN)];
    if (matches.length === 0) continue;

    violations.push({
      relativePath,
      matches: [...new Set(matches.map((match) => match[0]))].slice(0, 8),
    });
  }
}

if (violations.length > 0) {
  console.error("Theme audit found non-semantic neutral color usage outside the allowlist.\n");
  for (const violation of violations) {
    console.error(`${violation.relativePath}`);
    console.error(`  ${violation.matches.join(", ")}`);
  }
  process.exit(1);
}

console.log("Theme audit passed.");
