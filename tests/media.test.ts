import { beforeEach, describe, expect, it, vi } from 'vitest'
import { imageSize, mediaLookup, serveMedia, type R2Bucket } from '../worker/media'

function jpeg(width: number, height: number) {
  // SOI, APP0 (len 16), SOF0 (len 17)
  const app0 = [0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0)]
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 3, ...new Array(9).fill(0)]
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof, 0xff, 0xd9])
}
function png(width: number, height: number) {
  const b = new Uint8Array(32)
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  new DataView(b.buffer).setUint32(16, width)
  new DataView(b.buffer).setUint32(20, height)
  return b
}

function bucket(files: Record<string, Uint8Array>): R2Bucket {
  const obj = (key: string) => ({
    key,
    size: files[key].length,
    httpEtag: `"${key}"`,
    get body() {
      return new Response(files[key]).body as ReadableStream
    },
    arrayBuffer: async () => files[key].slice().buffer,
  })
  return {
    async get(key) {
      return files[key] ? obj(key) : null
    },
    async list({ prefix = '' } = {}) {
      return { objects: Object.keys(files).filter((k) => k.startsWith(prefix)).map(obj), truncated: false }
    },
  }
}

const ctx = { waitUntil: () => undefined }

describe('R2 media', () => {
  beforeEach(() => {
    vi.stubGlobal('caches', { default: { match: async () => undefined, put: async () => undefined } })
  })

  it('reads image sizes', () => {
    expect(imageSize(jpeg(460, 650))).toEqual({ width: 460, height: 650 })
    expect(imageSize(png(1900, 400))).toEqual({ width: 1900, height: 400 })
    expect(imageSize(new Uint8Array([1, 2, 3]))).toBeNull()
  })

  it('picks the portrait image as cover and the wide one as banner, ignoring backdrops', async () => {
    const b = bucket({
      '21/aaa-uuid.jpg': jpeg(1920, 1080), // backdrop (16:9) → ignored
      '21/bbb-uuid.jpg': jpeg(1900, 400), // banner
      '21/ccc-uuid.jpg': jpeg(460, 650), // cover
    })
    const cover = await serveMedia(new Request('https://x.test/media/21/cover'), b, ctx, '21', 'cover')
    expect(cover.headers.get('x-anivia-media')).toBe('21/ccc-uuid.jpg')
    const banner = await serveMedia(new Request('https://x.test/media/21/banner'), b, ctx, '21', 'banner')
    expect(banner.headers.get('x-anivia-media')).toBe('21/bbb-uuid.jpg')
  })

  it('uses file names when they say what the image is', async () => {
    const b = bucket({ '5/cover/x.jpg': jpeg(1900, 400), '5/logo/y.jpg': jpeg(400, 600) })
    const res = await serveMedia(new Request('https://x.test/media/5/cover'), b, ctx, '5', 'cover')
    expect(res.headers.get('x-anivia-media')).toBe('5/cover/x.jpg')
  })

  it('falls back to AniList only', async () => {
    const b = bucket({})
    const ok = await serveMedia(new Request('https://x.test/media/9/cover?fb=' + encodeURIComponent('https://s4.anilistcdn.net/a.jpg')), b, ctx, '9', 'cover')
    expect(ok.status).toBe(302)
    expect(ok.headers.get('location')).toBe('https://s4.anilistcdn.net/a.jpg')
    const evil = await serveMedia(new Request('https://x.test/media/9/cover?fb=' + encodeURIComponent('https://evil.example/a.jpg')), b, ctx, '9', 'cover')
    expect(evil.status).toBe(404)
  })
})

describe('/api/media', () => {
  beforeEach(() => {
    vi.stubGlobal('caches', { default: { match: async () => undefined, put: async () => undefined } })
  })
  it('returns public URLs per AniList id', async () => {
    const b = bucket({ '21/c c.jpg': jpeg(460, 650), '21/b.jpg': jpeg(1900, 400), '7/x.jpg': jpeg(1920, 1080) })
    const res = await mediaLookup(new Request('https://x.test/api/media?ids=21,7,abc'), b, ctx, 'https://media.animehub.hu')
    expect(await res.json()).toEqual({
      '21': { cover: 'https://media.animehub.hu/21/c%20c.jpg', banner: 'https://media.animehub.hu/21/b.jpg' },
      '7': null,
    })
  })
  it('reports a missing bucket', async () => {
    expect((await mediaLookup(new Request('https://x.test/api/media?ids=1'), undefined, ctx, 'https://m')).status).toBe(503)
  })
})
