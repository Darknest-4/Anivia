import { t } from '@/i18n'
import { GenreTile } from '@/components/anime'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, Skeleton } from '@/components/ui'
import { useBrowse, useGenres } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { Link } from 'react-router-dom'
import { formatRating } from '@/lib/format'
import { thumb } from '@/lib/images'

export default function GenresPage() {
  useDocumentMeta({ title: t('Genres'), description: t('Explore anime by genre — action, fantasy, romance, sci-fi and more.') })
  const genres = useGenres()
  const all = useBrowse({ perPage: 100, sort: 'popularity' })
  const used = new Set<string>()
  const titlesFor = (slug: string) => (all.data?.items ?? []).filter((a) => a.genres.some((g) => g.slug === slug))

  return (
    <div className="container-app">
      <PageHeader crumbs={[{ label: t('Home'), to: '/' }, { label: t('Genres') }]} eyebrow={t('Discover')} title={t('Genres')} description={t('From quiet slice-of-life to galaxy-spanning mecha wars — find stories that match your mood.')} />
      {genres.isError ? (
        <ErrorState onRetry={() => genres.refetch()} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {genres.data
            ? genres.data.map((g) => {
                const titles = titlesFor(g.slug)
                // Prefer a featured title not already used by a previous genre for variety.
                const featured = titles.find((t) => !used.has(t.id)) ?? titles[0]
                if (featured) used.add(featured.id)
                return (
                  <li key={g.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
                    <GenreTile genre={g} posters={titles.map((t) => t.poster)} size="lg" className="rounded-none border-0" />
                    {featured && (
                      <Link to={`/anime/${featured.id}`} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                        <img src={thumb(featured.poster)} alt="" loading="lazy" className="h-12 w-8 rounded object-cover" />
                        <span className="min-w-0">
                          <span className="block text-2xs font-semibold uppercase tracking-wider text-fg-subtle">{t('Featured')}</span>
                          <span className="block truncate text-sm font-semibold text-fg group-hover:text-accent-soft">{featured.title}</span>
                        </span>
                        <span className="ml-auto text-xs text-fg-subtle">{featured.rating ? formatRating(featured.rating) : 'New'}</span>
                      </Link>
                    )}
                  </li>
                )
              })
            : Array.from({ length: 9 }, (_, i) => (
                <li key={i}>
                  <Skeleton className="h-64 rounded-2xl" />
                </li>
              ))}
        </ul>
      )}
    </div>
  )
}
