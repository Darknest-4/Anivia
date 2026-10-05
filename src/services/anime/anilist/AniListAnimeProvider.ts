import { config } from '@/config'
import { filterAnime, paginate } from '@/lib/filters'
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
import { JikanAnimeProvider } from '../jikan/JikanAnimeProvider'
import { currentSeason, dayIndex, hhmm, scheduleStatus, startOfWeek } from '../shared/dates'
import { buildEpisodes, type EpisodeHint } from '../shared/episodes'
import { anilistBrowsableGenres, anilistGenreFilter, genreFromName } from '../shared/genres'
import { createRequestQueue } from '../shared/requestQueue'
import { isNumericId } from '../shared/text'
import { mapCharacter, mapMedia, mapStudio, toAnilistFormats, toAnilistStatus } from './mappers'
import * as Q from './queries'
import type { AlCharacter, AlMedia, AlPageInfo, AlStudio } from './types'

const SORT: Record<SortOption, string> = {
  popularity: 'POPULARITY_DESC',
  rating: 'SCORE_DESC',
  newest: 'START_DATE_DESC',
  oldest: 'START_DATE',
  'title-asc': 'TITLE_ROMAJI',
  'title-desc': 'TITLE_ROMAJI_DESC',
  updated: 'UPDATED_AT_DESC',
  episodes: 'EPISODES_DESC',
}

type PageResult = { Page: { pageInfo: AlPageInfo; media: AlMedia[] } }

/**
 * AnimeProvider backed by the public AniList GraphQL API (no API key required).
 * https://docs.anilist.co — rate limited to ~90 requests/minute per IP.
 *
 * AniList has no episode titles, so episode lists are enriched from Jikan (MyAnimeList)
 * through each title's `idMal` when available.
 */
export class AniListAnimeProvider implements AnimeProvider {
  readonly name = 'AniList'
  readonly features = { languageFilter: false }
  private queue = createRequestQueue({ minInterval: 350, perMinute: 60 })
  private episodeSource: JikanAnimeProvider | null

  constructor(
    private readonly endpoint = config.anilistUrl,
    episodeSource: JikanAnimeProvider | null = new JikanAnimeProvider(),
  ) {
    this.episodeSource = episodeSource
  }

  private async gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const res = await this.queue.request<{ data: T; errors?: { message: string }[] } | null>(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    // AniList answers unknown ids with HTTP 404; callers treat a missing root field as "not found".
    if (!res) return {} as T
    if (res.errors?.length && !res.data) throw new Error(res.errors[0].message)
    return res.data
  }

  private async page(vars: Record<string, unknown>): Promise<{ items: Anime[]; info: AlPageInfo }> {
    const data = await this.gql<PageResult>(Q.PAGE_MEDIA, { page: 1, perPage: 24, ...vars })
    return { items: data.Page.media.map(mapMedia), info: data.Page.pageInfo }
  }

  private list = async (vars: Record<string, unknown>) => (await this.page(vars)).items

  async getFeatured() {
    const items = await this.list({ sort: ['TRENDING_DESC'], perPage: 15 })
    return items.filter((a) => a.featured).slice(0, 6)
  }
  getTrending = () => this.list({ sort: ['TRENDING_DESC'], perPage: 18 })
  getPopular = () => this.list({ sort: ['POPULARITY_DESC'], status: 'RELEASING', perPage: 18 })
  getRecent = () => this.list({ sort: ['UPDATED_AT_DESC'], status: 'RELEASING', perPage: 18 })
  getTopRated = () => this.list({ sort: ['SCORE_DESC'], perPage: 18 })
  getUpcoming = () => this.list({ sort: ['POPULARITY_DESC'], status: 'NOT_YET_RELEASED', perPage: 18 })

  async getLatestEpisodes(limit = 12): Promise<EpisodeRelease[]> {
    const now = Math.floor(Date.now() / 1000)
    const data = await this.gql<{ Page: { airingSchedules: { id: number; episode: number; airingAt: number; media: AlMedia & { isAdult: boolean; countryOfOrigin: string } }[] } }>(
      Q.AIRING,
      { page: 1, from: now - 7 * 86_400, to: now, sort: ['TIME_DESC'] },
    )
    return data.Page.airingSchedules
      .filter((s) => !s.media.isAdult && s.media.countryOfOrigin === 'JP')
      .sort((a, b) => (b.media.popularity ?? 0) - (a.media.popularity ?? 0))
      .slice(0, limit)
      .map((s) => {
        const anime = mapMedia(s.media)
        return {
          anime,
          episode: {
            id: `${anime.id}-e${s.episode}`,
            animeId: anime.id,
            number: s.episode,
            season: 1,
            title: `Episode ${s.episode}`,
            synopsis: '',
            airDate: new Date(s.airingAt * 1000).toISOString(),
            duration: (anime.duration ?? 24) * 60,
            thumbnail: anime.backdrop ?? anime.poster,
          },
        }
      })
  }

  getCurrentSeason = async () => currentSeason()

  async getSeason(season: SeasonName, year: number) {
    const [a, b] = await Promise.all([
      this.list({ season: season.toUpperCase(), year, sort: ['POPULARITY_DESC'], perPage: 50, page: 1 }),
      this.list({ season: season.toUpperCase(), year, sort: ['POPULARITY_DESC'], perPage: 50, page: 2 }),
    ])
    return [...a, ...b]
  }

  async getAnime(id: string): Promise<Anime | null> {
    if (!isNumericId(id)) return null
    const data = await this.gql<{ Media: AlMedia | null }>(Q.MEDIA_DETAIL, { id: Number(id) })
    if (!data.Media) return null
    return mapMedia(data.Media)
  }

  async getAnimeByIds(ids: string[]) {
    const numeric = ids.filter(isNumericId)
    if (!numeric.length) return []
    const items = await this.list({ ids: numeric.map(Number), perPage: 50 })
    const byId = new Map(items.map((a) => [a.id, a]))
    return numeric.map((id) => byId.get(id)).filter((a): a is Anime => Boolean(a))
  }

  private async relations(id: string) {
    type R = { Media: { relations: { edges: { node: AlMedia & { type: string; isAdult: boolean } }[] }; recommendations: { nodes: { mediaRecommendation: (AlMedia & { type: string; isAdult: boolean }) | null }[] } } | null }
    const data = await this.gql<R>(Q.MEDIA_RELATIONS, { id: Number(id) })
    return data.Media
  }

  async getRelated(id: string) {
    if (!isNumericId(id)) return []
    const media = await this.relations(id)
    return (media?.relations.edges ?? []).map((e) => e.node).filter((n) => n.type === 'ANIME' && !n.isAdult).map(mapMedia)
  }

  async getRecommendations(seedIds: string[], limit = 12) {
    const seeds = seedIds.filter(isNumericId)
    if (!seeds.length) return this.getTopRated().then((l) => l.slice(0, limit))
    const lists = await Promise.all(seeds.slice(0, 3).map((id) => this.relations(id)))
    const seen = new Set(seeds)
    const out: Anime[] = []
    for (const media of lists)
      for (const n of media?.recommendations.nodes ?? []) {
        const m = n.mediaRecommendation
        if (!m || m.type !== 'ANIME' || m.isAdult || seen.has(String(m.id))) continue
        seen.add(String(m.id))
        out.push(mapMedia(m))
      }
    return out.slice(0, limit)
  }

  async browse(query: BrowseQuery): Promise<Paginated<Anime>> {
    const { page = 1, perPage = 24, sort = 'popularity' } = query
    if (query.studio) {
      // AniList cannot filter media by studio; read the studio's catalog instead.
      const data = await this.gql<{ Studio: { media: { pageInfo: AlPageInfo; nodes: (AlMedia & { type: string; isAdult: boolean })[] } } | null }>(Q.STUDIO, {
        id: Number(query.studio),
        page: 1,
        perPage: 50,
      })
      const items = (data.Studio?.media.nodes ?? []).filter((m) => m.type === 'ANIME' && !m.isAdult).map(mapMedia)
      return paginate(filterAnime(items, { ...query, studio: undefined }), page, perPage)
    }
    const { genres, tags } = anilistGenreFilter(query.genres)
    const { items, info } = await this.page({
      page,
      perPage: Math.min(perPage, 50),
      sort: query.query && sort === 'popularity' ? ['SEARCH_MATCH', 'POPULARITY_DESC'] : [SORT[sort]],
      search: query.query || undefined,
      genres: genres.length ? genres : undefined,
      tags: tags.length ? tags : undefined,
      year: query.year,
      season: query.season?.toUpperCase(),
      status: query.status ? toAnilistStatus[query.status] : undefined,
      formats: query.type ? toAnilistFormats[query.type] : undefined,
      minScore: query.minRating ? Math.round(query.minRating * 10) - 1 : undefined,
    })
    return { items, page: info.currentPage, perPage: info.perPage, total: info.total, totalPages: Math.max(1, info.lastPage) }
  }

  search = (query: string) => this.list({ search: query, sort: ['SEARCH_MATCH'], perPage: 30 })

  async getSuggestions(query: string): Promise<SearchSuggestions> {
    type R = { anime: { media: AlMedia[] }; characters: { characters: AlCharacter[] }; studios: { studios: AlStudio[] } }
    const data = await this.gql<R>(Q.SUGGESTIONS, { search: query })
    const genres = await this.getGenres()
    return {
      anime: data.anime.media.map(mapMedia),
      characters: data.characters.characters.map((c) => mapCharacter(c)),
      studios: data.studios.studios.map(mapStudio),
      genres: matchGenres(genres, query).slice(0, 3),
    }
  }

  async getGenres(): Promise<Genre[]> {
    const entries = anilistBrowsableGenres.map((g, i) => ({ alias: `g${i}`, genre: g.anilist, tag: g.anilistTag, slug: g.slug }))
    const data = await this.gql<Record<string, { pageInfo: { total: number } }>>(Q.genreCountsQuery(entries))
    return entries
      .map((e) => ({ ...genreFromName(e.genre ?? e.tag ?? e.slug, data[e.alias]?.pageInfo.total), slug: e.slug }))
      .sort((a, b) => (b.animeCount ?? 0) - (a.animeCount ?? 0))
  }

  async getGenre(slug: string) {
    return (await this.getGenres()).find((g) => g.slug === slug) ?? null
  }

  async getSchedule(): Promise<ScheduleItem[]> {
    const from = Math.floor(startOfWeek().getTime() / 1000)
    const to = from + 7 * 86_400
    const all: { id: number; episode: number; airingAt: number; media: AlMedia & { isAdult: boolean; countryOfOrigin: string } }[] = []
    for (let page = 1; page <= 4; page++) {
      type R = { Page: { pageInfo: { hasNextPage: boolean }; airingSchedules: typeof all } }
      const data = await this.gql<R>(Q.AIRING, { page, from, to, sort: ['TIME'] })
      all.push(...data.Page.airingSchedules)
      if (!data.Page.pageInfo.hasNextPage) break
    }
    return all
      .filter((s) => !s.media.isAdult && s.media.countryOfOrigin === 'JP')
      .map((s) => {
        const at = new Date(s.airingAt * 1000)
        const anime = mapMedia(s.media)
        return { id: `sch-${s.id}`, animeId: anime.id, anime, day: dayIndex(at), time: hhmm(at), episode: s.episode, status: scheduleStatus(at) }
      })
  }

  async getEpisodes(animeId: string): Promise<Episode[]> {
    if (!isNumericId(animeId)) return []
    const data = await this.gql<{ Media: AlMedia | null }>(Q.MEDIA_DETAIL, { id: Number(animeId) })
    if (!data.Media) return []
    const anime = mapMedia(data.Media)
    const hints = new Map<number, EpisodeHint>()
    // Thumbnails / titles published by AniList's licensed-streaming metadata ("Episode 3 - Title").
    for (const ep of data.Media.streamingEpisodes ?? []) {
      const match = /episode\s+(\d+)\s*[-–:]\s*(.+)$/i.exec(ep.title ?? '')
      if (match) hints.set(Number(match[1]), { title: match[2].trim(), thumbnail: ep.thumbnail ?? undefined })
    }
    // Episode titles, air dates and filler flags from Jikan (MyAnimeList).
    const mal = data.Media.idMal
    if (mal && this.episodeSource) {
      try {
        const jikan = await this.episodeSource.episodeHints(String(mal))
        for (const [n, hint] of jikan) hints.set(n, { ...hint, ...hints.get(n), title: hints.get(n)?.title ?? hint.title })
      } catch {
        /* Jikan is optional enrichment — fall back to generic titles. */
      }
    }
    return buildEpisodes(anime, hints)
  }

  async getEpisode(animeId: string, episodeId: string) {
    return (await this.getEpisodes(animeId)).find((e) => e.id === episodeId) ?? null
  }

  async getCharacters(query: CharacterQuery = {}): Promise<Character[]> {
    let list: Character[]
    if (query.animeId) {
      if (!isNumericId(query.animeId)) return []
      type R = {
        Media: {
          id: number
          title: { romaji: string | null; english: string | null }
          characters: { edges: { role: string; voiceActors: { name: { full: string } }[]; en: { name: { full: string } }[]; node: AlCharacter }[] }
        } | null
      }
      const data = await this.gql<R>(Q.MEDIA_CHARACTERS, { id: Number(query.animeId) })
      const media = data.Media
      list = (media?.characters.edges ?? []).map((e) =>
        mapCharacter(e.node, {
          role: e.role,
          voiceActor: e.voiceActors[0]?.name.full,
          voiceActorEn: e.en[0]?.name.full,
          animeId: String(media!.id),
          animeTitle: media!.title.english ?? media!.title.romaji ?? undefined,
        }),
      )
      if (query.query) {
        const q = query.query.toLowerCase()
        list = list.filter((c) => c.name.toLowerCase().includes(q))
      }
    } else {
      const data = await this.gql<{ Page: { characters: AlCharacter[] } }>(Q.CHARACTERS, { search: query.query || undefined, perPage: 36 })
      list = data.Page.characters.map((c) => mapCharacter(c))
    }
    return query.role ? list.filter((c) => c.role === query.role) : list
  }

  async getCharacter(id: string) {
    if (!isNumericId(id)) return null
    const data = await this.gql<{ Character: AlCharacter | null }>(Q.CHARACTER, { id: Number(id) })
    return data.Character ? mapCharacter(data.Character) : null
  }

  async getStudios(): Promise<Studio[]> {
    const data = await this.gql<{ Page: { studios: AlStudio[] } }>(Q.STUDIOS, { perPage: 24 })
    return data.Page.studios.filter((s) => s.isAnimationStudio).map(mapStudio)
  }

  async getStudio(id: string) {
    if (!isNumericId(id)) return null
    const data = await this.gql<{ Studio: (AlStudio & { media: { pageInfo: AlPageInfo } }) | null }>(Q.STUDIO, { id: Number(id), page: 1, perPage: 1 })
    return data.Studio ? mapStudio(data.Studio) : null
  }
}
