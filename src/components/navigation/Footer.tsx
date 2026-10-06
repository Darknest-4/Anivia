import { t } from '@/i18n'
import { AtSign, Camera, Globe, Mail, MessageCircle } from 'lucide-react'
import { config } from '@/config'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui'
import { useProviderInfo } from '@/hooks/queries'

const columns = [
  {
    title: t('Navigation'),
    links: [
      { to: '/', label: t('Home') },
      { to: '/browse', label: t('Browse') },
      { to: '/schedule', label: t('Schedule') },
      { to: '/season', label: t('Seasonal') },
      { to: '/genres', label: t('Genres') },
    ],
  },
  {
    title: t('Product'),
    links: [
      { to: '/watchlist', label: t('Watchlist') },
      { to: '/history', label: t('History') },
      { to: '/characters', label: t('Characters') },
      { to: '/studios', label: t('Studios') },
      ...(config.enablePricing ? [{ to: '/pricing', label: t('Pricing') }] : []),
    ],
  },
  {
    title: t('Resources'),
    links: [
      { to: '/about', label: t('About ANIVIA') },
      { to: '/contact', label: t('Contact') },
      { to: '/settings', label: t('Settings') },
      { to: '/search', label: t('Search') },
    ],
  },
  {
    title: t('Legal'),
    links: [
      { to: '/terms', label: t('Terms of Service') },
      { to: '/privacy', label: t('Privacy Policy') },
      { to: '/about#content', label: t('Content Policy') },
    ],
  },
]

const socials = [
  { label: t('Discord'), icon: MessageCircle, href: config.social.discord },
  { label: t('X / Twitter'), icon: AtSign, href: config.social.x },
  { label: t('Instagram'), icon: Camera, href: config.social.instagram },
  { label: t('Website'), icon: Globe, href: config.social.website },
  { label: t('Email'), icon: Mail, href: config.supportEmail ? `mailto:${config.supportEmail}` : '' },
].filter((s) => s.href)

export function Footer() {
  const source = useProviderInfo()
  return (
    <footer className="mt-20 border-t border-line bg-surface/40">
      <div className="container-app py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2.6fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 font-display text-lg font-semibold text-fg">{t('Discover. Watch. Remember.')}</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              {t('Your anime universe — trending series, weekly schedules and a library that remembers where you left off.')}
            </p>
            {socials.length > 0 && <ul className="mt-6 flex gap-2" aria-label={t('Social links')}>
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target={s.href.startsWith('mailto:') ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                  >
                    <s.icon className="h-[18px] w-[18px]" />
                  </a>
                </li>
              ))}
            </ul>}
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="eyebrow mb-4 font-sans">{col.title}</h2>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="text-sm text-fg-muted transition-colors hover:text-fg">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>{t('© {p0} ANIVIA. All rights reserved.', { p0: new Date().getFullYear() })}</p>
          <p>{t('Anime data provided by {p0}. Not affiliated with any rights holder.', { p0: source.name })}</p>
        </div>
      </div>
    </footer>
  )
}
