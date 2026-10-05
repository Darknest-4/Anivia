import { Fragment } from 'react'
import { Outlet } from 'react-router-dom'
import { AnalyticsTracker, ConsentBanner, MaintenanceGate } from '@/components/common/PlatformBits'
import { ScrollToTop } from '@/components/common/ScrollToTop'
import { usePreferences } from '@/hooks/useUserData'
import { AniListProvider } from '@/providers/AniListProvider'
import { CommandMenuProvider } from '@/providers/CommandMenuProvider'

/** Root route element: router-aware providers and helpers live here. */
export function App() {
  const { prefs } = usePreferences()
  return (
    <AniListProvider>
    <CommandMenuProvider>
      <ScrollToTop />
      <AnalyticsTracker />
      <MaintenanceGate>
        {/* Score settings are read while rendering; re-render the page tree when they change. */}
        <Fragment key={`${prefs.ratingScale}:${prefs.hideScores}`}>
          <Outlet />
        </Fragment>
        <ConsentBanner />
      </MaintenanceGate>
    </CommandMenuProvider>
    </AniListProvider>
  )
}
