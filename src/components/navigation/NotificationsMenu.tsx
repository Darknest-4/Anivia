import { Bell, BellOff, CalendarClock, Link2, PlayCircle, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Popover } from '@/components/ui'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/format'

const ICONS: Record<AppNotification['kind'], typeof Bell> = { episode: PlayCircle, soon: CalendarClock, premiere: Sparkles, related: Link2 }

/** Notification center driven by the user's watchlist and live airing data. */
export function NotificationsMenu() {
  const { notifications, unreadCount, isRead, markRead, markAllRead, isLoading, watching } = useNotifications()
  return (
    <Popover
      className="w-[min(380px,calc(100vw-2rem))] p-0"
      trigger={(p) => (
        <button
          type="button"
          onClick={p.toggle}
          aria-expanded={p['aria-expanded']}
          aria-haspopup="menu"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-bg" aria-hidden>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-semibold text-accent-soft hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-3 text-fg-subtle">
                <BellOff className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-fg">{isLoading ? 'Checking your shows…' : 'You’re all caught up'}</p>
              <p className="mt-1 text-xs leading-relaxed text-fg-subtle">
                {watching
                  ? 'New episodes, airing reminders and premieres from your watchlist will appear here.'
                  : 'Add airing or upcoming anime to your watchlist to get episode alerts.'}
              </p>
            </div>
          ) : (
            <ul className="max-h-[380px] overflow-y-auto p-1.5 scrollbar-thin">
              {notifications.map((n) => {
                const read = isRead(n.id)
                const Icon = ICONS[n.kind]
                return (
                  <li key={n.id}>
                    <Link
                      to={n.to}
                      onClick={() => {
                        markRead(n.id)
                        close()
                      }}
                      className="flex gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-3"
                    >
                      <span className="relative shrink-0">
                        <img src={n.anime.poster} alt="" className="h-12 w-9 rounded-md object-cover" />
                        <span className={cn('absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-surface-2', read ? 'bg-surface-3 text-fg-subtle' : 'bg-accent text-white')}>
                          <Icon className="h-3 w-3" />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={cn('text-[13px] font-semibold', read ? 'text-fg-muted' : 'text-fg')}>{n.title}</span>
                          <span className="shrink-0 text-2xs text-fg-subtle">{formatRelative(n.at)}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-fg-subtle">{n.body}</span>
                      </span>
                      {!read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          <Link to="/settings?tab=notifications" onClick={close} className="block border-t border-line px-4 py-3 text-center text-xs font-semibold text-fg-muted hover:text-fg">
            Notification settings
          </Link>
        </div>
      )}
    </Popover>
  )
}
