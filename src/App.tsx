import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import SiteHeader from "./components/SiteHeader";
import WarpedGrid from "./components/WarpedGrid";
import { GRID_CELL_PX, SHORT_DIVIDER_GRID_SPAN } from "./layout";

// ── Client logos ──
import logoBattlbox from "./assets/logos/battlbox.svg";
import logoBalaHealth from "./assets/logos/bala-health.svg";
import logoBeardClub from "./assets/logos/beard-club.png";
import logoBubsNaturals from "./assets/logos/bubs-naturals.svg";
import logoCrateCub from "./assets/logos/crate-club.svg";
import logoCymbiotika from "./assets/logos/cymbiotika.png";
import logoDiamondsByUk from "./assets/logos/diamonds-by-uk.svg";
import logoHoundsy from "./assets/logos/houndsy.png";
import logoLandAndSea from "./assets/logos/land-and-sea.svg";
import logoPlateCrate from "./assets/logos/plate-crate.png";
import logoPraella from "./assets/logos/praella.svg";
import logoSerenity from "./assets/logos/serenity.png";
import logoShipaid from "./assets/logos/shipaid.svg";
import logoTevello from "./assets/logos/tevello.svg";
import logoTrimrx from "./assets/logos/trimrx.svg";
import logoVinylMePlease from "./assets/logos/vinyl-me-please.png";

// ── Portfolio logos ──
import logoFlyrank from "./assets/our-logos/flyrank.svg";
import logoSpyrank from "./assets/our-logos/spyrank.svg";
import logoSaasInsights from "./assets/our-logos/saas-insights.svg";
import logoJaqAndJil from "./assets/our-logos/jaq-and-jil.svg";
import logoKinetic from "./assets/our-logos/kinetic.svg";
import logo10x from "./assets/our-logos/10x.svg";
import logoPowercommerce from "./assets/our-logos/powercommerce.svg";

// ── Alumni logos ──
import logoShopCircle from "./assets/logos-old/shop-circle.svg";
import logoHulkapps from "./assets/logos-old/hulkapps.svg";
import logoCarthook from "./assets/logos-old/carthook.svg";
import logoReleasit from "./assets/logos-old/releasit.svg";
import logoAccentuate from "./assets/logos-old/accentuate.svg";

const PRIMARY_EMAIL = "mirza@10x.ai";
const LINKEDIN_PROFILE = "https://www.linkedin.com/in/mirzaasceric/";
const PRIMARY_CTA = "Join the Waitlist";
const disabledButtonClass =
  "inline-flex cursor-not-allowed items-center justify-center border border-[var(--line)] bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-400";
const primaryButtonClass =
  "inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2";
const secondaryButtonClass =
  "inline-flex items-center justify-center text-sm font-medium text-[var(--accent)] underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]";
const surfaceClass = "border border-[var(--line)] bg-[var(--surface)]";
const panelClass = `premium-panel ${surfaceClass} p-6`;
const cardClass = `premium-card ${surfaceClass} p-5`;
const inversePanelClass =
  "border border-[var(--accent)] bg-[var(--accent)] px-6 py-6 text-slate-100 shadow-[0_18px_38px_rgba(15,23,42,0.12)]";
const inverseSectionLabelClass =
  "inline-flex w-fit items-center bg-[rgba(255,255,255,0.12)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-white";
const sectionLabelClass =
  "inline-flex w-fit items-center bg-white px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]";
const sectionHeadingClass =
  "mt-4 max-w-[22ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl";
const stackedSectionClass = "reveal section-divider-full py-14 sm:py-16";
const shortDividerSectionClass = "reveal section-divider-short py-14 sm:py-16";
const splitSectionNoDividerClass =
  "reveal py-14 sm:py-16 lg:grid lg:grid-cols-12 lg:gap-8";
const compactStripSectionClass =
  "reveal delay-2 section-divider-short py-8 sm:py-10";
const finalSectionClass = "reveal py-14 sm:py-16";
const metaChipClass =
  "inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]";
const gridSystemStyle = {
  "--grid-cell": `${GRID_CELL_PX}px`,
  "--short-divider-span": `${SHORT_DIVIDER_GRID_SPAN}`,
} as CSSProperties;

// ── DATA ──

const clientLogos = [
  { src: logoPraella, name: "Praella", png: false },
  { src: logoCymbiotika, name: "Cymbiotika", png: true },
  { src: logoBubsNaturals, name: "Bubs Naturals", png: false },
  { src: logoShipaid, name: "ShipAid", png: false },
  { src: logoTevello, name: "Tevello", png: false },
  { src: logoBattlbox, name: "BattlBox", png: false },
  { src: logoBeardClub, name: "Beard Club", png: true },
  { src: logoCrateCub, name: "Crate Club", png: false },
  { src: logoDiamondsByUk, name: "Diamonds by UK", png: false },
  { src: logoVinylMePlease, name: "Vinyl Me, Please", png: true },
  { src: logoSerenity, name: "Serenity", png: true },
  { src: logoBalaHealth, name: "Bala Health", png: false },
  { src: logoHoundsy, name: "Houndsy", png: true },
  { src: logoLandAndSea, name: "Land and Sea", png: false },
  { src: logoPlateCrate, name: "Plate Crate", png: true },
  { src: logoTrimrx, name: "TrimRx", png: false },
];

const portfolioLogos = [
  { src: logoFlyrank, name: "FlyRank", png: false },
  { src: logoSpyrank, name: "SpyRank", png: false },
  { src: logoSaasInsights, name: "SaaS Insights", png: false },
  { src: logoJaqAndJil, name: "Jaq & Jil", png: false },
  { src: logoKinetic, name: "Kinetic", png: false },
  { src: logo10x, name: "10x", png: false },
  { src: logoPowercommerce, name: "Powercommerce", png: false },
];

const alumniLogos = [
  { src: logoShopCircle, name: "Shop Circle", png: false },
  { src: logoHulkapps, name: "Hulk Apps", png: false },
  { src: logoCarthook, name: "CartHook", png: false },
  { src: logoReleasit, name: "Releasit", png: false },
  { src: logoAccentuate, name: "Accentuate", png: false },
];

const dreamOutcomes = [
  "One dashboard with every AI project",
  "Legal and security know what's happening",
  "Your board gets real numbers, not a slide deck",
  "A clear plan for the next two years",
];

const painPoints = [
  "You bought tools, hired people, ran pilots. Still no revenue from any of it.",
  "Marketing uses one tool. Engineering uses another. Nobody knows what anyone else is doing.",
  "Legal finds out about an AI project three months in and kills it. Wasted time, wasted money.",
  "The board asks \"what's AI doing for us?\" and you don't have an answer.",
];

const featureGroups = [
  {
    label: "THE SYSTEM",
    features: [
      "Full AI Portfolio Map",
      "Priority Decisions: Keep, Kill, or Scale",
      "Legal and Security Handled",
      "Weekly Decision Meetings",
    ],
  },
  {
    label: "THE DASHBOARD",
    features: ["Revenue & Cost Dashboard", "All Your Tools in One Place"],
  },
  {
    label: "THE PEOPLE",
    features: ["Training Your Team to Use It", "Making Sure It Ships"],
  },
  {
    label: "THE ARMY",
    features: [
      "Up to 20–30 Dedicated AI Engineers",
      "2–5x More Output Across the Company",
      "Access to our in-house expert team for: design, copywriting, SEO, development, and more",
    ],
  },
  {
    label: "THE EMPIRE",
    features: [
      "AI Across All Your Companies",
      "FlyRank Platform Integration",
      "Dedicated Executive Partner",
      "Priority Support & Custom Terms",
    ],
  },
];

const plans = [
  {
    name: "COMMAND ROOM",
    subtitle: "We run AI with your team",
    price: "$22,000",
    period: "/mo",
    anchor: "Replaces a $350K–$600K/yr internal AI strategy hire",
    anchorSource: {
      label: "Glassdoor 2026",
      url: "https://www.glassdoor.com/Salaries/chief-ai-officer-salary-SRCH_KO0,16.htm",
    },
    scarcity: "0 spots available",
    description:
      "We sync with you every week and make decisions with your leaders. We define full strategy, fix what's broken, and train your team to run it without us",
    cta: "Apply",
    ctaDisabled: true,
    highlighted: true,
    includedGroups: 3,
    valueStack: [
      { name: "Fractional Chief AI Officer", value: "$15,000/mo" },
      { name: "Weekly Executive Strategy Sessions", value: "$8,000/mo" },
      { name: "AI Governance & Compliance Framework", value: "$5,000/mo" },
      { name: "Revenue & Cost Dashboard", value: "$3,000/mo" },
      { name: "Team Training & Enablement", value: "$4,000/mo" },
    ],
    valueStackOneTime: [
      { name: "AI Portfolio Reality Scan", value: "$15,000" },
    ],
    totalMonthlyValue: "$35,000/mo",
    savings: "You save $13,000/mo + $15,000 one-time",
  },
  {
    name: "10X EMPIRE",
    subtitle: "Your dedicated AI team",
    price: "$290,000",
    period: "/mo",
    anchor: "$580/head vs. $5,000–$15,000/head industry average",
    anchorSource: {
      label: "AI consulting benchmarks 2026",
      url: "https://www.leanware.co/insights/how-much-does-an-ai-consultant-cost",
    },
    scarcity: "Coming Q3 2026",
    description:
      "Our team becomes your team. Up to 20–30 dedicated engineers building, shipping, and scaling AI across your entire organization.",
    cta: "Request Early Access",
    ctaDisabled: false,
    highlighted: false,
    includedGroups: 4,
    valueStack: [
      { name: "20–30 Dedicated AI Engineers", value: "$250,000/mo" },
      { name: "Full COMMAND ROOM Strategy Layer", value: "$35,000/mo" },
      { name: "External Team (Design, Copy, SEO, Dev)", value: "$25,000/mo" },
      { name: "Cross-Org Scaling & Integration", value: "$20,000/mo" },
      { name: "Organization-Wide Leverage System", value: "$15,000/mo" },
    ],
    valueStackOneTime: [
      { name: "AI Portfolio Reality Scan", value: "$15,000" },
    ],
    totalMonthlyValue: "$345,000/mo",
    savings: "You save $55,000/mo + $15,000 one-time",
  },
  {
    name: "PORTFOLIO ENGINE",
    subtitle: "Custom solutions for your portfolio",
    price: "Custom",
    period: "",
    anchor: "Base retainer + 10–20% of documented savings",
    anchorSource: null,
    scarcity: "By invitation only",
    description:
      "You own multiple companies. We run AI across all of them. Same system, shared learnings, one team running the whole thing. Optional Hybrid pricing: base retainer plus performance kicker tied to verified value created.",
    cta: "Book a Portfolio Review",
    ctaDisabled: false,
    highlighted: false,
    includedGroups: 5,
    valueStack: [
      { name: "Everything in 10X EMPIRE", value: "" },
      { name: "Multi-Entity Portfolio Governance", value: "" },
      { name: "FlyRank Platform Integration", value: "" },
      { name: "Dedicated Executive Partner", value: "" },
      { name: "Custom SLA & Priority Support", value: "" },
    ],
    valueStackOneTime: [{ name: "AI Portfolio Reality Scan", value: "" }],
    totalMonthlyValue: null,
    savings: null,
  },
];

const fitFor = [
  "You're a decision maker who wants AI to actually move the needle",
  "You're already spending on AI and you're tired of presentations with no results",
  "Your team is willing to change how they work, not just bolt on another tool",
];

const fitNotFor = [
  "You want full transformation in 30 days. That's not how this works.",
  "You just want a chatbot. We do a lot more than that.",
  'Nobody at your company can say "yes" without three months of meetings.',
];

const faqItems = [
  {
    q: "We already have an AI strategy. Why do we need this?",
    a: 'Most companies have a strategy. The problem is never the plan — it\'s what happens after. We don\'t write decks. We build the system that gets AI from "good idea" to "running and making money."',
  },
  {
    q: "How is this different from McKinsey or Deloitte?",
    a: "They write a deck, send an invoice, and leave. We stay. We sit in your meetings every week, make decisions with your people, and if nothing ships — that's on us. We don't get paid to be smart. We get paid to get results.",
  },
  {
    q: "You're fully booked. Why should I join the waitlist?",
    a: "We rotate clients as engagements mature. First-come, first-served. You get a complimentary AI Portfolio Reality Scan (valued at $15,000) and a 40-minute strategy call right away — so we already know your situation and can move fast when your turn comes.",
  },
  {
    q: "What if I have an emergency and can't wait?",
    a: "Use the Emergency button on this page. If it's critical enough, we'll find a way. We review every emergency request within 24 hours.",
  },
  {
    q: "What if $22,000/month is too much?",
    a: "Don't start there. Start with the complimentary AI Portfolio Reality Scan (valued at $15,000). Takes a week, costs nothing, and you keep everything we find. If the math works after that, we talk about the retainer. If not, you still walk away with a real plan. No hard feelings.",
  },
  {
    q: "How fast will we see results?",
    a: "Complimentary scan results in about a week. Once you're a client: full project map, clear priorities, and governance running within 30 days. First production-ready workflow within 90 days.",
  },
  {
    q: "What industries do you work with?",
    a: "Companies with real operational volume — financial services, manufacturing, logistics, SaaS, healthcare, e-commerce. If your business runs on repeatable work, AI can make a real difference.",
  },
  {
    q: "Do we need a big internal AI team?",
    a: "No. That's the whole point. We bring the system, the structure, and the oversight. You bring your business knowledge and the people who make decisions.",
  },
];

// ── WAITLIST FORM ──

type Field =
  | "fullName"
  | "workEmail"
  | "company"
  | "biggestChallenge"
  | "urgency";

type FormState = Record<Field, string>;
type ErrorState = Partial<Record<Field, string>>;

const initialFormState: FormState = {
  fullName: "",
  workEmail: "",
  company: "",
  biggestChallenge: "",
  urgency: "",
};

function buildMailto(form: FormState): string {
  const subject = encodeURIComponent(
    `Waitlist + Complimentary AI Portfolio Reality Scan — ${form.company}`,
  );
  const body = encodeURIComponent(
    [
      "Waitlist + Complimentary AI Portfolio Reality Scan Request",
      "",
      `Name: ${form.fullName}`,
      `Email: ${form.workEmail}`,
      `Company: ${form.company}`,
      `Biggest AI challenge: ${form.biggestChallenge}`,
      `How soon: ${form.urgency}`,
    ].join("\n"),
  );
  return `mailto:${PRIMARY_EMAIL}?subject=${subject}&body=${body}`;
}

// ── EMERGENCY FORM ──

type EmergencyField = "name" | "contact" | "problem" | "budget";

type EmergencyFormState = Record<EmergencyField, string>;
type EmergencyErrorState = Partial<Record<EmergencyField, string>>;

const initialEmergencyState: EmergencyFormState = {
  name: "",
  contact: "",
  problem: "",
  budget: "",
};

function buildEmergencyMailto(form: EmergencyFormState): string {
  const subject = encodeURIComponent(`EMERGENCY AI Request — ${form.name}`);
  const body = encodeURIComponent(
    [
      "Emergency AI Transformation Request",
      "",
      `Name / Company: ${form.name}`,
      `Preferred contact: ${form.contact}`,
      `Problem: ${form.problem}`,
      `Budget: ${form.budget}`,
    ].join("\n"),
  );
  return `mailto:${PRIMARY_EMAIL}?subject=${subject}&body=${body}`;
}

// ── SHARED UI ──

function inputClass(hasError: boolean): string {
  return `mt-1 w-full border bg-[rgba(255,255,255,0.08)] px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark] transition-[border-color,box-shadow,background-color] duration-200 caret-white focus:border-white focus:bg-[rgba(255,255,255,0.12)] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] ${
    hasError ? "border-rose-400" : "border-[rgba(255,255,255,0.16)]"
  }`;
}

function selectClass(hasError: boolean): string {
  return `w-full appearance-none border bg-[rgba(255,255,255,0.08)] px-3 py-2.5 pr-11 text-sm text-white outline-none [color-scheme:dark] transition-[border-color,box-shadow,background-color] duration-200 caret-white focus:border-white focus:bg-[rgba(255,255,255,0.12)] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] ${
    hasError ? "border-rose-400" : "border-[rgba(255,255,255,0.16)]"
  }`;
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
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
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </button>
      {open ? (
        <p className="pb-5 text-sm leading-relaxed text-slate-600">{a}</p>
      ) : null}
    </div>
  );
}

// ── APP ──

export default function App() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<ErrorState>({});
  const [submitted, setSubmitted] = useState(false);

  const [emergencyForm, setEmergencyForm] = useState<EmergencyFormState>(
    initialEmergencyState,
  );
  const [emergencyErrors, setEmergencyErrors] = useState<EmergencyErrorState>(
    {},
  );
  const [emergencySubmitted, setEmergencySubmitted] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  const ctaHref = "#scan";

  function updateField(field: Field, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function validate(nextForm: FormState): ErrorState {
    const nextErrors: ErrorState = {};
    (Object.keys(nextForm) as Field[]).forEach((field) => {
      if (!nextForm[field].trim()) {
        nextErrors[field] = "Required";
      }
    });
    if (
      nextForm.workEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextForm.workEmail)
    ) {
      nextErrors.workEmail = "Enter a valid work email";
    }
    return nextErrors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSubmitted(true);
    window.setTimeout(() => {
      window.location.href = buildMailto(form);
    }, 80);
  }

  function updateEmergencyField(field: EmergencyField, value: string) {
    setEmergencyForm((previous) => ({ ...previous, [field]: value }));
    setEmergencyErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function validateEmergency(
    nextForm: EmergencyFormState,
  ): EmergencyErrorState {
    const nextErrors: EmergencyErrorState = {};
    (Object.keys(nextForm) as EmergencyField[]).forEach((field) => {
      if (!nextForm[field].trim()) {
        nextErrors[field] = "Required";
      }
    });
    return nextErrors;
  }

  function handleEmergencySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateEmergency(emergencyForm);
    if (Object.keys(nextErrors).length > 0) {
      setEmergencyErrors(nextErrors);
      return;
    }
    setEmergencySubmitted(true);
    window.setTimeout(() => {
      window.location.href = buildEmergencyMailto(emergencyForm);
    }, 80);
  }

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0))]" />
      <WarpedGrid />

      <main
        className="relative mx-auto w-full max-w-[1240px] px-6 pb-20 pt-8 sm:px-8 lg:px-10 lg:pt-10"
        style={gridSystemStyle}
      >
        <div className="sticky top-0 z-50 -mx-6 px-6 py-4 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
          <SiteHeader
            applyHref="#scan"
            founderLinkedIn={LINKEDIN_PROFILE}
            homeHref="/"
            whatWeDoHref="/how-we-work/"
          />
        </div>

        {/* ── 1. HERO: Split layout matching how-we-work ── */}
        <section
          id="overview"
          className={`${splitSectionNoDividerClass} gap-8`}
        >
          <div className="flex h-full flex-col lg:col-span-7 lg:pr-6">
            <div>
              <p className={sectionLabelClass}>AI THAT ACTUALLY WORKS</p>
              <h1 className="mt-6 max-w-[13ch] text-4xl font-semibold leading-[1.01] tracking-[-0.04em] [text-wrap:balance] sm:text-5xl lg:text-[4rem]">
                We make AI work for your business.{" "}
                <span className="bg-[var(--accent)] px-[0.08em] text-white [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                  Not the other way around.
                </span>
              </h1>
              <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-slate-700">
                More revenue. Lower costs. Your team gets more done in less
                time. We build the system, we run it with you every week, and we
                don't stop until the numbers prove it's working.
              </p>
            </div>

            <div className="mt-8 lg:mt-auto lg:pt-10">
              <a href="#plans" className={primaryButtonClass}>
                See Plans
              </a>
              <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-slate-500">
                Choose the plan that fits your organization best.
              </p>
            </div>
          </div>

          <aside
            className={`relative flex h-full flex-col lg:col-span-5 ${panelClass}`}
          >
            {/* ── Floating label ── */}
            <span className="absolute -top-3 right-6 z-10 bg-[var(--accent)] px-3 py-1 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-white shadow-sm">
              Free 40-min strategy call
            </span>

            <p className="text-xl font-semibold leading-snug tracking-[-0.02em] text-slate-950">
              30 days from now
            </p>

            <div className="mt-5 border-t border-[var(--line)] pt-5">
              <p className={sectionLabelClass}>WHAT YOUR COMPANY LOOKS LIKE</p>
              <ul className="mt-4 space-y-3">
                {dreamOutcomes.map((outcome) => (
                  <li key={outcome} className="flex items-start gap-2.5">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 bg-[var(--accent)]" />
                    <p className="text-sm leading-relaxed text-slate-700">
                      {outcome}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto border-t border-[var(--line)] pt-5">
              <span
                className={`${disabledButtonClass} w-full justify-center`}
                title="We're not taking new companies right now"
              >
                Apply
              </span>
              <a
                href={ctaHref}
                className="mt-3 block text-center text-sm font-medium text-[var(--accent)] underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]"
              >
                {PRIMARY_CTA}
              </a>
              <p className="mt-3 text-center text-sm leading-relaxed text-slate-500">
                We're not taking new companies right now. Join the waitlist and
                get your complimentary scan while you wait.
              </p>
            </div>
          </aside>
        </section>

        {/* ── 2. PROOF STRIP ── */}
        <section className={compactStripSectionClass}>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            <div className="flex items-center gap-2">
              <span className="font-['IBM_Plex_Mono'] text-2xl font-semibold text-slate-950">
                $1M+
              </span>
              <span className="text-sm text-slate-500">
                ARR built in &lt;8 months
              </span>
            </div>
            <div className="hidden h-5 border-l border-[var(--line)] sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-['IBM_Plex_Mono'] text-2xl font-semibold text-slate-950">
                25+
              </span>
              <span className="text-sm text-slate-500">
                companies using our AI systems
              </span>
            </div>
            <div className="hidden h-5 border-l border-[var(--line)] sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-['IBM_Plex_Mono'] text-2xl font-semibold text-slate-950">
                20B+
              </span>
              <span className="text-sm text-slate-500">tokens spent</span>
            </div>
          </div>
        </section>

        {/* ── THE PROMISE ── */}
        <section className={shortDividerSectionClass}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-3xl font-semibold leading-[1.15] tracking-[-0.03em] [text-wrap:balance] sm:text-4xl lg:text-[2.75rem]">
              If we can't get a production-ready AI workflow live in 90 days{" "}
              <span className="text-[var(--muted)]">
                — we keep working for free until we do.
              </span>
            </p>
            <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              <span>
                Only works if we talk to the people who can make decisions
              </span>
              <span className="hidden text-[var(--line)] sm:inline">|</span>
              {/* <span>Free Company Scan when you join the waitlist</span>
              <span className="hidden text-[var(--line)] sm:inline">|</span>
              <span>First in line, first to get a spot</span> */}
            </div>
          </div>
        </section>

        {/* ── MARKET REALITY ── */}
        <section className={shortDividerSectionClass}>
          <p className={sectionLabelClass}>THE REALITY</p>
          <h2 className={sectionHeadingClass}>
            Most companies are burning money on AI with nothing to show for it.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className={`${cardClass} flex flex-col`}>
              <p className="font-['IBM_Plex_Mono'] text-3xl font-semibold text-slate-950">
                56%
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                of CEOs report no tangible return from their AI investments.
              </p>
              <p className="mt-auto pt-4 text-[11px] leading-relaxed text-slate-400">
                <a
                  href="https://www.pwc.com/gx/en/issues/c-suite-insights/ceo-survey.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600 hover:decoration-slate-500"
                >
                  PwC 2026 Global CEO Survey
                </a>
              </p>
            </article>
            <article className={`${cardClass} flex flex-col`}>
              <p className="font-['IBM_Plex_Mono'] text-3xl font-semibold text-slate-950">
                48%
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                of AI projects ever make it to production. The rest die as
                pilots.
              </p>
              <p className="mt-auto pt-4 text-[11px] leading-relaxed text-slate-400">
                <a
                  href="https://www.gartner.com/en/newsroom/press-releases/2024-05-07-gartner-survey-finds-generative-ai-is-now-the-most-frequently-deployed-ai-solution-in-organizations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600 hover:decoration-slate-500"
                >
                  Gartner 2024 AI in Organizations Survey
                </a>
              </p>
            </article>
            <article className={`${cardClass} flex flex-col`}>
              <p className="font-['IBM_Plex_Mono'] text-3xl font-semibold text-slate-950">
                42%
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                of enterprises scrapped AI initiatives last year — often due to
                overly aggressive timelines.
              </p>
              <p className="mt-auto pt-4 text-[11px] leading-relaxed text-slate-400">
                <a
                  href="https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600 hover:decoration-slate-500"
                >
                  McKinsey State of AI 2025
                </a>
              </p>
            </article>
          </div>
        </section>

        {/* ── 3. PAIN + COST OF INACTION ── */}
        <section className={shortDividerSectionClass}>
          <p className={sectionLabelClass}>SOUND FAMILIAR?</p>
          <h2 className={sectionHeadingClass}>
            You've spent money on AI. You can't point to one dollar it made
            back.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-12">
            {painPoints.map((point) => (
              <article key={point} className={`md:col-span-6 ${cardClass}`}>
                <p className="text-sm leading-relaxed text-slate-700">
                  {point}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-16 flex flex-col items-center text-center">
            <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              YOU KNOW YOU NEED A SYSTEM AND
            </p>
            <p className="mt-6 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-5xl lg:text-[3.5rem]">
              <span className="bg-white px-[0.12em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                Every month you wait, your competitors get further ahead.
              </span>
            </p>
          </div>
        </section>

        {/* ── FIT / NOT FIT ── */}
        <section className={stackedSectionClass}>
          <p className={sectionLabelClass}>IS THIS FOR YOU?</p>
          <h2 className={sectionHeadingClass}>This isn't for everyone.</h2>

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
                      <p className="max-w-[40ch] text-sm leading-relaxed text-slate-800">
                        {item}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-[rgba(255,255,255,0.12)] bg-[var(--accent)] px-6 py-5">
                    <div className="flex items-start gap-4">
                      <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
                        0{index + 1}
                      </p>
                      <p className="max-w-[40ch] text-sm leading-relaxed text-slate-100">
                        {fitNotFor[index]}
                      </p>
                    </div>
                  </div>
                  <div className="absolute left-1/2 top-1/2 hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--line)] bg-white lg:block" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHERE WE'VE COOKED ── */}
        <section className={stackedSectionClass}>
          <p className={sectionLabelClass}>WHERE WE'VE COOKED</p>
          <h2 className={sectionHeadingClass}>AI deployed.</h2>

          {/* ── Client companies ── */}
          <div className="mt-12">
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
                    logo.png ? "invert" : ""
                  }`}
                  loading="lazy"
                />
              ))}
            </div>
          </div>

          {/* ── Portfolio companies ── */}
          <div className="mt-20">
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
                    logo.png ? "invert" : ""
                  }`}
                  loading="lazy"
                />
              ))}
            </div>
          </div>

          {/* ── Alumni companies ── */}
          <div className="mt-20">
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
                    logo.png ? "invert" : ""
                  }`}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. PLANS ── */}
        <section id="plans" className={stackedSectionClass}>
          <p className={sectionLabelClass}>PLANS</p>
          <h2 className={sectionHeadingClass}>Three ways to make it happen.</h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
            From weekly advisory to a full team of engineers inside your
            business. Pick the level that fits. We build it and run it with your
            people.
          </p>

          {/* ── Plan cards ── */}
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col border p-6 ${
                  plan.highlighted
                    ? "border-[var(--accent)] bg-[rgba(15,23,42,0.015)] shadow-[var(--shadow-panel)]"
                    : "border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
                } transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:shadow-[0_18px_32px_rgba(15,23,42,0.08)]`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-6 bg-[var(--accent)] px-3 py-1 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-white">
                    Most Popular
                  </span>
                )}

                {/* ── Header: subtitle + name ── */}
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  {plan.subtitle}
                </p>
                <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.02em] text-slate-950">
                  {plan.name}
                </h3>

                {/* ── Price block (moved up) ── */}
                <div className="mt-4">
                  {plan.totalMonthlyValue && (
                    <span className="text-base font-medium tracking-[-0.01em] text-slate-400 line-through decoration-[1.5px] decoration-slate-400">
                      {plan.totalMonthlyValue}
                    </span>
                  )}
                  <div
                    className={`${plan.totalMonthlyValue ? "mt-1" : ""} inline-flex items-baseline gap-1 ${plan.price === "Custom" ? "border border-[var(--accent)] px-2.5 py-1" : "bg-[var(--accent)] px-2.5 py-1"}`}
                  >
                    <span
                      className={`text-2xl font-semibold tracking-[-0.02em] ${plan.price === "Custom" ? "text-[var(--accent)]" : "text-white"}`}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span
                        className={`text-sm font-normal ${plan.price === "Custom" ? "text-[var(--accent)]/60" : "text-white/70"}`}
                      >
                        {plan.period}
                      </span>
                    )}
                  </div>
                  {plan.savings && (
                    <p className="mt-1.5 font-['IBM_Plex_Mono'] text-[11px] font-medium text-[var(--accent)]">
                      {plan.savings}
                    </p>
                  )}
                  <p className="mt-2 font-['IBM_Plex_Mono'] text-[11px] font-medium text-slate-500">
                    {plan.anchor}
                    {plan.anchorSource ? (
                      <>
                        {" — "}
                        <a
                          href={plan.anchorSource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700 hover:decoration-slate-500"
                        >
                          {plan.anchorSource.label}
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>

                {/* ── Description + scarcity ── */}
                <div className="mt-4 border-t border-[var(--line)] pt-4">
                  <p className="text-sm leading-relaxed text-slate-600">
                    {plan.description}
                  </p>
                  <span className="mt-3 inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2 py-0.5 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                    {plan.scarcity}
                  </span>
                </div>

                {/* ── Value stack ── */}
                {plan.valueStack ? (
                  <div className="mt-4 border-t border-[var(--line)] pt-4">
                    <p className="font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                      What you'd pay separately
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {plan.valueStack.map((item) => (
                        <li
                          key={item.name}
                          className="flex items-start justify-between gap-3 text-[13px]"
                        >
                          <span className="text-slate-950">{item.name}</span>
                          {item.value && (
                            <span className="shrink-0 font-['IBM_Plex_Mono'] text-[12px] text-slate-700">
                              {item.value}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {plan.valueStackOneTime ? (
                      <div className="mt-2 border-t border-dashed border-[var(--line)] pt-2">
                        <p className="font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                          + Included one-time
                        </p>
                        {plan.valueStackOneTime.map((item) => (
                          <div
                            key={item.name}
                            className="mt-1.5 flex items-start justify-between gap-3 text-[13px]"
                          >
                            <span className="text-slate-950">{item.name}</span>
                            {item.value && (
                              <span className="shrink-0 font-['IBM_Plex_Mono'] text-[12px] text-slate-700">
                                {item.value}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* ── Feature groups ── */}
                <div className="mt-4 flex-1 border-t border-[var(--line)] pt-4">
                  {featureGroups.map((group, groupIndex) => {
                    const included = groupIndex < plan.includedGroups;
                    return (
                      <div
                        key={group.label}
                        className={groupIndex > 0 ? "mt-4" : ""}
                      >
                        <p
                          className={`font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] ${
                            included ? "text-[var(--muted)]" : "text-slate-300"
                          }`}
                        >
                          {group.label}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {group.features.map((feature) => (
                            <li
                              key={feature}
                              className={`flex items-start gap-2.5 text-sm ${
                                included ? "text-slate-800" : "text-slate-300"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[11px] font-medium ${
                                  included ? "text-slate-700" : "text-slate-300"
                                }`}
                              >
                                {included ? "\u2713" : "\u2014"}
                              </span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {/* ── CTA ── */}
                <div className="mt-6 border-t border-[var(--line)] pt-5">
                  {plan.ctaDisabled ? (
                    <span
                      className={`${disabledButtonClass} w-full justify-center`}
                      title={plan.scarcity}
                    >
                      {plan.cta}
                    </span>
                  ) : (
                    <a
                      href={ctaHref}
                      className={`${primaryButtonClass} w-full justify-center`}
                    >
                      {plan.cta}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            COMMAND ROOM is currently full.{" "}
            <a href={ctaHref} className={secondaryButtonClass}>
              {PRIMARY_CTA}
            </a>{" "}
            for the next opening, or use the other options above right now.
          </p>
        </section>

        {/* ── 6. EMERGENCY BUTTON ── */}
        <section className={shortDividerSectionClass}>
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              CAN'T WAIT?
            </p>
            <h2 className="mt-4 text-2xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-3xl">
              Emergency?
            </h2>
            <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-relaxed text-slate-600">
              If your situation is critical, we may be able to help outside our
              normal capacity. Tell us what's happening and we'll review your
              case within 24 hours.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowEmergency(!showEmergency);
                if (!showEmergency) {
                  window.setTimeout(() => {
                    document
                      .getElementById("emergency")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
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

                <form
                  onSubmit={handleEmergencySubmit}
                  noValidate
                  className="mt-5 space-y-4"
                >
                  <label className="block text-sm font-medium text-slate-800">
                    Name & company
                    <input
                      className={`mt-1 w-full border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.08)] ${
                        emergencyErrors.name
                          ? "border-rose-400"
                          : "border-rose-200"
                      }`}
                      value={emergencyForm.name}
                      onChange={(event) =>
                        updateEmergencyField("name", event.target.value)
                      }
                      placeholder="Jane Smith, Acme Corp"
                      required
                    />
                    {emergencyErrors.name ? (
                      <span className="text-xs text-rose-500">
                        {emergencyErrors.name}
                      </span>
                    ) : null}
                  </label>

                  <label className="block text-sm font-medium text-slate-800">
                    Preferred contact (email, phone, or LinkedIn)
                    <input
                      className={`mt-1 w-full border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.08)] ${
                        emergencyErrors.contact
                          ? "border-rose-400"
                          : "border-rose-200"
                      }`}
                      value={emergencyForm.contact}
                      onChange={(event) =>
                        updateEmergencyField("contact", event.target.value)
                      }
                      placeholder="jane@acme.com or +1 555-0123"
                      required
                    />
                    {emergencyErrors.contact ? (
                      <span className="text-xs text-rose-500">
                        {emergencyErrors.contact}
                      </span>
                    ) : null}
                  </label>

                  <label className="block text-sm font-medium text-slate-800">
                    What's the problem? (short description)
                    <textarea
                      className={`mt-1 w-full border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.08)] ${
                        emergencyErrors.problem
                          ? "border-rose-400"
                          : "border-rose-200"
                      }`}
                      rows={3}
                      value={emergencyForm.problem}
                      onChange={(event) =>
                        updateEmergencyField("problem", event.target.value)
                      }
                      placeholder="e.g. Board meeting in 2 weeks, need AI portfolio audit before then..."
                      required
                    />
                    {emergencyErrors.problem ? (
                      <span className="text-xs text-rose-500">
                        {emergencyErrors.problem}
                      </span>
                    ) : null}
                  </label>

                  <label className="block text-sm font-medium text-slate-800">
                    Budget range
                    <input
                      className={`mt-1 w-full border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.08)] ${
                        emergencyErrors.budget
                          ? "border-rose-400"
                          : "border-rose-200"
                      }`}
                      value={emergencyForm.budget}
                      onChange={(event) =>
                        updateEmergencyField("budget", event.target.value)
                      }
                      placeholder="e.g. $15k-25k for the engagement"
                      required
                    />
                    {emergencyErrors.budget ? (
                      <span className="text-xs text-rose-500">
                        {emergencyErrors.budget}
                      </span>
                    ) : null}
                  </label>

                  <div className="flex items-center justify-between border-t border-rose-200 pt-4">
                    <p className="text-sm text-slate-600">
                      We review every request within 24 hours.
                    </p>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center border border-rose-600 bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-rose-700 hover:bg-rose-700 hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                    >
                      Send Emergency Request
                    </button>
                  </div>

                  {emergencySubmitted ? (
                    <div className="border border-rose-200 bg-white p-5">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Emergency request sent
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        Your email draft is ready. If it didn't open
                        automatically, use the link below. We'll review and
                        respond within 24 hours.
                      </p>
                      <a
                        href={buildEmergencyMailto(emergencyForm)}
                        className="mt-3 inline-flex text-sm font-medium text-rose-700 underline underline-offset-4 hover:text-rose-900"
                      >
                        Open email draft again
                      </a>
                    </div>
                  ) : null}
                </form>
              </div>
            </div>
          ) : null}
        </section>

        {/* ── 9. FAQ ── */}
        <section className={stackedSectionClass}>
          <p className={sectionLabelClass}>QUESTIONS</p>
          <h2 className={sectionHeadingClass}>
            Things people ask before they reach out.
          </h2>
          <div className="mt-10 max-w-3xl">
            {faqItems.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* ── 10. WAITLIST + FREE SCAN FORM ── */}
        <section id="scan" className={finalSectionClass}>
          <div className="space-y-10">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="flex h-full flex-col lg:col-span-7 lg:pr-4">
                <div>
                  <p className={sectionLabelClass}>
                    JOIN THE WAITLIST — COMPLIMENTARY SCAN INCLUDED
                  </p>
                  <h2 className={sectionHeadingClass}>
                    Get on the list. Get your AI Portfolio Reality Scan now.
                  </h2>
                  <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
                    Tell us about your company and what's happening with AI
                    right now. We'll come back with a clear map of where the
                    real opportunities are — and you'll be first in line when a
                    spot opens. Complimentary scan valued at $15,000.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 lg:mt-auto">
                  <span className={metaChipClass}>2-minute form</span>
                  <span className={metaChipClass}>
                    Complimentary scan (valued at $15,000) + 40-min call
                  </span>
                  <span className={metaChipClass}>Results in ~1 week</span>
                </div>
              </div>

              <aside
                className={`flex h-full flex-col lg:col-span-5 ${panelClass}`}
              >
                <p className={sectionLabelClass}>WHAT HAPPENS NEXT</p>
                <div className="mt-5 flex flex-1 flex-col text-sm leading-relaxed text-slate-700">
                  <div className="flex-1 pt-0">
                    <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                      Within 48 hours
                    </p>
                    <p className="mt-2">
                      We confirm your spot on the waitlist and begin your scan.
                    </p>
                  </div>
                  <div className="flex-1 border-t border-[var(--line)] pt-4">
                    <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                      Day 3-5
                    </p>
                    <p className="mt-2">
                      Free 40-min strategy call to walk through your AI
                      landscape.
                    </p>
                  </div>
                  <div className="flex-1 border-t border-[var(--line)] pt-4">
                    <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                      Day 5-7
                    </p>
                    <p className="mt-2">
                      Your scan results with a clear action plan. You keep
                      everything.
                    </p>
                  </div>
                </div>
              </aside>
            </div>

            <div className={inversePanelClass}>
              <div className="flex flex-col gap-3 border-b border-[rgba(255,255,255,0.14)] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={inverseSectionLabelClass}>
                    WAITLIST + COMPLIMENTARY AI PORTFOLIO REALITY SCAN
                  </p>
                  <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-slate-100">
                    Tell us where you are with AI. We'll show you where the
                    money is — and save your spot. Scan valued at $15,000.
                  </p>
                </div>
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">
                  5 fields — that's it
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-6 space-y-5"
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="text-sm font-medium text-slate-100">
                    Your name
                    <input
                      className={inputClass(Boolean(errors.fullName))}
                      value={form.fullName}
                      onChange={(event) =>
                        updateField("fullName", event.target.value)
                      }
                      autoComplete="name"
                      required
                    />
                    {errors.fullName ? (
                      <span className="text-xs text-rose-400">
                        {errors.fullName}
                      </span>
                    ) : null}
                  </label>
                  <label className="text-sm font-medium text-slate-100">
                    Work email
                    <input
                      className={inputClass(Boolean(errors.workEmail))}
                      value={form.workEmail}
                      onChange={(event) =>
                        updateField("workEmail", event.target.value)
                      }
                      autoComplete="email"
                      required
                    />
                    {errors.workEmail ? (
                      <span className="text-xs text-rose-400">
                        {errors.workEmail}
                      </span>
                    ) : null}
                  </label>
                  <label className="text-sm font-medium text-slate-100">
                    Company
                    <input
                      className={inputClass(Boolean(errors.company))}
                      value={form.company}
                      onChange={(event) =>
                        updateField("company", event.target.value)
                      }
                      required
                    />
                    {errors.company ? (
                      <span className="text-xs text-rose-400">
                        {errors.company}
                      </span>
                    ) : null}
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-100">
                  What's your biggest AI challenge right now?
                  <textarea
                    className={inputClass(Boolean(errors.biggestChallenge))}
                    rows={3}
                    value={form.biggestChallenge}
                    onChange={(event) =>
                      updateField("biggestChallenge", event.target.value)
                    }
                    placeholder="e.g. We have 6 pilots but nothing made it to production yet..."
                    required
                  />
                  {errors.biggestChallenge ? (
                    <span className="text-xs text-rose-400">
                      {errors.biggestChallenge}
                    </span>
                  ) : null}
                </label>

                <label className="block text-sm font-medium text-slate-100">
                  How soon do you need this?
                  <div className="relative mt-1">
                    <select
                      className={selectClass(Boolean(errors.urgency))}
                      value={form.urgency}
                      onChange={(event) =>
                        updateField("urgency", event.target.value)
                      }
                      required
                    >
                      <option value="">Pick one</option>
                      <option value="Now (this month)">Now — this month</option>
                      <option value="Soon (1-3 months)">
                        Soon — next 1-3 months
                      </option>
                      <option value="Planning (3-6 months)">
                        Planning — 3-6 months out
                      </option>
                      <option value="Just exploring">Just exploring</option>
                    </select>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300"
                    >
                      <path
                        d="M5 7.5L10 12.5L15 7.5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </div>
                  {errors.urgency ? (
                    <span className="text-xs text-rose-400">
                      {errors.urgency}
                    </span>
                  ) : null}
                </label>

                <div className="flex flex-col gap-4 border-t border-[rgba(255,255,255,0.14)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-300">
                    Complimentary scan (valued at $15,000) + 40-min strategy
                    call. You keep everything we find. First in line when a spot
                    opens.
                  </p>
                  <button type="submit" className={primaryButtonClass}>
                    {PRIMARY_CTA}
                  </button>
                </div>

                {submitted ? (
                  <div className="space-y-4 border-t border-[rgba(255,255,255,0.14)] pt-5">
                    <div className="space-y-4 border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] p-5">
                      <h3 className="text-lg font-semibold tracking-[-0.01em] text-white">
                        You're on the waitlist
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-100">
                        Your email draft is ready. If it didn't open, use the
                        link below. We'll start your AI Portfolio Reality Scan
                        and reach out within 48 hours.
                      </p>
                      <a
                        href={buildMailto(form)}
                        className={primaryButtonClass}
                      >
                        Open email draft again
                      </a>
                      <div className="grid gap-3 text-sm text-slate-100 sm:grid-cols-3">
                        <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] p-4">
                          <p className="font-medium uppercase tracking-[0.08em] text-slate-300">
                            Within 48 hours
                          </p>
                          <p className="mt-2">
                            We confirm your waitlist spot and start the scan.
                          </p>
                        </div>
                        <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] p-4">
                          <p className="font-medium uppercase tracking-[0.08em] text-slate-300">
                            Day 3-5
                          </p>
                          <p className="mt-2">
                            Quick call about your business.
                          </p>
                        </div>
                        <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] p-4">
                          <p className="font-medium uppercase tracking-[0.08em] text-slate-300">
                            Day 5-7
                          </p>
                          <p className="mt-2">
                            Your scan results and action plan.
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300">
                        Questions?{" "}
                        <a
                          className="font-medium text-white"
                          href={`mailto:${PRIMARY_EMAIL}`}
                        >
                          {PRIMARY_EMAIL}
                        </a>
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
          <p className="text-sm text-slate-600">
            Fully booked. Join the waitlist. Get your complimentary scan now.
          </p>
        </footer>
      </main>
    </div>
  );
}
