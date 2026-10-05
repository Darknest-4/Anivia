import { Heart, Mic, Ruler, Shield, Sparkle } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimeCardHorizontal, CharacterCard } from '@/components/anime'
import { Breadcrumbs } from '@/components/common/PageHeader'
import { Badge, Button, ErrorState, Skeleton } from '@/components/ui'
import { useAnime, useCharacter, useCharacters } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { formatCompact } from '@/lib/format'
import { useToast } from '@/providers/ToastProvider'
import NotFoundPage from '@/pages/info/NotFoundPage'

export default function CharacterPage() {
  const { id } = useParams()
  const { data: character, isLoading, isError, refetch } = useCharacter(id)
  const anime = useAnime(character?.animeId)
  const castmates = useCharacters({ animeId: character?.animeId })
  const [liked, setLiked] = useState(false)
  const toast = useToast()
  useDocumentMeta({ title: character?.name ?? 'Character', description: character?.description, type: 'profile' })

  if (isLoading)
    return (
      <div className="container-app grid gap-8 py-10 md:grid-cols-[280px_1fr]">
        <Skeleton className="aspect-[3/4] rounded-2xl" />
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-4 h-24 w-full" />
        </div>
      </div>
    )
  if (isError)
    return (
      <div className="container-app py-16">
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  if (!character) return <NotFoundPage />

  const facts = [
    { icon: Sparkle, label: 'Age', value: character.age },
    { icon: Ruler, label: 'Height', value: character.height },
    { icon: Shield, label: 'Affiliation', value: character.affiliation },
  ].filter((f) => f.value)

  return (
    <div className="container-app">
      <Breadcrumbs className="pb-6 pt-8 sm:pt-10" items={[{ label: 'Home', to: '/' }, { label: 'Characters', to: '/characters' }, { label: character.name }]} />
      <div className="grid gap-8 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[280px] md:max-w-none">
          <img src={character.image} alt={`Portrait of ${character.name}`} className="aspect-[3/4] w-full rounded-2xl object-cover shadow-pop ring-1 ring-line" />
          <Button
            variant={liked ? 'primary' : 'secondary'}
            className="mt-4 w-full"
            leftIcon={<Heart className={liked ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />}
            onClick={() => {
              setLiked((l) => !l)
              toast({ title: liked ? 'Removed from favorites' : 'Added to favorite characters', description: character.name, icon: Heart })
            }}
            aria-pressed={liked}
          >
            {formatCompact(character.favorites + (liked ? 1 : 0))} favorites
          </Button>
        </div>
        <div className="min-w-0">
          <Badge variant={character.role === 'Main' ? 'accent' : character.role === 'Antagonist' ? 'danger' : 'default'} size="md">
            {character.role} character
          </Badge>
          <h1 className="mt-3 text-3xl font-bold text-fg sm:text-4xl">{character.name}</h1>
          {character.nativeName && <p className="mt-1 text-fg-subtle">{character.nativeName}</p>}
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-fg-muted">{character.description}</p>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface p-4">
              <dt className="flex items-center gap-1.5 text-xs text-fg-subtle">
                <Mic className="h-3.5 w-3.5" />
                Voice actor (Japanese)
              </dt>
              <dd className="mt-1 font-semibold text-fg">{character.voiceActor}</dd>
            </div>
            {character.voiceActorEn && (
              <div className="rounded-2xl border border-line bg-surface p-4">
                <dt className="flex items-center gap-1.5 text-xs text-fg-subtle">
                  <Mic className="h-3.5 w-3.5" />
                  Voice actor (English)
                </dt>
                <dd className="mt-1 font-semibold text-fg">{character.voiceActorEn}</dd>
              </div>
            )}
            {facts.map((f) => (
              <div key={f.label} className="rounded-2xl border border-line bg-surface p-4">
                <dt className="flex items-center gap-1.5 text-xs text-fg-subtle">
                  <f.icon className="h-3.5 w-3.5" />
                  {f.label}
                </dt>
                <dd className="mt-1 font-semibold text-fg">{f.value}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="appears-heading" className="mt-8">
            <h2 id="appears-heading" className="mb-3 text-lg font-semibold text-fg">
              Appears in
            </h2>
            {anime.data ? <AnimeCardHorizontal anime={anime.data} /> : <Skeleton className="h-40 rounded-2xl" />}
          </section>
        </div>
      </div>

      {castmates.data && castmates.data.length > 1 && (
        <section aria-labelledby="cast-heading" className="mt-14">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="cast-heading" className="text-xl font-bold text-fg">
              More from {anime.data?.title ?? 'this series'}
            </h2>
            {anime.data && (
              <Link to={`/anime/${anime.data.id}?tab=characters`} className="text-sm font-semibold text-fg-muted hover:text-fg">
                Full cast
              </Link>
            )}
          </div>
          <ul className="grid grid-cols-2 gap-4 xs:grid-cols-3 md:grid-cols-5 xl:grid-cols-6">
            {castmates.data
              .filter((c) => c.id !== character.id)
              .map((c) => (
                <li key={c.id}>
                  <CharacterCard character={c} />
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  )
}
