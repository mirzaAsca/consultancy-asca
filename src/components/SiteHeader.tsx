type SiteHeaderProps = {
  applyHref: string
  ctaHref: string
  homeHref: string
  primaryButtonClassName: string
  primaryCtaLabel: string
  proofHref: string
  transformationOfficeHref: string
  whatWeDoHref: string
}

export default function SiteHeader({
  applyHref,
  ctaHref,
  homeHref,
  primaryButtonClassName,
  primaryCtaLabel,
  proofHref,
  transformationOfficeHref,
  whatWeDoHref,
}: SiteHeaderProps) {
  return (
    <header className="reveal border-b-[3px] border-[var(--line)] pb-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-5 text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          <a href={homeHref} className="transition-colors hover:text-slate-900">
            Home
          </a>
          <a href={whatWeDoHref} className="transition-colors hover:text-slate-900">
            How We Work
          </a>
          <a href={transformationOfficeHref} className="transition-colors hover:text-slate-900">
            Transformation Office
          </a>
          <a href={proofHref} className="transition-colors hover:text-slate-900">
            Proof
          </a>
          <a href={applyHref} className="transition-colors hover:text-slate-900">
            Apply
          </a>
        </nav>
        <a href={ctaHref} className={primaryButtonClassName}>
          {primaryCtaLabel}
        </a>
      </div>
    </header>
  )
}
