import { favoritesStore, historyStore, ratingsStore, watchlistStore } from '@/services/user/stores'
import type { WatchlistItem, WatchlistStatus } from '@/types'
import { anilistAuthed } from './api'
import { anilistAuthStore, anilistOptionsStore, anilistSnapshotStore, type AniListSnapshot } from './store'

const TO_ANILIST: Record<WatchlistStatus, string> = { watching: 'CURRENT', planning: 'PLANNING', completed: 'COMPLETED', 'on-hold': 'PAUSED', dropped: 'DROPPED' }
const FROM_ANILIST: Record<string, WatchlistStatus> = { CURRENT: 'watching', REPEATING: 'watching', PLANNING: 'planning', COMPLETED: 'completed', PAUSED: 'on-hold', DROPPED: 'dropped' }

const LIST_QUERY = `
query ($userId: Int) {
  MediaListCollection(userId: $userId, type: ANIME) {
    lists { entries { id mediaId status progress score(format: POINT_100) updatedAt } }
  }
  Viewer { unreadNotificationCount favourites { anime(perPage: 50) { nodes { id } } } }
}`

const SAVE = `
mutation ($mediaId: Int, $status: MediaListStatus, $scoreRaw: Int, $progress: Int) {
  SaveMediaListEntry(mediaId: $mediaId, status: $status, scoreRaw: $scoreRaw, progress: $progress) { id mediaId status progress score(format: POINT_100) }
}`
const DELETE = `mutation ($id: Int) { DeleteMediaListEntry(id: $id) { deleted } }`
const TOGGLE_FAV = `mutation ($animeId: Int) { ToggleFavourite(animeId: $animeId) { anime(perPage: 1) { pageInfo { total } } } }`

interface RemoteEntry {
  id: number
  mediaId: number
  status: string
  progress: number
  score: number
  updatedAt: number
}

export type AniListSyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

/** Highest fully-watched episode per title, from local watch history. */
function localProgress() {
  const out: Record<string, number> = {}
  for (const h of historyStore.get()) if (h.completed) out[h.animeId] = Math.max(out[h.animeId] ?? 0, h.episodeNumber)
  return out
}

/**
 * Two-way sync between the ANIVIA library and the connected AniList account.
 * - Pull: remote list → local (newest change wins), scores, favorites, progress.
 * - Push: local changes → SaveMediaListEntry / DeleteMediaListEntry / ToggleFavourite,
 *   diffed against a snapshot so nothing is sent twice and no edit loops occur.
 * Works only with AniList ids (the default data source).
 */
export function startAniListSync(onStatus: (s: AniListSyncStatus, message?: string) => void) {
  let applying = false
  let stopped = false
  let timer: number | undefined
  let running: Promise<void> | null = null

  async function pull() {
    const auth = anilistAuthStore.get()
    if (!auth) return
    const opts = anilistOptionsStore.get()
    type R = { MediaListCollection: { lists: { entries: RemoteEntry[] }[] } | null; Viewer: { unreadNotificationCount: number; favourites: { anime: { nodes: { id: number }[] } } } }
    const data = await anilistAuthed<R>(LIST_QUERY, { userId: auth.userId })
    if (stopped) return
    anilistAuthStore.set({ ...auth, unread: data.Viewer.unreadNotificationCount })
    const remote = new Map<string, RemoteEntry>()
    for (const l of data.MediaListCollection?.lists ?? []) for (const e of l.entries) remote.set(String(e.mediaId), e)
    const remoteFavs = data.Viewer.favourites.anime.nodes.map((n) => String(n.id))
    const snap = anilistSnapshotStore.get()

    applying = true
    try {
      if (opts.watchlist) {
        const local = new Map(watchlistStore.get().map((w) => [w.animeId, w]))
        for (const [id, e] of remote) {
          const status = FROM_ANILIST[e.status]
          if (!status) continue
          const remoteAt = new Date(e.updatedAt * 1000).toISOString()
          const mine = local.get(id)
          if (!mine) local.set(id, { animeId: id, status, addedAt: remoteAt, updatedAt: remoteAt })
          else if (mine.status !== status && remoteAt > mine.updatedAt) local.set(id, { ...mine, status, updatedAt: remoteAt })
        }
        // Entries removed on AniList since the last sync (and untouched locally since then) are removed here too.
        for (const id of Object.keys(snap.entries)) {
          const mine = local.get(id)
          if (!remote.has(id) && mine && (!snap.syncedAt || mine.updatedAt <= snap.syncedAt)) local.delete(id)
        }
        watchlistStore.set([...local.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
      }
      if (opts.scores) {
        const ratings = { ...ratingsStore.get() }
        for (const [id, e] of remote) {
          const prev = snap.entries[id]
          // Take the remote score when it changed on AniList since the last sync, or we have none.
          if (e.score > 0 && (ratings[id] === undefined || (prev && prev.score !== e.score))) ratings[id] = Math.max(1, Math.round(e.score / 10))
        }
        ratingsStore.set(ratings)
      }
      if (opts.favorites) {
        const favs = new Set(favoritesStore.get())
        for (const id of remoteFavs) if (!snap.favorites.includes(id)) favs.add(id)
        for (const id of snap.favorites) if (!remoteFavs.includes(id)) favs.delete(id)
        favoritesStore.set([...favs])
      }
    } finally {
      applying = false
    }

    const entries: AniListSnapshot['entries'] = {}
    for (const [id, e] of remote) {
      const status = FROM_ANILIST[e.status]
      if (status) entries[id] = { entryId: e.id, status, score: e.score, progress: e.progress }
    }
    anilistSnapshotStore.set({ entries, favorites: remoteFavs, syncedAt: snap.syncedAt })
  }

  async function push() {
    const opts = anilistOptionsStore.get()
    const snap = anilistSnapshotStore.get()
    const entries = { ...snap.entries }
    const ratings = ratingsStore.get()
    const progress = localProgress()
    const local = new Map<string, WatchlistItem>(watchlistStore.get().map((w) => [w.animeId, w]))
    const numeric = (id: string) => /^\d+$/.test(id)

    if (opts.watchlist || opts.scores || opts.progress) {
      for (const [id, item] of local) {
        if (!numeric(id)) continue
        const prev = entries[id]
        const scoreRaw = opts.scores && ratings[id] ? ratings[id] * 10 : prev?.score ?? 0
        const prog = opts.progress ? Math.max(progress[id] ?? 0, prev?.progress ?? 0) : prev?.progress ?? 0
        const status = opts.watchlist ? item.status : prev?.status ?? item.status
        if (prev && prev.status === status && prev.score === scoreRaw && prev.progress === prog) continue
        if (!prev && !opts.watchlist) continue
        type S = { SaveMediaListEntry: { id: number; status: string; progress: number; score: number } }
        const saved = await anilistAuthed<S>(SAVE, { mediaId: Number(id), status: TO_ANILIST[status], scoreRaw: scoreRaw || undefined, progress: prog || undefined })
        entries[id] = { entryId: saved.SaveMediaListEntry.id, status, score: saved.SaveMediaListEntry.score, progress: saved.SaveMediaListEntry.progress }
        if (stopped) return
      }
    }
    if (opts.watchlist) {
      for (const [id, prev] of Object.entries(snap.entries)) {
        if (local.has(id)) continue
        await anilistAuthed(DELETE, { id: prev.entryId })
        delete entries[id]
        if (stopped) return
      }
    }
    let favorites = snap.favorites
    if (opts.favorites) {
      const mine = favoritesStore.get().filter(numeric)
      const toggle = [...mine.filter((id) => !snap.favorites.includes(id)), ...snap.favorites.filter((id) => !mine.includes(id))]
      for (const id of toggle) {
        await anilistAuthed(TOGGLE_FAV, { animeId: Number(id) })
        if (stopped) return
      }
      favorites = mine
    }
    anilistSnapshotStore.set({ entries, favorites, syncedAt: new Date().toISOString() })
  }

  async function syncNow() {
    if (running) return running
    running = (async () => {
      onStatus('syncing')
      try {
        await pull()
        if (!stopped) await push()
        if (!stopped) onStatus('synced')
      } catch (err) {
        if (!stopped) onStatus('error', (err as Error).message)
      } finally {
        running = null
      }
    })()
    return running
  }

  const schedule = () => {
    if (applying || stopped) return
    window.clearTimeout(timer)
    timer = window.setTimeout(async () => {
      if (running) await running
      onStatus('syncing')
      try {
        await push()
        if (!stopped) onStatus('synced')
      } catch (err) {
        if (!stopped) onStatus('error', (err as Error).message)
      }
    }, 2000)
  }

  const unsubs = [watchlistStore, ratingsStore, favoritesStore, historyStore, anilistOptionsStore].map((s) => s.subscribe(schedule))
  const onVisible = () => document.visibilityState === 'visible' && void syncNow()
  document.addEventListener('visibilitychange', onVisible)
  void syncNow()

  return {
    syncNow,
    stop() {
      stopped = true
      window.clearTimeout(timer)
      unsubs.forEach((u) => u())
      document.removeEventListener('visibilitychange', onVisible)
    },
  }
}
