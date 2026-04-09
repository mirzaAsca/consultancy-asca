export type Source = {
  name: string;
  detail: string;
  url: string;
  year: string;
};

export const TIER1_SOURCES: Source[] = [
  {
    name: "Stanford/MIT - Generative AI Can Boost Productivity Without Replacing Workers",
    detail:
      "14% average productivity gain, 35% for junior workers. 5,000 customer service agents studied over one year at a Fortune 500 company.",
    url: "https://www.gsb.stanford.edu/insights/generative-ai-can-boost-productivity-without-replacing-workers",
    year: "2023",
  },
  {
    name: "Harvard/BCG - Navigating the Jagged Technological Frontier",
    detail:
      "758 BCG consultants: 12.2% more tasks completed, 25.1% faster, 40% higher quality output. Bottom-half performers saw 43% improvement.",
    url: "https://www.hbs.edu/faculty/Pages/item.aspx?num=64700",
    year: "2023",
  },
  {
    name: "GitHub - Quantifying Copilot's Impact on Developer Productivity",
    detail:
      "55.8% faster task completion. 81% of users report faster task completion. 87% report preserved mental effort on repetitive tasks.",
    url: "https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/",
    year: "2023",
  },
  {
    name: "Anthropic - Estimating Productivity Gains from AI",
    detail:
      "~80% speed-up per individual task. 12x faster for college-level skill tasks. Projected 1.0-1.8% annual US labor productivity growth increase.",
    url: "https://www.anthropic.com/research/estimating-productivity-gains",
    year: "2025",
  },
  {
    name: "BLS - Employer Costs for Employee Compensation (ECEC)",
    detail:
      "Total employer compensation: $46.15/hour average. Benefits = 29.8% of total compensation. Provides the methodology and multiplier for fully-loaded cost estimates; industry-specific figures are adjusted estimates.",
    url: "https://www.bls.gov/news.release/pdf/ecec.pdf",
    year: "Dec 2025",
  },
  {
    name: "Avasant/Computer Economics - IT Spending Benchmarks by Industry",
    detail:
      "IT spending as percentage of revenue by industry sector: Financial Services 6-10%, Manufacturing 2-4%, SaaS 8-12%, Healthcare 4-6%. Used for industry context, not directly in calculator formulas.",
    url: "https://avasant.com/report/it-spending-as-a-percentage-of-revenue-by-industry-company-size-and-region/",
    year: "2025",
  },
  {
    name: "McKinsey - State of AI 2025",
    detail:
      "88% of organizations use AI in at least one function. 27% of white-collar workers use AI daily. 33% have begun to scale AI programs.",
    url: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai",
    year: "2025",
  },
  {
    name: "McKinsey - AI-Powered Marketing and Sales Reach New Heights with Generative AI",
    detail:
      "Organizations investing in AI in marketing and sales are seeing 3-15% revenue uplift and 10-20% sales ROI uplift. Used to inform the calculator's revenue-leverage planning assumptions.",
    url: "https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/ai-powered-marketing-and-sales-reach-new-heights-with-generative-ai",
    year: "2023",
  },
  {
    name: "St. Louis Fed - Impact of Generative AI on Work Productivity",
    detail:
      "Meta-analysis of multiple studies: productivity gains range 10-55%, averaging approximately 25%. Workers self-report saving 5.4% of weekly hours.",
    url: "https://www.stlouisfed.org/on-the-economy/2025/feb/impact-generative-ai-work-productivity",
    year: "Feb 2025",
  },
  {
    name: "BCG - The Widening AI Value Gap",
    detail:
      "Top 5% of companies ('future-built') achieve 2.7x return on invested capital. ~2x revenue increases and ~1.4x greater cost reductions vs. laggards.",
    url: "https://www.bcg.com/publications/2025/are-you-generating-value-from-ai-the-widening-gap",
    year: "Sep 2025",
  },
  {
    name: "Glassdoor - Chief AI Officer Salaries",
    detail:
      "Average: $352,612/yr. 25th percentile: $264,459. 75th percentile: $493,657. Based on reported salary data.",
    url: "https://www.glassdoor.com/Salaries/chief-ai-officer-salary-SRCH_KO0,16.htm",
    year: "2026",
  },
  {
    name: "Robert Half - AI/ML Engineer Salary Data",
    detail:
      "Senior AI/ML engineers: $180K-$280K base. Fully loaded (benefits, overhead, tooling): $16,000-$24,000/month.",
    url: "https://www.roberthalf.com/us/en/job-details/aiml-engineer",
    year: "2026",
  },
];

export const TIER2_SOURCES: Source[] = [
  {
    name: "PwC - 28th Annual Global CEO Survey",
    detail:
      "56% of CEOs report neither revenue nor cost benefits from AI investments.",
    url: "https://www.pwc.com/gx/en/issues/c-suite-insights/ceo-survey.html",
    year: "2026",
  },
  {
    name: "S&P Global - AI & Machine Learning Use Cases Survey",
    detail:
      "42% of enterprises scrapped AI initiatives, up from 17% the prior year. Survey of 1,006 IT and business professionals.",
    url: "https://www.spglobal.com/market-intelligence/en/news-insights/research/ai-experiences-rapid-adoption-but-with-mixed-outcomes-highlights-from-vote-ai-machine-learning",
    year: "2025",
  },
  {
    name: "Gartner - AI in Organizations Survey",
    detail:
      "48% of AI projects reach production. Generative AI is the most frequently deployed AI solution.",
    url: "https://www.gartner.com/en/newsroom/press-releases/2024-05-07-gartner-survey-finds-generative-ai-is-now-the-most-frequently-deployed-ai-solution-in-organizations",
    year: "2024",
  },
  {
    name: "BCG - AI at Work: Momentum Builds But Gaps Remain",
    detail:
      "51% of frontline workers stalled in AI adoption. 75%+ of leaders/managers use GenAI several times per week.",
    url: "https://www.bcg.com/publications/2025/ai-at-work-momentum-builds-but-gaps-remain",
    year: "2025",
  },
  {
    name: "Anthropic - Economic Index",
    detail:
      "49% of jobs have AI-augmentable tasks (up from 36% earlier in 2025). Software development captures 19% of total productivity gains.",
    url: "https://www.anthropic.com/research/economic-index-primitives",
    year: "2025",
  },
  {
    name: "McKinsey - Superagency in the Workplace",
    detail:
      "57% of US work hours automatable by current technology. 44% automatable by AI agents alone (non-physical tasks).",
    url: "https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/superagency-in-the-workplace-empowering-people-to-unlock-ais-full-potential-at-work",
    year: "Nov 2025",
  },
  {
    name: "McKinsey - The Economic Potential of Generative AI",
    detail:
      "60-70% of employee work time augmentable by GenAI. 25% of work time requires natural language understanding.",
    url: "https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier",
    year: "2023",
  },
  {
    name: "Deloitte - State of AI in the Enterprise",
    detail:
      "36% of digital initiative budgets allocated to AI. Survey of 3,235 enterprise leaders.",
    url: "https://www.deloitte.com/us/en/what-we-do/capabilities/applied-artificial-intelligence/content/state-of-ai-in-the-enterprise.html",
    year: "2026",
  },
  {
    name: "Gartner - Worldwide AI Spending Forecast",
    detail:
      "Global AI spending projected at $2.52 trillion in 2026, up 44% year-over-year.",
    url: "https://www.gartner.com/en/newsroom/press-releases/2026-1-15-gartner-says-worldwide-ai-spending-will-total-2-point-5-trillion-dollars-in-2026",
    year: "Jan 2026",
  },
  {
    name: "ISG - Enterprise AI Spending Study",
    detail:
      "Enterprise AI spending rose 5.7% in 2025 while overall IT budgets grew only 1.8%. AI accounts for ~30% of incremental IT budget growth.",
    url: "https://ir.isg-one.com/news-market-information/press-releases/news-details/2024/Enterprise-AI-Spending-to-Rise-5.7-Percent-in-2025-Despite-Overall-IT-Budget-Increase-of-Less-than-2-Percent-ISG-Study/default.aspx",
    year: "2025",
  },
  {
    name: "Menlo Ventures - State of GenAI in the Enterprise",
    detail:
      "Average organization spends ~$85,500/month on AI-native applications. 37% of enterprises spend >$250K/year on LLMs alone.",
    url: "https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/",
    year: "2025",
  },
  {
    name: "CloudZero - State of AI Costs",
    detail:
      "Mid-market firms budget $20K-$100K/year for AI. Enterprise AI costs rising 36% year-over-year.",
    url: "https://www.cloudzero.com/state-of-ai-costs/",
    year: "2025",
  },
  {
    name: "IBM - How Governance Increases Velocity",
    detail:
      "58% reduction in data clearance processing time via watsonx.governance. 1,000+ AI models governed.",
    url: "https://www.ibm.com/thought-leadership/institute-business-value/en-us/report/ai-governance-trends",
    year: "Dec 2025",
  },
  {
    name: "WEF - Why Effective AI Governance Is Becoming a Growth Strategy",
    detail:
      "One manufacturer went from 6-8 week approval cycles to same-day for low-risk AI tools - 400% increase in AI experimentation.",
    url: "https://www.weforum.org/stories/2026/01/why-effective-ai-governance-is-becoming-a-growth-strategy/",
    year: "Jan 2026",
  },
  {
    name: "Deloitte - The AI ROI Paradox",
    detail:
      "Rising investment alongside elusive returns. Analysis of why most AI investments fail to produce measurable business outcomes.",
    url: "https://www.deloitte.com/global/en/issues/generative-ai/ai-roi-the-paradox-of-rising-investment-and-elusive-returns.html",
    year: "2025",
  },
  {
    name: "California Management Review - ROI of AI Ethics and Governance",
    detail:
      "From loss aversion to value generation. Academic analysis of governance investment driving AI returns.",
    url: "https://cmr.berkeley.edu/2024/07/on-the-roi-of-ai-ethics-and-governance-investments-from-loss-aversion-to-value-generation/",
    year: "Jul 2024",
  },
  {
    name: "CSIMarket - Revenue Per Employee by Sector",
    detail:
      "Cross-sector RPE benchmarks. Financial Services: $450K+, Retail: ~$449K. Provides context for revenue-per-employee ratios by sector.",
    url: "https://csimarket.com/Industry/industry_Efficiency.php",
    year: "2025",
  },
  {
    name: "Damodaran / NYU Stern - Employee Metrics Dataset",
    detail:
      "Sector-level employee productivity and revenue-per-employee data across all major industries. Reference context, not directly used in calculator formulas.",
    url: "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/Employee.html",
    year: "2025",
  },
];
