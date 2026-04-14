# Unified Website Content Corrections — ASCA Consultancy

**Authors:** Claude Opus 4.6 + Codex
**Date:** 2026-04-13
**Scope:** Exact current copy vs. proposed rewrites across the 3 live pages (Home, What We Do, Research/ROI) and the calculator follow-up pages. Where both agents have a proposal, both are shown side-by-side so you can pick.

---

## 1. HOMEPAGE — `src/App.tsx`

| Element | Current (exact) | Claude Opus 4.6 proposal | Codex proposal | Why |
|---|---|---|---|---|
| Eyebrow ([L399](src/App.tsx#L399)) | `AI IMPLEMENTATION FOR 20-300 PERSON TEAMS` | `AI IMPLEMENTATION FOR ECOMMERCE TEAMS (20-80 PEOPLE)` | `AI IMPLEMENTATION FOR ECOMMERCE OPS TEAMS` | ICP is too broad. Your proof skews ecommerce/ops-heavy. Opus adds a headcount ceiling; Codex keeps it narrative |
| Hero H1 ([L402-405](src/App.tsx#L402)) | `I help teams do more work without hiring more people` | `I help ecommerce teams remove their #1 workflow bottleneck in 10 weeks` | `I help ecommerce teams eliminate one workflow bottleneck in 10 weeks.` | Both converge on vertical + outcome + timeframe. Near-identical — pick whichever phrasing you prefer |
| Hero sub ([L418-422](src/App.tsx#L418)) | `If one process is eating your team's capacity — or you're about to hire just to keep up — I map it, guide your team through the fix, and measure whether it actually reduced the workload.` | `If one process is eating your team's capacity — or you're about to hire just to keep up — I diagnose it in 2 weeks, ship the fix with your team in 8, and prove the hours saved before handover.` | `If one process is eating 20+ hours a week — or forcing your next ops hire — I map it, fix it with your team, and measure the before-and-after numbers.` | Opus emphasizes the sprint structure (2 + 8); Codex quantifies the pain ("20+ hours a week"). Both replace vague "reduced the workload" with concrete numbers |
| Primary CTA ([L426-428](src/App.tsx#L426)) | `See how it works` | `Book a Paid Diagnostic Call — $500` (if re-opening sales) OR keep `See how it works` | `See the 10-week sprint` | Opus pushes toward a real conversion action; Codex aligns the CTA with the single public offer. Either works — Opus is more commercial, Codex is more consistent |
| Pain bullets ([L446-449](src/App.tsx#L446)) | 1. `Your team wastes hours every day on one process — and you're about to hire someone just to keep up`<br>2. `The person who owns it is too busy doing it to fix it`<br>3. `You tried Zapier. Or a freelancer. It worked for a month, then it broke and nobody fixed it`<br>4. `You know AI could help but you don't know where to start` | Keep 1-3. Replace #4 with: `You've already picked the workflow. You just haven't shipped a fix that stuck.` | Full rewrite:<br>1. `You're about to make another ops or CX hire because one workflow keeps breaking`<br>2. `One person knows the process, but they're buried in it and cannot fix it`<br>3. `You tried Zapier, ChatGPT, or a freelancer. It worked until the first real exception`<br>4. `You do not need an AI strategy. You need one workflow fixed` | Both kill bullet #4 (it contradicts the research page). Opus surgically fixes one line; Codex rewrites all four to be triggers instead of symptoms. **Codex is stronger here** — adopt the full rewrite |
| Guarantee / "The Promise" ([L517-521](src/App.tsx#L517)) | `If the system we implement doesn't measurably reduce your team's workload within 60 days of going live — I keep working for free until it does.` | `If the system doesn't deliver a 15%+ measurable reduction in the agreed metric within 60 days of go-live, I continue working for up to 30 additional days at no charge.` | `If we agree on one workflow and one success metric before kickoff, and the system is live but that metric has not improved within 60 days, I give you 30 additional days of implementation support at no cost.` | Both cap the unbounded guarantee at 30 days. Opus adds a specific threshold (15%); Codex emphasizes the pre-kickoff agreement. **Combine: pre-kickoff metric + 15% threshold + 30-day cap** |
| Proof strip ([L485-508](src/App.tsx#L485)) | `$1M+ ARR built in <8 months` / `25+ companies using our AI systems` / `2,500+ hours working with AI` | Replace with 3 named-client results: `[Client] cut onboarding 42% in 6 weeks` / `[Client] deferred 2 ops hires (~$240K/yr)` / `[Client] cleared 11-week backlog in 10` | Replace with 3 verified case-study lines:<br>`[Brand] cut onboarding time by [X%] in [Y weeks]`<br>`[Brand] removed [X] manual hours/week from [workflow]`<br>`[Brand] delayed [1] ops hire by fixing [workflow]` | Both agree: replace vanity metrics with named outcomes. Codex adds the critical warning: **do not publish placeholders until verified** |
| Fit criteria ([L217-220](src/App.tsx#L217)) | `You run a growing team (20-300 people) and you know where AI could save the most time`<br>`You've tried to fix it yourself or with a freelancer and it didn't stick`<br>`You can point to the workflow and the person who owns it` | `You run an ecommerce team (20-80 people) doing $3M-$30M and you already know which workflow is costing you the most time` | `You run an ecommerce or ops-heavy team with 20-150 people`<br>`One workflow is already painful enough that you are considering a hire or living with backlog`<br>`One person owns the workflow and can work with me weekly` | Opus adds a revenue floor (saves unqualified sales calls); Codex broadens to include ops-heavy non-ecommerce. **Combine: ecommerce/ops-heavy, 20-100 people, with revenue floor** |
| Not-a-fit ([L222-225](src/App.tsx#L222)) | `You don't have a specific workflow in mind — you just want 'AI stuff'`<br>`You just want a chatbot. We do a lot more than that.`<br>`You need 5 people to approve a $30K decision` | (no specific proposal) | `You cannot name the workflow, the owner, and the success metric`<br>`You want a chatbot because everyone else has one`<br>`You need a committee to approve a focused implementation` | **Codex only.** Makes disqualification operational instead of vague. Adopt Codex |
| Plans section intro | `Two ways to save time & money.`<br>`If one workflow is wasting hours every week, start with the sprint. If several workflows are breaking at once, I embed a dedicated AI operations team.` | (no specific proposal — Opus proposes removing Plan B entirely) | `Start with one bottleneck. Fix it in 10 weeks.`<br>`This site sells one thing: a fixed-scope sprint for one painful workflow. If it works, we decide whether workflow #2 is worth fixing next.` | **Codex only.** Both agents agree on killing Plan B publicly; Codex writes the replacement intro |
| Plan A card ([L174-213](src/App.tsx#L174)) | `10-WEEK AI SPRINT` / `For one clear workflow bottleneck` / `Starting at $22,000` / `0 spots available` / `Apply` (disabled) / `If one process is wasting hours every week, I start with a 1-2 week diagnostic, implement the fix with your team, and measure whether it saves real time before handover. Fixed scope. 10 weeks.` | **Raise price to $35,000 fixed.** Description: `One painful workflow, one named owner, one measurable outcome. Weeks 1-2: diagnostic + baseline. Weeks 3-9: your team builds with me directing. Week 10: before/after numbers + handover.` | **Keep $22,000.** `10-WEEK AI SPRINT` / `For one costly workflow` / `Starting at $22,000` / `Applications open for next slot` / CTA: `Book your sprint diagnostic call` / `We diagnose one broken workflow, ship one production-ready fix with your team, and measure the result before handover.` | **Major disagreement on pricing.** Opus argues $22K is no-man's land and raises to $35K for unit economics. Codex keeps $22K but fixes the CTA and availability. **Your call:** if you need margin, go $35K; if you need validation first, keep $22K and fix the dead funnel |
| Plan B — AI OPERATIONS TEAM ([L143-172](src/App.tsx#L143)) | Full card at `$145,000/mo`, `10-30 Dedicated AI Engineers`, `Coming Q3 2026`, $320K/mo value stack | Remove from public site. Keep a single line at bottom of plans: `Need multiple workflows fixed at once? Contact us about a dedicated team engagement.` → mailto | Remove this card from the public site entirely. | **Both agree: remove.** Opus adds a soft contact line; Codex wants it fully gone. Either is defensible |
| Value stack ([L191-212](src/App.tsx#L191)) | `Workflow Diagnostic & Process Mapping (30–45 hrs) — $10,000` (+ 4 more hour-bucket items) / `Total value $50,000+ / You save $28,000+` | Remove the value stack. Replace with 3 deliverables: `A production workflow system in your stack, not in a deck` / `Your team trained to run and extend it` / `Hard before/after numbers for the board` | Replace with `What you get`:<br>`A full workflow map with every handoff, exception, and manual touch`<br>`A baseline metric and clear success target`<br>`One production-ready system shipped with your team`<br>`Training, handoff, and before-and-after measurement` | Both kill the Hormozi stacking. Codex's list is more detailed and operational; Opus's list is tighter. **Adopt Codex's — it's more concrete** |
| After-sprint box | `If there's more to fix, I stay. Monthly. Same structure. No lock-in. We only continue if it makes sense for both of us.` | Add optional `$3,500/mo Post-Sprint Optimization` retainer as an upsell at week 10 | `If workflow #2 is worth fixing, we scope the next sprint from the same baseline. No long-term contract required.` | Opus pushes for recurring revenue (retention); Codex pushes for structured expansion (no retainer). **Combine: Codex's copy + Opus's optional retainer as a sidebar** |
| FAQ — missing hiring objection | (not present) | Add: `Q: Why not just hire an ops person full-time? A: An ops hire costs $120-150K/yr, takes 6 months to ramp, and has to figure out AI implementation from scratch. I deliver a working system in 10 weeks for $22-45K, your team owns it, and you can still make the ops hire afterward to run it.` | Add: `Q: Why not just hire someone full-time? A: Because this gets one painful workflow fixed in 10 weeks without recruiting, ramp time, or another full-time salary before you know what actually works.` | Both agents independently identified this gap. Codex is tighter; Opus is more persuasive. **Pick Codex for brevity, Opus for detail** |
| FAQ — industries | `Ecommerce, SaaS, logistics, and services companies with 20-300 people. If your team has a process that's breaking and one person who owns it, we can probably help.` | (no specific proposal) | `Primarily ecommerce and ops-heavy teams where one workflow is already expensive enough to justify fixing now.` | **Codex only.** Matches the narrowed ICP. Adopt |
| FAQ — post-project | `You own it. I hand it over. If you have another workflow worth improving, we do it again — same structure, same pricing. If you don't, we part as friends. No retainer, no lock-in.` | (no specific proposal — see retention note above) | `You keep the system, the documentation, and the baseline. If workflow #2 is worth fixing, we scope a second sprint from the same foundation.` | **Codex only.** Stronger expansion framing. Adopt |
| Apply button / availability ([L463-475](src/App.tsx#L463)) | Disabled `Apply` button + `We're not taking new companies right now.` | Option A: Enable `Book a Paid Diagnostic Call — $500`. Option B: keep disabled but replace text with `Waitlist re-opens Q3 2026 — 2 spots` | `Applications are open for the next sprint slot.` Primary CTA: `Book your sprint diagnostic call` / Secondary: `See how the sprint works` | Both agents want to kill the dead funnel. Codex opens it; Opus offers a paid-filter variant. **Codex's is simpler and gets you real market feedback faster** |
| Footer line | `I help growing teams implement AI where it saves the most time.` | `I help ecommerce teams remove the workflow bottleneck that's costing them the most hours.` | `I help ecommerce and ops teams fix one painful workflow with AI in 10 weeks.` | Both aligned footer with the tighter positioning. Codex adds the timeframe, Opus adds the pain specificity. **Codex is more complete** |
| Founder credibility | Mirza appears only as name + email | Add a 2-sentence founder bio + photo + LinkedIn prominently on homepage | (no specific proposal) | **Opus only.** At $22-35K, buyers want to know who they're hiring |

---

## 2. WHAT WE DO PAGE — `src/WhatWeDoApp.tsx`

| Element | Current (exact) | Claude Opus 4.6 proposal | Codex proposal | Why |
|---|---|---|---|---|
| Hero H1 ([L165-169](src/WhatWeDoApp.tsx#L165)) | `You hired freelancers. Bought tools. Still no results?` | Keep as-is (strongest line on the site) | `One workflow is still broken. Let's fix that first.` | **Disagreement.** Opus says don't touch it; Codex replaces it with something tighter and offer-aligned. **Codex's is more specific, but the current line is emotionally strong.** A/B test if you can |
| Hero sub ([L171-176](src/WhatWeDoApp.tsx#L171)) | `Most companies try AI on their own or hire a freelancer. It works for a bit, then breaks. I spend 10 weeks with your team — figure out what to build, guide your people through it, and measure whether it actually saved time. You keep everything.` | `Freelancers build what you tell them — but scoping is the hard part. I spend the first 2 weeks finding the real bottleneck, then 8 weeks helping your team ship a fix that measurably saves hours. You own the system at the end.` | `This is not an AI transformation program. We pick one workflow, map it, build the fix with your team, and measure whether it saves real time.` | Opus explains *why* scoping is hard (differentiation vs. freelancer). Codex explicitly rejects the old enterprise framing. **Both valuable — Opus for sales, Codex for positioning cleanup** |
| Primary CTA ([L205-207](src/WhatWeDoApp.tsx#L205)) | `Get Your $15,000 Scan — Free` | `Book a Paid Strategy Call — $500` (or: `Apply for the $2,500 Workflow Audit`) | `See the 10-week sprint` | **Major disagreement.** Opus wants a paid filter; Codex wants to route to the sprint page. Opus's approach converts better if you need leads; Codex's is more coherent if you just want the site to tell one story |
| Secondary support line ([L212-215](src/WhatWeDoApp.tsx#L212)) | `For companies already spending on AI that have nothing to show the board yet.` | `For ecommerce teams with a workflow bottleneck they've already identified — and budget authority to fix it.` | `For teams with one painful workflow, one owner, and a real reason to fix it now.` | Both agents independently flag "show the board" as enterprise language that doesn't fit. Near-identical fixes |
| Right-side badge ([L222-224](src/WhatWeDoApp.tsx#L222)) | `Valued at $15,000 — yours free` | Remove badge entirely | `Weeks 1-2` | Both agents kill the fake-retail framing. **Codex's "Weeks 1-2" is a better replacement than Opus's "remove"** — it tells the buyer what they're looking at |
| Right-side H2 ([L247-249](src/WhatWeDoApp.tsx#L247)) | `One page that shows you where the time goes.` | (no specific proposal) | `A workflow map, baseline, and build plan.` | **Codex only.** More descriptive of actual output |
| Right-side body ([L250-254](src/WhatWeDoApp.tsx#L250)) | `We look at everything you're running. In two weeks, you know what's working, what's wasting money, and what to do about it. You keep the whole thing whether you hire us or not.` | `In 2 weeks you get: a map of your workflow step-by-step, the baseline numbers, and a ship/don't-ship recommendation. You keep it all, whether we continue or not.` | `In two weeks, you leave with a clear map of the workflow, the baseline numbers, and a recommendation to build or not build.` | Both converge on "map + baseline + ship/don't-ship recommendation." Near-identical |
| Hero highlight cards | `The map` / `The baseline` / `The action list` | (no specific proposal) | `The workflow map` / `The baseline metric` / `The build recommendation` | **Codex only.** Minor tightening — operational vs. abstract |
| Mechanism section H2 ([L280-282](src/WhatWeDoApp.tsx#L280)) | `Three things you're missing. We build all three.` | `The three systems every stuck AI workflow is missing.` | `Three things every good sprint needs.` | Both kill the accusatory tone. Opus diagnoses the category; Codex anchors it to the sprint. **Codex is more offer-aligned** |
| Install block 1 | `The master list` / `Every AI project in one place...` | (no specific proposal — governance language is leftover and should go) | `The workflow map` / `Every step, handoff, exception, and manual touch in the workflow.` | **Codex only.** Both agents agree the "portfolio governance" language is old; Codex rewrites it |
| Install block 2 | `The rules` / `Right now, nobody knows who's allowed to say yes...` | (no specific proposal) | `The build plan` / `What to automate, what to keep manual, what to integrate, and who owns rollout.` | **Codex only.** Moves from governance bureaucracy to sprint execution |
| Install block 3 | `The scoreboard` / `Hard numbers. Is this project making money, saving money, or wasting money?` | (no specific proposal) | `The scoreboard` / `One success metric, one baseline, one launch target, and one before-and-after review.` | **Codex only.** Narrows to one workflow |
| Six-step process | `Collect` / `Rank` / `Set the rules` / `Build and ship` / `Measure` / `Double down or kill it` | Same steps, but add a time anchor to each | Full rewrite as sprint timeline:<br>`Week 1: Map the workflow`<br>`Week 2: Set the metric and build plan`<br>`Weeks 3-6: Build the system`<br>`Weeks 7-8: Test with real work`<br>`Weeks 9-10: Launch and train`<br>`Post-launch: Measure and decide whether workflow #2 is worth fixing` | Both agents want time anchors. Codex writes the full version. **Adopt Codex — it transforms a textbook framework into a real engagement** |
| First 2 weeks H2 | `In 2 weeks, you know exactly what's worth fixing and what it takes.` | (no specific proposal) | `In 2 weeks, you know whether this workflow is worth building.` | **Codex only.** More honest |
| First 2 weeks deliverables | `A complete map of the workflow...` (+ 4 more) | (no specific proposal) | `Workflow map with every handoff, delay, exception, and manual touch`<br>`Baseline metric and current cost of the bottleneck`<br>`Clear recommendation: automate, redesign, or leave alone`<br>`Build scope, owner, and rollout plan`<br>`Go / no-go decision before more money is spent` | **Codex only.** Strips portfolio-governance leftovers |
| What you can do today | `Write down the one process that wastes the most time`<br>`Ask each team lead one question`<br>`Circle anything that's actually making or saving money` | (no specific proposal) | `Write down the one workflow that keeps forcing extra work or extra hires`<br>`Estimate how many hours it burns each week and what the next hire would cost`<br>`Name the person who owns the workflow and would join the sprint` | **Codex only.** Current drifts back to company-wide AI portfolio thinking |
| Apply section label | `JOIN THE WAITLIST — COMPLIMENTARY SCAN INCLUDED` | (no specific proposal) | `APPLY FOR THE NEXT SPRINT SLOT` | **Codex only.** Kills the waitlist-plus-free-scan frame |
| Apply section H2 | `Get on the list. Get your AI Portfolio Reality Scan now.` | (no specific proposal) | `Tell me the workflow. I'll tell you if the sprint is a fit.` | **Codex only.** Matches a focused implementation offer |
| Apply section body | `Tell us about your company and what's happening with AI right now... Complimentary scan valued at $15,000.` | (no specific proposal) | `Share the workflow, owner, current pain, and what success would look like. If it is a fit, we book a sprint diagnostic call. If it isn't, I tell you.` | **Codex only.** Qualifies faster, removes fake free value |
| Apply section chips | `2-minute form` / `Complimentary scan (valued at $15,000) + 40-min call` / `Results in ~1 week` | (no specific proposal) | `2-minute form` / `One workflow only` / `Fit reply within 48 hours` | **Codex only.** Simpler and more believable |
| "What happens next" steps | `Within 48 hours: We confirm your spot on the waitlist and begin your scan.`<br>`Day 3-5: Free 40-min strategy call...`<br>`Day 5-7: Your scan results... You keep everything.` | (no specific proposal) | `Within 48 hours: I confirm whether the workflow is a fit for the sprint.`<br>`Next step: We run a sprint diagnostic call and confirm scope, owner, and success metric.`<br>`If fit is real: We set a kickoff date for the next available sprint slot.` | **Codex only.** Operational path the site should actually be selling |

---

## 3. RESEARCH / ROI PAGE — `src/RoiCalculatorApp.tsx`

| Element | Current (exact) | Claude Opus 4.6 proposal | Codex proposal | Why |
|---|---|---|---|---|
| Page label ([L187](src/RoiCalculatorApp.tsx#L187)) | `RESEARCH LIBRARY` | (no specific proposal — keep as credibility page) | `WHY THE SPRINT WORKS` | **Codex only.** Ties the page to the offer instead of feeling like a detached library |
| H1 ([L188-190](src/RoiCalculatorApp.tsx#L188)) | `The gains are real. Most implementations are not.` | Keep as-is (strong line) | `AI can create real productivity gains. The mistake is trying to fix everything at once.` | **Disagreement.** Opus says keep; Codex rewrites to connect to the focused-offer logic. Current line is strong, but Codex's version sets up the sprint more directly |
| Intro body ([L191-197](src/RoiCalculatorApp.tsx#L191)) | `Stanford, Harvard, McKinsey, Anthropic, and the St. Louis Fed all confirm real productivity gains from AI. In the same years, 56% of CEOs report zero ROI and 42% of companies scrapped their AI projects entirely. The gap between what works and what gets shipped is where most teams lose.` | Keep as-is | `These studies are useful for sanity-checking the opportunity. They are not a substitute for scoping. Start with one workflow, one owner, and one metric.` | **Disagreement.** Opus keeps the researched statistics; Codex replaces them with a direct sales message. **Keep Opus's version** — the research IS the credibility layer. Move Codex's line to the next-step section |
| Next-step H2 ([L222-225](src/RoiCalculatorApp.tsx#L222)) | `If you already know which workflow is costing you the most time, that is the better place to start.` | Keep as-is | `If one workflow is already costing you time every week, skip the reading and start with the sprint.` | Both are fine; Codex's is more commercial. Pick whichever tone fits |
| Next-step body ([L226-231](src/RoiCalculatorApp.tsx#L226)) | `Research keeps the work honest, but it is not the work itself. If you have a specific workflow in mind, I scope it in weeks 1 and 2, help your team build and ship the fix through week 9, and measure the before-and-after numbers in week 10.` | Keep as-is | `The sprint exists to answer one question: is this workflow worth fixing, and what changes when it is live?` | Opus keeps the operational detail; Codex reframes around a single question. **Opus's version is more informative for a prospect deeper in the funnel** |
| Next-step CTA ([L233-235](src/RoiCalculatorApp.tsx#L233)) | `See How the Sprint Works` | `Apply for the 10-Week Sprint` (or `Join the Waitlist`) | `See the 10-week sprint` | Opus pushes conversion; Codex keeps consistency with homepage CTA. Match whichever you pick on the homepage |
| Footer strapline ([L247-249](src/RoiCalculatorApp.tsx#L247)) | `I help growing teams implement AI where it saves the most time.` | `I help ecommerce teams remove the workflow bottleneck that's costing them the most hours.` | (same treatment as homepage footer: `I help ecommerce and ops teams fix one painful workflow with AI in 10 weeks.`) | Both aligned. Codex adds timeframe |

---

## 4. CALCULATOR + FOLLOW-UP PAGES

Sources: `src/lib/roi-calculator.ts`, `src/DiagnosticLandingApp.tsx`, `/portfolio-reality-scan/`, `/operational-diagnostic/`, `/readiness-diagnostic/`

| Element | Current (exact) | Claude Opus 4.6 proposal | Codex proposal | Why |
|---|---|---|---|---|
| Route labels | `Transformation Office` / `Constraint Sprint` / `Measured Entry` / `Readiness` | Collapse to: `Plan A fit` / `Not ready yet` | Collapse to: `Sprint Fit` / `Not Ready Yet` | Both kill the old taxonomy. Codex's naming is cleaner |
| Calculator fit headline | `Your profile: focused bottleneck fit. One measurable AI system can improve your [bottleneck] workflow faster than a broad rollout.` | (no specific proposal) | `Your numbers support a focused 10-week sprint.` | **Codex only.** Answers one commercial question |
| Calculator headline metric | ROI multiplier (e.g. "1.2x ROI") | `Payback in X weeks. Defers Y hires worth $Z.` | (no specific proposal) | **Opus only.** Sub-2x ROI kills the deal; payback period + hire deferral is the same math framed as a no-brainer |
| Calculator not-ready headline | `Your profile points to readiness work before a retained AI program.` | (no specific proposal) | `You do not need a build yet. You need a clearer workflow, owner, and metric.` | **Codex only.** Removes old program language |
| Primary fit CTA | `Apply for the Operational Diagnostic` | Single CTA: `Apply for the 10-Week Sprint` | `Book your sprint diagnostic call` | Both consolidate to one CTA. Minor wording difference |
| Not-ready CTA | `Request the readiness diagnostic` | (no specific proposal) | `Get the workflow scoping checklist` | **Codex only.** A soft-no path should not pretend to be a second service line |
| Public route explanation | `A focused [bottleneck] bottleneck is more valuable than a broad transformation office at your current team shape.` | (no specific proposal) | `One scoped workflow is more defensible than a broad AI rollout for a team this size.` | **Codex only.** Removes transformation-office language |
| `/portfolio-reality-scan/` page | `AI PORTFOLIO REALITY SCAN` / `Board-ready AI portfolio baseline and first scale-or-kill decisions.` | (no specific proposal) | Remove from public funnel and redirect | **Codex only.** Old enterprise offer |
| `/operational-diagnostic/` eyebrow | `OPERATIONAL DIAGNOSTIC` | (no specific proposal) | `SPRINT DIAGNOSTIC` | **Codex only.** Match the actual public offer |
| `/operational-diagnostic/` H1 | `Scope one bottleneck, one metric, and one production system that moves the needle.` | (no specific proposal) | `Scope the one workflow worth fixing before you commit.` | **Codex only.** Less jargon |
| `/operational-diagnostic/` body | `This diagnostic is for teams that do not need a transformation office yet...` | (no specific proposal) | `In one call, we confirm the workflow, owner, baseline metric, and whether the sprint is a fit.` | **Codex only.** Removes old reference, tightens ask |
| `/operational-diagnostic/` chips | `1-2 workflow scope` / `Measured quick-win path` / `90-day production target` | (no specific proposal) | `1 workflow` / `1 owner` / `1 success metric` | **Codex only.** Aligned to core offer |
| `/operational-diagnostic/` CTA | `Apply for the Operational Diagnostic` | (no specific proposal) | `Book your sprint diagnostic call` | **Codex only.** Funnel consistency |
| `/readiness-diagnostic/` eyebrow | `READINESS DIAGNOSTIC` | (no specific proposal) | `NOT READY YET` | **Codex only.** Truthful deferral, not pseudo-offer |
| `/readiness-diagnostic/` H1 | `Clarify the first workflow worth measuring before you buy a bigger AI program.` | (no specific proposal) | `You do not need an AI build yet. You need a clearer workflow and owner.` | **Codex only.** More direct |
| `/readiness-diagnostic/` body | `This path is for companies where the immediate blocker is readiness...` | (no specific proposal) | `If you cannot name the workflow, the owner, and the metric, do that first. Then come back.` | **Codex only.** Stronger qualification |
| `/readiness-diagnostic/` CTA | `Request the readiness diagnostic` | (no specific proposal) | `Get the workflow scoping checklist` | **Codex only.** Avoids presenting readiness as a major service lane |

---

## 5. CROSS-PAGE STRUCTURAL FIXES

| Area | Current | Claude Opus 4.6 proposal | Codex proposal | Why |
|---|---|---|---|---|
| Page roles overlap | All 3 pages try to sell, educate, and qualify simultaneously | Homepage = pain + offer. What-we-do = mechanism. Research = credibility only | (implicit in per-section rewrites — all three pages should point to the sprint) | **Both aligned.** Each page needs one job |
| Buyer state contradiction | Homepage: "you don't know where to start" ([L449](src/App.tsx#L449)). Research: "you already know which workflow" ([L223](src/RoiCalculatorApp.tsx#L223)) | Commit site-wide to: **"You already know the bottleneck. You just haven't shipped a fix that stuck."** | (implicit — Codex's homepage bullet #4 rewrite aligns with research page) | **Both agree on the direction.** Adopt Opus's phrasing site-wide |
| Voice inconsistency | Homepage = "No BS" casual; research + follow-up pages still carry enterprise language (governance, portfolio, board-ready) | Remove all enterprise/governance language; keep founder-to-founder voice everywhere | (implicit — every Codex rewrite strips this language) | **Both aligned.** Codex's rewrites actually execute this |
| Client logo treatment | 16 logos shown equally with no context | Feature 3 with outcome blurbs, rest as secondary logo strip | (no specific proposal, but emphasizes verified case studies) | **Opus only.** Logo wall = noise |
| Retention mechanic | `No retainer, no lock-in.` | Add optional `$3,500/mo Post-Sprint Optimization` retainer at week 10 | `If workflow #2 is worth fixing, we scope the next sprint from the same baseline. No long-term contract required.` | **Disagreement.** Opus wants recurring revenue; Codex wants structured expansion. **Combine: lead with Codex's expansion framing, offer Opus's retainer as a sidebar option** |

---

## 6. PRIORITY ORDER (if time is limited)

| # | Action | Source | Effort | Impact |
|---|---|---|---|---|
| 1 | **Remove Plan B (AI Operations Team) block** from homepage | Both agents | Low | High — kills credibility drag |
| 2 | **Kill "Get Your $15,000 Scan — Free" CTA** on what-we-do | Both agents | Low | High — stops attracting bad leads |
| 3 | **Re-open the funnel** (either with paid $500 filter or with "applications open" copy) | Both agents | Low | High — dead funnel = no feedback |
| 4 | **Rewrite homepage pain bullet #4** to kill cross-page buyer-state contradiction | Both agents | Low | Medium |
| 5 | **Replace unbounded guarantee** with scoped version (pre-kickoff metric + 15% threshold + 30-day cap) | Both agents | Low | Medium — protects margin |
| 6 | **Add "Why not just hire an ops person?" FAQ** | Both agents | Low | Medium — addresses real competition |
| 7 | **Replace vanity proof with 3 verified named-client outcomes** (do NOT publish placeholders) | Both agents | Medium (requires verification) | Very high |
| 8 | **Rewrite the 6-step process as a sprint timeline** | Codex | Low | Medium |
| 9 | **Raise Plan A to $35K fixed** OR keep at $22K and fix the funnel first | Opus (raise) vs. Codex (keep) | Low | High either way — **your call** |
| 10 | **Rename calculator routes and remove `/portfolio-reality-scan/` page** | Codex | Medium | Medium |
| 11 | **Add founder bio** to homepage | Opus | Low | Medium |
| 12 | **Add optional post-sprint retainer** ($3-5K/mo) as upsell | Opus | Medium | Medium — recurring revenue |

---

## 7. REQUIRED PROOF BEFORE PUBLISHING NEW COPY

Do not publish invented case-study numbers. Replace placeholder proof lines only when you have verified results in this structure:

| Proof slot | Required format |
|---|---|
| Case study 1 | `[Brand] reduced [workflow] time by [X%] in [Y weeks]` |
| Case study 2 | `[Brand] removed [X] manual hours/week from [workflow]` |
| Case study 3 | `[Brand] delayed [1] hire by fixing [workflow]` |

---

## 8. WHERE THE TWO AGENTS DIVERGE (DECISION POINTS)

These are the items where you cannot adopt both — pick one:

| Decision | Opus says | Codex says | Recommended |
|---|---|---|---|
| Plan A price | Raise to $35K | Keep at $22K | **Fix the funnel first at $22K, raise when there's demand** |
| What-we-do H1 | Keep `You hired freelancers. Bought tools. Still no results?` | Replace with `One workflow is still broken. Let's fix that first.` | **Keep Opus's — it's emotionally stronger. A/B test later** |
| What-we-do CTA | `Book a Paid Strategy Call — $500` | `See the 10-week sprint` | **Codex for coherence; Opus if you need lead gen immediately** |
| Research page intro body | Keep research citations | Replace with direct sales message | **Keep Opus's — citations ARE the credibility** |
| Retention model | Add $3,500/mo retainer | Structured sprint #2 expansion | **Combine both — expansion as default, retainer as option** |

---

## SUMMARY

Both agents independently converged on the same core diagnosis:

- **Remove Plan B** from public site
- **Kill the $15K free scan** framing
- **Fix the cross-page buyer-state contradiction** (one buyer, one state, one pain)
- **Scope the guarantee** (metric + threshold + cap)
- **Re-open the funnel** (dead CTAs teach you nothing)
- **Replace vanity proof** with verified named-client outcomes
- **Add the hiring-alternative FAQ**
- **Strip enterprise/governance language** everywhere

The site should sell one thing clearly: **one painful workflow, one owner, one metric, one 10-week sprint.**
