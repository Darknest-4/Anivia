import { Skeleton, SkeletonText } from '@/components/ui'
import { cn } from '@/lib/cn'

export function AnimeCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('min-w-0', className)} aria-hidden>
      <Skeleton className="aspect-[2/3] w-full rounded-xl" />
      <Skeleton className="mt-3 h-4 w-4/5" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  )
}

export function AnimeCardWideSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('min-w-0', className)} aria-hidden>
      <Skeleton className="aspect-video w-full rounded-xl" />
      <Skeleton className="mt-3 h-4 w-3/5" />
      <Skeleton className="mt-2 h-3 w-2/5" />
    </div>
  )
}

export function AnimeRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <AnimeCardSkeleton key={i} className={cn(i >= 2 && 'hidden xs:block', i >= 3 && 'xs:hidden md:block', i >= 4 && 'md:hidden lg:block', i >= 5 && 'lg:hidden xl:block')} />
      ))}
    </div>
  )
}

export function HeroSkeleton() {
  return (
    <div className="relative h-[78svh] min-h-[540px] w-full overflow-hidden bg-surface lg:h-[86vh] lg:max-h-[860px]" aria-busy="true" aria-label="Loading featured anime">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="container-app relative flex h-full flex-col justify-end pb-20 lg:justify-center lg:pb-0">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-5 h-14 w-[min(520px,90%)]" />
        <Skeleton className="mt-4 h-4 w-60" />
        <SkeletonText lines={3} className="mt-6 max-w-lg" />
        <div className="mt-8 flex gap-3">
          <Skeleton className="h-12 w-36 rounded-xl" />
          <Skeleton className="h-12 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function DetailsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading anime details">
      <Skeleton className="h-[42vh] min-h-[300px] w-full rounded-none" />
      <div className="container-app -mt-40 flex flex-col gap-6 md:flex-row">
        <Skeleton className="aspect-[2/3] w-40 shrink-0 rounded-2xl md:w-60" />
        <div className="flex-1 pt-4 md:pt-28">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/3" />
          <SkeletonText lines={4} className="mt-6 max-w-2xl" />
          <div className="mt-6 flex gap-3">
            <Skeleton className="h-12 w-36 rounded-xl" />
            <Skeleton className="h-12 w-44 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function EpisodeSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading episodes">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3 rounded-xl p-2">
          <Skeleton className="aspect-video w-32 shrink-0 rounded-lg sm:w-40" />
          <div className="flex-1 py-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="container-app py-10" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-10 w-72" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-10">
        <AnimeRowSkeleton count={6} />
      </div>
      <div className="mt-8">
        <AnimeRowSkeleton count={6} />
      </div>
    </div>
  )
}
