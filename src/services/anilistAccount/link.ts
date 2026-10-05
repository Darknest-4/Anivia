import { getSupabase } from '@/providers/AuthProvider'
import { anilistAuthStore, anilistSnapshotStore } from './store'

/**
 * Server side of the AniList connection (Supabase `anilist-auth` Edge Function + `anilist_links` table):
 * - keeps the connection on the ANIVIA account, so it follows you to every device until you unlink it;
 * - lets you sign in with AniList (the account is created on first use).
 */
export interface ExchangeResult {
  mode: 'linked' | 'signed-in'
  created?: boolean
}

export async function exchangeAniListToken(accessToken: string, expiresIn: number): Promise<ExchangeResult> {
  const client = await getSupabase()
  const { data: s } = await client.auth.getSession()
  const { data, error } = await client.functions.invoke<{ mode: 'linked' | 'signed-in'; token_hash?: string; created?: boolean; error?: string }>('anilist-auth', {
    body: { access_token: accessToken, expires_in: expiresIn },
    headers: s.session ? { Authorization: `Bearer ${s.session.access_token}` } : undefined,
  })
  if (error) {
    // FunctionsHttpError carries the JSON body with our message.
    const ctx = (error as { context?: Response }).context
    const body = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null
    throw new Error(body?.error ?? 'The AniList sign-in service is not available right now.')
  }
  if (!data) throw new Error('Empty response from the AniList sign-in service.')
  if (data.mode === 'signed-in') {
    if (!data.token_hash) throw new Error('Sign-in could not be completed.')
    const { error: otpError } = await client.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
    if (otpError) throw new Error(otpError.message)
  }
  return { mode: data.mode, created: data.created }
}

/** Brings the account's AniList connection to this device (e.g. after signing in on a new browser). */
export async function restoreAniListLink(userId: string) {
  const client = await getSupabase()
  const { data } = await client
    .from('anilist_links')
    .select('anilist_id, anilist_name, avatar_url, site_url, access_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle<{ anilist_id: number; anilist_name: string; avatar_url: string | null; site_url: string | null; access_token: string; expires_at: string }>()
  if (!data) return false
  const expiresAt = new Date(data.expires_at).getTime()
  if (expiresAt <= Date.now()) return false
  const local = anilistAuthStore.get()
  if (local?.userId === data.anilist_id && local.token === data.access_token) return true
  if (local && local.userId !== data.anilist_id) anilistSnapshotStore.reset()
  anilistAuthStore.set({
    token: data.access_token,
    expiresAt,
    userId: data.anilist_id,
    name: data.anilist_name,
    avatar: data.avatar_url ?? undefined,
    siteUrl: data.site_url ?? undefined,
  })
  return true
}

/** Removes the server-side link (the local token is cleared by the caller). */
export async function unlinkAniList() {
  const client = await getSupabase()
  const { data: s } = await client.auth.getSession()
  if (!s.session) return
  await client.from('anilist_links').delete().eq('user_id', s.session.user.id)
}
