import { PageHeader } from '@/components/common/PageHeader'
import { CatalogBrowser } from '@/components/search'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

export default function BrowsePage() {
  useDocumentMeta({ title: 'Browse Anime', description: 'Browse the full ANIVIA catalog with filters for genre, year, season, status, type, rating and language.' })
  return (
    <div className="container-app">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Browse' }]}
        eyebrow="Catalog"
        title="Browse Anime"
        description="Filter the full catalog by genre, year, season, status, format, rating and audio language."
      />
      <CatalogBrowser />
    </div>
  )
}
