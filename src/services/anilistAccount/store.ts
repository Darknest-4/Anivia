import { createPersistentStore } from '@/services/storage'
import type { WatchlistStatus } from '@/types'

export interface AniListAuth {
  token: string
  expiresAt: number
  userId: number
  name: string
  avatar?: string
  siteUrl?: string
  /** AniList's own unread notification count at last check. */
  unread?: number
}

/** Sync options the user can toggle. */
export interface AniListSyncOptions {
  watchlist: boolean
  scores: boolean
  progress: boolean
  favorites: boolean
}

/** What AniList looked like after the last successful sync — used to compute diffs. */
export interface AniListSnapshot {
  entries: Record<string, { entryId: number; status: WatchlistStatus; score: number; progress: number }>
  favorites: string[]
  syncedAt: string | null
}

const isObj = (v: unknown) => v !== null && typeof v === 'object' && !Array.isArray(v)

export const anilistAuthStore = createPersistentStore<AniListAuth | null>('anilist-auth', null, (v) =>
  v && isObj(v) && typeof v.token === 'string' && v.expiresAt > Date.now() ? v : null,
)
export const anilistOptionsStore = createPersistentStore<AniListSyncOptions>('anilist-sync-options', { watchlist: true, scores: true, progress: true, favorites: true }, (v) => ({
  watchlist: true,
  scores: true,
  progress: true,
  favorites: true,
  ...(isObj(v) ? v : {}),
}))
export const anilistSnapshotStore = createPersistentStore<AniListSnapshot>('anilist-snapshot', { entries: {}, favorites: [], syncedAt: null }, (v) =>
  isObj(v) && isObj(v.entries) && Array.isArray(v.favorites) ? v : { entries: {}, favorites: [], syncedAt: null },
)
