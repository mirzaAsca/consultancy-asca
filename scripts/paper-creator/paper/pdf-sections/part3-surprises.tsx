/**
 * Part III: The Surprises — myth tests collected in one section
 */

import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { styles, colors } from "../pdf-styles";
import { HorizontalBarChart, HeatmapChart, ScatterPlot, formatCompact } from "../pdf-charts";
import { Header, Footer, Finding, DisruptionCard, ActionStep, ChartRead, Def, Legend } from "./part1-study";

function buildMythOverview() {
  return [
    {
      tag: "REVERSED",
      title: "High search volume is not a reliable traffic forecast",
      text: "Monthly search volume behaves more like a competition signal than a page-level traffic ceiling in this portfolio.",
    },
    {
      tag: "REVERSED",
      title: "Optimization flags mean measurable opportunity, not automatic failure",
      text: "Flagged pages are often the visible pages worth improving. Read flags as workflow priority, not as a claim that more flags are inherently better.",
    },
    {
      tag: "NUANCED",
      title: "Word count helps only when it buys better coverage",
      text: "Longer pages can win more demand when they answer more questions. Extra words without relevance do not create performance by themselves.",
    },
    {
      tag: "DEBUNKED",
      title: "AI-generated content is not penalized by default",
      text: "This dataset does not show a blanket penalty for AI use. Editing quality, topic fit, and publishing process matter more.",
    },
    {
      tag: "NUANCED",
      title: "Keyword difficulty matters, but mostly as a growth environment signal",
      text: "Lower-competition topics are safer, but difficulty does not work as a simple yes-or-no predictor by itself.",
    },
    {
      tag: "NUANCED",
      title: "Freshness amplifies quality rather than replacing it",
      text: "Refreshing strong pages works. Refreshing weak pages helps less. The best observed health cell is not always the freshest one.",
    },
    {
      tag: "NUANCED",
      title: "Publishing more content helps — but a strong library beats a busy one",
      text: "High-velocity publishers average better health, but the single healthiest brand publishes nothing. Volume without quality is noise.",
    },
    {
      tag: "REVERSED",
      title: "Higher CPC keywords deliver worse organic performance",
      text: "Every step up in CPC predicts worse health, fewer impressions, and worse position. The cheapest keywords outperform across every organic metric.",
    },
    {
      tag: "NUANCED",
      title: "Engagement metrics reflect quality but do not drive rankings",
      text: "High engagement correlates with health but shows near-zero correlation with position. Position drives engagement opportunity, not the reverse.",
    },
    {
      tag: "NUANCED",
      title: "No single search intent type is a performance silver bullet",
      text: "Transactional intent leads slightly in health, but informational content grows faster and dominates volume. Unclassified content is the real underperformer.",
    },
    {
      tag: "NUANCED",
      title: "Consistent visibility predicts health — but not growth",
      text: "The most visible content has plateaued. The real growth engine is moderate consistency, where content has proven viability but still has room to climb.",
    },
  ];
}

function titleCaseLabel(value: string): string {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function FailuresOverviewPage({ d }: { d?: any }) {
  const items = buildMythOverview();
  const reversedCount = items.filter((item) => item.tag === "REVERSED").length;
  const nuancedCount = items.filter((item) => item.tag === "NUANCED").length;
  const debunkedCount = items.filter((item) => item.tag === "DEBUNKED").length;

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Myth Tests" />
      <Text style={styles.sectionTitle}>What Weakened, Reversed, or Stayed <Text style={styles.sectionTitleAccent}>Nuanced.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Not everything we expected to work actually did. Here are the SEO beliefs this edition challenges, in the same order used in the detailed myth pages.
      </Text>

      <View style={{ alignItems: "center", marginBottom: 16, padding: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.cardBg }} wrap={false}>
        <Text style={styles.heroStat}>{String(items.length)}</Text>
        <Text style={styles.heroStatLabel}>published myth tests</Text>
      </View>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={String(reversedCount)} label="reversed myths" />
        <DisruptionCard value={String(nuancedCount)} label="nuanced myths" />
        <DisruptionCard value={String(debunkedCount)} label="direct debunk" />
      </View>

      <Text style={styles.narrative}>
        These are popular SEO beliefs that our data proved wrong or incomplete. We could have hidden the messy parts to
        tell a cleaner story, but knowing what weakens or breaks is just as valuable as knowing what confirms.
      </Text>

      {items.map((item) => (
        <Finding key={item.title} tag={item.tag} title={item.title} text={item.text} />
      ))}

      <Footer page={17} />
    </Page>
  );
}

// ── Myth 1: High SV = More Traffic ───────────────────────────────────────────

export function Myth1_SearchVolumePage({ d }: { d: any }) {
  const recent90 = d.myths?.searchVolumeRecent90 ?? {};
  const validation = d.myths?.searchVolumeValidation ?? {};
  const sv = recent90.buckets ?? validation.buckets ?? d.myths?.svVsImpressions ?? [];
  const highSvBucket = sv.find((row: any) => row.sv_bucket === "10K+");

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Myth #1 — REVERSED" />
      <Text style={styles.sectionTitle}>"High Search Volume <Text style={styles.sectionTitleAccent}>= More Traffic."</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Search-volume numbers from SEO tools are monthly estimates. When you compare them on the same monthly basis, they still fail as reliable traffic forecasts.
      </Text>

      <Def
        title="Why The Monthly Comparison Matters"
        text="DataForSEO search volume is a monthly estimate. That makes 90-day page impressions divided by three the clean apples-to-apples benchmark. We still show the raw 90-day comparison and the longer full-history check for context."
        tone="warning"
      />

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Share of Pages Beating Monthly Search Volume</Text>
        <HorizontalBarChart
          data={sv.map((r: any) => ({
            label: `SV ${r.sv_bucket}`,
            value: r.pct_above_volume_monthlyized ?? r.pct_above_volume ?? 0,
            color: (r.pct_above_volume_monthlyized ?? r.pct_above_volume ?? 0) >= 50 ? colors.chartGreen : colors.chartSecondary,
            count: r.n,
          }))}
          barHeight={22}
          gap={6}
          labelWidth={75}
          maxValue={100}
          showCounts
          valueFormatter={(value) => `${value.toFixed(0)}%`}
        />
        <ChartRead text={`This uses 90-day impressions divided by three so page traffic is compared against a monthly keyword-volume benchmark on the same basis. The 10K+ bucket is real but thin (${formatCompact(highSvBucket?.n ?? 0)} pages), so treat the top end directionally.`} />
      </View>

      {sv.length > 0 && (
        <View style={styles.table} wrap={false}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { width: 65 }]}>SV Bucket</Text>
            <Text style={[styles.tableHeaderCell, { width: 55 }]}>Count</Text>
            <Text style={[styles.tableHeaderCell, { width: 55 }]}>Avg SV</Text>
            <Text style={[styles.tableHeaderCell, { width: 60 }]}>90d Imp</Text>
            <Text style={[styles.tableHeaderCell, { width: 60 }]}>90d / 3</Text>
            <Text style={[styles.tableHeaderCell, { width: 60 }]}>Beat SV</Text>
          </View>
          {sv.map((r: any, i: number) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { width: 65, fontWeight: "bold" }]}>{r.sv_bucket}</Text>
              <Text style={[styles.tableCell, { width: 55 }]}>{formatCompact(r.n)}</Text>
              <Text style={[styles.tableCell, { width: 55 }]}>{formatCompact(r.avg_sv ?? 0)}</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>{formatCompact(r.avg_imp_90d ?? r.avg_imp_all ?? 0)}</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>{formatCompact(r.avg_imp_monthly_est ?? 0)}</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>{`${Number(r.pct_above_volume_monthlyized ?? r.pct_above_volume ?? 0).toFixed(0)}%`}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={`${recent90.pct_above_volume_monthlyized ?? 0}%`} label="monthly-adjusted pages beating volume" />
        <DisruptionCard value={`${recent90.pct_above_volume_90d ?? 0}%`} label="pages beating volume (90-day)" />
        <DisruptionCard value={`${validation.pct_above_volume ?? 0}%`} label="pages beating volume (full history)" />
      </View>

      <Text style={styles.narrative}>
        The clean comparison is monthly: <Text style={styles.narrativeBold}>{recent90.pct_above_volume_monthlyized ?? 0}% of pages still beat stored search volume after dividing 90-day impressions by three</Text>.
        In the raw 90-day view, {recent90.pct_above_volume_90d ?? 0}% beat it. Over the longer full-history window, {validation.pct_above_volume ?? 0}% still beat it.
        {"\n\n"}
        The correlation between search volume and actual traffic is effectively zero: {recent90.raw_correlation_90d ?? 0} for recent data
        and {validation.raw_correlation ?? 0} over the longer window. Low-volume keywords are the easiest to outperform, while high-volume
        terms are the least likely to beat their benchmark. <Text style={styles.narrativeBold}>Search volume tells you more about competition than about the traffic a page will actually earn.</Text>
      </Text>

      <ActionStep step="Use search volume as a rough guide, not a traffic prediction" why="Actual page traffic only weakly correlates with keyword volume numbers" how="Start with beatable demand and clear intent match. Treat search volume as a competition signal, not an expected traffic ceiling." impact="Helps you find topics where real upside is higher than keyword tools suggest." measure="Track average position, page-level impressions, and the share of pages exceeding their keyword-volume benchmark." />

      <Footer page={19} />
    </Page>
  );
}

// ── Myth 2: Flags = Failing ──────────────────────────────────────────────────

export function Myth2_FlagStackingPage({ d }: { d: any }) {
  const flags = d.flagStacking ?? [];
  const zeroFlags = flags.find((row: any) => row.flag_count === 0);
  const twoFlags = flags.find((row: any) => row.flag_count === 2);
  const threeFlags = flags.find((row: any) => row.flag_count === 3);
  const fiveFlags = flags.find((row: any) => row.flag_count === 5);

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Myth #2 — REVERSED" />
      <Text style={styles.sectionTitle}>"Content With Flags <Text style={styles.sectionTitleAccent}>Is Failing."</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Pages with diagnosed issues aren't failing — they're visible enough to measure. That makes them your best optimization targets.
      </Text>
      <Def
        title="About These Flags"
        text="These are FlyRank's internal optimization flags: diagnostic labels we assign to pages with enough visibility to measure. They are not external quality signals from Google."
        tone="warning"
      />

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Health Score by Number of Active Optimization Flags</Text>
        <HorizontalBarChart
          data={flags.filter((r: any) => r.flag_count !== null).map((r: any) => ({
            label: `${r.flag_count} flags`,
            value: r.avg_health ?? 0,
            color: (r.avg_health ?? 0) >= 50 ? colors.chartGreen : (r.avg_health ?? 0) >= 25 ? colors.chartSecondary : colors.chartRed,
            count: r.n,
          }))}
          barHeight={26}
          gap={8}
          labelWidth={55}
          maxValue={60}
          showCounts
          valueFormatter={(value) => value.toFixed(1)}
        />
        <ChartRead text={`Read this as workflow signal, not as a reward for accumulating flags. The pattern is not monotonic: 0 flags = ${zeroFlags?.avg_health ?? "?"}, 2 flags = ${twoFlags?.avg_health ?? "?"}, 3 flags = ${threeFlags?.avg_health ?? "?"}, and 5 flags is a tiny sample (${formatCompact(fiveFlags?.n ?? 0)} pages).`} />
      </View>

      <Text style={styles.narrative}>
        This was one of the most counterintuitive findings. In this dataset, pages with diagnosed issues are often the pages visible enough for us to measure in the first place.
        Pages with <Text style={styles.narrativeBold}>3+ flags materially outperform</Text> the zero-flag cohort, but the curve is not perfectly linear, so do not read this as "more flags is better."
        {"\n\n"}
        Why? A page needs to be visible enough for us to even detect problems. No flags often means nobody's
        looking at your page — including Google. Pages with multiple diagnosed issues have real traffic that can be improved.
        {"\n\n"}
        <Text style={styles.narrativeBold}>A page with a specific measurable problem is often more valuable than a page nobody sees.</Text>
        Flags = opportunity, not failure. Read this as workflow priority, not as a public claim that a higher flag count is inherently desirable.
      </Text>

      <ActionStep step="Treat measurable optimization issues as priority opportunities" why="A page with a specific diagnosed issue is usually easier to improve than a page with no measurable demand" how="Review visible pages for the exact problem they show, such as weak click capture or thin coverage, then fix that issue first instead of rewriting the whole asset." impact="Focuses effort on pages where the upside is knowable and more immediate." measure="Track impressions, clicks, and average position before and after each targeted fix." />

      <Footer page={20} />
    </Page>
  );
}

// ── Myth 3: Longer = Better ──────────────────────────────────────────────────

export function Myth3_WordCountPage({ d }: { d: any }) {
  const wc = d.wordCountPerformance ?? d.discoveries?.wordCountPerformance ?? [];
  const depth = d.discoveries?.contentDepth ?? {};
  const longForm = depth.longForm ?? {};
  const impressionsVsWords = depth.impressionsVsWordsScatter ?? [];
  const clicksVsChars = depth.clicksVsCharsScatter ?? [];
  const strongestTrafficBucket = [...wc].sort((a: any, b: any) => (b.avg_impressions_all ?? 0) - (a.avg_impressions_all ?? 0))[0];
  const strongestCoverageBucket = [...wc].sort((a: any, b: any) => (b.avg_query_count ?? 0) - (a.avg_query_count ?? 0))[0];
  const queryRelevance = d.queryRelevance?.overall ?? {};

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Myth #3 — NUANCED" />
      <Text style={styles.sectionTitle}>"Longer Content Always <Text style={styles.sectionTitleAccent}>Ranks Better."</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Longer content does get more traffic — but because it covers more topics, not because Google rewards word count. Page data uses {d.windowLabels?.fullHistoryPage}; query data uses {d.windowLabels?.fullHistoryQuery}.
      </Text>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Average Impressions by Word Count Bucket</Text>
        <HorizontalBarChart
          data={wc.map((r: any) => ({
            label: r.wc_bucket,
            value: r.avg_impressions_all ?? 0,
            color: (r.avg_impressions_all ?? 0) >= 5000 ? colors.chartGreen : (r.avg_impressions_all ?? 0) >= 2500 ? colors.chartSecondary : colors.chartRed,
            count: r.pages,
          }))}
          barHeight={18}
          gap={4}
          labelWidth={65}
          maxValue={Math.max(...wc.map((row: any) => row.avg_impressions_all ?? 0), 1)}
          showCounts
        />
      </View>

      {(impressionsVsWords.length > 0 || clicksVsChars.length > 0) && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }} wrap={false}>
          {impressionsVsWords.length > 0 && (
            <View style={{ flex: 1 }}>
              <Text style={styles.chartLabel}>Impressions vs Word Count</Text>
              <ScatterPlot
                points={impressionsVsWords.map((point: any) => ({
                  x: point.x,
                  y: point.y,
                  color:
                    (point.traffic_band ?? point.health_label) === "high" || (point.traffic_band ?? point.health_label) === "healthy"
                      ? colors.chartGreen
                      : (point.traffic_band ?? point.health_label) === "low" || (point.traffic_band ?? point.health_label) === "poor"
                        ? colors.chartRed
                        : colors.chartSecondary,
                }))}
                width={230}
                height={120}
                xLabel="Word Count (log scale)"
                yLabel="Impressions, full history (log scale)"
              />
            </View>
          )}
          {clicksVsChars.length > 0 && (
            <View style={{ flex: 1 }}>
              <Text style={styles.chartLabel}>Clicks vs Character Count</Text>
              <ScatterPlot
                points={clicksVsChars.map((point: any) => ({
                  x: point.x,
                  y: point.y,
                  color:
                    (point.traffic_band ?? point.health_label) === "high" || (point.traffic_band ?? point.health_label) === "healthy"
                      ? colors.chartGreen
                      : (point.traffic_band ?? point.health_label) === "low" || (point.traffic_band ?? point.health_label) === "poor"
                        ? colors.chartRed
                        : colors.chartSecondary,
                }))}
                width={230}
                height={120}
                xLabel="Character Count (log scale)"
                yLabel="Clicks, full history (log scale)"
              />
            </View>
          )}
        </View>
      )}

      {(impressionsVsWords.length > 0 || clicksVsChars.length > 0) && (
        <>
          <Legend
            items={[
              { color: colors.chartRed, label: "Low traffic band" },
              { color: colors.chartSecondary, label: "Mid traffic band" },
              { color: colors.chartGreen, label: "High traffic band" },
            ]}
          />
          <ChartRead text="These are descriptive scatter plots, not fitted trend lines. The spread is broad rather than tightly linear, which is exactly the point: longer pages and larger character counts do not produce traffic in a simple straight-line way." />
        </>
      )}

      <View style={styles.table} wrap={false}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { width: 72 }]}>Words</Text>
          <Text style={[styles.tableHeaderCell, { width: 52 }]}>Pages</Text>
          <Text style={[styles.tableHeaderCell, { width: 60 }]}>Avg Imp</Text>
          <Text style={[styles.tableHeaderCell, { width: 55 }]}>Avg Sec</Text>
          <Text style={[styles.tableHeaderCell, { width: 55 }]}>Queries</Text>
          <Text style={[styles.tableHeaderCell, { width: 58 }]}>Off-Target %</Text>
          <Text style={[styles.tableHeaderCell, { width: 55 }]}>Top Rel.</Text>
        </View>
        {wc.map((r: any, i: number) => (
          <View key={r.wc_bucket} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.tableCell, { width: 72, fontWeight: "bold" }]}>{r.wc_bucket}</Text>
            <Text style={[styles.tableCell, { width: 52 }]}>{formatCompact(r.pages)}</Text>
            <Text style={[styles.tableCell, { width: 60 }]}>{formatCompact(r.avg_impressions_all ?? 0)}</Text>
            <Text style={[styles.tableCell, { width: 55 }]}>{r.avg_engagement_sec_all ?? "-"}</Text>
            <Text style={[styles.tableCell, { width: 55 }]}>{r.avg_query_count ?? "-"}</Text>
            <Text style={[styles.tableCell, { width: 58 }]}>{r.avg_off_target_impression_share ?? "-"}</Text>
            <Text style={[styles.tableCell, { width: 55 }]}>{r.top_query_exact_match_pct ?? "-"}</Text>
          </View>
        ))}
      </View>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={strongestCoverageBucket?.wc_bucket ?? "-"} label="Most queries answered" />
        <DisruptionCard value={String(longForm.word_count_vs_query_count_correlation ?? 0)} label="Word count vs queries link" />
        <DisruptionCard value={String(longForm.word_count_vs_engagement_correlation ?? 0)} label="Word count vs time-on-page link" />
      </View>

      <Text style={styles.narrative}>
        The {strongestTrafficBucket?.wc_bucket ?? "5K+"} bucket gets the most traffic and covers the most queries ({strongestCoverageBucket?.wc_bucket ?? "5K+"}).
        But <Text style={styles.narrativeBold}>longer content wins because it answers more questions, not because it's long.</Text>
        {"\n\n"}
        We do not see a strong relationship between word count and engagement time (correlation: {longForm.word_count_vs_engagement_correlation ?? 0}).
        Length doesn't equal engagement. Only {queryRelevance.top_query_exact_match_pct ?? 0}% of pages have their top query as an exact keyword match,
        while {queryRelevance.top_query_off_target_pct ?? 0}% are led by an off-target query — which is why depth needs a relevance
        check, not just more words. <Text style={styles.narrativeBold}>Write as much as the topic needs — no more.</Text>
      </Text>

      <ActionStep step="Use depth deliberately on pages that already show demand" why="Longer buckets in the combined page-history and query-history export carry more impressions and broader query coverage" how="Expand thin but visible pages with missing subtopics, examples, comparisons, and evidence instead of padding every page to a fixed word target." impact="Improves visibility where additional depth is most likely to matter without encouraging irrelevant query drift." measure="Track impressions, query count, and off-target impression share by refreshed word-count bucket." />

      <Footer page={21} />
    </Page>
  );
}

// ── Myth 4: AI Content Is Penalized ──────────────────────────────────────────

export function Myth4_AIContentPage({ d }: { d: any }) {
  return (
    <Page size="A4" style={styles.page}>
      <Header section="Myth #4 — DEBUNKED" />
      <Text style={styles.sectionTitle}>"AI-Generated Content <Text style={styles.sectionTitleAccent}>Is Penalized."</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Almost all content in this dataset is AI-generated. This dataset does not show a blanket penalty tied only to AI use.
      </Text>

      <Text style={styles.narrative}>
        Does Google penalize AI-generated content? Our dataset of {formatCompact(d.scopeFullHistory?.totalContent ?? d.scope?.totalContent ?? 0)} pieces
        — almost all AI-generated across multiple model cohorts — gives us a clear view.
        {"\n\n"}
        When we compared models within the same age tiers, both stronger and weaker outcomes showed up inside AI-authored
        cohorts. No single model always wins. <Text style={styles.narrativeBold}>The differences come from how well
        the content was edited and published, not from whether AI wrote it.</Text>
        {"\n\n"}
        Model choice, editing standards, and topic fit drive the differences we see. This dataset does not support a blanket
        penalty narrative tied only to AI usage.
      </Text>

      <ActionStep step="Evaluate publishing workflows by results, not assumptions" why="The differences in this portfolio come from editing and process quality, not a blanket AI penalty" how="Test writing systems within the same topic and publication window, then compare actual performance instead of assuming one method is safer." impact="Keeps content decisions evidence-led and avoids false binary thinking about AI use." measure="Track impressions, average position, and quality-review outcomes by workflow cohort." />

      <Footer page={22} />
    </Page>
  );
}

// ── Myth 5: Keyword Difficulty Is Reliable ───────────────────────────────────

export function Myth5_CompetitionPage({ d }: { d: any }) {
  const comp = (d.myths?.competition ?? []).filter((row: any) => row.competition_level !== "UNKNOWN");
  const low = comp.find((row: any) => row.competition_level === "LOW");
  const high = comp.find((row: any) => row.competition_level === "HIGH");
  const lowRatio = low?.declining_n ? (low.growing_n / low.declining_n).toFixed(1) : "2.2";
  const highRatio = high?.declining_n ? (high.growing_n / high.declining_n).toFixed(1) : "1.3";
  const lowVsHighGrowthLift = low && high && Number(highRatio) > 0
    ? Math.round(((Number(lowRatio) - Number(highRatio)) / Number(highRatio)) * 100)
    : 70;

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Myth #5 — NUANCED" />
      <Text style={styles.sectionTitle}>"Keyword Difficulty Is a <Text style={styles.sectionTitleAccent}>Reliable Predictor."</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Competition level matters — but not in the way you'd expect. The growth ratio tells the real story.
      </Text>

      {low && high && (
        <>
          <View style={styles.comparisonRow} wrap={false}>
            <View style={[styles.comparisonCard, styles.comparisonCardPositive]}>
              <Text style={styles.comparisonCardTitle}>LOW Competition</Text>
              <View style={styles.comparisonMetricRow}>
                <View style={styles.comparisonMetricCol}>
                  <Text style={styles.comparisonMetricLabel}>Health</Text>
                  <Text style={styles.comparisonMetricValue}>{low.avg_health}</Text>
                </View>
                <View style={styles.comparisonMetricCol}>
                  <Text style={styles.comparisonMetricLabel}>Growth Ratio</Text>
                  <Text style={styles.comparisonMetricValue}>{lowRatio}:1</Text>
                </View>
                <View style={styles.comparisonMetricCol}>
                  <Text style={styles.comparisonMetricLabel}>Avg Position</Text>
                  <Text style={styles.comparisonMetricValue}>{low.avg_pos}</Text>
                </View>
                <View style={styles.comparisonMetricCol}>
                  <Text style={styles.comparisonMetricLabel}>Count</Text>
                  <Text style={styles.comparisonMetricValue}>{formatCompact(low.n)}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.comparisonCard, styles.comparisonCardNegative]}>
              <Text style={styles.comparisonCardTitle}>HIGH Competition</Text>
              <View style={styles.comparisonMetricRow}>
                <View style={styles.comparisonMetricCol}>
                  <Text style={styles.comparisonMetricLabel}>Health</Text>
                  <Text style={styles.comparisonMetricValue}>{high.avg_health}</Text>
                </View>
                <View style={styles.comparisonMetricCol}>
                  <Text style={styles.comparisonMetricLabel}>Growth Ratio</Text>
                  <Text style={styles.comparisonMetricValue}>{highRatio}:1</Text>
                </View>
                <View style={styles.comparisonMetricCol}>
                  <Text style={styles.comparisonMetricLabel}>Avg Position</Text>
                  <Text style={styles.comparisonMetricValue}>{high.avg_pos}</Text>
                </View>
                <View style={styles.comparisonMetricCol}>
                  <Text style={styles.comparisonMetricLabel}>Count</Text>
                  <Text style={styles.comparisonMetricValue}>{formatCompact(high.n)}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.chartContainer} wrap={false}>
            <Text style={styles.chartLabel}>Growth-to-Decline Ratio by Competition Level</Text>
            <HorizontalBarChart
              data={[
                { label: "LOW competition", value: Number(lowRatio), color: colors.chartGreen, count: low.n },
                { label: "HIGH competition", value: Number(highRatio), color: colors.chartRed, count: high.n },
              ]}
              barHeight={22}
              gap={8}
              labelWidth={110}
              maxValue={Math.max(Number(lowRatio), Number(highRatio), 1)}
              showCounts
              valueFormatter={(value) => `${value.toFixed(1)}:1`}
            />
            <ChartRead text="This compares the odds of pages growing versus declining. Longer bars mean a safer growth environment, not a guarantee that every keyword will be easy." />
          </View>
        </>
      )}

      <Text style={styles.narrative}>
        LOW competition pages score {low?.avg_health ?? "34.4"} health vs HIGH at {high?.avg_health ?? "29.6"} — a {low && high ? (low.avg_health - high.avg_health).toFixed(1) : "4.8"}-point gap.
        But <Text style={styles.narrativeBold}>the growth ratio is where the real difference shows</Text>: LOW competition
        has a {lowRatio}:1 growth-to-decline ratio vs {highRatio}:1 for HIGH.
        {"\n\n"}
        That means LOW competition keywords are <Text style={styles.narrativeBold}>{lowVsHighGrowthLift}% more likely to be
        growing</Text> than HIGH competition ones. So competition still matters, but it does not tell the whole story by itself.
        It is more useful as a growth difficulty signal than as a simple yes-or-no ranking rule.
      </Text>

      <Footer page={23} />
    </Page>
  );
}

// ── Myth 6: Fresh Content Always Outperforms ─────────────────────────────────

export function Myth6_FreshnessPage({ d }: { d: any }) {
  const fc = (d.myths?.freshnessControlled ?? []).filter((row: any) => row.word_count_tier !== "unknown");
  const freshnessRows = [...new Set(fc.map((row: any) => row.freshness_tier).filter(Boolean))] as string[];
  const wordCountCols = [...new Set(fc.map((row: any) => row.word_count_tier).filter(Boolean))] as string[];
  const freshLong = fc.find((row: any) => row.freshness_tier === "0-30" && row.word_count_tier === "3500+");
  const staleLong = fc.find((row: any) => row.freshness_tier === "181-360" && row.word_count_tier === "3500+");
  const freshThin = fc.find((row: any) => row.freshness_tier === "0-30" && row.word_count_tier === "<1000");
  const staleThin = fc.find((row: any) => row.freshness_tier === "181-360" && row.word_count_tier === "<1000");
  const smallSampleCells = fc.filter((row: any) => (row.n ?? 0) < 50);
  const bestCell = [...fc].sort((a: any, b: any) => (b.avg_health ?? 0) - (a.avg_health ?? 0))[0];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Myth #6 — NUANCED" />
      <Text style={styles.sectionTitle}>"Fresh Content Always <Text style={styles.sectionTitleAccent}>Outperforms."</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Updating a great page makes it amazing. Updating a weak page makes it slightly less weak. Here's the data.
      </Text>

      {freshnessRows.length > 0 && wordCountCols.length > 0 && (
        <View style={styles.chartContainer} wrap={false}>
          <Text style={styles.chartLabel}>Health Score by Freshness Tier × Word Count Tier</Text>
          <HeatmapChart
            rows={freshnessRows}
            cols={wordCountCols}
            cells={fc.map((row: any) => ({
              row: row.freshness_tier,
              col: row.word_count_tier,
              value: row.avg_health ?? 0,
            }))}
            cellSize={40}
            labelWidth={68}
            topLabelHeight={34}
          />
          <ChartRead text={smallSampleCells.length > 0 ? `Darker cells = stronger health. ${smallSampleCells.length} cells have fewer than 50 pages, so treat those corners as directional rather than definitive.` : "Darker cells = stronger health. Read this as the interaction between freshness and depth, not as a rule that every page should be newer or longer."} />
        </View>
      )}

      <Text style={styles.narrative}>
        At 3500+ words: fresh content (0-30d) scores {freshLong?.avg_health ?? "38.7"} health vs stale (181-360d)
        at {staleLong?.avg_health ?? "15.9"} — a <Text style={styles.narrativeBold}>{freshLong && staleLong ? (freshLong.avg_health - staleLong.avg_health).toFixed(1) : "19.9"}-point gap</Text>.
        At {"<"}1000 words, that relationship does not hold in the same way: fresh scores {freshThin?.avg_health ?? "19.9"} vs stale at {staleThin?.avg_health ?? "23.9"}, a{" "}
        {freshThin && staleThin ? Math.abs(freshThin.avg_health - staleThin.avg_health).toFixed(1) : "4.0"}-point deficit for the freshly updated thin-page cohort.
        {"\n\n"}
        <Text style={styles.narrativeBold}>Freshness multiplies existing quality.</Text> Refreshing a strong, comprehensive
        page produces dramatic results. Thin pages do not show the same payoff here, which is exactly why freshness should be read together with depth and coverage.
        Also note the top cell in this matrix is not the freshest one: <Text style={styles.narrativeBold}>{bestCell?.freshness_tier ?? "91-180"} × {bestCell?.word_count_tier ?? "3500+"}</Text> reaches{" "}
        <Text style={styles.narrativeBold}>{bestCell?.avg_health ?? "39.1"}</Text>. Prioritize refreshing your best content first, but do not collapse this into a simplistic "newest always wins" story.
      </Text>

      <Footer page={24} />
    </Page>
  );
}

// ── Myth 7: Publishing More = Better ────────────────────────────────────────

export function Myth7_PublishVelocityPage({ d }: { d: any }) {
  const pv = d.myths?.publishVelocityEnhanced ?? {};
  const buckets = pv.buckets ?? [];
  const notable = pv.notable ?? {};
  const bestZero = notable.best_zero_publisher ?? {};
  const bestHigh = notable.best_high_publisher ?? {};

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Myth #7 — NUANCED" />
      <Text style={styles.sectionTitle}>"Publishing More Content <Text style={styles.sectionTitleAccent}>= Better Results."</Text></Text>
      <Text style={styles.sectionSubtitle}>
        We compared all {pv.total_clients ?? 58} brands in the portfolio by how much they published in the last 90 days vs their actual performance.
      </Text>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Performance by Publishing Velocity (content-weighted)</Text>
        <HorizontalBarChart
          data={buckets.map((r: any) => ({
            label: r.bucket,
            value: r.wavg_health ?? 0,
            color: (r.wavg_health ?? 0) >= 25 ? colors.chartGreen : (r.wavg_health ?? 0) >= 15 ? colors.chartSecondary : colors.chartRed,
            count: r.total_content,
          }))}
          barHeight={26}
          gap={8}
          labelWidth={105}
          maxValue={Math.max(...buckets.map((r: any) => r.wavg_health ?? 0), 1)}
          showCounts
          valueFormatter={(value) => value.toFixed(1)}
        />
        <ChartRead text="Health is weighted by content volume — larger libraries pull the average harder. Count shows total content pieces in each velocity tier." />
      </View>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={String(bestZero.health ?? "-")} label={`best non-publisher (${bestZero.niche ?? "n/a"})`} />
        <DisruptionCard value={String(bestHigh.health ?? "-")} label={`best high-velocity (${bestHigh.niche ?? "n/a"})`} />
        <DisruptionCard value={bestHigh.growth_ratio ? `${bestHigh.growth_ratio}:1` : "-"} label="growth ratio (best active)" />
      </View>

      <Text style={styles.narrative}>
        High-velocity publishers ({">"} 2,000 pieces in 90 days) average <Text style={styles.narrativeBold}>{buckets[0]?.wavg_health ?? "30.3"} health</Text> — roughly double the zero-publishing group ({buckets[3]?.wavg_health ?? "14.0"}).
        That looks decisive, but the exceptions tell a richer story.
        {"\n\n"}
        A brand in the <Text style={styles.narrativeBold}>{bestZero.niche ?? "outdoor subscription box"} niche reached {bestZero.health ?? "45.4"} health and {formatCompact(bestZero.total_imp ?? 0)} impressions with zero recent publishing</Text>.
        That is the single highest health score in the entire portfolio. Meanwhile, a {bestHigh.niche ?? "speech therapy"} brand published nearly {formatCompact(bestHigh.pub_90d ?? 0)} pieces in 90 days and reached {bestHigh.health ?? "45.3"} — almost identical health, plus a {bestHigh.growth_ratio ?? "15"}:1 growth ratio.
        {"\n\n"}
        <Text style={styles.narrativeBold}>Publishing velocity helps on average, but a strong dormant library can outperform an active mediocre one.</Text>{" "}
        The real lesson: volume is a multiplier of quality, not a replacement for it.
      </Text>

      <ActionStep step="Match publishing speed to content quality — never sacrifice quality for volume" why="High-velocity publishers average 2x the health of non-publishers, but the portfolio's healthiest brand publishes nothing" how="Set a velocity target that your team can sustain without dropping quality. Review health scores monthly — if health drops while volume rises, slow down." impact="Avoids the trap of high-volume, low-quality publishing that dilutes portfolio health." measure="Track average health score per publishing cohort monthly. Watch for velocity-health divergence." />

      <Footer page={25} />
    </Page>
  );
}

// ── Myth 8: Higher CPC = Better Organic ─────────────────────────────────────

export function Myth8_CPCPage({ d }: { d: any }) {
  const cpc = d.myths?.cpcPerformance ?? {};
  const buckets = (cpc.buckets ?? []).filter((r: any) => r.cpc_bucket !== "No CPC");
  const corr = cpc.correlations ?? {};
  const cheapest = buckets[0];
  const priciest = buckets[buckets.length - 1];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Myth #8 — REVERSED" />
      <Text style={styles.sectionTitle}>"Higher CPC Keywords <Text style={styles.sectionTitleAccent}>= Better Organic."</Text></Text>
      <Text style={styles.sectionSubtitle}>
        SEO practitioners often chase high-CPC keywords assuming they signal high organic value. Our data says the opposite.
      </Text>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Health Score by CPC Bucket (343K content)</Text>
        <HorizontalBarChart
          data={buckets.map((r: any) => ({
            label: `$${r.cpc_bucket}`,
            value: r.avg_health ?? 0,
            color: (r.avg_health ?? 0) >= 27 ? colors.chartGreen : (r.avg_health ?? 0) >= 22 ? colors.chartSecondary : colors.chartRed,
            count: r.n,
          }))}
          barHeight={22}
          gap={6}
          labelWidth={85}
          maxValue={Math.max(...buckets.map((r: any) => r.avg_health ?? 0), 1)}
          showCounts
          valueFormatter={(value) => value.toFixed(1)}
        />
        <ChartRead text="The pattern is perfectly monotonic and inverse. Every step up in CPC predicts worse organic health." />
      </View>

      {buckets.length > 0 && (
        <View style={styles.table} wrap={false}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { width: 75 }]}>CPC Bucket</Text>
            <Text style={[styles.tableHeaderCell, { width: 55 }]}>Count</Text>
            <Text style={[styles.tableHeaderCell, { width: 55 }]}>Health</Text>
            <Text style={[styles.tableHeaderCell, { width: 55 }]}>Avg Imp</Text>
            <Text style={[styles.tableHeaderCell, { width: 50 }]}>Avg Pos</Text>
            <Text style={[styles.tableHeaderCell, { width: 50 }]}>CTR</Text>
            <Text style={[styles.tableHeaderCell, { width: 55 }]}>Up/Down</Text>
          </View>
          {buckets.map((r: any, i: number) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { width: 75, fontWeight: "bold" }]}>${r.cpc_bucket}</Text>
              <Text style={[styles.tableCell, { width: 55 }]}>{formatCompact(r.n)}</Text>
              <Text style={[styles.tableCell, { width: 55 }]}>{r.avg_health}</Text>
              <Text style={[styles.tableCell, { width: 55 }]}>{formatCompact(r.avg_imp)}</Text>
              <Text style={[styles.tableCell, { width: 50 }]}>{r.avg_pos}</Text>
              <Text style={[styles.tableCell, { width: 50 }]}>{`${(r.avg_ctr * 100).toFixed(1)}%`}</Text>
              <Text style={[styles.tableCell, { width: 55 }]}>{r.down_n > 0 ? (r.up_n / r.down_n).toFixed(2) : "-"}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={String(corr.cpc_health ?? "-")} label="CPC ↔ health correlation" />
        <DisruptionCard value={String(corr.cpc_imp ?? "-")} label="CPC ↔ impressions correlation" />
        <DisruptionCard value={String(corr.cpc_pos ?? "-")} label="CPC ↔ position correlation" />
      </View>

      <Text style={styles.narrative}>
        The cheapest keywords ({"<"}$0.50) reach <Text style={styles.narrativeBold}>{cheapest?.avg_health ?? "27.2"} health and {formatCompact(cheapest?.avg_imp ?? 0)} avg impressions</Text>,
        while the most expensive ($5+) manage just <Text style={styles.narrativeBold}>{priciest?.avg_health ?? "19.9"} health and {formatCompact(priciest?.avg_imp ?? 0)} impressions</Text> — at position {priciest?.avg_pos ?? "25.1"}.
        {"\n\n"}
        All three correlations are effectively zero or slightly negative. <Text style={styles.narrativeBold}>CPC measures ad-market competition, not organic opportunity.</Text> Targeting expensive keywords
        is a paid-search strategy that does not translate into organic performance.
      </Text>

      <ActionStep step="Stop using CPC as a proxy for organic keyword value" why="CPC correlates at -0.045 with health and -0.017 with impressions — effectively zero" how="When evaluating keywords for organic content, prioritize search volume, competition level, intent match, and topic relevance over CPC. Reserve CPC analysis for paid campaigns." impact="Redirects effort toward keywords where organic upside is real rather than where ad markets are expensive." measure="Compare organic impressions and health for new content targeted at low-CPC vs high-CPC keywords." />

      <Footer page={26} />
    </Page>
  );
}

// ── Myth 9: Engagement Drives Rankings ──────────────────────────────────────

export function Myth9_EngagementPage({ d }: { d: any }) {
  const eng = d.myths?.engagementRankings ?? {};
  const matrix = (eng.matrix ?? []).filter((r: any) => r.n >= 10);
  const corr = eng.correlations ?? {};
  const highHigh = matrix.find((r: any) => r.engage_tier === "high" && r.scroll_tier === "high");
  const noNo = matrix.find((r: any) => r.engage_tier === "no_data" && r.scroll_tier === "no_data");

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Myth #9 — NUANCED" />
      <Text style={styles.sectionTitle}>"Better Engagement <Text style={styles.sectionTitleAccent}>= Higher Rankings."</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Google has repeatedly denied that dwell time and bounce rate are direct ranking factors. Does our data agree?
      </Text>

      <Def
        title="Important Context"
        text={`${formatCompact(eng.no_data_count ?? 293177)} of ${formatCompact(eng.total_content ?? 343564)} content pieces (${eng.no_data_count && eng.total_content ? Math.round(eng.no_data_count / eng.total_content * 100) : 85}%) have no engagement or scroll data at all. The patterns below reflect the subset that does have data, which skews toward higher-performing content.`}
        tone="warning"
      />

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Health Score: Engagement × Scroll Matrix</Text>
        <HorizontalBarChart
          data={matrix.filter((r: any) => r.engage_tier !== "no_data" || r.scroll_tier !== "no_data").slice(0, 6).map((r: any) => ({
            label: `${titleCaseLabel(r.engage_tier)} / ${titleCaseLabel(r.scroll_tier)}`,
            value: r.avg_health ?? 0,
            color: (r.avg_health ?? 0) >= 45 ? colors.chartGreen : (r.avg_health ?? 0) >= 35 ? colors.chartSecondary : colors.chartRed,
            count: r.n,
          }))}
          barHeight={22}
          gap={6}
          labelWidth={120}
          maxValue={Math.max(...matrix.map((r: any) => r.avg_health ?? 0), 1)}
          showCounts
          valueFormatter={(value) => value.toFixed(1)}
        />
      </View>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={String(corr.engage_pos ?? "-")} label="engagement ↔ position" />
        <DisruptionCard value={String(corr.scroll_pos ?? "-")} label="scroll ↔ position" />
        <DisruptionCard value={String(corr.engage_health ?? "-")} label="engagement ↔ health" />
        <DisruptionCard value={String(corr.scroll_health ?? "-")} label="scroll ↔ health" />
      </View>

      <Text style={styles.narrative}>
        High engagement + high scroll content reaches <Text style={styles.narrativeBold}>{highHigh?.avg_health ?? "48.3"} health at position {highHigh?.avg_pos ?? "14.0"}</Text>.
        Content with no engagement data sits at <Text style={styles.narrativeBold}>{noNo?.avg_health ?? "19.4"} health at position {noNo?.avg_pos ?? "16.4"}</Text>.
        That is only a 2.4 position gap between the best and worst engagement cohorts.
        {"\n\n"}
        The correlation between engagement and position is <Text style={styles.narrativeBold}>{corr.engage_pos ?? "0.015"} — essentially zero</Text>.
        Scroll rate and position: {corr.scroll_pos ?? "0.056"}. Both are negligible. Engagement does correlate weakly with health ({corr.engage_health ?? "0.115"}),
        but health includes engagement in its formula, so that is partly circular.
        {"\n\n"}
        <Text style={styles.narrativeBold}>Position drives engagement opportunity, not the other way around.</Text>{" "}
        Higher-ranked pages get more visitors who can engage. This supports Google's public statements: engagement metrics are not direct ranking signals.
      </Text>

      <ActionStep step="Optimize engagement for user value, not for rankings" why="Engagement ↔ position correlation is 0.015 — near zero" how="Improve scroll depth, time on page, and interaction for conversion and reader satisfaction rather than treating them as ranking levers. Focus ranking efforts on relevance, authority, and technical SEO." impact="Avoids wasted effort on engagement hacks that do not move organic position." measure="Track engagement and position independently. If engagement improves but position does not, the data confirms the pattern." />

      <Footer page={27} />
    </Page>
  );
}

// ── Myth 10: Transactional Intent Wins ──────────────────────────────────────

export function Myth10_IntentPage({ d }: { d: any }) {
  const ip = d.myths?.intentPerformance ?? {};
  const intents = (ip.intents ?? []).filter((r: any) => r.intent !== "not_classified");
  const classified = intents;
  const notClassified = (ip.intents ?? []).find((r: any) => r.intent === "not_classified");
  const info = intents.find((r: any) => r.intent === "informational");
  const trans = intents.find((r: any) => r.intent === "transactional");

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Myth #10 — NUANCED" />
      <Text style={styles.sectionTitle}>"Transactional Intent <Text style={styles.sectionTitleAccent}>Always Wins."</Text></Text>
      <Text style={styles.sectionSubtitle}>
        SEO teams often prioritize transactional keywords for their assumed conversion value. Does intent type actually predict organic performance?
      </Text>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Health Score by Search Intent ({formatCompact(ip.total_content ?? 0)} content)</Text>
        <HorizontalBarChart
          data={classified.map((r: any) => ({
            label: titleCaseLabel(r.intent),
            value: r.avg_health ?? 0,
            color: r.intent === "transactional" ? colors.chartGreen : r.intent === "navigational" ? colors.chartRed : colors.chartSecondary,
            count: r.n,
          }))}
          barHeight={26}
          gap={8}
          labelWidth={95}
          maxValue={Math.max(...classified.map((r: any) => r.avg_health ?? 0), 1)}
          showCounts
          valueFormatter={(value) => value.toFixed(1)}
        />
      </View>

      {classified.length > 0 && (
        <View style={styles.table} wrap={false}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { width: 80 }]}>Intent</Text>
            <Text style={[styles.tableHeaderCell, { width: 50 }]}>Count</Text>
            <Text style={[styles.tableHeaderCell, { width: 50 }]}>Health</Text>
            <Text style={[styles.tableHeaderCell, { width: 55 }]}>Avg Imp</Text>
            <Text style={[styles.tableHeaderCell, { width: 50 }]}>Pos</Text>
            <Text style={[styles.tableHeaderCell, { width: 50 }]}>CTR</Text>
            <Text style={[styles.tableHeaderCell, { width: 55 }]}>Up/Down</Text>
          </View>
          {classified.map((r: any, i: number) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { width: 80, fontWeight: "bold" }]}>{titleCaseLabel(r.intent)}</Text>
              <Text style={[styles.tableCell, { width: 50 }]}>{formatCompact(r.n)}</Text>
              <Text style={[styles.tableCell, { width: 50 }]}>{r.avg_health}</Text>
              <Text style={[styles.tableCell, { width: 55 }]}>{formatCompact(r.avg_imp)}</Text>
              <Text style={[styles.tableCell, { width: 50 }]}>{r.avg_pos}</Text>
              <Text style={[styles.tableCell, { width: 50 }]}>{`${(r.avg_ctr * 100).toFixed(1)}%`}</Text>
              <Text style={[styles.tableCell, { width: 55 }]}>{r.growth_ratio ?? "-"}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={`${info?.pct_of_total ?? "53"}%`} label="portfolio is informational" />
        <DisruptionCard value={`${trans?.avg_health ?? "28.8"}`} label="transactional health (best)" />
        <DisruptionCard value={`${info?.growth_ratio ?? "1.86"}:1`} label="informational growth ratio (best)" />
      </View>

      <Text style={styles.narrative}>
        Transactional intent leads in health ({trans?.avg_health ?? "28.8"}) and impressions ({formatCompact(trans?.avg_imp ?? 0)}),
        but only by a small margin over commercial ({classified.find((r: any) => r.intent === "commercial")?.avg_health ?? "27.1"}).
        The gap between transactional and informational is just {trans && info ? (trans.avg_health - info.avg_health).toFixed(1) : "6.2"} health points.
        {"\n\n"}
        <Text style={styles.narrativeBold}>Informational content has the best growth ratio ({info?.growth_ratio ?? "1.86"}:1)</Text> — more
        content is trending up vs down compared to transactional ({trans?.growth_ratio ?? "1.71"}:1). Informational also holds the highest
        CTR ({info ? `${(info.avg_ctr * 100).toFixed(1)}%` : "33.8%"}) and dominates volume at {info?.pct_of_total ?? "53"}% of the portfolio.
        {notClassified ? `\n\nNotably, unclassified content (${formatCompact(notClassified.n)} pieces) has a ${notClassified.growth_ratio}:1 growth ratio — declining almost 2x faster than growing. Intent classification itself correlates with performance.` : ""}
      </Text>

      <ActionStep step="Balance intent mix rather than over-indexing on transactional" why={`Informational content grows at ${info?.growth_ratio ?? "1.86"}:1 vs transactional at ${trans?.growth_ratio ?? "1.71"}:1 — faster growth at scale`} how="Maintain a healthy mix of informational and transactional content. Use informational pieces to build topical authority and funnel visitors toward transactional pages." impact="Captures the full demand spectrum rather than competing only on high-intent, high-competition terms." measure="Track growth ratio, health, and impressions by intent bucket monthly." />

      <Footer page={28} />
    </Page>
  );
}

// ── Myth 11: Consistent Visibility = Growth ─────────────────────────────────

export function Myth11_VisibilityGrowthPage({ d }: { d: any }) {
  const vg = d.myths?.visibilityGrowth ?? {};
  const buckets = (vg.buckets ?? []).filter((r: any) => r.vis_bucket !== "Zero Visibility");
  const corr = vg.correlations ?? {};
  const veryConsistent = buckets.find((r: any) => (r.vis_bucket ?? "").includes("Very"));
  const moderate = buckets.find((r: any) => (r.vis_bucket ?? "").includes("Moderate"));
  const rare = buckets.find((r: any) => (r.vis_bucket ?? "").includes("Rare"));
  const zeroVis = (vg.buckets ?? []).find((r: any) => r.vis_bucket === "Zero Visibility");

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Myth #11 — NUANCED" />
      <Text style={styles.sectionTitle}>"Consistent Visibility <Text style={styles.sectionTitleAccent}>= Consistent Growth."</Text></Text>
      <Text style={styles.sectionSubtitle}>
        If your content appears in search results every day, it must be growing — right? This is the most counterintuitive finding in our study.
      </Text>

      <View style={styles.chartContainer} wrap={false}>
        <Text style={styles.chartLabel}>Health Score vs Growth Ratio by Visibility Consistency</Text>
        <HorizontalBarChart
          data={buckets.map((r: any) => ({
            label: r.vis_bucket,
            value: r.avg_health ?? 0,
            color: (r.growth_ratio ?? 0) >= 2 ? colors.chartGreen : (r.growth_ratio ?? 0) >= 1 ? colors.chartSecondary : colors.chartRed,
            count: r.n,
          }))}
          barHeight={26}
          gap={8}
          labelWidth={140}
          maxValue={Math.max(...buckets.map((r: any) => r.avg_health ?? 0), 1)}
          showCounts
          valueFormatter={(value) => value.toFixed(1)}
        />
        <ChartRead text="Bar length = health score. Color = growth ratio: green (>2:1 = growing), amber (1-2:1 = mixed), red (<1:1 = declining). The most visible content is healthiest but NOT the fastest growing." />
      </View>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={String(veryConsistent?.avg_health ?? "-")} label="health (very consistent)" />
        <DisruptionCard value={`${moderate?.growth_ratio ?? "-"}:1`} label="growth ratio (moderate = best)" />
        <DisruptionCard value={`${rare?.growth_ratio ?? "-"}:1`} label="growth ratio (rare = worst)" />
        <DisruptionCard value={formatCompact(zeroVis?.n ?? 0)} label="zero-visibility content" />
      </View>

      <Text style={styles.narrative}>
        The "Very Consistent" group (80-90 days visible) has the <Text style={styles.narrativeBold}>best health ({veryConsistent?.avg_health ?? "47.7"}) and most impressions ({formatCompact(veryConsistent?.avg_imp ?? 0)})</Text> — but
        the <Text style={styles.narrativeBold}>worst growth ratio ({veryConsistent?.growth_ratio ?? "1.09"}:1)</Text>. Nearly equal up and down. This content has peaked.
        {"\n\n"}
        The real growth engine is the <Text style={styles.narrativeBold}>Moderate group (30-59 days): {moderate?.growth_ratio ?? "3.59"}:1 growth ratio</Text> — by far the best in the dataset.
        This content has proven viability but still has room to climb.
        {"\n\n"}
        Below 10 days of visibility, content is in decline territory: <Text style={styles.narrativeBold}>{rare?.growth_ratio ?? "0.37"}:1</Text> — declining 2.7x faster than growing.
        And {formatCompact(zeroVis?.n ?? 0)} content pieces ({zeroVis?.pct_of_total ?? "42.5"}% of the portfolio) have zero visibility at all.
      </Text>

      <Text style={styles.narrative}>
        <Text style={styles.narrativeBold}>The strongest correlation in the entire study</Text> is visibility consistency ↔ health at <Text style={styles.narrativeBold}>{corr.vis_health ?? "0.686"}</Text> (strong).
        But visibility predicts where you are, not where you are going. The growth sweet spot is moderate consistency — enough to prove viability, not so much that you have already plateaued.
      </Text>

      <ActionStep step="Focus optimization energy on moderately visible content (30-59 days)" why={`This tier has a ${moderate?.growth_ratio ?? "3.59"}:1 growth ratio — 3x better than the most consistent tier`} how="Identify content visible 30-59 days in the last 90. These are your highest-leverage optimization targets: proven demand, room to climb." impact="Concentrates effort where the growth probability is highest." measure="Segment content by visibility days. Track how many pages move from moderate to consistent tier after optimization." />

      <Footer page={29} />
    </Page>
  );
}
