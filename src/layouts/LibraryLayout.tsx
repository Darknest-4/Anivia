import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { PageSkeleton } from '@/components/anime/Skeletons'
import { LibrarySidebar } from '@/components/navigation/LibrarySidebar'

/** Two-column layout with a persistent sidebar for personal library pages (desktop). */
export function LibraryLayout() {
  return (
    <div className="container-app flex gap-10 xl:gap-14">
      <div className="pt-8 sm:pt-10">
        <LibrarySidebar />
      </div>
      <div className="min-w-0 flex-1">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}
