// Notifications sur le téléphone (Web Push standard, sans service payant) : chiffrement aes128gcm (RFC 8291)
// et identification VAPID (RFC 8292). La paire de clés du serveur est créée ici au premier besoin et rangée dans
// app_secrets : elle ne passe par personne.
import { admin } from "./core.ts";

const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const te = new TextEncoder();

type Vapid = { publicKey: string; jwk: JsonWebKey };
let cache: Vapid | null = null;

/** La clé publique du serveur (à donner au navigateur), créée au premier appel. */
export async function vapid(): Promise<Vapid> {
  if (cache) return cache;
  const { data } = await admin.from("app_secrets").select("name, value").in("name", ["vapid_public", "vapid_jwk"]);
  const pub = data?.find((x) => x.name === "vapid_public")?.value, jwk = data?.find((x) => x.name === "vapid_jwk")?.value;
  if (pub && jwk) return (cache = { publicKey: pub, jwk: JSON.parse(jwk) });
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  const priv = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const v = { publicKey: b64u(raw), jwk: priv };
  // ignoreDuplicates : si deux appels créent une clé en même temps, la première gagne et on la relit
  await admin.from("app_secrets").upsert([{ name: "vapid_public", value: v.publicKey }, { name: "vapid_jwk", value: JSON.stringify(priv) }], { onConflict: "name", ignoreDuplicates: true });
  cache = null;
  const { data: again } = await admin.from("app_secrets").select("name, value").in("name", ["vapid_public", "vapid_jwk"]);
  return (cache = { publicKey: again!.find((x) => x.name === "vapid_public")!.value, jwk: JSON.parse(again!.find((x) => x.name === "vapid_jwk")!.value) });
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, bytes * 8));
}

/** Chiffre le message pour un navigateur (aes128gcm, un seul bloc). */
async function encrypt(payload: Uint8Array, p256dh: string, auth: string) {
  const ua = unb64u(p256dh), secret = unb64u(auth);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const as = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(secret, shared, cat(te.encode("WebPush: info\0"), ua, as), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, cat(payload, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return cat(salt, rs, new Uint8Array([as.length]), as, ct);
}

async function jwt(aud: string, v: Vapid) {
  const head = b64u(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(te.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:alertes@maisonravita.fr" })));
  const key = await crypto.subtle.importKey("jwk", v.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(`${head}.${body}`));
  return `${head}.${body}.${b64u(sig)}`;
}

export type Notif = { title: string; body: string; url: string; tag?: string };

/** Envoie la notification à tous les téléphones et ordinateurs abonnés de l'espace ; les abonnements expirés sont retirés. */
export async function pushWorkspace(workspaceId: string, n: Notif, seulement?: string) {
  let q = admin.from("push_subs").select("id, endpoint, p256dh, auth").eq("workspace_id", workspaceId);
  if (seulement) q = q.eq("endpoint", seulement);
  const { data: subs } = await q.limit(20);
  if (!subs?.length) return { envoyes: 0 };
  const v = await vapid();
  const payload = te.encode(JSON.stringify(n).slice(0, 3000));
  let ok = 0;
  for (const s of subs) {
    try {
      const body = await encrypt(payload, s.p256dh, s.auth);
      const r = await fetch(s.endpoint, { method: "POST", headers: { "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high", Authorization: `vapid t=${await jwt(new URL(s.endpoint).origin, v)}, k=${v.publicKey}` }, body, signal: AbortSignal.timeout(10000) });
      if (r.status === 404 || r.status === 410) await admin.from("push_subs").delete().eq("id", s.id);
      else if (r.ok) ok++;
    } catch (e) { console.error("push", (e as Error).message); }
  }
  return { envoyes: ok };
}
