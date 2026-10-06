import { describe, expect, it } from 'vitest'
import { anilistAuthStore } from '@/services/anilistAccount/store'
import { consentStore } from '@/services/platform/analytics'
import { clearAccountData } from '@/services/user/clearLocal'
import { favoritesStore, historyStore, ratingsStore, watchlistStore } from '@/services/user/stores'

describe('clearAccountData', () => {
  it('removes personal data but keeps device-level choices', () => {
    watchlistStore.set([{ animeId: '1', status: 'watching', addedAt: '2026-01-01', updatedAt: '2026-01-01' } as never])
    favoritesStore.set(['1'])
    ratingsStore.set({ '1': 8 })
    historyStore.set([{ animeId: '1' } as never])
    anilistAuthStore.set({ token: 't', expiresAt: Date.now() + 60_000, userId: 5, name: 'x' })
    consentStore.set('granted')

    clearAccountData()

    expect(watchlistStore.get()).toEqual([])
    expect(favoritesStore.get()).toEqual([])
    expect(ratingsStore.get()).toEqual({})
    expect(historyStore.get()).toEqual([])
    expect(anilistAuthStore.get()).toBeNull()
    expect(consentStore.get()).toBe('granted')
    expect(Object.keys(localStorage).filter((k) => /watchlist|favorites|anilist-auth/.test(k) && localStorage.getItem(k) !== '[]' && localStorage.getItem(k) !== 'null')).toEqual([])
  })
})
