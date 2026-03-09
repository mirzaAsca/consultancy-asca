import { useState } from 'react'
import type { FormEvent } from 'react'

const PRIMARY_EMAIL = 'advisory@enterprise-ai.consulting'
const SCORECARD_PDF = '/pilot-to-production-scorecard-board-ready-edition.pdf'
const PRIMARY_CTA = 'Apply for the AI Portfolio Reality Scan'
const MECHANISM_CTA = 'See how the office works'
const primaryButtonClass =
  'inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2'
const secondaryButtonClass =
  'inline-flex items-center justify-center text-sm font-medium text-[var(--accent)] underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]'
const surfaceClass = 'border border-[var(--line)] bg-[var(--surface)]'
const panelClass = `premium-panel ${surfaceClass} p-6`
const cardClass = `premium-card ${surfaceClass} p-5`
const listItemClass = `premium-card ${surfaceClass} px-4 py-3`
const sectionLabelClass =
  "inline-flex w-fit items-center border border-[var(--line)] bg-[rgba(255,255,255,0.9)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]"
const sectionHeadingClass =
  'mt-4 max-w-[18ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl'
const splitSectionClass = 'reveal border-b-2 border-[var(--line)] py-14 sm:py-16 lg:grid lg:grid-cols-12 lg:gap-8'
const heroHighlightClass = `premium-card ${surfaceClass} p-4`
const metaChipClass =
  "inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]"

const painPoints = [
  'AI pilots exist, but nobody can show clear business impact.',
  'Governance, security, and legal show up late - and slow everything down.',
  'Business, IT, and risk are all moving - but not together.',
  'Leadership is done with experiments. They want measurable results.',
]

const stallReasons = [
  'No system to decide what should scale and what should stop.',
  'No clear owner for cross-functional decisions.',
  'No quality check before AI touches your most important workflows.',
  'No adoption system to turn usage into sustained outcomes.',
]

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

const proofArtifacts = [
  'Portfolio dashboard snapshot (redacted)',
  'Use-case scoring model (impact x readiness x risk)',
  'Governance charter excerpt',
  'KPI tree and baseline logic',
  'Stage-gate production-readiness checklist',
  'Board-ready executive briefing outline',
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
const featuredProof = proofVisuals[0]
const supportingProofs = proofVisuals.slice(1)
const heroHighlights = [
  { label: '01', title: 'Portfolio register', detail: 'One view of initiatives, owners, and risk.' },
  { label: '02', title: 'KPI baseline', detail: 'Track value, speed, quality, and adoption.' },
  { label: '03', title: 'Decision pack', detail: 'Clear scale, stop, and governance actions.' },
]
const frameworkTags = ['NIST AI RMF', 'ISO/IEC 42001', 'OWASP LLM Top 10', 'EU AI Act ready']

const fitFor = [
  'Enterprises already investing in AI, with leadership that wants measurable results - fast.',
  'Teams ready to change workflows, not just buy more tools.',
  'An executive sponsor willing to bring business, IT, risk, and vendors into one operating rhythm.',
]

const fitNotFor = [
  'Teams looking for strategy sessions without follow-through.',
  'Companies that only want a chatbot build vendor.',
  'Organizations not willing to set clear rules about who decides what.',
]

const scanIncludes = [
  'Portfolio inventory across initiatives, tools, and owners',
  'Scale or stop prioritization decisions',
  'Risk and governance gap review',
  'KPI baseline design and value-tracking model',
  'Ninety-day action roadmap',
  'Executive decision debrief',
]

type Field =
  | 'fullName'
  | 'workEmail'
  | 'roleTitle'
  | 'company'
  | 'executiveSponsor'
  | 'aiInitiativeCount'
  | 'focusWorkflows'
  | 'biggestBlocker'
  | 'complianceConstraints'
  | 'timelineUrgency'
  | 'whyNow'

type FormState = Record<Field, string>

type ErrorState = Partial<Record<Field, string>>

const initialFormState: FormState = {
  fullName: '',
  workEmail: '',
  roleTitle: '',
  company: '',
  executiveSponsor: '',
  aiInitiativeCount: '',
  focusWorkflows: '',
  biggestBlocker: '',
  complianceConstraints: '',
  timelineUrgency: '',
  whyNow: '',
}

function buildMailto(form: FormState): string {
  const subject = encodeURIComponent(`AI Portfolio Reality Scan Application - ${form.company}`)
  const body = encodeURIComponent(
    [
      'AI Portfolio Reality Scan Application',
      '',
      `Full name: ${form.fullName}`,
      `Work email: ${form.workEmail}`,
      `Role/title: ${form.roleTitle}`,
      `Company: ${form.company}`,
      `Executive sponsor: ${form.executiveSponsor}`,
      `Number of active AI initiatives: ${form.aiInitiativeCount}`,
      `Top workflows/functions in focus: ${form.focusWorkflows}`,
      `Biggest blocker today: ${form.biggestBlocker}`,
      `Compliance/security constraints: ${form.complianceConstraints}`,
      `Timeline/urgency: ${form.timelineUrgency}`,
      `Why now: ${form.whyNow}`,
    ].join('\n'),
  )

  return `mailto:${PRIMARY_EMAIL}?subject=${subject}&body=${body}`
}

function inputClass(hasError: boolean): string {
  return `mt-1 w-full border bg-[rgba(255,255,255,0.94)] px-3 py-2 text-sm text-slate-950 outline-none shadow-[0_1px_0_rgba(255,255,255,0.65)] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[var(--accent)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(30,41,59,0.12)] ${
    hasError ? 'border-rose-500' : 'border-[var(--line)]'
  }`
}

export default function App() {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [errors, setErrors] = useState<ErrorState>({})
  const [submitted, setSubmitted] = useState(false)

  const ctaHref = '#apply'

  function updateField(field: Field, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => {
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  function validate(nextForm: FormState): ErrorState {
    const nextErrors: ErrorState = {}

    ;(Object.keys(nextForm) as Field[]).forEach((field) => {
      if (!nextForm[field].trim()) {
        nextErrors[field] = 'Required'
      }
    })

    if (nextForm.workEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextForm.workEmail)) {
      nextErrors.workEmail = 'Enter a valid work email'
    }

    return nextErrors
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(form)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitted(true)
    window.setTimeout(() => {
      window.location.href = buildMailto(form)
    }, 80)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:linear-gradient(to_bottom,black_18%,transparent_90%)]" />

      <main className="relative mx-auto w-full max-w-[1240px] px-6 pb-20 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <header className="reveal border-b-2 border-[var(--line)] pb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <nav className="flex flex-wrap gap-5 text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
              <a href="#mechanism" className="transition-colors hover:text-slate-900">
                Transformation Office
              </a>
              <a href="#proof" className="transition-colors hover:text-slate-900">
                Proof
              </a>
              <a href="#apply" className="transition-colors hover:text-slate-900">
                Apply
              </a>
            </nav>
            <a
              href={ctaHref}
              className={primaryButtonClass}
            >
              {PRIMARY_CTA}
            </a>
          </div>
        </header>

        <section id="overview" className={`${splitSectionClass} gap-8`}>
          <div className="lg:col-span-7">
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
            <div className="mt-6 flex flex-wrap gap-2">
              <span className={metaChipClass}>AI Portfolio Reality Scan</span>
              <span className={metaChipClass}>Decision Pack Guarantee</span>
              <span className={metaChipClass}>Board-ready artifacts</span>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <a
                href={ctaHref}
                className={primaryButtonClass}
              >
                {PRIMARY_CTA}
              </a>
              <a
                href="#mechanism"
                className={secondaryButtonClass}
              >
                {MECHANISM_CTA}
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              For enterprises already investing in AI - with leadership pressure to show real returns.
            </p>
          </div>

          <aside className={`lg:col-span-5 ${panelClass}`}>
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

        <section className="reveal delay-2 border-b-2 border-[var(--line)] py-14">
          <p className={sectionLabelClass}>YOU ARE HERE BECAUSE</p>
          <h2 className={sectionHeadingClass}>
            Your team is busy with AI. But nothing is making it to production.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-12">
            {painPoints.map((point) => (
              <article key={point} className={`md:col-span-6 ${cardClass}`}>
                <p className="text-sm leading-relaxed text-slate-700">{point}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 border border-slate-950 bg-slate-950 p-5 text-slate-100">
            <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-slate-300">STAKES AND COST OF INACTION</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              Every month without production AI is spent budget with no return. And EU AI Act obligations start
              hitting August 2, 2026 - ready or not.
            </p>
          </div>
        </section>

        <section className="reveal delay-3 border-b-2 border-[var(--line)] py-14">
          <p className={sectionLabelClass}>WHY MOST EFFORTS STALL</p>
          <h2 className={sectionHeadingClass}>
            Most AI programs fail for the same four reasons.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-12">
            {stallReasons.map((item) => (
              <article key={item} className={`md:col-span-6 ${cardClass}`}>
                <p className="text-sm leading-relaxed text-slate-700">{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="mechanism" className="reveal delay-4 border-b-2 border-[var(--line)] py-14">
          <p className={sectionLabelClass}>WHAT WE INSTALL</p>
          <h2 className={sectionHeadingClass}>
            Three things we put in place to make your AI program actually work.
          </h2>

          <div className="mt-8 grid gap-4 lg:grid-cols-12">
            {installBlocks.map((block, index) => (
              <article
                key={block.title}
                className={`h-full lg:col-span-4 ${cardClass}`}
              >
                <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium tracking-[0.18em] text-[var(--muted)]">00{index + 1}</p>
                <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.01em]">{block.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">{block.detail}</p>
              </article>
            ))}
          </div>

          <div className={panelClass + ' mt-8'}>
            <p className={sectionLabelClass}>MECHANISM FLOW</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Intake, prioritize, govern, oversee delivery, measure, then scale or retire.
            </p>
          </div>
        </section>

        <section className={splitSectionClass}>
          <div className="lg:col-span-7">
            <p className={sectionLabelClass}>FIRST 30 DAYS</p>
            <h2 className={sectionHeadingClass}>
              In 30 days, you'll have the clarity to make real decisions.
            </h2>
            <ul className="mt-7 space-y-3 text-sm leading-relaxed text-slate-700">
              {firstMonthDeliverables.map((item) => (
                <li key={item} className={listItemClass}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <aside className={`lg:col-span-5 ${panelClass}`}>
            <p className={sectionLabelClass}>TIMELINE</p>
            <dl className="mt-5 space-y-4 text-sm">
              {timeline.map((item) => (
                <div key={item.title} className="border-t border-[var(--line)] pt-4 first:border-t-0 first:pt-0">
                  <dt className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">{item.title}</dt>
                  <dd className="mt-2 leading-relaxed text-slate-800">{item.detail}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>

        <section id="proof" className={splitSectionClass}>
          <div className="lg:col-span-5">
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
            <div className="mt-8 space-y-3">
              {proofArtifacts.slice(0, 3).map((item) => (
                <article key={item} className={listItemClass}>
                  <p className="text-sm leading-relaxed text-slate-700">{item}</p>
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

          <div className="mt-8 grid gap-4 sm:grid-cols-12 lg:col-span-12 lg:grid-cols-12">
            {proofArtifacts.slice(3).map((item) => (
              <article key={item} className={`sm:col-span-6 lg:col-span-4 ${cardClass}`}>
                <p className="text-sm leading-relaxed text-slate-700">{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={splitSectionClass}>
          <div className="lg:col-span-6">
            <p className={sectionLabelClass}>FIT</p>
            <h3 className="mt-4 text-2xl font-semibold leading-[1.08] tracking-[-0.02em] [text-wrap:balance]">Who this is for</h3>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-slate-700">
              {fitFor.map((item) => (
                <li key={item} className={listItemClass}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-6">
            <p className={sectionLabelClass}>NOT A FIT</p>
            <h3 className="mt-4 text-2xl font-semibold leading-[1.08] tracking-[-0.02em] [text-wrap:balance]">Who this is not for</h3>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-slate-700">
              {fitNotFor.map((item) => (
                <li key={item} className={listItemClass}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="diagnostic" className={splitSectionClass}>
          <div className="lg:col-span-7">
            <p className={sectionLabelClass}>DIAGNOSTIC OFFER</p>
            <h2 className={sectionHeadingClass}>
              AI Portfolio Reality Scan: the fastest way to know what's working and what's not.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
              In 2-3 weeks, you get a clear view of your AI portfolio: what to keep, what to cut, where
              governance is weak, and what to do in the next 90 days.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700">
              You leave with the decision pack, whether or not we continue together.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <a
                href={ctaHref}
                className={primaryButtonClass}
              >
                {PRIMARY_CTA}
              </a>
              <a href={SCORECARD_PDF} download className={secondaryButtonClass}>
                Download Pilot-to-Production Scorecard
              </a>
            </div>
          </div>

          <aside className={`lg:col-span-5 ${panelClass}`}>
            <p className={sectionLabelClass}>WHAT IS INCLUDED</p>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-slate-700">
              {scanIncludes.map((item) => (
                <li key={item} className={listItemClass}>
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section id="apply" className="reveal py-14">
          <div className="grid gap-8 border-b-2 border-[var(--line)] pb-14 sm:pb-16 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className={sectionLabelClass}>APPLICATION</p>
              <h2 className={sectionHeadingClass}>
                Apply for the AI Portfolio Reality Scan
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
                This is for teams already doing AI work, with leadership pressure to show results. If it's a fit,
                we'll reach out within 48 business hours.
              </p>

              <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Full name
                    <input
                      className={inputClass(Boolean(errors.fullName))}
                      value={form.fullName}
                      onChange={(event) => updateField('fullName', event.target.value)}
                      autoComplete="name"
                      required
                    />
                    {errors.fullName ? <span className="text-xs text-rose-600">{errors.fullName}</span> : null}
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Work email
                    <input
                      className={inputClass(Boolean(errors.workEmail))}
                      value={form.workEmail}
                      onChange={(event) => updateField('workEmail', event.target.value)}
                      autoComplete="email"
                      required
                    />
                    {errors.workEmail ? <span className="text-xs text-rose-600">{errors.workEmail}</span> : null}
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Role or title
                    <input
                      className={inputClass(Boolean(errors.roleTitle))}
                      value={form.roleTitle}
                      onChange={(event) => updateField('roleTitle', event.target.value)}
                      required
                    />
                    {errors.roleTitle ? <span className="text-xs text-rose-600">{errors.roleTitle}</span> : null}
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Company
                    <input
                      className={inputClass(Boolean(errors.company))}
                      value={form.company}
                      onChange={(event) => updateField('company', event.target.value)}
                      required
                    />
                    {errors.company ? <span className="text-xs text-rose-600">{errors.company}</span> : null}
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Executive sponsor
                    <input
                      className={inputClass(Boolean(errors.executiveSponsor))}
                      value={form.executiveSponsor}
                      onChange={(event) => updateField('executiveSponsor', event.target.value)}
                      required
                    />
                    {errors.executiveSponsor ? (
                      <span className="text-xs text-rose-600">{errors.executiveSponsor}</span>
                    ) : null}
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Number of active AI initiatives
                    <input
                      className={inputClass(Boolean(errors.aiInitiativeCount))}
                      value={form.aiInitiativeCount}
                      onChange={(event) => updateField('aiInitiativeCount', event.target.value)}
                      required
                    />
                    {errors.aiInitiativeCount ? (
                      <span className="text-xs text-rose-600">{errors.aiInitiativeCount}</span>
                    ) : null}
                  </label>
                </div>

                <div className="grid gap-4">
                  <label className="text-sm font-medium text-slate-700">
                    Top 1-3 workflows or functions in focus
                    <textarea
                      className={inputClass(Boolean(errors.focusWorkflows))}
                      rows={3}
                      value={form.focusWorkflows}
                      onChange={(event) => updateField('focusWorkflows', event.target.value)}
                      required
                    />
                    {errors.focusWorkflows ? (
                      <span className="text-xs text-rose-600">{errors.focusWorkflows}</span>
                    ) : null}
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Biggest blocker today
                    <textarea
                      className={inputClass(Boolean(errors.biggestBlocker))}
                      rows={3}
                      value={form.biggestBlocker}
                      onChange={(event) => updateField('biggestBlocker', event.target.value)}
                      required
                    />
                    {errors.biggestBlocker ? (
                      <span className="text-xs text-rose-600">{errors.biggestBlocker}</span>
                    ) : null}
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Compliance or security constraints
                    <textarea
                      className={inputClass(Boolean(errors.complianceConstraints))}
                      rows={3}
                      value={form.complianceConstraints}
                      onChange={(event) => updateField('complianceConstraints', event.target.value)}
                      required
                    />
                    {errors.complianceConstraints ? (
                      <span className="text-xs text-rose-600">{errors.complianceConstraints}</span>
                    ) : null}
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Timeline and urgency
                    <select
                      className={inputClass(Boolean(errors.timelineUrgency))}
                      value={form.timelineUrgency}
                      onChange={(event) => updateField('timelineUrgency', event.target.value)}
                      required
                    >
                      <option value="">Select urgency</option>
                      <option value="Immediate (0-30 days)">Immediate (0-30 days)</option>
                      <option value="Near term (31-90 days)">Near term (31-90 days)</option>
                      <option value="This half (3-6 months)">This half (3-6 months)</option>
                      <option value="Exploratory (6+ months)">Exploratory (6+ months)</option>
                    </select>
                    {errors.timelineUrgency ? (
                      <span className="text-xs text-rose-600">{errors.timelineUrgency}</span>
                    ) : null}
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Why now
                    <textarea
                      className={inputClass(Boolean(errors.whyNow))}
                      rows={3}
                      value={form.whyNow}
                      onChange={(event) => updateField('whyNow', event.target.value)}
                      required
                    />
                    {errors.whyNow ? <span className="text-xs text-rose-600">{errors.whyNow}</span> : null}
                  </label>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    className={primaryButtonClass}
                  >
                    {PRIMARY_CTA}
                  </button>
                </div>

                {submitted ? (
                  <div className={`space-y-4 ${cardClass}`}>
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-slate-900">Application received</h3>
                    <p className="text-sm leading-relaxed text-slate-700">
                      Your email draft is ready. If it did not open, use the link below. We respond within 48 business
                      hours.
                    </p>
                    <a
                      href={buildMailto(form)}
                      className={primaryButtonClass}
                    >
                      Open email draft again
                    </a>
                    <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                      <div className={heroHighlightClass}>
                        <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Within 48 hours</p>
                        <p className="mt-2">Fit review and reply.</p>
                      </div>
                      <div className={heroHighlightClass}>
                        <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Week one</p>
                        <p className="mt-2">Scope call and access checklist.</p>
                      </div>
                      <div className={heroHighlightClass}>
                        <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Weeks two to three</p>
                        <p className="mt-2">Reality Scan and decision pack.</p>
                      </div>
                    </div>
                    <div className={`${heroHighlightClass} text-sm leading-relaxed text-slate-700`}>
                      Prepare your initiative list, owners, top workflows, and baseline KPI reports.
                    </div>
                    <a
                      href={SCORECARD_PDF}
                      download
                      className={secondaryButtonClass}
                    >
                      Download Pilot-to-Production Scorecard
                    </a>
                    <p className="text-sm text-slate-600">
                      Support: <a className="font-medium text-slate-900" href={`mailto:${PRIMARY_EMAIL}`}>{PRIMARY_EMAIL}</a>
                    </p>
                  </div>
                ) : null}
              </form>
            </div>

            <aside className={`h-fit lg:col-span-5 lg:sticky lg:top-8 ${panelClass}`}>
              <p className={sectionLabelClass}>WHAT HAPPENS NEXT</p>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-700">
                <div className="border-t border-[var(--line)] pt-4 first:border-t-0 first:pt-0">
                  <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Within 48 business hours</p>
                  <p className="mt-2">Application fit review and response.</p>
                </div>
                <div className="border-t border-[var(--line)] pt-4">
                  <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Week one</p>
                  <p className="mt-2">Scoping call, stakeholder alignment, and access checklist.</p>
                </div>
                <div className="border-t border-[var(--line)] pt-4">
                  <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Weeks two to three</p>
                  <p className="mt-2">Reality Scan execution and executive decision pack delivery.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <footer className="reveal mt-4 flex flex-col gap-4 border-t-2 border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
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
