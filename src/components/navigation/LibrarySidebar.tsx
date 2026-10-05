import { NavLink } from 'react-router-dom'
import { Avatar } from '@/components/ui'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useHistory, useWatchlist } from '@/hooks/useUserData'
import { cn } from '@/lib/cn'
import { discoverNav, libraryNavWithUpgrade } from './navItems'

/** Desktop sidebar for the personal library area (watchlist, history, profile, settings). */
export function LibrarySidebar() {
  const { items } = useWatchlist()
  const { user, isGuest } = useCurrentUser()
  const history = useHistory()
  const counts: Record<string, number> = { '/watchlist': items.length, '/history': history.length }

  return (
    <aside className="sticky top-[calc(var(--header-h)+1.5rem)] hidden h-fit w-60 shrink-0 lg:block" aria-label="Library">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
        <Avatar name={user.displayName} hue={user.avatarHue} src={user.avatarUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{user.displayName}</p>
          {isGuest ? (
            <NavLink to="/login" className="text-xs font-semibold text-accent-soft hover:underline">
              Sign in to sync
            </NavLink>
          ) : (
            <p className="truncate text-xs text-fg-subtle">@{user.username}</p>
          )}
        </div>
      </div>
      <nav className="mt-4 space-y-6">
        {[
          { title: 'Library', items: libraryNavWithUpgrade },
          { title: 'Discover', items: discoverNav },
        ].map((section) => (
          <div key={section.title}>
            <p className="eyebrow px-3 pb-2">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-surface-2 text-fg before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-accent'
                          : 'text-fg-muted hover:bg-surface-2/60 hover:text-fg',
                      )
                    }
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    <span className="flex-1">{item.label}</span>
                    {counts[item.to] !== undefined && <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-2xs font-semibold text-fg-subtle">{counts[item.to]}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
