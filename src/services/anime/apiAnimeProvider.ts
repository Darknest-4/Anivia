import { config } from '@/config'
import type {
  Anime,
  BrowseQuery,
  Character,
  CharacterQuery,
  Episode,
  EpisodeRelease,
  Genre,
  Paginated,
  ScheduleItem,
  SearchSuggestions,
  SeasonInfo,
  SeasonName,
  Studio,
} from '@/types'
import { ProviderError, type AnimeProvider } from './AnimeProvider'
import { mapAnime, mapCharacter, mapEpisode, mapGenre, mapStudio, type ApiAnime, type ApiCharacter, type ApiEpisode, type ApiGenre, type ApiStudio } from './apiMappers'

/**
 * Reference REST implementation of AnimeProvider.
 *
 * Enable it with `VITE_ANIME_PROVIDER=api` and `VITE_API_BASE_URL=https://your-api`.
 * Endpoint paths below are a suggested convention — adapt them (and the mappers in
 * `apiMappers.ts`) to match your own backend. Only connect to sources you are licensed to use.
 */
export class ApiAnimeProvider implements AnimeProvider {
  constructor(private readonly baseUrl = config.apiBaseUrl) {}

  private async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(path.replace(/^\//, ''), this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`)
    Object.entries(params ?? {}).forEach(([k, v]) => v !== undefined && v !== '' && url.searchParams.set(k, String(v)))
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (res.status === 404) return null as T
    if (!res.ok) throw new ProviderError(`Request failed: ${res.status}`, res.status)
    return (await res.json()) as T
  }

  private list = async (path: string, params?: Record<string, string | number | undefined>) =>
    (await this.get<ApiAnime[]>(path, params)).map(mapAnime)

  getFeatured = () => this.list('/anime/featured')
  getTrending = () => this.list('/anime/trending')
  getPopular = () => this.list('/anime/popular')
  getRecent = () => this.list('/anime/recent')
  getTopRated = () => this.list('/anime/top-rated')
  getUpcoming = () => this.list('/anime/upcoming')

  async getLatestEpisodes(limit = 12): Promise<EpisodeRelease[]> {
    const rows = await this.get<{ anime: ApiAnime; episode: ApiEpisode }[]>('/episodes/latest', { limit })
    return rows.map((r) => ({ anime: mapAnime(r.anime), episode: mapEpisode(r.episode) }))
  }

  getCurrentSeason = () => this.get<SeasonInfo>('/seasons/current')
  getSeason = (season: SeasonName, year: number) => this.list(`/seasons/${year}/${season}`)

  async getAnime(id: string): Promise<Anime | null> {
    const row = await this.get<ApiAnime | null>(`/anime/${encodeURIComponent(id)}`)
    return row ? mapAnime(row) : null
  }

  getAnimeByIds = (ids: string[]) => (ids.length ? this.list('/anime', { ids: ids.join(',') }) : Promise.resolve([]))
  getRelated = (id: string) => this.list(`/anime/${encodeURIComponent(id)}/related`)
  getRecommendations = (seedIds: string[], limit = 12) => this.list('/recommendations', { seeds: seedIds.join(','), limit })

  async browse(query: BrowseQuery): Promise<Paginated<Anime>> {
    const { genres, ...rest } = query
    const res = await this.get<Paginated<ApiAnime>>('/anime/browse', {
      ...(rest as Record<string, string | number | undefined>),
      genres: genres?.join(','),
    })
    return { ...res, items: res.items.map(mapAnime) }
  }

  search = (query: string) => this.list('/search', { q: query })

  async getSuggestions(query: string): Promise<SearchSuggestions> {
    const res = await this.get<{ anime: ApiAnime[]; genres: ApiGenre[]; characters: ApiCharacter[]; studios: ApiStudio[] }>(
      '/search/suggestions',
      { q: query },
    )
    return {
      anime: res.anime.map(mapAnime),
      genres: res.genres.map(mapGenre),
      characters: res.characters.map(mapCharacter),
      studios: res.studios.map(mapStudio),
    }
  }

  getGenres = async (): Promise<Genre[]> => (await this.get<ApiGenre[]>('/genres')).map(mapGenre)
  getGenre = async (slug: string): Promise<Genre | null> => {
    const row = await this.get<ApiGenre | null>(`/genres/${encodeURIComponent(slug)}`)
    return row ? mapGenre(row) : null
  }

  async getSchedule(): Promise<ScheduleItem[]> {
    const rows = await this.get<(Omit<ScheduleItem, 'anime'> & { anime: ApiAnime })[]>('/schedule')
    return rows.map((r) => ({ ...r, anime: mapAnime(r.anime) }))
  }

  getEpisodes = async (animeId: string): Promise<Episode[]> =>
    (await this.get<ApiEpisode[]>(`/anime/${encodeURIComponent(animeId)}/episodes`)).map(mapEpisode)
  getEpisode = async (animeId: string, episodeId: string): Promise<Episode | null> => {
    const row = await this.get<ApiEpisode | null>(`/anime/${encodeURIComponent(animeId)}/episodes/${encodeURIComponent(episodeId)}`)
    return row ? mapEpisode(row) : null
  }

  getCharacters = async (query: CharacterQuery = {}): Promise<Character[]> =>
    (await this.get<ApiCharacter[]>('/characters', { q: query.query, role: query.role, anime: query.animeId })).map(mapCharacter)
  getCharacter = async (id: string): Promise<Character | null> => {
    const row = await this.get<ApiCharacter | null>(`/characters/${encodeURIComponent(id)}`)
    return row ? mapCharacter(row) : null
  }

  getStudios = async (): Promise<Studio[]> => (await this.get<ApiStudio[]>('/studios')).map(mapStudio)
  getStudio = async (id: string): Promise<Studio | null> => {
    const row = await this.get<ApiStudio | null>(`/studios/${encodeURIComponent(id)}`)
    return row ? mapStudio(row) : null
  }
}
