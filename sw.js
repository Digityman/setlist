// Minimal SW (no no-op fetch handler). Safe to keep or remove entirely.
// You can add caching later; for now we avoid warnings.

self.addEventListener('install', event => {
  // Skip waiting so updates activate quickly during dev
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Clean up old caches here later if you add them
  event.waitUntil(self.clients.claim());
});

// NOTE: No 'fetch' event listener here on purpose to avoid the no-op warning.
