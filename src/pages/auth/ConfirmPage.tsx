import { t } from '@/i18n'
import type { EmailOtpType } from '@supabase/supabase-js'
import { MailCheck, MailX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Skeleton } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { getSupabase } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'

const TYPES: EmailOtpType[] = ['signup', 'email', 'recovery', 'email_change', 'magiclink', 'invite']

/** Where each link type lands after a successful check. */
const NEXT: Partial<Record<EmailOtpType, string>> = {
  recovery: '/reset-password',
  email_change: '/settings?tab=account',
}

/**
 * Landing page for the links in ANIVIA's auth emails:
 *   https://anivia.animehub.hu/auth/confirm?token_hash={{ .TokenHash }}&type=signup
 * Verifying the token hash here (instead of Supabase's /verify redirect) keeps the link on our own
 * domain and works on any device — PKCE links only work in the browser that requested them.
 */
export default function ConfirmPage() {
  useDocumentMeta({ title: t('Confirm your email'), noindex: true })
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const tokenHash = params.get('token_hash')
    const type = params.get('type') as EmailOtpType | null
    if (!tokenHash || !type || !TYPES.includes(type)) {
      setError(t('This link is incomplete. Open it straight from the email.'))
      return
    }
    void (async () => {
      try {
        const client = await getSupabase()
        const { error: otpError } = await client.auth.verifyOtp({ token_hash: tokenHash, type })
        if (otpError) throw otpError
        if (type === 'signup' || type === 'email' || type === 'invite') toast({ title: t('Welcome to ANIVIA!'), description: t('Your account is ready.') })
        if (type === 'email_change') toast({ title: t('Email address updated') })
        navigate(NEXT[type] ?? '/', { replace: true })
      } catch {
        setError(t('This link is invalid or has expired. Links work once and only for a limited time.'))
      }
    })()
  }, [params, navigate, toast])

  if (!error)
    return (
      <div className="animate-fade-up text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent-soft">
          <MailCheck className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-fg">{t('Confirming…')}</h1>
        <Skeleton className="mx-auto mt-4 h-4 w-48 rounded-full" />
      </div>
    )

  return (
    <div className="animate-fade-up text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/15 text-warning">
        <MailX className="h-8 w-8" />
      </span>
      <h1 className="mt-6 text-2xl font-bold text-fg">{t('Link not valid')}</h1>
      <p className="mt-2 text-sm text-fg-muted">{error}</p>
      <div className="mt-6 flex justify-center gap-4 text-sm font-semibold">
        <Link to="/login" className="text-accent-soft hover:underline">
          {t('Sign in')}
        </Link>
        <Link to="/forgot-password" className="text-accent-soft hover:underline">
          {t('Send a new link')}
        </Link>
      </div>
    </div>
  )
}
