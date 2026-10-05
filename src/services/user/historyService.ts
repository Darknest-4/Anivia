import type { WatchProgress } from '@/types'
import { historyStore } from './stores'

const MAX_ENTRIES = 200

export const historyService = {
  list: () => historyStore.get(),
  /** Records progress for an episode. Only ids and timings are stored — no personal data. */
  record(entry: Omit<WatchProgress, 'lastWatched' | 'completed'>) {
    const completed = entry.duration > 0 && entry.progress / entry.duration >= 0.9
    const next: WatchProgress = { ...entry, completed, lastWatched: new Date().toISOString() }
    historyStore.set((items) =>
      [next, ...items.filter((i) => !(i.animeId === entry.animeId && i.episodeId === entry.episodeId))].slice(0, MAX_ENTRIES),
    )
  },
  getEpisode: (animeId: string, episodeId: string) =>
    historyStore.get().find((i) => i.animeId === animeId && i.episodeId === episodeId),
  /** Latest entry per anime, newest first — powers "Continue Watching". */
  continueWatching(): WatchProgress[] {
    const seen = new Set<string>()
    return historyStore.get().filter((i) => {
      if (seen.has(i.animeId)) return false
      seen.add(i.animeId)
      return true
    })
  },
  removeAnime(animeId: string) {
    historyStore.set((items) => items.filter((i) => i.animeId !== animeId))
  },
  removeEntry(animeId: string, episodeId: string) {
    historyStore.set((items) => items.filter((i) => !(i.animeId === animeId && i.episodeId === episodeId)))
  },
  clear: () => historyStore.set([]),
}
