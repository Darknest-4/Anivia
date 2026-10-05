import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Anime } from '@/types'

/** Cinematic backdrop band with overlapping poster. Always rendered in the dark scheme. */
export function DetailsHero({ anime, children }: { anime: Anime; children: ReactNode }) {
  return (
    <header className="cinematic relative isolate">
      <div data-theme="dark" className="relative text-fg">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <img src={anime.backdrop ?? anime.poster} alt="" className="h-full w-full object-cover object-[70%_30%] opacity-90" />
          <div className="absolute inset-0 bg-bg/40" />
          <div className="hero-fade-side absolute inset-0 hidden md:block" />
          <div className="hero-fade-bottom absolute inset-0" />
        </div>
        <div className="container-app pb-10 pt-8 md:pb-14 md:pt-28 lg:pt-36">
          <nav aria-label="Breadcrumb" className="mb-6 hidden text-xs font-medium text-white/60 md:block">
            <Link to="/" className="hover:text-white">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link to="/browse" className="hover:text-white">
              Browse
            </Link>
            <span className="mx-2">/</span>
            <span className="text-white/85">{anime.title}</span>
          </nav>
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:gap-8 md:text-left">
            <img
              src={anime.poster}
              alt={`${anime.title} poster`}
              className="w-40 shrink-0 rounded-2xl shadow-pop ring-1 ring-white/10 sm:w-48 md:w-56 lg:w-64"
            />
            <div className="min-w-0 max-w-3xl pb-1">{children}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
