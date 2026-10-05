import { favoritesStore, historyStore, seededStore, watchlistStore } from './stores'
import type { WatchProgress, WatchlistItem } from '@/types'

/**
 * Seeds a small amount of demo library data on first visit so the live preview
 * shows populated "Continue Watching", watchlist and profile sections.
 * Users can wipe it from Settings → Account → Reset demo data.
 */
export function seedDemoLibrary() {
  if (seededStore.get()) return
  const now = Date.now()
  const ago = (hours: number) => new Date(now - hours * 3600_000).toISOString()

  const history: WatchProgress[] = [
    { animeId: 'celestial-eclipse', episodeId: 'celestial-eclipse-e13', episodeNumber: 13, progress: 892, duration: 1440, lastWatched: ago(3), completed: false },
    { animeId: 'narukami-rising', episodeId: 'narukami-rising-e46', episodeNumber: 46, progress: 410, duration: 1440, lastWatched: ago(20), completed: false },
    { animeId: 'crimson-orbit', episodeId: 'crimson-orbit-e9', episodeNumber: 9, progress: 1210, duration: 1440, lastWatched: ago(46), completed: false },
    { animeId: 'paper-lanterns-of-yoru', episodeId: 'paper-lanterns-of-yoru-e6', episodeNumber: 6, progress: 300, duration: 1380, lastWatched: ago(70), completed: false },
    { animeId: 'celestial-eclipse', episodeId: 'celestial-eclipse-e12', episodeNumber: 12, progress: 1440, duration: 1440, lastWatched: ago(26), completed: true },
    { animeId: 'echoes-of-aether', episodeId: 'echoes-of-aether-e24', episodeNumber: 24, progress: 1380, duration: 1380, lastWatched: ago(140), completed: true },
  ]
  history.sort((a, b) => b.lastWatched.localeCompare(a.lastWatched))

  const wl = (animeId: string, status: WatchlistItem['status'], hours: number): WatchlistItem => ({
    animeId,
    status,
    addedAt: ago(hours),
    updatedAt: ago(hours / 2),
  })

  historyStore.set(history)
  watchlistStore.set([
    wl('celestial-eclipse', 'watching', 400),
    wl('narukami-rising', 'watching', 900),
    wl('crimson-orbit', 'watching', 600),
    wl('echoes-of-aether', 'completed', 2000),
    wl('neon-ronin', 'planning', 30),
    wl('shadowline-tokyo', 'planning', 20),
    wl('silent-tide', 'completed', 3000),
    wl('frostbound-oath', 'planning', 10),
  ])
  favoritesStore.set(['celestial-eclipse', 'echoes-of-aether', 'silent-tide', 'paper-lanterns-of-yoru'])
  seededStore.set(true)
}
