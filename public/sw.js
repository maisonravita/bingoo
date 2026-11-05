// Bingoo! : reçoit les notifications (réponses chaudes) et ouvre la bonne page quand on les touche.
// Aucun cache : l'appli se charge toujours en ligne, à jour.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let n = { title: "Bingoo!", body: "Une réponse t'attend.", url: "/reponses" };
  try { n = { ...n, ...e.data.json() }; } catch { /* message vide */ }
  e.waitUntil(self.registration.showNotification(n.title, {
    body: n.body, tag: n.tag, renotify: Boolean(n.tag), icon: "/icon-192.png", badge: "/icon-192.png", data: { url: n.url },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL("/#" + (e.notification.data?.url || "/reponses"), self.location.origin).href;
  e.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of open) if (new URL(c.url).origin === self.location.origin && "focus" in c) { await c.navigate?.(target).catch(() => null); return c.focus(); }
    return self.clients.openWindow(target);
  })());
});
