import { RefreshCw } from 'lucide-react'
import { Button, Select, Switch } from '@/components/ui'
import { SORT_OPTIONS } from '@/lib/filters'
import { HOME_SECTIONS } from '@/pages/public/home/sections'
import { activeDataSource, DATA_SOURCE_KEY, type DataSource } from '@/services/anime'
import { storage } from '@/services/storage'
import type { Preferences, SortOption } from '@/types'
import { Card, Choice, Row } from '../parts'

type Set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => void

const SOURCES: { value: DataSource; label: string; description: string }[] = [
  { value: 'anilist', label: 'AniList', description: 'Fast GraphQL API with trailers, streaming links and schedules (recommended).' },
  { value: 'jikan', label: 'MyAnimeList (Jikan)', description: 'MyAnimeList scores and rankings. Slower due to strict rate limits.' },
  { value: 'mock', label: 'Offline demo', description: 'Fictional catalog with simulated playback — works without internet.' },
]

export function ContentSettings({ prefs, set }: { prefs: Preferences; set: Set }) {
  const hidden = new Set(prefs.hiddenHomeSections)
  return (
    <>
      <Card title="Data source" description="Where anime information comes from. Switching reloads the app; your library stays on this device.">
        <Row>
          <div role="radiogroup" aria-label="Data source" className="grid gap-2 md:grid-cols-3">
            {SOURCES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={activeDataSource === s.value}
                onClick={() => {
                  if (s.value === activeDataSource) return
                  storage.set(DATA_SOURCE_KEY, s.value)
                  storage.remove('query-cache')
                  window.location.reload()
                }}
                className={
                  activeDataSource === s.value
                    ? 'rounded-xl border border-accent/60 bg-accent/10 p-3 text-left'
                    : 'rounded-xl border border-line p-3 text-left transition-colors hover:border-line-strong'
                }
              >
                <p className="text-sm font-semibold text-fg">{s.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-fg-subtle">{s.description}</p>
              </button>
            ))}
          </div>
        </Row>
      </Card>

      <Card title="Titles & scores">
        <Row>
          <Choice
            label="Title language"
            description="Applies to AniList and MyAnimeList data."
            value={prefs.titleLanguage}
            onChange={(v) => set('titleLanguage', v)}
            options={[
              { value: 'english', label: 'English' },
              { value: 'romaji', label: 'Romaji' },
              { value: 'native', label: '日本語' },
            ]}
          />
        </Row>
        <Row>
          <Choice
            label="Score format"
            value={prefs.ratingScale}
            onChange={(v) => set('ratingScale', v)}
            options={[
              { value: '10', label: '8.5 / 10' },
              { value: '100', label: '85 / 100' },
              { value: '5', label: '4.3 / 5' },
            ]}
          />
        </Row>
        <Row>
          <Switch label="Hide scores" description="Browse without ratings influencing you." checked={prefs.hideScores} onChange={(v) => set('hideScores', v)} />
        </Row>
        <Row>
          <Switch label="Blur synopses" description="Spoiler shield — hover or focus a synopsis to reveal it." checked={prefs.blurSynopsis} onChange={(v) => set('blurSynopsis', v)} />
        </Row>
      </Card>

      <Card title="Browsing">
        <Row>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-fg">Default sort</span>
              <Select value={prefs.defaultSort} onChange={(e) => set('defaultSort', e.target.value as SortOption)} options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-fg">Results per page</span>
              <Select
                value={String(prefs.pageSize)}
                onChange={(e) => set('pageSize', Number(e.target.value) as Preferences['pageSize'])}
                options={[12, 24, 48].map((n) => ({ value: String(n), label: `${n} titles` }))}
              />
            </label>
          </div>
        </Row>
      </Card>

      <Card title="Home page" description="Choose which sections appear on the home page.">
        <Row>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {HOME_SECTIONS.map((s) => (
              <Switch
                key={s.id}
                label={s.label}
                checked={!hidden.has(s.id)}
                onChange={(on) => set('hiddenHomeSections', on ? prefs.hiddenHomeSections.filter((x) => x !== s.id) : [...prefs.hiddenHomeSections, s.id])}
              />
            ))}
          </div>
          {prefs.hiddenHomeSections.length > 0 && (
            <Button variant="ghost" size="sm" className="mt-4" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => set('hiddenHomeSections', [])}>
              Show all sections
            </Button>
          )}
        </Row>
      </Card>
    </>
  )
}
