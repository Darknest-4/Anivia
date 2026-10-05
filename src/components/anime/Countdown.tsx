import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

/** Live countdown to the next episode. */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const diff = Math.max(0, new Date(to).getTime() - now)
  const parts = [
    { label: 'days', value: Math.floor(diff / 86_400_000) },
    { label: 'hrs', value: Math.floor((diff / 3_600_000) % 24) },
    { label: 'min', value: Math.floor((diff / 60_000) % 60) },
    { label: 'sec', value: Math.floor((diff / 1000) % 60) },
  ]
  return (
    <div className={cn('flex gap-2', className)} role="timer" aria-label={`${parts[0].value} days ${parts[1].value} hours ${parts[2].value} minutes remaining`}>
      {parts.map((p) => (
        <div key={p.label} className="min-w-[52px] rounded-xl border border-line bg-surface-2 px-2 py-1.5 text-center">
          <p className="font-display text-lg font-bold tabular-nums text-fg">{String(p.value).padStart(2, '0')}</p>
          <p className="text-2xs uppercase tracking-wider text-fg-subtle">{p.label}</p>
        </div>
      ))}
    </div>
  )
}
