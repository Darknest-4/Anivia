import { LayoutGrid } from 'lucide-react'
import { GenreTile } from '@/components/anime'
import { SectionHeader } from '@/components/common/SectionHeader'
import { Skeleton } from '@/components/ui'
import { useBrowse, useGenres } from '@/hooks/queries'

export function GenresSection() {
  const { data: genres } = useGenres()
  const { data: all } = useBrowse({ perPage: 100 })
  const postersFor = (slug: string) => (all?.items ?? []).filter((a) => a.genres.some((g) => g.slug === slug)).map((a) => a.poster)
  return (
    <section aria-labelledby="genres-heading" className="container-app">
      <SectionHeader id="genres-heading" title="Explore Genres" icon={<LayoutGrid />} href="/genres" />
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {genres
          ? genres.slice(0, 8).map((g) => <GenreTile key={g.id} genre={g} posters={postersFor(g.slug)} />)
          : Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl sm:h-32" />)}
      </div>
    </section>
  )
}
