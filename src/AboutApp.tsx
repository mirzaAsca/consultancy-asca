import type { CSSProperties } from "react";
import SiteHeader from "./components/SiteHeader";
import WarpedGrid from "./components/WarpedGrid";
import { GRID_CELL_PX, SHORT_DIVIDER_GRID_SPAN } from "./layout";

const PRIMARY_EMAIL = "mirza@10x.ai";
const LINKEDIN_PROFILE = "https://www.linkedin.com/in/mirzaasceric/";
const PROOF_LINK =
  "https://www.linkedin.com/posts/alenm_50-billion-tokens-later-honored-to-finally-activity-7399454409547657216-LEUi";
const FLYRANK_URL = "https://www.flyrank.com";
const FLYRANK_CASE_STUDIES = "https://www.flyrank.com/blogs/case-studies";
const TENX_URL = "https://10x.ai";

const inlineLinkClass =
  "font-medium text-[var(--accent)] underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]";

const surfaceClass = "border border-[var(--line)] bg-[var(--surface)]";
const panelClass = `premium-panel ${surfaceClass} p-6`;
const sectionLabelClass =
  "inline-flex w-fit items-center bg-white px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]";
const metaChipClass =
  "inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]";
const primaryButtonClass =
  "inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2";
const secondaryButtonClass =
  "inline-flex items-center justify-center border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-[var(--accent)] hover:text-[var(--accent)]";
const shortDividerSectionClass = "reveal section-divider-short py-14 sm:py-16";

const gridSystemStyle = {
  "--grid-cell": `${GRID_CELL_PX}px`,
  "--short-divider-span": `${SHORT_DIVIDER_GRID_SPAN}`,
} as CSSProperties;

const stats = [
  { number: "2,500+", label: "Hours in AI" },
  { number: "20+", label: "Test domains" },
  { number: "50B+", label: "Tokens burned" },
];

export default function AboutApp() {
  return (
    <div
      className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)]"
      style={gridSystemStyle}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0))]" />
      <WarpedGrid />

      <main className="relative mx-auto w-full max-w-[1240px] px-6 pb-20 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <div className="sticky top-0 z-50 -mx-6 px-6 py-4 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
          <SiteHeader
            founderLinkedIn={LINKEDIN_PROFILE}
            homeHref="/"
            whatWeDoHref="/how-it-works/"
          />
        </div>

        {/* ── HERO: circular photo + name + opener ── */}
        <section className="reveal py-14 sm:py-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className={`${sectionLabelClass} relative z-10`}>Me</p>

            <div className="relative mt-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 rounded-full border border-dashed border-[var(--line)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-12 rounded-full border border-[var(--line)]"
              />
              <div className="relative aspect-square w-56 overflow-hidden rounded-full bg-[var(--accent)] shadow-[0_24px_60px_rgba(15,23,42,0.22)] ring-4 ring-white sm:w-64">
                <img
                  src="/about-mirza.png"
                  alt="Mirza Ašćerić"
                  className="h-full w-full object-cover object-center"
                  loading="eager"
                />
              </div>
            </div>

            <h1 className="mt-10 max-w-[22ch] text-4xl font-semibold leading-[1.05] tracking-[-0.035em] [text-wrap:balance] sm:text-5xl lg:text-[3.75rem]">
              Hi, I'm Mirza Ašćerić.
            </h1>
            <p className="mt-4 max-w-[44ch] font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              The director of AI Development over at{" "}
              <a
                href={FLYRANK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent)]"
              >
                FlyRank AI
              </a>{" "}
              &{" "}
              <a
                href={TENX_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent)]"
              >
                10x.ai
              </a>
            </p>
            <p className="mt-8 max-w-[56ch] text-base leading-relaxed text-slate-700">
              And I promise, I won't use AI to write this text. And I'm not a robot.
            </p>
          </div>
        </section>

        {/* ── STATS STRIP ── */}
        <section className="reveal section-divider-short py-10 sm:py-12">
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`${surfaceClass} flex flex-col items-center px-4 py-5 text-center`}
              >
                <span className="font-['IBM_Plex_Mono'] text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-3xl">
                  {stat.number}
                </span>
                <span className="mt-2 font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── CHAPTER 01: what do i do ── */}
        <section className={shortDividerSectionClass}>
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex items-center justify-center gap-3">
              <span className={metaChipClass}>Chapter 01</span>
              <p className={sectionLabelClass}>what do i do</p>
            </div>
            <p className="mx-auto mt-8 max-w-[28ch] text-3xl font-semibold leading-[1.15] tracking-[-0.03em] [text-wrap:balance] sm:text-4xl">
              I do AI.{" "}
              <span className="text-[var(--muted)]">
                All the time, even in my free time.
              </span>
            </p>
            <p className="mx-auto mt-6 max-w-[58ch] text-base leading-relaxed text-slate-700">
              And that resulted in spending well over 2,500 hours creating, learning, iterating. At the moment of writing this, it is early 2026. 
            </p>
          </div>
        </section>

        {/* ── CHAPTER 02: how it started — full prose in a single panel ── */}
        <section className={shortDividerSectionClass}>
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-center gap-3">
              <span className={metaChipClass}>Chapter 02</span>
              <p className={sectionLabelClass}>how it started</p>
            </div>

            <div className={`${panelClass} mt-10`}>
              <p className="text-base leading-relaxed text-slate-700">
                I had multiple small businesses over the past years, kept
                building, learning, and failing, but now — we are doing stuff on
                a whole new level. At{" "}
                <a
                  href={FLYRANK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={inlineLinkClass}
                >
                  FlyRank AI
                </a>
                , we are doing the unimaginable — creating the first AI content
                ecosystem. It's not like using ChatGPT to create an article; we
                own the full architecture. In short, it works.
              </p>
              <p className="mt-5 border-t border-dashed border-[var(--line)] pt-5 text-base leading-relaxed text-slate-800">
                If a Guinness record existed for the fastest organic growth of a
                website in record time, we would hold the title (I'm not even
                exaggerating, I swear). And we keep beating it all the time.{" "}
                <a
                  href={FLYRANK_CASE_STUDIES}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={inlineLinkClass}
                >
                  See the case studies →
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* ── CHAPTER 03: and now? — full prose + proof link ── */}
        <section className={shortDividerSectionClass}>
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex items-center justify-center gap-3">
              <span className={metaChipClass}>Chapter 03</span>
              <p className={sectionLabelClass}>and now?</p>
            </div>

            <p className="mx-auto mt-8 max-w-[32ch] text-3xl font-semibold leading-[1.15] tracking-[-0.03em] [text-wrap:balance] sm:text-4xl">
              FlyRank AI is only part of the{" "}
              <span className="bg-[var(--accent)] px-[0.12em] text-white [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                bigger picture
              </span>{" "}
              —{" "}
              <a
                href={TENX_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:decoration-[var(--accent)]"
              >
                10x.ai
              </a>
              .
            </p>

            <div className="mt-8 space-y-5 text-left">
              <p className="text-base leading-relaxed text-slate-700">
                <a
                  href={TENX_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={inlineLinkClass}
                >
                  10x.ai
                </a>{" "}
                is a portfolio of AI-native products we develop or acquire. Now
                we are operating differently, both in-house and externally. At
                10x.ai, we automate most and test everything. We don't invent
                stuff so often, but you can bet we are executing pretty damn
                fast.
              </p>
              <p className="text-base leading-relaxed text-slate-700">
                We even have our own lab (20+ domains) as a playground to test
                every single concept, live — at scale. We spend a fortune on
                destroying and stress-testing apps and websites, just to check
                efficiency and use it the right way. We spend the money, so you
                don't have to.
              </p>
              <p className="text-base leading-relaxed text-slate-700">
                Here is proof:{" "}
                <a
                  href={PROOF_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--accent)] underline decoration-[rgba(30,41,59,0.24)] underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]"
                >
                  50 billion tokens later →
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* ── CHAPTER 04: so, why offer services? ── */}
        <section className={shortDividerSectionClass}>
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex items-center justify-center gap-3">
              <span className={metaChipClass}>Chapter 04</span>
              <p className={sectionLabelClass}>
                so, why am i offering services at all?
              </p>
            </div>

            <p className="mx-auto mt-8 max-w-[30ch] text-3xl font-semibold leading-[1.15] tracking-[-0.03em] [text-wrap:balance] sm:text-4xl">
              I spotted a gap.
            </p>

            <div className="mt-8 space-y-5 text-left">
              <p className="text-base leading-relaxed text-slate-700">
                The distance between knowledge and stuff called "knowledge" in
                the AI industry has never been wider. It's pretty obvious now.
                Most of the noise would completely disappear if the only voices
                heard around AI came from people who actually did the work for
                at least 50+ hours.
              </p>
              <p className="text-base font-semibold leading-relaxed text-slate-950">
                I want to change it.{" "}
                <a
                  href={TENX_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={inlineLinkClass}
                >
                  10x.ai
                </a>{" "}
                wants to change it.
              </p>
            </div>
          </div>
        </section>

        {/* ── CHAPTER 05: my mission ── */}
        <section className={shortDividerSectionClass}>
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex items-center justify-center gap-3">
              <span className={metaChipClass}>Chapter 05</span>
              <p className={sectionLabelClass}>my mission</p>
            </div>

            <p className="mx-auto mt-8 max-w-[34ch] text-3xl font-semibold leading-[1.15] tracking-[-0.03em] [text-wrap:balance] sm:text-4xl lg:text-[2.5rem]">
              I like solving problems and building stuff —{" "}
              <span className="text-[var(--muted)]">
                and I want to teach you to do the same.
              </span>
            </p>

            <div className="mt-8 space-y-5 text-left">
              <p className="text-base leading-relaxed text-slate-700">
                And I will help you for free. Seriously. Nothing in my pocket is
                being held back once you qualify for our strategy call. You can
                do the stuff I explain in-house, or even with some agency
                — we're good.
              </p>
              <p className="text-base leading-relaxed text-slate-700">
                Extremely useful knowledge has been online and free for a while.
                I am here to clear the noise. You can finally stop chasing new
                AI tools and start growing your company.
              </p>
            </div>
          </div>
        </section>

        {/* ── OUTRO CTA: sounds interesting? ── */}
        <section className="reveal py-14 sm:py-16">
          <div
            className={`mx-auto max-w-4xl text-center ${panelClass} py-12 sm:py-16`}
          >
            <p className={`${sectionLabelClass} mx-auto`}>sounds interesting?</p>
            <p className="mx-auto mt-6 max-w-[32ch] text-3xl font-semibold leading-[1.1] tracking-[-0.03em] [text-wrap:balance] sm:text-4xl">
              I talk on LinkedIn.{" "}
              <span className="bg-[var(--accent)] px-[0.12em] text-white [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                But, a lot.
              </span>
            </p>
            <p className="mx-auto mt-5 max-w-[48ch] text-base leading-relaxed text-slate-700">
              Follow me there as well. I am not a seller.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={LINKEDIN_PROFILE}
                target="_blank"
                rel="noopener noreferrer"
                className={primaryButtonClass}
              >
                Follow on LinkedIn
              </a>
              <a href="/how-it-works/#scan" className={secondaryButtonClass}>
                Book the strategy call
              </a>
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
            I help growing teams implement AI where it saves the most time.
          </p>
        </footer>
      </main>
    </div>
  );
}
