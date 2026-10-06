import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { config } from '@/config'
import { AppProviders } from '@/providers/AppProviders'
import { router } from '@/routes'
import { preloadCommonRoutes } from '@/routes/preload'
import '@/styles/index.css'
import { installErrorReporter } from '@/services/platform/errors'

installErrorReporter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)

preloadCommonRoutes()

// Installable app + offline shell (production only, so development always gets fresh files).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined))
}

// Optional, cookie-free Cloudflare Web Analytics.
if (config.cfAnalyticsToken) {
  const s = document.createElement('script')
  s.defer = true
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  s.dataset.cfBeacon = JSON.stringify({ token: config.cfAnalyticsToken })
  document.head.appendChild(s)
}
