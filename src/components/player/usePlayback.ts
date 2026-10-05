import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
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

/**
 * Unified playback engine.
 * - `demo` sources are simulated with a clock (no media file involved).
 * - `mp4` / `hls` / `dash` sources drive a real <video> element supplied via `videoRef`.
 */
export function usePlayback(source: VideoSource | null | undefined, videoRef: RefObject<HTMLVideoElement>, startAt = 0): [PlaybackState, PlaybackControls] {
  const [state, setState] = useState<PlaybackState>(initial)
  const simulated = source?.kind === 'demo'
  const sim = useRef({ time: 0, rate: 1, playing: false, bufferedTo: 0, waitingUntil: 0, last: 0 })

  // Reset on source change.
  useEffect(() => {
    const duration = source?.duration ?? 0
    const start = Math.min(startAt, Math.max(0, duration - 5))
    sim.current = { time: start, rate: sim.current.rate, playing: false, bufferedTo: start + 20, waitingUntil: 0, last: 0 }
    setState({ ...initial, duration, currentTime: start, buffered: Math.min(duration, start + 20) })
    // startAt is only read when a new source arrives.
  }, [source])

  /* ---------------- Simulated clock ---------------- */
  useEffect(() => {
    if (!simulated || !source) return
    let raf = 0
    let lastEmit = 0
    const tick = (now: number) => {
      const s = sim.current
      const dt = s.last ? (now - s.last) / 1000 : 0
      s.last = now
      const waiting = s.waitingUntil > now
      if (s.playing && !waiting) s.time = Math.min(source.duration, s.time + dt * s.rate)
      // Buffer grows ahead of the playhead like a real stream.
      s.bufferedTo = Math.min(source.duration, Math.max(s.bufferedTo, s.time) + dt * 12)
      const ended = s.time >= source.duration
      if (ended) s.playing = false
      if (now - lastEmit > 100 || ended) {
        lastEmit = now
        setState((prev) => ({
          ...prev,
          currentTime: s.time,
          buffered: Math.min(source.duration, Math.max(s.bufferedTo, s.time + 4)),
          paused: !s.playing,
          waiting: waiting && s.playing,
          ended,
        }))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [simulated, source])

  /* ---------------- Native <video> ---------------- */
  useEffect(() => {
    const v = videoRef.current
    if (simulated || !source || !v) return
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
  }, [simulated, source, videoRef])

  const play = useCallback(() => {
    if (simulated) {
      const s = sim.current
      if (source && s.time >= source.duration) s.time = 0
      s.playing = true
      s.last = 0
      setState((p) => ({ ...p, paused: false, ended: false }))
    } else videoRef.current?.play().catch(() => setState((p) => ({ ...p, paused: true })))
  }, [simulated, source, videoRef])

  const pause = useCallback(() => {
    if (simulated) {
      sim.current.playing = false
      setState((p) => ({ ...p, paused: true }))
    } else videoRef.current?.pause()
  }, [simulated, videoRef])

  const seek = useCallback(
    (time: number) => {
      const duration = source?.duration ?? 0
      const t = Math.max(0, Math.min(duration, time))
      if (simulated) {
        const s = sim.current
        // Seeking past the buffered range triggers a short simulated buffering state.
        if (t > s.bufferedTo || t < s.time - 120) {
          s.waitingUntil = performance.now() + 900
          s.bufferedTo = t + 2
        }
        s.time = t
        setState((p) => ({ ...p, currentTime: t, ended: false }))
      } else if (videoRef.current) videoRef.current.currentTime = t
    },
    [simulated, source, videoRef],
  )

  const setRate = useCallback(
    (rate: number) => {
      sim.current.rate = rate
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
