import SiteHeader from "./components/SiteHeader";
import WarpedGrid from "./components/WarpedGrid";
import { TIER1_SOURCES, TIER2_SOURCES, type Source } from "./lib/roi-sources";
import { GRID_CELL_PX, SHORT_DIVIDER_GRID_SPAN } from "./layout";
import type { CSSProperties } from "react";

const PRIMARY_EMAIL = "mirza@10x.ai";
const LINKEDIN_PROFILE = "https://www.linkedin.com/in/mirzaasceric/";
const surfaceClass = "border border-[var(--line)] bg-[var(--surface)]";
const panelClass = `premium-panel ${surfaceClass} p-6`;
const cardClass = `premium-card ${surfaceClass} p-5`;
const sectionLabelClass =
  "inline-flex w-fit items-center bg-white px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]";
const sectionHeadingClass =
  "mt-4 max-w-[20ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl";
const metaChipClass =
  "inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]";
const primaryButtonClass =
  "inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2";
const shortDividerSectionClass = "reveal section-divider-short py-14 sm:py-16";

const gridSystemStyle = {
  "--grid-cell": `${GRID_CELL_PX}px`,
  "--short-divider-span": `${SHORT_DIVIDER_GRID_SPAN}`,
} as CSSProperties;

const allSources = [...TIER1_SOURCES, ...TIER2_SOURCES];
const sourceMap = new Map(allSources.map((source) => [source.name, source]));

function pickSources(names: string[]): Source[] {
  return names.map((name) => {
    const source = sourceMap.get(name);

    if (!source) {
      throw new Error(`Missing source: ${name}`);
    }

    return source;
  });
}

const researchSections = [
  {
    id: "productivity",
    eyebrow: "01",
    title: "AI really can make a team faster",
    intro:
      "Yes, it works. AI can help people do more in less time. Sometimes the gain is small. Sometimes it is big. But the win depends on one thing: did you point it at the right job?",
    sources: pickSources([
      "Stanford/MIT - Generative AI Can Boost Productivity Without Replacing Workers",
      "Harvard/BCG - Navigating the Jagged Technological Frontier",
      "GitHub - Quantifying Copilot's Impact on Developer Productivity",
      "Anthropic - Estimating Productivity Gains from AI",
      "McKinsey - AI-Powered Marketing and Sales Reach New Heights with Generative AI",
      "St. Louis Fed - Impact of Generative AI on Work Productivity",
      "Anthropic - Economic Index",
      "McKinsey - The Economic Potential of Generative AI",
    ]),
  },
  {
    id: "failure",
    eyebrow: "02",
    title: "Most teams still get nothing from AI",
    intro:
      "This is the part most people skip. The tool is not the main problem. The rollout is. Teams try to fix too much at once, do not measure the result, and no one clearly owns the work.",
    sources: pickSources([
      "PwC - 28th Annual Global CEO Survey",
      "S&P Global - AI & Machine Learning Use Cases Survey",
      "Gartner - AI in Organizations Survey",
      "BCG - AI at Work: Momentum Builds But Gaps Remain",
      "IBM - How Governance Increases Velocity",
      "WEF - Why Effective AI Governance Is Becoming a Growth Strategy",
      "Deloitte - The AI ROI Paradox",
      "California Management Review - ROI of AI Ethics and Governance",
    ]),
  },
  {
    id: "benchmarks",
    eyebrow: "03",
    title: "The math matters more than the hype",
    intro:
      "Most teams guess at the numbers. They guess what a hire really costs. They guess what time saved is worth. They guess what AI should cost. Good decisions do not come from guessing. They come from simple math.",
    sources: pickSources([
      "BLS - Employer Costs for Employee Compensation (ECEC)",
      "Avasant/Computer Economics - IT Spending Benchmarks by Industry",
      "Glassdoor - Chief AI Officer Salaries",
      "Robert Half - AI/ML Engineer Salary Data",
      "Menlo Ventures - State of GenAI in the Enterprise",
      "CloudZero - State of AI Costs",
      "CSIMarket - Revenue Per Employee by Sector",
      "Damodaran / NYU Stern - Employee Metrics Dataset",
    ]),
  },
  {
    id: "market",
    eyebrow: "04",
    title: "Waiting costs more than it looks",
    intro:
      "The cost of waiting is not just missing AI. The real cost is keeping the same slow work, the same extra pressure, and the same need to hire just to keep up. Teams that fix useful workflows now get stronger over time.",
    sources: pickSources([
      "McKinsey - State of AI 2025",
      "BCG - The Widening AI Value Gap",
      "McKinsey - Superagency in the Workplace",
      "Deloitte - State of AI in the Enterprise",
      "Gartner - Worldwide AI Spending Forecast",
      "ISG - Enterprise AI Spending Study",
    ]),
  },
];

function SourceCard({ source }: { source: Source }) {
  return (
    <article className={cardClass}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={metaChipClass}>{source.year}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-snug tracking-[-0.02em] text-slate-950">
        {source.name}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {source.detail}
      </p>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center text-sm font-medium text-[var(--accent)] underline decoration-slate-300 underline-offset-4 transition-colors hover:text-[var(--accent-strong)] hover:decoration-[var(--accent-strong)]"
      >
        Read source
      </a>
    </article>
  );
}

function ResearchSection({
  eyebrow,
  title,
  intro,
  sources,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sources: Source[];
}) {
  return (
    <section className={shortDividerSectionClass}>
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className={sectionLabelClass}>{eyebrow}</p>
          <span className={metaChipClass}>{sources.length} studies</span>
        </div>
        <h2 className={sectionHeadingClass}>{title}</h2>
        <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-slate-700">
          {intro}
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {sources.map((source) => (
          <SourceCard key={source.url} source={source} />
        ))}
      </div>
    </section>
  );
}

export default function ResearchApp() {
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

        <section className="reveal py-14 sm:py-16">
          <p className={sectionLabelClass}>WHAT THE RESEARCH REALLY SAYS</p>
          <h1 className="mt-6 max-w-[16ch] text-4xl font-semibold leading-[1.01] tracking-[-0.04em] [text-wrap:balance] sm:text-5xl lg:text-[4rem]">
            AI works. Most teams still get nothing.
          </h1>
          <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-slate-700">
            I read the studies so you do not have to. Here is the simple truth:
            AI can help a team move faster. But most teams get little or nothing
            because they pick the wrong problem, do not measure the result, and
            nobody owns the work.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className={metaChipClass}>{allSources.length} studies read</span>
            <span className={metaChipClass}>
              Stanford · Harvard · McKinsey · Anthropic · BLS
            </span>
            <span className={metaChipClass}>2023–2026</span>
          </div>
        </section>

        {researchSections.map((section) => (
          <ResearchSection
            key={section.id}
            eyebrow={section.eyebrow}
            title={section.title}
            intro={section.intro}
            sources={section.sources}
          />
        ))}

        <section className="reveal py-14 sm:py-16">
          <div className={`${panelClass} max-w-3xl`}>
            <p className={sectionLabelClass}>WHAT TO DO WITH THIS</p>
            <h2 className="mt-6 max-w-[18ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl">
              Reading more studies will not fix your workflow. Picking one will.
            </h2>
            <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-slate-700">
              The research gives you the answer, not the result. If you can name
              the one workflow costing your team the most time, that is where to
              start. I map it in the first 2 weeks, help your team build the fix
              over the next 7, and show you the before-and-after numbers at the
              end.
            </p>
            <div className="mt-8">
              <a href="/#plans" className={primaryButtonClass}>
                See the 10-week sprint
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
            I read the research so you do not have to. Then I help you fix one
            workflow.
          </p>
        </footer>
      </main>
    </div>
  );
}
