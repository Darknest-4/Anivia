import type { SupabaseClient } from '@supabase/supabase-js'
import type { Preferences, WatchlistItem, WatchProgress } from '@/types'
import { defaultPreferences, favoriteCharactersStore, favoritesStore, historyStore, preferencesStore, ratingsStore, watchlistStore } from './stores'

interface LibraryRow {
  user_id: string
  watchlist: WatchlistItem[]
  history: WatchProgress[]
  favorites: string[]
  preferences: Partial<Preferences>
  ratings: Record<string, number>
  favorite_characters: string[]
  updated_at?: string
}

const HISTORY_LIMIT = 500

/** Newest entry wins, keyed by `key`. */
function mergeBy<T>(a: T[], b: T[], key: (x: T) => string, stamp: (x: T) => string) {
  const map = new Map<string, T>()
  for (const item of [...a, ...b]) {
    const k = key(item)
    const prev = map.get(k)
    if (!prev || stamp(item) > stamp(prev)) map.set(k, item)
  }
  return [...map.values()]
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

/**
 * Two-way sync between the local library stores and the `user_library` table.
 * Local stores stay the source of truth for the UI (instant, offline-friendly);
 * changes are pushed debounced, and remote changes are merged on sign-in and on tab focus.
 */
export function startCloudSync(client: SupabaseClient, userId: string, onStatus: (s: SyncStatus) => void) {
  let applying = false
  let timer: number | undefined
  let stopped = false

  const snapshot = (): LibraryRow => ({
    user_id: userId,
    watchlist: watchlistStore.get(),
    history: historyStore.get().slice(0, HISTORY_LIMIT),
    favorites: favoritesStore.get(),
    preferences: preferencesStore.get(),
    ratings: ratingsStore.get(),
    favorite_characters: favoriteCharactersStore.get(),
  })

  async function push() {
    if (stopped) return
    onStatus('syncing')
    const { error } = await client.from('user_library').upsert(snapshot(), { onConflict: 'user_id' })
    onStatus(error ? 'error' : 'synced')
  }

  async function pull(preferRemotePrefs: boolean) {
    onStatus('syncing')
    const { data, error } = await client.from('user_library').select('*').eq('user_id', userId).maybeSingle<LibraryRow>()
    if (stopped) return
    if (error) return onStatus('error')
    applying = true
    try {
      if (data) {
        watchlistStore.set(
          mergeBy(watchlistStore.get(), data.watchlist ?? [], (w) => w.animeId, (w) => w.updatedAt).sort((x, y) => y.updatedAt.localeCompare(x.updatedAt)),
        )
        historyStore.set(
          mergeBy(historyStore.get(), data.history ?? [], (h) => h.episodeId, (h) => h.lastWatched)
            .sort((x, y) => y.lastWatched.localeCompare(x.lastWatched))
            .slice(0, HISTORY_LIMIT),
        )
        favoritesStore.set([...new Set([...favoritesStore.get(), ...(data.favorites ?? [])])])
        favoriteCharactersStore.set([...new Set([...favoriteCharactersStore.get(), ...(data.favorite_characters ?? [])])])
        ratingsStore.set({ ...(data.ratings ?? {}), ...ratingsStore.get() })
        if (preferRemotePrefs && data.preferences && Object.keys(data.preferences).length) {
          preferencesStore.set({ ...defaultPreferences, ...preferencesStore.get(), ...data.preferences })
        }
      }
    } finally {
      applying = false
    }
    await push()
  }

  const schedule = () => {
    if (applying || stopped) return
    window.clearTimeout(timer)
    timer = window.setTimeout(push, 1200)
  }

  const unsubs = [watchlistStore, historyStore, favoritesStore, preferencesStore, ratingsStore, favoriteCharactersStore].map((s) => s.subscribe(schedule))
  const onVisible = () => document.visibilityState === 'visible' && pull(false)
  document.addEventListener('visibilitychange', onVisible)

  void pull(true)

  return () => {
    stopped = true
    window.clearTimeout(timer)
    unsubs.forEach((u) => u())
    document.removeEventListener('visibilitychange', onVisible)
  }
}
