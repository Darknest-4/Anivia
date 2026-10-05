import { config } from '@/config'
import { demoSubtitleCues } from '@/data/episodes'
import type { VideoSource } from '@/types'
import { animeProvider, isMockProvider } from '@/services/anime'
import type { VideoProvider } from './VideoProvider'

/**
 * Demo provider. It never returns a real media URL — instead it returns a `demo`
 * source that ANIVIA's player renders as a simulated, fully interactive playback
 * over generated artwork. Locked / unreleased episodes return `null`.
 */
export class MockVideoProvider implements VideoProvider {
  async getSource(animeId: string, episodeId: string): Promise<VideoSource | null> {
    // Simulated playback is only for the fictional demo catalog; real titles fall back to trailers + licensed links.
    if (!isMockProvider) return null
    const episode = await animeProvider.getEpisode(animeId, episodeId)
    await new Promise((r) => setTimeout(r, config.mockLatency))
    if (!episode || episode.locked) return null

    const duration = episode.duration
    const cues: VideoSource['cues'] = []
    let t = 6
    let i = 0
    while (t < duration - 10) {
      cues.push({ start: t, end: t + 3.6, text: demoSubtitleCues[i % demoSubtitleCues.length] })
      t += i % demoSubtitleCues.length === demoSubtitleCues.length - 1 ? 52 : 5
      i++
    }

    return {
      kind: 'demo',
      duration,
      qualities: ['1080p', '720p', '480p', '360p'],
      subtitles: [
        { id: 'en', label: 'English', language: 'en' },
        { id: 'es', label: 'Español', language: 'es' },
        { id: 'pt', label: 'Português', language: 'pt' },
        { id: 'fr', label: 'Français', language: 'fr' },
      ],
      poster: episode.thumbnail,
      cues,
    }
  }
}
