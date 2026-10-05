import { BellRing, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { useWatchlistEntry } from '@/hooks/useUserData'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { useToast } from '@/providers/ToastProvider'
import { watchlistService } from '@/services/user'
import type { Anime } from '@/types'
import { AnimeGenreBadge } from './AnimeGenreBadge'

/** Upcoming release card with premiere date and a "remind me" action (adds to watchlist). */
export function UpcomingCard({ anime, className }: { anime: Anime; className?: string }) {
  const entry = useWatchlistEntry(anime.id)
  const toast = useToast()
  const days = anime.airedFrom ? Math.max(0, Math.ceil((new Date(anime.airedFrom).getTime() - Date.now()) / 86_400_000)) : undefined
  return (
    <article className={cn('flex gap-4 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong', className)}>
      <Link to={`/anime/${anime.id}`} className="shrink-0" aria-label={anime.title}>
        <img src={anime.poster} alt="" loading="lazy" className="h-36 w-24 rounded-xl object-cover ring-1 ring-line" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col py-1">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-info">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(anime.airedFrom)}
          {days !== undefined && days > 0 && <span className="text-fg-subtle">· in {days} days</span>}
        </p>
        <h3 className="mt-1 line-clamp-1 text-base font-semibold text-fg">
          <Link to={`/anime/${anime.id}`} className="hover:text-accent-soft">
            {anime.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">{anime.description}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <div className="hidden min-w-0 gap-1.5 overflow-hidden xs:flex">
            {anime.genres.slice(0, 2).map((g) => (
              <AnimeGenreBadge key={g.id} genre={g} className="px-2 py-0.5 text-2xs" />
            ))}
          </div>
          <Button
            size="sm"
            className="shrink-0"
            variant={entry ? 'secondary' : 'outline'}
            leftIcon={<BellRing className="h-3.5 w-3.5" />}
            onClick={() => {
              if (entry) return
              watchlistService.add(anime.id, 'planning')
              toast({ title: 'Reminder set', description: `We’ll let you know when ${anime.title} premieres.`, icon: BellRing })
            }}
            aria-pressed={Boolean(entry)}
          >
            {entry ? 'Reminder on' : 'Remind me'}
          </Button>
        </div>
      </div>
    </article>
  )
}
