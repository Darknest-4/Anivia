import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PageSkeleton } from '@/components/anime/Skeletons'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { AnnouncementBanner } from '@/components/common/PlatformBits'
import { Footer } from '@/components/navigation/Footer'
import { MobileDrawer } from '@/components/navigation/MobileDrawer'
import { MobileNav } from '@/components/navigation/MobileNav'
import { Navbar } from '@/components/navigation/Navbar'

/** Public shell: top navigation, content, footer, mobile bottom navigation + drawer. */
export function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const transparent = pathname === '/'

  return (
    <div className="pb-bottom-nav flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-toast rounded-lg bg-accent px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <AnnouncementBanner />
      <Navbar transparent={transparent} onOpenMenu={() => setMenuOpen(true)} />
      <main id="main" className="flex-1">
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <MobileNav />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  )
}
