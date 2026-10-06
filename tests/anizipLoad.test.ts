// @vitest-environment node
// Load test with the real mapping list (~40k entries) — run with:
//   curl -o /tmp/fribb.json https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json
//   FRIBB=/tmp/fribb.json npx vitest run tests/anizipLoad.test.ts
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { normalizeAniZip, parseSeedList, runTick, type Rpc } from '../supabase/functions/anizip-sync/index'
const LIST = process.env.FRIBB!
it.skipIf(!process.env.FRIBB)('seeds the full list and stores a 1,100-episode title within budget', async () => {
  const db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table public.feature_flags (key text primary key, enabled boolean not null default false, description text not null default '');
    create table public.app_secrets (name text primary key, value text not null);
    create function public.has_permission(p text) returns boolean language sql stable as $$ select true $$;`)
  await db.exec(readFileSync('supabase/migrations/0008_anivia_anizip_sync.sql', 'utf8'))
  const rpc: Rpc = async (fn, args) => { const n = Object.keys(args); const r = await db.query<{ r: unknown }>(`select public.${fn}(${n.map((k, i) => `${k} => $${i + 1}`).join(',')}) as r`, n.map((k) => { const v = args[k]; return v !== null && typeof v === 'object' ? JSON.stringify(v) : v })); return r.rows[0]?.r as never }
  const raw = readFileSync(LIST, 'utf8')
  let t = performance.now(); const items = parseSeedList(JSON.parse(raw)); console.log('parse+keys ms', Math.round(performance.now() - t), 'items', items.length)
  const big = { titles: { en: 'One Piece' }, mappings: { anidb_id: 69, anilist_id: 21, mal_id: 21 }, episodes: Object.fromEntries(Array.from({ length: 1100 }, (_, i) => [String(i + 1), { episodeNumber: i + 1, title: { en: `Episode ${i + 1} title text`, 'x-jat': `Dai ${i + 1} wa` }, airDateUtc: '2020-01-01T00:00:00Z', airDate: '2020-01-01', runtime: 24, overview: 'x'.repeat(400), image: 'https://artworks.thetvdb.com/a.jpg', anidbEid: i + 1 }])) }
  t = performance.now(); const n = await normalizeAniZip(big); console.log('normalize OP ms', Math.round(performance.now() - t), 'json bytes', JSON.stringify(n).length)
  const fetchFn = (async (u: string) => {
    if (String(u).includes('seed')) return new Response(raw)
    const id = Number(String(u).split('=')[1])
    return Response.json(id === 69 ? big : { titles: { en: 'T' + id }, mappings: { anidb_id: String(u).includes('anidb') ? id : null, anilist_id: String(u).includes('anilist') ? id : null }, episodes: { '1': { title: { en: 'a' } }, '2': { title: { en: 'b' } } } })
  }) as typeof fetch
  t = performance.now()
  const s = await runTick({ rpc, fetch: fetchFn, owner: 'w', sleep: async () => {}, log: (e, d) => e !== 'progress' && e !== 'batch completed' && console.log(e, JSON.stringify(d)), config: { seedUrl: 'https://seed', minIntervalMs: 0, maxItemsPerTick: 120 } })
  console.log('tick ms', Math.round(performance.now() - t), JSON.stringify(s))
  const c = await db.query(`select (select count(*) from anizip_sync_items)::int items, (select count(*) from anizip_anime)::int anime, (select count(*) from anizip_episodes)::int eps`)
  console.log(c.rows[0])
  expect(s.fetched).toBe(120)
  expect(c.rows[0]).toMatchObject({ items: items.length, anime: 120 })
  // The biggest title goes through the same RPC in one piece.
  await db.exec(`update sync_jobs set lease_owner = 'w', lease_until = now() + interval '1 minute'`)
  t = performance.now()
  const r = await rpc<{ imported: number; episodes: number }>('anizip_record_batch', { p_job: 1, p_owner: 'w', p_results: [{ key: 'anidb:69', outcome: 'ok', anime: n.ok && n.anime }] })
  console.log('store OP ms', Math.round(performance.now() - t))
  expect(r).toMatchObject({ imported: 1, episodes: 1100 })
}, 600_000)
