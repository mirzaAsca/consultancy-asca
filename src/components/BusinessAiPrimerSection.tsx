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
  summaryItems?: string[]
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
    title: 'Make something people want',
    detail: 'Build a product or service good enough that people pay for it.',
  },
  {
    label: 'Core function',
    title: 'Get paid for it',
    detail: 'Turn what you deliver into revenue, margin, and repeat buyers.',
  },
]

const leverFlows: LeverFlow[] = [
  {
    lever: 'Lever 01',
    title: 'Sell more',
    interventions: ['Automate outreach', 'Personalize journeys', 'Improve customer experience'],
    effects: ['More demand', 'More conversion', 'More sales volume'],
  },
  {
    lever: 'Lever 02',
    title: 'Lower unit cost',
    interventions: ['Automate manual work', 'Train and enable people with AI', 'Speed up human work'],
    effects: ['Lower unit cost', '2–5x output per person', 'Higher margin'],
    clarifier: {
      eyebrow: 'THE PRODUCTIVITY MODEL',
      title: 'Make each person 2–5x more productive on core tasks. Not fire people.',
      commonAssumption: '"AI saves money by cutting headcount."',
      correctUse:
        'AI lowers cost per unit by helping your existing team produce way more output. Same people, better tools, bigger results.',
      outcomes: [
        {
          label: 'For your people',
          title: 'They become more valuable',
          detail:
            'Your team learns to work with AI. They produce more, earn more, and stay relevant in a market that\'s changing fast.',
        },
        {
          label: 'For your company',
          title: 'Better margins without more hiring',
          detail:
            'You get more output without hiring proportionally more people. Margins go up. Speed goes up. Competitors fall behind.',
        },
      ],
      kicker: 'The goal is not a thinner payroll. It\'s a smaller, better-equipped team doing the work of a much larger one. Studies show 25–55% task speed gains (Harvard/BCG, GitHub Copilot) and up to 34% productivity improvement for junior staff (Stanford/MIT).',
    },
  },
  {
    lever: 'Lever 03',
    title: 'Reduce risk',
    interventions: ['Build governance into delivery', 'Align to NIST AI RMF and EU AI Act', 'Automate compliance checks'],
    effects: ['Fewer audit failures', 'Faster regulatory approval', 'Lower legal exposure'],
  },
]

const bonusGain: BonusGain = {
  lever: 'Lever 04',
  title: 'Charge more',
  detail:
    'When your customer experience gets better, your delivery gets faster, and your reliability goes up - you can raise your prices and people will still pay.',
  proofPoints: ['Better customer experience', 'Faster delivery', 'Higher reliability'],
}

const toolComparison: ToolComparison[] = [
  {
    label: 'First choice',
    title: 'Automation',
    pros: ['More consistent', 'Cheaper to run', 'Predictable results', 'Easier to scale'],
    cons: ['Can\'t handle messy or ambiguous inputs', 'Breaks when judgment is needed'],
    useCase: 'Repeatable work with clear rules: same inputs, same steps, same outputs.',
  },
  {
    label: 'Second choice',
    title: 'AI',
    pros: ['Handles messy inputs', 'Good at judgment calls', 'Useful for planning and interpretation'],
    cons: ['Less consistent than automation', 'Harder to predict exactly what you\'ll get'],
    useCase: 'Work that requires reading, interpreting, or making judgment calls that used to need a human.',
  },
]

const integrationSteps: PrimerSequenceItem[] = [
  {
    step: '01',
    title: 'Map the work',
    detail: 'Look at every process, handoff, tool, and failure point. Find where time and money leak.',
  },
  {
    step: '02',
    title: 'Run the numbers',
    detail: 'For each workflow: what does it cost now, what could it cost, and what\'s the upside?',
  },
  {
    step: '03',
    title: 'Ship the biggest wins first',
    detail: 'Start with whatever makes the most money. Automation where rules hold, AI where judgment is needed.',
  },
]

const schoolSteps: PrimerStep[] = [
  {
    step: '01',
    eyebrow: 'THE BASICS',
    title: 'Your business does two things. AI has to help with one of them.',
    detail:
      'Make something people want, and get paid for it. AI only matters if it helps you do one of those two things better.',
    cards: businessBasics,
    gridClass: 'sm:grid-cols-2',
  },
  {
    step: '02',
    eyebrow: 'WHICH TOOL',
    title: 'Automation first. AI second. Most of the time, automation wins.',
    detail:
      'Use automation when the work follows clear rules. Use AI when the work needs judgment. Plain automation is cheaper and more reliable. AI is the second choice, not the first.',
    comparisonTable: toolComparison,
    tags: ['Automation first', 'AI when judgment is needed', 'Numbers decide'],
    closing: 'AI can now handle work that used to require expensive experts - but only when the math justifies it.',
  },
  {
    step: '03',
    eyebrow: 'FOUR LEVERS',
    title: 'Sell more. Spend less. Reduce risk. Charge more.',
    detail:
      'Price usually goes up on its own once your customer experience, delivery speed, and reliability get better.',
    summaryItems: ['Lever 01: Sell more', 'Lever 02: Lower unit cost', 'Lever 03: Reduce risk', 'Lever 04: Charge more'],
    leverFlows,
    bonusGain,
    closing: 'If a project doesn\'t help you sell more, spend less, reduce risk, or charge more - it\'s not a business case yet.',
  },
  {
    step: '04',
    eyebrow: 'WHERE TO START',
    title: 'Start with whatever makes you the most money fastest.',
    detail:
      'Map the work, run the numbers, ship the biggest wins first. That\'s the order.',
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
              <div className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] leading-relaxed text-slate-400">
                Sources:{' '}
                <a href="https://www.hbs.edu/faculty/Pages/item.aspx?num=64700" target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600">Harvard/BCG 2023</a>
                {' · '}
                <a href="https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/" target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600">GitHub Copilot Research</a>
                {' · '}
                <a href="https://www.nber.org/system/files/working_papers/w31161/w31161.pdf" target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600">Stanford/MIT NBER</a>
              </div>
            </div>
          ) : null}
        </article>
      ))}

      <div className={moduleAccentPanelClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
              {bonus.lever}
            </p>
            <h4 className="mt-2 text-base font-semibold tracking-[-0.01em] text-slate-950">{bonus.title}</h4>
            <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-slate-700">{bonus.detail}</p>
          </div>
          <span className={metaChipClass}>Usually follows value gains</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {bonus.proofPoints.map((item) => (
            <article key={item} className={cardClass}>
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                Why price can increase
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
          <p className={sectionLabelClass}>HOW AI ACTUALLY MAKES YOU MONEY</p>
          <h2 className={sectionHeadingClass}>The only four ways AI creates real value.</h2>
        </div>
        <div className="max-w-[44ch] space-y-3">
          <p className="text-sm leading-relaxed text-slate-700">
            This is how we decide where AI belongs, where automation wins, and what ships first.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className={metaChipClass}>4 steps</span>
            <span className={metaChipClass}>Automation first</span>
            <span className={metaChipClass}>Biggest wins first</span>
          </div>
        </div>
      </div>

      <ol className="mt-8">
        {schoolSteps.map((step, index) => {
          const cards = step.cards
          const leverMapRows = step.leverFlows
          const bonus = step.bonusGain
          const sequence = step.sequence
          const summaryItems = step.summaryItems

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
                              Once we know which tool fits, we move from assessment to live deployment in three steps.
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
