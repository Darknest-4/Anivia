import { t } from '@/i18n'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StudioCard } from '@/components/anime'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, Input, Select, Skeleton } from '@/components/ui'
import { useStudios } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

type Sort = 'titles' | 'favorites' | 'name' | 'founded'

export default function StudiosPage() {
  useDocumentMeta({ title: t('Studios'), description: t('The animation studios behind the ANIVIA catalog.') })
  const { data, isLoading, isError, refetch } = useStudios()
  const [text, setText] = useState('')
  const [sort, setSort] = useState<Sort>('titles')
  const list = useMemo(() => {
    const q = text.trim().toLowerCase()
    const filtered = (data ?? []).filter((s) => !q || s.name.toLowerCase().includes(q) || (s.country ?? '').toLowerCase().includes(q))
    return filtered.sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'founded'
          ? (a.founded || 9999) - (b.founded || 9999)
          : sort === 'favorites'
            ? (b.favorites ?? 0) - (a.favorites ?? 0)
            : (b.animeCount ?? 0) - (a.animeCount ?? 0),
    )
  }, [data, text, sort])

  return (
    <div className="container-app">
      <PageHeader crumbs={[{ label: t('Home'), to: '/' }, { label: t('Studios') }]} eyebrow={t('Directory')} title={t('Studios')} description={t('Discover the creative teams behind your favorite worlds.')} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Search studios…')} aria-label={t('Search studios')} leftIcon={<Search />} />
        </div>
        <Select
          aria-label={t('Sort studios')}
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          options={[
            { value: 'titles', label: t('Most titles') },
            ...((data ?? []).some((s) => s.favorites) ? [{ value: 'favorites', label: t('Most favorited') }] : []),
            { value: 'name', label: t('Name A–Z') },
            // Founding years are only known for some sources (MyAnimeList).
            ...((data ?? []).some((s) => s.founded) ? [{ value: 'founded', label: t('Oldest first') }] : []),
          ]}
          className="sm:w-48"
        />
      </div>
      <div className="mt-8">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={<Search />} title={t('No studios found')} description={t('Try another name.')} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {list.map((s) => (
              <StudioCard key={s.id} studio={s} posters={s.posters} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
