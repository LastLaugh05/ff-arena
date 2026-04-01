// This is the Service Worker for FF Arena
const CACHE_NAME = 'ff-arena-v1';

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installed');
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activated');
});

// We use a simple fetch listener so the app is installable, 
// but we DON'T cache files aggressively so your Firebase matches stay live!
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});