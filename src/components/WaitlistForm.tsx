import { useState, useCallback } from "react";

const PRIMARY_EMAIL = "mirza@10x.ai";
const PRIMARY_CTA = "Join the Waitlist";

const primaryButtonClass =
  "inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2";
const inversePanelClass =
  "border border-[var(--accent)] bg-[var(--accent)] px-6 py-6 text-slate-100 shadow-[0_18px_38px_rgba(15,23,42,0.12)]";
const inverseSectionLabelClass =
  "inline-flex w-fit items-center bg-[rgba(255,255,255,0.12)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-white";

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

function buildMailto(form: FormState): string {
  const subject = encodeURIComponent(
    `Waitlist + Complimentary AI Portfolio Reality Scan — ${form.company}`,
  );
  const lines = [
    "Waitlist + Complimentary AI Portfolio Reality Scan Request",
    "",
    `Name: ${form.fullName}`,
    `Email: ${form.workEmail}`,
    `Company: ${form.company}`,
    `Employees: ${form.employees}`,
    `Why they need us: ${form.reason}`,
  ];
  if (form.linkedIn.trim()) lines.push(`LinkedIn: ${form.linkedIn}`);
  if (form.website.trim()) lines.push(`Website: ${form.website}`);
  if (form.aiBudget.trim()) lines.push(`AI budget: ${form.aiBudget}`);
  const body = encodeURIComponent(lines.join("\n"));
  return `mailto:${PRIMARY_EMAIL}?subject=${subject}&body=${body}`;
}

function inputClass(hasError: boolean): string {
  return `mt-1 w-full border bg-[rgba(255,255,255,0.08)] px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark] transition-[border-color,box-shadow,background-color] duration-200 caret-white focus:border-white focus:bg-[rgba(255,255,255,0.12)] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] ${
    hasError ? "border-rose-400" : "border-[rgba(255,255,255,0.16)]"
  }`;
}

function selectClass(hasError: boolean): string {
  return `w-full appearance-none border bg-[rgba(255,255,255,0.08)] px-3 py-2.5 pr-11 text-sm text-white outline-none [color-scheme:dark] transition-[border-color,box-shadow,background-color] duration-200 caret-white focus:border-white focus:bg-[rgba(255,255,255,0.12)] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] ${
    hasError ? "border-rose-400" : "border-[rgba(255,255,255,0.16)]"
  }`;
}

export default function WaitlistForm() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<ErrorState>({});
  const [submitted, setSubmitted] = useState(false);

  const updateField = useCallback((field: Field, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const requiredFields: Field[] = ["fullName", "workEmail", "company", "employees", "reason"];

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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    window.location.href = buildMailto(form);
    setSubmitted(true);
  }

  return (
    <div className={inversePanelClass}>
      <div className="flex flex-col gap-3 border-b border-[rgba(255,255,255,0.14)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={inverseSectionLabelClass}>
            WAITLIST + COMPLIMENTARY AI PORTFOLIO REALITY SCAN
          </p>
          <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-slate-100">
            Tell us where you are with AI. We'll show you where the
            money is — and save your spot. Scan valued at $15,000.
          </p>
        </div>
        <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">
          8 fields — that's it
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-100">
            Your name
            <input
              className={inputClass(Boolean(errors.fullName))}
              value={form.fullName}
              onChange={(event) =>
                updateField("fullName", event.target.value)
              }
              autoComplete="name"
              required
            />
            {errors.fullName ? (
              <span className="text-xs text-rose-400">
                {errors.fullName}
              </span>
            ) : null}
          </label>
          <label className="text-sm font-medium text-slate-100">
            Work email
            <input
              className={inputClass(Boolean(errors.workEmail))}
              value={form.workEmail}
              onChange={(event) =>
                updateField("workEmail", event.target.value)
              }
              type="email"
              autoComplete="email"
              required
            />
            {errors.workEmail ? (
              <span className="text-xs text-rose-400">
                {errors.workEmail}
              </span>
            ) : null}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-slate-100">
            Company name
            <input
              className={inputClass(Boolean(errors.company))}
              value={form.company}
              onChange={(event) =>
                updateField("company", event.target.value)
              }
              autoComplete="organization"
              required
            />
            {errors.company ? (
              <span className="text-xs text-rose-400">
                {errors.company}
              </span>
            ) : null}
          </label>
          <label className="text-sm font-medium text-slate-100">
            Website
            <span className="ml-1 text-[11px] font-normal text-slate-400">(optional)</span>
            <input
              className={inputClass(false)}
              value={form.website}
              onChange={(event) =>
                updateField("website", event.target.value)
              }
              placeholder="yourcompany.com"
              autoComplete="url"
            />
          </label>
          <label className="text-sm font-medium text-slate-100">
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
                <option value="1-50">1–50</option>
                <option value="51-200">51–200</option>
                <option value="201-1000">201–1,000</option>
                <option value="1001-3000">1,001–3,000</option>
                <option value="3000+">3,000+</option>
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300"
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
              <span className="text-xs text-rose-400">
                {errors.employees}
              </span>
            ) : null}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-100">
            LinkedIn
            <span className="ml-1 text-[11px] font-normal text-slate-400">(optional)</span>
            <input
              className={inputClass(false)}
              value={form.linkedIn}
              onChange={(event) =>
                updateField("linkedIn", event.target.value)
              }
              placeholder="linkedin.com/in/yourname"
            />
          </label>
          <label className="text-sm font-medium text-slate-100">
            AI budget
            <span className="ml-1 text-[11px] font-normal text-slate-400">(optional)</span>
            <input
              className={inputClass(false)}
              value={form.aiBudget}
              onChange={(event) =>
                updateField("aiBudget", event.target.value)
              }
              placeholder="e.g. $10k–25k"
            />
          </label>
        </div>

        <label className="text-sm font-medium text-slate-100">
          What's the biggest AI challenge you're facing?
          <textarea
            className={inputClass(Boolean(errors.reason)) + " min-h-[80px] resize-y"}
            value={form.reason}
            onChange={(event) =>
              updateField("reason", event.target.value)
            }
            rows={3}
            placeholder="e.g. We're spending 40 hrs/week on manual data entry and need to automate it"
            required
          />
          {errors.reason ? (
            <span className="text-xs text-rose-400">
              {errors.reason}
            </span>
          ) : null}
        </label>

        <div className="flex flex-col gap-4 border-t border-[rgba(255,255,255,0.14)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-300">
            Complimentary scan (valued at $15,000) + 40-min strategy
            call. You keep everything we find. First in line when a spot
            opens.
          </p>
          <button type="submit" className={primaryButtonClass}>
            {PRIMARY_CTA}
          </button>
        </div>

        {submitted ? (
          <div className="space-y-4 border-t border-[rgba(255,255,255,0.14)] pt-5">
            <div className="space-y-4 border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] p-5">
              <h3 className="text-lg font-semibold tracking-[-0.01em] text-white">
                You're on the waitlist
              </h3>
              <p className="text-sm leading-relaxed text-slate-100">
                Your email draft is ready. If it didn't open, use the
                link below. We'll start your AI Portfolio Reality Scan
                and reach out within 48 hours.
              </p>
              <a
                href={buildMailto(form)}
                className={primaryButtonClass}
              >
                Open email draft again
              </a>
              <div className="grid gap-3 text-sm text-slate-100 sm:grid-cols-3">
                <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] p-4">
                  <p className="font-medium uppercase tracking-[0.08em] text-slate-300">
                    Within 48 hours
                  </p>
                  <p className="mt-2">
                    We confirm your waitlist spot and start the scan.
                  </p>
                </div>
                <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] p-4">
                  <p className="font-medium uppercase tracking-[0.08em] text-slate-300">
                    Day 3-5
                  </p>
                  <p className="mt-2">
                    Quick call about your business.
                  </p>
                </div>
                <div className="border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] p-4">
                  <p className="font-medium uppercase tracking-[0.08em] text-slate-300">
                    Day 5-7
                  </p>
                  <p className="mt-2">
                    Your scan results and action plan.
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-300">
                Questions?{" "}
                <a
                  className="font-medium text-white"
                  href={`mailto:${PRIMARY_EMAIL}`}
                >
                  {PRIMARY_EMAIL}
                </a>
              </p>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
