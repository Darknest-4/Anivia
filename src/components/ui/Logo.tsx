import { useId } from 'react'
import { cn } from '@/lib/cn'

/** ANIVIA brand mark — pure SVG, no external image dependency. */
export function LogoMark({ className }: { className?: string }) {
  // Unique per instance: a repeated id breaks the gradient once the first logo is hidden (e.g. mobile header).
  const gradient = `anivia-mark-${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 64 64" className={cn('h-8 w-8', className)} aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(350 100% 66%)" />
          <stop offset="1" stopColor="hsl(340 80% 40%)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradient})`} />
      <path d="M18 47 L32 15 L46 47" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="36.5" r="4.5" fill="#fff" />
      <circle cx="47" cy="17" r="2.5" fill="#fff" opacity="0.85" />
    </svg>
  )
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && <span className="font-display text-[19px] font-extrabold tracking-[0.14em] text-fg">ANIVIA</span>}
    </span>
  )
}
