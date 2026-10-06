import type { Episode, WatchProgress } from '@/types'
import { historyStore, watchlistStore } from './stores'

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
  /**
   * Marks an episode as watched (or not) by hand — ANIVIA links to licensed services instead of
   * playing episodes, so this is how progress, "Continue watching" and AniList progress get updated.
   * Marking an episode of a title that isn't in the watchlist yet adds it as "Watching".
   */
  setWatched(episode: Pick<Episode, 'animeId' | 'id' | 'number' | 'duration'>, watched: boolean) {
    if (!watched) {
      historyService.removeEntry(episode.animeId, episode.id)
      return
    }
    const duration = Math.max(60, Math.round(episode.duration || 24 * 60))
    historyService.record({ animeId: episode.animeId, episodeId: episode.id, episodeNumber: episode.number, progress: duration, duration })
    if (!watchlistStore.get().some((i) => i.animeId === episode.animeId)) {
      const now = new Date().toISOString()
      watchlistStore.set((items) => [{ animeId: episode.animeId, status: 'watching', addedAt: now, updatedAt: now }, ...items])
    }
  },
  /** Where to continue: the next episode after a finished one, otherwise the unfinished episode itself. */
  nextUp(animeId: string, available?: number, items: WatchProgress[] = historyStore.get()): { episodeNumber: number; resume: boolean } | null {
    // History is newest-first, so the first match is the most recent episode of this title.
    const last = items.find((i) => i.animeId === animeId)
    if (!last) return null
    if (!last.completed) return { episodeNumber: last.episodeNumber, resume: true }
    if (available !== undefined && last.episodeNumber >= available) return null
    return { episodeNumber: last.episodeNumber + 1, resume: false }
  },
  getEpisode: (animeId: string, episodeId: string) =>
    historyStore.get().find((i) => i.animeId === animeId && i.episodeId === episodeId),
  /**
   * "Continue Watching" rows: the latest entry per title, newest first — an unfinished episode to resume,
   * or a finished one whose next episode is out (`available` = episodes released so far, when known).
   */
  upNext(items: WatchProgress[], available: (animeId: string) => number | undefined, limit = 10): WatchProgress[] {
    const seen = new Set<string>()
    const out: WatchProgress[] = []
    for (const h of items) {
      if (seen.has(h.animeId)) continue
      seen.add(h.animeId)
      const total = available(h.animeId)
      if (h.completed && total !== undefined && h.episodeNumber >= total) continue
      out.push(h)
      if (out.length >= limit) break
    }
    return out
  },
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
