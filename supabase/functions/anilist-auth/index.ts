// ANIVIA — "Sign in with AniList" + persistent AniList account links.
//
// POST { access_token, expires_in }            (optionally with the user's Supabase JWT)
//  • signed in  → links the verified AniList account to the current ANIVIA account
//  • signed out → signs into the ANIVIA account linked to that AniList account,
//                 creating one on first use; returns a one-time `token_hash` that the
//                 browser exchanges with supabase.auth.verifyOtp({ type: 'magiclink' })
//
// The AniList token is verified against AniList itself, so nobody can claim someone
// else's AniList account. Uses the service-role key Supabase injects automatically —
// no secrets live in the repo.
//
// Deploy: supabase functions deploy anilist-auth --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'

/** Server key: the new `SUPABASE_SECRET_KEYS` ("default" entry), falling back to the legacy service role key. */
function serverKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
    if (keys.default) return keys.default
  } catch {
    /* not set or not JSON */
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://anivia.animehub.hu,http://localhost:5173,http://localhost:4173').split(',')
const EMAIL_DOMAIN = Deno.env.get('ANILIST_EMAIL_DOMAIN') ?? 'anilist.anivia.animehub.hu'

function cors(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } })

interface Viewer {
  id: number
  name: string
  siteUrl: string
  avatar: { large: string | null }
}

async function verifyAniList(token: string): Promise<Viewer | null> {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: 'query { Viewer { id name siteUrl avatar { large } } }' }),
  })
  if (!res.ok) return null
  const body = await res.json().catch(() => null)
  return body?.data?.Viewer ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

  const input = await req.json().catch(() => ({}))
  const token = typeof input.access_token === 'string' ? input.access_token : ''
  const expiresIn = Math.min(Math.max(Number(input.expires_in) || 31_536_000, 60), 31_536_000)
  if (!token || token.length > 4000) return json(req, { error: 'Missing AniList access token.' }, 400)

  const viewer = await verifyAniList(token)
  if (!viewer) return json(req, { error: 'AniList rejected this token — please try again.' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serverKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Who is calling? (anon key → not signed in)
  let callerId: string | null = null
  const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (bearer) {
    const { data } = await admin.auth.getUser(bearer)
    callerId = data.user?.id ?? null
  }

  const { data: existing } = await admin.from('anilist_links').select('user_id').eq('anilist_id', viewer.id).maybeSingle()
  const link = (userId: string) =>
    admin.from('anilist_links').upsert(
      {
        user_id: userId,
        anilist_id: viewer.id,
        anilist_name: viewer.name,
        avatar_url: viewer.avatar.large,
        site_url: viewer.siteUrl,
        access_token: token,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      },
      { onConflict: 'user_id' },
    )

  // ── Link to the signed-in account ──────────────────────────────────────────
  if (callerId) {
    if (existing && existing.user_id !== callerId)
      return json(req, { error: `The AniList account “${viewer.name}” is already linked to another ANIVIA account. Sign in with AniList to use that account, or unlink it there first.` }, 409)
    const { error } = await link(callerId)
    if (error) return json(req, { error: error.message }, 500)
    return json(req, { mode: 'linked', anilist: { id: viewer.id, name: viewer.name } })
  }

  // ── Sign in (create the account on first use) ──────────────────────────────
  const { data: flag } = await admin.from('feature_flags').select('enabled').eq('key', 'anilist_login').maybeSingle()
  if (flag && !flag.enabled) return json(req, { error: 'Signing in with AniList is turned off right now.' }, 403)

  let userId = existing?.user_id as string | undefined
  let email: string | undefined
  if (userId) {
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error || !data.user) return json(req, { error: 'Linked account not found.' }, 404)
    email = data.user.email ?? undefined
  } else {
    const { data: reg } = await admin.from('feature_flags').select('enabled').eq('key', 'registration').maybeSingle()
    if (reg && !reg.enabled) return json(req, { error: 'New sign-ups are closed right now.' }, 403)
    email = `anilist-${viewer.id}@${EMAIL_DOMAIN}`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: viewer.name, anilist_id: viewer.id, avatar_url: viewer.avatar.large },
    })
    if (error || !data.user) {
      // A previous attempt may have created the user but not the link.
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const found = list?.users.find((u) => u.email === email)
      if (!found) return json(req, { error: error?.message ?? 'Could not create the account.' }, 500)
      userId = found.id
    } else userId = data.user.id
    await admin.from('profiles').update({ display_name: viewer.name.slice(0, 48), avatar_url: viewer.avatar.large }).eq('id', userId)
  }
  if (!email) return json(req, { error: 'This account has no email address to sign in with.' }, 500)

  const { error: linkError } = await link(userId!)
  if (linkError) return json(req, { error: linkError.message }, 500)

  const { data: magic, error: magicError } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (magicError || !magic.properties?.hashed_token) return json(req, { error: magicError?.message ?? 'Could not start the session.' }, 500)

  return json(req, { mode: 'signed-in', token_hash: magic.properties.hashed_token, created: !existing, anilist: { id: viewer.id, name: viewer.name } })
})
