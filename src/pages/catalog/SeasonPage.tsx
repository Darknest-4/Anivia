import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimeGrid } from '@/components/anime'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, Select, Skeleton, Tabs } from '@/components/ui'
import { useCurrentSeason, useSeason } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { cn } from '@/lib/cn'
import { sortAnime } from '@/lib/filters'
import { makeSeason, parseSeasonSlug, SEASON_ORDER, shiftSeason } from '@/lib/seasons'
import type { SortOption } from '@/types'
import NotFoundPage from '@/pages/info/NotFoundPage'

const SORTS: { value: SortOption; label: string }[] = [
  { value: 'popularity', label: 'Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'title-asc', label: 'Alphabetical' },
]

export default function SeasonPage() {
  const { season: slug } = useParams()
  const navigate = useNavigate()
  const current = useCurrentSeason()
  const parsed = parseSeasonSlug(slug)
  const active = parsed ?? current.data
  const { data, isLoading, isError, refetch } = useSeason(active?.season, active?.year)
  const [sort, setSort] = useState<SortOption>('popularity')
  const sorted = useMemo(() => (data ? sortAnime(data, sort) : undefined), [data, sort])

  useDocumentMeta({ title: active ? `${active.label} Anime` : 'Seasonal Anime', description: 'Every anime premiering this season, plus upcoming and previous seasons.' })

  if (slug && !parsed) return <NotFoundPage />
  if (!active || !current.data)
    return (
      <div className="container-app py-10">
        <Skeleton className="h-10 w-72" />
      </div>
    )

  const prev = shiftSeason(current.data, -1)
  const next = shiftSeason(current.data, 1)
  const quick = [
    { value: prev.slug, label: `Previous · ${prev.label}` },
    { value: current.data.slug, label: `Current · ${current.data.label}` },
    { value: next.slug, label: `Upcoming · ${next.label}` },
  ]
  const yearOptions = [2027, 2026, 2025, 2024, 2023, 2022, 2021]
  const selectOptions = yearOptions.flatMap((y) => [...SEASON_ORDER].reverse().map((s) => makeSeason(s, y))).map((s) => ({ value: s.slug, label: s.label }))

  return (
    <div className="container-app">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Seasonal' }]}
        eyebrow="Seasonal anime"
        title={`${active.label} Season`}
        description={active.slug === current.data.slug ? 'Everything airing right now, updated weekly.' : 'Explore the line-up for this anime season.'}
        actions={
          <div className="flex items-center gap-2">
            <Link to={`/season/${shiftSeason(active, -1).slug}`} aria-label="Previous season" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg-muted hover:text-fg">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Select size="md" aria-label="Choose season" value={active.slug} onChange={(e) => navigate(`/season/${e.target.value}`)} options={selectOptions} className="w-44" />
            <Link to={`/season/${shiftSeason(active, 1).slug}`} aria-label="Next season" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg-muted hover:text-fg">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <nav aria-label="Season shortcuts" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {quick.map((q) => (
          <Link
            key={q.value}
            to={`/season/${q.value}`}
            aria-current={active.slug === q.value ? 'page' : undefined}
            className={cn(
              'inline-flex h-10 shrink-0 items-center rounded-xl px-4 text-sm font-semibold transition-colors',
              active.slug === q.value ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg-muted ring-1 ring-inset ring-line hover:text-fg',
            )}
          >
            {q.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">{data ? `${data.length} titles` : 'Loading…'}</p>
        <Tabs items={SORTS} value={sort} onChange={setSort} label="Sort season" variant="segmented" size="sm" idPrefix="season-sort" />
      </div>

      <div className="mt-6">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <AnimeGrid
            items={sorted}
            loading={isLoading}
            showGenres
            empty={<EmptyState icon={<CalendarRange />} title="No titles announced yet" description={`Nothing in the catalog for ${active.label} yet. Check back as new series are announced.`} />}
          />
        )}
      </div>
    </div>
  )
}
