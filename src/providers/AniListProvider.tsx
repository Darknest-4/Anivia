import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/hooks/useUserData'
import { activeDataSource } from '@/services/anime'
import { completeAniListLogin, connectAniList, disconnectAniList, hasAniListToken } from '@/services/anilistAccount/auth'
import { anilistAuthStore, type AniListAuth } from '@/services/anilistAccount/store'
import type { AniListSyncStatus } from '@/services/anilistAccount/sync'
import { useToast } from './ToastProvider'

interface AniListContextValue {
  account: AniListAuth | null
  /** Sync only runs with AniList ids (the AniList data source). */
  syncSupported: boolean
  status: AniListSyncStatus
  message?: string
  connecting: boolean
  connect: (returnTo?: string) => void
  disconnect: () => void
  syncNow: () => Promise<void>
}

const Ctx = createContext<AniListContextValue | null>(null)

export function AniListProvider({ children }: { children: ReactNode }) {
  const account = useStore(anilistAuthStore)
  const navigate = useNavigate()
  const toast = useToast()
  const [status, setStatus] = useState<AniListSyncStatus>('idle')
  const [message, setMessage] = useState<string>()
  const [connecting, setConnecting] = useState(() => typeof window !== 'undefined' && hasAniListToken())
  const engine = useRef<{ syncNow: () => Promise<void>; stop: () => void } | null>(null)
  const syncSupported = activeDataSource === 'anilist'

  // Finish the OAuth redirect (the token arrives in the URL hash on any page).
  useEffect(() => {
    if (!hasAniListToken()) return
    completeAniListLogin()
      .then((back) => {
        toast({ title: 'AniList connected', description: 'Your list is syncing now.' })
        navigate(back, { replace: true })
      })
      .catch((err: Error) => toast({ title: 'AniList connection failed', description: err.message, variant: 'error' }))
      .finally(() => setConnecting(false))
  }, [navigate, toast])

  const userId = account?.userId
  useEffect(() => {
    if (!userId || !syncSupported) return
    let cancelled = false
    void import('@/services/anilistAccount/sync').then(({ startAniListSync }) => {
      if (cancelled) return
      engine.current = startAniListSync((s, m) => {
        setStatus(s)
        setMessage(m)
      })
    })
    return () => {
      cancelled = true
      engine.current?.stop()
      engine.current = null
      setStatus('idle')
    }
  }, [userId, syncSupported])

  const syncNow = useCallback(async () => {
    await engine.current?.syncNow()
  }, [])

  return (
    <Ctx.Provider
      value={{
        account,
        syncSupported,
        status,
        message,
        connecting,
        connect: (returnTo) => connectAniList(returnTo),
        disconnect: () => {
          disconnectAniList()
          toast({ title: 'AniList disconnected', description: 'Your library stays on this device.', variant: 'info' })
        },
        syncNow,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAniList() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAniList must be used inside <AniListProvider>')
  return ctx
}
