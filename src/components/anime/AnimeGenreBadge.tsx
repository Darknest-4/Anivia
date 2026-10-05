import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import type { Genre } from '@/types'

interface Props {
  genre: Genre
  className?: string
  asLink?: boolean
  variant?: 'subtle' | 'glass'
}

export function AnimeGenreBadge({ genre, className, asLink = true, variant = 'subtle' }: Props) {
  const classes = cn(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
    variant === 'subtle' && 'bg-surface-2 text-fg-muted ring-1 ring-inset ring-line hover:text-fg hover:ring-line-strong',
    variant === 'glass' && 'bg-white/10 text-white/90 ring-1 ring-inset ring-white/15 backdrop-blur-md hover:bg-white/20',
    className,
  )
  const dot = <span className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${genre.hue} 85% 62%)` }} aria-hidden />
  if (!asLink)
    return (
      <span className={classes}>
        {dot}
        {genre.name}
      </span>
    )
  return (
    <Link to={`/genres/${genre.slug}`} className={classes}>
      {dot}
      {genre.name}
    </Link>
  )
}
