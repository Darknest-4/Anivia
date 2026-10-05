import type { Anime } from '@/types'

/** Horizontal bar breakdown of the genres in a user's library. */
export function GenreBreakdown({ anime }: { anime: Anime[] }) {
  const counts = new Map<string, { name: string; hue: number; count: number }>()
  for (const a of anime) for (const g of a.genres) counts.set(g.slug, { name: g.name, hue: g.hue, count: (counts.get(g.slug)?.count ?? 0) + 1 })
  const rows = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6)
  const max = rows[0]?.count ?? 1
  if (!rows.length) return <p className="text-sm text-fg-subtle">Add titles to your library to see your genre profile.</p>
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.name}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-fg-muted">{r.name}</span>
            <span className="tabular-nums text-fg-subtle">{r.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: `hsl(${r.hue} 80% 58%)` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
