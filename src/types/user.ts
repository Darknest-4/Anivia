import type { SortOption } from './anime'
export type ThemePreference = 'dark' | 'light' | 'system'
export type VideoQuality = 'auto' | '1080p' | '720p' | '480p' | '360p'
export type WatchlistStatus = 'watching' | 'planning' | 'completed' | 'on-hold' | 'dropped'

export interface User {
  id: string
  username: string
  displayName: string
  avatarHue: number
  bio: string
  memberSince: string
  location?: string
  plan: 'free' | 'plus' | 'pro'
  /** Profile picture (an anime character's image). */
  avatarUrl?: string
  /** Profile banner (an anime banner). */
  bannerUrl?: string
}

export interface WatchlistItem {
  animeId: string
  status: WatchlistStatus
  addedAt: string
  updatedAt: string
}

export interface WatchProgress {
  animeId: string
  episodeId: string
  episodeNumber: number
  progress: number // seconds
  duration: number // seconds
  lastWatched: string
  completed: boolean
}

/** A history item is a WatchProgress entry — one record per anime episode. */
export type HistoryItem = WatchProgress

export interface Preferences {
  theme: ThemePreference
  autoplay: boolean
  autoNext: boolean
  skipIntro: boolean
  defaultQuality: VideoQuality
  subtitles: boolean
  subtitleLanguage: string
  audioLanguage: string
  interfaceLanguage: string
  notifyReleases: boolean
  notifyNewEpisodes: boolean
  notifyAnnouncements: boolean
  privateProfile: boolean
  showHistory: boolean
  reduceMotion: boolean
  /** Brand accent color preset. */
  accent: AccentColor
  /** Base font size. */
  fontScale: 'sm' | 'md' | 'lg'
  /** Poster grid density. */
  density: 'comfortable' | 'compact'
  /** Auto-rotate the home spotlight. */
  heroAutoplay: boolean
  /** Which title to show for real-API anime. */
  titleLanguage: 'english' | 'romaji' | 'native'
  /** Score display. */
  ratingScale: '10' | '100' | '5'
  /** Hide scores everywhere (spoiler-free browsing). */
  hideScores: boolean
  /** Blur synopses until hovered. */
  blurSynopsis: boolean
  /** Home page sections the user has turned off. */
  hiddenHomeSections: string[]
  /** Default sort on the browse page. */
  defaultSort: SortOption
  /** Default page size on the browse page. */
  pageSize: 12 | 24 | 48
  /** Smaller images, no trailer/hero autoplay, no prefetching. */
  dataSaver: boolean
  /** Keep API responses in the browser for instant reloads. */
  offlineCache: boolean
  /** Prefetch details when hovering a title. */
  prefetchOnHover: boolean
  /** Open the trailer automatically on title pages. */
  autoplayTrailers: boolean
}

export type AccentColor = 'crimson' | 'violet' | 'blue' | 'emerald' | 'amber' | 'pink' | 'cyan'
