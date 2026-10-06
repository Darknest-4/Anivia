import { Link } from 'react-router-dom'
import { usePrefetchAnime } from '@/hooks/queries'
import { cn } from '@/lib/cn'
import type { Anime } from '@/types'
import { AnimeGenreBadge } from './AnimeGenreBadge'
import { AnimeMeta, StatusBadge } from './AnimeMeta'
import { AnimePoster } from './AnimePoster'
import { AnimeRating } from './AnimeRating'
import { WatchlistIconButton } from './WatchlistButton'

interface Props {
  anime: Anime
  className?: string
  actions?: React.ReactNode
}

/** Poster-left card with synopsis. Used for search results and list views. */
export function AnimeCardHorizontal({ anime, className, actions }: Props) {
  const prefetch = usePrefetchAnime()
  return (
    <article onPointerEnter={() => prefetch(anime.id)} onFocusCapture={() => prefetch(anime.id)} className={cn('group relative flex gap-4 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong hover:bg-surface-2/60 sm:p-4', className)}>
      <Link to={`/anime/${anime.id}`} className="relative w-24 shrink-0 overflow-hidden rounded-xl sm:w-28" aria-label={anime.title}>
        <AnimePoster src={anime.poster} alt="" sizes="120px" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-base font-semibold text-fg">
              <Link to={`/anime/${anime.id}`} className="hover:text-accent-soft">
                {anime.title}
              </Link>
            </h3>
            {anime.alternativeTitle && <p className="truncate text-xs text-fg-subtle">{anime.alternativeTitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">{actions ?? <WatchlistIconButton anime={anime} className="bg-surface-3 text-fg ring-line" />}</div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <AnimeRating rating={anime.rating} variant="badge" />
          <StatusBadge status={anime.status} />
          <AnimeMeta anime={anime} show={['type', 'year', 'episodes', 'duration']} />
        </div>
        <p className="synopsis mt-2 line-clamp-2 text-[13px] leading-relaxed text-fg-muted sm:line-clamp-3">{anime.description}</p>
        <div className="mt-auto hidden flex-wrap gap-1.5 pt-3 sm:flex">
          {anime.genres.slice(0, 4).map((g) => (
            <AnimeGenreBadge key={g.id} genre={g} />
          ))}
        </div>
      </div>
    </article>
  )
}
