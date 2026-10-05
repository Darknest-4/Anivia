import { Eye, EyeOff, GitBranch, Loader2, MessageCircle } from 'lucide-react'
import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth, type OAuthProvider } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'

export function AuthHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-fg">{title}</h1>
      <p className="mt-2 text-sm text-fg-muted">{description}</p>
    </div>
  )
}

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false)
  return (
    <Input
      ref={ref}
      {...props}
      type={show ? 'text' : 'password'}
      rightSlot={
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="rounded-md p-2 text-fg-subtle hover:text-fg">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  )
})

/** OAuth sign-in buttons. Each provider must be enabled in Supabase → Authentication → Providers. */
export function SocialButtons() {
  const toast = useToast()
  const { signInWithProvider, status } = useAuth()
  const [busy, setBusy] = useState<OAuthProvider | null>(null)
  const items: { id: OAuthProvider; label: string; icon: React.ReactNode }[] = [
    { id: 'google', label: 'Google', icon: <span className="font-display text-base font-bold">G</span> },
    { id: 'discord', label: 'Discord', icon: <MessageCircle className="h-4 w-4" /> },
    { id: 'github', label: 'GitHub', icon: <GitBranch className="h-4 w-4" /> },
  ]
  if (status === 'disabled') return null
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((i) => (
          <button
            key={i.id}
            type="button"
            disabled={busy !== null}
            onClick={async () => {
              setBusy(i.id)
              try {
                await signInWithProvider(i.id)
              } catch (e) {
                toast({ title: `${i.label} sign-in unavailable`, description: (e as Error).message, variant: 'error' })
                setBusy(null)
              }
            }}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 text-[13px] font-semibold text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-60"
          >
            {busy === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : i.icon}
            <span className="hidden xs:inline">{i.label}</span>
          </button>
        ))}
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-fg-subtle">
        <span className="h-px flex-1 bg-line" />
        or continue with email
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  )
}

export function passwordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) score++
  return score
}

export function StrengthMeter({ password }: { password: string }) {
  const score = passwordStrength(password)
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-info', 'bg-success']
  if (!password) return null
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full', i < score ? colors[score] : 'bg-surface-3')} />
        ))}
      </div>
      <p className="mt-1 text-xs text-fg-subtle">Password strength: {labels[score]}</p>
    </div>
  )
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
