# FlyRank Bottom Section Hormozi Implementation

Date: March 27, 2026

Purpose: short final section for the paper. This version keeps the language clean and factual, avoids repeating the study, and shows how FlyRank turns findings into shipped work.

Rules:

- keep the tone professional and plain
- do not repeat the paper's big scope stats or myth summaries
- use side-by-side comparison as the main format
- do not use guarantees, hype, or uniqueness claims

---

## Page 1

### Title

From finding the issue to fixing the page.

### Body

This paper showed where content wins, stalls, or leaks traffic.

The harder part is usually not seeing the pattern. It is getting the work done.

Most teams still split that work across search data, analytics, spreadsheets, writers, CMS uploads, and indexing requests.

FlyRank is built to shorten that path.

| Common setup | FlyRank | Verified basis |
| --- | --- | --- |
| Teams know old pages should be refreshed, then build the list by hand | FlyRank already surfaces `41,465` refresh actions inside the same workflow | Internal paper data and action queues |
| Teams can see impressions, but still have to hunt for pages people see and do not click | FlyRank labels `39,192` pages as `Fix CTR`, covering `204.3M` 30-day impressions | `view_optimization_flags` and paper data |
| Teams suspect two pages are fighting for the same query, but the loss is hard to size | FlyRank quantifies `723,433` cannibalizing queries and `76.7M` impressions at risk, with action views by severity | `v_cannibalization_client_summary`, `v_cannibalization_action_list`, and paper data |
| Teams publish in one system and request indexing in another | FlyRank has connected publish and indexing workflows across WordPress, Shopify, Webflow, and Ghost | Verified in local platform code and job flows |

### Close

The difference is not one more dashboard.

The difference is less delay between the finding and the fix, and less manual work per page.

---

## Page 2

### Title

What most teams still stitch together by hand.

### Body

Most SEO products are strong at one step.

Few are built to keep the same page moving from measurement to action in one place.

| Step | Common approach | FlyRank |
| --- | --- | --- |
| Measure performance | Search Console, GA4, rankings, and AI traffic often live in separate tools | FlyRank keeps search, sessions, AI referrals, content history, and page flags in one working view |
| Decide what to do first | Teams sort exports, compare tabs, and build lists by hand | FlyRank uses named action queues such as `Fix CTR`, `Fix Content`, and cannibalization actions |
| Ship the update | Rewrite, upload, publish, then request indexing as separate steps | FlyRank can route work through connected content, publishing, and indexing flows |
| Track new channels | AI traffic is often checked in a separate dashboard, if it is checked at all | FlyRank tracks provider-level AI referrals in the same content view |
| Keep the loop running | Teams repeat audits from scratch | FlyRank keeps the same measurement and action loop live week after week |

### Close

That is the practical FlyRank claim this paper can support.

FlyRank does not stop at diagnosis.

It is built to connect the evidence, the work list, and the execution path.

---

## Source Basis

### Internal

- `scripts/paper-creator/data/paper-data.json`
- `scripts/paper-creator/README.md`
- `lib/wordpress.ts`
- `lib/shopify.ts`
- `lib/webflow.ts`
- `inngest/wordpress/publishArticleToWordpress.ts`
- `inngest/shopify/publishArticleToShopify.ts`
- `inngest/webflow/publishArticleToWebflow.ts`
- `inngest/ghost/publishArticleToGhost.ts`

### Public context

- Google Search Console
- Google Analytics 4
- Google Search Central documentation
- Semrush AI Visibility Toolkit
- seoClarity AI Search Analytics
- FlyRank public site messaging at `https://www.flyrank.com/`
