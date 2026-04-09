export const PLAN_A_MONTHLY = 22_000;
export const PLAN_A_ANNUAL = PLAN_A_MONTHLY * 12;
export const PLAN_B_MONTHLY = 290_000;
export const PLAN_B_ANNUAL = PLAN_B_MONTHLY * 12;

export const PLAN_A_REACH = 0.25;
export const PLAN_B_REACH = 0.4;

export const CAIO_ANNUAL = 425_000;
export const AI_ENGINEER_ANNUAL = 240_000;
export const PLAN_B_EQUIV_ENGINEERS = 25;

export type IndustryKey =
  | "financial"
  | "saas"
  | "manufacturing"
  | "healthcare"
  | "logistics"
  | "ecommerce"
  | "other";

export type BottleneckKey =
  | "sales"
  | "engineering"
  | "customer_success"
  | "marketing"
  | "ops";

export type ScenarioId = "lower" | "mid" | "upper";

export type RouteId =
  | "transformation_office"
  | "constraint_sprint"
  | "standard"
  | "not_now";

export type SituationIntentId =
  | "enterprise_scale"
  | "bottleneck"
  | "exploring";

export type IndustryDefinition = {
  label: string;
  knowledgeWorkerPct: number;
  fullyLoadedCost: number;
};

export type Scenario = {
  label: string;
  sublabel: string;
  planAGain: number;
  planBGain: number;
  source: string;
  sourceDetail: string;
};

export type BottleneckDefinition = {
  label: string;
  study: string;
  studyDetail: string;
};

export type PlanResult = {
  affectedWorkers: number;
  gainPct: number;
  equivalentFTEs: number;
  annualValue: number;
  annualCost: number;
  netValue: number;
  roi: number;
  monthsToPayback: number;
};

export type ConstraintEconomics = {
  productivityValue: number;
  hireDeferralCount: number;
  hireDeferralValue: number;
  revenueLeveragePct: number;
  revenueLeverageValue: number;
  capacityValue: number;
  combinedAnnualValue: number;
  netReturn: number;
  monthsToPayback: number;
};

export type LeanTeamPlaybook = {
  bottleneck: BottleneckKey;
  cardLabel: string;
  headline: string;
  successMetric: string;
  timeline: string;
  effortLine: string;
  routeSummary: string;
  systems: Array<{
    name: string;
    description: string;
  }>;
  baseKpis: string[];
  industryKpis?: Partial<Record<IndustryKey, string[]>>;
  ctaHeading: string;
  ctaLabel: string;
};

export type Inputs = {
  revenue: string;
  employees: string;
  industry: IndustryKey;
  knowledgeWorkerPct: number;
  currentAiSpend: string;
  plannedHires: string;
  bottleneck: BottleneckKey;
  situationIntent: SituationIntentId | "";
};

export type Results = {
  revenue: number;
  employees: number;
  revenuePerEmployee: number;
  isHighRPE: boolean;
  isLeanHighOutput: boolean;
  isEnterpriseScale: boolean;
  isRegulatedIndustry: boolean;
  hasMeaningfulAiSpend: boolean;
  hasClearBottleneck: boolean;
  knowledgeWorkers: number;
  fullyLoadedCost: number;
  industryLabel: string;
  planA: PlanResult;
  planB: PlanResult;
  hiresAvoidedA: number;
  hiresAvoidedB: number;
  hiringAvoidanceValueA: number;
  hiringAvoidanceValueB: number;
  plannedHires: number;
  buildInHouseB: number;
  currentAiSpend: number;
  bottleneck: BottleneckKey;
  route: RouteId;
  constraintEconomics: ConstraintEconomics;
};

export type WaitlistContext = {
  route: RouteId;
  recommendedOffer: string;
  recommendationReason: string;
  scenario: ScenarioId;
  revenue: number;
  employees: number;
  industry: string;
  bottleneck: string;
  revenuePerEmployee: number;
  currentAiSpend: number;
  plannedHires: number;
  planARoi: number;
  planAPayback: number;
  planAAnnualValue: number;
  planBRoi?: number;
};

export type RouteCta = {
  heading: string;
  subheading: string;
  label: string;
  path: string;
  recommendedOffer: string;
  recommendationReason: string;
};

export type PrimaryHeadlineMetric = "roi" | "payback" | "readiness";
export type PlanBDisposition = "primary" | "secondary" | "de_emphasized";

export const INDUSTRIES: Record<IndustryKey, IndustryDefinition> = {
  financial: {
    label: "Financial Services",
    knowledgeWorkerPct: 70,
    fullyLoadedCost: 180_000,
  },
  saas: {
    label: "SaaS / Software",
    knowledgeWorkerPct: 85,
    fullyLoadedCost: 170_000,
  },
  manufacturing: {
    label: "Manufacturing",
    knowledgeWorkerPct: 35,
    fullyLoadedCost: 130_000,
  },
  healthcare: {
    label: "Healthcare",
    knowledgeWorkerPct: 45,
    fullyLoadedCost: 140_000,
  },
  logistics: {
    label: "Logistics / Transportation",
    knowledgeWorkerPct: 30,
    fullyLoadedCost: 120_000,
  },
  ecommerce: {
    label: "E-commerce / Retail",
    knowledgeWorkerPct: 55,
    fullyLoadedCost: 140_000,
  },
  other: {
    label: "Other",
    knowledgeWorkerPct: 50,
    fullyLoadedCost: 150_000,
  },
};

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  lower: {
    label: "Lower range",
    sublabel: "Lowest documented gains",
    planAGain: 0.14,
    planBGain: 0.5,
    source: "Stanford/MIT 2023",
    sourceDetail:
      "14% average productivity gain measured across 5,000 customer service agents at a Fortune 500 company over one year. Junior workers saw up to 35% improvement.",
  },
  mid: {
    label: "Mid range",
    sublabel: "Cross-study average",
    planAGain: 0.25,
    planBGain: 1,
    source: "Harvard/BCG 2023 + St. Louis Fed 2025",
    sourceDetail:
      "25.1% speed improvement measured across 758 BCG consultants using GPT-4. Confirmed by St. Louis Fed meta-analysis averaging ~25% across multiple independent studies.",
  },
  upper: {
    label: "Upper range",
    sublabel: "Highest documented gains",
    planAGain: 0.4,
    planBGain: 1.5,
    source: "Harvard/BCG 2023 (quality-adjusted) + GitHub Copilot 2023",
    sourceDetail:
      "40% higher quality results from the 758-consultant study. GitHub Copilot showed 55.8% faster task completion for developers. Anthropic 2025 measured ~80% per-task speed-up.",
  },
};

export const BOTTLENECKS: Record<BottleneckKey, BottleneckDefinition> = {
  sales: {
    label: "Sales",
    study: "McKinsey 2023",
    studyDetail:
      "McKinsey reports 3-15% revenue uplift in marketing and sales. The value case is faster deal cycles, better response times, and more pipeline throughput without proportional hiring.",
  },
  engineering: {
    label: "Engineering",
    study: "GitHub Copilot 2023",
    studyDetail:
      "Developer tooling research shows faster task completion and higher throughput. The value case is cycle time, shipping velocity, backlog reduction, and hire deferral rather than direct revenue attribution.",
  },
  customer_success: {
    label: "Customer Success",
    study: "Stanford/MIT 2023",
    studyDetail:
      "Service teams benefit from faster case handling and better consistency. The value case is throughput, backlog reduction, retention protection, and operator time recovery.",
  },
  marketing: {
    label: "Marketing",
    study: "Harvard/BCG 2023 + McKinsey 2023",
    studyDetail:
      "Marketing teams can ship more campaigns, improve response times, and convert demand faster. This route supports conditional revenue leverage when marketing is the clear bottleneck.",
  },
  ops: {
    label: "Operations",
    study: "St. Louis Fed 2025",
    studyDetail:
      "Operations value comes from workflow automation, lower manual touch counts, faster cycle times, and lower cost-to-serve. Revenue leverage is not applied in the model.",
  },
};

export const REVENUE_LEVERAGE_PCT: Record<
  ScenarioId,
  Record<BottleneckKey, number>
> = {
  lower: {
    sales: 0.02,
    marketing: 0.015,
    customer_success: 0,
    engineering: 0,
    ops: 0,
  },
  mid: {
    sales: 0.03,
    marketing: 0.025,
    customer_success: 0,
    engineering: 0,
    ops: 0,
  },
  upper: {
    sales: 0.04,
    marketing: 0.035,
    customer_success: 0,
    engineering: 0,
    ops: 0,
  },
};

export const LEAN_TEAM_PLAYBOOKS: Record<BottleneckKey, LeanTeamPlaybook> = {
  engineering: {
    bottleneck: "engineering",
    cardLabel: "FOCUSED AI SYSTEM - ENGINEERING",
    headline: "Remove the shipping bottleneck before you add more headcount.",
    successMetric: "Engineering lead time",
    timeline: "First system in production in 90 days",
    effortLine: "Your team commitment: ~2 hours/week during setup, zero ongoing.",
    routeSummary:
      "A focused engineering system is a better fit than a broad transformation program for a lean team at this shape.",
    systems: [
      {
        name: "Spec-to-ticket copilot",
        description: "Turns product requests into scoped tickets, acceptance criteria, and handoff docs.",
      },
      {
        name: "PR review assistant",
        description: "Flags risky changes, summarizes diffs, and shortens review cycles for the team.",
      },
      {
        name: "Support-to-roadmap triage",
        description: "Clusters customer issues and routes repeated signals into the product backlog.",
      },
    ],
    baseKpis: [
      "Engineering lead time",
      "Backlog age",
      "Deploy frequency",
      "Hires deferred",
      "Manual time removed",
      "Founder or operator time recovered",
    ],
    industryKpis: {
      saas: [
        "Onboarding time",
        "Support resolution time",
        "Roadmap throughput",
      ],
      financial: ["Control exceptions", "Auditability"],
      logistics: ["Exception handling time"],
    },
    ctaHeading:
      "Want us to scope the one AI system that actually moves the needle?",
    ctaLabel: "Apply for the Operational Diagnostic",
  },
  sales: {
    bottleneck: "sales",
    cardLabel: "FOCUSED AI SYSTEM - SALES",
    headline: "Increase deal throughput before you add another seller.",
    successMetric: "Sales cycle time",
    timeline: "First system in production in 90 days",
    effortLine: "Your team commitment: ~2 hours/week during setup, zero ongoing.",
    routeSummary:
      "This team shape benefits most from one measurable sales system, not a company-wide transformation office.",
    systems: [
      {
        name: "Inbound qualification engine",
        description: "Scores leads, drafts next steps, and routes high-intent opportunities immediately.",
      },
      {
        name: "Proposal assembly workflow",
        description: "Builds tailored proposals from your past deals, pricing logic, and delivery constraints.",
      },
      {
        name: "Follow-up execution system",
        description: "Keeps reps on cadence with draft outreach, reminders, and CRM hygiene built in.",
      },
    ],
    baseKpis: [
      "Sales cycle time",
      "Response time",
      "Pipeline throughput",
      "Hires deferred",
      "Manual time removed",
      "Revenue throughput",
    ],
    industryKpis: {
      saas: ["Demo-to-close speed", "Expansion pipeline velocity"],
      financial: ["Case turnaround speed", "Control-ready recordkeeping"],
      other: ["Proposal turnaround time"],
    },
    ctaHeading:
      "Want us to scope the one AI system that actually moves the needle?",
    ctaLabel: "Apply for the Operational Diagnostic",
  },
  customer_success: {
    bottleneck: "customer_success",
    cardLabel: "FOCUSED AI SYSTEM - CUSTOMER SUCCESS",
    headline: "Increase onboarding and support capacity without piling on hires.",
    successMetric: "Backlog age and onboarding capacity",
    timeline: "First system in production in 90 days",
    effortLine: "Your team commitment: ~2 hours/week during setup, zero ongoing.",
    routeSummary:
      "The value case here is capacity, consistency, retention protection, and time recovered in one workflow.",
    systems: [
      {
        name: "Onboarding orchestration",
        description: "Coordinates tasks, drafts customer-facing updates, and reduces handoff lag.",
      },
      {
        name: "Case triage assistant",
        description: "Classifies inbound issues, routes urgent work, and preps context for agents.",
      },
      {
        name: "Renewal risk monitor",
        description: "Flags accounts showing churn signals and drafts the next best follow-up.",
      },
    ],
    baseKpis: [
      "Onboarding capacity",
      "Backlog age",
      "Resolution speed",
      "Manual time removed",
      "Hires deferred",
      "Consistency and first-pass quality",
    ],
    industryKpis: {
      saas: ["Time-to-value", "Support resolution time", "Renewal protection"],
      healthcare: ["Admin backlog", "First-pass quality"],
      logistics: ["SLA adherence"],
    },
    ctaHeading:
      "Want us to scope the one AI system that actually moves the needle?",
    ctaLabel: "Apply for the Operational Diagnostic",
  },
  marketing: {
    bottleneck: "marketing",
    cardLabel: "FOCUSED AI SYSTEM - MARKETING",
    headline: "Ship campaigns faster and convert demand without scaling headcount linearly.",
    successMetric: "Campaign cycle time",
    timeline: "First system in production in 90 days",
    effortLine: "Your team commitment: ~2 hours/week during setup, zero ongoing.",
    routeSummary:
      "Marketing can support both capacity gains and conditional revenue leverage when one workflow is clearly constrained.",
    systems: [
      {
        name: "Campaign production engine",
        description: "Builds briefs, asset drafts, launch checklists, and approval loops from one prompt.",
      },
      {
        name: "Lead nurture sequencer",
        description: "Personalizes follow-up content and keeps prospects moving through the funnel.",
      },
      {
        name: "Performance insight assistant",
        description: "Summarizes campaign data, highlights bottlenecks, and recommends next tests.",
      },
    ],
    baseKpis: [
      "Campaign cycle time",
      "Backlog age",
      "Manual time removed",
      "Hires deferred",
      "Revenue throughput",
      "Conversion support",
    ],
    industryKpis: {
      saas: ["Content velocity", "Demand response time"],
      ecommerce: ["Campaign launch speed", "Promo turnaround"],
      other: ["Proposal and collateral speed"],
    },
    ctaHeading:
      "Want us to scope the one AI system that actually moves the needle?",
    ctaLabel: "Apply for the Operational Diagnostic",
  },
  ops: {
    bottleneck: "ops",
    cardLabel: "FOCUSED AI SYSTEM - OPERATIONS",
    headline: "Remove workflow friction in one measurable operational queue.",
    successMetric: "Cycle time and manual touch count",
    timeline: "First system in production in 90 days",
    effortLine: "Your team commitment: ~2 hours/week during setup, zero ongoing.",
    routeSummary:
      "For operations-heavy teams, the value case is throughput, backlog removal, and cost-to-serve reduction in one workflow.",
    systems: [
      {
        name: "Exception-handling workflow",
        description: "Classifies exceptions, routes owners, and prepares the next best action with context.",
      },
      {
        name: "Document processing lane",
        description: "Extracts structured data, validates fields, and reduces repetitive manual entry.",
      },
      {
        name: "Queue health monitor",
        description: "Surfaces backlog spikes, handoff delays, and recurring rework before they grow.",
      },
    ],
    baseKpis: [
      "Cycle time reduction",
      "Queue time",
      "Manual touch count",
      "Hires deferred",
      "Rework reduction",
      "Cost-to-serve reduction",
    ],
    industryKpis: {
      manufacturing: ["Throughput", "Downtime", "Yield", "Unit cost"],
      healthcare: ["Claim cycle time", "Denial rate", "Admin backlog"],
      logistics: [
        "Shipment coordination time",
        "Exception handling time",
        "SLA adherence",
      ],
      financial: ["Servicing cycle time", "Cost per case", "Auditability"],
    },
    ctaHeading:
      "Want us to scope the one AI system that actually moves the needle?",
    ctaLabel: "Apply for the Operational Diagnostic",
  },
};

export function parseNum(value: string): number {
  return Number.parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
}

export function fmtInput(value: number): string {
  if (value === 0) return "";
  return value.toLocaleString("en-US");
}

export function fmtCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function fmtPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function fmtX(value: number): string {
  if (value >= 100) return `${Math.round(value)}x`;
  const thresholds = [1, 1.5, 3, 5, 10];
  if (thresholds.some((threshold) => Math.abs(value - threshold) < 0.05)) {
    return `${value.toFixed(2)}x`;
  }
  return `${value.toFixed(1)}x`;
}

function getPlanResult(
  knowledgeWorkers: number,
  reach: number,
  gain: number,
  annualCost: number,
  fullyLoadedCost: number,
): PlanResult {
  const affectedWorkers = Math.round(knowledgeWorkers * reach);
  const equivalentFTEs = affectedWorkers * gain;
  const annualValue = equivalentFTEs * fullyLoadedCost;
  const netValue = annualValue - annualCost;
  const roi = annualCost > 0 ? annualValue / annualCost : 0;
  const monthsToPayback = annualValue > 0
    ? Math.ceil((annualCost / annualValue) * 12)
    : 99;

  return {
    affectedWorkers,
    gainPct: gain,
    equivalentFTEs,
    annualValue,
    annualCost,
    netValue,
    roi,
    monthsToPayback,
  };
}

export function getConstraintEconomics(
  results: Pick<
    Results,
    "revenue" | "fullyLoadedCost" | "plannedHires" | "bottleneck" | "planA"
  >,
  scenario: ScenarioId,
): ConstraintEconomics {
  const hireDeferralCount = results.plannedHires > 0
    ? Math.min(results.plannedHires, Math.floor(results.planA.equivalentFTEs))
    : 0;
  const hireDeferralValue = hireDeferralCount * results.fullyLoadedCost;
  const revenueLeveragePct = REVENUE_LEVERAGE_PCT[scenario][results.bottleneck];
  const revenueLeverageValue = results.revenue * revenueLeveragePct;
  const productivityValue = results.planA.annualValue;
  const capacityValue = Math.max(productivityValue, hireDeferralValue);
  const combinedAnnualValue = capacityValue + revenueLeverageValue;
  const annualCost = results.planA.annualCost;
  const netReturn = combinedAnnualValue - annualCost;
  const monthsToPayback = combinedAnnualValue > 0
    ? Math.ceil((annualCost / combinedAnnualValue) * 12)
    : 99;

  return {
    productivityValue,
    hireDeferralCount,
    hireDeferralValue,
    revenueLeveragePct,
    revenueLeverageValue,
    capacityValue,
    combinedAnnualValue,
    netReturn,
    monthsToPayback,
  };
}

type RouteSignals = {
  revenue: number;
  employees: number;
  planA: PlanResult;
  planB: PlanResult;
  hasMeaningfulAiSpend: boolean;
  hasClearBottleneck: boolean;
  isLeanHighOutput: boolean;
};

export function detectRoute(
  signals: RouteSignals,
  situationIntent: SituationIntentId | "",
): RouteId {
  const { revenue, employees, planA, planB, hasMeaningfulAiSpend, hasClearBottleneck, isLeanHighOutput } = signals;

  let route: RouteId;

  if (employees > 500 && revenue >= 50_000_000) {
    route = "transformation_office";
  } else if (
    employees > 200 &&
    revenue >= 50_000_000 &&
    (hasMeaningfulAiSpend || planB.roi >= 1.5)
  ) {
    route = "transformation_office";
  } else if (isLeanHighOutput) {
    route = "constraint_sprint";
  } else if (
    employees <= 150 &&
    hasClearBottleneck &&
    planA.monthsToPayback <= 18
  ) {
    route = "constraint_sprint";
  } else if (planA.roi >= 3) {
    route = "standard";
  } else if (planA.roi < 1) {
    route = "not_now";
  } else {
    route = "standard";
  }

  if (situationIntent === "enterprise_scale") {
    if (!(employees < 50 && revenue < 5_000_000)) {
      return "transformation_office";
    }
    return route;
  }

  if (situationIntent === "bottleneck") {
    return "constraint_sprint";
  }

  if (situationIntent === "exploring" && route === "standard") {
    return "not_now";
  }

  return route;
}

export function calculate(
  inputs: Inputs,
  scenario: ScenarioId,
): Results {
  const revenue = parseNum(inputs.revenue);
  const employees = parseNum(inputs.employees);
  const plannedHires = parseNum(inputs.plannedHires);
  const currentAiSpend = parseNum(inputs.currentAiSpend);
  const industry = INDUSTRIES[inputs.industry];
  const knowledgeWorkers = Math.round(
    employees * (inputs.knowledgeWorkerPct / 100),
  );
  const revenuePerEmployee = employees > 0 ? revenue / employees : 0;
  const isHighRPE = revenuePerEmployee >= 300_000;
  const isLeanHighOutput = isHighRPE && employees >= 10 && employees <= 120 && revenue >= 5_000_000;
  const isEnterpriseScale = employees > 200 && revenue >= 50_000_000;
  const isRegulatedIndustry = inputs.industry === "financial" || inputs.industry === "healthcare";
  const hasMeaningfulAiSpend = currentAiSpend >= 100_000;
  const hasClearBottleneck = Object.hasOwn(BOTTLENECKS, inputs.bottleneck);
  const selectedScenario = SCENARIOS[scenario];

  const planA = getPlanResult(
    knowledgeWorkers,
    PLAN_A_REACH,
    selectedScenario.planAGain,
    PLAN_A_ANNUAL,
    industry.fullyLoadedCost,
  );
  const planB = getPlanResult(
    knowledgeWorkers,
    PLAN_B_REACH,
    selectedScenario.planBGain,
    PLAN_B_ANNUAL,
    industry.fullyLoadedCost,
  );

  const route = detectRoute(
    {
      revenue,
      employees,
      planA,
      planB,
      hasMeaningfulAiSpend,
      hasClearBottleneck,
      isLeanHighOutput,
    },
    inputs.situationIntent,
  );

  const hiresAvoidedA = plannedHires > 0
    ? Math.min(plannedHires, Math.floor(planA.equivalentFTEs))
    : 0;
  const hiresAvoidedB = plannedHires > 0
    ? Math.min(plannedHires, Math.floor(planB.equivalentFTEs))
    : 0;

  return {
    revenue,
    employees,
    revenuePerEmployee,
    isHighRPE,
    isLeanHighOutput,
    isEnterpriseScale,
    isRegulatedIndustry,
    hasMeaningfulAiSpend,
    hasClearBottleneck,
    knowledgeWorkers,
    fullyLoadedCost: industry.fullyLoadedCost,
    industryLabel: industry.label,
    planA,
    planB,
    hiresAvoidedA,
    hiresAvoidedB,
    hiringAvoidanceValueA: hiresAvoidedA * industry.fullyLoadedCost,
    hiringAvoidanceValueB: hiresAvoidedB * industry.fullyLoadedCost,
    plannedHires,
    buildInHouseB: CAIO_ANNUAL + PLAN_B_EQUIV_ENGINEERS * AI_ENGINEER_ANNUAL,
    currentAiSpend,
    bottleneck: inputs.bottleneck,
    route,
    constraintEconomics: getConstraintEconomics(
      {
        revenue,
        fullyLoadedCost: industry.fullyLoadedCost,
        plannedHires,
        bottleneck: inputs.bottleneck,
        planA,
      },
      scenario,
    ),
  };
}

export function getPlanInterpretation(
  label: string,
  result: PlanResult,
): { verdict: string; detail: string } {
  if (result.roi > 10) {
    return {
      verdict: `Exceptional fit for ${label}`,
      detail:
        `At ${fmtX(result.roi)} ROI, the investment is a small fraction of the value created. Even at materially lower realized gains, the economics remain strongly positive. Payback lands in about ${result.monthsToPayback} month${result.monthsToPayback === 1 ? "" : "s"}.`,
    };
  }

  if (result.roi > 5) {
    return {
      verdict: `Strong fit for ${label}`,
      detail:
        `At ${fmtX(result.roi)} ROI, the investment pays back quickly and clears a typical technology-investment hurdle with room to spare.`,
    };
  }

  if (result.roi > 3) {
    return {
      verdict: `Good fit for ${label}`,
      detail:
        `At ${fmtX(result.roi)} ROI, returns are clearly positive. This supports a measured rollout starting with the highest-yield workflows.`,
    };
  }

  if (result.roi > 1.5) {
    return {
      verdict: `Positive but execution-sensitive for ${label}`,
      detail:
        `At ${fmtX(result.roi)} ROI, economics are positive but depend on tight workflow selection, adoption, and measurement discipline.`,
    };
  }

  if (result.roi > 1) {
    return {
      verdict: `Near break-even for ${label}`,
      detail:
        `At ${fmtX(result.roi)} ROI, the investment works on paper but leaves limited surplus value. A tighter scope is more defensible than a broad rollout.`,
    };
  }

  return {
    verdict: `Weak fit for ${label}`,
    detail:
      `At ${fmtX(result.roi)} ROI, the broad program does not justify itself on the current labor-productivity math. A narrower or earlier-stage step is the better recommendation.`,
  };
}

export function getRouteHeadline(
  route: RouteId,
  results: Results,
): string {
  const bottleneckLabel = BOTTLENECKS[results.bottleneck].label.toLowerCase();

  if (route === "transformation_office") {
    return "Your profile: enterprise AI portfolio fit. Govern the portfolio, then scale what works.";
  }

  if (route === "constraint_sprint") {
    if (results.isLeanHighOutput) {
      return `Your profile: lean high-output team. Here is how AI removes your ${bottleneckLabel} constraint.`;
    }

    return `Your profile: focused bottleneck fit. One measurable AI system can improve your ${bottleneckLabel} workflow faster than a broad rollout.`;
  }

  if (route === "not_now") {
    return "Your profile points to readiness work before a retained AI program.";
  }

  return "Your numbers support a measured AI rollout starting with the highest-yield entry point.";
}

export function getRouteSummary(
  route: RouteId,
  results: Results,
): string {
  if (route === "transformation_office") {
    return "At this scale, the value story is operating leverage across multiple workflows plus governance that prevents pilot sprawl from turning into waste.";
  }

  if (route === "constraint_sprint") {
    return LEAN_TEAM_PLAYBOOKS[results.bottleneck].routeSummary;
  }

  if (route === "not_now") {
    return "The transparent math is still useful, but the immediate next step is clarifying one workflow, one owner, and one measurable outcome before you buy a larger program.";
  }

  return "The broad economics are positive enough to justify a start, but this is still best approached as a scoped entry point rather than a company-wide bet.";
}

export function getPublicRouteLabel(route: RouteId): string {
  if (route === "transformation_office") return "Transformation Office";
  if (route === "constraint_sprint") return "Constraint Sprint";
  if (route === "not_now") return "Readiness";
  return "Measured Entry";
}

export function getPrimaryHeadlineMetric(
  route: RouteId,
): PrimaryHeadlineMetric {
  if (route === "constraint_sprint") return "payback";
  if (route === "not_now") return "readiness";
  return "roi";
}

export function getPlanBDisposition(route: RouteId): PlanBDisposition {
  if (route === "transformation_office") return "primary";
  if (route === "standard") return "secondary";
  return "de_emphasized";
}

export function getRouteReason(
  results: Results,
  situationIntent: SituationIntentId | "",
): string {
  const silentRoute = detectRoute(
    {
      revenue: results.revenue,
      employees: results.employees,
      planA: results.planA,
      planB: results.planB,
      hasMeaningfulAiSpend: results.hasMeaningfulAiSpend,
      hasClearBottleneck: results.hasClearBottleneck,
      isLeanHighOutput: results.isLeanHighOutput,
    },
    "",
  );

  if (
    situationIntent === "enterprise_scale" &&
    results.route === "transformation_office" &&
    silentRoute !== "transformation_office"
  ) {
    return `You selected the enterprise-scale situation, so the calculator prioritized the Transformation Office path even though the silent route would otherwise have been ${getPublicRouteLabel(silentRoute)}.`;
  }

  if (
    situationIntent === "bottleneck" &&
    results.route === "constraint_sprint" &&
    silentRoute !== "constraint_sprint"
  ) {
    return `You selected the specific bottleneck situation, so the calculator prioritized the Constraint Sprint path even though the silent route would otherwise have been ${getPublicRouteLabel(silentRoute)}.`;
  }

  if (
    situationIntent === "exploring" &&
    results.route === "not_now" &&
    silentRoute !== "not_now"
  ) {
    return `You selected the exploring situation, so the calculator downgraded the recommendation to readiness work instead of pushing a broader program.`;
  }

  if (results.route === "transformation_office") {
    if (results.employees > 500 && results.revenue >= 50_000_000) {
      return "Company scale alone is enough to justify the Transformation Office path before narrower bottleneck logic.";
    }

    return "The combination of company scale, AI maturity, and broad enterprise economics points to portfolio governance and multi-workflow prioritization rather than a single-system sprint.";
  }

  if (results.route === "constraint_sprint") {
    if (results.isLeanHighOutput) {
      return `High revenue per employee and a lean team shape make one focused ${BOTTLENECKS[results.bottleneck].label.toLowerCase()} system more defensible than a broad rollout.`;
    }

    return `This company does not need a transformation office yet, but the ${BOTTLENECKS[results.bottleneck].label.toLowerCase()} bottleneck is clear and the payback stays within the viability threshold for a focused sprint.`;
  }

  if (results.route === "not_now") {
    return "The current profile does not clear either the enterprise route or the focused-sprint viability threshold, so readiness is the more honest next step.";
  }

  return "The economics support a measured start, but not a strong enough case for either a transformation office or a focused bottleneck sprint override.";
}

export function getRouteCta(results: Results): RouteCta {
  const bottleneckLabel = BOTTLENECKS[results.bottleneck].label;

  if (results.route === "transformation_office") {
    return {
      heading:
        "Want a board-ready view of which AI initiatives should scale, stop, or be governed first?",
      subheading:
        "The AI Portfolio Reality Scan gives you a portfolio baseline, the first scale-or-kill decisions, and a governance charter in 2-3 weeks.",
      label: "Apply for the AI Portfolio Reality Scan",
      path: "/portfolio-reality-scan/",
      recommendedOffer: "AI Portfolio Reality Scan",
      recommendationReason:
        "Enterprise scale, governance pressure, and portfolio economics make a portfolio diagnostic the right entry point.",
    };
  }

  if (results.route === "constraint_sprint") {
    return {
      heading:
        "Want us to scope the one AI system that actually moves the needle?",
      subheading:
        `The Operational Diagnostic scopes the ${bottleneckLabel.toLowerCase()} workflow, baseline metric, and first production system before you commit to broader delivery.`,
      label: "Apply for the Operational Diagnostic",
      path: "/operational-diagnostic/",
      recommendedOffer: "Operational Diagnostic",
      recommendationReason:
        `A focused ${bottleneckLabel.toLowerCase()} bottleneck is more valuable than a broad transformation office at your current team shape.`,
    };
  }

  if (results.route === "not_now") {
    return {
      heading: "Want help identifying the first workflow worth measuring?",
      subheading:
        "The readiness diagnostic helps you define one owner, one workflow, and one measurable outcome so the economics become actionable.",
      label: "Request the readiness diagnostic",
      path: "/readiness-diagnostic/",
      recommendedOffer: "Readiness Diagnostic",
      recommendationReason:
        "Readiness is the blocker right now, not lack of company quality. The next step is sharper workflow definition and sponsorship.",
    };
  }

  return {
    heading: "Want your exact numbers and the right starting point?",
    subheading:
      "The AI Portfolio Reality Scan turns the directional math into a company-specific starting plan and recommended sequence.",
    label: "Apply for the AI Portfolio Reality Scan",
    path: "/portfolio-reality-scan/",
    recommendedOffer: "AI Portfolio Reality Scan",
    recommendationReason:
      "The economics support a measured start, but the exact rollout sequence still needs company-specific prioritization.",
  };
}

export function buildWaitlistContext(
  results: Results,
  scenario: ScenarioId,
): WaitlistContext {
  const cta = getRouteCta(results);
  return {
    route: results.route,
    recommendedOffer: cta.recommendedOffer,
    recommendationReason: cta.recommendationReason,
    scenario,
    revenue: results.revenue,
    employees: results.employees,
    industry: results.industryLabel,
    bottleneck: BOTTLENECKS[results.bottleneck].label,
    revenuePerEmployee: results.revenuePerEmployee,
    currentAiSpend: results.currentAiSpend,
    plannedHires: results.plannedHires,
    planARoi: results.planA.roi,
    planAPayback: results.planA.monthsToPayback,
    planAAnnualValue: results.planA.annualValue,
    planBRoi: results.planB.roi,
  };
}
