import { CalendarPlus, Clock3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { ScheduleList } from '@/components/schedule/ScheduleList'
import { Button, ErrorState, Skeleton, Tabs } from '@/components/ui'
import { useWatchlist } from '@/hooks/useUserData'
import { downloadText, scheduleToIcs } from '@/lib/ics'
import { useSchedule } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { cn } from '@/lib/cn'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
type Range = 'today' | 'tomorrow' | 'week'

export default function SchedulePage() {
  useDocumentMeta({ title: 'Release Schedule', description: 'Weekly anime broadcast schedule — never miss a new episode.' })
  const { data, isLoading, isError, refetch } = useSchedule()
  const today = (new Date().getDay() + 6) % 7
  const [range, setRange] = useState<Range>('week')
  const [day, setDay] = useState(today)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const { items: watchlist } = useWatchlist()
  const exportIcs = (mine: boolean) => {
    const ids = new Set(watchlist.filter((w) => w.status === 'watching' || w.status === 'planning').map((w) => w.animeId))
    const list = (data ?? []).filter((s) => !mine || ids.has(s.animeId))
    downloadText(mine ? 'anivia-my-releases.ics' : 'anivia-releases.ics', scheduleToIcs(list))
  }

  const visibleDays = range === 'today' ? [today] : range === 'tomorrow' ? [(today + 1) % 7] : [day]
  const counts = useMemo(() => DAYS.map((_, i) => (data ?? []).filter((s) => s.day === i).length), [data])
  const weekDates = useMemo(() => {
    const now = new Date()
    return DAYS.map((_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() + (i - today))
      return d
    })
  }, [today])

  return (
    <div className="container-app">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Schedule' }]}
        eyebrow="Weekly simulcast"
        title="Release Schedule"
        description="New episodes as they air. Times are shown in your local time zone."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs font-medium text-fg-muted">
              <Clock3 className="h-3.5 w-3.5" />
              {tz}
            </span>
            <Button size="sm" variant="secondary" leftIcon={<CalendarPlus className="h-4 w-4" />} disabled={!data?.length} onClick={() => exportIcs(false)}>
              Add week to calendar
            </Button>
            {watchlist.length > 0 && (
              <Button size="sm" variant="secondary" disabled={!data?.length} onClick={() => exportIcs(true)}>
                Only my shows
              </Button>
            )}
          </div>
        }
      />

      <Tabs
        items={[
          { value: 'today', label: 'Today' },
          { value: 'tomorrow', label: 'Tomorrow' },
          { value: 'week', label: 'This Week' },
        ]}
        value={range}
        onChange={setRange}
        label="Schedule range"
        variant="pill"
        idPrefix="sched-range"
      />

      {range === 'week' && (
        <div role="tablist" aria-label="Day of week" className="scrollbar-none -mx-4 mt-5 grid auto-cols-[minmax(84px,1fr)] grid-flow-col gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {DAYS.map((name, i) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={day === i}
              onClick={() => setDay(i)}
              className={cn(
                'relative flex flex-col items-center rounded-2xl border px-2 py-3 transition-colors',
                day === i ? 'border-accent/60 bg-accent/10 text-fg' : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
              )}
            >
              <span className="text-xs font-semibold uppercase tracking-wider">{name.slice(0, 3)}</span>
              <span className="mt-1 font-display text-xl font-bold">{weekDates[i].getDate()}</span>
              <span className="mt-1 text-2xs text-fg-subtle">{counts[i]} shows</span>
              {i === today && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" aria-label="Today" />}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          visibleDays.map((d) => (
            <ScheduleList
              key={d}
              title={`${DAYS[d]}${d === today ? ' · Today' : d === (today + 1) % 7 ? ' · Tomorrow' : ''}`}
              date={weekDates[d]}
              items={data.filter((s) => s.day === d)}
            />
          ))
        )}
      </div>
    </div>
  )
}
