import { t } from '@/i18n'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import type { Genre } from '@/types'

interface GenreTileProps {
  genre: Genre
  posters?: string[]
  className?: string
  size?: 'sm' | 'lg'
}

/** Colorful genre tile with a fanned poster stack. */
export function GenreTile({ genre, posters = [], className, size = 'sm' }: GenreTileProps) {
  return (
    <Link
      to={`/genres/${genre.slug}`}
      className={cn(
        'group relative isolate flex overflow-hidden rounded-2xl border border-white/10 p-4 transition-transform duration-base ease-out hover:-translate-y-0.5',
        size === 'sm' ? 'h-28 sm:h-32' : 'h-44 sm:h-52',
        className,
      )}
      style={{ background: `linear-gradient(135deg, hsl(${genre.hue} 70% 34%), hsl(${(genre.hue + 40) % 360} 60% 14%))` }}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
      <div className="absolute inset-0 z-20 bg-gradient-to-r from-black/55 via-black/25 to-transparent" aria-hidden />
      <div className={cn('relative z-30 flex flex-col justify-end', size === 'sm' ? 'max-w-[60%]' : 'max-w-[58%]')}>
        <h3 className={cn('font-display font-bold text-white', size === 'sm' ? 'text-base sm:text-lg' : 'text-2xl')}>{genre.name}</h3>
        {genre.animeCount !== undefined && <p className="text-xs font-medium text-white/70">{t('{p0} titles', { p0: genre.animeCount })}</p>}
        {size === 'lg' && <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-white/75">{genre.description}</p>}
      </div>
      <div className={cn('absolute bottom-0 top-3 flex items-end', size === 'sm' ? '-right-2' : '-right-4 top-6')} aria-hidden>
        {posters.slice(0, 3).map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            className={cn(
              'w-auto rounded-lg object-cover shadow-pop ring-1 ring-black/30 transition-transform duration-slow ease-out',
              size === 'sm' ? 'h-[88%]' : 'h-[86%]',
              i === 0 && 'translate-x-10 translate-y-4 rotate-[-10deg] group-hover:-rotate-12',
              i === 1 && 'z-10 translate-x-5 translate-y-1 rotate-[-2deg] group-hover:-translate-y-1',
              i === 2 && 'z-20 translate-y-3 rotate-[8deg] group-hover:rotate-12',
            )}
            style={{ aspectRatio: '2 / 3' }}
          />
        ))}
      </div>
    </Link>
  )
}
