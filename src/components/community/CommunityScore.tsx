import { t } from '@/i18n'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { community } from '@/services/community'

/** Average score given by ANIVIA members (shown once someone has rated the title). */
export function CommunityScore({ animeId, className }: { animeId: string; className?: string }) {
  const { status } = useAuth()
  const q = useQuery({ queryKey: ['community-score', animeId], queryFn: () => community.communityScore(animeId), enabled: status !== 'disabled', staleTime: 10 * 60_000, retry: false })
  if (!q.data?.count || q.data.average === null) return null
  return (
    <span className={className} title={t('Average score from ANIVIA members')}>
      <Users className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
      ANIVIA {q.data.average.toFixed(1)} · {q.data.count} {q.data.count === 1 ? 'rating' : 'ratings'}
    </span>
  )
}
