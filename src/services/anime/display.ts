import { preferencesStore } from '@/services/user/stores'
import type { Anime } from '@/types'
import type { AnimeProvider } from './AnimeProvider'
import { mediaEnabled, mediaFor, resolveMedia } from './media'

type Titles = { english: string; romaji?: string; native?: string }
type WithTitles = Anime & { titles?: Titles }

const isAnime = (v: unknown): v is WithTitles =>
  typeof v === 'object' && v !== null && 'poster' in v && 'title' in v && 'genres' in v && 'status' in v

/** Smaller image variants for the data-saver setting. */
function smallImage(url: string) {
  return url
    .replace('/media/anime/cover/large/', '/media/anime/cover/medium/') // AniList extraLarge → large
    .replace(/(\/images\/anime\/\d+\/\d+)l\.(jpg|webp)$/, '$1.$2') // MyAnimeList large → regular
}

function applyAnime(a: WithTitles, r2: boolean): WithTitles {
  const prefs = preferencesStore.get()
  // R2 copies (full size) are skipped in data-saver mode.
  const media = r2 && !prefs.dataSaver ? mediaFor(a.id) : null
  const titles: Titles = a.titles ?? { english: a.title, romaji: a.alternativeTitle ?? a.title, native: a.nativeTitle }
  const chosen = prefs.titleLanguage === 'romaji' ? titles.romaji ?? titles.english : prefs.titleLanguage === 'native' ? titles.native ?? titles.english : titles.english
  const secondary = chosen === titles.english ? titles.romaji : titles.english
  return {
    ...a,
    titles,
    title: chosen,
    alternativeTitle: secondary && secondary !== chosen ? secondary : undefined,
    ...(prefs.dataSaver ? { poster: smallImage(a.poster), backdrop: a.backdrop ? smallImage(a.backdrop) : a.backdrop } : null),
    ...(media?.cover ? { poster: media.cover } : null),
    // Keep a richer backdrop (e.g. ani.zip fanart on detail pages) unless the title only had its cover as backdrop.
    ...(media?.banner && (!a.backdrop || a.backdrop === a.poster || /anilistcdn|anili\.st/.test(a.backdrop)) ? { backdrop: media.banner } : null),
  }
}

/** Walks a provider result (lists, pages, releases, schedule items, suggestions) and applies display preferences. */
function transform<T>(value: T, r2: boolean, depth = 0): T {
  if (depth > 3 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => transform(v, r2, depth + 1)) as T
  if (isAnime(value)) return applyAnime(value, r2) as T
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) out[k] = transform(v, r2, depth + 1)
  return out as T
}

/** Anime ids anywhere in a provider result. */
function collectIds(value: unknown, out: string[], depth = 0) {
  if (depth > 3 || value === null || typeof value !== 'object') return out
  if (Array.isArray(value)) value.forEach((v) => collectIds(v, out, depth + 1))
  else if (isAnime(value)) out.push(value.id)
  else Object.values(value).forEach((v) => collectIds(v, out, depth + 1))
  return out
}

/**
 * Wraps a provider so every result honours the title-language and data-saver settings.
 * With `r2Images` (AniList ids), covers/banners are swapped for the R2 copies when available.
 */
export function withDisplayPreferences(provider: AnimeProvider, r2Images = false): AnimeProvider {
  return new Proxy(provider, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value
      return (...args: unknown[]) => {
        const result = value.apply(target, args)
        if (!(result instanceof Promise)) return result
        return result.then(async (r) => {
          const r2 = r2Images && mediaEnabled() && !preferencesStore.get().dataSaver
          if (r2) await resolveMedia(collectIds(r, []))
          return transform(r, r2)
        })
      }
    },
  })
}
