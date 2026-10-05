import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthHeading, isEmail, PasswordInput, SocialButtons, StrengthMeter } from '@/components/auth/AuthBits'
import { Button, Checkbox, Field, Input } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useToast } from '@/providers/ToastProvider'

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'terms', string>>

export default function RegisterPage() {
  useDocumentMeta({ title: 'Create account', noindex: true })
  const toast = useToast()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Errors = {
      name: form.name.trim().length < 2 ? 'Please enter your name.' : undefined,
      email: !isEmail(form.email) ? 'Enter a valid email address.' : undefined,
      password: form.password.length < 8 ? 'Use at least 8 characters.' : undefined,
      confirm: form.confirm !== form.password ? 'Passwords do not match.' : undefined,
      terms: !terms ? 'You must accept the terms to continue.' : undefined,
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      toast({ title: 'Registration is UI-only', description: 'No account was created. Connect your backend to enable sign-up.', variant: 'info' })
    }, 900)
  }

  return (
    <div className="animate-fade-up">
      <AuthHeading title="Create your account" description="Join free and start building your anime universe." />
      <SocialButtons />
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Name" error={errors.name}>
          {(p) => <Input {...p} autoComplete="name" placeholder="Hikari Stargazer" value={form.name} onChange={set('name')} />}
        </Field>
        <Field label="Email" error={errors.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />}
        </Field>
        <Field label="Password" error={errors.password}>
          {(p) => (
            <>
              <PasswordInput {...p} autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} />
              <StrengthMeter password={form.password} />
            </>
          )}
        </Field>
        <Field label="Confirm password" error={errors.confirm}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} />}
        </Field>
        <div>
          <Checkbox
            checked={terms}
            onChange={setTerms}
            label={
              <>
                I agree to the{' '}
                <Link to="/terms" className="font-semibold text-accent-soft hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="font-semibold text-accent-soft hover:underline">
                  Privacy Policy
                </Link>
                .
              </>
            }
          />
          {errors.terms && <p className="mt-1.5 text-xs text-danger">{errors.terms}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-fg-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent-soft hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
