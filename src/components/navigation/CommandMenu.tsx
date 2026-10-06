import { t } from '@/i18n'
import { ArrowRight, CornerDownLeft, Moon, Search, Shuffle, Sun } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Kbd, Overlay } from '@/components/ui'
import { useSuggestions } from '@/hooks/queries'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/cn'
import { useTheme } from '@/providers/ThemeProvider'
import { discoverNav, libraryNav, primaryNav } from './navItems'
import { thumb } from '@/lib/images'

interface Command {
  id: string
  group: string
  label: string
  hint?: string
  icon: ReactNode
  image?: string
  run: () => void
  keywords?: string
}

/** Cmd/Ctrl + K palette: navigation, actions and live anime search. */
export default function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const debounced = useDebounce(query.trim(), 150)
  const { data } = useSuggestions(debounced)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const go = (to: string) => () => {
    navigate(to)
    onClose()
  }

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = [...primaryNav, { to: '/search', label: t('Search'), icon: Search }, ...libraryNav, ...discoverNav.filter((n) => n.to !== '/search')].map((item) => ({
      id: `nav-${item.to}`,
      group: t('Navigation'),
      label: item.label,
      hint: item.to,
      icon: <item.icon className="h-4 w-4" />,
      run: go(item.to),
    }))
    const actions: Command[] = [
      {
        id: 'toggle-theme',
        group: t('Actions'),
        label: t('Toggle theme ({p0})', { p0: resolvedTheme === 'dark' ? t('Light') : t('Dark') }),
        icon: resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        keywords: 'dark light mode appearance',
        run: () => {
          toggleTheme()
          onClose()
        },
      },
      { id: 'surprise', group: 'Actions', label: t('Surprise me'), hint: t('Random top-rated title'), icon: <Shuffle className="h-4 w-4" />, keywords: 'random', run: go('/browse?sort=rating') },
    ]
    const q = debounced.toLowerCase()
    const filtered = [...nav, ...actions].filter((c) => !q || c.label.toLowerCase().includes(q) || c.keywords?.includes(q))
    const anime: Command[] = (data?.anime ?? []).map((a) => ({
      id: `anime-${a.id}`,
      group: t('Anime'),
      label: a.title,
      hint: `${a.type} · ${a.year}`,
      icon: <ArrowRight className="h-4 w-4" />,
      image: a.poster,
      run: go(`/anime/${a.id}`),
    }))
    const all = q ? [...anime, ...filtered] : filtered
    if (q) all.push({ id: 'search-all', group: 'Search', label: `Search for “${debounced}”`, icon: <Search className="h-4 w-4" />, run: go(`/search?q=${encodeURIComponent(debounced)}`) })
    return all
  }, [debounced, data, resolvedTheme])

  useEffect(() => setActive(0), [debounced])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % Math.max(1, commands.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + commands.length) % Math.max(1, commands.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commands[active]?.run()
    }
  }

  useEffect(() => {
    document.getElementById(`cmd-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  let lastGroup = ''
  return (
    <Overlay open={open} onClose={onClose} placement="top" label={t('Command menu')} className="max-w-xl">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="h-5 w-5 shrink-0 text-fg-subtle" aria-hidden />
        <input
          data-autofocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('Type a command or search anime…')}
          aria-label={t('Command search')}
          aria-controls="command-list"
          aria-activedescendant={`cmd-${active}`}
          role="combobox"
          aria-expanded="true"
          className="h-14 flex-1 bg-transparent text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none"
        />
        <Kbd>{t('Esc')}</Kbd>
      </div>
      <ul id="command-list" role="listbox" aria-label={t('Commands')} className="max-h-[min(60vh,420px)] overflow-y-auto p-2 scrollbar-thin">
        {commands.length === 0 && <li className="px-3 py-8 text-center text-sm text-fg-muted">{t('No commands found.')}</li>}
        {commands.map((cmd, i) => {
          const header = cmd.group !== lastGroup ? cmd.group : null
          lastGroup = cmd.group
          return (
            <li key={cmd.id} role="presentation">
              {header && <p className="eyebrow px-3 pb-1.5 pt-3">{header}</p>}
              <div
                id={`cmd-${i}`}
                role="option"
                aria-selected={i === active}
                onClick={cmd.run}
                onMouseMove={() => setActive(i)}
                className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5', i === active ? 'bg-surface-3 text-fg' : 'text-fg-muted')}
              >
                {cmd.image ? (
                  <img src={thumb(cmd.image)} alt="" loading="lazy" className="h-10 w-7 rounded object-cover" />
                ) : (
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', i === active ? 'bg-accent text-white' : 'bg-surface-2')}>{cmd.icon}</span>
                )}
                <span className="flex-1 truncate text-sm font-medium">{cmd.label}</span>
                {cmd.hint && <span className="hidden text-xs text-fg-subtle sm:inline">{cmd.hint}</span>}
                {i === active && <CornerDownLeft className="h-4 w-4 text-fg-subtle" aria-hidden />}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-2xs text-fg-subtle">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navigate
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> select
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd> toggle
        </span>
      </div>
    </Overlay>
  )
}
