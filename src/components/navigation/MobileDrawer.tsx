import { LogIn, LogOut, UserPlus } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ButtonLink, Drawer, Logo } from '@/components/ui'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn } from '@/lib/cn'
import { discoverNav, libraryNav, primaryNav, upgradeNav, type NavItem } from './navItems'
import { ThemeSegmented } from './ThemeToggle'

function Section({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="px-3 py-2">
      <p className="eyebrow px-3 pb-2">{title}</p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors',
                  isActive ? 'bg-accent/12 text-accent-soft' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signedIn, isGuest, auth } = useCurrentUser()
  const { pathname } = useLocation()
  useEffect(() => {
    onClose()
    // Close whenever the route changes.
  }, [pathname])

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      title="Menu"
      footer={
        isGuest ? (
          <div className="grid grid-cols-2 gap-2">
            <ButtonLink to="/login" variant="secondary" size="md" leftIcon={<LogIn className="h-4 w-4" />}>
              Sign in
            </ButtonLink>
            <ButtonLink to="/register" size="md" leftIcon={<UserPlus className="h-4 w-4" />}>
              Join free
            </ButtonLink>
          </div>
        ) : signedIn ? (
          <button
            type="button"
            onClick={() => void auth.signOut().then(onClose)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 text-sm font-semibold text-fg-muted hover:text-fg"
          >
            <LogOut className="h-4 w-4" />
            Sign out ({user.displayName})
          </button>
        ) : undefined
      }
    >
      <div className="px-6 pb-4">
        <Logo />
        <p className="mt-2 text-xs text-fg-subtle">Discover. Watch. Remember.</p>
      </div>
      <Section title="Discover" items={[...primaryNav, ...discoverNav]} />
      <Section title="Library" items={[...libraryNav, upgradeNav]} />
      <div className="px-6 py-4">
        <p className="eyebrow pb-2">Appearance</p>
        <ThemeSegmented />
      </div>
    </Drawer>
  )
}
