/**
 * Central runtime configuration.
 * Every value has a safe default so the template runs without any `.env` file.
 */
const env = import.meta.env

export const config = {
  appName: 'ANIVIA',
  tagline: 'Discover. Watch. Remember.',
  shortTagline: 'Your anime universe.',
  siteUrl: (env.VITE_SITE_URL as string | undefined) ?? 'https://anivia.example.com',
  apiBaseUrl: (env.VITE_API_BASE_URL as string | undefined) ?? '',
  /** Catalog data source: AniList (+ Jikan episode titles), Jikan only, your own REST API, or local demo data. */
  animeProvider: ((env.VITE_ANIME_PROVIDER as string | undefined) || 'anilist') as 'anilist' | 'jikan' | 'api' | 'mock',
  anilistUrl: (env.VITE_ANILIST_URL as string | undefined) || 'https://graphql.anilist.co',
  jikanUrl: (env.VITE_JIKAN_URL as string | undefined) || 'https://api.jikan.moe/v4',
  videoProvider: ((env.VITE_VIDEO_PROVIDER as string | undefined) ?? 'mock') as 'mock' | 'api',
  mockLatency: Number(env.VITE_MOCK_LATENCY ?? 350),
  storagePrefix: 'anivia:',
} as const

export type AppConfig = typeof config
