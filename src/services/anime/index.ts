import { config } from '@/config'
import { storage } from '@/services/storage'
import type { AnimeProvider } from './AnimeProvider'
import { AniListAnimeProvider } from './anilist/AniListAnimeProvider'
import { ApiAnimeProvider } from './apiAnimeProvider'
import { JikanAnimeProvider } from './jikan/JikanAnimeProvider'
import { withDisplayPreferences } from './display'

export * from './AnimeProvider'

/**
 * The active AnimeProvider, selected with VITE_ANIME_PROVIDER:
 * - `anilist` (default) — AniList GraphQL, episode titles enriched from Jikan. No API key.
 * - `jikan`   — Jikan v4 (MyAnimeList). No API key.
 * - `api`     — your own REST backend (requires VITE_API_BASE_URL).
 * Visitors can override the source in Settings → Content (stored locally, applied on reload).
 */
export type DataSource = typeof config.animeProvider
export const DATA_SOURCE_KEY = 'data-source'
const override = storage.get<DataSource | null>(DATA_SOURCE_KEY, null)
export const activeDataSource: DataSource = override && ['anilist', 'jikan', 'api'].includes(override) ? override : config.animeProvider

function createAnimeProvider(): AnimeProvider {
  switch (activeDataSource) {
    case 'jikan':
      return new JikanAnimeProvider()
    case 'api':
      return config.apiBaseUrl ? new ApiAnimeProvider(config.apiBaseUrl) : new AniListAnimeProvider()
    case 'anilist':
    default:
      return new AniListAnimeProvider()
  }
}

const baseProvider = createAnimeProvider()
export const animeProvider: AnimeProvider = withDisplayPreferences(baseProvider)
export const providerName = baseProvider.name ?? 'Custom API'
