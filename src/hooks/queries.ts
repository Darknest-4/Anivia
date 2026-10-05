import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { preloadRoute } from '@/routes/preload'
import { preferencesStore } from '@/services/user/stores'
import { animeProvider, providerName } from '@/services/anime'
import { videoProvider } from '@/services/video'
import type { BrowseQuery, CharacterQuery, SeasonName } from '@/types'

/**
 * Data hooks — the ONLY way pages access catalog data.
 * Each hook delegates to the active AnimeProvider / VideoProvider.
 */
export const queryKeys = {
  featured: ['anime', 'featured'] as const,
  trending: ['anime', 'trending'] as const,
  popular: ['anime', 'popular'] as const,
  recent: ['anime', 'recent'] as const,
  topRated: ['anime', 'top-rated'] as const,
  upcoming: ['anime', 'upcoming'] as const,
  latestEpisodes: (limit: number) => ['episodes', 'latest', limit] as const,
  currentSeason: ['season', 'current'] as const,
  season: (season: SeasonName, year: number) => ['season', season, year] as const,
  anime: (id: string) => ['anime', id] as const,
  animeByIds: (ids: string[]) => ['anime', 'ids', ...ids] as const,
  related: (id: string) => ['anime', id, 'related'] as const,
  recommendations: (ids: string[]) => ['recommendations', ...ids] as const,
  browse: (q: BrowseQuery) => ['browse', q] as const,
  search: (q: string) => ['search', q] as const,
  suggestions: (q: string) => ['suggestions', q] as const,
  genres: ['genres'] as const,
  genre: (slug: string) => ['genre', slug] as const,
  schedule: ['schedule'] as const,
  episodes: (animeId: string) => ['episodes', animeId] as const,
  characters: (q: CharacterQuery) => ['characters', q] as const,
  character: (id: string) => ['character', id] as const,
  studios: ['studios'] as const,
  studio: (id: string) => ['studio', id] as const,
  videoSource: (animeId: string, episodeId: string) => ['video', animeId, episodeId] as const,
}

/** Static info about the active data source. */
export const useProviderInfo = () => ({ name: providerName, isMock: false, features: animeProvider.features ?? {} })

/**
 * Returns a handler that warms the cache for a title (details + route chunk) — attach it to
 * hover/focus so the details page opens instantly. Disabled by data saver or the setting.
 */
export function usePrefetchAnime() {
  const client = useQueryClient()
  return useCallback(
    (id: string) => {
      const p = preferencesStore.get()
      if (!p.prefetchOnHover || p.dataSaver) return
      void preloadRoute.details()
      void client.prefetchQuery({ queryKey: queryKeys.anime(id), queryFn: () => animeProvider.getAnime(id), staleTime: 5 * 60_000 })
    },
    [client],
  )
}

export const useFeatured = () => useQuery({ queryKey: queryKeys.featured, queryFn: () => animeProvider.getFeatured() })
export const useTrending = () => useQuery({ queryKey: queryKeys.trending, queryFn: () => animeProvider.getTrending() })
export const usePopular = () => useQuery({ queryKey: queryKeys.popular, queryFn: () => animeProvider.getPopular() })
export const useRecent = () => useQuery({ queryKey: queryKeys.recent, queryFn: () => animeProvider.getRecent() })
export const useTopRated = () => useQuery({ queryKey: queryKeys.topRated, queryFn: () => animeProvider.getTopRated() })
export const useUpcoming = () => useQuery({ queryKey: queryKeys.upcoming, queryFn: () => animeProvider.getUpcoming() })
export const useLatestEpisodes = (limit = 12) =>
  useQuery({ queryKey: queryKeys.latestEpisodes(limit), queryFn: () => animeProvider.getLatestEpisodes(limit) })

export const useCurrentSeason = () =>
  useQuery({ queryKey: queryKeys.currentSeason, queryFn: () => animeProvider.getCurrentSeason(), staleTime: Infinity })

export const useSeason = (season: SeasonName | undefined, year: number | undefined) =>
  useQuery({
    queryKey: queryKeys.season(season ?? 'winter', year ?? 0),
    queryFn: () => animeProvider.getSeason(season!, year!),
    enabled: Boolean(season && year),
  })

export const useAnime = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.anime(id ?? ''), queryFn: () => animeProvider.getAnime(id!), enabled: Boolean(id) })

export const useAnimeByIds = (ids: string[]) =>
  useQuery({
    queryKey: queryKeys.animeByIds(ids),
    queryFn: () => animeProvider.getAnimeByIds(ids),
    placeholderData: keepPreviousData,
  })

export const useRelated = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.related(id ?? ''), queryFn: () => animeProvider.getRelated(id!), enabled: Boolean(id) })

export const useRecommendations = (seedIds: string[]) =>
  useQuery({ queryKey: queryKeys.recommendations(seedIds), queryFn: () => animeProvider.getRecommendations(seedIds) })

export const useBrowse = (query: BrowseQuery) =>
  useQuery({ queryKey: queryKeys.browse(query), queryFn: () => animeProvider.browse(query), placeholderData: keepPreviousData })

export const useSearch = (query: string) =>
  useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => animeProvider.search(query),
    enabled: query.trim().length > 0,
    retry: false,
  })

export const useSuggestions = (query: string) =>
  useQuery({
    queryKey: queryKeys.suggestions(query),
    queryFn: () => animeProvider.getSuggestions(query),
    enabled: query.trim().length > 0,
    placeholderData: keepPreviousData,
  })

export const useGenres = () => useQuery({ queryKey: queryKeys.genres, queryFn: () => animeProvider.getGenres() })
export const useGenre = (slug: string | undefined) =>
  useQuery({ queryKey: queryKeys.genre(slug ?? ''), queryFn: () => animeProvider.getGenre(slug!), enabled: Boolean(slug) })

export const useSchedule = () => useQuery({ queryKey: queryKeys.schedule, queryFn: () => animeProvider.getSchedule() })

export const useEpisodes = (animeId: string | undefined) =>
  useQuery({ queryKey: queryKeys.episodes(animeId ?? ''), queryFn: () => animeProvider.getEpisodes(animeId!), enabled: Boolean(animeId) })

export const useCharacters = (query: CharacterQuery = {}) =>
  useQuery({ queryKey: queryKeys.characters(query), queryFn: () => animeProvider.getCharacters(query), placeholderData: keepPreviousData })

export const useCharacter = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.character(id ?? ''), queryFn: () => animeProvider.getCharacter(id!), enabled: Boolean(id) })

export const useStudios = () => useQuery({ queryKey: queryKeys.studios, queryFn: () => animeProvider.getStudios() })
export const useStudio = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.studio(id ?? ''), queryFn: () => animeProvider.getStudio(id!), enabled: Boolean(id) })

export const useVideoSource = (animeId: string | undefined, episodeId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.videoSource(animeId ?? '', episodeId ?? ''),
    queryFn: () => videoProvider.getSource(animeId!, episodeId!),
    enabled: Boolean(animeId && episodeId),
    retry: false,
  })
