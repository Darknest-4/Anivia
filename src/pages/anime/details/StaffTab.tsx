import { Avatar } from '@/components/ui'
import type { Anime } from '@/types'

export function StaffTab({ anime }: { anime: Anime }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {(anime.staff ?? []).map((s, i) => (
        <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
          <Avatar name={s.name} hue={(anime.artwork?.hue ?? 348) + i * 30} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{s.name}</p>
            <p className="text-xs text-fg-subtle">{s.role}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
