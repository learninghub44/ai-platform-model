// Minimal hand-written service worker.
// Deliberately dependency-free: no workbox, no build-time PWA plugin, so the
// project carries none of the legacy workbox/serialize-javascript/terser
// vulnerability chain that ships with most PWA wrapper packages.
//
// Strategy: cache-first for static assets, network-first for everything
// else (so API routes and auth flows always hit the network fresh).

const CACHE_NAME = "platform-cache-v1";
const STATIC_ASSETS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isStaticAsset = /\.(?:js|css|png|jpg|jpeg|svg|woff2?)$/.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(
      () =>
        caches.match(request).then(
          (cached) =>
            cached ||
            new Response("Network error and no cached copy available.", {
              status: 503,
              statusText: "Service Unavailable",
              headers: { "Content-Type": "text/plain" },
            })
        )
    )
  );
});
