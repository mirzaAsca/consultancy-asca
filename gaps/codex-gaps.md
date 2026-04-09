**Assumption**

The business idea is the AI consultancy described in [claude-opus-calculator-and-service-guide.md:102](/Users/mirzaasceric/Desktop/consultancy-asca/claude-opus-calculator-and-service-guide.md#L102) and sold on the site in [src/App.tsx:162](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L162): a mix of enterprise “Transformation Office,” smaller bottleneck-removal sprints, and a portfolio-level AI offer.

**Brutal Thesis**

The problem is real. Your business is the weak part.

You are trapped between two markets:
- Enterprises can pay, but they will default to incumbents, known vendors, or internal teams.
- Smaller companies will listen, but many won’t support the pricing, delivery complexity, or trust requirements of the enterprise story.

Most likely outcome: not a breakout consultancy. A custom AI/automation agency with messy positioning, long sales cycles, thin proof, and founder-heavy delivery.

**Market Failure Points**

1. `You are selling multiple businesses at once`
Evidence: the repo splits into `Transformation Office`, `Constraint Sprint`, and `Not Now` routes in [claude-opus-calculator-and-service-guide.md:102](/Users/mirzaasceric/Desktop/consultancy-asca/claude-opus-calculator-and-service-guide.md#L102), while the live site sells `COMMAND ROOM`, `10X EMPIRE`, and `PORTFOLIO ENGINE` in [src/App.tsx:162](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L162). Those are different buyers, budgets, proof requirements, and delivery models.
Kill likelihood: `85%`
What it would take: pick one ICP, one painful use case, one offer, one sales motion for 12 months.

2. `The pain is real, but not automatically budgetable for a new boutique`
Evidence: PwC’s 2026 CEO survey says 56% of CEOs report no revenue or cost benefit from AI. McKinsey’s 2025 global survey says only 39% report any enterprise EBIT impact, and only a small top tier sees substantial value. That is not a “shut up and take my money” market. It is a skeptical market demanding proof.
Kill likelihood: `80%`
What it would take: sell one narrow, measured business outcome with a hard baseline and a referenceable case, not “AI transformation.”

3. `Similar solutions already fail all the time, which makes your pitch harder, not easier`
Evidence: Gartner said in July 2024 that 30% of GenAI projects would be abandoned after PoC by end-2025, and in February 2025 said 60% of AI projects without AI-ready data would be abandoned through 2026. BCG said in October 2024 that 74% of companies still had not shown tangible AI value. That means buyers have learned to distrust this category.
Kill likelihood: `90%`
What it would take: own data readiness, workflow selection, and adoption in one bounded environment before claiming transformation capability.

4. `Your lead magnet is for researchers and browsers, not enterprise buying groups`
Evidence: 6sense’s 2025 buyer report says average B2B buying cycles are 10.1 months, with 10.1 people involved, buyers evaluating 5.1 vendors on average, and buyers usually contacting vendors late. Salesforce’s CEB summary says purchase likelihood drops sharply as stakeholder count rises and the biggest competitor is often “do nothing.” Your current lead flow is a mailto-based waitlist form in [src/components/WaitlistForm.tsx:62](/Users/mirzaasceric/Desktop/consultancy-asca/src/components/WaitlistForm.tsx#L62).
Kill likelihood: `75%`
What it would take: account-based outbound, warm intros, partner channels, and human-led executive qualification.

5. `The mid-market path likely will not clear the budget hurdle`
Evidence: the “Constraint Sprint” target is 10-150 employees in [claude-opus-calculator-and-service-guide.md:147](/Users/mirzaasceric/Desktop/consultancy-asca/claude-opus-calculator-and-service-guide.md#L147), while pricing starts at $22k/month in [src/App.tsx:166](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L166). Microsoft removed the 300-seat minimum for Copilot and sells to SMBs through partners, which gives smaller firms a direct platform alternative. Your own `todo` already hints at price pressure with `$18,900/monthly` in [todo:9](/Users/mirzaasceric/Desktop/consultancy-asca/todo#L9).
Kill likelihood: `70%`
What it would take: fixed-price diagnostic or one-workflow implementation, not an open-ended retainer.

**Execution Failure Points**

1. `You are underestimating delivery scope by an entire team`
Evidence: your own enterprise offer includes portfolio governance, stage gates, policy/control systems, executive cadence, implementation oversight, training, telemetry, and cross-functional coordination in [claude-opus-calculator-and-service-guide.md:116](/Users/mirzaasceric/Desktop/consultancy-asca/claude-opus-calculator-and-service-guide.md#L116). Deloitte and IBM already package this with governance programs, enterprise inventories, workflows, questionnaires, and dashboards. This is not one founder plus a few engineers.
Kill likelihood: `95%`
What it would take: either build a serious bench or narrow the service to one function and one repeatable use case.

2. `Your proof is not enterprise-grade`
Evidence: the repo itself flags weak, mismatched, and incorrect claims in [website-transcript-comparison.md:101](/Users/mirzaasceric/Desktop/consultancy-asca/website-transcript-comparison.md#L101). It also calls out unverified on-page proof claims, while the live page still shows `$1M+ ARR`, `25+ companies`, and `20B+ tokens` in [src/App.tsx:503](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L503). Enterprise buyers will read this as marketing inflation.
Kill likelihood: `90%`
What it would take: 2-3 referenceable case studies, named baselines, legally usable logos, and metrics someone else can verify.

3. `Your commercial ops are not real yet`
Evidence: the form pipes leads into `mailto:` in [src/components/WaitlistForm.tsx:103](/Users/mirzaasceric/Desktop/consultancy-asca/src/components/WaitlistForm.tsx#L103) and submission just redirects the browser in [src/components/WaitlistForm.tsx:163](/Users/mirzaasceric/Desktop/consultancy-asca/src/components/WaitlistForm.tsx#L163). No CRM, no routing, no meeting workflow, no visible procurement/security pack. That is an inbox, not a sales system.
Kill likelihood: `80%`
What it would take: CRM, qualification stages, scheduling, proposal workflow, MSA/DPA/SOW templates, vendor-security materials.

4. `Your background signal does not cleanly match the buyer you want`
Evidence: the target buyer is regulated and enterprise-scale in [claude-opus-calculator-and-service-guide.md:106](/Users/mirzaasceric/Desktop/consultancy-asca/claude-opus-calculator-and-service-guide.md#L106). But the site’s logos skew ecommerce/Shopify/operator in [src/App.tsx:8](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L8), and your own `todo` says your specialties are workflow automation, chatbots, Shopify ecosystem work, and SEO/GEO in [todo:22](/Users/mirzaasceric/Desktop/consultancy-asca/todo#L22). That is not the same thing as being trusted to run AI governance across business, IT, risk, and legal for a 5,000-person regulated company.
Kill likelihood: `85%`
What it would take: either stay in operator/workflow automation where the proof matches, or add senior enterprise operators with regulated references.

5. `Your timeline assumptions are fantasy`
Evidence: you promise governance running within 30 days and a production-ready workflow within 90 days in [src/App.tsx:285](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L285) and [src/App.tsx:537](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L537). Gartner’s 2024 survey said average AI prototype-to-production time was about eight months. 6sense says the buying cycle alone averages 10.1 months. Your promise is shorter than the client’s internal process.
Kill likelihood: `85%`
What it would take: sell the diagnostic first, then a scoped design partner. Stop promising broad production on a landing page.

**Competition Failure Points**

1. `The incumbents already do your exact pitch`
Evidence: IBM says it has 65k consultants trained in genAI, 21k+ data and AI practitioners, and 4,000+ client transformations. Accenture says it has lessons from 2,000+ genAI projects and keeps expanding with Anthropic/Google partnerships. Deloitte already markets AI governance programs with inventories, policies, controls, and monitoring. That is your offer, with more proof and lower perceived risk.
Kill likelihood: `95%`
What it would take: a niche incumbents do not care about, where speed and specificity beat scale.

2. `Buyers prefer known vendors and incumbents`
Evidence: Gartner said on January 16, 2026 that AI will often be sold by companies’ incumbent software providers rather than bought as new moonshot projects. 6sense says buyers usually shortlist vendors they already know and often contact the eventual winner first. You are fighting default behavior.
Kill likelihood: `90%`
What it would take: enter through partner ecosystems, existing vendor stacks, or warm networks rather than cold category creation.

3. `Platform vendors are collapsing your differentiation`
Evidence: Microsoft now sells Copilot to organizations of all sizes, no 300-seat minimum, with partner support, adoption kits, security guidance, dashboards for readiness and impact, and admin controls. OpenAI is increasingly relying on major consultancies for enterprise implementation. Your “we govern, deploy, measure, and train” layer is becoming bundled.
Kill likelihood: `85%`
What it would take: own something platform vendors do not: proprietary data, a vertical workflow engine, or exclusive domain implementation IP.

4. `You are ignoring enterprise readiness as a moat`
Evidence: Gartner has explicitly warned that some AI vendors are innovation-ready but not enterprise-ready. Deloitte/IBM governance materials include policy enforcement, auditability, risk workflows, questionnaires, and controls. Your repo shows marketing, pricing, and intake. It does not show visible enterprise trust assets.
Kill likelihood: `80%`
What it would take: security posture, insurance, partner badges, procurement readiness, and reference customers.

**Business Model Failure Points**

1. `Plan B economics look fake`
Evidence: `10X EMPIRE` is priced at `$290,000/mo` while promising `20–30 dedicated AI engineers` plus strategy and an external team in [src/App.tsx:194](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L194). Your own calculator assumes 25 AI engineers at $240k/year plus a $425k CAIO in [src/lib/roi-calculator.ts:1](/Users/mirzaasceric/Desktop/consultancy-asca/src/lib/roi-calculator.ts#L1) and [src/lib/roi-calculator.ts:743](/Users/mirzaasceric/Desktop/consultancy-asca/src/lib/roi-calculator.ts#L743). Your own site also says in-house salary alone is `$400K–$720K/mo` in [src/App.tsx:198](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L198). The gross margin story does not survive basic math.
Kill likelihood: `95%`
What it would take: stop selling headcount theater. Sell a smaller pod or a software-enabled managed service.

2. `Plan A is founder-heavy consulting dressed up as leverage`
Evidence: the $22k/month plan includes weekly exec sessions, governance, dashboards, training, and “fix what’s broken” in [src/App.tsx:174](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L174). That is senior labor. I do not see a product moat in the repo that makes margins improve as volume grows.
Kill likelihood: `85%`
What it would take: one productized diagnostic, one scoped implementation, and ruthless refusal of custom sprawl.

3. `You are ignoring CAC and runway`
Evidence: 6sense’s 2025 report points to 10.1-month cycles, 10.1-person buying groups, and ~5 vendors evaluated. That means long pre-sales, lots of unpaid discovery, and expensive deal slippage. A calculator plus LinkedIn content is not a cheap path to enterprise revenue.
Kill likelihood: `90%`
What it would take: assume 6-12 months to close, fund the runway, and build a deliberate enterprise GTM instead of hoping content converts.

4. `Retention is structurally weak`
Evidence: your model assumes continuity retainers after diagnostics and quick wins in [claude-opus-calculator-and-service-guide.md:134](/Users/mirzaasceric/Desktop/consultancy-asca/claude-opus-calculator-and-service-guide.md#L134) and [claude-opus-calculator-and-service-guide.md:178](/Users/mirzaasceric/Desktop/consultancy-asca/claude-opus-calculator-and-service-guide.md#L178). But if you succeed, clients can internalize the capability or hand expansion to IBM/Accenture/Microsoft/their existing SI. If you fail, ROI pressure kills the contract. There is no durable moat here unless you own a recurring system they rely on.
Kill likelihood: `75%`
What it would take: attach renewal to a proprietary platform, data layer, or managed operations capability they do not want to rebuild.

5. `Gainshare will become a measurement fight`
Evidence: the site proposes `base retainer + 10–20% of documented savings` in [src/App.tsx:228](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L228). Your own research already admits gainshare only works for highly measurable workflows and needs strict baseline rules in [claude-opus-calculator-and-service-guide.md:78](/Users/mirzaasceric/Desktop/consultancy-asca/claude-opus-calculator-and-service-guide.md#L78). In enterprise environments, attribution gets messy fast.
Kill likelihood: `70%`
What it would take: only use gainshare on narrow, audited workflows with pre-agreed measurement rules.

**Most Likely Failure Sequence**

1. The site attracts curiosity from smaller firms and “AI interested” operators, not enterprise buyers with budget authority.
2. Real enterprises like the framing but ask for proof, references, security, legal, and partner credibility you do not yet have.
3. To keep revenue moving, you accept smaller bespoke projects.
4. Bespoke delivery consumes founder time, so proof does not compound and enterprise readiness never catches up.
5. You end up as a custom automation shop with premium enterprise copy.

**Bottom Line**

The killer isn’t lack of demand. It’s lack of wedge.

If you keep this as a broad “AI transformation office” business, incumbents kill you.
If you push down-market to get traction, pricing and delivery kill you.
If you try to do both, focus kills you.

**Sources**

- [PwC 2026 Global CEO Survey](https://www.pwc.com/gx/en/issues/c-suite-insights/ceo-survey.html)
- [McKinsey State of AI 2025](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai/)
- [BCG: 74% of Companies Struggle to Achieve and Scale Value](https://www.bcg.com/press/24october2024-ai-adoption-in-2024-74-of-companies-struggle-to-achieve-and-scale-value)
- [Gartner: 48% of AI Projects Make It Into Production](https://www.gartner.com/en/newsroom/press-releases/2024-05-07-gartner-survey-finds-generative-ai-is-now-the-most-frequently-deployed-ai-solution-in-organizations)
- [Gartner: 30% of GenAI Projects Will Be Abandoned After PoC](https://www.gartner.com/en/newsroom/press-releases/2024-07-29-gartner-predicts-30-percent-of-generative-ai-projects-will-be-abandoned-after-proof-of-concept-by-end-of-2025)
- [Gartner: 60% of AI Projects Without AI-Ready Data Will Be Abandoned](https://www.gartner.com/en/newsroom/press-releases/2025-02-26-lack-of-ai-ready-data-puts-ai-projects-at-risk)
- [6sense 2025 Buyer Experience Report](https://6sense.com/science-of-b2b/the-2025-b2b-buyer-experience-report/)
- [Salesforce / Challenger Customer Summary](https://www.salesforce.com/ca/hub/sales/channel-sales-management/)
- [ITPro on Gartner 2026 AI Spending and Incumbent Vendors](https://www.itpro.com/business/business-strategy/ai-investment-increase-2026-gartner)
- [IBM AI Leadership](https://www.ibm.com/consulting/ai-leadership)
- [Accenture: Making Reinvention Real With Gen AI](https://www.accenture.com/sk-en/insights/consulting/making-reinvention-real-with-gen-ai)
- [Deloitte / IBM Trustworthy AI Services](https://www2.deloitte.com/content/dam/Deloitte/us/Documents/consulting/us-deloitte-ibm-trustworthy-ai-services.pdf)
- [Microsoft: Expanding Copilot for Microsoft 365](https://techcommunity.microsoft.com/blog/microsoft365copilotblog/expanding-availability-of-copilot-for-microsoft-365/4017756)

1. If you want, I can turn this into a `kill test`: the exact 10 customer interviews, 3 offer experiments, and 5 proof assets you would need before building further.
2. If you want, I can also give you the opposite view: the only narrow version of this idea that might actually work.