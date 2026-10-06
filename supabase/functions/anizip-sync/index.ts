// ANIVIA — AniZip → own database background sync worker.
//
// Called every minute by pg_cron (migration 0008) with the `x-cron-secret` header. Each call ("tick"):
//   1. takes the lease on the active sync job (anizip_tick_begin) — or creates the initial full sync /
//      the daily incremental sync; returns at once when another worker holds the lease or nothing is due,
//   2. seed phase: loads the AniDB↔AniList↔MAL mapping list (the one ani.zip itself is built on) into
//      anizip_sync_items — idempotent, finished titles keep their state,
//   3. fetch phase: takes pending titles in batches, calls api.ani.zip politely (concurrency + minimum
//      interval, timeout, retries with exponential backoff, Retry-After on 429) and stores the results with
//      one set-based RPC per batch (anizip_record_batch),
//   4. stops after a time budget so it always finishes long before the next tick; a crash just lets the
//      lease expire and the next tick continues from the saved state.
//
// Single file without npm/jsr imports on purpose: it can be pasted into the Supabase dashboard editor,
// and the unit tests import the same code (tests/anizipSync.test.ts).
// Deploy: supabase functions deploy anizip-sync --no-verify-jwt

export interface SyncConfig {
  aniZipUrl: string
  seedUrl: string
  concurrency: number
  minIntervalMs: number
  timeoutMs: number
  requestRetries: number
  timeBudgetMs: number
  maxItemsPerTick: number
  batchSize: number
  maxBatchBytes: number
  leaseSeconds: number
  incrementalHours: number
  maxAttempts: number
  seedChunk: number
  maxRetryAfterSeconds: number
}

export const DEFAULT_CONFIG: SyncConfig = {
  aniZipUrl: 'https://api.ani.zip',
  seedUrl: 'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json',
  concurrency: 3,
  minIntervalMs: 250, // ≤ 4 requests / second
  timeoutMs: 15_000,
  requestRetries: 3,
  timeBudgetMs: 45_000, // one tick per minute; the Edge Function wall limit is 150 s
  maxItemsPerTick: 120,
  batchSize: 20,
  maxBatchBytes: 1_500_000,
  leaseSeconds: 120,
  incrementalHours: 24,
  maxAttempts: 6,
  seedChunk: 2000,
  maxRetryAfterSeconds: 600,
}

export type Rpc = <T = unknown>(fn: string, args: Record<string, unknown>) => Promise<T>

export interface Deps {
  rpc: Rpc
  fetch: typeof fetch
  owner: string
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  log?: (event: string, data?: Record<string, unknown>) => void
  config?: Partial<SyncConfig>
  /** Called right after the lease decision (the HTTP handler answers with it). */
  onBegin?: (job: SyncJob | null) => void
}

export interface SyncJob {
  id: number
  job_type: 'anizip_full' | 'anizip_incremental'
  status: string
  phase: 'seed' | 'fetch'
  total: number
  processed: number
}

export interface SyncItem {
  key: string
  anidb_id: number | null
  anilist_id: number | null
  mal_id: number | null
  attempts?: number
}

export type ItemResult =
  | { key: string; outcome: 'ok'; anime: NormalizedAnime }
  | { key: string; outcome: 'skipped' | 'failed'; error: string }
  | { key: string; outcome: 'retry'; error: string; rateLimitedSeconds?: number }

export interface NormalizedEpisode {
  episode_key: string
  kind: 'regular' | 'special' | 'credit' | 'trailer' | 'parody' | 'other'
  episode_number: number | null
  absolute_episode_number: number | null
  season_number: number | null
  titles: Record<string, string>
  air_date: string | null
  air_date_utc: string | null
  runtime: number | null
  length: number | null
  overview: string | null
  summary: string | null
  image: string | null
  anidb_eid: number | null
  tvdb_episode_id: number | null
  rating: number | null
  finale_type: string | null
}

export interface NormalizedAnime {
  anidb_id: number | null
  anilist_id: number | null
  mal_id: number | null
  kitsu_id: number | null
  animeplanet_id: string | null
  anisearch_id: number | null
  livechart_id: number | null
  notifymoe_id: string | null
  tvdb_id: number | null
  imdb_id: string | null
  tmdb_id: string | null
  type: string | null
  titles: Record<string, string>
  images: { coverType: string; url: string }[]
  episode_count: number | null
  special_count: number | null
  episodes: NormalizedEpisode[]
  source_hash: string
}

// ─────────────────────────── value guards (never invent data; drop what Postgres would reject) ───────────────────────────
const INT_MAX = 2_147_483_647
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
export function int(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d{1,10}$/.test(v.trim()) ? Number(v) : NaN
  return Number.isInteger(n) && n >= 0 && n <= INT_MAX ? n : null
}
function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) && Math.abs(n) < 1e9 ? n : null
}
function str(v: unknown, max = 20_000): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, max) : null
}
function idText(v: unknown): string | null {
  if (Array.isArray(v)) return v.map((x) => idText(x)).filter(Boolean).join(',') || null
  if (isObj(v)) return Object.entries(v).map(([k, x]) => `${k}:${idText(x)}`).join(',') || null
  return str(v, 200)
}
function date(v: unknown): string | null {
  const s = str(v, 40)
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null
  const d = s.slice(0, 10)
  const y = Number(d.slice(0, 4))
  return y >= 1900 && y <= 2200 && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) ? d : null
}
function timestamp(v: unknown): string | null {
  const s = str(v, 60)
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null
  const t = Date.parse(s)
  const y = Number(s.slice(0, 4))
  return Number.isNaN(t) || y < 1900 || y > 2200 ? null : new Date(t).toISOString()
}
function httpsUrl(v: unknown): string | null {
  const s = str(v, 2000)
  return s && /^https?:\/\//i.test(s) ? s : null
}
function titlesOf(v: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!isObj(v)) return out
  for (const [lang, t] of Object.entries(v)) {
    const s = str(t, 1000)
    if (s && lang.length <= 16) out[lang] = s
  }
  return out
}
function kindOf(key: string): NormalizedEpisode['kind'] {
  if (/^\d+$/.test(key)) return 'regular'
  return ({ S: 'special', C: 'credit', T: 'trailer', P: 'parody', O: 'other' } as const)[key[0]?.toUpperCase() as 'S'] ?? 'other'
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Validates and normalizes one ani.zip /mappings response. */
export async function normalizeAniZip(data: unknown): Promise<{ ok: true; anime: NormalizedAnime } | { ok: false; kind: 'empty' | 'invalid'; error: string }> {
  if (!isObj(data)) return { ok: false, kind: 'invalid', error: 'response is not a JSON object' }
  if (data.episodes !== undefined && data.episodes !== null && !isObj(data.episodes)) return { ok: false, kind: 'invalid', error: '"episodes" is not an object' }
  if (data.mappings !== undefined && data.mappings !== null && !isObj(data.mappings)) return { ok: false, kind: 'invalid', error: '"mappings" is not an object' }

  const m = (data.mappings ?? {}) as Record<string, unknown>
  const titles = titlesOf(data.titles)
  const episodes: NormalizedEpisode[] = []
  for (const [key, raw] of Object.entries((data.episodes ?? {}) as Record<string, unknown>)) {
    if (!isObj(raw) || !key || key.length > 16) continue
    const kind = kindOf(key)
    episodes.push({
      episode_key: key,
      kind,
      episode_number: num(raw.episodeNumber) ?? (kind === 'regular' ? Number(key) : null),
      absolute_episode_number: int(raw.absoluteEpisodeNumber),
      season_number: int(raw.seasonNumber),
      titles: titlesOf(raw.title),
      air_date: date(raw.airDate ?? raw.airdate),
      air_date_utc: timestamp(raw.airDateUtc),
      runtime: int(raw.runtime),
      length: int(raw.length),
      overview: str(raw.overview),
      summary: str(raw.summary),
      image: httpsUrl(raw.image),
      anidb_eid: int(raw.anidbEid),
      tvdb_episode_id: int(raw.tvdbId),
      rating: num(raw.rating),
      finale_type: str(raw.finaleType, 40),
    })
  }
  episodes.sort((a, b) => a.episode_key.localeCompare(b.episode_key, 'en', { numeric: true }))
  const images = Array.isArray(data.images)
    ? (data.images as unknown[]).flatMap((i) => (isObj(i) && str(i.coverType, 40) && httpsUrl(i.url) ? [{ coverType: str(i.coverType, 40)!, url: httpsUrl(i.url)! }] : []))
    : []

  const base = {
    anidb_id: int(m.anidb_id),
    anilist_id: int(m.anilist_id),
    mal_id: int(m.mal_id),
    kitsu_id: int(m.kitsu_id),
    animeplanet_id: idText(m.animeplanet_id),
    anisearch_id: int(m.anisearch_id),
    livechart_id: int(m.livechart_id),
    notifymoe_id: idText(m.notifymoe_id),
    tvdb_id: int(m.thetvdb_id),
    imdb_id: idText(m.imdb_id),
    tmdb_id: idText(m.themoviedb_id),
    type: str(m.type, 40),
    titles,
    images,
    episode_count: int(data.episodeCount),
    special_count: int(data.specialCount),
    episodes,
  }
  if (base.anidb_id === null && base.anilist_id === null && base.mal_id === null && !Object.keys(titles).length && !episodes.length)
    return { ok: false, kind: 'empty', error: typeof data.error === 'string' ? `ani.zip: ${data.error}`.slice(0, 200) : 'no data on ani.zip' }
  return { ok: true, anime: { ...base, source_hash: await sha256(JSON.stringify(base)) } }
}

/** Mapping-list entry → work item. AniDB id is preferred (ani.zip is AniDB-based), then AniList, then MAL. */
export function parseSeedList(list: unknown): SyncItem[] {
  if (!Array.isArray(list)) throw new Error('mapping list is not an array')
  const out = new Map<string, SyncItem>()
  for (const e of list) {
    if (!isObj(e)) continue
    const anidb = int(e.anidb_id)
    const anilist = int(e.anilist_id)
    const mal = int(e.mal_id)
    const key = anidb !== null ? `anidb:${anidb}` : anilist !== null ? `anilist:${anilist}` : mal !== null ? `mal:${mal}` : null
    if (key && !out.has(key)) out.set(key, { key, anidb_id: anidb, anilist_id: anilist, mal_id: mal })
  }
  return [...out.values()]
}

export function itemUrl(item: SyncItem, base: string): string {
  const [source, id] = item.key.split(':')
  const param = source === 'anidb' ? 'anidb_id' : source === 'anilist' ? 'anilist_id' : 'mal_id'
  return `${base.replace(/\/$/, '')}/mappings?${param}=${encodeURIComponent(id)}`
}

/** Spaces request starts at least `minIntervalMs` apart (shared by all concurrent fetches). */
export function createLimiter(minIntervalMs: number, now: () => number, sleep: (ms: number) => Promise<void>) {
  let next = 0
  return async () => {
    const t = now()
    const wait = Math.max(0, next - t)
    next = Math.max(t, next) + minIntervalMs
    if (wait > 0) await sleep(wait)
  }
}

export function retryAfterSeconds(header: string | null, now: number): number | null {
  if (!header) return null
  if (/^\d+$/.test(header.trim())) return Number(header.trim())
  const t = Date.parse(header)
  return Number.isNaN(t) ? null : Math.max(0, Math.ceil((t - now) / 1000))
}

interface Ctx {
  cfg: SyncConfig
  fetch: typeof fetch
  now: () => number
  sleep: (ms: number) => Promise<void>
  log: (event: string, data?: Record<string, unknown>) => void
  limiter: () => Promise<void>
  deadline: number
}

/** Fetches + normalizes one title. Never throws: every problem becomes an outcome. */
export async function fetchItem(item: SyncItem, ctx: Ctx): Promise<ItemResult> {
  const { cfg } = ctx
  const url = itemUrl(item, cfg.aniZipUrl)
  let lastError = 'unknown error'
  for (let attempt = 0; attempt <= cfg.requestRetries; attempt++) {
    await ctx.limiter()
    let res: Response
    try {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), cfg.timeoutMs)
      try {
        res = await ctx.fetch(url, { headers: { accept: 'application/json', 'user-agent': 'ANIVIA-sync/1.0 (+https://anivia.animehub.hu)' }, signal: ac.signal })
      } finally {
        clearTimeout(timer)
      }
    } catch (e) {
      lastError = (e as Error).name === 'AbortError' ? `timeout after ${cfg.timeoutMs} ms` : `network: ${(e as Error).message}`
      if (!(await backoff(attempt, ctx, lastError, item.key))) break
      continue
    }

    if (res.status === 404) {
      await res.body?.cancel().catch(() => {})
      return { key: item.key, outcome: 'skipped', error: 'not found on ani.zip (404)' }
    }
    if (res.status === 429) {
      const wait = Math.min(retryAfterSeconds(res.headers.get('retry-after'), ctx.now()) ?? 30, cfg.maxRetryAfterSeconds)
      await res.body?.cancel().catch(() => {})
      ctx.log('rate limited', { key: item.key, retryAfterSeconds: wait, attempt })
      lastError = `HTTP 429 (retry after ${wait}s)`
      if (attempt < cfg.requestRetries && wait <= 10 && ctx.now() + wait * 1000 + cfg.timeoutMs < ctx.deadline) {
        await ctx.sleep(wait * 1000)
        continue
      }
      return { key: item.key, outcome: 'retry', error: lastError, rateLimitedSeconds: wait }
    }
    if (res.status >= 500 || res.status === 408) {
      await res.body?.cancel().catch(() => {})
      lastError = `HTTP ${res.status}`
      if (!(await backoff(attempt, ctx, lastError, item.key))) break
      continue
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {})
      return { key: item.key, outcome: 'failed', error: `HTTP ${res.status}` }
    }

    let data: unknown
    try {
      data = JSON.parse(await res.text())
    } catch {
      return { key: item.key, outcome: 'failed', error: 'invalid response: not JSON' }
    }
    const n = await normalizeAniZip(data)
    if (n.ok) return { key: item.key, outcome: 'ok', anime: n.anime }
    return n.kind === 'empty' ? { key: item.key, outcome: 'skipped', error: n.error } : { key: item.key, outcome: 'failed', error: `invalid response: ${n.error}` }
  }
  return { key: item.key, outcome: 'retry', error: lastError }
}

/** Exponential backoff with jitter; false when there is no retry or time left. */
async function backoff(attempt: number, ctx: Ctx, error: string, key: string): Promise<boolean> {
  if (attempt >= ctx.cfg.requestRetries) return false
  const wait = 1000 * 2 ** attempt + Math.floor(Math.random() * 250)
  if (ctx.now() + wait + ctx.cfg.timeoutMs > ctx.deadline) return false
  ctx.log('retrying', { key, attempt: attempt + 1, waitMs: wait, error })
  await ctx.sleep(wait)
  return true
}

/** Runs `fn` over `items` with at most `limit` in flight. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  const worker = async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

/** Splits results so one RPC body stays under `maxBytes` (One Piece alone is ~1 MB). */
export function chunkBySize<T>(items: T[], maxBytes: number, maxCount: number): T[][] {
  const chunks: T[][] = []
  let cur: T[] = []
  let size = 0
  for (const it of items) {
    const s = JSON.stringify(it).length
    if (cur.length && (size + s > maxBytes || cur.length >= maxCount)) {
      chunks.push(cur)
      cur = []
      size = 0
    }
    cur.push(it)
    size += s
  }
  if (cur.length) chunks.push(cur)
  return chunks
}

export interface TickSummary {
  state: 'idle' | 'worked' | 'completed' | 'error'
  jobId?: number
  phase?: string
  fetched: number
  imported: number
  updated: number
  unchanged: number
  skipped: number
  failed: number
  retries: number
  episodes: number
  seeded?: number
  error?: string
}

/** One worker tick. Never runs longer than the time budget (+ one in-flight request). */
export async function runTick(deps: Deps): Promise<TickSummary> {
  const cfg = { ...DEFAULT_CONFIG, ...deps.config }
  const now = deps.now ?? Date.now
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const log = deps.log ?? ((event: string, data?: Record<string, unknown>) => console.log(`[ANIZIP SYNC] ${event}`, data ? JSON.stringify(data) : ''))
  const { rpc, owner } = deps
  const started = now()
  const summary: TickSummary = { state: 'idle', fetched: 0, imported: 0, updated: 0, unchanged: 0, skipped: 0, failed: 0, retries: 0, episodes: 0 }

  const job = await rpc<SyncJob | null>('anizip_tick_begin', { p_owner: owner, p_lease_seconds: cfg.leaseSeconds, p_incremental_hours: cfg.incrementalHours })
  deps.onBegin?.(job)
  if (!job) return summary
  summary.jobId = job.id
  summary.phase = job.phase
  summary.state = 'worked'
  log(job.processed === 0 && job.phase === 'seed' ? 'started' : 'resumed', { job: job.id, type: job.job_type, phase: job.phase, processed: job.processed, total: job.total })

  try {
    if (job.phase === 'seed') {
      try {
        summary.seeded = await seed(job, deps.fetch, rpc, owner, cfg, log)
      } catch (e) {
        const message = `seed failed: ${(e as Error).message}`
        log('error', { job: job.id, error: message })
        await rpc('anizip_job_error', { p_job: job.id, p_owner: owner, p_message: message })
        return { ...summary, state: 'error', error: message }
      }
    }

    const ctx: Ctx = { cfg, fetch: deps.fetch, now, sleep, log, limiter: createLimiter(cfg.minIntervalMs, now, sleep), deadline: started + cfg.timeBudgetMs }
    let stop = false
    while (!stop && summary.fetched < cfg.maxItemsPerTick && now() + cfg.timeoutMs < ctx.deadline) {
      const next = await rpc<{ stop: boolean; completed?: boolean; waiting?: boolean; items: SyncItem[] }>('anizip_next_items', {
        p_job: job.id,
        p_owner: owner,
        p_limit: Math.min(cfg.batchSize, cfg.maxItemsPerTick - summary.fetched),
      })
      if (next.completed) {
        summary.state = 'completed'
        log('completed', { job: job.id, type: job.job_type })
        break
      }
      if (next.stop || !next.items.length) break

      const results = await pool(next.items, cfg.concurrency, (item) => fetchItem(item, ctx))
      summary.fetched += results.length
      const rateLimited = Math.max(0, ...results.map((r) => (r.outcome === 'retry' ? (r.rateLimitedSeconds ?? 0) : 0)))

      for (const chunk of chunkBySize(results, cfg.maxBatchBytes, cfg.batchSize)) {
        const res = await recordChunk(rpc, job.id, owner, chunk, cfg, rateLimited, log)
        summary.imported += res.imported
        summary.updated += res.updated
        summary.unchanged += res.unchanged
        summary.skipped += res.skipped
        summary.failed += res.failed
        summary.episodes += res.episodes
        if (res.stop) stop = true
        if (res.total) log('progress', { job: job.id, processed: res.processed, total: res.total, percent: Math.round((res.processed / res.total) * 1000) / 10 })
      }
      summary.retries += results.filter((r) => r.outcome === 'retry').length
      log('batch completed', {
        job: job.id,
        items: results.length,
        ok: results.filter((r) => r.outcome === 'ok').length,
        skipped: results.filter((r) => r.outcome === 'skipped').length,
        failed: results.filter((r) => r.outcome === 'failed').length,
        retry: results.filter((r) => r.outcome === 'retry').length,
      })
      if (rateLimited > 0) {
        log('rate limited', { job: job.id, pauseSeconds: rateLimited })
        stop = true
      }
    }
  } catch (e) {
    summary.state = 'error'
    summary.error = (e as Error).message
    log('error', { job: job.id, error: summary.error })
  } finally {
    await rpc('anizip_tick_end', { p_job: job.id, p_owner: owner }).catch(() => {})
  }
  log('tick finished', { job: job.id, ms: now() - started, fetched: summary.fetched, imported: summary.imported, updated: summary.updated, failed: summary.failed })
  return summary
}

type RecordResult = { stop: boolean; status?: string; processed: number; total: number; imported: number; updated: number; unchanged: number; skipped: number; failed: number; episodes: number }

/** Stores a chunk; if the whole RPC fails (e.g. payload rejected), falls back to one result per call. */
async function recordChunk(rpc: Rpc, job: number, owner: string, chunk: ItemResult[], cfg: SyncConfig, rateLimited: number, log: Ctx['log']): Promise<RecordResult> {
  const call = (results: ItemResult[]) =>
    rpc<RecordResult>('anizip_record_batch', { p_job: job, p_owner: owner, p_results: results, p_max_attempts: cfg.maxAttempts, p_rate_limited_seconds: rateLimited })
  try {
    return await call(chunk)
  } catch (e) {
    if (chunk.length === 1) {
      log('record failed', { key: chunk[0].key, error: (e as Error).message })
      return call([{ key: chunk[0].key, outcome: 'failed', error: `store failed: ${(e as Error).message}`.slice(0, 300) }])
    }
    const total: RecordResult = { stop: false, processed: 0, total: 0, imported: 0, updated: 0, unchanged: 0, skipped: 0, failed: 0, episodes: 0 }
    for (const one of chunk) {
      const r = await recordChunk(rpc, job, owner, [one], cfg, rateLimited, log)
      for (const k of ['imported', 'updated', 'unchanged', 'skipped', 'failed', 'episodes'] as const) total[k] += r[k]
      total.processed = r.processed
      total.total = r.total
      total.stop ||= r.stop
    }
    return total
  }
}

async function seed(job: SyncJob, fetchFn: typeof fetch, rpc: Rpc, owner: string, cfg: SyncConfig, log: Ctx['log']): Promise<number> {
  let list: unknown
  let lastError = ''
  for (let attempt = 0; attempt < 3 && list === undefined; attempt++) {
    try {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), 60_000)
      const res = await fetchFn(cfg.seedUrl, { signal: ac.signal }).finally(() => clearTimeout(timer))
      if (!res.ok) throw new Error(`mapping list HTTP ${res.status}`)
      list = await res.json()
    } catch (e) {
      lastError = (e as Error).message
    }
  }
  if (list === undefined) throw new Error(lastError || 'mapping list unavailable')
  const items = parseSeedList(list)
  if (!items.length) throw new Error('mapping list is empty')
  let inserted = 0
  for (let i = 0; i < items.length; i += cfg.seedChunk) {
    inserted += await rpc<number>('anizip_seed_items', { p_job: job.id, p_owner: owner, p_items: items.slice(i, i + cfg.seedChunk) })
  }
  const done = await rpc<SyncJob>('anizip_seed_finish', { p_job: job.id, p_owner: owner })
  log('seeded', { job: job.id, listed: items.length, new: inserted, toProcess: done.total })
  return inserted
}

// ─────────────────────────── Supabase REST (no SDK needed) ───────────────────────────
export function createRestRpc(url: string, key: string, fetchFn: typeof fetch = fetch): Rpc {
  // New secret keys (sb_secret_…) go in `apikey` only; legacy service-role JWTs also as Bearer.
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' }
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
  return async <T,>(fn: string, args: Record<string, unknown>) => {
    const res = await fetchFn(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args) })
    const text = await res.text()
    if (!res.ok) throw new Error(`${fn}: HTTP ${res.status} ${text.slice(0, 300)}`)
    return (text ? JSON.parse(text) : null) as T
  }
}

// ─────────────────────────── HTTP entry (Supabase Edge Runtime) ───────────────────────────
declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (req: Request) => Response | Promise<Response>): void } | undefined
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

function serverKey(): string {
  try {
    const keys = JSON.parse(Deno!.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
    if (keys.default) return keys.default
  } catch {
    /* not set or not JSON */
  }
  return Deno!.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

async function storedSecret(url: string, key: string): Promise<string | null> {
  const headers: Record<string, string> = { apikey: key }
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
  const res = await fetch(`${url}/rest/v1/app_secrets?name=eq.cron_secret&select=value`, { headers })
  if (!res.ok) return null
  const rows = (await res.json()) as { value: string }[]
  return rows[0]?.value ?? null
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(async (req) => {
    // Every answer is tagged so the admin panel can show the worker's last answers (net._http_response).
    const reply = (body: Record<string, unknown>, status = 200) => json({ worker: 'anizip-sync', ...body }, status)
    if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
    const url = Deno!.env.get('SUPABASE_URL')!
    const key = serverKey()
    if (!key) return reply({ error: 'No server key (SUPABASE_SECRET_KEYS / SUPABASE_SERVICE_ROLE_KEY) in the function environment' }, 500)
    // Accept the database-generated secret (pg_cron) and, if set, the CRON_SECRET function secret.
    const given = req.headers.get('x-cron-secret')
    const allowed = [Deno!.env.get('CRON_SECRET'), await storedSecret(url, key).catch(() => null)].filter(Boolean)
    if (!given || !allowed.includes(given)) return reply({ error: 'Forbidden (x-cron-secret does not match app_secrets.cron_secret)' }, 403)

    const env = (k: string) => Deno!.env.get(k)
    const config: Partial<SyncConfig> = {}
    if (env('ANIZIP_URL')) config.aniZipUrl = env('ANIZIP_URL')
    if (env('ANIZIP_SEED_URL')) config.seedUrl = env('ANIZIP_SEED_URL')
    if (env('ANIZIP_MAX_ITEMS_PER_TICK')) config.maxItemsPerTick = Number(env('ANIZIP_MAX_ITEMS_PER_TICK'))

    // Wait only for the lease decision, answer with it, and keep working in the background.
    let begun!: (v: Record<string, unknown>) => void
    const first = new Promise<Record<string, unknown>>((r) => (begun = r))
    const work = runTick({
      rpc: createRestRpc(url, key),
      fetch,
      owner: crypto.randomUUID(),
      config,
      onBegin: (job) => begun(job ? { job: job.id, type: job.job_type, phase: job.phase } : { idle: true }),
    })
      .then((s) => (begun({ summary: s }), s))
      .catch((e) => {
        const error = (e as Error).message
        console.error('[ANIZIP SYNC] tick crashed', error)
        begun({ error })
        return null
      })
    const head = await Promise.race([first, new Promise<Record<string, unknown>>((r) => setTimeout(() => r({ pending: true }), 4000))])
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work)
    else await work
    return reply({ accepted: !head.error, ...head }, head.error ? 500 : 202)
  })
}
