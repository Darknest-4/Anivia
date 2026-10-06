import { Flag, Play, RotateCcw, Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  AnimeGenreBadge,
  AnimeInfoPanel,
  DetailsSkeleton,
  FavoriteButton,
  MyRating,
  ReportDialog,
  ShareDialog,
  StatusBadge,
  WatchlistButton,
} from '@/components/anime'
import { Button, ButtonLink, Tabs, type TabItem } from '@/components/ui'
import { ErrorState } from '@/components/ui'
import { useAnime, useEpisodes } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useHistory } from '@/hooks/useUserData'
import { historyService } from '@/services/user'
import { episodeLabel } from '@/components/anime/AnimeMeta'
import NotFoundPage from '@/pages/info/NotFoundPage'
import { WatchLinks } from '@/components/watch'
import { ViewCount } from '@/components/common/PlatformBits'
import { DetailsHero } from './details/DetailsHero'
import { OverviewTab } from './details/OverviewTab'
import { CharactersTab } from './details/CharactersTab'
import { StaffTab } from './details/StaffTab'
import { RelatedSections } from './details/RelatedSections'
import { EpisodeList } from '@/components/anime'
import { formatRating, scoresHidden } from '@/lib/format'

type Tab = 'overview' | 'episodes' | 'characters' | 'staff'

export default function AnimeDetailsPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'overview'
  const { data: anime, isLoading, isError, refetch } = useAnime(id)
  const episodes = useEpisodes(id)
  const history = useHistory()
  const [share, setShare] = useState(false)
  const [report, setReport] = useState(false)

  useDocumentMeta({ title: anime?.title, description: anime?.synopsisShort, image: anime?.poster, type: 'video.tv_show' })

  const next = useMemo(() => (id ? historyService.nextUp(id, anime?.episodesAired ?? anime?.episodes, history) : null), [history, id, anime?.episodesAired, anime?.episodes])

  if (isLoading) return <DetailsSkeleton />
  if (isError)
    return (
      <div className="container-app py-16">
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  if (!anime) return <NotFoundPage />

  const tabs: TabItem<Tab>[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'episodes', label: 'Episodes', count: anime.type === 'Movie' ? undefined : anime.episodes },
    { value: 'characters', label: 'Characters' },
    { value: 'staff', label: 'Staff' },
  ]
  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params)
    if (t === 'overview') next.delete('tab')
    else next.set('tab', t)
    setParams(next, { replace: true })
  }
  const upcoming = anime.status === 'upcoming'

  return (
    <article>
      <DetailsHero anime={anime}>
        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
          <StatusBadge status={anime.status} />
          <span className="rounded-md bg-white/10 px-1.5 py-1 text-2xs font-semibold text-white/85">{anime.type}</span>
          {anime.quality && <span className="rounded-md bg-white/10 px-1.5 py-1 text-2xs font-semibold text-white/85">{anime.quality}</span>}
          {anime.ageRating && <span className="rounded-md border border-white/25 px-1.5 py-0.5 text-2xs font-bold text-white/85">{anime.ageRating}</span>}
        </div>
        <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.05] text-white sm:text-4xl lg:text-5xl">
          {anime.logo ? (
            <img src={anime.logo} alt={anime.title} className="mx-auto max-h-24 w-auto max-w-[min(100%,420px)] object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)] md:mx-0 lg:max-h-32" />
          ) : (
            anime.title
          )}
        </h1>
        {anime.alternativeTitle && (
          <p className="mt-2 text-sm text-white/60">
            {anime.alternativeTitle}
            {anime.nativeTitle && <span className="ml-2 text-white/40">{anime.nativeTitle}</span>}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] text-white/75 md:justify-start">
          {scoresHidden() ? null : anime.rating ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="rounded-md bg-warning px-1.5 py-0.5 font-display text-sm font-bold text-black">{formatRating(anime.rating)}</span>
              <span>{anime.rank ? `Ranked #${anime.rank}` : 'Score'}</span>
            </span>
          ) : (
            <span>Not yet rated</span>
          )}
          <span>{anime.year}</span>
          <span>{episodeLabel(anime)}</span>
          {anime.duration && <span>{anime.duration} min</span>}
          <ViewCount animeId={anime.id} />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
          {anime.genres.map((g) => (
            <AnimeGenreBadge key={g.id} genre={g} variant="glass" />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
          {upcoming ? (
            <Button size="lg" disabled leftIcon={<Play className="h-5 w-5" />}>
              Coming {anime.year}
            </Button>
          ) : next ? (
            <ButtonLink to={`/anime/${anime.id}/watch?ep=${next.episodeNumber}`} size="lg" leftIcon={next.resume ? <RotateCcw className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}>
              {next.resume ? 'Continue' : 'Next:'} EP {next.episodeNumber}
            </ButtonLink>
          ) : (
            <ButtonLink to={`/anime/${anime.id}/watch`} size="lg" leftIcon={<Play className="h-5 w-5 fill-current" />}>
              {anime.type === 'Movie' ? 'Watch Movie' : 'Watch EP 1'}
            </ButtonLink>
          )}
          <WatchlistButton anime={anime} variant="glass" />
          <Button variant="glass" size="icon-lg" aria-label="Share" onClick={() => setShare(true)}>
            <Share2 className="h-5 w-5" />
          </Button>
          <FavoriteButton anime={anime} size="md" className="h-12 w-12 rounded-xl" />
          <Button variant="glass" size="icon-lg" aria-label="Report an issue" onClick={() => setReport(true)} className="hidden sm:inline-flex">
            <Flag className="h-5 w-5" />
          </Button>
        </div>
      </DetailsHero>

      <div className="container-app mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <Tabs items={tabs} value={tab} onChange={setTab} label="Anime sections" idPrefix="details" />
          <div role="tabpanel" id={`details-panel-${tab}`} aria-labelledby={`details-${tab}`} className="pt-6">
            {tab === 'overview' && <OverviewTab anime={anime} episodes={episodes.data} onShowEpisodes={() => setTab('episodes')} onShowCharacters={() => setTab('characters')} />}
            {tab === 'episodes' && <EpisodeList animeId={anime.id} episodes={episodes.data} loading={episodes.isLoading} />}
            {tab === 'characters' && <CharactersTab anime={anime} />}
            {tab === 'staff' && <StaffTab anime={anime} />}
          </div>
        </div>
        <aside className="space-y-6">
          <MyRating animeId={anime.id} title={anime.title} />
          <WatchLinks links={anime.watchLinks} />
          <AnimeInfoPanel anime={anime} />
        </aside>
      </div>

      <RelatedSections anime={anime} />

      <ShareDialog title={anime.title} path={`/anime/${anime.id}`} image={anime.poster} open={share} onClose={() => setShare(false)} />
      <ReportDialog open={report} onClose={() => setReport(false)} subject={anime.title} />
    </article>
  )
}
