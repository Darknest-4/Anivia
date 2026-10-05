import { ExternalLink, Tv } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { WatchLink } from '@/types'

/** “Where to watch” buttons linking to licensed streaming services. */
export function WatchLinks({ links, className, title = 'Where to watch' }: { links?: WatchLink[]; className?: string; title?: string }) {
  if (!links?.length) return null
  return (
    <section aria-label={title} className={cn('rounded-2xl border border-line bg-surface p-5', className)}>
      <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
        <Tv className="h-4 w-4 text-accent-soft" />
        {title}
      </h2>
      <p className="mt-1 text-xs text-fg-subtle">Official, licensed streaming services. Availability depends on your region.</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.url}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 text-sm font-semibold text-fg transition-colors hover:border-line-strong"
            >
              {l.icon ? (
                <img src={l.icon} alt="" className="h-5 w-5 rounded" style={l.color ? { background: l.color } : undefined} />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color ?? 'hsl(var(--accent))' }} />
              )}
              {l.name}
              <ExternalLink className="h-3.5 w-3.5 text-fg-subtle" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
