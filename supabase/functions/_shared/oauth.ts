// Connexion officielle des boîtes (OAuth) : Google (Gmail) aujourd'hui, Microsoft ensuite.
// Le jeton de renouvellement est chiffré en base ; le navigateur ne voit jamais aucun jeton.
import { HttpError } from "./http.ts";
import { admin, env, log, type Workspace } from "./core.ts";
import { open, seal } from "./growth.ts";

const CALLBACK = (p: string) => `${env("SUPABASE_URL")}/functions/v1/o/${p}/callback`;
const GOOGLE_SCOPES = ["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"];

const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

async function stateKey() {
  const { data } = await admin.from("app_secrets").select("value").eq("name", "cron_key").single();
  return await crypto.subtle.importKey("raw", new TextEncoder().encode(`oauth-state:${data?.value ?? ""}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** État signé (espace, utilisateur, expiration 15 min) : empêche qu'un tiers rattache sa boîte à l'espace d'un autre. */
export async function signState(wsId: string, userId: string, now = Date.now()) {
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ w: wsId, u: userId, e: now + 15 * 60000 })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await stateKey(), new TextEncoder().encode(payload)));
  return `${payload}.${b64url(sig)}`;
}
export async function readState(state: string, now = Date.now()) {
  const [payload, sig] = String(state ?? "").split(".");
  if (!payload || !sig) throw new HttpError(400, "Lien de connexion invalide");
  const ok = await crypto.subtle.verify("HMAC", await stateKey(), unb64url(sig), new TextEncoder().encode(payload));
  if (!ok) throw new HttpError(400, "Lien de connexion invalide");
  const s = JSON.parse(new TextDecoder().decode(unb64url(payload))) as { w: string; u: string; e: number };
  if (s.e < now) throw new HttpError(400, "Lien de connexion expiré : recommence depuis Bingoo");
  return s;
}

export async function googleUrl(ws: Workspace, userId: string) {
  const id = env("GOOGLE_CLIENT_ID");
  if (!id) throw new HttpError(503, "Connexion Google pas encore configurée");
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", CALLBACK("google"));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", await signState(ws.id, userId));
  return { url: u.toString() };
}

async function tokenRequest(body: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(502, `Google : ${d.error_description ?? d.error ?? r.status}`);
  return d as { access_token: string; refresh_token?: string; scope?: string; expires_in: number };
}

/** Retour de Google : échange du code, contrôle des autorisations, enregistrement chiffré. Renvoie l'adresse de retour dans l'app. */
export async function googleCallback(params: URLSearchParams) {
  const s = await readState(params.get("state") ?? "");
  const { data: ws } = await admin.from("workspaces").select("*").eq("id", s.w).single();
  const back = (ok: string) => `${String(ws?.app_url ?? "").replace(/\/$/, "")}/#/connexions?gmail=${ok}`;
  if (params.get("error")) return back("annule");
  const { data: member } = await admin.from("members").select("role").eq("workspace_id", s.w).eq("user_id", s.u).maybeSingle();
  if (!ws || !member) throw new HttpError(403, "Accès refusé à cet espace");
  const t = await tokenRequest({ code: params.get("code") ?? "", client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), redirect_uri: CALLBACK("google"), grant_type: "authorization_code" });
  const granted = String(t.scope ?? "");
  if (!granted.includes("gmail.send")) return back("droits");
  if (!t.refresh_token) return back("refresh");
  const me = await (await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${t.access_token}` } })).json().catch(() => ({}));
  const email = String(me.email ?? "").toLowerCase();
  if (!email) return back("email");
  const { data: sec } = await admin.from("workspace_secrets").select("oauth").eq("workspace_id", ws.id).maybeSingle();
  const oauth = { ...(sec?.oauth ?? {}), google: { email, refresh: await seal(t.refresh_token), read: granted.includes("gmail.readonly"), at: new Date().toISOString() } };
  await admin.from("workspace_secrets").upsert({ workspace_id: ws.id, oauth, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
  const integrations = { ...(ws.integrations ?? {}), mailbox: { ok: true, email, provider: "google", via: "oauth", at: new Date().toISOString() } };
  await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
  await log(ws.id, "connexion", `Boîte Gmail connectée par Google : ${email}`);
  return back("ok");
}

/** Jeton d'accès Gmail (1 h), à partir du jeton de renouvellement chiffré. Boîte marquée « à reconnecter » si Google refuse. */
export async function googleAccess(ws: Workspace) {
  const { data: sec } = await admin.from("workspace_secrets").select("oauth").eq("workspace_id", ws.id).maybeSingle();
  const g = sec?.oauth?.google;
  if (!g?.refresh) throw new HttpError(400, "Boîte Gmail déconnectée : reconnecte-la dans Réglages");
  try {
    const t = await tokenRequest({ refresh_token: await open(g.refresh), client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), grant_type: "refresh_token" });
    return { token: t.access_token, email: g.email as string, read: !!g.read };
  } catch (e) {
    if (/invalid_grant|expired|revoked/i.test(String((e as Error).message))) {
      const integrations = { ...(ws.integrations ?? {}), mailbox: { ...(ws.integrations?.mailbox ?? {}), ok: false } };
      await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
    }
    throw new HttpError(502, "Envoi par Gmail : accès refusé par Google, reconnecte la boîte dans Réglages");
  }
}

/** Envoi par l'API Gmail : message MIME construit comme pour le SMTP (même Message-ID, mêmes en-têtes). */
export async function gmailSend(ws: Workspace, m: { from: string; to: string; replyTo: string; subject: string; text: string; html: string; headers?: Record<string, string>; attachments?: { filename: string; content: string; contentType: string }[]; messageId?: string }) {
  const { token } = await googleAccess(ws);
  const { default: MailComposer } = await import("npm:nodemailer@6.9.16/lib/mail-composer/index.js");
  const raw: Uint8Array = await new MailComposer({ ...m, ...(m.messageId ? { messageId: m.messageId } : {}) }).compile().build();
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: b64url(raw) }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(502, `Envoi par Gmail : ${d.error?.message ?? r.status}`);
  return { id: m.messageId ?? String(d.id ?? ""), gmailId: String(d.id ?? ""), threadId: String(d.threadId ?? "") };
}

/** Messages bruts reçus depuis une date (lecture seule), pour la détection des réponses et des rebonds. */
export async function gmailRecent(ws: Workspace, since: Date, max = 50) {
  const { token, read } = await googleAccess(ws);
  if (!read) return [] as string[];
  const q = `after:${Math.floor(since.getTime() / 1000)} -in:sent`;
  const list = await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } })).json().catch(() => ({}));
  const out: string[] = [];
  for (const { id } of (list.messages ?? []) as { id: string }[]) {
    const d = await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=raw`, { headers: { Authorization: `Bearer ${token}` } })).json().catch(() => ({}));
    if (d.raw) out.push(new TextDecoder().decode(unb64url(d.raw)).slice(0, 200000));
  }
  return out;
}

export async function disconnectOauth(ws: Workspace, provider: "google") {
  const { data: sec } = await admin.from("workspace_secrets").select("oauth").eq("workspace_id", ws.id).maybeSingle();
  const g = sec?.oauth?.[provider];
  if (g?.refresh && provider === "google") await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(await open(g.refresh))}`, { method: "POST" }).catch(() => null);
  const oauth = { ...(sec?.oauth ?? {}) }; delete oauth[provider];
  await admin.from("workspace_secrets").update({ oauth }).eq("workspace_id", ws.id);
}
