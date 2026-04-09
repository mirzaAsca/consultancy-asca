/**
 * Part VI: Why FlyRank Handles This For You — 2 pages
 */

import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { styles, colors } from "../pdf-styles";
import { Header, Footer, Finding, DisruptionCard } from "./part1-study";
import { formatCompact } from "../pdf-charts";

function BulletItem({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 5, paddingLeft: 4 }} wrap={false}>
      <Text style={{ fontSize: 9, color: colors.purple, marginRight: 6, fontWeight: "bold" }}>•</Text>
      <Text style={{ fontSize: 9, color: colors.textSecondary, lineHeight: 1.5, flex: 1 }}>{text}</Text>
    </View>
  );
}

function ServiceBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={{ marginBottom: 14 }} wrap={false}>
      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.textPrimary, marginBottom: 6 }}>{title}</Text>
      {items.map((item, i) => (
        <BulletItem key={i} text={item} />
      ))}
    </View>
  );
}

// ── Page 1: Hook + What We Do ───────────────────────────────────────────────

export function FlyRankPage1({ d }: { d: any }) {
  return (
    <Page size="A4" style={styles.page}>
      <Header section="Why FlyRank" />
      <Text style={styles.sectionTitle}>We Do One Thing: <Text style={styles.sectionTitleAccent}>AI SEO.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        Everything in this paper runs automatically for every FlyRank client. Here is (most probably not) full list.
      </Text>

      <ServiceBlock
        title="We Create Your Content"
        items={[
          "Full SEO articles, written and formatted. Not outlines. Not drafts. Done.",
          "In any language you need. Localized so it reads natural in every market.",
          "As many as you need. Every day if that's the plan.",
          "Images, meta titles, and meta descriptions — all generated automatically.",
          "Optimized for Google and for AI answer engines (ChatGPT, Gemini, Perplexity).",
        ]}
      />

      <ServiceBlock
        title="We Publish It"
        items={[
          "Straight to your site. Shopify, WordPress, Webflow, Ghost — whatever you use.",
          "No uploads. No formatting. No copy-paste. It goes live when it's ready.",
          "Every new page gets submitted to Google for indexing the same day.",
          "We track whether Google actually picked it up.",
        ]}
      />

      <ServiceBlock
        title="We Watch Every Page, Every Day"
        items={[
          "Search Console, Analytics, and AI referrals — all in one place.",
          "Every page gets a health score: impressions, position, click-through rate, and scroll depth.",
          "We track which pages grow, which flatten, and which fall.",
          "AI traffic from ChatGPT, Gemini, Perplexity, Copilot, Claude, and Meta — by provider, by day.",
          "We track when your content peaks, when it starts losing ground, and what queries it actually ranks for.",
        ]}
      />

      <Footer />
    </Page>
  );
}

// ── Page 2: Fix + Opportunity + Guarantee ────────────────────────────────────

export function FlyRankPage2({ d }: { d: any }) {
  const cannQueries = d.cannibalization?.total_cannibalized_queries ?? 0;
  const cannImpressions = d.cannibalization?.total_cannibalized_impressions ?? 0;
  const striking = (d.positionDistribution ?? []).find((p: any) => p.position_tier === "striking");

  return (
    <Page size="A4" style={styles.page}>
      <Header section="Why FlyRank" />
      <Text style={styles.sectionTitle}>We Fix What's <Text style={styles.sectionTitleAccent}>Not Working.</Text></Text>
      <Text style={styles.sectionSubtitle}>
        We don't hand you a report and say good luck. We do the work.
      </Text>

      <ServiceBlock
        title="We Tell You What To Fix — And In What Order"
        items={[
          "A live optimization queue that updates itself. Not a report you read once.",
          "Pages that need a refresh, ranked by how much they can recover.",
          "Pages that get seen but don't get clicked — with the impressions sitting on the table.",
          "Pages almost on page one, showing what a small push could unlock.",
          "Quick wins you can act on this week.",
          "Pages fighting each other for the same keyword — sized by impressions and clicks lost.",
        ]}
      />

      <ServiceBlock
        title="We Fix It For You"
        items={[
          "Our AI agents rewrite weak titles and descriptions.",
          "They improve readability and formatting.",
          "They refresh stale sections in old content.",
          "They push changes live. Not recommendations. Actual fixes, shipped.",
        ]}
      />

      <ServiceBlock
        title="We Keep The Loop Running"
        items={[
          "New content gets created and published on schedule.",
          "Old content gets flagged when it starts to slip.",
          "Fixes get queued, made, and tracked.",
          "This runs every week. Not a one-time audit.",
        ]}
      />

      <View style={{
        backgroundColor: colors.purple,
        borderRadius: 8,
        padding: 20,
        alignItems: "center",
        marginTop: 8,
      }} wrap={false}>
        <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.textOnDark, marginBottom: 4 }}>
          The Guarantee
        </Text>
        <Text style={{ fontSize: 11, color: colors.textOnDark, opacity: 0.9, textAlign: "center", lineHeight: 1.5 }}>
          3x your reach in 3 months. Or your money back.
        </Text>
      </View>

      <Footer />
    </Page>
  );
}
