import type {
  RouteId,
  ScenarioId,
  WaitlistContext,
} from "./roi-calculator";

function toNumber(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toRouteId(value: string | null): RouteId | null {
  if (
    value === "transformation_office" ||
    value === "constraint_sprint" ||
    value === "standard" ||
    value === "not_now"
  ) {
    return value;
  }
  return null;
}

function toScenarioId(value: string | null): ScenarioId | null {
  if (value === "lower" || value === "mid" || value === "upper") {
    return value;
  }
  return null;
}

export function buildWaitlistQuery(context: WaitlistContext): URLSearchParams {
  const params = new URLSearchParams();
  params.set("route", context.route);
  params.set("offer", context.recommendedOffer);
  params.set("reason", context.recommendationReason);
  params.set("scenario", context.scenario);
  params.set("revenue", String(context.revenue));
  params.set("employees", String(context.employees));
  params.set("industry", context.industry);
  params.set("bottleneck", context.bottleneck);
  params.set("rpe", String(context.revenuePerEmployee));
  params.set("aiSpend", String(context.currentAiSpend));
  params.set("plannedHires", String(context.plannedHires));
  params.set("planARoi", String(context.planARoi));
  params.set("planAPayback", String(context.planAPayback));
  params.set("planAAnnualValue", String(context.planAAnnualValue));
  if (typeof context.planBRoi === "number") {
    params.set("planBRoi", String(context.planBRoi));
  }
  return params;
}

export function buildWaitlistHref(
  path: string,
  context: WaitlistContext,
): string {
  const query = buildWaitlistQuery(context).toString();
  return query ? `${path}?${query}` : path;
}

export function parseWaitlistContext(
  searchParams: URLSearchParams,
): WaitlistContext | undefined {
  const route = toRouteId(searchParams.get("route"));
  const scenario = toScenarioId(searchParams.get("scenario"));
  const offer = searchParams.get("offer");
  const reason = searchParams.get("reason");
  const industry = searchParams.get("industry");
  const bottleneck = searchParams.get("bottleneck");

  if (!route || !scenario || !offer || !reason || !industry || !bottleneck) {
    return undefined;
  }

  return {
    route,
    recommendedOffer: offer,
    recommendationReason: reason,
    scenario,
    revenue: toNumber(searchParams.get("revenue")),
    employees: toNumber(searchParams.get("employees")),
    industry,
    bottleneck,
    revenuePerEmployee: toNumber(searchParams.get("rpe")),
    currentAiSpend: toNumber(searchParams.get("aiSpend")),
    plannedHires: toNumber(searchParams.get("plannedHires")),
    planARoi: toNumber(searchParams.get("planARoi")),
    planAPayback: toNumber(searchParams.get("planAPayback")),
    planAAnnualValue: toNumber(searchParams.get("planAAnnualValue")),
    planBRoi: searchParams.has("planBRoi")
      ? toNumber(searchParams.get("planBRoi"))
      : undefined,
  };
}
