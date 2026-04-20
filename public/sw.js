const CACHE_NAME = 'web-agent-v1';

// We rely on a stale-while-revalidate strategy for most things
// and a network-first for API calls if needed (though we aim for local-first)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip chrome-extension etc
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchedResponse = fetch(request).then((networkResponse) => {
          // Cache successful GET requests
          if (request.method === 'GET' && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // If network fails, we already returned cachedResponse or it will be undefined
          return cachedResponse;
        });

        return cachedResponse || fetchedResponse;
      });
    })
  );
});
