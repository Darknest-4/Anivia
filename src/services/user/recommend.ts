import type { Anime, WatchlistItem, WatchProgress } from '@/types'

export interface Seed {
  id: string
  weight: number
}

/**
 * Picks the titles that best describe the viewer's taste: their highest scores first,
 * then favourites and completed titles, then whatever they watched most recently.
 */
export function pickSeeds(ratings: Record<string, number>, favorites: string[], watchlist: WatchlistItem[], history: WatchProgress[], limit = 6): Seed[] {
  const score = new Map<string, number>()
  const add = (id: string, w: number) => score.set(id, Math.max(score.get(id) ?? 0, w))
  for (const [id, r] of Object.entries(ratings)) if (r >= 7) add(id, r)
  for (const id of favorites) add(id, 8)
  for (const w of watchlist) if (w.status === 'completed') add(w.animeId, 6.5)
  for (const w of watchlist) if (w.status === 'watching') add(w.animeId, 6)
  for (const h of history.slice(0, 20)) add(h.animeId, 5)
  // Disliked titles never seed.
  for (const [id, r] of Object.entries(ratings)) if (r <= 4) score.delete(id)
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, weight]) => ({ id, weight }))
}

export interface Recommendation {
  anime: Anime
  score: number
  /** Seed titles that led here ("because you liked …"). */
  because: string[]
}

/**
 * Merges per-seed recommendation lists: titles suggested by several of your favourites,
 * matching your favourite genres and well rated, come first. Titles already in your
 * library are skipped.
 */
export function rankRecommendations(
  perSeed: { seed: Seed; seedTitle: string; items: Anime[] }[],
  exclude: Set<string>,
  genreAffinity: Map<string, number>,
  limit = 24,
): Recommendation[] {
  const merged = new Map<string, Recommendation>()
  for (const { seed, seedTitle, items } of perSeed) {
    items.forEach((a, rank) => {
      if (exclude.has(a.id)) return
      const r = merged.get(a.id) ?? { anime: a, score: 0, because: [] }
      // Earlier suggestions from stronger seeds count more.
      r.score += (seed.weight / 10) * (1 / (1 + rank * 0.15))
      if (!r.because.includes(seedTitle)) r.because.push(seedTitle)
      merged.set(a.id, r)
    })
  }
  for (const r of merged.values()) {
    const genre = r.anime.genres.reduce((s, g) => s + (genreAffinity.get(g.id) ?? 0), 0)
    r.score += Math.min(genre, 3) * 0.2 + (r.anime.rating ?? 6) * 0.05
  }
  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, limit)
}

/** Genre id → how much the viewer likes it (from scores, favourites and watchlist). */
export function genreAffinity(library: Anime[], ratings: Record<string, number>, favorites: string[]) {
  const map = new Map<string, number>()
  for (const a of library) {
    const w = ratings[a.id] ? (ratings[a.id] - 5) / 5 : favorites.includes(a.id) ? 0.8 : 0.3
    for (const g of a.genres) map.set(g.id, (map.get(g.id) ?? 0) + w)
  }
  return map
}
