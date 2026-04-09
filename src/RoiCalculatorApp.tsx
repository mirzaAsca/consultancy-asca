import { useRef, useState, type ReactNode } from "react";
import SiteHeader from "./components/SiteHeader";
import WaitlistForm from "./components/WaitlistForm";
import WarpedGrid from "./components/WarpedGrid";
import { TIER1_SOURCES, TIER2_SOURCES, type Source } from "./lib/roi-sources";
import {
  AI_ENGINEER_ANNUAL,
  BOTTLENECKS,
  CAIO_ANNUAL,
  calculate,
  fmtCurrency,
  fmtInput,
  fmtPct,
  fmtX,
  getPlanInterpretation,
  getPublicRouteLabel,
  getRouteCta,
  getRouteHeadline,
  getRouteReason,
  getRouteSummary,
  INDUSTRIES,
  LEAN_TEAM_PLAYBOOKS,
  PLAN_A_ANNUAL,
  PLAN_A_MONTHLY,
  PLAN_B_EQUIV_ENGINEERS,
  PLAN_B_MONTHLY,
  PLAN_B_ANNUAL,
  SCENARIOS,
  type BottleneckKey,
  type IndustryKey,
  type Inputs,
  type PlanResult,
  type Results,
  type Scenario,
  type ScenarioId,
  type SituationIntentId,
  buildWaitlistContext,
} from "./lib/roi-calculator";
import { buildWaitlistHref } from "./lib/waitlist-context";

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

const SITUATION_OPTIONS: Array<{
  value: SituationIntentId;
  label: string;
}> = [
  {
    value: "enterprise_scale",
    label: "We have AI pilots but need to scale them across the company",
  },
  {
    value: "bottleneck",
    label: "We have a specific bottleneck we want AI to solve",
  },
  {
    value: "exploring",
    label: "We're exploring what AI could do for us",
  },
];

const TRANSFORMATION_KPIS = [
  "Operating margin / EBIT",
  "SG&A as % of revenue",
  "Cost-to-serve",
  "Cycle time",
  "Workflow adoption",
  "Production deployment coverage",
  "Governance maturity",
  "Pilot-to-production conversion",
];

const TRANSFORMATION_OVERLAYS: Partial<Record<IndustryKey, string[]>> = {
  financial: [
    "Control exceptions",
    "Audit findings",
    "Model governance coverage",
    "Servicing cost",
    "Case cycle time",
  ],
  healthcare: [
    "Claim cycle time",
    "Denial rate",
    "Patient throughput",
    "Compliance exposure",
    "Audit survivability",
  ],
  manufacturing: ["Throughput", "Yield", "Downtime", "Unit cost"],
  saas: [
    "Product delivery cadence",
    "Support cost-to-serve",
    "Security review velocity",
    "Trust and evaluation coverage",
  ],
};

const STANDARD_KPIS = [
  "Payback period",
  "Workflow coverage",
  "Team adoption",
  "Manual time removed",
  "Opportunity cost per quarter",
];

const NOT_NOW_STEPS = [
  "Clarify one workflow that hurts enough to fix now.",
  "Name one owner who will sponsor the workflow change.",
  "Define one measurable outcome before buying a broader program.",
];

function Expandable({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--line)]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
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
          className={`font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] ${accent ? "bg-[var(--accent)] px-2.5 py-1 text-white" : "text-[var(--muted)]"}`}
        >
          {title}
        </p>
        <span className={metaChipClass}>{sources.length}</span>
      </div>
      <ol className="mt-4 space-y-2">
        {sources.map((source, index) => (
          <li key={source.url} className="group relative text-sm leading-relaxed">
            <span className="font-['IBM_Plex_Mono'] text-[11px] text-[var(--muted)]">
              {index + 1}.
            </span>{" "}
            <span className="font-medium text-slate-950">{source.name}</span>{" "}
            <span className="text-[11px] text-slate-400">({source.year})</span>
            <br />
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              title={source.detail}
              className="break-all font-['IBM_Plex_Mono'] text-[11px] text-[var(--accent)] underline decoration-slate-300 underline-offset-2 hover:decoration-[var(--accent)]"
            >
              {source.url}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function getIndustryKeyFromLabel(label: string): IndustryKey {
  return (
    (Object.entries(INDUSTRIES).find(([, industry]) => industry.label === label)?.[0] as
      | IndustryKey
      | undefined) ?? "other"
  );
}

function StatRow({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: string;
  detail?: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <div className="flex justify-between gap-4 text-sm">
        <span className="text-slate-700">{label}</span>
        <span
          className={`font-['IBM_Plex_Mono'] font-medium text-slate-950 ${valueClassName ?? ""}`}
        >
          {value}
        </span>
      </div>
      {detail ? <p className={statExplainClass}>{detail}</p> : null}
    </div>
  );
}

function PlanCard({
  eyebrow,
  title,
  result,
  startHere,
  description,
  emphasis,
}: {
  eyebrow: string;
  title: string;
  result: PlanResult;
  startHere?: string;
  description: string;
  emphasis: "primary" | "secondary" | "warning";
}) {
  const interpretation = getPlanInterpretation(title, result);
  const borderClass = emphasis === "primary"
    ? "border-[var(--accent)]"
    : emphasis === "warning"
      ? "border-rose-300"
      : "border-[var(--line)]";

  return (
    <div className={`flex flex-col ${panelClass} ${borderClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            {eyebrow}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{title}</p>
        </div>
        {startHere ? (
          <span className="bg-[var(--accent)] px-2 py-0.5 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.12em] text-white">
            {startHere}
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="font-['IBM_Plex_Mono'] text-4xl font-semibold text-slate-950">
            {fmtX(result.roi)}
          </p>
          <p className="mt-1 text-sm text-slate-600">return on investment</p>
        </div>
        <div>
          <p className="font-['IBM_Plex_Mono'] text-4xl font-semibold text-slate-950">
            {result.monthsToPayback}
          </p>
          <p className="mt-1 text-sm text-slate-600">months to payback</p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-slate-700">{description}</p>

      <div className="mt-6 space-y-4 border-t border-[var(--line)] pt-5">
        <StatRow
          label="Workers affected"
          value={result.affectedWorkers.toLocaleString("en-US")}
          detail="Planning estimate for who this program can realistically touch in the first year."
        />
        <StatRow
          label="Equivalent output added"
          value={`${result.equivalentFTEs.toFixed(1)} FTEs`}
          detail={`${result.affectedWorkers} workers x ${fmtPct(result.gainPct)} productivity gain.`}
        />
        <StatRow
          label="Annual productivity value"
          value={fmtCurrency(result.annualValue)}
          valueClassName="text-[var(--accent)]"
        />
        <StatRow label="Your investment" value={`${fmtCurrency(result.annualCost)}/yr`} />
        <StatRow
          label="Net return"
          value={`${fmtCurrency(result.netValue)}/yr`}
          valueClassName={result.netValue >= 0 ? "text-[var(--accent)]" : "text-rose-600"}
        />
      </div>

      <div className="mt-6 border-t border-[var(--line)] pt-5">
        <p
          className={`font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] ${result.roi >= 3 ? "text-[var(--accent)]" : result.roi >= 1 ? "text-amber-600" : "text-rose-600"}`}
        >
          {interpretation.verdict}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {interpretation.detail}
        </p>
      </div>
    </div>
  );
}

function RouteInsightPanel({
  results,
  situationIntent,
}: {
  results: Results;
  situationIntent: SituationIntentId | "";
}) {
  const routeLabel = getPublicRouteLabel(results.route);
  const primaryPayback = results.route === "constraint_sprint"
    ? results.constraintEconomics.monthsToPayback
    : results.planA.monthsToPayback;

  return (
    <div className={`mt-6 ${cardClass} border-[var(--accent)] bg-[rgba(244,247,251,0.9)]`}>
      <div className="flex flex-wrap gap-2">
        <span className={metaChipClass}>{routeLabel}</span>
        <span className={metaChipClass}>
          Revenue / employee {fmtCurrency(results.revenuePerEmployee)}
        </span>
        <span className={metaChipClass}>
          Primary payback {primaryPayback} months
        </span>
        {results.currentAiSpend > 0 ? (
          <span className={metaChipClass}>
            Current AI spend {fmtCurrency(results.currentAiSpend)}/yr
          </span>
        ) : null}
      </div>
      <p className="mt-4 font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
        Why this route
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        {getRouteReason(results, situationIntent)}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-slate-700">
        {getRouteSummary(results.route, results)}
      </p>
      {results.isRegulatedIndustry && results.route === "transformation_office" ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          For regulated enterprises, governance maturity is not optional. It
          shortens deployment time by removing late-stage compliance blocks.
        </p>
      ) : null}
    </div>
  );
}

function ResultsNextStepCard({
  results,
  cta,
  handoffHref,
  selectedScenario,
  industryKey,
}: {
  results: Results;
  cta: NonNullable<ReturnType<typeof getRouteCta>>;
  handoffHref: string;
  selectedScenario: Scenario;
  industryKey: IndustryKey;
}) {
  return (
    <div id="next-step" className={`mt-8 ${panelClass} border-[var(--accent)]`}>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_minmax(0,0.85fr)] lg:items-center">
        <div>
          <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]">
            Next step
          </p>
          <h3 className="mt-3 text-2xl font-semibold leading-[1.08] tracking-[-0.02em] text-slate-950">
            {cta.heading}
          </h3>
          <p className="mt-3 max-w-[54ch] text-sm leading-relaxed text-slate-700">
            {cta.subheading}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={metaChipClass}>
              Route: {getPublicRouteLabel(results.route)}
            </span>
            <span className={metaChipClass}>
              Industry: {INDUSTRIES[industryKey].label}
            </span>
            <span className={metaChipClass}>
              Scenario: {selectedScenario.label}
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Calculator context carries forward automatically: revenue,
            employees, bottleneck, research scenario, route, and the reason for
            the recommendation.
          </p>
        </div>
        <a href={handoffHref} className={`${primaryButtonClass} w-full`}>
          {cta.label}
        </a>
      </div>
    </div>
  );
}

function ConstraintSprintCards({
  results,
}: {
  results: Results;
}) {
  const playbook = LEAN_TEAM_PLAYBOOKS[results.bottleneck];
  const economics = results.constraintEconomics;

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_minmax(0,0.9fr)]">
      <div className={`flex flex-col ${panelClass} border-[var(--accent)]`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              {playbook.cardLabel}
            </p>
            <h3 className="mt-3 text-2xl font-semibold leading-[1.08] tracking-[-0.02em] text-slate-950">
              Pays for itself in {economics.monthsToPayback} month
              {economics.monthsToPayback === 1 ? "" : "s"}
            </h3>
            <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-slate-700">
              {playbook.headline}
            </p>
          </div>
          <span className="bg-[var(--accent)] px-2 py-0.5 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.12em] text-white">
            Focused entry
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {playbook.systems.map((system) => (
            <div key={system.name} className={cardClass}>
              <p className="text-sm font-semibold text-slate-950">{system.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {system.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-4 border-t border-[var(--line)] pt-5">
          <StatRow
            label="Productivity value"
            value={fmtCurrency(economics.productivityValue)}
            detail={`Base labor-productivity value using Plan A economics (${results.planA.equivalentFTEs.toFixed(1)} FTEs of added capacity).`}
          />
          <StatRow
            label="Hire deferral value"
            value={fmtCurrency(economics.hireDeferralValue)}
            detail={economics.hireDeferralCount > 0
              ? `${economics.hireDeferralCount} deferred hire${economics.hireDeferralCount === 1 ? "" : "s"} at ${fmtCurrency(results.fullyLoadedCost)} fully-loaded cost each.`
              : "No hire-deferral value applied because planned hires are zero or smaller than the capacity added."}
          />
          <StatRow
            label="Revenue leverage value"
            value={fmtCurrency(economics.revenueLeverageValue)}
            detail={economics.revenueLeveragePct > 0
              ? `${fmtPct(economics.revenueLeveragePct)} conditional revenue leverage applied because ${BOTTLENECKS[results.bottleneck].label.toLowerCase()} directly affects revenue flow.`
              : "No revenue leverage applied. This route keeps the math conservative for non-revenue bottlenecks."}
          />
          <StatRow
            label="Combined annual value"
            value={fmtCurrency(economics.combinedAnnualValue)}
            detail="Combined annual value (capacity value + conditional revenue leverage). Productivity and hire deferral are not double counted."
            valueClassName="text-[var(--accent)]"
          />
          <StatRow label="Your investment" value={`${fmtCurrency(PLAN_A_ANNUAL)}/yr`} />
          <StatRow
            label="Net return"
            value={`${fmtCurrency(economics.netReturn)}/yr`}
            valueClassName={economics.netReturn >= 0 ? "text-[var(--accent)]" : "text-rose-600"}
          />
        </div>

        <div className="mt-6 border-t border-[var(--line)] pt-5">
          <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]">
            Measurable outcome
          </p>
          <p className="mt-2 text-sm text-slate-700">{playbook.successMetric}</p>
          <p className="mt-4 text-sm text-slate-700">{playbook.timeline}</p>
          <p className="mt-2 text-sm text-slate-700">{playbook.effortLine}</p>
          <p className="mt-2 text-sm text-slate-700">
            We handle build, integration, training, and measurement. No
            disruption to current operations.
          </p>
        </div>
      </div>

      <div className={`flex flex-col ${panelClass} border-rose-300`}>
        <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-rose-600">
          TOO BROAD RIGHT NOW
        </p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-slate-950">
          10X EMPIRE - {fmtCurrency(PLAN_B_MONTHLY)}/mo
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          This is not the wrong offer forever. It is just too broad for this
          team shape. Start with one focused system and expand only after the
          first measured win is live.
        </p>
        <div className="mt-6 space-y-4 border-t border-[var(--line)] pt-5">
          <StatRow label="ROI" value={fmtX(results.planB.roi)} />
          <StatRow
            label="Payback"
            value={`${results.planB.monthsToPayback} months`}
          />
          <StatRow
            label="Annual productivity value"
            value={fmtCurrency(results.planB.annualValue)}
          />
          <StatRow
            label="Investment"
            value={`${fmtCurrency(PLAN_B_ANNUAL)}/yr`}
          />
        </div>
      </div>
    </div>
  );
}

function RouteKpiPanel({
  results,
}: {
  results: Results;
}) {
  const playbook = LEAN_TEAM_PLAYBOOKS[results.bottleneck];
  const industryKey = getIndustryKeyFromLabel(results.industryLabel);

  if (results.route === "transformation_office") {
    const overlayKpis = TRANSFORMATION_OVERLAYS[industryKey] ?? [];
    return (
      <div className={`mt-8 ${panelClass}`}>
        <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]">
          ENTERPRISE KPI OVERLAY
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          At your scale, the value story is operating leverage: margin
          expansion, cost-to-serve reduction, cycle-time compression, and
          governance that survives audit.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRANSFORMATION_KPIS.map((kpi) => (
            <div key={kpi} className={cardClass}>
              <p className="text-sm text-slate-700">{kpi}</p>
            </div>
          ))}
        </div>
        {overlayKpis.length > 0 ? (
          <div className="mt-5">
            <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Industry resonance
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {overlayKpis.map((kpi) => (
                <div key={kpi} className={cardClass}>
                  <p className="text-sm text-slate-700">{kpi}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (results.route === "constraint_sprint") {
    const overlayKpis = playbook.industryKpis?.[industryKey] ?? [];

    return (
      <div className={`mt-8 ${panelClass}`}>
        <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]">
          BOTTLENECK KPI OVERLAY
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {BOTTLENECKS[results.bottleneck].studyDetail}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playbook.baseKpis.map((kpi) => (
            <div key={kpi} className={cardClass}>
              <p className="text-sm text-slate-700">{kpi}</p>
            </div>
          ))}
        </div>
        {overlayKpis.length > 0 ? (
          <div className="mt-5">
            <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Industry resonance
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {overlayKpis.map((kpi) => (
                <div key={kpi} className={cardClass}>
                  <p className="text-sm text-slate-700">{kpi}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (results.route === "not_now") {
    return (
      <div className={`mt-8 ${panelClass}`}>
        <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]">
          READINESS GUIDANCE
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          This does not mean the company is bad. It means the next best move is
          clarifying one workflow, one owner, and one measurable outcome before
          you buy a retained program.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {NOT_NOW_STEPS.map((step) => (
            <div key={step} className={cardClass}>
              <p className="text-sm leading-relaxed text-slate-700">{step}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-8 ${panelClass}`}>
      <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]">
        MEASURED ENTRY KPIS
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        The economics support a start. The right move is a measured entry point
        with clear payback, adoption, and workflow visibility.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STANDARD_KPIS.map((kpi) => (
          <div key={kpi} className={cardClass}>
            <p className="text-sm text-slate-700">{kpi}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScenarioComparison({
  inputs,
}: {
  inputs: Inputs;
}) {
  const allScenarioIds: ScenarioId[] = ["lower", "mid", "upper"];
  const allResults = allScenarioIds.map((scenarioId) => ({
    id: scenarioId,
    scenario: SCENARIOS[scenarioId],
    results: calculate(inputs, scenarioId),
  }));

  return (
    <div className={`mt-8 ${panelClass}`}>
      <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
        ROI ACROSS ALL THREE RESEARCH SCENARIOS
      </p>
      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <p className="text-sm font-semibold text-slate-950">Plan A / focused entry</p>
        <div className="mt-3 grid grid-cols-4 gap-3 text-center">
          <div />
          {allResults.map(({ id, scenario }) => (
            <div
              key={id}
              className={`font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.1em] ${id === "mid" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
            >
              {scenario.label}
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-3 text-sm">
          <div className="text-slate-600">Gain / worker</div>
          {allResults.map(({ id, results }) => (
            <div
              key={id}
              className={`text-center font-['IBM_Plex_Mono'] ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}
            >
              {fmtPct(results.planA.gainPct)}
            </div>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-3 text-sm">
          <div className="text-slate-600">Annual value</div>
          {allResults.map(({ id, results }) => (
            <div
              key={id}
              className={`text-center font-['IBM_Plex_Mono'] ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}
            >
              {fmtCurrency(results.planA.annualValue)}
            </div>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-3 text-sm">
          <div className="text-slate-600">Payback</div>
          {allResults.map(({ id, results }) => (
            <div
              key={id}
              className={`text-center font-['IBM_Plex_Mono'] ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}
            >
              {results.constraintEconomics.monthsToPayback} mo
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--line)] pt-4">
        <p className="text-sm font-semibold text-slate-950">Plan B / scale-up</p>
        <div className="mt-3 grid grid-cols-4 gap-3 text-center">
          <div />
          {allResults.map(({ id, scenario }) => (
            <div
              key={id}
              className={`font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.1em] ${id === "mid" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
            >
              {scenario.label}
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-3 text-sm">
          <div className="text-slate-600">ROI</div>
          {allResults.map(({ id, results }) => (
            <div
              key={id}
              className={`text-center font-['IBM_Plex_Mono'] ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}
            >
              {fmtX(results.planB.roi)}
            </div>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-3 text-sm">
          <div className="text-slate-600">Payback</div>
          {allResults.map(({ id, results }) => (
            <div
              key={id}
              className={`text-center font-['IBM_Plex_Mono'] ${id === "mid" ? "text-slate-950" : "text-slate-500"}`}
            >
              {results.planB.monthsToPayback} mo
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Methodology({
  results,
  inputs,
  scenario,
}: {
  results: Results;
  inputs: Inputs;
  scenario: Scenario;
}) {
  const opportunityAnnual = results.route === "constraint_sprint"
    ? results.constraintEconomics.combinedAnnualValue
    : results.planA.annualValue;

  return (
    <div className="mt-10">
      <Expandable title="How we calculated this - full methodology">
        <div className="space-y-4 text-sm leading-relaxed text-slate-700">
          <div>
            <p className="font-medium text-slate-950">Step 1: Knowledge workers</p>
            <p>
              {results.employees.toLocaleString("en-US")} employees x{" "}
              {inputs.knowledgeWorkerPct}% ={" "}
              {results.knowledgeWorkers.toLocaleString("en-US")} knowledge workers
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-950">Step 2: Affected workers</p>
            <p>
              Plan A: {results.knowledgeWorkers.toLocaleString("en-US")} x 25% ={" "}
              {results.planA.affectedWorkers} workers
            </p>
            <p>
              Plan B: {results.knowledgeWorkers.toLocaleString("en-US")} x 40% ={" "}
              {results.planB.affectedWorkers} workers
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-950">
              Step 3: Productivity gain per worker
            </p>
            <p>
              Plan A: {fmtPct(results.planA.gainPct)} per affected worker (
              {scenario.source})
            </p>
            <p>
              Plan B: {fmtPct(results.planB.gainPct)} per affected worker (custom
              systems modeled as deeper gains than off-the-shelf tools)
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-950">Step 4: Equivalent FTEs</p>
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
            <p className="font-medium text-slate-950">Step 5: Annual value</p>
            <p>
              Equivalent FTEs x {fmtCurrency(results.fullyLoadedCost)} fully-loaded
              cost per {results.industryLabel} knowledge worker
            </p>
          </div>
          {results.route === "constraint_sprint" ? (
            <div>
              <p className="font-medium text-slate-950">
                Constraint Sprint no-double-counting rule
              </p>
              <p>
                Capacity value = max(productivity value, hire deferral value).
                Combined annual value = capacity value + conditional revenue
                leverage.
              </p>
              <p>
                Combined annual value: {fmtCurrency(results.constraintEconomics.combinedAnnualValue)}
              </p>
            </div>
          ) : null}
          <div>
            <p className="font-medium text-slate-950">Step 6: Opportunity cost</p>
            <p>
              Annual opportunity cost: {fmtCurrency(opportunityAnnual)}. Quarterly
              opportunity cost: {fmtCurrency(opportunityAnnual / 4)}.
            </p>
          </div>
        </div>
      </Expandable>
    </div>
  );
}

export default function RoiCalculatorApp() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [inputs, setInputs] = useState<Inputs>({
    revenue: "",
    employees: "",
    industry: "saas",
    knowledgeWorkerPct: INDUSTRIES.saas.knowledgeWorkerPct,
    currentAiSpend: "",
    plannedHires: "",
    bottleneck: "engineering",
    situationIntent: "",
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

  function handleCalculate() {
    const nextResults = calculate(inputs, scenario);
    setResults(nextResults);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }

  const selectedScenario = SCENARIOS[scenario];
  const canSubmit =
    Number.parseInt(inputs.revenue, 10) > 0 &&
    Number.parseInt(inputs.employees, 10) > 0;

  const cta = results ? getRouteCta(results) : null;
  const handoffHref = results && cta
    ? buildWaitlistHref(cta.path, buildWaitlistContext(results, scenario))
    : null;
  const opportunityAnnual = results
    ? results.route === "constraint_sprint"
      ? results.constraintEconomics.combinedAnnualValue
      : results.planA.annualValue
    : 0;
  const industryKey =
    results ? getIndustryKeyFromLabel(results.industryLabel) : "other";

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0))]" />
      <WarpedGrid />

      <main className="relative mx-auto w-full max-w-[1240px] px-6 pb-20 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <div className="sticky top-0 z-50 -mx-6 px-6 py-4 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
          <SiteHeader
            applyHref={results ? "#next-step" : "#scan"}
            founderLinkedIn={LINKEDIN_PROFILE}
            homeHref="/"
            whatWeDoHref="/how-we-work/"
          />
        </div>

        <section className="reveal py-14 sm:py-16">
          <p className={sectionLabelClass}>AI ROI CALCULATOR</p>
          <h1 className="mt-6 max-w-[18ch] text-4xl font-semibold leading-[1.01] tracking-[-0.04em] [text-wrap:balance] sm:text-5xl lg:text-[4rem]">
            What the research says about AI ROI at your company size.
          </h1>
          <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-slate-700">
            Same calculator inputs, different interpretation. The model keeps
            the research transparency while detecting whether you are a
            Transformation Office fit, a Constraint Sprint fit, or simply not
            ready for a broader program yet.
          </p>
        </section>

        <section className="reveal section-divider-full py-14 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className={`lg:col-span-7 ${panelClass}`}>
              <p className={sectionLabelClass}>YOUR COMPANY</p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-800">
                  Annual revenue
                  <input
                    className={inputClass}
                    value={inputs.revenue ? `$${fmtInput(Number(inputs.revenue))}` : ""}
                    onChange={(event) =>
                      updateField("revenue", event.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="$250,000,000"
                    inputMode="numeric"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-800">
                  Number of employees
                  <input
                    className={inputClass}
                    value={inputs.employees ? fmtInput(Number(inputs.employees)) : ""}
                    onChange={(event) =>
                      updateField("employees", event.target.value.replace(/[^0-9]/g, ""))
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
                  onChange={(event) => updateField("industry", event.target.value)}
                >
                  {(Object.entries(INDUSTRIES) as [IndustryKey, typeof INDUSTRIES[IndustryKey]][]).map(
                    ([key, industry]) => (
                      <option key={key} value={key}>
                        {industry.label}
                      </option>
                    ),
                  )}
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
                    onChange={(event) =>
                      updateField("knowledgeWorkerPct", Number(event.target.value))
                    }
                    className="flex-1"
                  />
                  <span className="w-12 font-['IBM_Plex_Mono'] text-sm font-medium text-slate-950">
                    {inputs.knowledgeWorkerPct}%
                  </span>
                </div>
                <p className={statExplainClass}>
                  Pre-filled using our default planning estimate for{" "}
                  {INDUSTRIES[inputs.industry].label}. Adjust if you know your
                  actual mix.
                </p>
              </label>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-800">
                  Planned hires next 12 months{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                  <input
                    className={inputClass}
                    value={inputs.plannedHires ? fmtInput(Number(inputs.plannedHires)) : ""}
                    onChange={(event) =>
                      updateField("plannedHires", event.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="20"
                    inputMode="numeric"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-800">
                  Primary growth bottleneck
                  <select
                    className={`${inputClass} cursor-pointer`}
                    value={inputs.bottleneck}
                    onChange={(event) =>
                      updateField("bottleneck", event.target.value as BottleneckKey)
                    }
                  >
                    {(Object.entries(BOTTLENECKS) as [BottleneckKey, typeof BOTTLENECKS[BottleneckKey]][]).map(
                      ([key, bottleneck]) => (
                        <option key={key} value={key}>
                          {bottleneck.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <label className="mt-5 block text-sm font-medium text-slate-800">
                Current annual AI spend{" "}
                <span className="font-normal text-slate-400">(optional)</span>
                <input
                  className={inputClass}
                  value={inputs.currentAiSpend ? `$${fmtInput(Number(inputs.currentAiSpend))}` : ""}
                  onChange={(event) =>
                    updateField("currentAiSpend", event.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="$200,000"
                  inputMode="numeric"
                />
              </label>

              <label className="mt-5 block text-sm font-medium text-slate-800">
                What best describes your situation?{" "}
                <span className="font-normal text-slate-400">(optional)</span>
                <select
                  className={`${inputClass} cursor-pointer`}
                  value={inputs.situationIntent}
                  onChange={(event) =>
                    updateField("situationIntent", event.target.value)
                  }
                >
                  <option value="">Let the calculator detect it silently</option>
                  {SITUATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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

            <div className={`lg:col-span-5 ${panelClass} flex flex-col`}>
              <p className={sectionLabelClass}>RESEARCH SCENARIO</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Choose which documented research results to use for productivity
                gain estimates. The calculator preserves this scenario through
                the route recommendation and diagnostic handoff.
              </p>

              <div className="mt-6 space-y-3">
                {(Object.entries(SCENARIOS) as [ScenarioId, Scenario][]).map(
                  ([scenarioId, nextScenario]) => (
                    <button
                      key={scenarioId}
                      type="button"
                      onClick={() => setScenario(scenarioId)}
                      className={`w-full text-left ${cardClass} transition-[border-color,box-shadow] duration-200 ${
                        scenario === scenarioId
                          ? "border-[var(--accent)] shadow-[var(--shadow-panel)]"
                          : "hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-950">
                          {nextScenario.label}
                        </p>
                        {scenarioId === "mid" ? (
                          <span className="bg-[var(--accent)] px-2 py-0.5 font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.14em] text-white">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 font-['IBM_Plex_Mono'] text-[11px] text-[var(--muted)]">
                        {nextScenario.sublabel}
                      </p>
                      <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                        {nextScenario.sourceDetail}
                      </p>
                    </button>
                  ),
                )}
              </div>

              <p className="mt-auto pt-5 text-[11px] leading-relaxed text-slate-400">
                Reach percentages remain visible assumptions: 25% for a
                measured entry, 40% for a broader custom-system rollout.
              </p>
            </div>
          </div>
        </section>

        {results ? (
          <section
            ref={resultsRef}
            className="reveal section-divider-full py-14 sm:py-16"
          >
            <p className={sectionLabelClass}>YOUR RESULTS</p>
            <h2 className={sectionHeadingClass}>
              {getRouteHeadline(results.route, results)}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Based on {selectedScenario.label.toLowerCase()} research data. Source:{" "}
              {selectedScenario.source}
            </p>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
              <span>
                Route:{" "}
                <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                  {getPublicRouteLabel(results.route)}
                </span>
              </span>
              <span>
                Plan A cost as % of revenue:{" "}
                <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                  {((PLAN_A_ANNUAL / results.revenue) * 100).toFixed(2)}%
                </span>
              </span>
              <span>
                Plan B cost as % of revenue:{" "}
                <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                  {((PLAN_B_ANNUAL / results.revenue) * 100).toFixed(2)}%
                </span>
              </span>
              <span>
                Revenue per employee:{" "}
                <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                  {fmtCurrency(results.revenuePerEmployee)}
                </span>
              </span>
            </div>

            <RouteInsightPanel
              results={results}
              situationIntent={inputs.situationIntent}
            />

            {results.route === "constraint_sprint" ? (
              <ConstraintSprintCards results={results} />
            ) : (
              <div className="mt-10 grid gap-6 lg:grid-cols-2">
                <PlanCard
                  eyebrow={results.route === "transformation_office"
                    ? `FOUNDATION LANE - PORTFOLIO FOUNDATION - ${fmtCurrency(PLAN_A_MONTHLY)}/mo`
                    : `START HERE - MEASURED ENTRY - ${fmtCurrency(PLAN_A_MONTHLY)}/mo`}
                  title={results.route === "transformation_office"
                    ? "Portfolio Foundation"
                    : "Measured Entry"}
                  result={results.planA}
                  startHere={results.route === "transformation_office"
                    ? undefined
                    : "Recommended entry"}
                  description={
                    results.route === "transformation_office"
                      ? "Build the governance baseline, portfolio controls, and the first production wins."
                      : results.route === "not_now"
                        ? "Transparent math for a larger entry point. Use it as a reference, not the immediate recommendation."
                        : "A measured entry point that keeps the economics visible while avoiding decision paralysis."
                  }
                  emphasis={results.route === "transformation_office"
                    ? "secondary"
                    : results.route === "not_now"
                      ? "warning"
                      : "primary"}
                />
                <PlanCard
                  eyebrow={results.route === "transformation_office"
                    ? `PRIMARY RECOMMENDATION - TRANSFORMATION OFFICE - ${fmtCurrency(PLAN_B_MONTHLY)}/mo`
                    : `SCALE UP - BROADER CUSTOM SYSTEMS - ${fmtCurrency(PLAN_B_MONTHLY)}/mo`}
                  title={results.route === "transformation_office"
                    ? "Enterprise Transformation Office"
                    : "Broader Custom Systems"}
                  result={results.planB}
                  startHere={results.route === "transformation_office"
                    ? "Primary recommendation"
                    : undefined}
                  description={
                    results.route === "transformation_office"
                      ? "Run the executive cadence, portfolio governance, and cross-functional implementation office."
                      : "A broader roll-out once the first measured lane is working and the organization is ready for more change."
                  }
                  emphasis={results.route === "transformation_office" ? "primary" : "secondary"}
                />
              </div>
            )}

            {cta && handoffHref ? (
              <ResultsNextStepCard
                results={results}
                cta={cta}
                handoffHref={handoffHref}
                selectedScenario={selectedScenario}
                industryKey={industryKey}
              />
            ) : null}

            <div className="mt-8">
              <Expandable title="Supporting math, scenario comparison, and KPI overlays">
                <ScenarioComparison inputs={inputs} />

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className={cardClass}>
                    <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      COST OF DOING NOTHING
                    </p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-700">Annual opportunity cost</span>
                        <span className="font-['IBM_Plex_Mono'] font-medium text-rose-500">
                          -{fmtCurrency(opportunityAnnual)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-700">Quarterly opportunity cost</span>
                        <span className="font-['IBM_Plex_Mono'] font-medium text-rose-500">
                          -{fmtCurrency(opportunityAnnual / 4)}
                        </span>
                      </div>
                      {results.currentAiSpend > 0 ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            Current AI spend without clear ROI
                          </span>
                          <span className="font-['IBM_Plex_Mono'] font-medium text-rose-500">
                            -{fmtCurrency(results.currentAiSpend)}/yr
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <p className={`mt-3 ${statExplainClass}`}>
                      Every quarter you wait, you forgo measurable value and widen
                      the gap with teams that moved earlier with cleaner workflow
                      design and governance.
                    </p>
                  </div>

                  <div className={cardClass}>
                    <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      ALTERNATIVE: BUILD IN-HOUSE
                    </p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-700">Chief AI Officer hire</span>
                        <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                          {fmtCurrency(CAIO_ANNUAL)}/yr
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-700">
                          AI engineers ({PLAN_B_EQUIV_ENGINEERS} people)
                        </span>
                        <span className="font-['IBM_Plex_Mono'] font-medium text-slate-950">
                          {fmtCurrency(PLAN_B_EQUIV_ENGINEERS * AI_ENGINEER_ANNUAL)}/yr
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-dashed border-[var(--line)] pt-2 text-sm">
                        <span className="font-medium text-slate-950">
                          Total annual cost
                        </span>
                        <span className="font-['IBM_Plex_Mono'] font-semibold text-slate-950">
                          {fmtCurrency(results.buildInHouseB)}/yr
                        </span>
                      </div>
                    </div>
                    <p className={`mt-3 ${statExplainClass}`}>
                      Plus hiring time before any output. This comparison is
                      directional, but it keeps the alternative honest.
                    </p>
                  </div>
                </div>

                <RouteKpiPanel results={results} />

                {results.route === "constraint_sprint" ? (
                  <div className={`mt-8 ${panelClass}`}>
                    <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]">
                      TEAM-SHAPE FIT
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">
                      Plan B stays visible for transparency, but the right move is a
                      focused system for the {BOTTLENECKS[results.bottleneck].label.toLowerCase()} bottleneck.
                      The broad program is intentionally de-emphasized until the
                      first workflow win is in production.
                    </p>
                  </div>
                ) : null}
              </Expandable>
            </div>

            <Methodology
              results={results}
              inputs={inputs}
              scenario={selectedScenario}
            />
          </section>
        ) : null}

        <section className="reveal section-divider-full py-14 sm:py-16">
          <p className={sectionLabelClass}>RESEARCH & SOURCES</p>
          <h2 className={sectionHeadingClass}>
            Every number traces to a published study.
          </h2>
          <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-slate-700">
            {TIER1_SOURCES.length + TIER2_SOURCES.length} sources from Harvard,
            Stanford, MIT, BCG, McKinsey, Anthropic, Gartner, Deloitte, PwC,
            and more. All publicly available.
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

        <section className="reveal section-divider-full py-10">
          <div className={`${cardClass} border-slate-200 bg-slate-50`}>
            <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              IMPORTANT DISCLAIMER
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              All calculations use publicly available research data from
              credible, peer-reviewed, or industry-published sources. Results
              are estimates based on documented study outcomes and planning
              assumptions. Actual results depend on workflow design, adoption,
              implementation quality, and company-specific constraints.
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              Last updated: March 2026. Sources are refreshed quarterly.
            </p>
          </div>
        </section>

        {!results ? (
          <section id="scan" className="reveal py-14 sm:py-16">
            <div className="space-y-10">
              <div className="mx-auto max-w-3xl text-center">
                <p className={sectionLabelClass}>NEXT STEP</p>
                <h2 className="mt-4 text-2xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-3xl">
                  Want your exact numbers?
                </h2>
                <p className="mx-auto mt-5 max-w-[48ch] text-base leading-relaxed text-slate-600">
                  If you want to talk before using the calculator, you can still
                  apply directly below. Once you calculate, the recommendation
                  becomes route-aware and carries the math into the next page.
                </p>
              </div>
              <WaitlistForm />
            </div>
          </section>
        ) : null}

        <footer className="reveal mt-4 flex flex-col gap-4 border-t-[3px] border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={`mailto:${PRIMARY_EMAIL}`}
            className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
          >
            {PRIMARY_EMAIL}
          </a>
          <p className="text-sm text-slate-600">
            Calculator routes are transparent. Recommendations remain estimates
            until confirmed in a diagnostic.
          </p>
        </footer>
      </main>
    </div>
  );
}
