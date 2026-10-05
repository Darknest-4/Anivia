/** Subset of the AniList GraphQL schema used by ANIVIA. */
export interface AlFuzzyDate {
  year: number | null
  month: number | null
  day: number | null
}

export interface AlMedia {
  id: number
  idMal: number | null
  type?: string
  isAdult?: boolean
  title: { romaji: string | null; english: string | null; native: string | null }
  description: string | null
  coverImage: { extraLarge: string | null; large: string | null; color: string | null }
  bannerImage: string | null
  averageScore: number | null
  popularity: number | null
  favourites: number | null
  season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | null
  seasonYear: number | null
  status: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS' | null
  format: string | null
  episodes: number | null
  duration: number | null
  genres: string[] | null
  tags: { name: string; rank: number; isMediaSpoiler: boolean }[] | null
  studios: { nodes: { id: number; name: string }[] } | null
  startDate: AlFuzzyDate | null
  endDate: AlFuzzyDate | null
  updatedAt: number | null
  nextAiringEpisode: { episode: number; airingAt: number } | null
  rankings: { rank: number; type: 'RATED' | 'POPULAR'; allTime: boolean }[] | null
  staff?: { edges: { role: string; node: { id: number; name: { full: string } } }[] }
  relations?: { edges: { relationType: string; node: { id: number; type: string } & Partial<AlMedia> }[] }
  streamingEpisodes?: { title: string | null; thumbnail: string | null }[]
}

export interface AlCharacter {
  id: number
  name: { full: string; native: string | null }
  image: { large: string | null }
  description: string | null
  age: string | null
  gender: string | null
  favourites: number | null
  media?: {
    edges: {
      characterRole: 'MAIN' | 'SUPPORTING' | 'BACKGROUND'
      voiceActors: { name: { full: string } }[]
      en: { name: { full: string } }[]
      node: { id: number; title: { romaji: string | null; english: string | null } }
    }[]
  }
}

export interface AlStudio {
  id: number
  name: string
  favourites: number | null
  isAnimationStudio: boolean
  media?: { pageInfo?: { total: number }; nodes: { coverImage?: { large: string | null } }[] }
}

export interface AlPageInfo {
  total: number
  currentPage: number
  lastPage: number
  perPage: number
}
