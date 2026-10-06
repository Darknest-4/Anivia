import { t } from '@/i18n'
import { ArrowLeft, Play } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { EpisodeList, StatusBadge } from '@/components/anime'
import { PageHeader } from '@/components/common/PageHeader'
import { ButtonLink, ErrorState, Progress, Skeleton } from '@/components/ui'
import { useAnime, useEpisodes } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useHistory } from '@/hooks/useUserData'
import NotFoundPage from '@/pages/info/NotFoundPage'

export default function EpisodesPage() {
  const { id } = useParams()
  const anime = useAnime(id)
  const episodes = useEpisodes(id)
  const history = useHistory()
  useDocumentMeta({ title: anime.data ? t('{p0} · Episodes', { p0: anime.data.title }) : t('Episodes') })

  if (anime.isLoading)
    return (
      <div className="container-app py-10">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="mt-6 h-96 w-full rounded-2xl" />
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
  const watched = new Set(history.filter((h) => h.animeId === a.id && h.completed).map((h) => h.episodeId))
  const available = (episodes.data ?? []).filter((e) => !e.locked).length

  return (
    <div className="container-app">
      <PageHeader
        crumbs={[{ label: t('Home'), to: '/' }, { label: a.title, to: `/anime/${a.id}` }, { label: t('Episodes') }]}
        eyebrow={t('Episode guide')}
        title={a.title}
        description={t('{p0} of {p1} episodes available · {p2} min each', { p0: available, p1: a.episodes ?? available, p2: a.duration ?? 24 })}
        actions={
          <>
            <ButtonLink to={`/anime/${a.id}`} variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t('Details')}
            </ButtonLink>
            {a.status !== 'upcoming' && (
              <ButtonLink to={`/anime/${a.id}/watch`} leftIcon={<Play className="h-4 w-4 fill-current" />}>
                {t('Watch')}
              </ButtonLink>
            )}
          </>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+1.5rem)] space-y-4">
            <img src={a.poster} alt={`${a.title} poster`} className="w-full rounded-2xl shadow-card ring-1 ring-line" />
            <div className="rounded-2xl border border-line bg-surface p-4">
              <StatusBadge status={a.status} />
              <p className="mt-3 text-sm font-semibold text-fg">{t('Your progress')}</p>
              <p className="text-xs text-fg-subtle">
                {t('{p0} of {p1} watched', { p0: watched.size, p1: available })}
              </p>
              <Progress value={available ? watched.size / available : 0} className="mt-3 bg-surface-3" label={t('Series progress')} />
            </div>
          </div>
        </aside>
        <EpisodeList animeId={a.id} episodes={episodes.data} loading={episodes.isLoading} />
      </div>
    </div>
  )
}
