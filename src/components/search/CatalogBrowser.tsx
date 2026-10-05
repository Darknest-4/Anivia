import { Search, SearchX, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AnimeCardList, AnimeGrid, AnimeListHeader } from '@/components/anime'
import { Badge, Button, Drawer, EmptyState, ErrorState, Input, Pagination, Select } from '@/components/ui'
import { useBrowse } from '@/hooks/queries'
import { useBrowseParams } from '@/hooks/useBrowseParams'
import { useDebounce } from '@/hooks/useDebounce'
import { useStore } from '@/hooks/useUserData'
import { SORT_OPTIONS } from '@/lib/filters'
import { formatNumber } from '@/lib/format'
import { viewModeStore } from '@/services/user'
import type { AnimeFilters, BrowseQuery } from '@/types'
import { ActiveFilters, countActiveFilters, FilterPanel } from './FilterPanel'
import { PER_PAGE_OPTIONS } from './filterOptions'
import { ViewToggle } from './ViewToggle'

interface CatalogBrowserProps {
  /** Filters that are fixed by the page (e.g. genre page) and hidden from the UI. */
  fixed?: Partial<BrowseQuery>
  hide?: (keyof AnimeFilters)[]
}

/** Complete catalog explorer: search, filters, sorting, grid/list, pagination. URL-synced. */
export function CatalogBrowser({ fixed = {}, hide = [] }: CatalogBrowserProps) {
  const { query, update, reset } = useBrowseParams()
  const [text, setText] = useState(query.query ?? '')
  const debounced = useDebounce(text, 300)
  const [drawer, setDrawer] = useState(false)
  const view = useStore(viewModeStore)
  const merged: BrowseQuery = { ...query, ...fixed, genres: [...new Set([...(fixed.genres ?? []), ...(query.genres ?? [])])] }
  const result = useBrowse(merged)
  const active = countActiveFilters(query)

  useEffect(() => {
    if ((query.query ?? '') !== debounced) update({ query: debounced || undefined })
  }, [debounced])

  const data = result.data
  const setPage = (page: number) => {
    update({ page }, false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-full sm:basis-64">
          <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Filter by title, studio or genre…" aria-label="Filter results" leftIcon={<Search />} className="h-10" />
        </div>
        <Button variant="secondary" size="sm" className="h-10 lg:hidden" onClick={() => setDrawer(true)} leftIcon={<SlidersHorizontal className="h-4 w-4" />}>
          Filters
          {active > 0 && <Badge variant="solid">{active}</Badge>}
        </Button>
        <Select size="sm" aria-label="Sort by" value={query.sort} onChange={(e) => update({ sort: e.target.value as BrowseQuery['sort'] })} options={SORT_OPTIONS.map((o) => ({ value: o.value, label: `Sort: ${o.label}` }))} className="min-w-0 flex-1 sm:w-[170px] sm:flex-none" />
        <Select size="sm" aria-label="Results per page" value={String(query.perPage)} onChange={(e) => update({ perPage: Number(e.target.value) })} options={PER_PAGE_OPTIONS} className="hidden w-[124px] sm:block" />
        <ViewToggle value={view} onChange={(v) => viewModeStore.set(v)} />
      </div>

      {/* Desktop filters */}
      <div className="mt-4 hidden rounded-2xl border border-line bg-surface/60 p-4 lg:block">
        <FilterPanel value={query} onChange={(p) => update(p)} hide={hide} />
      </div>

      <div className="mt-4 flex min-h-8 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted" aria-live="polite">
          {data ? (
            <>
              <span className="font-semibold text-fg">{formatNumber(data.total)}</span> {data.total === 1 ? 'title' : 'titles'} found
            </>
          ) : (
            'Loading titles…'
          )}
        </p>
        <ActiveFilters value={query} onChange={(p) => update(p)} onReset={() => { setText(''); reset() }} />
      </div>

      {/* Results */}
      <div className={result.isFetching && data ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {result.isError ? (
          <ErrorState className="mt-6" onRetry={() => result.refetch()} />
        ) : view === 'grid' || !data ? (
          <AnimeGrid
            className="mt-5"
            items={data?.items}
            loading={result.isLoading}
            skeletonCount={query.perPage && query.perPage < 24 ? query.perPage : 18}
            showGenres
            empty={<NoResults onReset={() => { setText(''); reset() }} />}
          />
        ) : data.items.length === 0 ? (
          <NoResults onReset={() => { setText(''); reset() }} />
        ) : (
          <div className="mt-5">
            <AnimeListHeader />
            <ul className="mt-2 space-y-1">
              {data.items.map((a, i) => (
                <li key={a.id}>
                  <AnimeCardList anime={a} index={(data.page - 1) * data.perPage + i + 1} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {data && <Pagination className="mt-10" page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        side="bottom"
        title="Filters"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => { setText(''); reset() }}>
              Reset
            </Button>
            <Button onClick={() => setDrawer(false)}>Show {data ? formatNumber(data.total) : ''} results</Button>
          </div>
        }
      >
        <div className="px-5 pb-6">
          <FilterPanel value={query} onChange={(p) => update(p)} layout="stack" hide={hide} />
        </div>
      </Drawer>
    </div>
  )
}

function NoResults({ onReset }: { onReset: () => void }) {
  return (
    <EmptyState
      className="mt-6"
      icon={<SearchX />}
      title="No anime match these filters"
      description="Try removing a filter or two, or search for something different."
      action={<Button variant="secondary" onClick={onReset}>Reset filters</Button>}
    />
  )
}
