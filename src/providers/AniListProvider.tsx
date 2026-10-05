import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/hooks/useUserData'
import { activeDataSource } from '@/services/anime'
import { completeAniListLogin, connectAniList, disconnectAniList, hasAniListToken, type AniListIntent } from '@/services/anilistAccount/auth'
import { anilistAuthStore, type AniListAuth } from '@/services/anilistAccount/store'
import type { AniListSyncStatus } from '@/services/anilistAccount/sync'
import { useAuth } from './AuthProvider'
import { useFlag } from './PlatformProvider'
import { useToast } from './ToastProvider'

interface AniListContextValue {
  account: AniListAuth | null
  /** Sync only runs with AniList ids (the AniList data source). */
  syncSupported: boolean
  status: AniListSyncStatus
  message?: string
  connecting: boolean
  connect: (returnTo?: string, intent?: AniListIntent) => void
  /** Signs in to ANIVIA with AniList (creates the account on first use). */
  signIn: (returnTo?: string) => void
  /** True when the connection is saved on the ANIVIA account (follows you to other devices). */
  linkedToAccount: boolean
  disconnect: () => Promise<void>
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
  const { status: authStatus, session } = useAuth()
  const syncFlag = useFlag('anilist_sync')
  const syncSupported = activeDataSource === 'anilist' && syncFlag
  const accountsOn = authStatus !== 'disabled'
  const [linkedToAccount, setLinked] = useState(false)

  // Finish the OAuth redirect (the token arrives in the URL hash on any page).
  useEffect(() => {
    if (!hasAniListToken()) return
    void (async () => {
      try {
        const { back, token, expiresIn, intent } = await completeAniListLogin()
        if (accountsOn) {
          try {
            const { exchangeAniListToken } = await import('@/services/anilistAccount/link')
            const res = await exchangeAniListToken(token, expiresIn)
            setLinked(true)
            toast(
              res.mode === 'signed-in'
                ? { title: res.created ? 'Welcome to ANIVIA!' : 'Signed in with AniList', description: res.created ? 'Your account was created from your AniList profile.' : 'Your AniList list is syncing now.' }
                : { title: 'AniList connected', description: 'Saved to your account — it stays connected on every device until you disconnect it.' },
            )
          } catch (err) {
            toast(
              intent === 'login'
                ? { title: 'AniList sign-in failed', description: (err as Error).message, variant: 'error' }
                : { title: 'AniList connected on this device', description: (err as Error).message, variant: 'info' },
            )
          }
        } else toast({ title: 'AniList connected', description: 'Your list is syncing now.' })
        navigate(back, { replace: true })
      } catch (err) {
        toast({ title: 'AniList connection failed', description: (err as Error).message, variant: 'error' })
      } finally {
        setConnecting(false)
      }
    })()
    // Runs once per redirect.
  }, [])

  // Restore the account's AniList link on this device after signing in.
  const accountId = session?.user.id
  useEffect(() => {
    if (!accountId || hasAniListToken()) {
      setLinked(false)
      return
    }
    let cancelled = false
    void import('@/services/anilistAccount/link')
      .then(async ({ restoreAniListLink, exchangeAniListToken }) => {
        if (await restoreAniListLink(accountId)) return true
        // Connected on this device before the account existed → save it to the account now.
        const local = anilistAuthStore.get()
        if (!local) return false
        await exchangeAniListToken(local.token, Math.round((local.expiresAt - Date.now()) / 1000))
        return true
      })
      .then((ok) => !cancelled && setLinked(ok))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [accountId])

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
        connect: (returnTo, intent) => connectAniList(returnTo, intent),
        signIn: (returnTo = '/') => connectAniList(returnTo, 'login'),
        linkedToAccount,
        disconnect: async () => {
          if (accountsOn && session) {
            const { unlinkAniList } = await import('@/services/anilistAccount/link')
            await unlinkAniList().catch(() => undefined)
          }
          disconnectAniList()
          setLinked(false)
          toast({ title: 'AniList disconnected', description: 'Your ANIVIA library is kept.', variant: 'info' })
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
