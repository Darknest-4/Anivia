import { AtSign, Camera, Globe, Mail, MessageCircle } from 'lucide-react'
import { config } from '@/config'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui'
import { useProviderInfo } from '@/hooks/queries'

const columns = [
  {
    title: 'Navigation',
    links: [
      { to: '/', label: 'Home' },
      { to: '/browse', label: 'Browse' },
      { to: '/schedule', label: 'Schedule' },
      { to: '/season', label: 'Seasonal' },
      { to: '/genres', label: 'Genres' },
    ],
  },
  {
    title: 'Product',
    links: [
      { to: '/watchlist', label: 'Watchlist' },
      { to: '/history', label: 'History' },
      { to: '/characters', label: 'Characters' },
      { to: '/studios', label: 'Studios' },
      ...(config.enablePricing ? [{ to: '/pricing', label: 'Pricing' }] : []),
    ],
  },
  {
    title: 'Resources',
    links: [
      { to: '/about', label: 'About ANIVIA' },
      { to: '/contact', label: 'Contact' },
      { to: '/settings', label: 'Settings' },
      { to: '/search', label: 'Search' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/terms', label: 'Terms of Service' },
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/about#content', label: 'Content Policy' },
    ],
  },
]

const socials = [
  { label: 'Discord', icon: MessageCircle, href: config.social.discord },
  { label: 'X / Twitter', icon: AtSign, href: config.social.x },
  { label: 'Instagram', icon: Camera, href: config.social.instagram },
  { label: 'Website', icon: Globe, href: config.social.website },
  { label: 'Email', icon: Mail, href: config.supportEmail ? `mailto:${config.supportEmail}` : '' },
].filter((s) => s.href)

export function Footer() {
  const source = useProviderInfo()
  return (
    <footer className="mt-20 border-t border-line bg-surface/40">
      <div className="container-app py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2.6fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 font-display text-lg font-semibold text-fg">Discover. Watch. Remember.</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              Your anime universe — trending series, weekly schedules and a library that remembers where you left off.
            </p>
            {socials.length > 0 && <ul className="mt-6 flex gap-2" aria-label="Social links">
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
          <p>© {new Date().getFullYear()} ANIVIA. All rights reserved.</p>
          <p>{`Anime data provided by ${source.name}. Not affiliated with any rights holder.`}</p>
        </div>
      </div>
    </footer>
  )
}
