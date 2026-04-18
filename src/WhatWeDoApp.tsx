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
      "Hard numbers. Is this project making money, saving money, or wasting money? No opinions.",
  },
];

const mechanismFlow = [
  {
    step: "Week 1",
    title: "Map the workflow",
    detail:
      "Every step, handoff, exception, and manual touch. We find where the real bottleneck lives.",
  },
  {
    step: "Week 2",
    title: "Set the metric and build plan",
    detail:
      "One success metric, one baseline number, and a clear scope for what to build.",
  },
  {
    step: "Weeks 3-6",
    title: "Build the system",
    detail:
      "Your team builds with me directing the architecture and reviewing the work.",
  },
  {
    step: "Weeks 7-8",
    title: "Test with real work",
    detail:
      "We run the system on real tasks, catch the edge cases, and fix what breaks.",
  },
  {
    step: "Weeks 9-10",
    title: "Launch and train",
    detail: "Full rollout with your team. Training, documentation, handover.",
  },
  {
    step: "After",
    title: "Measure and decide what's next",
    detail:
      "Before and after numbers. Then we decide together whether workflow #2 is worth fixing.",
  },
];

const heroHighlights = [
  {
    label: "01",
    title: "The real problem",
    detail:
      "What's actually causing the bottleneck — not what you think is causing it.",
  },
  {
    label: "02",
    title: "The honest answer",
    detail:
      "Whether AI is the right fix, or whether a hire, a tool, or a process change solves it cheaper.",
  },
  {
    label: "03",
    title: "The next step",
    detail:
      "If it's a fit: sprint scope and timing. If it isn't: exactly what to do instead.",
  },
];

export default function WhatWeDoApp() {
  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0))]" />
      <WarpedGrid />

      <main className="relative mx-auto w-full max-w-[1240px] px-4 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-8 lg:px-10 lg:pt-10">
        <div className="sticky top-0 z-50 -mx-4 -mt-6 px-4 sm:-mx-8 sm:-mt-8 sm:px-8 lg:-mx-10 lg:-mt-10 lg:px-10 lg:py-4">
          <SiteHeader
            founderLinkedIn={LINKEDIN_PROFILE}
            homeHref="/"
            whatWeDoHref="/how-it-works/"
          />
        </div>

        <section id="overview" className={`${splitSectionClass} gap-8`}>
          <div className="flex h-full flex-col lg:col-span-7 lg:pr-6">
            <div>
              <p className={sectionLabelClass}>WHAT WE DO</p>
              <h1 className="mt-6 max-w-[11ch] text-4xl font-semibold leading-[1.01] tracking-[-0.04em] [text-wrap:balance] sm:text-5xl lg:text-[4rem]">
                You hired freelancers. Bought tools.{" "}
                <span className="bg-[var(--accent)] px-[0.08em] text-white [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                  Still no results?
                </span>
              </h1>
              <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-slate-700">
                Freelancers build what you tell them — but scoping is the hard
                part. I spend the first 2 weeks finding the real bottleneck,
                then 8 weeks teaching and helping your team ship a fix that
                measurably saves hours. You own the system at the end.
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
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
                <a
                  href="#scan"
                  className={`${primaryButtonClass} w-full justify-center sm:w-auto`}
                >
                  Book a $500 Strategy Call — Free
                </a>
                <a href="#mechanism" className={secondaryButtonClass}>
                  {MECHANISM_CTA}
                </a>
              </div>
              <p className="text-center text-sm text-slate-600 sm:text-left">
                For teams with one painful workflow and a real reason to fix it
                now.
              </p>
            </div>
          </div>

          <aside
            className={`relative mt-10 flex h-full flex-col lg:col-span-5 lg:mt-0 ${panelClass}`}
          >
            <span className="absolute -top-3 right-6 z-10 bg-[var(--accent)] px-3 py-1 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em] text-white shadow-sm">
              Free if you qualify
            </span>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={sectionLabelClass}>BOOK A CALL</p>
              <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                45 minutes
              </p>
            </div>
            <figure className="artifact-shell mt-6 border border-[var(--line)] bg-white">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2">
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Your calendar
                </p>
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Next available
                </p>
              </div>
              <div className="px-5 py-6">
                <div className="grid grid-cols-[36px_repeat(5,1fr)] gap-2">
                  <div />
                  {["MON", "TUE", "WED", "THU", "FRI"].map((day) => (
                    <div
                      key={day}
                      className="text-center font-['IBM_Plex_Mono'] text-[10px] font-medium tracking-[0.16em] text-slate-500"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {/* 9:00 row */}
                  <div className="grid grid-cols-[36px_repeat(5,1fr)] items-center gap-2">
                    <span className="font-['IBM_Plex_Mono'] text-[10px] font-medium text-slate-400">
                      9:00
                    </span>
                    <div className="h-8 bg-slate-100" />
                    <div className="h-8" />
                    <div className="h-8 bg-slate-100" />
                    <div className="h-8" />
                    <div className="h-8 bg-slate-100" />
                  </div>
                  {/* 10:00 row — highlighted strategy call on Wed */}
                  <div className="grid grid-cols-[36px_repeat(5,1fr)] items-center gap-2">
                    <span className="font-['IBM_Plex_Mono'] text-[10px] font-medium text-slate-400">
                      10:00
                    </span>
                    <div className="h-8" />
                    <div className="h-8" />
                    <div className="h-8 bg-[var(--accent)] shadow-[0_6px_14px_rgba(30,41,59,0.18)]" />
                    <div className="h-8 bg-slate-100" />
                    <div className="h-8" />
                  </div>
                  {/* 11:00 row */}
                  <div className="grid grid-cols-[36px_repeat(5,1fr)] items-center gap-2">
                    <span className="font-['IBM_Plex_Mono'] text-[10px] font-medium text-slate-400">
                      11:00
                    </span>
                    <div className="h-8 bg-slate-100" />
                    <div className="h-8 bg-slate-100" />
                    <div className="h-8" />
                    <div className="h-8 bg-slate-100" />
                    <div className="h-8" />
                  </div>
                  {/* 12:00 row */}
                  <div className="grid grid-cols-[36px_repeat(5,1fr)] items-center gap-2">
                    <span className="font-['IBM_Plex_Mono'] text-[10px] font-medium text-slate-400">
                      12:00
                    </span>
                    <div className="h-8" />
                    <div className="h-8 bg-slate-100" />
                    <div className="h-8" />
                    <div className="h-8 bg-slate-100" />
                    <div className="h-8 bg-slate-100" />
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-dashed border-[var(--line)] pt-4">
                  <div className="flex items-center gap-2">
                    <span className="block h-2.5 w-2.5 bg-[var(--accent)]" />
                    <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium tracking-[0.08em] text-slate-700">
                      Wed 10:00 — 45-min strategy call
                    </p>
                  </div>
                  <p className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.06em] text-slate-400">
                    1 slot / week
                  </p>
                </div>
              </div>
            </figure>
            <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.02em] [text-wrap:balance]">
              45 minutes. One workflow. A straight answer.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              On the call, we look at one workflow — the one that's costing you
              the most time or forcing your next hire. I'll tell you what I'd
              actually build, what it would cost, and whether the sprint is the
              right move. If it's not, I'll tell you that too.
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
          className="reveal delay-4 section-divider-short py-14"
        >
          <p className={sectionLabelClass}>WHAT WE BUILD INSIDE YOUR COMPANY</p>
          <h2 className={sectionHeadingClass}>
            Three things you're missing. We build all three.
          </h2>
          <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-slate-700">
            Right now, teams are working on your AI projects without a shared
            plan.
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

          <div className="mx-auto mt-14 max-w-3xl text-center sm:mt-16">
            <p className="text-3xl font-semibold leading-[1.15] tracking-[-0.03em] [text-wrap:balance] sm:text-4xl lg:text-[2.75rem]">
              In 2 weeks, you know exactly{" "}
              <span className="text-[var(--muted)]">
                what's worth fixing and what it takes.
              </span>
            </p>
          </div>

          <div className={panelClass + " mt-14 sm:mt-16"}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={sectionLabelClass}>HOW IT WORKS</p>
                <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-slate-700">
                  Every sprint follows the same ten-week path. That's how
                  nothing falls through the cracks.
                </p>
              </div>
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                10 weeks, step by step
              </p>
            </div>

            <ol className="mt-8 space-y-6 lg:hidden">
              {mechanismFlow.map((item, index) => (
                <li
                  key={item.step}
                  className="relative border-l-2 border-[var(--line)] pl-5"
                >
                  <span
                    className={`absolute -left-[7px] top-1 block h-3 w-3 rounded-full border-2 ${
                      index === mechanismFlow.length - 1
                        ? "border-[var(--accent)] bg-[var(--accent)]"
                        : "border-[var(--line)] bg-white"
                    }`}
                  />
                  <p
                    className={`font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] ${
                      index === mechanismFlow.length - 1
                        ? "text-[var(--accent)]"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    {item.step}
                  </p>
                  <p className="mt-2 text-base font-semibold tracking-[-0.01em] text-slate-950">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ol>

            <ol className="relative mt-9 hidden lg:grid lg:grid-cols-6 lg:gap-5">
              {mechanismFlow.map((item, index) => (
                <li key={item.step} className="relative">
                  <span
                    className={`inline-flex items-center border px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] ${
                      index === mechanismFlow.length - 1
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] bg-white text-[var(--muted)]"
                    }`}
                  >
                    {item.step}
                  </span>
                  <div className="mt-5 border-t border-[var(--line)] pt-4">
                    <p className="text-base font-semibold leading-tight tracking-[-0.01em] text-slate-950">
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

        <section className="reveal section-divider-full py-14 sm:py-16">
          <p className={sectionLabelClass}>WHAT YOU CAN DO TODAY</p>
          <h2 className={sectionHeadingClass}>Before you even talk to me.</h2>
          <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-slate-700">
            You don't need me to start. Do these three things this week.
          </p>

          <ol className="mt-8 space-y-4">
            {[
              {
                step: "01",
                title: "Write down the one process that wastes the most time",
                detail:
                  "Who does it? How long does it take? How often? Most people are surprised when they see the real number.",
              },
              {
                step: "02",
                title: "Ask each team lead one question",
                detail:
                  '"What is AI doing for your team right now?" Write down the answers. You\'ll find most of them say "we\'re experimenting" or "not much yet."',
              },
              {
                step: "03",
                title: "Circle anything that's actually making or saving money",
                detail:
                  "Look at your list. Circle anything generating revenue or saving measurable time. If the list is short or empty — that's exactly why we exist.",
              },
            ].map((item) => (
              <li key={item.step} className={cardClass}>
                <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium tracking-[0.18em] text-[var(--muted)]">
                  {item.step}
                </p>
                <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.01em]">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  {item.detail}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 sm:justify-start">
            <a
              href="/#scan"
              className={`${primaryButtonClass} w-full justify-center sm:w-auto`}
            >
              Or skip ahead — join the waitlist
            </a>
          </div>
        </section>

        <section id="scan" className="reveal py-14 sm:py-16">
          <div className="space-y-10">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="flex h-full flex-col lg:col-span-7 lg:pr-4">
                <div>
                  <p className={sectionLabelClass}>
                    JOIN THE WAITLIST — COMPLIMENTARY SCAN INCLUDED
                  </p>
                  <h2 className={sectionHeadingClass}>
                    Get on the list. Book a $500 Strategy Call — Free
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
