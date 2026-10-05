import { config } from '@/config'
import type { AnimeProvider } from './AnimeProvider'
import { AniListAnimeProvider } from './anilist/AniListAnimeProvider'
import { ApiAnimeProvider } from './apiAnimeProvider'
import { JikanAnimeProvider } from './jikan/JikanAnimeProvider'
import { MockAnimeProvider } from './mockAnimeProvider'

export * from './AnimeProvider'

/**
 * The active AnimeProvider, selected with VITE_ANIME_PROVIDER:
 * - `anilist` (default) — AniList GraphQL, episode titles enriched from Jikan. No API key.
 * - `jikan`   — Jikan v4 (MyAnimeList). No API key.
 * - `api`     — your own REST backend (requires VITE_API_BASE_URL).
 * - `mock`    — fictional offline demo catalog.
 */
function createAnimeProvider(): AnimeProvider {
  switch (config.animeProvider) {
    case 'jikan':
      return new JikanAnimeProvider()
    case 'api':
      return config.apiBaseUrl ? new ApiAnimeProvider(config.apiBaseUrl) : new MockAnimeProvider()
    case 'mock':
      return new MockAnimeProvider()
    case 'anilist':
    default:
      return new AniListAnimeProvider()
  }
}

export const animeProvider: AnimeProvider = createAnimeProvider()
export const isMockProvider = animeProvider instanceof MockAnimeProvider
export const providerName = animeProvider.name ?? 'Custom API'
