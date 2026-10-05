import { Bell, CalendarClock, Megaphone, PlayCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Popover } from '@/components/ui'
import { cn } from '@/lib/cn'

const demoNotifications = [
  { id: 'n1', icon: PlayCircle, title: 'New episode added', body: 'Celestial Eclipse · Episode 14 “Kaelen’s Sword” is now available.', time: '2h ago', to: '/anime/celestial-eclipse/watch?ep=14' },
  { id: 'n2', icon: CalendarClock, title: 'Premiering tonight', body: 'Mistral Academy of Magecraft airs at 18:30.', time: '5h ago', to: '/schedule' },
  { id: 'n3', icon: PlayCircle, title: 'New episode added', body: 'Shadowline Tokyo · Episode 1 is now available.', time: '1d ago', to: '/anime/shadowline-tokyo' },
  { id: 'n4', icon: Megaphone, title: 'Announcement', body: 'Bloodline of Ash premieres January 2027. Add it to your watchlist!', time: '3d ago', to: '/anime/bloodline-of-ash' },
]

/** Demo notification center. Replace the static list with your own notifications API. */
export function NotificationsMenu() {
  const [read, setRead] = useState<string[]>([])
  const unread = demoNotifications.filter((n) => !read.includes(n.id)).length
  return (
    <Popover
      className="w-[min(360px,calc(100vw-2rem))] p-0"
      trigger={(p) => (
        <button
          type="button"
          onClick={p.toggle}
          aria-expanded={p['aria-expanded']}
          aria-haspopup="menu"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-bg" aria-hidden />}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            <button type="button" onClick={() => setRead(demoNotifications.map((n) => n.id))} className="text-xs font-semibold text-accent-soft hover:underline">
              Mark all as read
            </button>
          </div>
          <ul className="max-h-[360px] overflow-y-auto p-1.5 scrollbar-thin">
            {demoNotifications.map((n) => {
              const isRead = read.includes(n.id)
              return (
                <li key={n.id}>
                  <Link
                    to={n.to}
                    onClick={() => {
                      setRead((r) => [...new Set([...r, n.id])])
                      close()
                    }}
                    className="flex gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-3"
                  >
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', isRead ? 'bg-surface-3 text-fg-subtle' : 'bg-accent/15 text-accent-soft')}>
                      <n.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn('text-[13px] font-semibold', isRead ? 'text-fg-muted' : 'text-fg')}>{n.title}</span>
                        <span className="shrink-0 text-2xs text-fg-subtle">{n.time}</span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-fg-subtle">{n.body}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <Link to="/settings?tab=notifications" onClick={close} className="block border-t border-line px-4 py-3 text-center text-xs font-semibold text-fg-muted hover:text-fg">
            Notification settings
          </Link>
        </div>
      )}
    </Popover>
  )
}
