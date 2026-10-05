import { Outlet } from 'react-router-dom'
import { ScrollToTop } from '@/components/common/ScrollToTop'
import { CommandMenuProvider } from '@/providers/CommandMenuProvider'

/** Root route element: router-aware providers and helpers live here. */
export function App() {
  return (
    <CommandMenuProvider>
      <ScrollToTop />
      <Outlet />
    </CommandMenuProvider>
  )
}
