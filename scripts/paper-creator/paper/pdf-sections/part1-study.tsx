/**
 * Part I: Front Matter + Study Setup
 * Title, Executive Summary, TOC, Dataset, Portfolio Snapshot, How to Read
 */

import React from "react";
import { Page, Text, View, Svg, Path, Link } from "@react-pdf/renderer";
import { styles, colors } from "../pdf-styles";
import { formatCompact } from "../pdf-charts";

function Logo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size * 0.73} height={size} viewBox="0 0 26.200001 36">
      <Path d="m 0.05169492,35.421786 v -4.187072 c 0.9285139,0.350383 2.08477648,0.525574 3.43374948,0.525574 1.2613774,0 2.2424487,-0.315345 2.960733,-0.928514 0.7182843,-0.613169 1.3664922,-1.61176 1.9446235,-2.995772 L 9.6346591,24.87527 1.1554001,5.6567845 c 3.3811921,0 6.4295208,2.0147 7.7084173,5.0980665 L 12.542835,19.63705 18.464301,5.2012871 C 19.725679,2.1179203 22.774008,0.10322034 26.155199,0.10322034 L 14.540015,28.379096 c -1.068666,2.645388 -2.365082,4.572493 -3.836689,5.798832 -1.489126,1.226339 -3.4162303,1.82199 -5.781313,1.82199 -1.9446234,0 -3.5563833,-0.192712 -4.83527982,-0.578132 v 0 z" fill="#85638e" opacity={0.6} />
    </Svg>
  );
}

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return "0";
  return Number(n).toLocaleString("en-US");
}
function fmtM(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

export function Header({ section }: { section: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerBrand}>FlyRank</Text>
      <Text style={styles.headerSection}>{section}</Text>
    </View>
  );
}

export function Footer({ page }: { page?: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerBrand}>flyrank.ai | 10x.ai — The State of AI-Driven SEO, March 2026</Text>
      <Text style={styles.footerPage} render={({ pageNumber }) => String(pageNumber)} />
    </View>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statCardLabel}>{label}</Text>
      <Text style={styles.statCardValue}>{value}</Text>
      {sub && <Text style={styles.statCardSub}>{sub}</Text>}
    </View>
  );
}

export function AccentCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statCardAccent}>
      <Text style={styles.statCardAccentLabel}>{label}</Text>
      <Text style={styles.statCardAccentValue}>{value}</Text>
      {sub && <Text style={styles.statCardAccentSub}>{sub}</Text>}
    </View>
  );
}

export function DisruptionCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.disruptionCard}>
      <Text style={styles.disruptionValue}>{value}</Text>
      <Text style={styles.disruptionLabel}>{label}</Text>
    </View>
  );
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <View style={styles.legendRow}>
      {items.map((it, i) => (
        <View key={i} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: it.color }]} />
          <Text style={styles.legendText}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Finding({ tag, title, text }: { tag: string; title: string; text: string }) {
  return (
    <View style={styles.problemCard} wrap={false}>
      <View style={[styles.problemBadge, {
        backgroundColor: tag === "REVERSED" ? colors.yellow
          : tag === "DEBUNKED" ? colors.green
          : tag === "NUANCED" ? "#F97316"
          : tag === "CONFIRMED" ? colors.green
          : colors.purple
      }]}>
        <Text style={styles.problemBadgeText}>{tag}</Text>
      </View>
      <View style={styles.problemText}>
        <Text style={styles.problemTitle}>{title}</Text>
        <Text style={styles.problemDescription}>{text}</Text>
      </View>
    </View>
  );
}

export function Def({
  title,
  text,
  tone = "default",
}: {
  title: string;
  text: string;
  tone?: "default" | "warning";
}) {
  return (
    <View style={tone === "warning" ? styles.defBoxWarning : styles.defBox} wrap={false}>
      <Text style={styles.defTitle}>{title}</Text>
      <Text style={styles.defText}>{text}</Text>
    </View>
  );
}

export function ChartRead({ text }: { text: string }) {
  return (
    <Text style={{ marginTop: 4, fontSize: 7, color: colors.textSecondary, lineHeight: 1.35 }}>
      <Text style={{ fontWeight: "bold", color: colors.textPrimary }}>Chart read:</Text> {text}
    </Text>
  );
}

export function ActionStep({
  step,
  why,
  how,
  impact,
  measure,
}: {
  step: string;
  why: string;
  how: string;
  impact: string;
  measure?: string;
}) {
  return (
    <View style={styles.actionCallout} wrap={false}>
      <Text style={styles.actionStepTitle}>{step}</Text>
      <Text style={styles.actionStepMeta}>Why: {why}</Text>
      <Text style={styles.actionStepMeta}>How: {how}</Text>
      <Text style={styles.actionStepImpact}>Expected: {impact}</Text>
      {measure && <Text style={styles.actionStepMeta}>Measure: {measure}</Text>}
    </View>
  );
}

// ── Page 1: Title ────────────────────────────────────────────────────────────

export function TitlePage({ d }: { d: any }) {
  return (
    <Page size="A4" style={styles.titlePage}>
      <Logo size={50} />
      <View style={{ marginTop: 8, marginBottom: 4 }}>
        <Text style={styles.titleMeta}>DATA REPORT · MARCH 2026</Text>
      </View>
      <View style={styles.titleAccentBar} />
      <Text style={styles.titleMain}>THE STATE OF</Text>
      <Text style={styles.titleMain}>AI-DRIVEN SEO</Text>
      <Text style={styles.titleAccent}>IN NUMBERS.</Text>
      <View style={{ marginTop: 16, maxWidth: 380 }}>
        <Text style={styles.titleSubtitle}>
          We analyzed {d.scopeFullHistory?.totalContentFmt ?? d.scope.totalContentFmt} content pieces across {d.scopeFullHistory?.clientCount ?? d.scope.clientCount} brands
          to find out what actually works in SEO right now — and what doesn't. Performance sections use the last 90 days;
          structural analysis uses {d.windowLabels?.fullHistoryPage ?? "full available warehouse history"}.
        </Text>
      </View>
      <View style={{ marginTop: "auto" }}>
        <Text style={styles.titleMeta}>flyrank.com</Text>
      </View>
      <Footer page={1} />
    </Page>
  );
}

// ── Page 2: Executive Summary ────────────────────────────────────────────────

export function ExecutiveSummaryPage({ d }: { d: any }) {
  const publishedReversed = 3;
  const publishedNuanced = 7;
  const publishedDebunked = 1;
  const publishedMyths = publishedReversed + publishedNuanced + publishedDebunked;

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Executive Summary" />

      <Text style={styles.sectionTitle}>What This Paper <Text style={styles.sectionTitleAccent}>Covers</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Start here if you want the scope, the questions under review, and the intended reading order without spoiling the findings.
      </Text>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={d.scopeFullHistory?.totalContentFmt ?? d.scope.totalContentFmt} label="content pieces analyzed" />
        <DisruptionCard value={String(Object.keys(d.discoveries ?? {}).length + Object.keys(d.myths ?? {}).length + (d.discovery ? 8 : 0))} label="total analyses performed" />
        <DisruptionCard value={String(publishedMyths)} label="public myth tests" />
      </View>

      <Text style={styles.narrative}>
        We analyzed {d.scopeFullHistory?.totalContentFmt ?? d.scope.totalContentFmt} content pieces across {d.scopeFullHistory?.clientCount ?? d.scope.clientCount} brands.
        Recent performance uses the last 90 complete days. Structural analysis uses {d.windowLabels?.fullHistoryPage ?? "full available warehouse history"}.
        {"\n\n"}
        The report is built to read in sequence: first the direct portfolio findings, then a single myth-testing block,
        then the technical appendix, then the operating playbook that leads into the FlyRank close. That order matters
        because the myth pages reuse definitions introduced in the study setup, and the playbook works best after the evidence is established.
      </Text>

      <View style={{ marginTop: 4 }}>
        <Text style={styles.chartLabel}>Questions Tested In This Edition</Text>
        <Finding
          tag="TEST"
          title="How much do age, freshness, CTR, engagement, and channel mix explain portfolio performance?"
          text="The findings section establishes the observed patterns before any myth claim is tested."
        />
        <Finding
          tag="TEST"
          title="Do common SEO beliefs hold once we compare them against the actual portfolio data?"
          text="The myth section keeps every public myth test in one place."
        />
        <Finding
          tag="TEST"
          title="What should teams do differently after reading the evidence?"
          text="The playbook turns the strongest signals into a refresh and optimization workflow."
        />
      </View>

      <View style={{ marginTop: 6 }}>
        <Text style={styles.chartLabel}>Myth Section Structure</Text>
        <View style={styles.statCardRow}>
          <StatCard label="Total" value={String(publishedMyths)} sub="Public myth pages" />
          <StatCard label="Order" value="1 block" sub="All myth tests grouped together" />
          <StatCard label="Format" value="1 topic each" sub="Same structure across pages" />
          <StatCard label="Reveal" value="In section" sub="Outcomes withheld until Part III" />
        </View>
      </View>

      <View style={{ marginTop: 6 }} wrap={false}>
        <Text style={styles.sectionTitle}>How To Use <Text style={styles.sectionTitleAccent}>This Report</Text></Text>
        <View style={{ padding: 14, backgroundColor: colors.purple, borderRadius: 8 }} wrap={false}>
          <Text style={{ fontSize: 10.5, color: colors.textOnDark, lineHeight: 1.5, fontStyle: "italic" }}>
            "Read the findings first, then the myth tests. Use the ML appendix for supporting detail, then finish with the playbook."
          </Text>
        </View>
      </View>

      <Footer page={2} />
    </Page>
  );
}

// ── Page 3: Table of Contents ───────────────────────────────────────────────

export function TableOfContentsPage({ d }: { d: any }) {
  const tocEntries: { label: string; page: string; indent?: boolean; bold?: boolean }[] = [
    { label: "Executive Summary", page: "2", bold: true },
    { label: "Abstract & Dataset Scope", page: "4", bold: true },
    { label: "Portfolio Snapshot", page: "6" },
    { label: "Methodology & How to Read This Report", page: "8", bold: true },
    { label: "", page: "", bold: true },
    { label: "PART II — CORE FINDINGS", page: "", bold: true },
    { label: "Finding 1: Content Lifecycle — Growing vs Declining", page: "9" },
    { label: "Finding 2: The Age Curve", page: "10" },
    { label: "Finding 3: The Freshness Multiplier", page: "11" },
    { label: "Finding 4: Age × Freshness Interaction", page: "12" },
    { label: "Finding 5: The CTR Cliff", page: "13" },
    { label: "Finding 6: Engagement & Scroll Depth", page: "14" },
    { label: "Finding 7: Winning Combinations", page: "15" },
    { label: "Finding 8: Traffic Diversification", page: "16" },
    { label: "Finding 9: AI Traffic Profile", page: "17" },
    { label: "Finding 10: AI Model Cohorts", page: "18" },
    { label: "Finding 11: Seasonal Patterns", page: "19" },
    { label: "Finding 12: Keyword Drift", page: "20" },
    { label: "", page: "", bold: true },
    { label: "PART III — MYTH TESTS (11 TESTED)", page: "", bold: true },
    { label: "Myth Overview: What Weakened, Reversed, or Stayed Nuanced", page: "22" },
    { label: "Myth 1: High Search Volume = More Traffic", page: "23", indent: true },
    { label: "Myth 2: Optimization Flags = Failing Content", page: "24", indent: true },
    { label: "Myth 3: Longer Content Always Ranks Better", page: "25", indent: true },
    { label: "Myth 4: AI-Generated Content Is Penalized", page: "26", indent: true },
    { label: "Myth 5: Keyword Difficulty Is a Reliable Predictor", page: "27", indent: true },
    { label: "Myth 6: Fresh Content Always Outperforms", page: "28", indent: true },
    { label: "Myth 7: Publishing More = Better Results", page: "29", indent: true },
    { label: "Myth 8: Higher CPC = Better Organic", page: "30", indent: true },
    { label: "Myth 9: Engagement Drives Rankings", page: "31", indent: true },
    { label: "Myth 10: Transactional Intent Always Wins", page: "32", indent: true },
    { label: "Myth 11: Consistent Visibility = Growth", page: "33", indent: true },
    { label: "", page: "", bold: true },
    { label: "PART IV — WHAT THE DATA SAYS", page: "", bold: true },
    { label: "What Actually Correlates?", page: "35" },
    { label: "Five Types of Content", page: "36" },
    { label: "Which Pages Will Grow?", page: "37", indent: true },
    { label: "Which Dead Pages Can Come Back?", page: "38", indent: true },
    { label: "What Will Improve Next Month?", page: "39", indent: true },
    { label: "Refreshing Pages Actually Works", page: "40", indent: true },
    { label: "Where the Numbers Jump", page: "41", indent: true },
    { label: "Every Decision Tested", page: "42", indent: true },
    { label: "", page: "", bold: true },
    { label: "PART V — PLAYBOOK & ACTIONS", page: "", bold: true },
    { label: "Priority Actions & Content Refresh Program", page: "43" },
    { label: "AI Traffic Optimization & Quick Wins", page: "45" },
    { label: "", page: "", bold: true },
    { label: "PART VI — WHY FLYRANK", page: "", bold: true },
    { label: "What FlyRank Automates", page: "47" },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Table of Contents" />

      <Text style={styles.sectionTitle}>Table of <Text style={styles.sectionTitleAccent}>Contents</Text></Text>
      <Text style={styles.sectionSubtitle}>
        The reading order is intentional: findings first, myth tests second, ML appendix third, action pages last.
      </Text>

      <View style={{ marginTop: 8 }}>
        {tocEntries.map((entry, i) => {
          if (entry.label === "" && entry.page === "") {
            return <View key={i} style={{ height: 10 }} />;
          }
          if (entry.bold && !entry.page) {
            return (
              <View key={i} style={{ marginBottom: 6, marginTop: 2 }}>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.purple, letterSpacing: 0.8 }}>{entry.label}</Text>
              </View>
            );
          }
          return (
            <View key={i} style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 3, paddingLeft: entry.indent ? 12 : 0 }} wrap={false}>
              <Text style={{ fontSize: entry.bold ? 9.5 : 8.5, fontWeight: entry.bold ? "bold" : "normal", color: colors.textPrimary, flex: 1 }}>
                {entry.label}
              </Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, width: 30, textAlign: "right" }}>{entry.page}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: 16 }}>
        <Def
          title="Reading Shortcut"
          text="If you are short on time, read Executive Summary → Core Findings → Myth Tests → Priority Actions. Use Study Setup for definitions and caveats, and use the ML appendix as supporting detail before the action pages."
        />
      </View>

      <Footer page={3} />
    </Page>
  );
}

// ── Pages 4-6: Study Setup ──────────────────────────────────────────────────

export function AbstractPage({ d }: { d: any }) {
  return (
    <Page size="A4" style={styles.page}>
      <Header section="About This Study" />

      <Text style={styles.sectionTitle}>About This <Text style={styles.sectionTitleAccent}>Study</Text></Text>
      <Text style={styles.narrative}>
        This paper examines {d.scopeFullHistory?.totalContentFmt ?? d.scope.totalContentFmt} content pieces across {d.scopeFullHistory?.clientCount ?? d.scope.clientCount} brands.
        Recent performance uses the last 90 days: {d.scopeRecent?.totalImpressionsFmt ?? d.scope.totalImpressionsFmt} search impressions,
        {d.scopeRecent?.totalClicks ?? d.scope.totalClicks} clicks, {fmt(d.scopeRecent?.totalSessions ?? d.scope.totalSessions ?? 0)} sessions, and {fmt(d.scopeRecent?.totalAISessions ?? d.scope.totalAISessions ?? 0)} AI sessions.
        Structural analysis uses {d.windowLabels?.fullHistoryPage ?? "full available warehouse history"}.
        {"\n\n"}
        We asked simple questions: Does updating old content work? Does longer content rank better? Does AI-written
        content get penalized? Then we let the numbers answer. Direct data comparisons lead the paper. Machine-learning
        models appear in a bonus appendix.
        {"\n\n"}
        <Text style={styles.narrativeBold}>Every finding is backed by the data. If something didn't hold up, we say so.</Text>
        {"\n\n"}
        Every finding comes with a step-by-step action you can take this week.
      </Text>

      <Footer page={2} />
    </Page>
  );
}

// ── Pages 3-4: Dataset & Scope ───────────────────────────────────────────────

export function DatasetPage({ d }: { d: any }) {
  return (
    <Page size="A4" style={styles.page}>
      <Header section="The Dataset" />

      <Text style={styles.heroStat}>{d.scope.totalContentFmt}</Text>
      <Text style={styles.heroStatLabel}>content pieces analyzed across {d.scope.clientCount} brands</Text>

      <View style={{ marginTop: 16 }}>
        <View style={styles.statCardRow}>
          <StatCard label="90-Day Impressions" value={fmtM(d.scopeRecent?.totalImpressions ?? d.scope.totalImpressions)} sub={d.windowLabels?.recent90 ?? "Last 90 complete days"} />
          <StatCard label="90-Day Clicks" value={d.scopeRecent?.totalClicks ?? d.scope.totalClicks} sub="Organic search" />
          <StatCard label="Sessions Tracked" value={fmtM(d.scopeRecent?.totalSessions ?? d.scope.totalSessions ?? 0)} sub="GA4 recent window" />
        </View>
        <View style={styles.statCardRow}>
          <StatCard label="AI Sessions" value={fmt(d.scopeRecent?.totalAISessions ?? d.scope.totalAISessions ?? 0)} sub="Known AI referrals" />
          <StatCard label="AI Share" value={`${d.scopeRecent?.aiSharePct ?? d.scope.aiSharePct}%`} sub="Of tracked sessions" />
          <AccentCard label="Avg Health Score" value={String(d.scopeRecent?.avgHealth ?? d.scope.avgHealth)} sub="Current FlyRank composite context" />
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <View style={styles.statCardRow}>
          <StatCard label="Full-History Impressions" value={fmtM(d.scopeFullHistory?.totalImpressions ?? 0)} sub={d.windowLabels?.fullHistoryPage ?? "Full available warehouse history"} />
          <StatCard label="Full-History Clicks" value={d.scopeFullHistory?.totalClicks ?? "0"} sub="Warehouse totals" />
          <StatCard label="Full-History Sessions" value={fmtM(d.scopeFullHistory?.totalSessions ?? 0)} sub={`${d.scopeFullHistory?.activeDays ?? 0} active days`} />
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={styles.chartLabel}>30-Day Trend vs Previous 30 Days</Text>
        <View style={styles.disruptionRow} wrap={false}>
          <DisruptionCard value={d.trends.impressions} label="Impressions" />
          <DisruptionCard value={d.trends.clicks} label="Clicks" />
          <DisruptionCard value={d.trends.ai} label="AI Sessions" />
        </View>
        <ChartRead text="These show whether things got better or worse in the last month compared to the month before — a quick pulse check, not a substitute for the 90-day comparisons in the main findings." />
      </View>

      <Text style={styles.narrative}>
        This dataset includes everything — brand new articles, established pages, and struggling ones. That mix
        is what makes these patterns real, not cherry-picked. Recent performance uses the 90-day window, while
        structural analysis uses{` ${d.windowLabels?.fullHistoryPage ?? " full available warehouse history"}`}. Query
        relevance uses a separate window: {d.windowLabels?.fullHistoryQuery ?? "full available query history"}.
      </Text>

      <Footer page={3} />
    </Page>
  );
}

export function PortfolioSnapshotPage({ d }: { d: any }) {
  const totals = [
    ["Content", d.scope.totalContentFmt],
    ["Brands", String(d.scope.clientCount)],
    ["Impressions", d.scope.totalImpressionsFmt],
    ["Clicks", d.scope.totalClicks],
    ["Sessions", fmt(d.scope.totalSessions ?? 0)],
    ["AI Sessions", fmt(d.scope.totalAISessions ?? 0)],
  ];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Study Scope & Evidence Standard" />

      <Text style={styles.sectionTitle}>Study Scope & <Text style={styles.sectionTitleAccent}>Evidence Standard.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Here's exactly what we measured and the rules we follow for interpreting the data.
      </Text>

      <Text style={styles.narrative}>
        This paper covers {d.scope.totalContentFmt} content pieces across {d.scope.clientCount} brands,
        with {d.scope.totalImpressionsFmt} impressions, {d.scope.totalClicks} clicks,
        {fmt(d.scope.totalSessions ?? 0)} sessions, and {fmt(d.scope.totalAISessions ?? 0)} AI sessions.
        {"\n\n"}
        Reporting windows: {d.studyGuide?.windows ?? "90-day performance window, 30-day comparison, and historical monthly series."}
      </Text>

      <View style={styles.table} wrap={false}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { width: 150 }]}>Verified total</Text>
          <Text style={[styles.tableHeaderCell, { width: 180 }]}>Value</Text>
        </View>
        {totals.map(([label, value], i) => (
          <View key={label} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.tableCell, { width: 150, fontWeight: "bold" }]}>{label}</Text>
            <Text style={[styles.tableCell, { width: 180 }]}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 10 }}>
        <Def title="Metric Windows" text={d.studyGuide?.windows ?? "90-day performance window, 30-day comparison, and historical monthly series."} />
        <Def title="Data Source" text={d.studyGuide?.localSnapshotRule ?? "All numbers come from a verified data export. When we zoom into specific content groups, we note the sample size so you know how solid the finding is."} />
        <Def title="Evidence Standard" text={d.studyGuide?.evidenceStandard ?? "We trust what the raw numbers show over what the models predict. Models are interesting; actual performance is proof."} />
        <Def title="Interpretation Rule" text={d.studyGuide?.interpretationRule ?? "When our data disagrees with popular SEO advice, we go with the data."} />
      </View>

      <Footer page={4} />
    </Page>
  );
}

// ── Pages 5-6: How to Read This Paper ────────────────────────────────────────

export function HowToReadPage({ d }: { d: any }) {
  return (
    <Page size="A4" style={styles.page}>
      <Header section="How to Read This Paper" />

      <Text style={styles.sectionTitle}>Understanding the <Text style={styles.sectionTitleAccent}>Metrics</Text></Text>
      <Text style={styles.sectionSubtitle}>
        This paper leads with real search performance numbers. We use our composite score for context, not as the main proof.
      </Text>

      <Def title="Health Score (0-100)" text={`${d.studyGuide?.healthFormula ?? "A 0-100 score combining how often Google shows your page (30pts), how high it ranks (30pts), how often people click it (20pts), and how far they scroll (20pts)."} Higher = better performing content. This is a FlyRank metric, so major findings also show raw search numbers alongside it.`} />

      <Def title="Position Tiers" text="Top 3: positions 1-3 (the best spots) | Page 1: positions 4-10 | Striking Distance: positions 11-20 (close to page 1 — highest ROI zone) | Page 3-5: positions 21-50 | Deep: 50+ (very hard to find)" />

      <Def title="Age & Freshness" text="Age = how old the article is. Freshness = how recently it was updated. These are different things: a 2-year-old article updated last week is old but fresh. A 3-month-old article never touched since launch is young but stale." />

      <Def title="AI Traffic" text={`Visits from AI tools like ChatGPT, Perplexity, Gemini, Copilot, Claude, and Meta AI. Currently ${d.scope.totalSessions ? ((d.scope.totalAISessions / d.scope.totalSessions) * 100).toFixed(1) : "~1"}% of tracked sessions (${fmt(d.scope.totalAISessions ?? 0)} of ${fmtM(d.scope.totalSessions ?? 0)}). Small but growing.`} />

      <Def title="Optimization Flags" text="Labels FlyRank assigns to pages that need attention — like 'Fix CTR' (people see it but don't click) or 'Zombie Page' (basically invisible). They tell you what to fix, not that the content is bad." />

      <Def title="Trend Direction" text="Based on the last 30 days vs the 30 days before. Up: >10% growth. Down: >10% decline. Stable: within +/-10%. Flat: not enough data. New: published within 30 days." />

      <Text style={{ marginTop: 12, fontSize: 10, fontWeight: "bold", color: colors.textPrimary }}>
        Finding Tags
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 6, marginBottom: 12 }}>
        {[
          { tag: "CONFIRMED", color: colors.green, desc: "Hypothesis validated by data" },
          { tag: "REVERSED", color: colors.yellow, desc: "Data showed the opposite" },
          { tag: "NUANCED", color: "#F97316", desc: "Partially true with caveats" },
        ].map((t) => (
          <View key={t.tag} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3, backgroundColor: t.color }}>
              <Text style={{ fontSize: 7, fontWeight: "bold", color: "#FFF" }}>{t.tag}</Text>
            </View>
            <Text style={{ fontSize: 7, color: colors.textSecondary }}>{t.desc}</Text>
          </View>
        ))}
      </View>

      <Def title="ML Techniques Used" text="We also ran machine learning models (clustering, prediction, and pattern detection) as a bonus appendix. Most published comparisons use large buckets, and smaller cells are called out where they appear. These models explore the data — the main findings rely on direct number comparisons." />

      <Footer page={5} />
    </Page>
  );
}
