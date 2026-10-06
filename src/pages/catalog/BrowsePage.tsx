import { t } from '@/i18n'
import { PageHeader } from '@/components/common/PageHeader'
import { CatalogBrowser } from '@/components/search'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

export default function BrowsePage() {
  useDocumentMeta({ title: t('Browse Anime'), description: t('Browse the full ANIVIA catalog with filters for genre, year, season, status, type, rating and language.') })
  return (
    <div className="container-app">
      <PageHeader
        crumbs={[{ label: t('Home'), to: '/' }, { label: t('Browse') }]}
        eyebrow={t('Catalog')}
        title={t('Browse Anime')}
        description={t('Filter the full catalog by genre, year, season, status, format and rating.')}
      />
      <CatalogBrowser />
    </div>
  )
}
