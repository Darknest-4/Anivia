import { t } from '@/i18n'
import { useQueries } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { AnimeCard, AnimeCardSkeleton, gridClasses } from '@/components/anime'
import { PageHeader } from '@/components/common/PageHeader'
import { ButtonLink, EmptyState } from '@/components/ui'
import { useAnimeByIds, useTopRated } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useFavorites, useHistory, useStore, useWatchlist } from '@/hooks/useUserData'
import { animeProvider } from '@/services/anime'
import { genreAffinity, pickSeeds, rankRecommendations } from '@/services/user/recommend'
import { ratingsStore } from '@/services/user/stores'

/** "What should I watch?" — personal picks from your scores, favourites and library. */
export default function ForYouPage() {
  useDocumentMeta({ title: t('For you'), description: t('Personal anime recommendations based on your scores and library.'), noindex: true })
  const ratings = useStore(ratingsStore)
  const { ids: favorites } = useFavorites()
  const { items: watchlist } = useWatchlist()
  const history = useHistory()
  const seeds = useMemo(() => pickSeeds(ratings, favorites, watchlist, history), [ratings, favorites, watchlist, history])
  const libraryIds = useMemo(() => [...new Set([...watchlist.map((w) => w.animeId), ...favorites, ...Object.keys(ratings), ...history.map((h) => h.animeId)])], [watchlist, favorites, ratings, history])
  const library = useAnimeByIds(libraryIds.slice(0, 60))
  const perSeed = useQueries({
    queries: seeds.map((s) => ({ queryKey: ['recommendations', [s.id]], queryFn: () => animeProvider.getRecommendations([s.id], 12), staleTime: 30 * 60_000 })),
  })
  const fallback = useTopRated()
  const loading = perSeed.some((q) => q.isLoading) || library.isLoading

  const picks = useMemo(() => {
    const titleOf = new Map((library.data ?? []).map((a) => [a.id, a.title]))
    return rankRecommendations(
      seeds.map((seed, i) => ({ seed, seedTitle: titleOf.get(seed.id) ?? 'your library', items: perSeed[i]?.data ?? [] })),
      new Set(libraryIds),
      genreAffinity(library.data ?? [], ratings, favorites),
    )
    // perSeed is a new array each render; its data is what matters.
  }, [seeds, perSeed.map((q) => q.dataUpdatedAt).join(), library.data, libraryIds, ratings, favorites])

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t('Discover')}
        title={t('What should I watch?')}
        description={seeds.length ? t('Picked from the titles you scored highly, favourited and finished — the more you rate, the better it gets.') : t('Rate a few titles or add them to your watchlist and this page learns your taste.')}
      />
      {!seeds.length ? (
        <>
          <EmptyState icon={<Sparkles />} title={t('Tell us what you like')} description={t('Score some anime you’ve seen (1–10) or add favourites — recommendations appear here.')} action={<ButtonLink to="/browse?sort=rating">{t('Find titles to rate')}</ButtonLink>} />
          <h2 className="mb-4 mt-10 text-lg font-semibold text-fg">{t('Highest rated, meanwhile')}</h2>
          <ul className={gridClasses.dense}>
            {(fallback.data ?? []).slice(0, 12).map((a) => (
              <li key={a.id}>
                <AnimeCard anime={a} />
              </li>
            ))}
          </ul>
        </>
      ) : loading && !picks.length ? (
        <div className={gridClasses.dense}>
          {Array.from({ length: 12 }, (_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <ul className={gridClasses.dense}>
          {picks.map((r) => (
            <li key={r.anime.id} className="min-w-0">
              <AnimeCard anime={r.anime} />
              <p className="mt-1.5 line-clamp-2 text-2xs text-fg-subtle">Because you liked {r.because.slice(0, 2).join(' & ')}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
