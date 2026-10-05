import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatCompact } from '@/lib/format'
import type { Character } from '@/types'

const roleVariant = { Main: 'accent', Supporting: 'default', Antagonist: 'danger' } as const

export function CharacterCard({ character, animeTitle, className }: { character: Character; animeTitle?: string; className?: string }) {
  return (
    <Link to={`/character/${character.id}`} className={cn('group block min-w-0', className)}>
      <div className="relative overflow-hidden rounded-xl ring-1 ring-line/60">
        <img src={character.image} alt="" loading="lazy" decoding="async" className="aspect-[3/4] w-full object-cover transition-transform duration-slow ease-out group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <Badge variant={roleVariant[character.role]} className="absolute left-2 top-2 backdrop-blur-md">
          {character.role}
        </Badge>
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-xs font-semibold text-white/90">
          <Heart className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden />
          {formatCompact(character.favorites)}
        </span>
      </div>
      <p className="mt-2.5 truncate text-sm font-semibold text-fg transition-colors group-hover:text-accent-soft">{character.name}</p>
      <p className="truncate text-xs text-fg-subtle">{animeTitle ?? character.animeTitle ?? `CV: ${character.voiceActor}`}</p>
    </Link>
  )
}
