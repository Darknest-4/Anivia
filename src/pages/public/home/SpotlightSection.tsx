import { t } from '@/i18n'
import { Trophy } from 'lucide-react'
import { AnimeCardCompact, AnimeCardFeatured } from '@/components/anime'
import { SectionHeader } from '@/components/common/SectionHeader'
import { Skeleton } from '@/components/ui'
import { useFeatured, useTopRated } from '@/hooks/queries'

/** Large featured card paired with the Top Rated leaderboard. */
export function SpotlightSection() {
  const featured = useFeatured()
  const top = useTopRated()
  const pick = featured.data?.[1] ?? featured.data?.[0]
  return (
    <section aria-label={t('Spotlight and top rated')} className="container-app grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col">
        <SectionHeader title={t('Editor’s Spotlight')} eyebrow={t('Featured')} />
        {pick ? <AnimeCardFeatured anime={pick} label={t('Editor’s pick of the week')} className="flex-1" /> : <Skeleton className="h-[340px] rounded-2xl" />}
      </div>
      <div className="min-w-0">
        <SectionHeader title={t('Top Rated')} icon={<Trophy />} href="/browse?sort=rating" />
        <ol className="rounded-2xl border border-line bg-surface p-2">
          {top.data
            ? top.data.slice(0, 5).map((a, i) => (
                <li key={a.id}>
                  <AnimeCardCompact anime={a} rank={i + 1} />
                </li>
              ))
            : Array.from({ length: 5 }, (_, i) => (
                <li key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-[72px] w-12" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </li>
              ))}
        </ol>
      </div>
    </section>
  )
}
