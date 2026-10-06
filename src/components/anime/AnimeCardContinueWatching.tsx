import { t } from '@/i18n'
import { Play, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Progress } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatClock, formatRelative } from '@/lib/format'
import type { Anime, WatchProgress } from '@/types'

interface Props {
  anime: Anime
  entry: WatchProgress
  onRemove?: () => void
  className?: string
}

/**
 * Landscape resume card: episode artwork, progress bar, continue + remove actions.
 * After a finished episode it points at the next one ("Up next").
 */
export function AnimeCardContinueWatching({ anime, entry, onRemove, className }: Props) {
  const pct = entry.duration ? entry.progress / entry.duration : 0
  const remaining = Math.max(0, entry.duration - entry.progress)
  const upNext = entry.completed
  const episode = upNext ? entry.episodeNumber + 1 : entry.episodeNumber
  const href = `/anime/${anime.id}/watch?ep=${episode}`
  return (
    <article className={cn('group relative min-w-0', className)}>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line/60">
        <img src={anime.backdrop ?? anime.poster} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-slow ease-out group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <Link to={href} className="absolute inset-0 flex items-center justify-center" aria-label={`${upNext ? 'Watch' : 'Continue'} ${anime.title} episode ${episode}`}>
          <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-white/90 text-black opacity-90 shadow-pop transition-all duration-base group-hover:scale-100 group-hover:opacity-100">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </Link>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('Remove {p0} from continue watching', { p0: anime.title })}
            className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/90 ring-1 ring-inset ring-white/15 backdrop-blur-md transition-colors hover:bg-black/80 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="pointer-events-none absolute inset-x-3 bottom-3">
          {upNext ? (
            <div className="flex items-center justify-between text-2xs font-semibold text-white/85">
              <span className="rounded bg-accent px-1.5 py-0.5 text-accent-fg">{t('Up next · EP {p0}', { p0: episode })}</span>
              <span>{t('Watched EP {p0}', { p0: entry.episodeNumber })}</span>
            </div>
          ) : (
            <>
              <div className="mb-1.5 flex items-center justify-between text-2xs font-semibold text-white/85">
                <span>EP {entry.episodeNumber}</span>
                <span className="tabular-nums">{Math.round(pct * 100)}% · {formatClock(remaining)} left</span>
              </div>
              <Progress value={pct} size="xs" label={t('{p0} progress', { p0: anime.title })} />
            </>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg">
            <Link to={`/anime/${anime.id}`} className="hover:text-accent-soft">
              {anime.title}
            </Link>
          </h3>
          <p className="text-xs text-fg-subtle">{t('Watched {p0}', { p0: formatRelative(entry.lastWatched) })}</p>
        </div>
        <Link to={href} className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-accent-soft transition-colors hover:bg-accent/10">
          {upNext ? t('Next episode') : t('Continue')}
        </Link>
      </div>
    </article>
  )
}
