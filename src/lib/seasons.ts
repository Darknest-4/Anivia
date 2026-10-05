import type { SeasonInfo, SeasonName } from '@/types'
import { seasonLabel } from './format'

export const SEASON_ORDER: SeasonName[] = ['winter', 'spring', 'summer', 'fall']

export function seasonFromDate(date: Date): SeasonName {
  const m = date.getMonth()
  if (m <= 2) return 'winter'
  if (m <= 5) return 'spring'
  if (m <= 8) return 'summer'
  return 'fall'
}

export function makeSeason(season: SeasonName, year: number): SeasonInfo {
  return { season, year, slug: `${season}-${year}`, label: `${seasonLabel[season]} ${year}` }
}

export function parseSeasonSlug(slug: string | undefined): SeasonInfo | null {
  if (!slug) return null
  const match = /^(winter|spring|summer|fall)-(\d{4})$/.exec(slug)
  if (!match) return null
  return makeSeason(match[1] as SeasonName, Number(match[2]))
}

export function shiftSeason(info: SeasonInfo, delta: number): SeasonInfo {
  let index = SEASON_ORDER.indexOf(info.season) + delta
  let year = info.year
  while (index < 0) {
    index += 4
    year -= 1
  }
  while (index > 3) {
    index -= 4
    year += 1
  }
  return makeSeason(SEASON_ORDER[index], year)
}
