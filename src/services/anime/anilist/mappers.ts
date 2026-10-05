import type { Anime, AnimeStatus, AnimeType, Character, SeasonName, Studio } from '@/types'
import { genreFromName, isExcludedGenre } from '../shared/genres'
import { cleanDescription, firstSentence, fuzzyDate, hueFromString } from '../shared/text'
import type { AlCharacter, AlMedia, AlStudio } from './types'

const STATUS: Record<string, AnimeStatus> = {
  FINISHED: 'finished',
  RELEASING: 'airing',
  NOT_YET_RELEASED: 'upcoming',
  CANCELLED: 'finished',
  HIATUS: 'hiatus',
}
const FORMAT: Record<string, AnimeType> = { TV: 'TV', TV_SHORT: 'TV', MOVIE: 'Movie', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Special', MUSIC: 'Special' }

export const toAnilistStatus = { airing: 'RELEASING', finished: 'FINISHED', upcoming: 'NOT_YET_RELEASED', hiatus: 'HIATUS' } as const
export const toAnilistFormats: Record<AnimeType, string[]> = { TV: ['TV', 'TV_SHORT'], Movie: ['MOVIE'], OVA: ['OVA'], ONA: ['ONA'], Special: ['SPECIAL', 'MUSIC'] }

export function mapStudio(s: { id: number; name: string } & Partial<AlStudio>): Studio {
  return {
    id: String(s.id),
    name: s.name,
    description: s.isAnimationStudio === false ? 'Production company' : '',
    logoHue: hueFromString(s.name),
    animeCount: s.media?.pageInfo?.total,
  }
}

export function mapMedia(m: AlMedia): Anime {
  const description = cleanDescription(m.description)
  const status = STATUS[m.status ?? ''] ?? 'finished'
  const aired = m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : status === 'finished' ? m.episodes ?? undefined : status === 'upcoming' ? 0 : undefined
  const poster = m.coverImage.extraLarge ?? m.coverImage.large ?? ''
  return {
    id: String(m.id),
    slug: String(m.id),
    title: m.title.english ?? m.title.romaji ?? m.title.native ?? 'Untitled',
    alternativeTitle: m.title.english && m.title.romaji && m.title.english !== m.title.romaji ? m.title.romaji : undefined,
    nativeTitle: m.title.native ?? undefined,
    description,
    synopsisShort: firstSentence(description),
    poster,
    backdrop: m.bannerImage ?? poster,
    rating: m.averageScore ? m.averageScore / 10 : undefined,
    popularity: m.popularity ?? 0,
    rank: m.rankings?.find((r) => r.type === 'RATED' && r.allTime)?.rank,
    year: m.seasonYear ?? m.startDate?.year ?? undefined,
    season: (m.season?.toLowerCase() as SeasonName | undefined) ?? undefined,
    status,
    type: FORMAT[m.format ?? ''] ?? 'TV',
    episodes: m.episodes ?? undefined,
    episodesAired: aired,
    duration: m.duration ?? undefined,
    genres: (m.genres ?? []).filter((g) => !isExcludedGenre(g)).map((g) => genreFromName(g)),
    studios: (m.studios?.nodes ?? []).map(mapStudio),
    languages: [],
    airedFrom: fuzzyDate(m.startDate),
    airedTo: fuzzyDate(m.endDate),
    updatedAt: m.updatedAt ? new Date(m.updatedAt * 1000).toISOString() : new Date().toISOString(),
    nextEpisodeAt: m.nextAiringEpisode ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() : undefined,
    tags: (m.tags ?? [])
      .filter((t) => !t.isMediaSpoiler && t.rank >= 60)
      .slice(0, 6)
      .map((t) => t.name),
    staff: m.staff?.edges.map((e) => ({ id: `${m.id}-${e.node.id}-${e.role}`, name: e.node.name.full, role: e.role })),
    relatedIds: m.relations?.edges.filter((e) => e.node.type === 'ANIME').map((e) => String(e.node.id)),
    featured: Boolean(m.bannerImage),
    trailer: m.trailer?.site === 'youtube' && m.trailer.id ? { youtubeId: m.trailer.id, thumbnail: m.trailer.thumbnail ?? undefined } : undefined,
    watchLinks: (m.externalLinks ?? [])
      .filter((l) => l.type === 'STREAMING' && l.url && !l.isDisabled)
      .map((l) => ({ name: l.site, url: l.url!, color: l.color ?? undefined, icon: l.icon ?? undefined })),
  }
}

const ROLE: Record<string, Character['role']> = { MAIN: 'Main', SUPPORTING: 'Supporting', BACKGROUND: 'Supporting' }

export function mapCharacter(
  c: AlCharacter,
  ctx?: { role?: string; voiceActor?: string; voiceActorEn?: string; animeId?: string; animeTitle?: string },
): Character {
  const edge = c.media?.edges[0]
  return {
    id: String(c.id),
    name: c.name.full,
    nativeName: c.name.native ?? undefined,
    role: ROLE[ctx?.role ?? edge?.characterRole ?? ''] ?? 'Supporting',
    animeId: ctx?.animeId ?? (edge ? String(edge.node.id) : ''),
    animeTitle: ctx?.animeTitle ?? edge?.node.title.english ?? edge?.node.title.romaji ?? undefined,
    description: cleanDescription(c.description) || 'No biography available yet.',
    voiceActor: ctx?.voiceActor ?? edge?.voiceActors[0]?.name.full ?? '—',
    voiceActorEn: ctx?.voiceActorEn ?? edge?.en[0]?.name.full,
    age: c.age ?? undefined,
    favorites: c.favourites ?? 0,
    image: c.image.large ?? '',
  }
}
