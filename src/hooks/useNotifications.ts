import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { anilistAuthed } from '@/services/anilistAccount/api'
import { anilistAuthStore } from '@/services/anilistAccount/store'
import { useAnimeByIds } from '@/hooks/queries'
import { usePreferences, useStore, useWatchlist } from '@/hooks/useUserData'
import { createPersistentStore } from '@/services/storage'
import type { Anime } from '@/types'

export interface AppNotification {
  id: string
  kind: 'episode' | 'soon' | 'premiere' | 'related'
  anime: Anime
  title: string
  body: string
  at: string
  to: string
}

const asArray = <T,>(v: T[]) => (Array.isArray(v) ? v : [])
export const readNotificationsStore = createPersistentStore<string[]>('notifications-read', [], asArray)
export const notifiedStore = createPersistentStore<string[]>('notifications-pushed', [], asArray)

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

const ANILIST_NOTIFICATIONS = `
query ($reset: Boolean) {
  Page(perPage: 25) {
    notifications(type_in: [AIRING, RELATED_MEDIA_ADDITION], resetNotificationCount: $reset) {
      ... on AiringNotification { id type episode createdAt media { id isAdult title { english romaji } coverImage { large } } }
      ... on RelatedMediaAdditionNotification { id type createdAt media { id isAdult title { english romaji } coverImage { large } } }
    }
  }
}`

type AlNote = { id: number; type: 'AIRING' | 'RELATED_MEDIA_ADDITION'; episode?: number; createdAt: number; media: { id: number; isAdult: boolean; title: { english: string | null; romaji: string | null }; coverImage: { large: string | null } } | null }

function fromAniList(n: AlNote): AppNotification | null {
  if (!n.media || n.media.isAdult) return null
  const title = n.media.title.english ?? n.media.title.romaji ?? 'Anime'
  const anime = { id: String(n.media.id), slug: String(n.media.id), title, description: '', poster: n.media.coverImage.large ?? '', popularity: 0, status: 'airing', type: 'TV', genres: [], studios: [], languages: [], updatedAt: '' } as Anime
  const at = new Date(n.createdAt * 1000).toISOString()
  return n.type === 'AIRING'
    ? { id: `ep:${anime.id}:${n.episode}`, kind: 'episode', anime, title: 'New episode', body: `${title} · Episode ${n.episode} aired.`, at, to: `/anime/${anime.id}/watch?ep=${n.episode}` }
    : { id: `al:${n.id}`, kind: 'related', anime, title: 'New related anime', body: `${title} was added to AniList.`, at, to: `/anime/${anime.id}` }
}

/** The connected AniList account's own airing / related-media notifications. */
function useAniListNotifications() {
  const account = useStore(anilistAuthStore)
  return useQuery({
    queryKey: ['anilist-notifications', account?.userId],
    enabled: Boolean(account),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
    queryFn: async () => {
      const data = await anilistAuthed<{ Page: { notifications: AlNote[] } }>(ANILIST_NOTIFICATIONS, { reset: false })
      return data.Page.notifications.map(fromAniList).filter((n): n is AppNotification => Boolean(n))
    },
  })
}

export function useNotifications() {
  const { items } = useWatchlist()
  const { prefs } = usePreferences()
  const read = useStore(readNotificationsStore)
  const ids = useMemo(() => items.filter((i) => i.status !== 'dropped' && i.status !== 'completed').map((i) => i.animeId), [items])
  const { data, isLoading } = useAnimeByIds(ids)

  const remote = useAniListNotifications()
  const notifications = useMemo(() => {
    const byId = new Map<string, AppNotification>()
    for (const n of [...(remote.data ?? []), ...buildNotifications(data ?? [])]) if (!byId.has(n.id)) byId.set(n.id, n)
    return [...byId.values()]
      .filter((n) => (n.kind === 'episode' || n.kind === 'related' ? prefs.notifyNewEpisodes : prefs.notifyReleases))
      .sort((x, y) => y.at.localeCompare(x.at))
  }, [data, remote.data, prefs.notifyNewEpisodes, prefs.notifyReleases])
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
    markAllRead: () => {
      readNotificationsStore.set([...new Set([...read, ...notifications.map((n) => n.id)])].slice(-300))
      // Also clear the unread badge on AniList itself.
      if (anilistAuthStore.get()) void anilistAuthed(ANILIST_NOTIFICATIONS, { reset: true }).catch(() => undefined)
    },
    isLoading: (isLoading && ids.length > 0) || remote.isLoading,
    watching: ids.length,
  }
}
