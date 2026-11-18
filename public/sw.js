/**
 * Protutech CS2 Stratbook - Service Worker
 * Immediate mobile PWA updates & strict network-only / no-store for API and Socket.IO.
 */

const CACHE_NAME = 'cs2-stratbook-app-v2'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.png',
  '/logo.png'
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('SW pre-cache error (non-fatal):', err)
      })
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Ignore non-HTTP(S) schemes (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) {
    return
  }

  // 1. Never intercept Socket.IO transport or non-GET mutations (POST/PUT/DELETE/etc.)
  if (
    url.pathname === '/socket.io' ||
    url.pathname.startsWith('/socket.io/') ||
    event.request.method !== 'GET'
  ) {
    return
  }

  // 2. Never serve or store cache for API endpoints (always bypass browser & SW cache)
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }))
    return
  }

  // 3. Always fetch service worker script directly without caching
  if (url.pathname === '/sw.js') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }))
    return
  }

  // Ignore cross-origin requests so external links/CDNs aren't unexpectedly cached
  if (url.origin !== self.location.origin) {
    return
  }

  // 4. Network-first with cache fallback for HTML navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(async () => {
          const cachedIndex = await caches.match('/index.html')
          if (cachedIndex) return cachedIndex
          return caches.match(event.request)
        })
    )
    return
  }

  // 5. Stale-while-revalidate for static same-origin assets (js, css, images, fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return networkResponse
        })
        .catch(() => cachedResponse)

      return cachedResponse || fetchPromise
    })
  )
})
