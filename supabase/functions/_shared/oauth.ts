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
export async function gmailSend(ws: Workspace, m: { from: string; to: string; replyTo: string; subject: string; text: string; html: string; headers?: Record<string, string>; attachments?: { filename: string; content: string; contentType: string }[]; messageId?: string; inReplyTo?: string; references?: string[] }) {
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
export async function gmailRecent(ws: Workspace, since: Date, max = 150): Promise<{ items: { raw: string; at: number }[]; more: boolean }> {
  const { token, read } = await googleAccess(ws);
  if (!read) return { items: [], more: false };
  const q = `after:${Math.floor(since.getTime() / 1000)} -in:sent`;
  // Toutes les pages (jusqu'à 1 000 messages), puis traitement des plus anciens d'abord : rien n'est sauté
  const ids: string[] = [];
  let page = "";
  do {
    const list = await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${encodeURIComponent(q)}${page ? `&pageToken=${page}` : ""}`, { headers: { Authorization: `Bearer ${token}` } })).json().catch(() => ({}));
    for (const m of (list.messages ?? []) as { id: string }[]) ids.push(m.id);
    page = list.nextPageToken ?? "";
  } while (page && ids.length < 1000);
  ids.reverse();
  const items: { raw: string; at: number }[] = [];
  for (const id of ids.slice(0, max)) {
    const d = await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=raw`, { headers: { Authorization: `Bearer ${token}` } })).json().catch(() => ({}));
    if (d.raw) items.push({ raw: new TextDecoder().decode(unb64url(d.raw)).slice(0, 200000), at: Number(d.internalDate) || Date.now() });
  }
  return { items, more: ids.length > max };
}

export async function disconnectOauth(ws: Workspace, provider: "google" | "microsoft") {
  const { data: sec } = await admin.from("workspace_secrets").select("oauth").eq("workspace_id", ws.id).maybeSingle();
  const g = sec?.oauth?.[provider];
  if (g?.refresh && provider === "google") await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(await open(g.refresh))}`, { method: "POST" }).catch(() => null);
  const oauth = { ...(sec?.oauth ?? {}) }; delete oauth[provider];
  await admin.from("workspace_secrets").update({ oauth }).eq("workspace_id", ws.id);
}

/* ------------------------------------------------------------------ Microsoft (Outlook, Microsoft 365) */
// Connexion officielle Microsoft : gratuite et sans audit. Envoi par Microsoft Graph (message MIME complet, même
// Message-ID qu'en SMTP) et lecture de la boîte de réception pour repérer réponses et rebonds.
const MS_SCOPES = ["offline_access", "openid", "email", "User.Read", "Mail.Send", "Mail.Read"];
const MS_AUTH = "https://login.microsoftonline.com/common/oauth2/v2.0";

export async function microsoftUrl(ws: Workspace, userId: string) {
  const id = env("MICROSOFT_CLIENT_ID");
  if (!id) throw new HttpError(503, "Connexion Outlook pas encore configurée");
  const u = new URL(`${MS_AUTH}/authorize`);
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", CALLBACK("microsoft"));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("response_mode", "query");
  u.searchParams.set("scope", MS_SCOPES.join(" "));
  u.searchParams.set("prompt", "select_account");
  u.searchParams.set("state", await signState(ws.id, userId));
  return { url: u.toString() };
}

async function msToken(body: Record<string, string>) {
  const r = await fetch(`${MS_AUTH}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env("MICROSOFT_CLIENT_ID"), client_secret: env("MICROSOFT_CLIENT_SECRET"), scope: MS_SCOPES.join(" "), ...body }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(502, `Microsoft : ${d.error_description?.split("\r\n")[0] ?? d.error ?? r.status}`);
  return d as { access_token: string; refresh_token?: string; scope?: string; expires_in: number };
}

/** Retour de Microsoft : échange du code, contrôle des autorisations, enregistrement chiffré. */
export async function microsoftCallback(params: URLSearchParams) {
  const s = await readState(params.get("state") ?? "");
  const { data: ws } = await admin.from("workspaces").select("*").eq("id", s.w).single();
  const back = (ok: string) => `${String(ws?.app_url ?? "").replace(/\/$/, "")}/#/connexions?outlook=${ok}`;
  if (params.get("error")) return back(/consent|admin/i.test(params.get("error_description") ?? "") ? "admin" : "annule");
  const { data: member } = await admin.from("members").select("role").eq("workspace_id", s.w).eq("user_id", s.u).maybeSingle();
  if (!ws || !member) throw new HttpError(403, "Accès refusé à cet espace");
  const t = await msToken({ code: params.get("code") ?? "", redirect_uri: CALLBACK("microsoft"), grant_type: "authorization_code" });
  const granted = String(t.scope ?? "").toLowerCase();
  if (!granted.includes("mail.send")) return back("droits");
  if (!t.refresh_token) return back("refresh");
  const me = await (await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", { headers: { Authorization: `Bearer ${t.access_token}` } })).json().catch(() => ({}));
  const email = String(me.mail || me.userPrincipalName || "").toLowerCase();
  if (!email.includes("@")) return back("email");
  const { data: sec } = await admin.from("workspace_secrets").select("oauth").eq("workspace_id", ws.id).maybeSingle();
  const oauth = { ...(sec?.oauth ?? {}), microsoft: { email, refresh: await seal(t.refresh_token), read: granted.includes("mail.read"), at: new Date().toISOString() } };
  await admin.from("workspace_secrets").upsert({ workspace_id: ws.id, oauth, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
  const integrations = { ...(ws.integrations ?? {}), mailbox: { ok: true, email, provider: "microsoft", via: "oauth", at: new Date().toISOString() } };
  await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
  await log(ws.id, "connexion", `Boîte Outlook connectée par Microsoft : ${email}`);
  return back("ok");
}

/** Jeton d'accès Microsoft (1 h). Microsoft renvoie un nouveau jeton de renouvellement : on le garde. */
export async function microsoftAccess(ws: Workspace) {
  const { data: sec } = await admin.from("workspace_secrets").select("oauth").eq("workspace_id", ws.id).maybeSingle();
  const m = sec?.oauth?.microsoft;
  if (!m?.refresh) throw new HttpError(400, "Boîte Outlook déconnectée : reconnecte-la dans Réglages");
  try {
    const t = await msToken({ refresh_token: await open(m.refresh), grant_type: "refresh_token" });
    if (t.refresh_token) {
      const oauth = { ...(sec?.oauth ?? {}), microsoft: { ...m, refresh: await seal(t.refresh_token) } };
      await admin.from("workspace_secrets").update({ oauth }).eq("workspace_id", ws.id);
    }
    return { token: t.access_token, email: m.email as string, read: !!m.read };
  } catch (e) {
    if (/invalid_grant|expired|revoked|AADSTS70008|AADSTS50173/i.test(String((e as Error).message))) {
      const integrations = { ...(ws.integrations ?? {}), mailbox: { ...(ws.integrations?.mailbox ?? {}), ok: false } };
      await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
    }
    throw new HttpError(502, "Envoi par Outlook : accès refusé par Microsoft, reconnecte la boîte dans Réglages");
  }
}

/** Envoi par Microsoft Graph, au format MIME (mêmes en-têtes et même Message-ID que les autres envois). */
export async function outlookSend(ws: Workspace, m: { from: string; to: string; replyTo: string; subject: string; text: string; html: string; headers?: Record<string, string>; attachments?: { filename: string; content: string; contentType: string }[]; messageId?: string; inReplyTo?: string; references?: string[] }) {
  const { token } = await microsoftAccess(ws);
  const { default: MailComposer } = await import("npm:nodemailer@6.9.16/lib/mail-composer/index.js");
  const raw: Uint8Array = await new MailComposer({ ...m, ...(m.messageId ? { messageId: m.messageId } : {}) }).compile().build();
  let bin = ""; for (let i = 0; i < raw.length; i += 0x8000) bin += String.fromCharCode(...raw.subarray(i, i + 0x8000));
  const r = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", { method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "text/plain" }, body: btoa(bin) });
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new HttpError(502, `Envoi par Outlook : ${d.error?.message ?? r.status}`); }
  return { id: m.messageId ?? "" };
}

/** Messages bruts reçus depuis une date (boîte de réception), pour repérer réponses et rebonds. */
export async function outlookRecent(ws: Workspace, since: Date, max = 150): Promise<{ items: { raw: string; at: number }[]; more: boolean }> {
  const { token, read } = await microsoftAccess(ws);
  if (!read) return { items: [], more: false };
  const H = { Authorization: `Bearer ${token}` };
  let next = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$select=id,receivedDateTime&$orderby=receivedDateTime asc&$top=100&$filter=${encodeURIComponent(`receivedDateTime ge ${since.toISOString()}`)}`;
  const list: { id: string; at: number }[] = [];
  while (next && list.length < 1000) {
    const d = await (await fetch(next, { headers: H })).json().catch(() => ({}));
    for (const x of (d.value ?? []) as { id: string; receivedDateTime: string }[]) list.push({ id: x.id, at: Date.parse(x.receivedDateTime) || Date.now() });
    next = d["@odata.nextLink"] ?? "";
  }
  const items: { raw: string; at: number }[] = [];
  for (const x of list.slice(0, max)) {
    const r = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${x.id}/$value`, { headers: H });
    if (r.ok) items.push({ raw: (await r.text()).slice(0, 200000), at: x.at });
  }
  return { items, more: list.length > max };
}
