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
  animeProvider: ((env.VITE_ANIME_PROVIDER as string | undefined) ?? 'mock') as 'mock' | 'api',
  videoProvider: ((env.VITE_VIDEO_PROVIDER as string | undefined) ?? 'mock') as 'mock' | 'api',
  mockLatency: Number(env.VITE_MOCK_LATENCY ?? 350),
  storagePrefix: 'anivia:',
} as const

export type AppConfig = typeof config
