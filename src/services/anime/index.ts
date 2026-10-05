import { config } from '@/config'
import type { AnimeProvider } from './AnimeProvider'
import { ApiAnimeProvider } from './apiAnimeProvider'
import { MockAnimeProvider } from './mockAnimeProvider'

export * from './AnimeProvider'

/**
 * The active AnimeProvider. Swap implementations here (or via VITE_ANIME_PROVIDER).
 * The app falls back to the mock provider whenever no API base URL is configured.
 */
function createAnimeProvider(): AnimeProvider {
  if (config.animeProvider === 'api' && config.apiBaseUrl) return new ApiAnimeProvider(config.apiBaseUrl)
  return new MockAnimeProvider()
}

export const animeProvider: AnimeProvider = createAnimeProvider()
export const isMockProvider = !(config.animeProvider === 'api' && config.apiBaseUrl)
