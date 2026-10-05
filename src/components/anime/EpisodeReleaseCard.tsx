import { Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/format'
import type { EpisodeRelease } from '@/types'

/** Landscape card for a newly released episode. */
export function EpisodeReleaseCard({ release, className }: { release: EpisodeRelease; className?: string }) {
  const { anime, episode } = release
  const href = `/anime/${anime.id}/watch?ep=${episode.number}`
  return (
    <article className={cn('group relative min-w-0', className)}>
      <Link to={href} className="block" aria-label={`${anime.title}, episode ${episode.number}: ${episode.title}`}>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line/60">
          <img src={episode.thumbnail} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-slow ease-out group-hover:scale-[1.05]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute left-2 top-2 flex gap-1">
            <Badge variant="solid">EP {episode.number}</Badge>
            <Badge variant="glass">{anime.quality}</Badge>
          </div>
          <span className="absolute inset-0 m-auto flex h-11 w-11 scale-90 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-pop transition-all duration-base group-hover:scale-100 group-hover:opacity-100">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
            <img src={anime.poster} alt="" className="h-9 w-6 rounded object-cover ring-1 ring-white/20" />
            <p className="truncate text-xs font-semibold text-white">{anime.title}</p>
          </div>
        </div>
      </Link>
      <p className="mt-2.5 line-clamp-1 text-sm font-semibold text-fg">{episode.title}</p>
      <p className="text-xs text-fg-subtle">
        {Math.round(episode.duration / 60)} min · {formatRelative(episode.airDate)}
      </p>
    </article>
  )
}
