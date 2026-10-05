import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Lock, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimeGrid, ShareDialog } from '@/components/anime'
import { Avatar, Button, EmptyState, ErrorState, Skeleton, Tabs } from '@/components/ui'
import { useAnimeByIds } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { formatDate } from '@/lib/format'
import { backend } from '@/services/backend'
import { WATCHLIST_STATUSES } from '@/services/user'

type Tab = 'watchlist' | 'favorites' | 'rated' | 'history'

/** Read-only, shareable profile (only exists when the owner made it public). */
export default function PublicProfilePage() {
  const { username = '' } = useParams()
  const [tab, setTab] = useState<Tab>('watchlist')
  const [share, setShare] = useState(false)
  const query = useQuery({ queryKey: ['public-profile', username.toLowerCase()], queryFn: () => backend.publicProfile(username), retry: false })
  const data = query.data
  useDocumentMeta({ title: data ? `${data.profile.display_name} (@${data.profile.username})` : `@${username}`, type: 'profile' })

  const ratedIds = useMemo(() => Object.entries(data?.ratings ?? {}).sort((a, b) => b[1] - a[1]).map(([id]) => id), [data])
  const historyIds = useMemo(() => [...new Set((data?.history ?? []).map((h) => h.animeId))], [data])
  const ids = tab === 'watchlist' ? (data?.watchlist ?? []).map((w) => w.animeId) : tab === 'favorites' ? data?.favorites ?? [] : tab === 'rated' ? ratedIds : historyIds
  const anime = useAnimeByIds(ids.slice(0, 24))

  if (query.isLoading)
    return (
      <div className="container-app py-10">
        <h1 className="sr-only">@{username}</h1>
        <Skeleton className="h-44 rounded-3xl" />
      </div>
    )
  if (query.isError)
    return (
      <div className="container-app py-16">
        <h1 className="sr-only">@{username}</h1>
        <ErrorState onRetry={() => query.refetch()} />
      </div>
    )
  if (!data)
    return (
      <div className="container-app py-16">
        <h1 className="sr-only">@{username}</h1>
        <EmptyState icon={<Lock />} title="This profile is private or doesn’t exist" description={`@${username} hasn’t shared a public profile.`} />
      </div>
    )

  const p = data.profile
  const counts: Record<string, number> = {}
  for (const w of data.watchlist) counts[w.status] = (counts[w.status] ?? 0) + 1
  const tabs = [
    { value: 'watchlist' as const, label: 'Watchlist', count: data.watchlist.length },
    { value: 'favorites' as const, label: 'Favorites', count: data.favorites.length },
    { value: 'rated' as const, label: 'Rated', count: ratedIds.length },
    ...(p.show_history ? [{ value: 'history' as const, label: 'Recently watched', count: historyIds.length }] : []),
  ]

  return (
    <div className="container-app pt-8 sm:pt-10">
      <header className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
        <Avatar name={p.display_name} hue={p.avatar_hue} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-fg sm:text-3xl">{p.display_name}</h1>
          <p className="text-sm text-fg-subtle">@{p.username}</p>
          {p.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">{p.bio}</p>}
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-fg-subtle">
            <CalendarDays className="h-3.5 w-3.5" />
            Member since {formatDate(p.created_at, { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShare(true)}>
          Share profile
        </Button>
      </header>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {WATCHLIST_STATUSES.map((s) => (
          <li key={s.value} className="rounded-2xl border border-line bg-surface p-4">
            <p className="font-display text-2xl font-bold text-fg">{counts[s.value] ?? 0}</p>
            <p className="text-xs text-fg-subtle">{s.label}</p>
          </li>
        ))}
        <li className="rounded-2xl border border-line bg-surface p-4">
          <p className="inline-flex items-center gap-1 font-display text-2xl font-bold text-fg">
            <Star className="h-5 w-5 fill-warning text-warning" />
            {ratedIds.length ? (Object.values(data.ratings).reduce((a, b) => a + b, 0) / ratedIds.length).toFixed(1) : '—'}
          </p>
          <p className="text-xs text-fg-subtle">Average score</p>
        </li>
      </ul>

      <Tabs className="mt-10" items={tabs} value={tab} onChange={setTab} label="Profile lists" idPrefix="pub" />
      <div className="pt-6" role="tabpanel" id={`pub-panel-${tab}`}>
        <AnimeGrid items={anime.data} loading={anime.isLoading && ids.length > 0} density="dense" empty={<EmptyState compact icon={<Star />} title="Nothing here yet" />} />
      </div>
      <ShareDialog heading="Share profile" title={`${p.display_name} (@${p.username})`} path={`/u/${p.username}`} open={share} onClose={() => setShare(false)} />
    </div>
  )
}
