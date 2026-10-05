import { describe, expect, it } from 'vitest'
import { filterAnime, paginate, sortAnime } from '@/lib/filters'
import type { Anime } from '@/types'

const make = (id: string, extra: Partial<Anime> = {}): Anime => ({
  id,
  slug: id,
  title: id,
  description: '',
  poster: '',
  popularity: 0,
  status: 'finished',
  type: 'TV',
  genres: [],
  studios: [],
  languages: [],
  updatedAt: '2026-01-01',
  ...extra,
})

describe('filters', () => {
  const list = [
    make('a', { rating: 9, popularity: 10, year: 2024, status: 'airing', genres: [{ id: 'g', slug: 'action', name: 'Action', description: '', hue: 0 }] }),
    make('b', { rating: 7, popularity: 50, year: 2020 }),
    make('c', { rating: 8, popularity: 30, year: 2024 }),
  ]
  it('filters by genre, status and year', () => {
    expect(filterAnime(list, { genres: ['action'] }).map((a) => a.id)).toEqual(['a'])
    expect(filterAnime(list, { status: 'airing' }).map((a) => a.id)).toEqual(['a'])
    expect(filterAnime(list, { year: 2024 }).map((a) => a.id).sort()).toEqual(['a', 'c'])
  })
  it('sorts by rating and popularity', () => {
    expect(sortAnime(list, 'rating').map((a) => a.id)).toEqual(['a', 'c', 'b'])
    expect(sortAnime(list, 'popularity').map((a) => a.id)).toEqual(['b', 'c', 'a'])
  })
  it('paginates', () => {
    const p = paginate([1, 2, 3, 4, 5], 2, 2)
    expect(p.items).toEqual([3, 4])
    expect(p.totalPages).toBe(3)
  })
})
