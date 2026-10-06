import { config } from '@/config'
import { withinMs } from './anizip'

/**
 * Covers and banners hosted in the R2 bucket (media.animehub.hu).
 * The Worker (`/api/media?ids=…`) maps AniList ids to the files in each `<id>/` folder;
 * results are remembered for the session so each id is looked up once.
 */
export interface MediaImages {
  cover: string | null
  banner: string | null
}

const known = new Map<string, MediaImages | null>()
const pending = new Map<string, Promise<void>>()
let disabled = !config.mediaApi

async function fetchBatch(ids: string[]) {
  const res = await fetch(`${config.mediaApi}?ids=${ids.join(',')}`, { headers: { accept: 'application/json' } })
  if (res.status === 503 || res.status === 404) {
    disabled = true // bucket not bound to this deployment
    return
  }
  if (!res.ok) return
  const data = (await res.json()) as Record<string, MediaImages | null>
  for (const id of ids) known.set(id, data[id] ?? null)
}

/** Looks up the given AniList ids (waits at most `ms`; slow lookups finish in the background). */
export async function resolveMedia(ids: string[], ms = 1500): Promise<Map<string, MediaImages | null>> {
  if (disabled) return known
  const missing = [...new Set(ids)].filter((id) => /^\d+$/.test(id) && !known.has(id) && !pending.has(id))
  for (let i = 0; i < missing.length; i += 60) {
    const chunk = missing.slice(i, i + 60)
    const p = fetchBatch(chunk)
      .catch(() => undefined)
      .finally(() => chunk.forEach((id) => pending.delete(id)))
    chunk.forEach((id) => pending.set(id, p))
  }
  const waiting = [...new Set(ids.map((id) => pending.get(id)).filter(Boolean))]
  if (waiting.length) await withinMs(Promise.all(waiting), ms)
  return known
}

export const mediaFor = (id: string) => known.get(id) ?? null
export const mediaEnabled = () => !disabled
