import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, Sparkles, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, ButtonLink, Popover, Skeleton } from '@/components/ui'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/providers/ToastProvider'
import { config } from '@/config'
import { libraryNav } from './navItems'

const syncLabel = { idle: 'Sync idle', syncing: 'Syncing…', synced: 'Library synced', error: 'Sync failed — retrying' } as const

/** Account dropdown: sign-in buttons when signed out, profile + sync status + sign-out when signed in. */
export function UserMenu() {
  const { user, signedIn, isGuest, auth } = useCurrentUser()
  const toast = useToast()
  const navigate = useNavigate()

  if (auth.status === 'loading') return <Skeleton className="h-9 w-9 rounded-full" />
  if (isGuest)
    return (
      <div className="flex items-center gap-2">
        <ButtonLink to="/login" variant="ghost" size="sm" aria-label="Sign in" title="Sign in" className="px-2.5 2xl:px-3" leftIcon={<LogIn className="h-4 w-4" />}>
          <span className="hidden 2xl:inline">Sign in</span>
        </ButtonLink>
        <ButtonLink to="/register" size="sm" className="hidden 3xl:inline-flex" leftIcon={<UserPlus className="h-4 w-4" />}>
          Join free
        </ButtonLink>
      </div>
    )

  const SyncIcon = auth.syncStatus === 'error' ? CloudOff : auth.syncStatus === 'syncing' ? RefreshCw : Cloud
  return (
    <Popover
      className="w-64"
      trigger={(p) => (
        <button type="button" onClick={p.toggle} aria-expanded={p['aria-expanded']} aria-haspopup="menu" aria-label="Account menu" className="rounded-full transition-transform hover:scale-105">
          <Avatar name={user.displayName} hue={user.avatarHue} size="sm" className="ring-line-strong" />
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center gap-3 px-3 pb-3 pt-2">
            <Avatar name={user.displayName} hue={user.avatarHue} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{user.displayName}</p>
              <p className="truncate text-xs text-fg-subtle">{signedIn ? auth.email : `@${user.username}`}</p>
            </div>
          </div>
          {signedIn && (
            <p className="mx-3 mb-2 inline-flex items-center gap-1.5 rounded-md bg-surface-3 px-2 py-1 text-2xs font-semibold text-fg-muted" role="status">
              <SyncIcon className={auth.syncStatus === 'syncing' ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} />
              {syncLabel[auth.syncStatus]}
            </p>
          )}
          <div className="h-px bg-line" />
          <nav className="py-1">
            {libraryNav.map((item) => (
              <Link key={item.to} to={item.to} onClick={close} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-surface-3 hover:text-fg">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            {config.enablePricing && (
              <Link to="/pricing" onClick={close} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-accent-soft hover:bg-surface-3">
              <Sparkles className="h-4 w-4" />
              Upgrade to Pro
            </Link>
            )}
          </nav>
          <div className="h-px bg-line" />
          {signedIn ? (
            <button
              type="button"
              onClick={async () => {
                close()
                try {
                  await auth.signOut()
                  toast({ title: 'Signed out', description: 'Your library stays on this device.', variant: 'info' })
                  navigate('/')
                } catch (e) {
                  toast({ title: 'Couldn’t sign out', description: (e as Error).message, variant: 'error' })
                }
              }}
              className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-surface-3 hover:text-fg"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : (
            <Link to="/login" onClick={close} className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-surface-3 hover:text-fg">
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>
      )}
    </Popover>
  )
}
