import { t } from '@/i18n'
import { Building2, CalendarDays, ExternalLink, Film, Heart, MapPin, Users } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AnimeCardFeatured, AnimeGrid, StudioMark } from '@/components/anime'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { useBrowse, useStudio } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { formatNumber } from '@/lib/format'
import NotFoundPage from '@/pages/info/NotFoundPage'

export default function StudioPage() {
  const { id } = useParams()
  const { data: studio, isLoading, isError, refetch } = useStudio(id)
  const works = useBrowse({ studio: id, perPage: 48, sort: 'popularity' })
  useDocumentMeta({ title: studio?.name ?? t('Studio'), description: studio?.description })

  if (isLoading)
    return (
      <div className="container-app py-10">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    )
  if (isError)
    return (
      <div className="container-app py-16">
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  if (!studio) return <NotFoundPage />
  const items = works.data?.items ?? []
  // Only facts the data source actually provides — no placeholder dashes.
  const stats = [
    { icon: Film, label: t('Anime'), value: formatNumber(studio.animeCount ?? works.data?.total ?? items.length) },
    { icon: Heart, label: t('Favorites'), value: studio.favorites ? formatNumber(studio.favorites) : null },
    { icon: CalendarDays, label: t('Founded'), value: studio.founded ? String(studio.founded) : null },
    { icon: MapPin, label: t('Country'), value: studio.country ?? null },
    { icon: Users, label: t('Staff'), value: studio.employees ? formatNumber(studio.employees) : null },
  ].filter((s) => s.value !== null)
  const link = studio.website ?? studio.siteUrl
  const linkLabel = studio.website ? t('Official website') : link?.includes('anilist.co') ? t('View on AniList') : t('View on MyAnimeList')

  return (
    <div className="container-app">
      <PageHeader
        crumbs={[{ label: t('Home'), to: '/' }, { label: t('Studios'), to: '/studios' }, { label: studio.name }]}
        title={
          <span className="flex items-center gap-4">
            <StudioMark studio={studio} className="h-14 w-14 text-lg sm:h-16 sm:w-16 sm:text-xl" />
            {studio.name}
          </span>
        }
        description={studio.description}
        actions={
          link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-fg">
              <ExternalLink className="h-3.5 w-3.5" />
              {linkLabel}
            </a>
          ) : undefined
        }
      />
      <dl className={`grid grid-cols-2 gap-3 ${stats.length >= 4 ? 'md:grid-cols-4' : stats.length === 3 ? 'md:grid-cols-3' : ''}`}>
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-4">
            <dt className="flex items-center gap-1.5 text-xs text-fg-subtle">
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </dt>
            <dd className="mt-1 font-display text-xl font-bold text-fg">{s.value}</dd>
          </div>
        ))}
      </dl>
      {items[0] && <AnimeCardFeatured anime={items[0]} label={t('Most popular work')} className="mt-10" />}
      <section aria-labelledby="works-heading" className="mt-10">
        <h2 id="works-heading" className="mb-5 text-xl font-bold text-fg">
          {t('Popular works')}
        </h2>
        <AnimeGrid items={items} loading={works.isLoading} showGenres empty={<EmptyState icon={<Building2 />} title={t('No titles yet')} description={t('This studio has no titles in the catalog.')} />} />
      </section>
    </div>
  )
}
