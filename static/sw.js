// Service Worker for Expenses App PWA
// iOS 18 optimized service worker

const CACHE_NAME = 'expenses-app-v1.0.0';
const STATIC_CACHE_NAME = 'expenses-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'expenses-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/about',
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

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('Caching static files...');
        return cache.addAll(ALL_CACHE_FILES);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName !== CACHE_NAME
            ) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
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
    event.respondWith(handleGetRequest(request));
  }
});

// Handle GET requests with cache-first strategy for static files
async function handleGetRequest(request) {
  const url = new URL(request.url);
  
  try {
    // For navigation requests (pages)
    if (request.mode === 'navigate') {
      return await handleNavigationRequest(request);
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
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    
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

// Handle background sync for iOS (limited support)
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'expense-sync') {
    event.waitUntil(syncExpenseData());
  }
});

async function syncExpenseData() {
  // Implement expense data synchronization
  console.log('Syncing expense data...');
  // This would sync any offline expense data when connection is restored
}

// Handle push notifications (for iOS support)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
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
  console.log('Notification clicked:', event);
  
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

// iOS specific: Handle app badge updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_BADGE') {
    // iOS doesn't support navigator.setAppBadge yet, but we can prepare for it
    console.log('Badge update requested:', event.data.count);
    
    // For future iOS support:
    // if ('setAppBadge' in navigator) {
    //   navigator.setAppBadge(event.data.count);
    // }
  }
});

console.log('Service Worker loaded successfully');
