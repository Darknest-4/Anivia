import { createPersistentStore } from '@/services/storage'
import type { Preferences, WatchProgress, WatchlistItem } from '@/types'

export const defaultPreferences: Preferences = {
  theme: 'dark',
  autoplay: true,
  autoNext: true,
  skipIntro: false,
  defaultQuality: 'auto',
  subtitles: true,
  subtitleLanguage: 'en',
  audioLanguage: 'Japanese',
  interfaceLanguage: 'en',
  notifyReleases: true,
  notifyNewEpisodes: true,
  notifyAnnouncements: false,
  privateProfile: false,
  showHistory: true,
  reduceMotion: false,
}

/** Persistent client-side stores. Keys are prefixed with `anivia:` in localStorage. */
export const preferencesStore = createPersistentStore<Preferences>('preferences', defaultPreferences)
export const watchlistStore = createPersistentStore<WatchlistItem[]>('watchlist', [])
export const favoritesStore = createPersistentStore<string[]>('favorites', [])
export const historyStore = createPersistentStore<WatchProgress[]>('history', [])
export const recentSearchesStore = createPersistentStore<string[]>('recent-searches', [])
export const seededStore = createPersistentStore<boolean>('demo-seeded', false)
export const viewModeStore = createPersistentStore<'grid' | 'list'>('view-mode', 'grid')
