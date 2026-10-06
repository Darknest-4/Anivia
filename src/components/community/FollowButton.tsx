import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import { community } from '@/services/community'

/** Follow / unfollow + follower counts for a public profile. */
export function FollowStats({ userId }: { userId: string }) {
  const { status, session } = useAuth()
  const client = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['follow', userId], queryFn: () => community.followStats(userId), enabled: status !== 'disabled', retry: false })
  const toggle = useMutation({
    mutationFn: (on: boolean) => community.follow(userId, on),
    onSuccess: () => client.invalidateQueries({ queryKey: ['follow', userId] }),
    onError: (e: Error) => toast({ title: 'Couldn’t update', description: e.message, variant: 'error' }),
  })
  if (!q.data) return null
  const self = session?.user.id === userId
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-fg-muted">
        <strong className="text-fg">{q.data.followers}</strong> followers · <strong className="text-fg">{q.data.following}</strong> following
      </span>
      {!self && (
        <Button
          size="sm"
          variant={q.data.is_following ? 'secondary' : 'primary'}
          loading={toggle.isPending}
          leftIcon={q.data.is_following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          onClick={() => {
            if (status !== 'signed-in') {
              toast({ title: 'Sign in to follow people', variant: 'info' })
              return
            }
            toggle.mutate(!q.data!.is_following)
          }}
        >
          {q.data.is_following ? 'Following' : 'Follow'}
        </Button>
      )}
    </div>
  )
}
