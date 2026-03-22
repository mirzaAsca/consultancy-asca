import { useState, useCallback } from "react";

const panelClass = "border border-[var(--line)] bg-[var(--surface)] p-6";
const cardClass = "border border-[var(--line)] bg-[var(--surface-soft)] p-4";
const sectionLabelClass =
  "inline-flex w-fit items-center bg-white px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]";
const sectionHeadingClass =
  "mt-4 max-w-[18ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl";
const metaChipClass =
  "inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]";
const modulePanelClass =
  "border border-[var(--line)] bg-[rgba(15,23,42,0.03)] p-4 sm:p-5";
const moduleAccentPanelClass =
  "border border-[var(--accent)] bg-[rgba(15,23,42,0.03)] p-4 sm:p-5";
const stepBadgeClass =
  "inline-flex min-w-[48px] items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-white";
const sequenceBadgeClass =
  "absolute left-0 top-0 inline-flex min-w-[36px] items-center justify-center border border-[var(--line)] bg-white px-2 py-1 font-['IBM_Plex_Mono'] text-[10px] font-medium tracking-[0.12em] text-[var(--muted)]";

type PrimerCard = {
  label?: string;
  title: string;
  detail: string;
};

type PrimerSequenceItem = {
  step: string;
  title: string;
  detail: string;
};

type ToolComparison = {
  label: string;
  title: string;
  pros: string[];
  cons: string[];
  useCase: string;
};

type LeverClarifier = {
  eyebrow: string;
  title: string;
  commonAssumption: string;
  correctUse: string;
  outcomes: PrimerCard[];
  kicker: string;
};

type LeverFlow = {
  lever: string;
  title: string;
  interventions: string[];
  effects: string[];
  clarifier?: LeverClarifier;
};

type BonusGain = {
  lever: string;
  title: string;
  detail: string;
  proofPoints: string[];
};

type KnowledgeLayer = {
  label: string;
  title: string;
  items: string[];
};

type PrimerStep = {
  step: string;
  eyebrow: string;
  title: string;
  detail: string;
  summaryItems?: string[];
  cards?: PrimerCard[];
  gridClass?: string;
  tags?: string[];
  comparisonTable?: ToolComparison[];
  leverFlows?: LeverFlow[];
  bonusGain?: BonusGain;
  sequence?: PrimerSequenceItem[];
  knowledgeLayers?: KnowledgeLayer[];
  closing?: string;
};

const businessBasics: PrimerCard[] = [
  {
    label: "Core function",
    title: "Make something people want",
    detail: "Build a product or service good enough that people pay for it.",
  },
  {
    label: "Core function",
    title: "Get paid for it",
    detail: "Turn what you deliver into revenue, margin, and repeat buyers.",
  },
];

const leverFlows: LeverFlow[] = [
  {
    lever: "Lever 01",
    title: "Sell more",
    interventions: [
      "Automate outreach",
      "Personalize journeys",
      "Improve customer experience",
    ],
    effects: ["More demand", "More conversion", "More sales volume"],
  },
  {
    lever: "Lever 02",
    title: "Lower unit cost",
    interventions: [
      "Automate manual work",
      "Train and enable people with AI",
      "Speed up human work",
    ],
    effects: ["Lower unit cost", "2–5x output per person", "Higher margin"],
    clarifier: {
      eyebrow: "THE PRODUCTIVITY MODEL",
      title:
        "Make each person 2–5x more productive on core tasks. Not fire people.",
      commonAssumption: '"AI saves money by cutting headcount."',
      correctUse:
        "AI lowers cost per unit by helping your existing team produce way more output. Same people, better tools, bigger results.",
      outcomes: [
        {
          label: "For your people",
          title: "They become more valuable",
          detail:
            "Your team learns to work with AI. They produce more, earn more, and stay relevant in a market that's changing fast.",
        },
        {
          label: "For your company",
          title: "Better margins without more hiring",
          detail:
            "You get more output without hiring proportionally more people. Margins go up. Speed goes up.",
        },
      ],
      kicker:
        "The goal is not a thinner payroll. It's a smaller, better-equipped team doing the work of a much larger one. Studies show 25–55% task speed gains (Harvard/BCG, GitHub Copilot) and up to 34% productivity improvement for junior staff (Stanford/MIT).",
    },
  },
  {
    lever: "Lever 03",
    title: "Reduce risk",
    interventions: [
      "Build governance into delivery",
      "Align to NIST AI RMF and EU AI Act",
      "Automate compliance checks",
    ],
    effects: [
      "Fewer audit failures",
      "Faster regulatory approval",
      "Lower legal exposure",
    ],
  },
];

const bonusGain: BonusGain = {
  lever: "Lever 04",
  title: "Charge more",
  detail:
    "When your customer experience gets better, your delivery gets faster, and your reliability goes up - you can raise your prices and people will still pay.",
  proofPoints: [
    "Better customer experience",
    "Faster delivery",
    "Higher reliability",
  ],
};

const toolComparison: ToolComparison[] = [
  {
    label: "Rules-based",
    title: "Automation",
    pros: [
      "More consistent",
      "Cheaper to run",
      "Predictable results",
      "Easier to scale",
    ],
    cons: [
      "Can't handle messy or ambiguous inputs",
      "Breaks when judgment is needed",
    ],
    useCase:
      "Repeatable work with clear rules: same inputs, same steps, same outputs.",
  },
  {
    label: "Pattern-based",
    title: "Machine Learning",
    pros: [
      "Finds patterns humans miss",
      "Gets better with more data",
      "Turns history into predictions",
    ],
    cons: ["Needs clean data", "Needs volume — garbage in, garbage out"],
    useCase:
      "Demand forecasting. Churn prediction. Lead scoring. Fraud detection. Dynamic pricing. Inventory optimization. Anything where the answer is hiding in your past data.",
  },
  {
    label: "Judgment-based",
    title: "Generative AI",
    pros: [
      "Handles messy inputs",
      "Good at judgment calls",
      "Useful for planning and interpretation",
    ],
    cons: [
      "Less consistent than automation",
      "Harder to predict exactly what you'll get",
    ],
    useCase:
      "Work that requires reading, interpreting, or making judgment calls that used to need a human.",
  },
];

const knowledgeLayers: KnowledgeLayer[] = [
  {
    label: "Layer 01",
    title: "What you sell",
    items: [
      "Every feature, limitation, and edge case — written down",
      "How it actually solves customer problems, step by step",
      "Setup guides, usage docs, and troubleshooting",
      "A pipeline that keeps it current every time the product changes",
    ],
  },
  {
    label: "Layer 02",
    title: "What each team knows",
    items: [
      "Dev: codebase docs, architecture decisions, technical debt",
      "Legal: contracts, compliance rules, review procedures",
      "Marketing: brand guidelines, content strategy, keyword data",
      "Sales: playbooks, objection handling, competitive intel",
    ],
  },
  {
    label: "Layer 03",
    title: "How the company runs",
    items: [
      "Who does what — every position, role, and responsibility",
      "Who decides what and who to escalate to",
      "Which teams depend on each other and where handoffs break",
      "Policies, SOPs, and the stuff that only lives in people's heads",
    ],
  },
  {
    label: "Layer 04",
    title: "What's getting done",
    items: [
      "Every project, task, and deadline — in one place",
      "What shipped, what's stuck, and what's overdue",
      "Blockers, dependencies, and who's waiting on who",
      "Where people are spending their time vs. where they should be",
    ],
  },
  {
    label: "Layer 05",
    title: "What people are saying",
    items: [
      "Slack, Teams, email, support tickets — all of it",
      "Meeting notes, decisions made, and action items nobody followed up on",
      "Customer feedback and the patterns hiding in support tickets",
      "The questions people keep asking that nobody wrote the answer to",
    ],
  },
];

const integrationSteps: PrimerSequenceItem[] = [
  {
    step: "01",
    title: "Map the work",
    detail:
      "Look at every process, handoff, tool, and failure point. Find where time and money leak.",
  },
  {
    step: "02",
    title: "Run the numbers",
    detail:
      "For each workflow: what does it cost now, what could it cost, and what's the upside?",
  },
  {
    step: "03",
    title: "Ship the biggest wins first",
    detail:
      "Start with whatever makes the most money. Automation where rules hold, AI where judgment is needed.",
  },
];

const schoolSteps: PrimerStep[] = [
  {
    step: "01",
    eyebrow: "THE BASICS",
    title: "Your business does two things. AI has to help with one of them.",
    detail:
      "Make something people want, and get paid for it. AI only matters if it helps you do one of those two things better.",
    cards: businessBasics,
    gridClass: "sm:grid-cols-2",
  },
  {
    step: "02",
    eyebrow: "FOUR LEVERS",
    title: "Sell more. Spend less. Reduce risk. Charge more.",
    detail:
      "Price easily goes up once your customer experience, delivery speed, and reliability get better.",
    summaryItems: [
      "Lever 01: Sell more",
      "Lever 02: Lower unit cost",
      "Lever 03: Reduce risk",
      "Lever 04: Charge more",
    ],
    leverFlows,
    bonusGain,
    closing:
      "If a project doesn't help you sell more, spend less, reduce risk, or charge more - it's not a business case yet.",
  },
  {
    step: "03",
    eyebrow: "THE FOUNDATION",
    title: "Your AI is only as smart as what you feed it.",
    detail:
      "Before AI can sell more, spend less, or reduce risk — it has to understand your company. That means collecting everything your business knows and putting it in one place your AI systems can actually use. Skip this step and nothing else works.",
    knowledgeLayers,
    tags: ["Hard prerequisite", "AI fails without this"],
    closing:
      "Data quality is the #1 reason AI pilots fail (Forrester). If the data isn't there, the project doesn't start — that's a hard gate, not a soft suggestion. IBM says the same thing: skip data prep and everything downstream breaks. This isn't optional infrastructure. It's the thing everything else depends on.",
  },
  {
    step: "04",
    eyebrow: "THREE TOOLS",
    title: "Automation for rules. ML for patterns. AI for judgment.",
    detail:
      "Three different tools. Three different jobs. Most companies skip straight to AI for everything. That's like hiring a strategist to do data entry. Match the tool to the work.",
    comparisonTable: toolComparison,
    closing:
      "If a rule can handle it, automate it. If the answer is hiding in your data, ML will find it. If it needs a human brain, AI can do it now.",
  },
  {
    step: "05",
    eyebrow: "WHERE TO START",
    title: "Start with whatever makes you the most money fastest.",
    detail:
      "Map the work, run the numbers, ship the biggest wins first. That's the order.",
    sequence: integrationSteps,
  },
];

// ── Disclosure primitive ──

function ChevronIcon({ open, accent }: { open: boolean; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center border transition-[border-color,background-color] duration-300 ease-in-out ${
        accent
          ? open
            ? "border-[var(--accent)] bg-[var(--accent)]"
            : "border-[var(--line)] bg-transparent"
          : "border-transparent bg-transparent"
      } ${accent ? "h-9 w-9" : "h-5 w-5"}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className={`shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "rotate-180" : ""} ${
          accent
            ? open
              ? "h-4 w-4 text-white"
              : "h-4 w-4 text-[var(--muted)]"
            : "h-5 w-5 text-slate-400"
        }`}
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
    </span>
  );
}

function Disclosure({
  open,
  onToggle,
  header,
  children,
  className = "",
  accent = false,
}: {
  open: boolean;
  onToggle: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
      >
        {header}
        <ChevronIcon open={open} accent={accent} />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden" style={{ minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Static sub-components ──

function StepConnector() {
  return (
    <div
      className="flex items-center justify-center py-4 sm:py-5"
      aria-hidden="true"
    >
      <div className="h-px w-20 bg-[var(--line)]" />
    </div>
  );
}

function CardGrid({
  cards,
  gridClass,
}: {
  cards: PrimerCard[];
  gridClass: string;
}) {
  return (
    <div className={`grid gap-3 ${gridClass}`}>
      {cards.map((item) => (
        <article key={item.title} className={cardClass}>
          {item.label ? (
            <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              {item.label}
            </p>
          ) : null}
          <h4 className="mt-3 text-base font-semibold tracking-[-0.01em] text-slate-950">
            {item.title}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {item.detail}
          </p>
        </article>
      ))}
    </div>
  );
}

function ToolComparisonTable({ items }: { items: ToolComparison[] }) {
  return (
    <>
      <div className="space-y-3 lg:hidden">
        {items.map((item) => (
          <article key={item.title} className={cardClass}>
            <div>
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                {item.label}
              </p>
              <h4 className="mt-2 text-base font-semibold tracking-[-0.01em] text-slate-950">
                {item.title}
              </h4>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-700">
              <div>
                <p className="font-medium text-slate-950">Why it wins</p>
                <ul className="mt-2 space-y-1">
                  {item.pros.map((pro) => (
                    <li key={pro}>{pro}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-slate-950">Where it breaks</p>
                <ul className="mt-2 space-y-1">
                  {item.cons.map((con) => (
                    <li key={con}>{con}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-slate-950">Best fit</p>
                <p className="mt-2">{item.useCase}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden border border-[var(--line)] lg:block">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[rgba(15,23,42,0.03)]">
            <tr>
              <th className="border-b border-[var(--line)] px-4 py-3 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                Tool
              </th>
              <th className="border-b border-[var(--line)] px-4 py-3 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                Why it wins
              </th>
              <th className="border-b border-[var(--line)] px-4 py-3 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                Where it breaks
              </th>
              <th className="border-b border-[var(--line)] px-4 py-3 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                Best fit
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.title} className="align-top">
                <td className="border-b border-[var(--line)] px-4 py-4 last:border-b-0">
                  <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-semibold tracking-[-0.01em] text-slate-950">
                    {item.title}
                  </p>
                </td>
                <td className="border-b border-[var(--line)] px-4 py-4 last:border-b-0">
                  <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
                    {item.pros.map((pro) => (
                      <li key={pro}>{pro}</li>
                    ))}
                  </ul>
                </td>
                <td className="border-b border-[var(--line)] px-4 py-4 last:border-b-0">
                  <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
                    {item.cons.map((con) => (
                      <li key={con}>{con}</li>
                    ))}
                  </ul>
                </td>
                <td className="border-b border-[var(--line)] px-4 py-4 text-sm leading-relaxed text-slate-700 last:border-b-0">
                  {item.useCase}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function KnowledgeLayerDiagram({ layers }: { layers: KnowledgeLayer[] }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            YOUR AI KNOWS NOTHING ABOUT YOUR BUSINESS
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            It doesn't know your product, your team, your customers, or how you
            work. Here's what you need to feed it.
          </p>
        </div>
      </div>

      {/* Hub diagram: layers converging to center */}
      <div className="border border-[var(--accent)] bg-[rgba(15,23,42,0.03)] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex min-w-[48px] items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-white">
            HUB
          </span>
          <div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
              CENTRALIZED KNOWLEDGE BASE
            </p>
            <p className="mt-1 text-base font-semibold tracking-[-0.01em] text-slate-950">
              One place that knows everything about your company.
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          Every AI system you build — customer-facing or internal — pulls from
          this single source. No hub, no context. No context, no results.
        </p>
      </div>

      {/* Arrow connectors */}
      <div className="flex items-center justify-center py-1" aria-hidden="true">
        <div className="flex items-center gap-2 text-[var(--muted)]">
          <div className="h-6 w-px bg-[var(--line)]" />
          <span className="font-['IBM_Plex_Mono'] text-[10px] font-medium uppercase tracking-[0.14em]">
            fed by
          </span>
          <div className="h-6 w-px bg-[var(--line)]" />
        </div>
      </div>

      {/* Layer cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {layers.map((layer, index) => (
          <article
            key={layer.label}
            className={`border p-4 ${
              index === 0
                ? "border-[var(--accent)] bg-[rgba(15,23,42,0.03)]"
                : "border-[var(--line)] bg-white/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex min-w-[36px] items-center justify-center px-2 py-1 font-['IBM_Plex_Mono'] text-[10px] font-medium tracking-[0.12em] ${
                  index === 0
                    ? "border border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border border-[var(--line)] bg-white text-[var(--muted)]"
                }`}
              >
                {layer.label.replace("Layer ", "")}
              </span>
              <p className="text-sm font-semibold tracking-[-0.01em] text-slate-950">
                {layer.title}
              </p>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              {layer.items.map((item) => (
                <li
                  key={item}
                  className="border-t border-[var(--line)] pt-2 first:border-t-0 first:pt-0"
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}

        {/* The "pipeline" card filling the 6th grid slot */}
        <article className="flex flex-col justify-center border border-dashed border-[var(--line)] bg-[rgba(15,23,42,0.015)] p-4">
          <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
            ALWAYS RUNNING
          </p>
          <p className="mt-2 text-sm font-semibold tracking-[-0.01em] text-slate-950">
            Always updating. Not a one-time export.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            A live pipeline that keeps every layer current as your company
            changes. New products, new people, new decisions — your AI knows
            about them the same day.
          </p>
        </article>
      </div>

      {/* Research backing */}
      <div className="border-t border-[var(--line)] pt-4 text-[11px] leading-relaxed text-slate-400">
        Sources:{" "}
        <a
          href="https://www.nist.gov/artificial-intelligence/executive-order-safe-secure-and-trustworthy-artificial-intelligence"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
        >
          Forrester TEI / NIST AI RMF
        </a>
        {" · "}
        <span>
          IBM: "data understanding is critical to avoid unexpected problems in
          downstream phases"
        </span>
        {" · "}
        <span>
          Report 3 Stage 4: data readiness (quality, completeness, access,
          governance) is a formal delivery gate
        </span>
      </div>
    </div>
  );
}

// ── Level 2: Lever flows with sub-accordion ──

function LeverImpactMap({
  rows,
  bonus,
  openLever,
  toggleLever,
}: {
  rows: LeverFlow[];
  bonus: BonusGain;
  openLever: number;
  toggleLever: (index: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            DIRECT VALUE LEVERS
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            These are the three ways AI and automation directly make you money.
          </p>
        </div>
        <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          Lever -&gt; intervention -&gt; outcome
        </p>
      </div>

      {rows.map((row, index) => (
        <Disclosure
          key={row.lever}
          open={openLever === index}
          onToggle={() => toggleLever(index)}
          className="border border-[var(--line)] bg-white/80 p-4"
          header={
            <div className="flex items-center gap-3">
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                {row.lever}
              </p>
              <h4 className="text-base font-semibold tracking-[-0.01em] text-slate-950">
                {row.title}
              </h4>
            </div>
          }
        >
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 xl:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-start">
              <div className="hidden items-center justify-center text-[var(--muted)] xl:flex">
                <span className="text-lg">-&gt;</span>
              </div>

              <div className="border border-[var(--line)] bg-white p-4">
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Intervention
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
                  {row.interventions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="hidden items-center justify-center text-[var(--muted)] xl:flex">
                <span className="text-lg">-&gt;</span>
              </div>

              <div className="border border-[var(--line)] bg-white p-4">
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Outcome
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
                  {row.effects.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {row.clarifier ? (
              <div className={moduleAccentPanelClass}>
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
                  {row.clarifier.eyebrow}
                </p>
                <h5 className="mt-2 text-base font-semibold tracking-[-0.01em] text-slate-950">
                  {row.clarifier.title}
                </h5>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <article className="border border-[var(--line)] bg-white p-4">
                    <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                      Common mistake
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">
                      {row.clarifier.commonAssumption}
                    </p>
                  </article>
                  <article className="border border-[var(--accent)] bg-white p-4">
                    <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
                      Correct model
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">
                      {row.clarifier.correctUse}
                    </p>
                  </article>
                </div>

                <p className="mt-4 border-t border-[var(--line)] pt-4 text-sm font-medium tracking-[-0.01em] text-slate-950">
                  {row.clarifier.kicker}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {row.clarifier.outcomes.map((item) => (
                    <article key={item.title} className={cardClass}>
                      {item.label ? (
                        <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                          {item.label}
                        </p>
                      ) : null}
                      <h6 className="mt-3 text-sm font-semibold tracking-[-0.01em] text-slate-950">
                        {item.title}
                      </h6>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {item.detail}
                      </p>
                    </article>
                  ))}
                </div>
                <div className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] leading-relaxed text-slate-400">
                  Sources:{" "}
                  <a
                    href="https://www.hbs.edu/faculty/Pages/item.aspx?num=64700"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
                  >
                    Harvard/BCG 2023
                  </a>
                  {" · "}
                  <a
                    href="https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
                  >
                    GitHub Copilot Research
                  </a>
                  {" · "}
                  <a
                    href="https://www.nber.org/system/files/working_papers/w31161/w31161.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
                  >
                    Stanford/MIT NBER
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </Disclosure>
      ))}

      {/* Bonus lever 04 — also collapsible */}
      <Disclosure
        open={openLever === rows.length}
        onToggle={() => toggleLever(rows.length)}
        className={moduleAccentPanelClass}
        header={
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
              {bonus.lever}
            </p>
            <h4 className="text-base font-semibold tracking-[-0.01em] text-slate-950">
              {bonus.title}
            </h4>
            <span className={`hidden sm:inline-flex ${metaChipClass}`}>
              Usually follows value gains
            </span>
          </div>
        }
      >
        <div className="mt-4">
          <p className="max-w-[62ch] text-sm leading-relaxed text-slate-700">
            {bonus.detail}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {bonus.proofPoints.map((item) => (
              <article key={item} className={cardClass}>
                <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Why price can increase
                </p>
                <p className="mt-3 text-sm font-medium tracking-[-0.01em] text-slate-950">
                  {item}
                </p>
              </article>
            ))}
          </div>
        </div>
      </Disclosure>
    </div>
  );
}

// ── Main section ──

export default function BusinessAiPrimerSection() {
  const [openStep, setOpenStep] = useState<number>(0);
  const [openLever, setOpenLever] = useState<number>(-1);

  const toggleStep = useCallback((index: number) => {
    setOpenStep((prev) => (prev === index ? -1 : index));
    setOpenLever(-1);
  }, []);

  const toggleLever = useCallback((index: number) => {
    setOpenLever((prev) => (prev === index ? -1 : index));
  }, []);

  return (
    <section
      id="ai-economics"
      className="reveal delay-2 section-divider-full py-14 sm:py-16"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className={sectionLabelClass}>BEFORE WE START</p>
          <h2 className={sectionHeadingClass}>
            The only four ways AI makes you money.
          </h2>
        </div>
        <div className="max-w-[44ch] space-y-3">
          <p className="text-sm leading-relaxed text-slate-700">
            This is how we decide where AI belongs, where automation wins, and
            what ships first.
          </p>
        </div>
      </div>

      <ol className="mt-8">
        {schoolSteps.map((step, index) => {
          const cards = step.cards;
          const leverMapRows = step.leverFlows;
          const bonus = step.bonusGain;
          const sequence = step.sequence;
          const summaryItems = step.summaryItems;
          const isOpen = openStep === index;

          return (
            <li key={step.step}>
              <Disclosure
                open={isOpen}
                onToggle={() => toggleStep(index)}
                className={panelClass}
                accent
                header={
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className={stepBadgeClass}>{step.step}</span>
                      <p className={sectionLabelClass}>{step.eyebrow}</p>
                    </div>
                    <h3 className="text-lg font-semibold leading-tight tracking-[-0.02em] sm:text-xl">
                      {step.title}
                    </h3>
                  </div>
                }
              >
                <div className="pt-5">
                  <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)] xl:items-start">
                    <div className="xl:border-r xl:border-[var(--line)] xl:pr-6">
                      <p className="text-sm leading-relaxed text-slate-700">
                        {step.detail}
                      </p>
                      {summaryItems ? (
                        <ul className="mt-5 space-y-2 border-t border-[var(--line)] pt-4 text-sm leading-relaxed text-slate-950">
                          {summaryItems.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                      {step.tags ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {step.tags.map((tag) => (
                            <span key={tag} className={metaChipClass}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-5">
                      {cards && step.gridClass ? (
                        <CardGrid cards={cards} gridClass={step.gridClass} />
                      ) : null}
                      {step.comparisonTable ? (
                        <ToolComparisonTable items={step.comparisonTable} />
                      ) : null}
                      {leverMapRows && bonus ? (
                        <LeverImpactMap
                          rows={leverMapRows}
                          bonus={bonus}
                          openLever={openLever}
                          toggleLever={toggleLever}
                        />
                      ) : null}
                      {step.knowledgeLayers ? (
                        <KnowledgeLayerDiagram layers={step.knowledgeLayers} />
                      ) : null}

                      {sequence ? (
                        <div className={modulePanelClass}>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                                IMPLEMENTATION ORDER
                              </p>
                              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                Once we know which tool fits, we move from
                                assessment to live deployment in three steps.
                              </p>
                            </div>
                            <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                              3 steps to live
                            </p>
                          </div>

                          <ol className="mt-5 space-y-4">
                            {sequence.map((item, sequenceIndex) => (
                              <li key={item.step} className="relative pl-14">
                                {sequenceIndex < sequence.length - 1 ? (
                                  <div className="absolute bottom-[-1.35rem] left-4 top-9 border-l border-[var(--line)]" />
                                ) : null}
                                <div className={sequenceBadgeClass}>
                                  {item.step}
                                </div>
                                <p className="text-base font-semibold tracking-[-0.01em] text-slate-950">
                                  {item.title}
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                  {item.detail}
                                </p>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ) : null}

                      {step.closing ? (
                        <p className="border-t border-[var(--line)] pt-4 text-sm leading-relaxed text-slate-700">
                          {step.closing}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Disclosure>

              {index < schoolSteps.length - 1 ? <StepConnector /> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
