const CACHE_NAME = 'elira-v1'
const RUNTIME_CACHE = 'elira-runtime-v1'
const API_CACHE = 'elira-api-v1'

// Assets to cache on install (app shell)
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
]

// Install event - cache app shell and static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell')
      return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
        console.warn('[Service Worker] Some assets failed to cache:', error)
        // Continue installation even if some assets fail
        return cache.addAll(
          ASSETS_TO_CACHE.filter(
            (url) => !url.includes('favicon.ico')
          ),
        )
      })
    }),
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && cacheName !== API_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and non-http(s) requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return
  }

  // API calls - network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE))
    return
  }

  // Static assets and HTML - cache-first strategy
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname === '/'
  ) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME, RUNTIME_CACHE))
    return
  }

  // HTML documents - network-first with cache fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          // Serve from cache if offline
          return caches.match(request).then((response) => {
            return response || new Response('Offline - page not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain',
              }),
            })
          })
        }),
    )
    return
  }

  // Default - network-first
  event.respondWith(networkFirstStrategy(request, RUNTIME_CACHE))
})

/**
 * Cache-first strategy: Check cache first, fall back to network
 * Best for: Static assets, images, fonts
 */
function cacheFirstStrategy(request, cacheNames) {
  return caches
    .match(request)
    .then((response) => {
      if (response) {
        return response
      }
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone()
          const cacheName = Array.isArray(cacheNames) ? cacheNames[1] : cacheNames
          caches.open(cacheName).then((cache) => {
            cache.put(request, responseToCache)
          })
        }
        return response
      })
    })
    .catch(() => {
      // Return a placeholder response if offline and not in cache
      if (request.destination === 'image') {
        return new Response(
          '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#ddd" width="200" height="200"/></svg>',
          {
            headers: { 'Content-Type': 'image/svg+xml' },
          },
        )
      }
      return new Response('Offline - resource not available', {
        status: 503,
        statusText: 'Service Unavailable',
      })
    })
}

/**
 * Network-first strategy: Try network first, fall back to cache
 * Best for: API calls, frequently updated content
 */
function networkFirstStrategy(request, cacheName) {
  return fetch(request)
    .then((response) => {
      // Cache successful responses
      if (response && response.status === 200) {
        const responseToCache = response.clone()
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseToCache)
        })
      }
      return response
    })
    .catch(() => {
      // Fall back to cache when offline
      return caches.match(request).then((response) => {
        return (
          response ||
          new Response(
            JSON.stringify({
              error: 'Offline - request not cached',
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' },
            },
          )
        )
      })
    })
}

// Background Sync event - process sync queue when online
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Sync triggered:', event.tag)

  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        // Send message to all clients to process sync queue
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_OFFLINE_QUEUE',
            timestamp: new Date().toISOString(),
          })
        })
      }),
    )
  }
})

// Listen for messages from clients (e.g., to register for background sync)
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data)

  if (event.data && event.data.type === 'REGISTER_BACKGROUND_SYNC') {
    // Register background sync tag
    self.registration.sync.register('sync-offline-queue').catch((err) => {
      console.warn('[Service Worker] Failed to register background sync:', err)
    })
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
