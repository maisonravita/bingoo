// Vérification de la signature des webhooks Resend (format Svix) : en-têtes svix-id, svix-timestamp, svix-signature.
// Le secret (whsec_…) se colle dans Supabase → Edge Functions → Secrets sous le nom RESEND_WEBHOOK_SECRET.
const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));

/** Vrai si la signature est valide et récente (5 minutes de tolérance). */
export async function svixValid(secret: string, headers: Headers, body: string, now = Date.now()) {
  const id = headers.get("svix-id") ?? "", ts = headers.get("svix-timestamp") ?? "", sigs = headers.get("svix-signature") ?? "";
  if (!secret || !id || !ts || !sigs) return false;
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", b64(secret.replace(/^whsec_/, "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toB64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  return sigs.split(" ").some((s) => { const v = s.split(",")[1] ?? ""; if (v.length !== expected.length) return false; let d = 0; for (let i = 0; i < v.length; i++) d |= v.charCodeAt(i) ^ expected.charCodeAt(i); return d === 0; });
}
