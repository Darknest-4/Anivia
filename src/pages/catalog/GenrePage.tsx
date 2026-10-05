import { useParams } from 'react-router-dom'
import { AnimeCardFeatured } from '@/components/anime'
import { PageHeader } from '@/components/common/PageHeader'
import { CatalogBrowser } from '@/components/search'
import { Skeleton } from '@/components/ui'
import { useBrowse, useGenre } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import NotFoundPage from '@/pages/info/NotFoundPage'

export default function GenrePage() {
  const { genre: slug } = useParams()
  const { data: genre, isLoading } = useGenre(slug)
  const top = useBrowse({ genres: slug ? [slug] : [], sort: 'rating', perPage: 1 })
  useDocumentMeta({ title: genre ? `${genre.name} Anime` : 'Genre', description: genre?.description })

  if (isLoading)
    return (
      <div className="container-app py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-72 rounded-2xl" />
      </div>
    )
  if (!genre) return <NotFoundPage />
  const featured = top.data?.items[0]

  return (
    <div className="container-app">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Genres', to: '/genres' }, { label: genre.name }]}
        eyebrow={genre.animeCount !== undefined ? `${genre.animeCount} titles` : 'Genre'}
        title={
          <span className="inline-flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ background: `hsl(${genre.hue} 85% 60%)` }} aria-hidden />
            {genre.name}
          </span>
        }
        description={genre.description}
      />
      {featured && <AnimeCardFeatured anime={featured} label={`Top rated in ${genre.name}`} className="mb-10" />}
      <CatalogBrowser fixed={{ genres: [genre.slug] }} />
    </div>
  )
}
