const CACHE_NAME = 'purify-v2'
const STATIC_ASSETS = [
  '/purify/',
  '/purify/index.html',
  '/purify/css/style.css',
  '/purify/js/alpine.min.js',
  '/purify/js/store.js',
  '/purify/js/api.js',
  '/purify/js/ws.js',
  '/purify/js/settings.js',
  '/purify/js/app.js',
  '/purify/manifest.json',
  '/purify/icons/icon-192.png',
  '/purify/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (url.pathname.startsWith('/purify/api/') || url.pathname === '/purify/ws') {
    event.respondWith(
      fetch(event.request).catch(() => new Response('{"error":"offline"}', {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }))
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
})
