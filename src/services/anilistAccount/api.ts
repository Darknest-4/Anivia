import { config } from '@/config'
import { createRequestQueue } from '@/services/anime/shared/requestQueue'
import { anilistAuthStore } from './store'

// Authenticated calls always go straight to AniList (never through the shared edge cache).
const queue = createRequestQueue({ minInterval: 700, perMinute: 60, retries: 2, cacheTtl: 0 })

export class AniListAuthError extends Error {}

export async function anilistAuthed<T>(query: string, variables: Record<string, unknown> = {}, token = anilistAuthStore.get()?.token): Promise<T> {
  if (!token) throw new AniListAuthError('Not connected to AniList')
  const res = await queue.request<{ data?: T; errors?: { message: string; status?: number }[] } | null>(
    config.anilistUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    },
    `${Math.random()}`,
  ).catch((err: { status?: number; message?: string }) => {
    if (err?.status === 401 || /invalid token|unauthori[sz]ed/i.test(err?.message ?? '')) {
      anilistAuthStore.set(null)
      throw new AniListAuthError('Your AniList session expired — please connect again.')
    }
    throw err
  })
  if (!res) throw new Error('Empty AniList response')
  if (res.errors?.length && !res.data) {
    if (res.errors.some((e) => e.status === 401 || /invalid token/i.test(e.message))) {
      anilistAuthStore.set(null)
      throw new AniListAuthError('Your AniList session expired — please connect again.')
    }
    throw new Error(res.errors[0].message)
  }
  return res.data as T
}

export const VIEWER = `query { Viewer { id name siteUrl avatar { large } unreadNotificationCount } }`
