import {
  ListVideo,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  SkipBack,
  SkipForward,
  Subtitles,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { formatClock } from '@/lib/format'
import type { VideoSource } from '@/types'
import { BufferingIndicator, ErrorOverlay, FinishedOverlay, LoadingOverlay, NoSourceOverlay } from './PlayerOverlays'
import { PlayerSettingsMenu } from './PlayerSettingsMenu'
import { SeekBar } from './SeekBar'
import { usePlayback } from './usePlayback'

type PlayerOverlayState = 'loading' | 'buffering' | 'error' | 'no-source' | 'finished' | null

export interface NextEpisodeInfo {
  title: string
  number: number
  thumbnail: string
  href: string
}

interface VideoPlayerProps {
  source: VideoSource | null | undefined
  loading?: boolean
  error?: boolean
  locked?: boolean
  onRetry: () => void
  poster?: string
  title: string
  subtitle?: string
  startAt?: number
  hasPrev?: boolean
  hasNext?: boolean
  onPrev?: () => void
  onNext?: () => void
  next?: NextEpisodeInfo
  autoNext: boolean
  onAutoNextChange: (v: boolean) => void
  autoplay?: boolean
  subtitlesDefault?: boolean
  /** Show a "Skip intro" button during the opening (first 90s). */
  skipIntro?: boolean
  defaultQuality?: string
  onProgress?: (time: number, duration: number) => void
  onOpenEpisodes?: () => void
  className?: string
}

const IconBtn = ({ label, onClick, children, className, pressed }: { label: string; onClick: () => void; children: ReactNode; className?: string; pressed?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={pressed}
    title={label}
    className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/10 hover:text-white xs:h-11 xs:w-11 sm:h-10 sm:w-10', className)}
  >
    {children}
  </button>
)

/**
 * ANIVIA cinematic player for sources from your own VideoProvider (VITE_VIDEO_PROVIDER=api),
 * played through a native <video> element.
 */
export function VideoPlayer(props: VideoPlayerProps) {
  const { source, loading, error, locked, onRetry, poster, title, subtitle, startAt = 0, next } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, controls] = usePlayback(source, videoRef, startAt)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [quality, setQuality] = useState(props.defaultQuality ?? 'auto')
  const [subtitleTrack, setSubtitleTrack] = useState<string | null>(props.subtitlesDefault === false ? null : 'en')
  const [rate, setRate] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [seekFlash, setSeekFlash] = useState<{ dir: 1 | -1; key: number } | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const hideTimer = useRef<number>()
  const lastTap = useRef(0)

  const isFs = fullscreen || pseudoFullscreen
  const effective: PlayerOverlayState = loading ? 'loading' : error || state.error ? 'error' : source === null ? 'no-source' : state.ended ? 'finished' : state.waiting ? 'buffering' : null
  const ready = Boolean(source)

  /* Autoplay when a new source arrives */
  useEffect(() => {
    if (source && props.autoplay) controls.play()
  }, [source])

  /* Persist progress */
  const progressRef = useRef(props.onProgress)
  progressRef.current = props.onProgress
  useEffect(() => {
    if (!source || state.paused) return
    const id = window.setInterval(() => progressRef.current?.(state.currentTime, state.duration), 5000)
    return () => window.clearInterval(id)
  }, [source, state.paused, state.currentTime, state.duration])
  useEffect(() => {
    if (state.paused && state.currentTime > 1) progressRef.current?.(state.currentTime, state.duration)
  }, [state.paused, state.currentTime, state.duration])

  /* Auto-next countdown */
  useEffect(() => {
    if (state.ended && props.autoNext && next) setCountdown(8)
    else setCountdown(null)
  }, [state.ended, props.autoNext, next])
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      props.onNext?.()
      setCountdown(null)
      return
    }
    const id = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [countdown])

  /* Volume + rate */
  useEffect(() => controls.setVolume(volume, muted), [volume, muted, controls])
  useEffect(() => controls.setRate(rate), [rate, controls])

  /* Auto-hide controls while playing */
  const poke = useCallback(() => {
    setControlsVisible(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2800)
  }, [])
  useEffect(() => {
    if (state.paused || settingsOpen) {
      window.clearTimeout(hideTimer.current)
      setControlsVisible(true)
    } else poke()
  }, [state.paused, settingsOpen, poke])

  /* Fullscreen */
  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined)
      return
    }
    if (pseudoFullscreen) {
      setPseudoFullscreen(false)
      return
    }
    if (el.requestFullscreen) {
      try {
        await el.requestFullscreen()
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
        await orientation.lock?.('landscape').catch(() => undefined)
        return
      } catch {
        /* fall through to CSS fullscreen (e.g. iOS Safari) */
      }
    }
    setPseudoFullscreen(true)
  }, [pseudoFullscreen])
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const seekBy = useCallback(
    (delta: number) => {
      controls.seek(state.currentTime + delta)
      setSeekFlash({ dir: delta > 0 ? 1 : -1, key: Date.now() })
      poke()
    },
    [controls, state.currentTime, poke],
  )

  /* Keyboard shortcuts */
  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) || e.metaKey || e.ctrlKey || e.altKey) return
      if (t?.getAttribute('role') === 'slider') return
      const key = e.key.toLowerCase()
      const actions: Record<string, () => void> = {
        ' ': controls.toggle,
        k: controls.toggle,
        arrowright: () => seekBy(10),
        arrowleft: () => seekBy(-10),
        l: () => seekBy(10),
        j: () => seekBy(-10),
        arrowup: () => setVolume((v) => Math.min(1, v + 0.1)),
        arrowdown: () => setVolume((v) => Math.max(0, v - 0.1)),
        m: () => setMuted((m) => !m),
        f: toggleFullscreen,
        c: () => setSubtitleTrack((s) => (s ? null : 'en')),
        n: () => props.hasNext && props.onNext?.(),
      }
      const fn = actions[key]
      if (!fn) return
      if (t?.tagName === 'BUTTON' && (key === ' ' || key === 'enter')) return
      e.preventDefault()
      fn()
      poke()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, controls, seekBy, toggleFullscreen, poke, props])

  /* Touch: single tap toggles controls, double tap on sides seeks */
  const onSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ready) return
    const isTouch = window.matchMedia('(hover: none)').matches
    const now = Date.now()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    if (isTouch) {
      if (now - lastTap.current < 300 && (x < 0.35 || x > 0.65)) {
        seekBy(x < 0.5 ? -10 : 10)
        lastTap.current = 0
        return
      }
      lastTap.current = now
      if (controlsVisible && !state.paused) setControlsVisible(false)
      else poke()
      return
    }
    controls.toggle()
  }

  const cue =
    subtitleTrack && source?.cues?.find((c) => state.currentTime >= c.start && state.currentTime <= c.end)?.text
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const showChrome = controlsVisible || state.paused || settingsOpen

  return (
    <div
      ref={containerRef}
      className={cn(
        'group/player relative isolate w-full select-none overflow-hidden bg-black text-white',
        pseudoFullscreen ? 'fixed inset-0 z-modal' : 'aspect-video sm:rounded-2xl',
        !showChrome && 'cursor-none',
        props.className,
      )}
      onMouseMove={poke}
      onMouseLeave={() => !state.paused && setControlsVisible(false)}
      aria-label={`Video player: ${title}`}
      role="region"
    >
      {/* Stage */}
      {source ? (
        <video ref={videoRef} src={source.url} poster={source.poster ?? poster} playsInline className="absolute inset-0 h-full w-full bg-black object-contain" crossOrigin="anonymous" />
      ) : (
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover blur-[2px] brightness-50" />}
        </div>
      )}

      {/* Interaction surface */}
      <div className="absolute inset-0" onClick={onSurfaceClick} onDoubleClick={() => window.matchMedia('(hover: hover)').matches && toggleFullscreen()} />

      {/* Double-tap seek flash */}
      {seekFlash && (
        <div key={seekFlash.key} className={cn('pointer-events-none absolute inset-y-0 flex w-1/3 animate-fade-in items-center justify-center', seekFlash.dir < 0 ? 'left-0' : 'right-0')} onAnimationEnd={() => setTimeout(() => setSeekFlash(null), 400)}>
          <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-4 py-2 text-sm font-semibold backdrop-blur">
            {seekFlash.dir < 0 ? <RotateCcw className="h-4 w-4" /> : <RotateCw className="h-4 w-4" />}
            10s
          </span>
        </div>
      )}

      {/* Subtitles */}
      {cue && !effective && (
        <div className={cn('pointer-events-none absolute inset-x-0 flex justify-center px-6 transition-[bottom] duration-base', showChrome ? 'bottom-24 sm:bottom-28' : 'bottom-6 sm:bottom-10')}>
          <p className="rounded-md bg-black/70 px-3 py-1 text-center text-sm font-medium leading-snug text-white sm:text-lg">{cue}</p>
        </div>
      )}

      {/* Center play button */}
      {ready && !effective && state.paused && (
        <button
          type="button"
          onClick={controls.play}
          aria-label="Play"
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white shadow-glow transition-transform hover:scale-105 sm:h-20 sm:w-20"
        >
          <Play className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" />
        </button>
      )}

      {/* State overlays */}
      {effective === 'loading' && <LoadingOverlay />}
      {effective === 'buffering' && <BufferingIndicator />}
      {effective === 'no-source' && <NoSourceOverlay locked={locked} />}
      {effective === 'error' && <ErrorOverlay onRetry={onRetry} message={state.error ?? undefined} />}
      {effective === 'finished' && (
        <FinishedOverlay
          next={next}
          countdown={countdown}
          onCancel={() => setCountdown(null)}
          onReplay={() => {
            controls.seek(0)
            controls.play()
          }}
        />
      )}

      {/* Top bar */}
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-3 transition-opacity duration-base sm:p-5', showChrome || effective ? 'opacity-100' : 'opacity-0')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
            {subtitle && <p className="truncate text-xs text-white/65 sm:text-sm">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      {ready && (
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2 pb-1.5 pt-12 transition-opacity duration-base sm:px-4 sm:pb-3',
            showChrome ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          onMouseEnter={() => window.clearTimeout(hideTimer.current)}
        >
          <div className="px-2">
            <SeekBar currentTime={state.currentTime} duration={state.duration} buffered={state.buffered} onSeek={(t) => controls.seek(t)} markers={state.duration > 600 ? [90, state.duration - 90] : []} />
          </div>
          <div className="mt-0.5 flex items-center gap-0.5 sm:gap-1">
            <IconBtn label={state.paused ? 'Play (k)' : 'Pause (k)'} onClick={controls.toggle}>
              {state.paused ? <Play className="h-5 w-5 fill-current" /> : <Pause className="h-5 w-5 fill-current" />}
            </IconBtn>
            <IconBtn label="Previous episode" onClick={() => props.onPrev?.()} className={cn('hidden sm:inline-flex', !props.hasPrev && 'pointer-events-none opacity-35')}>
              <SkipBack className="h-5 w-5" />
            </IconBtn>
            <IconBtn label="Next episode (n)" onClick={() => props.onNext?.()} className={cn(!props.hasNext && 'pointer-events-none opacity-35')}>
              <SkipForward className="h-5 w-5" />
            </IconBtn>
            <div className="group/vol hidden items-center sm:flex">
              <IconBtn label={muted ? 'Unmute (m)' : 'Mute (m)'} onClick={() => setMuted((m) => !m)}>
                <VolumeIcon className="h-5 w-5" />
              </IconBtn>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value))
                  setMuted(Number(e.target.value) === 0)
                }}
                aria-label="Volume"
                className="range-track h-1 w-0 rounded-full bg-white/30 opacity-0 transition-all duration-base group-focus-within/vol:w-20 group-focus-within/vol:opacity-100 group-hover/vol:w-20 group-hover/vol:opacity-100"
                style={{ background: `linear-gradient(to right, white ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,.3) 0)` }}
              />
            </div>
            <span className="ml-1 whitespace-nowrap text-xs font-medium tabular-nums text-white/85 sm:ml-2 sm:text-[13px]">
              {formatClock(state.currentTime)} <span className="hidden text-white/45 xs:inline">/ {formatClock(state.duration)}</span>
            </span>
            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <IconBtn label="Subtitles (c)" pressed={Boolean(subtitleTrack)} onClick={() => setSubtitleTrack((s) => (s ? null : 'en'))} className="hidden xs:inline-flex">
                <Subtitles className={cn('h-5 w-5', subtitleTrack && 'text-accent-soft')} />
              </IconBtn>
              <div className="relative">
                <IconBtn label="Settings" pressed={settingsOpen} onClick={() => setSettingsOpen((o) => !o)}>
                  <Settings className={cn('h-5 w-5 transition-transform duration-base', settingsOpen && 'rotate-45')} />
                </IconBtn>
                {settingsOpen && (
                  <div className="absolute bottom-full right-0 mb-2">
                    <PlayerSettingsMenu
                      qualities={source?.qualities ?? []}
                      quality={quality}
                      onQuality={setQuality}
                      subtitles={source?.subtitles ?? []}
                      subtitle={subtitleTrack}
                      onSubtitle={setSubtitleTrack}
                      rate={rate}
                      onRate={setRate}
                      autoNext={props.autoNext}
                      onAutoNext={props.onAutoNextChange}
                    />
                  </div>
                )}
              </div>
              {props.onOpenEpisodes && (
                <IconBtn label="Episodes" onClick={props.onOpenEpisodes} className="lg:hidden">
                  <ListVideo className="h-5 w-5" />
                </IconBtn>
              )}
              <IconBtn label={isFs ? 'Exit fullscreen (f)' : 'Fullscreen (f)'} onClick={toggleFullscreen}>
                {isFs ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </IconBtn>
            </div>
          </div>
        </div>
      )}

      {/* Skip intro */}
      {ready && !effective && props.skipIntro && state.currentTime > 3 && state.currentTime < 88 && (
        <button
          type="button"
          onClick={() => controls.seek(90)}
          className={cn('absolute right-3 rounded-lg border border-white/25 bg-black/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-[bottom] duration-base hover:bg-black/80 sm:right-5', showChrome ? 'bottom-24 sm:bottom-28' : 'bottom-6')}
        >
          Skip intro
        </button>
      )}

      {/* Quality badge */}
      {ready && showChrome && !effective && (
        <span className="pointer-events-none absolute right-3 top-12 rounded bg-black/50 px-1.5 py-0.5 text-2xs font-bold text-white/80 sm:right-5 sm:top-16">
          {quality === 'auto' ? `AUTO · ${source?.qualities[0] ?? 'HD'}` : quality}
        </span>
      )}
    </div>
  )
}
