import { useCallback, useEffect, useState, type RefObject } from 'react'
import type { VideoSource } from '@/types'

export interface PlaybackState {
  currentTime: number
  duration: number
  buffered: number
  paused: boolean
  waiting: boolean
  ended: boolean
  error: string | null
}

export interface PlaybackControls {
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (time: number) => void
  setRate: (rate: number) => void
  setVolume: (volume: number, muted: boolean) => void
}

const initial: PlaybackState = { currentTime: 0, duration: 0, buffered: 0, paused: true, waiting: false, ended: false, error: null }

/** Playback state and controls for a native <video> element supplied via `videoRef`. */
export function usePlayback(source: VideoSource | null | undefined, videoRef: RefObject<HTMLVideoElement>, startAt = 0): [PlaybackState, PlaybackControls] {
  const [state, setState] = useState<PlaybackState>(initial)

  // Reset on source change.
  useEffect(() => {
    setState({ ...initial, duration: source?.duration ?? 0, currentTime: startAt })
    // startAt is only read when a new source arrives.
  }, [source])

  useEffect(() => {
    const v = videoRef.current
    if (!source || !v) return
    const sync = () =>
      setState((prev) => ({
        ...prev,
        currentTime: v.currentTime,
        duration: Number.isFinite(v.duration) ? v.duration : source.duration,
        buffered: v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0,
        paused: v.paused,
        ended: v.ended,
      }))
    const onWaiting = () => setState((p) => ({ ...p, waiting: true }))
    const onPlaying = () => setState((p) => ({ ...p, waiting: false }))
    const onError = () => setState((p) => ({ ...p, error: 'This video could not be played.' }))
    const events = ['timeupdate', 'progress', 'play', 'pause', 'ended', 'loadedmetadata', 'durationchange'] as const
    events.forEach((e) => v.addEventListener(e, sync))
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('playing', onPlaying)
    v.addEventListener('error', onError)
    if (startAt) v.currentTime = startAt
    return () => {
      events.forEach((e) => v.removeEventListener(e, sync))
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('playing', onPlaying)
      v.removeEventListener('error', onError)
    }
  }, [source, videoRef])

  const play = useCallback(() => {
    videoRef.current?.play().catch(() => setState((p) => ({ ...p, paused: true })))
  }, [videoRef])

  const pause = useCallback(() => videoRef.current?.pause(), [videoRef])

  const seek = useCallback(
    (time: number) => {
      const v = videoRef.current
      if (!v) return
      const duration = Number.isFinite(v.duration) ? v.duration : source?.duration ?? 0
      v.currentTime = Math.max(0, Math.min(duration || time, time))
    },
    [source, videoRef],
  )

  const setRate = useCallback(
    (rate: number) => {
      if (videoRef.current) videoRef.current.playbackRate = rate
    },
    [videoRef],
  )

  const setVolume = useCallback(
    (volume: number, muted: boolean) => {
      if (videoRef.current) {
        videoRef.current.volume = volume
        videoRef.current.muted = muted
      }
    },
    [videoRef],
  )

  const toggle = useCallback(() => (state.paused ? play() : pause()), [state.paused, play, pause])

  return [state, { play, pause, toggle, seek, setRate, setVolume }]
}
