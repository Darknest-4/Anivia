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
  accent: 'crimson',
  fontScale: 'md',
  density: 'comfortable',
  heroAutoplay: true,
  titleLanguage: 'english',
  ratingScale: '10',
  hideScores: false,
  blurSynopsis: false,
  hiddenHomeSections: [],
  defaultSort: 'popularity',
  pageSize: 24,
  dataSaver: false,
  offlineCache: true,
  prefetchOnHover: true,
  autoplayTrailers: false,
}

/** Guards against corrupted or hand-edited storage values. */
const asArray = <T,>(v: T[]): T[] => (Array.isArray(v) ? v : [])

/** Persistent client-side stores. Keys are prefixed with `anivia:` in localStorage. */
export const preferencesStore = createPersistentStore<Preferences>('preferences', defaultPreferences, (stored) => ({
  ...defaultPreferences,
  ...(stored && typeof stored === 'object' ? stored : {}),
}))
export const watchlistStore = createPersistentStore<WatchlistItem[]>('watchlist', [], asArray)
export const favoritesStore = createPersistentStore<string[]>('favorites', [], asArray)
export const historyStore = createPersistentStore<WatchProgress[]>('history', [], asArray)
export const recentSearchesStore = createPersistentStore<string[]>('recent-searches', [], asArray)
export const viewModeStore = createPersistentStore<'grid' | 'list'>('view-mode', 'grid')
/** The user's own 1–10 scores, keyed by anime id. */
export const ratingsStore = createPersistentStore<Record<string, number>>('ratings', {}, (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}))
export const favoriteCharactersStore = createPersistentStore<string[]>('favorite-characters', [], asArray)
