import { config } from '@/config'
import { matchGenres } from '@/lib/search'
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
  SeasonName,
  SortOption,
  Studio,
} from '@/types'
import type { AnimeProvider } from '../AnimeProvider'
import { currentSeason, dayIndex, hhmm, nextJstBroadcast, scheduleStatus, startOfWeek } from '../shared/dates'
import { buildEpisodes, type EpisodeHint } from '../shared/episodes'
import { genreFromJikan, isExcludedGenre, jikanGenreIds } from '../shared/genres'
import { fetchAniZip, withinMs } from '../anizip'
import { createRequestQueue } from '../shared/requestQueue'
import { isNumericId } from '../shared/text'
import { mapAnime, mapCharacter, mapEntry, mapProducer, toJikanStatus, toJikanType } from './mappers'
import type { JkAnime, JkCharacter, JkEpisode, JkList, JkNamed, JkProducer } from './types'

const ORDER: Record<SortOption, [string, 'asc' | 'desc']> = {
  popularity: ['members', 'desc'],
  rating: ['score', 'desc'],
  newest: ['start_date', 'desc'],
  oldest: ['start_date', 'asc'],
  'title-asc': ['title', 'asc'],
  'title-desc': ['title', 'desc'],
  updated: ['start_date', 'desc'],
  episodes: ['episodes', 'desc'],
}

const SEASON_MONTHS: Record<SeasonName, [string, string]> = { winter: ['01-01', '03-31'], spring: ['04-01', '06-30'], summer: ['07-01', '09-30'], fall: ['10-01', '12-31'] }

/** Jikan returns at most 25 items per page. */
const MAX_LIMIT = 25

const dedupe = (list: Anime[]) => {
  const seen = new Set<string>()
  return list.filter((a) => !seen.has(a.id) && seen.add(a.id))
}

/**
 * AnimeProvider backed by Jikan v4 — the unofficial MyAnimeList REST API (no API key required).
 * https://docs.api.jikan.moe — limited to 3 requests/second and 60 requests/minute, so every
 * call goes through a shared rate-limited, cached queue.
 */
export class JikanAnimeProvider implements AnimeProvider {
  readonly name = 'Jikan (MyAnimeList)'
  readonly features = { languageFilter: false }
  private queue = createRequestQueue({ minInterval: 400, perMinute: 55 })

  constructor(private readonly baseUrl = config.jikanUrl) {}

  private get<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    const url = new URL(path.replace(/^\//, ''), this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`)
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && url.searchParams.set(k, String(v)))
    return this.queue.request<T>(url.toString(), { headers: { Accept: 'application/json' } })
  }

  private async animeList(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
    const res = await this.get<JkList<JkAnime> | null>(path, { sfw: true, limit: MAX_LIMIT, ...params })
    return { items: dedupe((res?.data ?? []).map(mapAnime)), pagination: res?.pagination }
  }

  private list = async (path: string, params?: Record<string, string | number | boolean | undefined>) => (await this.animeList(path, params)).items

  async getFeatured() {
    const items = await this.list('/top/anime', { filter: 'airing' })
    return items.filter((a) => a.featured).slice(0, 6)
  }
  getTrending = () => this.list('/top/anime', { filter: 'airing' })
  getPopular = () => this.list('/top/anime', { filter: 'bypopularity' })
  getRecent = () => this.list('/seasons/now')
  getTopRated = () => this.list('/top/anime')
  getUpcoming = () => this.list('/seasons/upcoming')

  async getLatestEpisodes(limit = 12): Promise<EpisodeRelease[]> {
    type W = { entry: { mal_id: number; title: string; images: JkAnime['images'] }; episodes: { mal_id: number; title: string }[] }
    const res = await this.get<JkList<W> | null>('/watch/episodes')
    return (res?.data ?? []).slice(0, limit).flatMap((w) => {
      const anime = mapEntry(w.entry)
      const ep = w.episodes[0]
      if (!ep) return []
      const number = Number(/(\d+)/.exec(ep.title)?.[1] ?? ep.mal_id)
      return [
        {
          anime,
          episode: {
            id: `${anime.id}-e${number}`,
            animeId: anime.id,
            number,
            season: 1,
            title: ep.title,
            synopsis: '',
            airDate: '',
            duration: 24 * 60,
            thumbnail: anime.poster,
          },
        },
      ]
    })
  }

  getCurrentSeason = async () => currentSeason()

  async getSeason(season: SeasonName, year: number) {
    const [a, b] = await Promise.all([this.list(`/seasons/${year}/${season}`, { page: 1 }), this.list(`/seasons/${year}/${season}`, { page: 2 })])
    return dedupe([...a, ...b])
  }

  async getAnime(id: string): Promise<Anime | null> {
    if (!isNumericId(id)) return null
    const res = await this.get<{ data: JkAnime } | null>(`/anime/${id}/full`)
    return res?.data ? mapAnime(res.data) : null
  }

  async getAnimeByIds(ids: string[]) {
    const results = await Promise.all(ids.filter(isNumericId).slice(0, 24).map((id) => this.getAnime(id).catch(() => null)))
    return results.filter((a): a is Anime => Boolean(a))
  }

  async getRelated(id: string) {
    const anime = await this.getAnime(id)
    return this.getAnimeByIds((anime?.relatedIds ?? []).slice(0, 6))
  }

  async getRecommendations(seedIds: string[], limit = 12) {
    const seed = seedIds.find(isNumericId)
    if (!seed) return (await this.getTopRated()).slice(0, limit)
    type R = { entry: { mal_id: number; title: string; images: JkAnime['images'] } }
    const res = await this.get<JkList<R> | null>(`/anime/${seed}/recommendations`)
    const ids = (res?.data ?? []).map((r) => String(r.entry.mal_id)).filter((id) => !seedIds.includes(id))
    // Recommendations only carry a title + image; fetch full records for a richer UI.
    return this.getAnimeByIds(ids.slice(0, Math.min(limit, 8)))
  }

  async browse(query: BrowseQuery): Promise<Paginated<Anime>> {
    const { page = 1, sort = 'popularity' } = query
    const limit = Math.min(query.perPage ?? 24, MAX_LIMIT)
    const [orderBy, direction] = ORDER[sort]
    let start: string | undefined
    let end: string | undefined
    if (query.year) {
      const [s, e] = query.season ? SEASON_MONTHS[query.season] : ['01-01', '12-31']
      start = `${query.year}-${s}`
      end = `${query.year}-${e}`
    }
    const genres = jikanGenreIds(query.genres)
    const { items, pagination } = await this.animeList('/anime', {
      q: query.query || undefined,
      page,
      limit,
      genres: genres.length ? genres.join(',') : undefined,
      status: query.status ? toJikanStatus[query.status] : undefined,
      type: query.type ? toJikanType[query.type] : undefined,
      min_score: query.minRating,
      producers: query.studio,
      start_date: start,
      end_date: end,
      order_by: query.query && sort === 'popularity' ? undefined : orderBy,
      sort: query.query && sort === 'popularity' ? undefined : direction,
    })
    const filtered = query.season && !query.year ? items.filter((a) => a.season === query.season) : items
    const total = pagination?.items?.total ?? filtered.length
    return { items: filtered, page, perPage: limit, total, totalPages: Math.max(1, pagination?.last_visible_page ?? 1) }
  }

  search = (query: string) => this.list('/anime', { q: query })

  async getSuggestions(query: string): Promise<SearchSuggestions> {
    const [anime, characters, studios, genres] = await Promise.all([
      this.list('/anime', { q: query, limit: 5 }),
      this.get<JkList<JkCharacter> | null>('/characters', { q: query, limit: 3, order_by: 'favorites', sort: 'desc' }),
      this.get<JkList<JkProducer> | null>('/producers', { q: query, limit: 3, order_by: 'favorites', sort: 'desc' }),
      this.getGenres(),
    ])
    return {
      anime,
      characters: (characters?.data ?? []).map((c) => mapCharacter(c)),
      studios: (studios?.data ?? []).map(mapProducer),
      genres: matchGenres(genres, query).slice(0, 3),
    }
  }

  async getGenres(): Promise<Genre[]> {
    type G = JkNamed & { count: number }
    const [genres, themes] = await Promise.all([
      this.get<JkList<G> | null>('/genres/anime', { filter: 'genres' }),
      this.get<JkList<G> | null>('/genres/anime', { filter: 'themes' }),
    ])
    const all = [...(genres?.data ?? []), ...(themes?.data ?? [])].filter((g) => !isExcludedGenre(g.name))
    const bySlug = new Map<string, Genre>()
    for (const g of all) {
      const genre = genreFromJikan(g, g.count)
      if (!bySlug.has(genre.slug)) bySlug.set(genre.slug, genre)
    }
    return [...bySlug.values()].sort((a, b) => (b.animeCount ?? 0) - (a.animeCount ?? 0))
  }

  async getGenre(slug: string) {
    return (await this.getGenres()).find((g) => g.slug === slug) ?? null
  }

  async getSchedule(): Promise<ScheduleItem[]> {
    const items: JkAnime[] = []
    for (let page = 1; page <= 4; page++) {
      const res = await this.get<JkList<JkAnime> | null>('/schedules', { sfw: true, kids: false, limit: MAX_LIMIT, page })
      items.push(...(res?.data ?? []))
      if (!res?.pagination?.has_next_page) break
    }
    const weekStart = startOfWeek()
    const seen = new Set<number>()
    return items
      .filter((a) => !seen.has(a.mal_id) && seen.add(a.mal_id))
      .flatMap((a) => {
        let at = nextJstBroadcast(a.broadcast?.day, a.broadcast?.time, weekStart)
        if (!at) return []
        if (at.getTime() - weekStart.getTime() >= 7 * 86_400_000) at = new Date(at.getTime() - 7 * 86_400_000)
        const anime = mapAnime(a)
        const aired = anime.episodesAired ?? 0
        const status = scheduleStatus(at)
        return [{ id: `sch-${a.mal_id}`, animeId: anime.id, anime, day: dayIndex(at), time: hhmm(at), episode: status === 'aired' ? Math.max(1, aired) : aired + 1, status }]
      })
      .sort((x, y) => x.day - y.day || x.time.localeCompare(y.time))
  }

  /** Episode titles, air dates and filler flags (also used by the AniList provider). */
  async episodeHints(malId: string, maxPages = 3): Promise<Map<number, EpisodeHint>> {
    const hints = new Map<number, EpisodeHint>()
    for (let page = 1; page <= maxPages; page++) {
      const res = await this.get<JkList<JkEpisode> | null>(`/anime/${malId}/episodes`, { page })
      for (const ep of res?.data ?? []) hints.set(ep.mal_id, { title: ep.title ?? undefined, airDate: ep.aired ?? undefined, filler: ep.filler })
      if (!res?.pagination?.has_next_page) break
    }
    return hints
  }

  async getEpisodes(animeId: string): Promise<Episode[]> {
    const anime = await this.getAnime(animeId)
    if (!anime) return []
    // ani.zip first (titles, synopses, thumbnails); Jikan's own episode list as fallback.
    const zip = await withinMs(fetchAniZip({ mal: animeId }), 5000)
    const hints = zip?.episodes.size ? zip.episodes : await withinMs(this.episodeHints(animeId, 2), 5000).then((h) => h ?? new Map<number, EpisodeHint>())
    // When MAL knows the aired episodes, trust that over the weekly estimate.
    if (anime.status === 'airing' && hints.size) anime.episodesAired = Math.max(...hints.keys())
    return buildEpisodes(anime, hints)
  }

  async getEpisode(animeId: string, episodeId: string) {
    return (await this.getEpisodes(animeId)).find((e) => e.id === episodeId) ?? null
  }

  async getCharacters(query: CharacterQuery = {}): Promise<Character[]> {
    let list: Character[]
    if (query.animeId) {
      if (!isNumericId(query.animeId)) return []
      type C = { character: JkCharacter; role: string; favorites: number; voice_actors: { language: string; person: { name: string } }[] }
      const [res, anime] = await Promise.all([this.get<JkList<C> | null>(`/anime/${query.animeId}/characters`), this.getAnime(query.animeId)])
      list = (res?.data ?? [])
        .slice(0, 30)
        .map((c) =>
          mapCharacter(
            { ...c.character, favorites: c.favorites, voices: c.voice_actors },
            { role: c.role, animeId: query.animeId, animeTitle: anime?.title },
          ),
        )
        .sort((a, b) => (a.role === b.role ? b.favorites - a.favorites : a.role === 'Main' ? -1 : 1))
      if (query.query) {
        const q = query.query.toLowerCase()
        list = list.filter((c) => c.name.toLowerCase().includes(q))
      }
    } else {
      const res = query.query
        ? await this.get<JkList<JkCharacter> | null>('/characters', { q: query.query, order_by: 'favorites', sort: 'desc', limit: MAX_LIMIT })
        : await this.get<JkList<JkCharacter> | null>('/top/characters', { limit: MAX_LIMIT })
      list = (res?.data ?? []).map((c) => mapCharacter(c))
    }
    return query.role ? list.filter((c) => c.role === query.role) : list
  }

  async getCharacter(id: string) {
    if (!isNumericId(id)) return null
    const res = await this.get<{ data: JkCharacter } | null>(`/characters/${id}/full`)
    return res?.data ? mapCharacter(res.data) : null
  }

  async getStudios(): Promise<Studio[]> {
    const res = await this.get<JkList<JkProducer> | null>('/producers', { order_by: 'favorites', sort: 'desc', limit: MAX_LIMIT })
    return (res?.data ?? []).map(mapProducer)
  }

  async getStudio(id: string) {
    if (!isNumericId(id)) return null
    const res = await this.get<{ data: JkProducer } | null>(`/producers/${id}/full`)
    return res?.data ? mapProducer(res.data) : null
  }
}

