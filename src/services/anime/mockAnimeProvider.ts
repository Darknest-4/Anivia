import { config } from '@/config'
import { filterAnime, paginate, sortAnime } from '@/lib/filters'
import { matchCharacters, matchGenres, matchStudios, scoreText, searchAnime } from '@/lib/search'
import { makeSeason, seasonFromDate } from '@/lib/seasons'
import type { Anime, BrowseQuery, CharacterQuery, EpisodeRelease } from '@/types'
import { ProviderError, type AnimeProvider } from './AnimeProvider'
import {
  CATALOG_DATE,
  animeById,
  animeList,
  buildSchedule,
  characters,
  genres,
  getEpisodesFor,
  studios,
} from './mock/catalog'

/** Simulated network latency so skeleton states are visible in the demo. */
function delay<T>(value: T, factor = 1): Promise<T> {
  const ms = Math.max(0, config.mockLatency * factor * (0.75 + Math.random() * 0.5))
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

const byPopularity = (list: Anime[]) => sortAnime(list, 'popularity')

/**
 * Default provider backed by fictional, locally generated demo data.
 * Tip: search for "!error" to preview the UI's error state.
 */
export class MockAnimeProvider implements AnimeProvider {
  readonly name = 'Demo catalog'
  readonly features = { languageFilter: true }

  getFeatured() {
    return delay(byPopularity(animeList.filter((a) => a.featured)))
  }

  getTrending() {
    const score = (a: Anime) =>
      a.popularity * (a.status === 'airing' ? 1.6 : a.status === 'upcoming' ? 0.7 : 1) * (a.year && a.year >= 2025 ? 1.2 : 0.8)
    return delay([...animeList].sort((a, b) => score(b) - score(a)).slice(0, 18))
  }

  getPopular() {
    return delay(byPopularity(animeList.filter((a) => a.status !== 'upcoming')).slice(0, 18))
  }

  getRecent() {
    return delay(sortAnime(animeList.filter((a) => a.status !== 'upcoming'), 'updated').slice(0, 18))
  }

  getTopRated() {
    return delay(sortAnime(animeList.filter((a) => a.rating), 'rating').slice(0, 18))
  }

  getUpcoming() {
    return delay(sortAnime(animeList.filter((a) => a.status === 'upcoming'), 'oldest'))
  }

  getLatestEpisodes(limit = 12) {
    const releases: EpisodeRelease[] = animeList
      .filter((a) => a.status === 'airing')
      .map((anime) => {
        const eps = getEpisodesFor(anime)
        const episode = eps[(anime.episodesAired ?? 1) - 1] ?? eps[0]
        return { anime, episode }
      })
      .filter((r) => r.episode)
      .sort((a, b) => b.episode.airDate.localeCompare(a.episode.airDate) || b.anime.popularity - a.anime.popularity)
    return delay(releases.slice(0, limit))
  }

  getCurrentSeason() {
    return delay(makeSeason(seasonFromDate(CATALOG_DATE), CATALOG_DATE.getFullYear()), 0.2)
  }

  getSeason(season: Anime['season'], year: number) {
    return delay(byPopularity(animeList.filter((a) => a.season === season && a.year === year)))
  }

  getAnime(id: string) {
    return delay(animeById.get(id) ?? null)
  }

  getAnimeByIds(ids: string[]) {
    return delay(ids.map((id) => animeById.get(id)).filter((a): a is Anime => Boolean(a)), 0.5)
  }

  getRelated(id: string) {
    const anime = animeById.get(id)
    const related = (anime?.relatedIds ?? []).map((r) => animeById.get(r)).filter((a): a is Anime => Boolean(a))
    return delay(related)
  }

  getRecommendations(seedIds: string[], limit = 12) {
    const seeds = seedIds.map((id) => animeById.get(id)).filter((a): a is Anime => Boolean(a))
    const weights = new Map<string, number>()
    for (const s of seeds) for (const g of s.genres) weights.set(g.slug, (weights.get(g.slug) ?? 0) + 1)
    const pool = animeList.filter((a) => !seedIds.includes(a.id) && a.status !== 'upcoming')
    const scored = pool
      .map((a) => ({
        a,
        score: a.genres.reduce((sum, g) => sum + (weights.get(g.slug) ?? 0), 0) * 2 + (a.rating ?? 7) + Math.log10(a.popularity),
      }))
      .sort((x, y) => y.score - x.score)
      .map((x) => x.a)
    return delay(scored.slice(0, limit))
  }

  browse(query: BrowseQuery) {
    const { sort = 'popularity', page = 1, perPage = 24, ...filters } = query
    return delay(paginate(sortAnime(filterAnime(animeList, filters), sort), page, perPage))
  }

  search(query: string) {
    if (query.trim().toLowerCase() === '!error') {
      return new Promise<Anime[]>((_, reject) =>
        setTimeout(() => reject(new ProviderError('Simulated network error', 503)), config.mockLatency),
      )
    }
    return delay(searchAnime(animeList, query, { characters }), 0.8)
  }

  getSuggestions(query: string) {
    const q = query.trim()
    if (!q) return delay({ anime: [], genres: [], characters: [], studios: [] }, 0.2)
    return delay(
      {
        anime: searchAnime(animeList, q, { characters }).slice(0, 5),
        genres: matchGenres(genres, q).slice(0, 3),
        characters: matchCharacters(characters, q).slice(0, 3),
        studios: matchStudios(studios, q).slice(0, 3),
      },
      0.35,
    )
  }

  getGenres() {
    return delay([...genres].sort((a, b) => (b.animeCount ?? 0) - (a.animeCount ?? 0)))
  }

  getGenre(slug: string) {
    return delay(genres.find((g) => g.slug === slug) ?? null, 0.3)
  }

  getSchedule() {
    return delay(buildSchedule())
  }

  getEpisodes(animeId: string) {
    const anime = animeById.get(animeId)
    return delay(anime ? getEpisodesFor(anime) : [])
  }

  getEpisode(animeId: string, episodeId: string) {
    const anime = animeById.get(animeId)
    return delay(anime ? getEpisodesFor(anime).find((e) => e.id === episodeId) ?? null : null, 0.4)
  }

  getCharacters(query: CharacterQuery = {}) {
    let list = [...characters]
    if (query.animeId) list = list.filter((c) => c.animeId === query.animeId)
    if (query.role) list = list.filter((c) => c.role === query.role)
    if (query.query) {
      const q = query.query
      list = list.filter((c) => {
        const anime = animeById.get(c.animeId)
        return scoreText(c.name, q) > 0 || scoreText(c.nativeName, q) > 0 || scoreText(anime?.title, q) > 0 || scoreText(c.voiceActor, q) > 0
      })
    }
    return delay(list.sort((a, b) => b.favorites - a.favorites))
  }

  getCharacter(id: string) {
    return delay(characters.find((c) => c.id === id) ?? null)
  }

  getStudios() {
    return delay([...studios].sort((a, b) => (b.animeCount ?? 0) - (a.animeCount ?? 0)))
  }

  getStudio(id: string) {
    return delay(studios.find((s) => s.id === id) ?? null)
  }
}
