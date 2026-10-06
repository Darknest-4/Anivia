import { Bookmark, Heart, History as HistoryIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimeCardCompact, AnimeGrid, ShareDialog } from '@/components/anime'
import { GenreBreakdown } from '@/components/profile/GenreBreakdown'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileStats } from '@/components/profile/ProfileStats'
import { ButtonLink, EmptyState, Tabs } from '@/components/ui'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAnimeByIds } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useFavorites, useHistory, useWatchlist } from '@/hooks/useUserData'
import { formatRelative } from '@/lib/format'
import { thumb } from '@/lib/images'

type Tab = 'overview' | 'watchlist' | 'history' | 'favorites'

export default function ProfilePage() {
  const { user } = useCurrentUser()
  useDocumentMeta({ title: `${user.displayName} (@${user.username})`, type: 'profile', noindex: true })
  const { items } = useWatchlist()
  const history = useHistory()
  const { ids: favoriteIds } = useFavorites()
  const [tab, setTab] = useState<Tab>('overview')
  const [share, setShare] = useState(false)
  const allIds = useMemo(() => [...new Set([...items.map((i) => i.animeId), ...history.map((h) => h.animeId), ...favoriteIds])], [items, history, favoriteIds])
  const { data } = useAnimeByIds(allIds)
  const byId = useMemo(() => new Map((data ?? []).map((a) => [a.id, a])), [data])

  const stats = {
    completed: items.filter((i) => i.status === 'completed').length,
    watching: items.filter((i) => i.status === 'watching').length,
    planning: items.filter((i) => i.status === 'planning').length,
    favorites: favoriteIds.length,
    hours: Math.round((history.reduce((s, h) => s + h.progress, 0) / 3600) * 10) / 10,
    episodes: history.length,
  }
  const library = items.map((i) => byId.get(i.animeId)).filter((a) => a !== undefined)
  const favorites = favoriteIds.map((id) => byId.get(id)).filter((a) => a !== undefined)
  const banner = byId.get(favoriteIds[0] ?? '')?.backdrop

  return (
    <div className="pt-8 sm:pt-10">
      <ProfileHeader user={user} banner={banner} onShare={() => setShare(true)} />
      <ProfileStats values={stats} className="mt-6" />

      <Tabs
        className="mt-10"
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'watchlist', label: 'Watchlist', count: items.length },
          { value: 'history', label: 'History', count: history.length },
          { value: 'favorites', label: 'Favorites', count: favoriteIds.length },
        ]}
        value={tab}
        onChange={setTab}
        label="Profile sections"
        idPrefix="profile"
      />

      <div role="tabpanel" id={`profile-panel-${tab}`} className="pt-6">
        {tab === 'overview' && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section aria-labelledby="activity-heading" className="rounded-2xl border border-line bg-surface p-5">
              <h2 id="activity-heading" className="text-base font-semibold text-fg">
                Recent activity
              </h2>
              {history.length === 0 ? (
                <p className="mt-3 text-sm text-fg-subtle">No activity yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line/70">
                  {history.slice(0, 6).map((h) => {
                    const a = byId.get(h.animeId)
                    return (
                      <li key={h.episodeId} className="flex items-center gap-3 py-3">
                        {a && <img src={thumb(a.poster)} alt="" loading="lazy" className="h-12 w-8 rounded object-cover" />}
                        <p className="min-w-0 flex-1 text-sm text-fg-muted">
                          {h.completed ? 'Finished' : 'Watched'} <span className="font-semibold text-fg">episode {h.episodeNumber}</span> of{' '}
                          <Link to={`/anime/${h.animeId}`} className="font-semibold text-fg hover:text-accent-soft">
                            {a?.title ?? '…'}
                          </Link>
                        </p>
                        <span className="shrink-0 text-xs text-fg-subtle">{formatRelative(h.lastWatched)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
            <div className="space-y-6">
              <section aria-labelledby="genre-heading" className="rounded-2xl border border-line bg-surface p-5">
                <h2 id="genre-heading" className="mb-4 text-base font-semibold text-fg">
                  Favorite genres
                </h2>
                <GenreBreakdown anime={library} />
              </section>
              <section aria-labelledby="fav-heading" className="rounded-2xl border border-line bg-surface p-3">
                <h2 id="fav-heading" className="px-2 pb-1 pt-2 text-base font-semibold text-fg">
                  Top favorites
                </h2>
                {favorites.slice(0, 3).map((a) => (
                  <AnimeCardCompact key={a.id} anime={a} />
                ))}
                {favorites.length === 0 && <p className="px-2 pb-2 text-sm text-fg-subtle">No favorites yet.</p>}
              </section>
            </div>
          </div>
        )}
        {tab === 'watchlist' &&
          (library.length ? (
            <>
              <AnimeGrid items={library.slice(0, 12)} density="dense" />
              <div className="mt-6 flex items-center justify-between text-sm text-fg-subtle">
                <span>
                  {stats.watching} watching · {stats.planning} planning · {stats.completed} completed
                </span>
                <ButtonLink to="/watchlist" variant="secondary" size="sm">
                  Manage watchlist
                </ButtonLink>
              </div>
            </>
          ) : (
            <EmptyState icon={<Bookmark />} title="Your watchlist is empty." description="No anime saved yet. Start exploring." action={<ButtonLink to="/browse">Browse anime</ButtonLink>} />
          ))}
        {tab === 'history' &&
          (history.length ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {history.slice(0, 12).map((h) => {
                const a = byId.get(h.animeId)
                return a ? <AnimeCardCompact key={h.episodeId} anime={a} aside={<span className="text-xs text-fg-subtle">EP {h.episodeNumber}</span>} className="border border-line bg-surface" /> : null
              })}
            </ul>
          ) : (
            <EmptyState icon={<HistoryIcon />} title="You haven’t watched anything yet." action={<ButtonLink to="/">Start watching</ButtonLink>} />
          ))}
        {tab === 'favorites' &&
          (favorites.length ? (
            <AnimeGrid items={favorites} density="dense" />
          ) : (
            <EmptyState icon={<Heart />} title="No favorites yet" description="Tap the heart on any title to add it to your favorites." action={<ButtonLink to="/browse">Discover anime</ButtonLink>} />
          ))}
      </div>
      <ShareDialog heading="Share profile" title={`${user.displayName} (@${user.username})`} path="/profile" open={share} onClose={() => setShare(false)} />
    </div>
  )
}
