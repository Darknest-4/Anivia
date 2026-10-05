import { Clock, Flame, Hash, SearchX, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimeCardHorizontal, AnimeGrid, CharacterCard, StudioCard } from '@/components/anime'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchAutocomplete, ViewToggle } from '@/components/search'
import { Button, ButtonLink, EmptyState, ErrorState, Skeleton, Tabs } from '@/components/ui'
import { useGenres, useSearch, useSuggestions, useTrending } from '@/hooks/queries'
import { useDebounce } from '@/hooks/useDebounce'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useRecentSearches, useStore } from '@/hooks/useUserData'
import { recentSearchesService, viewModeStore } from '@/services/user'

type Category = 'all' | 'anime' | 'characters' | 'studios'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [text, setText] = useState(q)
  const debounced = useDebounce(text.trim(), 300)
  const [category, setCategory] = useState<Category>('all')
  const view = useStore(viewModeStore)

  useDocumentMeta({ title: q ? `Search: ${q}` : 'Search', description: 'Search anime, characters, studios and genres on ANIVIA.' })

  useEffect(() => setText(q), [q])
  useEffect(() => {
    if (debounced !== q) setParams(debounced ? { q: debounced } : {}, { replace: true })
  }, [debounced])
  useEffect(() => {
    if (q.length >= 2) recentSearchesService.add(q)
  }, [q])

  const results = useSearch(q)
  const extras = useSuggestions(q)
  const anime = results.data ?? []
  const characters = extras.data?.characters ?? []
  const studios = extras.data?.studios ?? []
  const genres = extras.data?.genres ?? []
  const total = anime.length + characters.length + studios.length

  return (
    <div className="container-app">
      <PageHeader eyebrow="Search" title="Find your next obsession" description="Search titles, alternative titles, genres, studios, characters and synopses." />
      <SearchAutocomplete size="lg" autoFocus openOnFocus={false} value={text} onValueChange={setText} onSubmit={(v) => setParams({ q: v })} placeholder="Search anime…" />
      <p className="mt-2 text-xs text-fg-subtle">
        Tip: press <span className="font-semibold">Ctrl/⌘ K</span> anywhere for quick navigation. Try “nar”, “moon” or “mecha”.
      </p>

      <div className="mt-8">
        {!q ? (
          <InitialState onPick={(v) => setParams({ q: v })} />
        ) : results.isError ? (
          <ErrorState title="Search is unavailable right now." description="We couldn’t reach the search service. Please try again in a moment." onRetry={() => results.refetch()} />
        ) : results.isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Searching">
            <Skeleton className="h-5 w-48" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title="We couldn’t find anything matching your search."
            description={`No results for “${q}”. Check the spelling or try a broader term.`}
            action={
              <>
                <Button variant="secondary" onClick={() => setParams({})}>
                  Clear search
                </Button>
                <ButtonLink to="/browse">Browse catalog</ButtonLink>
              </>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-fg-muted" aria-live="polite">
                <span className="font-semibold text-fg">{total}</span> results for <span className="font-semibold text-fg">“{q}”</span>
              </p>
              <ViewToggle value={view} onChange={(v) => viewModeStore.set(v)} />
            </div>
            <Tabs
              className="mt-4"
              items={[
                { value: 'all', label: 'All', count: total },
                { value: 'anime', label: 'Anime', count: anime.length },
                { value: 'characters', label: 'Characters', count: characters.length },
                { value: 'studios', label: 'Studios', count: studios.length },
              ]}
              value={category}
              onChange={setCategory}
              label="Result categories"
              idPrefix="search"
            />
            {genres.length > 0 && (category === 'all' || category === 'anime') && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-fg-subtle">Matching genres:</span>
                {genres.map((g) => (
                  <Link key={g.id} to={`/genres/${g.slug}`} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-fg-muted ring-1 ring-line hover:text-fg">
                    <Hash className="h-3 w-3" />
                    {g.name}
                  </Link>
                ))}
              </div>
            )}
            <div role="tabpanel" id={`search-panel-${category}`} className="mt-6 space-y-10">
              {(category === 'all' || category === 'anime') && anime.length > 0 && (
                <section aria-label="Anime results">
                  {category === 'all' && <h2 className="mb-4 text-lg font-semibold text-fg">Anime</h2>}
                  {view === 'grid' ? (
                    <AnimeGrid items={anime} showGenres />
                  ) : (
                    <ul className="grid gap-3 xl:grid-cols-2">
                      {anime.map((a) => (
                        <li key={a.id}>
                          <AnimeCardHorizontal anime={a} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
              {(category === 'all' || category === 'characters') && characters.length > 0 && (
                <section aria-label="Character results">
                  <h2 className="mb-4 text-lg font-semibold text-fg">Characters</h2>
                  <ul className="grid grid-cols-2 gap-4 xs:grid-cols-3 md:grid-cols-5 xl:grid-cols-6">
                    {characters.map((c) => (
                      <li key={c.id}>
                        <CharacterCard character={c} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {(category === 'all' || category === 'studios') && studios.length > 0 && (
                <section aria-label="Studio results">
                  <h2 className="mb-4 text-lg font-semibold text-fg">Studios</h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {studios.map((s) => (
                      <StudioCard key={s.id} studio={s} />
                    ))}
                  </div>
                </section>
              )}
              {category !== 'all' && category !== 'anime' && (category === 'characters' ? characters : studios).length === 0 && (
                <EmptyState compact icon={<SearchX />} title={`No ${category} found`} description={`No ${category} match “${q}”.`} />
              )}
              {category === 'anime' && anime.length === 0 && <EmptyState compact icon={<SearchX />} title="No anime found" description={`No titles match “${q}”.`} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function InitialState({ onPick }: { onPick: (q: string) => void }) {
  const recent = useRecentSearches()
  const { data: trending } = useTrending()
  const { data: genres } = useGenres()
  const suggestions = ['Celestial', 'nar', 'mecha', 'moon', 'samurai', 'idol']
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div className="space-y-8">
        {recent.length > 0 && (
          <section aria-labelledby="recent-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-heading" className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Clock className="h-4 w-4 text-fg-subtle" />
                Recent searches
              </h2>
              <button type="button" onClick={() => recentSearchesService.clear()} className="text-xs font-semibold text-fg-subtle hover:text-fg">
                Clear all
              </button>
            </div>
            <ul className="space-y-1">
              {recent.map((r) => (
                <li key={r} className="group flex items-center rounded-xl hover:bg-surface-2">
                  <button type="button" onClick={() => onPick(r)} className="flex-1 px-3 py-2 text-left text-sm text-fg-muted group-hover:text-fg">
                    {r}
                  </button>
                  <button type="button" onClick={() => recentSearchesService.remove(r)} aria-label={`Remove ${r} from recent searches`} className="mr-1 rounded-md p-1.5 text-fg-subtle hover:bg-surface-3 hover:text-fg">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section aria-labelledby="suggest-heading">
          <h2 id="suggest-heading" className="mb-3 text-sm font-semibold text-fg">
            Try searching for
          </h2>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => onPick(s)} className="rounded-full bg-surface-2 px-3.5 py-1.5 text-sm text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong">
                {s}
              </button>
            ))}
          </div>
        </section>
        <section aria-labelledby="genre-heading">
          <h2 id="genre-heading" className="mb-3 text-sm font-semibold text-fg">
            Browse by genre
          </h2>
          <div className="flex flex-wrap gap-2">
            {(genres ?? []).slice(0, 12).map((g) => (
              <Link key={g.id} to={`/genres/${g.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-fg-muted ring-1 ring-line hover:text-fg">
                <span className="h-2 w-2 rounded-full" style={{ background: `hsl(${g.hue} 85% 62%)` }} />
                {g.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section aria-labelledby="trend-heading">
        <h2 id="trend-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
          <Flame className="h-4 w-4 text-accent-soft" />
          Trending searches
        </h2>
        <ol className="grid gap-2 sm:grid-cols-2">
          {(trending ?? []).slice(0, 8).map((a, i) => (
            <li key={a.id}>
              <Link to={`/anime/${a.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2 transition-colors hover:border-line-strong">
                <span className="w-6 text-center font-display text-sm font-bold text-fg-subtle">{i + 1}</span>
                <img src={a.poster} alt="" className="h-14 w-10 rounded-md object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-fg">{a.title}</span>
                  <span className="block truncate text-xs text-fg-subtle">{a.genres.map((g) => g.name).slice(0, 2).join(' · ')}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
