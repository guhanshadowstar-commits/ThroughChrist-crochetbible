// Service worker: makes the app work offline.
//  - Bible data files (/data/*.db, art.bin) are cache-first: downloaded once, kept on the device.
//  - Everything else (pages, scripts, styles) is network-first, so updates arrive when online,
//    with the cached copy used when offline. Every request revalidates with the server (cache: 'no-cache'):
//    GitHub Pages tells browsers to keep files for 10 minutes, and without this a visit just after an
//    update could mix new and old files.
const SHELL = 'shell-v1';
const DATA = 'data-v1';

// Where this app lives: "/" on its own domain, "/crochet-bible/" on GitHub Pages.
const BASE = new URL(self.registration.scope).pathname;
const DATA_PATH = `${BASE}data/`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has('range')) return; // never cache partial responses

  const isData = url.pathname.startsWith(DATA_PATH) && url.pathname !== `${DATA_PATH}manifest.json`;
  event.respondWith(isData ? cacheFirst(req) : networkFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(DATA);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.status === 200) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req, { cache: 'no-cache' }); // ask the server if it changed (a cheap 304 when not)
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: false });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const home = await cache.match(BASE);
      if (home) return home;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
