import { afterEach, describe, expect, it, vi } from 'vitest'
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

afterEach(() => vi.unstubAllGlobals())

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
})
