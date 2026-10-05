import { Command, Menu, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Avatar, Logo } from '@/components/ui'
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete'
import { demoUser } from '@/data/user'
import { cn } from '@/lib/cn'
import { useCommandMenu } from '@/providers/CommandMenuProvider'
import { primaryNav } from './navItems'
import { NotificationsMenu } from './NotificationsMenu'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

interface NavbarProps {
  /** Transparent over hero artwork until the user scrolls. */
  transparent?: boolean
  onOpenMenu: () => void
}

export function Navbar({ transparent, onOpenMenu }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const { setOpen } = useCommandMenu()
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solid = !transparent || scrolled

  return (
    <header
      className={cn(
        'sticky top-0 z-header h-[var(--header-h)] transition-[background-color,border-color,box-shadow] duration-base',
        solid ? 'surface-glass border-b border-line/70' : 'border-b border-transparent',
      )}
    >
      {!solid && <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 to-transparent" aria-hidden />}
      <div className="container-app relative flex h-full items-center gap-3 lg:gap-6">
        <Link to="/" aria-label="ANIVIA home" className={cn('shrink-0', !solid && '[&_span]:text-white')}>
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive
                    ? cn(solid ? 'text-fg' : 'text-white', 'after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-accent')
                    : solid
                      ? 'text-fg-muted hover:text-fg'
                      : 'text-white/75 hover:text-white',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/watchlist"
            className={({ isActive }) =>
              cn('rounded-lg px-3 py-2 text-sm font-semibold transition-colors', isActive ? (solid ? 'text-fg' : 'text-white') : solid ? 'text-fg-muted hover:text-fg' : 'text-white/75 hover:text-white')
            }
          >
            Watchlist
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          {pathname !== '/search' && <SearchAutocomplete className="hidden w-[220px] lg:block xl:w-[300px]" showShortcut />}
          <Link
            to="/search"
            aria-label="Search"
            className={cn('inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors lg:hidden', solid ? 'text-fg-muted hover:bg-surface-3 hover:text-fg' : 'text-white hover:bg-white/10')}
          >
            <Search className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open command menu"
            title="Command menu (Ctrl/⌘ K)"
            className={cn('hidden h-10 w-10 items-center justify-center rounded-lg transition-colors md:inline-flex lg:hidden xl:hidden', solid ? 'text-fg-muted hover:bg-surface-3 hover:text-fg' : 'text-white hover:bg-white/10')}
          >
            <Command className="h-[18px] w-[18px]" />
          </button>
          <div className={cn('hidden items-center gap-1 lg:flex', !solid && '[&>*]:text-white/85')}>
            <ThemeToggle />
            <NotificationsMenu />
          </div>
          <div className="hidden pl-1 lg:block">
            <UserMenu />
          </div>
          <Link to="/profile" aria-label="Profile" className="rounded-full lg:hidden">
            <Avatar name={demoUser.displayName} hue={demoUser.avatarHue} size="sm" className="ring-line-strong" />
          </Link>
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open menu"
            className={cn('inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors lg:hidden', solid ? 'text-fg hover:bg-surface-3' : 'text-white hover:bg-white/10')}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
