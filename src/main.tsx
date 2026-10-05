import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '@/providers/AppProviders'
import { router } from '@/routes'
import { seedDemoLibrary } from '@/services/user'
import '@/styles/index.css'

// Populate a small demo library on first visit (Settings → Reset demo data clears it).
seedDemoLibrary()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
