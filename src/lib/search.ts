import type { Anime, Character, Genre, Studio } from '@/types'

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/**
 * Relevance score for a text field: exact > prefix > word-prefix > substring.
 * Returns 0 when there is no match.
 */
export function scoreText(text: string | undefined, query: string): number {
  if (!text) return 0
  const t = normalize(text)
  const q = normalize(query)
  if (!q) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.split(/[\s\-:&.,]+/).some((w) => w.startsWith(q))) return 60
  if (t.includes(q)) return 40
  return 0
}

export interface SearchIndexContext {
  characters: Character[]
}

/** Client-side relevance search across title, alt title, genre, studio, character and description. */
export function searchAnime(list: Anime[], query: string, ctx: SearchIndexContext): Anime[] {
  const q = query.trim()
  if (!q) return []
  const scored = list
    .map((a) => {
      const chars = ctx.characters.filter((c) => c.animeId === a.id)
      const score = Math.max(
        scoreText(a.title, q) * 1.5,
        scoreText(a.alternativeTitle, q) * 1.2,
        scoreText(a.nativeTitle, q),
        ...a.genres.map((g) => scoreText(g.name, q) * 0.7),
        ...a.studios.map((s) => scoreText(s.name, q) * 0.7),
        ...chars.map((c) => scoreText(c.name, q) * 0.8),
        ...(a.tags ?? []).map((t) => scoreText(t, q) * 0.6),
        scoreText(a.description, q) * 0.4,
      )
      return { a, score: score + Math.log10(a.popularity + 1) }
    })
    .filter((x) => x.score > Math.log10(x.a.popularity + 1))
  return scored.sort((x, y) => y.score - x.score).map((x) => x.a)
}

export const matchGenres = (genres: Genre[], q: string) => genres.filter((g) => scoreText(g.name, q) > 0)
export const matchStudios = (studios: Studio[], q: string) => studios.filter((s) => scoreText(s.name, q) > 0)
export const matchCharacters = (chars: Character[], q: string) =>
  chars.filter((c) => scoreText(c.name, q) > 0 || scoreText(c.nativeName, q) > 0)
