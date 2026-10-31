/* Choc des Légendes — service worker : tout le jeu est gardé sur l'appareil pour jouer hors ligne.
 *
 * À la publication (node tools/build-web.js), VERSION et ASSETS sont remplis automatiquement :
 * chaque nouvelle version du jeu télécharge la liste complète des fichiers, puis remplace l'ancienne
 * d'un seul coup (jamais de mélange de fichiers anciens et nouveaux).
 * Tel quel (VERSION 'dev', serveur local), le réseau passe en premier et la copie hors ligne
 * se remplit au fil des chargements.
 */
'use strict';
const VERSION = '3b8975b0a7c9';
const ASSETS = [
  "./",
  "css/style.css",
  "fonts/bangers-ext.woff2",
  "fonts/bangers.woff2",
  "fonts/russo.woff2",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "index.html",
  "js/achievements.js",
  "js/ai.js",
  "js/audio.js",
  "js/battle.js",
  "js/effects.js",
  "js/fighter.js",
  "js/input.js",
  "js/main.js",
  "js/modes.js",
  "js/moves.js",
  "js/poses.js",
  "js/projectiles.js",
  "js/pwa.js",
  "js/rig.js",
  "js/roster.js",
  "js/stages.js",
  "js/storage.js",
  "js/story.js",
  "js/ui.js",
  "js/util.js",
  "manifest.webmanifest"
];
const CACHE = 'cdl-' + VERSION;
const DEV = VERSION === 'dev';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache: 'reload' contourne le cache HTTP pour obtenir les fichiers de cette version
    await cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('cdl-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'version' && event.source) event.source.postMessage({ type: 'version', version: VERSION });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(DEV ? networkFirst(req) : cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch (e) {
    return offlineFallback(cache, req);
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(req, { ignoreSearch: true });
    return hit || offlineFallback(cache, req);
  }
}

async function offlineFallback(cache, req) {
  if (req.mode === 'navigate') {
    const page = (await cache.match('./')) || (await cache.match('index.html'));
    if (page) return page;
  }
  return Response.error();
}
