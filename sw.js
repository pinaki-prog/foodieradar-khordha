// FoodieRadar Khordha — Service Worker v1.0
// Caches app shell for offline use; network-first for API/map tiles

const CACHE = 'fr-khordha-v1';
const SHELL = [
  '/',
  '/index.html',
  '/events.html',
  '/spot.html',
  '/food-dictionary.html',
  '/food-trails.html',
  '/passport.html',
  '/tiffin.html',
  '/haat-festival.html',
  '/cook-off.html',
  '/thali-week.html',
  '/config.js',
  '/smart-mode.js',
  '/overpass.js',
  '/favicon.svg',
  '/manifest.json',
];

// Install — cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for app shell, network-first for everything else
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET, cross-origin API calls (Supabase, OSM tiles)
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('openstreetmap.org')) return;
  if (url.hostname.includes('nominatim')) return;
  if (url.hostname.includes('fonts.googleapis') || url.hostname.includes('fonts.gstatic')) return;

  // Cache-first for our own files
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache successful same-origin responses
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});