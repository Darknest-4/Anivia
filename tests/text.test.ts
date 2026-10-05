import { describe, expect, it } from 'vitest'
import { cleanDescription, firstSentence, fuzzyDate, isNumericId, slugify } from '@/services/anime/shared/text'

describe('cleanDescription', () => {
  it('strips HTML, spoilers, entities and source credits', () => {
    const raw = '<b>Hero</b> saves &quot;the day&quot;.<br><br>~!Secret ending!~ More.<br>(Source: Crunchyroll)'
    const out = cleanDescription(raw)
    expect(out).toContain('Hero saves "the day".')
    expect(out).not.toContain('Secret ending')
    expect(out).not.toContain('Source')
    expect(out).not.toContain('<')
  })
  it('handles empty input', () => expect(cleanDescription(null)).toBe(''))
})

describe('helpers', () => {
  it('firstSentence keeps a sentence', () => expect(firstSentence('A long first sentence that is quite descriptive. Second one.')).toBe('A long first sentence that is quite descriptive.'))
  it('slugify normalises accents', () => expect(slugify('Slice of Life — Café')).toBe('slice-of-life-cafe'))
  it('fuzzyDate formats partial dates', () => expect(fuzzyDate({ year: 2024, month: 4, day: null })).toBe('2024-04-01'))
  it('isNumericId', () => {
    expect(isNumericId('123')).toBe(true)
    expect(isNumericId('celestial-eclipse')).toBe(false)
  })
})
