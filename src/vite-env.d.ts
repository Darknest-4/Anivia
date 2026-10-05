/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_ANIME_PROVIDER?: string
  readonly VITE_ANILIST_URL?: string
  readonly VITE_ANILIST_PROXY?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPPORT_EMAIL?: string
  readonly VITE_ENABLE_PRICING?: string
  readonly VITE_SOCIAL_DISCORD?: string
  readonly VITE_SOCIAL_X?: string
  readonly VITE_SOCIAL_INSTAGRAM?: string
  readonly VITE_SOCIAL_WEBSITE?: string
  readonly VITE_CF_ANALYTICS_TOKEN?: string
  readonly VITE_ANILIST_CLIENT_ID?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_JIKAN_URL?: string
  readonly VITE_ANIZIP_URL?: string
  readonly VITE_VIDEO_PROVIDER?: string
  readonly VITE_MOCK_LATENCY?: string
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
