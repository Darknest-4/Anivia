import { t } from '@/i18n'
import { MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthHeading, isEmail, PasswordInput, SocialButtons, StrengthMeter } from '@/components/auth/AuthBits'
import { AniListButton } from '@/components/auth/AniListButton'
import { Button, Checkbox, Field, Input } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useAuth } from '@/providers/AuthProvider'
import { useFlag } from '@/providers/PlatformProvider'
import { useToast } from '@/providers/ToastProvider'
import { safeRedirect } from './LoginPage'

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'terms' | 'form', string>>

export default function RegisterPage() {
  useDocumentMeta({ title: t('Create account'), noindex: true })
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeRedirect(params.get('redirect'))
  const registrationOpen = useFlag('registration')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  if (auth.status === 'signed-in') return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v: Errors = {
      name: form.name.trim().length < 2 ? t('Please enter your name.') : undefined,
      email: !isEmail(form.email) ? t('Enter a valid email address.') : undefined,
      password: form.password.length < 8 ? t('Use at least 8 characters.') : undefined,
      confirm: form.confirm !== form.password ? t('Passwords do not match.') : undefined,
      terms: !terms ? t('You must accept the terms to continue.') : undefined,
    }
    setErrors(v)
    if (Object.values(v).some(Boolean)) return
    setLoading(true)
    try {
      const { needsConfirmation } = await auth.signUp(form.email.trim(), form.password, form.name.trim())
      if (needsConfirmation) setSentTo(form.email.trim())
      else {
        toast({ title: t('Welcome to ANIVIA!'), description: t('Your account is ready.') })
        navigate(next, { replace: true })
      }
    } catch (err) {
      setErrors({ form: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }

  if (sentTo)
    return (
      <div className="animate-fade-up text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
          <MailCheck className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-fg">{t('Confirm your email')}</h1>
        <p className="mt-2 text-sm text-fg-muted">
          We sent a confirmation link to <span className="font-semibold text-fg">{sentTo}</span>. Click it to activate your account.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-accent-soft hover:underline">
          {t('Back to sign in')}
        </Link>
      </div>
    )

  if (!registrationOpen)
    return (
      <div className="animate-fade-up text-center">
        <h1 className="text-2xl font-bold text-fg">{t('Sign-ups are paused')}</h1>
        <p className="mt-2 text-sm text-fg-muted">{t('New accounts can’t be created right now. Please check back later.')}</p>
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-accent-soft hover:underline">
          {t('Already have an account? Sign in')}
        </Link>
      </div>
    )

  return (
    <div className="animate-fade-up">
      <AuthHeading title={t('Create your account')} description={t('Join free — your watchlist and history follow you on every device.')} />
      <AniListButton intent="login" label={t('Sign up with AniList')} returnTo={next} className="mb-3" />
      <SocialButtons />
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {errors.form}
          </p>
        )}
        <Field label={t('Name')} error={errors.name}>
          {(p) => <Input {...p} autoComplete="name" placeholder={t('Your name')} value={form.name} onChange={set('name')} maxLength={48} />}
        </Field>
        <Field label={t('Email')} error={errors.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" placeholder={t('you@example.com')} value={form.email} onChange={set('email')} />}
        </Field>
        <Field label={t('Password')} error={errors.password}>
          {(p) => (
            <>
              <PasswordInput {...p} autoComplete="new-password" placeholder={t('At least 8 characters')} value={form.password} onChange={set('password')} />
              <StrengthMeter password={form.password} />
            </>
          )}
        </Field>
        <Field label={t('Confirm password')} error={errors.confirm}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" placeholder={t('Repeat password')} value={form.confirm} onChange={set('confirm')} />}
        </Field>
        <div>
          <Checkbox
            checked={terms}
            onChange={setTerms}
            label={
              <>
                I agree to the{' '}
                <Link to="/terms" className="font-semibold text-accent-soft hover:underline">
                  {t('Terms of Service')}
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="font-semibold text-accent-soft hover:underline">
                  {t('Privacy Policy')}
                </Link>
                .
              </>
            }
          />
          {errors.terms && <p className="mt-1.5 text-xs text-danger">{errors.terms}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={auth.status === 'disabled'}>
          {t('Create account')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-fg-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent-soft hover:underline">
          {t('Sign in')}
        </Link>
      </p>
    </div>
  )
}
