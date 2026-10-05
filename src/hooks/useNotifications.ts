import { useEffect, useMemo } from 'react'
import { useAnimeByIds } from '@/hooks/queries'
import { usePreferences, useStore, useWatchlist } from '@/hooks/useUserData'
import { createPersistentStore } from '@/services/storage'
import type { Anime } from '@/types'

export interface AppNotification {
  id: string
  kind: 'episode' | 'soon' | 'premiere'
  anime: Anime
  title: string
  body: string
  at: string
  to: string
}

const asArray = <T,>(v: T[]) => (Array.isArray(v) ? v : [])
export const readNotificationsStore = createPersistentStore<string[]>('notifications-read', [], asArray)
const notifiedStore = createPersistentStore<string[]>('notifications-pushed', [], asArray)

const DAY = 86_400_000

/** Derives alerts from the user's watchlist and live airing data — no backend required. */
export function buildNotifications(list: Anime[], now = Date.now()): AppNotification[] {
  const out: AppNotification[] = []
  for (const a of list) {
    const next = a.nextEpisodeAt ? new Date(a.nextEpisodeAt).getTime() : undefined
    if (a.status === 'airing' && a.episodesAired && next) {
      const lastAired = next - 7 * DAY
      if (now - lastAired < 7 * DAY && now >= lastAired)
        out.push({
          id: `ep:${a.id}:${a.episodesAired}`,
          kind: 'episode',
          anime: a,
          title: 'New episode',
          body: `${a.title} · Episode ${a.episodesAired} is out.`,
          at: new Date(lastAired).toISOString(),
          to: `/anime/${a.id}/watch?ep=${a.episodesAired}`,
        })
    }
    if (next && next > now && next - now < DAY)
      out.push({
        id: `soon:${a.id}:${(a.episodesAired ?? 0) + 1}`,
        kind: 'soon',
        anime: a,
        title: 'Airing soon',
        body: `${a.title} · Episode ${(a.episodesAired ?? 0) + 1} airs ${new Date(next).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}.`,
        at: new Date(next).toISOString(),
        to: `/anime/${a.id}`,
      })
    if (a.status === 'upcoming' && a.airedFrom) {
      const start = new Date(a.airedFrom).getTime()
      if (start > now && start - now < 14 * DAY)
        out.push({
          id: `premiere:${a.id}`,
          kind: 'premiere',
          anime: a,
          title: 'Premiere coming up',
          body: `${a.title} premieres ${new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.`,
          at: new Date(start).toISOString(),
          to: `/anime/${a.id}`,
        })
    }
  }
  return out.sort((x, y) => (x.kind === 'episode' && y.kind !== 'episode' ? -1 : y.kind === 'episode' && x.kind !== 'episode' ? 1 : y.at.localeCompare(x.at)))
}

export function useNotifications() {
  const { items } = useWatchlist()
  const { prefs } = usePreferences()
  const read = useStore(readNotificationsStore)
  const ids = useMemo(() => items.filter((i) => i.status !== 'dropped' && i.status !== 'completed').map((i) => i.animeId), [items])
  const { data, isLoading } = useAnimeByIds(ids)

  const notifications = useMemo(
    () =>
      buildNotifications(data ?? []).filter((n) =>
        n.kind === 'episode' ? prefs.notifyNewEpisodes : prefs.notifyReleases,
      ),
    [data, prefs.notifyNewEpisodes, prefs.notifyReleases],
  )
  const unread = notifications.filter((n) => !read.includes(n.id))

  // Browser notifications for new episodes while ANIVIA is open (permission granted in Settings).
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const pushed = notifiedStore.get()
    const fresh = unread.filter((n) => n.kind !== 'premiere' && !pushed.includes(n.id))
    if (!fresh.length) return
    for (const n of fresh.slice(0, 3)) {
      try {
        const note = new Notification(n.title, { body: n.body, icon: n.anime.poster, tag: n.id })
        note.onclick = () => {
          window.focus()
          window.location.assign(n.to)
        }
      } catch {
        /* some browsers only allow notifications from a service worker */
      }
    }
    notifiedStore.set([...pushed, ...fresh.map((n) => n.id)].slice(-200))
  }, [unread])

  return {
    notifications,
    unreadCount: unread.length,
    isRead: (id: string) => read.includes(id),
    markRead: (id: string) => readNotificationsStore.set([...new Set([...read, id])].slice(-300)),
    markAllRead: () => readNotificationsStore.set([...new Set([...read, ...notifications.map((n) => n.id)])].slice(-300)),
    isLoading: isLoading && ids.length > 0,
    watching: ids.length,
  }
}
