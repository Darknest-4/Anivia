import { Clapperboard } from 'lucide-react'
import { AnimeCardWideSkeleton, EpisodeReleaseCard } from '@/components/anime'
import { SectionHeader } from '@/components/common/SectionHeader'
import { useLatestEpisodes } from '@/hooks/queries'

export function LatestEpisodesSection() {
  const { data, isLoading } = useLatestEpisodes(8)
  return (
    <section aria-labelledby="latest-heading" className="container-app">
      <SectionHeader id="latest-heading" title="Latest Releases" icon={<Clapperboard />} description="Fresh episodes from this week’s broadcasts." href="/schedule" linkLabel="Schedule" />
      <div className="grid grid-cols-1 gap-x-4 gap-y-6 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading || !data
          ? Array.from({ length: 8 }, (_, i) => <AnimeCardWideSkeleton key={i} className={i >= 4 ? 'hidden lg:block' : undefined} />)
          : data.map((r, i) => <EpisodeReleaseCard key={r.episode.id} release={r} className={i >= 6 ? 'hidden xl:block' : i >= 4 ? 'hidden xs:block' : undefined} />)}
      </div>
    </section>
  )
}
