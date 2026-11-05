import { fn } from "./supabase";

// Notifications sur le téléphone : enregistrement du service worker et abonnement de cet appareil.
export const pushPossible = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const estIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const estInstallee = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

export function enregistrerSW() {
  if (!("serviceWorker" in navigator) || location.hostname === "localhost") return;
  navigator.serviceWorker.register("/sw.js").catch(() => null);
}

const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

export async function etatPush() {
  if (!pushPossible()) return estIOS() && !estInstallee() ? "ios-installer" : "impossible";
  if (Notification.permission === "denied") return "refuse";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "actif" : "inactif";
}

function appareil() {
  const u = navigator.userAgent;
  return /iphone/i.test(u) ? "iPhone" : /ipad/i.test(u) ? "iPad" : /android/i.test(u) ? "Android" : /mac/i.test(u) ? "Mac" : /windows/i.test(u) ? "PC" : "Navigateur";
}

export async function activerPush(ws) {
  if ((await Notification.requestPermission()) !== "granted") throw new Error("Autorise les notifications pour Bingoo! dans les réglages du téléphone, puis réessaie.");
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  const { cle } = await fn("m/push-cle", { workspace_id: ws.id });
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(cle) });
  return await fn("m/push-abonner", { workspace_id: ws.id, sub: sub.toJSON(), appareil: appareil(), essai: true });
}

export async function couperPush(ws) {
  const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
  if (!sub) return;
  await fn("m/push-abonner", { workspace_id: ws.id, sub: sub.toJSON(), retirer: true }).catch(() => null);
  await sub.unsubscribe();
}
