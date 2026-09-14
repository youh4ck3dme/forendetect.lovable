/* Forendo PWA Service Worker */
const CACHE_NAME = "forendo-cache-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Pass through navigate and API requests directly to the network
  if (event.request.mode === "navigate" || event.request.url.includes("/api/")) {
    return;
  }
});
