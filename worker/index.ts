/**
 * ANIVIA Cloudflare Worker
 * - Serves the built SPA from static assets (wrangler.jsonc → assets).
 * - /api/anilist        → edge-cached proxy for the AniList GraphQL API (shared by all visitors).
 * - /api/anilist/health → lets the app detect the proxy.
 * - /anime/:id          → injects Open Graph / Twitter tags so shared links show the title and poster.
 */

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

interface Ctx {
  waitUntil(promise: Promise<unknown>): void
}

declare const caches: { default: Cache }
declare class HTMLRewriter {
  on(selector: string, handlers: { element?(el: { setAttribute(n: string, v: string): void; append(c: string, o?: { html: boolean }): void; setInnerContent(c: string): void }): void }): HTMLRewriter
  transform(response: Response): Response
}

const ANILIST = 'https://graphql.anilist.co'
const LIST_TTL = 300 // seconds
const MAX_BODY = 32_000

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } })
}

async function proxyAniList(request: Request, ctx: Ctx, origin: string) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const from = request.headers.get('origin')
  if (from && from !== origin) return json({ error: 'Forbidden' }, 403)

  // Never cache personal (authenticated) requests — those go straight to AniList.
  if (request.headers.has('authorization')) return json({ error: 'Authenticated requests are not proxied' }, 400)
  const body = await request.text()
  if (body.length > MAX_BODY) return json({ error: 'Query too large' }, 413)
  try {
    const parsed = JSON.parse(body) as { query?: unknown }
    if (typeof parsed.query !== 'string' || /\bmutation\b/.test(parsed.query)) return json({ error: 'Invalid query' }, 400)
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const cacheKey = new Request(`${origin}/__anilist-cache/${await sha256(body)}`)
  const cached = await caches.default.match(cacheKey)
  if (cached) return new Response(cached.body, { status: 200, headers: { ...Object.fromEntries(cached.headers), 'x-anivia-cache': 'HIT' } })

  let upstream: Response
  try {
    upstream = await fetch(ANILIST, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body,
    })
  } catch {
    return json({ errors: [{ message: 'AniList is unreachable' }] }, 502)
  }
  const text = await upstream.text()
  // Anything that isn't AniList JSON (network filter, challenge page…) counts as a gateway failure.
  if (!(upstream.headers.get('content-type') ?? '').includes('json')) return json({ errors: [{ message: 'Upstream returned an unexpected response' }] }, 502)
  const headers: Record<string, string> = { 'content-type': 'application/json; charset=utf-8', 'x-anivia-cache': 'MISS' }
  const retryAfter = upstream.headers.get('retry-after')
  if (retryAfter) headers['retry-after'] = retryAfter

  // Cache only clean successes.
  if (upstream.ok && !text.includes('"errors"')) {
    const toCache = new Response(text, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${LIST_TTL}` } })
    ctx.waitUntil(caches.default.put(cacheKey, toCache))
  }
  return new Response(text, { status: upstream.status, headers })
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

async function animeMeta(id: string, ctx: Ctx, origin: string) {
  const cacheKey = new Request(`${origin}/__anime-meta/${id}`)
  const hit = await caches.default.match(cacheKey)
  if (hit) return (await hit.json()) as { title: string; description: string; image: string } | null

  const query = 'query($id:Int){Media(id:$id,type:ANIME){isAdult title{english romaji} description(asHtml:false) coverImage{extraLarge} bannerImage}}'
  const res = await fetch(ANILIST, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables: { id: Number(id) } }) })
  const m = res.ok ? ((await res.json()) as { data?: { Media?: { isAdult: boolean; title: { english: string | null; romaji: string | null }; description: string | null; coverImage: { extraLarge: string | null }; bannerImage: string | null } } }).data?.Media : null
  const meta =
    m && !m.isAdult
      ? {
          title: m.title.english ?? m.title.romaji ?? 'Anime',
          description: (m.description ?? '').replace(/<[^>]+>/g, '').replace(/~!.*?!~/gs, '').replace(/\s+/g, ' ').trim().slice(0, 200),
          image: m.bannerImage ?? m.coverImage.extraLarge ?? '',
        }
      : null
  ctx.waitUntil(caches.default.put(cacheKey, new Response(JSON.stringify(meta), { headers: { 'cache-control': 'public, max-age=86400' } })))
  return meta
}

async function withMeta(request: Request, env: Env, ctx: Ctx, id: string, origin: string) {
  const page = await env.ASSETS.fetch(request)
  const meta = await animeMeta(id, ctx, origin).catch(() => null)
  if (!meta || !(page.headers.get('content-type') ?? '').includes('text/html')) return page
  const title = `${meta.title} — ANIVIA`
  const tags = [
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`,
    `<meta property="og:url" content="${escapeHtml(origin + new URL(request.url).pathname)}" />`,
  ].join('')
  return new HTMLRewriter()
    .on('title', { element: (el) => el.setInnerContent(escapeHtml(title)) })
    .on('meta[property="og:title"]', { element: (el) => el.setAttribute('content', title) })
    .on('meta[name="description"]', { element: (el) => el.setAttribute('content', meta.description) })
    .on('meta[property="og:description"]', { element: (el) => el.setAttribute('content', meta.description) })
    .on('head', { element: (el) => el.append(tags, { html: true }) })
    .transform(page)
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/anilist/health') return json({ ok: true }, 200, { 'cache-control': 'public, max-age=3600' })
    if (url.pathname === '/api/anilist') return proxyAniList(request, ctx, url.origin)
    const detail = /^\/anime\/(\d+)\/?$/.exec(url.pathname)
    if (detail && request.method === 'GET') return withMeta(request, env, ctx, detail[1], url.origin)
    return env.ASSETS.fetch(request)
  },
}
