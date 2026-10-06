/**
 * /media/:anilistId/:kind — covers and banners from the R2 bucket (binding MEDIA).
 *
 * Bucket layout: `<anilistId>/<anything>.<jpg|png|webp>` (e.g. `21/3f2a…-uuid.jpg`), optionally in
 * sub-folders. Which file is the cover and which is the banner is decided by
 *   1. the key or custom metadata (contains "cover"/"poster" or "banner"), otherwise
 *   2. the image's shape read from its header: portrait → cover, very wide (≥ 2.6:1) → banner.
 * Anything else in the folder (backdrops, logos) is ignored.
 *
 * Missing images redirect to `?fb=` (only AniList's CDN is allowed), so the site never shows a gap.
 * Responses and the per-title index are cached at the edge.
 */

declare const caches: { default: Cache }

export interface R2Object {
  key: string
  size: number
  httpEtag: string
  httpMetadata?: { contentType?: string }
  customMetadata?: Record<string, string>
  body: ReadableStream
  arrayBuffer(): Promise<ArrayBuffer>
}
export interface R2Bucket {
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<R2Object | null>
  list(options?: { prefix?: string; limit?: number; cursor?: string; include?: ('customMetadata' | 'httpMetadata')[] }): Promise<{
    objects: Omit<R2Object, 'body' | 'arrayBuffer'>[]
    truncated: boolean
    cursor?: string
  }>
}

type Kind = 'cover' | 'banner'
interface Index {
  cover: string | null
  banner: string | null
}

const INDEX_TTL = 6 * 3600
const IMAGE_EDGE_TTL = 7 * 24 * 3600
const IMAGE_BROWSER_TTL = 24 * 3600
const FALLBACK_HOSTS = /^https:\/\/(s\d+\.anilistcdn\.net|img\.anili\.st)\//

/** Width/height from the first bytes of a JPEG, PNG or WebP file. */
export function imageSize(buf: Uint8Array): { width: number; height: number } | null {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  // PNG
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) return { width: v.getUint32(16), height: v.getUint32(20) }
  // WebP
  if (buf.length >= 30 && v.getUint32(0) === 0x52494646 && v.getUint32(8) === 0x57454250) {
    const chunk = String.fromCharCode(buf[12], buf[13], buf[14], buf[15])
    if (chunk === 'VP8X') return { width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)), height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)) }
    if (chunk === 'VP8 ') return { width: v.getUint16(26, true) & 0x3fff, height: v.getUint16(28, true) & 0x3fff }
    if (chunk === 'VP8L') {
      const b = v.getUint32(21, true)
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }
    }
  }
  // JPEG: walk the segments until a start-of-frame marker.
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++
        continue
      }
      const marker = buf[i + 1]
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2
        continue
      }
      const len = v.getUint16(i + 2)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { height: v.getUint16(i + 5), width: v.getUint16(i + 7) }
      i += 2 + len
    }
  }
  return null
}

const isImage = (key: string) => /\.(jpe?g|png|webp|avif)$/i.test(key)
const named = (text: string): Kind | 'other' | null =>
  /cover|poster/i.test(text) ? 'cover' : /banner/i.test(text) ? 'banner' : /backdrop|fanart|background|logo/i.test(text) ? 'other' : null

async function buildIndex(bucket: R2Bucket, id: string): Promise<Index> {
  const listed = await bucket.list({ prefix: `${id}/`, limit: 100, include: ['customMetadata', 'httpMetadata'] })
  const files = listed.objects.filter((o) => isImage(o.key) && o.size > 0)
  const index: Index = { cover: null, banner: null }
  const unknown: typeof files = []
  for (const f of files) {
    const meta = f.customMetadata ? Object.values(f.customMetadata).join(' ') : ''
    const kind = named(f.key.slice(id.length + 1)) ?? named(meta)
    if (kind === 'cover' || kind === 'banner') index[kind] ??= f.key
    else if (kind === null) unknown.push(f)
  }
  // Decide the rest by shape (reads only the first 64 KB of each file).
  for (const f of unknown.slice(0, 12)) {
    if (index.cover && index.banner) break
    const head = await bucket.get(f.key, { range: { offset: 0, length: 65536 } })
    if (!head) continue
    const size = imageSize(new Uint8Array(await head.arrayBuffer()))
    if (!size || !size.width || !size.height) continue
    const ratio = size.width / size.height
    if (ratio < 0.95) index.cover ??= f.key
    else if (ratio >= 2.6) index.banner ??= f.key
  }
  return index
}

async function getIndex(bucket: R2Bucket, id: string, ctx: { waitUntil(p: Promise<unknown>): void }, origin: string): Promise<Index> {
  const key = new Request(`${origin}/__media-index/v1/${id}`)
  const hit = await caches.default.match(key)
  if (hit) return hit.json()
  const index = await buildIndex(bucket, id)
  ctx.waitUntil(caches.default.put(key, new Response(JSON.stringify(index), { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${INDEX_TTL}` } })))
  return index
}

function fallback(url: URL) {
  const fb = url.searchParams.get('fb')
  if (fb && FALLBACK_HOSTS.test(fb)) return Response.redirect(fb, 302)
  return new Response('Not found', { status: 404, headers: { 'cache-control': 'public, max-age=300' } })
}

export async function serveMedia(request: Request, bucket: R2Bucket | undefined, ctx: { waitUntil(p: Promise<unknown>): void }, id: string, kind: Kind): Promise<Response> {
  const url = new URL(request.url)
  if (!bucket) return fallback(url)

  // One cached copy per title + kind, whatever the fallback parameter says.
  const cacheKey = new Request(`${url.origin}/media/${id}/${kind}`)
  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  let index: Index
  try {
    index = await getIndex(bucket, id, ctx, url.origin)
  } catch {
    return fallback(url)
  }
  const key = index[kind]
  if (!key) return fallback(url)
  const obj = await bucket.get(key)
  if (!obj) return fallback(url)

  const headers = new Headers({
    'content-type': obj.httpMetadata?.contentType || (/\.png$/i.test(key) ? 'image/png' : /\.webp$/i.test(key) ? 'image/webp' : 'image/jpeg'),
    'cache-control': `public, max-age=${IMAGE_BROWSER_TTL}, s-maxage=${IMAGE_EDGE_TTL}, stale-while-revalidate=86400`,
    etag: obj.httpEtag,
    'x-anivia-media': key,
    'access-control-allow-origin': '*',
  })
  const response = new Response(obj.body, { headers })
  ctx.waitUntil(caches.default.put(cacheKey, response.clone()))
  return response
}

const publicUrl = (base: string, key: string) => `${base.replace(/\/$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`

/**
 * GET /api/media?ids=1,2,3 → { "1": { cover, banner }, … } with public URLs (MEDIA_PUBLIC_URL),
 * so browsers load the images straight from the public bucket. One request per list of titles.
 */
export async function mediaLookup(request: Request, bucket: R2Bucket | undefined, ctx: { waitUntil(p: Promise<unknown>): void }, publicBase: string): Promise<Response> {
  const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json; charset=utf-8' }
  if (!bucket || !publicBase) return new Response(JSON.stringify({ error: 'media bucket not configured' }), { status: 503, headers: cors })
  const url = new URL(request.url)
  const ids = [...new Set((url.searchParams.get('ids') ?? '').split(',').filter((id) => /^\d{1,9}$/.test(id)))].slice(0, 100)
  if (!ids.length) return new Response('{}', { headers: cors })

  const cacheKey = new Request(`${url.origin}/api/media?ids=${ids.slice().sort().join(',')}`)
  const hit = await caches.default.match(cacheKey)
  if (hit) return hit

  const out: Record<string, { cover: string | null; banner: string | null } | null> = {}
  await Promise.all(
    ids.map(async (id) => {
      try {
        const index = await getIndex(bucket, id, ctx, url.origin)
        out[id] = index.cover || index.banner ? { cover: index.cover && publicUrl(publicBase, index.cover), banner: index.banner && publicUrl(publicBase, index.banner) } : null
      } catch {
        out[id] = null
      }
    }),
  )
  const response = new Response(JSON.stringify(out), { headers: { ...cors, 'cache-control': `public, max-age=3600, s-maxage=${INDEX_TTL}` } })
  ctx.waitUntil(caches.default.put(cacheKey, response.clone()))
  return response
}
