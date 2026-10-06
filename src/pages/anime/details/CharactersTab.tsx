import { t } from '@/i18n'
import { Mic, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, EmptyState, Skeleton } from '@/components/ui'
import { useCharacters } from '@/hooks/queries'
import type { Anime } from '@/types'

export function CharactersTab({ anime }: { anime: Anime }) {
  const { data, isLoading } = useCharacters({ animeId: anime.id })
  if (isLoading)
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    )
  if (!data?.length)
    return <EmptyState compact icon={<Users />} title={t('No characters yet')} description={t('Character profiles for this title aren’t available yet.')} />
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {data.map((c) => (
        <li key={c.id}>
          <Link to={`/character/${c.id}`} className="group flex gap-4 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong">
            <img src={c.image} alt="" loading="lazy" className="h-24 w-[72px] shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 py-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-fg group-hover:text-accent-soft">{c.name}</p>
                <Badge variant={c.role === 'Main' ? 'accent' : c.role === 'Antagonist' ? 'danger' : 'default'}>{t(c.role)}</Badge>
              </div>
              {c.nativeName && <p className="text-xs text-fg-subtle">{c.nativeName}</p>}
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-fg-muted">
                <Mic className="h-3.5 w-3.5 text-fg-subtle" />
                {c.voiceActor}
                {c.voiceActorEn && <span className="text-fg-subtle">· EN: {c.voiceActorEn}</span>}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-fg-subtle">{c.description}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
