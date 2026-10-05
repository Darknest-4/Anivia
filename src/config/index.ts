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
  /**
   * Supabase project used for accounts and library sync. Only the project URL and the
   * *publishable* key belong in frontend code — never the database password or a secret key.
   * Set VITE_SUPABASE_URL to an empty string to run without accounts.
   */
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined) ?? 'https://wnmvktajokjhufuzpamy.supabase.co',
  supabaseKey: (env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? 'sb_publishable_fr81aMF8zLh8ambsYTcJwg_SjxpX1DT',
} as const

export type AppConfig = typeof config
