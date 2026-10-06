import { t } from '@/i18n'
import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import { usePreferences } from '@/hooks/useUserData'
import { formatRating } from '@/lib/format'

interface AnimeRatingProps {
  rating?: number
  className?: string
  variant?: 'plain' | 'badge' | 'glass'
  size?: 'sm' | 'md'
}

export function AnimeRating({ rating, className, variant = 'plain', size = 'sm' }: AnimeRatingProps) {
  const { prefs } = usePreferences()
  if (!rating || prefs.hideScores) return null
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
      aria-label={t('Rated {p0} out of {p1}', { p0: formatRating(rating), p1: prefs.ratingScale })}
    >
      <Star className={cn('fill-warning text-warning', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} aria-hidden />
      {formatRating(rating)}
    </span>
  )
}
