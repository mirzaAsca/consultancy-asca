#!/usr/bin/env bun
/**
 * Reads paper-data.json → renders the research paper → writes PDF.
 */

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { ResearchPaper } from "./paper/research-pdf";

const DATA_PATH = join(import.meta.dir, "data", "paper-data.json");
const OUTPUT_DIR = join(import.meta.dir, "output");
const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12); // e.g. 202603261639
const OUTPUT_PATH = join(OUTPUT_DIR, `${ts}-flyrank-seo-research-march-2026.pdf`);

async function main() {
  console.log("Loading paper data...");
  const raw = readFileSync(DATA_PATH, "utf8");
  const data = JSON.parse(raw);

  console.log(`Data loaded: ${data.scope?.totalContentFmt} content, ${data.scope?.clientCount} clients`);
  console.log(`  ML: ${data.ml?.clusters?.length ?? 0} clusters, ${data.ml?.featureImportance?.length ?? 0} features`);
  console.log(`  Myths: ${Object.keys(data.myths ?? {}).length}`);
  console.log(`  Discoveries: ${Object.keys(data.discoveries ?? {}).length}`);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Rendering PDF...");
  const buffer = await renderToBuffer(
    React.createElement(ResearchPaper, { data })
  );

  writeFileSync(OUTPUT_PATH, buffer);
  console.log(`PDF written to: ${OUTPUT_PATH}`);
  console.log(`Size: ${(buffer.length / 1024).toFixed(0)} KB`);
}

main().catch((err) => {
  console.error("PDF generation failed:", err.message ?? err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
