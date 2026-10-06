import { t } from '@/i18n'
import { Plus } from 'lucide-react'
import { useHistory } from '@/hooks/useUserData'
import { cn } from '@/lib/cn'
import { useToast } from '@/providers/ToastProvider'
import { historyService } from '@/services/user'
import type { Anime } from '@/types'

/** "EP 4 / 12  [+1]" — quick progress for titles you are watching (also syncs to AniList). */
export function EpisodeStepper({ anime, className }: { anime: Anime; className?: string }) {
  const history = useHistory()
  const toast = useToast()
  const done = historyService.progressOf(anime.id, history)
  const available = anime.episodesAired ?? anime.episodes
  const total = anime.episodes
  const finished = available !== undefined && done >= available
  return (
    <div className={cn('flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs', className)}>
      <span className="tabular-nums text-fg-muted">
        EP <span className="font-semibold text-fg">{done}</span>
        {total ? ` / ${total}` : ''}
      </span>
      <button
        type="button"
        disabled={finished}
        onClick={() => {
          const n = historyService.increment(anime.id, anime.duration ?? 24)
          toast({ title: t('Episode {p0} watched', { p0: n }), description: anime.title, duration: 2000 })
        }}
        aria-label={t('Mark episode {p0} of {p1} as watched', { p0: done + 1, p1: anime.title })}
        className="inline-flex h-7 items-center gap-1 rounded-md bg-accent/15 px-2 font-semibold text-accent-soft transition-colors hover:bg-accent/25 disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />1
      </button>
    </div>
  )
}
