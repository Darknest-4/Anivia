import { CheckCircle2, Clock, History as HistoryIcon, Play, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimeCardContinueWatching, AnimeCardWideSkeleton } from '@/components/anime'
import { PageHeader } from '@/components/common/PageHeader'
import { Button, ButtonLink, Dialog, EmptyState, Progress, Skeleton } from '@/components/ui'
import { useAnimeByIds } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useHistory } from '@/hooks/useUserData'
import { formatClock, formatDate, formatWatchTime } from '@/lib/format'
import { useToast } from '@/providers/ToastProvider'
import { historyService } from '@/services/user'
import type { WatchProgress } from '@/types'

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.floor((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return formatDate(iso, { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function HistoryPage() {
  useDocumentMeta({ title: 'Watch History', noindex: true })
  const history = useHistory()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const ids = useMemo(() => [...new Set(history.map((h) => h.animeId))], [history])
  const { data, isLoading } = useAnimeByIds(ids)
  const byId = useMemo(() => new Map((data ?? []).map((a) => [a.id, a])), [data])

  const inProgress = useMemo(() => historyService.upNext(history, (id) => byId.get(id)?.episodesAired ?? byId.get(id)?.episodes, 12), [history, byId])

  const groups = useMemo(() => {
    const map = new Map<string, WatchProgress[]>()
    for (const h of history) {
      const key = dayLabel(h.lastWatched)
      map.set(key, [...(map.get(key) ?? []), h])
    }
    return [...map.entries()]
  }, [history])

  const totalSeconds = history.reduce((s, h) => s + h.progress, 0)

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Watch History"
        description="Pick up where you left off. Saved in this browser and synced to your account when you’re signed in."
        actions={
          history.length > 0 && (
            <Button variant="secondary" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>
              Clear history
            </Button>
          )
        }
      />

      {history.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon />}
          title="You haven’t watched anything yet."
          description="Episodes you start will appear here so you can jump right back in."
          action={<ButtonLink to="/">Find something to watch</ButtonLink>}
        />
      ) : (
        <div className="space-y-12">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Episodes', value: history.length },
              { label: 'Completed', value: history.filter((h) => h.completed).length },
              { label: 'Watch time', value: formatWatchTime(totalSeconds) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-xs text-fg-subtle">{s.label}</p>
                <p className="mt-1 whitespace-nowrap font-display text-lg font-bold text-fg sm:text-2xl">{s.value}</p>
              </div>
            ))}
          </div>

          {inProgress.length > 0 && (
            <section aria-labelledby="cw-heading">
              <h2 id="cw-heading" className="mb-4 text-lg font-semibold text-fg">
                Continue Watching
              </h2>
              <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
                {isLoading && !data
                  ? inProgress.map((h) => <AnimeCardWideSkeleton key={h.episodeId} />)
                  : inProgress.map((h) => {
                      const anime = byId.get(h.animeId)
                      return anime ? <AnimeCardContinueWatching key={h.episodeId} anime={anime} entry={h} onRemove={() => historyService.removeEntry(h.animeId, h.episodeId)} /> : null
                    })}
              </div>
            </section>
          )}

          <section aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="mb-4 text-lg font-semibold text-fg">
              Recently Watched
            </h2>
            <div className="space-y-8">
              {groups.map(([label, entries]) => (
                <div key={label}>
                  <h3 className="eyebrow mb-3">{label}</h3>
                  <ul className="space-y-2">
                    {entries.map((h) => {
                      const anime = byId.get(h.animeId)
                      if (!anime) return <Skeleton key={h.episodeId} className="h-20 rounded-2xl" />
                      const pct = h.duration ? h.progress / h.duration : 0
                      return (
                        <li key={h.episodeId} className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 transition-colors hover:border-line-strong sm:gap-4">
                          <Link to={`/anime/${anime.id}/watch?ep=${h.episodeNumber}`} className="relative w-28 shrink-0 overflow-hidden rounded-lg sm:w-36" aria-label={`Resume ${anime.title} episode ${h.episodeNumber}`}>
                            <img src={anime.backdrop ?? anime.poster} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                              <Play className="h-6 w-6 fill-white text-white" />
                            </span>
                            <Progress value={pct} size="xs" className="absolute inset-x-0 bottom-0 rounded-none bg-black/40" label="Progress" />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link to={`/anime/${anime.id}`} className="block truncate text-sm font-semibold text-fg hover:text-accent-soft">
                              {anime.title}
                            </Link>
                            <p className="text-xs text-fg-subtle">Episode {h.episodeNumber}</p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-fg-muted">
                              {h.completed ? (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Watched
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
                                  <Clock className="h-3.5 w-3.5" /> {formatClock(h.progress)} / {formatClock(h.duration)}
                                </span>
                              )}
                              <span className="whitespace-nowrap text-fg-subtle">· {new Date(h.lastWatched).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                            </p>
                          </div>
                          <Button variant="ghost" size="icon-sm" aria-label={`Remove episode ${h.episodeNumber} of ${anime.title} from history`} onClick={() => historyService.removeEntry(h.animeId, h.episodeId)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        icon={<Trash2 className="h-5 w-5" />}
        title="Clear watch history?"
        description="This removes all progress and Continue Watching entries from this device. This can’t be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                historyService.clear()
                setConfirm(false)
                toast({ title: 'Watch history cleared', variant: 'info' })
              }}
            >
              Clear history
            </Button>
          </>
        }
      />
    </div>
  )
}
