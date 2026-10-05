import { ArrowDownUp, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState, Input, Select } from '@/components/ui'
import { useHistory } from '@/hooks/useUserData'
import { cn } from '@/lib/cn'
import type { Episode } from '@/types'
import { EpisodeItem } from './EpisodeItem'
import { EpisodeSkeleton } from './Skeletons'

interface EpisodeListProps {
  animeId: string
  episodes?: Episode[]
  loading?: boolean
  activeEpisodeId?: string
  layout?: 'row' | 'compact'
  className?: string
  listClassName?: string
}

const RANGE = 24

/** Searchable, sortable episode list with season/range selector and watch progress. */
export function EpisodeList({ animeId, episodes, loading, activeEpisodeId, layout = 'row', className, listClassName }: EpisodeListProps) {
  const history = useHistory()
  const [query, setQuery] = useState('')
  const [desc, setDesc] = useState(false)
  const seasons = useMemo(() => [...new Set((episodes ?? []).map((e) => e.season))], [episodes])
  const ranges = useMemo(() => {
    const list = episodes ?? []
    if (list.length <= RANGE * 1.5) return []
    const out: { value: string; label: string }[] = []
    for (let i = 0; i < list.length; i += RANGE) out.push({ value: String(i), label: `Episodes ${i + 1}–${Math.min(list.length, i + RANGE)}` })
    return out
  }, [episodes])
  const activeIndex = episodes?.findIndex((e) => e.id === activeEpisodeId) ?? -1
  const [range, setRange] = useState(() => String(activeIndex > 0 ? Math.floor(activeIndex / RANGE) * RANGE : 0))
  const [season, setSeason] = useState('all')

  const progressMap = useMemo(() => {
    const map = new Map<string, (typeof history)[number]>()
    history.filter((h) => h.animeId === animeId).forEach((h) => map.set(h.episodeId, h))
    return map
  }, [history, animeId])

  const scrollRef = useRef<HTMLDivElement>(null)
  // Keep the active episode in view inside scrollable sidebars (never scrolls the window).
  useEffect(() => {
    const box = scrollRef.current
    const active = box?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!box || !active) return
    if (box.scrollHeight > box.clientHeight) box.scrollTop = active.offsetTop - box.clientHeight / 3
    // Inside drawers the dialog body scrolls instead (the page itself is scroll-locked).
    else if (box.closest('[role="dialog"]')) active.scrollIntoView({ block: 'center' })
  }, [activeEpisodeId, episodes])

  const visible = useMemo(() => {
    let list = episodes ?? []
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((e) => e.title.toLowerCase().includes(q) || String(e.number) === q.replace(/^ep\s*/, ''))
    else {
      if (season !== 'all') list = list.filter((e) => String(e.season) === season)
      if (ranges.length && season === 'all') list = list.slice(Number(range), Number(range) + RANGE)
    }
    return desc ? [...list].reverse() : list
  }, [episodes, query, desc, range, ranges.length, season])

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-48">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search episodes…"
            aria-label="Search episodes"
            leftIcon={<Search />}
            className="h-10"
          />
        </div>
        {seasons.length > 1 && (
          <Select
            size="sm"
            aria-label="Season"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            options={[{ value: 'all', label: 'All seasons' }, ...seasons.map((s) => ({ value: String(s), label: `Season ${s}` }))]}
            className="w-36"
          />
        )}
        {ranges.length > 0 && season === 'all' && !query && (
          <Select size="sm" aria-label="Episode range" value={range} onChange={(e) => setRange(e.target.value)} options={ranges} className="w-44" />
        )}
        <button
          type="button"
          onClick={() => setDesc((d) => !d)}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 text-[13px] font-semibold text-fg-muted transition-colors hover:text-fg"
          aria-label={desc ? 'Sort oldest first' : 'Sort newest first'}
        >
          <ArrowDownUp className="h-4 w-4" />
          {desc ? 'Newest' : 'Oldest'}
        </button>
      </div>

      <div ref={scrollRef} className={cn('relative mt-4', listClassName)}>
        {loading ? (
          <EpisodeSkeleton />
        ) : visible.length === 0 ? (
          <EmptyState compact icon={<Search />} title="No episodes found" description="Try a different episode number or title." />
        ) : (
          <ul className="space-y-1.5">
            {visible.map((ep) => (
              <li key={ep.id}>
                <EpisodeItem
                  episode={ep}
                  progress={progressMap.get(ep.id)}
                  active={ep.id === activeEpisodeId}
                  layout={layout}
                  href={`/anime/${animeId}/watch?ep=${ep.number}`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
