import { t } from '@/i18n'
/**
 * Mapping layer between YOUR API's response shapes and ANIVIA's domain models.
 * The `Api*` interfaces below describe an example snake_case backend — edit them
 * to mirror your real payloads, then adjust the mapping functions.
 */
import type { Anime, AnimeStatus, AnimeType, Character, Episode, Genre, Studio } from '@/types'

export interface ApiGenre {
  id: string | number
  slug: string
  name: string
  description?: string
  color_hue?: number
  anime_count?: number
}

export interface ApiStudio {
  id: string | number
  name: string
  country?: string
  founded_year?: number
  description?: string
  website?: string
  anime_count?: number
}

export interface ApiAnime {
  id: string | number
  slug?: string
  title: string
  title_alt?: string
  title_native?: string
  synopsis?: string
  poster_url: string
  banner_url?: string
  score?: number
  score_count?: number
  members?: number
  rank?: number
  year?: number
  season?: Anime['season']
  status: string
  format: string
  episode_count?: number
  episodes_aired?: number
  episode_duration?: number
  age_rating?: Anime['ageRating']
  genres?: ApiGenre[]
  studios?: ApiStudio[]
  audio_languages?: Anime['languages']
  aired_from?: string
  aired_to?: string
  updated_at?: string
  next_episode_at?: string
  tags?: string[]
  related_ids?: (string | number)[]
}

export interface ApiEpisode {
  id: string | number
  anime_id: string | number
  number: number
  season?: number
  title?: string
  synopsis?: string
  air_date?: string
  duration_seconds?: number
  thumbnail_url?: string
  is_filler?: boolean
  is_available?: boolean
}

export interface ApiCharacter {
  id: string | number
  name: string
  name_native?: string
  role?: Character['role']
  anime_id: string | number
  description?: string
  voice_actor?: string
  voice_actor_en?: string
  age?: string
  favorites?: number
  image_url: string
}

const STATUS: Record<string, AnimeStatus> = {
  airing: 'airing',
  releasing: 'airing',
  finished: 'finished',
  completed: 'finished',
  upcoming: 'upcoming',
  not_yet_aired: 'upcoming',
  hiatus: 'hiatus',
}

const TYPES: Record<string, AnimeType> = { tv: 'TV', movie: 'Movie', ova: 'OVA', ona: 'ONA', special: 'Special' }

export const mapGenre = (g: ApiGenre): Genre => ({
  id: String(g.id),
  slug: g.slug,
  name: g.name,
  description: g.description ?? '',
  hue: g.color_hue ?? 348,
  animeCount: g.anime_count,
})

export const mapStudio = (s: ApiStudio): Studio => ({
  id: String(s.id),
  name: s.name,
  country: s.country ?? '—',
  founded: s.founded_year ?? 0,
  description: s.description ?? '',
  website: s.website,
  logoHue: (s.name.charCodeAt(0) * 37) % 360,
  animeCount: s.anime_count,
})

export const mapAnime = (a: ApiAnime): Anime => ({
  id: String(a.slug ?? a.id),
  slug: String(a.slug ?? a.id),
  title: a.title,
  alternativeTitle: a.title_alt,
  nativeTitle: a.title_native,
  description: a.synopsis ?? '',
  poster: a.poster_url,
  backdrop: a.banner_url,
  rating: a.score,
  ratingCount: a.score_count,
  popularity: a.members ?? 0,
  rank: a.rank,
  year: a.year,
  season: a.season,
  status: STATUS[a.status.toLowerCase()] ?? 'finished',
  type: TYPES[a.format.toLowerCase()] ?? 'TV',
  episodes: a.episode_count,
  episodesAired: a.episodes_aired,
  duration: a.episode_duration,
  ageRating: a.age_rating,
  genres: (a.genres ?? []).map(mapGenre),
  studios: (a.studios ?? []).map(mapStudio),
  languages: a.audio_languages ?? ['Japanese'],
  quality: 'FHD',
  airedFrom: a.aired_from,
  airedTo: a.aired_to,
  updatedAt: a.updated_at ?? new Date().toISOString(),
  nextEpisodeAt: a.next_episode_at,
  tags: a.tags,
  relatedIds: a.related_ids?.map(String),
})

export const mapEpisode = (e: ApiEpisode): Episode => ({
  id: String(e.id),
  animeId: String(e.anime_id),
  number: e.number,
  season: e.season ?? 1,
  title: e.title ?? t('Episode {p0}', { p0: e.number }),
  synopsis: e.synopsis ?? '',
  airDate: e.air_date ?? '',
  duration: e.duration_seconds ?? 1440,
  thumbnail: e.thumbnail_url ?? '',
  filler: e.is_filler,
  locked: e.is_available === false,
})

export const mapCharacter = (c: ApiCharacter): Character => ({
  id: String(c.id),
  name: c.name,
  nativeName: c.name_native,
  role: c.role ?? 'Supporting',
  animeId: String(c.anime_id),
  description: c.description ?? '',
  voiceActor: c.voice_actor ?? '—',
  voiceActorEn: c.voice_actor_en,
  age: c.age,
  favorites: c.favorites ?? 0,
  image: c.image_url,
})
