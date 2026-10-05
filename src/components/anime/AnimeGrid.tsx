import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { Anime } from '@/types'
import { AnimeCard } from './AnimeCard'
import { AnimeCardSkeleton } from './Skeletons'

interface AnimeGridProps {
  items?: Anime[]
  loading?: boolean
  skeletonCount?: number
  empty?: ReactNode
  className?: string
  density?: 'comfortable' | 'dense'
  showGenres?: boolean
  priorityCount?: number
}

export const gridClasses = {
  comfortable: 'grid grid-cols-2 gap-x-3 gap-y-6 xs:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 3xl:grid-cols-8',
  dense: 'grid grid-cols-2 gap-x-3 gap-y-6 xs:grid-cols-3 sm:gap-x-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
}

/** Responsive poster grid with built-in skeleton and empty handling. */
export function AnimeGrid({ items, loading, skeletonCount = 12, empty, className, density = 'comfortable', showGenres, priorityCount = 0 }: AnimeGridProps) {
  if (loading && !items?.length) {
    return (
      <div className={cn(gridClasses[density], className)} aria-busy="true" aria-label="Loading anime">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <AnimeCardSkeleton key={i} />
        ))}
      </div>
    )
  }
  if (!items?.length) return <>{empty}</>
  return (
    <ul className={cn(gridClasses[density], className)}>
      {items.map((anime, i) => (
        <li key={anime.id} className="min-w-0">
          <AnimeCard anime={anime} showGenres={showGenres} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  )
}
