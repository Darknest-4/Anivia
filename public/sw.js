/* ANIVIA service worker — offline app shell + image cache. Data caching is handled by the app. */
const VERSION = 'anivia-v1'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const IMAGES = `${VERSION}-images`
const MAX_IMAGES = 300

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/manifest.webmanifest', '/favicon.svg'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Never cache API, auth or data requests.
  if (url.pathname.startsWith('/api/') || url.hostname.endsWith('supabase.co') || url.hostname.includes('anilist.co') && url.pathname.startsWith('/graphql')) return

  // Navigations: network first, offline fallback to the cached app shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL).then((c) => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Hashed build assets: cache first (they never change).
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) caches.open(ASSETS).then((c) => c.put(request, res.clone()))
            return res
          }),
      ),
    )
    return
  }

  // Poster / banner images: stale-while-revalidate with a size cap.
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGES).then(async (cache) => {
        const hit = await cache.match(request)
        const network = fetch(request)
          .then((res) => {
            if (res.ok || res.type === 'opaque') {
              cache.put(request, res.clone())
              trim(IMAGES, MAX_IMAGES)
            }
            return res
          })
          .catch(() => hit)
        return hit || network
      }),
    )
  }
})
