import { useState } from 'react'
import type { FormEvent } from 'react'
import SiteHeader from './components/SiteHeader'
import WarpedGrid from './components/WarpedGrid'

// ── Client logos ──
import logoBattlbox from './assets/logos/battlbox.svg'
import logoBalaHealth from './assets/logos/bala-health.svg'
import logoBeardClub from './assets/logos/beard-club.png'
import logoBubsNaturals from './assets/logos/bubs-naturals.svg'
import logoCrateCub from './assets/logos/crate-club.svg'
import logoCymbiotika from './assets/logos/cymbiotika.png'
import logoDiamondsByUk from './assets/logos/diamonds-by-uk.svg'
import logoHoundsy from './assets/logos/houndsy.png'
import logoLandAndSea from './assets/logos/land-and-sea.svg'
import logoPlateCrate from './assets/logos/plate-crate.png'
import logoPraella from './assets/logos/praella.svg'
import logoSerenity from './assets/logos/serenity.png'
import logoShipaid from './assets/logos/shipaid.svg'
import logoTevello from './assets/logos/tevello.svg'
import logoTrimrx from './assets/logos/trimrx.svg'
import logoVinylMePlease from './assets/logos/vinyl-me-please.png'

// ── Portfolio logos ──
import logoFlyrank from './assets/our-logos/flyrank.svg'
import logoSpyrank from './assets/our-logos/spyrank.svg'
import logoSaasInsights from './assets/our-logos/saas-insights.svg'
import logoJaqAndJil from './assets/our-logos/jaq-and-jil.svg'
import logoKinetic from './assets/our-logos/kinetic.svg'
import logo10x from './assets/our-logos/10x.svg'
import logoPowercommerce from './assets/our-logos/powercommerce.svg'

// ── Alumni logos ──
import logoShopCircle from './assets/logos-old/shop-circle.svg'
import logoHulkapps from './assets/logos-old/hulkapps.svg'
import logoCarthook from './assets/logos-old/carthook.svg'
import logoReleasit from './assets/logos-old/releasit.svg'
import logoAccentuate from './assets/logos-old/accentuate.svg'

const PRIMARY_EMAIL = 'advisory@enterprise-ai.consulting'
const LINKEDIN_PROFILE = 'https://www.linkedin.com/in/mirzaasceric/'
const PRIMARY_CTA = 'Join the Waitlist'
const disabledButtonClass =
  'inline-flex cursor-not-allowed items-center justify-center border border-[var(--line)] bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-400'
const primaryButtonClass =
  'inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2'
const secondaryButtonClass =
  'inline-flex items-center justify-center text-sm font-medium text-[var(--accent)] underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]'
const utilityButtonClass =
  'inline-flex items-center justify-center gap-2 border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--accent)] shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition-[border-color,color,transform,box-shadow] duration-200 hover:-translate-y-px hover:border-[var(--accent-hover)] hover:text-[var(--accent-hover)] hover:shadow-[0_14px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2'
const surfaceClass = 'border border-[var(--line)] bg-[var(--surface)]'
const panelClass = `premium-panel ${surfaceClass} p-6`
const cardClass = `premium-card ${surfaceClass} p-5`
const inversePanelClass =
  'border border-[var(--accent)] bg-[var(--accent)] px-6 py-6 text-slate-100 shadow-[0_18px_38px_rgba(15,23,42,0.12)]'
const inverseSectionLabelClass =
  "inline-flex w-fit items-center bg-[rgba(255,255,255,0.12)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-white"
const sectionLabelClass =
  "inline-flex w-fit items-center bg-white px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]"
const sectionHeadingClass =
  'mt-4 max-w-[22ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl'
const splitSectionClass = 'reveal border-b-[3px] border-[var(--line)] py-14 sm:py-16 lg:grid lg:grid-cols-12 lg:gap-8'
const metaChipClass =
  "inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]"

// ── DATA ──

const clientLogos = [
  { src: logoPraella, name: 'Praella', png: false },
  { src: logoCymbiotika, name: 'Cymbiotika', png: true },
  { src: logoBubsNaturals, name: 'Bubs Naturals', png: false },
  { src: logoShipaid, name: 'ShipAid', png: false },
  { src: logoTevello, name: 'Tevello', png: false },
  { src: logoBattlbox, name: 'BattlBox', png: false },
  { src: logoBeardClub, name: 'Beard Club', png: true },
  { src: logoCrateCub, name: 'Crate Club', png: false },
  { src: logoDiamondsByUk, name: 'Diamonds by UK', png: false },
  { src: logoVinylMePlease, name: 'Vinyl Me, Please', png: true },
  { src: logoSerenity, name: 'Serenity', png: true },
  { src: logoBalaHealth, name: 'Bala Health', png: false },
  { src: logoHoundsy, name: 'Houndsy', png: true },
  { src: logoLandAndSea, name: 'Land and Sea', png: false },
  { src: logoPlateCrate, name: 'Plate Crate', png: true },
  { src: logoTrimrx, name: 'TrimRx', png: false },
]

const portfolioLogos = [
  { src: logoFlyrank, name: 'FlyRank', png: false },
  { src: logoSpyrank, name: 'SpyRank', png: false },
  { src: logoSaasInsights, name: 'SaaS Insights', png: false },
  { src: logoJaqAndJil, name: 'Jaq & Jil', png: false },
  { src: logoKinetic, name: 'Kinetic', png: false },
  { src: logo10x, name: '10x', png: false },
  { src: logoPowercommerce, name: 'Powercommerce', png: false },
]

const alumniLogos = [
  { src: logoShopCircle, name: 'Shop Circle', png: false },
  { src: logoHulkapps, name: 'Hulk Apps', png: false },
  { src: logoCarthook, name: 'CartHook', png: false },
  { src: logoReleasit, name: 'Releasit', png: false },
  { src: logoAccentuate, name: 'Accentuate', png: false },
]

const core4Steps = [
  { num: '01', label: 'Map', line: 'Find every AI project, tool, and vendor in your company.' },
  { num: '02', label: 'Decide', line: 'Keep, kill, or scale each one by real dollar impact.' },
  { num: '03', label: 'Build', line: 'Ship to production with testing, monitoring, and rollback.' },
  { num: '04', label: 'Run', line: 'Weekly rhythm with your business, IT, and risk leaders.' },
]

const painPoints = [
  'You spent money on AI. But you can\'t point to a single dollar it made back.',
  'Different teams run different tools with no shared plan. Nobody owns the full picture.',
  'Legal and security find out about AI projects too late and shut them down.',
  'Your board keeps asking for results. All you have is a list of experiments.',
]

const featureGroups = [
  {
    label: 'THE SYSTEM',
    features: [
      'Full AI Portfolio Map',
      'Priority Decisions: Keep, Kill, or Scale',
      'Governance & Compliance Built In',
      'Weekly Decision Meetings',
    ],
  },
  {
    label: 'THE DASHBOARD',
    features: [
      'Revenue & Cost Impact Dashboard',
      'Vendor & Tool Management',
    ],
  },
  {
    label: 'THE PEOPLE',
    features: [
      'Adoption & Training System',
      'Production Delivery Oversight',
    ],
  },
  {
    label: 'THE ARMY',
    features: [
      'Direct AI Development Team',
      'Up to 50 Dedicated AI Engineers',
      'Organization-Wide 10x Leverage',
      'Custom Agent Orchestration',
    ],
  },
  {
    label: 'THE EMPIRE',
    features: [
      'Multi-Entity Portfolio Management',
      'FlyRank Platform Integration',
      'Dedicated Executive Partner',
      'Custom SLA & Priority Support',
    ],
  },
]

const plans = [
  {
    name: 'The AI Command Room',
    subtitle: 'Your AI Transformation Office — Installed & Running',
    price: '$22,000',
    period: '/mo',
    anchor: 'Replaces a $400K+/yr internal AI strategy hire',
    scarcity: '0 spots available',
    description: 'We sit in your building every week, make decisions with your leaders, and own results. In 30 days you have a full portfolio map, clear kill/scale decisions, and governance running. By month three, AI is making you money.',
    cta: 'Apply',
    ctaDisabled: true,
    highlighted: false,
    includedGroups: 3,
  },
  {
    name: 'The 50-Engineer Takeover',
    subtitle: '50 AI Engineers Inside Your Business',
    price: '$290,000',
    period: '/mo',
    anchor: '$580/head vs. $12,000+/head industry average',
    scarcity: 'Coming Q3 2026',
    description: 'Our team becomes your team. Up to 50 dedicated engineers building, shipping, and scaling AI across your entire organization. Your org doesn\'t just adopt AI. It becomes AI-native.',
    cta: 'Request Early Access',
    ctaDisabled: true,
    highlighted: true,
    includedGroups: 4,
  },
  {
    name: 'The Portfolio Engine',
    subtitle: 'AI Transformation Across Your Entire Portfolio',
    price: 'Custom',
    period: '',
    anchor: 'One partner, one system, every entity',
    scarcity: 'By invitation only',
    description: 'You own multiple companies. We run AI transformation across all of them — shared infrastructure, unified governance, compounding intelligence. Includes FlyRank platform integration for organic growth at scale.',
    cta: 'Book a Portfolio Review',
    ctaDisabled: true,
    highlighted: false,
    includedGroups: 5,
  },
]

const portfolioCompanies = [
  { name: 'FlyRank', detail: 'Built the most advanced SEO/GEO engine. Grew to $1M+ ARR in under 8 months.' },
  { name: 'Agent Orchestration', detail: 'Production-grade AI agent systems running inside enterprise operations.' },
  { name: 'Shopify Marketplace', detail: 'Reverse-engineered the marketplace ecosystem. Automated seller intelligence at scale.' },
]

const linkedinProfile = {
  name: 'Mirza (Ašća) Ašćerić',
  role: 'Director of AI (Agent Orchestration) @ FlyRank',
  detail: 'Production-grade AI systems | $1M+ ARR in <8 months',
}

const fitFor = [
  'Companies already spending on AI, with leadership that wants to see real numbers — not more decks.',
  'Teams willing to change how they actually work, not just add another tool on top.',
  'An executive who can get business, IT, and risk in the same room to make decisions together.',
]

const fitNotFor = [
  'Teams that want a strategy workshop and a PDF. We build and run things.',
  'Companies looking for someone to build a chatbot. That\'s not the only thing we do.',
  'Organizations where nobody has the authority to make real decisions.',
]

const faqItems = [
  {
    q: 'We already have an AI strategy. Why do we need this?',
    a: 'Most companies have a strategy. The problem is almost never the plan — it\'s what happens after. We don\'t write decks. We install the operating system that gets AI from "good idea" to "running in production and making money."',
  },
  {
    q: 'How is this different from hiring McKinsey or Deloitte?',
    a: 'They hand you a report and leave. We stay. We sit in your weekly rhythm, make decisions with your leaders, and own the delivery. If nothing makes it to production, that\'s our failure — not yours.',
  },
  {
    q: 'You\'re fully booked. Why should I join the waitlist?',
    a: 'We rotate clients as engagements mature. The waitlist is first-come, first-served. When a spot opens, we reach out to the next company in line. You get a free Company Scan and a 30-minute strategy call right away — so we already know your situation and can move fast when your turn comes.',
  },
  {
    q: 'What if I have an emergency and can\'t wait?',
    a: 'Use the Emergency button on this page. If your situation is critical enough, we may be able to accommodate you outside our normal capacity. We review every emergency request within 24 hours.',
  },
  {
    q: 'What if $22,000/month is too much right now?',
    a: 'Start with the free Company Scan and the 30-minute strategy call. Costs you nothing, takes about a week, and you keep everything we find. If the numbers make sense after that, we talk about the retainer when a spot opens. If not, you still walk away with a clear picture and a real plan.',
  },
  {
    q: 'How fast will we see results?',
    a: 'You get the free scan results in about a week. Once you become a client, you\'ll have a full portfolio map, clear priority decisions, and governance running within 30 days. First production wins happen in months two to three.',
  },
  {
    q: 'What industries do you work with?',
    a: 'We work best with companies that have real operational volume — financial services, manufacturing, logistics, SaaS, healthcare, e-commerce. If your business runs on repeatable workflows, AI can make a measurable difference.',
  },
  {
    q: 'Do we need a big internal AI team?',
    a: 'No. That\'s the whole point. We act as your AI Transformation Office. We bring the system, the rhythm, and the oversight. You bring your business knowledge and the people who make decisions.',
  },
]

// ── WAITLIST FORM ──

type Field = 'fullName' | 'workEmail' | 'company' | 'biggestChallenge' | 'urgency'

type FormState = Record<Field, string>
type ErrorState = Partial<Record<Field, string>>

const initialFormState: FormState = {
  fullName: '',
  workEmail: '',
  company: '',
  biggestChallenge: '',
  urgency: '',
}

function buildMailto(form: FormState): string {
  const subject = encodeURIComponent(`Waitlist + Free Company Scan — ${form.company}`)
  const body = encodeURIComponent(
    [
      'Waitlist + Free Company Scan Request',
      '',
      `Name: ${form.fullName}`,
      `Email: ${form.workEmail}`,
      `Company: ${form.company}`,
      `Biggest AI challenge: ${form.biggestChallenge}`,
      `How soon: ${form.urgency}`,
    ].join('\n'),
  )
  return `mailto:${PRIMARY_EMAIL}?subject=${subject}&body=${body}`
}

// ── EMERGENCY FORM ──

type EmergencyField = 'name' | 'contact' | 'problem' | 'budget'

type EmergencyFormState = Record<EmergencyField, string>
type EmergencyErrorState = Partial<Record<EmergencyField, string>>

const initialEmergencyState: EmergencyFormState = {
  name: '',
  contact: '',
  problem: '',
  budget: '',
}

function buildEmergencyMailto(form: EmergencyFormState): string {
  const subject = encodeURIComponent(`EMERGENCY AI Request — ${form.name}`)
  const body = encodeURIComponent(
    [
      'Emergency AI Transformation Request',
      '',
      `Name / Company: ${form.name}`,
      `Preferred contact: ${form.contact}`,
      `Problem: ${form.problem}`,
      `Budget: ${form.budget}`,
    ].join('\n'),
  )
  return `mailto:${PRIMARY_EMAIL}?subject=${subject}&body=${body}`
}

// ── SHARED UI ──

function inputClass(hasError: boolean): string {
  return `mt-1 w-full border bg-[rgba(255,255,255,0.08)] px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark] transition-[border-color,box-shadow,background-color] duration-200 caret-white focus:border-white focus:bg-[rgba(255,255,255,0.12)] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] ${
    hasError ? 'border-rose-400' : 'border-[rgba(255,255,255,0.16)]'
  }`
}

function selectClass(hasError: boolean): string {
  return `w-full appearance-none border bg-[rgba(255,255,255,0.08)] px-3 py-2.5 pr-11 text-sm text-white outline-none [color-scheme:dark] transition-[border-color,box-shadow,background-color] duration-200 caret-white focus:border-white focus:bg-[rgba(255,255,255,0.12)] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] ${
    hasError ? 'border-rose-400' : 'border-[rgba(255,255,255,0.16)]'
  }`
}

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M19 3A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H19ZM8.34 17.34V9.82H5.84V17.34H8.34ZM7.09 8.79C7.89 8.79 8.55 8.12 8.55 7.33C8.55 6.53 7.89 5.87 7.09 5.87C6.29 5.87 5.64 6.53 5.64 7.33C5.64 8.12 6.29 8.79 7.09 8.79ZM18.36 17.34V13.22C18.36 10.99 17.17 9.63 15.17 9.63C14.21 9.63 13.5 10.16 13.03 10.66V9.82H10.54C10.57 10.38 10.54 17.34 10.54 17.34H13.03V13.14C13.03 12.92 13.04 12.7 13.11 12.54C13.28 12.1 13.66 11.65 14.31 11.65C15.15 11.65 15.48 12.29 15.48 13.24V17.34H18.36Z" />
    </svg>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[var(--line)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-medium text-slate-900 transition-colors hover:text-[var(--accent)]"
      >
        {q}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      </button>
      {open ? <p className="pb-5 text-sm leading-relaxed text-slate-600">{a}</p> : null}
    </div>
  )
}

// ── APP ──

export default function App() {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [errors, setErrors] = useState<ErrorState>({})
  const [submitted, setSubmitted] = useState(false)

  const [emergencyForm, setEmergencyForm] = useState<EmergencyFormState>(initialEmergencyState)
  const [emergencyErrors, setEmergencyErrors] = useState<EmergencyErrorState>({})
  const [emergencySubmitted, setEmergencySubmitted] = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)

  const ctaHref = '#scan'

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

  function updateEmergencyField(field: EmergencyField, value: string) {
    setEmergencyForm((previous) => ({ ...previous, [field]: value }))
    setEmergencyErrors((previous) => {
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  function validateEmergency(nextForm: EmergencyFormState): EmergencyErrorState {
    const nextErrors: EmergencyErrorState = {}
    ;(Object.keys(nextForm) as EmergencyField[]).forEach((field) => {
      if (!nextForm[field].trim()) {
        nextErrors[field] = 'Required'
      }
    })
    return nextErrors
  }

  function handleEmergencySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateEmergency(emergencyForm)
    if (Object.keys(nextErrors).length > 0) {
      setEmergencyErrors(nextErrors)
      return
    }
    setEmergencySubmitted(true)
    window.setTimeout(() => {
      window.location.href = buildEmergencyMailto(emergencyForm)
    }, 80)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0))]" />
      <WarpedGrid />

      <main className="relative mx-auto w-full max-w-[1240px] px-6 pb-20 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <SiteHeader
          applyHref="#scan"
          ctaHref={ctaHref}
          homeHref="/"
          primaryButtonClassName={primaryButtonClass}
          primaryCtaLabel={PRIMARY_CTA}
          proofHref="/how-we-work/#proof"
          transformationOfficeHref="/how-we-work/#mechanism"
          whatWeDoHref="/how-we-work/"
        />

        {/* ── 1. HERO: Split layout matching how-we-work ── */}
        <section id="overview" className={`${splitSectionClass} gap-8`}>
          <div className="flex h-full flex-col lg:col-span-7 lg:pr-6">
            <div>
              <p className={sectionLabelClass}>AI-NATIVE TRANSFORMATION OFFICE</p>
              <h1 className="mt-6 max-w-[13ch] text-4xl font-semibold leading-[1.01] tracking-[-0.04em] [text-wrap:balance] sm:text-5xl lg:text-[4rem]">
                We turn companies into{' '}
                <span className="bg-[var(--accent)] px-[0.08em] text-white [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                  AI-native businesses.
                </span>
              </h1>
              <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-slate-700">
                Your revenue grows. Your costs drop. Your team does more with less time.
                We install the system that makes it happen — and we run it with you every week.
              </p>
            </div>

            <div className="mt-8 space-y-4 lg:mt-auto lg:pt-10">
              <div className="flex flex-wrap gap-2">
                <span className={metaChipClass}>Free Company Scan</span>
                <span className={metaChipClass}>Board-ready artifacts</span>
                <span className={metaChipClass}>$22,000/mo retainer</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className={disabledButtonClass} title="We're not taking new companies right now">
                  Apply
                </span>
                <a href={ctaHref} className={secondaryButtonClass}>
                  {PRIMARY_CTA}
                </a>
              </div>
            </div>
          </div>

          <aside className={`relative flex h-full flex-col lg:col-span-5 ${panelClass}`}>
            {/* ── Floating lead-magnet label ── */}
            <span className="absolute -top-3 right-6 z-10 bg-[var(--accent)] px-3 py-1 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-white shadow-sm">
              Free 30-min strategy call
            </span>

            {/* ── Price anchor + scarcity ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-3xl font-semibold tracking-[-0.02em] text-slate-950">
                $22,000<span className="text-lg font-normal text-slate-500">/mo</span>
              </p>
              <span className={metaChipClass}>
                Spots available: 0
              </span>
            </div>

            {/* ── Core 4 delivery system ── */}
            <div className="mt-5 border-t border-[var(--line)] pt-5">
              <p className={sectionLabelClass}>WHAT YOU GET — THE SYSTEM</p>
              <div className="mt-4 space-y-0">
                {core4Steps.map((step) => (
                  <div key={step.num} className="flex items-start gap-3 border-b border-[var(--line)] py-3 last:border-b-0">
                    <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                      {step.num}
                    </p>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{step.line}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>



            {/* ── CTA ── */}
            <div className="mt-5 border-t border-[var(--line)] pt-5">
              <span className={`w-full justify-center ${disabledButtonClass}`} title="We're not taking new companies right now">
                Apply
              </span>
              <a href={ctaHref} className="mt-3 block text-center text-sm font-medium text-[var(--accent)] underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]">
                {PRIMARY_CTA}
              </a>
              <p className="mt-2 text-center text-sm text-slate-500">
                We're not taking new companies right now. Join the waitlist and get your free scan while you wait.
              </p>
            </div>
          </aside>
        </section>

        {/* ── 2. PROOF STRIP ── */}
        <section className="reveal delay-2 border-b-[3px] border-[var(--line)] py-6">
          <div className="flex flex-wrap items-center gap-6 sm:gap-8">
            <div className="flex items-center gap-2">
              <span className="font-['IBM_Plex_Mono'] text-2xl font-semibold text-slate-950">$1M+</span>
              <span className="text-sm text-slate-500">ARR built in &lt;8 months</span>
            </div>
            <div className="hidden h-5 border-l border-[var(--line)] sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-['IBM_Plex_Mono'] text-2xl font-semibold text-slate-950">30</span>
              <span className="text-sm text-slate-500">days to first production decisions</span>
            </div>
            <div className="hidden h-5 border-l border-[var(--line)] sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-['IBM_Plex_Mono'] text-2xl font-semibold text-slate-950">0</span>
              <span className="text-sm text-slate-500">spots available</span>
            </div>
          </div>
        </section>

        {/* ── 3. PAIN + COST OF INACTION ── */}
        <section className="reveal border-b-[3px] border-[var(--line)] py-14">
          <p className={sectionLabelClass}>SOUND FAMILIAR?</p>
          <h2 className={sectionHeadingClass}>
            You're spending on AI. But nothing is making it to production.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-12">
            {painPoints.map((point) => (
              <article key={point} className={`md:col-span-6 ${cardClass}`}>
                <p className="text-sm leading-relaxed text-slate-700">{point}</p>
              </article>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-center text-center">
            <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">YOU KNOW YOU NEED A SYSTEM AND</p>
            <p className="mt-6 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-5xl lg:text-[3.5rem]">
              <span className="bg-white px-[0.12em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                The longer you wait, the more it costs.
              </span>
            </p>
          </div>
        </section>

        {/* ── FIT / NOT FIT ── */}
        <section className="reveal border-b-[3px] border-[var(--line)] py-14 sm:py-16">
          <p className={sectionLabelClass}>IS THIS FOR YOU?</p>
          <h2 className={sectionHeadingClass}>
            We're not for everyone. Here's how to tell.
          </h2>

          <div className="mt-8 premium-panel relative overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
            <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 hidden border-l border-[var(--line)] lg:block" />

            <div className="relative z-[1] grid lg:grid-cols-2">
              <div className="border-b border-[var(--line)] px-6 py-4 lg:border-b-0">
                <p className={sectionLabelClass}>GOOD FIT</p>
              </div>
              <div className="border-b border-[var(--line)] bg-[var(--accent)] px-6 py-4 lg:border-b-0">
                <p className="inline-flex w-fit items-center bg-[rgba(255,255,255,0.12)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-white">
                  NOT A FIT
                </p>
              </div>
            </div>

            <div className="relative z-[1]">
              {fitFor.map((item, index) => (
                <div key={item} className="relative grid lg:grid-cols-2">
                  <div className="border-t border-[var(--line)] px-6 py-5">
                    <div className="flex items-start gap-4">
                      <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                        0{index + 1}
                      </p>
                      <p className="max-w-[40ch] text-sm leading-relaxed text-slate-800">{item}</p>
                    </div>
                  </div>
                  <div className="border-t border-[rgba(255,255,255,0.12)] bg-[var(--accent)] px-6 py-5">
                    <div className="flex items-start gap-4">
                      <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
                        0{index + 1}
                      </p>
                      <p className="max-w-[40ch] text-sm leading-relaxed text-slate-100">{fitNotFor[index]}</p>
                    </div>
                  </div>
                  <div className="absolute left-1/2 top-1/2 hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--line)] bg-white lg:block" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHERE WE'VE COOKED ── */}
        <section className="reveal border-b-[3px] border-[var(--line)] py-14">
          <p className={sectionLabelClass}>WHERE WE'VE COOKED</p>
          <h2 className={sectionHeadingClass}>
            AI deployed. Revenue moved.
          </h2>

          {/* ── Client companies ── */}
          <div className="mt-10">
            <div className="flex items-center gap-3">
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] bg-[var(--accent)] text-white px-2.5 py-1">
                Where We're Cooking with AI
              </p>
              <span className={metaChipClass}>{clientLogos.length}</span>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-20 gap-y-8">
              {clientLogos.map((logo) => (
                <img
                  key={logo.name}
                  src={logo.src}
                  alt={logo.name}
                  className={`h-6 w-auto object-contain opacity-40 transition-[opacity,filter] duration-200 hover:opacity-70 sm:h-7 ${
                    logo.png ? 'invert' : ''
                  }`}
                  loading="lazy"
                />
              ))}
            </div>
          </div>

          {/* ── Thick divider ── */}
          <div className="my-12 border-t-[3px] border-[var(--line)]" />

          {/* ── Portfolio companies ── */}
          <div>
            <div className="flex items-center gap-3">
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] bg-[var(--accent)] text-white px-2.5 py-1">
                Our Own Portfolio Cooking Show
              </p>
              <span className={metaChipClass}>{portfolioLogos.length}</span>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-20 gap-y-8">
              {portfolioLogos.map((logo) => (
                <img
                  key={logo.name}
                  src={logo.src}
                  alt={logo.name}
                  className={`h-6 w-auto object-contain opacity-40 transition-[opacity,filter] duration-200 hover:opacity-70 sm:h-7 ${
                    logo.png ? 'invert' : ''
                  }`}
                  loading="lazy"
                />
              ))}
            </div>
          </div>

          {/* ── Thick divider ── */}
          <div className="my-12 border-t-[3px] border-[var(--line)]" />

          {/* ── Alumni companies ── */}
          <div>
            <div className="flex items-center gap-3">
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] bg-[var(--accent)] text-white px-2.5 py-1">
                Where We Used to Cook
              </p>
              <span className={metaChipClass}>{alumniLogos.length}</span>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-20 gap-y-8">
              {alumniLogos.map((logo) => (
                <img
                  key={logo.name}
                  src={logo.src}
                  alt={logo.name}
                  className={`h-6 w-auto object-contain opacity-40 transition-[opacity,filter] duration-200 hover:opacity-70 sm:h-7 ${
                    logo.png ? 'invert' : ''
                  }`}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. PLANS ── */}
        <section className="reveal border-b-[3px] border-[var(--line)] py-14">
          <p className={sectionLabelClass}>PLANS</p>
          <h2 className={sectionHeadingClass}>
            Three ways to make AI print money for your business.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
            From strategic advisory to full-scale AI development teams inside your business.
            Every plan is an operating system we build and run with your leaders.
          </p>

          {/* ── Plan cards ── */}
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col border bg-[var(--surface)] p-6 ${
                  plan.highlighted
                    ? 'border-[var(--accent)] shadow-[var(--shadow-panel)]'
                    : 'border-[var(--line)] shadow-[var(--shadow-card)]'
                } transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:shadow-[0_18px_32px_rgba(15,23,42,0.08)]`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-6 bg-[var(--accent)] px-3 py-1 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-white">
                    Most Impact
                  </span>
                )}

                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  {plan.subtitle}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-slate-950">
                  {plan.price}
                  {plan.period && <span className="text-lg font-normal text-slate-500">{plan.period}</span>}
                </p>
                <p className="mt-1.5 font-['IBM_Plex_Mono'] text-[11px] font-medium text-slate-500">
                  {plan.anchor}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 lg:min-h-[7.5rem]">
                  {plan.description}
                </p>
                <span className="mt-3 inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2 py-0.5 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  {plan.scarcity}
                </span>

                {/* ── Feature groups ── */}
                <div className="mt-6 flex-1 border-t border-[var(--line)] pt-5">
                  {featureGroups.map((group, groupIndex) => {
                    const included = groupIndex < plan.includedGroups
                    return (
                      <div key={group.label} className={groupIndex > 0 ? 'mt-4' : ''}>
                        <p className={`font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] ${
                          included ? 'text-[var(--muted)]' : 'text-slate-300'
                        }`}>
                          {group.label}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {group.features.map((feature) => (
                            <li
                              key={feature}
                              className={`flex items-start gap-2.5 text-sm ${
                                included ? 'text-slate-800' : 'text-slate-300'
                              }`}
                            >
                              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[11px] font-medium ${
                                included ? 'text-slate-700' : 'text-slate-300'
                              }`}>
                                {included ? '\u2713' : '\u2014'}
                              </span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>

                {/* ── CTA ── */}
                <div className="mt-6 border-t border-[var(--line)] pt-5">
                  {plan.ctaDisabled ? (
                    <span className={`${disabledButtonClass} w-full justify-center`} title="We're not taking new companies right now">
                      {plan.cta}
                    </span>
                  ) : (
                    <a href={ctaHref} className={`${primaryButtonClass} w-full justify-center`}>
                      {plan.cta}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            We're not taking new companies right now. <a href={ctaHref} className={secondaryButtonClass}>{PRIMARY_CTA}</a> — get a free Company Scan and a 30-min strategy call right away.
          </p>
        </section>

        {/* ── 6. EMERGENCY BUTTON ── */}
        <section className="reveal border-b-[3px] border-[var(--line)] py-14">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              CAN'T WAIT?
            </p>
            <h2 className="mt-4 text-2xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-3xl">
              Emergency?
            </h2>
            <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-relaxed text-slate-600">
              If your situation is critical, we may be able to help outside our normal capacity.
              Tell us what's happening and we'll review your case within 24 hours.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowEmergency(!showEmergency)
                if (!showEmergency) {
                  window.setTimeout(() => {
                    document.getElementById('emergency')?.scrollIntoView({ behavior: 'smooth' })
                  }, 100)
                }
              }}
              className="mt-6 inline-flex items-center justify-center border border-rose-600 bg-white px-6 py-2.5 text-sm font-medium text-rose-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition-[border-color,color,transform,box-shadow,background-color] duration-200 hover:-translate-y-px hover:border-rose-700 hover:bg-rose-50 hover:shadow-[0_14px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
            >
              Submit an Emergency Request
            </button>
          </div>

          {showEmergency ? (
            <div id="emergency" className="mx-auto mt-10 max-w-2xl">
              <div className="border border-rose-200 bg-rose-50 px-6 py-6">
                <div className="flex flex-col gap-3 border-b border-rose-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-rose-700">
                      EMERGENCY REQUEST
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      Quick form. We review every request within 24 hours.
                    </p>
                  </div>
                  <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-rose-500">
                    4 fields
                  </p>
                </div>

                <form onSubmit={handleEmergencySubmit} noValidate className="mt-5 space-y-4">
                  <label className="block text-sm font-medium text-slate-800">
                    Name & company
                    <input
                      className={`mt-1 w-full border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.08)] ${
                        emergencyErrors.name ? 'border-rose-400' : 'border-rose-200'
                      }`}
                      value={emergencyForm.name}
                      onChange={(event) => updateEmergencyField('name', event.target.value)}
                      placeholder="Jane Smith, Acme Corp"
                      required
                    />
                    {emergencyErrors.name ? <span className="text-xs text-rose-500">{emergencyErrors.name}</span> : null}
                  </label>

                  <label className="block text-sm font-medium text-slate-800">
                    Preferred contact (email, phone, or LinkedIn)
                    <input
                      className={`mt-1 w-full border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.08)] ${
                        emergencyErrors.contact ? 'border-rose-400' : 'border-rose-200'
                      }`}
                      value={emergencyForm.contact}
                      onChange={(event) => updateEmergencyField('contact', event.target.value)}
                      placeholder="jane@acme.com or +1 555-0123"
                      required
                    />
                    {emergencyErrors.contact ? <span className="text-xs text-rose-500">{emergencyErrors.contact}</span> : null}
                  </label>

                  <label className="block text-sm font-medium text-slate-800">
                    What's the problem? (short description)
                    <textarea
                      className={`mt-1 w-full border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.08)] ${
                        emergencyErrors.problem ? 'border-rose-400' : 'border-rose-200'
                      }`}
                      rows={3}
                      value={emergencyForm.problem}
                      onChange={(event) => updateEmergencyField('problem', event.target.value)}
                      placeholder="e.g. Board meeting in 2 weeks, need AI portfolio audit before then..."
                      required
                    />
                    {emergencyErrors.problem ? <span className="text-xs text-rose-500">{emergencyErrors.problem}</span> : null}
                  </label>

                  <label className="block text-sm font-medium text-slate-800">
                    Budget range
                    <input
                      className={`mt-1 w-full border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.08)] ${
                        emergencyErrors.budget ? 'border-rose-400' : 'border-rose-200'
                      }`}
                      value={emergencyForm.budget}
                      onChange={(event) => updateEmergencyField('budget', event.target.value)}
                      placeholder="e.g. $15k-25k for the engagement"
                      required
                    />
                    {emergencyErrors.budget ? <span className="text-xs text-rose-500">{emergencyErrors.budget}</span> : null}
                  </label>

                  <div className="flex items-center justify-between border-t border-rose-200 pt-4">
                    <p className="text-sm text-slate-600">We review every request within 24 hours.</p>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center border border-rose-600 bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-rose-700 hover:bg-rose-700 hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                    >
                      Send Emergency Request
                    </button>
                  </div>

                  {emergencySubmitted ? (
                    <div className="border border-rose-200 bg-white p-5">
                      <h3 className="text-lg font-semibold text-slate-900">Emergency request sent</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        Your email draft is ready. If it didn't open automatically, use the link below. We'll review and respond within 24 hours.
                      </p>
                      <a href={buildEmergencyMailto(emergencyForm)} className="mt-3 inline-flex text-sm font-medium text-rose-700 underline underline-offset-4 hover:text-rose-900">
                        Open email draft again
                      </a>
                    </div>
                  ) : null}
                </form>
              </div>
            </div>
          ) : null}
        </section>

        {/* ── 7. PORTFOLIO COMPANIES ── */}
        <section className="reveal border-b-[3px] border-[var(--line)] py-14">
          <p className={sectionLabelClass}>WHERE WE'VE BUILT</p>
          <h2 className={sectionHeadingClass}>
            Companies we've helped go AI-native.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {portfolioCompanies.map((company) => (
              <div key={company.name} className={cardClass}>
                <p className="text-base font-semibold text-slate-900">{company.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{company.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 9. FAQ ── */}
        <section className="reveal border-b-[3px] border-[var(--line)] py-14">
          <p className={sectionLabelClass}>QUESTIONS</p>
          <h2 className={sectionHeadingClass}>
            Things people ask before they reach out.
          </h2>
          <div className="mt-8 max-w-3xl">
            {faqItems.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* ── 10. LINKEDIN ── */}
        <section className="reveal border-b-[3px] border-[var(--line)] py-14">
          <div className={panelClass}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="shrink-0 rounded-full border border-[var(--line)] bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                  <img
                    src="/profile.png"
                    alt={linkedinProfile.name}
                    className="h-16 w-16 rounded-full object-cover object-center sm:h-18 sm:w-18"
                    loading="eager"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold tracking-[-0.02em] text-slate-950 sm:text-lg">
                      {linkedinProfile.name}
                    </p>
                    <span className={metaChipClass}>LinkedIn</span>
                  </div>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-slate-800">{linkedinProfile.role}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{linkedinProfile.detail}</p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 lg:items-end">
                <a href={LINKEDIN_PROFILE} target="_blank" rel="noreferrer" className={utilityButtonClass}>
                  <LinkedInIcon />
                  Follow on LinkedIn
                </a>
                <p className="text-xs leading-relaxed text-slate-500 lg:text-right">
                  I write about business scaling and practical AI use cases.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 11. WAITLIST + FREE SCAN FORM ── */}
        <section id="scan" className="reveal py-14">
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="flex h-full flex-col lg:col-span-7 lg:pr-4">
                <div>
                  <p className={sectionLabelClass}>JOIN THE WAITLIST — FREE SCAN INCLUDED</p>
                  <h2 className={sectionHeadingClass}>
                    Get on the list. Get your free Company Scan now.
                  </h2>
                  <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
                    Tell us about your company and what's happening with AI right now.
                    We'll come back with a clear map of where the real opportunities are — and you'll be first in line when a spot opens.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 lg:mt-auto">
                  <span className={metaChipClass}>2-minute form</span>
                  <span className={metaChipClass}>Free scan + 30-min call</span>
                  <span className={metaChipClass}>Results in ~1 week</span>
                </div>
              </div>

              <aside className={`flex h-full flex-col lg:col-span-5 ${panelClass}`}>
                <p className={sectionLabelClass}>WHAT HAPPENS NEXT</p>
                <div className="mt-5 flex flex-1 flex-col text-sm leading-relaxed text-slate-700">
                  <div className="flex-1 pt-0">
                    <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Within 48 hours</p>
                    <p className="mt-2">We confirm your spot on the waitlist and begin your scan.</p>
                  </div>
                  <div className="flex-1 border-t border-[var(--line)] pt-4">
                    <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Day 3-5</p>
                    <p className="mt-2">Free 30-min strategy call to walk through your AI landscape.</p>
                  </div>
                  <div className="flex-1 border-t border-[var(--line)] pt-4">
                    <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Day 5-7</p>
                    <p className="mt-2">Your scan results with a clear action plan. You keep everything.</p>
                  </div>
                </div>
              </aside>
            </div>

            <div className={inversePanelClass}>
              <div className="flex flex-col gap-3 border-b border-[rgba(255,255,255,0.14)] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={inverseSectionLabelClass}>WAITLIST + FREE COMPANY SCAN</p>
                  <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-slate-100">
                    Tell us where you are with AI. We'll show you where the money is — and save your spot.
                  </p>
                </div>
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">
                  5 fields — that's it
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="text-sm font-medium text-slate-100">
                    Your name
                    <input
                      className={inputClass(Boolean(errors.fullName))}
                      value={form.fullName}
                      onChange={(event) => updateField('fullName', event.target.value)}
                      autoComplete="name"
                      required
                    />
                    {errors.fullName ? <span className="text-xs text-rose-400">{errors.fullName}</span> : null}
                  </label>
                  <label className="text-sm font-medium text-slate-100">
                    Work email
                    <input
                      className={inputClass(Boolean(errors.workEmail))}
                      value={form.workEmail}
                      onChange={(event) => updateField('workEmail', event.target.value)}
                      autoComplete="email"
                      required
                    />
                    {errors.workEmail ? <span className="text-xs text-rose-400">{errors.workEmail}</span> : null}
                  </label>
                  <label className="text-sm font-medium text-slate-100">
                    Company
                    <input
                      className={inputClass(Boolean(errors.company))}
                      value={form.company}
                      onChange={(event) => updateField('company', event.target.value)}
                      required
                    />
                    {errors.company ? <span className="text-xs text-rose-400">{errors.company}</span> : null}
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-100">
                  What's your biggest AI challenge right now?
                  <textarea
                    className={inputClass(Boolean(errors.biggestChallenge))}
                    rows={3}
                    value={form.biggestChallenge}
                    onChange={(event) => updateField('biggestChallenge', event.target.value)}
                    placeholder="e.g. We have 6 pilots but nothing made it to production yet..."
                    required
                  />
                  {errors.biggestChallenge ? <span className="text-xs text-rose-400">{errors.biggestChallenge}</span> : null}
                </label>

                <label className="block text-sm font-medium text-slate-100">
                  How soon do you need this?
                  <div className="relative mt-1">
                    <select
                      className={selectClass(Boolean(errors.urgency))}
                      value={form.urgency}
                      onChange={(event) => updateField('urgency', event.target.value)}
                      required
                    >
                      <option value="">Pick one</option>
                      <option value="Now (this month)">Now — this month</option>
                      <option value="Soon (1-3 months)">Soon — next 1-3 months</option>
                      <option value="Planning (3-6 months)">Planning — 3-6 months out</option>
                      <option value="Just exploring">Just exploring</option>
                    </select>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300"
                    >
                      <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {errors.urgency ? <span className="text-xs text-rose-400">{errors.urgency}</span> : null}
                </label>

                <div className="flex flex-col gap-4 border-t border-[rgba(255,255,255,0.14)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-300">
                    Free scan + 30-min strategy call. You keep everything we find. First in line when a spot opens.
                  </p>
                  <button type="submit" className={primaryButtonClass}>
                    {PRIMARY_CTA}
                  </button>
                </div>

                {submitted ? (
                  <div className="space-y-4 border-t border-[rgba(255,255,255,0.14)] pt-5">
                    <div className="space-y-4 border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] p-5">
                      <h3 className="text-lg font-semibold tracking-[-0.01em] text-white">You're on the waitlist</h3>
                      <p className="text-sm leading-relaxed text-slate-100">
                        Your email draft is ready. If it didn't open, use the link below. We'll start your free Company Scan and reach out within 48 hours.
                      </p>
                      <a href={buildMailto(form)} className={primaryButtonClass}>
                        Open email draft again
                      </a>
                      <div className="grid gap-3 text-sm text-slate-100 sm:grid-cols-3">
                        <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] p-4">
                          <p className="font-medium uppercase tracking-[0.08em] text-slate-300">Within 48 hours</p>
                          <p className="mt-2">We confirm your waitlist spot and start the scan.</p>
                        </div>
                        <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] p-4">
                          <p className="font-medium uppercase tracking-[0.08em] text-slate-300">Day 3-5</p>
                          <p className="mt-2">Quick call about your business.</p>
                        </div>
                        <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] p-4">
                          <p className="font-medium uppercase tracking-[0.08em] text-slate-300">Day 5-7</p>
                          <p className="mt-2">Your scan results and action plan.</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300">
                        Questions?{' '}
                        <a className="font-medium text-white" href={`mailto:${PRIMARY_EMAIL}`}>{PRIMARY_EMAIL}</a>
                      </p>
                    </div>
                  </div>
                ) : null}
              </form>
            </div>
          </div>
        </section>

        <footer className="reveal mt-4 flex flex-col gap-4 border-t-[3px] border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={`mailto:${PRIMARY_EMAIL}`}
            className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
          >
            {PRIMARY_EMAIL}
          </a>
          <p className="text-sm text-slate-600">Fully booked. Join the waitlist. Get your free scan now.</p>
        </footer>
      </main>
    </div>
  )
}
