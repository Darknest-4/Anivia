import { t } from '@/i18n'
import { Bookmark, CheckCircle2, Clock3, Heart, PlayCircle, Tv } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface ProfileStatValues {
  completed: number
  watching: number
  planning: number
  favorites: number
  hours: number
  episodes: number
}

export function ProfileStats({ values, className }: { values: ProfileStatValues; className?: string }) {
  const items = [
    { label: t('Completed'), value: values.completed, icon: CheckCircle2, tone: 'text-success bg-success/12' },
    { label: t('Watching'), value: values.watching, icon: PlayCircle, tone: 'text-accent-soft bg-accent/12' },
    { label: t('Planning'), value: values.planning, icon: Bookmark, tone: 'text-info bg-info/12' },
    { label: t('Favorites'), value: values.favorites, icon: Heart, tone: 'text-danger bg-danger/12' },
    { label: t('Hours watched'), value: values.hours, icon: Clock3, tone: 'text-warning bg-warning/12' },
    { label: t('Episodes'), value: values.episodes, icon: Tv, tone: 'text-fg-muted bg-surface-3' },
  ]
  return (
    <ul className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6', className)}>
      {items.map((s) => (
        <li key={s.label} className="rounded-2xl border border-line bg-surface p-4">
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', s.tone)}>
            <s.icon className="h-[18px] w-[18px]" />
          </span>
          <p className="mt-3 font-display text-2xl font-bold tabular-nums text-fg">{s.value}</p>
          <p className="text-xs text-fg-subtle">{s.label}</p>
        </li>
      ))}
    </ul>
  )
}
