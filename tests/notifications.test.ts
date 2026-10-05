import { describe, expect, it } from 'vitest'
import { buildNotifications } from '@/hooks/useNotifications'
import type { Anime } from '@/types'

const DAY = 86_400_000
const now = Date.UTC(2026, 9, 5, 12)
const base = (extra: Partial<Anime>): Anime => ({ id: '1', slug: '1', title: 'Show', description: '', poster: '', popularity: 0, status: 'airing', type: 'TV', genres: [], studios: [], languages: [], updatedAt: '', ...extra })

describe('buildNotifications', () => {
  it('reports a recently aired episode', () => {
    const n = buildNotifications([base({ episodesAired: 5, nextEpisodeAt: new Date(now + 2 * DAY).toISOString() })], now)
    expect(n.find((x) => x.kind === 'episode')?.body).toContain('Episode 5')
  })
  it('reports an episode airing within 24 hours', () => {
    const n = buildNotifications([base({ episodesAired: 5, nextEpisodeAt: new Date(now + 3 * 3_600_000).toISOString() })], now)
    expect(n.some((x) => x.kind === 'soon')).toBe(true)
  })
  it('reports upcoming premieres within two weeks only', () => {
    const soon = buildNotifications([base({ status: 'upcoming', airedFrom: new Date(now + 5 * DAY).toISOString() })], now)
    const far = buildNotifications([base({ status: 'upcoming', airedFrom: new Date(now + 40 * DAY).toISOString() })], now)
    expect(soon).toHaveLength(1)
    expect(far).toHaveLength(0)
  })
})
