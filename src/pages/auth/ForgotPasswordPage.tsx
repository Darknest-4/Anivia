import { ArrowLeft, MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthHeading, isEmail } from '@/components/auth/AuthBits'
import { DemoNotice } from '@/components/common/DemoNotice'
import { Button, Field, Input } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

export default function ForgotPasswordPage() {
  useDocumentMeta({ title: 'Reset password', noindex: true })
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) return setError('Enter a valid email address.')
    setError(undefined)
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 800)
  }

  if (sent)
    return (
      <div className="animate-fade-up text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
          <MailCheck className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-fg">Check your inbox</h1>
        <p className="mt-2 text-sm text-fg-muted">
          If an account exists for <span className="font-semibold text-fg">{email}</span>, a reset link is on its way.
        </p>
        <DemoNotice className="mt-6 text-left">Demo only — no email was sent. Connect your auth provider’s reset endpoint.</DemoNotice>
        <Button variant="secondary" className="mt-6" onClick={() => setSent(false)}>
          Use a different email
        </Button>
      </div>
    )

  return (
    <div className="animate-fade-up">
      <Link to="/login" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
      <AuthHeading title="Forgot your password?" description="Enter your email and we’ll send you a link to reset it." />
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email" error={error}>
          {(p) => <Input {...p} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>
    </div>
  )
}
