// FF Arena Service Worker v2
const CACHE_NAME = 'ff-arena-v2';
const STATIC_FILES = [
  '/', '/index.html', '/dashboard.html', '/admin.html',
  '/style.css', '/script.js', '/dashboard.js', '/admin.js',
  '/leaderboard.js', '/manifest.json', '/favicon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first strategy — always fetch live Firebase data
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for Firebase / APIs
  if (url.hostname.includes('firebase') || url.hostname.includes('google') || url.hostname.includes('gstatic')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for static assets, fall back to network
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
