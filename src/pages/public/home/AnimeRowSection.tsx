import type { ReactNode } from 'react'
import { AnimeCard, AnimeRowSkeleton, ScrollRow } from '@/components/anime'
import { SectionHeader } from '@/components/common/SectionHeader'
import { ErrorState } from '@/components/ui'
import type { Anime } from '@/types'

interface Props {
  id: string
  title: string
  eyebrow?: string
  description?: string
  icon?: ReactNode
  href?: string
  query: { data?: Anime[]; isLoading: boolean; isError: boolean; refetch: () => unknown }
  ranked?: boolean
}

/** Generic home-page row: header + horizontal carousel of poster cards with loading/error states. */
export function AnimeRowSection({ id, title, eyebrow, description, icon, href, query, ranked }: Props) {
  return (
    <section aria-labelledby={`${id}-heading`} className="container-app">
      <SectionHeader id={`${id}-heading`} title={title} eyebrow={eyebrow} description={description} icon={icon} href={href} />
      {query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : query.isLoading || !query.data ? (
        <AnimeRowSkeleton />
      ) : (
        <ScrollRow label={title}>
          {query.data.map((anime, i) => (
            <AnimeCard key={anime.id} anime={anime} rank={ranked ? i + 1 : undefined} />
          ))}
        </ScrollRow>
      )}
    </section>
  )
}
