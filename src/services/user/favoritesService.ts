import { emitActivity } from './activity'
import { favoritesStore } from './stores'

export const favoritesService = {
  list: () => favoritesStore.get(),
  has: (animeId: string) => favoritesStore.get().includes(animeId),
  toggle(animeId: string): boolean {
    const isFav = favoritesStore.get().includes(animeId)
    favoritesStore.set((ids) => (isFav ? ids.filter((id) => id !== animeId) : [animeId, ...ids]))
    if (!isFav) emitActivity({ kind: 'favorite', animeId })
    return !isFav
  },
}
