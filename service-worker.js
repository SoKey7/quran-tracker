const CACHE_NAME = "quran-tracker-v4-src";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./logo.png",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./favicon.ico",
  "./src/main.js",
  "./src/storage.js",
  "./src/utils.js",
  "./src/ui.js",
  "./src/surahs.js",
  "./src/reading.js",
  "./src/reading-catalog-default.js",
  "./src/profile.js",
  "./src/widgets.js",
  "./src/friends.js",
  "./src/badges.js",
  "./src/history.js",
  "./src/notes.js",
  "./src/firebase-config.js",
  "./src/firebase-service.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("./index.html")));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const client = clientsArr.find((c) => c.url.includes("index.html"));
      if (client) return client.focus();
      return self.clients.openWindow("./index.html");
    })
  );
});

let scheduledTimer = null;
self.addEventListener("message", (event) => {
  const payload = event.data || {};
  if (payload.type !== "SCHEDULE_NOTIFICATION") return;
  if (scheduledTimer) clearTimeout(scheduledTimer);
  const delay = Math.max(0, Number(payload.when || Date.now()) - Date.now());
  scheduledTimer = setTimeout(() => {
    self.registration.showNotification(payload.title || "Quran Tracker", {
      body: payload.body || "Il est temps de lire aujourd'hui 📖🔥",
      icon: payload.icon || "icon-192.png",
      badge: payload.icon || "icon-192.png",
      tag: "quran-tracker-reminder"
    });
  }, delay);
});
