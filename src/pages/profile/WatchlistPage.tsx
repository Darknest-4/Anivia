import { t } from '@/i18n'
import { Bookmark, Compass, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AnimeCard, AnimeCardList, AnimeCardSkeleton, AnimeListHeader, EpisodeStepper, gridClasses } from '@/components/anime'
import { PageHeader } from '@/components/common/PageHeader'
import { ViewToggle } from '@/components/search'
import { Button, ButtonLink, Dialog, EmptyState, Input, Select, Tabs } from '@/components/ui'
import { useAnimeByIds } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useStore, useWatchlist } from '@/hooks/useUserData'
import { cn } from '@/lib/cn'
import { useToast } from '@/providers/ToastProvider'
import { viewModeStore, WATCHLIST_STATUSES, watchlistService } from '@/services/user'
import type { Anime, WatchlistStatus } from '@/types'

type Filter = 'all' | WatchlistStatus
type Sort = 'added' | 'updated' | 'title' | 'rating'

export default function WatchlistPage() {
  useDocumentMeta({ title: t('Watchlist'), noindex: true })
  const { items } = useWatchlist()
  const view = useStore(viewModeStore)
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [text, setText] = useState('')
  const [sort, setSort] = useState<Sort>('added')
  const [removing, setRemoving] = useState<Anime | null>(null)
  const { data, isLoading } = useAnimeByIds(items.map((i) => i.animeId))
  const byId = useMemo(() => new Map((data ?? []).map((a) => [a.id, a])), [data])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length }
    for (const i of items) c[i.status] = (c[i.status] ?? 0) + 1
    return c
  }, [items])

  const visible = useMemo(() => {
    const q = text.trim().toLowerCase()
    const list = items
      .filter((i) => filter === 'all' || i.status === filter)
      .map((i) => ({ entry: i, anime: byId.get(i.animeId) }))
      .filter((x): x is { entry: (typeof items)[number]; anime: Anime } => Boolean(x.anime))
      .filter((x) => !q || x.anime.title.toLowerCase().includes(q) || x.anime.genres.some((g) => g.name.toLowerCase().includes(q)))
    return list.sort((a, b) => {
      if (sort === 'title') return a.anime.title.localeCompare(b.anime.title)
      if (sort === 'rating') return (b.anime.rating ?? 0) - (a.anime.rating ?? 0)
      if (sort === 'updated') return b.entry.updatedAt.localeCompare(a.entry.updatedAt)
      return b.entry.addedAt.localeCompare(a.entry.addedAt)
    })
  }, [items, filter, text, sort, byId])

  const statusSelect = (anime: Anime, status: WatchlistStatus) => (
    <Select
      size="xs"
      aria-label={t('Status for {p0}', { p0: anime.title })}
      value={status}
      onChange={(e) => {
        watchlistService.setStatus(anime.id, e.target.value as WatchlistStatus)
        toast({ title: t('Watchlist updated'), description: anime.title })
      }}
      options={WATCHLIST_STATUSES}
      className="min-w-0 flex-1"
    />
  )

  return (
    <div>
      <PageHeader eyebrow={t('Library')} title={t('Watchlist')} description={t('Everything you’re watching, planning and have finished — synced to your account when you’re signed in.')} />

      {items.length === 0 ? (
        <EmptyState
          icon={<Bookmark />}
          title={t('Your watchlist is empty.')}
          description={t('No anime saved yet. Start exploring and tap the bookmark on any title to save it here.')}
          action={
            <ButtonLink to="/browse" leftIcon={<Compass className="h-4 w-4" />}>
              {t('Start exploring')}
            </ButtonLink>
          }
        />
      ) : (
        <>
          <Tabs
            items={[{ value: 'all', label: t('All'), count: counts.all }, ...WATCHLIST_STATUSES.map((s) => ({ value: s.value, label: s.label, count: counts[s.value] ?? 0 }))]}
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            label={t('Watchlist status')}
            idPrefix="wl"
          />
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 basis-full sm:basis-60">
              <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Search your watchlist…')} aria-label={t('Search watchlist')} leftIcon={<Search />} className="h-10" />
            </div>
            <Select
              size="sm"
              aria-label={t('Sort watchlist')}
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              options={[
                { value: 'added', label: t('Recently added') },
                { value: 'updated', label: t('Recently updated') },
                { value: 'title', label: t('Title A–Z') },
                { value: 'rating', label: t('Highest rated') },
              ]}
              className="w-[170px]"
            />
            <ViewToggle value={view} onChange={(v) => viewModeStore.set(v)} />
          </div>

          <div className="mt-6" role="tabpanel" id={`wl-panel-${filter}`}>
            {isLoading && !data ? (
              <div className={gridClasses.dense}>
                {Array.from({ length: Math.min(10, items.length) }, (_, i) => (
                  <AnimeCardSkeleton key={i} />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <EmptyState compact icon={<Search />} title={t('Nothing here yet')} description={t('No titles match this filter. Try another status or search term.')} />
            ) : view === 'grid' ? (
              <ul className={gridClasses.dense}>
                {visible.map(({ anime, entry }) => (
                  <li key={anime.id} className="min-w-0">
                    <AnimeCard anime={anime} />
                    {entry.status === 'watching' && anime.type !== 'Movie' && <EpisodeStepper anime={anime} className="mt-2" />}
                    <div className="mt-2 flex items-center gap-1.5">
                      {statusSelect(anime, entry.status)}
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${anime.title}`} onClick={() => setRemoving(anime)} className="h-9 w-9">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <AnimeListHeader />
                <ul className="mt-2 space-y-1">
                  {visible.map(({ anime, entry }, i) => (
                    <li key={anime.id}>
                      <AnimeCardList
                        anime={anime}
                        index={i + 1}
                        actions={
                          <Button variant="ghost" size="icon-sm" aria-label={t('Remove {p0}', { p0: anime.title })} onClick={() => setRemoving(anime)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <div className={cn('-mt-1 mb-2 flex items-center justify-end gap-2 px-3')}>
                        {entry.status === 'watching' && anime.type !== 'Movie' && <EpisodeStepper anime={anime} className="w-40" />}
                        <div className="md:hidden">{statusSelect(anime, entry.status)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}

      <Dialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        size="sm"
        icon={<Trash2 className="h-5 w-5" />}
        title={t('Remove from watchlist?')}
        description={removing ? t('“{p0}” will be removed from your watchlist.', { p0: removing.title }) : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              {t('Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!removing) return
                const entry = items.find((i) => i.animeId === removing.id)
                watchlistService.remove(removing.id)
                toast({ title: t('Removed from watchlist'), description: removing.title, variant: 'info', action: { label: t('Undo'), onClick: () => watchlistService.add(removing.id, entry?.status) } })
                setRemoving(null)
              }}
            >
              {t('Remove')}
            </Button>
          </>
        }
      />
    </div>
  )
}
