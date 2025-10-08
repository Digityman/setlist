// sw.js at repo root
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());
// No caching here so streaming audio stays network-first
self.addEventListener('fetch', () => {});
