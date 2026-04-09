import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { styles, colors } from "../pdf-styles";
import { Header, Footer, Def, ChartRead, DisruptionCard, Legend } from "./part1-study";
import { formatCompact } from "../pdf-charts";

function pct(value: any, digits = 1): string {
  const n = Number(value ?? 0);
  return `${n.toFixed(digits)}%`;
}

function num(value: any, digits = 2): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(digits) : "0.00";
}

function metricRow(label: string, value: string, sub?: string) {
  return (
    <View style={{ marginBottom: 6 }} wrap={false}>
      <Text style={styles.comparisonMetricLabel}>{label}</Text>
      <Text style={styles.comparisonMetricValue}>{value}</Text>
      {sub ? <Text style={styles.tableCellMuted}>{sub}</Text> : null}
    </View>
  );
}

function compactList(values: string[] = []) {
  return values.map((value) => `• ${value}`).join("\n");
}

function compactListWithRemainder(values: string[] = [], maxItems = 6) {
  const visible = values.slice(0, maxItems);
  const remainder = values.length - visible.length;
  if (remainder > 0) visible.push(`• +${remainder} more`);
  return visible.join("\n");
}

function signalTable(
  signals: any[],
  title: string,
  includeTarget = true,
) {
  return (
    <View style={styles.table} wrap={false}>
      <Text style={[styles.chartLabel, { margin: 8, marginBottom: 0 }]}>{title}</Text>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderCell, { width: includeTarget ? 62 : 0 }]}>{includeTarget ? "Target" : ""}</Text>
        <Text style={[styles.tableHeaderCell, { width: 98 }]}>Input</Text>
        <Text style={[styles.tableHeaderCell, { width: 44 }]}>Effect</Text>
        <Text style={[styles.tableHeaderCell, { width: 48 }]}>95% CI</Text>
        <Text style={[styles.tableHeaderCell, { width: 42 }]}>Stable</Text>
        <Text style={[styles.tableHeaderCell, { width: 40 }]}>n</Text>
        <Text style={[styles.tableHeaderCell, { width: 34 }]}>Meth</Text>
      </View>
      {signals.map((signal: any, index: number) => (
        <View key={`${signal.feature}-${signal.target}-${index}`} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}>
          <Text style={[styles.tableCell, { width: includeTarget ? 62 : 0 }]}>{includeTarget ? signal.target_label?.replace(" Score", "") ?? "-" : ""}</Text>
          <Text style={[styles.tableCell, { width: 98, fontWeight: "bold" }]}>{signal.feature_label ?? signal.feature}</Text>
          <Text style={[styles.tableCell, { width: 44 }]}>{num(signal.effect_size, 2)}</Text>
          <Text style={[styles.tableCell, { width: 48 }]}>{`${num(signal.ci_low, 2)} / ${num(signal.ci_high, 2)}`}</Text>
          <Text style={[styles.tableCell, { width: 42 }]}>{pct((signal.bootstrap_stability ?? 0) * 100, 0)}</Text>
          <Text style={[styles.tableCell, { width: 40 }]}>{formatCompact(signal.n_total ?? 0)}</Text>
          <Text style={[styles.tableCell, { width: 34 }]}>{signal.method_support_count ?? 0}</Text>
        </View>
      ))}
    </View>
  );
}

export function BottomOpt1_WhatWeOptimizePage({ d }: { d: any }) {
  const tax = d.optimizationFramework?.inputTaxonomy ?? {};
  const outputs = d.optimizationFramework?.outputTaxonomy ?? {};
  const coverage = d.newScoring?.coverage ?? {};

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Bottom Appendix — Optimization Framework" />
      <Text style={styles.sectionTitle}>What We <Text style={styles.sectionTitleAccent}>Optimize.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        This appendix is additive. The existing report above stays intact; the pages below define a new local-only optimization framework for content creation and refresh.
      </Text>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={formatCompact(coverage.total_pages ?? 0)} label="pages scored" />
        <DisruptionCard value={formatCompact(coverage.query_covered_pages ?? 0)} label="pages with query coverage" />
        <DisruptionCard value={pct(coverage.query_covered_pct ?? 0, 1)} label="query-covered share" />
      </View>

      <View style={styles.statCardRow} wrap={false}>
        <View style={styles.statCard}>
          <Text style={styles.chartLabel}>Creation Inputs</Text>
          <Text style={styles.defText}>{compactListWithRemainder(tax.creationTimeControllableInputs ?? [], 8)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.chartLabel}>Refresh Inputs</Text>
          <Text style={styles.defText}>{compactListWithRemainder(tax.refreshTimeControllableInputs ?? [], 6)}</Text>
        </View>
      </View>

      <View style={styles.statCardRow} wrap={false}>
        <View style={styles.statCard}>
          <Text style={styles.chartLabel}>Context / Confounders</Text>
          <Text style={styles.defText}>{compactListWithRemainder(tax.contextConfounders ?? [], 5)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.chartLabel}>Excluded / Leaky</Text>
          <Text style={styles.defText}>{compactListWithRemainder(tax.excludedOrLeakyInputs ?? [], 6)}</Text>
        </View>
      </View>

      <Def
        title="Primary Outputs"
        text={(outputs.primaryOutputsToOptimize ?? []).join(", ")}
      />
      <Def
        title="Secondary Diagnostics"
        text={(outputs.secondaryDiagnostics ?? []).join(", ")}
      />
      <Def
        title="Significance Policy"
        text="Stable signals must clear sample-size gates, FDR correction, group-aware model support, and bootstrap stability. If a subsection has no stable rows, the appendix falls back to directional rows instead of leaving the page blank."
      />

      <Footer />
    </Page>
  );
}

export function BottomOpt2_NewScorePage({ d }: { d: any }) {
  const scoring = d.newScoring ?? {};
  const dist = scoring.distributions ?? {};
  const comp = d.scoringComparison ?? {};

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Bottom Appendix — New Score" />
      <Text style={styles.sectionTitle}>Why The New Score <Text style={styles.sectionTitleAccent}>Exists.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        The legacy score stays in the report above. This section adds a second framework that reduces raw-position fragility and discounts off-target visibility when local query history exists.
      </Text>

      <Def
        title="Why Not Let Raw Position Dominate?"
        text="A page can get noisy early impressions or surface for mismatched demand. That can distort average position without proving the content is actually good. The new score relies more on demand capture, consistency, engagement, and relevance correction."
      />
      <Def
        title="How Relevance Correction Works"
        text="Pages with query-history coverage get a multiplier based on exact-match share, close-match share, off-target share, and the bucket of the top-ranking query. Pages without query coverage keep the core score and receive a lower confidence label instead of a fabricated relevance adjustment."
      />

      <View style={styles.statCardRow} wrap={false}>
        <View style={styles.statCard}>
          <Text style={styles.chartLabel}>Core Quality</Text>
          {metricRow("Median", num(dist.core_quality_score?.p50, 1))}
          {metricRow("P90", num(dist.core_quality_score?.p90, 1))}
          {metricRow("Mean", num(dist.core_quality_score?.mean, 1))}
        </View>
        <View style={styles.statCard}>
          <Text style={styles.chartLabel}>Relevance-Adjusted</Text>
          {metricRow("Median", num(dist.relevance_adjusted_quality_score?.p50, 1))}
          {metricRow("P90", num(dist.relevance_adjusted_quality_score?.p90, 1))}
          {metricRow("Mean", num(dist.relevance_adjusted_quality_score?.mean, 1))}
        </View>
        <View style={styles.statCard}>
          <Text style={styles.chartLabel}>Opportunity</Text>
          {metricRow("Median", num(dist.opportunity_score?.p50, 1))}
          {metricRow("P90", num(dist.opportunity_score?.p90, 1))}
          {metricRow("Mean", num(dist.opportunity_score?.mean, 1))}
        </View>
      </View>

      <View style={styles.comparisonRow} wrap={false}>
        <View style={[styles.comparisonCard, styles.comparisonCardPositive]}>
          <Text style={styles.comparisonCardTitle}>Legacy vs New</Text>
          <View style={styles.comparisonMetricRow}>
            <View style={styles.comparisonMetricCol}>
              {metricRow("Health -> Core", num(comp.correlationHealthToCoreQuality, 3))}
            </View>
            <View style={styles.comparisonMetricCol}>
              {metricRow("Health -> Relevance", num(comp.correlationHealthToRelevanceAdjusted, 3))}
            </View>
            <View style={styles.comparisonMetricCol}>
              {metricRow("Top Decile Overlap", pct(comp.topDecileOverlapPct, 1))}
            </View>
            <View style={styles.comparisonMetricCol}>
              {metricRow("Bottom Decile Overlap", pct(comp.bottomDecileOverlapPct, 1))}
            </View>
          </View>
        </View>
        <View style={[styles.comparisonCard, styles.comparisonCardNegative]}>
          <Text style={styles.comparisonCardTitle}>Disagreement Slice</Text>
          <View style={styles.comparisonMetricRow}>
            <View style={styles.comparisonMetricCol}>
              {metricRow("Cohort Size", formatCompact(comp.disagreementCohortSize ?? 0))}
            </View>
            <View style={styles.comparisonMetricCol}>
              {metricRow("Query-Covered", pct(comp.queryCoveredDisagreementPct, 1))}
            </View>
            <View style={styles.comparisonMetricCol}>
              {metricRow("Avg Off-Target Share", pct(comp.avgOffTargetShareInDisagreement, 1))}
            </View>
          </View>
        </View>
      </View>

      <ChartRead text="High overlap means the old and new systems often agree. The disagreement cohort matters because it isolates pages where raw visibility and relevance-corrected quality tell different stories." />

      <Footer />
    </Page>
  );
}

export function BottomOpt3_CreationSignalsPage({ d }: { d: any }) {
  const topSignals = d.optimizationFramework?.appendixViews?.topCreationSignals ?? [];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Bottom Appendix — Creation Inputs" />
      <Text style={styles.sectionTitle}>Most Significant <Text style={styles.sectionTitleAccent}>Creation Inputs.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Stable creation-side signals are preferred. When none clear the full threshold for a target, this page falls back to the strongest directional rows so the appendix still shows what the local data is pointing toward.
      </Text>

      {signalTable(topSignals.slice(0, 4), "Top Creation Signals")}
      <Def
        title="How To Read This Table"
        text="Effect shows the signed univariate relationship or strongest level contrast. Stability is the share of client-group bootstraps that preserved the direction. Meth counts how many supporting methods cleared the threshold."
      />
      <Legend
        items={[
          { color: colors.chartGreen, label: "High method support = stronger evidence" },
          { color: colors.chartSecondary, label: "Creation inputs are publish-time decisions" },
        ]}
      />

      <Footer />
    </Page>
  );
}

export function BottomOpt4_RefreshSignalsPage({ d }: { d: any }) {
  const topSignals = d.optimizationFramework?.appendixViews?.topRefreshSignals ?? [];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Bottom Appendix — Refresh Inputs" />
      <Text style={styles.sectionTitle}>Most Significant <Text style={styles.sectionTitleAccent}>Refresh Inputs.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Refresh-side rows can represent stable quality-recovery signals or strong directional opportunity signals. The important distinction is that these are post-publication levers, not publish-time choices.
      </Text>

      {signalTable(topSignals.slice(0, 4), "Top Refresh Signals")}
      <Def
        title="Refresh vs Opportunity"
        text="Quality and opportunity are split on purpose. A page can be low quality and low opportunity, or mediocre quality with strong upside. The refresh table surfaces both kinds of signal without collapsing them into one label."
      />

      <Footer />
    </Page>
  );
}

export function BottomOpt5_ComparisonPage({ d }: { d: any }) {
  const comp = d.scoringComparison ?? {};
  const legacy = d.legacyScoringSummary ?? {};
  const growth = d.optimizationFramework?.appendixViews?.topGrowthSignals ?? [];
  const archetypes = d.optimizationFramework?.contentArchetypes ?? [];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Bottom Appendix — Legacy vs New" />
      <Text style={styles.sectionTitle}>Legacy vs New: <Text style={styles.sectionTitleAccent}>Where They Diverge.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        The legacy system remains above. This closing page shows where the new framework agrees with it, where it meaningfully diverges, and which growth-side inputs still matter after the new scoring logic is applied.
      </Text>

      <View style={styles.statCardRow} wrap={false}>
        <View style={styles.statCard}>
          <Text style={styles.chartLabel}>Legacy Snapshot</Text>
          {metricRow("Rows Analyzed", formatCompact(legacy.rowsAnalyzed ?? 0))}
          {metricRow("RF R² Test", num(legacy.rfR2Test, 3))}
          {metricRow("Growth Accuracy", num(legacy.growthAccuracyTest, 3))}
        </View>
        <View style={styles.statCard}>
          <Text style={styles.chartLabel}>Score Agreement</Text>
          {metricRow("Top Overlap", pct(comp.topDecileOverlapPct, 1))}
          {metricRow("Bottom Overlap", pct(comp.bottomDecileOverlapPct, 1))}
          {metricRow("Disagreement Cohort", formatCompact(comp.disagreementCohortSize ?? 0))}
        </View>
        <View style={styles.statCard}>
          <Text style={styles.chartLabel}>Risk Pattern</Text>
          {metricRow("Query-Covered", pct(comp.queryCoveredDisagreementPct, 1))}
          {metricRow("Avg Off-Target Share", pct(comp.avgOffTargetShareInDisagreement, 1))}
        </View>
      </View>

      {signalTable(growth.slice(0, 5), "Top Growth Signals", false)}

      <View style={{ marginTop: 8 }}>
        <Text style={styles.chartLabel}>Content Archetypes Under The New System</Text>
        {archetypes.slice(0, 3).map((cluster: any, index: number) => (
          <View key={index} style={styles.clusterCard} wrap={false}>
            <View style={styles.clusterHeader}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: [colors.chartPrimary, colors.chartSecondary, colors.chartTertiary][index] ?? colors.chartQuaternary }} />
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.textPrimary }}>
                Archetype {index + 1} ({pct(cluster.pct, 1)} of sampled pages)
              </Text>
            </View>
            <Text style={styles.clusterInterpretation}>
              Quality {num(cluster.avgRelevanceAdjustedQualityScore, 1)} | Opportunity {num(cluster.avgOpportunityScore, 1)} |
              Confidence {num(cluster.avgScoreConfidence, 1)} | Mode intent {cluster.modeMainIntent}
            </Text>
          </View>
        ))}
      </View>

      <ChartRead text="The disagreement slice is the practical migration queue. Those are the pages most likely to be overrated by raw visibility or underrated by the old system’s structure." />

      <Footer />
    </Page>
  );
}
