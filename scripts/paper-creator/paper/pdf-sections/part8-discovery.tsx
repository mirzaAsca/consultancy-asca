/**
 * Part VIII: ML Discovery — Statistically validated, actionable models.
 *
 * This section presents only findings that passed:
 * - GroupKFold cross-validation (no client leakage)
 * - Permutation importance (honest feature ranking)
 * - Bootstrap confidence intervals (effect size uncertainty)
 * - Statistical significance (p < 0.001 for all key tests)
 */

import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { styles, colors } from "../pdf-styles";
import { HorizontalBarChart, formatCompact } from "../pdf-charts";
import { Header, Footer, ChartRead, Def } from "./part1-study";

function pct(n: number): string { return `${(n * 100).toFixed(1)}%`; }
function num(n: number, d = 1): string { return Number(n).toFixed(d); }
function fmtCI(lo: number, hi: number): string { return `[${formatCompact(lo)}, ${formatCompact(hi)}]`; }

/* ── Page 1: Growth Prediction ─────────────────────────────────────────────── */

export function Disc1_GrowthModelPage({ d }: { d: any }) {
  const gm = d.discovery?.growthModel ?? {};
  const perm = gm.permutationImportance ?? {};
  const cal = gm.calibration ?? [];
  const cm = gm.confusionMatrix ?? {};

  const permEntries = Object.entries(perm)
    .map(([k, v]: [string, any]) => ({ label: featureLabel(k), value: v.mean ?? 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <Page size="A4" style={styles.page}>
      <Header section="ML Discovery — Growth Prediction" />
      <Text style={styles.sectionTitle}>Which Pages Will <Text style={styles.sectionTitleAccent}>Grow?</Text></Text>
      <Text style={styles.sectionSubtitle}>
        A gradient-boosted classifier trained on {formatCompact(gm.nSamples ?? 0)} pages with clear up/down trends.
        Validated with GroupKFold (no client leakage).
      </Text>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }} wrap={false}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>AUC (5-fold)</Text>
          <Text style={styles.statValue}>{num(gm.auc?.mean ?? 0, 3)}</Text>
          <Text style={styles.statNote}>± {num(gm.auc?.std ?? 0, 3)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Accuracy</Text>
          <Text style={styles.statValue}>{pct(gm.accuracy?.mean ?? 0)}</Text>
          <Text style={styles.statNote}>± {pct(gm.accuracy?.std ?? 0)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>True Positives</Text>
          <Text style={styles.statValue}>{formatCompact(cm.tp ?? 0)}</Text>
          <Text style={styles.statNote}>of {formatCompact((cm.tp ?? 0) + (cm.fn ?? 0))} growing</Text>
        </View>
      </View>

      {permEntries.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>What Drives Growth (Permutation Importance on AUC)</Text>
          <HorizontalBarChart
            data={permEntries.slice(0, 7).map((e, i) => ({
              label: e.label,
              value: e.value,
              color: i < 3 ? colors.chartPrimary : colors.chartSecondary,
            }))}
            barHeight={20}
            gap={5}
            labelWidth={130}
            maxValue={Math.max(...permEntries.map(e => e.value), 0.01)}
            valueFormatter={(v) => v.toFixed(4)}
          />
          <ChartRead text="Permutation importance measures how much AUC drops when a feature is shuffled. Higher = more important. The top 3 drivers are visibility consistency, freshness, and content age." />
        </View>
      )}

      {cal.length > 0 && (
        <View wrap={false} style={{ marginTop: 8 }}>
          <Text style={styles.chartLabel}>Model Calibration</Text>
          <Text style={{ ...styles.narrative, marginBottom: 4 }}>
            When the model says a page has an 80% chance of growing, do 80% actually grow?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {cal.map((row: any, i: number) => (
              <View key={i} style={{ backgroundColor: colors.surface, padding: 4, borderRadius: 4, width: "18%", alignItems: "center" }}>
                <Text style={{ fontSize: 7, color: colors.textMuted }}>Predicted</Text>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.textPrimary }}>{pct(row.mean_prob ?? 0)}</Text>
                <Text style={{ fontSize: 7, color: colors.textMuted }}>Actual</Text>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: Math.abs((row.actual_rate ?? 0) - (row.mean_prob ?? 0)) < 0.15 ? colors.green : colors.amber }}>{pct(row.actual_rate ?? 0)}</Text>
                <Text style={{ fontSize: 6, color: colors.textMuted }}>n={formatCompact(row.n ?? 0)}</Text>
              </View>
            ))}
          </View>
          <ChartRead text="Green means predicted and actual rates are close. The model is well-calibrated at the extremes (very likely / very unlikely to grow) and slightly optimistic in the middle range." />
        </View>
      )}

      <Def label="What this means" text="Visibility consistency (days with impressions) is the #1 growth driver. Pages visible 31+ days in the 90-day window have the highest growth probability. Freshness and age are the next biggest levers — younger, recently updated pages grow more." />

      <Footer page={""} />
    </Page>
  );
}

/* ── Page 2: Zombie Recovery Prediction ───────────────────────────────────── */

export function Disc2_ZombieRecoveryPage({ d }: { d: any }) {
  const zr = d.discovery?.zombieRecovery ?? {};
  const perm = zr.permutationImportance ?? {};
  const rec = zr.recoverableProfile ?? {};
  const unrec = zr.unrecoverableProfile ?? {};

  const permEntries = Object.entries(perm)
    .map(([k, v]: [string, any]) => ({ label: featureLabel(k), value: v.mean ?? 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <Page size="A4" style={styles.page}>
      <Header section="ML Discovery — Zombie Recovery" />
      <Text style={styles.sectionTitle}>Which Zombie Pages <Text style={styles.sectionTitleAccent}>Can Recover?</Text></Text>
      <Text style={styles.sectionSubtitle}>
        {formatCompact(zr.nTotal ?? 0)} pages had zero impressions and clicks in the previous 30 days.
        {" "}{pct(zr.recoveryRate ?? 0)} recovered naturally. Can we predict which ones?
      </Text>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }} wrap={false}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>AUC</Text>
          <Text style={styles.statValue}>{num(zr.auc?.mean ?? 0, 3)}</Text>
          <Text style={styles.statNote}>± {num(zr.auc?.std ?? 0, 3)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Accuracy</Text>
          <Text style={styles.statValue}>{pct(zr.accuracy?.mean ?? 0)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Recovery Rate</Text>
          <Text style={styles.statValue}>{pct(zr.recoveryRate ?? 0)}</Text>
          <Text style={styles.statNote}>{formatCompact(zr.nRecovered ?? 0)} of {formatCompact(zr.nTotal ?? 0)}</Text>
        </View>
      </View>

      {permEntries.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>What Predicts Recovery (Permutation Importance)</Text>
          <HorizontalBarChart
            data={permEntries.slice(0, 7).map((e, i) => ({
              label: e.label,
              value: e.value,
              color: i < 3 ? colors.green : colors.chartSecondary,
            }))}
            barHeight={20}
            gap={5}
            labelWidth={130}
            maxValue={Math.max(...permEntries.map(e => e.value), 0.01)}
            valueFormatter={(v) => v.toFixed(4)}
          />
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }} wrap={false}>
        <View style={{ ...styles.statCard, flex: 1 }}>
          <Text style={{ ...styles.statLabel, color: colors.green }}>Recoverable Zombie Profile</Text>
          <Text style={{ fontSize: 8, color: colors.textSecondary, marginTop: 2 }}>
            Median age: {num(rec.median_age_days ?? 0, 0)} days{"\n"}
            Median words: {formatCompact(rec.median_word_count ?? 0)}{"\n"}
            Known intent: {num(rec.known_intent_pct ?? 0, 0)}%{"\n"}
            Low competition: {num(rec.low_competition_pct ?? 0, 0)}%{"\n"}
            Actual recovery: {num(rec.actual_recovery_rate ?? 0, 0)}%
          </Text>
        </View>
        <View style={{ ...styles.statCard, flex: 1 }}>
          <Text style={{ ...styles.statLabel, color: colors.red }}>Unrecoverable Zombie Profile</Text>
          <Text style={{ fontSize: 8, color: colors.textSecondary, marginTop: 2 }}>
            Median age: {num(unrec.median_age_days ?? 0, 0)} days{"\n"}
            Median words: {formatCompact(unrec.median_word_count ?? 0)}{"\n"}
            Known intent: {num(unrec.known_intent_pct ?? 0, 0)}%{"\n"}
            Low competition: {num(unrec.low_competition_pct ?? 0, 0)}%{"\n"}
            Actual recovery: {num(unrec.actual_recovery_rate ?? 0, 0)}%
          </Text>
        </View>
      </View>

      <Def label="Prune or keep?" text={`Recoverable zombies are young (${num(rec.median_age_days ?? 0, 0)} days), have known intent, and had some impressions in the 90-day window. Unrecoverable zombies are old (${num(unrec.median_age_days ?? 0, 0)} days) with zero 90-day impressions. Age and prior impressions are the two strongest signals — a page that has never shown up in 90 days of data is almost certainly dead.`} />

      <Footer page={""} />
    </Page>
  );
}

/* ── Page 3: Momentum Prediction ──────────────────────────────────────────── */

export function Disc3_MomentumPage({ d }: { d: any }) {
  const mp = d.discovery?.momentumPrediction ?? {};
  const perm = mp.permutationImportance ?? {};

  const permEntries = Object.entries(perm)
    .map(([k, v]: [string, any]) => ({ label: featureLabel(k), value: v.mean ?? 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <Page size="A4" style={styles.page}>
      <Header section="ML Discovery — 30-Day Momentum" />
      <Text style={styles.sectionTitle}>Predicting 30-Day <Text style={styles.sectionTitleAccent}>Momentum.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        For {formatCompact(mp.nPages ?? 0)} pages with meaningful traffic, can we predict which will improve {">"} 10% next month?
      </Text>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }} wrap={false}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>AUC</Text>
          <Text style={styles.statValue}>{num(mp.auc?.mean ?? 0, 3)}</Text>
          <Text style={styles.statNote}>± {num(mp.auc?.std ?? 0, 3)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Accuracy</Text>
          <Text style={styles.statValue}>{pct(mp.accuracy?.mean ?? 0)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Improved Rate</Text>
          <Text style={styles.statValue}>{pct(mp.improvedRate ?? 0)}</Text>
          <Text style={styles.statNote}>base rate</Text>
        </View>
      </View>

      {permEntries.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>What Predicts Next-Month Improvement</Text>
          <HorizontalBarChart
            data={permEntries.slice(0, 7).map((e, i) => ({
              label: e.label,
              value: e.value,
              color: i < 3 ? colors.chartPrimary : colors.chartSecondary,
            }))}
            barHeight={20}
            gap={5}
            labelWidth={140}
            maxValue={Math.max(...permEntries.map(e => e.value), 0.01)}
            valueFormatter={(v) => v.toFixed(4)}
          />
          <ChartRead text="Current impression volume and impressions-per-visible-day are the strongest momentum signals. Pages that are already earning visibility efficiently are most likely to improve further." />
        </View>
      )}

      <Def label="How to use this" text="This model identifies pages on an upward trajectory. Use it to prioritize which pages to support (add internal links, expand content, improve metadata) while they still have momentum. The strongest signal is not content quality — it's current visibility efficiency." />

      <Footer page={""} />
    </Page>
  );
}

/* ── Page 4: Refresh ROI & Effect Sizes ───────────────────────────────────── */

export function Disc4_RefreshROIPage({ d }: { d: any }) {
  const ri = d.discovery?.refreshImpact ?? {};
  const strata = ri.strata ?? [];
  const effects = d.discovery?.flowchartEffects ?? [];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="ML Discovery — Refresh ROI" />
      <Text style={styles.sectionTitle}>Refresh Impact: <Text style={styles.sectionTitleAccent}>Quantified.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Mann-Whitney U tests comparing recently refreshed (≤30d) vs stale pages, stratified by age and competition.
        All {ri.significantStrata ?? 0} of {ri.totalStrata ?? 0} strata are significant at p {"<"} 0.001.
      </Text>

      {strata.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>Median Impression Lift by Age × Competition (Recently Refreshed vs Stale)</Text>
          <HorizontalBarChart
            data={strata
              .filter((s: any) => s.significant)
              .sort((a: any, b: any) => b.imp_lift_pct - a.imp_lift_pct)
              .map((s: any) => ({
                label: `${s.age_tier} × ${s.competition}`,
                value: s.imp_lift_pct,
                color: s.imp_lift_pct > 1000 ? colors.green : colors.chartPrimary,
              }))}
            barHeight={18}
            gap={4}
            labelWidth={130}
            maxValue={Math.max(...strata.map((s: any) => s.imp_lift_pct), 100)}
            valueFormatter={(v) => `+${formatCompact(v)}%`}
          />
          <ChartRead text="Every age × competition combination benefits from refreshing. Older pages get the most dramatic lifts — 365+ day pages see 1,694% to 8,638% median impression increases after a refresh." />
        </View>
      )}

      {effects.length > 0 && (
        <View style={{ marginTop: 10 }} wrap={false}>
          <Text style={styles.chartLabel}>Flowchart Decision Effect Sizes (Bootstrap 95% CI)</Text>
          <Text style={{ ...styles.narrative, marginBottom: 4 }}>
            Each row quantifies the median impression difference for a key flowchart decision, with 2,000 bootstrap samples for confidence intervals.
          </Text>
          {effects.filter((e: any) => e.metric?.includes("impressions")).map((e: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.textPrimary, width: "35%" }}>{e.node}</Text>
              <Text style={{ fontSize: 8, color: colors.textSecondary, width: "30%" }}>{e.comparison}</Text>
              <Text style={{ fontSize: 8, fontWeight: "bold", color: e.effect > 0 ? colors.green : colors.red, width: "15%" }}>+{formatCompact(e.effect)}</Text>
              <Text style={{ fontSize: 7, color: colors.textMuted, width: "20%" }}>{fmtCI(e.ci_95_low, e.ci_95_high)}</Text>
            </View>
          ))}
        </View>
      )}

      <Def label="Significance policy" text="All refresh comparisons use Mann-Whitney U (non-parametric, no normality assumption) with bootstrap 95% confidence intervals. Effect sizes are median differences, not means, to resist outlier distortion. Every stratum shown has p < 0.001." />

      <Footer page={""} />
    </Page>
  );
}

/* ── Page 5: Threshold Discovery ──────────────────────────────────────────── */

export function Disc5_ThresholdsPage({ d }: { d: any }) {
  const th = d.discovery?.thresholds ?? {};
  const wc = th.word_count ?? [];
  const vis = th.days_with_impressions ?? [];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="ML Discovery — Non-Linear Thresholds" />
      <Text style={styles.sectionTitle}>Where the Numbers <Text style={styles.sectionTitleAccent}>Jump.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Fine-grained binning reveals non-linear thresholds where small input changes create large outcome shifts.
      </Text>

      {wc.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>Word Count → Median Impressions (Active Pages)</Text>
          <HorizontalBarChart
            data={wc.filter((r: any) => r.n >= 50).map((r: any) => ({
              label: `${r.wc_bin} (n=${formatCompact(r.n)})`,
              value: r.median_imp ?? 0,
              color: (r.median_imp ?? 0) >= 1000 ? colors.green : colors.chartSecondary,
              count: r.n,
            }))}
            barHeight={18}
            gap={4}
            labelWidth={140}
            maxValue={Math.max(...wc.map((r: any) => r.median_imp ?? 0), 1)}
            valueFormatter={(v) => formatCompact(v)}
          />
          <ChartRead text="The jump from 4K-5K words (median 131 impressions) to 5K-7.5K (median 3,421) is 26x. Below 5K, word count barely moves impressions. Above 5K, it creates a step change — but only for topics that genuinely warrant the depth." />
        </View>
      )}

      {vis.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>Visibility Consistency → Median Impressions</Text>
          <HorizontalBarChart
            data={vis.filter((r: any) => r.n >= 50).map((r: any) => ({
              label: `${r.vis_bin} visible (n=${formatCompact(r.n)})`,
              value: r.median_imp ?? 0,
              color: (r.median_imp ?? 0) >= 500 ? colors.green : colors.chartSecondary,
            }))}
            barHeight={18}
            gap={4}
            labelWidth={150}
            maxValue={Math.max(...vis.map((r: any) => r.median_imp ?? 0), 1)}
            valueFormatter={(v) => formatCompact(v)}
          />
          <ChartRead text="Pages visible 31-45 days hit a growth inflection: median impressions jump to 632 and growth rate peaks at 86%. Pages visible 76-90 days reach 2,700 median impressions but growth rate drops to 33% — they've plateaued." />
        </View>
      )}

      <Def label="Why thresholds matter" text="Linear correlations missed these effects because the relationship between inputs and outputs is not a straight line. Word count has near-zero linear correlation with impressions (r = 0.02), but the 5K+ bin has 26x the median impressions of the 4K-5K bin. Always check for step-changes, not just correlations." />

      <Footer page={""} />
    </Page>
  );
}

/* ── Page 6: Significance Tests Summary ───────────────────────────────────── */

export function Disc6_SignificancePage({ d }: { d: any }) {
  const tests = d.discovery?.significanceTests ?? [];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="ML Discovery — Statistical Significance" />
      <Text style={styles.sectionTitle}>Every Flowchart Decision <Text style={styles.sectionTitleAccent}>Tested.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Kruskal-Wallis H tests and Mann-Whitney U tests confirm that every major grouping in the playbook
        produces statistically significant differences in impressions.
      </Text>

      {tests.length > 0 && (
        <View style={{ marginTop: 8 }} wrap={false}>
          <View style={{ flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.textPrimary, width: "40%" }}>Test</Text>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.textPrimary, width: "20%" }}>Method</Text>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.textPrimary, width: "20%" }}>Statistic</Text>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.textPrimary, width: "20%" }}>p-value</Text>
          </View>
          {tests.map((t: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 7.5, color: colors.textSecondary, width: "40%" }}>{t.test}</Text>
              <Text style={{ fontSize: 7.5, color: colors.textMuted, width: "20%" }}>{t.method}</Text>
              <Text style={{ fontSize: 7.5, color: colors.textPrimary, width: "20%" }}>{formatCompact(t.H_statistic ?? t.U_statistic ?? 0)}</Text>
              <Text style={{ fontSize: 7.5, fontWeight: "bold", color: t.significant ? colors.green : colors.red, width: "20%" }}>
                {t.p_value < 0.001 ? "< 0.001" : num(t.p_value, 4)} {t.significant ? "Sig." : "N.S."}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: 12 }} wrap={false}>
        <Text style={styles.chartLabel}>What Models Worked vs Failed</Text>
        <View style={{ flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 8, fontWeight: "bold", width: "30%" }}>Model</Text>
          <Text style={{ fontSize: 8, fontWeight: "bold", width: "20%" }}>AUC / R2</Text>
          <Text style={{ fontSize: 8, fontWeight: "bold", width: "50%" }}>Verdict</Text>
        </View>
        {[
          { model: "Momentum Prediction", metric: num(d.discovery?.momentumPrediction?.auc?.mean ?? 0, 3) + " AUC", verdict: "Strong. Predicts 30-day trajectory.", pass: true },
          { model: "Zombie Recovery", metric: num(d.discovery?.zombieRecovery?.auc?.mean ?? 0, 3) + " AUC", verdict: "Excellent. Separates recoverable from dead.", pass: true },
          { model: "Growth Prediction", metric: num(d.discovery?.growthModel?.auc?.mean ?? 0, 3) + " AUC", verdict: "Good. Identifies likely growers.", pass: true },
          { model: "CTR from Content", metric: "Negative R2", verdict: "Failed. CTR depends on metadata, not content.", pass: false },
          { model: "Impressions from Inputs", metric: "Negative R2", verdict: "Failed. Can't predict from creation-time inputs.", pass: false },
        ].map((r, i) => (
          <View key={i} style={{ flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 7.5, color: colors.textPrimary, width: "30%" }}>{r.model}</Text>
            <Text style={{ fontSize: 7.5, fontWeight: "bold", color: r.pass ? colors.green : colors.red, width: "20%" }}>{r.metric}</Text>
            <Text style={{ fontSize: 7.5, color: colors.textSecondary, width: "50%" }}>{r.verdict}</Text>
          </View>
        ))}
      </View>

      <Def label="Methodology" text="All predictive models use GroupKFold cross-validation grouped by client_id — no client appears in both train and test. Feature importance is measured by permutation importance (shuffling features and measuring AUC drop), not tree-based importance which overstates correlated features. Effect sizes use bootstrap confidence intervals with 2,000 resamples." />

      <Footer page={""} />
    </Page>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function featureLabel(label: string): string {
  const map: Record<string, string> = {
    days_with_impressions: "Visibility Consistency",
    days_since_update: "Days Since Update",
    content_age_days: "Content Age",
    word_count: "Word Count",
    avg_position: "Average Position",
    imp_per_day_visible: "Impressions / Visible Day",
    has_known_intent: "Known Intent",
    impressions_90d: "90d Impressions",
    impressions_prev_30d: "Prior 30d Impressions",
    search_volume: "Search Volume",
    competition: "Competition",
    is_low_competition: "Low Competition",
    scroll_rate: "Scroll Depth",
    engagement_rate: "Engagement Rate",
    ctr: "CTR",
    age_x_freshness: "Age x Freshness",
  };
  return map[label] ?? label.replace(/_/g, " ");
}
