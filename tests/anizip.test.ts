import { afterEach, describe, expect, it, vi } from 'vitest'

// The imported copy in the ANIVIA database (anizip_for_anilist RPC); null = not imported yet.
const dbRpc = vi.hoisted(() => vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: null, error: null })))
vi.mock('@/providers/AuthProvider', () => ({ getSupabase: async () => ({ rpc: dbRpc }) }))
import { fetchAniZip } from '@/services/anime/anizip'
import { buildEpisodes } from '@/services/anime/shared/episodes'
import type { Anime } from '@/types'

const sample = {
  titles: { en: 'Frieren', 'x-jat': 'Sousou no Frieren' },
  episodeCount: 3,
  episodes: {
    '1': { episode: '1', title: { en: 'The Journey’s End', ja: '冒険の終わり' }, airDateUtc: '2023-09-29T07:00:00Z', runtime: 24, overview: 'Frieren returns. (Source: Crunchyroll)', image: 'https://artworks.thetvdb.com/e1.jpg' },
    '2': { episode: '2', title: { 'x-jat': 'Betsu ni Mahou' }, airdate: '2023-09-29', length: 24, summary: 'Second.' },
    '3': { episode: '3', title: { en: 'Future' }, airDateUtc: '2099-01-01T00:00:00Z' },
    S1: { episode: 'S1', title: { en: 'Special' } },
  },
  images: [
    { coverType: 'Fanart', url: 'https://artworks.thetvdb.com/fanart.jpg' },
    { coverType: 'Clearlogo', url: 'https://artworks.thetvdb.com/logo.png' },
  ],
  mappings: { mal_id: 52991, anilist_id: 154587 },
}

afterEach(() => {
  vi.unstubAllGlobals()
  dbRpc.mockReset()
  dbRpc.mockImplementation(async () => ({ data: null, error: null }))
})

describe('ani.zip', () => {
  it('parses episodes, artwork and mappings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(sample), { status: 200, headers: { 'content-type': 'application/json' } })))
    const info = await fetchAniZip({ anilist: 154587 })
    expect(info?.episodes.size).toBe(3)
    expect(info?.episodes.get(1)).toMatchObject({ title: 'The Journey’s End', synopsis: 'Frieren returns.', thumbnail: 'https://artworks.thetvdb.com/e1.jpg', duration: 1440 })
    expect(info?.episodes.get(2)?.title).toBe('Betsu ni Mahou')
    expect(info?.fanart).toContain('fanart')
    expect(info?.logo).toContain('logo')
    expect(info?.malId).toBe(52991)
  })

  it('locks episodes that have not aired yet', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(sample), { status: 200 })))
    const info = await fetchAniZip({ anilist: 1 })
    const anime = { id: '1', title: 'Frieren', status: 'airing', type: 'TV', episodes: 3, poster: '', genres: [], studios: [], languages: [], popularity: 0, updatedAt: '', slug: '1', description: '' } as Anime
    const eps = buildEpisodes(anime, info!.episodes)
    expect(eps.map((e) => e.locked)).toEqual([false, false, true])
    expect(eps[0].synopsis).toBe('Frieren returns.')
  })

  it('serves imported data from the ANIVIA database without calling ani.zip', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    dbRpc.mockImplementation(async () => ({
      data: {
        mal_id: 52991,
        episode_count: 28,
        images: [{ coverType: 'Fanart', url: 'https://artworks.thetvdb.com/fanart.jpg' }],
        episodes: [
          { key: '1', titles: { en: 'The Journey’s End' }, overview: 'Frieren returns. (Source: Crunchyroll)', summary: null, air_date: '2023-09-29', air_date_utc: '2023-09-29T07:00:00Z', image: null, runtime: 24, length: null },
          { key: '2', titles: { 'x-jat': 'Betsu ni Mahou' }, overview: null, summary: 'Second.', air_date: null, air_date_utc: null, image: null, runtime: null, length: 25 },
        ],
      },
      error: null,
    }))
    const info = await fetchAniZip({ anilist: 154587 })
    expect(dbRpc).toHaveBeenCalledWith('anizip_for_anilist', { p_anilist_id: 154587 })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(info?.episodeCount).toBe(28)
    expect(info?.episodes.get(1)).toMatchObject({ title: 'The Journey’s End', synopsis: 'Frieren returns.', airDate: '2023-09-29T07:00:00Z', duration: 1440 })
    expect(info?.episodes.get(2)).toMatchObject({ title: 'Betsu ni Mahou', synopsis: 'Second.', duration: 1500 })
    expect(info?.fanart).toContain('fanart')
    expect(info?.malId).toBe(52991)
  })

  it('falls back to ani.zip when the title is not imported yet or the database is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(sample), { status: 200 })))
    dbRpc.mockImplementation(async () => ({ data: null, error: { message: 'boom' } }))
    expect((await fetchAniZip({ anilist: 1001 }))?.episodes.size).toBe(3)
    dbRpc.mockImplementation(async () => {
      throw new Error('offline')
    })
    expect((await fetchAniZip({ anilist: 1002 }))?.episodes.size).toBe(3)
  })
})
