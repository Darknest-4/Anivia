import { config } from '@/config'
import type { WatchlistItem, WatchlistStatus } from '@/types'
import { favoritesStore, ratingsStore, watchlistStore } from './stores'

const STATUS: Record<string, WatchlistStatus> = {
  CURRENT: 'watching',
  REPEATING: 'watching',
  PLANNING: 'planning',
  COMPLETED: 'completed',
  PAUSED: 'on-hold',
  DROPPED: 'dropped',
}

const QUERY = `
query ($name: String) {
  User(name: $name) { id name favourites { anime(perPage: 50) { nodes { id idMal } } } }
  MediaListCollection(userName: $name, type: ANIME) {
    lists { entries { status score(format: POINT_10_DECIMAL) updatedAt media { id idMal } } }
  }
}`

export interface ImportResult {
  username: string
  added: number
  updated: number
  rated: number
  favorites: number
}

/**
 * Imports a PUBLIC AniList list by username (no login or API key needed).
 * Ids are mapped to the active data source (AniList ids, or MyAnimeList ids for Jikan).
 */
export async function importAniListUser(username: string, source: 'anilist' | 'jikan'): Promise<ImportResult> {
  const res = await fetch(config.anilistUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { name: username.trim() } }),
  })
  const json = (await res.json().catch(() => null)) as {
    data?: {
      User: { name: string; favourites: { anime: { nodes: { id: number; idMal: number | null }[] } } } | null
      MediaListCollection: { lists: { entries: { status: string; score: number; updatedAt: number; media: { id: number; idMal: number | null } }[] }[] } | null
    }
    errors?: { message: string; status?: number }[]
  } | null
  if (!json?.data?.User) {
    const msg = json?.errors?.[0]?.message ?? ''
    if (/not found/i.test(msg) || json?.errors?.[0]?.status === 404) throw new Error(`No AniList user named “${username}”.`)
    if (/private/i.test(msg)) throw new Error('This AniList list is private.')
    throw new Error(msg || 'AniList could not be reached. Try again in a minute.')
  }

  const pick = (m: { id: number; idMal: number | null }) => (source === 'jikan' ? (m.idMal ? String(m.idMal) : null) : String(m.id))
  const existing = new Map(watchlistStore.get().map((w) => [w.animeId, w]))
  const ratings = { ...ratingsStore.get() }
  let added = 0
  let updated = 0
  let rated = 0

  for (const list of json.data.MediaListCollection?.lists ?? [])
    for (const e of list.entries) {
      const id = pick(e.media)
      const status = STATUS[e.status]
      if (!id || !status) continue
      const at = new Date((e.updatedAt || Date.now() / 1000) * 1000).toISOString()
      const prev = existing.get(id)
      if (!prev) added++
      else if (prev.status !== status) updated++
      const item: WatchlistItem = { animeId: id, status, addedAt: prev?.addedAt ?? at, updatedAt: at }
      existing.set(id, item)
      if (e.score > 0) {
        ratings[id] = Math.round(e.score)
        rated++
      }
    }

  watchlistStore.set([...existing.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  ratingsStore.set(ratings)
  const favIds = (json.data.User.favourites.anime.nodes ?? []).map(pick).filter((x): x is string => Boolean(x))
  const favs = new Set(favoritesStore.get())
  const before = favs.size
  favIds.forEach((f) => favs.add(f))
  favoritesStore.set([...favs])

  return { username: json.data.User.name, added, updated, rated, favorites: favs.size - before }
}
