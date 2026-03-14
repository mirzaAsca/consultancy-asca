const panelClass = 'border border-[var(--line)] bg-[var(--surface)] p-6'
const cardClass = 'border border-[var(--line)] bg-[var(--surface-soft)] p-4'
const sectionLabelClass =
  "inline-flex w-fit items-center bg-white px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]"
const sectionHeadingClass =
  'mt-4 max-w-[18ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl'
const metaChipClass =
  "inline-flex w-fit items-center border border-[color:rgba(30,41,59,0.14)] bg-[rgba(255,255,255,0.7)] px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]"
const modulePanelClass = 'border border-[var(--line)] bg-[rgba(15,23,42,0.03)] p-4 sm:p-5'
const moduleAccentPanelClass = 'border border-[var(--accent)] bg-[rgba(15,23,42,0.03)] p-4 sm:p-5'
const stepBadgeClass =
  "inline-flex min-w-[48px] items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-white"
const sequenceBadgeClass =
  "absolute left-0 top-0 inline-flex min-w-[36px] items-center justify-center border border-[var(--line)] bg-white px-2 py-1 font-['IBM_Plex_Mono'] text-[10px] font-medium tracking-[0.12em] text-[var(--muted)]"

type PrimerCard = {
  label?: string
  title: string
  detail: string
}

type PrimerSequenceItem = {
  step: string
  title: string
  detail: string
}

type ToolComparison = {
  label: string
  title: string
  pros: string[]
  cons: string[]
  useCase: string
}

type LeverClarifier = {
  eyebrow: string
  title: string
  commonAssumption: string
  correctUse: string
  outcomes: PrimerCard[]
  kicker: string
}

type LeverFlow = {
  lever: string
  title: string
  interventions: string[]
  effects: string[]
  clarifier?: LeverClarifier
}

type BonusGain = {
  lever: string
  title: string
  detail: string
  proofPoints: string[]
}

type PrimerStep = {
  step: string
  eyebrow: string
  title: string
  detail: string
  cards?: PrimerCard[]
  gridClass?: string
  tags?: string[]
  comparisonTable?: ToolComparison[]
  leverFlows?: LeverFlow[]
  bonusGain?: BonusGain
  sequence?: PrimerSequenceItem[]
  closing?: string
}

const businessBasics: PrimerCard[] = [
  {
    label: 'Core function',
    title: 'Create value',
    detail: 'Improve an outcome the market is willing to buy.',
  },
  {
    label: 'Core function',
    title: 'Capture value',
    detail: 'Turn delivery into revenue, margin, and repeat demand.',
  },
]

const leverFlows: LeverFlow[] = [
  {
    lever: 'Lever 01',
    title: 'Increase volume',
    interventions: ['Automate outreach', 'Shorten response cycles', 'Improve customer experience'],
    effects: ['More conversion', 'More throughput', 'More supply'],
  },
  {
    lever: 'Lever 02',
    title: 'Lower unit cost',
    interventions: ['Automate manual work', 'Train and enable people with AI', 'Speed up human work'],
    effects: ['Lower unit cost', '10x output per person', 'Higher margin'],
    clarifier: {
      eyebrow: 'THE 10X MODEL',
      title: 'Workforce leverage, not headcount reduction.',
      commonAssumption: 'AI lowers cost by removing people from payroll.',
      correctUse:
        'AI lowers unit cost by training and enabling teams to produce materially more output per person inside AI-native workflows.',
      outcomes: [
        {
          label: 'Workforce outcome',
          title: 'Higher-value operators',
          detail:
            'People stay relevant, earn more, and become market-ready operators with AI-native execution skills.',
        },
        {
          label: 'Company outcome',
          title: 'A stronger operating model',
          detail:
            'The company becomes AI-native, improves margin, gains speed against competitors, and expands output without linear hiring.',
        },
      ],
      kicker: 'The target is not a thinner payroll. It is a smaller, better-enabled team delivering the output of a much larger one.',
    },
  },
]

const bonusGain: BonusGain = {
  lever: 'Lever 03',
  title: 'Pricing power',
  detail:
    'Pricing power is usually earned after volume and unit cost improvements raise delivery speed, reliability, and customer experience enough to support a higher price on objective grounds.',
  proofPoints: ['Faster delivery', 'Higher reliability', 'Better customer experience'],
}

const toolComparison: ToolComparison[] = [
  {
    label: 'First choice',
    title: 'Automation',
    pros: ['Higher consistency', 'Lower run-cost', 'Predictable outputs', 'Easier scaling'],
    cons: ['Weak on unstructured interpretation', 'Breaks when judgment is required'],
    useCase: 'Structured, repeatable workflows with fixed inputs, clear rules, and stable outputs.',
  },
  {
    label: 'Used selectively',
    title: 'AI',
    pros: ['Understands messy inputs', 'Handles judgment-heavy tasks', 'Useful for planning and interpretation'],
    cons: ['Less consistent than automation', 'Harder to make fully predictable'],
    useCase: 'Document-heavy, language-heavy, or ambiguous workflows where human interpretation is still the constraint.',
  },
]

const integrationSteps: PrimerSequenceItem[] = [
  {
    step: '01',
    title: 'Map the workflow',
    detail: 'Inspect internal and external processes, handoffs, tools, and failure points.',
  },
  {
    step: '02',
    title: 'Model micro-ROI',
    detail: 'Set a cost, effort, risk, and upside baseline for each workflow.',
  },
  {
    step: '03',
    title: 'Prioritize automation first',
    detail: 'If a rules-based system can do the job reliably, it usually wins on economics.',
  },
  {
    step: '04',
    title: 'Deploy AI where interpretation remains',
    detail: 'Use AI where documents, language, ambiguity, or judgment still block a rules-based system.',
  },
  {
    step: '05',
    title: 'Sequence by return',
    detail: 'Deployment order follows business return, not novelty.',
  },
]

const schoolSteps: PrimerStep[] = [
  {
    step: '01',
    eyebrow: 'BUSINESS FUNCTION',
    title: 'Every business must create value and capture value.',
    detail:
      'That is the commercial baseline. AI only matters when it changes how value is produced, delivered, or monetized.',
    cards: businessBasics,
    gridClass: 'sm:grid-cols-2',
  },
  {
    step: '02',
    eyebrow: 'TOOL CHOICE',
    title: 'Tool selection follows workflow economics.',
    detail:
      'Automation gets first priority when a workflow is structured, repeatable, and rules-based. AI is used where language, ambiguity, or judgment still block scale.',
    comparisonTable: toolComparison,
    tags: ['Automation first', 'AI for interpretation', 'ROI decides order'],
    closing: 'High-cost expert interpretation is now addressable, but only where the commercial case justifies deployment.',
  },
  {
    step: '03',
    eyebrow: 'COMMERCIAL LEVERS',
    title: 'Most measurable value comes from two direct levers. Pricing power usually follows.',
    detail:
      'In most operating environments, first-order gains come from more throughput and lower unit cost. Stronger pricing usually follows once service levels materially improve.',
    leverFlows,
    bonusGain,
    closing: 'If a use case does not change throughput, unit cost, or price realization, it is not yet a business case.',
  },
  {
    step: '04',
    eyebrow: 'ROLLOUT ORDER',
    title: 'Rollout order follows micro-ROI.',
    detail:
      'We map each workflow, quantify the upside, and sequence delivery by return, feasibility, and control requirements.',
    sequence: integrationSteps,
  },
]

function StepConnector() {
  return (
    <div className="flex items-center justify-center py-4 sm:py-5" aria-hidden="true">
      <div className="h-px w-20 bg-[var(--line)]" />
    </div>
  )
}

function CardGrid({ cards, gridClass }: { cards: PrimerCard[]; gridClass: string }) {
  return (
    <div className={`grid gap-3 ${gridClass}`}>
      {cards.map((item) => (
        <article key={item.title} className={cardClass}>
          {item.label ? (
            <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              {item.label}
            </p>
          ) : null}
          <h4 className="mt-3 text-base font-semibold tracking-[-0.01em] text-slate-950">{item.title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.detail}</p>
        </article>
      ))}
    </div>
  )
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
              <h4 className="mt-2 text-base font-semibold tracking-[-0.01em] text-slate-950">{item.title}</h4>
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
                  <p className="mt-2 text-base font-semibold tracking-[-0.01em] text-slate-950">{item.title}</p>
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
  )
}

function LeverImpactMap({ rows, bonus }: { rows: LeverFlow[]; bonus: BonusGain }) {
  return (
    <div className="space-y-4">
      <div className={modulePanelClass}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              DIRECT VALUE LEVERS
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              These are the operating levers AI and automation move most directly.
            </p>
          </div>
          <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
            Lever -&gt; intervention -&gt; outcome
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {rows.map((row) => (
            <article key={row.lever} className="space-y-4 border border-[var(--line)] bg-white/80 p-4">
              <div className="grid gap-3 xl:grid-cols-[160px_auto_minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-start">
                <div>
                  <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                    {row.lever}
                  </p>
                  <h4 className="mt-2 text-base font-semibold tracking-[-0.01em] text-slate-950">{row.title}</h4>
                </div>

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
                      <p className="mt-3 text-sm leading-relaxed text-slate-700">{row.clarifier.commonAssumption}</p>
                    </article>
                    <article className="border border-[var(--accent)] bg-white p-4">
                      <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
                        Correct model
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-slate-700">{row.clarifier.correctUse}</p>
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
                        <h6 className="mt-3 text-sm font-semibold tracking-[-0.01em] text-slate-950">{item.title}</h6>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.detail}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      <div className={moduleAccentPanelClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
              {bonus.lever} - SECONDARY EFFECT
            </p>
            <h4 className="mt-2 text-base font-semibold tracking-[-0.01em] text-slate-950">{bonus.title}</h4>
            <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-slate-700">{bonus.detail}</p>
          </div>
          <span className={metaChipClass}>Earned after 01 + 02</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {bonus.proofPoints.map((item) => (
            <article key={item} className={cardClass}>
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                Pricing proof
              </p>
              <p className="mt-3 text-sm font-medium tracking-[-0.01em] text-slate-950">{item}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BusinessAiPrimerSection() {
  return (
    <section id="ai-economics" className="reveal delay-2 section-divider-full py-14 sm:py-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className={sectionLabelClass}>QUICK SCHOOL OF AI IN BUSINESS</p>
          <h2 className={sectionHeadingClass}>How AI changes operating economics.</h2>
        </div>
        <div className="max-w-[44ch] space-y-3">
          <p className="text-sm leading-relaxed text-slate-700">
            This is the operating lens we use to decide where AI belongs, where automation wins, and what gets deployed first.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className={metaChipClass}>4-step model</span>
            <span className={metaChipClass}>Automation first</span>
            <span className={metaChipClass}>Micro-ROI ordering</span>
          </div>
        </div>
      </div>

      <ol className="mt-8">
        {schoolSteps.map((step, index) => {
          const cards = step.cards
          const leverMapRows = step.leverFlows
          const bonus = step.bonusGain
          const sequence = step.sequence

          return (
            <li key={step.step}>
              <article className={panelClass}>
                <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)] xl:items-start">
                  <div className="xl:border-r xl:border-[var(--line)] xl:pr-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={stepBadgeClass}>{step.step}</span>
                      <p className={sectionLabelClass}>{step.eyebrow}</p>
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.02em] [text-wrap:balance]">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">{step.detail}</p>
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
                    {cards && step.gridClass ? <CardGrid cards={cards} gridClass={step.gridClass} /> : null}
                    {step.comparisonTable ? <ToolComparisonTable items={step.comparisonTable} /> : null}
                    {leverMapRows && bonus ? <LeverImpactMap rows={leverMapRows} bonus={bonus} /> : null}

                    {sequence ? (
                      <div className={modulePanelClass}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                              IMPLEMENTATION ORDER
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-700">
                              After the economics and tool fit are clear, deployment order follows expected return.
                            </p>
                          </div>
                          <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                            5-step prioritization
                          </p>
                        </div>

                        <ol className="mt-5 space-y-4">
                          {sequence.map((item, sequenceIndex) => (
                            <li key={item.step} className="relative pl-14">
                              {sequenceIndex < sequence.length - 1 ? (
                                <div className="absolute bottom-[-1.35rem] left-4 top-9 border-l border-[var(--line)]" />
                              ) : null}
                              <div className={sequenceBadgeClass}>{item.step}</div>
                              <p className="text-base font-semibold tracking-[-0.01em] text-slate-950">{item.title}</p>
                              <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.detail}</p>
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
              </article>

              {index < schoolSteps.length - 1 ? <StepConnector /> : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
