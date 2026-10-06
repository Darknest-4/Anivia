import { ArrowUpRight, Building2, Clock, Hash, Loader2, Search, User, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Kbd } from '@/components/ui'
import { useSuggestions } from '@/hooks/queries'
import { useDebounce } from '@/hooks/useDebounce'
import { useRecentSearches } from '@/hooks/useUserData'
import { cn } from '@/lib/cn'
import { recentSearchesService } from '@/services/user'
import { thumb } from '@/lib/images'

interface Option {
  id: string
  group: string
  label: string
  sublabel?: string
  to: string
  icon?: ReactNode
  image?: string
  query?: string
}

interface SearchAutocompleteProps {
  className?: string
  size?: 'md' | 'lg'
  autoFocus?: boolean
  placeholder?: string
  /** Called with the submitted query; defaults to navigating to /search?q= */
  onSubmit?: (query: string) => void
  value?: string
  onValueChange?: (value: string) => void
  showShortcut?: boolean
  /** Open the suggestion panel when the input gains focus (default true). */
  openOnFocus?: boolean
}

/**
 * Accessible combobox with grouped suggestions (anime, genres, characters, studios)
 * and recent searches. Arrow keys move, Enter selects, Escape closes.
 */
export function SearchAutocomplete({
  className,
  size = 'md',
  autoFocus,
  placeholder = 'Search anime…',
  onSubmit,
  value: controlled,
  onValueChange,
  showShortcut,
  openOnFocus = true,
}: SearchAutocompleteProps) {
  const [internal, setInternal] = useState('')
  const value = controlled ?? internal
  const setValue = (v: string) => {
    setInternal(v)
    onValueChange?.(v)
  }
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const debounced = useDebounce(value.trim(), 200)
  const { data, isFetching } = useSuggestions(debounced)
  const recent = useRecentSearches()
  const navigate = useNavigate()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const options: Option[] = useMemo(() => {
    if (!debounced) {
      return recent.slice(0, 6).map((q) => ({ id: `recent-${q}`, group: 'Recent searches', label: q, to: `/search?q=${encodeURIComponent(q)}`, icon: <Clock className="h-4 w-4" />, query: q }))
    }
    if (!data) return []
    return [
      ...data.anime.map((a) => ({ id: `a-${a.id}`, group: 'Anime', label: a.title, sublabel: `${a.type} · ${a.year ?? 'TBA'} · ${a.genres.slice(0, 2).map((g) => g.name).join(', ')}`, to: `/anime/${a.id}`, image: a.poster })),
      ...data.genres.map((g) => ({ id: `g-${g.id}`, group: 'Genres', label: g.name, sublabel: g.animeCount !== undefined ? `${g.animeCount} titles` : 'Genre', to: `/genres/${g.slug}`, icon: <Hash className="h-4 w-4" /> })),
      ...data.characters.map((c) => ({ id: `c-${c.id}`, group: 'Characters', label: c.name, sublabel: c.role, to: `/character/${c.id}`, image: c.image, icon: <User className="h-4 w-4" /> })),
      ...data.studios.map((s) => ({ id: `s-${s.id}`, group: 'Studios', label: s.name, sublabel: [s.country, s.animeCount !== undefined ? `${s.animeCount} titles` : 'Studio'].filter(Boolean).join(' · '), to: `/studio/${s.id}`, icon: <Building2 className="h-4 w-4" /> })),
    ]
  }, [data, debounced, recent])

  useEffect(() => setActive(-1), [debounced])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const submit = (q: string) => {
    const query = q.trim()
    if (!query) return
    recentSearchesService.add(query)
    setOpen(false)
    inputRef.current?.blur()
    if (onSubmit) onSubmit(query)
    else navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  const choose = (opt: Option) => {
    if (opt.query) return submit(opt.query)
    if (value.trim()) recentSearchesService.add(value.trim())
    setOpen(false)
    navigate(opt.to)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(options.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(-1, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && options[active]) choose(options[active])
      else submit(value)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showPanel = open && (options.length > 0 || (debounced && !isFetching))
  let lastGroup = ''

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className={cn('pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle', size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')} aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={Boolean(showPanel)}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Search anime, genres, characters and studios"
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => openOnFocus && setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full rounded-xl border border-line bg-surface-2/80 text-fg placeholder:text-fg-subtle transition-colors hover:border-line-strong focus:border-accent/60 focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-accent/20',
            size === 'lg' ? 'h-14 pl-11 pr-24 text-base' : 'h-10 pl-10 pr-16 text-sm',
          )}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {isFetching && debounced && <Loader2 className="h-4 w-4 animate-spin text-fg-subtle" aria-hidden />}
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue('')
                inputRef.current?.focus()
              }}
              aria-label="Clear search"
              className="rounded-md p-1 text-fg-subtle hover:bg-surface-3 hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {showShortcut && !value && (
            <span className="hidden items-center gap-0.5 xl:flex" aria-hidden>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          )}
        </div>
      </div>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-overlay mt-2 max-h-[min(70vh,520px)] min-w-[320px] animate-scale-in overflow-y-auto rounded-2xl border border-line-strong/70 bg-surface-2/95 p-2 shadow-pop backdrop-blur-xl scrollbar-thin">
          <ul id={listId} role="listbox" aria-label="Search suggestions">
            {options.map((opt, i) => {
              const header = opt.group !== lastGroup ? opt.group : null
              lastGroup = opt.group
              return (
                <li key={opt.id} role="presentation">
                  {header && (
                    <div className="flex items-center justify-between px-3 pb-1.5 pt-2.5">
                      <span className="eyebrow">{header}</span>
                      {header === 'Recent searches' && (
                        <button type="button" onClick={() => recentSearchesService.clear()} className="text-2xs font-semibold text-fg-subtle hover:text-fg">
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                  <div
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={active === i}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => choose(opt)}
                    onMouseEnter={() => setActive(i)}
                    className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2', active === i ? 'bg-surface-3' : 'hover:bg-surface-3/60')}
                  >
                    {opt.image ? (
                      <img src={thumb(opt.image)} alt="" loading="lazy" className={cn('shrink-0 object-cover', opt.group === 'Characters' ? 'h-9 w-9 rounded-full' : 'h-12 w-8 rounded-md')} />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-fg-subtle">{opt.icon}</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{opt.label}</span>
                      {opt.sublabel && <span className="block truncate text-xs text-fg-subtle">{opt.sublabel}</span>}
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                  </div>
                </li>
              )
            })}
          </ul>
          {debounced && options.length === 0 && !isFetching && (
            <p className="px-3 py-6 text-center text-sm text-fg-muted">
              No matches for <span className="font-semibold text-fg">“{debounced}”</span>
            </p>
          )}
          {debounced && (
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => submit(value)}
              className="mt-1 flex w-full items-center justify-between rounded-xl border-t border-line px-3 py-2.5 text-sm font-semibold text-accent-soft hover:bg-surface-3"
            >
              See all results for “{debounced}”
              <Kbd>↵</Kbd>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
