import { CalendarClock } from 'lucide-react'
import { UpcomingCard } from '@/components/anime'
import { SectionHeader } from '@/components/common/SectionHeader'
import { Skeleton } from '@/components/ui'
import { useUpcoming } from '@/hooks/queries'

export function UpcomingSection() {
  const { data } = useUpcoming()
  return (
    <section aria-labelledby="upcoming-heading" className="container-app">
      <SectionHeader id="upcoming-heading" title="Coming Soon" eyebrow="Upcoming" icon={<CalendarClock />} href="/season" linkLabel="Upcoming seasons" />
      <div className="grid gap-4 md:grid-cols-2">
        {data ? data.slice(0, 4).map((a) => <UpcomingCard key={a.id} anime={a} />) : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[164px] rounded-2xl" />)}
      </div>
    </section>
  )
}
