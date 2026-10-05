import { Play } from 'lucide-react'
import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Anime } from '@/types'
import { AnimeGenreBadge } from './AnimeGenreBadge'
import { AnimeMeta } from './AnimeMeta'
import { AnimePoster } from './AnimePoster'
import { AnimeRating } from './AnimeRating'
import { FavoriteButton, WatchlistIconButton } from './WatchlistButton'

interface AnimeCardProps {
  anime: Anime
  className?: string
  priority?: boolean
  /** Rank number rendered beside the poster (Top lists). */
  rank?: number
  /** Show genre chips under the title (grid browsing). */
  showGenres?: boolean
  /** Watch progress 0..1 rendered on the poster. */
  progress?: number
}

function EpisodeBadge({ anime }: { anime: Anime }) {
  if (anime.status === 'upcoming') return <Badge variant="glass">Coming {anime.year}</Badge>
  if (anime.type === 'Movie') return <Badge variant="glass">Movie</Badge>
  if (anime.status === 'airing') return <Badge variant="solid">EP {anime.episodesAired}</Badge>
  return <Badge variant="glass">{anime.episodes} EPS</Badge>
}

/**
 * Primary poster card. Desktop: hover reveals a quick-info overlay with play/watchlist actions.
 * Touch devices: tap opens details; favorite toggle is always visible.
 */
export const AnimeCard = memo(function AnimeCard({ anime, className, priority, rank, showGenres, progress }: AnimeCardProps) {
  const href = `/anime/${anime.id}`
  return (
    <article className={cn('group relative min-w-0', className)}>
      <div className="relative overflow-hidden rounded-xl bg-surface-2 shadow-card ring-1 ring-line/60 transition-[transform,box-shadow] duration-base ease-out group-hover:-translate-y-1 group-hover:shadow-pop">
        <AnimePoster src={anime.poster} alt="" priority={priority} className="transition-transform duration-slow ease-out group-hover:scale-[1.04]" />
        {/* Stretched link for the whole poster (title link below is the keyboard target) */}
        <Link to={href} className="absolute inset-0" aria-label={anime.title} tabIndex={-1} />

        {/* Badges */}
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          <AnimeRating rating={anime.rating} variant="glass" />
          {!anime.rating && <span />}
        </div>
        <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-1 transition-opacity duration-base group-hover:opacity-0">
          <EpisodeBadge anime={anime} />
          <Badge variant="glass">{anime.quality}</Badge>
        </div>

        {progress !== undefined && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
            <div className="h-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}

        {/* Hover overlay (desktop / hover-capable devices only) */}
        <div className="pointer-events-none absolute inset-0 hidden flex-col justify-end bg-gradient-to-t from-black via-black/75 to-black/10 p-3 opacity-0 transition-opacity duration-base group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:flex">
          <div className="translate-y-2 transition-transform duration-base ease-out group-hover:translate-y-0">
            <p className="line-clamp-3 text-xs leading-relaxed text-white/80">{anime.synopsisShort ?? anime.description}</p>
            <p className="mt-2 text-2xs font-semibold uppercase tracking-wider text-white/60">
              {anime.genres
                .slice(0, 3)
                .map((g) => g.name)
                .join(' · ')}
            </p>
            {anime.status === 'airing' && <p className="mt-1 text-2xs font-semibold text-accent-soft">Latest: Episode {anime.episodesAired}</p>}
            <div className="pointer-events-auto mt-3 flex items-center gap-2">
              <Link
                to={anime.status === 'upcoming' ? href : `${href}/watch`}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white text-[13px] font-semibold text-black transition-colors hover:bg-white/90"
                aria-label={anime.status === 'upcoming' ? `View ${anime.title}` : `Watch ${anime.title}`}
              >
                <Play className="h-4 w-4 fill-current" />
                {anime.status === 'upcoming' ? 'Details' : 'Watch'}
              </Link>
              <WatchlistIconButton anime={anime} />
            </div>
          </div>
        </div>

        <FavoriteButton anime={anime} className="absolute right-2 top-2 z-10 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100" />

      </div>

      <div className={cn('mt-2.5 flex gap-2.5', rank && 'items-start')}>
        {rank !== undefined && <span className="font-display text-2xl font-extrabold leading-none text-fg-subtle/60 tabular-nums">{rank}</span>}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-fg">
            <Link to={href} className="transition-colors hover:text-accent-soft focus-visible:text-accent-soft">
              {anime.title}
            </Link>
          </h3>
          <AnimeMeta anime={anime} className="mt-1" />
          {showGenres && (
            <div className="mt-2 hidden flex-wrap gap-1 sm:flex">
              {anime.genres.slice(0, 2).map((g) => (
                <AnimeGenreBadge key={g.id} genre={g} className="px-2 py-0.5 text-2xs" />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
})

/** Grid variant — identical card with genre chips, used in catalog grids. */
export function AnimeCardGrid(props: Omit<AnimeCardProps, 'showGenres'>) {
  return <AnimeCard {...props} showGenres />
}
