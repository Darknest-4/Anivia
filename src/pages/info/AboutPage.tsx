import { Code2, Database, Layers, MonitorSmartphone, Palette, PlayCircle, Search, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { ButtonLink, ErrorState } from '@/components/ui'
import { config } from '@/config'
import { isMockProvider } from '@/services/anime'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const features = [
  { icon: Search, title: 'Discovery first', body: 'Trending, seasonal, genre and studio discovery with instant search and smart filters.' },
  { icon: PlayCircle, title: 'Cinematic player', body: 'A premium watch interface with episode navigation, subtitles, quality and progress tracking.' },
  { icon: MonitorSmartphone, title: 'Every screen', body: 'Purpose-built layouts for phones, tablets and large desktop displays.' },
  { icon: Palette, title: 'Dark & light', body: 'A design-token driven theme system with dark, light and system modes.' },
]

const dev = [
  { icon: Layers, title: 'AnimeProvider', body: 'All catalog data flows through one interface. Swap MockAnimeProvider for your API implementation.' },
  { icon: PlayCircle, title: 'VideoProvider', body: 'Return a source from your own licensed media backend — or null to show the “connect provider” state.' },
  { icon: Database, title: 'Local-first library', body: 'Watchlist, history, favorites and preferences persist in localStorage, ready to sync with your user API.' },
  { icon: Code2, title: 'Typed & modular', body: 'React, TypeScript strict mode, Vite, Tailwind CSS and TanStack Query with lazy-loaded routes.' },
]

export default function AboutPage() {
  useDocumentMeta({ title: 'About', description: 'ANIVIA is a premium anime discovery and streaming experience.' })
  return (
    <div className="container-app">
      <PageHeader eyebrow="About ANIVIA" title={<>Your anime universe — <span className="text-gradient-accent">beautifully organized.</span></>} description="ANIVIA brings discovery, scheduling, watching and remembering together in one cinematic interface." />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {features.map((f) => (
          <li key={f.title} className="rounded-2xl border border-line bg-surface p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12 text-accent-soft">
              <f.icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-fg">{f.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{f.body}</p>
          </li>
        ))}
      </ul>

      <section id="api" aria-labelledby="api-heading" className="mt-16 scroll-mt-24 rounded-3xl border border-line bg-surface p-6 sm:p-10">
        <p className="eyebrow text-accent-soft">For developers</p>
        <h2 id="api-heading" className="mt-2 text-2xl font-bold text-fg sm:text-3xl">
          Connect your own API in minutes
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
          ANIVIA is frontend-only. It ships with fictional demo data and a simulated player so every screen works out of the box. Implement the provider interfaces to connect your legitimate backend — see the README for step-by-step guides.
        </p>
        {isMockProvider ? (
          <ErrorState
            variant="no-api"
            className="mt-8 py-10 sm:py-12"
            description={
              config.animeProvider === 'api'
                ? 'VITE_ANIME_PROVIDER is set to "api" but VITE_API_BASE_URL is empty — falling back to the built-in mock provider.'
                : 'This demo is running on MockAnimeProvider with fictional data. Set VITE_API_BASE_URL and register your AnimeProvider to load live data.'
            }
          />
        ) : (
          <p className="mt-8 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-fg-muted">Connected to {config.apiBaseUrl}</p>
        )}
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {dev.map((d) => (
            <li key={d.title} className="flex gap-4 rounded-2xl border border-line bg-surface-2/60 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-fg">
                <d.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-mono text-sm font-semibold text-fg">{d.title}</h3>
                <p className="mt-1 text-sm text-fg-muted">{d.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <pre className="scrollbar-thin mt-8 overflow-x-auto rounded-2xl border border-line bg-bg p-4 text-[13px] leading-relaxed text-fg-muted">
          <code>{`// src/services/video/index.ts
export const videoProvider: VideoProvider = {
  async getSource(animeId, episodeId) {
    const res = await fetch(\`\${config.apiBaseUrl}/episodes/\${episodeId}/source\`)
    return res.ok ? res.json() : null // null → "Connect your video provider…"
  },
}`}</code>
        </pre>
      </section>

      <section id="content" aria-labelledby="content-heading" className="mt-10 scroll-mt-24 flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success/12 text-success">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <h2 id="content-heading" className="text-lg font-semibold text-fg">
            Content policy
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            Every title, character, studio and image in this demo is fictional and generated for the template. ANIVIA contains no copyrighted artwork, video files, scrapers or third-party streams. Only connect content you are licensed to distribute.
          </p>
        </div>
        <ButtonLink to="/contact" variant="secondary">
          Contact us
        </ButtonLink>
      </section>
    </div>
  )
}
