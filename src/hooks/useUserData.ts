import { useCallback, useSyncExternalStore } from 'react'
import type { PersistentStore } from '@/services/storage'
import {
  favoritesService,
  favoritesStore,
  historyStore,
  preferencesStore,
  recentSearchesStore,
  watchlistService,
  watchlistStore,
} from '@/services/user'
import type { Preferences } from '@/types'

export function useStore<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

export function useWatchlist() {
  const items = useStore(watchlistStore)
  return { items, ...watchlistService }
}

export function useWatchlistEntry(animeId: string) {
  const items = useStore(watchlistStore)
  return items.find((i) => i.animeId === animeId)
}

export function useFavorites() {
  const ids = useStore(favoritesStore)
  return { ids, isFavorite: (id: string) => ids.includes(id), toggle: favoritesService.toggle }
}

export function useHistory() {
  return useStore(historyStore)
}

export function useRecentSearches() {
  return useStore(recentSearchesStore)
}

export function usePreferences() {
  const prefs = useStore(preferencesStore)
  const update = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    preferencesStore.set((p) => ({ ...p, [key]: value }))
  }, [])
  return { prefs, update }
}
