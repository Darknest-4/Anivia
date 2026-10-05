import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'

interface AnimeRatingProps {
  rating?: number
  className?: string
  variant?: 'plain' | 'badge' | 'glass'
  size?: 'sm' | 'md'
}

export function AnimeRating({ rating, className, variant = 'plain', size = 'sm' }: AnimeRatingProps) {
  if (!rating) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold tabular-nums',
        size === 'sm' ? 'text-xs' : 'text-sm',
        variant === 'badge' && 'rounded-md bg-warning/15 px-1.5 py-1 text-warning',
        variant === 'glass' && 'rounded-md bg-black/60 px-1.5 py-1 text-white ring-1 ring-inset ring-white/10 backdrop-blur-md',
        variant === 'plain' && 'text-fg',
        className,
      )}
      aria-label={`Rated ${rating.toFixed(2)} out of 10`}
    >
      <Star className={cn('fill-warning text-warning', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} aria-hidden />
      {rating.toFixed(2)}
    </span>
  )
}
