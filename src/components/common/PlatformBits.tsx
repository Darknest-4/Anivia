import { t } from '@/i18n'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Eye, Megaphone, Wrench, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button, Logo } from '@/components/ui'
import { useStore } from '@/hooks/useUserData'
import { useAuth } from '@/providers/AuthProvider'
import { useFlag, usePlatform } from '@/providers/PlatformProvider'
import { analyticsAllowed, animeViews, consentStore, setAnalyticsUser, stopAnalytics, trackPageview } from '@/services/platform/analytics'
import { setErrorReporterUser } from '@/services/platform/errors'
import { createPersistentStore } from '@/services/storage'

/** Sends page views (and time on page) to the database after consent. */
export function AnalyticsTracker() {
  const { pathname } = useLocation()
  const { session } = useAuth()
  const consent = useStore(consentStore)
  const enabled = useFlag('analytics')

  useEffect(() => {
    setAnalyticsUser(session?.access_token ?? null)
    setErrorReporterUser(session?.access_token ?? null)
  }, [session?.access_token])
  useEffect(() => {
    if (!enabled || consent !== 'granted') return
    // Let the page set its <title> first.
    const t = window.setTimeout(() => analyticsAllowed() && trackPageview(pathname, document.title.replace(/ [·|–-] ANIVIA$/, '')), 400)
    return () => window.clearTimeout(t)
  }, [pathname, enabled, consent])
  useEffect(() => {
    if (!enabled || consent !== 'granted') stopAnalytics()
  }, [enabled, consent])
  return null
}

/** Small, non-blocking consent prompt for anonymous usage statistics. */
export function ConsentBanner() {
  const consent = useStore(consentStore)
  const enabled = useFlag('analytics')
  const { pathname } = useLocation()
  if (!enabled || consent !== null || pathname === '/privacy') return null
  return (
    <div role="region" aria-label={t('Usage statistics')} className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-h,0px)+0.75rem)] z-toast mx-auto max-w-xl rounded-2xl border border-line bg-surface/95 p-4 shadow-xl backdrop-blur md:bottom-4">
      <div className="flex gap-3">
        <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-accent-soft" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">{t('Help us improve ANIVIA?')}</p>
          <p className="mt-1 text-xs text-fg-muted">
            We’d like to count page views and time spent on pages — anonymously, stored on our own server, no ads or third-party trackers.{' '}
            <Link to="/privacy" className="text-accent-soft hover:underline">
              {t('Privacy policy')}
            </Link>
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => consentStore.set('granted')}>
              {t('Allow')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => consentStore.set('denied')}>
              {t('No thanks')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const dismissedStore = createPersistentStore<string>('announcement-dismissed', '')

/** Site-wide announcement controlled by the `announcement_banner` flag. */
export function AnnouncementBanner() {
  const { flag, payload, flags } = usePlatform()
  const dismissed = useStore(dismissedStore)
  const on = flag('announcement_banner')
  const { text, link } = payload<{ text?: string; link?: string }>('announcement_banner')
  const version = flags.find((f) => f.key === 'announcement_banner')?.updated_at ?? text ?? ''
  if (!on || !text || dismissed === version) return null
  const body = link ? (
    link.startsWith('/') ? (
      <Link to={link} className="underline underline-offset-2">
        {text}
      </Link>
    ) : (
      <a href={link} target="_blank" rel="noreferrer" className="underline underline-offset-2">
        {text}
      </a>
    )
  ) : (
    text
  )
  return (
    <div className="relative z-header flex items-center justify-center gap-2 bg-accent px-10 py-2 text-center text-[13px] font-medium text-accent-fg">
      <Megaphone className="h-4 w-4 shrink-0" />
      <span>{body}</span>
      <button type="button" aria-label={t('Dismiss announcement')} onClick={() => dismissedStore.set(version)} className="absolute right-2 rounded-md p-1.5 hover:bg-black/15">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Shows a maintenance screen to everyone but staff while `maintenance_mode` is on. */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { flag, payload, isStaff } = usePlatform()
  const { pathname } = useLocation()
  const [now] = useState(() => new Date())
  if (!flag('maintenance_mode') || isStaff || pathname === '/login' || pathname === '/status') return <>{children}</>
  const { message } = payload<{ message?: string }>('maintenance_mode')
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        <Logo />
        <Wrench className="mx-auto mt-10 h-10 w-10 text-accent-soft" />
        <h1 className="mt-4 text-2xl font-bold text-fg">{t('Maintenance in progress')}</h1>
        <p className="mt-2 text-sm text-fg-muted">{message || 'We’ll be right back.'}</p>
        <p className="mt-6 text-xs text-fg-subtle">Checked {now.toLocaleTimeString()} · <Link to="/login" className="hover:underline">{t('Staff sign-in')}</Link></p>
      </div>
    </div>
  )
}

/** “1.2k views this week · 3 watching now” — from the analytics tables (no personal data). */
export function ViewCount({ animeId, className }: { animeId: string; className?: string }) {
  const on = useFlag('view_counts')
  const { status } = useAuth()
  const query = useQuery({
    queryKey: ['anime-views', animeId],
    queryFn: () => animeViews(animeId),
    enabled: on && status !== 'disabled',
    staleTime: 5 * 60_000,
    retry: false,
  })
  const d = query.data
  if (!on || !d || !d.views) return null
  const fmt = new Intl.NumberFormat(undefined, { notation: 'compact' })
  return (
    <span className={className} title={t('Page views on ANIVIA in the last 7 days')}>
      <Eye className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
      {t('{p0} views this week', { p0: fmt.format(d.views) })}{d.watching_now > 1 ? t(' · {p0} here now', { p0: d.watching_now }) : ''}
    </span>
  )
}
