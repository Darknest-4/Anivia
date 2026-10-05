import { Building2 } from 'lucide-react'
import { ScrollRow, StudioCard } from '@/components/anime'
import { SectionHeader } from '@/components/common/SectionHeader'
import { Skeleton } from '@/components/ui'
import { useBrowse, useStudios } from '@/hooks/queries'

export function StudiosSection() {
  const { data: studios } = useStudios()
  const { data: all } = useBrowse({ perPage: 100 })
  const posters = (id: string) => (all?.items ?? []).filter((a) => a.studios.some((s) => s.id === id)).map((a) => a.poster)
  return (
    <section aria-labelledby="studios-heading" className="container-app">
      <SectionHeader id="studios-heading" title="Studios" icon={<Building2 />} description="The creative teams behind your favorite worlds." href="/studios" />
      {studios ? (
        <ScrollRow label="Studios" itemClassName="w-[82%] xs:w-[60%] sm:w-[45%] lg:w-[31.5%] xl:w-[23.6%]">
          {studios.map((s) => (
            <StudioCard key={s.id} studio={s} posters={posters(s.id)} className="h-full" />
          ))}
        </ScrollRow>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-60 rounded-2xl" />
          ))}
        </div>
      )}
    </section>
  )
}
