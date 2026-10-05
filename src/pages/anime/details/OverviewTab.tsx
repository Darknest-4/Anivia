import { CalendarClock, ChevronRight, Tag } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimeStats, CharacterCard, Countdown, EpisodeItem, StudioCard } from '@/components/anime'
import { Button } from '@/components/ui'
import { useCharacters } from '@/hooks/queries'
import { formatDate } from '@/lib/format'
import type { Anime, Episode } from '@/types'

interface Props {
  anime: Anime
  episodes?: Episode[]
  onShowEpisodes: () => void
  onShowCharacters: () => void
}

export function OverviewTab({ anime, episodes, onShowEpisodes, onShowCharacters }: Props) {
  const [expanded, setExpanded] = useState(false)
  const { data: characters } = useCharacters({ animeId: anime.id })
  const latest = (episodes ?? []).filter((e) => !e.locked).slice(-4).reverse()

  return (
    <div className="space-y-10">
      <section aria-labelledby="synopsis-heading">
        <h2 id="synopsis-heading" className="text-lg font-semibold text-fg">
          Synopsis
        </h2>
        <p className={`mt-3 max-w-3xl text-[15px] leading-relaxed text-fg-muted ${expanded ? '' : 'line-clamp-4'}`}>{anime.description}</p>
        {anime.description.length > 280 && (
          <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-2 text-sm font-semibold text-accent-soft hover:underline" aria-expanded={expanded}>
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        {anime.tags && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tags">
            {anime.tags.map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs text-fg-muted">
                <Tag className="h-3 w-3 text-fg-subtle" />
                {t}
              </li>
            ))}
          </ul>
        )}
      </section>

      <AnimeStats anime={anime} />

      {anime.status === 'airing' && anime.nextEpisodeAt && (
        <section aria-labelledby="next-ep-heading" className="flex flex-col gap-4 rounded-2xl border border-accent/25 bg-accent/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent-soft">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <h2 id="next-ep-heading" className="text-sm font-semibold text-fg">
                Episode {(anime.episodesAired ?? 0) + 1} airs soon
              </h2>
              <p className="text-xs text-fg-subtle">{formatDate(anime.nextEpisodeAt, { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <Countdown to={anime.nextEpisodeAt} />
        </section>
      )}

      {latest.length > 0 && anime.type !== 'Movie' && (
        <section aria-labelledby="latest-eps-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="latest-eps-heading" className="text-lg font-semibold text-fg">
              Latest episodes
            </h2>
            <Button variant="ghost" size="sm" onClick={onShowEpisodes} rightIcon={<ChevronRight className="h-4 w-4" />}>
              All episodes
            </Button>
          </div>
          <ul className="grid gap-1.5 xl:grid-cols-2">
            {latest.map((ep) => (
              <li key={ep.id}>
                <EpisodeItem episode={ep} layout="compact" href={`/anime/${anime.id}/watch?ep=${ep.number}`} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {characters && characters.length > 0 && (
        <section aria-labelledby="chars-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="chars-heading" className="text-lg font-semibold text-fg">
              Characters
            </h2>
            <Button variant="ghost" size="sm" onClick={onShowCharacters} rightIcon={<ChevronRight className="h-4 w-4" />}>
              View all
            </Button>
          </div>
          <ul className="grid grid-cols-2 gap-4 xs:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {characters.slice(0, 5).map((c) => (
              <li key={c.id}>
                <CharacterCard character={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="studios-heading">
        <h2 id="studios-heading" className="mb-3 text-lg font-semibold text-fg">
          Studios
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {anime.studios.map((s) => (
            <StudioCard key={s.id} studio={s} />
          ))}
        </div>
        <p className="mt-4 text-sm text-fg-subtle">
          Explore more from{' '}
          <Link to="/studios" className="font-semibold text-accent-soft hover:underline">
            all studios
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
