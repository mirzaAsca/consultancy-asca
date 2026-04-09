# Calculator & Service Architecture Guide

**Author**: Claude Opus 4.6
**Date**: 2026-03-23
**Sources used**: 100M Offers, 100M Leads, 100M Money Models (Alex Hormozi), concept_registry.json, book_chunks.json, Research Docs 1-3, existing calculator codebase, two independent AI analyses

---

## Part 1: The core problem

The calculator currently evaluates every company through one lens: broad labor-productivity ROI against two fixed plans (Plan A at $22K/mo, Plan B at $290K/mo). This fails for two reasons.

First, lean high-output companies (high revenue, low headcount) get told "not recommended" because the productivity math doesn't produce enough value from a small number of workers. These are actually ideal clients — less overhead to manage, clear bottleneck to target, high revenue per system built. The calculator rejects them.

Second, large enterprises with pilot sprawl and governance pressure don't need a productivity ROI number. They need a transformation office. The calculator gives them the same labor math as everyone else, which undersells what they actually need and what you actually deliver.

The calculator is answering "Does broad labor productivity justify this plan?" when it should answer "What is this company's real constraint, and which offer should they enter through?"

### Strategic foundation

This is a multi-offer business, not a one-offer calculator problem. The 3-route model (Transformation Office / Constraint Sprint / Not Now) is the strategic base. The incremental calculator changes described in this guide are only the implementation vehicle. Every decision in this document serves the routing architecture, not just the math.

### Governing principles

Before any implementation, these principles govern all changes:

1. **Do not replace the calculator.** It is a working, trust-building lead magnet. Improve routing and interpretation inside it. Do not rebuild it into a qualification form or routing quiz.
2. **Do not sacrifice transparency.** The research-backed methodology, scenario comparison, source citations, and visible logic are what make the calculator credible. Keep all of them.
3. **Do not overcomplicate the UX.** The current input set (revenue, employees, industry, bottleneck, hires, AI spend) is fast and effective. Add at most one optional field. Never turn it into a 15-field intake.
4. **The calculator is top-of-funnel, not the whole sales system.** The calculator builds trust and routes interest. The diagnostic qualifies and converts. The service delivery fulfills. Each piece has its job — do not overload the calculator with the diagnostic's job.
5. **Same inputs, different interpretation.** The core engine of this hybrid is: same calculator inputs → silent route detection → different result presentation, different value story, different KPIs, different CTA, different service path per route. Route-specific interpretation is the mechanism, not route-specific math alone.

---

## Part 2: The Hormozi foundation

### Value Equation (100M Offers)

Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)

The calculator currently breaks this equation for sweet spot companies on two axes:

**Perceived Likelihood destroyed.** Showing 0.5x or 0.97x ROI in the headline literally communicates "you will lose money." No text below that number recovers the damage. People pay for certainty. A bad number kills certainty.

**Dream Outcome misframed.** A 30-person company doing $30M does not dream about "1.5 FTEs of productivity." They dream about scaling to $50M without hiring 20 more people, removing the bottleneck that keeps the founder working 70-hour weeks, and having their next "hires" be AI systems with zero ramp time.

### Market First (100M Offers)

Hormozi's priority order: Starving Crowd (market) > Offer Strength > Persuasion Skills.

The calculator skips the market evaluation entirely. It goes straight to offer math. The fix is to evaluate the market first (which segment is this company?), then show the right offer, then show the right value math.

### Money Model (100M Money Models)

A money model is a deliberate sequence of offers: Attraction → Core → Downsell → Continuity. Perfect one offer at a time.

The calculator currently shows Plan A and Plan B as equal parallel choices. This forces every prospect into a binary comparison, when the business actually serves different segments through different offer sequences.

### Grand Slam Offer (100M Offers)

An offer so good people feel stupid saying no. The components: attractive promotion + unmatchable value proposition + premium price + guarantee + payment terms.

For sweet spot companies, the Grand Slam framing is: "One AI system targeting your [engineering] bottleneck. First system in production in 90 days. If it doesn't measurably improve [metric], the scan determines what will. Monthly, no long-term commitment required."

For enterprise companies, the Grand Slam framing is: "A board-governed AI portfolio that reliably ships production-grade AI into core workflows. Decision pack in 30 days. Governance that survives audit."

---

## Part 3: What the research documents define

### Doc 1 — Enterprise AI Transformation Demand, ROI, and Deal Design

Defines the buyer landscape:
- Enterprises are stuck between "access" and "activation" — tools are deployed, value is not captured
- CEO-level ROI pressure: most CEOs report no tangible AI returns (PwC 2026)
- Buyer KPI language: margin expansion, cost-to-serve, cycle time, conversion, retention, risk reduction
- ROI time horizons: immediate (weeks to 90 days) = time reclaimed; medium (3-9 months) = cycle-time compression; structural (9-24 months) = margin expansion
- Pricing architecture: $35K+/mo base + outcome-linked upside; gainshare only for highly measurable workflows
- Engagement structure: 12-24 months phased, with early wins in first 30-90 days

### Doc 2 — Flagship Service Page Research

Defines the premium buyer and offer:
- Best buyer: complex enterprise with AI activity but no executive control tower
- Dream outcome: "Board-governed, value-tracked AI portfolio that reliably ships production-grade AI into core workflows — turning AI spend into measurable operating margin and risk reduction within 12 months"
- Three buyer segments: A (regulated enterprises, 5K-100K+ employees), B (asset-heavy operators, 2K-50K), C (digital platform companies, 500-10K)
- Money model: Free scorecard → Paid diagnostic (AI Portfolio Reality Scan) → Core (retained Transformation Office) → Downsell (governance sprint) → Continuity (quarterly retainer)
- Value Equation mapped: artifacts increase perceived likelihood; 30/90/6/12 month milestones reduce time delay; "we run the cadence" reduces effort

### Doc 3 — Service System and Delivery Operating Model

Defines the implementation-led service model:
- Core service: Business-Outcome Implementation System — not "AI consulting" but measurable operational improvement
- Staged structure: Operational Diagnostic → Quick-Win Sprint → Implementation Pods → Scale & Governance
- Best-fit clients: operational volume, digital systems, process owners, want outcomes not experiments
- Automation-before-AI decision gate: prefer simplest approach that reliably produces the outcome
- Quick-win criteria: visible to users, measurable in 2-4 weeks, low dependency, low exception rate, low adoption friction
- Prioritization: WSJF-derived (Cost of Delay / Job Size), fix measurement first, then high-frequency manual work, then bottlenecks, then data, then AI

---

## Part 4: The three-route architecture

Stop evaluating every company through one lens. Route them into three paths based on their profile.

### Route 1: Transformation Office Fit

**Who they are:**
- typically 500+ employees (often 2,000-100,000+ in the clearest-fit cases)
- Already has AI pilots or production in one function
- Lacks executive control tower for portfolio governance
- Board/CEO ROI pressure — "What are we getting for this spend?"
- Governance or compliance urgency (EU AI Act, sector regulators, board oversight)
- Multiple competing AI initiatives with no prioritization system

**What they actually need (from Doc 2):**
- Portfolio governance: intake, prioritization, value tracking, risk classification
- Executive cadence: steering committee, decision logs, stage gates
- Governance system: policies, controls, evidence packs aligned to NIST/ISO/EU AI Act
- Cross-functional program leadership across business/IT/risk/vendors
- Implementation oversight: production-readiness scoring, sprint oversight
- Adoption system: workflow integration, training, usage telemetry

**Dream outcome:**
"A board-governed AI portfolio that reliably ships production-grade AI into core workflows — turning AI spend into measurable operating margin and risk reduction within 12 months."

**Value language (from Doc 1):**
- Margin expansion (EBIT, SG&A as % revenue)
- Operating leverage (output per FTE, revenue per employee)
- Cost-to-serve reduction (cost per ticket, cost per invoice)
- Cycle-time compression (quote-to-cash, onboarding time)
- Governance maturity (% use cases with risk review, monitoring coverage)

**Money model:**
- Attraction: Free Pilot-to-Production Scorecard
- Paid entry: AI Portfolio Reality Scan ($15K diagnostic)
- Core: Enterprise AI Transformation Office (retained, $35K+/mo)
- Continuity: Governance + portfolio + adoption retainer

**What the calculator should show:**
- Standard productivity ROI (already works at this scale — the math lands)
- KPI language from Doc 1 overlaid on results
- Plan B as the natural recommendation
- Plan A as a lighter starting point
- CTA: Apply for the AI Portfolio Reality Scan

### Route 2: Constraint Sprint Fit

**Who they are (the sweet spot + the viable middle):**
- 10-150 employees is the clearest default range, but some sub-enterprise teams above that can still fit
- Either:
  - Revenue per employee ≥ $300K (lean high-output sweet spot)
  - OR normal-RPE but with one painful, measurable bottleneck and viable economics
- Revenue usually ≥ $5M, but the key factor is whether the bottleneck is worth removing
- Clear operational bottleneck in one function (engineering, sales, CS, marketing, ops)
- Named workflow owner or founder directly involved
- Willing to standardize and measure
- Often already stretched thin — each person wears multiple hats
- Includes operational buyers who are not "elite sweet spots" on revenue-per-employee, but are still ideal for the Doc 3 model

**What they actually need (from Doc 3):**
- Operational Diagnostic: baseline the bottleneck, quantify the constraint
- Quick-Win Sprint: one visible improvement in production within 30 days
- Implementation Pods: modular 2-6 week delivery cycles expanding from the first win
- Automation-before-AI gate: simplest reliable solution first

**Dream outcome:**
"Remove the [bottleneck] constraint that limits your growth. Scale from $X to $Y without proportionally growing headcount. Your next hires are AI systems, not people."

**Value language (NOT just productivity FTEs):**
- Hire deferral: each deferred hire saves fullyLoadedCost/yr + 6 months recruiting + management overhead
- Cycle-time compression: faster shipping, faster deal cycles, faster resolution
- Cost-to-serve reduction: in the bottlenecked function specifically
- Founder/operator time recovered: the constraint owner gets hours back
- Throughput increase in one workflow: measurable before/after
- Revenue leverage (conditionally): only when the bottleneck is in sales or marketing, where McKinsey documents 3-15% revenue uplift from AI. Do NOT apply this universally across engineering or ops bottlenecks — it is not defensible there.

**Money model:**
- Attraction: Free Workflow Bottleneck Scorecard (or reuse AI Portfolio Reality Scan with bottleneck focus)
- Paid entry: Operational Diagnostic (scoped to 1-2 workflows)
- Core: Quick-Win Sprint + Implementation Pods
- Continuity: Scale & Governance retainer

**What the calculator should show:**
- Lead with the focused-system offer, not generic Plan A
- Show the bottleneck-specific playbook plays AS the deliverables
- Show hire deferral value prominently
- Show payback period as a headline metric (not buried in text)
- If bottleneck is sales or marketing: add revenue leverage (2-3% conservative)
- If bottleneck is engineering, ops, or CS: do NOT add revenue leverage — instead emphasize cycle time, throughput, and hire deferral
- Do NOT show a giant weak ROI headline — show route fit first, economics second
- CTA: Apply for the Operational Diagnostic / AI Portfolio Reality Scan

### Route 3: Not Now

**Who they are:**
- No named sponsor or workflow owner
- No clear bottleneck they can articulate
- No measurable outcome they care about
- Looking for "AI ideas" without commitment
- Cannot allocate cross-functional time
- Budget not approved or unclear

**What the calculator should show:**
- Honest, respectful language: "You don't need a retained program yet"
- Guidance: "Start by clarifying one workflow, one owner, and one measurable outcome"
- Free resources: point to the scorecard or educational content
- "As your organization grows, the math changes significantly"
- No hard sell, no guilt — just clarity

**Important nuance:**
- `Not Now` does **not** always mean "bad company"
- It often means wrong timing, weak clarity, weak sponsorship, or weak readiness
- Some companies in this bucket may later become excellent Constraint Sprint or Transformation Office buyers

### Route overlays and subtypes

Keep the **3 primary routes**, but add overlays so more client types feel accurately addressed without creating 6-8 separate routes.

#### Transformation Office overlays

- **Regulated enterprise**
  - language: controls, auditability, decision rights, evidence packs, human oversight
- **Asset-heavy operator**
  - language: throughput, downtime, yield, OEE, service productivity, cost per unit
- **Digital platform / product company**
  - language: shipping velocity, product trust, evaluation, security reviews, feature pressure
- **PE / efficiency mandate**
  - language: EBITDA expansion, cost takeout, 100-day plan, synergy capture, portfolio replication

#### Constraint Sprint overlays

- **Lean high-output SaaS / software**
  - language: engineering velocity, product throughput, support signal to roadmap, onboarding scale
- **Normal-RPE bottleneck-heavy operator**
  - language: cycle time, backlog, throughput, cost-to-serve, rework reduction
- **Sales-led services / revenue team**
  - language: deal velocity, response time, proposal speed, admin removal, hire deferral
- **Customer-success / onboarding-led subscription business**
  - language: onboarding capacity, renewal risk, backlog, consistency, retention protection

#### Why overlays matter

- The 3 routes define the commercial path
- The overlays define the language, KPI framing, proof, and CTA emphasis
- This is how the model can cover more of the real market without becoming too complex

---

## Part 5: How to detect the route from existing inputs

The routing should be SILENT. The visitor enters the same inputs they enter today. The calculator routes based on what the numbers reveal. No new input fields required for the base routing.

### Existing inputs that inform routing

- `revenue` — company scale
- `employees` — team size
- `industry` — sector context
- `knowledgeWorkerPct` — workforce composition
- `currentAiSpend` — indicates AI maturity
- `plannedHires` — growth pressure signal
- `bottleneck` — where the constraint lives

### Current code truth (important before implementation)

The current calculator does **not** yet have route detection. It has the raw ingredients for it, but several concepts referenced later in this guide are still proposed, not implemented.

**Already in the codebase:**
- `revenuePerEmployee`
- `isHighRPE`
- `planA.roi`, `planB.roi`
- `monthsToPayback`
- `plannedHires`
- `bottleneck`
- generic bottleneck-specific explanatory copy

**Not yet in the codebase (must be added before route-specific UI exists):**
- `route`
- `isLeanHighOutput`
- enterprise route heuristics
- route-specific result headings
- route-specific CTA copy
- route-specific waitlist headings / mailto context
- bottleneck playbook data structure (`LEAN_TEAM_PLAYBOOKS` is not currently present)
- conditional revenue leverage calculations
- combined-value calculation rules

### Derived signals

- `revenuePerEmployee` — already computed
- `isHighRPE` — already computed (≥ $300K)
- `isLeanHighOutput` — must be added (`isHighRPE && employees >= 10 && employees <= 120 && revenue >= 5_000_000`)
- `isEnterpriseScale` — must be added (`employees > 200 && revenue >= 50_000_000`)
- `isRegulatedIndustry` — must be added (`industry === financial || industry === healthcare`)
- `hasMeaningfulAiSpend` — must be added (`currentAiSpend >= 100_000`)
- `planA.roi` and `planB.roi` — already computed
- `hasClearBottleneck` — treat as `true` when `bottleneck` is one of the supported enum values

### Routing logic (v1 heuristics — to be validated against live lead quality and conversion)

These thresholds are initial working assumptions, not hard strategic truth. Company size alone is a rough proxy — some 150-person companies may behave like constraint-fit firms, some 300-person companies may not be true transformation-office buyers. Calibrate after live traffic.

### Route enum (implementation requirement)

Use a single enum everywhere in the calculator:

```ts
type RouteId =
  | "transformation_office"
  | "constraint_sprint"
  | "standard"
  | "not_now";
```

### Deterministic routing order (implementation requirement)

This order is important. Evaluate from top to bottom and stop at the first match.

```ts
if (
  employees > 500 &&
  revenue >= 50_000_000
) {
  route = "transformation_office";
} else if (
  employees > 200 &&
  revenue >= 50_000_000 &&
  (hasMeaningfulAiSpend || planB.roi >= 1.5)
) {
  route = "transformation_office";
} else if (isLeanHighOutput) {
  route = "constraint_sprint";
} else if (
  employees <= 150 &&
  planA.roi >= 1 &&
  hasClearBottleneck
) {
  route = "constraint_sprint";
} else if (planA.roi >= 3) {
  route = "standard";
} else if (planA.roi < 1) {
  route = "not_now";
} else {
  route = "standard";
}
```

### Why this exact precedence

- Enterprise fit should win before lean-team fit when the company is obviously large and already spending or economically supports Plan B.
- Lean high-output teams should be caught before generic ROI verdicts.
- Normal-RPE bottleneck buyers under ~150 people should route to Constraint Sprint if economics are viable.
- `Not Now` should only catch companies that neither fit enterprise nor constraint logic and do not support Plan A economics.

### Optional routing input override

If the optional question is added later, it should **override** the silent route only in these cases:

- If user chooses enterprise/pilot-scale option, force `transformation_office` unless `employees < 50` and `revenue < 5_000_000`
- If user chooses bottleneck option, force `constraint_sprint`
- If user chooses exploring option, downgrade `standard` to `not_now`, but do not override `transformation_office`

Without the optional field, use silent routing only.

### Why this second Constraint Sprint trigger matters

Without it, the model misses a commercially important segment:

- normal-RPE companies
- under ~150 employees
- one painful, measurable bottleneck
- viable economics
- strong fit for Operational Diagnostic → Quick-Win → Pods

These companies are not the classic high-RPE sweet spot, but they are still ideal buyers for the Doc 3 delivery system. They should not receive only a lukewarm generic verdict.

### Optional enhancement: one additional input

If you want better routing without friction, add ONE optional input:

`What best describes your situation?`
- "We have AI pilots but need to scale them across the company"
- "We have a specific bottleneck we want AI to solve"
- "We're exploring what AI could do for us"

This maps directly to: Transformation Office / Constraint Sprint / Not Now. It improves routing accuracy without turning the calculator into a qualification form.

---

## Part 6: Calculator changes — Constraint Sprint path (the sweet spot fix)

This is the highest-priority change. It directly solves the problem of sweet spot companies seeing "not a good fit."

### What the result section should show

**1. Route identification (replaces generic heading)**

Current: "Your numbers, based on mid range research."

For Constraint Sprint: "Your profile: lean high-output team. Here's how AI removes your [engineering] constraint."

**2. Focused system card (replaces or augments Plan A card)**

Instead of "COMMAND ROOM — $22,000/mo" with a bad ROI headline, show:

Label: "FOCUSED AI SYSTEM — [BOTTLENECK NAME]"

Headline metric: payback period (e.g., "Pays for itself in 4 months") instead of a raw ROI multiplier that looks bad.

What gets built (from `LEAN_TEAM_PLAYBOOKS`, which must be added):
- System 1: [name and one-line description]
- System 2: [name and one-line description]
- System 3: [name and one-line description]

Measurable outcome: [metric from playbook successMetric]

Timeline: "First system in production in 90 days"

**3. Economics section (below the systems)**

Show value in multiple buckets, not just FTE productivity:

- Productivity value: $X (existing Plan A annual value — honest, keep it)
- Hire deferral value: `hireDeferralCount × fullyLoadedCost` (if `plannedHires > 0`)
- Revenue leverage: $Y (conditional by bottleneck and scenario)
- Combined annual value: `max(productivityValue, hireDeferralValue) + revenueLeverageValue`
- Your investment: $264K/yr
- Net return: combined - investment
- Payback: months

**Constraint Sprint headline rule: For Constraint Sprint companies, the headline metric is payback period, never raw ROI.** Show "Pays for itself in X months" as the first number they see, then the value breakdown below. A 0.97x ROI kills perceived likelihood. A "4-month payback" communicates the same economics without destroying belief. This rule applies to the Constraint Sprint route only — for Transformation Office companies, raw ROI is usually strong enough to lead with, and the real framing there is portfolio value and governance maturity, not a single number.

### Economics rules (implementation requirement)

This section needs exact formulas. Without them, different implementations will drift.

#### Constraint Sprint uses Plan A economics only

For the focused-system card, use:

- `annualCost = PLAN_A_ANNUAL`
- `productivityValue = planA.annualValue`
- `equivalentFTEs = planA.equivalentFTEs`
- `basePaybackMonths = planA.monthsToPayback`

Plan B remains visible only as an intentionally-too-broad comparison.

#### Hire deferral

```ts
hireDeferralCount =
  plannedHires > 0
    ? Math.min(plannedHires, Math.floor(planA.equivalentFTEs))
    : 0;

hireDeferralValue = hireDeferralCount * fullyLoadedCost;
```

#### Revenue leverage percentage map

```ts
const REVENUE_LEVERAGE_PCT = {
  lower: {
    sales: 0.02,
    marketing: 0.015,
    customer_success: 0.005,
    engineering: 0,
    ops: 0,
  },
  mid: {
    sales: 0.03,
    marketing: 0.025,
    customer_success: 0.01,
    engineering: 0,
    ops: 0,
  },
  upper: {
    sales: 0.04,
    marketing: 0.035,
    customer_success: 0.015,
    engineering: 0,
    ops: 0,
  },
};
```

#### Revenue leverage value

```ts
revenueLeverageValue = revenue * REVENUE_LEVERAGE_PCT[scenario][bottleneck];
```

#### Combined annual value and no-double-counting rule

Do **not** sum productivity value and hire deferral value. They are two monetizations of the same added capacity.

Use this rule:

```ts
capacityValue = Math.max(productivityValue, hireDeferralValue);
combinedAnnualValue = capacityValue + revenueLeverageValue;
netReturn = combinedAnnualValue - annualCost;
monthsToPayback =
  combinedAnnualValue > 0
    ? Math.ceil((annualCost / combinedAnnualValue) * 12)
    : 99;
```

#### Display rule

Show all three buckets in the UI:

- Productivity value
- Hire deferral value
- Revenue leverage value

But explicitly label combined value as:

`Combined annual value (capacity value + conditional revenue leverage)`

This keeps the calculator honest and avoids inflated economics.

**4. Effort and sacrifice messaging**

Add to the card:
- "Your team commitment: ~2 hours/week during setup, zero ongoing"
- "We handle build, integration, training, and measurement"
- "No disruption to current operations"

This directly addresses Hormozi's Value Equation bottom-half.

**5. Route-specific KPIs for Constraint Sprint**

The result section should use this KPI language, not generic enterprise metrics:

- Cycle time reduction (in the bottlenecked workflow)
- Backlog age / queue time
- Throughput per operator
- Hires deferred
- Manual time removed
- Rework / error reduction
- First-pass quality improvement
- Founder / operator time recovered
- Revenue throughput (only where bottleneck is sales or marketing)

### Industry-specific KPI overlays for Constraint Sprint

The base KPI list above is universal. Then add industry resonance on top:

- **SaaS / software**
  - engineering lead time
  - deploy frequency
  - backlog age
  - onboarding time
  - support resolution time
- **Manufacturing**
  - throughput
  - downtime
  - yield
  - unit cost
  - quote-to-cash cycle time
- **Healthcare**
  - claim cycle time
  - denial / exception rate
  - patient throughput
  - admin backlog
  - first-pass quality
- **Financial services**
  - servicing cycle time
  - cost per case
  - control exceptions
  - auditability
  - resolution speed
- **Logistics / transportation**
  - exception handling time
  - shipment coordination time
  - cost per transaction
  - manual touch count
  - SLA adherence

**6. CTA**

For Constraint Sprint companies, the CTA should be:
- "Apply for the Operational Diagnostic" or "Apply for the AI Portfolio Reality Scan"
- Pre-fill the waitlist form with context from their calculator inputs
- The heading: "Want us to scope the one AI system that actually moves the needle?"

This is **not** currently implemented. The form is generic today and must be made route-aware.

**6. Plan B handling**

Keep the existing verdict: "Too broad for this team shape." This is correct. Plan B at $290K/mo does not make sense for a 30-person company. The calculator should NOT try to make Plan B work for sweet spots.

### Bottleneck playbook data structure (implementation requirement)

The guide assumes structured playbooks exist. They do not yet. Add them before UI work.

```ts
type LeanTeamPlaybook = {
  bottleneck: BottleneckKey;
  cardLabel: string;
  headline: string;
  successMetric: string;
  timeline: string;
  effortLine: string;
  routeSummary: string;
  systems: Array<{
    name: string;
    description: string;
  }>;
  baseKpis: string[];
  industryKpis?: Partial<Record<IndustryKey, string[]>>;
  ctaHeading: string;
  ctaLabel: string;
};
```

Minimum requirement: one playbook per bottleneck (`sales`, `engineering`, `customer_success`, `marketing`, `ops`) with exactly 3 systems each.

### Constraint Sprint acceptance criteria

- Route heading changes from generic results heading to bottleneck-specific heading.
- Focused-system card replaces Plan A as the primary visual recommendation.
- Headline metric is payback, not ROI.
- Combined value follows the no-double-counting rule above.
- Plan B remains visible but clearly framed as too broad.
- CTA copy changes to diagnostic language and includes calculator context in the email body.

### Conditional revenue leverage rules

**Core principle: Labor-productivity math is the hard base. Revenue leverage is a conditional secondary layer. It supplements the base — it does not replace it.**

Revenue leverage should NOT be applied universally. It is defensible only where the bottleneck directly involves revenue generation:

| Bottleneck | Revenue leverage applicable? | Justification |
|---|---|---|
| Sales | Yes — 2% (lower), 3% (mid), 4% (upper) | McKinsey 2023: 3-15% uplift from AI in marketing and sales |
| Marketing | Yes — 1.5% (lower), 2.5% (mid), 3.5% (upper) | Same McKinsey source; slightly lower because marketing is more indirect |
| Engineering | No | Productivity gains are real but revenue link is indirect; use cycle-time and throughput instead |
| Customer Success | Partial — 0.5% (lower), 1% (mid), 1.5% (upper) | Retention improvement protects existing revenue; McKinsey notes retention gains from AI |
| Operations | No | Value is cost-to-serve and cycle-time, not revenue generation |

This is more defensible than blanket 2% across all bottlenecks. It respects the actual research.

---

## Part 7: Calculator changes — Transformation Office path

This requires less change because the current calculator already works for larger companies. The productivity math produces strong ROI numbers at scale.

### What to add

**1. Enterprise KPI language**

When the company routes to Transformation Office, overlay Doc 1's KPI language on the results:

- "At your scale, the primary value is operating leverage: margin expansion, cost-to-serve reduction, and cycle-time compression across multiple functions."
- Reference the Doc 1 outcomes table (EBIT, NRR, CSAT, delivery throughput, risk reduction)

**2. Route-specific KPIs for Transformation Office**

The result section should use enterprise-grade KPI language:

- Operating margin / EBIT (bps improvement)
- SG&A as % of revenue
- Cost-to-serve (cost per ticket, cost per invoice, unit cost per transaction)
- Cycle time (quote-to-cash, order-to-cash, onboarding)
- Workflow adoption (% target users active weekly, % workflows instrumented)
- Production deployment coverage (% AI experiments in production)
- Governance maturity (% use cases with risk review, monitoring coverage)
- Pilot-to-production conversion rate

### Industry-specific KPI overlays for Transformation Office

Use enterprise KPI language first, then sector-specific overlays:

- **Regulated financial services**
  - control exceptions
  - audit findings
  - model / AI governance coverage
  - servicing cost
  - case cycle time
- **Healthcare / pharma**
  - claim or authorization cycle time
  - denial / exception rates
  - throughput
  - compliance exposure
  - audit survivability
- **Asset-heavy operators**
  - throughput
  - yield
  - downtime
  - service productivity
  - unit cost
- **Digital platform / product companies**
  - product delivery cadence
  - support cost-to-serve
  - trust / evaluation coverage
  - security review velocity
  - customer-facing workflow quality
- **PE / efficiency mandate**
  - EBITDA expansion
  - synergy capture
  - shared-service leverage
  - integration cycle time
  - portfolio-wide cost takeout

**3. Governance/compliance context**

If the company is in financial services, healthcare, or has EU exposure:
- "For regulated enterprises, governance maturity is not optional — it accelerates deployment by removing late-stage compliance blocks."

**3. Money model flow**

Show Plan B as the natural recommendation with Plan A as a stepping stone:
- Plan A: "Build the foundation — governance, portfolio, first production wins"
- Plan B: "Scale across functions — full transformation office with custom AI systems"

**4. CTA**

"Apply for the AI Portfolio Reality Scan — board-ready portfolio baseline, prioritized scale/kill decisions, and governance charter in 2-3 weeks."

---

## Part 8: Calculator changes — improvements for ALL companies

These apply regardless of route.

### Payback period as primary metric

Currently `monthsToPayback` is computed but buried in verdict text. Make it a VISIBLE metric on every plan card, shown as prominently as ROI:

"Pays for itself in X months"

This is psychologically stronger than an annual ROI multiplier because it answers "how long until this works?" — directly reducing perceived time delay in the Value Equation.

### Effort and sacrifice messaging

Add a standard line to both plan cards:

- Plan A: "Your team: ~2 hours/week during onboarding. We handle the rest."
- Plan B: "Your team: executive steering biweekly. Full delivery is ours."

### Plan A as "START HERE"

For all companies (not just sweet spots), position Plan A as the recommended entry:
- Label: "START HERE" or "RECOMMENDED ENTRY"
- Plan B label: "SCALE UP" or "FULL TRANSFORMATION"

This matches Hormozi's money model (perfect one offer at a time) and reduces decision paralysis.

### Status quo cost framing

The existing "COST OF DOING NOTHING" card is good. Strengthen it:
- Show the cost in per-quarter terms (more visceral than annual)
- "Every quarter you wait, you forgo $X in productivity and widen the gap with competitors who moved early (BCG 2025)"

Implementation rule:

```ts
quarterlyOpportunityCost = annualValue / 4;
```

Show both:

- annual opportunity cost
- quarterly opportunity cost

### The forgotten middle: how to handle standard-flow companies

The standard-flow segment is not broken, but it should not be left generic forever.

These are often:

- mid-market companies
- decent economics
- not true enterprise buyers
- not classic lean sweet spots

For now, the existing Plan A/B comparison is acceptable. But the medium-term goal should be:

- apply route overlays where possible
- improve CTA specificity
- improve KPI resonance by industry

So "standard flow" should be treated as a temporary operational category, not the final strategic answer for the entire middle of the market.

---

## Part 9: Messaging rules by route

These rules keep copy clean and consistent across the calculator, service pages, and sales conversations.

### Transformation Office route

**Say:**
- portfolio control
- production-grade AI
- governance that survives audit
- executive cadence and decision rights
- measurable operating leverage
- pilot-to-production conversion

**Do not say:**
- generic AI consulting
- tools or platforms
- vague innovation language
- "we'll help you explore AI"

### Constraint Sprint route

**Say:**
- one focused system
- one bottleneck removed
- faster throughput
- fewer hires needed
- measured workflow improvement
- operational leverage

**Do not say:**
- broad transformation
- AI enablement across the company
- "not recommended at this scale"
- "marginal" or "not a fit"

**If this is a normal-RPE bottleneck buyer, emphasize:**
- cost of delay
- cycle time
- backlog removal
- measurable operational improvement
- automation-first where appropriate

### Not Now route

**Say:**
- clarity on where to start
- future fit
- next best step
- free resources to build readiness

**Do not say:**
- anything that shames or pressures the lead
- "you're too small"
- "come back when you grow"

---

## Part 10: Service architecture beyond the calculator

The calculator is one piece of a larger commercial system. The Hormozi money model and the research docs define the full architecture.

### For Transformation Office buyers

```
Free: Pilot-to-Production Scorecard (lead magnet)
     ↓
Paid diagnostic: AI Portfolio Reality Scan (2-3 weeks, ~$15K)
     ↓
Core: Enterprise AI Transformation Office (retained, $35K+/mo)
     ↓
Continuity: Governance + Portfolio + Adoption Retainer
```

The flagship service page (from Doc 2) should target Segment A (regulated enterprises) primarily, with readability for Segments B and C. The main CTA on that page should be the paid diagnostic, NOT the calculator. The calculator is a top-of-funnel lead magnet that feeds into the diagnostic.

### For Constraint Sprint buyers (sweet spots)

```
Free: Workflow Bottleneck Scorecard or AI Portfolio Reality Scan (lighter)
     ↓
Paid diagnostic: Operational Diagnostic (1-2 weeks, scoped to 1-2 workflows)
     ↓
Core: Quick-Win Sprint → Implementation Pods (modular, 2-6 weeks each)
     ↓
Continuity: Scale & Governance retainer
```

The calculator is the primary entry point for this segment. They discover you through the calculator, see that their profile is a strong fit for a focused engagement, and apply for the diagnostic.

### Pricing architecture

**Transformation Office path:**
- Diagnostic: fixed fee ($10-20K)
- Core retainer: $35K+/mo base + optional outcome-linked upside
- Gainshare only for bounded, measurable workflows (cost per ticket, cycle time)

**Constraint Sprint path:**
- Diagnostic: fixed fee ($5-15K depending on scope)
- Quick-Win Sprint: fixed scope, fixed price
- Implementation Pods: modular pricing per pod
- Scale retainer: lower monthly base than Transformation Office

This dual pricing architecture avoids the problem of one-size-fits-all. Sweet spot companies are not buying a $290K/mo transformation office. They are buying a scoped implementation engagement that starts small and expands.

### PE and efficiency-mandate buyers

Treat PE-owned / efficiency-mandate buyers as an overlay, not a separate primary route.

They may enter through either:

- Transformation Office
- Constraint Sprint

What changes is the framing:

- EBITDA
- cost takeout
- synergy capture
- 100-day plan
- replication across portfolio companies or business units

This matters because Doc 1 identifies PE-owned and efficiency-driven firms as an active buyer segment, but their route is usually determined by complexity and bottleneck shape, not by ownership structure alone.

### Shared infrastructure across both lanes

Both service lanes should standardize the following. This reduces delivery cost, improves quality, and makes scaling easier:

- Intake and onboarding process
- Diagnostic / workflow scan methodology (SIPOC, process mapping)
- KPI baseline method and measurement plan
- Prioritization scoring model (WSJF-derived + feasibility gates)
- Decision gates (diagnostic gate, prioritization gate, build gate, release gate, adoption gate)
- Definition of done (working + adopted + measured)
- Testing and validation standards
- Training format and adoption tracking
- Reporting cadence and templates
- Security and risk checks
- Governance templates (reusable across both lanes, scaled to client complexity)

The enterprise lane adds portfolio governance, steering committee cadence, and compliance evidence packs. The constraint lane stays lighter but uses the same underlying methodology and artifacts.

### CTA and form payload spec (implementation requirement)

The current waitlist form is generic. To support route-specific conversion without adding visible friction, pass structured calculator context into it.

#### `WaitlistForm` props to add

```ts
type WaitlistContext = {
  route: RouteId;
  recommendedOffer: string;
  recommendationReason: string;
  scenario: ScenarioId;
  revenue: number;
  employees: number;
  industry: string;
  bottleneck: string;
  revenuePerEmployee: number;
  currentAiSpend: number;
  plannedHires: number;
  planARoi: number;
  planAPayback: number;
  planAAnnualValue: number;
  planBRoi?: number;
};

type WaitlistFormProps = {
  heading: string;
  subheading: string;
  ctaLabel: string;
  context?: WaitlistContext;
};
```

#### Mailto body lines to append

Always append these lines after the human-entered fields:

- `Route: ...`
- `Recommended offer: ...`
- `Why this route: ...`
- `Scenario: ...`
- `Revenue: ...`
- `Employees: ...`
- `Industry: ...`
- `Primary bottleneck: ...`
- `Revenue per employee: ...`
- `Current AI spend: ...`
- `Planned hires: ...`
- `Plan A ROI: ...`
- `Plan A payback: ...`
- `Plan A annual value: ...`

#### Route-specific headings

- `transformation_office`
  - Heading: `Want a board-ready view of which AI initiatives should scale, stop, or be governed first?`
  - CTA: `Apply for the AI Portfolio Reality Scan`
- `constraint_sprint`
  - Heading: `Want us to scope the one AI system that actually moves the needle?`
  - CTA: `Apply for the Operational Diagnostic`
- `standard`
  - Heading: `Want your exact numbers and the right starting point?`
  - CTA: `Apply for the AI Portfolio Reality Scan`
- `not_now`
  - Heading: `Want help identifying the first workflow worth measuring?`
  - CTA: `Request the readiness diagnostic`

---

## Part 11: Implementation priority

### Phase 0 — Add missing primitives (must happen first)

- Add `RouteId`
- Add `route` to result state
- Add `isLeanHighOutput`
- Add `isEnterpriseScale`
- Add `isRegulatedIndustry`
- Add `hasMeaningfulAiSpend`
- Add the `LEAN_TEAM_PLAYBOOKS` data object
- Add route-aware waitlist props/context types

Without Phase 0, the later phases cannot be implemented cleanly.

### Phase 1 — Fix the sweet spot display (highest impact, ship first)

- Add Constraint Sprint detection using newly added `isLeanHighOutput`
- Reframe Plan A card for lean teams: bottleneck-focused label, playbook systems as deliverables
- Show payback period as headline metric instead of weak ROI
- Add hire deferral value bucket
- Add conditional revenue leverage (sales/marketing bottlenecks only)
- Show value breakdown (productivity + hire deferral + conditional revenue leverage)
- Update verdict to Constraint Sprint language
- Update CTA to diagnostic application

### Phase 2 — Improve all companies

- Make payback period prominent on all plan cards
- Add effort/sacrifice messaging to all cards
- Position Plan A as "START HERE", Plan B as "SCALE UP"
- Strengthen status quo cost framing

### Phase 3 — Add enterprise route

- Detect Transformation Office profile (employees > 200, revenue > $50M)
- Add enterprise KPI overlay language
- Add governance/compliance context for regulated industries
- Adjust CTA for enterprise buyers

### Phase 4 — Add the optional routing input

- Add one optional question: "What best describes your situation?"
- Three options mapping to three routes
- Improves routing accuracy without friction
- Can override or confirm the silent detection from Phase 1-3

### Phase 5 — Build the broader money model

- Separate lead magnets per route (Pilot-to-Production Scorecard vs Workflow Bottleneck Scorecard)
- Build the diagnostic product pages
- Build the service pages per route
- Connect calculator CTA to the right diagnostic per route

### Phase 6 — Validate route quality with fixed test fixtures

- Run the calculator against named company fixtures before launch
- Confirm route, headline metric, CTA, and value breakdown for each
- Adjust thresholds only after fixture review and first live lead feedback

---

## Part 12: What NOT to do

- Do NOT add 10+ new input fields. The calculator's simplicity is its strength.
- Do NOT apply revenue leverage universally across all bottlenecks. It is only defensible for sales and marketing.
- Do NOT turn the calculator into a qualification form. It should stay a calculator that routes silently.
- Do NOT show a weak ROI number as the headline for sweet spots. Show payback period, then value breakdown.
- Do NOT present Plan B to sweet spot companies as a serious recommendation. "Too broad" is the correct verdict.
- Do NOT inflate numbers to make sweet spots look good. Show honest, complete value — multiple value buckets instead of one inflated number.
- Do NOT remove the existing methodology transparency. The research citations and scenario comparison are trust builders. Keep them.
- Do NOT try to implement everything at once. Hormozi: "Perfect one offer at a time." Ship Phase 1, measure impact, then proceed.

---

## Part 13: Build-ready implementation checklist

This section is the minimum definition of "ready to code."

### Required outputs from `calculate()`

Add these fields to results:

- `route`
- `isLeanHighOutput`
- `isEnterpriseScale`
- `isRegulatedIndustry`
- `hasMeaningfulAiSpend`
- `constraintEconomics` object for Plan A route-specific display

Suggested shape:

```ts
type ConstraintEconomics = {
  productivityValue: number;
  hireDeferralCount: number;
  hireDeferralValue: number;
  revenueLeveragePct: number;
  revenueLeverageValue: number;
  capacityValue: number;
  combinedAnnualValue: number;
  netReturn: number;
  monthsToPayback: number;
};
```

### Required helper functions

- `detectRoute(results, inputs): RouteId`
- `getConstraintEconomics(results, scenario): ConstraintEconomics`
- `getRouteHeadline(route, inputs, playbook): string`
- `getRouteCta(route): { heading: string; label: string; subheading: string }`

### Required rendering behavior

- `transformation_office`
  - keep both plan cards
  - add enterprise KPI overlay
  - enterprise CTA copy
- `constraint_sprint`
  - focused-system card first
  - payback headline
  - Plan B de-emphasized as too broad
  - bottleneck playbook visible
- `standard`
  - current Plan A/Plan B flow mostly preserved
  - better payback prominence
- `not_now`
  - respectful readiness language
  - no hard-sell retained-program framing

### Required copy replacement rules

- Replace generic results heading for non-standard routes
- Replace generic waitlist heading for all routes
- Replace generic recommendation text on Plan B for Constraint Sprint with `Too broad for this team shape`

---

## Part 14: Test fixtures (must be agreed before shipping)

Create these fixtures and verify route + top-line output against them:

1. Lean SaaS sweet spot
   - revenue: $30M
   - employees: 30
   - industry: SaaS
   - bottleneck: engineering
   - planned hires: 8
   - expected route: `constraint_sprint`
   - expected headline: payback, not ROI

2. Lean services/finance team with weak labor ROI
   - revenue: $30M
   - employees: 30
   - industry: financial
   - bottleneck: ops
   - planned hires: 2
   - expected route: `constraint_sprint` if bottleneck economics are viable, otherwise `not_now`

3. Mid-market normal-RPE operator
   - revenue: $18M
   - employees: 90
   - industry: logistics
   - bottleneck: ops
   - planned hires: 6
   - expected route: `constraint_sprint`

4. Healthy mid-market standard-flow company
   - revenue: $40M
   - employees: 180
   - industry: ecommerce
   - bottleneck: marketing
   - expected route: `standard`

5. Large enterprise with existing spend
   - revenue: $250M
   - employees: 800
   - industry: SaaS
   - current AI spend: $500K
   - bottleneck: engineering
   - expected route: `transformation_office`

6. Regulated enterprise
   - revenue: $1B
   - employees: 6,000
   - industry: financial
   - current AI spend: $2M
   - expected route: `transformation_office`

7. Small low-readiness company
   - revenue: $2M
   - employees: 18
   - industry: other
   - bottleneck: marketing
   - planned hires: 0
   - expected route: `not_now`

8. Enterprise-sized but no AI spend entered
   - revenue: $500M
   - employees: 2,000
   - industry: manufacturing
   - current AI spend: blank
   - expected route: `transformation_office` because scale alone is sufficient in the first enterprise branch

### Fixture acceptance rules

For every fixture, verify:

- route
- primary headline metric
- CTA heading
- CTA label
- whether Plan B is primary, secondary, or de-emphasized
- whether revenue leverage is applied
- whether combined value obeys the no-double-counting rule
