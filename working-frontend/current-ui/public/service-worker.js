// sync2gear Service Worker - Background Audio & Offline Support
const CACHE_NAME = 'sync2gear-v1';
const AUDIO_CACHE = 'sync2gear-audio-v1';

// Core app files to cache
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Audio files - cache with network fallback
  if (request.url.includes('/audio/') || request.url.includes('.mp3') || request.url.includes('.wav')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            console.log('[Service Worker] Audio from cache:', request.url);
            return response;
          }
          
          return fetch(request).then(networkResponse => {
            // Cache audio for offline playback
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }
  
  // App resources - cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request).then(networkResponse => {
          // Don't cache API calls or external resources
          if (!request.url.includes('/api/') && request.url.startsWith(self.location.origin)) {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Offline fallback
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Background Sync - for offline announcement scheduling
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-announcements') {
    event.waitUntil(syncAnnouncements());
  }
  
  if (event.tag === 'sync-schedule') {
    event.waitUntil(syncSchedule());
  }
});

// Message handling - communicate with app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_AUDIO') {
    const audioUrl = event.data.url;
    caches.open(AUDIO_CACHE).then(cache => {
      cache.add(audioUrl);
    });
  }
});

// Push notifications - for scheduled announcements
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'sync2gear';
  const options = {
    body: data.body || 'Scheduled announcement ready',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'announcement',
    requireInteraction: false,
    data: data
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click - open app
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window if available
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Helper functions
async function syncAnnouncements() {
  console.log('[Service Worker] Syncing announcements...');
  // In production: sync with backend
}

async function syncSchedule() {
  console.log('[Service Worker] Syncing schedule...');
  // In production: sync with backend
}
