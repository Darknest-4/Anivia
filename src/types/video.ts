export type VideoSourceKind = 'mp4' | 'hls' | 'dash'

export interface SubtitleTrack {
  id: string
  label: string
  language: string
  url?: string
}

export interface VideoSource {
  kind: VideoSourceKind
  /** Media URL. */
  url?: string
  /** Duration in seconds, when known ahead of time. */
  duration: number
  qualities: string[]
  subtitles: SubtitleTrack[]
  poster?: string
  /** Optional subtitle cues rendered by the player. */
  cues?: { start: number; end: number; text: string }[]
}
