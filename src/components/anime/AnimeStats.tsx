import { t } from '@/i18n'
import { Award, Heart, Star, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatCompact, formatRating, scoresHidden } from '@/lib/format'
import type { Anime } from '@/types'

export function AnimeStats({ anime, className }: { anime: Anime; className?: string }) {
  const all = [
    {
      label: t('Score'),
      value: anime.rating ? formatRating(anime.rating) : '—',
      sub: anime.ratingCount ? t('{p0} votes', { p0: formatCompact(anime.ratingCount) }) : anime.rating ? t('average score') : 'not rated yet',
      icon: Star,
      tone: 'text-warning bg-warning/12',
    },
    { label: t('Ranked'), value: anime.rank ? `#${anime.rank}` : null, sub: t('by score'), icon: Award, tone: 'text-accent-soft bg-accent/12' },
    { label: t('Popularity'), value: anime.popularity ? formatCompact(anime.popularity) : null, sub: t('members'), icon: TrendingUp, tone: 'text-info bg-info/12' },
    { label: t('Favorites'), value: anime.favorites ? formatCompact(anime.favorites) : null, sub: t('users'), icon: Heart, tone: 'text-danger bg-danger/12' },
  ]
  // Only real numbers — unknown stats are left out instead of showing placeholders.
  const stats = all.filter((s) => s.value !== null && !(scoresHidden() && (s.label === t('Score') || s.label === t('Ranked'))))
  if (!stats.length) return null
  return (
    <ul className={cn('grid grid-cols-2 gap-3', stats.length === 3 ? 'sm:grid-cols-3' : stats.length >= 4 && 'sm:grid-cols-4', className)}>
      {stats.map((s) => (
        <li key={s.label} className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', s.tone)}>
              <s.icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-medium text-fg-subtle">{s.label}</span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-fg tabular-nums">{s.value}</p>
          <p className="text-xs text-fg-subtle">{s.sub}</p>
        </li>
      ))}
    </ul>
  )
}
