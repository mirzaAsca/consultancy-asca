import type { Service } from '../content/site-content'

type ServiceCardProps = {
  service: Service
}

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="border border-[var(--line)] bg-[var(--panel)] p-5">
      <p className="eyebrow text-slate-500">{service.id}</p>
      <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.01em]">{service.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{service.description}</p>
    </article>
  )
}
