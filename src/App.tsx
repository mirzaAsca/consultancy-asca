import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import SiteHeader from "./components/SiteHeader";
import WarpedGrid from "./components/WarpedGrid";
import WaitlistForm from "./components/WaitlistForm";
import { submitFormToInbox, type FormSubmitStatus } from "./lib/formsubmit";
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

const PRIMARY_EMAIL = "mirza@flyrank.com";
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

const newFeatureGroups = [
  {
    label: "THE PROCESS",
    features: [
      "Full Workflow Map",
      "Priority Scoping: What to Automate First",
      "Weekly Check-ins",
    ],
  },
  {
    label: "THE BUILD",
    features: [
      "Implementation Roadmap & Technical Direction",
      "Integration Architecture & Review",
      "Before & After Measurement",
    ],
  },
  {
    label: "THE PEOPLE",
    features: ["Training Your Team to Use It", "Making Sure It Ships"],
  },
  {
    label: "THE TEAM",
    features: [
      "Up to 10–30 Dedicated Engineers",
      "2–3x More Output Per Affected Team Member",
      "Access to in-house expert team for: design, copywriting, SEO, development, and more",
    ],
  },
];

const newPlans = [
  {
    name: "10-WEEK AI SPRINT",
    subtitle: "For one costly workflow",
    price: "Starting at $22,000",
    period: "",
    anchor:
      "Hiring an AI advisory firm for this scope: $50K+ (Toptal / Catalant / Clutch)",
    anchorSource: {
      label: "Toptal / Catalant / Clutch 2025–2026",
      url: "https://clutch.co/developers/artificial-intelligence",
    },
    scarcity: "0 spots available",
    description:
      "If one process is wasting hours every week, I start with a 1-2 week diagnostic, implement the fix with your team, and measure whether it saves real time before handover. Fixed scope. 10 weeks.",
    cta: "Apply",
    ctaDisabled: true,
    highlighted: true,
    includedGroups: 3,
    valueStack: [
      {
        name: "Workflow Diagnostic & Process Mapping",
        value: "",
      },
      {
        name: "AI Strategy, Architecture & Build Direction",
        value: "",
      },
      {
        name: "Integration Planning & QA Review",
        value: "",
      },
      { name: "Team Training & Enablement", value: "" },
      {
        name: "Performance Measurement & Optimization",
        value: "",
      },
    ],
    valueStackOneTime: null,
    totalMonthlyValue: "$50,000+",
    savings: "You save $28,000+ vs. hiring an advisory firm",
  },
  {
    name: "AI OPERATIONS TEAM",
    subtitle: "You get a full team",
    price: "$145,000",
    period: "/mo",
    anchor: "Building this team in-house: $300K–$600K/mo in salary alone",
    anchorSource: {
      label: "Robert Half / Glassdoor AI Engineer Salary Data 2026",
      url: "https://www.roberthalf.com/us/en/job-details/aiml-engineer",
    },
    scarcity: "Coming Q3 2026",
    description:
      "When one bottleneck is not the problem and several workflows need fixing at once, I place a dedicated AI operations team inside the business to scope, implement, measure, and train until the fixes stick.",
    cta: "Request Early Access",
    ctaDisabled: false,
    highlighted: false,
    includedGroups: 4,
    valueStack: [
      { name: "10–30 Dedicated AI Engineers", value: "" },
      { name: "Full Strategy & Scoping Layer", value: "" },
      {
        name: "External Specialists (Design, Copy, SEO, Dev)",
        value: "",
      },
      { name: "Organization-Wide Training & Enablement", value: "" },
      { name: "Ongoing Measurement & Optimization", value: "" },
    ],
    valueStackOneTime: [{ name: "Full Workflow Audit", value: "" }],
    totalMonthlyValue: "$320,000/mo",
    savings: "You save $175,000/mo vs. building in-house",
  },
];

const fitFor = [
  "You run an ecommerce team (20-80 people) and you know which workflow is costing you the most time",
  "You've tried to fix it yourself or with a freelancer and it didn't stick",
  "One person owns the workflow and can work with me weekly",
];

const fitNotFor = [
  "You don't have a specific workflow in mind — you just want 'AI stuff'",
  "You just want a chatbot. We do a lot more than that.",
  "You need 5 people to approve a $30K decision",
];

const faqItems = [
  {
    q: "Why not just hire someone full-time?",
    a: "Because this gets one painful workflow fixed in 10 weeks without recruiting, ramp time, or another full-time salary before you know what actually works.",
  },
  {
    q: "How is this different from hiring a freelancer or using Zapier?",
    a: "A freelancer builds what you tell them. But most founders can't scope the work correctly — that's why it takes 4 months and solves the wrong thing. I diagnose first, then implement. Zapier works for simple stuff. If Zapier could fix your bottleneck, you would've done it already.",
  },
  {
    q: "How is this different from a big consultancy?",
    a: "They charge $50-100K for a strategy deck. I charge $20-55K for a working implementation. They give you a plan. I give you a system your team actually uses.",
  },
  {
    q: "You're fully booked. Why should I join the waitlist?",
    a: "Waitlist members get a free workflow review when I open spots.",
  },
  {
    q: "What if the diagnostic shows AI isn't the right fit?",
    a: "Then I tell you. I'd rather give you an honest no than take your money for something that won't move the needle. That's happened before. I'll point you in the right direction instead.",
  },
  {
    q: "How fast will we see results?",
    a: "The full sprint is 10 weeks. Diagnostic in weeks 1-2, implementation in weeks 3-9, measurement and handover in week 10.",
  },
  {
    q: "What industries do you work with?",
    a: "Ecommerce, SaaS, logistics, and services companies with 20-120 people. If your team has a process that's breaking and one person who owns it, we can probably help.",
  },
  {
    q: "How much of our time does this take?",
    a: "One person who owns the workflow. Two hours a week during the build. I handle everything else.",
  },
  {
    q: "What happens after the workflow is fixed?",
    a: "You keep the system, the documentation, and the baseline. If workflow #2 is worth fixing, we scope a second sprint from the same foundation.",
  },
];

// ── EMERGENCY FORM ──

type EmergencyField = "name" | "contact" | "problem" | "budget";

type EmergencyFormState = Record<EmergencyField, string>;
type EmergencyErrorState = Partial<Record<EmergencyField, string>>;
type EmergencySubmitState = FormSubmitStatus | "idle" | "submitting";

const initialEmergencyState: EmergencyFormState = {
  name: "",
  contact: "",
  problem: "",
  budget: "",
};

// ── SHARED UI ──

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
  const [emergencyForm, setEmergencyForm] = useState<EmergencyFormState>(
    initialEmergencyState,
  );
  const [emergencyErrors, setEmergencyErrors] = useState<EmergencyErrorState>(
    {},
  );
  const [emergencySubmitState, setEmergencySubmitState] =
    useState<EmergencySubmitState>("idle");
  const [emergencySubmitMessage, setEmergencySubmitMessage] = useState("");
  const [showEmergency, setShowEmergency] = useState(false);

  const ctaHref = "#scan";

  function updateEmergencyField(field: EmergencyField, value: string) {
    setEmergencyForm((previous) => ({ ...previous, [field]: value }));
    setEmergencyErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
    if (emergencySubmitState === "error") {
      setEmergencySubmitState("idle");
      setEmergencySubmitMessage("");
    }
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

  async function handleEmergencySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateEmergency(emergencyForm);
    if (Object.keys(nextErrors).length > 0) {
      setEmergencyErrors(nextErrors);
      return;
    }

    const emergencyFields: Record<string, string> = {
      _subject: `[FORM] - Asca 10x.ai - Emergency - ${emergencyForm.name}`,
      name: emergencyForm.name,
      "Preferred contact": emergencyForm.contact,
      Problem: emergencyForm.problem,
      Budget: emergencyForm.budget,
      Priority: "Emergency request from homepage",
    };

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emergencyForm.contact.trim())) {
      emergencyFields.email = emergencyForm.contact.trim();
    }

    setEmergencySubmitState("submitting");
    setEmergencySubmitMessage("");

    const result = await submitFormToInbox(emergencyFields);

    setEmergencySubmitState(result.status);
    setEmergencySubmitMessage(result.message);
  }

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0))]" />
      <WarpedGrid />

      <main
        className="relative mx-auto w-full max-w-[1240px] px-4 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-8 lg:px-10 lg:pt-10"
        style={gridSystemStyle}
      >
        <div className="sticky top-0 z-50 -mx-4 -mt-6 px-4 sm:-mx-8 sm:-mt-8 sm:px-8 lg:-mx-10 lg:-mt-10 lg:px-10 lg:py-4">
          <SiteHeader
            founderLinkedIn={LINKEDIN_PROFILE}
            homeHref="/"
            whatWeDoHref="/how-it-works/"
          />
        </div>

        {/* ── 1. HERO: Split layout matching how-it-works ── */}
        <section
          id="overview"
          className={`${splitSectionNoDividerClass} gap-8`}
        >
          <div className="flex h-full flex-col lg:col-span-7 lg:pr-6">
            <div>
              <p className={sectionLabelClass}>
                AI IMPLEMENTATION FOR ECOMMERCE TEAMS (20-80 PEOPLE)
              </p>
              <h1 className="mt-6 max-w-[22ch] text-4xl font-semibold leading-[1.01] tracking-[-0.04em] [text-wrap:balance] sm:text-5xl lg:text-[4rem]">
                I remove #1 workflow bottleneck in 10 weeks{" "}
                <span className="bg-[var(--accent)] px-[0.08em] text-white [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                  without hiring more people
                </span>
              </h1>
              <p className="mt-6 max-w-[58ch] text-sm font-medium leading-relaxed text-slate-500">
                56% of CEOs report no revenue or cost benefit from AI.{" "}
                <a
                  href="https://www.pwc.com/gx/en/issues/c-suite-insights/ceo-survey.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700 hover:decoration-slate-500"
                >
                  PwC 2026
                </a>
              </p>
              <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-slate-700">
                If one process is eating 20+ hours a week — or forcing your next
                ops hire — I map it, fix it with your team, and measure the
                before-and-after numbers.
              </p>
            </div>

            <div className="mt-8 text-center lg:mt-auto lg:pt-10 lg:text-left">
              <a
                href="#plans"
                className={`${primaryButtonClass} w-full justify-center sm:w-auto`}
              >
                See how it works
              </a>
              <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-slate-500 lg:mx-0">
                See what's included.
              </p>
            </div>
          </div>

          <aside
            className={`relative flex h-full flex-col lg:col-span-5 ${panelClass}`}
          >
            <p className="text-xl font-semibold leading-snug tracking-[-0.02em] text-slate-950">
              What I hear a lot
            </p>

            <div className="mt-5 border-t border-[var(--line)] pt-5">
              <p className={sectionLabelClass}>SOUND FAMILIAR?</p>
              <ul className="mt-4 space-y-3">
                {[
                  "Your team wastes hours every day on one process — and you're about to hire someone just to keep up",
                  "The person who owns it is too busy doing it to fix it",
                  "You tried maybe Zapier. Or a freelancer. It worked for a month, then it broke and nobody fixed it",
                  "You know AI could help but you don't know where to start",
                ].map((pain) => (
                  <li key={pain} className="flex items-start gap-2.5">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 bg-[var(--accent)]" />
                    <p className="text-sm leading-relaxed text-slate-700">
                      {pain}
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
                We're not taking new companies right now.
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
                2,500+
              </span>
              <span className="text-sm text-slate-500">
                hours working with AI
              </span>
            </div>
          </div>
        </section>

        {/* ── THE PROMISE ── */}
        <section className={shortDividerSectionClass}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-3xl font-semibold leading-[1.15] tracking-[-0.03em] [text-wrap:balance] sm:text-4xl lg:text-[2.75rem]">
              If the system we implement doesn't solve your problem within 10
              weeks,{" "}
              <span className="text-[var(--muted)]">
                — I keep working for free until it does.
              </span>
            </p>
            <p className="mx-auto mt-6 max-w-[48ch] text-base leading-relaxed text-slate-600">
              Your team keeps doing their job. I remove the part that wastes
              their time.
            </p>
            <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              <span>
                Only works if we talk to the people who can make decisions
              </span>
            </div>
          </div>
        </section>

        {/* ── MARKET REALITY ── */}
        <section className={shortDividerSectionClass}>
          <p className={sectionLabelClass}>THE REALITY</p>
          <h2 className={sectionHeadingClass}>
            Most companies that try AI get nothing from it. Here's why.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className={`${cardClass} flex flex-col`}>
              <p className="font-['IBM_Plex_Mono'] text-3xl font-semibold text-slate-950">
                56%
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                of CEOs report neither revenue nor cost benefits from AI.
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
                  href="https://www.spglobal.com/market-intelligence/en/news-insights/research/ai-experiences-rapid-adoption-but-with-mixed-outcomes-highlights-from-vote-ai-machine-learning"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600 hover:decoration-slate-500"
                >
                  S&P Global, AI &amp; ML Use Cases 2025
                </a>
              </p>
            </article>
          </div>
          <div className="mt-10 border-t border-[var(--line)] pt-6 text-center">
            <p className="text-base font-medium leading-relaxed text-slate-700">
              The difference? They started with the tool. I start with the
              workflow.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Companies with structured AI operating models achieve up to{" "}
              <span className="font-semibold text-slate-700">
                2.7x return on invested capital
              </span>{" "}
              compared to laggards.{" "}
              <a
                href="https://www.bcg.com/publications/2025/are-you-generating-value-from-ai-the-widening-gap"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] underline decoration-slate-300 underline-offset-2 hover:text-slate-600 hover:decoration-slate-500"
              >
                BCG 2025
              </a>
            </p>
          </div>
        </section>

        {/* ── FIT / NOT FIT ── */}
        <section className={stackedSectionClass}>
          <p className={sectionLabelClass}>IS THIS FOR YOU?</p>
          <h2 className={sectionHeadingClass}>This isn't for everyone.</h2>

          {/* Mobile: stacked — all pros first, then all cons */}
          <div className="mt-8 space-y-4 lg:hidden">
            <div className="border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
              <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
                <p className={sectionLabelClass}>GOOD FIT</p>
              </div>
              <ul>
                {fitFor.map((item, index) => (
                  <li
                    key={item}
                    className="border-b border-[var(--line)] px-5 py-4 last:border-b-0 sm:px-6"
                  >
                    <div className="flex items-start gap-3">
                      <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                        0{index + 1}
                      </p>
                      <p className="text-sm leading-relaxed text-slate-800">
                        {item}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-[var(--accent)] bg-[var(--accent)] shadow-[var(--shadow-panel)]">
              <div className="border-b border-[rgba(255,255,255,0.12)] px-5 py-4 sm:px-6">
                <p className="inline-flex w-fit items-center bg-[rgba(255,255,255,0.12)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-white">
                  NOT A FIT
                </p>
              </div>
              <ul>
                {fitNotFor.map((item, index) => (
                  <li
                    key={item}
                    className="border-b border-[rgba(255,255,255,0.12)] px-5 py-4 last:border-b-0 sm:px-6"
                  >
                    <div className="flex items-start gap-3">
                      <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
                        0{index + 1}
                      </p>
                      <p className="text-sm leading-relaxed text-slate-100">
                        {item}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Desktop: side-by-side */}
          <div className="mt-8 premium-panel relative hidden overflow-hidden border border-[var(--line)] bg-[var(--surface)] lg:block">
            <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 border-l border-[var(--line)]" />

            <div className="relative z-[1] grid grid-cols-2">
              <div className="px-6 py-4">
                <p className={sectionLabelClass}>GOOD FIT</p>
              </div>
              <div className="bg-[var(--accent)] px-6 py-4">
                <p className="inline-flex w-fit items-center bg-[rgba(255,255,255,0.12)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-white">
                  NOT A FIT
                </p>
              </div>
            </div>

            <div className="relative z-[1]">
              {fitFor.map((item, index) => (
                <div key={item} className="relative grid grid-cols-2">
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
                  <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--line)] bg-white" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHERE WE'VE COOKED ── */}
        <section className={stackedSectionClass}>
          <p className={sectionLabelClass}>AI INTEGRATION</p>
          <h2 className={sectionHeadingClass}>Teams I've worked with.</h2>

          {/* ── Client companies ── */}
          <div className="mt-12">
            <div className="flex items-center gap-3">
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] bg-[var(--accent)] text-white px-2.5 py-1">
                Current Client Work
              </p>
              <span className={metaChipClass}>{clientLogos.length}</span>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-6 sm:gap-x-14 lg:gap-x-20 lg:gap-y-8">
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
                Portfolio Companies
              </p>
              <span className={metaChipClass}>{portfolioLogos.length}</span>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-6 sm:gap-x-14 lg:gap-x-20 lg:gap-y-8">
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
                Past Work
              </p>
              <span className={metaChipClass}>{alumniLogos.length}</span>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-6 sm:gap-x-14 lg:gap-x-20 lg:gap-y-8">
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

        {/* ── NEW PLANS (PROPOSED) ── */}
        <section id="plans" className={stackedSectionClass}>
          <p className={sectionLabelClass}>PLANS</p>
          <h2 className={sectionHeadingClass}>
            Two ways to save time & money.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
            If one workflow is wasting hours every week, start with the sprint.
            If you want to fully automate 60-80% of your operations, start with
            the AI operations team.
          </p>

          <p className="mt-8 flex items-center justify-center gap-3 text-center font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)] lg:hidden">
            <svg
              viewBox="0 0 20 20"
              className="swipe-arrow swipe-arrow-left h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path
                d="M12 5l-5 5 5 5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
            Swipe to compare plans
            <svg
              viewBox="0 0 20 20"
              className="swipe-arrow swipe-arrow-right h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path
                d="M8 5l5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </p>

          {/* Plans snap-scroll carousel on mobile/tablet, 2-col grid on desktop */}
          <div className="plans-scroll mt-4 -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 pt-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:mt-10 lg:grid lg:snap-none lg:grid-cols-2 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0 lg:pt-0">
            {newPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex w-[86vw] max-w-[420px] shrink-0 snap-center flex-col border p-5 sm:p-6 lg:w-auto lg:max-w-none lg:shrink ${
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

                {/* ── Header ── */}
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  {plan.subtitle}
                </p>
                <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.02em] text-slate-950">
                  {plan.name}
                </h3>

                {/* ── Price block ── */}
                <div className="mt-4">
                  {plan.totalMonthlyValue && (
                    <span className="text-base font-medium tracking-[-0.01em] text-slate-400 line-through decoration-[1.5px] decoration-slate-400">
                      {plan.totalMonthlyValue}
                    </span>
                  )}
                  <div
                    className={`${plan.totalMonthlyValue ? "mt-1" : ""} inline-flex items-baseline gap-1 bg-[var(--accent)] px-2.5 py-1`}
                  >
                    <span className="text-2xl font-semibold tracking-[-0.02em] text-white">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm font-normal text-white/70">
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
                  <span
                    className={`mt-3 inline-flex w-fit items-center px-2 py-0.5 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] ${
                      plan.scarcity.includes("0 spots")
                        ? "border border-rose-200 bg-rose-50 text-rose-600"
                        : "border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] text-[var(--muted)]"
                    }`}
                  >
                    {plan.scarcity}
                  </span>
                </div>

                {/* ── After the sprint (only on highlighted/sprint card) ── */}
                {plan.highlighted && (
                  <div className="mt-4 border border-[var(--accent)] bg-[rgba(15,23,42,0.03)] p-4">
                    <p className="font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
                      After the sprint
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      If there's more to fix, I stay. Monthly. Same structure.
                      No lock-in. We only continue if it makes sense for both of
                      us.
                    </p>
                    <span className="mt-2 inline-flex w-fit items-center border border-[var(--accent)] bg-white px-2 py-0.5 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
                      Scoped per engagement
                    </span>
                  </div>
                )}

                {/* ── Value stack ── */}
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
                  {plan.totalMonthlyValue && (
                    <div className="mt-3 border-t border-[var(--line)] pt-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-slate-950">
                          Total value
                        </span>
                        <span className="shrink-0 font-['IBM_Plex_Mono'] text-[14px] font-semibold text-[var(--accent)]">
                          {plan.totalMonthlyValue}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Feature groups ── */}
                <div className="mt-4 flex-1 border-t border-[var(--line)] pt-4">
                  {newFeatureGroups.map((group, groupIndex) => {
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
                    <>
                      <span
                        className={`${disabledButtonClass} w-full justify-center`}
                        title={plan.scarcity}
                      >
                        {plan.cta}
                      </span>
                      <a
                        href={ctaHref}
                        className="mt-3 block text-center text-sm font-medium text-[var(--accent)] underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]"
                      >
                        {PRIMARY_CTA}
                      </a>
                      <p className="mt-3 text-center text-sm leading-relaxed text-slate-500">
                        We're not taking new companies right now.
                      </p>
                    </>
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
            THE 10-WEEK AI SPRINT is currently full.{" "}
            <a href={ctaHref} className={secondaryButtonClass}>
              {PRIMARY_CTA}
            </a>{" "}
            for the next opening, or request early access to the operations team
            above.
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

                  <div className="flex flex-col gap-3 border-t border-rose-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-600">
                      We review every request within 24 hours.
                    </p>
                    <button
                      type="submit"
                      disabled={emergencySubmitState === "submitting"}
                      className="inline-flex w-full items-center justify-center border border-rose-600 bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-rose-700 hover:bg-rose-700 hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 sm:w-auto"
                    >
                      {emergencySubmitState === "submitting"
                        ? "Sending..."
                        : "Send Emergency Request"}
                    </button>
                  </div>

                  {emergencySubmitState === "activation_required" ? (
                    <div className="border border-amber-200 bg-white p-5">
                      <h3 className="text-lg font-semibold text-slate-900">
                        One-time form activation needed
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        Automatic delivery to mirza@flyrank.com needs one
                        activation click first. Check that inbox, activate the
                        form, and this queued submission should be released.
                      </p>
                      <p className="mt-3 text-sm text-slate-600">
                        {emergencySubmitMessage}
                      </p>
                    </div>
                  ) : null}

                  {emergencySubmitState === "sent" ? (
                    <div className="border border-rose-200 bg-white p-5">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Emergency request submitted
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        The form has been sent directly to our inbox. We'll
                        review and respond within 24 hours.
                      </p>
                      {emergencySubmitMessage ? (
                        <p className="mt-3 text-sm text-slate-600">
                          {emergencySubmitMessage}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {emergencySubmitState === "error" ? (
                    <div className="border border-rose-200 bg-white p-5">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Could not submit the request
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {emergencySubmitMessage}
                      </p>
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

        {/* ── LINKEDIN TEASER ── */}
        <section className={shortDividerSectionClass}>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm leading-relaxed text-slate-600">
              Follow the build on LinkedIn — practical AI implementation steps
              every week.
            </p>
            <a
              href={LINKEDIN_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-4 ${secondaryButtonClass}`}
            >
              Follow on LinkedIn
            </a>
          </div>
        </section>

        {/* ── 10. WAITLIST + FREE SCAN FORM ── */}
        <section id="scan" className="reveal py-14 sm:py-16">
          <p className={sectionLabelClass}>TELL ME ABOUT YOUR TEAM</p>
          <h2 className={sectionHeadingClass}>
            When I have capacity, waitlist members get a free workflow review.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
            No pitch. Just an honest look at whether AI can save your team real
            time. Within 30 days you'll know exactly where the hours go, what to
            automate first, and have a scoped plan with real numbers.
          </p>

          <div className="mt-10">
            <WaitlistForm />
          </div>
        </section>

        <footer className="reveal mt-4 flex flex-col items-center gap-4 border-t-[3px] border-[var(--line)] pt-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <a
            href={`mailto:${PRIMARY_EMAIL}`}
            className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
          >
            {PRIMARY_EMAIL}
          </a>
          <p className="text-sm text-slate-600">
            I help growing teams implement AI where it saves the most time.
          </p>
        </footer>
      </main>
    </div>
  );
}
