/**
 * Part II: The Discoveries — Pages 6-19 (14 pages, one per major finding)
 */

import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { styles, colors } from "../pdf-styles";
import { HorizontalBarChart, StackedBar, DonutChart, AreaChart, HeatmapChart, GroupedBarChart, formatCompact } from "../pdf-charts";
import { Header, Footer, StatCard, AccentCard, DisruptionCard, Legend, ActionStep, ChartRead, Def } from "./part1-study";

function titleCaseLabel(value: string): string {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function money(value: number | string): string {
  const amount = Number(value);
  return `$${Number.isFinite(amount) ? amount.toFixed(2) : value}`;
}

// ── Finding 1: Anatomy of Growing Content ────────────────────────────────────

export function F1_LifecyclePage({ d }: { d: any }) {
  const g = d.discoveries?.lifecycle?.growing;
  const dec = d.discoveries?.lifecycle?.declining;
  const longerPct = d.validated?.lifecycle?.longerPct ?? 42.1;
  const youngerPct = d.validated?.lifecycle?.youngerPct ?? 26.9;
  if (!g || !dec) return null;

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #1 — CONFIRMED" />
      <Text style={styles.sectionTitle}>The Anatomy of <Text style={styles.sectionTitleAccent}>Growing Content.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        What do growing pages have in common? And what's different about the ones losing traffic?
      </Text>

      <Text style={styles.narrative}>
        We split every page into two groups: gaining traffic vs losing traffic. The clearest difference is age.
        Growing pages are younger and already a little more visible in search. Length is almost the same.
      </Text>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={`${g.avg_word_count}`} label="avg words (growing)" />
        <DisruptionCard value={`${dec.avg_word_count}`} label="avg words (declining)" />
        <DisruptionCard value={`${g.avg_age_days}d`} label="avg age (growing)" />
        <DisruptionCard value={`${dec.avg_age_days}d`} label="avg age (declining)" />
      </View>

      <View style={styles.table} wrap={false}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { width: 65 }]}>Direction</Text>
          <Text style={[styles.tableHeaderCell, { width: 60 }]}>Count</Text>
          <Text style={[styles.tableHeaderCell, { width: 55 }]}>Words</Text>
          <Text style={[styles.tableHeaderCell, { width: 50 }]}>Age</Text>
          <Text style={[styles.tableHeaderCell, { width: 65 }]}>Avg Imp</Text>
          <Text style={[styles.tableHeaderCell, { width: 55 }]}>Avg Pos</Text>
          <Text style={[styles.tableHeaderCell, { width: 50 }]}>Health</Text>
        </View>
        {[g, dec].map((r: any, i: number) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.tableCell, { width: 65, fontWeight: "bold", color: r.trend_direction === "up" ? colors.green : colors.red }]}>{r.trend_direction}</Text>
            <Text style={[styles.tableCell, { width: 60 }]}>{formatCompact(r.n)}</Text>
            <Text style={[styles.tableCell, { width: 55 }]}>{formatCompact(r.avg_word_count)}</Text>
            <Text style={[styles.tableCell, { width: 50 }]}>{r.avg_age_days}d</Text>
            <Text style={[styles.tableCell, { width: 65 }]}>{formatCompact(r.avg_imp)}</Text>
            <Text style={[styles.tableCell, { width: 55 }]}>{r.avg_pos}</Text>
            <Text style={[styles.tableCell, { width: 50 }]}>{r.avg_health}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.narrative}>
        Growing pages average {formatCompact(g.avg_word_count)} words vs {formatCompact(dec.avg_word_count)} for declining ones.
        That word-count gap is basically nothing. But they are{" "}
        <Text style={styles.narrativeBold}>{youngerPct}% younger</Text> ({g.avg_age_days} vs {dec.avg_age_days} days).
        Declining pages aren't necessarily bad — many still get traffic. They're just older and losing momentum.
        With {formatCompact(g.n)} rising vs {formatCompact(dec.n)} falling pages, the age gap is a strong pattern in this dataset.
      </Text>

      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.textPrimary, marginTop: 8, marginBottom: 6 }}>
        What to Do With This
      </Text>
      <ActionStep step="Improve pages that already earn impressions" why="The biggest gap here is age, not length, so start with pages Google already sees and keep them useful" how="List pages with real impressions that still feel thin or incomplete, then add missing subtopics, examples, definitions, and comparison sections instead of padding." impact="Gives already-visible pages a better chance to keep growing instead of fading out." measure="Track impressions, clicks, and average position 30 and 60 days after the update." />
      <ActionStep step="Review aging pages before they drift into decline" why="The falling cohort is older on average and more likely to have missed a recent refresh cycle" how="Create a quarterly review for pages that are around 6-9 months old, then prioritize the ones that once performed well but have started to flatten." impact="Protects pages with existing visibility before the decline becomes expensive to reverse." measure="Track refresh coverage and 30-day impression change for reviewed versus unrevised pages." />

      <Footer page={6} />
    </Page>
  );
}

// ── Finding 2: Performance Curve (Age Golden Zone) ───────────────────────────

export function F2_AgeCurvePage({ d }: { d: any }) {
  const ageCurve = d.ageGoldenZone ?? [];
  const peak = ageCurve.find((row: any) => row.age_bucket === "61-90");
  const decay = ageCurve.find((row: any) => row.age_bucket === "271-365");
  const recovered = ageCurve.find((row: any) => row.age_bucket === "365+");
  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #2 — CONFIRMED" />
      <Text style={styles.sectionTitle}>The Content <Text style={styles.sectionTitleAccent}>Performance Curve.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Every piece of content has a life cycle. It peaks around 61-90 days, then gets weaker after about 9 months if nobody keeps it sharp.
      </Text>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Health Score by Content Age (Days)</Text>
        <HorizontalBarChart
          data={(d.ageGoldenZone ?? []).map((r: any) => ({
            label: r.age_bucket,
            value: r.avg_health ?? 0,
            color: (r.avg_health ?? 0) >= 30 ? colors.chartGreen : (r.avg_health ?? 0) >= 20 ? colors.chartSecondary : colors.chartRed,
            count: r.n,
          }))}
          barHeight={18}
          gap={4}
          labelWidth={55}
          maxValue={40}
          showCounts
          valueFormatter={(value) => value.toFixed(1)}
        />
      </View>

      <Text style={styles.narrative}>
        It takes about 60-90 days for Google to fully discover and rank a new page — that's when{" "}
        <Text style={styles.narrativeBold}>performance peaks at {peak?.avg_health ?? "37.2"} health</Text>.
        {"\n\n"}
        After that, performance gradually declines. By 271-365 days, health drops to {decay?.avg_health ?? "29.6"} as the
        content gets older. <Text style={styles.narrativeBold}>But old does not mean dead:</Text> the 365+ group still averages
        {` ${recovered?.avg_health ?? "35.5"}`} health. That tells us age alone does not kill a page. Strong older pages can still hold up,
        especially when teams keep them maintained.
      </Text>

      <ActionStep step="Create a review cycle before pages hit the 9-12 month mark" why="Performance starts declining after 270 days — catch pages before the drop" how="Schedule editorial reviews for pages approaching that age, then refresh the ones that already have traffic or strategic value before they go stale." impact="Preserves the visibility older pages have already earned." measure="Track refreshed-page coverage and compare impression retention before and after the review window." />

      <Footer page={7} />
    </Page>
  );
}

// ── Finding 3: CTR Cliff ─────────────────────────────────────────────────────

export function F3_CtrCliffPage({ d }: { d: any }) {
  const ctr = d.validated?.ctrByPositionTier ?? d.ctrCurveValidated ?? d.ctrCurve ?? [];
  const top3 = ctr.find((row: any) => row.position_tier === "top_3");
  const page1 = ctr.find((row: any) => row.position_tier === "page_1");
  const deep = ctr.find((row: any) => row.position_tier === "deep");
  const topVsDeepDrop = top3?.ctr_pct && deep?.ctr_pct ? (((top3.ctr_pct - deep.ctr_pct) / top3.ctr_pct) * 100).toFixed(0) : null;

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #3 — CONFIRMED" />
      <Text style={styles.sectionTitle}>Click Capture by <Text style={styles.sectionTitleAccent}>Position Tier.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        The higher you rank, the more clicks you get — and the drop-off is steep.
      </Text>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Weighted CTR by Position Tier</Text>
        <HorizontalBarChart
          data={ctr.map((r: any) => ({
            label: r.label ?? r.position_tier,
            value: r.ctr_pct ?? 0,
            color: (r.position_tier ?? "").includes("top") ? colors.chartGreen : (r.position_tier ?? "").includes("page_1") ? colors.chartSecondary : colors.chartQuaternary,
          }))}
          barHeight={18}
          gap={4}
          labelWidth={95}
          maxValue={0.5}
          valueFormatter={(value) => `${value.toFixed(3)}%`}
        />
      </View>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={top3 ? `${top3.ctr_pct.toFixed(3)}%` : "-"} label="weighted CTR in top 3" />
        <DisruptionCard value={page1 ? `${page1.ctr_pct.toFixed(3)}%` : "-"} label="weighted CTR on page 1" />
        <DisruptionCard value={topVsDeepDrop ? `${topVsDeepDrop}%` : "-"} label="drop from top 3 to deep" />
      </View>

      <Text style={styles.narrative}>
        This chart shows what percentage of people click on your content based on where it ranks. These are
        real click-through rates from this portfolio (total clicks ÷ total impressions per tier), not generic benchmarks.
        {"\n\n"}
        <Text style={styles.narrativeBold}>The takeaway: improving a page already on page 1 gets you more clicks
        faster than trying to rescue a page buried on page 5.</Text> Once content drops off the first page,
        click capture shrinks fast.
      </Text>

      <ActionStep step="Refine search snippets on pages that already rank on page 1" why="Small ranking and snippet gains on already-visible pages usually convert into click lift faster than rebuilding weak pages from scratch" how="Review pages ranking on page 1, tighten titles and descriptions around clear intent, and test more specific promise statements instead of generic headings." impact="Improves click capture on visibility you already own." measure="Track weighted CTR, clicks, and average position for the revised group over the next 30 days." />
      <ActionStep step="Support positions 11-20 with targeted relevance improvements" why="Pages just outside page 1 already show search demand and topical fit" how="Refresh the page, improve internal links from stronger related pages, and tighten the opening sections so the page answers the target query faster." impact="Increases the chance of moving a borderline page into the higher-click part of the curve." measure="Track movement into page 1 and the resulting click lift." />

      <Footer page={8} />
    </Page>
  );
}

// ── Finding 4: Freshness Multiplier ──────────────────────────────────────────

export function F4_FreshnessPage({ d }: { d: any }) {
  const fm = d.discoveries?.freshnessMultiplier?.expanded ?? [];
  const fresh365 = d.discoveries?.refreshOld?.fresh365;
  const stale365 = d.discoveries?.refreshOld?.stale365;
  const peakFreshness = fm.find((row: any) => row.freshness_bucket === "31-90");
  const staleMid = fm.find((row: any) => row.freshness_bucket === "181-360");
  const staleOld = fm.find((row: any) => row.freshness_bucket === "361+");

  const healthMult = stale365?.avg_health > 0 ? (fresh365?.avg_health / stale365.avg_health).toFixed(1) : "N/A";
  const impMult = stale365?.avg_imp > 0 ? Math.round(fresh365?.avg_imp / stale365.avg_imp) : "N/A";

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #4 — CONFIRMED" />
      <Text style={styles.sectionTitle}>The Freshness <Text style={styles.sectionTitleAccent}>Multiplier.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Content updated 1-3 months ago grows the fastest. Here's how big the freshness effect really is.
      </Text>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Growth-to-Decline Ratio by Freshness Window</Text>
        <HorizontalBarChart
          data={fm.map((row: any) => ({
            label: row.freshness_bucket,
            value: row.growth_decline_ratio ?? 0,
            color: (row.growth_decline_ratio ?? 0) > 5 ? colors.chartGreen : (row.growth_decline_ratio ?? 0) > 2 ? colors.chartSecondary : colors.chartTertiary,
            count: row.n ?? ((row.growing ?? 0) + (row.declining ?? 0)),
          }))}
          barHeight={28}
          gap={8}
          labelWidth={70}
          maxValue={Math.max(...fm.map((row: any) => row.growth_decline_ratio ?? 0), 1)}
          showCounts
          valueFormatter={(value) => `${value.toFixed(1)}:1`}
        />
      </View>

      <Text style={styles.narrative}>
        Pages updated 0-30 days ago are too new to read reliably. But at{" "}
        <Text style={styles.narrativeBold}>31-90 days, freshness is the strongest measured growth signal</Text>
        {peakFreshness ? ` — ${peakFreshness.growth_decline_ratio}:1 growth-to-decline ratio.` : "."}{" "}
        Pages untouched for 181-360 days show clearly stale behavior
        at {staleMid?.growth_decline_ratio ?? "?"}:1, while the 361+ bucket spikes to {staleOld?.growth_decline_ratio ?? "?"}:1 —
        but that's a tiny sample with only {staleOld?.declining ?? "?"} declining page, so don't read too much into it.
        {"\n\n"}
        <Text style={styles.narrativeBold}>The biggest surprise:</Text> among pages older than a year, the cohort refreshed in the last 30 days jumped from{" "}
        {stale365?.avg_health ?? "?"} to {fresh365?.avg_health ?? "?"} health (<Text style={styles.narrativeBold}>{healthMult}x boost</Text>)
        compared with otherwise old pages last updated 181-360 days ago, and from {formatCompact(stale365?.avg_imp ?? 0)} to {formatCompact(fresh365?.avg_imp ?? 0)} impressions
        (<Text style={styles.narrativeBold}>{impMult}x</Text>). Refreshing proven content is one of the strongest measured levers in this dataset.
      </Text>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={`${healthMult}x`} label="health boost from refresh" />
        <DisruptionCard value={`${impMult}x`} label="impression boost" />
        <DisruptionCard value={peakFreshness ? `${peakFreshness.growth_decline_ratio}:1` : "-"} label="growth ratio at 31-90d" />
      </View>

      <ChartRead text={`Read 31-90 as the strongest stable freshness signal. The 361+ bar is present because it exists in the local sample, but its ${staleOld?.growth_decline_ratio ?? "?"}:1 ratio is unstable: ${staleOld?.growing ?? "?"} growing pages versus only ${staleOld?.declining ?? "?"} declining.`} />

      <ActionStep step="Run a recurring refresh program for mature pages" why={`Refreshing mature pages produces ${healthMult}x health and ${impMult}x impressions in this dataset`} how="Review older pages with proven historical visibility, refresh outdated facts and examples, add missing subtopics, and resubmit the strongest updates for recrawl." impact={`Lifts mature pages from roughly ${stale365?.avg_health ?? "?"} health to ${fresh365?.avg_health ?? "?"} and materially improves impression potential.`} measure="Track impressions, clicks, and average position on refreshed mature pages versus comparable untouched pages." />

      <Footer page={9} />
    </Page>
  );
}

// ── Finding 5: Engagement Matrix ─────────────────────────────────────────────

export function F5_EngagementPage({ d }: { d: any }) {
  const matrix = d.discoveries?.engagementMatrix ?? [];
  const vis = d.visibilityConsistency ?? [];
  const scrollOrder = ["low_scroll", "mid_scroll", "high_scroll"];
  const engageOrder = ["low_engage", "mid_engage", "high_engage"];
  const matrixRows = scrollOrder.filter((bucket) => matrix.some((row: any) => row.scroll_bucket === bucket));
  const matrixCols = engageOrder.filter((bucket) => matrix.some((row: any) => row.engage_bucket === bucket));
  const highEng = matrix.find((row: any) => row.scroll_bucket === "high_scroll" && row.engage_bucket === "high_engage");
  const lowEng = matrix.find((row: any) => row.scroll_bucket === "low_scroll" && row.engage_bucket === "low_engage");
  const engagementGap = highEng && lowEng ? (highEng.avg_health - lowEng.avg_health).toFixed(1) : "17.9";
  const bestVisibility = vis.find((row: any) => (row.visibility_bucket ?? "").includes("consistent"));
  const weakestVisibility = vis.find((row: any) => (row.visibility_bucket ?? "").includes("sporadic"));
  const visibilityGap = bestVisibility && weakestVisibility ? (bestVisibility.avg_health - weakestVisibility.avg_health).toFixed(1) : "18.5";
  const tinyMatrixCells = matrix.filter((row: any) => (row.n ?? 0) < 50);
  const scrollLabels: Record<string, string> = {
    low_scroll: "Low (<30%)",
    mid_scroll: "Mid (30-59%)",
    high_scroll: "High (60%+)",
  };
  const engageLabels: Record<string, string> = {
    low_engage: "Low (<45%)",
    mid_engage: "Mid (45-69%)",
    high_engage: "High (70%+)",
  };

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #5 — CONFIRMED" />
      <Text style={styles.sectionTitle}>Engagement and Visibility <Text style={styles.sectionTitleAccent}>Move Together.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        High scroll + high engagement = +{engagementGap} health points. Visibility consistency compounds the effect.
      </Text>

      <Def
        title="How These Buckets Work"
        text="Scroll depth buckets use the share of the page consumed: Low <30%, Mid 30-59%, High 60%+. Engagement-rate buckets use Low <45%, Mid 45-69%, High 70%+. Visibility here means how many of the last 90 complete days the page recorded at least one search impression."
      />

      {matrixRows.length > 0 && matrixCols.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>Health Score by Scroll Depth × Engagement Rate</Text>
          <HeatmapChart
            rows={matrixRows.map((row: string) => scrollLabels[row] ?? titleCaseLabel(row.replace("_scroll", "")))}
            cols={matrixCols.map((col: string) => engageLabels[col] ?? titleCaseLabel(col.replace("_engage", "")))}
            cells={matrix.map((row: any) => ({
              row: scrollLabels[row.scroll_bucket ?? ""] ?? titleCaseLabel((row.scroll_bucket ?? "").replace("_scroll", "")),
              col: engageLabels[row.engage_bucket ?? ""] ?? titleCaseLabel((row.engage_bucket ?? "").replace("_engage", "")),
              value: row.avg_health ?? 0,
            }))}
            cellSize={48}
            labelWidth={86}
            topLabelHeight={34}
          />
          <ChartRead text={tinyMatrixCells.length > 0 ? `Darker cells = higher health score. The top-right corner is the target state, but ${tinyMatrixCells.length} cells have fewer than 50 pages, so treat those corners as directional rather than definitive.` : "Darker cells = higher health score. The top-right corner (high scroll + high engagement) is your target. Lighter cells show where people leave early and performance tends to lag."} />
        </View>
      )}

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Health by Visibility Consistency (Days Visible in 90)</Text>
        <HorizontalBarChart
          data={vis.filter((r: any) => (r.avg_health ?? 0) > 0).map((r: any) => ({
            label: (r.visibility_bucket ?? "").replace(/\s*\(.*\)/, ""),
            value: r.avg_health ?? 0,
            color: (r.avg_health ?? 0) >= 40 ? colors.chartGreen : (r.avg_health ?? 0) >= 30 ? colors.chartSecondary : colors.chartQuaternary,
            count: r.n,
          }))}
          barHeight={20}
          gap={5}
          labelWidth={80}
          maxValue={55}
          showCounts
          valueFormatter={(value) => value.toFixed(1)}
        />
      </View>

      <Text style={styles.narrative}>
        Pages where people scroll deeper and stay engaged score {highEng?.avg_health ?? "48.1"} health. Pages people
        bounce from score {lowEng?.avg_health ?? "32"}. Consistency matters too: pages visible 80+ days
        score {bestVisibility?.avg_health ?? "47.2"}, while sporadic pages score {weakestVisibility?.avg_health ?? "25.8"}.
        <Text style={styles.narrativeBold}> That {visibilityGap}-point gap is why we use visibility as context in this paper — it means sustained discoverability in search, not just existence in the warehouse.</Text>
      </Text>

      <ActionStep step="Improve scanability on pages that already earn consistent visibility" why={`High-engagement pages score ${engagementGap} health points higher than low-engagement ones`} how="Use clearer sections, jump links, tighter intros, and visuals that make the page easier to scan and understand." impact="Supports the engagement patterns associated with stronger visibility." measure="Track scroll depth, clicks, and average position changes on the revised group." />

      <Footer page={10} />
    </Page>
  );
}

// ── Finding 6: AI Traffic Profile ────────────────────────────────────────────

export function F6_AITrafficPage({ d }: { d: any }) {
  const ai = d.discoveries?.aiProfile;
  const vsTraditional = ai?.vsTraditional ?? [];
  const monthly = ai?.monthly ?? [];
  const providers = ai?.providers30d ?? [];
  const base = ai?.base ?? {};
  const bestIntent = [...(ai?.byIntent ?? [])]
    .filter((row: any) => row.main_intent !== "unknown")
    .sort((a: any, b: any) => (b.ai_page_pct ?? 0) - (a.ai_page_pct ?? 0))[0];
  const bestWordBucket = [...(ai?.byWordCount ?? [])].sort((a: any, b: any) => (b.ai_page_pct ?? 0) - (a.ai_page_pct ?? 0))[0];
  const highAI = vsTraditional.find((r: any) => r.ai_bucket === "high_ai");
  const noAI = vsTraditional.find((r: any) => r.ai_bucket === "no_ai");
  const openAIProvider = providers.find((row: any) => row.label === "OpenAI");
  const geminiProvider = providers.find((row: any) => row.label === "Gemini");
  const impressionMult = highAI && noAI && noAI.avg_imp > 0 ? Math.round(highAI.avg_imp / noAI.avg_imp) : null;
  const providerRatio = openAIProvider?.sessions && geminiProvider?.sessions
    ? (openAIProvider.sessions / geminiProvider.sessions).toFixed(1)
    : null;

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #6 — CONFIRMED" />
      <Text style={styles.sectionTitle}>AI Traffic: A <Text style={styles.sectionTitleAccent}>Different Signal.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        AI traffic does not line up perfectly with normal Google traffic. Here is the pattern we can actually measure.
      </Text>

      <View style={styles.table} wrap={false}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { width: 75 }]}>AI Bucket</Text>
          <Text style={[styles.tableHeaderCell, { width: 55 }]}>Count</Text>
          <Text style={[styles.tableHeaderCell, { width: 45 }]}>Health</Text>
          <Text style={[styles.tableHeaderCell, { width: 80 }]}>Avg Imp</Text>
          <Text style={[styles.tableHeaderCell, { width: 55 }]}>Avg Pos</Text>
        </View>
        {vsTraditional.map((r: any, i: number) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.tableCell, { width: 75, fontWeight: "bold" }]}>{r.ai_bucket}</Text>
            <Text style={[styles.tableCell, { width: 55 }]}>{formatCompact(r.n)}</Text>
            <Text style={[styles.tableCell, { width: 45 }]}>{r.avg_health}</Text>
            <Text style={[styles.tableCell, { width: 80 }]}>{formatCompact(r.avg_imp)}</Text>
            <Text style={[styles.tableCell, { width: 55 }]}>{r.avg_pos}</Text>
          </View>
        ))}
      </View>

      {monthly.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>AI Traffic Share (%) — Monthly</Text>
          <AreaChart
            data={monthly.map((m: any) => ({
              label: new Date(m.month ?? m.report_month).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
              value: m.aiPct ?? m.ai_pct ?? 0,
            }))}
            height={90}
            fillColor={colors.chartSecondary}
            strokeColor={colors.chartPrimary}
            yLabel="AI Share %"
            yTickFormatter={(value) => `${value.toFixed(0)}%`}
          />
        </View>
      )}

      {providers.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>AI Referral Providers (Local Last-30d Breakdown)</Text>
          <HorizontalBarChart
            data={providers.map((row: any) => ({
              label: row.label,
              value: row.sessions,
              color: row.label === "OpenAI" ? colors.chartPrimary : row.label === "Gemini" ? colors.chartGreen : colors.chartSecondary,
            }))}
            barHeight={16}
            gap={4}
            labelWidth={70}
          />
        </View>
      )}

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={`${base.portfolioAiSharePct ?? d.scope.aiSharePct}%`} label="AI share of portfolio sessions" />
        <DisruptionCard value={`${base.fullHistoryAiPagePct ?? base.activeSampleAiPagePct ?? 0}%`} label="AI page rate in full export" />
        <DisruptionCard value={providerRatio ? `${providerRatio}x` : "-"} label="OpenAI vs Gemini (30d)" />
      </View>

      <Text style={styles.narrative}>
        <Text style={styles.narrativeBold}>Pages with AI referrals do not look exactly like the pages that win normal search.</Text>{" "}
        In this dataset, the high-AI group averages {impressionMult ?? "many"}x more impressions but slightly weaker Google positions
        than the no-AI group. So AI visibility and Google visibility overlap, but they are not the same thing.
        {"\n\n"}
        Reality check: AI traffic is still only {base.portfolioAiSharePct ?? d.scope.aiSharePct}% of tracked sessions
        ({formatCompact(base.portfolioAiSessions ?? d.scope.totalAISessions)} of {formatCompact(base.portfolioSessions ?? d.scope.totalSessions)}).
        It's growing, but it's not replacing Google yet. In this export, the highest AI referral rates show up in {bestIntent?.main_intent ?? "informational"} intent
        and the {bestWordBucket?.wc_bucket ?? "5K+"} length bucket.
      </Text>

      <ActionStep step="Monitor AI referrals separately — they're a different channel" why="AI traffic is still small, but the pages that get it do not look exactly like normal search winners" how="Review high-impression pages, make key facts easy to scan, and track AI referrals separately from search clicks." impact="Prepares your content for AI visibility without pretending the channel is bigger than it is." measure="Track AI session share, provider mix, and page-level AI referral rates alongside standard search metrics." />

      <Footer page={11} />
    </Page>
  );
}

// ── Finding 7: Winning Combinations ──────────────────────────────────────────

export function F7_CombinationsPage({ d }: { d: any }) {
  const ic = d.discoveries?.winningCombinations?.intentComp ?? [];
  const wcp = d.discoveries?.winningCombinations?.wordcountPosition ?? [];
  const filteredIntentComp = ic.filter((row: any) => row.main_intent !== "unknown" && row.competition_level !== "UNKNOWN");
  const chartIntentComp = [...filteredIntentComp]
    .filter((row: any) => (row.n ?? 0) >= 100)
    .sort((a: any, b: any) => (b.avg_health ?? 0) - (a.avg_health ?? 0))
    .slice(0, 8);
  const filteredPageOne = wcp.filter((row: any) => row.position_tier === "page_1" && row.word_count_tier !== "unknown");
  const transactionalLow = filteredIntentComp.find((row: any) => row.main_intent === "transactional" && row.competition_level === "LOW");
  const informationalLow = filteredIntentComp.find((row: any) => row.main_intent === "informational" && row.competition_level === "LOW");
  const strongestPageOne = filteredPageOne
    .sort((a: any, b: any) => (b.avg_health ?? 0) - (a.avg_health ?? 0))[0];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #7 — CONFIRMED" />
      <Text style={styles.sectionTitle}>The Winning <Text style={styles.sectionTitleAccent}>Combinations.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        The easiest win: target topics where people are ready to buy and where competitors haven't shown up yet.
      </Text>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Average Health by Intent × Competition Level</Text>
        <HorizontalBarChart
          data={chartIntentComp.map((r: any) => ({
            label: `${r.main_intent} × ${r.competition_level}`,
            value: r.avg_health ?? 0,
            color: (r.avg_health ?? 0) >= 27 ? colors.chartGreen : (r.avg_health ?? 0) >= 22 ? colors.chartSecondary : colors.chartQuaternary,
            count: r.n,
          }))}
          barHeight={18}
          gap={4}
          labelWidth={175}
          labelMaxChars={28}
          maxValue={35}
          showCounts
          valueFormatter={(value) => value.toFixed(1)}
        />
        <ChartRead text="Each bar is one intent + competition pairing. The chart is sorted by average health and only includes pairings with at least 100 pages, so tiny edge cases do not drive the ranking." />
      </View>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Page-1 Content by Word Count Tier</Text>
        <HorizontalBarChart
          data={filteredPageOne.map((r: any) => ({
            label: `${r.word_count_tier} words`,
            value: r.avg_health ?? 0,
            color: colors.chartSecondary,
            count: r.n,
          }))}
          barHeight={22}
          gap={6}
          labelWidth={115}
          maxValue={50}
          showCounts
          valueFormatter={(value) => value.toFixed(1)}
        />
        <ChartRead text="This only looks at pages already on page 1. It shows how much depth winning pages tend to need — not a rule to make every page longer." />
      </View>

      <Text style={styles.narrative}>
        <Text style={styles.narrativeBold}>Transactional intent + low competition leads every metric</Text> in this
        portfolio: {transactionalLow?.avg_health ?? "36.4"} health and {formatCompact(transactionalLow?.avg_imp ?? 2969)} impressions.
        Informational + low competition pages average {informationalLow?.avg_health ?? "22.1"} health — still solid, but
        the buy-ready topics clearly outperform.
        {"\n\n"}
        Among page-1 content, the strongest word-count bucket is{" "}
        <Text style={styles.narrativeBold}>{strongestPageOne?.word_count_tier ?? "3,500+"} words</Text> ({strongestPageOne?.avg_health ?? "44.6"} health,
        {formatCompact(strongestPageOne?.avg_impressions ?? 2395)} impressions). But longer content only wins when the topic
        genuinely needs that depth — padding doesn't help.
      </Text>

      <ChartRead text="Use this page as a prioritization lens, not as a universal rule. Smaller subsegments can still swing around if the sample gets thin, which is why the main ranking view excludes pairings below 100 pages." />

      <ActionStep step="Reserve a larger share of the calendar for lower-competition commercial or transactional topics" why="Those topics outperform the portfolio average in both visibility and FlyRank health context" how="Map topics where the reader is already comparing options, then target the versions where the current result pages are beatable with a stronger page rather than a bigger budget." impact="Improves the odds of reaching page 1 faster and capturing more useful demand." measure="Track impressions, clicks, and average position by intent class over the next publishing cycle." />

      <Footer page={12} />
    </Page>
  );
}

// ── Finding 8: Age-Freshness Matrix ──────────────────────────────────────────

export function F8_AgeFreshnessPage({ d }: { d: any }) {
  const matrix = d.ageFreshnessMatrix ?? [];
  const filtered = matrix.filter((r: any) => r.n >= 50);
  const youngFresh = matrix.find((row: any) => row.age_tier === "31-90" && row.freshness_tier === "0-30");
  const oldRefreshed = matrix.find((row: any) => row.age_tier === "365+" && row.freshness_tier === "0-30");
  const midStale = matrix.find((row: any) => row.age_tier === "181-365" && row.freshness_tier === "181-360");
  const oldStale = matrix.find((row: any) => row.age_tier === "365+" && row.freshness_tier === "361+");

  // Build heatmap data
  const ages = [...new Set(filtered.map((r: any) => r.age_tier))];
  const freshnesses = [...new Set(filtered.map((r: any) => r.freshness_tier))];
  const cells = filtered.map((r: any) => ({
    row: r.age_tier,
    col: r.freshness_tier,
    value: r.avg_health,
  }));

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #8 — CONFIRMED" />
      <Text style={styles.sectionTitle}>The Age-Freshness <Text style={styles.sectionTitleAccent}>Matrix.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        How old is the content and how recently was it updated? This matrix shows how those two factors combine.
      </Text>

      {ages.length > 0 && freshnesses.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>Health Score Heatmap: Age Tier × Freshness Tier</Text>
          <HeatmapChart
            rows={ages}
            cols={freshnesses}
            cells={cells}
            cellSize={32}
            labelWidth={65}
          />
        </View>
      )}

      <Text style={styles.narrative}>
        <Text style={styles.narrativeBold}>Four key zones:</Text>
        {"\n"}1. <Text style={styles.narrativeBold}>Growth Engine</Text> (31-90d age, recently updated): {youngFresh?.avg_health ?? "34.1"} health.
        {"\n"}2. <Text style={styles.narrativeBold}>Refresh Winners</Text> (365+, updated within 30d): {oldRefreshed?.avg_health ?? "37.0"} health.
        {"\n"}3. <Text style={styles.narrativeBold}>Decay Zone</Text> (181-365d, untouched 6-12 months): {midStale?.avg_health ?? "27.6"} health.
        {"\n"}4. <Text style={styles.narrativeBold}>Survivors</Text> (365+, 361+ stale): {oldStale?.avg_health ?? "?"} health — very small sample, so read it cautiously.
        {"\n\n"}
        <Text style={styles.narrativeBold}>The biggest takeaway from this study: a 1-year-old article that you update
        can compete with brand-new content</Text> ({oldRefreshed?.avg_health ?? "37.0"} vs {youngFresh?.avg_health ?? "34.1"} health).
        You do not always need net-new content — you often need updated content on proven pages.
      </Text>

      <Footer page={13} />
    </Page>
  );
}

// ── Finding 9: Traffic Diversification & Revenue ─────────────────────────────

export function F9_DiversificationPage({ d }: { d: any }) {
  const trafficValue = d.discoveries?.trafficValue;
  const byIntent = trafficValue?.byIntent ?? [];
  const capturedSharePct = trafficValue?.capturedSharePct ?? 0;
  const topValueIntent = [...byIntent].filter((row: any) => row.main_intent !== "unknown").sort((a: any, b: any) => (b.click_equivalent_value ?? 0) - (a.click_equivalent_value ?? 0))[0];
  const bestCaptureIntent = [...byIntent].filter((row: any) => row.main_intent !== "unknown").sort((a: any, b: any) => (b.captured_click_share_pct ?? 0) - (a.captured_click_share_pct ?? 0))[0];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #9 — NEW ANALYSIS" />
      <Text style={styles.sectionTitle}>Captured Traffic <Text style={styles.sectionTitleAccent}>Value.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        The defensible proxy here is `clicks × CPC`, not `impressions × CPC`. Window: {trafficValue?.windowLabel ?? d.windowLabels?.fullHistoryPage}.
      </Text>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Click-Equivalent Value by Intent</Text>
        <HorizontalBarChart
          data={byIntent.filter((row: any) => row.main_intent !== "unknown").map((row: any) => ({
            label: row.main_intent,
            value: row.click_equivalent_value ?? 0,
            color: row.main_intent === "transactional" ? colors.chartGreen : row.main_intent === "commercial" ? colors.chartPrimary : colors.chartSecondary,
          }))}
          barHeight={22}
          gap={8}
          labelWidth={90}
          valueFormatter={(value) => `$${formatCompact(value)}`}
        />
      </View>

      <View style={styles.table} wrap={false}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { width: 88 }]}>Intent</Text>
          <Text style={[styles.tableHeaderCell, { width: 58 }]}>Pages</Text>
          <Text style={[styles.tableHeaderCell, { width: 60 }]}>Clicks</Text>
          <Text style={[styles.tableHeaderCell, { width: 58 }]}>CPC</Text>
          <Text style={[styles.tableHeaderCell, { width: 90 }]}>Value</Text>
        </View>
        {byIntent.filter((row: any) => row.main_intent !== "unknown").map((row: any, i: number) => (
          <View key={row.main_intent} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.tableCell, { width: 88, fontWeight: "bold" }]}>{row.main_intent}</Text>
            <Text style={[styles.tableCell, { width: 58 }]}>{formatCompact(row.pages)}</Text>
            <Text style={[styles.tableCell, { width: 60 }]}>{formatCompact(row.total_clicks)}</Text>
            <Text style={[styles.tableCell, { width: 58 }]}>{money(row.weighted_cpc)}</Text>
            <Text style={[styles.tableCell, { width: 90 }]}>{`$${formatCompact(row.click_equivalent_value ?? 0)}`}</Text>
          </View>
        ))}
      </View>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={`$${formatCompact(trafficValue?.totalClickEquivalentValue ?? 0)}`} label="captured click-equivalent value" />
        <DisruptionCard value={`$${formatCompact(trafficValue?.unsafeImpressionTimesCpc ?? 0)}`} label="impressions × CPC upper bound" />
        <DisruptionCard value={`${capturedSharePct}%`} label="captured vs upper bound" />
      </View>

      <Text style={styles.narrative}>
        How much is your organic traffic worth? We multiply <Text style={styles.narrativeBold}>actual clicks × what those
        clicks would cost in Google Ads</Text> (CPC). This gives you a dollar value for your content without inflating
        the number with impressions that didn't lead to clicks.
        {"\n\n"}
        The click-based value is {capturedSharePct}% of the impressions × CPC number — that gap is exactly
        why you should never use the inflated version as a headline.
        {"\n\n"}
        In {trafficValue?.windowLabel ?? d.windowLabels?.fullHistoryPage}, <Text style={styles.narrativeBold}>{topValueIntent?.main_intent ?? "informational"}</Text> leads total click-equivalent value by scale,
        while <Text style={styles.narrativeBold}>{bestCaptureIntent?.main_intent ?? "transactional"}</Text> has the strongest capture rate against the impressions × CPC upper bound.
        Value density tells a clearer story than raw traffic volume alone, which is why the upper-bound number is shown only as a caveat.
      </Text>

      <ActionStep step="Use click-equivalent value to rank optimization candidates" why="It preserves CPC economics without pretending every impression is worth a click" how="Prioritize visible pages where clicks already exist and the underlying CPC is meaningful, especially in transactional and commercial intent buckets." impact="Improves prioritization quality when traffic counts alone hide value density." measure="Track click lift, weighted CPC, and click-equivalent value before and after optimization." />

      <Footer page={14} />
    </Page>
  );
}

// ── Finding 10: AI Model Performance ─────────────────────────────────────────

export function F10_AIModelPage({ d }: { d: any }) {
  const providerByAge = d.validated?.aiModelProviderByAge ?? [];
  const providerSummary = d.validated?.aiModelProviderSummary ?? [];
  const ageTiers = [...new Set(providerByAge.map((row: any) => row.age_tier))];
  const groups = ageTiers.map((ageTier) => ({
    label: ageTier,
    values: providerByAge
      .filter((row: any) => row.age_tier === ageTier)
      .map((row: any) => ({
        label: row.provider_family,
        value: row.avg_health,
        color: row.provider_family === "OpenAI" ? colors.chartPrimary : colors.chartGreen,
      })),
  }));

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #10 — NUANCED" />
      <Text style={styles.sectionTitle}>AI Model <Text style={styles.sectionTitleAccent}>Performance.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Neither OpenAI nor Gemini content is universally better. When we compare content of the same age, each model wins in different categories.
      </Text>

      {groups.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>Age-Controlled Cohort Health: OpenAI vs Gemini</Text>
          <GroupedBarChart groups={groups} height={170} yLabel="Health Score" yTickFormatter={(value) => value.toFixed(0)} />
          <Legend
            items={[
              { color: colors.chartPrimary, label: "OpenAI models" },
              { color: colors.chartGreen, label: "Gemini models" },
            ]}
          />
          <ChartRead text="Each age tier compares provider families inside the same publication band. Read it as a cohort comparison, not as proof that one provider family wins everywhere." />
        </View>
      )}

      <View style={styles.table} wrap={false}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { width: 90 }]}>Provider</Text>
          <Text style={[styles.tableHeaderCell, { width: 60 }]}>Count</Text>
          <Text style={[styles.tableHeaderCell, { width: 50 }]}>Health</Text>
          <Text style={[styles.tableHeaderCell, { width: 70 }]}>Avg Imp</Text>
          <Text style={[styles.tableHeaderCell, { width: 50 }]}>Avg Pos</Text>
        </View>
        {providerSummary.map((row: any, i: number) => (
          <View key={row.provider_family} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.tableCell, { width: 90, fontWeight: "bold" }]}>{row.provider_family}</Text>
            <Text style={[styles.tableCell, { width: 60 }]}>{formatCompact(row.n)}</Text>
            <Text style={[styles.tableCell, { width: 50 }]}>{row.avg_health}</Text>
            <Text style={[styles.tableCell, { width: 70 }]}>{formatCompact(row.avg_imp)}</Text>
            <Text style={[styles.tableCell, { width: 50 }]}>{row.avg_pos}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.narrative}>
        Once we control for age, Gemini leads some cohorts and OpenAI leads others —{" "}
        <Text style={styles.narrativeBold}>the AI model matters less than how well you edit and publish the content.</Text>
        {"\n\n"}
        Output quality, editing standards, topic fit, and rollout timing are the real differentiators.
        This dataset does not support a blanket penalty tied only to AI usage.
      </Text>

      <ActionStep step="Compare content systems within the same age and topic cohorts" why="The model picture changes once age mix is controlled" how="When you test writing systems or prompts, review them inside the same publication window and topic class rather than comparing a newer batch to an older installed base." impact="Produces cleaner decisions about which production workflow actually performs better." measure="Track impressions, average position, and health context within matched cohorts at 30, 60, and 90 days." />

      <Footer page={15} />
    </Page>
  );
}

// ── Finding 11: Monthly Trends & Seasonal ────────────────────────────────────

export function F11_SeasonalPage({ d }: { d: any }) {
  const monthly = d.discoveries?.monthlyTrends ?? [];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #11 — TREND ANALYSIS" />
      <Text style={styles.sectionTitle}>Portfolio-Level <Text style={styles.sectionTitleAccent}>Trends.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        How portfolio metrics evolved over {d.windowLabels?.fullHistoryPage ?? "full available warehouse history"}.
      </Text>

      {monthly.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>Monthly Impressions</Text>
          <AreaChart
            data={monthly.map((m: any) => ({
              label: (m.month ?? "").slice(5),
              value: m.impressions ?? 0,
            }))}
            height={100}
            fillColor={colors.chartSecondary}
            strokeColor={colors.chartPrimary}
            yLabel="Impressions"
            yTickFormatter={(value) => formatCompact(value)}
          />
          <ChartRead text="Read this as a portfolio trend line, not a page-level benchmark. A rising line means the overall content base is earning more visibility over time, while a flat or falling line signals slowing momentum." />
        </View>
      )}

      {monthly.length > 0 && (
        <View style={styles.table} wrap={false}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { width: 60 }]}>Month</Text>
            <Text style={[styles.tableHeaderCell, { width: 80 }]}>Impressions</Text>
            <Text style={[styles.tableHeaderCell, { width: 65 }]}>Clicks</Text>
            <Text style={[styles.tableHeaderCell, { width: 65 }]}>Sessions</Text>
            <Text style={[styles.tableHeaderCell, { width: 65 }]}>AI Sessions</Text>
            <Text style={[styles.tableHeaderCell, { width: 75 }]}>Active Content</Text>
          </View>
          {monthly.map((m: any, i: number) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { width: 60, fontWeight: "bold" }]}>{m.month}</Text>
              <Text style={[styles.tableCell, { width: 80 }]}>{formatCompact(m.impressions ?? 0)}</Text>
              <Text style={[styles.tableCell, { width: 65 }]}>{formatCompact(m.clicks ?? 0)}</Text>
              <Text style={[styles.tableCell, { width: 65 }]}>{formatCompact(m.sessions ?? 0)}</Text>
              <Text style={[styles.tableCell, { width: 65 }]}>{formatCompact(m.ai_sessions ?? 0)}</Text>
              <Text style={[styles.tableCell, { width: 75 }]}>{formatCompact(m.active_content ?? 0)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.narrative}>
        This is the big picture — every month of data we have ({d.windowLabels?.fullHistoryPage ?? "full available warehouse history"}).
        Use it to see whether the portfolio is growing overall and whether recent trends match the longer pattern.
        {"\n\n"}
        Across this window, impressions, clicks, sessions, and active content all trend upward.
        AI sessions are growing too, but they're still a much smaller layer than classic organic traffic.
      </Text>

      <Footer page={16} />
    </Page>
  );
}

// ── Finding 12: Keyword Drift (page 1 — distribution) ─────────────────────────

export function F12_KeywordDriftPage({ d }: { d: any }) {
  const kd = d.keywordDrift ?? {};
  const dist = kd.distribution ?? [];
  const onTarget = kd.on_target_profile ?? {};
  const drifted = kd.drifted_profile ?? {};
  const pct = kd.percentiles ?? {};

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #12 — NEW ANALYSIS" />
      <Text style={styles.sectionTitle}>Keyword <Text style={styles.sectionTitleAccent}>Drift.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        You pick a keyword, publish content for it, then Google decides what the page actually ranks for. Here's how often that matches.
      </Text>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={`${kd.on_target_pct ?? 0}%`} label="on-target (25%+ from keyword)" />
        <DisruptionCard value={`${kd.drifted_pct ?? 0}%`} label="drifted (<25% from keyword)" />
        <DisruptionCard value={`${kd.zero_match_pct ?? 0}%`} label="zero matching queries" />
      </View>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>How Much Traffic Comes From Your Target Keyword</Text>
        <HorizontalBarChart
          data={dist.map((r: any) => ({
            label: r.bucket,
            value: r.pages ?? 0,
            count: r.pages,
            color: r.pct >= 20 ? colors.chartGreen : (r.bucket === "0%" ? colors.chartRed : colors.chartSecondary),
          }))}
          barHeight={20}
          gap={5}
          labelWidth={70}
          showCounts
          valueFormatter={(v) => `${formatCompact(v)} pages`}
        />
        <ChartRead text="Each bar is a group of pages. The label shows what percentage of that page's total impressions come from queries matching its primary keyword." />
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }} wrap={false}>
        <View style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: colors.chartGreen }}>
          <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.green, marginBottom: 6 }}>On-Target Pages</Text>
          <Text style={{ fontSize: 8, color: colors.textMuted, textTransform: "uppercase", marginBottom: 2 }}>Avg Impression Share</Text>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.textPrimary, marginBottom: 4 }}>{onTarget.avg_impression_share ?? 0}%</Text>
          <Text style={{ fontSize: 8, color: colors.textMuted, textTransform: "uppercase", marginBottom: 2 }}>Avg Queries Per Page</Text>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.textPrimary, marginBottom: 4 }}>{onTarget.avg_queries ?? 0}</Text>
          <Text style={{ fontSize: 8, color: colors.textMuted, textTransform: "uppercase", marginBottom: 2 }}>Matching Queries</Text>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.textPrimary }}>{onTarget.avg_matching_queries ?? 0}</Text>
        </View>
        <View style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: colors.chartRed }}>
          <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.red, marginBottom: 6 }}>Drifted Pages</Text>
          <Text style={{ fontSize: 8, color: colors.textMuted, textTransform: "uppercase", marginBottom: 2 }}>Avg Impression Share</Text>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.textPrimary, marginBottom: 4 }}>{drifted.avg_impression_share ?? 0}%</Text>
          <Text style={{ fontSize: 8, color: colors.textMuted, textTransform: "uppercase", marginBottom: 2 }}>Avg Queries Per Page</Text>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.textPrimary, marginBottom: 4 }}>{drifted.avg_queries ?? 0}</Text>
          <Text style={{ fontSize: 8, color: colors.textMuted, textTransform: "uppercase", marginBottom: 2 }}>Matching Queries</Text>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.textPrimary }}>{drifted.avg_matching_queries ?? 0}</Text>
        </View>
      </View>

      <Text style={styles.narrative}>
        We compared the keyword each page was created for (the primary keyword in FlyRank) against every query
        that page actually ranks for in Google Search Console. A query "matches" if it's the same phrase or shares
        50%+ of the same words.
        {"\n\n"}
        <Text style={styles.narrativeBold}>About half the portfolio ({kd.on_target_pct ?? 0}%) gets 25% or more of its
        traffic from the target keyword.</Text> The other half drifted — Google sends them traffic for different queries.
        And {kd.zero_match_pct ?? 0}% of pages get zero impressions from any query matching their keyword.
        {"\n\n"}
        Drifted pages aren't failing — they rank for {drifted.avg_queries ?? 0} queries on average (more than on-target pages
        at {onTarget.avg_queries ?? 0}). They found an audience, just not through the keyword you planned.
        The median page gets {pct.p50 ?? 0}% of its traffic from its target keyword. The top 10% get {pct.p90 ?? 0}%+.
      </Text>

      <View style={{ padding: 12, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 8, backgroundColor: colors.tableRowAlt, marginBottom: 16 }} wrap={false}>
        <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.textPrimary, marginBottom: 4 }}>How We Measured This</Text>
        <Text style={{ fontSize: 8, color: colors.textSecondary, lineHeight: 1.5 }}>
          For each of {formatCompact(kd.total_pages ?? 0)} pages with both a primary keyword and Google Search Console query data,
          we summed all impressions from queries that match the keyword (exact string match or 50%+ word overlap), then divided
          by the page's total impressions. Pages where this share is 25% or higher are "on-target." Below 25% means the page
          drifted to different queries. Window: {d.windowLabels?.fullHistoryQuery ?? "full available query history"}.
        </Text>
      </View>

      <Footer />
    </Page>
  );
}

// ── Finding 12 continued: Drift vs Performance ───────────────────────────────

export function F12_KeywordDriftPerformancePage({ d }: { d: any }) {
  const kd = d.keywordDrift ?? {};
  const corr = kd.correlations ?? {};
  const byBucket = corr.byBucket ?? [];
  const top20 = corr.top20_vs_bottom20?.top20 ?? {};
  const bottom20 = corr.top20_vs_bottom20?.bottom20 ?? {};
  const peakBucket = [...byBucket].sort((a: any, b: any) => (b.avg_impressions ?? 0) - (a.avg_impressions ?? 0))[0];
  const peakCtrBucket = [...byBucket].sort((a: any, b: any) => (b.avg_ctr ?? 0) - (a.avg_ctr ?? 0))[0];
  const zeroBucket = byBucket.find((b: any) => b.bucket === "0%");

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Finding #12 continued" />
      <Text style={styles.sectionTitle}>Drift vs <Text style={styles.sectionTitleAccent}>Performance.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Does matching your target keyword predict better performance? We checked impressions, clicks, CTR, and health score.
      </Text>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Average Impressions by Keyword Match Share</Text>
        <HorizontalBarChart
          data={byBucket.map((r: any) => ({
            label: `${r.bucket} match`,
            value: r.avg_impressions ?? 0,
            count: r.pages,
            color: (r.avg_impressions ?? 0) >= 5000 ? colors.chartGreen : (r.bucket === "0%" ? colors.chartRed : colors.chartSecondary),
          }))}
          barHeight={20}
          gap={5}
          labelWidth={85}
          showCounts
          valueFormatter={(v) => formatCompact(v)}
        />
        <ChartRead text="This shows average impressions per page, grouped by how much of the page's traffic comes from its target keyword. Higher keyword match does not mean more traffic." />
      </View>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Average Health Score by Keyword Match Share</Text>
        <HorizontalBarChart
          data={byBucket.map((r: any) => ({
            label: `${r.bucket} match`,
            value: r.avg_health ?? 0,
            count: r.pages,
            color: (r.avg_health ?? 0) >= 39 ? colors.chartGreen : (r.avg_health ?? 0) < 30 ? colors.chartRed : colors.chartSecondary,
          }))}
          barHeight={20}
          gap={5}
          labelWidth={85}
          showCounts
          maxValue={50}
        />
      </View>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={peakBucket?.bucket ?? "-"} label="highest impressions bucket" />
        <DisruptionCard value={peakCtrBucket?.bucket ?? "-"} label="highest CTR bucket" />
        <DisruptionCard value={`${zeroBucket?.avg_impressions ?? 0}`} label="avg impressions at 0% match" />
      </View>

      <Text style={styles.narrative}>
        <Text style={styles.narrativeBold}>Keyword match share does not predict impressions, clicks, or health score.</Text>{" "}
        The Pearson correlations are near zero: impressions {corr.pearson?.impressions ?? 0}, clicks {corr.pearson?.clicks ?? 0},
        health {corr.pearson?.health ?? 0}. Only CTR shows a slight positive trend ({corr.pearson?.ctr ?? 0}).
        {"\n\n"}
        The bucket breakdown tells the real story. Pages with <Text style={styles.narrativeBold}>0% keyword match average
        only {zeroBucket?.avg_impressions ?? 0} impressions</Text> — these pages have almost no traction at all.
        But the sweet spot is {peakBucket?.bucket ?? "1-10%"} match at <Text style={styles.narrativeBold}>{formatCompact(peakBucket?.avg_impressions ?? 0)} avg
        impressions and {peakBucket?.avg_health ?? 0} health</Text>. Pages tightly locked onto one keyword (75-100% match)
        average only {formatCompact(byBucket.find((b: any) => b.bucket === "75-100%")?.avg_impressions ?? 0)} impressions.
        {"\n\n"}
        <Text style={styles.narrativeBold}>Drift is not a problem — it's a feature.</Text> The best-performing pages capture
        their target keyword plus a wide net of related queries. Pages too tightly matched to one keyword have less total reach.
        The only real concern is the 0% group — pages with no keyword traction at all.
      </Text>

      <ActionStep step="Don't chase 100% keyword match — aim for broad relevance" why={`Pages with ${peakBucket?.bucket ?? "1-10%"} keyword match outperform tightly-matched pages by ${formatCompact((peakBucket?.avg_impressions ?? 0) - (byBucket.find((b: any) => b.bucket === "75-100%")?.avg_impressions ?? 0))} impressions on average`} how="Write content that covers the full topic around your keyword, not just the exact phrase. Include related questions, comparisons, and subtopics. Let Google match you to the queries your content genuinely answers." impact="Broader content earns more impressions while still capturing the target keyword as one of many traffic sources." measure="Track total impressions and query count per page. A healthy page should rank for dozens of queries, not just the one you targeted." />

      <Footer />
    </Page>
  );
}
