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
}
