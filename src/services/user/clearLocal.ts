import { readNotificationsStore, notifiedStore } from '@/hooks/useNotifications'
import { anilistAuthStore, anilistOptionsStore, anilistSnapshotStore } from '@/services/anilistAccount/store'
import { profileLookStore } from './profileLook'
import { favoriteCharactersStore, favoritesStore, historyStore, preferencesStore, ratingsStore, recentSearchesStore, watchlistStore } from './stores'

/** Stops AniList pushes first, so clearing the library can never delete anything on AniList. */
export function detachAniList() {
  anilistAuthStore.set(null)
  anilistSnapshotStore.reset()
}

/**
 * Removes everything that belongs to the signed-in person from this browser: library, history,
 * ratings, favourites, searches, preferences, notification state and the AniList connection.
 * Kept: device-level things (analytics choice, anonymous visitor id, feature-flag cache, public anime cache).
 * Call only after cloud sync has been stopped — the account copy stays safe in the database.
 */
export function clearAccountData() {
  detachAniList()
  anilistOptionsStore.reset()
  ;[watchlistStore, historyStore, favoritesStore, ratingsStore, favoriteCharactersStore, recentSearchesStore, preferencesStore, readNotificationsStore, notifiedStore, profileLookStore].forEach((s) =>
    s.reset(),
  )
  try {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith('anivia:anilist-return') || k.startsWith('anivia:anilist-intent')) sessionStorage.removeItem(k)
  } catch {
    /* storage unavailable */
  }
}
