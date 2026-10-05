/**
 * Builds the in-memory demo catalog from the raw records in `src/data`.
 * Only the MockAnimeProvider imports this module — UI code never touches it.
 */
import { animeRecords, type AnimeRecord } from '@/data/anime'
import { characterRecords } from '@/data/characters'
import { celestialEclipseEpisodes, episodeTitlePool } from '@/data/episodes'
import { genreRecords } from '@/data/genres'
import { broadcastSlots } from '@/data/schedule'
import { staffNames, staffRoles } from '@/data/staff'
import { studioRecords } from '@/data/studios'
import { createBackdrop, createEpisodeThumbnail, createPoster, createPortrait } from '@/lib/artwork'
import { createRng } from '@/lib/random'
import type { Anime, ArtworkSeed, Character, Episode, Genre, ScheduleItem, StaffMember, Studio } from '@/types'

/** The demo catalog is authored relative to this date (start of Fall 2026). */
export const CATALOG_DATE = new Date('2026-10-05T12:00:00')

const DAY = 86_400_000

function addDays(iso: string, days: number) {
  return new Date(new Date(`${iso}T12:00:00`).getTime() + days * DAY).toISOString()
}

const genreMap = new Map<string, Genre>(genreRecords.map((g) => [g.slug, { ...g }]))
const studioMap = new Map<string, Studio>(studioRecords.map((s) => [s.id, { ...s }]))

function buildStaff(record: AnimeRecord): StaffMember[] {
  const rng = createRng(`${record.id}-staff`)
  return staffRoles.map((role, i) => ({ id: `${record.id}-staff-${i}`, role, name: rng.pick(staffNames) }))
}

function nextBroadcast(animeId: string): string | undefined {
  const slot = broadcastSlots[animeId]
  if (!slot) return undefined
  const base = new Date()
  const jsDay = (slot.day + 1) % 7 // our 0 = Monday → JS 1
  const [h, m] = slot.time.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  let diff = (jsDay - base.getDay() + 7) % 7
  if (diff === 0 && d.getTime() <= base.getTime()) diff = 7
  d.setDate(d.getDate() + diff)
  return d.toISOString()
}

function hydrate(record: AnimeRecord): Anime {
  const [hue, hue2, motif] = record.art
  const artwork: ArtworkSeed = { hue, hue2, motif }
  const aired = record.status === 'airing' ? record.episodesAired ?? 0 : record.episodes ?? 0
  const updatedAt =
    record.status === 'airing'
      ? addDays(record.airedFrom, Math.max(0, aired - 1) * 7)
      : record.status === 'upcoming'
        ? addDays('2026-09-20', record.popularity % 10)
        : addDays(record.airedTo ?? record.airedFrom, 0)
  return {
    id: record.id,
    slug: record.id,
    title: record.title,
    alternativeTitle: record.alternativeTitle,
    nativeTitle: record.nativeTitle,
    description: record.description,
    synopsisShort: record.description.split('. ')[0] + '.',
    poster: createPoster(artwork, record.title, record.alternativeTitle),
    backdrop: createBackdrop(artwork, record.title),
    rating: record.rating || undefined,
    ratingCount: record.ratingCount || undefined,
    popularity: record.popularity,
    year: record.year,
    season: record.season,
    status: record.status,
    type: record.type,
    episodes: record.episodes,
    episodesAired: record.status === 'airing' ? record.episodesAired : record.status === 'upcoming' ? 0 : record.episodes,
    duration: record.duration,
    ageRating: record.ageRating,
    genres: record.genres.map((slug) => genreMap.get(slug)).filter((g): g is Genre => Boolean(g)),
    studios: record.studios.map((id) => studioMap.get(id)).filter((s): s is Studio => Boolean(s)),
    languages: record.languages ?? ['Japanese'],
    quality: record.quality ?? 'FHD',
    airedFrom: record.airedFrom,
    airedTo: record.airedTo,
    updatedAt,
    nextEpisodeAt: record.status === 'airing' ? nextBroadcast(record.id) : undefined,
    tags: record.tags,
    staff: buildStaff(record),
    relatedIds: record.related,
    trailerAvailable: true,
    featured: record.featured,
    artwork,
  }
}

export const animeList: Anime[] = animeRecords.map(hydrate)

// Ranks (by rating) and aggregate counts.
animeList
  .filter((a) => a.rating)
  .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  .forEach((a, i) => (a.rank = i + 1))

for (const genre of genreMap.values()) genre.animeCount = animeList.filter((a) => a.genres.some((g) => g.slug === genre.slug)).length
for (const studio of studioMap.values()) studio.animeCount = animeList.filter((a) => a.studios.some((s) => s.id === studio.id)).length

export const animeById = new Map(animeList.map((a) => [a.id, a]))
export const genres: Genre[] = [...genreMap.values()]
export const studios: Studio[] = [...studioMap.values()]

export const characters: Character[] = characterRecords.map(({ hue, ...c }) => ({
  ...c,
  image: createPortrait(hue, c.id),
}))

/* ---------------------------------------------------------------------------
 * Episodes (generated lazily per title and cached)
 * ------------------------------------------------------------------------ */

const episodeCache = new Map<string, Episode[]>()

const synopsisTemplates: ((title: string) => string)[] = [
  (t: string) => `${t} — tensions rise as old allies question where their loyalties really lie.`,
  () => `A quiet episode turns dangerous when an unexpected visitor brings news from the capital.`,
  () => `With the deadline closing in, the team splits up to chase two very different leads.`,
  (t: string) => `Memories of the past resurface, and a long-kept secret finally comes to light in “${t}”.`,
  () => `An all-out confrontation forces everyone to decide what they are willing to lose.`,
  () => `A breather episode full of small moments — until the final scene changes everything.`,
]

export function getEpisodesFor(anime: Anime): Episode[] {
  const cached = episodeCache.get(anime.id)
  if (cached) return cached
  const total = anime.episodes ?? 0
  const rng = createRng(`${anime.id}-episodes`)
  const pool = [...episodeTitlePool].sort(() => rng.next() - 0.5)
  const aired = anime.episodesAired ?? 0
  const list: Episode[] = []
  for (let n = 1; n <= total; n++) {
    const title =
      anime.id === 'celestial-eclipse'
        ? celestialEclipseEpisodes[n - 1]
        : anime.type === 'Movie'
          ? anime.title
          : pool[(n - 1) % pool.length]
    const cour = anime.episodes && anime.episodes > 26 ? Math.ceil(n / 26) : 1
    list.push({
      id: `${anime.id}-e${n}`,
      animeId: anime.id,
      number: n,
      season: cour,
      title,
      synopsis: synopsisTemplates[(n + anime.title.length) % synopsisTemplates.length](title),
      airDate: addDays(anime.airedFrom ?? '2026-01-01', (n - 1) * 7),
      duration: (anime.duration ?? 24) * 60,
      thumbnail: anime.artwork ? createEpisodeThumbnail(anime.artwork, anime.title, n) : anime.backdrop ?? anime.poster,
      filler: anime.episodes !== undefined && anime.episodes > 40 && n % 11 === 0,
      locked: n > aired,
    })
  }
  episodeCache.set(anime.id, list)
  return list
}

/* ---------------------------------------------------------------------------
 * Schedule
 * ------------------------------------------------------------------------ */

export function buildSchedule(now = new Date()): ScheduleItem[] {
  const today = (now.getDay() + 6) % 7
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  return Object.entries(broadcastSlots)
    .map(([animeId, slot]) => {
      const anime = animeById.get(animeId)
      if (!anime) return null
      const [h, m] = slot.time.split(':').map(Number)
      const slotMinutes = h * 60 + m
      const isPast = slot.day < today || (slot.day === today && slotMinutes <= minutesNow)
      const soon = slot.day === today && slotMinutes > minutesNow && slotMinutes - minutesNow <= 180
      const aired = anime.episodesAired ?? 0
      const item: ScheduleItem = {
        id: `sch-${animeId}`,
        animeId,
        anime,
        day: slot.day,
        time: slot.time,
        episode: Math.min(anime.episodes ?? aired + 1, isPast ? Math.max(aired, 1) : aired + 1),
        status: slot.delayed ? 'delayed' : isPast ? 'aired' : soon ? 'airing-soon' : 'upcoming',
      }
      return item
    })
    .filter((x): x is ScheduleItem => x !== null)
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
}
