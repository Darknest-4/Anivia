import { t } from '@/i18n'
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
        title={season ? t('{p0} Season', { p0: season.label }) : t('This Season')}
        eyebrow={t('Seasonal anime')}
        description={t('Every new series premiering this season, ranked by popularity.')}
        icon={<Snowflake />}
        href={season ? `/season/${season.slug}` : '/season'}
      />
      <AnimeGrid items={data?.slice(0, 12)} loading={isLoading || !season} skeletonCount={12} />
    </section>
  )
}
