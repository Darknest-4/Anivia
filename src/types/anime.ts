/**
 * Core domain models used across ANIVIA.
 * Map your own API responses into these shapes inside a custom AnimeProvider.
 */

export type AnimeStatus = 'airing' | 'finished' | 'upcoming' | 'hiatus'
export type AnimeType = 'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special'
export type SeasonName = 'winter' | 'spring' | 'summer' | 'fall'
export type AgeRating = 'G' | 'PG' | 'PG-13' | 'R' | 'R+'
export type AudioLanguage = 'Japanese' | 'English' | 'Spanish' | 'Portuguese' | 'French' | 'German'

/** Visual seed for locally generated placeholder artwork (see lib/artwork). */
export interface ArtworkSeed {
  hue: number
  hue2: number
  motif: ArtworkMotif
}

export type ArtworkMotif =
  | 'moon'
  | 'city'
  | 'orbit'
  | 'peaks'
  | 'waves'
  | 'sakura'
  | 'blade'
  | 'grid'
  | 'forest'
  | 'storm'

export interface Genre {
  id: string
  slug: string
  name: string
  description: string
  hue: number
  animeCount?: number
}

export interface Studio {
  id: string
  name: string
  country?: string
  founded?: number
  description: string
  website?: string
  logoHue: number
  animeCount?: number
  employees?: number
  /** Users who favourited the studio on the source site. */
  favorites?: number
  /** A few cover images of the studio's best-known works. */
  posters?: string[]
  /** Studio page on the data source (e.g. AniList). */
  siteUrl?: string
}

export interface StaffMember {
  id: string
  name: string
  role: string
}

export interface Character {
  id: string
  name: string
  nativeName?: string
  role: 'Main' | 'Supporting' | 'Antagonist'
  animeId: string
  description: string
  voiceActor: string
  voiceActorEn?: string
  age?: string
  height?: string
  affiliation?: string
  favorites: number
  image: string
  /** Title of `animeId`, when the API returns it alongside the character. */
  animeTitle?: string
}

export interface Anime {
  id: string
  slug: string
  title: string
  alternativeTitle?: string
  nativeTitle?: string
  description: string
  synopsisShort?: string
  poster: string
  backdrop?: string
  rating?: number
  ratingCount?: number
  popularity: number
  /** Users who favourited the title on the source site. */
  favorites?: number
  rank?: number
  year?: number
  season?: SeasonName
  status: AnimeStatus
  type: AnimeType
  episodes?: number
  episodesAired?: number
  duration?: number
  ageRating?: AgeRating
  genres: Genre[]
  studios: Studio[]
  languages: AudioLanguage[]
  /** Highest available stream quality, when your backend knows it. */
  quality?: 'HD' | 'FHD' | '4K'
  airedFrom?: string
  airedTo?: string
  updatedAt: string
  nextEpisodeAt?: string
  tags?: string[]
  staff?: StaffMember[]
  relatedIds?: string[]
  trailerAvailable?: boolean
  featured?: boolean
  /** Transparent title logo (from ani.zip / TVDB clearlogo). */
  logo?: string
  /** Official promotional video (YouTube). */
  trailer?: { youtubeId: string; thumbnail?: string }
  /** Licensed services where the title can be watched legally. */
  watchLinks?: WatchLink[]
  artwork?: ArtworkSeed
}

export interface Episode {
  id: string
  animeId: string
  number: number
  season: number
  title: string
  synopsis: string
  airDate: string
  duration: number
  thumbnail: string
  filler?: boolean
  locked?: boolean
}

export type ScheduleStatus = 'aired' | 'airing-soon' | 'upcoming' | 'delayed'

export interface ScheduleItem {
  id: string
  animeId: string
  anime: Anime
  day: number // 0 = Monday … 6 = Sunday
  time: string // "HH:mm", 24h
  episode: number
  status: ScheduleStatus
}

export type SortOption =
  | 'popularity'
  | 'rating'
  | 'newest'
  | 'oldest'
  | 'title-asc'
  | 'title-desc'
  | 'updated'
  | 'episodes'

export interface AnimeFilters {
  query?: string
  genres?: string[]
  year?: number
  season?: SeasonName
  status?: AnimeStatus
  type?: AnimeType
  minRating?: number
  language?: AudioLanguage
  studio?: string
}

export interface BrowseQuery extends AnimeFilters {
  sort?: SortOption
  page?: number
  perPage?: number
}

export interface Paginated<T> {
  items: T[]
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface SeasonInfo {
  slug: string
  season: SeasonName
  year: number
  label: string
}

export interface SearchSuggestions {
  anime: Anime[]
  genres: Genre[]
  characters: Character[]
  studios: Studio[]
}

export interface EpisodeRelease {
  anime: Anime
  episode: Episode
}

export interface CharacterQuery {
  query?: string
  role?: Character['role']
  animeId?: string
}

export interface WatchLink {
  name: string
  url: string
  /** Brand color (hex) when the API provides one. */
  color?: string
  icon?: string
}
