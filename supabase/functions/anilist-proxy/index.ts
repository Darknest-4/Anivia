// ANIVIA — AniList GraphQL proxy that stores anime data in the database.
//
//  POST /anilist-proxy          { query, variables }  → AniList response (cached in public.api_cache)
//  GET  /anilist-proxy/health   → { ok } (probes AniList; the site only uses this proxy when ok)
//
// Every Media object that passes through is also upserted into public.anime_catalog, so the
// database builds up its own copy of the catalogue (titles, covers, scores, genres, raw JSON).
// Read-only: mutations and authenticated requests are refused (those go straight to AniList).
//
// Deploy: supabase functions deploy anilist-proxy --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'

const ANILIST = 'https://graphql.anilist.co'
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Expose-Headers': 'X-Cache, Retry-After',
}
const reply = (body: string, status = 200, extra: Record<string, string> = {}) =>
  new Response(body, { status, headers: { ...CORS, 'Content-Type': 'application/json', ...extra } })

let health: { ok: boolean; status: number; at: number } | null = null

async function probe() {
  if (health && Date.now() - health.at < 10 * 60_000) return health
  try {
    const res = await fetch(ANILIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: '{ Media(id: 1) { id } }' }),
      signal: AbortSignal.timeout(5000),
    })
    health = { ok: res.ok, status: res.status, at: Date.now() }
  } catch {
    health = { ok: false, status: 0, at: Date.now() }
  }
  return health
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

// deno-lint-ignore no-explicit-any
type Json = any

/** Finds AniList Media objects anywhere in a response. */
function collectMedia(node: Json, out: Map<number, Json>) {
  if (!node || typeof node !== 'object' || out.size >= 200) return
  if (Array.isArray(node)) return node.forEach((n) => collectMedia(n, out))
  if (typeof node.id === 'number' && node.title && typeof node.title === 'object' && (node.coverImage || node.genres)) {
    const prev = out.get(node.id)
    out.set(node.id, prev ? { ...prev, ...node } : node)
  }
  for (const v of Object.values(node)) if (v && typeof v === 'object') collectMedia(v, out)
}

async function storeCatalog(body: Json) {
  const media = new Map<number, Json>()
  collectMedia(body?.data, media)
  if (!media.size) return
  const rows = [...media.values()].map((m) => ({
    id: String(m.id),
    source: 'anilist',
    title: m.title.english || m.title.romaji || m.title.native || `#${m.id}`,
    title_romaji: m.title.romaji ?? null,
    cover_url: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
    status: m.status ?? null,
    format: m.format ?? null,
    season_year: m.seasonYear ?? null,
    average_score: m.averageScore ?? null,
    popularity: m.popularity ?? null,
    genres: Array.isArray(m.genres) ? m.genres : [],
    data: m,
    updated_at: new Date().toISOString(),
  }))
  await db.from('anime_catalog').upsert(rows, { onConflict: 'id' })
}

function ttlFor(query: string) {
  if (/airingSchedule|nextAiringEpisode/.test(query)) return 15 * 60
  if (/Page\s*\(|trending|TRENDING/.test(query)) return 30 * 60
  return 6 * 3600
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const url = new URL(req.url)
  if (req.method === 'GET' && url.pathname.endsWith('/health')) {
    const h = await probe()
    return reply(JSON.stringify({ ok: h.ok, upstreamStatus: h.status, store: 'supabase' }), 200, { 'Cache-Control': 'max-age=300' })
  }
  if (req.method !== 'POST') return reply(JSON.stringify({ error: 'Method not allowed' }), 405)

  const raw = await req.text()
  if (raw.length > 20_000) return reply(JSON.stringify({ error: 'Query too large' }), 413)
  let parsed: { query?: string; variables?: Record<string, unknown> }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return reply(JSON.stringify({ error: 'Invalid JSON' }), 400)
  }
  const query = parsed.query ?? ''
  if (!query || /^\s*mutation\b/i.test(query) || /\bViewer\b/.test(query)) return reply(JSON.stringify({ error: 'Only public queries are proxied' }), 400)

  const key = await sha256(JSON.stringify([query, parsed.variables ?? {}]))
  const { data: hit } = await db.from('api_cache').select('body').eq('key', key).gt('expires_at', new Date().toISOString()).maybeSingle()
  if (hit) return reply(JSON.stringify(hit.body), 200, { 'X-Cache': 'HIT' })

  let upstream: Response
  try {
    upstream = await fetch(ANILIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: parsed.variables ?? {} }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return reply(JSON.stringify({ error: 'AniList is unreachable' }), 502)
  }
  const text = await upstream.text()
  const retry = upstream.headers.get('Retry-After')
  if (!upstream.ok) return reply(text, upstream.status, { 'X-Cache': 'BYPASS', ...(retry ? { 'Retry-After': retry } : {}) })

  let body: Json = null
  try {
    body = JSON.parse(text)
  } catch {
    return reply(text, 502)
  }
  if (body?.data && !body.errors?.length) {
    const work = Promise.all([
      db.from('api_cache').upsert({ key, body, expires_at: new Date(Date.now() + ttlFor(query) * 1000).toISOString() }),
      storeCatalog(body),
    ]).catch(() => undefined)
    // Keep the function alive for the writes without delaying the response.
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime
    if (rt?.waitUntil) rt.waitUntil(work)
    else await work
  }
  return reply(text, 200, { 'X-Cache': 'MISS' })
})
