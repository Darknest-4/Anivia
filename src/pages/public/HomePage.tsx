import { Flame, Sparkles, TrendingUp, RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import { AnimeHero, HeroSkeleton } from '@/components/anime'
import { ErrorState } from '@/components/ui'
import { useFeatured, usePopular, useRecent, useRecommendations, useTrending } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useHistory, useWatchlist } from '@/hooks/useUserData'
import { AnimeRowSection } from './home/AnimeRowSection'
import { ContinueWatchingSection } from './home/ContinueWatchingSection'
import { GenresSection } from './home/GenresSection'
import { JoinBanner } from './home/JoinBanner'
import { LatestEpisodesSection } from './home/LatestEpisodesSection'
import { SeasonalSection } from './home/SeasonalSection'
import { SpotlightSection } from './home/SpotlightSection'
import { StudiosSection } from './home/StudiosSection'
import { UpcomingSection } from './home/UpcomingSection'

export default function HomePage() {
  useDocumentMeta({})
  const featured = useFeatured()
  const trending = useTrending()
  const popular = usePopular()
  const recent = useRecent()
  const history = useHistory()
  const { items: watchlist } = useWatchlist()
  const seeds = useMemo(
    () => [...new Set([...history.map((h) => h.animeId), ...watchlist.map((w) => w.animeId)])].slice(0, 6),
    [history, watchlist],
  )
  const recommended = useRecommendations(seeds)

  return (
    <>
      {featured.isError ? (
        <div className="container-app pt-10">
          <ErrorState onRetry={() => featured.refetch()} />
        </div>
      ) : featured.data ? (
        <AnimeHero items={featured.data} />
      ) : (
        <div className="-mt-[var(--header-h)]">
          <HeroSkeleton />
        </div>
      )}

      <div className="relative z-10 space-y-14 pt-6 sm:space-y-16">
        <ContinueWatchingSection />
        <AnimeRowSection id="trending" title="Trending Now" icon={<TrendingUp />} href="/browse?sort=popularity" query={trending} ranked />
        <LatestEpisodesSection />
        <SpotlightSection />
        <AnimeRowSection id="popular" title="Popular This Week" icon={<Flame />} href="/browse?sort=popularity" query={popular} />
        <SeasonalSection />
        <GenresSection />
        <AnimeRowSection id="recent" title="Recently Updated" icon={<RefreshCw />} href="/browse?sort=updated" query={recent} />
        <UpcomingSection />
        <AnimeRowSection
          id="recommended"
          title="Recommended for You"
          eyebrow={seeds.length ? 'Based on your library' : 'Hand-picked'}
          icon={<Sparkles />}
          href="/browse?sort=rating"
          query={recommended}
        />
        <StudiosSection />
        <JoinBanner />
      </div>
    </>
  )
}
