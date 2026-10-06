import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/format'
import type { Author } from '@/services/community'

/** Author line: picture, name (links to the public profile when there is one) and time. */
export function AuthorLine({ author, at, className }: { author: Author; at?: string; className?: string }) {
  const name = (
    <span className="font-semibold text-fg">{author.display_name}</span>
  )
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Avatar name={author.display_name} hue={author.avatar_hue} src={author.avatar_url ?? undefined} size="sm" />
      <div className="min-w-0 text-sm leading-tight">
        {author.username ? (
          <Link to={`/u/${author.username}`} className="hover:underline">
            {name}
          </Link>
        ) : (
          name
        )}
        {at && <p className="text-2xs text-fg-subtle">{formatRelative(at)}</p>}
      </div>
    </div>
  )
}

/** Text that stays hidden behind a "show spoiler" button. */
export function SpoilerText({ text, spoiler, className }: { text: string; spoiler: boolean; className?: string }) {
  const [shown, setShown] = useState(!spoiler)
  if (!shown)
    return (
      <button type="button" onClick={() => setShown(true)} className={cn('rounded-lg bg-warning/10 px-3 py-2 text-left text-sm font-medium text-warning ring-1 ring-inset ring-warning/25', className)}>
        Contains spoilers — tap to show
      </button>
    )
  return <p className={cn('whitespace-pre-wrap break-words text-sm leading-relaxed text-fg-muted', className)}>{text}</p>
}
