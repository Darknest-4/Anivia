import { config } from '@/config'
import { anilistAuthed, VIEWER } from './api'
import { anilistAuthStore, anilistSnapshotStore } from './store'

const RETURN_KEY = 'anivia:anilist-return'
const INTENT_KEY = 'anivia:anilist-intent'

/** Why the visitor went to AniList: just connect a list, or sign in to ANIVIA with it. */
export type AniListIntent = 'connect' | 'login'

export const anilistLoginEnabled = Boolean(config.anilistClientId)

/** Sends the visitor to AniList to approve access (implicit grant — no client secret involved). */
export function connectAniList(returnTo = window.location.pathname + window.location.search, intent: AniListIntent = 'connect') {
  try {
    sessionStorage.setItem(RETURN_KEY, returnTo)
    sessionStorage.setItem(INTENT_KEY, intent)
  } catch {
    /* ignore */
  }
  const url = new URL('https://anilist.co/api/v2/oauth/authorize')
  url.searchParams.set('client_id', config.anilistClientId)
  url.searchParams.set('response_type', 'token')
  window.location.assign(url.toString())
}

/** True when the current URL carries an AniList access token in its hash. */
export const hasAniListToken = () => /(^|[#&])access_token=/.test(window.location.hash) && /token_type=bearer/i.test(window.location.hash)

/**
 * Completes the redirect from AniList: stores the token, loads the profile and returns
 * the path the user started from. The token never leaves this browser.
 */
export async function completeAniListLogin(): Promise<{ back: string; token: string; expiresIn: number; intent: AniListIntent }> {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const token = params.get('access_token')
  const expiresIn = Number(params.get('expires_in') ?? 31_536_000)
  history.replaceState(null, '', window.location.pathname + window.location.search)
  if (!token) throw new Error('AniList did not return an access token.')
  type V = { Viewer: { id: number; name: string; siteUrl: string; avatar: { large: string | null }; unreadNotificationCount: number } }
  const { Viewer } = await anilistAuthed<V>(VIEWER, {}, token)
  const previous = anilistAuthStore.get()
  if (previous && previous.userId !== Viewer.id) anilistSnapshotStore.reset()
  anilistAuthStore.set({
    token,
    expiresAt: Date.now() + expiresIn * 1000,
    userId: Viewer.id,
    name: Viewer.name,
    avatar: Viewer.avatar.large ?? undefined,
    siteUrl: Viewer.siteUrl,
    unread: Viewer.unreadNotificationCount,
  })
  let back = '/settings?tab=connections'
  let intent: AniListIntent = 'connect'
  try {
    back = sessionStorage.getItem(RETURN_KEY) || back
    intent = sessionStorage.getItem(INTENT_KEY) === 'login' ? 'login' : 'connect'
    sessionStorage.removeItem(RETURN_KEY)
    sessionStorage.removeItem(INTENT_KEY)
  } catch {
    /* ignore */
  }
  return { back: back.startsWith('/') && !back.startsWith('//') ? back : '/', token, expiresIn, intent }
}

export function disconnectAniList() {
  anilistAuthStore.set(null)
  anilistSnapshotStore.reset()
}
