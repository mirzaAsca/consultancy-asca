import { useState } from 'react'
import type { FormEvent } from 'react'

type MiniContactFormProps = {
  email: string
}

type FormState = {
  fullName: string
  workEmail: string
  company: string
  role: string
  focus: string
}

const INITIAL_FORM: FormState = {
  fullName: '',
  workEmail: '',
  company: '',
  role: '',
  focus: '',
}

export default function MiniContactForm({ email }: MiniContactFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [submitted, setSubmitted] = useState(false)

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const bodyLines = [
      'Enterprise advisory intro request',
      '',
      `Full name: ${form.fullName}`,
      `Work email: ${form.workEmail}`,
      `Company: ${form.company}`,
      `Role: ${form.role}`,
      `Priority focus: ${form.focus}`,
    ]

    const subject = encodeURIComponent(`Intro request - ${form.company}`)
    const body = encodeURIComponent(bodyLines.join('\n'))
    setSubmitted(true)
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <p className="mb-5 text-sm text-[var(--muted)]">Initial request takes under two minutes.</p>

      <div className="form-grid">
        <label className="form-label">
          Full name
          <input
            className="form-input"
            value={form.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            required
          />
        </label>
        <label className="form-label">
          Work email
          <input
            className="form-input"
            type="email"
            value={form.workEmail}
            onChange={(event) => updateField('workEmail', event.target.value)}
            required
          />
        </label>
        <label className="form-label">
          Company
          <input
            className="form-input"
            value={form.company}
            onChange={(event) => updateField('company', event.target.value)}
            required
          />
        </label>
        <label className="form-label">
          Role
          <input
            className="form-input"
            value={form.role}
            onChange={(event) => updateField('role', event.target.value)}
            required
          />
        </label>
        <label className="form-label">
          Priority focus
          <textarea
            className="form-input"
            value={form.focus}
            onChange={(event) => updateField('focus', event.target.value)}
            rows={3}
            required
          />
        </label>
      </div>

      <button className="form-submit mt-5" type="submit">
        Send briefing request
      </button>

      {submitted ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          If your mail client does not open, email <a className="underline" href={`mailto:${email}`}>{email}</a>.
        </p>
      ) : null}
    </form>
  )
}
