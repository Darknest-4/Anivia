import { Bell, Globe, MonitorPlay, Palette, RotateCcw, Shield, Trash2, UserRound } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DemoNotice } from '@/components/common/DemoNotice'
import { PageHeader } from '@/components/common/PageHeader'
import { ThemeSegmented } from '@/components/navigation/ThemeToggle'
import { Badge, Button, ButtonLink, Dialog, Field, Input, Select, Switch } from '@/components/ui'
import { demoUser } from '@/data/user'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { usePreferences } from '@/hooks/useUserData'
import { cn } from '@/lib/cn'
import { useToast } from '@/providers/ToastProvider'
import { isMockProvider } from '@/services/anime'
import { storage } from '@/services/storage'
import { favoritesStore, historyService, historyStore, preferencesStore, recentSearchesService, recentSearchesStore, seedDemoLibrary, seededStore, watchlistStore } from '@/services/user'
import type { Preferences, VideoQuality } from '@/types'

type Section = 'appearance' | 'playback' | 'notifications' | 'privacy' | 'language' | 'account'

const sections: { value: Section; label: string; icon: typeof Palette; description: string }[] = [
  { value: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme and motion preferences.' },
  { value: 'playback', label: 'Playback', icon: MonitorPlay, description: 'Autoplay, quality and subtitles.' },
  { value: 'notifications', label: 'Notifications', icon: Bell, description: 'Choose what we notify you about.' },
  { value: 'privacy', label: 'Privacy', icon: Shield, description: 'Control your data and visibility.' },
  { value: 'language', label: 'Language', icon: Globe, description: 'Interface and audio languages.' },
  { value: 'account', label: 'Account', icon: UserRound, description: 'Profile details and plan.' },
]

const LANGS = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語 (Japanese)' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
]

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-fg-subtle">{description}</p>}
      </div>
      <div className="divide-y divide-line/70 px-5">{children}</div>
    </section>
  )
}

const Row = ({ children }: { children: ReactNode }) => <div className="py-4">{children}</div>

export default function SettingsPage() {
  useDocumentMeta({ title: 'Settings', noindex: true })
  const [params, setParams] = useSearchParams()
  const section = (params.get('tab') as Section) || 'appearance'
  const { prefs, update } = usePreferences()
  const toast = useToast()
  const lastToast = useRef(0)
  const [resetOpen, setResetOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [profile, setProfile] = useState({ displayName: demoUser.displayName, username: demoUser.username, email: 'stargazer@example.com' })
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    update(key, value)
    if (Date.now() - lastToast.current > 3500) {
      lastToast.current = Date.now()
      toast({ title: 'Preferences saved', description: 'Changes are stored on this device.', duration: 2200 })
    }
  }

  const go = (s: Section) => setParams(s === 'appearance' ? {} : { tab: s }, { replace: true })

  const saveProfile = (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      toast({ title: 'Profile updated', description: 'Demo only — connect your account API to persist changes.' })
    }, 600)
  }

  const resetDemo = () => {
    storage.clearAll()
    ;[watchlistStore, historyStore, favoritesStore, recentSearchesStore, seededStore, preferencesStore].forEach((s) => s.reset())
    if (isMockProvider) seedDemoLibrary()
    setResetOpen(false)
    toast({ title: 'Demo data restored', description: 'Watchlist, history and preferences were reset.' })
  }

  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings" description="Personalize ANIVIA. Preferences are saved instantly in this browser." />

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 xl:mx-0 xl:flex-col xl:overflow-visible xl:px-0">
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
              <Card title="Theme" description="Dark mode is the signature ANIVIA experience.">
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
                          <div className="h-2 w-10 rounded bg-[hsl(348_83%_54%)]" />
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
              <Card title="Motion">
                <Row>
                  <Switch label="Reduce motion" description="Minimize animations, carousels and transitions." checked={prefs.reduceMotion} onChange={(v) => set('reduceMotion', v)} />
                </Row>
              </Card>
            </>
          )}

          {section === 'playback' && (
            <Card title="Playback" description="Applied to the ANIVIA player on every device using this browser.">
              <Row>
                <Switch label="Autoplay" description="Start playing as soon as an episode opens." checked={prefs.autoplay} onChange={(v) => set('autoplay', v)} />
              </Row>
              <Row>
                <Switch label="Auto-next episode" description="Automatically continue to the next episode." checked={prefs.autoNext} onChange={(v) => set('autoNext', v)} />
              </Row>
              <Row>
                <Switch label="Skip intro" description="Show a skip button during openings." checked={prefs.skipIntro} onChange={(v) => set('skipIntro', v)} />
              </Row>
              <Row>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Default quality">
                    {(p) => (
                      <Select
                        {...p}
                        value={prefs.defaultQuality}
                        onChange={(e) => set('defaultQuality', e.target.value as VideoQuality)}
                        options={[
                          { value: 'auto', label: 'Auto (recommended)' },
                          { value: '1080p', label: '1080p' },
                          { value: '720p', label: '720p' },
                          { value: '480p', label: '480p' },
                          { value: '360p', label: '360p (data saver)' },
                        ]}
                      />
                    )}
                  </Field>
                  <Field label="Subtitle language">
                    {(p) => <Select {...p} value={prefs.subtitleLanguage} onChange={(e) => set('subtitleLanguage', e.target.value)} options={LANGS.filter((l) => l.value !== 'ja')} />}
                  </Field>
                </div>
              </Row>
              <Row>
                <Switch label="Subtitles" description="Show subtitles by default." checked={prefs.subtitles} onChange={(v) => set('subtitles', v)} />
              </Row>
            </Card>
          )}

          {section === 'notifications' && (
            <Card title="Notifications" description="Demo preferences — wire them to your push / email service.">
              <Row>
                <Switch label="Release reminders" description="Get reminded before shows on your watchlist premiere." checked={prefs.notifyReleases} onChange={(v) => set('notifyReleases', v)} />
              </Row>
              <Row>
                <Switch label="New episodes" description="Know as soon as a new episode is available." checked={prefs.notifyNewEpisodes} onChange={(v) => set('notifyNewEpisodes', v)} />
              </Row>
              <Row>
                <Switch label="Announcements" description="Product news, new seasons and special events." checked={prefs.notifyAnnouncements} onChange={(v) => set('notifyAnnouncements', v)} />
              </Row>
            </Card>
          )}

          {section === 'privacy' && (
            <>
              <Card title="Privacy">
                <Row>
                  <Switch label="Private profile" description="Hide your profile and lists from other users." checked={prefs.privateProfile} onChange={(v) => set('privateProfile', v)} />
                </Row>
                <Row>
                  <Switch label="Show watch history on profile" checked={prefs.showHistory} onChange={(v) => set('showHistory', v)} />
                </Row>
              </Card>
              <Card title="Your data" description="ANIVIA stores library data locally in your browser. No personal information is collected.">
                <Row>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-fg">Watch history</p>
                      <p className="text-[13px] text-fg-subtle">Remove all progress and Continue Watching entries.</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        historyService.clear()
                        toast({ title: 'Watch history cleared', variant: 'info' })
                      }}
                    >
                      Clear history
                    </Button>
                  </div>
                </Row>
                <Row>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-fg">Search history</p>
                      <p className="text-[13px] text-fg-subtle">Remove recent searches from this device.</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        recentSearchesService.clear()
                        toast({ title: 'Search history cleared', variant: 'info' })
                      }}
                    >
                      Clear searches
                    </Button>
                  </div>
                </Row>
              </Card>
            </>
          )}

          {section === 'language' && (
            <Card title="Language" description="Localization strings are not included — this demonstrates the settings UI.">
              <Row>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Interface language">{(p) => <Select {...p} value={prefs.interfaceLanguage} onChange={(e) => set('interfaceLanguage', e.target.value)} options={LANGS} />}</Field>
                  <Field label="Preferred audio">
                    {(p) => (
                      <Select
                        {...p}
                        value={prefs.audioLanguage}
                        onChange={(e) => set('audioLanguage', e.target.value)}
                        options={['Japanese', 'English', 'Spanish', 'Portuguese', 'French', 'German'].map((l) => ({ value: l, label: l }))}
                      />
                    )}
                  </Field>
                </div>
              </Row>
            </Card>
          )}

          {section === 'account' && (
            <>
              <DemoNotice>Account management is UI-only. Connect your authentication provider and user API to persist these fields.</DemoNotice>
              <Card title="Profile">
                <Row>
                  <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                    <Field label="Display name">{(p) => <Input {...p} value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} autoComplete="name" />}</Field>
                    <Field label="Username">{(p) => <Input {...p} value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} autoComplete="username" />}</Field>
                    <Field label="Email" className="sm:col-span-2" hint="Used for account notices only.">
                      {(p) => <Input {...p} type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} autoComplete="email" />}
                    </Field>
                    <div className="sm:col-span-2">
                      <Button type="submit" loading={saving}>
                        Save changes
                      </Button>
                    </div>
                  </form>
                </Row>
              </Card>
              <Card title="Plan">
                <Row>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="accent" size="md">
                        PLUS
                      </Badge>
                      <p className="text-sm text-fg-muted">Ad-free · Full HD · 2 screens</p>
                    </div>
                    <ButtonLink to="/pricing" variant="secondary" size="sm">
                      Compare plans
                    </ButtonLink>
                  </div>
                </Row>
              </Card>
              <section className="rounded-2xl border border-danger/30 bg-danger/[0.04] p-5">
                <h2 className="text-base font-semibold text-fg">Danger zone</h2>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button variant="secondary" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setResetOpen(true)}>
                    Reset demo data
                  </Button>
                  <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteOpen(true)}>
                    Delete account
                  </Button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        size="sm"
        icon={<RotateCcw className="h-5 w-5" />}
        title="Reset demo data?"
        description="Restores the original demo watchlist, history and default preferences on this device."
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={resetDemo}>Reset</Button>
          </>
        }
      />
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        size="sm"
        icon={<Trash2 className="h-5 w-5" />}
        title="Delete account?"
        description="This is a UI demonstration. In production this would permanently delete the account via your backend."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteOpen(false)
                toast({ title: 'Nothing was deleted', description: 'Account deletion requires a connected backend.', variant: 'info' })
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </div>
  )
}
