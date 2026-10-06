import { cn } from '@/lib/cn'
import { statusLabel } from '@/lib/format'
import type { Anime, AnimeStatus } from '@/types'
import { Badge } from '@/components/ui'

interface AnimeMetaProps {
  anime: Anime
  className?: string
  show?: ('type' | 'year' | 'episodes' | 'duration' | 'status' | 'season')[]
}

export function episodeLabel(anime: Anime) {
  if (anime.type === 'Movie') return 'Movie'
  if (anime.status === 'airing') return anime.episodesAired ? `${anime.episodesAired}/${anime.episodes ?? '?'} eps` : anime.episodes ? `${anime.episodes} eps` : 'Airing'
  if (!anime.episodes) return 'TBA'
  return `${anime.episodes} ${anime.episodes === 1 ? 'ep' : 'eps'}`
}

/** Dot-separated compact metadata line, e.g. "TV · 2026 · 24 eps". */
export function AnimeMeta({ anime, className, show = ['type', 'year', 'episodes'] }: AnimeMetaProps) {
  const parts: string[] = []
  for (const key of show) {
    if (key === 'type') parts.push(anime.type)
    if (key === 'year' && anime.year) parts.push(String(anime.year))
    if (key === 'episodes' && anime.type !== 'Movie') parts.push(episodeLabel(anime))
    if (key === 'duration' && anime.duration) parts.push(`${anime.duration} min`)
    if (key === 'status') parts.push(statusLabel[anime.status])
    if (key === 'season' && anime.season) parts.push(`${anime.season[0].toUpperCase()}${anime.season.slice(1)} ${anime.year ?? ''}`.trim())
  }
  // Every item carries a leading dot; the row is shifted left by one dot width and clipped,
  // so a line never starts or ends with a stray separator when the meta wraps.
  return (
    <p className={cn('min-w-0 overflow-hidden text-xs text-fg-subtle', className)}>
      <span className="-ml-3 flex flex-wrap items-center">
        {parts.map((p, i) => (
          <span key={`${p}-${i}`} className="whitespace-nowrap">
            <span aria-hidden className="inline-block w-3 text-center text-line-strong">
              •
            </span>
            {p}
          </span>
        ))}
      </span>
    </p>
  )
}

const statusVariant = { airing: 'success', finished: 'default', upcoming: 'info', hiatus: 'warning' } as const

export function StatusBadge({ status, className }: { status: AnimeStatus; className?: string }) {
  return (
    <Badge variant={statusVariant[status]} className={className}>
      {status === 'airing' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />}
      {statusLabel[status]}
    </Badge>
  )
}
