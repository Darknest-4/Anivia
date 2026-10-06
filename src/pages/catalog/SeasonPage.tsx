import { t } from '@/i18n'
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
  { value: 'popularity', label: t('Popular') },
  { value: 'rating', label: t('Highest Rated') },
  { value: 'newest', label: t('Newest') },
  { value: 'title-asc', label: t('Alphabetical') },
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

  useDocumentMeta({ title: active ? t('{p0} Anime', { p0: active.label }) : t('Seasonal Anime'), description: t('Every anime premiering this season, plus upcoming and previous seasons.') })

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
    { value: prev.slug, label: t('Previous · {p0}', { p0: prev.label }) },
    { value: current.data.slug, label: t('Current · {p0}', { p0: current.data.label }) },
    { value: next.slug, label: t('Upcoming · {p0}', { p0: next.label }) },
  ]
  const yearOptions = Array.from({ length: 16 }, (_, i) => current.data!.year + 1 - i)
  const selectOptions = yearOptions.flatMap((y) => [...SEASON_ORDER].reverse().map((s) => makeSeason(s, y))).map((s) => ({ value: s.slug, label: s.label }))

  return (
    <div className="container-app">
      <PageHeader
        crumbs={[{ label: t('Home'), to: '/' }, { label: t('Seasonal') }]}
        eyebrow={t('Seasonal anime')}
        title={t('{p0} Season', { p0: active.label })}
        description={active.slug === current.data.slug ? t('Everything airing right now, updated weekly.') : t('Explore the line-up for this anime season.')}
        actions={
          <div className="flex items-center gap-2">
            <Link to={`/season/${shiftSeason(active, -1).slug}`} aria-label={t('Previous season')} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg-muted hover:text-fg">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Select size="md" aria-label={t('Choose season')} value={active.slug} onChange={(e) => navigate(`/season/${e.target.value}`)} options={selectOptions} className="w-44" />
            <Link to={`/season/${shiftSeason(active, 1).slug}`} aria-label={t('Next season')} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg-muted hover:text-fg">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <nav aria-label={t('Season shortcuts')} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
        <p className="text-sm text-fg-muted">{data ? t('{p0} titles', { p0: data.length }) : t('Loading…')}</p>
        <Tabs items={SORTS} value={sort} onChange={setSort} label={t('Sort season')} variant="segmented" size="sm" idPrefix="season-sort" />
      </div>

      <div className="mt-6">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <AnimeGrid
            items={sorted}
            loading={isLoading}
            showGenres
            empty={<EmptyState icon={<CalendarRange />} title={t('No titles announced yet')} description={t('Nothing in the catalog for {p0} yet. Check back as new series are announced.', { p0: active.label })} />}
          />
        )}
      </div>
    </div>
  )
}
