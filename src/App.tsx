import { useState } from 'react'
import type { FormEvent } from 'react'

const PRIMARY_EMAIL = 'advisory@enterprise-ai.consulting'
const SCORECARD_PDF = '/pilot-to-production-scorecard-board-ready-edition.pdf'
const PRIMARY_CTA = 'Apply for the AI Portfolio Reality Scan'
const MECHANISM_CTA = 'See how the office works'

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
  },
  {
    title: 'Governance charter and decision map',
    src: '/proof-governance-charter.svg',
  },
  {
    title: 'KPI tree and value baseline',
    src: '/proof-kpi-tree.svg',
  },
]

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
  return `w-full border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-600 ${
    hasError ? 'border-rose-500' : 'border-slate-300'
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(148,163,184,0.3),transparent_36%),radial-gradient(circle_at_8%_14%,rgba(148,163,184,0.18),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(30,41,59,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,41,59,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:linear-gradient(to_bottom,black_18%,transparent_90%)]" />

      <main className="relative mx-auto w-full max-w-7xl px-6 pb-16 pt-8 sm:px-10 lg:px-14 lg:pt-12">
        <header className="reveal border-b border-[var(--line)] pb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">ASCA TRANSFORMATION OFFICE</p>
              <p className="mt-2 text-sm text-slate-600">
                We help large companies turn AI pilots into live workflows with clear owners, controls, and ROI.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center border border-slate-900 bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                {PRIMARY_CTA}
              </a>
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-4 text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
            <a href="#overview" className="transition-colors hover:text-slate-900">
              Home
            </a>
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
        </header>

        <section id="overview" className="reveal delay-1 grid gap-10 border-b border-[var(--line)] py-14 lg:grid-cols-[1.48fr_1fr] lg:gap-12">
          <div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">ENTERPRISE AI TRANSFORMATION OFFICE</p>
            <h1 className="mt-6 max-w-[15ch] text-4xl font-semibold leading-[1.03] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              Stop running AI experiments. Start shipping AI results.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-700">
              We set up and run the operating system your AI program is missing. One portfolio. One decision
              rhythm. One source of truth - so business, IT, and risk move together, and AI starts producing
              measurable outcomes instead of more pilots.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center border border-slate-900 bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                {PRIMARY_CTA}
              </a>
              <a
                href="#mechanism"
                className="inline-flex items-center justify-center border border-slate-300 bg-white/85 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-900"
              >
                {MECHANISM_CTA}
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              For enterprises already investing in AI - with leadership pressure to show real returns.
            </p>
          </div>

          <aside className="relative border border-slate-300 bg-white/90 p-7 backdrop-blur-sm">
            <div className="absolute -left-4 -top-4 hidden border border-slate-300 bg-slate-900 px-3 py-2 text-xs font-medium uppercase tracking-[0.1em] text-white lg:block">
              Start Here
            </div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">AI PORTFOLIO REALITY SCAN</p>
            <p className="mt-4 text-4xl font-semibold leading-none tracking-[-0.03em]">2-3 weeks</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              In 2-3 weeks, you'll know exactly which AI projects to scale, which to stop, and what to fix in
              your governance - with a clear 90-day plan your leadership team can act on.
            </p>
            <div className="mt-7 space-y-3 border-t border-slate-200 pt-5 text-sm text-slate-700">
              <p>Portfolio register with clear decision rights map</p>
              <p>KPI baseline and value-tracking model</p>
              <p>Decision Pack Guarantee (with stakeholder participation)</p>
            </div>
          </aside>
        </section>

        <section className="reveal delay-2 border-b border-[var(--line)] py-14">
          <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">YOU ARE HERE BECAUSE</p>
          <h2 className="mt-4 max-w-[24ch] text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
            Your team is busy with AI. But nothing is making it to production.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {painPoints.map((point) => (
              <article key={point} className="border border-slate-300 bg-white/85 p-5">
                <p className="text-sm leading-relaxed text-slate-700">{point}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 border border-slate-300 bg-slate-900/95 p-5 text-slate-100">
            <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.2em] text-slate-300">STAKES AND COST OF INACTION</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              Every month without production AI is spent budget with no return. And EU AI Act obligations start
              hitting August 2, 2026 - ready or not.
            </p>
          </div>
        </section>

        <section className="reveal delay-3 border-b border-[var(--line)] py-14">
          <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">WHY MOST EFFORTS STALL</p>
          <h2 className="mt-4 max-w-[24ch] text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
            Most AI programs fail for the same four reasons.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {stallReasons.map((item) => (
              <article key={item} className="border border-slate-300 bg-white/85 p-5">
                <p className="text-sm leading-relaxed text-slate-700">{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="mechanism" className="reveal delay-4 border-b border-[var(--line)] py-14">
          <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">WHAT WE INSTALL</p>
          <h2 className="mt-4 max-w-[22ch] text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
            Three things we put in place to make your AI program actually work.
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {installBlocks.map((block, index) => (
              <article
                key={block.title}
                className="border border-slate-300 bg-white/90 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-500"
              >
                <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-500">00{index + 1}</p>
                <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.01em]">{block.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">{block.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 border border-slate-300 bg-white/85 p-6">
            <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.2em] text-slate-600">MECHANISM FLOW</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Intake, prioritize, govern, oversee delivery, measure, then scale or retire.
            </p>
          </div>
        </section>

        <section className="reveal grid gap-10 border-b border-[var(--line)] py-14 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">FIRST 30 DAYS</p>
            <h2 className="mt-4 max-w-[23ch] text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
              In 30 days, you'll have the clarity to make real decisions.
            </h2>
            <ul className="mt-7 space-y-3 text-sm leading-relaxed text-slate-700">
              {firstMonthDeliverables.map((item) => (
                <li key={item} className="border border-slate-300 bg-white/80 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <aside className="border border-slate-300 bg-white/90 p-6">
            <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">TIMELINE</p>
            <dl className="mt-5 space-y-4 text-sm">
              {timeline.map((item) => (
                <div key={item.title} className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
                  <dt className="font-medium uppercase tracking-[0.06em] text-slate-500">{item.title}</dt>
                  <dd className="mt-2 leading-relaxed text-slate-800">{item.detail}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>

        <section id="proof" className="reveal border-b border-[var(--line)] py-14">
          <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">PROOF</p>
          <h2 className="mt-4 max-w-[24ch] text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
            We prove our work with real artifacts - not slide decks.
          </h2>
          <p className="mt-5 max-w-4xl text-base leading-relaxed text-slate-700">
            We show working artifacts: dashboards, scorecards, KPI trees, and governance documents. Our delivery
            aligns with NIST AI RMF, ISO/IEC 42001, OWASP LLM Top 10, and EU AI Act requirements, including
            August 2, 2026 readiness where relevant.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {proofVisuals.map((item) => (
              <article key={item.title} className="overflow-hidden border border-slate-300 bg-white/90">
                <img src={item.src} alt={item.title} className="h-auto w-full" loading="lazy" />
                <p className="border-t border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-700">{item.title}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proofArtifacts.map((item) => (
              <article key={item} className="border border-slate-300 bg-white/85 p-5">
                <p className="text-sm leading-relaxed text-slate-700">{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="reveal grid gap-10 border-b border-[var(--line)] py-14 lg:grid-cols-2">
          <div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">FIT</p>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">Who this is for</h3>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-slate-700">
              {fitFor.map((item) => (
                <li key={item} className="border border-slate-300 bg-white/80 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">NOT A FIT</p>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">Who this is not for</h3>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-slate-700">
              {fitNotFor.map((item) => (
                <li key={item} className="border border-slate-300 bg-white/80 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="diagnostic" className="reveal grid gap-10 border-b border-[var(--line)] py-14 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">DIAGNOSTIC OFFER</p>
            <h2 className="mt-4 max-w-[23ch] text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
              AI Portfolio Reality Scan: the fastest way to know what's working and what's not.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
              In 2-3 weeks, you get a clear view of your AI portfolio: what to keep, what to cut, where
              governance is weak, and what to do in the next 90 days.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700">
              You leave with the decision pack, whether or not we continue together.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={SCORECARD_PDF}
                download
                className="inline-flex items-center justify-center border border-slate-300 bg-white/85 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-900"
              >
                Download Pilot-to-Production Scorecard
              </a>
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
              >
                Continue to the application form
              </a>
            </div>
          </div>

          <aside className="border border-slate-300 bg-white/90 p-6">
            <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">WHAT IS INCLUDED</p>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-slate-700">
              {scanIncludes.map((item) => (
                <li key={item} className="border border-slate-200 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section id="apply" className="reveal py-14">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">APPLICATION</p>
              <h2 className="mt-4 max-w-[20ch] text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
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
                    className="inline-flex items-center justify-center border border-slate-900 bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                  >
                    {PRIMARY_CTA}
                  </button>
                </div>

                {submitted ? (
                  <div className="space-y-4 border border-slate-300 bg-white/90 p-5">
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-slate-900">Application received</h3>
                    <p className="text-sm leading-relaxed text-slate-700">
                      Your email draft is ready. If it did not open, use the link below. We respond within 48 business
                      hours.
                    </p>
                    <a
                      href={buildMailto(form)}
                      className="inline-flex items-center justify-center border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                    >
                      Open email draft again
                    </a>
                    <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                      <div className="border border-slate-200 p-3">
                        <p className="font-medium uppercase tracking-[0.08em] text-slate-500">Within 48 hours</p>
                        <p className="mt-2">Fit review and reply.</p>
                      </div>
                      <div className="border border-slate-200 p-3">
                        <p className="font-medium uppercase tracking-[0.08em] text-slate-500">Week one</p>
                        <p className="mt-2">Scope call and access checklist.</p>
                      </div>
                      <div className="border border-slate-200 p-3">
                        <p className="font-medium uppercase tracking-[0.08em] text-slate-500">Weeks two to three</p>
                        <p className="mt-2">Reality Scan and decision pack.</p>
                      </div>
                    </div>
                    <div className="border border-slate-200 p-3 text-sm leading-relaxed text-slate-700">
                      Prepare your initiative list, owners, top workflows, and baseline KPI reports.
                    </div>
                    <a
                      href={SCORECARD_PDF}
                      download
                      className="inline-flex items-center justify-center border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-900"
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

            <aside className="h-fit border border-slate-300 bg-white/90 p-6 lg:sticky lg:top-8">
              <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">WHAT HAPPENS NEXT</p>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-700">
                <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
                  <p className="font-medium uppercase tracking-[0.08em] text-slate-500">Within 48 business hours</p>
                  <p className="mt-2">Application fit review and response.</p>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <p className="font-medium uppercase tracking-[0.08em] text-slate-500">Week one</p>
                  <p className="mt-2">Scoping call, stakeholder alignment, and access checklist.</p>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <p className="font-medium uppercase tracking-[0.08em] text-slate-500">Weeks two to three</p>
                  <p className="mt-2">Reality Scan execution and executive decision pack delivery.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <footer className="reveal mt-4 flex flex-col gap-4 border-t border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
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
