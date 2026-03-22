import { useState, useRef } from "react";
import SiteHeader from "./components/SiteHeader";
import WarpedGrid from "./components/WarpedGrid";
import WaitlistForm from "./components/WaitlistForm";

// ── PRICING ──

const PLAN_A_MONTHLY = 22_000;
const PLAN_A_ANNUAL = PLAN_A_MONTHLY * 12;
const PLAN_B_MONTHLY = 290_000;
const PLAN_B_ANNUAL = PLAN_B_MONTHLY * 12;

// ── REACH (constant across scenarios) ──

const PLAN_A_REACH = 0.25; // 25% of knowledge workers — planning estimate based on BCG 2025 adoption data (16-33% actual usage range)
const PLAN_B_REACH = 0.40; // 40% of knowledge workers — planning estimate; McKinsey 2025 reports 44% of work hours (not workers) are automatable

// ── IN-HOUSE COMPARISON ──

const CAIO_ANNUAL = 425_000; // Glassdoor 2026 midpoint ($350K-$500K)
const AI_ENGINEER_ANNUAL = 240_000; // Robert Half 2026 fully loaded
const PLAN_A_EQUIV_ENGINEERS = 2; // Minimal internal team for strategy
const PLAN_B_EQUIV_ENGINEERS = 25; // Midpoint of 20-30

// ── CLASSES ──

const PRIMARY_EMAIL = "mirza@10x.ai";
const LINKEDIN_PROFILE = "https://www.linkedin.com/in/mirzaasceric/";
const surfaceClass = "border border-[var(--line)] bg-[var(--surface)]";
const panelClass = `premium-panel ${surfaceClass} p-6`;
const cardClass = `premium-card ${surfaceClass} p-5`;
const sectionLabelClass =
  "inline-flex w-fit items-center bg-white px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]";
const sectionHeadingClass =
  "mt-4 max-w-[22ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl";
const primaryButtonClass =
  "inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2";
const metaChipClass =
  "inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]";
const inputClass =
  "mt-1 w-full border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,41,59,0.08)]";
const statExplainClass = "mt-1 text-[11px] leading-relaxed text-slate-400";

// ── INDUSTRY DATA ──

type IndustryKey =
  | "financial"
  | "saas"
  | "manufacturing"
  | "healthcare"
  | "logistics"
  | "ecommerce"
  | "other";

const INDUSTRIES: Record<
  IndustryKey,
  {
    label: string;
    knowledgeWorkerPct: number;
    fullyLoadedCost: number;
    addressableRevenueShare: number;
    revenueDriverLabel: string;
  }
> = {
  financial: {
    label: "Financial Services",
    knowledgeWorkerPct: 70,
    fullyLoadedCost: 180_000,
    addressableRevenueShare: 0.2,
    revenueDriverLabel: "origination, underwriting, servicing",
  },
  saas: {
    label: "SaaS / Software",
    knowledgeWorkerPct: 85,
    fullyLoadedCost: 170_000,
    addressableRevenueShare: 0.35,
    revenueDriverLabel: "product, sales, success, retention",
  },
  manufacturing: {
    label: "Manufacturing",
    knowledgeWorkerPct: 35,
    fullyLoadedCost: 130_000,
    addressableRevenueShare: 0.12,
    revenueDriverLabel: "forecasting, yield, pricing, planning",
  },
  healthcare: {
    label: "Healthcare",
    knowledgeWorkerPct: 45,
    fullyLoadedCost: 140_000,
    addressableRevenueShare: 0.1,
    revenueDriverLabel: "intake, scheduling, coding, retention",
  },
  logistics: {
    label: "Logistics / Transportation",
    knowledgeWorkerPct: 30,
    fullyLoadedCost: 120_000,
    addressableRevenueShare: 0.15,
    revenueDriverLabel: "routing, utilization, customer service",
  },
  ecommerce: {
    label: "E-commerce / Retail",
    knowledgeWorkerPct: 55,
    fullyLoadedCost: 140_000,
    addressableRevenueShare: 0.28,
    revenueDriverLabel: "conversion, merchandising, retention",
  },
  other: {
    label: "Other",
    knowledgeWorkerPct: 50,
    fullyLoadedCost: 150_000,
    addressableRevenueShare: 0.18,
    revenueDriverLabel: "commercial workflows and delivery",
  },
};

// ── SCENARIO DATA ──

type ScenarioId = "lower" | "mid" | "upper";

type Scenario = {
  label: string;
  sublabel: string;
  planAGain: number;
  planBGain: number;
  planARevenueLift: number;
  planBRevenueLift: number;
  source: string;
  sourceDetail: string;
};

const SCENARIOS: Record<ScenarioId, Scenario> = {
  lower: {
    label: "Lower range",
    sublabel: "Lowest documented gains",
    planAGain: 0.14,
    planBGain: 0.5,
    planARevenueLift: 0.01,
    planBRevenueLift: 0.02,
    source: "Stanford/MIT 2023",
    sourceDetail:
      "14% average productivity gain measured across 5,000 customer service agents at a Fortune 500 company over one year. Junior workers saw up to 35% improvement.",
  },
  mid: {
    label: "Mid range",
    sublabel: "Cross-study average",
    planAGain: 0.25,
    planBGain: 1.0,
    planARevenueLift: 0.02,
    planBRevenueLift: 0.035,
    source: "Harvard/BCG 2023 + St. Louis Fed 2025",
    sourceDetail:
      "25.1% speed improvement measured across 758 BCG consultants using GPT-4. Confirmed by St. Louis Fed meta-analysis averaging ~25% across multiple independent studies.",
  },
  upper: {
    label: "Upper range",
    sublabel: "Highest documented gains",
    planAGain: 0.4,
    planBGain: 1.5,
    planARevenueLift: 0.03,
    planBRevenueLift: 0.05,
    source: "Harvard/BCG 2023 (quality-adjusted) + GitHub Copilot 2023",
    sourceDetail:
      "40% higher quality results from the 758-consultant study. GitHub Copilot study showed 55.8% speed improvement for developers. Anthropic 2025 measured ~80% per-task speed-up.",
  },
};

// ── SOURCE LIBRARY ──

type Source = {
  name: string;
  detail: string;
  url: string;
  year: string;
};

const TIER1_SOURCES: Source[] = [
  {
    name: "Stanford/MIT — Generative AI Can Boost Productivity Without Replacing Workers",
    detail:
      "14% average productivity gain, 35% for junior workers. 5,000 customer service agents studied over one year at a Fortune 500 company.",
    url: "https://www.gsb.stanford.edu/insights/generative-ai-can-boost-productivity-without-replacing-workers",
    year: "2023",
  },
  {
    name: "Harvard/BCG — Navigating the Jagged Technological Frontier",
    detail:
      "758 BCG consultants: 12.2% more tasks completed, 25.1% faster, 40% higher quality output. Bottom-half performers saw 43% improvement.",
    url: "https://www.hbs.edu/faculty/Pages/item.aspx?num=64700",
    year: "2023",
  },
  {
    name: "GitHub — Quantifying Copilot's Impact on Developer Productivity",
    detail:
      "55.8% faster task completion. 81% of users report faster task completion. 87% report preserved mental effort on repetitive tasks.",
    url: "https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/",
    year: "2023",
  },
  {
    name: "Anthropic — Estimating Productivity Gains from AI",
    detail:
      "~80% speed-up per individual task. 12x faster for college-level skill tasks. Projected 1.0-1.8% annual US labor productivity growth increase.",
    url: "https://www.anthropic.com/research/estimating-productivity-gains",
    year: "2025",
  },
  {
    name: "BLS — Employer Costs for Employee Compensation (ECEC)",
    detail:
      "Total employer compensation: $46.15/hour average. Benefits = 29.8% of total compensation. Provides the methodology and multiplier for fully-loaded cost estimates; industry-specific figures are adjusted estimates.",
    url: "https://www.bls.gov/news.release/pdf/ecec.pdf",
    year: "Dec 2025",
  },
  {
    name: "Avasant/Computer Economics — IT Spending Benchmarks by Industry",
    detail:
      "IT spending as percentage of revenue by industry sector: Financial Services 6-10%, Manufacturing 2-4%, SaaS 8-12%, Healthcare 4-6%. Used for industry context, not directly in calculator formulas.",
    url: "https://avasant.com/report/it-spending-as-a-percentage-of-revenue-by-industry-company-size-and-region/",
    year: "2025",
  },
  {
    name: "McKinsey — State of AI 2025",
    detail:
      "88% of organizations use AI in at least one function. 27% of white-collar workers use AI daily. 33% have begun to scale AI programs.",
    url: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai",
    year: "2025",
  },
  {
    name: "McKinsey — AI-Powered Marketing and Sales Reach New Heights with Generative AI",
    detail:
      "Organizations investing in AI in marketing and sales are seeing 3-15% revenue uplift and 10-20% sales ROI uplift. Used to inform the calculator's revenue-leverage planning assumptions.",
    url: "https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/ai-powered-marketing-and-sales-reach-new-heights-with-generative-ai",
    year: "2023",
  },
  {
    name: "St. Louis Fed — Impact of Generative AI on Work Productivity",
    detail:
      "Meta-analysis of multiple studies: productivity gains range 10-55%, averaging approximately 25%. Workers self-report saving 5.4% of weekly hours.",
    url: "https://www.stlouisfed.org/on-the-economy/2025/feb/impact-generative-ai-work-productivity",
    year: "Feb 2025",
  },
  {
    name: "BCG — The Widening AI Value Gap",
    detail:
      "Top 5% of companies ('future-built') achieve 2.7x return on invested capital. ~2x revenue increases and ~1.4x greater cost reductions vs. laggards.",
    url: "https://www.bcg.com/publications/2025/are-you-generating-value-from-ai-the-widening-gap",
    year: "Sep 2025",
  },
  {
    name: "Glassdoor — Chief AI Officer Salaries",
    detail:
      "Average: $352,612/yr. 25th percentile: $264,459. 75th percentile: $493,657. Based on reported salary data.",
    url: "https://www.glassdoor.com/Salaries/chief-ai-officer-salary-SRCH_KO0,16.htm",
    year: "2026",
  },
  {
    name: "Robert Half — AI/ML Engineer Salary Data",
    detail:
      "Senior AI/ML engineers: $180K-$280K base. Fully loaded (benefits, overhead, tooling): $16,000-$24,000/month.",
    url: "https://www.roberthalf.com/us/en/job-details/aiml-engineer",
    year: "2026",
  },
];

const TIER2_SOURCES: Source[] = [
  {
    name: "PwC — 28th Annual Global CEO Survey",
    detail:
      "56% of CEOs report neither revenue nor cost benefits from AI investments.",
    url: "https://www.pwc.com/gx/en/issues/c-suite-insights/ceo-survey.html",
    year: "2026",
  },
  {
    name: "S&P Global — AI & Machine Learning Use Cases Survey",
    detail:
      "42% of enterprises scrapped AI initiatives, up from 17% the prior year. Survey of 1,006 IT and business professionals.",
    url: "https://www.spglobal.com/market-intelligence/en/news-insights/research/ai-experiences-rapid-adoption-but-with-mixed-outcomes-highlights-from-vote-ai-machine-learning",
    year: "2025",
  },
  {
    name: "Gartner — AI in Organizations Survey",
    detail:
      "48% of AI projects reach production. Generative AI is the most frequently deployed AI solution.",
    url: "https://www.gartner.com/en/newsroom/press-releases/2024-05-07-gartner-survey-finds-generative-ai-is-now-the-most-frequently-deployed-ai-solution-in-organizations",
    year: "2024",
  },
  {
    name: "BCG — AI at Work: Momentum Builds But Gaps Remain",
    detail:
      "51% of frontline workers stalled in AI adoption. 75%+ of leaders/managers use GenAI several times per week.",
    url: "https://www.bcg.com/publications/2025/ai-at-work-momentum-builds-but-gaps-remain",
    year: "2025",
  },
  {
    name: "Anthropic — Economic Index",
    detail:
      "49% of jobs have AI-augmentable tasks (up from 36% earlier in 2025). Software development captures 19% of total productivity gains.",
    url: "https://www.anthropic.com/research/economic-index-primitives",
    year: "2025",
  },
  {
    name: "McKinsey — Superagency in the Workplace",
    detail:
      "57% of US work hours automatable by current technology. 44% automatable by AI agents alone (non-physical tasks).",
    url: "https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/superagency-in-the-workplace-empowering-people-to-unlock-ais-full-potential-at-work",
    year: "Nov 2025",
  },
  {
    name: "McKinsey — The Economic Potential of Generative AI",
    detail:
      "60-70% of employee work time augmentable by GenAI. 25% of work time requires natural language understanding.",
    url: "https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier",
    year: "2023",
  },
  {
    name: "Deloitte — State of AI in the Enterprise",
    detail:
      "36% of digital initiative budgets allocated to AI. Survey of 3,235 enterprise leaders.",
    url: "https://www.deloitte.com/us/en/what-we-do/capabilities/applied-artificial-intelligence/content/state-of-ai-in-the-enterprise.html",
    year: "2026",
  },
  {
    name: "Gartner — Worldwide AI Spending Forecast",
    detail: "Global AI spending projected at $2.52 trillion in 2026, up 44% year-over-year.",
    url: "https://www.gartner.com/en/newsroom/press-releases/2026-1-15-gartner-says-worldwide-ai-spending-will-total-2-point-5-trillion-dollars-in-2026",
    year: "Jan 2026",
  },
  {
    name: "ISG — Enterprise AI Spending Study",
    detail:
      "Enterprise AI spending rose 5.7% in 2025 while overall IT budgets grew only 1.8%. AI accounts for ~30% of incremental IT budget growth.",
    url: "https://ir.isg-one.com/news-market-information/press-releases/news-details/2024/Enterprise-AI-Spending-to-Rise-5.7-Percent-in-2025-Despite-Overall-IT-Budget-Increase-of-Less-than-2-Percent-ISG-Study/default.aspx",
    year: "2025",
  },
  {
    name: "Menlo Ventures — State of GenAI in the Enterprise",
    detail:
      "Average organization spends ~$85,500/month on AI-native applications. 37% of enterprises spend >$250K/year on LLMs alone.",
    url: "https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/",
    year: "2025",
  },
  {
    name: "CloudZero — State of AI Costs",
    detail:
      "Mid-market firms budget $20K-$100K/year for AI. Enterprise AI costs rising 36% year-over-year.",
    url: "https://www.cloudzero.com/state-of-ai-costs/",
    year: "2025",
  },
  {
    name: "IBM — How Governance Increases Velocity",
    detail:
      "58% reduction in data clearance processing time via watsonx.governance. 1,000+ AI models governed.",
    url: "https://www.ibm.com/thought-leadership/institute-business-value/en-us/report/ai-governance-trends",
    year: "Dec 2025",
  },
  {
    name: "WEF — Why Effective AI Governance Is Becoming a Growth Strategy",
    detail:
      "One manufacturer went from 6-8 week approval cycles to same-day for low-risk AI tools — 400% increase in AI experimentation.",
    url: "https://www.weforum.org/stories/2026/01/why-effective-ai-governance-is-becoming-a-growth-strategy/",
    year: "Jan 2026",
  },
  {
    name: "Deloitte — The AI ROI Paradox",
    detail:
      "Rising investment alongside elusive returns. Analysis of why most AI investments fail to produce measurable business outcomes.",
    url: "https://www.deloitte.com/global/en/issues/generative-ai/ai-roi-the-paradox-of-rising-investment-and-elusive-returns.html",
    year: "2025",
  },
  {
    name: "California Management Review — ROI of AI Ethics and Governance",
    detail:
      "From loss aversion to value generation. Academic analysis of governance investment driving AI returns.",
    url: "https://cmr.berkeley.edu/2024/07/on-the-roi-of-ai-ethics-and-governance-investments-from-loss-aversion-to-value-generation/",
    year: "Jul 2024",
  },
  {
    name: "CSIMarket — Revenue Per Employee by Sector",
    detail:
      "Cross-sector RPE benchmarks. Financial Services: $450K+, Retail: ~$449K. Provides context for revenue-per-employee ratios by sector.",
    url: "https://csimarket.com/Industry/industry_Efficiency.php",
    year: "2025",
  },
  {
    name: "Damodaran / NYU Stern — Employee Metrics Dataset",
    detail:
      "Sector-level employee productivity and revenue-per-employee data across all major industries. Reference context, not directly used in calculator formulas.",
    url: "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/Employee.html",
    year: "2025",
  },
];

// ── TYPES ──

type Inputs = {
  revenue: string;
  employees: string;
  industry: IndustryKey;
  knowledgeWorkerPct: number;
  currentAiSpend: string;
};

type PlanResult = {
  affectedWorkers: number;
  gainPct: number;
  equivalentFTEs: number;
  addressableRevenueBase: number;
  revenueLiftPct: number;
  productivityValue: number;
  revenueValue: number;
  annualValue: number;
  annualCost: number;
  netValue: number;
  roi: number;
  monthsToPayback: number;
};

type Results = {
  revenue: number;
  revenuePerEmployee: number;
  knowledgeWorkers: number;
  fullyLoadedCost: number;
  industryLabel: string;
  revenueDriverLabel: string;
  addressableRevenueShare: number;
  leverageProfile: "high_revenue_leverage" | "workforce_scale";
  planA: PlanResult;
  planB: PlanResult;
  buildInHouseA: number;
  buildInHouseB: number;
  currentAiSpend: number;
};

// ── FORMATTING ──

function parseNum(v: string): number {
  return parseInt(v.replace(/[^0-9]/g, ""), 10) || 0;
}

function fmtInput(n: number): string {
  if (n === 0) return "";
  return n.toLocaleString("en-US");
}

function fmtCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000_000)
    return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function fmtPctPrecise(n: number): string {
  const pct = n * 100;
  if (Number.isInteger(pct)) return `${pct}%`;
  return `${pct.toFixed(1)}%`;
}

function fmtX(n: number): string {
  if (n >= 100) return `${Math.round(n)}x`;
  return `${n.toFixed(1)}x`;
}

// ── CALCULATIONS ──

function calculate(
  inputs: Inputs,
  scenario: ScenarioId,
): Results {
  const revenue = parseNum(inputs.revenue);
  const employees = parseNum(inputs.employees);
  const ind = INDUSTRIES[inputs.industry];
  const kwPct = inputs.knowledgeWorkerPct / 100;
  const sc = SCENARIOS[scenario];

  const knowledgeWorkers = Math.round(employees * kwPct);
  const fullyLoadedCost = ind.fullyLoadedCost;
  const revenuePerEmployee = employees > 0 ? revenue / employees : 0;
  const leverageProfile =
    employees <= 150 && revenuePerEmployee >= 300_000
      ? "high_revenue_leverage"
      : "workforce_scale";

  function planCalc(
    reach: number,
    gain: number,
    revenueLiftPct: number,
    annualCost: number,
  ): PlanResult {
    const affected = Math.round(knowledgeWorkers * reach);
    const ftes = affected * gain;
    const productivityValue = ftes * fullyLoadedCost;
    const addressableRevenueBase = revenue * ind.addressableRevenueShare;
    const revenueValue = addressableRevenueBase * revenueLiftPct;
    const value = productivityValue + revenueValue;
    const net = value - annualCost;
    const roi = annualCost > 0 ? value / annualCost : 0;
    const months = value > 0 ? Math.ceil((annualCost / value) * 12) : 99;
    return {
      affectedWorkers: affected,
      gainPct: gain,
      equivalentFTEs: ftes,
      addressableRevenueBase,
      revenueLiftPct,
      productivityValue,
      revenueValue,
      annualValue: value,
      annualCost,
      netValue: net,
      roi,
      monthsToPayback: months,
    };
  }

  const buildInHouseA = CAIO_ANNUAL + PLAN_A_EQUIV_ENGINEERS * AI_ENGINEER_ANNUAL;
  const buildInHouseB = CAIO_ANNUAL + PLAN_B_EQUIV_ENGINEERS * AI_ENGINEER_ANNUAL;

  return {
    revenue,
    revenuePerEmployee,
    knowledgeWorkers,
    fullyLoadedCost,
    industryLabel: ind.label,
    revenueDriverLabel: ind.revenueDriverLabel,
    addressableRevenueShare: ind.addressableRevenueShare,
    leverageProfile,
    planA: planCalc(
      PLAN_A_REACH,
      sc.planAGain,
      sc.planARevenueLift,
      PLAN_A_ANNUAL,
    ),
    planB: planCalc(
      PLAN_B_REACH,
      sc.planBGain,
      sc.planBRevenueLift,
      PLAN_B_ANNUAL,
    ),
    buildInHouseA,
    buildInHouseB,
    currentAiSpend: parseNum(inputs.currentAiSpend),
  };
}

// ── INTERPRETATION ──

function getPlanInterpretation(
  label: string,
  r: PlanResult,
): { verdict: string; detail: string } {
  let verdict: string;
  let detail: string;

  if (r.roi > 10) {
    verdict = `Exceptional fit for ${label}`;
    detail = `At ${fmtX(r.roi)} ROI, the investment is a small fraction of the value created. Even if actual results come in at half of these projections, the return remains strongly positive. The investment would pay for itself in approximately ${r.monthsToPayback} month${r.monthsToPayback === 1 ? "" : "s"}.`;
  } else if (r.roi > 5) {
    verdict = `Strong fit for ${label}`;
    detail = `At ${fmtX(r.roi)} ROI, the investment would pay for itself within the first ${r.monthsToPayback} months based on productivity gains alone. This is well above the threshold most organizations use to justify technology investments.`;
  } else if (r.roi > 3) {
    verdict = `Good fit for ${label}`;
    detail = `At ${fmtX(r.roi)} ROI, returns are clearly positive. The investment would pay for itself in approximately ${r.monthsToPayback} months. We recommend starting with the complimentary AI Portfolio Reality Scan to identify your highest-impact opportunities.`;
  } else if (r.roi > 1.5) {
    verdict = "Positive but modest at this scale";
    detail = `At ${fmtX(r.roi)} ROI, returns are positive but depend heavily on execution quality. A targeted approach focused on your highest-value workflows would be important. The free scan can identify where those opportunities are.`;
  } else if (r.roi > 1) {
    verdict = "Marginal at current scale";
    detail = `At ${fmtX(r.roi)} ROI, the investment breaks even but doesn't create significant surplus value at your current company size. We recommend the complimentary AI Portfolio Reality Scan (valued at $15,000) to assess whether a more targeted approach would deliver better results.`;
  } else {
    verdict = "Not recommended at this scale";
    detail = `At ${fmtX(r.roi)} ROI, the standard engagement does not show positive returns for your current company profile. This is not a fit issue — it's a scale issue. As your organization grows, the math changes significantly. We recommend the free scan to identify targeted quick wins.`;
  }

  return { verdict, detail };
}

// ── EXPANDABLE SECTION ──

function Expandable({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--line)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-slate-900 transition-colors hover:text-[var(--accent)]"
      >
        {title}
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
      {open ? <div className="pb-5">{children}</div> : null}
    </div>
  );
}

// ── SOURCE LIST ──

function SourceList({
  title,
  sources,
  accent,
}: {
  title: string;
  sources: Source[];
  accent?: boolean;
}) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-3">
        <p
          className={`font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] ${accent ? "bg-[var(--accent)] text-white px-2.5 py-1" : "text-[var(--muted)]"}`}
        >
          {title}
        </p>
        <span className={metaChipClass}>{sources.length}</span>
      </div>
      <ol className="mt-4 space-y-2">
        {sources.map((s, i) => (
          <li key={s.url} className="group relative text-sm leading-relaxed">
            <span className="font-['IBM_Plex_Mono'] text-[11px] text-[var(--muted)]">{i + 1}.</span>{" "}
            <span className="font-medium text-slate-950">{s.name}</span>{" "}
            <span className="text-[11px] text-slate-400">({s.year})</span>
            <br />
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={s.detail}
              className="break-all font-['IBM_Plex_Mono'] text-[11px] text-[var(--accent)] underline decoration-slate-300 underline-offset-2 hover:decoration-[var(--accent)]"
            >
              {s.url}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── APP ──

export default function RoiCalculatorApp() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [inputs, setInputs] = useState<Inputs>({
    revenue: "",
    employees: "",
    industry: "saas",
    knowledgeWorkerPct: INDUSTRIES.saas.knowledgeWorkerPct,
    currentAiSpend: "",
  });
  const [scenario, setScenario] = useState<ScenarioId>("mid");
  const [results, setResults] = useState<Results | null>(null);

  function updateField(field: keyof Inputs, value: string | number) {
    setInputs((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "industry") {
        next.knowledgeWorkerPct =
          INDUSTRIES[value as IndustryKey].knowledgeWorkerPct;
      }
      return next;
    });
  }

  function handleScenarioChange(s: ScenarioId) {
    setScenario(s);
  }

  function handleCalculate() {
    const r = calculate(inputs, scenario);
    setResults(r);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }

  const sc = SCENARIOS[scenario];
  const canSubmit = parseNum(inputs.revenue) > 0 && parseNum(inputs.employees) > 0;

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0))]" />
      <WarpedGrid />

      <main className="relative mx-auto w-full max-w-[1240px] px-6 pb-20 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        {/* ── Header ── */}
        <div className="sticky top-0 z-50 -mx-6 px-6 py-4 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
          <SiteHeader
            applyHref="/#scan"
            founderLinkedIn={LINKEDIN_PROFILE}
            homeHref="/"
            whatWeDoHref="/how-we-work/"
          />
        </div>

        {/* ── Hero ── */}
        <section className="reveal py-14 sm:py-16">
          <p className={sectionLabelClass}>AI ROI CALCULATOR</p>
          <h1 className="mt-6 max-w-[18ch] text-4xl font-semibold leading-[1.01] tracking-[-0.04em] [text-wrap:balance] sm:text-5xl lg:text-[4rem]">
            What the research says about AI ROI at your company size.
          </h1>
          <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-slate-700">
            Every calculation combines published productivity research with
            transparent commercial-planning assumptions. Full methodology and
            all {TIER1_SOURCES.length + TIER2_SOURCES.length} sources are listed
            below.
          </p>
        </section>

        {/* ── Calculator Form ── */}
        <section className="reveal section-divider-full py-14 sm:py-16">
          <div>
            <div className="grid gap-8 lg:grid-cols-12">
              {/* ── Inputs ── */}
              <div className={`lg:col-span-7 ${panelClass}`}>
                <p className={sectionLabelClass}>YOUR COMPANY</p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-800">
                    Annual revenue
                    <input
                      className={inputClass}
                      value={inputs.revenue ? `$${fmtInput(parseNum(inputs.revenue))}` : ""}
                      onChange={(e) =>
                        updateField("revenue", e.target.value.replace(/[^0-9]/g, ""))
                      }
                      placeholder="$250,000,000"
                      inputMode="numeric"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-800">
                    Number of employees
                    <input
                      className={inputClass}
                      value={inputs.employees ? fmtInput(parseNum(inputs.employees)) : ""}
                      onChange={(e) =>
                        updateField("employees", e.target.value.replace(/[^0-9]/g, ""))
                      }
                      placeholder="800"
                      inputMode="numeric"
                    />
                  </label>
                </div>

                <label className="mt-5 block text-sm font-medium text-slate-800">
                  Industry
                  <select
                    className={`${inputClass} cursor-pointer`}
                    value={inputs.industry}
                    onChange={(e) =>
                      updateField("industry", e.target.value)
                    }
                  >
                    {(
                      Object.entries(INDUSTRIES) as [IndustryKey, (typeof INDUSTRIES)[IndustryKey]][]
                    ).map(([key, ind]) => (
                      <option key={key} value={key}>
                        {ind.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-5 block text-sm font-medium text-slate-800">
                  Knowledge workers (% of employees)
                  <div className="mt-2 flex items-center gap-4">
                    <input
                      type="range"
                      min={10}
                      max={95}
                      step={5}
                      value={inputs.knowledgeWorkerPct}
                      onChange={(e) =>
                        updateField("knowledgeWorkerPct", Number(e.target.value))
                      }
                      className="flex-1"
                    />
                    <span className="w-12 font-['IBM_Plex_Mono'] text-sm font-medium text-slate-950">
                      {inputs.knowledgeWorkerPct}%
                    </span>
                  </div>
                  <p className={statExplainClass}>
                    Pre-filled using our default planning estimate for{" "}
                    {INDUSTRIES[inputs.industry].label}. Adjust if you know
                    your ratio.
                  </p>
                </label>

                <label className="mt-5 block text-sm font-medium text-slate-800">
                  Current annual AI spend{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                  <input
                    className={inputClass}
                    value={
                      inputs.currentAiSpend
                        ? `$${fmtInput(parseNum(inputs.currentAiSpend))}`
                        : ""
                    }
                    onChange={(e) =>
                      updateField(
                        "currentAiSpend",
                        e.target.value.replace(/[^0-9]/g, ""),
                      )
                    }
                    placeholder="$200,000"
                    inputMode="numeric"
                  />
                </label>

                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleCalculate}
                  className={`mt-8 w-full justify-center ${canSubmit ? primaryButtonClass : "inline-flex cursor-not-allowed items-center justify-center border border-[var(--line)] bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-400"}`}
                >
                  {results ? "Recalculate ROI" : "Calculate ROI"}
                </button>
              </div>

              {/* ── Scenario Selector ── */}
              <div className={`lg:col-span-5 ${panelClass} flex flex-col`}>
                <p className={sectionLabelClass}>RESEARCH SCENARIO</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Choose which documented research results to use for
                  productivity gain estimates. Revenue-leverage estimates stay
                  conservative and are shown separately from labor savings.
                </p>

                <div className="mt-6 space-y-3">
                  {(
                    Object.entries(SCENARIOS) as [ScenarioId, Scenario][]
                  ).map(([id, s]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleScenarioChange(id)}
                      className={`w-full text-left ${cardClass} transition-[border-color,box-shadow] duration-200 ${
                        scenario === id
                          ? "border-[var(--accent)] shadow-[var(--shadow-panel)]"
                          : "hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-950">
                          {s.label}
                        </p>
                        {id === "mid" && (
                          <span className="bg-[var(--accent)] px-2 py-0.5 font-['IBM_Plex_Mono'] text-[9px] font-medium uppercase tracking-[0.14em] text-white">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-['IBM_Plex_Mono'] text-[11px] text-[var(--muted)]">
                        {s.sublabel}
                      </p>
                      <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                        {s.sourceDetail}
                      </p>
                    </button>
                  ))}
                </div>

                <p className="mt-auto pt-5 text-[11px] leading-relaxed text-slate-400">
                  Productivity gains are applied per affected knowledge worker,
                  not across the entire company. Reach percentages (25% for
                  training, 40% for custom systems) are planning estimates
                  informed by BCG and McKinsey adoption data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Results ── */}
        {results ? (
          <section
            ref={resultsRef}
            className="reveal section-divider-full py-14 sm:py-16"
          >
            <p className={sectionLabelClass}>YOUR RESULTS</p>
            <h2 className={sectionHeadingClass}>
              Based on {sc.label.toLowerCase()} research data.
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Source: {sc.source}
            </p>
            {results.revenue > 0 && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                <span>Plan A cost as % of revenue: <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">{((PLAN_A_ANNUAL / results.revenue) * 100).toFixed(2)}%</span></span>
                <span>Plan B cost as % of revenue: <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">{((PLAN_B_ANNUAL / results.revenue) * 100).toFixed(2)}%</span></span>
                <span>Revenue per employee: <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">{fmtCurrency(results.revenuePerEmployee)}</span></span>
              </div>
            )}
            <div className={`mt-6 ${cardClass} ${results.leverageProfile === "high_revenue_leverage" ? "border-[var(--accent)] bg-[rgba(244,247,251,0.9)]" : ""}`}>
              <p className="text-sm leading-relaxed text-slate-700">
                {results.leverageProfile === "high_revenue_leverage"
                  ? `This company looks like a high-revenue-leverage profile: fewer people, high revenue per employee, and more upside from faster shipping, commercial execution, and avoided bottlenecks than from payroll savings alone.`
                  : `This company looks like a workforce-scale profile: labor leverage still matters most, but the model also includes a conservative revenue-leverage layer where AI can influence commercial output.`}
              </p>
            </div>

            {/* ── Current AI spend context ── */}
            {results.currentAiSpend > 0 && (
              <div className={`mt-8 ${cardClass} border-amber-200 bg-amber-50`}>
                <p className="text-sm leading-relaxed text-slate-700">
                  You're currently spending{" "}
                  <span className="font-semibold text-slate-950">
                    {fmtCurrency(results.currentAiSpend)}/year
                  </span>{" "}
                  on AI. 56% of companies at this stage report neither revenue
                  nor cost benefits from these investments (PwC 2026). A
                  structured approach could make that existing spend productive.
                </p>
              </div>
            )}

            {/* ── Plan comparison cards ── */}
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {/* Plan A */}
              {(() => {
                const r = results.planA;
                const interp = getPlanInterpretation(
                  "COMMAND ROOM",
                  r,
                );
                return (
                  <div
                    className={`flex flex-col ${panelClass} ${r.roi >= 1 ? "border-[var(--accent)]" : "border-rose-300"}`}
                  >
                    <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                      COMMAND ROOM — $22,000/mo
                    </p>
                    <p className="mt-4 font-['IBM_Plex_Mono'] text-4xl font-semibold text-slate-950">
                      {fmtX(r.roi)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      combined return on investment
                    </p>

                    <div className="mt-6 space-y-4 border-t border-[var(--line)] pt-5">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Knowledge workers
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {results.knowledgeWorkers.toLocaleString()}
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          {inputs.knowledgeWorkerPct}% of your{" "}
                          {parseNum(inputs.employees).toLocaleString()}{" "}
                          employees, based on our default planning estimate for{" "}
                          {results.industryLabel}
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Workers affected
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {r.affectedWorkers.toLocaleString()}
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          Planning estimate: ~25% of knowledge workers
                          effectively adopt AI tools with structured training
                          (BCG 2025 reports 16-33% actual usage range)
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Productivity gain per worker
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {fmtPct(r.gainPct)}
                          </span>
                        </div>
                        <p className={statExplainClass}>{sc.sourceDetail}</p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Equivalent output added
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {r.equivalentFTEs.toFixed(1)} FTEs
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          {r.affectedWorkers} workers x {fmtPct(r.gainPct)}{" "}
                          gain = equivalent to {r.equivalentFTEs.toFixed(1)}{" "}
                          additional full-time employees
                        </p>
                      </div>

                      <div className="border-t border-dashed border-[var(--line)] pt-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Productivity value
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {fmtCurrency(r.productivityValue)}
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          {r.equivalentFTEs.toFixed(1)} FTEs x{" "}
                          {fmtCurrency(results.fullyLoadedCost)} fully-loaded
                          cost per {results.industryLabel} knowledge worker (BLS
                          2025)
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Revenue leverage value
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {fmtCurrency(r.revenueValue)}
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          {fmtCurrency(r.addressableRevenueBase)} AI-addressable
                          revenue base x {fmtPctPrecise(r.revenueLiftPct)}{" "}
                          planning lift across {results.revenueDriverLabel}
                        </p>
                      </div>

                      <div className="border-t border-dashed border-[var(--line)] pt-4">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-950">
                            Total annual value
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-[var(--accent)]">
                            {fmtCurrency(r.annualValue)}
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          Productivity value + revenue leverage value. Combined
                          value is what drives ROI and payback.
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Your investment
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {fmtCurrency(r.annualCost)}/yr
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-950">
                            Net return
                          </span>
                          <span
                            className={`font-['IBM_Plex_Mono'] font-semibold ${r.netValue >= 0 ? "text-[var(--accent)]" : "text-rose-600"}`}
                          >
                            {fmtCurrency(r.netValue)}/yr
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Interpretation */}
                    <div className="mt-6 border-t border-[var(--line)] pt-5">
                      <p
                        className={`font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] ${r.roi >= 3 ? "text-[var(--accent)]" : r.roi >= 1 ? "text-amber-600" : "text-rose-600"}`}
                      >
                        {interp.verdict}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {interp.detail}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Plan B */}
              {(() => {
                const r = results.planB;
                const interp = getPlanInterpretation(
                  "10X EMPIRE",
                  r,
                );
                return (
                  <div
                    className={`flex flex-col ${panelClass} ${r.roi >= 1 ? "border-[var(--line)]" : "border-rose-300"}`}
                  >
                    <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                      10X EMPIRE — $290,000/mo
                    </p>
                    <p className="mt-4 font-['IBM_Plex_Mono'] text-4xl font-semibold text-slate-950">
                      {fmtX(r.roi)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      combined return on investment
                    </p>

                    <div className="mt-6 space-y-4 border-t border-[var(--line)] pt-5">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Knowledge workers
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {results.knowledgeWorkers.toLocaleString()}
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          Same knowledge worker base as above
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Workers affected
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {r.affectedWorkers.toLocaleString()}
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          Planning estimate: ~40% of knowledge workers
                          affected by custom-built AI systems (McKinsey 2025
                          reports 44% of work hours automatable by AI agents)
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Productivity gain per worker
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {fmtPct(r.gainPct)}{" "}
                            <span className="text-[11px] text-slate-400">
                              ({(1 + r.gainPct).toFixed(1)}x)
                            </span>
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          Custom-built AI systems deliver deeper gains than
                          off-the-shelf tools. GitHub Copilot (off-the-shelf)
                          shows 55% for developers. Purpose-built workflows
                          exceed this. Anthropic 2025 measured ~80% per-task
                          speed-ups.
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Equivalent output added
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {r.equivalentFTEs.toFixed(1)} FTEs
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          {r.affectedWorkers} workers x {fmtPct(r.gainPct)}{" "}
                          gain = equivalent to {r.equivalentFTEs.toFixed(1)}{" "}
                          additional full-time employees
                        </p>
                      </div>

                      <div className="border-t border-dashed border-[var(--line)] pt-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Productivity value
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {fmtCurrency(r.productivityValue)}
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          {r.equivalentFTEs.toFixed(1)} FTEs x{" "}
                          {fmtCurrency(results.fullyLoadedCost)} fully-loaded
                          cost (BLS 2025)
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Revenue leverage value
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {fmtCurrency(r.revenueValue)}
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          {fmtCurrency(r.addressableRevenueBase)} AI-addressable
                          revenue base x {fmtPctPrecise(r.revenueLiftPct)}{" "}
                          planning lift across {results.revenueDriverLabel}
                        </p>
                      </div>

                      <div className="border-t border-dashed border-[var(--line)] pt-4">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-950">
                            Total annual value
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-[var(--accent)]">
                            {fmtCurrency(r.annualValue)}
                          </span>
                        </div>
                        <p className={statExplainClass}>
                          Productivity value + revenue leverage value. Combined
                          value is what drives ROI and payback.
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Your investment
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                            {fmtCurrency(r.annualCost)}/yr
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-950">
                            Net return
                          </span>
                          <span
                            className={`font-['IBM_Plex_Mono'] font-semibold ${r.netValue >= 0 ? "text-[var(--accent)]" : "text-rose-600"}`}
                          >
                            {fmtCurrency(r.netValue)}/yr
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Interpretation */}
                    <div className="mt-6 border-t border-[var(--line)] pt-5">
                      <p
                        className={`font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] ${r.roi >= 3 ? "text-[var(--accent)]" : r.roi >= 1 ? "text-amber-600" : "text-rose-600"}`}
                      >
                        {interp.verdict}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {interp.detail}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── All 3 scenarios comparison ── */}
            {(() => {
              const scenarioIds: ScenarioId[] = ["lower", "mid", "upper"];
              const all = scenarioIds.map((id) => ({
                id,
                sc: SCENARIOS[id],
                planA: calculate(inputs, id).planA,
                planB: calculate(inputs, id).planB,
              }));
              return (
                <div className={`mt-8 ${panelClass}`}>
                  <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                    ROI ACROSS ALL THREE RESEARCH SCENARIOS
                  </p>

                  {/* Plan A row */}
                  <div className="mt-5 border-t border-[var(--line)] pt-4">
                    <p className="text-sm font-semibold text-slate-950">COMMAND ROOM — $22,000/mo</p>
                    <div className="mt-3 grid grid-cols-4 gap-3 text-center">
                      <div />
                      {all.map(({ id, sc: s }) => (
                        <div key={id} className={`font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.1em] ${id === "mid" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                          {s.label}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-3 text-sm">
                      <div className="text-slate-600">Gain / worker</div>
                      {all.map(({ id, planA }) => (
                        <div key={id} className={`text-center font-['IBM_Plex_Mono'] font-medium ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}>{fmtPct(planA.gainPct)}</div>
                      ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-3 text-sm">
                      <div className="text-slate-600">Productivity</div>
                      {all.map(({ id, planA }) => (
                        <div key={id} className={`text-center font-['IBM_Plex_Mono'] font-medium ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}>{fmtCurrency(planA.productivityValue)}</div>
                      ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-3 text-sm">
                      <div className="text-slate-600">Revenue</div>
                      {all.map(({ id, planA }) => (
                        <div key={id} className={`text-center font-['IBM_Plex_Mono'] font-medium ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}>{fmtCurrency(planA.revenueValue)}</div>
                      ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-3 text-sm">
                      <div className="text-slate-600">Total value</div>
                      {all.map(({ id, planA }) => (
                        <div key={id} className={`text-center font-['IBM_Plex_Mono'] font-medium ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}>{fmtCurrency(planA.annualValue)}</div>
                      ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-3 border-t border-dashed border-[var(--line)] pt-1.5 text-sm">
                      <div className="font-medium text-slate-950">ROI</div>
                      {all.map(({ id, planA }) => (
                        <div key={id} className={`text-center font-['IBM_Plex_Mono'] font-semibold ${id === "mid" ? "text-lg text-[var(--accent)]" : "text-slate-600"}`}>{fmtX(planA.roi)}</div>
                      ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-3 text-sm">
                      <div className="text-slate-600">Net return</div>
                      {all.map(({ id, planA }) => (
                        <div key={id} className={`text-center font-['IBM_Plex_Mono'] font-medium ${planA.netValue >= 0 ? (id === "mid" ? "text-[var(--accent)]" : "text-slate-500") : "text-rose-600"}`}>{fmtCurrency(planA.netValue)}/yr</div>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-3 text-[11px] text-slate-400">
                      <div>Source</div>
                      {all.map(({ id, sc: s }) => (
                        <div key={id} className="text-center">{s.source}</div>
                      ))}
                    </div>
                  </div>

                  {/* Plan B row */}
                  <div className="mt-6 border-t border-[var(--line)] pt-4">
                    <p className="text-sm font-semibold text-slate-950">10X EMPIRE — $290,000/mo</p>
                    <div className="mt-3 grid grid-cols-4 gap-3 text-center">
                      <div />
                      {all.map(({ id, sc: s }) => (
                        <div key={id} className={`font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.1em] ${id === "mid" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                          {s.label}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-3 text-sm">
                      <div className="text-slate-600">Gain / worker</div>
                      {all.map(({ id, planB }) => (
                        <div key={id} className={`text-center font-['IBM_Plex_Mono'] font-medium ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}>{fmtPct(planB.gainPct)} <span className="text-[10px] text-slate-400">({(1 + planB.gainPct).toFixed(1)}x)</span></div>
                      ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-3 text-sm">
                      <div className="text-slate-600">Productivity</div>
                      {all.map(({ id, planB }) => (
                        <div key={id} className={`text-center font-['IBM_Plex_Mono'] font-medium ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}>{fmtCurrency(planB.productivityValue)}</div>
                      ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-3 text-sm">
                      <div className="text-slate-600">Revenue</div>
                      {all.map(({ id, planB }) => (
                        <div key={id} className={`text-center font-['IBM_Plex_Mono'] font-medium ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}>{fmtCurrency(planB.revenueValue)}</div>
                      ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-3 text-sm">
                      <div className="text-slate-600">Total value</div>
                      {all.map(({ id, planB }) => (
                        <div key={id} className={`text-center font-['IBM_Plex_Mono'] font-medium ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}>{fmtCurrency(planB.annualValue)}</div>
                      ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-3 border-t border-dashed border-[var(--line)] pt-1.5 text-sm">
                      <div className="font-medium text-slate-950">ROI</div>
                      {all.map(({ id, planB }) => (
                        <div key={id} className={`text-center font-['IBM_Plex_Mono'] font-semibold ${id === "mid" ? "text-lg text-[var(--accent)]" : planB.roi >= 1 ? "text-slate-600" : "text-rose-600"}`}>{fmtX(planB.roi)}</div>
                      ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-3 text-sm">
                      <div className="text-slate-600">Net return</div>
                      {all.map(({ id, planB }) => (
                        <div key={id} className={`text-center font-['IBM_Plex_Mono'] font-medium ${planB.netValue >= 0 ? (id === "mid" ? "text-[var(--accent)]" : "text-slate-500") : "text-rose-600"}`}>{fmtCurrency(planB.netValue)}/yr</div>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-3 text-[11px] text-slate-400">
                      <div>Source</div>
                      {all.map(({ id, sc: s }) => (
                        <div key={id} className="text-center">{s.source}</div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Alternatives comparison ── */}
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className={cardClass}>
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  ALTERNATIVE: DO NOTHING
                </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700">
                      Value created
                      </span>
                      <span className="font-['IBM_Plex_Mono'] font-medium text-slate-400">
                        $0
                      </span>
                  </div>
                  {results.currentAiSpend > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700">
                        Current AI spend (no measurable ROI)
                      </span>
                      <span className="font-['IBM_Plex_Mono'] font-medium text-rose-500">
                        -{fmtCurrency(results.currentAiSpend)}/yr
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">Opportunity cost</span>
                    <span className="font-['IBM_Plex_Mono'] font-medium text-rose-500">
                      {fmtCurrency(results.planA.annualValue)}/yr missed
                    </span>
                  </div>
                </div>
                <p className={`mt-3 ${statExplainClass}`}>
                  Companies that delay structured AI implementation fall further
                  behind each quarter. BCG 2025 shows top performers achieving
                  materially stronger returns on invested capital than laggards.
                </p>
              </div>

              <div className={cardClass}>
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  ALTERNATIVE: BUILD IN-HOUSE
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">
                      Chief AI Officer hire
                    </span>
                    <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                      {fmtCurrency(CAIO_ANNUAL)}/yr
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">
                      AI engineers ({PLAN_B_EQUIV_ENGINEERS} people)
                    </span>
                    <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                      {fmtCurrency(PLAN_B_EQUIV_ENGINEERS * AI_ENGINEER_ANNUAL)}
                      /yr
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-dashed border-[var(--line)] pt-2">
                    <span className="font-medium text-slate-950">
                      Total (comparable to 10X EMPIRE)
                    </span>
                    <span className="font-['IBM_Plex_Mono'] font-semibold text-slate-950">
                      {fmtCurrency(results.buildInHouseB)}/yr
                    </span>
                  </div>
                </div>
                <p className={`mt-3 ${statExplainClass}`}>
                  Plus 6-12 months hiring time before any output. Salary data
                  from Glassdoor 2026 (CAIO) and Robert Half 2026 (AI/ML
                  engineers), fully loaded with benefits and overhead.
                </p>
              </div>
            </div>

            {/* ── Methodology ── */}
            <div className="mt-10">
              <Expandable title="How we calculated this — full methodology">
                <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                  <div>
                    <p className="font-medium text-slate-950">
                      Step 1: Knowledge workers
                    </p>
                    <p>
                      {parseNum(inputs.employees).toLocaleString()} employees x{" "}
                      {inputs.knowledgeWorkerPct}% ={" "}
                      {results.knowledgeWorkers.toLocaleString()} knowledge
                      workers
                    </p>
                    <p className={statExplainClass}>
                      Knowledge worker percentage based on our default planning
                      estimate for {results.industryLabel}. Adjust the slider if
                      you know your actual mix.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-slate-950">
                      Step 2: Workers affected
                    </p>
                    <p>
                      Plan A: {results.knowledgeWorkers.toLocaleString()} x 25%
                      = {results.planA.affectedWorkers} workers
                    </p>
                    <p>
                      Plan B: {results.knowledgeWorkers.toLocaleString()} x 40%
                      = {results.planB.affectedWorkers} workers
                    </p>
                    <p className={statExplainClass}>
                      25% reach is a planning estimate based on BCG 2025
                      adoption data (16-33% actual usage range). 40% reach is a
                      planning estimate; McKinsey 2025 reports 44% of work
                      hours (not workers) are automatable by AI agents.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-slate-950">
                      Step 3: Productivity gain per worker
                    </p>
                    <p>
                      Plan A: {fmtPct(results.planA.gainPct)} per affected
                      worker ({sc.source})
                    </p>
                    <p>
                      Plan B: {fmtPct(results.planB.gainPct)} per affected
                      worker (custom-built systems deliver deeper gains;
                      extrapolated from Copilot 55%, Anthropic ~80% per task)
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-slate-950">
                      Step 4: Equivalent FTEs added
                    </p>
                    <p>
                      Plan A: {results.planA.affectedWorkers} x{" "}
                      {fmtPct(results.planA.gainPct)} ={" "}
                      {results.planA.equivalentFTEs.toFixed(1)} FTEs
                    </p>
                    <p>
                      Plan B: {results.planB.affectedWorkers} x{" "}
                      {fmtPct(results.planB.gainPct)} ={" "}
                      {results.planB.equivalentFTEs.toFixed(1)} FTEs
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-slate-950">
                      Step 5: Productivity value
                    </p>
                    <p>
                      Equivalent FTEs x {fmtCurrency(results.fullyLoadedCost)}{" "}
                      fully-loaded cost per {results.industryLabel} knowledge
                      worker
                    </p>
                    <p className={statExplainClass}>
                      Fully-loaded cost includes salary, benefits (29.8% per
                      BLS), payroll taxes, equipment, and overhead.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-slate-950">
                      Step 6: Revenue leverage value
                    </p>
                    <p>
                      AI-addressable revenue base x planning revenue lift
                    </p>
                    <p>
                      Plan A: {fmtCurrency(results.planA.addressableRevenueBase)} x{" "}
                      {fmtPctPrecise(results.planA.revenueLiftPct)} ={" "}
                      {fmtCurrency(results.planA.revenueValue)}
                    </p>
                    <p>
                      Plan B: {fmtCurrency(results.planB.addressableRevenueBase)} x{" "}
                      {fmtPctPrecise(results.planB.revenueLiftPct)} ={" "}
                      {fmtCurrency(results.planB.revenueValue)}
                    </p>
                    <p className={statExplainClass}>
                      Revenue-leverage assumptions are conservative planning
                      estimates informed by McKinsey's commercial AI research and
                      applied only to the share of revenue most likely to be
                      influenced within 12 months.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-slate-950">
                      Step 7: Total ROI
                    </p>
                    <p>
                      (Productivity value + revenue leverage value) / annual plan
                      cost ={" "}
                      {fmtX(results.planA.roi)} (Plan A) /{" "}
                      {fmtX(results.planB.roi)} (Plan B)
                    </p>
                  </div>
                </div>
              </Expandable>
            </div>
          </section>
        ) : null}

        {/* ── Source Library ── */}
        <section className="reveal section-divider-full py-14 sm:py-16">
          <p className={sectionLabelClass}>RESEARCH & SOURCES</p>
          <h2 className={sectionHeadingClass}>
            Every number traces to a published study.
          </h2>
          <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-slate-700">
            {TIER1_SOURCES.length + TIER2_SOURCES.length} sources from Harvard,
            Stanford, MIT, BCG, McKinsey, Anthropic, Gartner, Deloitte, PwC, and
            more. All publicly available.
          </p>

          <SourceList
            title="Sources powering the calculator"
            sources={TIER1_SOURCES}
            accent
          />
          <SourceList
            title="Supporting research & context"
            sources={TIER2_SOURCES}
          />
        </section>

        {/* ── Disclaimer ── */}
        <section className="reveal section-divider-full py-10">
          <div className={`${cardClass} border-slate-200 bg-slate-50`}>
            <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              IMPORTANT DISCLAIMER
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              All calculations use publicly available research data from
              credible, peer-reviewed, or industry-published sources. The
              results are estimates based on industry averages and documented
              study outcomes. Actual results depend on organizational readiness,
              implementation quality, workforce composition, and other
              company-specific factors. These projections are not guarantees of
              future performance. We recommend the complimentary AI Portfolio
              Reality Scan for company-specific analysis.
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              Last updated: March 2026. Sources are refreshed quarterly.
            </p>
          </div>
        </section>

        {/* ── CTA + Waitlist ── */}
        <section className="reveal py-14 sm:py-16">
          <div className="space-y-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className={sectionLabelClass}>NEXT STEP</p>
              <h2 className="mt-4 text-2xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-3xl">
                These are estimates. Want your exact numbers?
              </h2>
              <p className="mx-auto mt-5 max-w-[48ch] text-base leading-relaxed text-slate-600">
                The complimentary AI Portfolio Reality Scan analyzes your
                specific company, workflows, and team to identify where AI will
                create the most value. Valued at $15,000. Free for waitlist
                members.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className={metaChipClass}>2-minute form</span>
                <span className={metaChipClass}>
                  Complimentary scan (valued at $15,000) + 40-min call
                </span>
                <span className={metaChipClass}>Results in ~1 week</span>
              </div>
            </div>

            <WaitlistForm />
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="reveal mt-4 flex flex-col gap-4 border-t-[3px] border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={`mailto:${PRIMARY_EMAIL}`}
            className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
          >
            {PRIMARY_EMAIL}
          </a>
          <p className="text-sm text-slate-600">
            Fully booked. Complimentary scan available for waitlist members.
          </p>
        </footer>
      </main>
    </div>
  );
}
