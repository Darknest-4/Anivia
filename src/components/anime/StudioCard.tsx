import { t } from '@/i18n'
import { ArrowUpRight, Film, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import type { Studio } from '@/types'
import { thumb } from '@/lib/images'

export function StudioMark({ studio, className }: { studio: Studio; className?: string }) {
  const initials = studio.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-xl font-display font-extrabold text-white shadow-card', className)}
      style={{ background: `linear-gradient(140deg, hsl(${studio.logoHue} 75% 55%), hsl(${(studio.logoHue + 40) % 360} 65% 28%))` }}
      aria-hidden
    >
      {initials}
    </span>
  )
}

export function StudioCard({ studio, posters = [], className }: { studio: Studio; posters?: string[]; className?: string }) {
  return (
    <Link
      to={`/studio/${studio.id}`}
      className={cn('group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5 transition-[border-color,transform] duration-base hover:-translate-y-0.5 hover:border-line-strong', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <StudioMark studio={studio} className="h-12 w-12 text-base" />
        <ArrowUpRight className="h-5 w-5 text-fg-subtle transition-transform duration-base group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-fg">{studio.name}</h3>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-subtle">
        {studio.country && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {studio.country}
          </span>
        )}
        {studio.founded ? <span>{t('Est. {p0}', { p0: studio.founded })}</span> : null}
        {studio.animeCount !== undefined && (
          <span className="inline-flex items-center gap-1">
            <Film className="h-3.5 w-3.5" />
            {t('{p0} titles', { p0: studio.animeCount })}
          </span>
        )}
      </div>
      {studio.description && <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">{studio.description}</p>}
      {posters.length > 0 && (
        <div className="mt-4 flex -space-x-3">
          {posters.slice(0, 4).map((src, i) => (
            <img key={i} src={thumb(src)} alt="" loading="lazy" className="h-16 w-11 rounded-md object-cover ring-2 ring-surface" />
          ))}
        </div>
      )}
    </Link>
  )
}
