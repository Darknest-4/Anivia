/** Route chunks that are worth warming up before the user clicks. */
export const preloadRoute = {
  details: () => import('@/pages/anime/AnimeDetailsPage'),
  watch: () => import('@/pages/anime/WatchPage'),
  browse: () => import('@/pages/catalog/BrowsePage'),
  search: () => import('@/pages/catalog/SearchPage'),
  schedule: () => import('@/pages/catalog/SchedulePage'),
}

/** After the first page is interactive, quietly download the most-used route chunks. */
export function preloadCommonRoutes() {
  const idle = (cb: () => void) =>
    typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 2500)
  idle(() => {
    void preloadRoute.details()
    void preloadRoute.browse()
    void preloadRoute.search()
  })
}
