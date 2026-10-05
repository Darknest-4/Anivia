import { config } from '@/config'
import type { VideoSource } from '@/types'
import type { VideoProvider } from './VideoProvider'

/**
 * Reference implementation for your own licensed media backend.
 * Expected response from `GET {API}/anime/:animeId/episodes/:episodeId/source`:
 *   { kind: "mp4" | "hls", url: string, duration: number, qualities: string[], subtitles: SubtitleTrack[] }
 * Return 404 when the episode is not available. HLS playback requires a library such as hls.js on
 * browsers without native HLS support (see README → VideoProvider integration).
 */
export class ApiVideoProvider implements VideoProvider {
  constructor(private readonly baseUrl = config.apiBaseUrl) {}

  async getSource(animeId: string, episodeId: string): Promise<VideoSource | null> {
    const base = this.baseUrl.replace(/\/$/, '')
    const res = await fetch(`${base}/anime/${encodeURIComponent(animeId)}/episodes/${encodeURIComponent(episodeId)}/source`, {
      headers: { Accept: 'application/json' },
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Video source request failed: ${res.status}`)
    return (await res.json()) as VideoSource
  }
}
