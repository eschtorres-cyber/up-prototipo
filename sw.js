// ─── UP Service Worker · v3 ─────────────────────────
// v3: network-first para index.html para evitar caché stale
const CACHE = 'up-v3';
const ASSETS = [
  './manifest.json',
  './icon-up.png',
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Borrar TODAS las versiones viejas del caché
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // index.html → siempre network-first (nunca caché)
  if (url.endsWith('/') || url.includes('index.html')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // API calls → siempre network, nunca cachear
  if (url.includes('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Fonts → network-first
  if (url.includes('fonts.g')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Resto de assets → cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
