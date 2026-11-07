// Rapport du lundi et alerte « prospect chaud » : e-mails de service envoyés à l'équipe de l'espace.
import { admin, type Workspace } from "./core.ts";
import { sendSystem, teamAddress } from "./mail.ts";

const HOT = ["interesse", "question", "prix", "rappel"];
const LABEL: Record<string, string> = { interesse: "est intéressé", question: "pose une question", prix: "demande un prix", rappel: "demande à être rappelé" };
const appLink = (ws: Workspace, path: string) => { try { const u = new URL(ws.app_url); return `${u.origin}${u.pathname.replace(/\/$/, "")}/#${path}`; } catch { return ""; } };
const n = (x: number, one: string, many = one + "s") => `${x} ${x > 1 ? many : one}`;

/** Alerte immédiate quand un prospect répond positivement. */
export async function hotAlert(replyId: string, dry = false) {
  const { data: r } = await admin.from("replies").select("*, prospects(name, contact_name, contact_role, city, phone, email)").eq("id", replyId).single();
  if (!r || !HOT.includes(r.class)) return { skipped: "réponse non prioritaire" };
  if (r.notified_at && !dry) return { skipped: "déjà notifié" };
  const { data: ws } = await admin.from("workspaces").select("*").eq("id", r.workspace_id).single();
  if (!ws) return { skipped: "espace introuvable" };
  const p = (r.prospects ?? {}) as { name?: string; contact_name?: string; contact_role?: string; city?: string; phone?: string; email?: string };
  const to = await teamAddress(ws as Workspace);
  const who = p.name || r.from_name || r.from_email;
  const subject = `Prospect chaud : ${who} ${LABEL[r.class]}`;
  const link = appLink(ws as Workspace, "/reponses");
  // Réponse déjà rédigée (avec créneaux et lien de rendez-vous) : un bouton pour la relire et l'envoyer, sans ouvrir l'app
  const envoyer = r.reply_body && !dry ? await (await import("./matin.ts")).lienReponse(ws as Workspace, r.id).catch(() => "") : r.reply_body ? "(lien)" : "";
  const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const text = [
    `${who}${p.city ? ` (${p.city})` : ""} vient de répondre : ${LABEL[r.class]}.`,
    r.summary ? `\nEn bref : ${r.summary}` : "",
    `\nSon message :\n« ${String(r.body ?? "").trim().slice(0, 600)}${String(r.body ?? "").length > 600 ? "…" : ""} »`,
    `\nContact : ${[p.contact_name && `${p.contact_name}${p.contact_role ? `, ${p.contact_role}` : ""}`, r.from_email, p.phone].filter(Boolean).join(" · ")}`,
    r.reply_body ? `\nTa réponse est prête (avec des créneaux pour le rendez-vous) :\n\n${String(r.reply_body).trim()}\n\n${envoyer ? `Relire et envoyer : ${envoyer}` : `Relis-la et envoie-la${link ? ` ici : ${link}` : " dans Réponses"}`}` : link ? `\nRéponds-lui ici : ${link}` : "",
    `\nRépondre dans l'heure multiplie les chances d'obtenir le rendez-vous.`,
  ].join("\n");
  if (dry) return { to, subject, text };
  // Sur le téléphone d'abord (quelques secondes), puis par e-mail
  const { pushWorkspace } = await import("./push.ts");
  const push = await pushWorkspace(ws.id, {
    title: `${who} ${LABEL[r.class]}`,
    body: r.reply_body ? `${r.summary || String(r.body ?? "").trim().slice(0, 120)}\nTa réponse est prête : touche pour la relire et l'envoyer.` : (r.summary || String(r.body ?? "").trim().slice(0, 160)),
    url: `/reponses?id=${r.id}`, tag: `reponse-${r.id}`,
  }).catch((e) => { console.error("push", e); return { envoyes: 0 }; });
  if (!to && !push.envoyes) return { skipped: "aucune adresse d'équipe ni téléphone abonné" };
  // Pas de « répondre à cet e-mail » : la réponse citerait au prospect le texte interne de l'alerte
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;color:#15161A">
<p style="font-size:20px;font-weight:800;margin:0">${esc(who)} ${esc(LABEL[r.class])}</p>
${r.summary ? `<p style="font-size:15px;color:#55575F;margin:6px 0 0">${esc(r.summary)}</p>` : ""}
<div style="margin:16px 0;border-left:3px solid #F1E2D2;padding:4px 0 4px 12px;font-size:14px;line-height:1.55;white-space:pre-line;color:#55575F">${esc(String(r.body ?? "").trim().slice(0, 900))}</div>
${r.reply_body ? `<div style="border:1px solid #F1E2D2;border-radius:16px;padding:16px;margin:16px 0">
<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#C2410C">Ta réponse est prête</p>
<p style="margin:0;font-size:14px;line-height:1.55;white-space:pre-line">${esc(String(r.reply_body).trim())}</p>
${envoyer ? `<p style="margin:16px 0 0"><a href="${esc(envoyer)}" style="display:inline-block;background:#E8571C;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">Relire et envoyer</a></p>` : ""}
</div>` : link ? `<p><a href="${esc(link)}">Lui répondre</a></p>` : ""}
<p style="font-size:13px;color:#8A8C93">Contact : ${esc([p.contact_name, r.from_email, p.phone].filter(Boolean).join(" · "))}<br>Répondre dans l'heure multiplie les chances d'obtenir le rendez-vous. Rien ne part sans ta confirmation.</p></div>`;
  if (to) await sendSystem({ to, subject, text, html, fromName: `Bingoo! · ${who}` });
  await admin.from("replies").update({ notified_at: new Date().toISOString() }).eq("id", replyId);
  return { sent: true, to, telephones: push.envoyes };
}

/** Rapport hebdomadaire (lundi matin) : ce qui a été fait, ce qui en est sorti, ce qui attend. */
export async function weeklyReport(ws: Workspace, dry = false) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [found, enquetes, sent, replies, hot, meetings, drafts, toHandle] = await Promise.all([
    count(admin.from("prospects").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).gte("created_at", since)),
    count(admin.from("activity").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("kind", "enquete").gte("created_at", since)),
    count(admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", since)),
    count(admin.from("replies").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).gte("created_at", since).neq("class", "absence")),
    count(admin.from("replies").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).gte("created_at", since).in("class", HOT)),
    count(admin.from("meetings").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).gte("created_at", since).neq("status", "annule")),
    count(admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "brouillon")),
    count(admin.from("replies").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("handled", false).in("class", HOT)),
  ]);
  // La promesse en chiffres : décideurs trouvés et comment les joindre (toute la base active, et l'évolution sur 7 jours)
  const P = () => admin.from("prospects").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).neq("status", "ignore");
  const [dec, mails, tels, joign, decNew, mailsNew, telsNew] = await Promise.all([
    count(P().neq("contact_name", "")), count(P().neq("email", "")), count(P().neq("phone", "")), count(P().or("email.neq.,phone.neq.")),
    count(P().neq("contact_name", "").gte("created_at", since)), count(P().neq("email", "").gte("enriched_at", since)), count(P().neq("phone", "").gte("phone_checked_at", since)),
  ]);
  const { data: missions } = await admin.from("missions").select("objective, status, stop_reason, journal").eq("workspace_id", ws.id).in("status", ["active", "pause"]).limit(3);
  if (!dec && !found && !enquetes && !sent && !replies && !drafts && !toHandle && !(missions ?? []).length) return { skipped: "aucune activité" };
  const STOP: Record<string, string> = { echeance: "échéance atteinte", budget: "budget atteint", objectif: "objectif atteint" };
  // La salle de pilotage, pour la semaine qui vient de finir (calculée dimanche soir)
  const { pilotage, debutSemaine } = await import("./pilotage.ts");
  const pl = await pilotage(ws, { now: new Date(debutSemaine(new Date()).getTime() - 60000) }).catch(() => null);
  const eur = (x: number) => `${x.toLocaleString("fr-FR")} €`;
  const pct = (a: { fait: number; total: number }) => (a.total ? `${a.fait} sur ${a.total}` : "rien à mesurer");
  const top = pl?.zones.filter((z) => z.semaine > 0).sort((a, b) => b.semaine - a.semaine)[0];
  const tard = pl ? pl.anneaux.reactivite.total - pl.anneaux.reactivite.fait : 0;
  const pilot = pl ? [
    `\nTon pilotage`,
    `- Objectif : ${pl.rdv} rendez-vous sur ${pl.objectif}${pl.rdv >= pl.objectif ? " (objectif atteint)" : ""}`,
    ...(pl.pipeline ? [`- Pipeline estimé : ${eur(pl.pipeline.montant)} (${pl.pipeline.rdv_ouverts} rendez-vous en cours × ${eur(pl.pipeline.valeur)} × ${pl.pipeline.taux} %)`] : []),
    ...(top ? [`- ${top.nom} : ${top.pct} % de tes entreprises cibles contactées (+${top.semaine} cette semaine)`] : []),
    pl.anneaux.reactivite.total ? `- Réactivité : ${pct(pl.anneaux.reactivite)} réponses positives traitées le jour même` : `- Réactivité : aucune réponse positive à traiter`,
    `- Régularité : ${pl.anneaux.regularite.fait} jour${pl.anneaux.regularite.fait > 1 ? "s" : ""} actif${pl.anneaux.regularite.fait > 1 ? "s" : ""} sur 5`,
    ...(pl.record ? [`- Record : ${pl.record} rendez-vous en une semaine`] : []),
    ...(tard > 0 ? [`\nLe point à travailler : ${tard} réponse${tard > 1 ? "s" : ""} positive${tard > 1 ? "s ont" : " a"} attendu plus d'un jour. Ce sont celles qui se refroidissent le plus vite.`] : []),
  ] : [];
  const lines = [
    `Bonjour${ws.sender_name ? ` ${ws.sender_name.split(" ")[0].replace(/^./, (c) => c.toUpperCase())}` : ""},`,
    `\nVoici ta semaine de prospection.`,
    `\nTes contacts`,
    `- ${n(dec, "décideur trouvé", "décideurs trouvés")}${decNew ? ` (+${decNew} cette semaine)` : ""}`,
    `- ${n(mails, "e-mail vérifié", "e-mails vérifiés")}${mailsNew ? ` (+${mailsNew})` : ""}, ${n(tels, "téléphone")}${telsNew ? ` (+${telsNew})` : ""}`,
    `- ${n(joign, "entreprise joignable", "entreprises joignables")} par e-mail ou téléphone`,
    `\nCe que tes agents ont fait (7 derniers jours)`,
    `- ${n(found, "entreprise trouvée", "entreprises trouvées")}`,
    `- ${n(enquetes, "enquête menée", "enquêtes menées")} pour trouver le bon contact`,
    `- ${n(sent, "e-mail envoyé", "e-mails envoyés")}`,
    `\nCe que ça a donné`,
    `- ${n(replies, "réponse")}, dont ${n(hot, "positive")}`,
    `- ${n(meetings, "rendez-vous obtenu", "rendez-vous obtenus")}`,
    ...(drafts || toHandle ? [`\nCe qui t'attend`, ...(toHandle ? [`- ${n(toHandle, "réponse positive", "réponses positives")} à traiter en priorité`] : []), ...(drafts ? [`- ${n(drafts, "e-mail prêt", "e-mails prêts")} à valider`] : [])] : []),
    ...pilot,
    ...((missions ?? []).length ? [`\nTes missions`, ...(missions ?? []).map((m) => `- ${String(m.objective).slice(0, 160)} : ${m.status === "active" ? "en cours" : `en pause${m.stop_reason ? ` (${STOP[m.stop_reason] ?? m.stop_reason})` : ""}`}`)] : []),
    appLink(ws, "/") ? `\nOuvrir Bingoo! : ${appLink(ws, "/")}` : "",
    `\nBonne semaine !`,
  ];
  const to = await teamAddress(ws);
  const subject = `Ta semaine : ${n(dec, "décideur", "décideurs")}, ${n(joign, "joignable", "joignables")}, ${n(replies, "réponse")}, ${n(meetings, "rendez-vous", "rendez-vous")}`;
  const text = lines.join("\n");
  if (dry) return { to, subject, text };
  if (!to) return { skipped: "aucune adresse d'équipe" };
  await sendSystem({ to, subject, text, fromName: "Bingoo!" });
  return { sent: true, to };
}
