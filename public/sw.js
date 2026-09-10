/* Forendo PWA Service Worker */
const CACHE_NAME = "forendo-cache-v1";

self.addEventListener("install", (event: any) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event: any) => {
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

self.addEventListener("fetch", (event: any) => {
  // Pass through navigate and API requests directly to the network
  if (event.request.mode === "navigate" || event.request.url.includes("/api/")) {
    return;
  }
});
