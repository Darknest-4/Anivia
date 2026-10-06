import { Check, ImageIcon, Search, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Dialog, EmptyState, Input, Skeleton } from '@/components/ui'
import { useCharacters, useSearch, useTrending } from '@/hooks/queries'
import { useDebounce } from '@/hooks/useDebounce'
import type { ProfileImageKind } from '@/hooks/useProfileImages'
import { cn } from '@/lib/cn'
import { isAllowedProfileImage } from '@/lib/profileImages'

interface Props {
  kind: ProfileImageKind
  open: boolean
  current?: string
  onClose: () => void
  onSave: (url: string | null) => Promise<void>
}

/**
 * Pick a profile picture from anime characters, or a banner from anime banners
 * (AniList / MyAnimeList artwork — searched live through the active data source).
 */
export function ProfileImagePicker({ kind, open, current, onClose, onSave }: Props) {
  const [text, setText] = useState('')
  const query = useDebounce(text.trim(), 350)
  const [selected, setSelected] = useState<string | undefined>(current)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSelected(current)
      setError(null)
    }
  }, [open, current])

  const save = async (url: string | null) => {
    setSaving(true)
    setError(null)
    try {
      await onSave(url)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const avatar = kind === 'avatar'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      icon={avatar ? <UserRound className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
      title={avatar ? 'Choose a profile picture' : 'Choose a profile banner'}
      description={avatar ? 'Pick any anime character — search by name.' : 'Pick the banner of an anime — search by title.'}
      footer={
        <>
          {current && (
            <Button variant="ghost" className="mr-auto" disabled={saving} onClick={() => void save(null)}>
              Remove
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} disabled={!selected || selected === current} onClick={() => selected && void save(selected)}>
            Save
          </Button>
        </>
      }
    >
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={avatar ? 'Search characters, e.g. Frieren, Luffy…' : 'Search anime, e.g. One Piece…'}
        aria-label={avatar ? 'Search characters' : 'Search anime'}
        leftIcon={<Search />}
        autoFocus
      />
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-4 max-h-[52vh] overflow-y-auto pr-1">
        {avatar ? <CharacterGrid query={query} selected={selected} onSelect={setSelected} /> : <BannerGrid query={query} selected={selected} onSelect={setSelected} />}
      </div>
    </Dialog>
  )
}

interface GridProps {
  query: string
  selected?: string
  onSelect: (url: string) => void
}

function CharacterGrid({ query, selected, onSelect }: GridProps) {
  // No query → the most popular characters.
  const { data, isLoading } = useCharacters(query ? { query } : {})
  const items = useMemo(() => (data ?? []).filter((c) => isAllowedProfileImage(c.image)).slice(0, 30), [data])
  if (isLoading && !data)
    return (
      <div className="grid grid-cols-3 gap-3 xs:grid-cols-4 sm:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-full" />
        ))}
      </div>
    )
  if (!items.length) return <EmptyState compact icon={<Search />} title="No characters found" description="Try another name." />
  return (
    <>
      {!query && <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Popular characters</p>}
      <ul className="grid grid-cols-3 gap-x-3 gap-y-4 xs:grid-cols-4 sm:grid-cols-5">
        {items.map((c) => {
          const active = selected === c.image
          return (
            <li key={c.id}>
              <button type="button" onClick={() => onSelect(c.image)} aria-pressed={active} className="group flex w-full flex-col items-center gap-1.5 text-center">
                <span className={cn('relative block aspect-square w-full overflow-hidden rounded-full ring-2 transition', active ? 'ring-accent' : 'ring-transparent group-hover:ring-line-strong')}>
                  <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
                  {active && (
                    <span className="absolute inset-0 flex items-center justify-center bg-accent/40">
                      <Check className="h-6 w-6 text-white" />
                    </span>
                  )}
                </span>
                <span className="line-clamp-1 text-xs font-semibold text-fg">{c.name}</span>
                {c.animeTitle && <span className="-mt-1 line-clamp-1 text-2xs text-fg-subtle">{c.animeTitle}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function BannerGrid({ query, selected, onSelect }: GridProps) {
  const search = useSearch(query)
  const trending = useTrending()
  const source = query ? search : trending
  // Only titles that have a real wide banner (not just the cover reused as backdrop).
  const items = useMemo(() => (source.data ?? []).filter((a) => a.backdrop && a.backdrop !== a.poster && isAllowedProfileImage(a.backdrop)).slice(0, 24), [source.data])
  if (source.isLoading && !source.data)
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-[19/5] rounded-xl" />
        ))}
      </div>
    )
  if (!items.length) return <EmptyState compact icon={<Search />} title="No banners found" description="Try another title — not every anime has a banner." />
  return (
    <>
      {!query && <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Trending anime</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((a) => {
          const active = selected === a.backdrop
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelect(a.backdrop!)}
                aria-pressed={active}
                aria-label={`Banner of ${a.title}`}
                className={cn('relative block aspect-[19/5] w-full overflow-hidden rounded-xl ring-2 transition', active ? 'ring-accent' : 'ring-transparent hover:ring-line-strong')}
              >
                <img src={a.backdrop} alt="" loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-1.5 pt-4 text-left text-xs font-semibold text-white">{a.title}</span>
                {active && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
