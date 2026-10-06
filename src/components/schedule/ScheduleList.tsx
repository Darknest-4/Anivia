import { t } from '@/i18n'
import { BellRing, CalendarX2, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, EmptyState } from '@/components/ui'
import { useWatchlistEntry } from '@/hooks/useUserData'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { useToast } from '@/providers/ToastProvider'
import { watchlistService } from '@/services/user'
import type { ScheduleItem, ScheduleStatus } from '@/types'
import { thumb } from '@/lib/images'

const statusMeta: Record<ScheduleStatus, { label: string; variant: 'success' | 'accent' | 'info' | 'warning' }> = {
  aired: { label: t('Aired'), variant: 'success' },
  'airing-soon': { label: t('Airing soon'), variant: 'accent' },
  upcoming: { label: t('Upcoming'), variant: 'info' },
  delayed: { label: t('Delayed'), variant: 'warning' },
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  const entry = useWatchlistEntry(item.animeId)
  const toast = useToast()
  const meta = statusMeta[item.status]
  const aired = item.status === 'aired'
  return (
    <li className="group grid grid-cols-[3.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-5">
      <div className="pt-1 text-right sm:pt-0">
        <p className={cn('font-display text-lg font-bold tabular-nums', aired ? 'text-fg-subtle' : 'text-fg')}>{item.time}</p>
      </div>
      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 transition-colors group-hover:border-line-strong">
        <Link to={`/anime/${item.animeId}`} className="shrink-0" aria-label={item.anime.title}>
          <img src={thumb(item.anime.poster)} alt="" loading="lazy" className="h-16 w-11 rounded-lg object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/anime/${item.animeId}`} className="block truncate text-sm font-semibold text-fg hover:text-accent-soft">
            {item.anime.title}
          </Link>
          <p className="mt-0.5 text-xs text-fg-subtle">
            {item.anime.episodes ? t('Episode {p0} of {p1}', { p0: item.episode, p1: item.anime.episodes }) : t('Episode {p0}', { p0: item.episode })} · {item.anime.genres[0]?.name}
          </p>
          <div className="mt-1.5 flex items-center gap-2 sm:hidden">
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={meta.variant} className="hidden sm:inline-flex">
            {meta.label}
          </Badge>
          {aired ? (
            <Link to={`/anime/${item.animeId}/watch?ep=${item.episode}`} aria-label={`Watch episode ${item.episode}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-hover">
              <Play className="h-4 w-4 fill-current" />
            </Link>
          ) : (
            <button
              type="button"
              aria-pressed={Boolean(entry)}
              aria-label={entry ? t('Reminder on') : t('Remind me about {p0}', { p0: item.anime.title })}
              onClick={() => {
                if (entry) return
                watchlistService.add(item.animeId, 'watching')
                toast({ title: t('Reminder set'), description: t('{p0} · Episode {p1} at {p2}', { p0: item.anime.title, p1: item.episode, p2: item.time }), icon: BellRing })
              }}
              className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors', entry ? 'bg-accent/15 text-accent-soft' : 'bg-surface-3 text-fg-muted hover:text-fg')}
            >
              <BellRing className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

export function ScheduleList({ title, date, items }: { title: string; date: Date; items: ScheduleItem[] }) {
  return (
    <section aria-label={title} className="mb-10">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        <span className="text-sm text-fg-subtle">{formatDate(date.toISOString(), { month: 'long', day: 'numeric' })}</span>
      </div>
      {items.length === 0 ? (
        <EmptyState compact icon={<CalendarX2 />} title={t('No broadcasts scheduled')} description={t('Nothing airs on this day. Check another day of the week.')} />
      ) : (
        <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[4.35rem] before:top-2 before:hidden before:w-px before:bg-line sm:before:block sm:before:left-[5.6rem]">
          {items.map((item) => (
            <ScheduleRow key={item.id} item={item} />
          ))}
        </ol>
      )}
    </section>
  )
}
