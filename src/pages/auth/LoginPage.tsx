import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthHeading, isEmail, PasswordInput, SocialButtons } from '@/components/auth/AuthBits'
import { AniListButton } from '@/components/auth/AniListButton'
import { DemoNotice } from '@/components/common/DemoNotice'
import { Button, Field, Input } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'

/** Only same-site paths are allowed as post-login redirects. */
export const safeRedirect = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/')

export default function LoginPage() {
  useDocumentMeta({ title: 'Sign in', noindex: true })
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeRedirect(params.get('redirect'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [loading, setLoading] = useState(false)

  if (auth.status === 'signed-in') return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v = {
      email: !isEmail(email) ? 'Enter a valid email address.' : undefined,
      password: password.length < 6 ? 'Password must be at least 6 characters.' : undefined,
    }
    setErrors(v)
    if (v.email || v.password) return
    setLoading(true)
    try {
      await auth.signIn(email.trim(), password)
      toast({ title: 'Welcome back!', description: 'Your library is syncing.' })
      navigate(next, { replace: true })
    } catch (err) {
      setErrors({ form: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <AuthHeading title="Welcome back" description="Sign in to sync your watchlist, history and settings across devices." />
      <AniListButton returnTo={next} className="mb-3" />
      <SocialButtons />
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {errors.form}
          </p>
        )}
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
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={auth.status === 'disabled'}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-fg-muted">
        New to ANIVIA?{' '}
        <Link to={`/register${next !== '/' ? `?redirect=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-accent-soft hover:underline">
          Create an account
        </Link>
      </p>
      {auth.status === 'disabled' && <DemoNotice className="mt-8">Accounts are disabled. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable sign-in.</DemoNotice>}
    </div>
  )
}
