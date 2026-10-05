import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { mobileTabs } from './navItems'

/** Fixed bottom tab bar for phones and tablets. */
export function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="surface-glass fixed inset-x-0 bottom-0 z-nav border-t border-line/80 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid h-[var(--bottom-nav-h)] max-w-lg grid-cols-5">
        {mobileTabs.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn('group flex h-full flex-col items-center justify-center gap-1 text-2xs font-semibold transition-colors', isActive ? 'text-fg' : 'text-fg-subtle hover:text-fg-muted')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-base', isActive && 'bg-accent/15 text-accent-soft')}>
                    <tab.icon className={cn('h-5 w-5', isActive && 'stroke-[2.4]')} />
                  </span>
                  {tab.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
