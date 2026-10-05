import { preferencesStore } from '@/services/user/stores'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AnimeStatus, AnimeType, AudioLanguage, BrowseQuery, SeasonName, SortOption } from '@/types'

/** Two-way binding between BrowseQuery and the URL so every filtered view is shareable. */
export function useBrowseParams(defaults: Partial<BrowseQuery> = {}) {
  const [params, setParams] = useSearchParams()

  const query: BrowseQuery = useMemo(
    () => ({
      query: params.get('q') ?? undefined,
      genres: params.get('genres')?.split(',').filter(Boolean) ?? defaults.genres,
      year: params.get('year') ? Number(params.get('year')) : defaults.year,
      season: (params.get('season') as SeasonName) ?? defaults.season,
      status: (params.get('status') as AnimeStatus) ?? defaults.status,
      type: (params.get('type') as AnimeType) ?? defaults.type,
      minRating: params.get('rating') ? Number(params.get('rating')) : undefined,
      language: (params.get('lang') as AudioLanguage) ?? undefined,
      sort: (params.get('sort') as SortOption) ?? defaults.sort ?? preferencesStore.get().defaultSort,
      page: Number(params.get('page') ?? 1),
      perPage: Number(params.get('per') ?? defaults.perPage ?? preferencesStore.get().pageSize),
    }),
    [params],
  )

  const update = useCallback(
    (patch: Partial<BrowseQuery>, resetPage = true) => {
      const next = { ...query, ...patch, ...(resetPage && !('page' in patch) ? { page: 1 } : {}) }
      const p = new URLSearchParams()
      if (next.query) p.set('q', next.query)
      if (next.genres?.length) p.set('genres', next.genres.join(','))
      if (next.year) p.set('year', String(next.year))
      if (next.season) p.set('season', next.season)
      if (next.status) p.set('status', next.status)
      if (next.type) p.set('type', next.type)
      if (next.minRating) p.set('rating', String(next.minRating))
      if (next.language) p.set('lang', next.language)
      if (next.sort && next.sort !== preferencesStore.get().defaultSort) p.set('sort', next.sort)
      if (next.page && next.page > 1) p.set('page', String(next.page))
      if (next.perPage && next.perPage !== preferencesStore.get().pageSize) p.set('per', String(next.perPage))
      setParams(p, { replace: true })
    },
    [query, setParams],
  )

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  return { query, update, reset }
}
