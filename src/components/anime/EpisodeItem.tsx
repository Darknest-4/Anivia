import { Check, CheckCircle2, Lock, Play } from 'lucide-react'
import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Progress } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatDate, pad2 } from '@/lib/format'
import type { Episode, WatchProgress } from '@/types'

interface EpisodeItemProps {
  episode: Episode
  progress?: WatchProgress
  active?: boolean
  layout?: 'row' | 'compact'
  href: string
  /** Shows a "watched" toggle next to the episode (pass a stable function — the item is memoized). */
  onToggleWatched?: (episode: Episode, watched: boolean) => void
}

export const EpisodeItem = memo(function EpisodeItem({ episode, progress, active, layout = 'row', href, onToggleWatched }: EpisodeItemProps) {
  const pct = progress ? progress.progress / Math.max(1, progress.duration) : 0
  const watched = progress?.completed
  const locked = episode.locked
  const minutes = Math.round(episode.duration / 60)

  const content = (
    <>
      <div className={cn('relative shrink-0 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-line/60', layout === 'row' ? 'w-36 sm:w-44' : 'w-28')}>
        <img src={episode.thumbnail} alt="" loading="lazy" decoding="async" className={cn('aspect-video w-full object-cover transition-transform duration-slow group-hover:scale-105', locked && 'opacity-40 grayscale')} />
        <div className="absolute inset-0 flex items-center justify-center">
          {locked ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur">
              <Lock className="h-4 w-4" />
            </span>
          ) : active ? (
            <span className="flex items-end gap-0.5 rounded-md bg-black/60 px-2 py-1.5" aria-label="Now playing">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-0.5 animate-pulse rounded-full bg-accent-soft" style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
          ) : (
            <span className="flex h-9 w-9 scale-90 items-center justify-center rounded-full bg-white/90 text-black opacity-0 transition-all duration-base group-hover:scale-100 group-hover:opacity-100">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          )}
        </div>
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-2xs font-semibold text-white">{minutes}m</span>
        {pct > 0 && !locked && <Progress value={watched ? 1 : pct} size="xs" className="absolute inset-x-0 bottom-0 rounded-none bg-black/40" label={`Episode ${episode.number} progress`} />}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-bold tabular-nums', active ? 'text-accent-soft' : 'text-fg-subtle')}>EP {pad2(episode.number)}</span>
          {watched && <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-label="Watched" />}
          {episode.filler && <Badge variant="warning">Filler</Badge>}
        </div>
        <p className={cn('mt-0.5 line-clamp-2 text-sm font-semibold leading-snug', active ? 'text-accent-soft' : 'text-fg')}>{episode.title}</p>
        {layout === 'row' && <p className="mt-1 line-clamp-2 hidden text-[13px] leading-relaxed text-fg-muted sm:block">{episode.synopsis}</p>}
        <p className="mt-1 text-xs text-fg-subtle">{locked ? `Available ${formatDate(episode.airDate, { month: 'short', day: 'numeric' })}` : formatDate(episode.airDate)}</p>
      </div>
    </>
  )

  const toggle = onToggleWatched && !locked
  const classes = cn(
    'group flex gap-3 rounded-xl p-2 transition-colors sm:gap-4',
    active ? 'bg-accent/10 ring-1 ring-inset ring-accent/30' : 'hover:bg-surface-2',
    locked && 'cursor-not-allowed',
    toggle && 'pr-12',
  )

  const item = locked ? (
    <div className={classes} aria-disabled="true">
      {content}
    </div>
  ) : (
    <Link to={href} className={classes} aria-current={active ? 'true' : undefined}>
      {content}
    </Link>
  )
  if (!toggle) return item
  return (
    <div className="relative">
      {item}
      <button
        type="button"
        onClick={() => onToggleWatched(episode, !watched)}
        aria-pressed={Boolean(watched)}
        aria-label={watched ? `Mark episode ${episode.number} as not watched` : `Mark episode ${episode.number} as watched`}
        title={watched ? 'Watched — click to undo' : 'Mark as watched'}
        className={cn(
          'absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full ring-1 transition-colors',
          watched ? 'bg-success/15 text-success ring-success/40 hover:bg-success/25' : 'text-fg-subtle ring-line hover:text-fg hover:ring-line-strong',
        )}
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  )
})
