import { describe, expect, it } from 'vitest'
import { coverSrcSet } from '@/components/anime/AnimePoster'

describe('coverSrcSet', () => {
  it('offers all AniList cover sizes', () => {
    expect(coverSrcSet('https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-abc.jpg')).toBe(
      'https://s4.anilist.co/file/anilistcdn/media/anime/cover/small/bx21-abc.jpg 100w, https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21-abc.jpg 230w, https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-abc.jpg 460w',
    )
  })
  it('leaves other images alone', () => {
    expect(coverSrcSet('https://cdn.myanimelist.net/images/anime/1/1.jpg')).toBeUndefined()
  })
})
