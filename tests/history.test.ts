import { beforeEach, describe, expect, it } from 'vitest'
import { formatWatchTime } from '@/lib/format'
import { thumb } from '@/lib/images'
import { historyService } from '@/services/user/historyService'
import { historyStore, watchlistStore } from '@/services/user/stores'

const ep = (n: number) => ({ animeId: '6', id: `6-e${n}`, number: n, duration: 1440 })

describe('marking episodes watched', () => {
  beforeEach(() => {
    historyStore.set([])
    watchlistStore.set([])
  })

  it('records a finished episode and adds the title to the watchlist', () => {
    historyService.setWatched(ep(1), true)
    expect(historyStore.get()[0]).toMatchObject({ animeId: '6', episodeNumber: 1, completed: true })
    expect(watchlistStore.get()[0]).toMatchObject({ animeId: '6', status: 'watching' })
    historyService.setWatched(ep(1), false)
    expect(historyStore.get()).toHaveLength(0)
  })

  it('suggests the next episode, or resumes an unfinished one', () => {
    historyService.setWatched(ep(1), true)
    historyService.setWatched(ep(2), true)
    expect(historyService.nextUp('6', 12)).toEqual({ episodeNumber: 3, resume: false })
    expect(historyService.nextUp('6', 2)).toBeNull() // nothing newer has aired
    historyService.record({ animeId: '6', episodeId: '6-e3', episodeNumber: 3, progress: 300, duration: 1440 })
    expect(historyService.nextUp('6', 12)).toEqual({ episodeNumber: 3, resume: true })
  })

  it('builds Continue Watching from the latest entry per title', () => {
    historyService.setWatched({ ...ep(12), animeId: '7', id: '7-e12' }, true) // finale of a finished show
    historyService.setWatched(ep(4), true)
    const list = historyService.upNext(historyStore.get(), (id) => (id === '7' ? 12 : 24))
    expect(list.map((h) => h.animeId)).toEqual(['6'])
  })
})

describe('formatting helpers', () => {
  it('formats watch time without rounding hours up', () => {
    expect(formatWatchTime(6120)).toBe('1h 42m')
    expect(formatWatchTime(3599)).toBe('59m')
    expect(formatWatchTime(0)).toBe('0m')
  })

  it('picks smaller artwork for thumbnails', () => {
    expect(thumb('https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1-x.png')).toBe('https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx1-x.png')
    expect(thumb('https://cdn.myanimelist.net/images/anime/12/345l.jpg')).toBe('https://cdn.myanimelist.net/images/anime/12/345.jpg')
    expect(thumb(undefined)).toBeUndefined()
  })
})

describe('profile images', async () => {
  const { isAllowedProfileImage } = await import('@/lib/profileImages')
  it('accepts only anime-database artwork', () => {
    expect(isAllowedProfileImage('https://s4.anilist.co/file/anilistcdn/character/large/b1-x.png')).toBe(true)
    expect(isAllowedProfileImage('https://cdn.myanimelist.net/images/characters/1/1.jpg')).toBe(true)
    expect(isAllowedProfileImage('https://evil.example/x.png')).toBe(false)
    expect(isAllowedProfileImage('http://s4.anilist.co/x.png')).toBe(false)
    expect(isAllowedProfileImage(undefined)).toBe(false)
  })
})
