import { CalendarDays, MapPin, Settings, Share2 } from 'lucide-react'
import { Avatar, Badge, Button, ButtonLink } from '@/components/ui'
import { formatDate } from '@/lib/format'
import type { User } from '@/types'

export function ProfileHeader({ user, banner, onShare }: { user: User; banner?: string; onShare: () => void }) {
  return (
    <header className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="relative h-36 sm:h-48">
        {banner ? <img src={banner} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-r from-accent/40 to-info/30" />}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
      </div>
      <div className="relative -mt-14 flex flex-col gap-4 px-5 pb-6 sm:-mt-16 sm:flex-row sm:items-end sm:px-8">
        <Avatar name={user.displayName} hue={user.avatarHue} size="xl" className="ring-4 ring-surface" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-fg sm:text-3xl">{user.displayName}</h1>
            {user.plan !== 'free' && (
              <Badge variant="accent" size="md">
              {user.plan.toUpperCase()}
            </Badge>
            )}
          </div>
          <p className="text-sm text-fg-subtle">@{user.username}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
            {user.memberSince && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Member since {formatDate(user.memberSince, { month: 'long', year: 'numeric' })}
              </span>
            )}
            {user.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {user.location}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <ButtonLink to="/settings?tab=account" variant="secondary" size="md" leftIcon={<Settings className="h-4 w-4" />}>
            Edit profile
          </ButtonLink>
          <Button variant="secondary" size="icon" aria-label="Share profile" onClick={onShare} className="h-11 w-11">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="border-t border-line px-5 py-4 text-sm leading-relaxed text-fg-muted sm:px-8">{user.bio}</p>
    </header>
  )
}
