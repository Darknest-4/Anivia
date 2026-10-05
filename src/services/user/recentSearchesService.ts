import { recentSearchesStore } from './stores'

export const recentSearchesService = {
  list: () => recentSearchesStore.get(),
  add(query: string) {
    const q = query.trim()
    if (q.length < 2) return
    recentSearchesStore.set((items) => [q, ...items.filter((i) => i.toLowerCase() !== q.toLowerCase())].slice(0, 8))
  },
  remove: (query: string) => recentSearchesStore.set((items) => items.filter((i) => i !== query)),
  clear: () => recentSearchesStore.set([]),
}
