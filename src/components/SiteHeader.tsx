import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type SiteHeaderProps = {
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
  founderLinkedIn,
  homeHref,
  whatWeDoHref,
  roiHref = '/roi/',
}: SiteHeaderProps) {
  // Desktop hide/show on scroll. Mobile always stays visible — we only toggle
  // the sticky blur style so the page content never tracks behind a translucent bar without context.
  const [mode, setMode] = useState<'top' | 'hidden' | 'sticky'>('top')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const navLinks: { href: string; label: string }[] = [
    { href: homeHref, label: 'Home' },
    { href: whatWeDoHref, label: 'How It Works' },
    { href: roiHref, label: 'Research' },
    { href: '/about/', label: 'About Me' },
  ]

  // Desktop-only hide-on-scroll: never translate on <lg so the mobile bar stays put.
  const desktopHiddenClass =
    mode === 'hidden' ? 'lg:-translate-y-full lg:opacity-0' : 'lg:translate-y-0 lg:opacity-100'
  const desktopStickyClass =
    mode === 'sticky'
      ? 'lg:backdrop-blur-md lg:bg-white/60 lg:-mx-10 lg:px-10 lg:py-2'
      : ''

  return (
    <header
      className={[
        'relative transition-[transform,opacity,background-color] duration-300',
        // Mobile: solid background + subtle divider so the sticky bar reads as a clear surface.
        'bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--line)] -mx-4 px-4 py-2.5 sm:-mx-8 sm:px-8',
        // Desktop: remove the mobile chrome so the original style holds.
        'lg:bg-transparent lg:backdrop-blur-0 lg:border-0 lg:mx-0 lg:px-0 lg:py-0',
        desktopHiddenClass,
        desktopStickyClass,
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Desktop nav */}
        <nav className="hidden lg:flex flex-wrap gap-5 text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="transition-colors hover:text-slate-900">
              {link.label}
            </a>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          className="lg:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--line)] bg-white text-[var(--accent)] transition-colors hover:border-[var(--accent)]"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
            <path d="M3 6h14M3 10h14M3 14h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </button>

        <a
          href={founderLinkedIn}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 shrink items-center gap-2 transition-opacity hover:opacity-80 sm:gap-2.5"
        >
          <img
            src="/profile.png"
            alt="Mirza (Ašća) Ašćerić"
            className="h-8 w-8 shrink-0 rounded-full object-cover object-center ring-2 ring-[var(--accent)]"
          />
          <span className="hidden min-w-0 truncate font-['IBM_Plex_Mono'] text-[13px] font-semibold tracking-[-0.01em] text-[var(--accent)] sm:inline sm:text-[14px]">
            Mirza (Ašća) Ašćerić
          </span>
          <span className="inline min-w-0 truncate font-['IBM_Plex_Mono'] text-[13px] font-semibold tracking-[-0.01em] text-[var(--accent)] sm:hidden">
            Mirza Ašćerić
          </span>
          <VerifiedBadge />
          <LinkedInIcon />
        </a>
      </div>

      {/* Mobile drawer — rendered via portal so it escapes any transformed ancestor. */}
      {mounted && menuOpen
        ? createPortal(
            <div className="fixed inset-0 z-[100] lg:hidden">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
              />
              <div className="absolute inset-x-0 top-0 bg-white shadow-[0_18px_38px_rgba(15,23,42,0.18)]">
                <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
                  <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                    Menu
                  </p>
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center border border-[var(--line)] bg-white text-[var(--accent)] transition-colors hover:border-[var(--accent)]"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                      <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                    </svg>
                  </button>
                </div>
                <nav className="flex flex-col px-2 py-2">
                  {navLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="border-b border-[var(--line)] px-4 py-4 text-[14px] font-medium tracking-[-0.01em] text-slate-900 transition-colors last:border-b-0 hover:text-[var(--accent)]"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  )
}
