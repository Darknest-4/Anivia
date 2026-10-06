import { t } from '@/i18n'
import type { ScheduleItem } from '@/types'

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
const escape = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

/** Start time of a weekly schedule slot in the current week (local time). */
export function slotDate(item: Pick<ScheduleItem, 'day' | 'time'>, now = new Date()) {
  const today = (now.getDay() + 6) % 7
  const d = new Date(now)
  d.setDate(now.getDate() + (item.day - today))
  const [h, m] = item.time.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d
}

/** iCalendar file (RFC 5545) with one event per episode — imports into Google, Apple and Outlook calendars. */
export function scheduleToIcs(items: ScheduleItem[], origin = window.location.origin, now = new Date()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ANIVIA//Release schedule//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:ANIVIA releases']
  for (const s of items) {
    const start = slotDate(s, now)
    const end = new Date(start.getTime() + (s.anime.duration ?? 24) * 60_000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${s.id}-${s.episode}@anivia`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escape(t('{p0} — Episode {p1}', { p0: s.anime.title, p1: s.episode }))}`,
      `URL:${origin}/anime/${s.animeId}`,
      `DESCRIPTION:${escape(`${origin}/anime/${s.animeId}`)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadText(filename: string, text: string, type = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
