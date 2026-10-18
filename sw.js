'use strict';
// Bump when application files change. Waiting updates activate after all old tabs close.
const VERSION = 'pisirya-2026-10-18-chef1051-pl171';
const SHELL = VERSION + '-shell';
const PHOTOS = 'pisirya-photos-v2';
async function photoResponse(request) {
 const cache = await caches.open(PHOTOS);
 const hit = await cache.match(request) || await (await caches.open(SHELL)).match(request);
 if (hit) return hit;
 const response = await fetch(request);
 if (response.ok || response.type === 'opaque') {
  try {
   await cache.put(request, response.clone());
   const keys = await cache.keys();
   await Promise.all(keys.slice(0, Math.max(0, keys.length - 200)).map(key => cache.delete(key)));
  } catch (_) { /* A full cache must never stop a visible image loading. */ }
 }
 return response;
}
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'i18n.js', 'locales.js', 'locale-upgrade.js', 'data.js', 'pantry.js', 'manifest.webmanifest', 'favicon.png', 'credits.html', 'icons/logo.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png', 'icons/apple-touch-icon.png', "assets/generated/imam-bayildi.webp", "assets/generated/ezogelin-corbasi.webp", "assets/generated/mucver.webp", "assets/generated/mercimekli-kofte.webp", "assets/generated/bezelye-yemegi.webp", "assets/generated/limonlu-tavuk.webp", "assets/generated/tavuk-sote.webp", "assets/generated/hunkar-begendi.webp", "assets/generated/cacik.webp", "assets/generated/katsu-tavuk.webp", "assets/generated/nohutlu-pilav.webp", "assets/generated/kuru-fasulye.webp", "assets/generated/tabule.webp", "assets/generated/kisir.webp", "assets/generated/balli-ceviz-yogurt.webp", "assets/generated/bulgur-pilavi.webp", "assets/generated/yayla-corbasi.webp", "assets/generated/coban-salata.webp"];
self.addEventListener('install', event => event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(FILES))));
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key =>
 ((key.startsWith('pisirya-') && key !== SHELL && key !== PHOTOS) || key === 'nepisirsem-v1')
 ).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
 if (event.request.method !== 'GET') return;
 const url = new URL(event.request.url);
 if (url.origin === self.location.origin && /\/assets\/(generated|photos)\//.test(url.pathname)) {
  event.respondWith(photoResponse(event.request));
 } else if (url.origin === self.location.origin) {
  event.respondWith(caches.open(SHELL).then(async cache => {
   const hit = await cache.match(event.request, {ignoreSearch:true});
   if (hit) return hit;
   if (event.request.mode === 'navigate') return (await cache.match('index.html')) || fetch(event.request);
   return fetch(event.request);
  }));
 } else if ((url.hostname === 'images.pexels.com' || url.hostname === 'upload.wikimedia.org')) {
  event.respondWith(photoResponse(event.request));
 }
});
