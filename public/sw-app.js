// Service worker des SaaS construits par Bingoo! : rend l'application installable et plus rapide.
// - Bibliothèques (esm.sh, jsDelivr) : servies depuis le cache, mises à jour en arrière-plan.
// - Pages : réseau d'abord, dernière version gardée si la connexion tombe.
// - Données (API) : jamais mises en cache.
const CACHE = "bingoo-apps-v2";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (/(^|\.)esm\.sh$|cdn\.jsdelivr\.net$/.test(u.hostname)) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const deja = await c.match(r);
      const frais = fetch(r).then((res) => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => deja);
      return deja || frais;
    }));
    return;
  }
  if (r.mode === "navigate" && u.origin === self.location.origin) {
    e.respondWith(fetch(r).then((res) => { const copie = res.clone(); caches.open(CACHE).then((c) => c.put("/", copie)); return res; }).catch(() => caches.match("/").then((x) => x || new Response("Pas de connexion pour le moment.", { headers: { "content-type": "text/plain; charset=utf-8" } }))));
  }
});
