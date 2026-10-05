import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthHeading, isEmail, PasswordInput, SocialButtons } from '@/components/auth/AuthBits'
import { DemoNotice } from '@/components/common/DemoNotice'
import { Button, Checkbox, Field, Input } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useToast } from '@/providers/ToastProvider'

export default function LoginPage() {
  useDocumentMeta({ title: 'Sign in', noindex: true })
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next = {
      email: !isEmail(email) ? 'Enter a valid email address.' : undefined,
      password: password.length < 8 ? 'Password must be at least 8 characters.' : undefined,
    }
    setErrors(next)
    if (next.email || next.password) return
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      toast({ title: 'Authentication not connected', description: 'This form is UI-only. Wire it to your auth provider to sign users in.', variant: 'info' })
    }, 800)
  }

  return (
    <div className="animate-fade-up">
      <AuthHeading title="Welcome back" description="Sign in to sync your watchlist and continue watching." />
      <SocialButtons />
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email" error={errors.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field
          label="Password"
          error={errors.password}
          labelAside={
            <Link to="/forgot-password" className="text-xs font-semibold text-accent-soft hover:underline">
              Forgot password?
            </Link>
          }
        >
          {(p) => <PasswordInput {...p} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Checkbox checked={remember} onChange={setRemember} label="Remember me on this device" />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-fg-muted">
        New to ANIVIA?{' '}
        <Link to="/register" className="font-semibold text-accent-soft hover:underline">
          Create an account
        </Link>
      </p>
      <DemoNotice className="mt-8">Passwords are never stored. Replace the submit handler with your authentication API.</DemoNotice>
    </div>
  )
}
