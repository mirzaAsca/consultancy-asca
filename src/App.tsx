import { useState } from "react";
import type { CSSProperties } from "react";
import SiteHeader from "./components/SiteHeader";
import WarpedGrid from "./components/WarpedGrid";
import WaitlistForm from "./components/WaitlistForm";
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
  "Your highest-impact workflow is mapped end to end",
  "You know exactly where the hours go and what to automate first",
  "Your team has a scoped plan with before/after numbers",
  "The first AI implementation is already underway",
];

const painPoints = [
  "Your team spends 3 hours a day on something that should take 20 minutes. Everyone knows it. Nobody has time to fix it.",
  "You hired someone to handle the backlog. Now you have two people drowning instead of one.",
  "You tried Zapier. Or a freelancer. It worked for a month, then it broke and nobody fixed it.",
  "You know where AI could help. You just don't have the time or expertise to implement it properly.",
];

const plans = [
  {
    name: "THE EMBEDDED AI OPERATIONS TEAM",
    subtitle: "I embed a full team",
    price: "$85,000 – $150,000",
    period: "/mo",
    description:
      "I embed a full team across multiple workflows. 10-30 people. Strategy, implementation, measurement, training, ongoing.",
    scarcity: "By referral only",
    cta: null,
    ctaDisabled: true,
    highlighted: false,
    isAnchor: true,
  },
  {
    name: "THE 10-WEEK AI SPRINT",
    subtitle: "For growing teams",
    price: "$20,000 – $55,000",
    period: "",
    description:
      "I map your highest-impact workflow, implement the AI solution with your team, and measure the result. Starts with a 1-2 week diagnostic. Fixed scope. 10 weeks.",
    comparison:
      "That's less than 4 months of one senior hire — and you get a working system at the end, not a job opening.",
    scarcity: "0 spots — join the waitlist",
    cta: "Join the Waitlist",
    ctaDisabled: true,
    highlighted: true,
    isAnchor: false,
  },
];

const fitFor = [
  "You run a growing team (20-150 people) and you know where AI could save the most time",
  "You've tried to fix it yourself or with a freelancer and it didn't stick",
  "You can point to the workflow and the person who owns it",
];

const fitNotFor = [
  "You don't have a specific workflow in mind — you just want 'AI stuff'",
  "You just want a chatbot. We do a lot more than that.",
  "You need 5 people to approve a $30K decision",
];

const faqItems = [
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
    a: "Waitlist members get a free workflow review when I open spots. First come, first served. You also get priority on the diagnostic.",
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
    a: "Ecommerce, SaaS, logistics, and services companies with 20-150 people. If your team has a process that's breaking and one person who owns it, we can probably help.",
  },
  {
    q: "How much of our time does this take?",
    a: "One person who owns the workflow. Two hours a week during the build. I handle everything else.",
  },
  {
    q: "What happens after the workflow is fixed?",
    a: "You own it. I hand it over. If you have another workflow worth improving, we do it again — same structure, same pricing. If you don't, we part as friends. No retainer, no lock-in.",
  },
];

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
  const ctaHref = "#scan";

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
              <p className={sectionLabelClass}>AI IMPLEMENTATION FOR GROWING TEAMS</p>
              <h1 className="mt-6 max-w-[22ch] text-4xl font-semibold leading-[1.01] tracking-[-0.04em] [text-wrap:balance] sm:text-5xl lg:text-[4rem]">
                I help growing teams implement AI{" "}
                <span className="bg-[var(--accent)] px-[0.08em] text-white [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                  where it saves the most time.
                </span>
              </h1>
              <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-slate-700">
                You tell us what's broken. We map it, build the fix, and measure
                the result. Fixed scope. Fixed price. You see the numbers before
                and after.
              </p>
            </div>

            <div className="mt-8 lg:mt-auto lg:pt-10">
              <a href="#how-it-works" className={primaryButtonClass}>
                See how it works
              </a>
            </div>
          </div>

          <aside
            className={`relative flex h-full flex-col lg:col-span-5 ${panelClass}`}
          >
            {/* ── Floating label ── */}
            <span className="absolute -top-3 right-6 z-10 bg-[var(--accent)] px-3 py-1 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-white shadow-sm">
              Free workflow review
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
              <a
                href={ctaHref}
                className="mt-3 block text-center text-sm font-medium text-[var(--accent)] underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]"
              >
                {PRIMARY_CTA}
              </a>
              <p className="mt-3 text-center text-sm leading-relaxed text-slate-500">
                I take 3 new teams per quarter. All spots are currently filled.
              </p>
            </div>
          </aside>
        </section>

        {/* ── 2. PROOF STRIP ── */}
        <section className={compactStripSectionClass}>
          <p className="text-center text-sm leading-relaxed text-slate-600">
            I've built automation and AI systems for teams across ecommerce, logistics, SaaS, and services.
          </p>
        </section>

        {/* ── THE PROMISE ── */}
        <section className={shortDividerSectionClass}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-3xl font-semibold leading-[1.15] tracking-[-0.03em] [text-wrap:balance] sm:text-4xl lg:text-[2.75rem]">
              If the system we implement doesn't measurably save your team time within 60 days of going live{" "}
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
                Works best when the person with the problem is the person on the call
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
          <p className="mt-8 text-center text-base font-medium leading-relaxed text-slate-700">
            The difference? They started with the tool. I start with the workflow.
          </p>
        </section>

        {/* ── QUICK CHECK: Self-assessment ── */}
        <section className={shortDividerSectionClass}>
          <p className={sectionLabelClass}>QUICK CHECK</p>
          <h2 className={sectionHeadingClass}>Does this sound like you?</h2>

          <div className="mt-8 space-y-3">
            {[
              "Your team spends hours on something AI could handle in minutes",
              "You've looked into AI but aren't sure where to start or what's worth it",
              "You know where the time goes but don't have capacity to implement the fix",
            ].map((item) => (
              <div key={item} className={`flex items-start gap-4 ${cardClass}`}>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-[var(--line)] bg-white font-['IBM_Plex_Mono'] text-[10px] text-[var(--muted)]">
                  &nbsp;
                </span>
                <p className="text-sm leading-relaxed text-slate-700">{item}</p>
              </div>
            ))}
          </div>

          <div className={`mt-8 ${panelClass}`}>
            <p className="text-sm leading-relaxed text-slate-700">
              The longer you wait, the more time your team loses. Most companies don't realize how much until someone maps it.
            </p>
            <a href="#how-it-works" className={`mt-4 ${primaryButtonClass}`}>
              See how it works
            </a>
          </div>
        </section>

        {/* ── 3. PAIN + COST OF INACTION ── */}
        <section className={shortDividerSectionClass}>
          <p className={sectionLabelClass}>WHAT WE SEE</p>
          <h2 className={sectionHeadingClass}>
            Sound familiar?
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

        </section>

        {/* ── THE FIX: 3-framework bridge ── */}
        <section className={stackedSectionClass}>
          <p className={sectionLabelClass}>THE FIX</p>
          <h2 className={sectionHeadingClass}>
            Here's what I actually do.
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className={cardClass}>
              <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium tracking-[0.18em] text-[var(--muted)]">
                01
              </p>
              <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.01em]">
                The map
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                I map your workflow step by step so you can see where AI saves the most time.
              </p>
            </article>
            <article className={cardClass}>
              <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium tracking-[0.18em] text-[var(--muted)]">
                02
              </p>
              <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.01em]">
                The build
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                I implement the AI solution with your team. Simplest thing that works.
              </p>
            </article>
            <article className={cardClass}>
              <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium tracking-[0.18em] text-[var(--muted)]">
                03
              </p>
              <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.01em]">
                The proof
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                I measure before and after so you know exactly what changed.
              </p>
            </article>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
            <a href="/how-we-work/" className={primaryButtonClass}>
              See how it works
            </a>
          </div>
        </section>

        {/* ── HOW IT WORKS: 3-step process ── */}
        <section id="how-it-works" className={stackedSectionClass}>
          <p className={sectionLabelClass}>HOW IT WORKS</p>
          <h2 className={sectionHeadingClass}>Three steps. That's it.</h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className={cardClass}>
              <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium tracking-[0.18em] text-[var(--accent)]">
                STEP 1
              </p>
              <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.01em]">
                You tell me where the time goes.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                Join the waitlist. Tell me the workflow. I'll reach out when a spot opens.
              </p>
            </article>
            <article className={cardClass}>
              <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium tracking-[0.18em] text-[var(--accent)]">
                STEP 2
              </p>
              <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.01em]">
                I map it and implement the solution with your team.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                10 weeks. Fixed scope. I handle the implementation, integration, and training.
              </p>
            </article>
            <article className={cardClass}>
              <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium tracking-[0.18em] text-[var(--accent)]">
                STEP 3
              </p>
              <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.01em]">
                You see the before/after numbers.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                Hard numbers. Did it work? By how much? You own the system.
              </p>
            </article>
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
          <h2 className={sectionHeadingClass}>Teams I've worked with.</h2>

          {/* ── Client companies ── */}
          <div className="mt-12">
            <div className="flex items-center gap-3">
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] bg-[var(--accent)] text-white px-2.5 py-1">
                Client work
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
                My companies
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
                Built and exited
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

        {/* ── CASE STUDY PLACEHOLDER ── */}
        <section className={stackedSectionClass}>
          <p className={sectionLabelClass}>RESULTS</p>
          <h2 className={sectionHeadingClass}>What it looks like in practice.</h2>
          <div className={`mt-8 ${panelClass}`}>
            <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
              Example
            </p>
            <p className="mt-3 text-base font-semibold text-slate-950">
              Logistics company, 45 employees
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Manual invoice processing went from 6 hours/day to 40 minutes. Built in 8 weeks.
            </p>
            <p className="mt-4 text-[11px] text-slate-400">
              More case studies coming as projects complete.
            </p>
          </div>
        </section>

        {/* ── FOUNDER BIO ── */}
        <section className={stackedSectionClass}>
          <p className={sectionLabelClass}>WHO'S BEHIND THIS</p>
          <div className={`mt-8 ${panelClass}`}>
            <p className="text-base leading-relaxed text-slate-700">
              Built and exited 5 software companies. Built automation and AI systems for 16+ companies across ecommerce, SaaS, logistics, and services. Now I help growing teams implement AI where it saves the most time.
            </p>
            <a
              href={LINKEDIN_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex text-sm font-medium text-[var(--accent)] underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]"
            >
              Mirza on LinkedIn
            </a>
          </div>
        </section>

        {/* ── 4. PLANS ── */}
        <section id="plans" className={stackedSectionClass}>
          <p className={sectionLabelClass}>PLANS</p>
          <h2 className={sectionHeadingClass}>Two ways to work with me.</h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
            From a focused sprint to a full operations team. Start where it makes sense.
          </p>

          {/* ── Plan cards ── */}
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
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

                {/* ── Price block ── */}
                <div className="mt-4">
                  <div className="inline-flex items-baseline gap-1 bg-[var(--accent)] px-2.5 py-1">
                    <span className="text-2xl font-semibold tracking-[-0.02em] text-white">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm font-normal text-white/70">
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Description + scarcity ── */}
                <div className="mt-4 flex-1 border-t border-[var(--line)] pt-4">
                  <p className="text-sm leading-relaxed text-slate-600">
                    {plan.description}
                  </p>
                  {"comparison" in plan && plan.comparison && (
                    <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
                      {plan.comparison}
                    </p>
                  )}
                  <span className={`mt-3 inline-flex w-fit items-center px-2 py-0.5 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] ${
                    plan.scarcity.includes("0 spots")
                      ? "border border-rose-200 bg-rose-50 text-rose-600"
                      : "border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] text-[var(--muted)]"
                  }`}>
                    {plan.scarcity}
                  </span>
                </div>

                {/* ── CTA ── */}
                <div className="mt-6 border-t border-[var(--line)] pt-5">
                  {plan.cta ? (
                    plan.ctaDisabled ? (
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
                    )
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Every sprint starts with a diagnostic. If AI isn't the right answer, I'll tell you.
          </p>
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
              Follow the build on LinkedIn — practical AI implementation steps every week.
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
        <section id="scan" className={finalSectionClass}>
          <div className="space-y-10">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="flex h-full flex-col lg:col-span-7 lg:pr-4">
                <div>
                  <p className={sectionLabelClass}>
                    TELL ME ABOUT YOUR TEAM
                  </p>
                  <h2 className={sectionHeadingClass}>
                    When I have capacity, waitlist members get a free workflow review.
                  </h2>
                  <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
                    No pitch. Just an honest look at whether AI can save your
                    team real time. Tell me about your company and the workflow
                    that's costing you the most.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 lg:mt-auto">
                  <span className={metaChipClass}>2-minute form</span>
                  <span className={metaChipClass}>
                    Free workflow review when a spot opens
                  </span>
                  <span className={metaChipClass}>First come, first served</span>
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
                      I confirm your spot on the waitlist.
                    </p>
                  </div>
                  <div className="flex-1 border-t border-[var(--line)] pt-4">
                    <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                      When a spot opens
                    </p>
                    <p className="mt-2">
                      I reach out for a quick call about your workflow.
                    </p>
                  </div>
                  <div className="flex-1 border-t border-[var(--line)] pt-4">
                    <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                      After the call
                    </p>
                    <p className="mt-2">
                      You get a straight answer: is it worth fixing, and what would it take.
                    </p>
                  </div>
                </div>
              </aside>
            </div>

            <WaitlistForm />
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
            I help growing teams implement AI where it saves the most time. Currently booked — join the waitlist.
          </p>
        </footer>
      </main>
    </div>
  );
}
