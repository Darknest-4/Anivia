import type { Anime, Episode } from '@/types'
import { weeklyDate } from './dates'

export interface EpisodeHint {
  title?: string
  airDate?: string
  filler?: boolean
  thumbnail?: string
  synopsis?: string
  /** Seconds */
  duration?: number
}

/**
 * Builds a complete episode list for a title: every known/planned episode, with
 * real titles, dates and thumbnails where an API supplied them, and episodes that
 * have not aired yet marked as `locked`.
 */
export function buildEpisodes(anime: Anime, hints: Map<number, EpisodeHint>, max = 2000): Episode[] {
  const known = hints.size ? Math.max(...hints.keys()) : 0
  const airedKnown = [...hints.entries()].filter(([, h]) => h.airDate && new Date(h.airDate).getTime() <= Date.now() + 3_600_000).length
  const aired = anime.episodesAired ?? (anime.status === 'finished' ? anime.episodes ?? known : airedKnown || known)
  const total = Math.min(max, Math.max(anime.episodes ?? 0, aired, known, anime.status === 'upcoming' ? 0 : 1))
  const list: Episode[] = []
  for (let n = 1; n <= total; n++) {
    const hint = hints.get(n)
    list.push({
      id: `${anime.id}-e${n}`,
      animeId: anime.id,
      number: n,
      season: 1,
      title: hint?.title || (anime.type === 'Movie' && total === 1 ? anime.title : `Episode ${n}`),
      synopsis: hint?.synopsis ?? '',
      airDate: hint?.airDate || weeklyDate(anime.airedFrom, n - 1),
      duration: hint?.duration ?? (anime.duration ?? 24) * 60,
      thumbnail: hint?.thumbnail || anime.backdrop || anime.poster,
      filler: hint?.filler,
      // Locked until it airs (ani.zip air dates are exact; otherwise use the aired count).
      locked: hint?.airDate ? new Date(hint.airDate).getTime() > Date.now() + 3_600_000 : n > aired,
    })
  }
  return list
}
