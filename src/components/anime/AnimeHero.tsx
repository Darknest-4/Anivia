import { Calendar, Clock, Info, Play, Tv } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, ButtonLink } from '@/components/ui'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import type { Anime } from '@/types'
import { AnimeGenreBadge } from './AnimeGenreBadge'
import { episodeLabel, StatusBadge } from './AnimeMeta'
import { AnimeRating } from './AnimeRating'
import { WatchlistButton, WatchlistIconButton } from './WatchlistButton'

const INTERVAL = 9000

/** Cinematic, auto-rotating spotlight. Separate compositions for mobile (poster-led) and desktop (backdrop-led). */
export function AnimeHero({ items }: { items: Anime[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = usePrefersReducedMotion()
  const anime = items[index]

  useEffect(() => {
    if (paused || reduced || items.length < 2) return
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % items.length), INTERVAL)
    return () => window.clearTimeout(id)
  }, [index, paused, reduced, items.length])

  if (!anime) return null
  const watchHref = `/anime/${anime.id}/watch`

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured anime"
      className="cinematic relative isolate -mt-[var(--header-h)] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div data-theme="dark" className="relative text-fg">
      {/* Artwork layers (cross-fade) */}
      <div className="absolute inset-0 -z-10" aria-hidden>
        {items.map((a, i) => (
          <div key={a.id} className={cn('absolute inset-0 transition-opacity duration-[900ms] ease-out', i === index ? 'opacity-100' : 'opacity-0')}>
            <img
              src={a.backdrop ?? a.poster}
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              className={cn('absolute inset-0 h-full w-full object-cover object-[72%_30%] md:object-center', i === index && 'animate-ken-burns')}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-bg/35 md:hidden" />
        <div className="hero-fade-bottom absolute inset-0" />
        <div className="hero-fade-side absolute inset-0 hidden md:block" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-bg/80 to-transparent" />
      </div>

      <div className="container-app flex min-h-[640px] flex-col justify-end pb-10 pt-[calc(var(--header-h)+2rem)] md:h-[82vh] md:max-h-[880px] md:min-h-[600px] md:justify-center md:pb-24">
        <div key={anime.id} className="max-w-2xl animate-fade-up text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <Badge variant="solid" size="md">
              #{index + 1} Spotlight
            </Badge>
            <StatusBadge status={anime.status} />
            <Badge variant="glass" size="md">
              {anime.quality}
            </Badge>
          </div>

          <h1 className="mt-4 font-display text-hero font-extrabold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]">{anime.title}</h1>
          {anime.alternativeTitle && (
            <p className="mt-2 text-sm font-medium tracking-wide text-white/65 md:text-base">
              {anime.alternativeTitle}
              {anime.nativeTitle && <span className="ml-2 text-white/45">{anime.nativeTitle}</span>}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] font-medium text-white/80 md:justify-start">
            <AnimeRating rating={anime.rating} size="md" className="text-white" />
            <span className="inline-flex items-center gap-1.5">
              <Tv className="h-4 w-4 text-white/50" aria-hidden />
              {anime.type}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-white/50" aria-hidden />
              {anime.year}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-white/50" aria-hidden />
              {episodeLabel(anime)}
            </span>
            {anime.ageRating && <span className="rounded border border-white/30 px-1.5 py-0.5 text-2xs font-bold">{anime.ageRating}</span>}
          </div>

          <div className="mt-4 hidden flex-wrap gap-2 sm:flex sm:justify-center md:justify-start">
            {anime.genres.slice(0, 4).map((g) => (
              <AnimeGenreBadge key={g.id} genre={g} variant="glass" />
            ))}
          </div>

          <p className="mx-auto mt-5 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/75 md:mx-0 md:text-[15px]">{anime.description}</p>

          {/* Desktop actions */}
          <div className="mt-8 hidden flex-wrap gap-3 md:flex">
            <ButtonLink to={watchHref} size="lg" leftIcon={<Play className="h-5 w-5 fill-current" />}>
              Watch Now
            </ButtonLink>
            <ButtonLink to={`/anime/${anime.id}`} size="lg" variant="glass" leftIcon={<Info className="h-5 w-5" />}>
              View Details
            </ButtonLink>
            <WatchlistButton anime={anime} variant="glass" />
          </div>

          {/* Mobile actions */}
          <div className="mt-6 flex items-center justify-center gap-3 md:hidden">
            <Link
              to={`/anime/${anime.id}`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/15 backdrop-blur-md"
              aria-label={`View details for ${anime.title}`}
            >
              <Info className="h-5 w-5" />
            </Link>
            <ButtonLink to={watchHref} size="lg" className="max-w-[240px] flex-1" leftIcon={<Play className="h-5 w-5 fill-current" />}>
              Watch Now
            </ButtonLink>
            <WatchlistIconButton anime={anime} className="h-12 w-12 rounded-xl" />
          </div>
        </div>

        {/* Slide selector */}
        {items.length > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2 md:absolute md:bottom-10 md:left-auto md:right-8 md:mt-0 lg:right-12 2xl:right-16">
            <div className="hidden gap-2 lg:flex" role="tablist" aria-label="Choose featured anime">
              {items.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={a.title}
                  onClick={() => setIndex(i)}
                  className={cn(
                    'relative h-[76px] w-[52px] overflow-hidden rounded-lg ring-2 transition-all duration-base',
                    i === index ? 'w-[60px] ring-accent' : 'opacity-60 ring-transparent hover:opacity-100',
                  )}
                >
                  <img src={a.poster} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 lg:hidden">
              {items.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${a.title}`}
                  aria-current={i === index}
                  className="flex h-6 items-center"
                >
                  <span className={cn('block h-1.5 rounded-full transition-all duration-base', i === index ? 'w-6 bg-accent' : 'w-1.5 bg-white/40')} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </section>
  )
}
