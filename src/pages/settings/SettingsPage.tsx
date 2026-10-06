import { t } from '@/i18n'
import { Bell, Gauge, Link2, LayoutGrid, MonitorPlay, Palette, RotateCcw, Shield, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Row } from './parts'
import { AccountSettings } from './sections/AccountSettings'
import { BrowserNotifications } from './sections/BrowserNotifications'
import { PrivacySettings } from './sections/PrivacySettings'
import { AppearanceExtras } from './sections/AppearanceExtras'
import { ConnectionsSettings } from './sections/ConnectionsSettings'
import { ContentSettings } from './sections/ContentSettings'
import { PerformanceSettings } from './sections/PerformanceSettings'
import { useAuth } from '@/providers/AuthProvider'
import { DemoNotice } from '@/components/common/DemoNotice'
import { PageHeader } from '@/components/common/PageHeader'
import { ThemeSegmented } from '@/components/navigation/ThemeToggle'
import { Button, Dialog, Field, Select, Switch } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { usePreferences } from '@/hooks/useUserData'
import { cn } from '@/lib/cn'
import { useToast } from '@/providers/ToastProvider'
import { hasVideoProvider } from '@/services/video'
import { storage } from '@/services/storage'
import { historyService, recentSearchesService } from '@/services/user'
import type { Preferences, VideoQuality } from '@/types'

type Section = 'appearance' | 'content' | 'playback' | 'performance' | 'notifications' | 'privacy' | 'connections' | 'account'

const allSections: { value: Section; label: string; icon: typeof Palette; description: string }[] = [
  { value: 'appearance', label: t('Appearance'), icon: Palette, description: t('Theme and motion preferences.') },
  { value: 'content', label: t('Content'), icon: LayoutGrid, description: t('Data source, titles, scores and home layout.') },
  { value: 'playback', label: t('Playback'), icon: MonitorPlay, description: t('Autoplay, quality and subtitles.') },
  { value: 'performance', label: t('Speed & data'), icon: Gauge, description: t('Caching, prefetching and data saver.') },
  { value: 'notifications', label: t('Notifications'), icon: Bell, description: t('Choose what we notify you about.') },
  { value: 'privacy', label: t('Privacy'), icon: Shield, description: t('Control your data and visibility.') },
  { value: 'connections', label: t('Connections'), icon: Link2, description: t('AniList sync.') },
  { value: 'account', label: t('Account'), icon: UserRound, description: t('Profile, sign-in and sessions.') },
]
// Player settings only matter when a video provider is configured (trailers have their own switch).
const sections = allSections.filter((s) => s.value !== 'playback' || hasVideoProvider)

const LANGS = [
  { value: 'en', label: t('English') },
  { value: 'ja', label: t('日本語 (Japanese)') },
  { value: 'es', label: t('Español') },
  { value: 'pt', label: t('Português') },
  { value: 'fr', label: t('Français') },
  { value: 'de', label: t('Deutsch') },
]

export default function SettingsPage() {
  useDocumentMeta({ title: t('Settings'), noindex: true })
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') as Section | null
  const section: Section = requested && sections.some((s) => s.value === requested) ? requested : 'appearance'
  const { prefs, update } = usePreferences()
  const auth = useAuth()
  const toast = useToast()
  const lastToast = useRef(0)
  const [resetOpen, setResetOpen] = useState(false)

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    update(key, value)
    if (Date.now() - lastToast.current > 3500) {
      lastToast.current = Date.now()
      toast({ title: t('Preferences saved'), description: t('Changes are stored on this device.'), duration: 2200 })
    }
  }

  const go = (s: Section) => setParams(s === 'appearance' ? {} : { tab: s }, { replace: true })


  const resetLocal = async () => {
    // Sign out first so the cleared local library is never pushed over the cloud copy.
    if (auth.status === 'signed-in') await auth.signOut().catch(() => undefined)
    const { clearAccountData } = await import('@/services/user/clearLocal')
    clearAccountData()
    storage.clearAll()
    setResetOpen(false)
    toast({ title: t('Local data cleared'), description: t('Watchlist, history and preferences on this device were reset.') })
  }

  return (
    <div>
      <PageHeader eyebrow={t('Account')} title={t('Settings')} description={t('Personalize ANIVIA. Preferences are saved instantly in this browser.')} />

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={t('Settings sections')} className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 xl:mx-0 xl:flex-col xl:overflow-visible xl:px-0">
          {sections.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => go(s.value)}
              aria-current={section === s.value ? 'page' : undefined}
              className={cn(
                'inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                section === s.value ? 'bg-surface-2 text-fg ring-1 ring-inset ring-line' : 'text-fg-muted hover:bg-surface-2/60 hover:text-fg',
              )}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-6">
          {section === 'appearance' && (
            <>
              <Card title={t('Theme')} description={t('Dark mode is the signature ANIVIA experience.')}>
                <Row>
                  <ThemeSegmented className="max-w-md" />
                  <div className="mt-5 grid max-w-xl grid-cols-3 gap-3" aria-hidden>
                    {(['dark', 'light', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        tabIndex={-1}
                        onClick={() => set('theme', t)}
                        className={cn('overflow-hidden rounded-xl border-2 text-left transition-colors', prefs.theme === t ? 'border-accent' : 'border-line hover:border-line-strong')}
                      >
                        <div className={cn('h-20 p-2', t === 'light' ? 'bg-[#f4f5fa]' : t === 'dark' ? 'bg-[#0b0b10]' : 'bg-gradient-to-r from-[#0b0b10] from-50% to-[#f4f5fa] to-50%')}>
                          <div className="h-2 w-10 rounded bg-accent" />
                          <div className="mt-2 grid grid-cols-3 gap-1">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className={cn('h-8 rounded', t === 'light' ? 'bg-[#dfe2ec]' : 'bg-[#1d1e26]')} />
                            ))}
                          </div>
                        </div>
                        <p className="bg-surface-2 px-2 py-1.5 text-xs font-semibold capitalize text-fg-muted">{t}</p>
                      </button>
                    ))}
                  </div>
                </Row>
              </Card>
              <AppearanceExtras prefs={prefs} set={set} />
              <Card title={t('Motion')}>
                <Row>
                  <Switch label={t('Reduce motion')} description={t('Minimize animations, carousels and transitions.')} checked={prefs.reduceMotion} onChange={(v) => set('reduceMotion', v)} />
                </Row>
              </Card>
            </>
          )}

          {section === 'content' && <ContentSettings prefs={prefs} set={set} />}
          {section === 'connections' && <ConnectionsSettings />}
          {section === 'performance' && <PerformanceSettings prefs={prefs} set={set} />}

          {section === 'playback' && (
            <Card title={t('Playback')} description={t('Applied to the ANIVIA player on every device using this browser.')}>
              <Row>
                <Switch label={t('Autoplay')} description={t('Start playing as soon as an episode opens.')} checked={prefs.autoplay} onChange={(v) => set('autoplay', v)} />
              </Row>
              <Row>
                <Switch label={t('Auto-next episode')} description={t('Automatically continue to the next episode.')} checked={prefs.autoNext} onChange={(v) => set('autoNext', v)} />
              </Row>
              <Row>
                <Switch label={t('Skip intro')} description={t('Show a skip button during openings.')} checked={prefs.skipIntro} onChange={(v) => set('skipIntro', v)} />
              </Row>
              <Row>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('Default quality')}>
                    {(p) => (
                      <Select
                        {...p}
                        value={prefs.defaultQuality}
                        onChange={(e) => set('defaultQuality', e.target.value as VideoQuality)}
                        options={[
                          { value: 'auto', label: t('Auto (recommended)') },
                          { value: '1080p', label: '1080p' },
                          { value: '720p', label: '720p' },
                          { value: '480p', label: '480p' },
                          { value: '360p', label: t('360p (data saver)') },
                        ]}
                      />
                    )}
                  </Field>
                  <Field label={t('Subtitle language')}>
                    {(p) => <Select {...p} value={prefs.subtitleLanguage} onChange={(e) => set('subtitleLanguage', e.target.value)} options={LANGS.filter((l) => l.value !== 'ja')} />}
                  </Field>
                </div>
              </Row>
              <Row>
                <Switch label={t('Subtitles')} description={t('Show subtitles by default.')} checked={prefs.subtitles} onChange={(v) => set('subtitles', v)} />
              </Row>
            </Card>
          )}

          {section === 'notifications' && (
            <Card title={t('Notifications')} description={t('Alerts are generated from your watchlist and live airing data — see the bell icon.')}>
              <Row>
                <Switch label={t('New episodes')} description={t('When a new episode of a show you’re watching or planning is out.')} checked={prefs.notifyNewEpisodes} onChange={(v) => set('notifyNewEpisodes', v)} />
              </Row>
              <Row>
                <Switch label={t('Airing reminders & premieres')} description={t('Episodes airing within 24 hours and premieres within two weeks.')} checked={prefs.notifyReleases} onChange={(v) => set('notifyReleases', v)} />
              </Row>
              <Row>
                <BrowserNotifications />
              </Row>
            </Card>
          )}

          {section === 'privacy' && (
            <>
              <PrivacySettings />
              <Card title={t('Your data')} description={t('Your library is stored in this browser and — when you’re signed in — in your account.')}>
                <Row>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-fg">{t('Watch history')}</p>
                      <p className="text-[13px] text-fg-subtle">{t('Remove all progress and Continue Watching entries.')}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        historyService.clear()
                        toast({ title: t('Watch history cleared'), variant: 'info' })
                      }}
                    >
                      {t('Clear history')}
                    </Button>
                  </div>
                </Row>
                <Row>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-fg">{t('Search history')}</p>
                      <p className="text-[13px] text-fg-subtle">{t('Remove recent searches from this device.')}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        recentSearchesService.clear()
                        toast({ title: t('Search history cleared'), variant: 'info' })
                      }}
                    >
                      {t('Clear searches')}
                    </Button>
                  </div>
                </Row>
              </Card>
            </>
          )}

          {section === 'account' && auth.status !== 'disabled' && (
            <>
              <AccountSettings />
              <section className="rounded-2xl border border-danger/30 bg-danger/[0.04] p-5">
                <h2 className="text-base font-semibold text-fg">{t('Reset this device')}</h2>
                <p className="mt-1 text-[13px] text-fg-subtle">{t('Clears the local library, preferences and cache in this browser. Your synced account data is not deleted.')}</p>
                <Button className="mt-4" variant="secondary" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setResetOpen(true)}>
                  {t('Reset local data')}
                </Button>
              </section>
            </>
          )}

          {section === 'account' && auth.status === 'disabled' && (
            <DemoNotice>{t('Accounts are disabled. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable sign-in and sync.')}</DemoNotice>
          )}
        </div>
      </div>

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        size="sm"
        icon={<RotateCcw className="h-5 w-5" />}
        title={t('Reset local data?')}
        description={t('Clears the watchlist, history and preferences stored on this device.')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button onClick={resetLocal}>{t('Reset')}</Button>
          </>
        }
      />
    </div>
  )
}
