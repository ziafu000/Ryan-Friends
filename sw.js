
const CACHE = "ryan-hl-sjl-v1";
const ASSETS = [
  "./",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./index.css",
  "./index.html",
  "./manifest.webmanifest",
  "./hl/sheets.sync.js",
  "./arcade.html",
  "./arcade/config.json",
  "./arcade/arcade.js",
  "./arcade/game_dreamdrift.js",
  "./arcade/rewards.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request);
    if (cached) return cached;
    try {
      const res = await fetch(e.request);
      cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      if (e.request.mode === "navigate") {
        return cache.match("./index.html");
      }
      throw err;
    }
  })());
});
