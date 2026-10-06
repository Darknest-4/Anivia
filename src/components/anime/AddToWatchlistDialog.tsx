import { t } from '@/i18n'
import { BookmarkPlus, Check } from 'lucide-react'
import { useState } from 'react'
import { Button, Dialog } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useToast } from '@/providers/ToastProvider'
import { WATCHLIST_STATUSES, watchlistService } from '@/services/user'
import type { Anime, WatchlistStatus } from '@/types'

interface Props {
  anime: Pick<Anime, 'id' | 'title' | 'poster'>
  open: boolean
  onClose: () => void
}

/** Lets the user pick a list status before saving a title. */
export function AddToWatchlistDialog({ anime, open, onClose }: Props) {
  const [status, setStatus] = useState<WatchlistStatus>('planning')
  const toast = useToast()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      icon={<BookmarkPlus className="h-5 w-5" />}
      title={t('Add to watchlist')}
      description={anime.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            onClick={() => {
              watchlistService.add(anime.id, status)
              toast({ title: t('Added to watchlist'), description: `${anime.title} · ${WATCHLIST_STATUSES.find((s) => s.value === status)?.label}` })
              onClose()
            }}
          >
            {t('Add to list')}
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label={t('List status')} className="space-y-1.5">
        {WATCHLIST_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={status === s.value}
            onClick={() => setStatus(s.value)}
            className={cn(
              'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors',
              status === s.value ? 'border-accent/60 bg-accent/10 text-fg' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {s.label}
            <Check className={cn('h-4 w-4 text-accent-soft', status === s.value ? 'opacity-100' : 'opacity-0')} />
          </button>
        ))}
      </div>
    </Dialog>
  )
}
