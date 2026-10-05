import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '@/providers/AppProviders'
import { router } from '@/routes'
import { preloadCommonRoutes } from '@/routes/preload'
import { isMockProvider } from '@/services/anime'
import { seedDemoLibrary } from '@/services/user'
import '@/styles/index.css'

// Populate a small demo library on first visit when running on the offline demo catalog.
if (isMockProvider) seedDemoLibrary()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)

preloadCommonRoutes()
