/**
 * ANIVIA Cloudflare Worker
 * - Serves the built SPA from static assets (wrangler.jsonc → assets).
 * - /api/anilist        → edge-cached proxy for the AniList GraphQL API (shared by all visitors).
 * - /api/anilist/health → lets the app detect the proxy.
 * - /anime/:id          → injects Open Graph / Twitter tags so shared links show the title and poster.
 */

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  /** Public Supabase project URL + publishable key (same values the browser uses). */
  SUPABASE_URL?: string
  SUPABASE_KEY?: string
}

// Public values (also shipped to every browser) — used to read share-preview data from the database.
const DEFAULT_SUPABASE_URL = 'https://wnmvktajokjhufuzpamy.supabase.co'
const DEFAULT_SUPABASE_KEY = 'sb_publishable_fr81aMF8zLh8ambsYTcJwg_SjxpX1DT'

interface Ctx {
  waitUntil(promise: Promise<unknown>): void
}

declare const caches: { default: Cache }
declare class HTMLRewriter {
  on(selector: string, handlers: { element?(el: { setAttribute(n: string, v: string): void; append(c: string, o?: { html: boolean }): void; setInnerContent(c: string, o?: { html: boolean }): void }): void }): HTMLRewriter
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
      headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'ANIVIA edge cache (+https://anivia.animehub.hu)' },
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

type AlMeta = {
  isAdult?: boolean
  title: { english: string | null; romaji: string | null }
  description: string | null
  coverImage: { extraLarge: string | null }
  bannerImage: string | null
  genres?: string[]
  seasonYear?: number | null
  episodes?: number | null
  averageScore?: number | null
  format?: string | null
}
type Meta = { title: string; description: string; fullDescription: string; image: string; cover: string; genres: string[]; year?: number; episodes?: number; score?: number; format?: string } | null

const META_QUERY = 'query($id:Int){Media(id:$id,type:ANIME){id isAdult title{english romaji} description(asHtml:false) coverImage{extraLarge} bannerImage genres seasonYear episodes averageScore format}}'

/**
 * Share-preview data for /anime/:id. AniList blocks Cloudflare Worker IPs, so this reads
 * (1) the title stored in Supabase (anime_catalog), then (2) asks the Supabase anilist-proxy
 * function, and only then (3) tries AniList directly.
 */
async function fetchMedia(id: string, env: Env): Promise<AlMeta | null> {
  const base = env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL
  const key = env.SUPABASE_KEY ?? DEFAULT_SUPABASE_KEY
  const headers = { apikey: key, Authorization: `Bearer ${key}`, accept: 'application/json' }
  try {
    const res = await fetch(`${base}/rest/v1/anime_catalog?id=eq.${encodeURIComponent(id)}&select=data`, { headers })
    if (res.ok) {
      const rows = (await res.json()) as { data: AlMeta }[]
      if (rows[0]?.data?.title) return rows[0].data
    }
  } catch {
    /* fall through */
  }
  const body = JSON.stringify({ query: META_QUERY, variables: { id: Number(id) } })
  for (const url of [`${base}/functions/v1/anilist-proxy`, ANILIST]) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { ...(url === ANILIST ? {} : headers), 'content-type': 'application/json', accept: 'application/json' }, body })
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) continue
      const media = ((await res.json()) as { data?: { Media?: AlMeta | null } }).data?.Media
      if (media) return media
    } catch {
      /* try the next source */
    }
  }
  return null
}

async function animeMeta(id: string, env: Env, ctx: Ctx, origin: string): Promise<Meta> {
  const cacheKey = new Request(`${origin}/__anime-meta/v3/${id}`)
  const hit = await caches.default.match(cacheKey)
  if (hit) return (await hit.json()) as Meta

  const m = await fetchMedia(id, env)
  const clean = (m?.description ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/~!.*?!~/gs, '').replace(/\(Source:[^)]*\)/gi, '').trim()
  const meta: Meta =
    m && !m.isAdult
      ? {
          title: m.title.english ?? m.title.romaji ?? 'Anime',
          description: clean.replace(/\s+/g, ' ').slice(0, 200),
          fullDescription: clean.slice(0, 2000),
          image: m.bannerImage ?? m.coverImage?.extraLarge ?? '',
          cover: m.coverImage?.extraLarge ?? '',
          genres: (m.genres ?? []).filter((g) => g !== 'Hentai' && g !== 'Ecchi'),
          year: m.seasonYear ?? undefined,
          episodes: m.episodes ?? undefined,
          score: m.averageScore ?? undefined,
          format: m.format ?? undefined,
        }
      : null
  // Misses are retried soon; hits are kept for a day.
  ctx.waitUntil(caches.default.put(cacheKey, new Response(JSON.stringify(meta), { headers: { 'cache-control': `public, max-age=${meta ? 86400 : 600}` } })))
  return meta
}

async function withMeta(request: Request, env: Env, ctx: Ctx, id: string, origin: string) {
  const page = await env.ASSETS.fetch(request)
  const meta = await animeMeta(id, env, ctx, origin).catch(() => null)
  if (!meta || !(page.headers.get('content-type') ?? '').includes('text/html')) return page
  const title = `${meta.title} — ANIVIA`
  const pageUrl = origin + new URL(request.url).pathname
  // Structured data for search engines (schema.org TVSeries / Movie).
  const ld = {
    '@context': 'https://schema.org',
    '@type': meta.format === 'MOVIE' ? 'Movie' : 'TVSeries',
    name: meta.title,
    description: meta.description,
    image: meta.cover || meta.image,
    url: pageUrl,
    genre: meta.genres,
    ...(meta.year ? { datePublished: String(meta.year) } : {}),
    ...(meta.episodes && meta.format !== 'MOVIE' ? { numberOfEpisodes: meta.episodes } : {}),
    ...(meta.score ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: (meta.score / 10).toFixed(1), bestRating: '10', ratingCount: 1 } } : {}),
  }
  const tags = [
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
  ].join('')
  // Readable content for crawlers that don't run JavaScript; React replaces it on load.
  const body = `<main style="max-width:720px;margin:40px auto;padding:0 16px;font-family:sans-serif;color:#ddd"><h1>${escapeHtml(meta.title)}</h1>${
    meta.cover ? `<img src="${escapeHtml(meta.cover)}" alt="${escapeHtml(meta.title)} poster" width="230" />` : ''
  }<p>${[meta.format, meta.year, meta.episodes ? `${meta.episodes} episodes` : '', meta.genres.join(', ')].filter(Boolean).map((x) => escapeHtml(String(x))).join(' · ')}</p>${meta.fullDescription
    .split(/\n+/)
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('')}<p><a href="/anime/${escapeHtml(id)}/episodes">Episodes</a> · <a href="/browse">Browse anime</a></p></main>`
  return new HTMLRewriter()
    .on('div#root', { element: (el) => el.setInnerContent(body, { html: true }) })
    .on('title', { element: (el) => el.setInnerContent(escapeHtml(title)) })
    .on('meta[property="og:title"]', { element: (el) => el.setAttribute('content', title) })
    .on('meta[name="description"]', { element: (el) => el.setAttribute('content', meta.description) })
    .on('meta[property="og:description"]', { element: (el) => el.setAttribute('content', meta.description) })
    .on('head', { element: (el) => el.append(tags, { html: true }) })
    .transform(page)
}

/**
 * Reports whether the Worker can actually reach AniList (AniList sometimes blocks shared
 * cloud egress IPs). Cached for 10 minutes; the app only uses the proxy when this is ok.
 */
async function health(ctx: Ctx, origin: string) {
  const key = new Request(`${origin}/__anilist-health`)
  const hit = await caches.default.match(key)
  if (hit) return new Response(hit.body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
  let ok = false
  let reason = ''
  try {
    const res = await fetch(ANILIST, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'ANIVIA edge cache (+https://anivia.animehub.hu)' },
      body: JSON.stringify({ query: '{ SiteStatistics { anime(perPage: 1) { nodes { count } } } }' }),
    })
    ok = res.ok && (res.headers.get('content-type') ?? '').includes('json')
    if (!ok) reason = `upstream ${res.status}`
  } catch (e) {
    reason = e instanceof Error ? e.message : 'unreachable'
  }
  const body = JSON.stringify(ok ? { ok: true } : { ok: false, reason })
  ctx.waitUntil(caches.default.put(key, new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=600' } })))
  return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}

const PRIVATE = ['/admin', '/settings', '/watchlist', '/history', '/profile', '/feed', '/stats', '/for-you', '/login', '/register', '/forgot-password', '/reset-password', '/status', '/api/']

function robots(origin: string) {
  const body = ['User-agent: *', 'Allow: /', ...PRIVATE.map((p) => `Disallow: ${p}`), '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n')
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } })
}

/** Static pages + every title stored in the database (anime_catalog), most popular first. */
async function sitemap(env: Env, ctx: Ctx, origin: string) {
  const key = new Request(`${origin}/__sitemap/v1`)
  const hit = await caches.default.match(key)
  if (hit) return hit
  const base = env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL
  const apikey = env.SUPABASE_KEY ?? DEFAULT_SUPABASE_KEY
  let ids: { id: string; updated_at: string }[] = []
  try {
    const res = await fetch(`${base}/rest/v1/anime_catalog?select=id,updated_at&order=popularity.desc.nullslast&limit=10000`, { headers: { apikey, Authorization: `Bearer ${apikey}` } })
    if (res.ok) ids = await res.json()
  } catch {
    /* static pages only */
  }
  const statics = ['/', '/browse', '/schedule', '/genres', '/season', '/characters', '/studios', '/lists', '/about', '/contact', '/privacy', '/terms']
  const urls = [
    ...statics.map((p) => `<url><loc>${origin}${p}</loc><changefreq>daily</changefreq></url>`),
    ...ids.map((r) => `<url><loc>${origin}/anime/${encodeURIComponent(r.id)}</loc><lastmod>${r.updated_at.slice(0, 10)}</lastmod></url>`),
  ]
  const res = new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=21600' },
  })
  ctx.waitUntil(caches.default.put(key, res.clone()))
  return res
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/robots.txt') return robots(url.origin)
    if (url.pathname === '/sitemap.xml') return sitemap(env, ctx, url.origin)
    if (url.pathname === '/api/anilist/health') return health(ctx, url.origin)
    if (url.pathname === '/api/anilist') return proxyAniList(request, ctx, url.origin)
    const detail = /^\/anime\/(\d+)\/?$/.exec(url.pathname)
    if (detail && request.method === 'GET') return withMeta(request, env, ctx, detail[1], url.origin)
    return env.ASSETS.fetch(request)
  },
}
