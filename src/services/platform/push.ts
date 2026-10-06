import { config } from '@/config'
import { getSupabase } from '@/providers/AuthProvider'

/** Web push for new episodes (send-push Edge Function + push_subscriptions table). */
export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function publicKey(): Promise<string> {
  const res = await fetch(`${config.supabaseUrl}/functions/v1/send-push?vapid`, { headers: { apikey: config.supabaseKey } }).catch(() => null)
  const key = res?.ok ? ((await res.json()) as { publicKey?: string }).publicKey : ''
  if (!key) throw new Error('Push notifications aren’t set up on the server yet.')
  return key
}

export async function currentSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser does not support push notifications.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications are blocked — allow them for this site in your browser settings.')
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
  await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(await publicKey()) }))
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const client = await getSupabase()
  const { data: s } = await client.auth.getSession()
  if (!s.session) throw new Error('Please sign in first.')
  const { error } = await client.from('push_subscriptions').upsert({ user_id: s.session.user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: 'endpoint' })
  if (error) throw new Error(/does not exist|schema cache/.test(error.message) ? 'Run supabase/migrations/0006_anivia_community.sql first.' : error.message)
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return
  const client = await getSupabase()
  await client.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
