import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '@/hooks/useUserData'
import { evaluateFlag, flagsStore, visitorId, type FeatureFlag, type FlagKey } from '@/services/platform/flags'
import { getSupabase, useAuth } from './AuthProvider'

export type Role = 'user' | 'moderator' | 'admin'
export type Permission = 'admin.access' | 'analytics.view' | 'flags.manage' | 'users.manage' | 'reports.manage' | 'cache.manage'

interface PlatformValue {
  flags: FeatureFlag[]
  /** Whether a feature flag is on for this visitor (audience + rollout aware). */
  flag: (key: FlagKey) => boolean
  payload: <T = Record<string, unknown>>(key: FlagKey) => T
  role: Role
  permissions: Permission[]
  can: (permission: Permission) => boolean
  isStaff: boolean
  refreshFlags: () => Promise<void>
}

const Ctx = createContext<PlatformValue | null>(null)

/** Feature flags (public, from the database) and the signed-in user's role & permissions. */
export function PlatformProvider({ children }: { children: ReactNode }) {
  const { status, session } = useAuth()
  const flags = useStore(flagsStore)
  const [access, setAccess] = useState<{ role: Role; permissions: Permission[] }>({ role: 'user', permissions: [] })

  const refreshFlags = useCallback(async () => {
    if (status === 'disabled') return
    try {
      const client = await getSupabase()
      const { data, error } = await client.from('feature_flags').select('key, enabled, description, rollout, audience, payload, updated_at').order('key')
      if (!error && data) flagsStore.set(data as FeatureFlag[])
    } catch {
      /* keep the last known flags */
    }
  }, [status])

  useEffect(() => {
    void refreshFlags()
    const onFocus = () => document.visibilityState === 'visible' && void refreshFlags()
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [refreshFlags])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setAccess({ role: 'user', permissions: [] })
      return
    }
    let cancelled = false
    void getSupabase()
      .then((c) => c.rpc('my_access'))
      .then(({ data }) => {
        if (!cancelled && data) setAccess({ role: (data as { role: Role }).role, permissions: (data as { permissions: Permission[] }).permissions ?? [] })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [userId])

  const value = useMemo<PlatformValue>(() => {
    const isStaff = access.permissions.includes('admin.access')
    const ctx = { signedIn: Boolean(userId), staff: isStaff, visitor: visitorId() }
    return {
      flags,
      flag: (key) => evaluateFlag(key, flags, ctx),
      payload: <T,>(key: FlagKey) => (flags.find((f) => f.key === key)?.payload ?? {}) as T,
      role: access.role,
      permissions: access.permissions,
      can: (p) => access.permissions.includes(p),
      isStaff,
      refreshFlags,
    }
  }, [flags, access, userId, refreshFlags])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePlatform() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePlatform must be used inside <PlatformProvider>')
  return ctx
}

export const useFlag = (key: FlagKey) => usePlatform().flag(key)
