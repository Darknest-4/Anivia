import { t } from '@/i18n'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthHeading, isEmail, ResendEmailButton } from '@/components/auth/AuthBits'
import { Button, Field, Input } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useAuth } from '@/providers/AuthProvider'

export default function ForgotPasswordPage() {
  useDocumentMeta({ title: t('Reset password'), noindex: true })
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) return setError('Enter a valid email address.')
    setError(undefined)
    setLoading(true)
    try {
      await auth.sendPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (sent)
    return (
      <div className="animate-fade-up text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
          <MailCheck className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-fg">{t('Check your inbox')}</h1>
        <p className="mt-2 text-sm text-fg-muted">{t('If an account exists for {p0}, a reset link is on its way.', { p0: email })}</p>
        <ResendEmailButton className="mt-6" onResend={() => auth.sendPasswordReset(email.trim())} />
        <Button variant="secondary" className="mt-6" onClick={() => setSent(false)}>
          {t('Use a different email')}
        </Button>
      </div>
    )

  return (
    <div className="animate-fade-up">
      <Link to="/login" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" />
        {t('Back to sign in')}
      </Link>
      <AuthHeading title={t('Forgot your password?')} description={t('Enter your email and we’ll send you a link to reset it.')} />
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label={t('Email')} error={error}>
          {(p) => <Input {...p} type="email" autoComplete="email" placeholder={t('you@example.com')} value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={auth.status === 'disabled'}>
          {t('Send reset link')}
        </Button>
      </form>
    </div>
  )
}
