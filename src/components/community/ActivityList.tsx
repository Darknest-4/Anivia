import { Bookmark, Heart, ListPlus, MessageSquareText, Star, Tv } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAnimeByIds } from '@/hooks/queries'
import { thumb } from '@/lib/images'
import { formatRelative } from '@/lib/format'
import type { Activity } from '@/services/community'
import { watchlistStatusLabel } from '@/services/user'
import type { WatchlistStatus } from '@/types'
import { AuthorLine } from './parts'

const icons = { status: Bookmark, rating: Star, episode: Tv, review: MessageSquareText, list: ListPlus, favorite: Heart }

function describe(a: Activity) {
  const d = a.data as Record<string, string | number | undefined>
  switch (a.kind) {
    case 'status':
      return `set to ${watchlistStatusLabel[d.status as WatchlistStatus] ?? d.status}`
    case 'rating':
      return `rated ${d.score}/10`
    case 'episode':
      return `watched episode ${d.episode}`
    case 'review':
      return 'wrote a review of'
    case 'favorite':
      return 'added to favorites'
    case 'list':
      return `created the list “${d.title ?? ''}”`
  }
}

/** Feed rows: who did what with which title. */
export function ActivityList({ items, showAuthor = true }: { items: Activity[]; showAuthor?: boolean }) {
  const ids = [...new Set(items.map((i) => i.anime_id).filter((x): x is string => Boolean(x)))]
  const { data } = useAnimeByIds(ids)
  const byId = new Map((data ?? []).map((a) => [a.id, a]))
  return (
    <ul className="space-y-2">
      {items.map((a) => {
        const anime = a.anime_id ? byId.get(a.anime_id) : undefined
        const Icon = icons[a.kind]
        const verb = describe(a)
        return (
          <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
            {anime ? (
              <Link to={`/anime/${anime.id}`} className="shrink-0">
                <img src={thumb(anime.poster)} alt="" loading="lazy" className="h-14 w-10 rounded-md object-cover" />
              </Link>
            ) : (
              <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-fg-subtle">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              {showAuthor && a.author && <AuthorLine author={a.author} className="mb-1" />}
              <p className="text-sm text-fg-muted">
                <Icon className="mr-1 inline h-3.5 w-3.5 align-[-2px] text-accent-soft" />
                {a.kind === 'status' || a.kind === 'rating' || a.kind === 'favorite' ? (
                  <>
                    {anime ? (
                      <Link to={`/anime/${anime.id}`} className="font-semibold text-fg hover:text-accent-soft">
                        {anime.title}
                      </Link>
                    ) : (
                      'A title'
                    )}{' '}
                    {verb}
                  </>
                ) : (
                  <>
                    {verb}{' '}
                    {anime && (
                      <Link to={`/anime/${anime.id}`} className="font-semibold text-fg hover:text-accent-soft">
                        {anime.title}
                      </Link>
                    )}
                  </>
                )}
              </p>
              <p className="text-2xs text-fg-subtle">{formatRelative(a.created_at)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
