import BusinessAiPrimerSection from "./components/BusinessAiPrimerSection";
import SiteHeader from "./components/SiteHeader";
import WarpedGrid from "./components/WarpedGrid";
import WaitlistForm from "./components/WaitlistForm";

const PRIMARY_EMAIL = "mirza@10x.ai";
const LINKEDIN_PROFILE = "https://www.linkedin.com/in/mirzaasceric/";
const MECHANISM_CTA = "See how it works";
const primaryButtonClass =
  "inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2";
const secondaryButtonClass =
  "inline-flex items-center justify-center text-sm font-medium text-[var(--accent)] underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]";
const surfaceClass = "border border-[var(--line)] bg-[var(--surface)]";
const panelClass = `premium-panel ${surfaceClass} p-6`;
const cardClass = `premium-card ${surfaceClass} p-5`;
const listItemClass = `premium-card ${surfaceClass} px-4 py-3`;
const sectionLabelClass =
  "inline-flex w-fit items-center bg-white px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]";
const sectionHeadingClass =
  "mt-4 max-w-[18ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl";
const splitSectionClass =
  "reveal section-divider-full py-14 sm:py-16 lg:grid lg:grid-cols-12 lg:gap-8";
const heroHighlightClass = `premium-card ${surfaceClass} p-4`;
const metaChipClass =
  "inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]";

const installBlocks = [
  {
    title: "The master list",
    detail:
      "Every AI project in one place. Who owns it, what it costs, what it's supposed to do, and whether it's actually doing it.",
  },
  {
    title: "The rules",
    detail:
      "Right now, nobody knows who's allowed to say yes. So nothing moves. We write it down: this person approves this, legal reviews that, and here's the deadline. Done.",
  },
  {
    title: "The scoreboard",
    detail:
      "Hard numbers. Is this project making money, saving money, or wasting money? No opinions. Just math.",
  },
];

const mechanismFlow = [
  {
    step: "01",
    title: "Collect",
    detail:
      "We find every AI project running in your company and write it down.",
  },
  {
    step: "02",
    title: "Rank",
    detail: "Which ones can actually make money? Those go first.",
  },
  {
    step: "03",
    title: "Set the rules",
    detail: 'Who decides what. No more "I thought you were handling that."',
  },
  {
    step: "04",
    title: "Build and ship",
    detail: "We track every project until it's live and working.",
  },
  {
    step: "05",
    title: "Measure",
    detail: "Is it doing what we said it would? Numbers don't lie.",
  },
  {
    step: "06",
    title: "Double down or kill it",
    detail: "Winners get more resources. Losers get shut down.",
  },
];

const firstMonthDeliverables = [
  "One list of every AI project. Who owns it. What it costs. What it's worth.",
  "A straight answer: keep this, kill that, fix this first.",
  "A simple doc: who approves what, and when. No more guessing.",
  "Baseline numbers so you can tell if AI is making you money or burning it.",
  "A 90-day plan your whole team can actually follow.",
];

const timeline = [
  {
    title: "First 30 Days",
    detail:
      "You know what you have, what matters, and exactly what to do next.",
  },
  {
    title: "First 90 Days",
    detail:
      "Governance live. First projects in production or on a clear path to deployment.",
  },
  {
    title: "6 Months",
    detail:
      "Multiple projects running in production. You can see the impact in your numbers.",
  },
  {
    title: "12 Months",
    detail:
      "AI is part of how your company works. The board sees returns, not experiments.",
  },
];

const proofEvidence = [
  {
    title: "Portfolio dashboard",
    detail:
      "Every project, every owner, every status - one view your board can actually read.",
  },
  {
    title: "Scoring model",
    detail: "The math we use to decide what gets resources and what gets cut.",
  },
  {
    title: "Decision rules",
    detail: "Who approves what, who reviews, and when. No ambiguity.",
  },
];

const proofVisuals = [
  {
    title: "Portfolio dashboard",
    src: "/proof-portfolio-dashboard.svg",
    summary:
      "Every project, who owns it, what's at risk, and what the board needs to decide next.",
  },
  {
    title: "Decision rules and ownership map",
    src: "/proof-governance-charter.svg",
    summary:
      "Who owns what, who escalates to whom, and when reviews happen. No confusion.",
  },
  {
    title: "Scorecard and baselines",
    src: "/proof-kpi-tree.svg",
    summary:
      "The numbers that tell you if AI is saving money, making money, or wasting money.",
  },
];

const heroHighlights = [
  {
    label: "01",
    title: "The full picture",
    detail: "Every AI project, who owns it, what it costs.",
  },
  {
    label: "02",
    title: "The scorecard",
    detail: "Is it actually making money or saving time? Yes or no.",
  },
  {
    label: "03",
    title: "The action list",
    detail: "What to keep, what to kill, what to fix first.",
  },
];

const frameworkTags = [
  "NIST AI RMF",
  "ISO/IEC 42001",
  "OWASP LLM Top 10",
  "EU AI Act — Aug 2, 2026 deadline",
];

const featuredProof = proofVisuals[0];
const supportingProofs = proofVisuals.slice(1);

export default function WhatWeDoApp() {
  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0))]" />
      <WarpedGrid />

      <main className="relative mx-auto w-full max-w-[1240px] px-6 pb-20 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <div className="sticky top-0 z-50 -mx-6 px-6 py-4 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
          <SiteHeader
            applyHref="/#scan"
            founderLinkedIn={LINKEDIN_PROFILE}
            homeHref="/"
            whatWeDoHref="/how-we-work/"
          />
        </div>

        <section id="overview" className={`${splitSectionClass} gap-8`}>
          <div className="flex h-full flex-col lg:col-span-7 lg:pr-6">
            <div>
              <p className={sectionLabelClass}>WHAT WE DO</p>
              <h1 className="mt-6 max-w-[11ch] text-4xl font-semibold leading-[1.01] tracking-[-0.04em] [text-wrap:balance] sm:text-5xl lg:text-[4rem]">
                You hired consultants. Bought tools.{" "}
                <span className="bg-[var(--accent)] px-[0.08em] text-white [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                  Still no results.
                </span>
              </h1>
              <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-slate-700">
                Most companies spend six figures on AI and have nothing to show
                for it. We come in, find what's broken, build what's missing,
                and run it with you until the numbers move. No slide decks. No
                "strategy sessions." Just working systems that make money or
                save money.
              </p>
            </div>

            <div className="mt-8 space-y-5 lg:mt-auto lg:pt-10">
              {/* <div className="border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Complimentary with every waitlist signup
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                    AI Portfolio Reality Scan
                  </span>
                  <span className="font-['IBM_Plex_Mono'] text-sm font-medium text-slate-400 line-through decoration-[1.5px]">
                    $15,000
                  </span>
                  <span className="inline-flex items-baseline gap-1 bg-[var(--accent)] px-2 py-0.5 text-sm font-semibold text-white">
                    $0
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Full diagnostic of every AI project in your company. You keep everything we find — whether you hire us or not.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={metaChipClass}>40-min strategy call</span>
                  <span className={metaChipClass}>Results in ~2 weeks</span>
                  <span className={metaChipClass}>You keep everything</span>
                </div>
              </div> */}
              <div className="flex flex-wrap items-center gap-5">
                <a href="#scan" className={primaryButtonClass}>
                  Get Your $15,000 Scan — Free
                </a>
                <a href="#mechanism" className={secondaryButtonClass}>
                  {MECHANISM_CTA}
                </a>
              </div>
              <p className="text-sm text-slate-600">
                For companies already spending on AI that have nothing to show
                the board yet.
              </p>
            </div>
          </div>

          <aside
            className={`relative flex h-full flex-col lg:col-span-5 ${panelClass}`}
          >
            <span className="absolute -top-3 right-6 z-10 bg-[var(--accent)] px-3 py-1 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-white shadow-sm">
              Valued at $15,000 — yours free
            </span>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={sectionLabelClass}>START HERE</p>
              <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                2-3 weeks
              </p>
            </div>
            <figure className="artifact-shell mt-6 border border-[var(--line)]">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2">
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Sample deliverable
                </p>
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Client details hidden
                </p>
              </div>
              <img
                src={featuredProof.src}
                alt={featuredProof.title}
                className="h-auto w-full"
                loading="eager"
              />
            </figure>
            <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.02em] [text-wrap:balance]">
              One page that shows your board exactly where you stand.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              We look at everything you're running. In two weeks, you know
              what's working, what's wasting money, and what to do about it. You
              keep the whole thing whether you hire us or not.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {heroHighlights.map((item) => (
                <div key={item.label} className={heroHighlightClass}>
                  <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                    {item.label}
                  </p>
                  <p className="mt-3 text-sm font-medium tracking-[-0.01em] text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <BusinessAiPrimerSection />

        <section
          id="mechanism"
          className="reveal delay-4 section-divider-full py-14"
        >
          <p className={sectionLabelClass}>WHAT WE BUILD INSIDE YOUR COMPANY</p>
          <h2 className={sectionHeadingClass}>
            Three things you're missing. We build all three.
          </h2>
          <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-slate-700">
            Right now your AI projects are scattered across teams with no shared
            plan. These three pieces fix that.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-12">
            {installBlocks.map((block, index) => (
              <article
                key={block.title}
                className={`h-full lg:col-span-4 ${cardClass}`}
              >
                <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium tracking-[0.18em] text-[var(--muted)]">
                  00{index + 1}
                </p>
                <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.01em]">
                  {block.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  {block.detail}
                </p>
              </article>
            ))}
          </div>

          <div className={panelClass + " mt-8"}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={sectionLabelClass}>HOW IT WORKS</p>
                <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-slate-700">
                  Every project goes through the same six steps. No exceptions.
                  That's how nothing falls through the cracks.
                </p>
              </div>
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                6 steps, no shortcuts
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
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] bg-white text-[var(--muted)]"
                    } font-['IBM_Plex_Mono']`}
                  >
                    {item.step}
                  </div>
                  <p className="text-base font-semibold tracking-[-0.01em] text-slate-950">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {item.detail}
                  </p>
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
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] bg-white text-[var(--muted)]"
                    } font-['IBM_Plex_Mono']`}
                  >
                    {item.step}
                  </div>
                  <div className="mt-5 max-w-[16ch]">
                    <p className="text-base font-semibold tracking-[-0.01em] text-slate-950">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      {item.detail}
                    </p>
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
              In 30 days, you'll know exactly what to do.
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
                <div
                  key={item.title}
                  className="flex-1 border-t border-[var(--line)] pt-4 first:border-t-0 first:pt-0"
                >
                  <dt className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                    {item.title}
                  </dt>
                  <dd className="mt-2 leading-relaxed text-slate-800">
                    {item.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>

        <section className="reveal section-divider-full py-14 sm:py-16">
          <p className={sectionLabelClass}>WHAT YOU CAN DO TODAY</p>
          <h2 className={sectionHeadingClass}>
            Before you even talk to us.
          </h2>
          <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-slate-700">
            You don't need us to start. Do these three things this week and you'll already know more than 90% of companies.
          </p>

          <ol className="mt-8 space-y-4">
            {[
              {
                step: "01",
                title: "List every AI tool your company pays for",
                detail: "Open a spreadsheet. Write down every AI tool, who uses it, and what it costs per month. Most companies can't do this in under an hour. That's the problem.",
              },
              {
                step: "02",
                title: "Ask each team lead one question",
                detail: "\"What is AI doing for your team right now?\" Write down the answers. You'll find most of them say \"we're experimenting\" or \"not much yet.\"",
              },
              {
                step: "03",
                title: "Circle anything that's actually making or saving money",
                detail: "Look at your list. Circle anything generating revenue or saving measurable time. If the list is short or empty — that's exactly why we exist.",
              },
            ].map((item, index) => (
              <li key={item.step} className={`relative pl-12 ${cardClass}`}>
                <div
                  className="absolute left-4 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-white font-['IBM_Plex_Mono'] text-[10px] font-medium tracking-[0.12em] text-[var(--muted)]"
                >
                  {item.step}
                </div>
                <p className="text-base font-semibold tracking-[-0.01em] text-slate-950">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {item.detail}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <a href="/#scan" className={primaryButtonClass}>
              Or skip ahead — get your free scan
            </a>
          </div>
        </section>

        <section id="proof" className={splitSectionClass}>
          <div className="flex h-full flex-col lg:col-span-5 lg:pr-4">
            <div>
              <p className={sectionLabelClass}>PROOF</p>
              <h2 className={sectionHeadingClass}>
                We show our work. Not slides.
              </h2>
              <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-slate-700">
                You'll see real dashboards, real scorecards, and real documents
                your board can use. Everything we build meets the compliance
                standards that matter (NIST, ISO 42001, OWASP, EU AI Act).
              </p>
              <p className="mt-6 text-sm font-medium text-slate-700">
                The standards your legal team will ask about. We build to all of them.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {frameworkTags.map((tag) => (
                  <span key={tag} className={metaChipClass}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-1 text-[11px] leading-relaxed text-slate-400">
                <p>
                  <a
                    href="https://www.nist.gov/artificial-intelligence/executive-order-safe-secure-and-trustworthy-artificial-intelligence"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
                  >
                    NIST AI Risk Management Framework
                  </a>
                  {" · "}
                  <a
                    href="https://www.iso.org/standard/81230.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
                  >
                    ISO/IEC 42001:2023
                  </a>
                  {" · "}
                  <a
                    href="https://owasp.org/www-project-top-10-for-large-language-model-applications/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
                  >
                    OWASP LLM Top 10
                  </a>
                  {" · "}
                  <a
                    href="https://artificialintelligenceact.eu/high-level-summary/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
                  >
                    EU AI Act — high-risk obligations effective Aug 2, 2026
                  </a>
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4 border-t border-[var(--line)] pt-5 lg:mt-auto">
              {proofEvidence.map((item) => (
                <article
                  key={item.title}
                  className="border-b border-[var(--line)] pb-4 last:border-b-0 last:pb-0"
                >
                  <p className="text-sm font-medium tracking-[-0.01em] text-slate-950">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {item.detail}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:col-span-7 lg:mt-0 lg:grid-cols-12">
            <article
              className={`artifact-shell overflow-hidden lg:col-span-12 ${surfaceClass}`}
            >
              <img
                src={featuredProof.src}
                alt={featuredProof.title}
                className="h-auto w-full"
                loading="lazy"
              />
              <div className="border-t border-[var(--line)] px-5 py-4">
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Main deliverable
                </p>
                <p className="text-base font-semibold tracking-[-0.01em] text-slate-900">
                  {featuredProof.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {featuredProof.summary}
                </p>
              </div>
            </article>

            {supportingProofs.map((item) => (
              <article
                key={item.title}
                className={`artifact-shell overflow-hidden lg:col-span-6 ${surfaceClass}`}
              >
                <img
                  src={item.src}
                  alt={item.title}
                  className="h-auto w-full"
                  loading="lazy"
                />
                <div className="border-t border-[var(--line)] px-4 py-3">
                  <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                    Also included
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {item.summary}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="scan" className="reveal section-divider-full py-14 sm:py-16">
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

            <WaitlistForm />
          </div>
        </section>

        <footer className="reveal mt-4 flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
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
