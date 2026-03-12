import SiteHeader from './components/SiteHeader'
import WarpedGrid from './components/WarpedGrid'

const PRIMARY_EMAIL = 'advisory@enterprise-ai.consulting'
const PRIMARY_CTA = 'Apply for the AI Portfolio Reality Scan'
const MECHANISM_CTA = 'See how the office works'
const primaryButtonClass =
  'inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2'
const secondaryButtonClass =
  'inline-flex items-center justify-center text-sm font-medium text-[var(--accent)] underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]'
const surfaceClass = 'border border-[var(--line)] bg-[var(--surface)]'
const panelClass = `premium-panel ${surfaceClass} p-6`
const cardClass = `premium-card ${surfaceClass} p-5`
const listItemClass = `premium-card ${surfaceClass} px-4 py-3`
const sectionLabelClass =
  "inline-flex w-fit items-center bg-white px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]"
const sectionHeadingClass =
  'mt-4 max-w-[18ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl'
const splitSectionClass = 'reveal border-b-[3px] border-[var(--line)] py-14 sm:py-16 lg:grid lg:grid-cols-12 lg:gap-8'
const heroHighlightClass = `premium-card ${surfaceClass} p-4`
const metaChipClass =
  "inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]"

const installBlocks = [
  {
    title: 'One Portfolio View',
    detail:
      'Every AI project in one place - with clear owners, expected value, risk level, and current status.',
  },
  {
    title: 'Regular Decision Rhythm',
    detail:
      'Scheduled reviews where business, IT, and risk leaders make clear go/stop/fix decisions together.',
  },
  {
    title: 'Delivery Accountability',
    detail:
      "We track what's live, what's being used, and whether each project should grow, stop, or be redesigned.",
  },
]

const mechanismFlow = [
  {
    step: '01',
    title: 'Intake',
    detail: 'Capture initiatives, owners, and workflow scope.',
  },
  {
    step: '02',
    title: 'Prioritize',
    detail: 'Rank by impact, readiness, and risk.',
  },
  {
    step: '03',
    title: 'Govern',
    detail: 'Set decision rights, controls, and review points.',
  },
  {
    step: '04',
    title: 'Oversee Delivery',
    detail: 'Track build progress and production readiness.',
  },
  {
    step: '05',
    title: 'Measure',
    detail: 'Monitor KPI, adoption, and business value.',
  },
  {
    step: '06',
    title: 'Scale or Retire',
    detail: 'Expand winners. Stop weak bets.',
  },
]

const firstMonthDeliverables = [
  "A single list of every AI project - who owns it, what it's worth, and how risky it is.",
  'Clear recommendations: what to scale, what to stop, and what to do next.',
  'A draft governance charter - who decides what, and when.',
  'Baseline metrics so you can track whether AI is actually creating value.',
  'A 90-day action plan that business, IT, and risk can all follow together.',
]

const timeline = [
  {
    title: 'First 30 Days',
    detail: 'You have a decision pack: what you have, what matters, who decides, and what to do next.',
  },
  {
    title: 'First 90 Days',
    detail: 'Governance is running, and 1-2 initiatives are moving on a clear path to production.',
  },
  {
    title: '6 Months',
    detail: 'Several AI workflows are live, with visible impact on speed, cost, quality, and adoption.',
  },
  {
    title: '12 Months',
    detail: 'AI runs as a governed operating capability with measurable business returns.',
  },
]

const proofEvidence = [
  {
    title: 'Portfolio dashboard snapshot',
    detail: 'Redacted board view of initiatives, owners, status, and risk concentration.',
  },
  {
    title: 'Use-case scoring model',
    detail: 'Impact, readiness, and risk logic used to rank what scales and what stops.',
  },
  {
    title: 'Governance charter excerpt',
    detail: 'Decision map showing who approves, who reviews, and when controls apply.',
  },
]

const proofVisuals = [
  {
    title: 'Portfolio control dashboard',
    src: '/proof-portfolio-dashboard.svg',
    summary: 'Single view of active initiatives, owners, risk, and the next executive decision.',
  },
  {
    title: 'Governance charter and decision map',
    src: '/proof-governance-charter.svg',
    summary: 'Clear ownership, escalation paths, and review points across business, IT, and risk.',
  },
  {
    title: 'KPI tree and value baseline',
    src: '/proof-kpi-tree.svg',
    summary: 'Baseline metrics that connect AI activity to cost, speed, quality, and adoption outcomes.',
  },
]

const heroHighlights = [
  { label: '01', title: 'Portfolio register', detail: 'One view of initiatives, owners, and risk.' },
  { label: '02', title: 'KPI baseline', detail: 'Track value, speed, quality, and adoption.' },
  { label: '03', title: 'Decision pack', detail: 'Clear scale, stop, and governance actions.' },
]

const frameworkTags = ['NIST AI RMF', 'ISO/IEC 42001', 'OWASP LLM Top 10', 'EU AI Act ready']

const featuredProof = proofVisuals[0]
const supportingProofs = proofVisuals.slice(1)

export default function WhatWeDoApp() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0))]" />
      <WarpedGrid />

      <main className="relative mx-auto w-full max-w-[1240px] px-6 pb-20 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <SiteHeader
          applyHref="/#apply"
          ctaHref="/#apply"
          homeHref="/"
          primaryButtonClassName={primaryButtonClass}
          primaryCtaLabel={PRIMARY_CTA}
          proofHref="#proof"
          transformationOfficeHref="#mechanism"
          whatWeDoHref="/how-we-work/"
        />

        <section id="overview" className={`${splitSectionClass} gap-8`}>
          <div className="flex h-full flex-col lg:col-span-7 lg:pr-6">
            <div>
              <p className={sectionLabelClass}>ENTERPRISE AI TRANSFORMATION OFFICE</p>
              <h1 className="mt-6 max-w-[11ch] text-4xl font-semibold leading-[1.01] tracking-[-0.04em] [text-wrap:balance] sm:text-5xl lg:text-[4rem]">
                Stop running AI experiments.{' '}
                <span className="bg-[var(--accent)] px-[0.08em] text-white [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                  Start shipping AI results.
                </span>
              </h1>
              <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-slate-700">
                We set up and run the operating system your AI program is missing. One portfolio. One decision
                rhythm. One source of truth - so business, IT, and risk move together, and AI starts producing
                measurable outcomes instead of more pilots.
              </p>
            </div>

            <div className="mt-8 space-y-4 lg:mt-auto lg:pt-10">
              <div className="flex flex-wrap gap-2">
                <span className={metaChipClass}>AI Portfolio Reality Scan</span>
                <span className={metaChipClass}>Decision Pack Guarantee</span>
                <span className={metaChipClass}>Board-ready artifacts</span>
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <a href="/#apply" className={primaryButtonClass}>
                  {PRIMARY_CTA}
                </a>
                <a href="#mechanism" className={secondaryButtonClass}>
                  {MECHANISM_CTA}
                </a>
              </div>
              <p className="text-sm text-slate-600">
                For enterprises already investing in AI - with leadership pressure to show real returns.
              </p>
            </div>
          </div>

          <aside className={`flex h-full flex-col lg:col-span-5 ${panelClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={sectionLabelClass}>START HERE</p>
              <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                2-3 weeks
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={metaChipClass}>AI Portfolio Reality Scan</span>
              <span className={metaChipClass}>Keep the decision pack</span>
            </div>
            <figure className="artifact-shell mt-6 border border-[var(--line)]">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2">
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Board artifact preview
                </p>
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Redacted
                </p>
              </div>
              <img src={featuredProof.src} alt={featuredProof.title} className="h-auto w-full" loading="eager" />
            </figure>
            <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.02em] [text-wrap:balance]">
              Board-ready view of your AI portfolio.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              In 2-3 weeks, leadership gets one clear picture of active AI work, the biggest governance gaps, and
              what to scale, stop, or fix next.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {heroHighlights.map((item) => (
                <div key={item.label} className={heroHighlightClass}>
                  <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                    {item.label}
                  </p>
                  <p className="mt-3 text-sm font-medium tracking-[-0.01em] text-slate-900">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.detail}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section id="mechanism" className="reveal delay-4 border-b-[3px] border-[var(--line)] py-14">
          <p className={sectionLabelClass}>WHAT WE INSTALL</p>
          <h2 className={sectionHeadingClass}>
            Three things we put in place to make your AI program actually work.
          </h2>

          <div className="mt-8 grid gap-4 lg:grid-cols-12">
            {installBlocks.map((block, index) => (
              <article key={block.title} className={`h-full lg:col-span-4 ${cardClass}`}>
                <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium tracking-[0.18em] text-[var(--muted)]">
                  00{index + 1}
                </p>
                <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.01em]">{block.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">{block.detail}</p>
              </article>
            ))}
          </div>

          <div className={panelClass + ' mt-8'}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={sectionLabelClass}>MECHANISM FLOW</p>
                <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-slate-700">
                  One operating sequence for every AI initiative, from first intake through scale or retirement.
                </p>
              </div>
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                6-step operating rail
              </p>
            </div>

            <ol className="mt-8 space-y-5 lg:hidden">
              {mechanismFlow.map((item, index) => (
                <li key={item.step} className="relative pl-12">
                  {index < mechanismFlow.length - 1 ? (
                    <div className="absolute bottom-[-1.4rem] left-4 top-9 border-l border-[var(--line)]" />
                  ) : null}
                  <div
                    className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-medium tracking-[0.12em] ${
                      index === mechanismFlow.length - 1
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : 'border-[var(--line)] bg-white text-[var(--muted)]'
                    } font-['IBM_Plex_Mono']`}
                  >
                    {item.step}
                  </div>
                  <p className="text-base font-semibold tracking-[-0.01em] text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.detail}</p>
                </li>
              ))}
            </ol>

            <ol className="relative mt-9 hidden lg:grid lg:grid-cols-6 lg:gap-4">
              <div className="pointer-events-none absolute left-4 right-4 top-4 border-t border-[var(--line)]" />
              {mechanismFlow.map((item, index) => (
                <li key={item.step} className="relative">
                  <div
                    className={`relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-medium tracking-[0.12em] ${
                      index === mechanismFlow.length - 1
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : 'border-[var(--line)] bg-white text-[var(--muted)]'
                    } font-['IBM_Plex_Mono']`}
                  >
                    {item.step}
                  </div>
                  <div className="mt-5 max-w-[16ch]">
                    <p className="text-base font-semibold tracking-[-0.01em] text-slate-950">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={splitSectionClass}>
          <div className="flex h-full flex-col lg:col-span-7 lg:pr-4">
            <p className={sectionLabelClass}>FIRST 30 DAYS</p>
            <h2 className={sectionHeadingClass}>
              In 30 days, you'll have the clarity to make real decisions.
            </h2>
            <ul className="mt-7 space-y-3 text-sm leading-relaxed text-slate-700 lg:mt-auto">
              {firstMonthDeliverables.map((item) => (
                <li key={item} className={listItemClass}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <aside className={`flex h-full flex-col lg:col-span-5 ${panelClass}`}>
            <p className={sectionLabelClass}>TIMELINE</p>
            <dl className="mt-5 flex flex-1 flex-col text-sm">
              {timeline.map((item) => (
                <div key={item.title} className="flex-1 border-t border-[var(--line)] pt-4 first:border-t-0 first:pt-0">
                  <dt className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">{item.title}</dt>
                  <dd className="mt-2 leading-relaxed text-slate-800">{item.detail}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>

        <section id="proof" className={splitSectionClass}>
          <div className="flex h-full flex-col lg:col-span-5 lg:pr-4">
            <div>
              <p className={sectionLabelClass}>PROOF</p>
              <h2 className={sectionHeadingClass}>
                We prove our work with real artifacts - not slide decks.
              </h2>
              <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-slate-700">
                We show working artifacts: dashboards, scorecards, KPI trees, and governance documents. Our delivery
                aligns with NIST AI RMF, ISO/IEC 42001, OWASP LLM Top 10, and EU AI Act requirements, including
                August 2, 2026 readiness where relevant.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {frameworkTags.map((tag) => (
                  <span key={tag} className={metaChipClass}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 space-y-4 border-t border-[var(--line)] pt-5 lg:mt-auto">
              {proofEvidence.map((item) => (
                <article key={item.title} className="border-b border-[var(--line)] pb-4 last:border-b-0 last:pb-0">
                  <p className="text-sm font-medium tracking-[-0.01em] text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:col-span-7 lg:mt-0 lg:grid-cols-12">
            <article className={`artifact-shell overflow-hidden lg:col-span-12 ${surfaceClass}`}>
              <img src={featuredProof.src} alt={featuredProof.title} className="h-auto w-full" loading="lazy" />
              <div className="border-t border-[var(--line)] px-5 py-4">
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Featured artifact
                </p>
                <p className="text-base font-semibold tracking-[-0.01em] text-slate-900">{featuredProof.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{featuredProof.summary}</p>
              </div>
            </article>

            {supportingProofs.map((item) => (
              <article key={item.title} className={`artifact-shell overflow-hidden lg:col-span-6 ${surfaceClass}`}>
                <img src={item.src} alt={item.title} className="h-auto w-full" loading="lazy" />
                <div className="border-t border-[var(--line)] px-4 py-3">
                  <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                    Supporting artifact
                  </p>
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="reveal mt-4 flex flex-col gap-4 border-t-[3px] border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={`mailto:${PRIMARY_EMAIL}`}
            className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
          >
            {PRIMARY_EMAIL}
          </a>
          <p className="text-sm text-slate-600">One service. One starting point. One clear way to work together.</p>
        </footer>
      </main>
    </div>
  )
}
