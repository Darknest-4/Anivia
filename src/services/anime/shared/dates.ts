import type { SeasonInfo } from '@/types'
import { makeSeason, seasonFromDate } from '@/lib/seasons'

export const currentSeason = (now = new Date()): SeasonInfo => makeSeason(seasonFromDate(now), now.getFullYear())

/** Monday 00:00 (local) of the current week. */
export function startOfWeek(now = new Date()) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export const dayIndex = (d: Date) => (d.getDay() + 6) % 7 // 0 = Monday
export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

export function scheduleStatus(at: Date, now = new Date()) {
  const diff = at.getTime() - now.getTime()
  if (diff <= 0) return 'aired' as const
  if (diff <= 3 * 3_600_000) return 'airing-soon' as const
  return 'upcoming' as const
}

const DAYS = ['sundays', 'mondays', 'tuesdays', 'wednesdays', 'thursdays', 'fridays', 'saturdays']

/**
 * Next broadcast as a real Date from a Japan-time slot such as `{ day: "Saturdays", time: "23:30" }`.
 * JST is UTC+9 with no daylight saving.
 */
export function nextJstBroadcast(day: string | null | undefined, time: string | null | undefined, now = new Date()): Date | undefined {
  const dow = DAYS.indexOf((day ?? '').toLowerCase())
  if (dow < 0 || !time) return undefined
  const [h, m] = time.split(':').map(Number)
  const jstNow = new Date(now.getTime() + 9 * 3_600_000)
  const target = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate(), h, m))
  let add = (dow - jstNow.getUTCDay() + 7) % 7
  if (add === 0 && target.getTime() <= jstNow.getTime()) add = 7
  target.setUTCDate(target.getUTCDate() + add)
  return new Date(target.getTime() - 9 * 3_600_000)
}

/** Episode air date estimate: weekly from the premiere. */
export const weeklyDate = (startIso: string | undefined, index: number) =>
  startIso ? new Date(new Date(startIso).getTime() + index * 7 * 86_400_000).toISOString() : ''
