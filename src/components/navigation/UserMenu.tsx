import { LogIn, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, Popover } from '@/components/ui'
import { demoUser } from '@/data/user'
import { libraryNav } from './navItems'

/** Avatar dropdown for the demo account. Authentication is UI-only. */
export function UserMenu() {
  return (
    <Popover
      className="w-64"
      trigger={(p) => (
        <button type="button" onClick={p.toggle} aria-expanded={p['aria-expanded']} aria-haspopup="menu" aria-label="Account menu" className="rounded-full transition-transform hover:scale-105">
          <Avatar name={demoUser.displayName} hue={demoUser.avatarHue} size="sm" className="ring-line-strong" />
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center gap-3 px-3 pb-3 pt-2">
            <Avatar name={demoUser.displayName} hue={demoUser.avatarHue} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{demoUser.displayName}</p>
              <p className="truncate text-xs text-fg-subtle">@{demoUser.username} · Plus</p>
            </div>
          </div>
          <div className="h-px bg-line" />
          <nav className="py-1">
            {libraryNav.map((item) => (
              <Link key={item.to} to={item.to} onClick={close} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-surface-3 hover:text-fg">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Link to="/pricing" onClick={close} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-accent-soft hover:bg-surface-3">
              <Sparkles className="h-4 w-4" />
              Upgrade to Pro
            </Link>
          </nav>
          <div className="h-px bg-line" />
          <Link to="/login" onClick={close} className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-surface-3 hover:text-fg">
            <LogIn className="h-4 w-4" />
            Switch account
          </Link>
        </div>
      )}
    </Popover>
  )
}
