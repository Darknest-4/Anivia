import { BookmarkCheck, BookmarkPlus, Check, ChevronDown, Heart, Trash2 } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { Button, Dialog, MenuItem, Popover, type ButtonSize, type ButtonVariant } from '@/components/ui'
import { useFavorites, useWatchlistEntry } from '@/hooks/useUserData'
import { cn } from '@/lib/cn'
import { useToast } from '@/providers/ToastProvider'
import { WATCHLIST_STATUSES, watchlistService, watchlistStatusLabel } from '@/services/user'
import type { Anime } from '@/types'
import { AddToWatchlistDialog } from './AddToWatchlistDialog'

function stop(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
}

/** Compact icon toggle used on cards. */
export function WatchlistIconButton({ anime, className }: { anime: Pick<Anime, 'id' | 'title'>; className?: string }) {
  const entry = useWatchlistEntry(anime.id)
  const toast = useToast()
  const inList = Boolean(entry)
  return (
    <button
      type="button"
      onClick={(e) => {
        stop(e)
        if (inList) {
          watchlistService.remove(anime.id)
          toast({ title: 'Removed from watchlist', description: anime.title, variant: 'info', action: { label: 'Undo', onClick: () => watchlistService.add(anime.id, entry?.status) } })
        } else {
          watchlistService.add(anime.id)
          toast({ title: 'Added to watchlist', description: anime.title })
        }
      }}
      aria-pressed={inList}
      aria-label={inList ? `Remove ${anime.title} from watchlist` : `Add ${anime.title} to watchlist`}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg backdrop-blur-md transition-colors',
        inList ? 'bg-accent text-white' : 'bg-black/55 text-white ring-1 ring-inset ring-white/15 hover:bg-black/75',
        className,
      )}
    >
      {inList ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
    </button>
  )
}

export function FavoriteButton({ anime, className, size = 'sm' }: { anime: Pick<Anime, 'id' | 'title'>; className?: string; size?: 'sm' | 'md' }) {
  const { isFavorite, toggle } = useFavorites()
  const toast = useToast()
  const fav = isFavorite(anime.id)
  return (
    <button
      type="button"
      onClick={(e) => {
        stop(e)
        const now = toggle(anime.id)
        toast({ title: now ? 'Added to favorites' : 'Removed from favorites', description: anime.title, variant: now ? 'success' : 'info', icon: Heart })
      }}
      aria-pressed={fav}
      aria-label={fav ? `Remove ${anime.title} from favorites` : `Add ${anime.title} to favorites`}
      className={cn(
        'inline-flex items-center justify-center rounded-full backdrop-blur-md transition-[transform,background-color] active:scale-90',
        size === 'sm' ? 'h-8 w-8' : 'h-11 w-11',
        fav ? 'bg-accent/90 text-white' : 'bg-black/55 text-white ring-1 ring-inset ring-white/15 hover:bg-black/75',
        className,
      )}
    >
      <Heart className={cn(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', fav && 'fill-current')} />
    </button>
  )
}

interface WatchlistButtonProps {
  anime: Pick<Anime, 'id' | 'title' | 'poster'>
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/** Full button with status picker and remove confirmation. */
export function WatchlistButton({ anime, variant = 'secondary', size = 'lg', className }: WatchlistButtonProps) {
  const entry = useWatchlistEntry(anime.id)
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const [adding, setAdding] = useState(false)

  if (!entry) {
    return (
      <>
        <Button variant={variant} size={size} className={className} leftIcon={<BookmarkPlus className="h-[18px] w-[18px]" />} onClick={() => setAdding(true)}>
          Add to Watchlist
        </Button>
        <AddToWatchlistDialog anime={anime} open={adding} onClose={() => setAdding(false)} />
      </>
    )
  }

  return (
    <>
      <Popover
        align="left"
        trigger={(p) => (
          <Button
            variant={variant}
            size={size}
            className={cn('text-accent-soft', className)}
            leftIcon={<BookmarkCheck className="h-[18px] w-[18px]" />}
            rightIcon={<ChevronDown className="h-4 w-4 opacity-70" />}
            onClick={p.toggle}
            aria-expanded={p['aria-expanded']}
            aria-haspopup="menu"
          >
            {watchlistStatusLabel[entry.status]}
          </Button>
        )}
      >
        {(close) => (
          <>
            <p className="eyebrow px-3 pb-1 pt-2">Set status</p>
            {WATCHLIST_STATUSES.map((s) => (
              <MenuItem
                key={s.value}
                active={entry.status === s.value}
                icon={<Check className={cn('h-4 w-4', entry.status === s.value ? 'opacity-100' : 'opacity-0')} />}
                onClick={() => {
                  watchlistService.setStatus(anime.id, s.value)
                  toast({ title: 'Watchlist updated', description: `${anime.title} · ${s.label}` })
                  close()
                }}
              >
                {s.label}
              </MenuItem>
            ))}
            <div className="my-1 h-px bg-line" />
            <MenuItem
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => {
                close()
                setConfirm(true)
              }}
            >
              Remove from watchlist
            </MenuItem>
          </>
        )}
      </Popover>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        icon={<Trash2 className="h-5 w-5" />}
        title="Remove from watchlist?"
        description={`“${anime.title}” will be removed from your watchlist. Your watch history is kept.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                watchlistService.remove(anime.id)
                setConfirm(false)
                toast({ title: 'Removed from watchlist', description: anime.title, variant: 'info' })
              }}
            >
              Remove
            </Button>
          </>
        }
      />
    </>
  )
}
