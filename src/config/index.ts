/**
 * Central runtime configuration.
 * Every value has a safe default so the template runs without any `.env` file.
 */
const env = import.meta.env

export const config = {
  appName: 'ANIVIA',
  tagline: 'Discover. Watch. Remember.',
  shortTagline: 'Your anime universe.',
  siteUrl: (env.VITE_SITE_URL as string | undefined) ?? 'https://anivia.animehub.hu',
  apiBaseUrl: (env.VITE_API_BASE_URL as string | undefined) ?? '',
  /** Catalog data source: AniList (episode details from ani.zip), Jikan/MyAnimeList, or your own REST API. */
  animeProvider: ((env.VITE_ANIME_PROVIDER as string | undefined) || 'anilist') as 'anilist' | 'jikan' | 'api',
  anilistUrl: (env.VITE_ANILIST_URL as string | undefined) || 'https://graphql.anilist.co',
  /**
   * AniList API client (https://anilist.co/settings/developer). Only the PUBLIC client id is used —
   * the browser flow is the implicit grant, so the client secret must never be added here.
   */
  anilistClientId: (env.VITE_ANILIST_CLIENT_ID as string | undefined) ?? '52829',
  /** Same-origin edge cache (Cloudflare Worker in worker/index.ts). Auto-detected; set to '' to disable. */
  anilistProxy: (env.VITE_ANILIST_PROXY as string | undefined) ?? (env.PROD ? '/api/anilist' : ''),
  /**
   * Supabase Edge Function proxy (supabase/functions/anilist-proxy) — stores every response and
   * title in the database. Preferred when deployed and healthy; set VITE_ANILIST_DB_PROXY='' to disable.
   */
  anilistDbProxy:
    (env.VITE_ANILIST_DB_PROXY as string | undefined) ??
    `${(env.VITE_SUPABASE_URL as string | undefined) ?? 'https://wnmvktajokjhufuzpamy.supabase.co'}/functions/v1/anilist-proxy`,
  /**
   * R2 covers & banners (public at media.animehub.hu). The Worker's `/api/media?ids=` tells which file
   * belongs to which AniList id; images then load straight from the public bucket. '' disables.
   */
  mediaApi: (env.VITE_MEDIA_API as string | undefined) ?? (env.PROD ? '/api/media' : ''),
  jikanUrl: (env.VITE_JIKAN_URL as string | undefined) || 'https://api.jikan.moe/v4',
  aniZipUrl: (env.VITE_ANIZIP_URL as string | undefined) || 'https://api.ani.zip',
  videoProvider: ((env.VITE_VIDEO_PROVIDER as string | undefined) ?? 'none') as 'none' | 'api',
  storagePrefix: 'anivia:',
  /** Show pricing / upgrade UI. Off by default — enable once you connect a payment provider. */
  enablePricing: (env.VITE_ENABLE_PRICING as string | undefined) === 'true',
  /** Public support address shown on the contact page (optional). */
  supportEmail: (env.VITE_SUPPORT_EMAIL as string | undefined) ?? '',
  /** Social links in the footer — empty values are hidden. */
  social: {
    discord: (env.VITE_SOCIAL_DISCORD as string | undefined) ?? '',
    x: (env.VITE_SOCIAL_X as string | undefined) ?? '',
    instagram: (env.VITE_SOCIAL_INSTAGRAM as string | undefined) ?? '',
    website: (env.VITE_SOCIAL_WEBSITE as string | undefined) ?? '',
  },
  /** Cloudflare Web Analytics beacon token (optional, cookie-free). */
  cfAnalyticsToken: (env.VITE_CF_ANALYTICS_TOKEN as string | undefined) ?? '',
  /**
   * Supabase project used for accounts and library sync. Only the project URL and the
   * *publishable* key belong in frontend code — never the database password or a secret key.
   * Set VITE_SUPABASE_URL to an empty string to run without accounts.
   */
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined) ?? 'https://wnmvktajokjhufuzpamy.supabase.co',
  supabaseKey: (env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? 'sb_publishable_fr81aMF8zLh8ambsYTcJwg_SjxpX1DT',
} as const

export type AppConfig = typeof config
