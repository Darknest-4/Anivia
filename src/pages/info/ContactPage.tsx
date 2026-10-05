import { Headphones, Mail, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { isEmail } from '@/components/auth/AuthBits'
import { Button, Field, Input, Select, Textarea } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useFlag } from '@/providers/PlatformProvider'
import { useToast } from '@/providers/ToastProvider'
import { backend } from '@/services/backend'
import { config } from '@/config'

const channels = [
  { icon: Headphones, title: 'Send us a message', body: 'Questions, bug reports or feedback — use the form and we’ll get back to you by email.', meta: 'Messages go straight to our inbox' },
  ...(config.supportEmail ? [{ icon: Mail, title: 'Email', body: config.supportEmail, meta: 'Replies within 1 business day' }] : []),
]

export default function ContactPage() {
  useDocumentMeta({ title: 'Contact', description: 'Get in touch with the ANIVIA team.' })
  const contactOn = useFlag('contact_form')
  const toast = useToast()
  const [form, setForm] = useState({ name: '', email: '', topic: 'general', message: '' })
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [loading, setLoading] = useState(false)
  const [honeypot, setHoneypot] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next = {
      name: form.name.trim() ? undefined : 'Please enter your name.',
      email: isEmail(form.email) ? undefined : 'Enter a valid email address.',
      message: form.message.trim().length >= 10 ? undefined : 'Please write at least 10 characters.',
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    // Honeypot: bots fill hidden fields, people don't.
    if (honeypot) return
    setLoading(true)
    try {
      await backend.sendContact({ name: form.name.trim(), email: form.email.trim(), topic: form.topic, message: form.message.trim() })
      setForm({ name: '', email: '', topic: 'general', message: '' })
      toast({ title: 'Message sent', description: 'Thanks — we’ll reply to your email soon.' })
    } catch (err) {
      toast({ title: 'Message not sent', description: (err as Error).message, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-app">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Contact' }]} eyebrow="Support" title="We’d love to hear from you" description="Questions, feedback or partnership ideas — our team reads every message." />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <ul className="space-y-3">
          {channels.map((c) => (
            <li key={c.title} className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent-soft">
                <c.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold text-fg">{c.title}</h2>
                <p className="mt-0.5 text-sm [overflow-wrap:anywhere] text-fg-muted">{c.body}</p>
                <p className="mt-1 text-xs text-fg-subtle">{c.meta}</p>
              </div>
            </li>
          ))}
        </ul>
        {!contactOn ? (
          <div className="rounded-3xl border border-line bg-surface p-8 text-center text-sm text-fg-muted">The contact form is temporarily unavailable. Please try again later.</div>
        ) : (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-3xl border border-line bg-surface p-5 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name}>
              {(p) => <Input {...p} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            </Field>
            <Field label="Email" error={errors.email}>
              {(p) => <Input {...p} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
            </Field>
          </div>
          <Field label="Topic">
            {(p) => (
              <Select
                {...p}
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                options={[
                  { value: 'general', label: 'General question' },
                  { value: 'playback', label: 'Playback issue' },
                  { value: 'account', label: 'Account & billing' },
                  { value: 'feedback', label: 'Product feedback' },
                  { value: 'partnership', label: 'Partnerships' },
                ]}
              />
            )}
          </Field>
          <Field label="Message" error={errors.message}>
            {(p) => <Textarea {...p} rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can we help?" />}
          </Field>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" />
          <Button type="submit" size="lg" loading={loading} leftIcon={<Send className="h-4 w-4" />}>
            Send message
          </Button>
        </form>
        )}
      </div>
    </div>
  )
}
