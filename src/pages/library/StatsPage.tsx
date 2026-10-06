import { BarChart3, Clock3, Heart, Star, Tv } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { ButtonLink, EmptyState, Select } from '@/components/ui'
import { useAnimeByIds } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useFavorites, useHistory, useStore, useWatchlist } from '@/hooks/useUserData'
import { formatWatchTime } from '@/lib/format'
import { ratingsStore, WATCHLIST_STATUSES } from '@/services/user'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function Tile({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-fg-subtle [&>svg]:h-4 [&>svg]:w-4">
        {icon}
        {label}
      </p>
      <p className="mt-2 whitespace-nowrap font-display text-2xl font-bold tabular-nums text-fg">{value}</p>
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-fg">{title}</h2>
      {children}
    </section>
  )
}

/** Single-series vertical bars with a hover/title tooltip per bar. */
function Bars({ data, label }: { data: { key: string; label: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div>
      <div className="flex h-36 items-end gap-1.5" role="img" aria-label={label}>
        {data.map((d) => (
          <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.value}`}>
            <div className="w-full rounded-t-[4px] bg-accent/80 transition-colors group-hover:bg-accent" style={{ height: `${d.value ? Math.max(4, (d.value / max) * 100) : 0}%` }} />
            <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-surface-3 px-2 py-0.5 text-2xs text-fg shadow group-hover:block">
              {d.label}: {d.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 border-t border-line pt-1.5 text-2xs text-fg-subtle">
        {data.map((d) => (
          <span key={d.key} className="flex-1 text-center">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function Meter({ label, value, max, href }: { label: string; value: number; max: number; href?: string }) {
  const body = (
    <>
      <span className="flex justify-between text-xs">
        <span className="text-fg">{label}</span>
        <span className="tabular-nums text-fg-muted">{value}</span>
      </span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-3">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${(value / Math.max(1, max)) * 100}%` }} />
      </span>
    </>
  )
  return <li>{href ? <Link to={href} className="block hover:opacity-90">{body}</Link> : body}</li>
}

/** Personal statistics and a year in review. */
export default function StatsPage() {
  useDocumentMeta({ title: 'My stats', noindex: true })
  const { items: watchlist } = useWatchlist()
  const history = useHistory()
  const ratings = useStore(ratingsStore)
  const { ids: favorites } = useFavorites()
  const ids = useMemo(() => [...new Set([...watchlist.map((w) => w.animeId), ...Object.keys(ratings), ...favorites])], [watchlist, ratings, favorites])
  const { data } = useAnimeByIds(ids.slice(0, 80))
  const byId = useMemo(() => new Map((data ?? []).map((a) => [a.id, a])), [data])
  const years = useMemo(() => {
    const ys = new Set<number>([new Date().getFullYear()])
    for (const h of history) ys.add(new Date(h.lastWatched).getFullYear())
    return [...ys].sort((a, b) => b - a)
  }, [history])
  const [year, setYear] = useState(years[0])

  const watched = history.filter((h) => h.completed)
  const seconds = history.reduce((s, h) => s + h.progress, 0)
  const scores = Object.values(ratings)
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

  const monthly = MONTHS.map((m, i) => ({
    key: m,
    label: m,
    value: watched.filter((h) => {
      const d = new Date(h.lastWatched)
      return d.getFullYear() === year && d.getMonth() === i
    }).length,
  }))
  const distribution = Array.from({ length: 10 }, (_, i) => ({ key: String(i + 1), label: String(i + 1), value: scores.filter((s) => Math.round(s) === i + 1).length }))
  const genreCounts = new Map<string, { name: string; slug: string; n: number }>()
  for (const id of ids) {
    const a = byId.get(id)
    if (!a) continue
    for (const g of a.genres) genreCounts.set(g.id, { name: g.name, slug: g.slug, n: (genreCounts.get(g.id)?.n ?? 0) + 1 })
  }
  const genres = [...genreCounts.values()].sort((a, b) => b.n - a.n).slice(0, 8)
  const statusCounts = WATCHLIST_STATUSES.map((s) => ({ ...s, n: watchlist.filter((w) => w.status === s.value).length }))
  const yearEpisodes = monthly.reduce((s, m) => s + m.value, 0)
  const yearTitles = [...new Set(watched.filter((h) => new Date(h.lastWatched).getFullYear() === year).map((h) => h.animeId))]
  const topOfYear = yearTitles
    .map((id) => ({ id, score: ratings[id] ?? 0, anime: byId.get(id) }))
    .filter((x) => x.anime)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  if (!watchlist.length && !history.length && !scores.length)
    return (
      <div className="pt-8 sm:pt-10">
        <PageHeader eyebrow="Library" title="My stats" />
        <EmptyState icon={<BarChart3 />} title="No stats yet" description="Add titles to your watchlist, mark episodes as watched and rate what you’ve seen." action={<ButtonLink to="/browse">Start exploring</ButtonLink>} />
      </div>
    )

  return (
    <div className="space-y-6 pb-10">
      <PageHeader eyebrow="Library" title="My stats" description="Your anime life in numbers — from your watchlist, history and scores." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile icon={<Tv />} label="Episodes watched" value={watched.length} />
        <Tile icon={<Clock3 />} label="Watch time" value={formatWatchTime(seconds)} />
        <Tile icon={<Star />} label="Average score" value={avg ? avg.toFixed(1) : '—'} hint={`${scores.length} rated`} />
        <Tile icon={<Heart />} label="Favorites" value={favorites.length} hint={`${watchlist.length} in watchlist`} />
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-fg">Year in review</h2>
          <Select size="sm" aria-label="Year" value={String(year)} onChange={(e) => setYear(Number(e.target.value))} options={years.map((y) => ({ value: String(y), label: String(y) }))} />
        </div>
        <p className="mb-4 text-sm text-fg-muted">
          In {year} you watched <strong className="text-fg">{yearEpisodes}</strong> episodes of <strong className="text-fg">{yearTitles.length}</strong> titles.
        </p>
        <Bars data={monthly} label={`Episodes watched per month in ${year}`} />
        {topOfYear.length > 0 && (
          <ol className="mt-5 space-y-2">
            {topOfYear.map((x, i) => (
              <li key={x.id} className="flex items-center gap-3 text-sm">
                <span className="w-5 font-display font-bold text-fg-subtle">{i + 1}</span>
                <Link to={`/anime/${x.id}`} className="min-w-0 flex-1 truncate font-medium text-fg hover:text-accent-soft">
                  {x.anime!.title}
                </Link>
                {x.score > 0 && <span className="tabular-nums text-fg-muted">{x.score}/10</span>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Your scores">{scores.length ? <Bars data={distribution} label="How many titles got each score" /> : <p className="text-sm text-fg-subtle">Rate titles to see your score distribution.</p>}</Panel>
        <Panel title="Favorite genres">
          {genres.length ? (
            <ul className="space-y-3">
              {genres.map((g) => (
                <Meter key={g.slug} label={g.name} value={g.n} max={genres[0].n} href={`/genres/${g.slug}`} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-subtle">Loading…</p>
          )}
        </Panel>
        <Panel title="Watchlist">
          <ul className="space-y-3">
            {statusCounts.map((s) => (
              <Meter key={s.value} label={s.label} value={s.n} max={Math.max(...statusCounts.map((x) => x.n))} />
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
