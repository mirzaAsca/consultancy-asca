import { useEffect, useRef, useState } from 'react'

type SiteHeaderProps = {
  applyHref: string
  founderLinkedIn: string
  homeHref: string
  whatWeDoHref: string
  roiHref?: string
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px] text-[var(--accent)]">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function VerifiedBadge() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px] text-[var(--accent)]">
      <path d="m11.99 22-1.23-.44C6.11 19.81 2.99 16 2.99 11V5L12 2l9 3v6c0 5-3.11 8.81-7.74 10.56zM5 6.44V11c0 4.11 2.6 7.35 6.46 8.8l.54.2.58-.2C16.41 18.35 19 15.1 19 11V6.44l-7-2.32zM17 8h-2.57l-4.02 5.01-2.18-2.18-1.41 1.41 3.75 3.75 6.43-8z" />
    </svg>
  )
}

export default function SiteHeader({
  applyHref,
  founderLinkedIn,
  homeHref,
  whatWeDoHref,
  roiHref = '/roi/',
}: SiteHeaderProps) {
  // 'top' = at page top (normal), 'hidden' = scrolled down & hidden, 'sticky' = scrolling up with blur
  const [mode, setMode] = useState<'top' | 'hidden' | 'sticky'>('top')
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const scrollingDown = y > lastY.current

      if (y <= 10) {
        setMode('top')
      } else if (scrollingDown && y > 60) {
        setMode('hidden')
      } else if (!scrollingDown) {
        setMode(prev => prev === 'hidden' ? 'sticky' : prev)
      }

      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={[
        'transition-all duration-300',
        mode === 'hidden' ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100',
        mode === 'sticky' ? 'backdrop-blur-md bg-white/60 -mx-6 px-6 py-2 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10' : '',
      ].join(' ')}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-5 text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          <a href={homeHref} className="transition-colors hover:text-slate-900">
            Home
          </a>
          <a href={whatWeDoHref} className="transition-colors hover:text-slate-900">
            How We Work
          </a>
          <a href={roiHref} className="transition-colors hover:text-slate-900">
            ROI Calculator
          </a>
          <a href={applyHref} className="transition-colors hover:text-slate-900">
            Apply
          </a>
        </nav>
        <a
          href={founderLinkedIn}
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <img
            src="/profile.png"
            alt="Mirza (Ašća) Ašćerić"
            className="h-8 w-8 rounded-full object-cover object-center ring-2 ring-[var(--accent)]"
          />
          <span className="font-['IBM_Plex_Mono'] text-[14px] font-semibold tracking-[-0.01em] text-[var(--accent)]">
            Mirza (Ašća) Ašćerić
          </span>
          <VerifiedBadge />
          <LinkedInIcon />
        </a>
      </div>
    </header>
  )
}
