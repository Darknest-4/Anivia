/** Subset of the Jikan v4 REST schema used by ANIVIA. https://docs.api.jikan.moe */
export interface JkImages {
  jpg?: { image_url?: string | null; large_image_url?: string | null }
  webp?: { image_url?: string | null; large_image_url?: string | null }
}

export interface JkNamed {
  mal_id: number
  name: string
}

export interface JkAnime {
  mal_id: number
  images: JkImages
  trailer?: { youtube_id?: string | null; images?: { maximum_image_url?: string | null; large_image_url?: string | null } } | null
  streaming?: { name: string; url: string }[]
  title: string
  title_english: string | null
  title_japanese: string | null
  type: string | null
  episodes: number | null
  status: string | null
  airing?: boolean
  aired?: { from: string | null; to: string | null } | null
  duration: string | null
  rating: string | null
  score: number | null
  scored_by: number | null
  rank: number | null
  members: number | null
  favorites: number | null
  synopsis: string | null
  season: string | null
  year: number | null
  broadcast?: { day: string | null; time: string | null; timezone: string | null } | null
  studios?: JkNamed[]
  genres?: JkNamed[]
  themes?: JkNamed[]
  demographics?: JkNamed[]
  relations?: { relation: string; entry: { mal_id: number; type: string; name: string }[] }[]
}

export interface JkPagination {
  last_visible_page: number
  has_next_page: boolean
  current_page?: number
  items?: { count: number; total: number; per_page: number }
}

export interface JkList<T> {
  data: T[]
  pagination?: JkPagination
}

export interface JkEpisode {
  mal_id: number
  title: string | null
  aired: string | null
  filler: boolean
  recap: boolean
}

export interface JkCharacter {
  mal_id: number
  name: string
  name_kanji?: string | null
  images: JkImages
  about?: string | null
  favorites?: number
  anime?: { role: string; anime: { mal_id: number; title: string } }[]
  voices?: { language: string; person: { name: string } }[]
}

export interface JkProducer {
  mal_id: number
  titles: { type: string; title: string }[]
  established: string | null
  about: string | null
  count: number | null
  favorites: number | null
}
