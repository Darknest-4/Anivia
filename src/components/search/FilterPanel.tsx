import { Check, X } from 'lucide-react'
import { Select } from '@/components/ui'
import { useGenres } from '@/hooks/queries'
import { cn } from '@/lib/cn'
import { seasonLabel, statusLabel } from '@/lib/format'
import type { AnimeFilters, AnimeStatus, AnimeType, AudioLanguage, SeasonName } from '@/types'
import { LANGUAGE_OPTIONS, RATING_OPTIONS, SEASON_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS, YEAR_OPTIONS } from './filterOptions'

interface FilterPanelProps {
  value: AnimeFilters
  onChange: (patch: Partial<AnimeFilters>) => void
  layout?: 'bar' | 'stack'
  hide?: (keyof AnimeFilters)[]
}

/** Reusable filter controls. "bar" = inline desktop toolbar, "stack" = drawer / sidebar layout. */
export function FilterPanel({ value, onChange, layout = 'bar', hide = [] }: FilterPanelProps) {
  const { data: genres } = useGenres()
  const selected = value.genres ?? []
  const toggleGenre = (slug: string) =>
    onChange({ genres: selected.includes(slug) ? selected.filter((g) => g !== slug) : [...selected, slug] })

  const selects = [
    { key: 'year', label: 'Year', options: YEAR_OPTIONS, value: value.year ? String(value.year) : '', set: (v: string) => onChange({ year: v ? Number(v) : undefined }) },
    { key: 'season', label: 'Season', options: SEASON_OPTIONS, value: value.season ?? '', set: (v: string) => onChange({ season: (v || undefined) as SeasonName | undefined }) },
    { key: 'status', label: 'Status', options: STATUS_OPTIONS, value: value.status ?? '', set: (v: string) => onChange({ status: (v || undefined) as AnimeStatus | undefined }) },
    { key: 'type', label: 'Type', options: TYPE_OPTIONS, value: value.type ?? '', set: (v: string) => onChange({ type: (v || undefined) as AnimeType | undefined }) },
    { key: 'minRating', label: 'Rating', options: RATING_OPTIONS, value: value.minRating ? String(value.minRating) : '', set: (v: string) => onChange({ minRating: v ? Number(v) : undefined }) },
    { key: 'language', label: 'Language', options: LANGUAGE_OPTIONS, value: value.language ?? '', set: (v: string) => onChange({ language: (v || undefined) as AudioLanguage | undefined }) },
  ].filter((s) => !hide.includes(s.key as keyof AnimeFilters))

  return (
    <div className={cn(layout === 'stack' ? 'space-y-6' : 'space-y-4')}>
      <div className={cn(layout === 'bar' ? 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid grid-cols-2 gap-3')}>
        {selects.map((s) => (
          <div key={s.key}>
            {layout === 'stack' && <p className="mb-1.5 text-[13px] font-medium text-fg">{s.label}</p>}
            <Select size="sm" aria-label={s.label} value={s.value} onChange={(e) => s.set(e.target.value)} options={s.options} placeholder={layout === 'bar' ? `${s.label}: Any` : 'Any'} />
          </div>
        ))}
      </div>
      {!hide.includes('genres') && (
        <div>
          {layout === 'stack' && <p className="mb-2 text-[13px] font-medium text-fg">Genres</p>}
          <div role="group" aria-label="Genres" className={cn('flex gap-2', layout === 'bar' ? 'scrollbar-none -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0' : 'flex-wrap')}>
            {(genres ?? []).map((g) => {
              const on = selected.includes(g.slug)
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleGenre(g.slug)}
                  className={cn(
                    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                    on ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-muted ring-1 ring-inset ring-line hover:text-fg hover:ring-line-strong',
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                  {g.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** Removable chips summarizing active filters. */
export function ActiveFilters({ value, onChange, onReset }: { value: AnimeFilters; onChange: (patch: Partial<AnimeFilters>) => void; onReset: () => void }) {
  const { data: genres } = useGenres()
  const chips: { label: string; clear: () => void }[] = []
  if (value.query) chips.push({ label: `“${value.query}”`, clear: () => onChange({ query: undefined }) })
  for (const slug of value.genres ?? [])
    chips.push({ label: genres?.find((g) => g.slug === slug)?.name ?? slug, clear: () => onChange({ genres: value.genres?.filter((g) => g !== slug) }) })
  if (value.year) chips.push({ label: String(value.year), clear: () => onChange({ year: undefined }) })
  if (value.season) chips.push({ label: seasonLabel[value.season], clear: () => onChange({ season: undefined }) })
  if (value.status) chips.push({ label: statusLabel[value.status], clear: () => onChange({ status: undefined }) })
  if (value.type) chips.push({ label: value.type, clear: () => onChange({ type: undefined }) })
  if (value.minRating) chips.push({ label: `${value.minRating}+ rating`, clear: () => onChange({ minRating: undefined }) })
  if (value.language) chips.push({ label: value.language, clear: () => onChange({ language: undefined }) })
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.clear}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-accent/12 pl-3 pr-2 text-xs font-semibold text-accent-soft ring-1 ring-inset ring-accent/25 hover:bg-accent/20"
          aria-label={`Remove filter ${c.label}`}
        >
          {c.label}
          <X className="h-3.5 w-3.5" />
        </button>
      ))}
      <button type="button" onClick={onReset} className="-my-2 rounded-md px-1.5 py-2 text-xs font-semibold text-fg-subtle hover:text-fg">
        Clear all
      </button>
    </div>
  )
}

export function countActiveFilters(v: AnimeFilters) {
  return (v.genres?.length ?? 0) + [v.year, v.season, v.status, v.type, v.minRating, v.language].filter(Boolean).length
}
