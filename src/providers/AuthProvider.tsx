import { t } from '@/i18n'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { config } from '@/config'
import type { SyncStatus } from '@/services/user/cloudSync'
import type { User } from '@/types'

export type OAuthProvider = 'google' | 'discord' | 'github'

export interface Profile {
  id: string
  username: string | null
  display_name: string
  bio: string
  avatar_hue: number
  created_at: string
  is_public?: boolean
  show_history?: boolean
  avatar_url?: string | null
  banner_url?: string | null
}

type AuthStatus = 'disabled' | 'loading' | 'signed-out' | 'signed-in'

interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  email: string | null
  profile: Profile | null
  /** Profile mapped to the app's User shape (null when signed out). */
  user: User | null
  syncStatus: SyncStatus
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>
  signInWithProvider: (provider: OAuthProvider) => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  /** Sends the sign-up confirmation email again. */
  resendConfirmation: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  updateEmail: (email: string) => Promise<void>
  updateProfile: (patch: Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'avatar_hue' | 'is_public' | 'show_history' | 'avatar_url' | 'banner_url'>>) => Promise<void>
  signOut: (everywhere?: boolean) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const enabled = Boolean(config.supabaseUrl && config.supabaseKey)

/** Lazily loads the Supabase SDK so it doesn't block the first paint. */
let clientPromise: Promise<SupabaseClient> | null = null
export const getSupabase = () => {
  if (!enabled) return Promise.reject(new Error('Accounts are not configured.'))
  clientPromise ??= import('@/lib/supabase').then((m) => m.supabase!)
  return clientPromise
}

/** Turns Supabase error messages into friendly copy. */
function friendly(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err)
  if (/invalid login credentials/i.test(msg)) return new Error(t('Incorrect email or password.'))
  if (/email not confirmed/i.test(msg)) return Object.assign(new Error(t('Please confirm your email address first — check your inbox.')), { code: 'email_not_confirmed' })
  if (/already registered|already exists/i.test(msg)) return new Error(t('An account with this email already exists.'))
  if (/rate limit|too many|security purposes/i.test(msg)) return new Error(t('Too many attempts. Please wait a minute and try again.'))
  if (/provider is not enabled|unsupported provider/i.test(msg)) return new Error(t('This sign-in method is not enabled yet.'))
  if (/duplicate key.*username/i.test(msg)) return new Error(t('That username is already taken.'))
  if (/banner_url.*(column|schema cache)|column.*banner_url/i.test(msg)) return new Error('Profile banners need the latest database update (supabase/migrations/0005_anivia_profile_images.sql).')
  if (/profiles_(avatar|banner)_url_allowed/i.test(msg)) return new Error('Only images from AniList or MyAnimeList can be used.')
  if (/failed to fetch|network/i.test(msg)) return new Error(t('Can’t reach the account server. Check your connection.'))
  return new Error(msg)
}

const redirect = (path: string) => `${window.location.origin}${path}`

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(enabled ? 'loading' : 'disabled')
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const stopSync = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!enabled) return
    let unsub: (() => void) | undefined
    let cancelled = false
    getSupabase()
      .then((client) => {
        if (cancelled) return
        const { data } = client.auth.onAuthStateChange((_event, next) => {
          setSession(next)
          setStatus(next ? 'signed-in' : 'signed-out')
        })
        unsub = () => data.subscription.unsubscribe()
        return client.auth.getSession().then(({ data: d }) => {
          if (cancelled) return
          setSession(d.session)
          setStatus(d.session ? 'signed-in' : 'signed-out')
        })
      })
      .catch(() => !cancelled && setStatus('signed-out'))
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      stopSync.current?.()
      stopSync.current = null
      setSyncStatus('idle')
      return
    }
    let cancelled = false
    void (async () => {
      const client = await getSupabase()
      const { data } = await client.from('profiles').select('*').eq('id', userId).maybeSingle<Profile>()
      if (!cancelled && data) setProfile(data)
      const { startCloudSync } = await import('@/services/user/cloudSync')
      if (!cancelled) stopSync.current = startCloudSync(client, userId, setSyncStatus)
      // Forward your own actions to the activity feed (people who follow you see them).
      const [{ onActivity }, { community }] = await Promise.all([import('@/services/user/activity'), import('@/services/community')])
      if (cancelled) return
      const off = onActivity((e) => void community.logActivity(e.kind, e.animeId, e.data).catch(() => undefined))
      const stop = stopSync.current
      stopSync.current = () => {
        off()
        stop?.()
      }
    })()
    return () => {
      cancelled = true
      stopSync.current?.()
      stopSync.current = null
    }
  }, [userId])

  const run = useCallback(async <R extends { data?: unknown; error: unknown }>(fn: (c: SupabaseClient) => PromiseLike<R>): Promise<R['data']> => {
    const client = await getSupabase()
    const { data, error } = await fn(client)
    if (error) throw friendly(error)
    return data
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const email = session?.user.email ?? null
    const user: User | null =
      session && profile
        ? {
            id: profile.id,
            username: profile.username ?? (email?.split('@')[0] ?? 'member'),
            displayName: profile.display_name,
            avatarHue: profile.avatar_hue,
            bio: profile.bio,
            memberSince: profile.created_at,
            plan: 'free',
            avatarUrl: profile.avatar_url ?? undefined,
            bannerUrl: profile.banner_url ?? undefined,
          }
        : session
          ? {
              id: session.user.id,
              username: email?.split('@')[0] ?? 'member',
              displayName: (session.user.user_metadata?.display_name as string) ?? email?.split('@')[0] ?? t('Member'),
              avatarHue: 348,
              bio: '',
              memberSince: session.user.created_at,
              plan: 'free',
            }
          : null
    return {
      status,
      session,
      email,
      profile,
      user,
      syncStatus,
      signIn: async (e, password) => void (await run((c) => c.auth.signInWithPassword({ email: e, password }))),
      signUp: async (e, password, displayName) => {
        const data = await run((c) =>
          c.auth.signUp({ email: e, password, options: { data: { display_name: displayName }, emailRedirectTo: redirect('/') } }),
        )
        return { needsConfirmation: !(data as { session: Session | null }).session }
      },
      signInWithProvider: async (provider) =>
        void (await run((c) => c.auth.signInWithOAuth({ provider, options: { redirectTo: redirect('/') } }))),
      resendConfirmation: async (e) => void (await run((c) => c.auth.resend({ type: 'signup', email: e, options: { emailRedirectTo: redirect('/') } }))),
      sendPasswordReset: async (e) => void (await run((c) => c.auth.resetPasswordForEmail(e, { redirectTo: redirect('/reset-password') }))),
      updatePassword: async (password) => void (await run((c) => c.auth.updateUser({ password }))),
      updateEmail: async (e) => void (await run((c) => c.auth.updateUser({ email: e }, { emailRedirectTo: redirect('/settings?tab=account') }))),
      updateProfile: async (patch) => {
        if (!session) throw new Error('Please sign in first.')
        const data = await run((c) => c.from('profiles').update(patch).eq('id', session.user.id).select().single<Profile>())
        setProfile(data as Profile)
      },
      signOut: async (everywhere) => {
        // Stop syncing before wiping this device, so the empty library is never pushed anywhere.
        stopSync.current?.()
        stopSync.current = null
        const { clearAccountData, detachAniList } = await import('@/services/user/clearLocal')
        detachAniList()
        try {
          await run((c) => c.auth.signOut({ scope: everywhere ? 'global' : 'local' }))
        } finally {
          clearAccountData()
        }
      },
    }
  }, [status, session, profile, syncStatus, run])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
