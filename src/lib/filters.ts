import { t } from '@/i18n'
import type { Anime, AnimeFilters, Paginated, SortOption } from '@/types'

/**
 * Reusable, framework-agnostic filter / sort / paginate engine.
 * Used by the mock provider and by client-side collections (watchlist, season pages).
 */
export function filterAnime(list: Anime[], filters: AnimeFilters): Anime[] {
  const q = filters.query?.trim().toLowerCase()
  return list.filter((a) => {
    if (q) {
      const haystack = [a.title, a.alternativeTitle, a.nativeTitle, ...a.genres.map((g) => g.name), ...a.studios.map((s) => s.name)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (filters.genres?.length && !filters.genres.every((slug) => a.genres.some((g) => g.slug === slug))) return false
    if (filters.year && a.year !== filters.year) return false
    if (filters.season && a.season !== filters.season) return false
    if (filters.status && a.status !== filters.status) return false
    if (filters.type && a.type !== filters.type) return false
    if (filters.minRating && (a.rating ?? 0) < filters.minRating) return false
    if (filters.language && !a.languages.includes(filters.language)) return false
    if (filters.studio && !a.studios.some((s) => s.id === filters.studio)) return false
    return true
  })
}

const byTitle = (a: Anime, b: Anime) => a.title.localeCompare(b.title)
const date = (a: Anime) => new Date(a.airedFrom ?? `${a.year ?? 1970}-01-01`).getTime()

export function sortAnime(list: Anime[], sort: SortOption = 'popularity'): Anime[] {
  const copy = [...list]
  switch (sort) {
    case 'rating':
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    case 'newest':
      return copy.sort((a, b) => date(b) - date(a))
    case 'oldest':
      return copy.sort((a, b) => date(a) - date(b))
    case 'title-asc':
      return copy.sort(byTitle)
    case 'title-desc':
      return copy.sort((a, b) => byTitle(b, a))
    case 'updated':
      return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    case 'episodes':
      return copy.sort((a, b) => (b.episodes ?? 0) - (a.episodes ?? 0))
    case 'popularity':
    default:
      return copy.sort((a, b) => b.popularity - a.popularity)
  }
}

export function paginate<T>(items: T[], page = 1, perPage = 24): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage))
  const safePage = Math.min(Math.max(1, page), totalPages)
  return {
    items: items.slice((safePage - 1) * perPage, safePage * perPage),
    page: safePage,
    perPage,
    total: items.length,
    totalPages,
  }
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popularity', label: t('Popularity') },
  { value: 'rating', label: t('Rating') },
  { value: 'newest', label: t('Newest') },
  { value: 'oldest', label: t('Oldest') },
  { value: 'title-asc', label: t('A–Z') },
  { value: 'title-desc', label: t('Z–A') },
  { value: 'updated', label: t('Recently Updated') },
  { value: 'episodes', label: t('Episodes') },
]
