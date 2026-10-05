import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { formatCompact } from '@/lib/format'
import type { Anime } from '@/types'
import { episodeLabel, StatusBadge } from './AnimeMeta'
import { AnimeRating } from './AnimeRating'
import { WatchlistIconButton } from './WatchlistButton'

interface Props {
  anime: Anime
  index?: number
  className?: string
  actions?: React.ReactNode
}

/**
 * Table-like row on desktop that collapses into a compact card on mobile.
 * Columns: # · title · genres · score · status · episodes · actions
 */
export function AnimeCardList({ anime, index, className, actions }: Props) {
  return (
    <article
      className={cn(
        'group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-line hover:bg-surface md:grid-cols-[2.5rem_minmax(0,2.5fr)_minmax(0,1.4fr)_5.5rem_6.5rem_5.5rem_2.75rem] md:gap-4 md:px-3',
        className,
      )}
    >
      {index !== undefined && <span className="hidden text-center font-display text-sm font-bold tabular-nums text-fg-subtle md:block">{index}</span>}
      <div className={cn('flex min-w-0 items-center gap-3', index === undefined ? 'col-span-2 md:col-span-2' : 'col-span-2 md:col-span-1')}>
        <Link to={`/anime/${anime.id}`} className="shrink-0" aria-label={anime.title}>
          <img src={anime.poster} alt="" loading="lazy" decoding="async" className="h-16 w-11 rounded-lg object-cover ring-1 ring-line" />
        </Link>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg">
            <Link to={`/anime/${anime.id}`} className="hover:text-accent-soft">
              {anime.title}
            </Link>
          </h3>
          <p className="truncate text-xs text-fg-subtle">
            {anime.type} · {anime.year} · {anime.studios[0]?.name}
          </p>
          <div className="mt-1 flex items-center gap-2 md:hidden">
            <AnimeRating rating={anime.rating} />
            <StatusBadge status={anime.status} />
            <span className="text-xs text-fg-subtle">{episodeLabel(anime)}</span>
          </div>
        </div>
      </div>
      <p className="hidden truncate text-[13px] text-fg-muted md:block">{anime.genres.map((g) => g.name).join(', ')}</p>
      <div className="hidden md:block">
        <AnimeRating rating={anime.rating} size="md" />
        {!anime.rating && <span className="text-sm text-fg-subtle">—</span>}
        <p className="text-2xs text-fg-subtle">{formatCompact(anime.popularity)} members</p>
      </div>
      <div className="hidden md:block">
        <StatusBadge status={anime.status} />
      </div>
      <p className="hidden text-[13px] text-fg-muted md:block">{episodeLabel(anime)}</p>
      <div className="flex justify-end">{actions ?? <WatchlistIconButton anime={anime} className="bg-surface-3 text-fg ring-line" />}</div>
    </article>
  )
}

export function AnimeListHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'hidden grid-cols-[2.5rem_minmax(0,2.5fr)_minmax(0,1.4fr)_5.5rem_6.5rem_5.5rem_2.75rem] gap-4 border-b border-line px-3 pb-3 text-2xs font-semibold uppercase tracking-wider text-fg-subtle md:grid',
        className,
      )}
    >
      <span className="text-center">#</span>
      <span>Title</span>
      <span>Genres</span>
      <span>Score</span>
      <span>Status</span>
      <span>Episodes</span>
      <span className="sr-only">Actions</span>
    </div>
  )
}
