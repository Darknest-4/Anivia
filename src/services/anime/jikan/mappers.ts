import type { AgeRating, Anime, AnimeStatus, AnimeType, Character, SeasonName, Studio } from '@/types'
import { nextJstBroadcast } from '../shared/dates'
import { genreFromJikan, isExcludedGenre } from '../shared/genres'
import { cleanDescription, firstSentence, hueFromString } from '../shared/text'
import type { JkAnime, JkCharacter, JkImages, JkProducer } from './types'

const STATUS: Record<string, AnimeStatus> = { 'Finished Airing': 'finished', 'Currently Airing': 'airing', 'Not yet aired': 'upcoming' }
const TYPE: Record<string, AnimeType> = { TV: 'TV', Movie: 'Movie', OVA: 'OVA', ONA: 'ONA', Special: 'Special', 'TV Special': 'Special', Music: 'Special', CM: 'Special', PV: 'Special' }
const RATING: Record<string, AgeRating> = { G: 'G', PG: 'PG', 'PG-13': 'PG-13', R: 'R', 'R+': 'R+' }

export const toJikanStatus = { airing: 'airing', finished: 'complete', upcoming: 'upcoming', hiatus: 'airing' } as const
export const toJikanType: Record<AnimeType, string> = { TV: 'tv', Movie: 'movie', OVA: 'ova', ONA: 'ona', Special: 'special' }

export const image = (i: JkImages | undefined) => i?.webp?.large_image_url ?? i?.jpg?.large_image_url ?? i?.webp?.image_url ?? i?.jpg?.image_url ?? ''

function minutes(duration: string | null) {
  if (!duration) return undefined
  const h = /(\d+)\s*hr/.exec(duration)
  const m = /(\d+)\s*min/.exec(duration)
  const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0)
  return total || undefined
}

export function mapStudio(s: { mal_id: number; name: string }): Studio {
  return { id: String(s.mal_id), name: s.name, description: '', logoHue: hueFromString(s.name) }
}

export function mapProducer(p: JkProducer): Studio {
  const name = p.titles.find((t) => t.type === 'Default')?.title ?? p.titles[0]?.title ?? 'Studio'
  return {
    id: String(p.mal_id),
    name,
    founded: p.established ? new Date(p.established).getFullYear() : undefined,
    description: cleanDescription(p.about),
    logoHue: hueFromString(name),
    animeCount: p.count ?? undefined,
  }
}

export function mapAnime(a: JkAnime): Anime {
  const status = STATUS[a.status ?? ''] ?? 'finished'
  const description = cleanDescription(a.synopsis)
  const poster = image(a.images)
  const next = status === 'airing' ? nextJstBroadcast(a.broadcast?.day, a.broadcast?.time) : undefined
  // Jikan does not expose an aired-episode count; estimate it from the weekly broadcast.
  let aired: number | undefined = status === 'finished' ? a.episodes ?? undefined : status === 'upcoming' ? 0 : undefined
  if (status === 'airing' && a.aired?.from) {
    const weeks = Math.floor((Date.now() - new Date(a.aired.from).getTime()) / (7 * 86_400_000)) + 1
    aired = Math.max(1, a.episodes ? Math.min(a.episodes, weeks) : weeks)
  }
  const genres = [...(a.genres ?? []), ...(a.themes ?? [])].filter((g) => !isExcludedGenre(g.name))
  return {
    id: String(a.mal_id),
    slug: String(a.mal_id),
    title: a.title_english ?? a.title,
    alternativeTitle: a.title_english && a.title_english !== a.title ? a.title : undefined,
    nativeTitle: a.title_japanese ?? undefined,
    description,
    synopsisShort: firstSentence(description),
    poster,
    backdrop: a.trailer?.images?.maximum_image_url ?? poster,
    rating: a.score ?? undefined,
    ratingCount: a.scored_by ?? undefined,
    popularity: a.members ?? 0,
    rank: a.rank ?? undefined,
    year: a.year ?? (a.aired?.from ? new Date(a.aired.from).getFullYear() : undefined),
    season: (a.season as SeasonName | null) ?? undefined,
    status,
    type: TYPE[a.type ?? ''] ?? 'TV',
    episodes: a.episodes ?? undefined,
    episodesAired: aired,
    duration: minutes(a.duration),
    ageRating: RATING[(a.rating ?? '').split(' - ')[0]],
    genres: genres.map((g) => genreFromJikan(g)),
    studios: (a.studios ?? []).map(mapStudio),
    languages: [],
    airedFrom: a.aired?.from ?? undefined,
    airedTo: a.aired?.to ?? undefined,
    updatedAt: next ? new Date(next.getTime() - 7 * 86_400_000).toISOString() : a.aired?.to ?? a.aired?.from ?? new Date().toISOString(),
    nextEpisodeAt: next?.toISOString(),
    tags: (a.demographics ?? []).map((d) => d.name),
    relatedIds: a.relations?.flatMap((r) => r.entry.filter((e) => e.type === 'anime').map((e) => String(e.mal_id))),
    featured: Boolean(a.trailer?.images?.maximum_image_url),
  }
}

/** Minimal Anime for endpoints that only return `{ mal_id, title, images }`. */
export function mapEntry(e: { mal_id: number; title: string; images: JkImages }): Anime {
  const poster = image(e.images)
  return {
    id: String(e.mal_id),
    slug: String(e.mal_id),
    title: e.title,
    description: '',
    poster,
    backdrop: poster,
    popularity: 0,
    status: 'airing',
    type: 'TV',
    genres: [],
    studios: [],
    languages: [],
    updatedAt: new Date().toISOString(),
  }
}

const ROLE: Record<string, Character['role']> = { Main: 'Main', Supporting: 'Supporting' }

export function mapCharacter(c: JkCharacter, ctx?: { role?: string; voiceActor?: string; animeId?: string; animeTitle?: string }): Character {
  const appearance = c.anime?.[0]
  const jp = c.voices?.find((v) => v.language === 'Japanese')?.person.name
  const en = c.voices?.find((v) => v.language === 'English')?.person.name
  return {
    id: String(c.mal_id),
    name: c.name,
    nativeName: c.name_kanji ?? undefined,
    role: ROLE[ctx?.role ?? appearance?.role ?? ''] ?? 'Supporting',
    animeId: ctx?.animeId ?? (appearance ? String(appearance.anime.mal_id) : ''),
    animeTitle: ctx?.animeTitle ?? appearance?.anime.title,
    description: cleanDescription(c.about) || 'No biography available yet.',
    voiceActor: ctx?.voiceActor ?? jp ?? '—',
    voiceActorEn: en,
    favorites: c.favorites ?? 0,
    image: image(c.images),
  }
}
