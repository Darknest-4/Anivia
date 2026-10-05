import { config } from '@/config'
import type { EpisodeHint } from './shared/episodes'
import { createRequestQueue } from './shared/requestQueue'

/**
 * ani.zip (https://api.ani.zip) — free, key-less anime mapping & episode metadata service.
 * Gives real episode titles, synopses, air dates and thumbnails, plus fanart/logo images
 * and cross-site ids (AniList, MyAnimeList, AniDB, TVDB, TMDB…).
 */
interface AniZipEpisode {
  episode?: string
  episodeNumber?: number
  absoluteEpisodeNumber?: number
  title?: Record<string, string | null> | null
  airDate?: string | null
  airDateUtc?: string | null
  airdate?: string | null
  runtime?: number | null
  length?: number | null
  overview?: string | null
  summary?: string | null
  image?: string | null
}

export interface AniZipResponse {
  titles?: Record<string, string | null>
  episodes?: Record<string, AniZipEpisode>
  episodeCount?: number
  images?: { coverType: string; url: string }[]
  mappings?: Record<string, number | string | null>
}

export interface AniZipInfo {
  episodes: Map<number, EpisodeHint>
  episodeCount?: number
  fanart?: string
  banner?: string
  logo?: string
  malId?: number
}

const queue = createRequestQueue({ minInterval: 120, perMinute: 120, retries: 1, cacheTtl: 60 * 60_000, timeout: 6000 })

const clean = (s?: string | null) => (s ?? '').replace(/\s*\(Source:[^)]*\)\s*$/i, '').trim()

export async function fetchAniZip(id: { anilist?: string | number; mal?: string | number }): Promise<AniZipInfo | null> {
  const param = id.anilist ? `anilist_id=${encodeURIComponent(id.anilist)}` : id.mal ? `mal_id=${encodeURIComponent(id.mal)}` : ''
  if (!param) return null
  const data = await queue.request<AniZipResponse | null>(`${config.aniZipUrl}/mappings?${param}`, { headers: { accept: 'application/json' } })
  if (!data) return null

  const episodes = new Map<number, EpisodeHint>()
  for (const [key, e] of Object.entries(data.episodes ?? {})) {
    if (!/^\d+$/.test(key)) continue // skip specials ("S1", "C1"…)
    const n = Number(key)
    const t = e.title ?? {}
    episodes.set(n, {
      title: t.en || t['x-jat'] || t.ja || undefined,
      synopsis: clean(e.overview || e.summary) || undefined,
      airDate: e.airDateUtc || e.airDate || e.airdate || undefined,
      thumbnail: e.image || undefined,
      duration: (e.runtime || e.length || 0) * 60 || undefined,
    })
  }
  const img = (type: string) => data.images?.find((i) => i.coverType.toLowerCase() === type)?.url
  const mal = data.mappings?.mal_id
  return { episodes, episodeCount: data.episodeCount, fanart: img('fanart'), banner: img('banner'), logo: img('clearlogo'), malId: typeof mal === 'number' ? mal : undefined }
}

/** Resolves within `ms` or gives up quietly (ani.zip is enrichment, never a blocker). */
export function withinMs<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), ms))])
}
