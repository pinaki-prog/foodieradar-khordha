// FoodieRadar Khordha — Service Worker v1.1
// Safe caching: individual fetches with error handling — never crashes on 404

const CACHE = 'fr-khordha-v2';
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
];

// Install — cache each file individually, skip any that 404
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(
        SHELL.map(url =>
          fetch(url)
            .then(res => { if (res.ok) cache.put(url, res); })
            .catch(() => {}) // silently skip files that don't exist
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// Activate — remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch — cache-first for our files, network-first for everything else
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('openstreetmap.org')) return;
  if (url.hostname.includes('nominatim')) return;
  if (url.hostname.includes('overpass-api.de')) return;
  if (url.hostname.includes('kumi.systems')) return;
  if (url.hostname.includes('mail.ru')) return;
  if (url.hostname.includes('fonts.googleapis') || url.hostname.includes('fonts.gstatic')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const resClone = res.clone(); // clone BEFORE returning original
          caches.open(CACHE).then(c => c.put(e.request, resClone));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});