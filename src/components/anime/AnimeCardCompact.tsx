import { Link } from 'react-router-dom'
import { usePrefetchAnime } from '@/hooks/queries'
import { cn } from '@/lib/cn'
import type { Anime } from '@/types'
import { AnimeMeta } from './AnimeMeta'
import { AnimeRating } from './AnimeRating'

interface Props {
  anime: Anime
  rank?: number
  className?: string
  aside?: React.ReactNode
}

/** Dense row: small poster + title + meta. Used in top lists, sidebars and autocomplete. */
export function AnimeCardCompact({ anime, rank, className, aside }: Props) {
  const prefetch = usePrefetchAnime()
  return (
    <Link onPointerEnter={() => prefetch(anime.id)} onFocusCapture={() => prefetch(anime.id)}
      to={`/anime/${anime.id}`}
      className={cn('group flex min-w-0 items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2', className)}
    >
      {rank !== undefined && (
        <span
          className={cn(
            'w-7 shrink-0 text-center font-display text-lg font-extrabold tabular-nums',
            rank <= 3 ? 'text-accent-soft' : 'text-fg-subtle',
          )}
        >
          {String(rank).padStart(2, '0')}
        </span>
      )}
      <img src={anime.poster} alt="" loading="lazy" decoding="async" className="h-[72px] w-12 shrink-0 rounded-lg object-cover ring-1 ring-line" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg transition-colors group-hover:text-accent-soft">{anime.title}</p>
        <AnimeMeta anime={anime} className="mt-0.5" />
        <div className="mt-1.5 flex items-center gap-2">
          <AnimeRating rating={anime.rating} />
          <span className="truncate text-xs text-fg-subtle">{anime.genres[0]?.name}</span>
        </div>
      </div>
      {aside}
    </Link>
  )
}
