# FlyRank Differentiation Brief

Date: March 27, 2026

Scope: review of the latest generated PDF (`202603271350-flyrank-seo-research-march-2026.pdf`), the local paper-generation logic, the supporting JSON exports, and external benchmark / competitor research available as of March 27, 2026.

## 1. Paper + Methodology Audit

| Area | What is strong | Risk / caveat | Verdict |
| --- | --- | --- | --- |
| Window discipline | The paper explicitly separates last 90 complete days, last 30 complete days, full available warehouse history (2025-10-13 to 2026-03-25), and full available query history (2025-06-12 to 2026-03-24). | The paper still reads more cleanly than the underlying data actually is; some readers will miss that structural sections are not 90-day sections. | Strong, but the bottom differentiator section should restate windows clearly. |
| Evidence standard | The generator and paper both prioritize direct aggregate comparisons over ML, and the methodology page explicitly says ML is appendix material. | This only helps if the bottom section continues to lead with direct numbers rather than model claims. | Strong. Keep this. |
| Data provenance | The build uses local snapshot exports plus locally materialized full-history page and query exports; provenance and manifests are stored in `paper-data.json`. | This is only persuasive if you frame it as first-party operational evidence, not “industry truth.” | Strong and useful for differentiation. |
| CTR logic | The paper uses weighted CTR by position tier (`clicks_90d / impressions_90d`) rather than averaging bad row-level percentages. | Public CTR studies use different units and query-level contexts, so direct number-to-number comparisons need caution. | Strong enough for directional comparison, not apples-to-apples benchmarking. |
| Sample size | 342,257 content pieces across 57 brands, 477.2M impressions, 1.54M clicks, 1.67M sessions, 17.7K AI sessions, plus 13.5M query-history rows matched to 94,782 pages. | This is large for first-party portfolio operations, but not larger than every public vendor dataset. | Strong when framed as integrated first-party portfolio telemetry. |
| Health score usage | The paper correctly treats the FlyRank health score as context rather than sole proof. | Health is proprietary, so any major bottom-of-paper section should pair it with raw impressions, clicks, sessions, or position. | Use with raw metrics only. |
| AI analysis | The paper is proportionate enough to note AI is 1.06% of tracked sessions and still small. Provider mix and page-level patterns are useful. | This is still a small base. Do not oversell “AI traffic is the main story.” | Keep it, but keep it humble. |
| Exclusions | The paper excludes the backlinks page because provenance was not verified. | None. This actually improves credibility. | Strong credibility signal. |
| ML appendix | The methodology is explicit about held-out testing, minimum bucket sizes, and exploratory status. | The appendix should not be used as the main differentiation claim. | Fine as support, weak as headline. |

## 2. Strongest FlyRank Wins Versus Public Benchmarks

This is the best table to use when deciding what belongs in the new “why FlyRank stands out” section.

| Theme | FlyRank internal evidence | Public benchmark / standard | Side-by-side read | Recommendation |
| --- | --- | --- | --- | --- |
| Refresh timing is quantified, not just advised | Pages updated 31-90 days ago show the strongest stable growth-to-decline ratio at 5.43:1. On pages aged 365+, refreshed pages average 37.0 health and 4,246.9 impressions vs 23.0 health and 81.5 impressions for stale peers: 1.61x health and 52.1x impressions. | Google says its freshness systems surface fresher content for queries where users expect it, and Google warns against making pages seem fresh without adding value. Google also emphasizes substantial, original, high-value content over superficial updates. Sources: Google ranking systems guide; Google helpful content docs. | This is one of FlyRank’s best differentiators because the market mostly offers advice, while FlyRank has a measured refresh curve and a quantified old-page rebound inside its own portfolio. | Make this a headline proof point. |
| FlyRank is aligned with Google on word count, not old SEO folklore | Growing and declining pages are nearly identical in average length: 1,487 vs 1,481 words. The top decile averages 1,464 words, not some extreme long-form number. | Google explicitly says content length alone does not matter for ranking and there is no “magical word count target.” Source: Google SEO Starter Guide. | This is a strong credibility win: FlyRank’s first-party data agrees with Google’s own public guidance. | Use as an “anti-myth” credibility point, not the lead differentiator. |
| FlyRank is aligned with Google on AI-generated content | The paper’s local evidence does not show a blanket AI-content penalty and already frames editing quality and publishing process as more important than whether AI helped draft the page. | Google says generative AI can be useful, but mass-producing pages without adding value may violate spam policies. Source: Google Search’s guidance on generative AI content. | This is strong positioning for an AI SEO company because it lets FlyRank argue from both Google policy and internal portfolio evidence. | Use as a trust-building point. |
| FlyRank can name the page-one and striking-distance opportunity, not just the theory | 39,285 striking-distance pages already sit in positions 11-20, generating 61.2M impressions and 198,632 clicks. Top 3 weighted CTR is 0.42% vs 0.05% for deep pages, an 8.4x differential. | Backlinko’s 2025 CTR study found position 1 averages 27.6% CTR, position 1 is 10x more likely to get a click than position 10, only 0.63% of users click page 2 results, and moving from #2 to #1 increases clicks by 74.5%. Source: Backlinko. seoClarity also reports CTR deterioration below top positions as AI Overviews crowd the SERP. | FlyRank’s absolute CTR numbers are not directly comparable to public query-level studies, but the strategic lesson is the same: page-one and near-page-one gains are where fast wins live. FlyRank’s edge is that it can identify the exact pages. | Strong differentiator if framed as “measured opportunity inventory.” |
| FlyRank quantifies optimization backlog in revenue-adjacent search terms | 39,192 pages are flagged “Fix CTR,” representing 204.3M 30-day impressions and 534,450 clicks. That is about 42.8% of the portfolio’s 90-day impression base. There are also 41,465 content refresh actions and 7,337 quick wins in the action system. | Competitors market AI/SEO visibility, but public materials rarely show a first-party page backlog quantified this clearly at portfolio level. Public SEO advice often stops at “optimize titles” or “refresh old content.” | This is one of the strongest FlyRank-specific claims because it converts theory into an addressable workload and a measurable upside pool. | Make this a major bottom-section pillar. |
| FlyRank surfaces cannibalization as a measurable growth leak | 723,433 cannibalizing queries, 76.7M impressions at risk, and 292,814 clicks at risk across 47 clients. The at-risk impression pool equals about 16.1% of the portfolio’s 90-day impressions. | Many SEO suites claim cannibalization detection, but public pages usually describe the feature qualitatively rather than publishing portfolio-level opportunity sizing. | This is strong because it sounds operational and financially relevant, not abstract. | Strong secondary differentiator. |
| FlyRank measures query drift, not just rankings | In matched query history, 68.35% of impression share comes from off-target queries, and 53.81% of pages do not have an exact-match top query. This is based on 13.5M query rows matched to 94,782 pages. | Public SEO platforms do rank tracking and topic research, but public benchmark data rarely quantifies “off-target impression share” this directly. | This is an underused FlyRank advantage. It is especially strong for the “AI SEO is not just ranking, it is relevance control” argument. | Strong differentiator; likely underexploited in the current PDF. |
| FlyRank sees AI traffic earlier than broad public baselines, but it is still small | AI sessions are 1.06% of tracked sessions. In the active sample, 2.49% of pages have AI referrals; in full history, 1.57% of pages do. OpenAI sends 1.87x the 30-day referrals of Gemini. The 5K+ word-count bucket has a 24.55% AI-page rate, 15.6x the full-history portfolio AI-page baseline. | seoClarity says AI search traffic is currently less than 0.5% of total organic traffic across hundreds of domains, though some B2B sites are already around 4.5% and some healthcare sites around 1%. Similarweb estimated 1.13B AI referral visits in June 2025 versus 191B from Google search. Adobe found AI traffic remains modest versus other channels, but AI visitors showed 8% higher engagement, 12% more pages per visit, and 23% lower bounce, while being 9% less likely to convert in retail. Sources: seoClarity, Similarweb, Adobe. | FlyRank’s AI share is directionally ahead of broad-market averages, but not radically so, and the unit of comparison is not perfect. The stronger point is that FlyRank measures provider-level AI referrals at page level inside the same operating system as SEO. | Use, but with careful caveats. |
| The search environment is getting harder; FlyRank’s AI + SEO measurement stack is timely | Pew found that when an AI summary appears in Google results, users click a traditional search result in 8% of visits vs 15% without an AI summary, and sessions end on 26% of AI-summary pages vs 16% without them. | This is the public context that explains why visibility, citations, and referral tracking matter more now. Source: Pew Research Center. | FlyRank should use this as market context, not as a self-congratulatory point. It raises the stakes for why its integrated measurement matters. | Use as context for the section, not as a FlyRank brag. |

## 3. Competitor Side-by-Side: What the Market Already Claims

This is the table that matters most for messaging discipline. It shows where FlyRank has room to stand out and where overclaiming will get weak fast.

| Company | What they publicly claim | What overlaps with FlyRank | Where FlyRank can still stand out | Messaging risk |
| --- | --- | --- | --- | --- |
| Semrush | AI Visibility Toolkit benchmarks brand visibility in AI answers, prompt research, daily tracking, competitor analysis, and AI crawler audits. Semrush Traffic & Market Toolkit now includes AI traffic and Google AI Mode alongside other channels. Sources: Semrush AI Visibility Toolkit docs; Semrush Nov. 7, 2025 product update. | Strong overlap on AI visibility, AI traffic measurement, competitor tracking, and technical AI-audit coverage. | FlyRank should not say “nobody tracks AI referrals.” A safer angle is “FlyRank connects first-party portfolio evidence to action queues and content ops, not just dashboards.” | High risk if FlyRank claims uniqueness on AI tracking alone. |
| Conductor | Claims to be the only end-to-end enterprise AEO platform, unifying workflow from insight to action to impact. Public docs also show GA4 integration and support for conversion and revenue metrics. Sources: Conductor home page; Conductor GA4 docs. | Very strong overlap on unified workflow, analytics integration, and AI + SEO positioning. | FlyRank’s best angle is not generic “end-to-end.” It is measured portfolio opportunity sizing: refresh candidates, CTR-fix backlog, query drift, cannibalization, and page-level operating evidence. | Very high risk if FlyRank uses broad “only platform” language. |
| BrightEdge | AI Catalyst says brands can track, understand, and influence presence across generative AI engines, with metrics, insights, and recommendations in one place for traditional and AI search. Source: BrightEdge AI Catalyst. | Strong overlap on unified AI + SEO visibility and recommendations. | FlyRank should emphasize first-party operating telemetry and named workflow outputs, not broad “command center” language. | High risk if FlyRank leans on vague platform adjectives. |
| seoClarity | Publicly documents AI search traffic by source, AI-driven traffic share, conversions, engagement, and business outcomes; also publishes benchmark research across 300+ analytics accounts. Sources: Clarity ArcAI pages; AI Search Trend Report. | Strong overlap on AI traffic attribution and business-outcome framing. | FlyRank can differentiate by using its own live portfolio evidence rather than external benchmark studies, and by quantifying addressable work queues. | High risk if FlyRank claims it alone ties AI traffic to outcomes. |
| Scrunch | Tracks share of answer, citations, agent traffic, LLM referral traffic, and cites 500+ companies using the platform. Source: Scrunch Monitoring & Insights page. | Strong overlap on AI-first monitoring, citations, bot traffic, and referral traffic. | FlyRank should position itself as stronger where AI search data is fused with classical SEO operations, query drift, refresh workflows, and cannibalization economics. | High risk if FlyRank claims it alone covers LLM traffic or citations. |

## 4. The Best Bottom-Section Narrative

If the goal is to make FlyRank clearly stand out without overclaiming, the strongest narrative is this:

| Candidate angle | Why it works | Why it is stronger than generic “AI SEO platform” language |
| --- | --- | --- |
| FlyRank turns SEO and AI visibility into a measurable operating system | It is supported by direct first-party evidence: 41,465 refresh actions, 39,192 CTR-fix pages, 723,433 cannibalizing queries, and 13.5M query-history rows. | Competitors also claim AI visibility, dashboards, and workflows. Fewer public claims are as specific about the exact workload and upside already sitting inside the portfolio. |
| FlyRank does not rely on folklore; it measures what actually moves growth in your portfolio | Supported by the refresh curve, word-count myth reversal, AI-content guidance alignment, and page-one quick-win evidence. | This lets FlyRank borrow authority from Google’s standards while showing that its own data reaches the same practical conclusions. |
| FlyRank connects classical SEO, AI referral traffic, query drift, and content actions in one evidence layer | Supported by the methodology, data provenance, and cross-source integration in the paper generator. | This is a better claim than “we have AI SEO features,” because the market now says that too. |

## 5. Recommended Claims To Use

| Safe claim | Why it is defensible |
| --- | --- |
| FlyRank combines Search Console, analytics, AI referral tracking, content metadata, query history, and action queues into one operating view. | This is directly supported by the methodology, data model, and paper inputs. |
| FlyRank can tell you exactly where the biggest recoverable upside sits right now, not just that “SEO matters.” | Supported by the refresh backlog, CTR-fix backlog, quick wins, and cannibalization sizing. |
| FlyRank’s recommendations are grounded in first-party portfolio evidence, not generic benchmark assumptions alone. | Supported by the local data pipeline and the paper’s evidence standard. |
| FlyRank is especially strong at refresh prioritization, query-drift detection, and page-level opportunity sizing. | These are among the strongest measured internal deltas in the dataset. |
| FlyRank measures AI visibility as part of the broader search system, not as a disconnected vanity metric. | Supported by provider-level referrals, AI-vs-traditional page profiles, and integrated reporting. |

## 6. Claims To Avoid

| Avoid this | Why |
| --- | --- |
| “No other SEO company does this.” | Public materials from Semrush, Conductor, BrightEdge, seoClarity, and Scrunch show substantial overlap. |
| “FlyRank is the only platform tying AI traffic to revenue.” | Conductor and seoClarity publicly discuss tying analytics and business outcomes to AI / search performance. |
| “AI traffic is already replacing Google.” | Your own data says AI is 1.06% of tracked sessions. Public benchmark sources also say AI traffic is still small. |
| “Long-form content is the secret.” | Your own data and Google’s docs both argue against universal word-count myths. |
| “Freshness alone wins.” | Google’s docs and your own data both point to quality plus meaningful updates, not shallow date changes. |

## 7. Recommended Bottom-Section Structure

| Block | What it should say | Evidence to use |
| --- | --- | --- |
| Block 1: Why this matters now | Search is harder to win because AI summaries and AI discovery layers reduce clicks and split attention. | Pew, seoClarity, Similarweb. |
| Block 2: Why FlyRank is different | FlyRank does not just monitor visibility; it quantifies where recoverable upside already sits in the portfolio. | 41,465 refresh actions, 39,192 CTR-fix pages, 723,433 cannibalizing queries, 13.5M query rows. |
| Block 3: What FlyRank sees that others often miss | Query drift, page-level AI referral behavior, refresh timing, and cannibalization economics. | Off-target query share, AI provider mix, refresh curve, cannibalization totals. |
| Block 4: Why this is credible | The paper uses explicit windows, raw metrics first, weighted CTR logic, direct comparisons over ML, and excludes weak-provenance data. | Methodology page + code audit. |

## 8. Sources

### Internal FlyRank sources reviewed

- `scripts/paper-creator/output/202603271350-flyrank-seo-research-march-2026.pdf`
- `scripts/paper-creator/paper/research-pdf.tsx`
- `scripts/paper-creator/paper/pdf-sections/part2-discoveries.tsx`
- `scripts/paper-creator/paper/pdf-sections/part3-surprises.tsx`
- `scripts/paper-creator/paper/pdf-sections/part5-playbook.tsx`
- `scripts/paper-creator/build-paper-data.ts`
- `scripts/paper-creator/derive-full-history-data.ts`
- `scripts/paper-creator/data/paper-data.json`
- `scripts/paper-creator/CODEX_FACTUALITY_DEEP_DIVE.md`

### External sources

- Google Search Central: Creating helpful, reliable, people-first content  
  https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Search Central: SEO Starter Guide  
  https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Central: A guide to Google Search ranking systems  
  https://developers.google.com/search/docs/appearance/ranking-systems-guide
- Google Search Central: Guidance on generative AI content on your website  
  https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- Google Search Central Blog: Top ways to ensure your content performs well in Google’s AI experiences on Search  
  https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search
- Backlinko: We analyzed 4 million Google search results. Here’s what we learned about organic CTR  
  https://backlinko.com/google-ctr-stats
- Pew Research Center: Google users are less likely to click on links when an AI summary appears in the results  
  https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/
- Adobe Blog: Traffic to U.S. retail websites from generative AI sources jumps 1,200 percent  
  https://blog.adobe.com/en/publish/2025/03/17/adobe-analytics-traffic-to-us-retail-websites-from-generative-ai-sources-jumps-1200-percent
- Similarweb: AI referral traffic winners by industry  
  https://www.similarweb.com/blog/insights/ai-news/ai-referral-traffic-winners/
- seoClarity: AI Search Trend Report  
  https://www.seoclarity.net/research/ai-search-trend-report
- seoClarity: Track AI search traffic & performance  
  https://www.seoclarity.net/ai-seo/ai-search-engine-site-analytics
- Semrush: AI Visibility Toolkit  
  https://www.semrush.com/kb/1493-ai-visibility-toolkit
- Semrush: Traffic & Market Toolkit expands with AI Traffic and Google AI Mode  
  https://www.semrush.com/news/430893-traffic-market-toolkit-expands-with-ai-traffic-and-google-ai-mode/
- BrightEdge: AI Catalyst  
  https://www.brightedge.com/ai-catalyst
- Conductor: home page / AEO positioning  
  https://www.conductor.com/
- Conductor: Integrate Google Analytics with Conductor Intelligence  
  https://support.conductor.com/hc/en-us/articles/13190194929555-Integrate-Google-Analytics-with-Conductor-GA4
- Scrunch: Monitoring & Insights for AI Search  
  https://scrunch.com/platform/monitoring-insights/
