import { History as HistoryIcon } from 'lucide-react'
import { useMemo } from 'react'
import { AnimeCardContinueWatching, AnimeCardWideSkeleton, ScrollRow } from '@/components/anime'
import { SectionHeader } from '@/components/common/SectionHeader'
import { useAnimeByIds } from '@/hooks/queries'
import { useHistory } from '@/hooks/useUserData'
import { useToast } from '@/providers/ToastProvider'
import { historyService } from '@/services/user'

const wide = 'w-[78%] xs:w-[60%] sm:w-[44%] lg:w-[31.5%] xl:w-[23.6%] 3xl:w-[18.8%]'

export function ContinueWatchingSection() {
  const history = useHistory()
  const toast = useToast()
  const entries = useMemo(() => {
    const seen = new Set<string>()
    return history.filter((h) => !h.completed && !seen.has(h.animeId) && seen.add(h.animeId)).slice(0, 10)
  }, [history])
  const { data, isLoading } = useAnimeByIds(entries.map((e) => e.animeId))

  if (!entries.length) return null
  const byId = new Map((data ?? []).map((a) => [a.id, a]))

  return (
    <section aria-labelledby="continue-heading" className="container-app">
      <SectionHeader id="continue-heading" title="Continue Watching" icon={<HistoryIcon />} href="/history" linkLabel="History" />
      {isLoading && !data ? (
        <ScrollRow label="Continue watching" itemClassName={wide}>
          {[0, 1, 2, 3].map((i) => (
            <AnimeCardWideSkeleton key={i} />
          ))}
        </ScrollRow>
      ) : (
        <ScrollRow label="Continue watching" itemClassName={wide}>
          {entries
            .filter((e) => byId.has(e.animeId))
            .map((entry) => {
              const anime = byId.get(entry.animeId)!
              return (
                <AnimeCardContinueWatching
                  key={entry.animeId}
                  anime={anime}
                  entry={entry}
                  onRemove={() => {
                    historyService.removeAnime(anime.id)
                    toast({ title: 'Removed from Continue Watching', description: anime.title, variant: 'info' })
                  }}
                />
              )
            })}
        </ScrollRow>
      )}
    </section>
  )
}
