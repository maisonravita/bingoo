// Envoi par l'API Resend, depuis le domaine vérifié de l'espace.
import { HttpError } from "./http.ts";
import { admin, env, PLATFORM_DOMAIN, type Workspace } from "./core.ts";
import { smtpSend } from "./growth.ts";
import { gmailSend, outlookSend } from "./oauth.ts";

export async function resend(path: string, method = "GET", body?: unknown, extra: Record<string, string> = {}) {
  const key = env("RESEND_API_KEY");
  if (!key) throw new HttpError(500, "Clé RESEND_API_KEY manquante dans les secrets Supabase");
  const res = await fetch(`https://api.resend.com${path}`, {
    method, headers: { Authorization: `Bearer ${key}`, "content-type": "application/json", ...extra },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

export function brand(ws: Workspace) { return ws.profile?.nom || ws.name || "Notre entreprise"; }
export function signature(ws: Workspace) { return ws.signature?.trim() || `${ws.sender_name}\n${brand(ws)}`; }

/** Adresse de réponse : suivie par la machine si le domaine de réponse est actif. */
export function replyAddress(ws: Workspace, token?: string) {
  if (!token) return ws.integrations?.mailbox?.ok ? ws.integrations.mailbox.email : ws.sender_email;
  if (ws.reply_status === "verified" && ws.reply_domain) return `r-${token}@${ws.reply_domain}`;
  const platform = PLATFORM_DOMAIN();
  return platform ? `r-${token}@${platform}` : ws.integrations?.mailbox?.ok ? ws.integrations.mailbox.email : ws.sender_email;
}

/** Adresse où prévenir l'équipe : l'expéditeur, sinon le propriétaire de l'espace. */
export async function teamAddress(ws: Workspace) {
  if (ws.integrations?.mailbox?.ok) return ws.integrations.mailbox.email;
  if (ws.sender_email) return ws.sender_email;
  const { data } = await admin.from("members").select("email").eq("workspace_id", ws.id).eq("role", "owner").limit(1).maybeSingle();
  return data?.email ?? "";
}

/** E-mail de service envoyé par Bingoo! (notifications, invitations), depuis le domaine de la plateforme. */
export async function sendSystem(m: { to: string; subject: string; text: string; html?: string; replyTo?: string; fromName?: string; ics?: string; key?: string }) {
  const from = env("SYSTEM_FROM", `notifications@${PLATFORM_DOMAIN()}`);
  const r = await resend("/emails", "POST", {
    from: `${m.fromName ?? "Bingoo!"} <${from}>`, to: [m.to], reply_to: m.replyTo, subject: m.subject, text: m.text, ...(m.html ? { html: m.html } : {}),
    attachments: m.ics ? [{ filename: "invitation.ics", content: b64(m.ics), content_type: "text/calendar; method=REQUEST" }] : undefined,
  }, m.key ? { "Idempotency-Key": `bingoo-${m.key}` } : {});
  if (!r.ok) throw new HttpError(502, "Notification : " + (r.data?.message ?? r.status));
  return { id: String(r.data?.id ?? "") };
}

export function canSend(ws: Workspace) {
  if (ws.integrations?.mailbox?.ok) {
    if (!ws.postal_address) throw new HttpError(400, "Ajoute l'adresse postale de l'entreprise dans Réglages (obligatoire en pied de mail)");
    return;
  }
  if (ws.integrations?.mailbox && !ws.integrations.mailbox.ok) throw new HttpError(400, "Ta boîte mail a été déconnectée (mot de passe changé ?) : reconnecte-la dans Réglages");
  if (ws.domain_status !== "verified") throw new HttpError(400, "Ton domaine d'envoi n'est pas encore vérifié (Réglages → Domaine)");
  if (!ws.sender_email.toLowerCase().endsWith("@" + ws.domain)) throw new HttpError(400, `L'adresse d'expédition doit se terminer par @${ws.domain}`);
  if (!ws.postal_address) throw new HttpError(400, "Ajoute l'adresse postale de l'entreprise dans Réglages (obligatoire en pied de mail)");
}

/** Identifiant de message stable : le même e-mail renvoyé par erreur porte le même identifiant (doublon reconnaissable). */
export function messageIdFor(key: string, from: string) {
  return `<bingoo-${key}@${(from.split("@")[1] ?? "bingoo.local").replace(/[>\s]/g, "")}>`;
}

/** key : identifiant du message en base. Garantit qu'un même e-mail n'est accepté qu'une fois par Resend (24 h)
 *  et qu'il porte toujours le même Message-ID (rapprochement des réponses et des rebonds dans la boîte). */
export async function sendMail(ws: Workspace, m: { to: string; subject: string; text: string; replyTo?: string; prospecting?: boolean; ics?: string; fromName?: string; key?: string; parentKey?: string }) {
  const footer = m.prospecting
    ? `${brand(ws)}${ws.postal_address ? ` · ${ws.postal_address}` : ""}\nPour ne plus recevoir de messages de notre part, répondez simplement « STOP »${ws.app_url ? ` ou rendez-vous sur ${ws.app_url.replace(/\/$/, "")}/#/opposition` : ""}.`
    : "";
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">${m.text.split(/\n{2,}/).map((x) => `<p style="margin:0 0 14px">${esc(x).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>")}</p>`).join("")}${footer ? `<p style="margin:28px 0 0;font-size:12px;color:#888">${esc(footer).replace(/\n/g, "<br>")}</p>` : ""}</div>`;
  const text = footer ? `${m.text}\n\n--\n${footer}` : m.text;
  if (ws.integrations?.mailbox?.ok) {
    const viaOauth = (ws.integrations.mailbox as { via?: string }).via === "oauth";
    const viaGoogle = viaOauth && ws.integrations.mailbox.provider === "google", viaMicrosoft = viaOauth && ws.integrations.mailbox.provider === "microsoft";
    return await (viaGoogle ? gmailSend : viaMicrosoft ? outlookSend : smtpSend)(ws, {
      from: `${m.fromName ?? ws.sender_name} <${ws.integrations.mailbox.email}>`, to: m.to,
      replyTo: m.replyTo ?? ws.integrations.mailbox.email, subject: m.subject, text, html,
      headers: m.prospecting ? { "List-Unsubscribe": `<mailto:${m.replyTo ?? ws.integrations.mailbox.email}?subject=STOP>` } : undefined,
      attachments: m.ics ? [{ filename: "invitation.ics", content: m.ics, contentType: "text/calendar; method=REQUEST" }] : undefined,
      messageId: m.key ? messageIdFor(m.key, ws.integrations.mailbox.email) : undefined,
      // Relance : dans le même fil que le premier message (le prospect et sa messagerie la voient comme une suite)
      ...(m.parentKey ? { inReplyTo: messageIdFor(m.parentKey, ws.integrations.mailbox.email), references: [messageIdFor(m.parentKey, ws.integrations.mailbox.email)] } : {}),
    });
  }
  const r = await resend("/emails", "POST", {
    from: `${m.fromName ?? ws.sender_name} <${ws.sender_email}>`,
    to: [m.to],
    reply_to: m.replyTo ?? ws.sender_email,
    subject: m.subject,
    text,
    html,
    headers: m.prospecting ? { "List-Unsubscribe": `<mailto:${m.replyTo ?? ws.sender_email}?subject=STOP>` } : undefined,
    attachments: m.ics ? [{ filename: "invitation.ics", content: b64(m.ics), content_type: "text/calendar; method=REQUEST" }] : undefined,
  }, m.key ? { "Idempotency-Key": `bingoo-${m.key}` } : {});
  if (!r.ok) throw new HttpError(502, "Envoi : " + (r.data?.message ?? r.status));
  return { id: String(r.data?.id ?? "") };
}

export function buildIcs(o: { uid: string; start: Date; end: Date; summary: string; description: string; location: string; organizerName: string; organizerEmail: string; attendeeName: string; attendeeEmail: string }) {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const c = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bingoo//FR", "METHOD:REQUEST", "BEGIN:VEVENT",
    `UID:${o.uid}@kairo`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(o.start)}`, `DTEND:${f(o.end)}`,
    `SUMMARY:${c(o.summary)}`, `DESCRIPTION:${c(o.description)}`, `LOCATION:${c(o.location)}`,
    `ORGANIZER;CN=${c(o.organizerName)}:mailto:${o.organizerEmail}`,
    `ATTENDEE;CN=${c(o.attendeeName || o.attendeeEmail)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${o.attendeeEmail}`,
    "STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}
