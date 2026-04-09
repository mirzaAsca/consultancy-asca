#!/usr/bin/env bun
/**
 * Rebuilds the paper end-to-end:
 * 1. hydrate local canonical inputs from the normalized export bundle
 * 2. full-history derived aggregates
 * 3. ML analysis
 * 4. paper-data.json
 * 5. PDF
 */

import { spawnSync } from "child_process";

type Step = {
  label: string;
  cmd: string[];
};

const steps: Step[] = [
  { label: "Hydrate local inputs from export bundle", cmd: ["bun", "scripts/paper-creator/hydrate-local-data-from-exports.ts"] },
  { label: "Derive full-history aggregates", cmd: ["bun", "scripts/paper-creator/derive-full-history-data.ts"] },
  { label: "Run ML analysis", cmd: ["python3", "scripts/paper-creator/analysis/analyze.py"] },
  { label: "Run optimization analysis", cmd: ["python3", "scripts/paper-creator/analysis/optimize.py"] },
  { label: "Build paper data", cmd: ["bun", "scripts/paper-creator/build-paper-data.ts"] },
  { label: "Generate PDF", cmd: ["bun", "scripts/paper-creator/generate.ts"] },
];

for (const step of steps) {
  console.log(`\n== ${step.label} ==`);
  const result = spawnSync(step.cmd[0], step.cmd.slice(1), {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${step.label} failed with exit code ${result.status ?? "unknown"}`);
  }
}

console.log("\nPaper rebuild completed successfully.");
