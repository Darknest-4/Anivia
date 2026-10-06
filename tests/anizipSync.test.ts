// @vitest-environment node
// AniZip sync: the worker (supabase/functions/anizip-sync) against the real SQL (migration 0008) on PGlite.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { normalizeAniZip, parseSeedList, runTick, type Rpc, type SyncConfig } from '../supabase/functions/anizip-sync/index'

const MIGRATION = readFileSync(new URL('../supabase/migrations/0008_anivia_anizip_sync.sql', import.meta.url), 'utf8')

// Minimal stand-ins for what earlier migrations / Supabase provide.
const STUBS = `
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
  end $$;
  create table public.feature_flags (key text primary key, enabled boolean not null default false, description text not null default '');
  create table public.app_secrets (name text primary key, value text not null);
  insert into public.app_secrets values ('cron_secret', 'test');
  create function public.has_permission(p text) returns boolean language sql stable as $$ select coalesce(current_setting('test.admin', true), '') = 'on' $$;
`

let db: PGlite

async function freshDb() {
  db = new PGlite()
  await db.exec(STUBS)
  await db.exec(MIGRATION)
}

const rpc: Rpc = async <T,>(fn: string, args: Record<string, unknown>) => {
  const names = Object.keys(args)
  const params = names.map((k) => {
    const v = args[k]
    return v !== null && typeof v === 'object' ? JSON.stringify(v) : v
  })
  const sql = `select public.${fn}(${names.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`
  const res = await db.query<{ r: T }>(sql, params)
  return res.rows[0]?.r as T
}

const q = async <T = Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows

// ─────────────── fixtures ───────────────
function aniZip(anidb: number, anilist: number | null, opts: { title?: string; episodes?: number; extra?: Record<string, unknown> } = {}) {
  const episodes: Record<string, unknown> = {}
  for (let n = 1; n <= (opts.episodes ?? 2); n++)
    episodes[String(n)] = {
      episode: String(n), episodeNumber: n, absoluteEpisodeNumber: n, seasonNumber: 1, anidbEid: anidb * 100 + n, tvdbId: 9000 + n,
      title: { en: `Episode ${n}`, 'x-jat': `Dai ${n} wa`, ja: null },
      airDate: `2024-01-0${Math.min(n, 9)}`, airDateUtc: `2024-01-0${Math.min(n, 9)}T15:00:00Z`, runtime: 24, length: 24,
      overview: `Overview ${n}`, summary: `Summary ${n}`, image: `https://artworks.thetvdb.com/${n}.jpg`, rating: '7.5', finaleType: n === 2 ? 'season' : undefined,
    }
  episodes.S1 = { episode: 'S1', episodeNumber: 1, title: { en: 'Special' }, airdate: '2024-03-01', length: 10 }
  return {
    titles: { en: opts.title ?? `Show ${anidb}`, 'x-jat': `Shou ${anidb}`, ja: 'ショー' },
    episodes,
    episodeCount: opts.episodes ?? 2,
    specialCount: 1,
    images: [{ coverType: 'Fanart', url: `https://artworks.thetvdb.com/fanart/${anidb}.jpg` }],
    mappings: { animeplanet_id: `show-${anidb}`, kitsu_id: anidb + 1, mal_id: anidb + 2, type: 'TV', anilist_id: anilist, anisearch_id: 5, anidb_id: anidb, notifymoe_id: 'abc', livechart_id: 77, thetvdb_id: 123, imdb_id: 'tt0001', themoviedb_id: 456 },
    ...opts.extra,
  }
}

type Responder = (url: string, call: number) => Response | Promise<Response>
function fakeFetch(routes: Record<string, Responder | unknown>) {
  const calls: string[] = []
  const count = new Map<string, number>()
  const fn = (async (input: RequestInfo | URL) => {
    const url = String(input)
    calls.push(url)
    const key = Object.keys(routes).find((k) => url.includes(k))
    if (!key) return new Response('{"error":"not found"}', { status: 404 })
    const n = (count.get(key) ?? 0) + 1
    count.set(key, n)
    const r = routes[key]
    return typeof r === 'function' ? (r as Responder)(url, n) : Response.json(r)
  }) as typeof fetch
  return Object.assign(fn, { calls })
}

const SEED = [
  { anidb_id: 1, anilist_id: 101, mal_id: 3 },
  { anidb_id: 2, anilist_id: 102, mal_id: 4 },
  { anilist_id: 103, mal_id: 999 }, // AniList-only entry
]

const fast: Partial<SyncConfig> = { minIntervalMs: 0, timeBudgetMs: 60_000, timeoutMs: 1000, seedUrl: 'https://seed.test/list.json', aniZipUrl: 'https://api.ani.zip' }
const deps = (fetch: typeof globalThis.fetch, extra: Partial<SyncConfig> = {}, owner = 'w1') => ({
  rpc,
  fetch,
  owner,
  sleep: async () => {},
  log: () => {},
  config: { ...fast, ...extra },
})

async function job() {
  return (await q<{ id: number; status: string; phase: string; imported: number; updated: number; unchanged: number; skipped: number; failed: number; retry_count: number; total: number; processed: number; lease_owner: string | null; errors: unknown[]; job_type: string }>(
    `select * from sync_jobs order by id desc limit 1`,
  ))[0]
}

beforeEach(freshDb)

describe('normalizeAniZip', () => {
  it('maps ids, titles and episode fields without inventing data', async () => {
    const n = await normalizeAniZip(aniZip(1, 101))
    expect(n.ok).toBe(true)
    if (!n.ok) return
    expect(n.anime).toMatchObject({ anidb_id: 1, anilist_id: 101, mal_id: 3, kitsu_id: 2, animeplanet_id: 'show-1', tvdb_id: 123, imdb_id: 'tt0001', tmdb_id: '456', type: 'TV' })
    expect(n.anime.titles).toEqual({ en: 'Show 1', 'x-jat': 'Shou 1', ja: 'ショー' })
    const ep1 = n.anime.episodes.find((e) => e.episode_key === '1')!
    expect(ep1).toMatchObject({ kind: 'regular', episode_number: 1, absolute_episode_number: 1, season_number: 1, air_date: '2024-01-01', air_date_utc: '2024-01-01T15:00:00.000Z', runtime: 24, rating: 7.5, anidb_eid: 101, finale_type: null })
    expect(ep1.titles).toEqual({ en: 'Episode 1', 'x-jat': 'Dai 1 wa' }) // null titles dropped
    const special = n.anime.episodes.find((e) => e.episode_key === 'S1')!
    expect(special).toMatchObject({ kind: 'special', air_date: '2024-03-01', air_date_utc: null, runtime: null, length: 10, overview: null })
  })

  it('rejects invalid shapes and reports empty answers', async () => {
    expect(await normalizeAniZip('nope')).toMatchObject({ ok: false, kind: 'invalid' })
    expect(await normalizeAniZip({ episodes: [] })).toMatchObject({ ok: false, kind: 'invalid' })
    expect(await normalizeAniZip({})).toMatchObject({ ok: false, kind: 'empty' })
  })

  it('drops values Postgres would reject', async () => {
    const n = await normalizeAniZip(aniZip(1, 101, { extra: { episodeCount: 99999999999 } }))
    expect(n.ok && n.anime.episode_count).toBe(null)
  })

  it('builds one work item per title, preferring AniDB ids', () => {
    const items = parseSeedList([...SEED, { anidb_id: 1, anilist_id: 101 }, { foo: 1 }])
    expect(items.map((i) => i.key)).toEqual(['anidb:1', 'anidb:2', 'anilist:103'])
  })
})

describe('AniZip sync worker', () => {
  const routes = () => ({
    'seed.test': SEED,
    'anidb_id=1': aniZip(1, 101, { title: 'One' }),
    'anidb_id=2': aniZip(2, 102, { title: 'Two', episodes: 3 }),
    'anilist_id=103': aniZip(3, 103, { title: 'Three' }),
  })

  it('1. imports new anime and their episodes, then completes', async () => {
    const f = fakeFetch(routes())
    const s = await runTick(deps(f))
    expect(s.state).toBe('completed')
    expect(await q(`select anidb_id, anilist_id, titles->>'en' as en from anizip_anime order by anidb_id`)).toEqual([
      { anidb_id: 1, anilist_id: 101, en: 'One' },
      { anidb_id: 2, anilist_id: 102, en: 'Two' },
      { anidb_id: 3, anilist_id: 103, en: 'Three' },
    ])
    expect((await q<{ n: number }>(`select count(*)::int as n from anizip_episodes`))[0].n).toBe(3 + 4 + 3)
    expect(await job()).toMatchObject({ status: 'COMPLETED', imported: 3, processed: 3, total: 3, failed: 0 })
    expect((await q<{ n: number }>(`select count(*)::int as n from anizip_sync_items where status = 'done'`))[0].n).toBe(3)
  })

  it('2. updates an existing anime instead of creating a new one', async () => {
    await runTick(deps(fakeFetch(routes())))
    const r = { ...routes(), 'anidb_id=1': aniZip(1, 101, { title: 'One (renamed)' }) }
    await rpc('admin_anizip_sync_action', { p_action: 'x' }).catch(() => {}) // unauthorised call is rejected
    await db.exec(`update anizip_sync_items set status = 'pending' where key = 'anidb:1'; insert into sync_jobs (job_type, phase) values ('anizip_incremental', 'fetch');`)
    await runTick(deps(fakeFetch(r)))
    expect(await q(`select count(*)::int as n from anizip_anime where anidb_id = 1`)).toEqual([{ n: 1 }])
    expect(await q(`select titles->>'en' as en from anizip_anime where anidb_id = 1`)).toEqual([{ en: 'One (renamed)' }])
    expect(await job()).toMatchObject({ job_type: 'anizip_incremental', status: 'COMPLETED', updated: 1, imported: 0 })
  })

  it('3. adds new episodes to an existing anime and removes vanished ones', async () => {
    await runTick(deps(fakeFetch(routes())))
    const r = { ...routes(), 'anidb_id=2': aniZip(2, 102, { title: 'Two', episodes: 5, extra: {} }) }
    await db.exec(`update anizip_sync_items set status = 'pending' where key = 'anidb:2'; insert into sync_jobs (job_type, phase) values ('anizip_incremental', 'fetch');`)
    const s = await runTick(deps(fakeFetch(r)))
    expect(s.episodes).toBe(2)
    expect(await q(`select episode_key from anizip_episodes e join anizip_anime a on a.id = e.anime_id where a.anidb_id = 2 order by episode_key`)).toEqual(
      ['1', '2', '3', '4', '5', 'S1'].map((episode_key) => ({ episode_key })),
    )
  })

  it('4. duplicate protection: re-recording and AniList-only items never create duplicates', async () => {
    // The AniList-only item resolves to AniDB 1 on ani.zip → same anime row.
    const r = { ...routes(), 'anilist_id=103': aniZip(1, 101, { title: 'One' }) }
    await runTick(deps(fakeFetch(r)))
    expect(await q(`select count(*)::int as n from anizip_anime`)).toEqual([{ n: 2 }])
    // Recording the same batch twice is a no-op ("unchanged").
    const n = await normalizeAniZip(aniZip(2, 102, { title: 'Two', episodes: 3 }))
    await db.exec(`insert into sync_jobs (job_type, phase, status, lease_owner, lease_until) values ('anizip_incremental', 'fetch', 'RUNNING', 'w9', now() + interval '1 minute')`)
    const id = (await job()).id
    const batch = [{ key: 'anidb:2', outcome: 'ok', anime: n.ok && n.anime }]
    await rpc('anizip_record_batch', { p_job: id, p_owner: 'w9', p_results: batch })
    await rpc('anizip_record_batch', { p_job: id, p_owner: 'w9', p_results: batch })
    expect(await q(`select count(*)::int as n from anizip_anime where anidb_id = 2`)).toEqual([{ n: 1 }])
    expect(await q(`select count(*)::int as n from anizip_episodes e join anizip_anime a on a.id = e.anime_id where a.anidb_id = 2`)).toEqual([{ n: 4 }])
    expect(await job()).toMatchObject({ unchanged: 2, imported: 0 })
    // Constraints themselves.
    await expect(db.exec(`insert into anizip_anime (anidb_id, source_hash) values (2, 'x')`)).rejects.toThrow(/duplicate key/)
    await expect(db.exec(`insert into anizip_anime (anilist_id, source_hash) values (102, 'x')`)).rejects.toThrow(/duplicate key/)
  })

  it('5. retries after HTTP 429 (honours Retry-After)', async () => {
    const waits: number[] = []
    const r = { ...routes(), 'anidb_id=1': (_: string, n: number) => (n === 1 ? new Response('', { status: 429, headers: { 'retry-after': '2' } }) : Response.json(aniZip(1, 101))) }
    const s = await runTick({ ...deps(fakeFetch(r)), sleep: async (ms: number) => void waits.push(ms) })
    expect(s.state).toBe('completed')
    expect(waits).toContain(2000)
    expect((await q(`select status from anizip_sync_items where key = 'anidb:1'`))[0]).toEqual({ status: 'done' })
  })

  it('5b. a long Retry-After pauses the job and keeps the item queued', async () => {
    const r = { ...routes(), 'anidb_id=1': () => new Response('', { status: 429, headers: { 'retry-after': '120' } }) }
    await runTick(deps(fakeFetch(r)))
    const item = (await q<{ status: string; attempts: number }>(`select status, attempts from anizip_sync_items where key = 'anidb:1'`))[0]
    expect(item).toEqual({ status: 'pending', attempts: 1 })
    expect((await q<{ limited: boolean }>(`select rate_limited_until > now() as limited from sync_jobs`))[0].limited).toBe(true)
    expect(await runTick(deps(fakeFetch(routes())))).toMatchObject({ state: 'idle' }) // respects the pause
  })

  it('6. retries HTTP 500 with backoff, and requeues after repeated failures', async () => {
    const waits: number[] = []
    const r = { ...routes(), 'anidb_id=1': (_: string, n: number) => (n <= 2 ? new Response('oops', { status: 500 }) : Response.json(aniZip(1, 101))) }
    const s = await runTick({ ...deps(fakeFetch(r)), sleep: async (ms: number) => void waits.push(ms) })
    expect(s.state).toBe('completed')
    expect(waits.filter((w) => w >= 1000).length).toBe(2) // 1 s, 2 s (+ jitter)
    // Always failing → item gets a later retry slot, the rest still completes.
    await freshDb()
    const always = { ...routes(), 'anidb_id=2': () => new Response('down', { status: 503 }) }
    await runTick(deps(fakeFetch(always)))
    const item = (await q<{ status: string; attempts: number; later: boolean; last_error: string }>(`select status, attempts, next_attempt_at > now() as later, last_error from anizip_sync_items where key = 'anidb:2'`))[0]
    expect(item).toEqual({ status: 'pending', attempts: 1, later: true, last_error: 'HTTP 503' })
    expect((await q(`select count(*)::int as n from anizip_anime`))[0]).toEqual({ n: 2 })
  })

  it('7. an invalid response fails only that title', async () => {
    const r = { ...routes(), 'anidb_id=2': () => new Response('<html>bad gateway page</html>', { status: 200 }) }
    const s = await runTick(deps(fakeFetch(r)))
    expect(s.state).toBe('completed')
    expect((await q(`select status, last_error from anizip_sync_items where key = 'anidb:2'`))[0]).toEqual({ status: 'failed', last_error: 'invalid response: not JSON' })
    expect(await job()).toMatchObject({ status: 'COMPLETED', imported: 2, failed: 1 })
    expect((await job()).errors).toHaveLength(1)
  })

  it('7b. a record Postgres rejects is isolated (the rest of the batch is stored)', async () => {
    await runTick(deps(fakeFetch({ 'seed.test': SEED }), { maxItemsPerTick: 0 })) // seed only
    const good = await normalizeAniZip(aniZip(1, 101))
    const bad = await normalizeAniZip(aniZip(2, 102))
    if (!good.ok || !bad.ok) throw new Error('fixture')
    ;(bad.anime.episodes[0] as unknown as Record<string, unknown>).air_date = 'not-a-date'
    await db.exec(`update sync_jobs set status = 'RUNNING', lease_owner = 'w9', lease_until = now() + interval '1 minute'`)
    const res = await rpc<{ imported: number; failed: number }>('anizip_record_batch', { p_job: (await job()).id, p_owner: 'w9', p_results: [{ key: 'anidb:1', outcome: 'ok', anime: good.anime }, { key: 'anidb:2', outcome: 'ok', anime: bad.anime }] })
    expect(res).toMatchObject({ imported: 1, failed: 1 })
    expect(await q(`select count(*)::int as n from anizip_anime`)).toEqual([{ n: 1 }])
    expect((await q<{ last_error: string }>(`select last_error from anizip_sync_items where key = 'anidb:2'`))[0].last_error).toMatch(/^db: /)
  })

  it('8. resumes from saved progress without refetching finished titles', async () => {
    const f1 = fakeFetch(routes())
    const s1 = await runTick(deps(f1, { maxItemsPerTick: 1, batchSize: 1 }))
    expect(s1).toMatchObject({ state: 'worked', fetched: 1 })
    expect(await job()).toMatchObject({ status: 'RUNNING', processed: 1, lease_owner: null })
    const f2 = fakeFetch(routes())
    const s2 = await runTick(deps(f2))
    expect(s2.state).toBe('completed')
    expect(f2.calls.some((u) => u.includes('anidb_id=1'))).toBe(false) // done in tick 1
    expect(f2.calls.some((u) => u.includes('seed.test'))).toBe(false) // seed not repeated
    expect(await job()).toMatchObject({ status: 'COMPLETED', processed: 3 })
  })

  it('9. continues after an interrupted worker once its lease expires', async () => {
    await runTick(deps(fakeFetch(routes()), { maxItemsPerTick: 1, batchSize: 1 }))
    // A worker took the lease and crashed mid-tick.
    await db.exec(`update sync_jobs set lease_owner = 'crashed', lease_until = now() + interval '2 minutes'`)
    expect(await runTick(deps(fakeFetch(routes())))).toMatchObject({ state: 'idle' }) // still leased
    await db.exec(`update sync_jobs set lease_until = now() - interval '1 second'`) // lease expired
    expect(await runTick(deps(fakeFetch(routes())))).toMatchObject({ state: 'completed' })
    expect(await q(`select count(*)::int as n from anizip_anime`)).toEqual([{ n: 3 }])
  })

  it('10. a completed initial sync is not started again; incremental runs only when due', async () => {
    await runTick(deps(fakeFetch(routes())))
    const f = fakeFetch(routes())
    expect(await runTick(deps(f))).toMatchObject({ state: 'idle' })
    expect(f.calls).toHaveLength(0)
    expect(await q(`select count(*)::int as n from sync_jobs`)).toEqual([{ n: 1 }])
    // A day later: incremental job (re-seeds new titles, re-checks recent/airing ones).
    await db.exec(`update sync_jobs set completed_at = now() - interval '25 hours'`)
    const s = await runTick(deps(fakeFetch({ ...routes(), 'seed.test': [...SEED, { anidb_id: 4, anilist_id: 104 }], 'anidb_id=4': aniZip(4, 104) })))
    expect(s.state).toBe('completed')
    expect(await job()).toMatchObject({ job_type: 'anizip_incremental', imported: 1 })
    expect(await q(`select count(*)::int as n from sync_jobs where job_type = 'anizip_full'`)).toEqual([{ n: 1 }])
  })

  it('11. concurrent workers: only one holds the lease, the other backs off', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const slow = { ...routes(), 'anidb_id=1': async () => (await gate, Response.json(aniZip(1, 101))) }
    const a = runTick(deps(fakeFetch(slow), {}, 'worker-a'))
    await new Promise((r) => setTimeout(r, 50))
    const b = await runTick(deps(fakeFetch(routes()), {}, 'worker-b'))
    expect(b).toMatchObject({ state: 'idle', fetched: 0 })
    release()
    expect(await a).toMatchObject({ state: 'completed' })
    // A worker that lost its lease cannot write.
    await db.exec(`insert into sync_jobs (job_type, phase, status, lease_owner, lease_until) values ('anizip_incremental', 'fetch', 'RUNNING', 'owner', now() + interval '1 minute')`)
    const res = await rpc('anizip_record_batch', { p_job: (await job()).id, p_owner: 'intruder', p_results: [{ key: 'anidb:1', outcome: 'failed', error: 'x' }] })
    expect(res).toMatchObject({ stop: true, reason: 'lease_lost' })
    expect((await q(`select status from anizip_sync_items where key = 'anidb:1'`))[0]).toEqual({ status: 'done' })
    // Two unfinished jobs can't exist at once.
    await expect(db.exec(`insert into sync_jobs (job_type) values ('anizip_full')`)).rejects.toThrow(/duplicate key/)
  })

  it('12. the site reads imported data while the sync keeps running; ticks stay within the time budget', async () => {
    let t = 0
    const clock = { now: () => t, sleep: async (ms: number) => void (t += ms) }
    const slowRoutes = { ...routes(), 'anidb_id=2': async () => ((t += 30_000), Response.json(aniZip(2, 102))) }
    const s = await runTick({ ...deps(fakeFetch(slowRoutes), { timeBudgetMs: 20_000, batchSize: 1 }), ...clock })
    expect(s.state).toBe('worked') // stopped by the budget, job still RUNNING
    expect(await job()).toMatchObject({ status: 'RUNNING' })
    // Meanwhile the public read already serves what is imported.
    const one = await rpc<{ anidb_id: number; episodes: { key: string; titles: Record<string, string> }[] }>('anizip_for_anilist', { p_anilist_id: 101 })
    expect(one.anidb_id).toBe(1)
    expect(one.episodes.map((e) => e.key)).toEqual(['1', '2']) // regular episodes only
    expect(await rpc('anizip_for_anilist', { p_anilist_id: 103 })).toBe(null) // not imported yet
  })

  it('admin: status/actions need the cache.manage permission; pause/resume/retry work', async () => {
    await expect(rpc('admin_anizip_sync_status', {})).rejects.toThrow(/Not allowed/)
    await db.exec(`set test.admin = 'on'`)
    await runTick(deps(fakeFetch({ ...routes(), 'anidb_id=2': () => new Response('x', { status: 400 }) }), { maxItemsPerTick: 1, batchSize: 1 }))
    let st = await rpc<{ job: { status: string }; items: { total: number; pending: number } }>('admin_anizip_sync_status', {})
    expect(st).toMatchObject({ job: { status: 'RUNNING' }, items: { total: 3, pending: 2 } })
    st = await rpc('admin_anizip_sync_action', { p_action: 'pause' })
    expect(st.job.status).toBe('PAUSED')
    expect(await runTick(deps(fakeFetch(routes())))).toMatchObject({ state: 'idle' })
    await expect(rpc('admin_anizip_sync_action', { p_action: 'start' })).rejects.toThrow(/already in progress/)
    await rpc('admin_anizip_sync_action', { p_action: 'resume' })
    await runTick(deps(fakeFetch({ ...routes(), 'anidb_id=2': () => new Response('x', { status: 400 }) })))
    expect(await q(`select status from anizip_sync_items where key = 'anidb:2'`)).toEqual([{ status: 'failed' }])
    st = await rpc('admin_anizip_sync_action', { p_action: 'retry' })
    expect(st).toMatchObject({ items: { pending: 1 } })
    expect(await runTick(deps(fakeFetch(routes())))).toMatchObject({ state: 'completed' })
    expect(await q(`select count(*)::int as n from anizip_anime`)).toEqual([{ n: 3 }])
  })

  it('feature flag off → the worker does nothing', async () => {
    await db.exec(`update feature_flags set enabled = false where key = 'anizip_sync'`)
    const f = fakeFetch(routes())
    expect(await runTick(deps(f))).toMatchObject({ state: 'idle' })
    expect(f.calls).toHaveLength(0)
  })

  it('a broken mapping list marks the job FAILED after 5 attempts, without touching data', async () => {
    for (let i = 0; i < 5; i++) await runTick(deps(fakeFetch({ 'seed.test': () => new Response('x', { status: 500 }) })))
    expect(await job()).toMatchObject({ status: 'FAILED', retry_count: 5 })
    expect(await runTick(deps(fakeFetch(routes())))).toMatchObject({ state: 'idle' }) // waits an hour before a new attempt
  })
})
