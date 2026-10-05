import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider, removeOldestQuery } from '@tanstack/react-query-persist-client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePreferences } from '@/hooks/useUserData'
import { activeDataSource } from '@/services/anime'
import { preferencesStore } from '@/services/user'
import { AuthProvider } from './AuthProvider'
import { ThemeProvider } from './ThemeProvider'
import { ToastProvider } from './ToastProvider'

export const QUERY_CACHE_KEY = 'anivia:query-cache'
/** Queries that should never be restored from the offline cache. */
const VOLATILE = new Set(['video', 'suggestions', 'search', 'schedule', 'episodes'])

/** Display settings that change how API data is mapped — cached data is invalidated when they change. */
const cacheBuster = () => {
  const p = preferencesStore.get()
  return ['v2', activeDataSource, p.titleLanguage, p.dataSaver ? 'lite' : 'full'].join(':')
}

/** Refetches active queries when a mapping-related preference changes. */
function DisplayPreferenceSync() {
  const { prefs } = usePreferences()
  const client = useQueryClient()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    void client.resetQueries()
  }, [prefs.titleLanguage, prefs.dataSaver, client])
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60_000, gcTime: 24 * 60 * 60_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  )
  const [persister] = useState(() =>
    typeof window === 'undefined' || !preferencesStore.get().offlineCache
      ? null
      : createSyncStoragePersister({ storage: window.localStorage, key: QUERY_CACHE_KEY, throttleTime: 2000, retry: removeOldestQuery }),
  )

  const inner = (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <DisplayPreferenceSync />
          {children}
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  )

  if (!persister) {
    try {
      window.localStorage.removeItem(QUERY_CACHE_KEY)
    } catch {
      /* storage unavailable */
    }
    return <QueryClientProvider client={client}>{inner}</QueryClientProvider>
  }

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60_000,
        buster: cacheBuster(),
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === 'success' && !VOLATILE.has(String(q.queryKey[0])),
        },
      }}
    >
      {inner}
    </PersistQueryClientProvider>
  )
}
