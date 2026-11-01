// Transformer les réponses en ventes : rappels de RDV, compte rendu + suite, relance de devis.
import { HttpError } from "./http.ts";
import { admin, askJson, knowledgeOf, log, sendReady, type Workspace } from "./core.ts";
import { brand, replyAddress, sendMail, sendSystem, signature, teamAddress } from "./mail.ts";
import { frSlot } from "./time.ts";

/** Envoie au prospect un rappel la veille de son rendez-vous (réduit fortement les absences). */
export async function meetingReminders(ws: Workspace) {
  const from = new Date(Date.now() + 18 * 3600e3).toISOString();
  const to = new Date(Date.now() + 30 * 3600e3).toISOString();
  const { data } = await admin.from("meetings").select("*, prospects(public_token)").eq("workspace_id", ws.id).eq("status", "confirme")
    .is("reminded_at", null).gte("starts_at", from).lte("starts_at", to).limit(20);
  let n = 0;
  for (const m of data ?? []) {
    if (!m.contact_email) continue;
    // On marque d'abord : jamais deux rappels, même si deux tâches tournent en même temps
    const { data: claimed } = await admin.from("meetings").update({ reminded_at: new Date().toISOString() }).eq("id", m.id).is("reminded_at", null).select("id");
    if (!claimed?.length) continue;
    const when = frSlot(new Date(m.starts_at));
    const mail = {
      to: m.contact_email,
      subject: `Rappel : notre échange ${when}`,
      text: `Bonjour ${m.contact_name || ""},\n\nPetit rappel de notre échange prévu ${when} (${ws.meeting_minutes} minutes).\nLieu : ${ws.meeting_location}.\n\nSi l'horaire ne vous convient plus, répondez simplement à cet e-mail et nous trouverons un autre moment.\n\n${signature(ws)}`,
    };
    try {
      if (sendReady(ws)) await sendMail(ws, { ...mail, replyTo: replyAddress(ws, m.prospects?.public_token) });
      else await sendSystem({ ...mail, fromName: brand(ws), replyTo: (await teamAddress(ws)) || undefined });
      n++;
    } catch (e) { console.error("rappel rdv", e); await admin.from("meetings").update({ reminded_at: null }).eq("id", m.id); }
  }
  if (n) await log(ws.id, "rdv", `${n} rappel${n > 1 ? "s" : ""} de rendez-vous envoyé${n > 1 ? "s" : ""}`);
  return n;
}

type Followup = {
  resume: string; besoin: string; decideurs: string; budget: string; delai: string; objections: string[];
  prochaine_etape: string; email: { objet: string; corps: string };
  devis: { titre: string; recurrent: boolean; lignes: { label: string; qty: number; unit: string; price: number }[] } | null;
  chance: number;
};

/** Après un RDV : à partir des notes, l'IA rédige le compte rendu, l'e-mail de suite et une proposition chiffrée. */
export async function meetingFollowup(ws: Workspace, id: string, notes: string) {
  const { data: m } = await admin.from("meetings").select("*, prospects(*)").eq("id", id).eq("workspace_id", ws.id).single();
  if (!m) throw new HttpError(404, "Rendez-vous introuvable");
  const clean = notes.trim().slice(0, 6000);
  if (clean.length < 15) throw new HttpError(400, "Note en quelques lignes ce qui s'est dit pendant le rendez-vous");
  const p = m.prospects;
  const f = await askJson<Followup>(`Tu aides ${ws.sender_name || "un commercial"} (${brand(ws)} : ${ws.profile?.offre ?? ""}) après un rendez-vous commercial avec ${m.contact_name}, ${m.company}${p ? ` (${p.activity}, ${p.city})` : ""}.
Notes prises pendant le rendez-vous :
${clean}

Catalogue de prix de l'entreprise (utilise-le pour chiffrer, n'invente aucun prix absent) : ${JSON.stringify(ws.catalog ?? []).slice(0, 2000) || "vide"}
TVA : ${ws.vat_rate ?? 20} %.${knowledgeOf(ws) ? `\nFiche de l'entreprise (informations exactes utilisables dans l'e-mail) :\n${knowledgeOf(ws)}` : ""}

Produis :
- un compte rendu factuel (besoin, décideurs, budget, délai, objections) à partir des notes uniquement ; « non abordé » si l'information manque ;
- la prochaine étape concrète à obtenir ;
- l'e-mail de suite à envoyer au prospect : remerciement bref, reformulation de son besoin avec ses mots, ce qu'on propose, la prochaine étape avec une date. 90 à 150 mots, vouvoiement, sans signature, sans rien promettre qui ne figure pas dans les notes ;
- une proposition chiffrée si les notes et le catalogue le permettent (sinon devis = null) ;
- chance : probabilité de signature de 0 à 100, honnête.
Format : {"resume": "", "besoin": "", "decideurs": "", "budget": "", "delai": "", "objections": [""], "prochaine_etape": "", "email": {"objet": "", "corps": ""}, "devis": {"titre": "", "recurrent": false, "lignes": [{"label": "", "qty": 1, "unit": "", "price": 0}]}, "chance": 50}`,
    { maxTokens: 4000, system: "Tu es un directeur commercial B2B français. Tu es factuel, tu n'inventes rien et tu écris simplement." });
  if (!f?.email?.corps) throw new HttpError(502, "La suite n'a pas pu être préparée, réessaie");
  const followup = { ...f, notes: clean, at: new Date().toISOString(), sent: false };
  await admin.from("meetings").update({ followup, status: m.status === "confirme" ? "tenu" : m.status, notes: m.notes }).eq("id", id);
  let quoteId: string | null = null;
  const lines = (f.devis?.lignes ?? []).filter((l) => l.label && Number(l.price) > 0).slice(0, 20)
    .map((l) => ({ label: String(l.label).slice(0, 200), qty: Number(l.qty) || 1, unit: String(l.unit ?? "").slice(0, 30), price: Math.round(Number(l.price) * 100) / 100 }));
  if (lines.length && m.prospect_id) {
    const { count } = await admin.from("quotes").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id);
    const { data: q } = await admin.from("quotes").insert({
      workspace_id: ws.id, prospect_id: m.prospect_id, number: `D-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, "0")}`,
      title: String(f.devis?.titre ?? "").slice(0, 160), lines,
      // Mensuel seulement si toutes les lignes le sont (un forfait de mise en place n'est pas récurrent)
      recurring: lines.every((l) => /mois|mensuel/i.test(l.unit)), vat_rate: ws.vat_rate ?? 20,
      total_ht: Math.round(lines.reduce((s, l) => s + l.qty * l.price, 0) * 100) / 100,
      notes: "",
      valid_until: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    }).select("id").single();
    quoteId = q?.id ?? null;
  }
  if (m.prospect_id) {
    await admin.from("prospects").update({
      next_action: f.prochaine_etape?.slice(0, 200) || "Envoyer la suite du rendez-vous", next_action_at: new Date().toISOString().slice(0, 10),
      notes: `${p?.notes ? p.notes + "\n" : ""}RDV ${new Date(m.starts_at).toLocaleDateString("fr-FR")} : ${f.resume}`.slice(0, 4000),
    }).eq("id", m.prospect_id);
  }
  await log(ws.id, "rdv", `Compte rendu et suite préparés pour ${m.company}${quoteId ? " (proposition en brouillon)" : ""}`);
  return { followup, quote_id: quoteId };
}

/** Envoie l'e-mail de suite du RDV (après relecture par l'utilisateur). */
export async function sendMeetingFollowup(ws: Workspace, id: string, subject: string, body: string) {
  const { data: m } = await admin.from("meetings").select("*, prospects(public_token)").eq("id", id).eq("workspace_id", ws.id).single();
  if (!m) throw new HttpError(404, "Rendez-vous introuvable");
  if (!m.contact_email) throw new HttpError(400, "Pas d'e-mail pour ce contact");
  if (m.followup?.sent) throw new HttpError(409, "Cette suite a déjà été envoyée");
  const mail = { to: m.contact_email, subject: subject.slice(0, 160), text: `${body.trim()}\n\n${signature(ws)}` };
  if (sendReady(ws)) await sendMail(ws, { ...mail, replyTo: replyAddress(ws, m.prospects?.public_token) });
  else await sendSystem({ ...mail, fromName: ws.sender_name || brand(ws), replyTo: (await teamAddress(ws)) || undefined });
  await admin.from("meetings").update({ followup: { ...(m.followup ?? {}), sent: true, sent_at: new Date().toISOString(), email: { objet: subject, corps: body } } }).eq("id", id);
  await log(ws.id, "envoi", `Suite du rendez-vous envoyée à ${m.company}`);
  return { ok: true };
}

/** Pilote automatique : relance une fois un devis envoyé ou consulté mais pas signé après 4 jours. */
export async function quoteReminders(ws: Workspace, base: string) {
  if (!sendReady(ws)) return 0;
  const before = new Date(Date.now() - 4 * 864e5).toISOString();
  const { data } = await admin.from("quotes").select("*, prospects(*)").eq("workspace_id", ws.id).in("status", ["envoye", "vu"])
    .is("reminded_at", null).lte("sent_at", before).limit(5);
  let n = 0;
  for (const q of data ?? []) {
    const p = q.prospects;
    if (!p?.email || ["refus", "client"].includes(p.status)) continue;
    const { data: claimed } = await admin.from("quotes").update({ reminded_at: new Date().toISOString() }).eq("id", q.id).is("reminded_at", null).select("id");
    if (!claimed?.length) continue;
    try {
      await sendMail(ws, {
        to: p.email, replyTo: replyAddress(ws, p.public_token),
        subject: `Re : Proposition ${brand(ws)} – ${q.title || p.name}`,
        text: `${p.contact_name ? `Bonjour ${p.contact_name},` : "Bonjour,"}\n\n${q.status === "vu" ? "Je vois que vous avez pu consulter notre proposition." : "Je me permets de revenir vers vous au sujet de notre proposition."} Avez-vous des questions, ou des points à ajuster avant de valider ?\n\nLe lien reste disponible ici : ${base}/devis/${q.token}\n\n${signature(ws)}`,
      });
      n++;
    } catch (e) { console.error("relance devis", e); }
  }
  if (n) await log(ws.id, "devis", `${n} devis relancé${n > 1 ? "s" : ""} (pilote automatique)`);
  return n;
}
