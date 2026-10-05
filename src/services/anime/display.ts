import { preferencesStore } from '@/services/user/stores'
import type { Anime } from '@/types'
import type { AnimeProvider } from './AnimeProvider'

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

function applyAnime(a: WithTitles): WithTitles {
  const prefs = preferencesStore.get()
  const titles: Titles = a.titles ?? { english: a.title, romaji: a.alternativeTitle ?? a.title, native: a.nativeTitle }
  const chosen = prefs.titleLanguage === 'romaji' ? titles.romaji ?? titles.english : prefs.titleLanguage === 'native' ? titles.native ?? titles.english : titles.english
  const secondary = chosen === titles.english ? titles.romaji : titles.english
  return {
    ...a,
    titles,
    title: chosen,
    alternativeTitle: secondary && secondary !== chosen ? secondary : undefined,
    ...(prefs.dataSaver ? { poster: smallImage(a.poster), backdrop: a.backdrop ? smallImage(a.backdrop) : a.backdrop } : null),
  }
}

/** Walks a provider result (lists, pages, releases, schedule items, suggestions) and applies display preferences. */
function transform<T>(value: T, depth = 0): T {
  if (depth > 3 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => transform(v, depth + 1)) as T
  if (isAnime(value)) return applyAnime(value) as T
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) out[k] = transform(v, depth + 1)
  return out as T
}

/** Wraps a provider so every result honours the title-language and data-saver settings. */
export function withDisplayPreferences(provider: AnimeProvider): AnimeProvider {
  return new Proxy(provider, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value
      return (...args: unknown[]) => {
        const result = value.apply(target, args)
        return result instanceof Promise ? result.then((r) => transform(r)) : result
      }
    },
  })
}
