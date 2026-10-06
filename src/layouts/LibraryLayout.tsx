import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { PageSkeleton } from '@/components/anime/Skeletons'
import { LibrarySidebar } from '@/components/navigation/LibrarySidebar'

/** Two-column layout with a persistent sidebar for personal library pages (desktop). */
export function LibraryLayout() {
  return (
    <div className="container-app flex gap-10 xl:gap-14">
      {/* Hidden below lg — otherwise the empty column still adds the flex gap on phones. */}
      <div className="hidden pt-8 sm:pt-10 lg:block">
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
