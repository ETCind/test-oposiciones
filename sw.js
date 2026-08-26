const CACHE = 'test-oposiciones-live-v2-20260826';

const LOCAL = [
  './',
  './index.html',
  './styles.css',
  './seed-library.js',
  './sync-core.js',
  './db.js',
  './parser-core.js',
  './pdf-importer.js',
  './report-core.js',
  './app.js',
  './private-mobile.js',
  './manifest.webmanifest',
  './autotest.html',
  './autotest.js',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    for (const url of LOCAL) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) {
          await cache.put(url, response.clone());
        }
      } catch (_) {}
    }

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    for (const key of keys) {
      if (key !== CACHE) {
        await caches.delete(key);
      }
    }

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request, {
        cache: 'no-store'
      });

      if (response && response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      }

      return response;
    } catch (error) {
      let cached = await caches.match(event.request, {
        ignoreSearch: true
      });

      if (!cached && event.request.mode === 'navigate') {
        cached = await caches.match('./index.html');
      }

      if (!cached) {
        cached = await caches.match('./');
      }

      if (cached) return cached;

      throw error;
    }
  })());
});
