// V2 / V3 : réponses, rendez-vous, devis, analyses IA, appels, concurrents, pilote automatique.
import { HttpError } from "./http.ts";
import { admin, ask, askJson, log, PLATFORM_DOMAIN, setAi, repliesTracked, sendReady, type Prospect, type Workspace } from "./core.ts";
import { warmup } from "./growth.ts";
import { brand, buildIcs, canSend, replyAddress, resend, sendMail, sendSystem, signature, teamAddress } from "./mail.ts";
import { rivalsOf, systemFor } from "./agents.ts";
import { humanize, PLAYBOOK_REPONSES } from "./playbooks.ts";
import { freeSlots, frSlot, pickThree } from "./time.ts";

const WEB = (n: number) => [{ type: "web_search_20250305", name: "web_search", max_uses: n, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }];

/** Adresse de l'application (enregistrée par l'interface), avec le # des routes. */
export function baseOf(ws: Workspace) {
  return ws.app_url ? `${ws.app_url.replace(/\/$/, "")}/#` : "";
}
export function bookingUrl(ws: Workspace, base: string, token?: string) {
  return base ? `${base}/rdv/${ws.booking_slug}${token ? `?t=${token}` : ""}` : "";
}

// ================================================================ Réponses
export const CLASSES: Record<string, string> = {
  interesse: "Intéressé", question: "Question", prix: "Demande de prix", rappel: "Demande de rappel",
  plus_tard: "Plus tard", objection: "Objection", mauvais_contact: "Mauvais interlocuteur",
  pas_interesse: "Pas intéressé", stop: "Opposition", absence: "Absence", autre: "Autre",
};

/** Formules d'opposition en tête de réponse : désinscription immédiate. */
export const OPT_OUT = /^\s*(stop\b|d[ée]sinscri|unsubscribe|ne (plus )?me (plus )?contacter|retirez[- ]moi)/i;

export function stripQuoted(text: string): string {
  const out: string[] = [];
  for (const l of (text || "").replace(/\r/g, "").split("\n")) {
    if (/^\s*>/.test(l) || /^\s*(Le|On) .{5,200}(a écrit|wrote)\s*:?\s*$/i.test(l) || /^-{2,}\s*(Original|Message d'origine)/i.test(l) || /^\s*_{8,}\s*$/.test(l) || /^\s*(De|From)\s*:\s*.+@/i.test(l)) break;
    if (/^\s*(Envoyé (à partir|de mon)|Sent from|Obtenir Outlook)/i.test(l)) continue;
    out.push(l);
  }
  return out.join("\n").trim().slice(0, 6000);
}

/** Le prospect cite un concurrent suivi par Espion : on donne au rédacteur l'argumentaire et les réponses prévues. */
async function rivalReplyBrief(wsId: string, text: string) {
  const t = text.toLowerCase();
  const r = (await rivalsOf(wsId)).find((x) => t.includes(x.name.toLowerCase()) || t.includes(x.host.split(".")[0]));
  if (!r) return "";
  return `\n\nLe prospect mentionne ${r.name} (concurrent suivi par Espion). Positionnement : ${r.pitch}${r.objections.length ? `\nRéponses prévues : ${r.objections.map((o) => `« ${o.objection} » → ${o.reponse}`).join(" | ")}` : ""}\nNe dénigre jamais ${r.name}.`;
}

export async function handleReply(ws: Workspace, p: Prospect | null, input: { fromEmail: string; fromName?: string; subject?: string; text: string }, base = "") {
  const text = stripQuoted(input.text);
  // Même e-mail reçu deux fois (adresse de réponse Bingoo et boîte du client) : traité une seule fois
  const norm = text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 400);
  const dk = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${input.fromEmail.trim().toLowerCase()}|${norm}`)))).map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 40);
  {
    const { data: dup } = await admin.from("replies").select("id, class, summary, needs_human").eq("workspace_id", ws.id).eq("dedupe_key", dk).maybeSingle();
    if (dup) return { id: dup.id, classe: dup.class, label: CLASSES[dup.class] ?? dup.class, needs_human: dup.needs_human, summary: dup.summary, duplicate: true };
  }
  type V = { classe: string; resume: string; besoin_humain: boolean; nouveau_contact?: string; rappel_date?: string };
  // Opposition explicite : traitée sans IA, immédiatement et sans risque d'erreur
  const optOut = OPT_OUT;
  // Plafond anti-abus : au-delà de 5 messages du même expéditeur dans la journée, classement sans IA (à traiter à la main)
  const day0 = new Date(); day0.setUTCHours(0, 0, 0, 0);
  const { count: today } = await admin.from("replies").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).ilike("from_email", input.fromEmail.replace(/[%_\\]/g, "\\$&")).gte("created_at", day0.toISOString());
  const flood = (today ?? 0) >= 5;
  const isStop = optOut.test(text.slice(0, 80)) || optOut.test(String(input.subject ?? "").replace(/^(re|tr|fwd?)\s*:\s*/i, ""));
  const v: V = isStop
    ? { classe: "stop", resume: "Demande à ne plus être contacté", besoin_humain: false }
    : flood ? { classe: "autre", resume: "Nombreux messages du même expéditeur aujourd'hui : à lire toi-même", besoin_humain: true }
    : await askJson<V>(`Classe la réponse d'un prospect à un e-mail de prospection de ${brand(ws)} (${ws.profile?.offre ?? ""}).
Classes : ${Object.keys(CLASSES).join(", ")}.
- interesse : accepte un échange ou veut en savoir plus ; question : question précise ; prix : demande un tarif ou un devis ; rappel : demande à être appelé ;
- plus_tard : pas maintenant ; objection : objection sans refus net ; mauvais_contact : indique une autre personne (mets-la dans nouveau_contact) ;
- pas_interesse : refus ; stop : demande à ne plus être contacté ; absence : message automatique.
besoin_humain = true si prix, engagement, plainte, marché public, ou au moindre doute.
rappel_date : date AAAA-MM-JJ si le prospect indique quand revenir vers lui, sinon "". Nous sommes le ${new Date().toISOString().slice(0, 10)}.
Traduis les périodes vagues en date future : « au printemps » → 15 mars, « à la rentrée » → 1er septembre, « en juin » → 1er juin, « l'an prochain » → 15 janvier, « dans 3 mois » → aujourd'hui + 3 mois ; si son contrat se termine à une date, vise 2 mois avant cette fin. Toujours une date après aujourd'hui.

Objet : ${input.subject ?? ""}
Message :
${text}

Format : {"classe": "", "resume": "une phrase", "besoin_humain": true, "nouveau_contact": "", "rappel_date": ""}`, { fast: true, maxTokens: 500 });
  const classe = CLASSES[v.classe] ? v.classe : "autre";
  const needsHuman = !!v.besoin_humain || ["prix", "autre", "mauvais_contact", "objection", "rappel"].includes(classe);

  let reply = { subject: "", body: "" };
  if (p && !flood && ["interesse", "question", "prix", "rappel", "objection", "mauvais_contact"].includes(classe)) {
    const slots = pickThree(await freeSlots(ws, 10)).map(frSlot);
    const link = bookingUrl(ws, base, p.public_token);
    const out = await ask(`Un prospect (${p.name}, ${p.activity}) a répondu à notre e-mail. Rédige la réponse.
Message reçu :
${text}

Consignes :
- Réponds précisément à ce qu'il dit, en 90 mots maximum.
- Si la réponse figure dans la fiche de l'entreprise, réponds précisément avec ces informations. Sinon (prix, délais, détails techniques absents de la fiche), dis que nous en parlerons lors d'un court échange, sans inventer.
- Propose ces créneaux : ${slots.join(" ; ") || "à convenir"}${link ? `, ou le lien pour choisir : ${link}` : ""}.
- Ne mets pas de signature.
Format :
OBJET: Re : ${(input.subject ?? "").replace(/^(re|tr|fwd?)\s*:\s*/i, "")}
---
<corps>`, { fast: true, system: systemFor(ws) + PLAYBOOK_REPONSES + (await rivalReplyBrief(ws.id, text)) });
    const m = out.match(/OBJET\s*:\s*(.+)\n-{3,}\n([\s\S]+)/);
    reply = m ? { subject: m[1].trim(), body: humanize(m[2]) } : { subject: `Re : ${input.subject ?? ""}`, body: humanize(out) };
  }

  const { data: row } = await admin.from("replies").insert({
    workspace_id: ws.id, prospect_id: p?.id ?? null, from_email: input.fromEmail, from_name: input.fromName ?? "",
    subject: input.subject ?? "", body: text, class: classe, summary: v.resume ?? "", needs_human: needsHuman,
    reply_subject: reply.subject, reply_body: reply.body, handled: ["absence", "stop"].includes(classe), dedupe_key: dk,
  }).select("id").single();

  if (p) {
    const patch: Record<string, unknown> = {};
    if (classe !== "absence") {
      await admin.from("messages").update({ status: "ignore", error: "Le prospect a répondu" }).eq("prospect_id", p.id).eq("status", "brouillon").gt("step", 0);
      if (!["rdv", "client"].includes(p.status)) patch.status = "repondu";
    }
    if (classe === "pas_interesse") { patch.status = "refus"; patch.next_action_at = addDays(120); patch.next_action = "Reprendre contact (refus il y a 4 mois)"; }
    if (classe === "stop") { patch.status = "refus"; patch.next_action_at = null; patch.next_action = ""; patch.notes = `${p.notes ? p.notes + "\n" : ""}Opposition à toute sollicitation le ${new Date().toLocaleDateString("fr-FR")}`; }
    if (classe === "plus_tard") { patch.next_action_at = /^\d{4}-\d{2}-\d{2}$/.test(v.rappel_date ?? "") && String(v.rappel_date) > addDays(0) ? v.rappel_date : addDays(30); patch.next_action = "Relancer (a répondu « plus tard »)"; }
    if (["interesse", "question", "prix", "rappel", "objection"].includes(classe)) { patch.next_action_at = addDays(0); patch.next_action = classe === "rappel" ? "Rappeler le prospect" : "Répondre au message reçu"; }
    if (classe === "mauvais_contact" && v.nouveau_contact) patch.notes = `${p.notes ? p.notes + "\n" : ""}Contact indiqué : ${v.nouveau_contact}`;
    if (Object.keys(patch).length) await admin.from("prospects").update(patch).eq("id", p.id);
  }
  // Opposition : liste d'exclusion globale et prospects passés en refus dans tous les espaces (même sans prospect reconnu)
  if (classe === "stop") {
    for (const e of new Set([p?.email, input.fromEmail].map((x) => String(x ?? "").trim().toLowerCase()).filter((x) => x.includes("@")))) {
      const { error } = await admin.rpc("opt_out", { p_email: e });
      if (error) await admin.from("suppressions").upsert({ email: e, source: "reponse STOP" }, { onConflict: "email", ignoreDuplicates: true });
    }
  }
  await log(ws.id, "reponse", `${p?.name ?? input.fromEmail} : ${CLASSES[classe]}`);
  return { id: row?.id, classe, label: CLASSES[classe], needs_human: needsHuman, summary: v.resume };
}

const addDays = (n: number) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);

/** Webhook Resend « email.received » : r-<jeton>@<domaine de réponse>. */
export async function inbound(body: Record<string, unknown>) {
  if (/^email\.(opened|clicked|bounced|complained)$/.test(String(body.type)) && body.data) {
    const { trackEvent } = await import("./campaigns.ts");
    return await trackEvent(String(body.type), body.data as Record<string, unknown>);
  }
  if (body.type !== "email.received" || !body.data) return { skipped: "type" };
  const d = body.data as Record<string, unknown>;
  const to = ([] as unknown[]).concat(d.to ?? []).map(String).join(" ");
  // Adresse de veille : e-mails des concurrents (bibliothèque Espion)
  const vk = to.match(/veille-([a-f0-9]{24})@/i);
  if (vk) {
    const { rivalMail } = await import("./rival-mail.ts");
    return await rivalMail(vk[1], d, async () => {
      let text = String(d.text ?? ""), html = String(d.html ?? "");
      if (!text && !html && d.email_id) { const r = await resend(`/emails/receiving/${d.email_id}`); text = String(r.data?.text ?? ""); html = String(r.data?.html ?? ""); }
      return { text, html };
    });
  }
  // Adresse de contact publique de Bingoo! (mentions légales, RGPD) : transférée aux administrateurs de la plateforme
  if (new RegExp(`(^|[\\s<,])bingoo@${PLATFORM_DOMAIN().replace(/\./g, "\\.")}`, "i").test(to)) {
    const { data: adm } = await admin.from("admins").select("user_id");
    const dest: string[] = [];
    for (const a of (adm ?? []) as { user_id: string }[]) { const { data: u } = await admin.auth.admin.getUserById(a.user_id); if (u?.user?.email) dest.push(u.user.email); }
    let text = String(d.text ?? "");
    if (!text && d.email_id) { const r = await resend(`/emails/receiving/${d.email_id}`); text = String(r.data?.text ?? "") || String(r.data?.html ?? "").replace(/<[^>]+>/g, " "); }
    const from = String(d.from ?? "");
    for (const t of dest) await sendSystem({ to: t, fromName: "Bingoo! contact", replyTo: (from.match(/<([^>]+)>/)?.[1] ?? from).trim() || undefined, subject: `[Contact Bingoo!] ${String(d.subject ?? "")}`, text: `Message reçu sur bingoo@${PLATFORM_DOMAIN()} de ${from}\nRépondre à cet e-mail répond directement à l'expéditeur.\n\n---\n${text.slice(0, 20000)}`, key: d.email_id ? `contact-${d.email_id}-${t}` : undefined });
    return { forwarded: dest.length };
  }
  const m = to.match(/r-([0-9a-f-]{36})@([a-z0-9.-]+)/i);
  if (!m) return { skipped: "adresse non suivie" };
  const { data: p } = await admin.from("prospects").select("*").eq("public_token", m[1]).maybeSingle();
  if (!p) return { skipped: "prospect inconnu" };
  const { data: ws } = await admin.from("workspaces").select("*").eq("id", p.workspace_id).single();
  const dom = m[2].toLowerCase();
  if (!ws || (dom !== (ws.reply_domain ?? "").toLowerCase() && dom !== PLATFORM_DOMAIN().toLowerCase())) return { skipped: "domaine" };
  setAi({ ws: ws.id, essential: true });
  const from = String(d.from ?? "");
  const fm = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/);
  const fromEmail = (fm ? fm[2] : from).trim().toLowerCase();
  const fromName = fm ? fm[1].trim() : "";
  let text = String(d.text ?? "");
  if (!text && d.email_id) {
    const r = await resend(`/emails/receiving/${d.email_id}`);
    text = String(r.data?.text ?? "") || String(r.data?.html ?? "").replace(/<[^>]+>/g, " ");
  }
  if (!text.trim()) text = String(d.subject ?? "");
  if (!text.trim()) return { skipped: "vide" };
  const res = await handleReply(ws as Workspace, p as Prospect, { fromEmail, fromName, subject: String(d.subject ?? ""), text }, baseOf(ws as Workspace));
  if ((res as { duplicate?: boolean }).duplicate) return res;
  // Copie dans la boîte de l'utilisateur, pour qu'il ne rate rien
  try {
    const to = ["interesse", "question", "prix", "rappel"].includes(res.classe) ? "" : await teamAddress(ws as Workspace); // réponses positives : l'alerte « prospect chaud » s'en charge
    if (to) await sendSystem({
      to, fromName: `Bingoo! · ${p.name}`, replyTo: fromEmail,
      subject: `[${res.label}] ${String(d.subject ?? "")}`,
      text: `${fromName || fromEmail} (${p.name}) a répondu — ${res.summary}\n\nRépondre directement à cet e-mail lui écrit.\n\n---\n${stripQuoted(text)}`,
    });
  } catch (e) { console.error("copie réponse", e); }
  return res;
}

/** Domaine de réponse : sous-domaine dédié à la réception (n'affecte pas la messagerie existante). */
export async function setReplyDomain(ws: Workspace) {
  if (ws.domain_status !== "verified") throw new HttpError(400, "Vérifie d'abord ton domaine d'envoi");
  const name = `r.${ws.domain}`;
  let r = await resend("/domains", "POST", { name, region: "eu-west-1", capabilities: { sending: "disabled", receiving: "enabled" } });
  if (!r.ok) {
    const list = await resend("/domains");
    const found = (list.data?.data ?? []).find((x: { name: string }) => x.name === name);
    if (!found) throw new HttpError(502, "Service d'envoi : " + (r.data?.message ?? "erreur"));
    r = await resend(`/domains/${found.id}`);
  }
  const records = (r.data?.records ?? []).map((x: Record<string, unknown>) => ({ record: x.record, name: x.name, type: x.type, value: x.value, priority: x.priority, status: x.status }));
  await admin.from("workspaces").update({ reply_domain: name, reply_domain_id: r.data.id, reply_status: "pending", reply_records: records }).eq("id", ws.id);
  return { records };
}
export async function checkReplyDomain(ws: Workspace) {
  if (!ws.reply_domain_id) throw new HttpError(400, "Aucun domaine de réponse");
  await resend(`/domains/${ws.reply_domain_id}/verify`, "POST");
  const r = await resend(`/domains/${ws.reply_domain_id}`);
  const records = (r.data?.records ?? []).map((x: Record<string, unknown>) => ({ record: x.record, name: x.name, type: x.type, value: x.value, priority: x.priority, status: x.status }));
  const recv = r.data?.capabilities?.receiving;
  const ok = records.length > 0 && records.every((x: { status: string }) => x.status === "verified");
  const status = ok || (r.data?.status === "verified" && recv === "enabled") ? "verified" : "pending";
  await admin.from("workspaces").update({ reply_status: status, reply_records: records }).eq("id", ws.id);
  return { status, records };
}

export async function sendReply(ws: Workspace, replyId: string, subject: string, body: string) {
  canSend(ws);
  const { data: r } = await admin.from("replies").select("*, prospects(*)").eq("id", replyId).eq("workspace_id", ws.id).single();
  if (!r) throw new HttpError(404, "Réponse introuvable");
  const p = r.prospects as Prospect | null;
  await sendMail(ws, { to: r.from_email, subject, text: `${body.trim()}\n\n${signature(ws)}`, replyTo: replyAddress(ws, p?.public_token) });
  await admin.from("replies").update({ handled: true, reply_subject: subject, reply_body: body }).eq("id", r.id);
  if (p) await admin.from("prospects").update({ next_action_at: addDays(3), next_action: "Vérifier qu'il a répondu" }).eq("id", p.id);
  await log(ws.id, "envoi", `Réponse envoyée à ${p?.name ?? r.from_email}`);
}

// ================================================================ Rendez-vous
export async function bookingInfo(slug: string, token?: string | null) {
  const { data: ws } = await admin.from("workspaces").select("*").eq("booking_slug", slug).maybeSingle();
  if (!ws) throw new HttpError(404, "Ce lien de réservation n'existe pas");
  let p: Prospect | null = null;
  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    const { data } = await admin.from("prospects").select("*").eq("public_token", token).eq("workspace_id", ws.id).maybeSingle();
    p = data as Prospect | null;
  }
  return { ws: ws as Workspace, p };
}

export async function book(slug: string, b: Record<string, string>) {
  const { ws, p } = await bookingInfo(slug, b.t);
  const name = (b.name ?? "").trim().slice(0, 120);
  const email = (b.email ?? "").trim().toLowerCase().slice(0, 200);
  const company = (b.company ?? "").trim().slice(0, 200);
  const phone = (b.phone ?? "").trim().slice(0, 40);
  const notes = (b.notes ?? "").trim().slice(0, 1000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !company) throw new HttpError(400, "Nom, e-mail et entreprise sont obligatoires");
  const start = new Date(b.start);
  if (!(await freeSlots(ws, 21)).some((s) => s.getTime() === start.getTime())) throw new HttpError(409, "Ce créneau vient d'être pris, choisis-en un autre.");
  const end = new Date(start.getTime() + ws.meeting_minutes * 60000);

  let prospect = p;
  if (!prospect) {
    // Correspondance exacte (les caractères % et _ ne servent plus de jokers)
    const { data } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).ilike("email", email.replace(/[%_\\]/g, "\\$&")).limit(1);
    prospect = (data?.[0] as Prospect) ?? null;
  }
  if (!prospect) {
    const { data } = await admin.from("prospects").insert({ workspace_id: ws.id, name: company, contact_name: name, email, phone, status: "rdv", source: "réservation en ligne", activity: "Réservation directe" }).select("*").single();
    prospect = data as Prospect;
  }
  const { data: mt, error } = await admin.from("meetings").insert({
    workspace_id: ws.id, prospect_id: prospect.id, starts_at: start.toISOString(), ends_at: end.toISOString(),
    contact_name: name, contact_email: email, contact_phone: phone, company, notes,
  }).select("id").single();
  if (error) throw new HttpError(error.code === "23P01" ? 409 : 500, error.code === "23P01" ? "Ce créneau vient d'être pris, choisis-en un autre." : error.message);
  await admin.from("prospects").update({
    status: prospect.status === "client" ? "client" : "rdv", contact_name: prospect.contact_name || name,
    email: prospect.email || email, phone: prospect.phone || phone, next_action_at: start.toISOString().slice(0, 10), next_action: "Rendez-vous",
  }).eq("id", prospect.id);
  await admin.from("messages").update({ status: "ignore", error: "Rendez-vous pris" }).eq("prospect_id", prospect.id).eq("status", "brouillon");
  const when = frSlot(start);
  await log(ws.id, "rdv", `${company} a réservé ${when}`);

  {
    const team = await teamAddress(ws);
    const organizer = team || ws.sender_email;
    const ics = buildIcs({ uid: mt.id, start, end, summary: `${brand(ws)} · ${company}`, description: `Échange de ${ws.meeting_minutes} minutes avec ${ws.sender_name} (${brand(ws)}).${notes ? `\nNotes : ${notes}` : ""}`, location: ws.meeting_location, organizerName: ws.sender_name || brand(ws), organizerEmail: organizer, attendeeName: name, attendeeEmail: email });
    const confirm = { to: email, subject: `Rendez-vous confirmé : ${when}`, text: `Bonjour ${name},\n\nC'est noté pour ${when}, pendant ${ws.meeting_minutes} minutes.\nLieu : ${ws.meeting_location}.\n\nL'invitation est jointe pour l'ajouter à votre agenda. Si l'horaire ne vous convient plus, répondez simplement à cet e-mail.\n\n${signature(ws)}`, ics };
    try {
      if (sendReady(ws)) await sendMail(ws, confirm);
      else await sendSystem({ ...confirm, fromName: brand(ws), replyTo: organizer || undefined });
    } catch (e) { console.error("confirmation rdv", e); }
    try {
      if (team) await sendSystem({ to: team, subject: `Nouveau RDV : ${company}, ${when}`, text: `${name} (${company}) a réservé ${when}.\nE-mail : ${email}\nTéléphone : ${phone || "non renseigné"}${notes ? `\nNotes : ${notes}` : ""}\n\nLa fiche de préparation est disponible dans l'agenda.`, replyTo: email, ics });
    } catch (e) { console.error("alerte rdv", e); }
  }
  return { ok: true, label: when };
}

export async function brief(ws: Workspace, meetingId: string) {
  const { data: m } = await admin.from("meetings").select("*, prospects(*)").eq("id", meetingId).eq("workspace_id", ws.id).single();
  if (!m) throw new HttpError(404, "Rendez-vous introuvable");
  const p = m.prospects as Prospect | null;
  const { data: rep } = p ? await admin.from("replies").select("body, summary").eq("prospect_id", p.id).order("created_at") : { data: [] };
  const t = (ws.targets ?? []).find((x) => x.id === p?.target);
  const out = await ask(`Prépare une fiche de rendez-vous commercial pour ${ws.sender_name} (${brand(ws)} : ${ws.profile?.offre ?? ""}).
Rendez-vous avec ${m.contact_name}, ${m.company}${p ? ` (${p.activity}, ${p.city})` : ""}${p?.website ? `, site ${p.website}` : ""}.
${m.notes ? `Notes du prospect : ${m.notes}` : ""}
${(rep ?? []).length ? `Ses messages : ${(rep ?? []).map((r: { body: string }) => r.body).join(" / ").slice(0, 2000)}` : ""}
${t ? `Argument principal pour ce type de client : ${t.angle}` : ""}

Cherche sur le web des informations récentes et vérifiables sur cette structure. Puis rédige, en texte simple avec des titres en MAJUSCULES :
CE QU'ON SAIT (faits sourcés, avec l'URL entre parenthèses)
HYPOTHÈSES (ce qui est probable mais non vérifié)
CE QU'IL FAUT DÉCOUVRIR (5 questions à poser)
OBJECTIONS PROBABLES ET RÉPONSES
OBJECTIF DU RENDEZ-VOUS ET PROCHAINE ÉTAPE À OBTENIR
Sois concret et court. N'invente rien.`, { fast: true, maxTokens: 6000, tools: WEB(3), system: "Tu es un directeur commercial B2B français expérimenté. Tu distingues toujours les faits, les hypothèses et les inconnues." });
  // Le modèle « pense tout haut » pendant ses recherches web (« Je vais rechercher… ») : on ne garde que la fiche
  const raw = String(out ?? "");
  const start = raw.search(/(^|\n)\s*(\*\*|#+\s*)?(FICHE|CE QU.ON SAIT)/);
  const fiche = (start > 0 ? raw.slice(start) : raw).trim();
  await admin.from("meetings").update({ brief: fiche.slice(0, 8000) }).eq("id", m.id);
  return { brief: fiche };
}

// ================================================================ « Pourquoi maintenant »
export async function insight(ws: Workspace, p: Prospect) {
  const t = (ws.targets ?? []).find((x) => x.id === p.target);
  type I = { score: number; resume: string; faits: { texte: string; source?: string }[]; hypotheses: string[]; inconnues: string[]; recommandation: string; contacter: boolean;
    reseaux?: { liens?: { reseau: string; url: string }[]; publications?: { date: string; sujet: string; source: string }[]; accroche?: string } };
  const v = await askJson<I>(`Évalue si ${brand(ws)} (${ws.profile?.offre ?? ""}) doit contacter maintenant ce prospect, et pourquoi.
Prospect : ${p.name}${p.org ? ` (${p.org})` : ""}, ${p.activity}, ${[p.address, p.postal_code, p.city].join(" ")}.
Signaux du registre : ${(p.signals ?? []).map((s) => s.label).join(" ; ") || "aucun"}.
Cible visée : ${t?.label ?? ""} — ${t?.pourquoi ?? ""}

${p.website ? `Site : ${p.website}\n` : ""}${p.contact_name ? `Dirigeant : ${p.contact_name}\n` : ""}
Cherche sur le web : actualités, ouverture, travaux, recrutements, nomination d'un nouveau dirigeant, avis clients mentionnant un problème lié à notre offre, appels d'offres.
Cherche aussi ses réseaux sociaux publics (page LinkedIn de l'entreprise ou du dirigeant, Instagram, Facebook) et ses publications récentes : elles servent à personnaliser la première phrase d'un e-mail.
Un événement est un indice, pas une preuve d'intention d'achat.
score : 0 à 100 (pertinence × moment). contacter : false si les informations sont insuffisantes ou si ce n'est pas le bon moment.
reseaux.accroche : une première phrase d'e-mail naturelle qui fait référence à une publication ou une actualité RÉELLE trouvée (avec sa source), sans flatterie ; vide si rien de pertinent.
Format : {"score": 0, "resume": "une phrase", "faits": [{"texte": "", "source": "URL"}], "hypotheses": [""], "inconnues": [""], "recommandation": "quoi dire / quel angle", "contacter": true,
 "reseaux": {"liens": [{"reseau": "linkedin|instagram|facebook|tiktok|youtube|x", "url": ""}], "publications": [{"date": "AAAA-MM", "sujet": "", "source": "URL"}], "accroche": ""}}`,
    { fast: true, maxTokens: 7000, tools: WEB(4), system: "Tu es analyste commercial B2B en France. Tu ne présentes jamais une hypothèse comme un fait et tu cites tes sources." });
  if (!v || typeof v !== "object" || (v.score === undefined && !v.resume)) throw new HttpError(502, "L'analyse est revenue incomplète, relance-la");
  const score = Math.max(0, Math.min(100, Math.round(Number(v.score) || 0)));
  await admin.from("prospects").update({ insight: { ...v, ...((p.insight as { espion?: unknown } | null)?.espion ? { espion: (p.insight as { espion?: unknown }).espion } : {}) }, insight_at: new Date().toISOString(), score }).eq("id", p.id);
  return { ...v, score };
}

// ================================================================ Appels
export async function callScript(ws: Workspace, p: Prospect) {
  const t = (ws.targets ?? []).find((x) => x.id === p.target);
  return { script: await ask(`Écris un script d'appel téléphonique court pour ${ws.sender_name} (${brand(ws)}) qui appelle ${p.name} (${p.activity}, ${p.city})${p.contact_name ? `, en demandant ${p.contact_name}` : `, en demandant : ${t?.interlocuteur ?? "le responsable"}`}.
Angle : ${t?.angle ?? ""}. Bénéficiaires : ${t?.pour_qui ?? ""}.
${p.insight ? `Ce qu'on sait : ${JSON.stringify(p.insight).slice(0, 800)}` : ""}
Structure en texte simple, titres en MAJUSCULES : ACCUEIL / STANDARD (passer le barrage), ACCROCHE (15 secondes), QUESTIONS DE QUALIFICATION (besoin, rôle dans la décision, échéance, prestataire actuel), OBJECTIONS (3 avec réponses), CONCLUSION (obtenir un rendez-vous de ${ws.meeting_minutes} minutes), MESSAGE VOCAL (20 secondes).
Ton naturel et poli, vouvoiement, aucune promesse ni prix.`, { fast: true, system: systemFor(ws) }) };
}

// ================================================================ Devis
export function quoteTotals(q: { lines: { qty: number; price: number }[]; vat_rate: number }) {
  const ht = (q.lines ?? []).reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
  const tva = ht * (Number(q.vat_rate) || 0) / 100;
  return { ht: Math.round(ht * 100) / 100, tva: Math.round(tva * 100) / 100, ttc: Math.round((ht + tva) * 100) / 100 };
}

export async function sendQuote(ws: Workspace, quoteId: string, base: string) {
  canSend(ws);
  if (!base) throw new HttpError(400, "Adresse de l'application inconnue");
  const { data: q } = await admin.from("quotes").select("*, prospects(*)").eq("id", quoteId).eq("workspace_id", ws.id).single();
  if (!q) throw new HttpError(404, "Devis introuvable");
  const p = q.prospects as Prospect | null;
  if (!p?.email) throw new HttpError(400, "Ce prospect n'a pas d'e-mail");
  const t = quoteTotals(q);
  const link = `${base}/devis/${q.token}`;
  await sendMail(ws, {
    to: p.email, replyTo: replyAddress(ws, p.public_token),
    subject: `Proposition ${brand(ws)} – ${q.title || p.name}`,
    text: `${p.contact_name ? `Bonjour ${p.contact_name},` : "Bonjour,"}\n\nComme convenu, voici notre proposition${q.title ? ` : ${q.title}` : ""}, pour un montant de ${t.ht.toLocaleString("fr-FR")} € HT${q.recurring ? " par mois" : ""}.\n\nVous pouvez la consulter et la signer en ligne ici :\n${link}\n\nJe reste disponible pour en parler.\n\n${signature(ws)}`,
  });
  await admin.from("quotes").update({ status: "envoye", sent_at: new Date().toISOString(), total_ht: t.ht }).eq("id", q.id);
  await admin.from("prospects").update({ next_action_at: addDays(4), next_action: "Relancer le devis" }).eq("id", p.id);
  await log(ws.id, "devis", `Devis envoyé à ${p.name} (${t.ht.toLocaleString("fr-FR")} € HT)`);
}

export async function publicQuote(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw new HttpError(404, "Devis introuvable");
  const { data: q } = await admin.from("quotes").select("*, prospects(name, contact_name, address, postal_code, city), workspaces(name, profile, legal_name, siret, postal_address, sender_name, sender_email, signature)").eq("token", token).maybeSingle();
  if (!q || q.status === "brouillon") throw new HttpError(404, "Devis introuvable");
  if (q.status === "envoye") await admin.from("quotes").update({ status: "vu", viewed_at: new Date().toISOString() }).eq("id", q.id);
  const w = q.workspaces as Record<string, unknown> & { profile?: { nom?: string } };
  return {
    number: q.number, title: q.title, lines: q.lines, recurring: q.recurring, notes: q.notes, vat_rate: q.vat_rate, totals: quoteTotals(q),
    status: q.status === "envoye" ? "vu" : q.status, valid_until: q.valid_until, created_at: q.created_at, signed_name: q.signed_name, signed_at: q.signed_at,
    client: q.prospects,
    seller: { name: w.profile?.nom || w.name, legal_name: w.legal_name, siret: w.siret, address: w.postal_address, contact: w.sender_name, email: w.sender_email },
  };
}

export async function signQuote(token: string, name: string, accept: boolean, ip: string) {
  const { data: q } = await admin.from("quotes").select("*").eq("token", token).maybeSingle();
  if (!q || !["envoye", "vu"].includes(q.status)) throw new HttpError(400, "Ce devis ne peut plus être signé");
  if (q.valid_until && new Date(q.valid_until) < new Date(new Date().toISOString().slice(0, 10))) throw new HttpError(400, "Ce devis a expiré, demandez-en une nouvelle version");
  const nm = String(name ?? "").trim().slice(0, 120);
  if (accept && nm.length < 3) throw new HttpError(400, "Indique ton nom complet pour signer");
  const now = new Date().toISOString();
  await admin.from("quotes").update(accept ? { status: "signe", signed_at: now, signed_name: nm, signed_ip: ip.slice(0, 60) } : { status: "refuse" }).eq("id", q.id);
  const { data: ws } = await admin.from("workspaces").select("*").eq("id", q.workspace_id).single();
  if (q.prospect_id) {
    const t = quoteTotals(q);
    await admin.from("prospects").update(accept
      ? { status: "client", won_at: now, deal_value: q.recurring ? t.ht : (() => { const m = (q.lines ?? []).filter((l: { unit?: string }) => /mois|mensuel/i.test(l.unit ?? "")).reduce((s: number, l: { qty: number; price: number }) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0); return m || null; })(), next_action_at: addDays(1), next_action: "Lancer la prestation" }
      : { next_action_at: addDays(2), next_action: "Comprendre le refus du devis" }).eq("id", q.prospect_id);
  }
  await log(q.workspace_id, "devis", accept ? `Devis ${q.number} signé par ${nm}` : `Devis ${q.number} refusé`);
  if (ws) {
    try {
      const team = await teamAddress(ws as Workspace);
      if (team) await sendSystem({ to: team, subject: accept ? `✅ Devis ${q.number} signé` : `Devis ${q.number} refusé`, text: accept ? `${nm} a signé le devis ${q.number} (${quoteTotals(q).ht.toLocaleString("fr-FR")} € HT) le ${new Date(now).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}.` : `Le devis ${q.number} a été refusé en ligne.` });
    } catch (e) { console.error(e); }
  }
  return { ok: true };
}

// ================================================================ Concurrents
export async function siteText(url: string) {
  const { readSite } = await import("./analyze.ts");
  return await readSite(url);
}
export async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s.replace(/\s+/g, " ").replace(/\d{1,2}[:/]\d{2}/g, "")));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/** Fiche officielle du concurrent (registre public : SIREN, effectif, chiffre d'affaires publié). */
async function registryCard(name: string) {
  if (!name) return [];
  try {
    const u = new URL("https://recherche-entreprises.api.gouv.fr/search");
    u.searchParams.set("q", name); u.searchParams.set("per_page", "3");
    const r = await fetch(u, { headers: { accept: "application/json" } });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.results ?? []).map((x: Record<string, unknown> & { siege?: Record<string, unknown>; finances?: Record<string, { ca?: number; resultat_net?: number }>; dirigeants?: { nom?: string; prenoms?: string; denomination?: string; qualite?: string }[] }) => ({
      nom: x.nom_complet, siren: x.siren, creation: x.date_creation, effectif: x.tranche_effectif_salarie, etablissements: x.nombre_etablissements_ouverts,
      ville: x.siege?.libelle_commune, activite: x.activite_principale, finances: x.finances ?? {},
      dirigeants: (x.dirigeants ?? []).slice(0, 4).map((g) => `${g.prenoms ?? ""} ${g.nom ?? g.denomination ?? ""} (${g.qualite ?? ""})`.trim()),
    }));
  } catch { return []; }
}

export async function checkCompetitor(ws: Workspace, id: string, force = false) {
  const { data: c } = await admin.from("competitors").select("*").eq("id", id).eq("workspace_id", ws.id).single();
  if (!c) throw new HttpError(404, "Concurrent introuvable");
  const host = new URL(c.url).hostname.replace(/^www\./, "");
  const guess = c.name || c.summary?.nom || host.split(".")[0];
  const [text, registry] = await Promise.all([siteText(c.url).catch(() => ""), registryCard(guess)]);
  const hash = await sha(text);
  const now = new Date().toISOString();
  const fresh = c.checked_at && Date.now() - new Date(c.checked_at).getTime() < 7 * 86400_000;
  if (!force && hash === c.text_hash && c.summary?.battlecard && fresh) {
    await admin.from("competitors").update({ checked_at: now }).eq("id", c.id);
    return { changed: false };
  }
  const me = ws.profile ?? {};
  const s = await askJson<Record<string, unknown> & { nom?: string; changements?: string }>(`Tu es analyste en intelligence concurrentielle B2B en France. Produis une veille concurrentielle de niveau expert sur ce concurrent, pour ${brand(ws)}.

NOTRE ENTREPRISE : ${me.resume ?? ""} — Offre : ${me.offre ?? ""} — Ce qui nous distingue : ${me.differenciation ?? ""} — Preuves : ${(me.preuves ?? []).join(" ; ") || "aucune"}
Nos cibles : ${(ws.targets ?? []).map((t) => t.label).join(", ")}

CONCURRENT : ${c.url}
Registre officiel des entreprises (candidats possibles, choisis celui qui correspond vraiment, sinon ignore) : ${JSON.stringify(registry).slice(0, 2500)}
${c.summary ? `Analyse précédente (pour repérer les changements) : ${JSON.stringify(c.summary).slice(0, 2000)}` : ""}

Contenu actuel de son site :
${text.slice(0, 9000) || "(site illisible)"}

Fais des recherches web ciblées (6 au maximum) : actualités des 12 derniers mois (acquisitions, levées, nominations, nouveaux contrats, difficultés), chiffre d'affaires publié, marchés publics remportés (BOAMP, avis d'attribution, montants), avis clients et salariés (Google, Glassdoor, Indeed), recrutements en cours (zones, métiers = où ils se développent), indices de prix publics, leurs canaux d'acquisition de clients (référencement, publicité, salons, partenariats, prospection, bouche-à-oreille), leurs références clients publiques, et leurs réseaux sociaux (LinkedIn, Instagram, Facebook, TikTok, YouTube : abonnés visibles, rythme de publication, sujets et formats qui génèrent le plus de réactions).

Règles d'expert :
- Chaque fait important porte sa source (URL). Sépare toujours FAIT et HYPOTHÈSE.
- N'invente aucun chiffre, client, prix ou marge. Si une information n'est pas trouvée, dis « non trouvé ».
- Sois concret et actionnable pour un commercial qui affronte ce concurrent demain en rendez-vous.
- Insatisfactions : regroupe par thème les avis négatifs réellement lus, avec leur nombre et leur période. Moins de 3 avis sur un thème = signal faible, à dire. Ne généralise jamais à partir d'un seul avis.
- Alerte : « haute » seulement pour un changement qui peut nous faire gagner ou perdre des clients (prix, nouvelle offre, levée, rachat, entrée sur nos cibles) ; « aucune » s'il n'y a rien de nouveau ou si c'est la première analyse.

Format :
{"nom": "",
 "fiche": {"raison_sociale": "", "siren": "", "creation": "", "effectif": "", "chiffre_affaires": "montant + année + source, ou non trouvé", "resultat": "", "dirigeants": [""], "implantations": ""},
 "resume": "3 phrases : qui ils sont, comment ils gagnent, en quoi ils nous menacent",
 "menace": {"niveau": 1, "pourquoi": ""},
 "offre": "", "positionnement": "", "cibles": "",
 "prix": {"affiches": "prix affichés ou « non affichés »", "indices": [{"texte": "", "source": ""}]},
 "forces": [{"texte": "", "source": ""}],
 "faiblesses": [{"texte": "", "type": "fait|hypothese", "source": ""}],
 "actualites": [{"date": "AAAA-MM", "titre": "", "impact": "ce que ça change pour nous", "source": ""}],
 "marches_publics": [{"date": "", "acheteur": "", "objet": "", "montant": "", "source": ""}],
 "avis": {"clients": "synthèse + note si trouvée", "salaries": "synthèse + note si trouvée", "sources": [""]},
 "recrutements": "",
 "reseaux": {"presence": [{"reseau": "linkedin|instagram|facebook|tiktok|youtube|x", "url": "", "abonnes": "nombre ou non trouvé", "rythme": "ex. 3 posts/semaine", "sujets": ""}], "ce_qui_marche": ["formats ou sujets qui génèrent des réactions, avec exemple"], "angles_a_reprendre": ["ce qu'on peut faire mieux qu'eux sur les réseaux"], "a_eviter": [""], "synthese": "2 phrases"},
 "acquisition": {"methode": "comment ils trouvent leurs clients, en 2 phrases", "canaux": [{"canal": "", "preuve": "ce qui le montre", "source": ""}]},
 "clients": {"types": "types de clients servis", "references": [{"nom": "", "source": ""}], "audience": "taille d'audience visible (abonnés, avis, trafic publié), ou non trouvé"},
 "insatisfactions": [{"theme": "délais, prix, facturation, support, qualité…", "nombre_avis": 0, "periode": "ex. 3 derniers mois", "exemples": ["extrait court d'un vrai avis"], "sources": [""], "notre_reponse": "comment notre offre répond à ce problème, ou « non couvert »"}],
 "alerte": {"importance": "haute|moyenne|faible|aucune", "titre": "le changement le plus important, en une phrase", "pourquoi": "ce que ça change pour nous, en une phrase"},
 "position": {"verdict": "devant|derriere|egal|inconnu", "pourquoi": ["raisons précises pour lesquelles ils sont devant ou derrière nous sur le marché, chacune avec sa preuve"]},
 "comparatif": [{"critere": "", "eux": "", "nous": "", "avantage": "eux|nous|egal|inconnu"}],
 "battlecard": {"pitch": "notre différence en 2 phrases face à eux", "quand_on_gagne": [""], "quand_on_perd": [""], "objections": [{"objection": "ex. « On travaille déjà avec eux »", "reponse": ""}], "questions_pieges": ["questions à poser au prospect qui mettent en lumière leurs faiblesses, sans les dénigrer"], "a_ne_pas_dire": [""]},
 "opportunites": ["comptes ou segments où on peut les déloger, et pourquoi"],
 "actions": ["3 à 5 actions concrètes pour nous cette semaine"],
 "changements": "${c.summary ? "ce qui a changé depuis l'analyse précédente, ou « rien de significatif »" : "première analyse"}"}`,
    { maxTokens: 16000, tools: WEB(6), system: "Tu es un analyste senior en intelligence concurrentielle. Tu cites tes sources, tu distingues faits et hypothèses, tu ne dénigres jamais et tu n'inventes rien. Réponds en français." });
  if (!s || typeof s !== "object" || (!s.resume && !s.battlecard)) throw new HttpError(502, "L'analyse est revenue incomplète, relance-la");
  const history = [{ at: now, changes: s.changements ?? "" }, ...(c.history ?? [])].slice(0, 20);
  await admin.from("competitors").update({ name: c.name || s.nom || "", summary: s, text_hash: hash, history, checked_at: now, spy_due: false, changed_at: c.text_hash && c.text_hash !== hash ? now : c.changed_at ?? now }).eq("id", c.id);
  await log(ws.id, "veille", `${c.name || s.nom} : ${c.summary ? s.changements : "analyse complète"}`);
  const al = (s as { alerte?: { importance?: string; titre?: string; pourquoi?: string } }).alerte;
  if (c.summary && al && ["haute", "moyenne"].includes(String(al.importance)) && al.titre) {
    await log(ws.id, "espion_alerte", `${al.importance === "haute" ? "‼ " : ""}${c.name || s.nom} : ${String(al.titre).replace(/<\/?cite[^>]*>/g, "")}${al.pourquoi ? ` — ${String(al.pourquoi).replace(/<\/?cite[^>]*>/g, "")}` : ""}`.slice(0, 600));
  }
  return { changed: true, summary: s };
}

/** Propose les concurrents directs de l'entreprise dans sa zone. */
export async function suggestCompetitors(ws: Workspace) {
  const me = ws.profile ?? {};
  const { data: existing } = await admin.from("competitors").select("url").eq("workspace_id", ws.id);
  type C = { concurrents: { nom: string; site: string; pourquoi: string; type: string }[] };
  const r = await askJson<C>(`Trouve sur le web les 6 concurrents les plus directs de cette entreprise française.
Entreprise : ${me.nom ?? ws.name} — ${me.resume ?? ""} — Offre : ${me.offre ?? ""} — Ville : ${me.ville ?? ""} — Zone : ${(ws.zone ?? []).join(", ") || "France"}
Cibles : ${(ws.targets ?? []).map((t) => t.label).join(", ")}
Déjà suivis : ${(existing ?? []).map((x) => x.url).join(", ") || "aucun"}
Mélange : 2 leaders nationaux, 3 acteurs de taille comparable dans la même zone, 1 alternative (autre façon de répondre au même besoin).
Ne donne que des entreprises réelles avec leur site officiel vérifié.
Format : {"concurrents": [{"nom": "", "site": "https://…", "pourquoi": "une phrase", "type": "leader|local|alternative"}]}`,
    { fast: true, maxTokens: 6000, tools: WEB(4) });
  return (r.concurrents ?? []).filter((x) => /^https?:\/\//.test(x.site ?? "")).slice(0, 6);
}

// ================================================================ Réseaux sociaux de l'entreprise
export const NETWORKS = ["linkedin", "instagram", "facebook", "tiktok", "youtube", "x"] as const;

export async function socialAudit(ws: Workspace, given: Record<string, string>) {
  const { socialLinks } = await import("./analyze.ts");
  const found = ws.website ? await socialLinks(ws.website).catch(() => ({} as Record<string, string>)) : {};
  const socials: Record<string, string> = {};
  for (const n of NETWORKS) {
    const v = String(given?.[n] ?? "").trim() || found[n] || "";
    if (v) socials[n] = v.slice(0, 300);
  }
  const me = ws.profile ?? {};
  const { data: comp } = await admin.from("competitors").select("name, url, summary").eq("workspace_id", ws.id).limit(6);
  const compNets = (comp ?? []).map((c) => ({ nom: c.name || c.url, reseaux: (c.summary as { reseaux?: unknown } | null)?.reseaux ?? null })).filter((c) => c.reseaux);
  const a = await askJson<Record<string, unknown>>(`Tu es consultant senior en social selling B2B en France. Fais l'audit des réseaux sociaux de cette entreprise et prépare un plan d'action concret.

ENTREPRISE : ${me.nom ?? ws.name} — ${me.resume ?? ""} — Offre : ${me.offre ?? ""} — Ce qui la distingue : ${me.differenciation ?? ""} — Ton : ${me.ton ?? ""}
Site : ${ws.website || "inconnu"}
Dirigeant / commercial : ${ws.sender_name || "inconnu"}
Clients visés : ${(ws.targets ?? []).map((t) => `${t.label} (interlocuteur : ${t.interlocuteur ?? ""})`).join(" ; ")}
Profils connus : ${Object.keys(socials).length ? Object.entries(socials).map(([k, v]) => `${k} : ${v}`).join(" ; ") : "aucun fourni, cherche-les"}
${compNets.length ? `Réseaux des concurrents (veille) : ${JSON.stringify(compNets).slice(0, 2500)}` : ""}

Cherche sur le web (5 recherches maximum) les profils publics de l'entreprise et de son dirigeant, leurs publications récentes, le nombre d'abonnés visible et le rythme de publication. Pense à ce que voit un prospect qui vérifie l'entreprise avant de répondre à un e-mail.

Règles :
- N'invente aucun chiffre (abonnés, vues, engagement). Si ce n'est pas visible publiquement, écris « non visible ».
- Distingue ce que tu as constaté (avec l'URL) de tes recommandations.
- Les posts proposés doivent viser les clients cibles (pas les particuliers ni les candidats) et ne rien affirmer qui ne figure pas dans les informations fournies (pas de faux chiffres ni de faux clients).

Format :
{"score": 0,
 "verdict": "2 phrases : ce qu'un prospect pense en voyant tes réseaux aujourd'hui",
 "profils": [{"reseau": "linkedin|instagram|facebook|tiktok|youtube|x", "url": "", "trouve": true, "type": "entreprise|dirigeant", "abonnes": "nombre ou non visible", "rythme": "ex. 1 post/mois, ou inactif depuis…", "dernier_post": "date + sujet ou non visible", "note": 0, "constat": "une phrase"}],
 "manquants": [{"reseau": "", "pourquoi": "pourquoi ce réseau compte pour tes cibles, ou pourquoi tu peux t'en passer"}],
 "forces": [""],
 "problemes": [{"texte": "", "priorite": "haute|moyenne|basse"}],
 "actions": [{"action": "", "reseau": "", "impact": "fort|moyen", "temps": "ex. 20 min"}],
 "bios": {"linkedin_titre": "titre de profil LinkedIn du dirigeant, 220 caractères max", "linkedin_info": "section Infos LinkedIn, 100 à 150 mots", "page_entreprise": "description de la page entreprise, 2 phrases", "instagram": "bio Instagram, 150 caractères max"},
 "concurrents": "ce que les concurrents font mieux ou moins bien sur les réseaux, ou vide",
 "piliers": ["3 ou 4 thèmes de contenu récurrents"],
 "plan": [{"semaine": 1, "jour": "lundi", "reseau": "linkedin", "format": "texte|carrousel|photo|vidéo courte|sondage", "sujet": "", "accroche": "première ligne du post", "texte": "post complet prêt à publier, 80 à 180 mots", "cible": "quel client il vise"}]}
Le plan contient 8 posts sur 2 semaines, majoritairement sur le réseau le plus utile pour les cibles. note et score vont de 0 à 100.`,
    { maxTokens: 14000, tools: WEB(5), system: "Tu es consultant senior en social selling B2B. Tu cites ce que tu as vu, tu n'inventes aucun chiffre et tu proposes des actions concrètes. Réponds en français." });
  if (!a || typeof a !== "object" || (!a.verdict && !a.plan)) throw new HttpError(502, "L'audit est revenu incomplet, relance-le");
  const now = new Date().toISOString();
  await admin.from("workspaces").update({ socials, social_audit: a, social_audit_at: now }).eq("id", ws.id);
  await log(ws.id, "social", `Audit des réseaux : ${Number(a.score) || 0}/100`);
  return { socials, audit: a, at: now };
}

export { autopilot } from "./autopilot.ts";
