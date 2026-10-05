import { MEDIA_FIELDS } from './queries'
import type { AlMedia, AlPageInfo } from './types'

export type PageVars = Record<string, unknown>
export type PageResult = { pageInfo: AlPageInfo; media: AlMedia[] }

/** Variable name → AniList `media(...)` argument and literal type. */
const ARGS: Record<string, [arg: string, kind: 'int' | 'string' | 'enum' | 'enum[]' | 'string[]' | 'int[]']> = {
  sort: ['sort', 'enum[]'],
  search: ['search', 'string'],
  genres: ['genre_in', 'string[]'],
  tags: ['tag_in', 'string[]'],
  year: ['seasonYear', 'int'],
  season: ['season', 'enum'],
  status: ['status', 'enum'],
  formats: ['format_in', 'enum[]'],
  minScore: ['averageScore_greater', 'int'],
  ids: ['id_in', 'int[]'],
}

const ENUM = /^[A-Z_]+$/
const int = (v: unknown) => {
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error('Invalid number')
  return String(Math.trunc(n))
}
const enumLit = (v: unknown) => {
  if (typeof v !== 'string' || !ENUM.test(v)) throw new Error('Invalid enum')
  return v
}

/** Serializes one variable as a GraphQL literal (values are validated, strings JSON-escaped). */
function literal(kind: (typeof ARGS)[string][1], v: unknown): string {
  switch (kind) {
    case 'int':
      return int(v)
    case 'string':
      return JSON.stringify(String(v))
    case 'enum':
      return enumLit(v)
    case 'enum[]':
      return `[${(v as unknown[]).map(enumLit).join(',')}]`
    case 'string[]':
      return `[${(v as unknown[]).map((x) => JSON.stringify(String(x))).join(',')}]`
    case 'int[]':
      return `[${(v as unknown[]).map(int).join(',')}]`
  }
}

/** Builds one aliased `Page` selection with inlined arguments. */
export function pageField(alias: string, vars: PageVars) {
  const args = ['type: ANIME', 'isAdult: false']
  for (const [key, value] of Object.entries(vars)) {
    const spec = ARGS[key]
    if (!spec || value === undefined || value === null || (Array.isArray(value) && !value.length)) continue
    args.push(`${spec[0]}: ${literal(spec[1], value)}`)
  }
  return `${alias}: Page(page: ${int(vars.page ?? 1)}, perPage: ${int(vars.perPage ?? 24)}) {
    pageInfo { total currentPage lastPage perPage }
    media(${args.join(', ')}) { ${MEDIA_FIELDS} }
  }`
}

/**
 * Collects `Page` queries issued in the same tick and sends them as ONE GraphQL request
 * using aliases. A home page that needs ~8 lists makes 2–3 requests instead of 8 — far faster
 * and much kinder to AniList's per-minute rate limit.
 */
export function createPageBatcher(send: (query: string) => Promise<Record<string, PageResult>>, windowMs = 12, maxBatch = 3) {
  let pending: { vars: PageVars; resolve: (r: PageResult) => void; reject: (e: unknown) => void }[] = []
  let timer: ReturnType<typeof setTimeout> | undefined

  const flush = () => {
    timer = undefined
    // Identical requests in the same window share one alias.
    const groups = new Map<string, typeof pending>()
    for (const p of pending) {
      const key = JSON.stringify(p.vars)
      groups.set(key, [...(groups.get(key) ?? []), p])
    }
    pending = []
    const batch = [...groups.values()].map((g) => ({
      vars: g[0].vars,
      resolve: (r: PageResult) => g.forEach((x) => x.resolve(r)),
      reject: (e: unknown) => g.forEach((x) => x.reject(e)),
    }))
    for (let i = 0; i < batch.length; i += maxBatch) {
      const chunk = batch.slice(i, i + maxBatch)
      let query: string
      try {
        query = `query { ${chunk.map((c, j) => pageField(`p${j}`, c.vars)).join('\n')} }`
      } catch (err) {
        chunk.forEach((c) => c.reject(err))
        continue
      }
      send(query).then(
        (data) => chunk.forEach((c, j) => (data?.[`p${j}`] ? c.resolve(data[`p${j}`]) : c.reject(new Error('Missing AniList response')))),
        (err) => {
          // A combined query can exceed AniList's complexity limit — fall back to one request per list.
          if (chunk.length === 1) return chunk[0].reject(err)
          for (const c of chunk) send(`query { ${pageField('p0', c.vars)} }`).then((d) => (d?.p0 ? c.resolve(d.p0) : c.reject(err)), c.reject)
        },
      )
    }
  }

  return (vars: PageVars) =>
    new Promise<PageResult>((resolve, reject) => {
      pending.push({ vars, resolve, reject })
      if (pending.length >= maxBatch) {
        if (timer) clearTimeout(timer)
        flush()
      } else timer ??= setTimeout(flush, windowMs)
    })
}
