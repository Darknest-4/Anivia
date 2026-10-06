import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { formatCompact, formatDate, formatRating, scoresHidden, seasonLabel, statusLabel } from '@/lib/format'
import type { Anime } from '@/types'

/** Structured "Information" sidebar listing all key metadata fields. */
export function AnimeInfoPanel({ anime, className }: { anime: Anime; className?: string }) {
  const rows: [string, React.ReactNode][] = ([
    ['Type', anime.type],
    ['Status', statusLabel[anime.status]],
    ['Release year', anime.year ?? 'TBA'],
    [
      'Season',
      anime.season && anime.year ? (
        <Link to={`/season/${anime.season}-${anime.year}`} className="text-accent-soft hover:underline">
          {seasonLabel[anime.season]} {anime.year}
        </Link>
      ) : null,
    ],
    ['Episodes', anime.episodes ? (anime.status === 'airing' && anime.episodesAired ? `${anime.episodesAired} of ${anime.episodes}` : anime.episodes) : 'TBA'],
    ['Episode duration', anime.duration ? `${anime.duration} min` : null],
    ['Aired', anime.airedFrom ? `${formatDate(anime.airedFrom)}${anime.airedTo && anime.airedTo !== anime.airedFrom ? ` – ${formatDate(anime.airedTo)}` : anime.status === 'airing' ? ' – present' : ''}` : 'TBA'],
    [
      'Studio',
      anime.studios.length ? (
        <span className="flex flex-wrap justify-end gap-x-1">
          {anime.studios.map((s, i) => (
            <Link key={s.id} to={`/studio/${s.id}`} className="text-accent-soft hover:underline">
              {s.name}
              {i < anime.studios.length - 1 ? ',' : ''}
            </Link>
          ))}
        </span>
      ) : null,
    ],
    [
      'Genres',
      anime.genres.length ? (<span key="g" className="flex flex-wrap justify-end gap-x-1">
        {anime.genres.map((g, i) => (
          <Link key={g.id} to={`/genres/${g.slug}`} className="hover:text-fg">
            {g.name}
            {i < anime.genres.length - 1 ? ',' : ''}
          </Link>
        ))}
      </span>) : null,
    ],
    ['Age rating', anime.ageRating ?? null],
    ...(scoresHidden() ? [] : [['Score', anime.rating ? `${formatRating(anime.rating)}${anime.ratingCount ? ` (${formatCompact(anime.ratingCount)} votes)` : ''}` : 'Not yet rated'] as [string, React.ReactNode]]),
    ['Popularity', anime.popularity ? `${formatCompact(anime.popularity)} members` : null],
    ['Favorites', anime.favorites ? formatCompact(anime.favorites) : null],
    ...(anime.languages.length ? [['Audio', anime.languages.join(', ')] as [string, React.ReactNode]] : []),
    ...(anime.quality ? [['Quality', anime.quality] as [string, React.ReactNode]] : []),
  ] as [string, React.ReactNode][]).filter(([, value]) => value !== null && value !== undefined && value !== '')
  return (
    <section aria-labelledby="info-heading" className={cn('rounded-2xl border border-line bg-surface p-5', className)}>
      <h2 id="info-heading" className="text-base font-semibold text-fg">
        Information
      </h2>
      <dl className="mt-4 divide-y divide-line/70">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 py-2.5 text-[13px]">
            <dt className="shrink-0 text-fg-subtle">{label}</dt>
            <dd className="text-right font-medium text-fg-muted">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
