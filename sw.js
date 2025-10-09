// Minimal SW (no no-op fetch handler). Safe to keep or remove.
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
// No 'fetch' listener on purpose to avoid the no-op warning.
