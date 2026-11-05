// Croissance : préchauffage, boîte mail, équipe, CRM, agenda, abonnements Stripe.
import nodemailer from "npm:nodemailer@6.9.16";
import { HttpError } from "./http.ts";
import { admin, env, log, PACKS, PLANS, type Prospect, type Workspace } from "./core.ts";

const APP = (ws: Workspace) => (ws.app_url || env("APP_URL", "https://kairo.maisonravita.fr")).replace(/\/$/, "");
const today = () => new Date().toISOString().slice(0, 10);

// =====================================================================
// Préchauffage : montée progressive des envois sur 4 semaines
// =====================================================================
export const RAMP = [10, 20, 35, 50];
export function warmup(ws: Workspace) {
  const limit = ws.daily_limit || 20;
  if (!ws.warmup_started) return { week: 1, day: 0, cap: Math.min(RAMP[0], limit), done: false, ramp: RAMP };
  const days = Math.max(0, Math.floor((Date.now() - new Date(`${ws.warmup_started}T00:00:00Z`).getTime()) / 864e5));
  const week = Math.floor(days / 7);
  const done = week >= RAMP.length;
  return { week: Math.min(week + 1, RAMP.length), day: days + 1, cap: done ? limit : Math.min(RAMP[week], limit), done, ramp: RAMP };
}
export async function markWarmup(ws: Workspace) {
  if (ws.warmup_started) return;
  const d = today();
  await admin.from("workspaces").update({ warmup_started: d }).eq("id", ws.id).is("warmup_started", null);
  ws.warmup_started = d;
}

// =====================================================================
// Boîte mail (SMTP sécurisé, port 465, mot de passe d'application chiffré)
// =====================================================================
export const MAILBOXES: Record<string, { label: string; host: string; port: number; help: string }> = {
  gmail: { label: "Gmail / Google Workspace", host: "smtp.gmail.com", port: 465, help: "Active la validation en 2 étapes, puis crée un mot de passe d'application sur myaccount.google.com/apppasswords." },
  ovh: { label: "OVH (MX Plan, Email Pro)", host: "ssl0.ovh.net", port: 465, help: "Utilise le mot de passe de ta boîte e-mail OVH." },
  ionos: { label: "IONOS", host: "smtp.ionos.fr", port: 465, help: "Utilise le mot de passe de ta boîte e-mail IONOS." },
  zoho: { label: "Zoho Mail", host: "smtp.zoho.eu", port: 465, help: "Crée un mot de passe d'application dans Zoho (Sécurité → Mots de passe d'application)." },
  autre: { label: "Autre (SMTP SSL)", host: "", port: 465, help: "Indique le serveur SMTP SSL de ton hébergeur (port 465)." },
};

async function cryptoKey() {
  let { data } = await admin.from("app_secrets").select("value").eq("name", "mailbox_key").maybeSingle();
  if (!data) {
    const raw = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
    await admin.from("app_secrets").upsert({ name: "mailbox_key", value: raw }, { onConflict: "name", ignoreDuplicates: true });
    ({ data } = await admin.from("app_secrets").select("value").eq("name", "mailbox_key").single());
  }
  const bytes = new Uint8Array(data!.value.match(/.{2}/g)!.map((h: string) => parseInt(h, 16)));
  return await crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function seal(text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(), new TextEncoder().encode(text)));
  return btoa(String.fromCharCode(...iv, ...ct));
}
export async function open(sealed: string) {
  const all = Uint8Array.from(atob(sealed), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: all.slice(0, 12) }, await cryptoKey(), all.slice(12));
  return new TextDecoder().decode(pt);
}

function transport(host: string, port: number, user: string, pass: string) {
  return nodemailer.createTransport({ host, port, secure: true, auth: { user, pass }, connectionTimeout: 12000, greetingTimeout: 12000, socketTimeout: 20000 });
}
function smtpError(e: unknown) {
  const m = String((e as Error)?.message ?? e);
  if (/auth|535|534|credentials|password|Username/i.test(m)) return "Identifiant ou mot de passe refusé. Pour Gmail, il faut un mot de passe d'application (pas ton mot de passe habituel).";
  if (/ENOTFOUND|getaddrinfo|resolve/i.test(m)) return "Serveur SMTP introuvable : vérifie son adresse.";
  if (/timeout|ETIMEDOUT|ECONNREFUSED|refused/i.test(m)) return "Le serveur ne répond pas sur le port 465 (SSL). Vérifie le serveur, ou contacte ton hébergeur.";
  return "Connexion impossible : " + m.slice(0, 160);
}

export async function saveMailbox(ws: Workspace, b: Record<string, unknown>) {
  const provider = MAILBOXES[String(b.provider)] ? String(b.provider) : "autre";
  const email = String(b.email ?? "").trim().toLowerCase();
  const pass = String(b.password ?? "").replace(/\s+/g, provider === "gmail" ? "" : " ").trim();
  const host = provider === "autre" ? String(b.host ?? "").trim().toLowerCase() : MAILBOXES[provider].host;
  const port = 465;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Adresse e-mail invalide");
  if (pass.length < 4) throw new HttpError(400, "Mot de passe manquant");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) throw new HttpError(400, "Serveur SMTP invalide (ex. smtp.monhebergeur.fr)");
  if (/(outlook|office365|hotmail|live)\./.test(host) || /@(outlook|hotmail|live)\./.test(email)) throw new HttpError(400, "Microsoft n'accepte plus les mots de passe pour l'envoi : la connexion Outlook arrivera avec la connexion Microsoft. En attendant, utilise ton domaine d'envoi.");
  try { await transport(host, port, email, pass).verify(); } catch (e) { throw new HttpError(400, smtpError(e)); }
  const smtp = { host, port, user: email, pass: await seal(pass) };
  await admin.from("workspace_secrets").upsert({ workspace_id: ws.id, smtp, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
  const integrations = { ...(ws.integrations ?? {}), mailbox: { ok: true, email, provider, at: new Date().toISOString() } };
  await admin.from("workspaces").update({ integrations, sender_email: email }).eq("id", ws.id);
  await log(ws.id, "integration", `Boîte mail connectée : ${email}`);
  return { ok: true, email, provider };
}
export async function removeMailbox(ws: Workspace) {
  if ((ws.integrations?.mailbox as { via?: string } | undefined)?.via === "oauth") {
    const { disconnectOauth } = await import("./oauth.ts");
    await disconnectOauth(ws, (ws.integrations?.mailbox as { provider?: string } | undefined)?.provider === "microsoft" ? "microsoft" : "google");
  }
  await admin.from("workspace_secrets").update({ smtp: {} }).eq("workspace_id", ws.id);
  const integrations = { ...(ws.integrations ?? {}) };
  delete integrations.mailbox;
  await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
  return { ok: true };
}
export async function smtpSend(ws: Workspace, m: { from: string; to: string; replyTo: string; subject: string; text: string; html: string; headers?: Record<string, string>; attachments?: { filename: string; content: string; contentType: string }[]; messageId?: string }) {
  const { data } = await admin.from("workspace_secrets").select("smtp").eq("workspace_id", ws.id).maybeSingle();
  const s = data?.smtp as { host?: string; port?: number; user?: string; pass?: string } | undefined;
  if (!s?.host || !s.pass) throw new HttpError(400, "Boîte mail déconnectée : reconnecte-la dans Réglages");
  try {
    const info = await transport(s.host, s.port ?? 465, s.user!, await open(s.pass)).sendMail({
      from: m.from, to: m.to, replyTo: m.replyTo, subject: m.subject, text: m.text, html: m.html, headers: m.headers, attachments: m.attachments,
      ...(m.messageId ? { messageId: m.messageId } : {}),
    });
    return { id: String(info.messageId ?? "") };
  } catch (e) {
    if (/auth|535|534/i.test(String((e as Error).message))) {
      const integrations = { ...(ws.integrations ?? {}), mailbox: { ...(ws.integrations?.mailbox ?? { email: "", provider: "", at: "" }), ok: false } };
      await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
    }
    throw new HttpError(502, "Envoi par ta boîte : " + smtpError(e));
  }
}

// =====================================================================
// Équipe
// =====================================================================
async function roleOf(wsId: string, userId: string) {
  const { data } = await admin.from("members").select("role").eq("workspace_id", wsId).eq("user_id", userId).maybeSingle();
  return data?.role ?? "";
}
async function requireAdmin(wsId: string, userId: string) {
  if (!["owner", "admin"].includes(await roleOf(wsId, userId))) throw new HttpError(403, "Seuls le propriétaire et les administrateurs peuvent gérer l'équipe");
}
export async function invite(ws: Workspace, userId: string, b: Record<string, unknown>) {
  await requireAdmin(ws.id, userId);
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 200);
  const role = b.role === "admin" ? "admin" : "member";
  const seats = PLANS[ws.plan ?? "essai"]?.seats ?? 1;
  const { count: members } = await admin.from("members").select("user_id", { count: "exact", head: true }).eq("workspace_id", ws.id);
  const { count: pending } = await admin.from("invites").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).is("used_at", null).gt("expires_at", new Date().toISOString());
  if ((members ?? 0) + (pending ?? 0) >= seats) throw new HttpError(402, `Ta formule ${PLANS[ws.plan]?.label ?? ""} comprend ${seats} utilisateur${seats > 1 ? "s" : ""} : passe à une formule supérieure pour inviter quelqu'un.`);
  const { data, error } = await admin.from("invites").insert({ workspace_id: ws.id, email, role, created_by: userId }).select("token").single();
  if (error) throw new HttpError(500, error.message);
  await log(ws.id, "equipe", `Invitation créée${email ? ` pour ${email}` : ""}`);
  const link = `${APP(ws)}/#/rejoindre/${data.token}`;
  let emailed = false;
  if (email) {
    try {
      const { sendSystem } = await import("./mail.ts");
      const { data: u } = await admin.auth.admin.getUserById(userId);
      await sendSystem({ to: email, replyTo: u?.user?.email ?? undefined, subject: `Invitation à rejoindre ${ws.profile?.nom || ws.name} sur Kairo`, text: `Bonjour,\n\n${u?.user?.email ?? "Ton équipe"} t'invite à rejoindre l'espace « ${ws.profile?.nom || ws.name} » sur Kairo, l'outil qui trouve et contacte les prospects.\n\nRejoindre l'équipe (lien valable 7 jours) :\n${link}\n\nÀ bientôt,\nKairo` });
      emailed = true;
    } catch (e) { console.error("invitation", e); }
  }
  return { link, emailed };
}
export async function revokeInvite(ws: Workspace, userId: string, id: string) {
  await requireAdmin(ws.id, userId);
  await admin.from("invites").delete().eq("id", id).eq("workspace_id", ws.id).is("used_at", null);
  return { ok: true };
}
export async function join(req: Request, token: string) {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) throw new HttpError(401, "Connecte-toi ou crée ton compte pour rejoindre l'équipe");
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw new HttpError(404, "Invitation introuvable");
  const { data: inv } = await admin.from("invites").select("*").eq("token", token).maybeSingle();
  if (!inv || inv.used_at) throw new HttpError(404, "Cette invitation a déjà servi ou n'existe pas");
  if (new Date(inv.expires_at) < new Date()) throw new HttpError(410, "Cette invitation a expiré : demande un nouveau lien");
  if (inv.email && u.user.email?.toLowerCase() !== inv.email) throw new HttpError(403, `Cette invitation est réservée à ${inv.email}`);
  await admin.from("members").upsert({ workspace_id: inv.workspace_id, user_id: u.user.id, role: inv.role, email: u.user.email ?? "" }, { onConflict: "workspace_id,user_id", ignoreDuplicates: true });
  await admin.from("invites").update({ used_at: new Date().toISOString(), used_by: u.user.id }).eq("id", inv.id);
  await log(inv.workspace_id, "equipe", `${u.user.email} a rejoint l'équipe`);
  return { workspace_id: inv.workspace_id };
}
export async function setMember(ws: Workspace, userId: string, target: string, action: string) {
  await requireAdmin(ws.id, userId);
  const r = await roleOf(ws.id, target);
  if (!r) throw new HttpError(404, "Membre introuvable");
  if (r === "owner") throw new HttpError(400, "Le propriétaire ne peut pas être modifié");
  if (action === "remove") {
    await admin.from("members").delete().eq("workspace_id", ws.id).eq("user_id", target);
    await admin.from("prospects").update({ owner_id: null }).eq("workspace_id", ws.id).eq("owner_id", target);
  } else if (action === "admin" || action === "member") {
    await admin.from("members").update({ role: action }).eq("workspace_id", ws.id).eq("user_id", target);
  } else throw new HttpError(400, "Action inconnue");
  return { ok: true };
}
/** Répartit les prospects sans responsable entre les membres, à tour de rôle. */
export async function distribute(ws: Workspace, userId: string, b: Record<string, unknown>) {
  await requireAdmin(ws.id, userId);
  const { data: mem } = await admin.from("members").select("user_id").eq("workspace_id", ws.id).order("created_at");
  const users = (Array.isArray(b.users) && b.users.length ? (b.users as string[]) : (mem ?? []).map((m) => m.user_id)).filter((id) => (mem ?? []).some((m) => m.user_id === id));
  if (!users.length) throw new HttpError(400, "Aucun membre choisi");
  let q = admin.from("prospects").select("id").eq("workspace_id", ws.id).is("owner_id", null).not("status", "in", "(refus,ignore)");
  if (b.target) q = q.eq("target", String(b.target));
  const { data } = await q.order("score", { ascending: false, nullsFirst: false }).limit(Math.min(Number(b.count) || 200, 1000));
  const ids = (data ?? []).map((x) => x.id);
  for (let k = 0; k < users.length; k++) {
    const mine = ids.filter((_, i) => i % users.length === k);
    for (let i = 0; i < mine.length; i += 200) await admin.from("prospects").update({ owner_id: users[k] }).in("id", mine.slice(i, i + 200));
  }
  await log(ws.id, "equipe", `${ids.length} prospects répartis entre ${users.length} personne${users.length > 1 ? "s" : ""}`);
  return { assigned: ids.length };
}

// =====================================================================
// CRM : HubSpot et Pipedrive (clé fournie par le client)
// =====================================================================
async function hub(token: string, path: string, method = "GET", body?: unknown) {
  const r = await fetch(`https://api.hubapi.com${path}`, { method, headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}
async function pipe(token: string, path: string, method = "GET", body?: unknown) {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`https://api.pipedrive.com/v1${path}${sep}api_token=${encodeURIComponent(token)}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

export async function connectCrm(ws: Workspace, b: Record<string, unknown>) {
  const crm = String(b.crm);
  const token = String(b.token ?? "").trim();
  const integrations = { ...(ws.integrations ?? {}) } as Workspace["integrations"];
  if (b.remove) {
    if (crm === "hubspot") { delete integrations.hubspot; await admin.from("workspace_secrets").upsert({ workspace_id: ws.id, hubspot_token: "" }, { onConflict: "workspace_id" }); }
    if (crm === "pipedrive") { delete integrations.pipedrive; await admin.from("workspace_secrets").upsert({ workspace_id: ws.id, pipedrive_token: "" }, { onConflict: "workspace_id" }); }
    await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
    return { ok: true };
  }
  if (token.length < 10) throw new HttpError(400, "Colle la clé d'accès de ton CRM");
  if (crm === "hubspot") {
    const r = await hub(token, "/account-info/v3/details");
    if (!r.ok) throw new HttpError(400, r.status === 401 ? "Clé HubSpot refusée : crée une application privée avec les accès CRM (contacts, entreprises, transactions) et copie son jeton." : `HubSpot : ${r.data?.message ?? r.status}`);
    await admin.from("workspace_secrets").upsert({ workspace_id: ws.id, hubspot_token: token }, { onConflict: "workspace_id" });
    integrations.hubspot = { ok: true, at: new Date().toISOString(), portal: String(r.data?.portalId ?? "") };
  } else if (crm === "pipedrive") {
    const r = await pipe(token, "/users/me");
    if (!r.ok || !r.data?.success) throw new HttpError(400, "Clé Pipedrive refusée : copie ton jeton API personnel (Paramètres personnels → API).");
    await admin.from("workspace_secrets").upsert({ workspace_id: ws.id, pipedrive_token: token, pipedrive_domain: String(r.data?.data?.company_domain ?? "") }, { onConflict: "workspace_id" });
    integrations.pipedrive = { ok: true, at: new Date().toISOString(), company: String(r.data?.data?.company_name ?? "") };
  } else throw new HttpError(400, "CRM inconnu");
  await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
  await log(ws.id, "integration", `${crm === "hubspot" ? "HubSpot" : "Pipedrive"} connecté`);
  return { ok: true };
}

const SYNC_STATUSES = ["envoye", "repondu", "rdv", "client"];
const HS_STATUS: Record<string, string> = { envoye: "ATTEMPTED_TO_CONTACT", repondu: "CONNECTED", rdv: "OPEN_DEAL", client: "OPEN_DEAL" };
const splitName = (n: string) => { const p = n.trim().split(/\s+/); return { first: p[0] ?? "", last: p.slice(1).join(" ") }; };
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

async function pushHubspot(token: string, p: Prospect & { crm_ids: Record<string, string> }) {
  const ids = { ...p.crm_ids };
  const { first, last } = splitName(p.contact_name || "");
  if (!ids.hs_company) {
    const r = await hub(token, "/crm/v3/objects/companies", "POST", { properties: { name: p.org || p.name, domain: hostOf(p.website), city: p.city, zip: p.postal_code, address: p.address, phone: p.phone } });
    if (r.ok) ids.hs_company = String(r.data.id);
  }
  if (p.email) {
    const props = { email: p.email, firstname: first, lastname: last, company: p.name, phone: p.phone, website: p.website, city: p.city, jobtitle: p.contact_role, hs_lead_status: HS_STATUS[p.status] ?? "OPEN" };
    if (!ids.hs_contact) {
      let r = await hub(token, "/crm/v3/objects/contacts", "POST", { properties: props });
      if (r.status === 409) { const m = String(r.data?.message ?? "").match(/Existing ID:\s*(\d+)/); if (m) ids.hs_contact = m[1]; }
      else if (r.ok) ids.hs_contact = String(r.data.id);
      if (ids.hs_contact && ids.hs_company) r = await hub(token, `/crm/v4/objects/contacts/${ids.hs_contact}/associations/default/companies/${ids.hs_company}`, "PUT");
    } else await hub(token, `/crm/v3/objects/contacts/${ids.hs_contact}`, "PATCH", { properties: { hs_lead_status: props.hs_lead_status } });
  }
  if (["rdv", "client"].includes(p.status)) {
    const props = { dealname: `${p.name} – Kairo`, pipeline: "default", dealstage: p.status === "client" ? "closedwon" : "appointmentscheduled", ...(p.deal_value ? { amount: String(p.deal_value) } : {}) };
    if (!ids.hs_deal) {
      const assoc = [
        ...(ids.hs_contact ? [{ to: { id: ids.hs_contact }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }] }] : []),
        ...(ids.hs_company ? [{ to: { id: ids.hs_company }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 5 }] }] : []),
      ];
      const r = await hub(token, "/crm/v3/objects/deals", "POST", { properties: props, associations: assoc });
      if (r.ok) ids.hs_deal = String(r.data.id);
    } else await hub(token, `/crm/v3/objects/deals/${ids.hs_deal}`, "PATCH", { properties: props });
  }
  return ids;
}

async function pushPipedrive(token: string, p: Prospect & { crm_ids: Record<string, string> }) {
  const ids = { ...p.crm_ids };
  if (!ids.pd_org) {
    const r = await pipe(token, "/organizations", "POST", { name: p.org || p.name, address: [p.address, p.postal_code, p.city].filter(Boolean).join(" ") });
    if (r.data?.success) ids.pd_org = String(r.data.data.id);
  }
  if (!ids.pd_person && (p.email || p.contact_name)) {
    const r = await pipe(token, "/persons", "POST", { name: p.contact_name || p.name, org_id: ids.pd_org ? Number(ids.pd_org) : undefined, email: p.email ? [{ value: p.email, primary: true }] : undefined, phone: p.phone ? [{ value: p.phone, primary: true }] : undefined });
    if (r.data?.success) ids.pd_person = String(r.data.data.id);
  }
  if (["rdv", "client"].includes(p.status)) {
    const body = { title: `${p.name} – Kairo`, org_id: ids.pd_org ? Number(ids.pd_org) : undefined, person_id: ids.pd_person ? Number(ids.pd_person) : undefined, value: p.deal_value ?? undefined, currency: "EUR", status: p.status === "client" ? "won" : "open" };
    if (!ids.pd_deal) { const r = await pipe(token, "/deals", "POST", body); if (r.data?.success) ids.pd_deal = String(r.data.data.id); }
    else await pipe(token, `/deals/${ids.pd_deal}`, "PUT", { status: body.status, value: body.value });
  }
  if (p.status === "repondu" && ids.pd_person && !ids.pd_note) {
    const r = await pipe(token, "/notes", "POST", { content: `A répondu à la prospection Kairo (${p.activity}, ${p.city}).`, person_id: Number(ids.pd_person), org_id: ids.pd_org ? Number(ids.pd_org) : undefined });
    if (r.data?.success) ids.pd_note = String(r.data.data.id);
  }
  return ids;
}

/** Envoie au CRM les prospects dont le statut a avancé depuis la dernière synchro. */
export async function syncCrm(ws: Workspace, max = 25) {
  if (!ws.integrations?.hubspot?.ok && !ws.integrations?.pipedrive?.ok) return { synced: 0 };
  const { data: sec } = await admin.from("workspace_secrets").select("hubspot_token, pipedrive_token").eq("workspace_id", ws.id).maybeSingle();
  const { data } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).in("status", SYNC_STATUSES).order("updated_at", { ascending: false }).limit(300);
  const todo = (data ?? []).filter((p) => (p.crm_ids?.synced_status ?? "") !== p.status).slice(0, max);
  let n = 0;
  const errors: string[] = [];
  for (const p of todo) {
    let ids = { ...(p.crm_ids ?? {}) };
    try {
      if (ws.integrations?.hubspot?.ok && sec?.hubspot_token) ids = await pushHubspot(sec.hubspot_token, { ...p, crm_ids: ids });
      if (ws.integrations?.pipedrive?.ok && sec?.pipedrive_token) ids = await pushPipedrive(sec.pipedrive_token, { ...p, crm_ids: ids });
      ids.synced_status = p.status;
      await admin.from("prospects").update({ crm_ids: ids }).eq("id", p.id);
      n++;
    } catch (e) { errors.push(String((e as Error).message).slice(0, 120)); }
  }
  if (n) await log(ws.id, "crm", `${n} fiche${n > 1 ? "s" : ""} envoyée${n > 1 ? "s" : ""} au CRM`);
  return { synced: n, errors: errors.slice(0, 3) };
}

/** Envoie une seule fiche au CRM (ex. depuis le Radar), quel que soit son statut. */
export async function pushOneToCrm(ws: Workspace, prospectId: string) {
  if (!ws.integrations?.hubspot?.ok && !ws.integrations?.pipedrive?.ok) throw new HttpError(400, "Aucun CRM connecté : branche HubSpot ou Pipedrive dans Réglages → Connexions");
  const { data: sec } = await admin.from("workspace_secrets").select("hubspot_token, pipedrive_token").eq("workspace_id", ws.id).maybeSingle();
  const { data: p } = await admin.from("prospects").select("*").eq("id", prospectId).eq("workspace_id", ws.id).single();
  if (!p) throw new HttpError(404, "Prospect introuvable");
  let ids = { ...(p.crm_ids ?? {}) };
  if (ws.integrations?.hubspot?.ok && sec?.hubspot_token) ids = await pushHubspot(sec.hubspot_token, { ...p, crm_ids: ids });
  if (ws.integrations?.pipedrive?.ok && sec?.pipedrive_token) ids = await pushPipedrive(sec.pipedrive_token, { ...p, crm_ids: ids });
  await admin.from("prospects").update({ crm_ids: ids }).eq("id", p.id);
  await log(ws.id, "crm", `${p.name} envoyée au CRM depuis le Radar`);
  return { ok: true };
}

// =====================================================================
// Agenda : flux iCal à ajouter dans Google Agenda ou Outlook
// =====================================================================
export async function calendarFeed(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw new HttpError(404, "Agenda introuvable");
  const { data: ws } = await admin.from("workspaces").select("id, name, profile").eq("calendar_token", token).maybeSingle();
  if (!ws) throw new HttpError(404, "Agenda introuvable");
  const since = new Date(Date.now() - 60 * 864e5).toISOString();
  const { data: ms } = await admin.from("meetings").select("id, starts_at, ends_at, contact_name, contact_email, contact_phone, company, notes, status, updated_at:created_at")
    .eq("workspace_id", ws.id).gte("starts_at", since).order("starts_at").limit(500);
  const f = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const c = (s: string) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const fold = (line: string) => line.length <= 74 ? line : line.match(/.{1,73}/g)!.join("\r\n ");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kairo//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${c(`Kairo · ${ws.profile?.nom || ws.name}`)}`, "X-WR-TIMEZONE:Europe/Paris", "REFRESH-INTERVAL;VALUE=DURATION:PT30M"];
  for (const m of ms ?? []) {
    lines.push("BEGIN:VEVENT", `UID:${m.id}@kairo`, `DTSTAMP:${f(m.updated_at)}`, `DTSTART:${f(m.starts_at)}`, `DTEND:${f(m.ends_at)}`,
      fold(`SUMMARY:${c(`RDV ${m.company} · ${m.contact_name}`)}`),
      fold(`DESCRIPTION:${c([`Contact : ${m.contact_name} <${m.contact_email}>`, m.contact_phone && `Téléphone : ${m.contact_phone}`, m.notes && `Notes : ${m.notes}`].filter(Boolean).join("\n"))}`),
      `STATUS:${m.status === "annule" ? "CANCELLED" : "CONFIRMED"}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// =====================================================================
// Abonnements Stripe
// =====================================================================
async function stripe(path: string, params?: Record<string, string>, method = "POST") {
  const key = env("STRIPE_SECRET_KEY");
  if (!key) throw new HttpError(503, "Le paiement en ligne n'est pas encore activé : contacte le support Kairo.");
  const body = params ? new URLSearchParams(params).toString() : undefined;
  const r = await fetch(`https://api.stripe.com/v1${path}`, { method, headers: { Authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" }, body: method === "GET" ? undefined : body });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(502, "Paiement : " + (data?.error?.message ?? r.status));
  return data;
}

export function plans() {
  return Object.entries(PLANS).filter(([k]) => !["essai", "fondateur"].includes(k)).map(([key, p]) => ({ key, ...p }));
}

export const ANNUAL_OFF = 0.2;
export async function checkout(ws: Workspace, userId: string, planKey: string, yearly = false) {
  await requireAdmin(ws.id, userId);
  const p = PLANS[planKey];
  if (!p || !p.price) throw new HttpError(400, "Formule inconnue");
  let customer = ws.stripe_customer;
  if (!customer) {
    const { data: u } = await admin.auth.admin.getUserById(userId);
    const c = await stripe("/customers", { email: u?.user?.email ?? "", name: ws.legal_name || ws.profile?.nom || ws.name, "metadata[workspace_id]": ws.id, "preferred_locales[0]": "fr" });
    customer = c.id;
    await admin.from("workspaces").update({ stripe_customer: customer }).eq("id", ws.id);
  }
  if (ws.stripe_subscription && ["active", "trialing", "past_due"].includes(ws.plan_status)) return await portal(ws, userId);
  const s = await stripe("/checkout/sessions", {
    mode: "subscription", customer, locale: "fr",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(yearly ? Math.round(p.price * 12 * (1 - ANNUAL_OFF)) * 100 : p.price * 100),
    "line_items[0][price_data][recurring][interval]": yearly ? "year" : "month",
    "line_items[0][price_data][product_data][name]": `Bingoo! ${p.label}${yearly ? " (annuel)" : ""}`,
    "line_items[0][price_data][tax_behavior]": "exclusive",
    "metadata[workspace_id]": ws.id, "metadata[plan]": planKey, "metadata[periode]": yearly ? "annuel" : "mensuel",
    "subscription_data[metadata][workspace_id]": ws.id, "subscription_data[metadata][plan]": planKey,
    allow_promotion_codes: "true", billing_address_collection: "required",
    "tax_id_collection[enabled]": "true", "customer_update[name]": "auto", "customer_update[address]": "auto",
    success_url: `${APP(ws)}/#/abonnement?paiement=ok`, cancel_url: `${APP(ws)}/#/abonnement?paiement=annule`,
  });
  return { url: s.url };
}

/** Achat d'une recharge IA (paiement unique). Créditée à la confirmation du paiement par Stripe. */
export async function recharge(ws: Workspace, userId: string, packKey: string) {
  const p = PACKS[packKey];
  if (!p) throw new HttpError(400, "Recharge inconnue");
  let customer = ws.stripe_customer;
  if (!customer) {
    const { data: u } = await admin.auth.admin.getUserById(userId);
    const c = await stripe("/customers", { email: u?.user?.email ?? "", name: ws.legal_name || ws.profile?.nom || ws.name, "metadata[workspace_id]": ws.id, "preferred_locales[0]": "fr" });
    customer = c.id;
    await admin.from("workspaces").update({ stripe_customer: customer }).eq("id", ws.id);
  }
  const s = await stripe("/checkout/sessions", {
    mode: "payment", customer, locale: "fr",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(p.price * 100),
    "line_items[0][price_data][product_data][name]": `Bingoo! ${p.label} : ${p.work}`,
    "line_items[0][price_data][tax_behavior]": "exclusive",
    "metadata[workspace_id]": ws.id, "metadata[kind]": "recharge", "metadata[pack]": packKey,
    "invoice_creation[enabled]": "true", billing_address_collection: "required", "tax_id_collection[enabled]": "true",
    "customer_update[name]": "auto", "customer_update[address]": "auto",
    success_url: `${APP(ws)}/#/abonnement?recharge=ok`, cancel_url: `${APP(ws)}/#/abonnement?recharge=annule`,
  });
  return { url: s.url };
}

export async function portal(ws: Workspace, userId: string) {
  await requireAdmin(ws.id, userId);
  if (!ws.stripe_customer) throw new HttpError(400, "Aucun abonnement pour l'instant");
  const s = await stripe("/billing_portal/sessions", { customer: ws.stripe_customer, return_url: `${APP(ws)}/#/abonnement`, locale: "fr" });
  return { url: s.url };
}

async function verifyStripe(raw: string, header: string) {
  const secret = env("STRIPE_WEBHOOK_SECRET");
  if (!secret) throw new HttpError(503, "Secret webhook Stripe manquant");
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  const sigs = header.split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3));
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > 300) throw new HttpError(400, "Signature Stripe invalide");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (!sigs.includes(hex)) throw new HttpError(400, "Signature Stripe invalide");
}

export async function stripeWebhook(req: Request) {
  const raw = await req.text();
  await verifyStripe(raw, req.headers.get("stripe-signature") ?? "");
  const ev = JSON.parse(raw);
  const o = ev.data?.object ?? {};
  const wsId = o.metadata?.workspace_id ?? o.subscription_details?.metadata?.workspace_id ?? "";
  const byCustomer = async () => (await admin.from("workspaces").select("id").eq("stripe_customer", String(o.customer ?? "")).maybeSingle()).data?.id ?? "";
  const id = wsId || await byCustomer();
  if (!id) return { skipped: "espace inconnu" };
  if (ev.type === "checkout.session.completed" && o.metadata?.kind === "recharge") {
    // Recharge IA : créditée une seule fois par paiement, seulement s'il est réglé
    const p = PACKS[String(o.metadata?.pack ?? "")];
    if (!p || o.payment_status !== "paid") return { skipped: "recharge non réglée" };
    const { error } = await admin.from("ai_topups").insert({ workspace_id: id, pack: String(o.metadata.pack), paid_eur: p.price, credit_eur: p.credit, stripe_session: String(o.id) });
    if (!error) await log(id, "abonnement", `${p.label} achetée : ${p.work}`);
    return { ok: true };
  }
  if (ev.type === "checkout.session.completed") {
    // Paiement différé (prélèvement SEPA…) : l'abonnement n'est activé qu'une fois réglé (invoice.paid ou async_payment_succeeded)
    const paid = o.payment_status === "paid" || o.payment_status === "no_payment_required";
    const plan = PLANS[String(o.metadata?.plan ?? "")] && !["essai", "fondateur"].includes(String(o.metadata?.plan)) ? String(o.metadata.plan) : "solo";
    if (!paid) {
      await admin.from("workspaces").update({ plan, plan_status: "incomplete", stripe_subscription: String(o.subscription ?? ""), stripe_customer: String(o.customer ?? "") }).eq("id", id).neq("plan", "fondateur");
      await log(id, "abonnement", "Paiement en cours de validation : l'abonnement démarre dès qu'il est confirmé");
      return { ok: true, pending: true };
    }
    await admin.from("workspaces").update({ plan, plan_status: "active", stripe_subscription: String(o.subscription ?? ""), stripe_customer: String(o.customer ?? ""), trial_ends: null }).eq("id", id);
    await log(id, "abonnement", `Abonnement ${PLANS[o.metadata?.plan]?.label ?? ""} activé`);
  } else if (ev.type.startsWith("customer.subscription.")) {
    const status = ev.type === "customer.subscription.deleted" ? "canceled" : String(o.status ?? "active");
    const end = o.current_period_end ?? o.items?.data?.[0]?.current_period_end;
    await admin.from("workspaces").update({ plan_status: status, ...(o.metadata?.plan && status !== "canceled" ? { plan: o.metadata.plan } : {}), stripe_subscription: String(o.id ?? ""), period_end: end ? new Date(end * 1000).toISOString() : null }).eq("id", id);
    if (status === "canceled") await log(id, "abonnement", "Abonnement arrêté");
  } else if (ev.type === "checkout.session.async_payment_succeeded") {
    await admin.from("workspaces").update({ plan_status: "active", trial_ends: null }).eq("id", id).neq("plan", "fondateur");
    await log(id, "abonnement", "Paiement confirmé : abonnement activé");
  } else if (ev.type === "checkout.session.async_payment_failed") {
    await admin.from("workspaces").update({ plan_status: "incomplete_expired" }).eq("id", id).neq("plan", "fondateur");
    await log(id, "abonnement", "Le paiement n'a pas abouti : choisis à nouveau ta formule");
  } else if (ev.type === "invoice.payment_failed" && o.subscription) {
    await admin.from("workspaces").update({ plan_status: "past_due" }).eq("id", id);
    await log(id, "abonnement", "Paiement refusé : carte à mettre à jour");
  } else if (ev.type === "invoice.paid" && o.subscription) {
    await admin.from("workspaces").update({ plan_status: "active" }).eq("id", id).neq("plan", "fondateur");
  }
  return { ok: true };
}
