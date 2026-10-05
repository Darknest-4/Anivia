import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthHeading, PasswordInput, StrengthMeter } from '@/components/auth/AuthBits'
import { Button, Field, Skeleton } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'

/** Landing page for the password-reset email link (Supabase signs the user in via the link). */
export default function ResetPasswordPage() {
  useDocumentMeta({ title: 'Choose a new password', noindex: true })
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  if (auth.status === 'loading') return <Skeleton className="h-64 w-full rounded-2xl" />
  if (auth.status !== 'signed-in')
    return (
      <div className="animate-fade-up text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/15 text-warning">
          <KeyRound className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-fg">This reset link is invalid or expired</h1>
        <p className="mt-2 text-sm text-fg-muted">Request a new link and open it on this device.</p>
        <Link to="/forgot-password" className="mt-6 inline-block text-sm font-semibold text-accent-soft hover:underline">
          Send a new link
        </Link>
      </div>
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setError(undefined)
    setLoading(true)
    try {
      await auth.updatePassword(password)
      toast({ title: 'Password updated', description: 'You’re signed in with your new password.' })
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <AuthHeading title="Choose a new password" description={`For ${auth.email ?? 'your account'}`} />
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="New password" error={error}>
          {(p) => (
            <>
              <PasswordInput {...p} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <StrengthMeter password={password} />
            </>
          )}
        </Field>
        <Field label="Confirm new password">{(p) => <PasswordInput {...p} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}</Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Update password
        </Button>
      </form>
    </div>
  )
}
