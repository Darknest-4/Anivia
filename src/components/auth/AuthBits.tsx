import { t } from '@/i18n'
import { Eye, EyeOff, GitBranch, Loader2, MessageCircle } from 'lucide-react'
import { forwardRef, useEffect, useState, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth, type OAuthProvider } from '@/providers/AuthProvider'
import { usePlatform } from '@/providers/PlatformProvider'
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
  const { flag } = usePlatform()
  const [busy, setBusy] = useState<OAuthProvider | null>(null)
  const items = (
    [
      { id: 'google', label: t('Google'), icon: <span className="font-display text-base font-bold">G</span> },
      { id: 'discord', label: t('Discord'), icon: <MessageCircle className="h-4 w-4" /> },
      { id: 'github', label: t('GitHub'), icon: <GitBranch className="h-4 w-4" /> },
    ] as { id: OAuthProvider; label: string; icon: React.ReactNode }[]
  ).filter((i) => flag(`oauth_${i.id}`)) // enabled per provider in Admin → Feature flags
  // Nothing above the email form → no "or continue with email" divider either.
  if (status === 'disabled' || (!items.length && !flag('anilist_login'))) return null
  return (
    <div>
      {items.length > 0 && <div className={cn('grid gap-2', items.length === 1 ? 'grid-cols-1' : items.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
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
                toast({ title: t('{p0} sign-in unavailable', { p0: i.label }), description: (e as Error).message, variant: 'error' })
                setBusy(null)
              }
            }}
            aria-label={t('Continue with {p0}', { p0: i.label })}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 text-[13px] font-semibold text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-60"
          >
            {busy === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : i.icon}
            <span className={items.length === 3 ? 'hidden xs:inline' : undefined}>{i.label}</span>
          </button>
        ))}
      </div>}
      <div className={cn('flex items-center gap-3 text-xs text-fg-subtle', items.length ? 'my-6' : 'mb-6 mt-3')}>
        <span className="h-px flex-1 bg-line" />
        {t('or continue with email')}
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
  const labels = [t('Too short'), t('Weak'), t('Fair'), t('Good'), t('Strong')]
  const colors = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-info', 'bg-success']
  if (!password) return null
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full', i < score ? colors[score] : 'bg-surface-3')} />
        ))}
      </div>
      <p className="mt-1 text-xs text-fg-subtle">{t('Password strength: {p0}', { p0: labels[score] })}</p>
    </div>
  )
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)

/** "Didn't get the email?" — resends with a 60 s cooldown (Supabase rate-limits auth emails). */
export function ResendEmailButton({ onResend, className }: { onResend: () => Promise<void>; className?: string }) {
  const toast = useToast()
  const [wait, setWait] = useState(60)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (wait <= 0) return
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(id)
  }, [wait])
  return (
    <div className={cn('text-sm text-fg-muted', className)}>
      <p>{t('Didn’t get the email? Check your spam folder, or send it again.')}</p>
      <button
        type="button"
        disabled={busy || wait > 0}
        onClick={async () => {
          setBusy(true)
          try {
            await onResend()
            toast({ title: t('Email sent again'), description: t('It can take a minute to arrive.') })
            setWait(60)
          } catch (e) {
            toast({ title: t('Couldn’t send the email'), description: (e as Error).message, variant: 'error' })
            setWait(30)
          } finally {
            setBusy(false)
          }
        }}
        className="mt-2 inline-flex items-center gap-1.5 font-semibold text-accent-soft hover:underline disabled:cursor-not-allowed disabled:text-fg-subtle disabled:no-underline"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {wait > 0 ? t('Send again in {p0}s', { p0: wait }) : t('Send the email again')}
      </button>
    </div>
  )
}
