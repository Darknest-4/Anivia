import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatClock } from '@/lib/format'

interface SeekBarProps {
  currentTime: number
  duration: number
  buffered: number
  onSeek: (time: number) => void
  /** Optional chapter markers (seconds), e.g. opening / ending. */
  markers?: number[]
}

/** Accessible scrubber with buffered range, hover preview time and pointer dragging. */
export function SeekBar({ currentTime, duration, buffered, onSeek, markers = [] }: SeekBarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const pct = (t: number) => (duration ? Math.min(100, (t / duration) * 100) : 0)

  const timeAt = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration
  }

  const onPointerDown = (e: PointerEvent) => {
    ref.current?.setPointerCapture(e.pointerId)
    setDrag(timeAt(e.clientX))
  }
  const onPointerMove = (e: PointerEvent) => {
    const t = timeAt(e.clientX)
    setHover(t)
    if (drag !== null) setDrag(t)
  }
  const onPointerUp = (e: PointerEvent) => {
    if (drag !== null) onSeek(timeAt(e.clientX))
    setDrag(null)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 30 : 5
    if (e.key === 'ArrowRight') onSeek(currentTime + step)
    else if (e.key === 'ArrowLeft') onSeek(currentTime - step)
    else if (e.key === 'Home') onSeek(0)
    else if (e.key === 'End') onSeek(duration)
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  const shown = drag ?? currentTime
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={`${formatClock(shown)} of ${formatClock(duration)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
      className="group/seek relative flex h-5 cursor-pointer touch-none items-center focus-visible:outline-none"
    >
      <div className="relative h-1 w-full overflow-visible rounded-full bg-white/20 transition-[height] duration-fast group-hover/seek:h-1.5 group-focus-visible/seek:h-1.5">
        <div className="absolute inset-y-0 left-0 rounded-full bg-white/35" style={{ width: `${pct(buffered)}%` }} />
        {hover !== null && <div className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: `${pct(hover)}%` }} />}
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${pct(shown)}%` }} />
        {markers.map((m) => (
          <span key={m} className="absolute inset-y-0 w-0.5 bg-black/60" style={{ left: `${pct(m)}%` }} aria-hidden />
        ))}
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white shadow ring-4 ring-accent/40 transition-transform duration-fast group-hover/seek:scale-100 group-focus-visible/seek:scale-100"
          style={{ left: `${pct(shown)}%`, transform: drag !== null ? 'translate(-50%,-50%) scale(1)' : undefined }}
        />
      </div>
      {hover !== null && (
        <span
          className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md bg-black/85 px-2 py-1 text-xs font-semibold tabular-nums text-white"
          style={{ left: `${pct(hover)}%` }}
        >
          {formatClock(hover)}
        </span>
      )}
    </div>
  )
}
