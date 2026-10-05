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

/**
 * The single contract between ANIVIA's UI and any data source.
 *
 * Every page reads data exclusively through this interface (via the hooks in
 * `src/hooks/queries.ts`). To connect your own backend, implement this
 * interface and register it in `src/services/anime/index.ts`.
 */
export interface AnimeProvider {
  /** Hand-picked titles for the home hero carousel. */
  getFeatured(): Promise<Anime[]>
  getTrending(): Promise<Anime[]>
  getPopular(): Promise<Anime[]>
  /** Titles ordered by their most recent update (new episode, metadata change…). */
  getRecent(): Promise<Anime[]>
  getTopRated(): Promise<Anime[]>
  getUpcoming(): Promise<Anime[]>
  /** Newest individual episodes across the catalog. */
  getLatestEpisodes(limit?: number): Promise<EpisodeRelease[]>

  getCurrentSeason(): Promise<SeasonInfo>
  getSeason(season: SeasonName, year: number): Promise<Anime[]>

  getAnime(id: string): Promise<Anime | null>
  getAnimeByIds(ids: string[]): Promise<Anime[]>
  getRelated(id: string): Promise<Anime[]>
  /** Recommendations based on a set of seed titles (watch history, watchlist…). */
  getRecommendations(seedIds: string[], limit?: number): Promise<Anime[]>

  browse(query: BrowseQuery): Promise<Paginated<Anime>>
  search(query: string): Promise<Anime[]>
  getSuggestions(query: string): Promise<SearchSuggestions>

  getGenres(): Promise<Genre[]>
  getGenre(slug: string): Promise<Genre | null>

  getSchedule(): Promise<ScheduleItem[]>

  getEpisodes(animeId: string): Promise<Episode[]>
  getEpisode(animeId: string, episodeId: string): Promise<Episode | null>

  getCharacters(query?: CharacterQuery): Promise<Character[]>
  getCharacter(id: string): Promise<Character | null>

  getStudios(): Promise<Studio[]>
  getStudio(id: string): Promise<Studio | null>
}

/** Thrown by providers when a request fails. The UI renders a friendly error state. */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}
