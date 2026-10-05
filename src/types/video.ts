export type VideoSourceKind = 'mp4' | 'hls' | 'dash' | 'demo'

export interface SubtitleTrack {
  id: string
  label: string
  language: string
  url?: string
}

export interface VideoSource {
  kind: VideoSourceKind
  /** Media URL for real providers. Not used by the built-in `demo` kind. */
  url?: string
  /** Duration in seconds, when known ahead of time. */
  duration: number
  qualities: string[]
  subtitles: SubtitleTrack[]
  poster?: string
  /** Optional demo subtitle cues used by the simulated player. */
  cues?: { start: number; end: number; text: string }[]
}
