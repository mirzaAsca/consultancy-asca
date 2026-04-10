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
    title: "The gains are real",
    intro:
      "Every team I talk to asks the same thing: does AI actually make people faster? These eight studies answer that. The short version: yes. 14% in customer service. 25% across knowledge work. 55% in software. The number depends on which workflow you pick and how you set it up.",
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
    title: "But most teams get nothing from it",
    intro:
      "Here is the part nobody puts on their sales page. 56% of CEOs say AI has not helped revenue or costs. 42% of companies killed their AI projects. The technology works. The way most people roll it out does not. Wrong scope. No measurement. No one owns it. These studies show where it breaks.",
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
    title: "What things actually cost",
    intro:
      "Most teams guess at these numbers. They guess what a knowledge worker costs fully loaded. They guess what other companies spend on AI. They guess what a faster workflow is worth. These sources replace the guesswork so you know what a win is worth before you commit to anything.",
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
    title: "Where the pressure is coming from",
    intro:
      "AI spending went up 44% last year. 88% of companies use it somewhere. The teams that move now compound the advantage. The teams that wait fall behind a little more each quarter. These studies show the pace so you can decide where you stand.",
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
          <p className={sectionLabelClass}>RESEARCH LIBRARY</p>
          <h1 className="mt-6 max-w-[16ch] text-4xl font-semibold leading-[1.01] tracking-[-0.04em] [text-wrap:balance] sm:text-5xl lg:text-[4rem]">
            The gains are real. Most implementations are not.
          </h1>
          <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-slate-700">
            Stanford, Harvard, McKinsey, Anthropic, and the St. Louis Fed all
            confirm real productivity gains from AI. In the same years, 56% of
            CEOs report zero ROI and 42% of companies scrapped their AI projects
            entirely. The gap between what works and what gets shipped is where
            most teams lose.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className={metaChipClass}>
              {allSources.length} peer-reviewed and industry sources
            </span>
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
            <p className={sectionLabelClass}>NEXT STEP</p>
            <h2 className="mt-6 max-w-[18ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl">
              If you already know which workflow is costing you the most time,
              that is the better place to start.
            </h2>
            <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-slate-700">
              Research keeps the work honest, but it is not the work itself. If
              you have a specific workflow in mind, I scope it in weeks 1 and 2,
              help your team build and ship the fix through week 9, and measure
              the before-and-after numbers in week 10.
            </p>
            <div className="mt-8">
              <a href="/#plans" className={primaryButtonClass}>
                See How the Sprint Works
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
