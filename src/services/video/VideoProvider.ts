import type { VideoSource } from '@/types'

/**
 * Resolves a playable source for an episode.
 *
 * Return `null` when no source is available — the player then shows
 * "Connect your video provider to start playback."
 * Implement this against YOUR OWN licensed media backend only.
 */
export interface VideoProvider {
  getSource(animeId: string, episodeId: string): Promise<VideoSource | null>
}
