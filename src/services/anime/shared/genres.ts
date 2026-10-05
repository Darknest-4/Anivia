import { genreRecords } from '@/data/genres'
import type { Genre } from '@/types'
import { hueFromString, slugify } from './text'

/**
 * Cross-API genre registry. Maps ANIVIA genre slugs to AniList genre/tag names
 * and Jikan (MyAnimeList) genre/theme ids. Descriptions and colors come from `src/data/genres.ts`.
 */
interface GenreDef {
  slug: string
  /** AniList `genre` value — or a tag (`anilistTag`) when AniList has no such genre. */
  anilist?: string
  anilistTag?: string
  jikanId?: number
  /** Alternative names used by the APIs. */
  aliases?: string[]
}

const DEFS: GenreDef[] = [
  { slug: 'action', anilist: 'Action', jikanId: 1 },
  { slug: 'adventure', anilist: 'Adventure', jikanId: 2 },
  { slug: 'comedy', anilist: 'Comedy', jikanId: 4 },
  { slug: 'drama', anilist: 'Drama', jikanId: 8 },
  { slug: 'fantasy', anilist: 'Fantasy', jikanId: 10 },
  { slug: 'romance', anilist: 'Romance', jikanId: 22 },
  { slug: 'sci-fi', anilist: 'Sci-Fi', jikanId: 24 },
  { slug: 'mystery', anilist: 'Mystery', jikanId: 7 },
  { slug: 'horror', anilist: 'Horror', jikanId: 14 },
  { slug: 'sports', anilist: 'Sports', jikanId: 30 },
  { slug: 'slice-of-life', anilist: 'Slice of Life', jikanId: 36 },
  { slug: 'thriller', anilist: 'Thriller', jikanId: 41, aliases: ['Suspense'] },
  { slug: 'mecha', anilist: 'Mecha', jikanId: 18 },
  { slug: 'supernatural', anilist: 'Supernatural', jikanId: 37 },
  { slug: 'psychological', anilist: 'Psychological', jikanId: 40 },
  { slug: 'music', anilist: 'Music', jikanId: 19 },
  { slug: 'historical', anilistTag: 'Historical', jikanId: 13 },
  { slug: 'mahou-shoujo', anilist: 'Mahou Shoujo', jikanId: 66, aliases: ['Mahou Shojo', 'Magical Girl'] },
]

/** Explicit genres are never requested or displayed. */
export const EXCLUDED_GENRES = new Set(['hentai', 'erotica', 'ecchi'])

const recordBySlug = new Map(genreRecords.map((g) => [g.slug, g]))
const defBySlug = new Map(DEFS.map((d) => [d.slug, d]))
const slugByName = new Map<string, string>()
for (const d of DEFS) {
  for (const n of [d.anilist, d.anilistTag, ...(d.aliases ?? [])]) if (n) slugByName.set(n.toLowerCase(), d.slug)
}
const slugByJikanId = new Map(DEFS.filter((d) => d.jikanId).map((d) => [d.jikanId!, d.slug]))

function displayName(slug: string, fallback: string) {
  const def = defBySlug.get(slug)
  return recordBySlug.get(slug)?.name ?? def?.anilist ?? def?.anilistTag ?? fallback
}

/** Builds a Genre from any API genre name (unknown genres get a generated slug and color). */
export function genreFromName(name: string, count?: number): Genre {
  const slug = slugByName.get(name.toLowerCase()) ?? slugify(name)
  const record = recordBySlug.get(slug)
  return {
    id: `g-${slug}`,
    slug,
    name: displayName(slug, name),
    description: record?.description ?? `${name} anime.`,
    hue: record?.hue ?? hueFromString(slug),
    animeCount: count,
  }
}

export function genreFromJikan(g: { mal_id: number; name: string }, count?: number): Genre {
  const slug = slugByJikanId.get(g.mal_id)
  return slug ? { ...genreFromName(displayName(slug, g.name), count), slug } : genreFromName(g.name, count)
}

export const isExcludedGenre = (name: string) => EXCLUDED_GENRES.has(slugify(name))

/** Splits slugs into AniList `genre_in` and `tag_in` values. */
export function anilistGenreFilter(slugs: string[] = []) {
  const genres: string[] = []
  const tags: string[] = []
  for (const slug of slugs) {
    const def = defBySlug.get(slug)
    if (def?.anilist) genres.push(def.anilist)
    else if (def?.anilistTag) tags.push(def.anilistTag)
    else genres.push(displayName(slug, slug))
  }
  return { genres, tags }
}

export const jikanGenreIds = (slugs: string[] = []) => slugs.map((s) => defBySlug.get(s)?.jikanId).filter((n): n is number => Boolean(n))

/** Genres browsable on AniList (genres + the Historical tag). */
export const anilistBrowsableGenres = DEFS.filter((d) => d.anilist || d.anilistTag)
