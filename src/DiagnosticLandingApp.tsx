import SiteHeader from "./components/SiteHeader";
import WaitlistForm from "./components/WaitlistForm";
import WarpedGrid from "./components/WarpedGrid";
import { parseWaitlistContext } from "./lib/waitlist-context";
import {
  fmtCurrency,
  fmtX,
  getPublicRouteLabel,
  type RouteId,
  type WaitlistContext,
} from "./lib/roi-calculator";

const PRIMARY_EMAIL = "mirza@10x.ai";
const LINKEDIN_PROFILE = "https://www.linkedin.com/in/mirzaasceric/";
const surfaceClass = "border border-[var(--line)] bg-[var(--surface)]";
const panelClass = `premium-panel ${surfaceClass} p-6`;
const sectionLabelClass =
  "inline-flex w-fit items-center bg-white px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]";
const sectionHeadingClass =
  "mt-4 max-w-[16ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl";
const metaChipClass =
  "inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]";

type DiagnosticVariant = "portfolio" | "operational" | "readiness";

type LandingCopy = {
  eyebrow: string;
  heading: string;
  body: string;
  formHeading: string;
  formSubheading: string;
  ctaLabel: string;
  chips: string[];
  route: RouteId;
};

function getLandingCopy(variant: DiagnosticVariant): LandingCopy {
  if (variant === "portfolio") {
    return {
      eyebrow: "AI PORTFOLIO REALITY SCAN",
      heading: "Board-ready AI portfolio baseline and first scale-or-kill decisions.",
      body:
        "This diagnostic is for companies that already have scale, AI activity, or governance pressure and need a disciplined operating model instead of more pilot sprawl.",
      formHeading:
        "Want a board-ready view of which AI initiatives should scale, stop, or be governed first?",
      formSubheading:
        "Tell us what is happening with AI in the business. We use your calculator context as a starting point and turn it into a portfolio baseline, governance charter, and first set of scale-or-kill decisions.",
      ctaLabel: "Apply for the AI Portfolio Reality Scan",
      chips: [
        "2-3 week diagnostic",
        "Board-ready baseline",
        "Governance + prioritization",
      ],
      route: "transformation_office",
    };
  }

  if (variant === "operational") {
    return {
      eyebrow: "OPERATIONAL DIAGNOSTIC",
      heading: "Scope one bottleneck, one metric, and one production system that moves the needle.",
      body:
        "This diagnostic is for teams that do not need a transformation office yet. The goal is one measurable operational win, not a broad rollout.",
      formHeading:
        "Want us to scope the one AI system that actually moves the needle?",
      formSubheading:
        "We use your calculator inputs to focus on one workflow, one owner, and the first measurable production system before you commit to broader implementation.",
      ctaLabel: "Apply for the Operational Diagnostic",
      chips: [
        "1-2 workflow scope",
        "Measured quick-win path",
        "90-day production target",
      ],
      route: "constraint_sprint",
    };
  }

  return {
    eyebrow: "READINESS DIAGNOSTIC",
    heading: "Clarify the first workflow worth measuring before you buy a bigger AI program.",
    body:
      "This path is for companies where the immediate blocker is readiness: unclear ownership, weak workflow definition, or no agreed measurable outcome yet.",
    formHeading: "Want help identifying the first workflow worth measuring?",
    formSubheading:
      "We use your calculator context to define one owner, one workflow, and one measurable outcome so the economics become actionable instead of staying theoretical.",
    ctaLabel: "Request the readiness diagnostic",
    chips: [
      "Readiness-first",
      "Workflow + owner clarity",
      "No broad program pressure",
    ],
    route: "not_now",
  };
}

function getContextFromLocation(): WaitlistContext | undefined {
  if (typeof window === "undefined") return undefined;
  return parseWaitlistContext(new URLSearchParams(window.location.search));
}

export default function DiagnosticLandingApp({
  variant,
}: {
  variant: DiagnosticVariant;
}) {
  const copy = getLandingCopy(variant);
  const context = getContextFromLocation();

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0))]" />
      <WarpedGrid />

      <main className="relative mx-auto w-full max-w-[1240px] px-6 pb-20 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <div className="sticky top-0 z-50 -mx-6 px-6 py-4 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
          <SiteHeader
            applyHref="#apply"
            founderLinkedIn={LINKEDIN_PROFILE}
            homeHref="/"
            whatWeDoHref="/how-we-work/"
          />
        </div>

        <section className="reveal py-14 sm:py-16">
          <p className={sectionLabelClass}>{copy.eyebrow}</p>
          <h1 className={sectionHeadingClass}>{copy.heading}</h1>
          <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-slate-700">
            {copy.body}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {copy.chips.map((chip) => (
              <span key={chip} className={metaChipClass}>
                {chip}
              </span>
            ))}
          </div>
        </section>

        <section className="reveal section-divider-full py-14 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className={`lg:col-span-7 ${panelClass}`}>
              <p className={sectionLabelClass}>WHY THIS PATH</p>
              <h2 className="mt-4 max-w-[20ch] text-2xl font-semibold leading-[1.08] tracking-[-0.02em] text-slate-950 sm:text-3xl">
                {context ? context.recommendedOffer : copy.formHeading}
              </h2>
              <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-slate-700">
                {context
                  ? context.recommendationReason
                  : copy.formSubheading}
              </p>
            </div>

            <aside className={`lg:col-span-5 ${panelClass}`}>
              <p className={sectionLabelClass}>WHAT WE USE</p>
              <div className="mt-5 space-y-4 text-sm text-slate-700">
                <div className="flex items-start justify-between gap-4">
                  <span>Calculator route</span>
                  <span className="font-['IBM_Plex_Mono'] text-slate-950">
                    {getPublicRouteLabel(context?.route ?? copy.route)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Recommended offer</span>
                  <span className="font-['IBM_Plex_Mono'] text-right text-slate-950">
                    {context?.recommendedOffer ?? copy.formHeading}
                  </span>
                </div>
                {context ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <span>Revenue per employee</span>
                      <span className="font-['IBM_Plex_Mono'] text-slate-950">
                        {fmtCurrency(context.revenuePerEmployee)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>Plan A payback</span>
                      <span className="font-['IBM_Plex_Mono'] text-slate-950">
                        {context.planAPayback} months
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>Plan A ROI</span>
                      <span className="font-['IBM_Plex_Mono'] text-slate-950">
                        {fmtX(context.planARoi)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="leading-relaxed text-slate-600">
                    If you landed here directly, use the form below. If you came
                    from the calculator, we preserve the recommendation and the
                    key economics in the draft automatically.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </section>

        {context ? (
          <section className="reveal section-divider-full py-14 sm:py-16">
            <div className={`max-w-4xl ${panelClass}`}>
              <p className={sectionLabelClass}>CALCULATOR CONTEXT</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Revenue
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {fmtCurrency(context.revenue)}
                  </p>
                </div>
                <div>
                  <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Employees
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {context.employees.toLocaleString("en-US")}
                  </p>
                </div>
                <div>
                  <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Industry
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {context.industry}
                  </p>
                </div>
                <div>
                  <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Bottleneck
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {context.bottleneck}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section id="apply" className="reveal py-14 sm:py-16">
          <WaitlistForm
            heading={copy.formHeading}
            subheading={copy.formSubheading}
            ctaLabel={copy.ctaLabel}
            context={context}
          />
        </section>

        <footer className="reveal mt-4 flex flex-col gap-4 border-t-[3px] border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={`mailto:${PRIMARY_EMAIL}`}
            className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
          >
            {PRIMARY_EMAIL}
          </a>
          <p className="text-sm text-slate-600">
            Diagnostic applications are reviewed manually. Route context from
            the calculator is preserved when available.
          </p>
        </footer>
      </main>
    </div>
  );
}
