import { config } from '@/config'
import { getSupabase } from '@/providers/AuthProvider'
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

interface StoredAniZip {
  mal_id: number | null
  episode_count: number | null
  images: { coverType: string; url: string }[]
  episodes: { key: string; titles: Record<string, string>; overview: string | null; summary: string | null; air_date: string | null; air_date_utc: string | null; image: string | null; runtime: number | null; length: number | null }[]
}

/** Imported copy in the ANIVIA database (background AniZip sync, migration 0008). Null when not imported (yet). */
async function fromDatabase(anilistId: string | number): Promise<AniZipInfo | null> {
  if (!config.supabaseUrl || !config.supabaseKey || !/^\d+$/.test(String(anilistId))) return null
  try {
    const client = await getSupabase()
    const { data, error } = await client.rpc('anizip_for_anilist', { p_anilist_id: Number(anilistId) })
    if (error || !data) return null
    const row = data as StoredAniZip
    const episodes = new Map<number, EpisodeHint>()
    for (const e of row.episodes ?? []) {
      if (!/^\d+$/.test(e.key)) continue
      const t = e.titles ?? {}
      episodes.set(Number(e.key), {
        title: t.en || t['x-jat'] || t.ja || undefined,
        synopsis: clean(e.overview || e.summary) || undefined,
        airDate: e.air_date_utc || e.air_date || undefined,
        thumbnail: e.image || undefined,
        duration: (e.runtime || e.length || 0) * 60 || undefined,
      })
    }
    return toInfo(episodes, row.episode_count ?? undefined, row.images ?? [], row.mal_id ?? undefined)
  } catch {
    return null
  }
}

function toInfo(episodes: Map<number, EpisodeHint>, episodeCount: number | undefined, images: { coverType: string; url: string }[], malId: unknown): AniZipInfo {
  const img = (type: string) => images.find((i) => i.coverType.toLowerCase() === type)?.url
  return { episodes, episodeCount, fanart: img('fanart'), banner: img('banner'), logo: img('clearlogo'), malId: typeof malId === 'number' ? malId : undefined }
}

/** Episode titles, synopses and artwork: from the ANIVIA database when imported, otherwise live from ani.zip. */
export async function fetchAniZip(id: { anilist?: string | number; mal?: string | number }): Promise<AniZipInfo | null> {
  if (id.anilist) {
    const stored = await fromDatabase(id.anilist)
    if (stored) return stored
  }
  return fetchAniZipLive(id)
}

async function fetchAniZipLive(id: { anilist?: string | number; mal?: string | number }): Promise<AniZipInfo | null> {
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
  return toInfo(episodes, data.episodeCount, data.images ?? [], data.mappings?.mal_id)
}

/** Resolves within `ms` or gives up quietly (ani.zip is enrichment, never a blocker). */
export function withinMs<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), ms))])
}
