import { useInfiniteQuery } from '@tanstack/react-query'
import { Rss, Users } from 'lucide-react'
import { ActivityList } from '@/components/community'
import { PageHeader } from '@/components/common/PageHeader'
import { Button, ButtonLink, EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useAuth } from '@/providers/AuthProvider'
import { community } from '@/services/community'

/** What the people you follow have been watching, rating and reviewing. */
export default function FeedPage() {
  useDocumentMeta({ title: 'Feed', noindex: true })
  const { status } = useAuth()
  const q = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => community.feed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.length >= 40 ? last[last.length - 1].created_at : undefined),
    enabled: status === 'signed-in',
  })
  const items = q.data?.pages.flat() ?? []

  return (
    <div className="pb-10">
      <PageHeader eyebrow="Community" title="Feed" description="Activity from the people you follow. Follow someone from their public profile." />
      {status !== 'signed-in' ? (
        <EmptyState icon={<Rss />} title="Sign in to see your feed" description="Follow other fans and see what they watch, rate and review." action={<ButtonLink to="/login?redirect=%2Ffeed">Sign in</ButtonLink>} />
      ) : q.isError ? (
        <ErrorState title="The feed is unavailable" description={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState icon={<Users />} title="Nothing here yet" description="Follow people from their profile pages (e.g. from reviews and comments) — their activity shows up here." action={<ButtonLink to="/lists">Browse lists</ButtonLink>} />
      ) : (
        <>
          <ActivityList items={items} />
          {q.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
