// Lecture de la boîte du client (IMAP, même mot de passe d'application que l'envoi) :
// rebonds et réponses écrites directement à l'adresse d'envoi. Les e-mails Bingoo portent un
// Message-ID <bingoo-{id du message}@domaine> : le rapprochement est exact, sans deviner.
import { admin, log, type Prospect, type Workspace } from "./core.ts";
import { open } from "./growth.ts";
import { gmailRecent } from "./oauth.ts";

export const IMAP_HOSTS: Record<string, string> = {
  gmail: "imap.gmail.com", ovh: "ssl0.ovh.net", ionos: "imap.ionos.fr", zoho: "imap.zoho.eu",
};

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Identifiants Bingoo cités dans un texte (Message-ID, In-Reply-To, References, message d'origine joint). */
export function bingooIds(text: string): string[] {
  return [...new Set([...text.matchAll(new RegExp(`<bingoo-(${UUID})@`, "gi"))].map((m) => m[1].toLowerCase()))];
}

/** En-tête simple (première occurrence, lignes repliées recollées). */
export function header(raw: string, name: string): string {
  const head = raw.split(/\r?\n\r?\n/)[0].replace(/\r?\n[ \t]+/g, " ");
  return head.match(new RegExp(`^${name}:\\s*(.*)$`, "im"))?.[1]?.trim() ?? "";
}

/** Avis de non-remise (Gmail, Outlook, serveurs classiques). */
export function isBounce(raw: string): boolean {
  const from = header(raw, "From"), subject = header(raw, "Subject"), type = header(raw, "Content-Type");
  return /mailer-daemon|postmaster|mail delivery (sub)?system|microsoftexchange/i.test(from)
    || /report-type=delivery-status/i.test(type)
    || /(delivery status notification|undeliverable|undelivered|non remis|non distribu|échec de la remise|failure notice|returned mail|address not found)/i.test(subject);
}

/** Adresses refusées citées dans l'avis. */
export function failedRecipients(raw: string): string[] {
  const out = new Set<string>();
  for (const m of raw.matchAll(/^(?:Final-Recipient|Original-Recipient):\s*rfc822;\s*<?([^\s>]+@[^\s>]+)>?/gim)) out.add(m[1].toLowerCase());
  const x = header(raw, "X-Failed-Recipients");
  for (const e of x.split(/[,\s]+/).filter((v) => v.includes("@"))) out.add(e.toLowerCase());
  return [...out];
}

/** Une réponse à un e-mail Bingoo : son identifiant est dans In-Reply-To ou References. */
export function replyTo(raw: string): string | null {
  const ids = bingooIds(`${header(raw, "In-Reply-To")} ${header(raw, "References")}`);
  return ids[0] ?? null;
}

/** Corps texte approximatif d'un message brut (partie text/plain si présente, sinon HTML nettoyé). */
export function plainText(raw: string): string {
  const body = raw.split(/\r?\n\r?\n/).slice(1).join("\n\n");
  const part = body.match(/Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--[^\r\n]+)/i)?.[1] ?? body;
  const qp = /quoted-printable/i.test(raw) ? part.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) : part;
  return qp.replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, 8000);
}

/** Rebond confirmé : même traitement que le webhook de rebond (prospect remis en enquête, brouillons annulés). */
async function applyBounce(messageId: string) {
  const { data: m } = await admin.from("messages").select("id, prospect_id, workspace_id, bounced").eq("id", messageId).maybeSingle();
  if (!m || m.bounced) return false;
  await admin.from("messages").update({ bounced: true }).eq("id", m.id);
  await admin.from("prospects").update({ email: "", status: "sans_email", channel: "", enrich_level: 1, enrich_note: "L'adresse e-mail n'existe plus (rebond détecté dans la boîte) : nouvelle enquête nécessaire" }).eq("id", m.prospect_id);
  await admin.from("messages").update({ status: "ignore", error: "Adresse en rebond" }).eq("prospect_id", m.prospect_id).eq("status", "brouillon");
  await log(m.workspace_id, "envoi", "Rebond détecté dans ta boîte : adresse retirée, le prospect repart en enquête");
  return true;
}

type ReplyHandler = (ws: Workspace, p: Prospect, input: { fromEmail: string; fromName?: string; subject?: string; text: string }) => Promise<unknown>;

/** Traite un message brut : rebond ou réponse à un e-mail Bingoo. */
async function handleRaw(ws: Workspace, raw: string, res: { lus: number; rebonds: number; reponses: number }, onReply: ReplyHandler) {
  res.lus++;
  if (isBounce(raw)) {
    for (const id of bingooIds(raw)) if (await applyBounce(id)) res.rebonds++;
    return;
  }
  const id = replyTo(raw);
  if (!id) return;
  const { data: m } = await admin.from("messages").select("prospect_id, prospects(*)").eq("id", id).eq("workspace_id", ws.id).maybeSingle();
  const p = (m as unknown as { prospects: Prospect | null } | null)?.prospects;
  if (!p) return;
  const fromRaw = header(raw, "From"), fromEmail = (fromRaw.match(/<([^>]+)>/)?.[1] ?? fromRaw).trim().toLowerCase();
  // Déjà reçue par l'adresse de réponse Bingoo ? On ne la traite pas deux fois.
  const { count } = await admin.from("replies").select("id", { count: "exact", head: true }).eq("prospect_id", p.id).eq("from_email", fromEmail).gte("created_at", new Date(Date.now() - 3 * 864e5).toISOString());
  if (count) return;
  await onReply(ws, p, { fromEmail, fromName: fromRaw.replace(/<[^>]+>/, "").replace(/"/g, "").trim(), subject: header(raw, "Subject"), text: plainText(raw) });
  res.reponses++;
}

/** Relève de la boîte depuis le dernier passage (50 messages max par passage) : API Gmail si connectée par Google, sinon IMAP. */
export async function pollInbox(ws: Workspace, onReply: ReplyHandler) {
  const box = ws.integrations?.mailbox as ({ ok: boolean; provider: string; via?: string; imap_at?: string } | undefined);
  const res = { lus: 0, rebonds: 0, reponses: 0 };
  const since = new Date(box?.imap_at ?? Date.now() - 3 * 864e5);
  const done = async () => {
    const integrations = { ...(ws.integrations ?? {}), mailbox: { ...box, imap_at: new Date().toISOString() } };
    await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
    return res;
  };
  if (box?.ok && box.via === "oauth" && box.provider === "google") {
    for (const raw of await gmailRecent(ws, since)) await handleRaw(ws, raw, res, onReply);
    return await done();
  }
  if (!box?.ok || !IMAP_HOSTS[box.provider]) return { skipped: "pas de boîte lisible" };
  const { data: sec } = await admin.from("workspace_secrets").select("smtp").eq("workspace_id", ws.id).maybeSingle();
  const s = sec?.smtp as { user?: string; pass?: string } | undefined;
  if (!s?.user || !s.pass) return { skipped: "identifiants absents" };
  const { ImapFlow } = await import("npm:imapflow@1.0.164");
  const client = new ImapFlow({ host: IMAP_HOSTS[box.provider], port: 993, secure: true, auth: { user: s.user, pass: await open(s.pass) }, logger: false });
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = ((await client.search({ since }, { uid: true })) || []).slice(-50);
      for await (const msg of client.fetch(uids, { source: { maxLength: 200000 } as unknown as boolean, uid: true }, { uid: true })) {
        await handleRaw(ws, msg.source?.toString("utf8") ?? "", res, onReply);
      }
    } finally { lock.release(); }
  } finally { await client.logout().catch(() => null); }
  return await done();
}
