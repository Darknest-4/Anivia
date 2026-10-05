import { Snowflake } from 'lucide-react'
import { AnimeGrid } from '@/components/anime'
import { SectionHeader } from '@/components/common/SectionHeader'
import { useCurrentSeason, useSeason } from '@/hooks/queries'

export function SeasonalSection() {
  const { data: season } = useCurrentSeason()
  const { data, isLoading } = useSeason(season?.season, season?.year)
  return (
    <section aria-labelledby="seasonal-heading" className="container-app">
      <SectionHeader
        id="seasonal-heading"
        title={season ? `${season.label} Season` : 'This Season'}
        eyebrow="Seasonal anime"
        description="Every new series premiering this season, ranked by popularity."
        icon={<Snowflake />}
        href={season ? `/season/${season.slug}` : '/season'}
      />
      <AnimeGrid items={data?.slice(0, 12)} loading={isLoading || !season} skeletonCount={12} />
    </section>
  )
}
