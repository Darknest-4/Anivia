import { describe, expect, it, vi } from 'vitest'
import { createPageBatcher, pageField } from '@/services/anime/anilist/batch'

describe('pageField', () => {
  it('inlines validated arguments', () => {
    const q = pageField('p0', { page: 2, perPage: 10, sort: ['POPULARITY_DESC'], search: 'Frieren "x"', genres: ['Action'] })
    expect(q).toContain('p0: Page(page: 2, perPage: 10)')
    expect(q).toContain('sort: [POPULARITY_DESC]')
    expect(q).toContain('search: "Frieren \\"x\\""')
    expect(q).toContain('genre_in: ["Action"]')
    expect(q).toContain('isAdult: false')
  })
  it('rejects GraphQL injection through enums', () => {
    expect(() => pageField('p0', { sort: ['POPULARITY_DESC) { id } evil: Page('] })).toThrow()
  })
})

describe('createPageBatcher', () => {
  it('merges concurrent requests into one query and de-duplicates', async () => {
    const send = vi.fn(async (query: string) => {
      const out: Record<string, unknown> = {}
      for (const m of query.matchAll(/(p\d+): Page/g)) out[m[1]] = { pageInfo: { total: 1, currentPage: 1, lastPage: 1, perPage: 1 }, media: [] }
      return out as never
    })
    const batch = createPageBatcher(send)
    await Promise.all([batch({ sort: ['TRENDING_DESC'] }), batch({ sort: ['TRENDING_DESC'] }), batch({ sort: ['SCORE_DESC'] })])
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].match(/: Page\(/g)).toHaveLength(2)
  })
  it('falls back to single requests when a combined query fails', async () => {
    let calls = 0
    const send = vi.fn(async () => {
      calls++
      if (calls === 1) throw new Error('Max query complexity')
      return { p0: { pageInfo: { total: 0, currentPage: 1, lastPage: 1, perPage: 1 }, media: [] } } as never
    })
    const batch = createPageBatcher(send)
    const results = await Promise.all([batch({ sort: ['TRENDING_DESC'] }), batch({ sort: ['SCORE_DESC'] })])
    expect(results).toHaveLength(2)
    expect(send).toHaveBeenCalledTimes(3)
  })
})
