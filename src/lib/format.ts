import { locale, t } from '@/i18n'
import { preferencesStore } from '@/services/user/stores'
import type { AnimeStatus, SeasonName } from '@/types'

const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
const full = new Intl.NumberFormat(locale)

export const formatCompact = (n: number) => compact.format(n)
export const formatNumber = (n: number) => full.format(n)

/** Scores out of 10: one decimal for whole-tenth scores (AniList), two otherwise (MAL, demo data). */
export function formatRating(rating?: number) {
  if (!rating) return 'N/A'
  const scale = preferencesStore.get().ratingScale
  if (scale === '100') return String(Math.round(rating * 10))
  if (scale === '5') return (rating / 2).toFixed(1)
  return Number.isInteger(Math.round(rating * 100) / 10) ? rating.toFixed(1) : rating.toFixed(2)
}

/** Max value of the active score scale, for labels such as “8.4 / 10”. */
export const ratingMax = () => Number(preferencesStore.get().ratingScale)

/** Spoiler-free mode hides every score. */
export const scoresHidden = () => preferencesStore.get().hideScores

export function formatDate(iso: string | undefined, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale, opts)
}

/** "24 min", "1h 52m" */
export function formatMinutes(minutes?: number) {
  if (!minutes) return '—'
  if (minutes < 60) return t('{p0} min', { p0: minutes })
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}${t('h')} ${m}${t('m')}` : `${h}${t('h')}`
}

/** Total watch time: 6120 → "1h 42m", 300 → "5m", 0 → "0m". */
export function formatWatchTime(totalSeconds: number) {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}${t('h')} ${m}${t('m')}` : `${m}${t('m')}`
}

/** Media clock: 83 → "1:23", 3723 → "1:02:03" */
export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

export function formatRelative(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now
  const abs = Math.abs(diff)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000000],
    ['month', 2592000000],
    ['week', 604800000],
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
  ]
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit)
  }
  return t('just now')
}

export const statusLabel: Record<AnimeStatus, string> = {
  airing: t('Airing'),
  finished: t('Finished'),
  upcoming: t('Upcoming'),
  hiatus: t('On Hiatus'),
}

export const seasonLabel: Record<SeasonName, string> = {
  winter: t('Winter'),
  spring: t('Spring'),
  summer: t('Summer'),
  fall: t('Fall'),
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

export function pluralize(count: number, word: string, plural = `${word}s`) {
  return `${formatNumber(count)} ${count === 1 ? word : plural}`
}
