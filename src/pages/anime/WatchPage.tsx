import { ChevronLeft, ChevronRight, Flag, ListVideo, Share2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AnimeCard, EpisodeList, ReportDialog, ScrollRow, ShareDialog, WatchlistButton, AnimeGenreBadge } from '@/components/anime'
import { DemoNotice } from '@/components/common/DemoNotice'
import { SectionHeader } from '@/components/common/SectionHeader'
import { VideoPlayer, type ForcedPlayerState } from '@/components/player'
import { Button, Drawer, ErrorState, Skeleton, Tabs } from '@/components/ui'
import { useAnime, useEpisodes, useRecommendations, useVideoSource } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useHistory, usePreferences } from '@/hooks/useUserData'
import { formatDate, pad2 } from '@/lib/format'
import NotFoundPage from '@/pages/info/NotFoundPage'
import { historyService } from '@/services/user'

const previewStates: { value: string; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'loading', label: 'Loading' },
  { value: 'buffering', label: 'Buffering' },
  { value: 'finished', label: 'Finished' },
  { value: 'no-source', label: 'No source' },
  { value: 'error', label: 'Error' },
]

export default function WatchPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { prefs, update } = usePreferences()
  const history = useHistory()
  const anime = useAnime(id)
  const episodes = useEpisodes(id)
  const [drawer, setDrawer] = useState(false)
  const [share, setShare] = useState(false)
  const [report, setReport] = useState(false)
  const [preview, setPreview] = useState('live')

  const list = episodes.data ?? []
  const resume = history.find((h) => h.animeId === id)
  const epNumber = Number(params.get('ep')) || resume?.episodeNumber || 1
  const index = Math.max(0, list.findIndex((e) => e.number === epNumber))
  const episode = list[index]
  const prev = list[index - 1]
  const nextEp = list[index + 1]
  const nextAvailable = nextEp && !nextEp.locked ? nextEp : undefined

  const video = useVideoSource(episode ? id : undefined, episode?.id)
  const saved = episode ? history.find((h) => h.episodeId === episode.id) : undefined
  const startAt = saved && !saved.completed ? saved.progress : 0
  const recs = useRecommendations(id ? [id] : [])

  useDocumentMeta({
    title: anime.data && episode ? `${anime.data.title} · Episode ${episode.number}` : anime.data?.title ?? 'Watch',
    description: episode?.synopsis,
    type: 'video.episode',
  })

  const goTo = useCallback(
    (n: number) => {
      const next = new URLSearchParams(params)
      next.set('ep', String(n))
      setParams(next)
      setDrawer(false)
    },
    [params, setParams],
  )

  const onProgress = useCallback(
    (time: number, duration: number) => {
      if (!episode || !id || time < 1) return
      historyService.record({ animeId: id, episodeId: episode.id, episodeNumber: episode.number, progress: Math.round(time), duration: Math.round(duration) })
    },
    [episode, id],
  )

  const forced = useMemo<ForcedPlayerState>(() => (preview === 'live' ? null : (preview as ForcedPlayerState)), [preview])

  if (anime.isLoading || episodes.isLoading)
    return (
      <div className="container-app pt-4 sm:pt-8">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="mt-6 h-8 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/3" />
      </div>
    )
  if (anime.isError)
    return (
      <div className="container-app py-16">
        <ErrorState onRetry={() => anime.refetch()} />
      </div>
    )
  if (!anime.data) return <NotFoundPage />
  const a = anime.data

  const episodeSidebar = (
    <EpisodeList animeId={a.id} episodes={list} activeEpisodeId={episode?.id} layout="compact" listClassName="max-h-[calc(100vh-14rem)] overflow-y-auto pr-1 scrollbar-thin" />
  )

  return (
    <div className="pb-6 sm:pt-6">
      <div className="mx-auto w-full max-w-content sm:px-6 lg:px-8 2xl:px-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <VideoPlayer
              source={episode ? video.data : null}
              loading={video.isLoading}
              error={video.isError}
              locked={episode?.locked}
              onRetry={() => video.refetch()}
              poster={episode?.thumbnail ?? a.backdrop}
              title={a.title}
              subtitle={episode ? `Episode ${episode.number} · ${episode.title}` : undefined}
              startAt={startAt}
              hasPrev={Boolean(prev)}
              hasNext={Boolean(nextAvailable)}
              onPrev={() => prev && goTo(prev.number)}
              onNext={() => nextAvailable && goTo(nextAvailable.number)}
              next={nextAvailable && { title: nextAvailable.title, number: nextAvailable.number, thumbnail: nextAvailable.thumbnail, href: `/anime/${a.id}/watch?ep=${nextAvailable.number}` }}
              autoNext={prefs.autoNext}
              onAutoNextChange={(v) => update('autoNext', v)}
              autoplay={prefs.autoplay}
              subtitlesDefault={prefs.subtitles}
              skipIntro={prefs.skipIntro}
              defaultQuality={prefs.defaultQuality}
              onProgress={onProgress}
              onOpenEpisodes={() => setDrawer(true)}
              forcedState={forced}
            />

            <div className="px-4 sm:px-0">
              {/* Episode header */}
              <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <Link to={`/anime/${a.id}`} className="text-sm font-semibold text-accent-soft hover:underline">
                    {a.title}
                  </Link>
                  <h1 className="mt-1 text-xl font-bold text-fg sm:text-2xl">
                    {episode ? (
                      <>
                        <span className="text-fg-subtle">EP {pad2(episode.number)}</span> {episode.title}
                      </>
                    ) : (
                      'No episodes available'
                    )}
                  </h1>
                  {episode && (
                    <p className="mt-1 text-sm text-fg-subtle">
                      Aired {formatDate(episode.airDate)} · {Math.round(episode.duration / 60)} min{a.languages.length ? ` · ${a.languages.slice(0, 2).join(' / ')} audio` : ''}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" disabled={!prev} onClick={() => prev && goTo(prev.number)} leftIcon={<ChevronLeft className="h-4 w-4" />}>
                    Prev
                  </Button>
                  <Button variant="secondary" size="sm" disabled={!nextAvailable} onClick={() => nextAvailable && goTo(nextAvailable.number)} rightIcon={<ChevronRight className="h-4 w-4" />}>
                    Next
                  </Button>
                  <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setDrawer(true)} leftIcon={<ListVideo className="h-4 w-4" />}>
                    Episodes
                  </Button>
                </div>
              </div>

              {episode && <p className="mt-4 max-w-3xl text-sm leading-relaxed text-fg-muted">{episode.synopsis}</p>}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <WatchlistButton anime={a} size="md" />
                <Button variant="secondary" leftIcon={<Share2 className="h-4 w-4" />} onClick={() => setShare(true)}>
                  Share
                </Button>
                <Button variant="ghost" leftIcon={<Flag className="h-4 w-4" />} onClick={() => setReport(true)}>
                  Report
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {a.genres.map((g) => (
                  <AnimeGenreBadge key={g.id} genre={g} />
                ))}
              </div>

              {/* Template demo: preview each player state */}
              <section aria-labelledby="states-heading" className="mt-8 rounded-2xl border border-dashed border-line-strong p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 id="states-heading" className="text-sm font-semibold text-fg">
                      Player state preview
                    </h2>
                    <p className="text-xs text-fg-subtle">Template demo — inspect every playback state without a backend.</p>
                  </div>
                  <Tabs items={previewStates.map((s) => ({ value: s.value, label: s.label }))} value={preview} onChange={setPreview} label="Player state" variant="segmented" size="sm" idPrefix="pstate" />
                </div>
                <DemoNotice className="mt-4">
                  Playback is simulated over generated artwork. ANIVIA ships with no video files or streaming URLs — implement <code className="rounded bg-surface-3 px-1 text-fg">VideoProvider</code> to connect your own licensed media.
                </DemoNotice>
              </section>
            </div>
          </div>

          {/* Desktop episode sidebar */}
          <aside className="hidden lg:block" aria-label="Episodes">
            <div className="sticky top-[calc(var(--header-h)+1.5rem)] rounded-2xl border border-line bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-fg">Episodes</h2>
                <span className="text-xs text-fg-subtle">
                  {list.filter((e) => !e.locked).length} / {a.episodes ?? list.length} available
                </span>
              </div>
              {episodeSidebar}
            </div>
          </aside>
        </div>
      </div>

      {recs.data && recs.data.length > 0 && (
        <section aria-labelledby="more-heading" className="container-app mt-14">
          <SectionHeader id="more-heading" title="More Like This" />
          <ScrollRow label="More like this">
            {recs.data.map((r) => (
              <AnimeCard key={r.id} anime={r} />
            ))}
          </ScrollRow>
        </section>
      )}

      <Drawer open={drawer} onClose={() => setDrawer(false)} side="bottom" title={`Episodes · ${a.title}`}>
        <div className="px-4 pb-6">
          <EpisodeList animeId={a.id} episodes={list} activeEpisodeId={episode?.id} layout="compact" />
        </div>
      </Drawer>
      <ShareDialog title={a.title} path={`/anime/${a.id}`} image={a.poster} open={share} onClose={() => setShare(false)} />
      <ReportDialog open={report} onClose={() => setReport(false)} subject={episode ? `${a.title} · Episode ${episode.number}` : a.title} />
    </div>
  )
}
