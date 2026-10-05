import { Link2, Sparkles } from 'lucide-react'
import { AnimeCard, AnimeRowSkeleton, ScrollRow } from '@/components/anime'
import { SectionHeader } from '@/components/common/SectionHeader'
import { useRecommendations, useRelated } from '@/hooks/queries'
import type { Anime } from '@/types'

export function RelatedSections({ anime }: { anime: Anime }) {
  const related = useRelated(anime.id)
  const recs = useRecommendations([anime.id])
  return (
    <div className="mt-16 space-y-14">
      {(related.isLoading || (related.data?.length ?? 0) > 0) && (
        <section aria-labelledby="related-heading" className="container-app">
          <SectionHeader id="related-heading" title="Related Anime" icon={<Link2 />} />
          {related.data ? (
            <ScrollRow label="Related anime">
              {related.data.map((a) => (
                <AnimeCard key={a.id} anime={a} />
              ))}
            </ScrollRow>
          ) : (
            <AnimeRowSkeleton />
          )}
        </section>
      )}
      <section aria-labelledby="recs-heading" className="container-app">
        <SectionHeader id="recs-heading" title="You May Also Like" icon={<Sparkles />} description={`Because you viewed ${anime.title}`} />
        {recs.data ? (
          <ScrollRow label="Recommendations">
            {recs.data.map((a) => (
              <AnimeCard key={a.id} anime={a} />
            ))}
          </ScrollRow>
        ) : (
          <AnimeRowSkeleton />
        )}
      </section>
    </div>
  )
}
