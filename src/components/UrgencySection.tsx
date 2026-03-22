import { useEffect, useRef, useState } from 'react'

const sectionLabelClass =
  "inline-flex w-fit items-center bg-white px-2.5 py-1 font-['IBM_Plex_Mono'] text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]"

const urgencyItems = [
  {
    num: '01',
    text: 'Every month without measurable results is ',
    highlight: 'money gone.',
  },
  {
    num: '02',
    text: 'The companies that moved early are already ',
    highlight: 'pulling ahead.',
  },
  {
    num: '03',
    text: '',
    highlight: 'Lower costs. Faster operations. Higher margins.',
  },
  {
    num: '04',
    text: 'That gap gets ',
    highlight: 'wider every quarter.',
  },
]

export default function UrgencySection() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    return !('IntersectionObserver' in window)
  })

  useEffect(() => {
    const node = sectionRef.current
    if (!node || isVisible || !('IntersectionObserver' in window)) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          return
        }

        setIsVisible(true)
        observer.disconnect()
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [isVisible])

  return (
    <section ref={sectionRef} className="section-divider-full py-14 sm:py-16">
      <p className={sectionLabelClass}>THE TIMELINE</p>
      <h2 className="mt-4 max-w-[22ch] text-3xl font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-4xl">
        What happens quarter by quarter.
      </h2>

      <div className="mt-8 grid gap-4 md:grid-cols-12">
        {urgencyItems.map((item, index) => (
          <article
            key={item.num}
            className={`premium-card border border-[var(--line)] bg-[var(--surface-soft)] p-5 shadow-[var(--shadow-card)] urgency-line ${isVisible ? 'is-visible' : ''} md:col-span-6`}
            style={{ transitionDelay: `${index * 90}ms` }}
          >
            <div className="flex items-start gap-4">
              <p className="font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                {item.num}
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                {item.text}
                <span className="font-semibold text-slate-950">{item.highlight}</span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
