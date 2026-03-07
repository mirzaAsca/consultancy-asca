import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

const PRIMARY_EMAIL = 'advisory@enterprise-ai.consulting'
const SCORECARD_PDF = '/pilot-to-production-scorecard-board-ready-edition.pdf'
const PRIMARY_CTA = 'Apply for the AI Portfolio Reality Scan'

const painPoints = [
  'AI pilots exist, but production impact is still unclear.',
  'Governance, security, and legal reviews arrive late and slow delivery.',
  'Business units, IT, and risk teams move on different clocks.',
  'Leadership wants measured value, not another experimentation cycle.',
]

const installBlocks = [
  {
    title: 'Portfolio Governance',
    detail: 'One register of initiatives, owners, value hypotheses, risk tiers, and stage status.',
  },
  {
    title: 'Decision Cadence',
    detail: 'Stage gates, executive reviews, and explicit decision rights across business, IT, and risk.',
  },
  {
    title: 'Delivery Oversight',
    detail: 'Production readiness, adoption telemetry, and disciplined scale, stop, or redesign decisions.',
  },
]

const firstMonthDeliverables = [
  'AI portfolio register with owner accountability and risk class.',
  'Prioritized scale, stop, and sequence decisions.',
  'Governance charter draft with decision-rights map.',
  'KPI baseline and value-tracking plan.',
  'Ninety-day execution roadmap for business, IT, and risk alignment.',
]

const timeline = [
  {
    title: 'First 30 Days',
    detail: 'Decision pack delivered: baseline, priorities, governance charter draft, and 90-day plan.',
  },
  {
    title: 'First 90 Days',
    detail: 'Governance artifacts active and 1-2 production pathways set with measurable movement.',
  },
  {
    title: '6 Months',
    detail: 'Multiple workflows running with KPI tracking for cycle time, cost-to-serve, quality, and adoption.',
  },
  {
    title: '12 Months',
    detail: 'AI runs as a governed operating capability with repeatable value realization.',
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

const fitFor = [
  'Complex enterprises with active AI initiatives and executive urgency.',
  'Teams willing to redesign workflows, not just add tools.',
  'Sponsors ready to align business, IT, risk, and vendors in one cadence.',
]

const fitNotFor = [
  'Buyers seeking an AI idea workshop without ownership.',
  'Teams shopping only for a chatbot build vendor.',
  'Organizations unwilling to enforce governance and decision rights.',
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
      `Current AI initiatives count: ${form.aiInitiativeCount}`,
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

  const ctaHref = useMemo(() => '#apply', [])

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
    window.location.href = buildMailto(form)
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
              <p className="mt-2 text-sm text-slate-600">Enterprise AI portfolio governance and production oversight</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={SCORECARD_PDF}
                download
                className="inline-flex items-center justify-center border border-slate-300 bg-white/85 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-900"
              >
                Download Pilot-to-Production Scorecard
              </a>
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
              Overview
            </a>
            <a href="#mechanism" className="transition-colors hover:text-slate-900">
              What We Install
            </a>
            <a href="#proof" className="transition-colors hover:text-slate-900">
              Proof
            </a>
            <a href="#diagnostic" className="transition-colors hover:text-slate-900">
              Reality Scan
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
              Turn AI activity into a board-governed production portfolio.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-700">
              We install the executive control plane that aligns business, IT, and risk around one portfolio, one
              cadence, and one source of truth. The result is measurable operating impact, governed scale, and
              decision-ready visibility.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center border border-slate-900 bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                {PRIMARY_CTA}
              </a>
              <a
                href={SCORECARD_PDF}
                download
                className="inline-flex items-center justify-center border border-slate-300 bg-white/85 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-900"
              >
                Download Pilot-to-Production Scorecard
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              For complex enterprises with active AI initiatives, executive urgency, and accountability to prove value.
            </p>
          </div>

          <aside className="relative border border-slate-300 bg-white/90 p-7 backdrop-blur-sm">
            <div className="absolute -left-4 -top-4 hidden border border-slate-300 bg-slate-900 px-3 py-2 text-xs font-medium uppercase tracking-[0.1em] text-white lg:block">
              Paid Entry Offer
            </div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">AI PORTFOLIO REALITY SCAN</p>
            <p className="mt-4 text-4xl font-semibold leading-none tracking-[-0.03em]">2-3 weeks</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Board-ready portfolio baseline, scale or stop decisions, governance priorities, and a ninety-day execution
              plan.
            </p>
            <div className="mt-7 space-y-3 border-t border-slate-200 pt-5 text-sm text-slate-700">
              <p>Portfolio register + decision rights map</p>
              <p>KPI baseline + value-tracking model</p>
              <p>Decision Pack Guarantee (with stakeholder participation)</p>
            </div>
          </aside>
        </section>

        <section className="reveal delay-2 border-b border-[var(--line)] py-14">
          <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">YOU ARE HERE BECAUSE</p>
          <h2 className="mt-4 max-w-[24ch] text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
            The organization is active, but the operating mechanism is missing.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {painPoints.map((point) => (
              <article key={point} className="border border-slate-300 bg-white/85 p-5">
                <p className="text-sm leading-relaxed text-slate-700">{point}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="mechanism" className="reveal delay-3 border-b border-[var(--line)] py-14">
          <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">WHAT WE INSTALL</p>
          <h2 className="mt-4 max-w-[22ch] text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
            Executive control plane: portfolio governance, production readiness, value realization.
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
              Intake to prioritize to govern to oversee delivery to measure to scale or retire.
            </p>
          </div>
        </section>

        <section className="reveal delay-4 grid gap-10 border-b border-[var(--line)] py-14 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.22em] text-slate-600">FIRST 30 DAYS</p>
            <h2 className="mt-4 max-w-[23ch] text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
              Start with decision-grade clarity before scale complexity grows.
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
            Evidence assets, framework alignment, and measurable reporting.
          </h2>
          <p className="mt-5 max-w-4xl text-base leading-relaxed text-slate-700">
            We emphasize artifacts and controls over hype. Delivery aligns to NIST AI RMF, ISO/IEC 42001, OWASP LLM
            risk categories, and EU AI Act readiness expectations, including the August 2, 2026 applicability
            milestone.
          </p>

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
              AI Portfolio Reality Scan: your first commercial yes.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
              In 2-3 weeks, you get a board-ready view of current AI activity, a prioritized scale or stop sequence,
              governance priorities, and a ninety-day execution plan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center border border-slate-900 bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                {PRIMARY_CTA}
              </a>
              <a
                href={SCORECARD_PDF}
                download
                className="inline-flex items-center justify-center border border-slate-300 bg-white/85 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-900"
              >
                Download Pilot-to-Production Scorecard
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
                This form is for organizations with active AI work, executive urgency, and need for measured production
                impact. Qualified applications receive next-step coordination within 48 business hours.
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
                    Current AI initiatives count
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
                  <a
                    href={SCORECARD_PDF}
                    download
                    className="inline-flex items-center justify-center border border-slate-300 bg-white/85 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-900"
                  >
                    Download Pilot-to-Production Scorecard
                  </a>
                </div>

                {submitted ? (
                  <p className="text-sm text-slate-600">
                    If your email client did not open, send your application details to{' '}
                    <a className="font-medium text-slate-900" href={`mailto:${PRIMARY_EMAIL}`}>
                      {PRIMARY_EMAIL}
                    </a>
                    .
                  </p>
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
          <p className="text-sm text-slate-600">One flagship offer. One primary CTA path. One governed execution model.</p>
        </footer>
      </main>
    </div>
  )
}
