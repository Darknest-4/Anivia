const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#039': "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…' }

/** Turns API rich text (HTML, markdown spoilers, source credits) into clean plain text. */
export function cleanDescription(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .replace(/~!([\s\S]*?)!~/g, '') // AniList spoiler blocks
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e.toLowerCase()] ?? (e.startsWith('#') ? String.fromCharCode(Number(e.slice(1))) : m))
    .replace(/__(.+?)__/g, '$1')
    .replace(/\[Written by MAL Rewrite\]/gi, '')
    .replace(/\((Source|Sources):[^)]*\)/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const firstSentence = (text: string) => {
  const match = /^[\s\S]{40,260}?[.!?](\s|$)/.exec(text)
  return (match ? match[0] : text.slice(0, 200)).trim()
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function hueFromString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return h
}

/** ISO date from AniList's fuzzy `{ year, month, day }`. */
export function fuzzyDate(d?: { year: number | null; month: number | null; day: number | null } | null) {
  if (!d?.year) return undefined
  return `${d.year}-${String(d.month ?? 1).padStart(2, '0')}-${String(d.day ?? 1).padStart(2, '0')}`
}

export const isNumericId = (id: string | undefined): id is string => Boolean(id && /^\d+$/.test(id))
