import { t } from '@/i18n'
import { Info, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '@/components/ui'
import { usePrefetchAnime } from '@/hooks/queries'
import { cn } from '@/lib/cn'
import type { Anime } from '@/types'
import { AnimeMeta, StatusBadge } from './AnimeMeta'
import { AnimeRating } from './AnimeRating'
import { thumb } from '@/lib/images'

/** Cinematic landscape card with backdrop artwork — spotlight sections. */
export function AnimeCardFeatured({ anime, className, label = 'Featured' }: { anime: Anime; className?: string; label?: string }) {
  const prefetch = usePrefetchAnime()
  return (
    <article onPointerEnter={() => prefetch(anime.id)} onFocusCapture={() => prefetch(anime.id)} className={cn('group relative isolate flex min-h-[300px] overflow-hidden rounded-2xl border border-line sm:min-h-[340px]', className)}>
      <img
        src={anime.backdrop ?? anime.poster}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/0 sm:bg-gradient-to-r sm:from-black/95 sm:via-black/60 sm:to-transparent" />
      <div className="mt-auto flex w-full flex-col gap-4 p-5 sm:my-auto sm:max-w-md sm:p-8">
        <span className="eyebrow text-accent-soft">{label}</span>
        <div className="flex gap-4">
          <img src={thumb(anime.poster)} alt="" loading="lazy" className="hidden aspect-[2/3] w-24 shrink-0 rounded-xl object-cover shadow-pop ring-1 ring-white/10 md:block" />
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
              <Link to={`/anime/${anime.id}`} className="hover:underline">
                {anime.title}
              </Link>
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AnimeRating rating={anime.rating} className="text-white" />
              <StatusBadge status={anime.status} />
              <AnimeMeta anime={anime} className="text-white/70" />
            </div>
          </div>
        </div>
        <p className="synopsis line-clamp-3 text-sm leading-relaxed text-white/75">{anime.description}</p>
        <div className="flex flex-wrap gap-2">
          {anime.status !== 'upcoming' && (
            <ButtonLink to={`/anime/${anime.id}/watch`} size="md" leftIcon={<Play className="h-4 w-4 fill-current" />}>
              {t('Watch now')}
            </ButtonLink>
          )}
          <ButtonLink to={`/anime/${anime.id}`} variant="glass" size="md" leftIcon={<Info className="h-4 w-4" />}>
            {t('Details')}
          </ButtonLink>
        </div>
      </div>
    </article>
  )
}
