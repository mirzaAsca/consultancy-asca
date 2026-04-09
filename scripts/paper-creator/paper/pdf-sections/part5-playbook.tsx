/**
 * Part V: The Playbook + Methodology — Pages 29-33
 */

import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { styles, colors } from "../pdf-styles";
import { StackedBar, formatCompact } from "../pdf-charts";
import { Header, Footer, Finding, DisruptionCard, ActionStep, Def, StatCard, AccentCard, Legend, ChartRead } from "./part1-study";

// ── Priority Action Framework ────────────────────────────────────────────────

export function PlaybookActionsPage({ d }: { d: any }) {
  return (
    <Page size="A4" style={styles.page}>
      <Header section="The Playbook" />
      <Text style={styles.sectionTitle}>Priority <Text style={styles.sectionTitleAccent}>Actions.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        8 things you can do right now, ranked by how strong the signal was in our data. Start at #1.
      </Text>

      <Finding tag="1" title="Refresh mature pages before they decay" text="Old pages that get updated bounce back dramatically — this was the single strongest signal in the dataset." />
      <Finding tag="2" title="Improve page-one click capture instead of rebuilding from scratch" text="A page already on page 1 returns clicks faster through snippet and clarity improvements than a brand new page can." />
      <Finding tag="3" title="Target lower-competition commercial/transactional topics" text="Buy-ready topics with low competition outperform crowded configurations on every metric." />
      <Finding tag="4" title="Add real depth to thin pages that already get traffic" text="Adding depth works when it covers more questions. Padding a page with filler to hit a word count doesn't." />
      <Finding tag="5" title="Distribute proven pages across more than one channel" text="Strong pages rarely rely on search alone. Support them with email, social, and internal links after publication." />
      <Finding tag="6" title="Treat flagged pages as your best optimization targets" text="A page with a diagnosed issue is more actionable than an invisible page with no measurable demand." />
      <Finding tag="7" title="Monitor AI traffic separately — it's a different channel" text="AI-attracting pages behave differently from classic organic winners and need their own tracking." />
      <Finding tag="8" title="Resolve cannibalization where pages split the same demand" text={`${formatCompact(d.cannibalization?.total_cannibalized_impressions ?? 0)} impressions are tied up in overlapping pages. Consolidation and clearer targeting can release that value.`} />

      <Footer page={30} />
    </Page>
  );
}

// ── Content Refresh Playbook ─────────────────────────────────────────────────

export function PlaybookRefreshPage({ d }: { d: any }) {
  const ageCurve = d.ageGoldenZone ?? [];
  const peakWindow = ageCurve.find((row: any) => row.age_bucket === "61-90");
  const decayWindow = ageCurve.find((row: any) => row.age_bucket === "271-365");
  const topDecile = (d.topBottom ?? []).find((row: any) => row.decile === "top_10pct");
  const bottomDecile = (d.topBottom ?? []).find((row: any) => row.decile === "bottom_10pct");
  const freshnessPeak = (d.validated?.freshnessExpanded ?? []).find((row: any) => row.freshness_bucket === "31-90");
  const engagementRows = d.discoveries?.engagementMatrix ?? [];
  const highEng = engagementRows.find((row: any) => row.scroll_bucket === "high_scroll" && row.engage_bucket === "high_engage");
  const lowEng = engagementRows.find((row: any) => row.scroll_bucket === "low_scroll" && row.engage_bucket === "low_engage");
  const engagementGap = highEng && lowEng ? (highEng.avg_health - lowEng.avg_health).toFixed(1) : null;

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Playbook: Content Refresh" />
      <Text style={styles.sectionTitle}>The Content Refresh <Text style={styles.sectionTitleAccent}>Playbook.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        A step-by-step process for updating content, backed by the freshness and age data in this study.
      </Text>

      <ActionStep
        step="1. Identify refresh candidates"
        why={`Pages lose health from ${peakWindow?.avg_health ?? "37.2"} at 61-90 days to ${decayWindow?.avg_health ?? "29.6"} by 271-365 days — catch them before the drop`}
        how="List older pages that used to earn impressions or still have meaningful visibility. Start with pages that are clearly dated, incomplete, or no longer competitive."
        impact="Targets the highest-value content most likely to recover"
        measure="Track refreshed-page count, health score lift, and 30-day impression recovery versus untreated candidates."
      />
      <ActionStep
        step="2. Audit and expand thin sections"
        why={`Top 10% content averages ${formatCompact(topDecile?.avg_words ?? 3012)} words versus ${formatCompact(bottomDecile?.avg_words ?? 1880)} in the bottom 10%`}
        how="Read the page end to end, identify weak sections, then add missing definitions, examples, comparisons, and current evidence instead of padding."
        impact="Improves depth where missing coverage is holding back an already-visible page"
        measure="Track word-count expansion, health score change, and impression lift by refresh batch."
      />
      <ActionStep
        step="3. Update all statistics, dates, and references"
        why={`The strongest measured freshness window is 31-90 days at ${freshnessPeak?.growth_decline_ratio ?? "7.2"}:1 growth to decline`}
        how="Replace stale figures, update named sources, add recent examples, fix broken links, and make the page visibly current for both users and search engines."
        impact="Aligns the page with the strongest measured freshness band in this dataset"
        measure="Track time-to-reindex, 30-day impression lift, and CTR lift after the update goes live."
      />
      <ActionStep
        step="4. Improve engagement elements"
        why={engagementGap ? `High scroll + high engagement outperforms the weakest bucket by ${engagementGap} health points` : "The strongest engagement bucket materially outperforms the weakest one in this dataset"}
        how="Add table-of-contents links where useful, break dense sections into scannable blocks, and use visuals or callouts where they actually help comprehension."
        impact="Supports the engagement patterns associated with stronger visibility"
        measure="Track scroll depth, engagement rate, and health score before and after layout changes."
      />
      <ActionStep
        step="5. Re-submit and monitor"
        why="Updated content still needs re-crawl and a monitored follow-up window"
        how="Request recrawl where appropriate, republish the update through your normal distribution channels, and check the page again at 30, 60, and 90 days."
        impact="Keeps the refresh program tied to measured follow-up windows instead of one-time edits"
        measure="Track reindex confirmations, ranking recovery, and 30/60/90-day health score trend."
      />

      <Footer page={31} />
    </Page>
  );
}

// ── AI Traffic Guide ─────────────────────────────────────────────────────────

export function PlaybookAITrafficPage({ d }: { d: any }) {
  const ai = d.discoveries?.aiProfile ?? {};
  const base = ai.base ?? {};
  const providers = ai.providers30d ?? [];
  const topIntent = [...(ai.byIntent ?? [])]
    .filter((row: any) => row.main_intent !== "unknown")
    .sort((a: any, b: any) => (b.ai_page_pct ?? 0) - (a.ai_page_pct ?? 0))[0];
  const topWordBucket = [...(ai.byWordCount ?? [])].sort((a: any, b: any) => (b.ai_page_pct ?? 0) - (a.ai_page_pct ?? 0))[0];

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Playbook: AI Traffic" />
      <Text style={styles.sectionTitle}>AI Traffic <Text style={styles.sectionTitleAccent}>Optimization Guide.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        AI traffic (from ChatGPT, Gemini, etc.) is real but small. Here's what we know about it — and what to do.
      </Text>

      <Text style={styles.narrative}>
        Pages that attract AI visits have a distinct profile: higher impressions, weaker Google positions,
        and broader visibility than pages with no AI referrals. Reality check: AI referrals are still
        only {base.portfolioAiSharePct ?? d.scope.aiSharePct}% of tracked sessions — growing, but small.
      </Text>

      <View style={styles.defBox}>
        <Text style={styles.defTitle}>What Our Data Shows About AI-Attracting Content</Text>
        <Text style={styles.defText}>
          High-AI content in our portfolio averages a weaker Google position but much higher impressions than
          no-AI content. Across the full available page-history export, the highest AI page rates appear in {topIntent?.main_intent ?? "informational"} intent
          ({topIntent?.ai_page_pct ?? 0}% of pages with AI referrals) and the {topWordBucket?.wc_bucket ?? "5K+"} word-count bucket
          ({topWordBucket?.ai_page_pct ?? 0}% of pages with AI referrals).
        </Text>
      </View>

      <View style={styles.defBox}>
        <Text style={styles.defTitle}>Practical Optimization Steps</Text>
        <Text style={styles.defText}>
          1. Monitor AI referrals separately from organic clicks and pageview totals.{"\n"}
          2. Prioritize clear factual statements, named evidence, and easy-to-scan structure.{"\n"}
          3. Review provider mix regularly: {providers.map((row: any) => `${row.label} ${formatCompact(row.sessions)}`).join(" | ")}.{"\n"}
          4. Start with pages that already get impressions and answer clear questions well.{"\n"}
          5. Treat monetization claims cautiously unless attribution is session-level and clean.
        </Text>
      </View>

      <Text style={styles.narrative}>
        <Text style={styles.narrativeBold}>Important:</Text> we can't yet reliably tie AI traffic to revenue at the
        individual visit level, so we focus on visibility trends instead of making money claims.
      </Text>

      <Footer page={32} />
    </Page>
  );
}

// ── Quick Wins Checklist ─────────────────────────────────────────────────────

export function PlaybookQuickWinsPage({ d }: { d: any }) {
  const striking = (d.positionDistribution ?? []).find((p: any) => p.position_tier === "striking");

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Playbook: Quick Wins" />
      <Text style={styles.sectionTitle}>The Quick Wins <Text style={styles.sectionTitleAccent}>Checklist.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Actions you can take this week, this month, and on an ongoing basis — ranked by urgency.
      </Text>

      <Finding tag="TODAY" title="Fix diagnosed issues on pages that already get traffic" text="A page with a specific problem you can fix is your fastest win — the upside is measurable and immediate." />
      <Finding tag="TODAY" title={`Review your best ${formatCompact(Math.min(striking?.content_count ?? 0, 20))} striking-distance pages`} text="Pages ranked 11-20 are close to page 1. Small improvements here produce outsized click gains." />
      <Finding tag="THIS WEEK" title="Refresh your oldest high-visibility pages" text="Old pages with existing traffic are the best refresh candidates — they've already proven demand." />
      <Finding tag="THIS WEEK" title="Improve readability on top-performing long pages" text="Better navigation, clearer sections, and easier scanning support the engagement patterns that stronger pages share." />
      <Finding tag="THIS MONTH" title="Consolidate overlapping pages that compete with each other" text="Pick the strongest page, merge the overlapping content, and stop your own URLs from competing against each other." />
      <Finding tag="THIS MONTH" title="Expand high-potential thin pages with real depth" text="Focus on thin pages that already get impressions — add missing subtopics and examples instead of bulk-expanding everything." />
      <Finding tag="ONGOING" title="Keep a rolling refresh calendar" text="The biggest freshness gains happen when you update content before it fully decays — not after." />
      <Finding tag="ONGOING" title="Support strong pages with distribution beyond search" text="Email, social, internal links, and referral placement turn one-channel pages into durable assets." />

      <Footer page={33} />
    </Page>
  );
}

// ── Cannibalization + Indexing ────────────────────────────────────────────────

export function RisksPage({ d }: { d: any }) {
  return (
    <Page size="A4" style={styles.page}>
      <Header section="Portfolio Risks" />
      <Text style={styles.sectionTitle}>Structural <Text style={styles.sectionTitleAccent}>Risks.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Portfolio-wide issues that hold back performance even when individual pages are good.
      </Text>

      <View style={styles.disruptionRow} wrap={false}>
        <DisruptionCard value={formatCompact(d.cannibalization?.total_cannibalized_queries ?? 0)} label="cannibalizing queries" />
        <DisruptionCard value={formatCompact(d.cannibalization?.total_cannibalized_impressions ?? 0)} label="impressions at risk" />
        <DisruptionCard value={formatCompact(d.cannibalization?.total_cannibalized_clicks ?? 0)} label="clicks at risk" />
      </View>

      <StackedBar
        segments={[
          { value: d.cannibalization?.critical_count ?? 0, color: colors.chartRed, label: "Critical" },
          { value: d.cannibalization?.high_count ?? 0, color: "#F97316", label: "High" },
          { value: d.cannibalization?.medium_count ?? 0, color: colors.chartYellow, label: "Medium" },
          { value: d.cannibalization?.low_count ?? 0, color: colors.chartQuaternary, label: "Low" },
        ]}
        height={28}
      />
      <ChartRead text="Red = critical overlap between your own pages. The more red, the more urgently you need to consolidate or clarify which page should rank for each topic." />

      <View style={{ marginTop: 12 }}>
        <Text style={styles.chartLabel}>Indexing Coverage</Text>
        <StackedBar
          segments={(d.indexing ?? []).map((r: any) => ({
            value: r.content_count ?? 0,
            color: r.status === "confirmed_indexed" ? colors.chartGreen : r.status === "got_unindexed" ? colors.chartYellow : colors.chartRed,
            label: (r.status ?? "").replace(/_/g, " "),
          }))}
          height={28}
        />
        <Legend
          items={(d.indexing ?? []).map((r: any) => ({
            color: r.status === "confirmed_indexed" ? colors.chartGreen : r.status === "got_unindexed" ? colors.chartYellow : colors.chartRed,
            label: `${(r.status ?? "").replace(/_/g, " ")} (${formatCompact(r.content_count ?? 0)})`,
          }))}
        />
        <ChartRead text="Green = pages Google can find. Red/yellow = pages that are invisible to search. Fixing indexing issues can unlock traffic before you create any new content." />
      </View>

      <Footer page={34} />
    </Page>
  );
}

// ── Methodology ──────────────────────────────────────────────────────────────

export function MethodologyPage({ d }: { d: any }) {
  return (
    <Page size="A4" style={styles.page}>
      <Header section="Methodology" />
      <Text style={styles.sectionTitle}>Methodology & <Text style={styles.sectionTitleAccent}>Limitations.</Text></Text>

      <Def title="Data Sources" text="Data comes from Google Search Console, Google Analytics 4, and revenue data — all stored in BigQuery with read-only access (we can look but never change the source data)." />
      <Def title="Study Scope" text={d.studyGuide?.windows ?? "90-day performance window, 30-day trend comparison, full available warehouse history, and full available query history where noted."} />
      <Def title="Evidence Standard" text={d.studyGuide?.evidenceStandard ?? "We trust what the raw numbers show over what the models predict. ML pages are a bonus appendix — the main findings rely on direct data comparisons."} />
      <Def title="Health Score" text={d.studyGuide?.healthFormula ?? "Composite FlyRank score built from impressions, position, CTR, and scroll depth."} />
      <Def title="ML Pipeline" text={`${formatCompact(d.scope?.activeSampleContent ?? 57652)} active pages (with real sessions and impressions). Models: K-Means clustering (5 groups), Random Forest, Logistic Regression, PCA, and Decision Tree — all tested on held-out data (80/20 split). Most published comparisons use large buckets, and smaller cells are explicitly called out as directional when they remain.`} />
      <Def title="Statistical Approach" text="Correlations use Pearson r. Most main buckets are sized to avoid fragile one-off reads, and small cross-cells are flagged in the narrative where they remain. Percentiles use APPROX_QUANTILES. CTR is weighted (total clicks ÷ total impressions). We do not report p-values or confidence intervals." />
      <Def title="Coverage Windows" text={`${d.windowLabels?.fullHistoryPage ?? "Full available warehouse history"} for structural sections, ${d.windowLabels?.recent90 ?? "Last 90 complete days"} for current-performance sections, ${d.windowLabels?.recent30 ?? "Last 30 complete days"} for momentum, and ${d.windowLabels?.fullHistoryQuery ?? "Full available query history"} for ranking-query relevance.`} />
      <Def title="Confounding Variables" text={`Content age confounds model comparisons. Revenue tracking covers ${d.revenue?.active_clients_90d ?? 0} of ${d.scope?.clientCount ?? 0} clients, so revenue claims are treated cautiously. AI referral detection may miss some sources, and the query-history window is shorter than the page-history window.`} />
      <Def title="Limitations" text="This is an observational study — we found patterns, not proof of cause and effect. Health score is our own metric, not a Google standard. Query data uses a shorter window than page data. Engagement time comes from aggregated fields, not individual session replay." />
      <Def title="Why FlyRank Handles This For You" text="Most teams can't connect Google Search Console, Analytics, content data, AI traffic, and revenue into one picture. FlyRank does this automatically — keeping measurements connected, surfacing refresh and optimization queues, tracking cannibalization, and turning patterns into repeatable weekly actions." />

      <Footer page={35} />
    </Page>
  );
}
