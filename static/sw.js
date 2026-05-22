// Service Worker for Expenses App PWA
// iOS 18 optimized service worker

const CACHE_NAME = 'expenses-app-v1.0.0';
const STATIC_CACHE_NAME = 'expenses-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'expenses-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/favicon.svg',
  '/manifest.webmanifest',
  // Add other static assets as needed
];

// iOS 18 specific optimizations
const IOS_SPECIFIC_FILES = [
  '/apple-touch-icon.png',
  '/apple-touch-icon-180x180.png',
  '/apple-touch-icon-167x167.png',
  '/apple-touch-icon-152x152.png',
  '/apple-touch-icon-120x120.png'
];

const ALL_CACHE_FILES = [...STATIC_FILES, ...IOS_SPECIFIC_FILES];

// Install event - cache static files.
// NOTE: We deliberately do NOT call skipWaiting() here. The app prompts the
// user via the update banner and only then sends a SKIP_WAITING message.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => cache.addAll(ALL_CACHE_FILES))
  );
});

// Activate event - clean up old caches and enable navigation preload.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Navigation preload elimina la latencia de arranque del SW en
      // requests de navegación. Inocuo en navegadores sin soporte (Safari).
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          /* ignore */
        }
      }

      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== DYNAMIC_CACHE_NAME &&
            cacheName !== CACHE_NAME
          ) {
            return caches.delete(cacheName);
          }
          return undefined;
        })
      );

      await self.clients.claim();
    })()
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle different types of requests
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request, event));
  }
});

// Handle GET requests with cache-first strategy for static files
async function handleGetRequest(request, event) {
  const url = new URL(request.url);

  try {
    // For navigation requests (pages)
    if (request.mode === 'navigate') {
      return await handleNavigationRequest(request, event);
    }
    
    // For static assets
    if (isStaticAsset(url.pathname)) {
      return await handleStaticAssetRequest(request);
    }
    
    // For API requests or dynamic content
    return await handleDynamicRequest(request);
    
  } catch (error) {
    console.error('Fetch error:', error);
    
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE_NAME);
      return await cache.match('/') || new Response('Offline', { status: 503 });
    }
    
    return new Response('Network Error', { status: 503 });
  }
}

// Handle navigation requests (pages)
async function handleNavigationRequest(request, event) {
  try {
    // navigationPreload entrega la respuesta de red ya pedida en paralelo
    // al arranque del SW. Cuando no está disponible (Safari/iOS) caemos
    // a un fetch normal.
    const preload = event && event.preloadResponse ? await event.preloadResponse : null;
    const networkResponse = preload || (await fetch(request));
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Final fallback to main page
    return await cache.match('/');
  }
}

// Handle static assets (CSS, JS, images, fonts)
async function handleStaticAssetRequest(request) {
  // Cache first for static assets
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return empty response for failed static assets
    return new Response('', { status: 404 });
  }
}

// Handle dynamic requests (API calls)
async function handleDynamicRequest(request) {
  try {
    // Network first for dynamic content
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache for GET requests
    if (request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    throw error;
  }
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Background Sync — placeholder. WebKit/iOS no implementa la Background
// Sync API; el listener queda como hook para cuando se cablee el queue de
// gastos offline. No hace nada hoy a propósito.

// Push notifications. iOS 16.4+ requiere la PWA instalada para entregar
// pushes. Sin VAPID configurado el flujo no se activa todavía.
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text() || 'New expense reminder',
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-96x96.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1'
      },
      actions: [
        {
          action: 'view',
          title: 'View App',
          icon: '/android-chrome-96x96.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('Expenses App', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url === location.origin && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Message handler — listens for app-driven commands.
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // User accepted the update banner → activate the waiting worker now.
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'SYNC_DATA') {
    // Hook for future Background Sync work.
    return;
  }
});
