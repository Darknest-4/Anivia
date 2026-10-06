import { config } from '@/config'
import { createPersistentStore } from '@/services/storage'
import { visitorId } from './flags'

/**
 * Privacy-friendly first-party analytics stored in Supabase (see migration 0003).
 * - Only runs after the visitor accepted the consent banner (and never with Do Not Track).
 * - Records: page path, anime id/title, time spent on the page, device class, referrer domain.
 * - No IP addresses, no third-party cookies, no cross-site tracking.
 */
export type Consent = 'granted' | 'denied' | null
export const consentStore = createPersistentStore<Consent>('analytics-consent', null, (v) => (v === 'granted' || v === 'denied' ? v : null))

const doNotTrack = () => typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl === true)
export const analyticsAllowed = () => consentStore.get() === 'granted' && !doNotTrack()

const SESSION_KEY = 'anivia:analytics-session'
const SESSION_IDLE_MS = 30 * 60_000

function sessionId(): { id: string; isNew: boolean } {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    const parsed = raw ? (JSON.parse(raw) as { id: string; at: number }) : null
    if (parsed && Date.now() - parsed.at < SESSION_IDLE_MS) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: parsed.id, at: Date.now() }))
      return { id: parsed.id, isNew: false }
    }
    const id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: Date.now() }))
    return { id, isNew: true }
  } catch {
    return { id: crypto.randomUUID(), isNew: true }
  }
}

const device = () => {
  const w = window.innerWidth
  return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
}

let accessToken: string | null = null
/** Lets tracked page views be attributed to the signed-in account. */
export const setAnalyticsUser = (token: string | null) => {
  accessToken = token
}

/** Calls a Supabase RPC with plain fetch (keepalive works while the page unloads). */
function rpc<T = unknown>(fn: string, args: Record<string, unknown>, keepalive = false): Promise<T | null> {
  if (!config.supabaseUrl || !config.supabaseKey) return Promise.resolve(null)
  return fetch(`${config.supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    keepalive,
    headers: {
      'Content-Type': 'application/json',
      apikey: config.supabaseKey,
      Authorization: `Bearer ${accessToken ?? config.supabaseKey}`,
    },
    body: JSON.stringify(args),
  })
    .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
    .catch(() => null)
}

const ANIME_PATH = /^\/anime\/([^/]+)/

interface Current {
  view: Promise<number | null>
  path: string
  session: string
  enteredAt: number
  visibleMs: number
  visibleSince: number | null
}

let current: Current | null = null
let started: string | null = null
/** Titles reported by pages (path → title), e.g. an anime title once it has loaded. */
const titles = new Map<string, string>()
let heartbeat: number | undefined

function elapsed(c: Current) {
  return c.visibleMs + (c.visibleSince !== null ? performance.now() - c.visibleSince : 0)
}

function flush(keepalive = false) {
  const c = current
  if (!c) return
  const ms = Math.round(elapsed(c))
  void c.view.then((id) => id && rpc('track_duration', { p_view: id, p_session: c.session, p_ms: ms }, keepalive))
}

function onVisibility() {
  const c = current
  if (!c) return
  if (document.visibilityState === 'hidden') {
    if (c.visibleSince !== null) c.visibleMs += performance.now() - c.visibleSince
    c.visibleSince = null
    flush(true)
  } else c.visibleSince = performance.now()
}

/** Records a page view. Time on page counts only while the tab is visible. */
export function trackPageview(path: string, title?: string) {
  if (!analyticsAllowed()) return
  flush()
  const { id: session, isNew } = sessionId()
  const ready =
    isNew || started !== session
      ? rpc('track_session', {
          p_session: session,
          p_visitor: visitorId(),
          p_path: path,
          p_referrer: document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : null,
          p_device: device(),
          p_language: navigator.language,
          p_user_agent: navigator.userAgent,
        })
      : Promise.resolve(null)
  started = session
  const anime = ANIME_PATH.exec(path)?.[1] ?? null
  const known = titles.get(path) ?? title ?? null
  const view = ready.then(() => rpc<number>('track_pageview', { p_session: session, p_path: path, p_anime: anime, p_title: anime ? known : null }))
  current = { view, path, session, enteredAt: Date.now(), visibleMs: 0, visibleSince: document.visibilityState === 'visible' ? performance.now() : null }

  if (heartbeat === undefined) {
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', () => flush(true))
    // Keeps "online now" accurate and saves time-on-page periodically.
    heartbeat = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !current) return
      void rpc('track_heartbeat', { p_session: current.session })
      flush()
    }, 60_000)
  }
}

/**
 * Reports the real title of a page once it is known (e.g. an anime title after loading).
 * Applied to the view of that exact path only — never to the previous page's view.
 */
export function setPageTitle(path: string, title: string) {
  titles.set(path, title)
  if (titles.size > 200) titles.delete(titles.keys().next().value as string)
  const c = current
  if (!c || c.path !== path || !analyticsAllowed()) return
  void c.view.then((id) => id && rpc('track_pageview_title', { p_view: id, p_session: c.session, p_title: title }))
}

export function stopAnalytics() {
  flush(true)
  current = null
  if (heartbeat !== undefined) window.clearInterval(heartbeat)
  heartbeat = undefined
  document.removeEventListener('visibilitychange', onVisibility)
}

/** Public: views of an anime in the last week. */
export async function animeViews(animeId: string) {
  return rpc<{ views: number; viewers: number; watching_now: number }>('anime_views', { p_anime: animeId, p_days: 7 })
}
