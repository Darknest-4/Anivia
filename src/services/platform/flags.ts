import { createPersistentStore } from '@/services/storage'

export type FlagAudience = 'all' | 'signed_in' | 'staff'

export interface FeatureFlag {
  key: string
  enabled: boolean
  description: string
  rollout: number
  audience: FlagAudience
  payload: Record<string, unknown>
  updated_at?: string
}

/** Built-in defaults, used until the database answers (or when accounts are disabled). */
export const DEFAULT_FLAGS: Record<string, boolean> = {
  maintenance_mode: false,
  announcement_banner: false,
  registration: true,
  anilist_login: true,
  anilist_sync: true,
  public_profiles: true,
  contact_form: true,
  trailers: true,
  notifications: true,
  analytics: true,
  view_counts: true,
  reviews: true,
  comments: true,
  social: true,
  push_notifications: true,
  // Social sign-in buttons — turn on only after enabling the provider in Supabase → Authentication → Providers.
  oauth_google: false,
  oauth_discord: false,
  oauth_github: false,
}

export type FlagKey = keyof typeof DEFAULT_FLAGS | (string & {})

/** Last known flags — lets the next visit start with the right UI instantly. */
export const flagsStore = createPersistentStore<FeatureFlag[]>('feature-flags', [], (v) => (Array.isArray(v) ? v : []))

/** Stable anonymous id for this browser (analytics + percentage rollouts). */
export const visitorStore = createPersistentStore<string>('visitor-id', '', (v) => (typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v) ? v : ''))
export function visitorId() {
  let id = visitorStore.get()
  if (!id) {
    id = crypto.randomUUID()
    visitorStore.set(id)
  }
  return id
}

/** Deterministic 0–99 bucket for a visitor + flag pair. */
export function bucket(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return (h >>> 0) % 100
}

export interface FlagContext {
  signedIn: boolean
  staff: boolean
  visitor: string
}

export function evaluateFlag(key: string, flags: FeatureFlag[], ctx: FlagContext): boolean {
  const flag = flags.find((f) => f.key === key)
  if (!flag) return DEFAULT_FLAGS[key] ?? false
  if (!flag.enabled) return false
  if (flag.audience === 'signed_in' && !ctx.signedIn) return false
  if (flag.audience === 'staff' && !ctx.staff) return false
  if (flag.rollout < 100 && !ctx.staff && bucket(`${ctx.visitor}:${key}`) >= flag.rollout) return false
  return true
}
