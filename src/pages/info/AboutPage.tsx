import { t } from '@/i18n'
import { CalendarClock, Cloud, Heart, MonitorSmartphone, Search, ShieldCheck, Tv } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { ButtonLink } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { providerName } from '@/services/anime'

const features = [
  { icon: Search, title: t('Discover'), body: t('Trending, seasonal, genre and studio discovery with instant search and smart filters.') },
  { icon: CalendarClock, title: t('Never miss an episode'), body: t('A weekly airing schedule and notifications for the shows on your watchlist.') },
  { icon: Cloud, title: t('Synced everywhere'), body: t('Your watchlist, progress, scores and settings follow you — with two-way AniList sync.') },
  { icon: MonitorSmartphone, title: t('Any screen'), body: t('Made for phones, tablets and big screens, and installable as an app.') },
  { icon: Tv, title: t('Watch legally'), body: t('Official trailers and links to the licensed services where each series streams.') },
  { icon: Heart, title: t('Made by fans'), body: t('Free to use, no ads, and built for people who love anime.') },
]

export default function AboutPage() {
  useDocumentMeta({ title: t('About'), description: t('ANIVIA is an anime discovery and tracking site with AniList sync.') })
  return (
    <div className="container-app">
      <PageHeader eyebrow={t('About ANIVIA')} title={<>{t('Your anime universe —')}{' '}<span className="text-gradient-accent">{t('beautifully organized.')}</span></>} description={t('Discover, schedule, track and remember everything you watch.')} />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

      <section id="content" aria-labelledby="content-heading" className="mt-12 flex scroll-mt-24 flex-col gap-4 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success/12 text-success">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <h2 id="content-heading" className="text-lg font-semibold text-fg">
            Data &amp; content
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            Anime information comes from {providerName} and episode details from ani.zip. ANIVIA does not host or stream episodes — trailers come from YouTube and “Where to watch” links lead to official, licensed services. All titles, images and trademarks belong to their respective owners.
          </p>
        </div>
        <ButtonLink to="/contact" variant="secondary">
          {t('Contact us')}
        </ButtonLink>
      </section>
    </div>
  )
}
