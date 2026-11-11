// Service worker minimal des SaaS construits par Bingoo! : rend l'application installable, sans rien mettre en cache.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
