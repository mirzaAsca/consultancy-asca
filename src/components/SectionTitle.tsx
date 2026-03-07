type SectionTitleProps = {
  eyebrow: string
  title: string
  intro?: string
}

export default function SectionTitle({ eyebrow, title, intro }: SectionTitleProps) {
  return (
    <header>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
        {title}
      </h2>
      {intro ? <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--muted)]">{intro}</p> : null}
    </header>
  )
}
