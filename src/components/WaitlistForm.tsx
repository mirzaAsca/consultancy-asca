import { useCallback, useState, type FormEvent } from "react";
import { submitFormToInbox, type FormSubmitStatus } from "../lib/formsubmit";
import type { WaitlistContext } from "../lib/roi-calculator";
import { fmtCurrency, fmtX, getPublicRouteLabel } from "../lib/roi-calculator";

const PRIMARY_EMAIL = "mirza@10x.ai";
const DEFAULT_HEADING = "TELL US WHAT'S BROKEN";
const DEFAULT_SUBHEADING =
  "Tell us about your company and the workflow that's costing you the most time. We'll review your submission and reach out when a spot opens.";
const DEFAULT_CTA = "Join the Waitlist";

const primaryButtonClass =
  "inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2";
const formSectionLabelClass =
  "inline-flex w-fit items-center bg-[var(--bg)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]";

type Field =
  | "fullName"
  | "linkedIn"
  | "workEmail"
  | "company"
  | "website"
  | "aiBudget"
  | "employees"
  | "reason";

type FormState = Record<Field, string>;
type ErrorState = Partial<Record<Field, string>>;

export type WaitlistFormProps = {
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  context?: WaitlistContext;
};

type SubmitUiState = FormSubmitStatus | "idle" | "submitting";

const initialFormState: FormState = {
  fullName: "",
  linkedIn: "",
  workEmail: "",
  company: "",
  website: "",
  aiBudget: "",
  employees: "",
  reason: "",
};

function getSectionLabel(heading: string, context?: WaitlistContext): string {
  if (context) {
    return `${context.recommendedOffer.toUpperCase()} APPLICATION`;
  }
  if (heading !== DEFAULT_HEADING) {
    return "RECOMMENDED NEXT STEP";
  }
  return DEFAULT_HEADING;
}

function buildSubjectLine(form: FormState, context?: WaitlistContext): string {
  void context;
  return `[FORM] - Asca 10x.ai - ${form.company} - ${form.fullName}`;
}

function buildSubmissionFields(
  form: FormState,
  context?: WaitlistContext,
): Record<string, string> {
  const fields: Record<string, string> = {
    _subject: buildSubjectLine(form, context),
    name: form.fullName,
    email: form.workEmail,
    Company: form.company,
    Employees: form.employees,
    Website: form.website,
    LinkedIn: form.linkedIn,
    "AI budget": form.aiBudget,
    "Primary workflow bottleneck": form.reason,
  };

  if (context) {
    fields.Route = getPublicRouteLabel(context.route);
    fields["Recommended offer"] = context.recommendedOffer;
    fields["Why this route"] = context.recommendationReason;
    fields.Scenario = context.scenario;
    fields.Revenue = String(context.revenue);
    fields["Company employees"] = String(context.employees);
    fields.Industry = context.industry;
    fields["Primary bottleneck"] = context.bottleneck;
    fields["Revenue per employee"] = String(context.revenuePerEmployee);
    fields["Current AI spend"] = String(context.currentAiSpend);
    fields["Planned hires"] = String(context.plannedHires);
    fields["Plan A ROI"] = String(context.planARoi);
    fields["Plan A payback"] = String(context.planAPayback);
    fields["Plan A annual value"] = String(context.planAAnnualValue);
    if (typeof context.planBRoi === "number") {
      fields["Plan B ROI"] = String(context.planBRoi);
    }
  }

  return fields;
}

function inputClass(hasError: boolean): string {
  return `mt-1 w-full border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-slate-400 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,41,59,0.06)] ${
    hasError ? "border-rose-500" : "border-[var(--line)]"
  }`;
}

function selectClass(hasError: boolean): string {
  return `w-full appearance-none border bg-white px-3 py-2.5 pr-11 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(30,41,59,0.06)] ${
    hasError ? "border-rose-500" : "border-[var(--line)]"
  }`;
}

export default function WaitlistForm({
  heading = DEFAULT_HEADING,
  subheading = DEFAULT_SUBHEADING,
  ctaLabel = DEFAULT_CTA,
  context,
}: WaitlistFormProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<ErrorState>({});
  const [submitState, setSubmitState] = useState<SubmitUiState>("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  const updateField = useCallback((field: Field, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    if (submitState === "error") {
      setSubmitState("idle");
      setSubmitMessage("");
    }
  }, [submitState]);

  const requiredFields: Field[] = [
    "fullName",
    "workEmail",
    "company",
    "employees",
    "reason",
  ];

  function validate(nextForm: FormState): ErrorState {
    const nextErrors: ErrorState = {};
    requiredFields.forEach((field) => {
      if (!nextForm[field].trim()) {
        nextErrors[field] = "Required";
      }
    });
    if (
      nextForm.workEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextForm.workEmail)
    ) {
      nextErrors.workEmail = "Enter a valid work email";
    }
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSubmitState("submitting");
    setSubmitMessage("");

    const result = await submitFormToInbox(buildSubmissionFields(form, context));
    setSubmitState(result.status);
    setSubmitMessage(result.message);
  }

  const summaryRows = context
    ? [
        { label: "Recommended offer", value: context.recommendedOffer },
        { label: "Route", value: getPublicRouteLabel(context.route) },
        { label: "Scenario", value: context.scenario },
        { label: "Plan A payback", value: `${context.planAPayback} months` },
        { label: "Plan A ROI", value: fmtX(context.planARoi) },
        {
          label: "Plan A annual value",
          value: fmtCurrency(context.planAAnnualValue),
        },
      ]
    : [];

  return (
    <div className="premium-panel border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={formSectionLabelClass}>
            {getSectionLabel(heading, context)}
          </p>
          <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-slate-600">
            {subheading}
          </p>
        </div>
      </div>

      {context ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summaryRows.map((row) => (
            <div
              key={row.label}
              className="border border-[var(--line)] bg-[rgba(15,23,42,0.02)] p-4"
            >
              <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                {row.label}
              </p>
              <p className="mt-2 text-sm text-slate-900">{row.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-800">
            Your name
            <input
              className={inputClass(Boolean(errors.fullName))}
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              autoComplete="name"
              required
            />
            {errors.fullName ? (
              <span className="text-xs text-rose-500">{errors.fullName}</span>
            ) : null}
          </label>
          <label className="text-sm font-medium text-slate-800">
            Work email
            <input
              className={inputClass(Boolean(errors.workEmail))}
              value={form.workEmail}
              onChange={(event) => updateField("workEmail", event.target.value)}
              type="email"
              autoComplete="email"
              required
            />
            {errors.workEmail ? (
              <span className="text-xs text-rose-500">{errors.workEmail}</span>
            ) : null}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-800">
            Company name
            <input
              className={inputClass(Boolean(errors.company))}
              value={form.company}
              onChange={(event) => updateField("company", event.target.value)}
              autoComplete="organization"
              required
            />
            {errors.company ? (
              <span className="text-xs text-rose-500">{errors.company}</span>
            ) : null}
          </label>
          <label className="text-sm font-medium text-slate-800">
            Number of employees
            <div className="relative mt-1">
              <select
                className={selectClass(Boolean(errors.employees))}
                value={form.employees}
                onChange={(event) =>
                  updateField("employees", event.target.value)
                }
                required
              >
                <option value="">Select</option>
                <option value="1-19">1-19</option>
                <option value="20-50">20-50</option>
                <option value="51-150">51-150</option>
                <option value="151-500">151-500</option>
                <option value="500+">500+</option>
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
            </div>
            {errors.employees ? (
              <span className="text-xs text-rose-500">{errors.employees}</span>
            ) : null}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-slate-800">
            Website
            <span className="ml-1 text-[11px] font-normal text-slate-400">
              (optional)
            </span>
            <input
              className={inputClass(false)}
              value={form.website}
              onChange={(event) => updateField("website", event.target.value)}
              placeholder="yourcompany.com"
              autoComplete="url"
            />
          </label>
          <label className="text-sm font-medium text-slate-800">
            LinkedIn
            <span className="ml-1 text-[11px] font-normal text-slate-400">
              (optional)
            </span>
            <input
              className={inputClass(false)}
              value={form.linkedIn}
              onChange={(event) => updateField("linkedIn", event.target.value)}
              placeholder="linkedin.com/in/yourname"
            />
          </label>
          <label className="text-sm font-medium text-slate-800">
            AI budget
            <span className="ml-1 text-[11px] font-normal text-slate-400">
              (optional)
            </span>
            <input
              className={inputClass(false)}
              value={form.aiBudget}
              onChange={(event) => updateField("aiBudget", event.target.value)}
              placeholder="e.g. $10k-25k"
            />
          </label>
        </div>

        <label className="text-sm font-medium text-slate-800">
          What's the one workflow that costs you the most time?
          <textarea
            className={`${inputClass(Boolean(errors.reason))} min-h-[80px] resize-y`}
            value={form.reason}
            onChange={(event) => updateField("reason", event.target.value)}
            rows={3}
            placeholder="e.g. Our invoice processing takes 3 people and 6 hours every day"
            required
          />
          {errors.reason ? (
            <span className="text-xs text-rose-500">{errors.reason}</span>
          ) : null}
        </label>

        <div className="flex flex-col gap-4 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-slate-500 sm:text-left">
            {context
              ? `${context.recommendedOffer} + 40-min strategy call. We keep the recommendation, numbers, and route context in the draft so the next step is specific from the first conversation.`
              : "We'll review your submission and reach out when a spot opens. First come, first served."}
          </p>
          <button
            type="submit"
            disabled={submitState === "submitting"}
            className={`w-full shrink-0 ${primaryButtonClass} sm:w-auto ${
              submitState === "submitting" ? "cursor-wait opacity-70" : ""
            }`}
          >
            {submitState === "submitting" ? "Sending..." : ctaLabel}
          </button>
        </div>

        {submitState === "activation_required" ? (
          <div className="space-y-3 border-t border-[var(--line)] bg-amber-50/70 p-5">
            <h3 className="text-lg font-semibold tracking-[-0.01em] text-slate-950">
              One-time form activation needed
            </h3>
            <p className="text-sm leading-relaxed text-slate-700">
              Form submissions for mirza@flyrank.com need one activation click
              before automatic delivery starts. Check that inbox and confirm the
              form. FormSubmit keeps this submission queued until activation.
            </p>
            <p className="text-sm text-slate-600">{submitMessage}</p>
          </div>
        ) : null}

        {submitState === "sent" ? (
          <div className="space-y-4 border-t border-[var(--line)] pt-5">
            <div className="space-y-4 border border-[var(--line)] bg-[rgba(15,23,42,0.02)] p-5">
              <h3 className="text-lg font-semibold tracking-[-0.01em] text-slate-950">
                Request submitted
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                The form has been sent directly to our inbox. We will review the
                request and reply within 48 hours.
              </p>
              {submitMessage ? (
                <p className="text-sm text-slate-500">{submitMessage}</p>
              ) : null}
              <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                <div className="border border-[var(--line)] bg-white p-4">
                  <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                    Within 48 hours
                  </p>
                  <p className="mt-2">
                    We confirm the next step and review the context.
                  </p>
                </div>
                <div className="border border-[var(--line)] bg-white p-4">
                  <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                    Day 3-5
                  </p>
                  <p className="mt-2">
                    Quick call about your business and workflow priorities.
                  </p>
                </div>
                <div className="border border-[var(--line)] bg-white p-4">
                  <p className="font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                    Day 5-7
                  </p>
                  <p className="mt-2">
                    Recommended path, scope, and action plan.
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                Questions?{" "}
                <a
                  className="font-medium text-slate-900"
                  href={`mailto:${PRIMARY_EMAIL}`}
                >
                  {PRIMARY_EMAIL}
                </a>
              </p>
            </div>
          </div>
        ) : null}

        {submitState === "error" ? (
          <div className="border-t border-[var(--line)] pt-5">
            <div className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {submitMessage}
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
