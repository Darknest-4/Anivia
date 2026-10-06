// ANIVIA — web push for new episodes.
//
//  GET  /send-push?vapid  → { publicKey }   (the browser needs it to subscribe)
//  POST /send-push        → checks AniList for episodes that aired recently and notifies everyone
//                           who has the title as Watching / Plan to watch and a push subscription.
//                           Call it every ~30 minutes (GitHub Actions workflow "push-cron").
//
// No manual keys needed: on first use the function generates a VAPID key pair and keeps it in the
// server-only `app_secrets` table (migration 0007), which also holds the cron secret and schedules
// this function with pg_cron. Optional overrides (Edge Function secrets): VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET.
// Deploy: supabase functions deploy send-push --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

/** Server key: the new `SUPABASE_SECRET_KEYS` ("default" entry), falling back to the legacy service role key. */
function serverKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
    if (keys.default) return keys.default
  } catch {
    /* not set or not JSON */
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const SITE = Deno.env.get('SITE_URL') ?? 'https://anivia.animehub.hu'
const AIRING = `query ($from: Int, $to: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    airingSchedules(airingAt_greater: $from, airingAt_lesser: $to) {
      episode airingAt media { id isAdult title { english romaji } coverImage { large } }
    }
  }
}`

type Airing = { episode: number; airingAt: number; media: { id: number; isAdult: boolean; title: { english: string | null; romaji: string | null }; coverImage: { large: string | null } } }

async function airedSince(seconds: number): Promise<Airing[]> {
  const now = Math.floor(Date.now() / 1000)
  const out: Airing[] = []
  for (let page = 1; page <= 4; page++) {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: AIRING, variables: { from: now - seconds, to: now, page } }),
    })
    if (!res.ok) break
    const data = (await res.json()).data?.Page
    out.push(...((data?.airingSchedules ?? []) as Airing[]).filter((a) => !a.media.isAdult))
    if (!data?.pageInfo?.hasNextPage) break
  }
  return out
}

const db = createClient(Deno.env.get('SUPABASE_URL')!, serverKey(), { auth: { persistSession: false } })

async function stored(name: string): Promise<string | null> {
  const { data } = await db.from('app_secrets').select('value').eq('name', name).maybeSingle()
  return (data?.value as string | undefined) ?? null
}

/** VAPID keys: function secrets if set, otherwise a pair generated once and kept in app_secrets. */
async function vapidKeys(): Promise<{ publicKey: string; privateKey: string } | null> {
  const envPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const envPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  if (envPublic && envPrivate) return { publicKey: envPublic, privateKey: envPrivate }
  let publicKey = await stored('vapid_public')
  let privateKey = await stored('vapid_private')
  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys()
    // ignoreDuplicates: if two requests race, the first pair wins and both re-read it below.
    const { error } = await db.from('app_secrets').upsert(
      [
        { name: 'vapid_public', value: keys.publicKey },
        { name: 'vapid_private', value: keys.privateKey },
      ],
      { onConflict: 'name', ignoreDuplicates: true },
    )
    if (error) return null // migration 0007 not run yet
    publicKey = await stored('vapid_public')
    privateKey = await stored('vapid_private')
  }
  return publicKey && privateKey ? { publicKey, privateKey } : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const url = new URL(req.url)
  if (req.method === 'GET' && url.searchParams.has('vapid')) {
    const keys = await vapidKeys()
    return json({ publicKey: keys?.publicKey ?? '' })
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const secret = Deno.env.get('CRON_SECRET') ?? (await stored('cron_secret'))
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'Forbidden' }, 403)
  const keys = await vapidKeys()
  if (!keys) return json({ error: 'VAPID keys unavailable — run migration 0007' }, 500)
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@animehub.hu', keys.publicKey, keys.privateKey)
  const { data: flag } = await db.from('feature_flags').select('enabled').eq('key', 'push_notifications').maybeSingle()
  if (flag && !flag.enabled) return json({ skipped: 'push_notifications flag is off' })

  const aired = await airedSince(2 * 3600)
  if (!aired.length) return json({ aired: 0, sent: 0 })
  const byAnime = new Map(aired.map((a) => [String(a.media.id), a]))

  // Everyone with a subscription, and their watchlists.
  const { data: subs } = await db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth')
  if (!subs?.length) return json({ aired: aired.length, sent: 0 })
  const users = [...new Set(subs.map((s) => s.user_id))]
  const { data: libs } = await db.from('user_library').select('user_id, watchlist').in('user_id', users)

  let sent = 0
  let removed = 0
  for (const lib of libs ?? []) {
    const list = (lib.watchlist ?? []) as { animeId: string; status: string }[]
    for (const item of list) {
      const a = byAnime.get(item.animeId)
      if (!a || (item.status !== 'watching' && item.status !== 'planning')) continue
      // Once per user + episode.
      const { error: dup } = await db.from('push_sent').insert({ user_id: lib.user_id, anime_id: item.animeId, episode: a.episode })
      if (dup) continue
      const title = a.media.title.english ?? a.media.title.romaji ?? 'New episode'
      const payload = JSON.stringify({
        title: `${title} — Episode ${a.episode}`,
        body: 'A new episode is out. Tap to see where to watch.',
        icon: a.media.coverImage.large ?? `${SITE}/icon-192.png`,
        url: `${SITE}/anime/${item.animeId}/watch?ep=${a.episode}`,
        tag: `ep-${item.animeId}-${a.episode}`,
      })
      for (const s of subs.filter((x) => x.user_id === lib.user_id)) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600 })
          sent++
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) {
            await db.from('push_subscriptions').delete().eq('id', s.id)
            removed++
          }
        }
      }
    }
  }
  // Keep the dedupe table small.
  await db.from('push_sent').delete().lt('sent_at', new Date(Date.now() - 30 * 86400_000).toISOString())
  return json({ aired: aired.length, sent, removed })
})
