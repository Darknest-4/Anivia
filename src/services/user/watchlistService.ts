import { t } from '@/i18n'
import type { WatchlistStatus } from '@/types'
import { emitActivity } from './activity'
import { watchlistStore } from './stores'

export const watchlistService = {
  list: () => watchlistStore.get(),
  get: (animeId: string) => watchlistStore.get().find((i) => i.animeId === animeId),
  has: (animeId: string) => watchlistStore.get().some((i) => i.animeId === animeId),
  add(animeId: string, status: WatchlistStatus = 'planning') {
    const now = new Date().toISOString()
    watchlistStore.set((items) => {
      const existing = items.find((i) => i.animeId === animeId)
      if (existing) return items.map((i) => (i.animeId === animeId ? { ...i, status, updatedAt: now } : i))
      return [{ animeId, status, addedAt: now, updatedAt: now }, ...items]
    })
    emitActivity({ kind: 'status', animeId, data: { status } })
  },
  remove(animeId: string) {
    watchlistStore.set((items) => items.filter((i) => i.animeId !== animeId))
  },
  setStatus(animeId: string, status: WatchlistStatus) {
    watchlistStore.set((items) =>
      items.map((i) => (i.animeId === animeId ? { ...i, status, updatedAt: new Date().toISOString() } : i)),
    )
    emitActivity({ kind: 'status', animeId, data: { status } })
  },
  clear: () => watchlistStore.set([]),
}

export const WATCHLIST_STATUSES: { value: WatchlistStatus; label: string }[] = [
  { value: 'watching', label: t('Watching') },
  { value: 'planning', label: t('Plan to Watch') },
  { value: 'completed', label: t('Completed') },
  { value: 'on-hold', label: t('On Hold') },
  { value: 'dropped', label: t('Dropped') },
]

export const watchlistStatusLabel = Object.fromEntries(WATCHLIST_STATUSES.map((s) => [s.value, s.label])) as Record<
  WatchlistStatus,
  string
>
