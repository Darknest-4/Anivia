import { AtSign, Globe, Mail, MessageCircle, Rss } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui'

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
      { to: '/pricing', label: 'Pricing' },
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
  { label: 'Community', icon: MessageCircle },
  { label: 'Website', icon: Globe },
  { label: 'Social', icon: AtSign },
  { label: 'Newsletter', icon: Mail },
  { label: 'RSS feed', icon: Rss },
]

export function Footer() {
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
            <ul className="mt-6 flex gap-2" aria-label="Social links">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    aria-label={`${s.label} (placeholder link)`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                  >
                    <s.icon className="h-[18px] w-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
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
          <p>All titles, characters and artwork shown are fictional demo content.</p>
        </div>
      </div>
    </footer>
  )
}
