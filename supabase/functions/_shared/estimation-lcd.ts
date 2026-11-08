// Estimation de revenus en location courte durée + qualification du propriétaire (page publique /estimation/<slug>).
// Le propriétaire répond à quelques questions et donne son accord pour être recontacté : la fiche arrive dans l'espace,
// notée (chaud / tiède / froid), avec une fourchette honnête (hypothèses et sources visibles) et un lien de rendez-vous.
import { admin, askJson, log, setAi, type Workspace } from "./core.ts";
import { HttpError } from "./http.ts";

const TYPES: Record<string, { label: string; voyageurs: number }> = {
  studio: { label: "Studio", voyageurs: 2 }, t2: { label: "2 pièces", voyageurs: 4 }, t3: { label: "3 pièces", voyageurs: 6 },
  t4: { label: "4 pièces ou plus", voyageurs: 8 }, maison: { label: "Maison", voyageurs: 8 },
};
const SITUATIONS: Record<string, [string, number]> = {
  seul: ["Je le loue déjà en courte durée et je gère seul", 3], conciergerie: ["Il est géré par une autre conciergerie", 2],
  vide: ["Il est vide", 2], annee: ["Il est loué à l'année", 1],
};
const DISPOS: Record<string, [string, number]> = {
  maintenant: ["Tout de suite", 3], trois_mois: ["Dans les 3 mois", 2], plus_tard: ["Plus tard", 1], renseigne: ["Je me renseigne", 0],
};
const USAGES: Record<string, [string, number]> = {
  principale: ["Ma résidence principale", 0], secondaire: ["Une résidence secondaire", 1], investissement: ["Un investissement locatif", 1],
};
const euros = (n: number) => `${Math.round(n / 10) * 10} €`.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export async function estimationInfo(slug: string) {
  const { data: ws } = await admin.from("workspaces").select("id, name, profile, zone, booking_slug").eq("booking_slug", slug).maybeSingle();
  if (!ws) throw new HttpError(404, "Cette page n'existe pas");
  return { nom: (ws.profile as { nom?: string } | null)?.nom || ws.name, zone: ws.zone ?? [] };
}

export async function estimationSubmit(slug: string, b: Record<string, unknown>) {
  const { data: w } = await admin.from("workspaces").select("*").eq("booking_slug", slug).maybeSingle();
  if (!w) throw new HttpError(404, "Cette page n'existe pas");
  const ws = w as Workspace;
  const s = (k: string, n = 120) => String(b[k] ?? "").trim().slice(0, n);
  const ville = s("ville", 80), cp = s("cp", 5).replace(/\D/g, ""), type = s("type", 20), situation = s("situation", 20), dispo = s("dispo", 20), usage = s("usage", 20);
  const chambres = Math.max(0, Math.min(10, Number(b.chambres) || 0));
  const prenom = s("prenom", 60), nom = s("nom", 60), email = s("email", 200).toLowerCase(), tel = s("tel", 30);
  if (!ville || !/^\d{5}$/.test(cp)) throw new HttpError(400, "Indique la ville et le code postal du logement");
  if (!TYPES[type] || !SITUATIONS[situation] || !DISPOS[dispo] || !USAGES[usage]) throw new HttpError(400, "Réponds à toutes les questions");
  if (!prenom || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Prénom et e-mail sont nécessaires pour t'envoyer l'estimation");
  if (b.accord !== true) throw new HttpError(400, "Coche la case pour accepter d'être recontacté");
  const dept = cp.slice(0, 2);
  const brand = (ws.profile as { nom?: string } | null)?.nom || ws.name;

  // 1. Prix par nuit et taux d'occupation observés pour ce type de bien et cette ville (recherche web, sources gardées)
  setAi({ ws: ws.id, feature: "estimation-lcd" });
  const t = TYPES[type];
  const m = await askJson<{ nuit_basse: number; nuit_haute: number; occ_basse: number; occ_haute: number; hypotheses: string[]; sources: { titre: string; url: string }[] }>(
    `Estime, pour une location de courte durée (type Airbnb) d'un logement « ${t.label} » (${chambres || "?"} chambre(s), jusqu'à ${t.voyageurs} voyageurs) à ${ville} (${cp}), le prix moyen par nuit et le taux d'occupation annuel moyen.
Cherche des données publiques récentes (études de marché, statistiques de location courte durée, annonces comparables) : 2 recherches au plus.
Donne une fourchette prudente : nuit_basse et nuit_haute en euros, occ_basse et occ_haute en pourcentage (0 à 100). N'invente aucune source : uniquement des pages que tu as réellement consultées.
hypotheses : 2 à 4 phrases courtes sur ce que tu as supposé (saisonnalité, quartier, standing moyen…).
Format : {"nuit_basse": 0, "nuit_haute": 0, "occ_basse": 0, "occ_haute": 0, "hypotheses": [""], "sources": [{"titre": "", "url": ""}]}`,
    { maxTokens: 1500, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }] },
  ).catch(() => null);
  const ok = m && m.nuit_basse > 0 && m.nuit_haute >= m.nuit_basse && m.occ_basse > 0 && m.occ_haute >= m.occ_basse && m.occ_haute <= 100;
  // Résidence principale : 120 nuits par an au plus (90 si la commune l'a décidé)
  const plafond = usage === "principale" ? 120 : 365;
  const nuits = (occ: number) => Math.min(365 * occ / 100, plafond);
  const est = ok ? {
    prudent: Math.round(m!.nuit_basse * nuits(m!.occ_basse) / 12), probable: Math.round(((m!.nuit_basse + m!.nuit_haute) / 2) * nuits((m!.occ_basse + m!.occ_haute) / 2) / 12),
    nuit: [Math.round(m!.nuit_basse), Math.round(m!.nuit_haute)], occ: [Math.round(m!.occ_basse), Math.round(m!.occ_haute)],
    hypotheses: [...(m!.hypotheses ?? []).slice(0, 4).map((x) => String(x).slice(0, 220)), ...(usage === "principale" ? ["Résidence principale : la location est limitée à 120 nuits par an (90 si la commune l'a décidé)."] : [])],
    sources: (m!.sources ?? []).filter((x) => /^https?:\/\//.test(x?.url ?? "")).slice(0, 4),
  } : null;

  // 2. Qualification : disponibilité, situation actuelle, usage, zone couverte
  const dansZone = (ws.zone ?? []).includes(dept);
  const points = DISPOS[dispo][1] + SITUATIONS[situation][1] + USAGES[usage][1] + (dansZone ? 2 : 0);
  const niveau = !dansZone ? "hors zone" : points >= 7 ? "chaud" : points >= 5 ? "tiède" : "froid";

  // 3. La fiche dans l'espace (accord donné : le propriétaire peut être recontacté par e-mail et par téléphone)
  const resume = `${t.label}${chambres ? `, ${chambres} ch.` : ""} à ${ville} (${cp}) · ${SITUATIONS[situation][0]} · Disponible : ${DISPOS[dispo][0].toLowerCase()} · ${USAGES[usage][0]}`;
  const notes = [`Estimation demandée en ligne le ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} — dossier ${niveau}.`, resume,
    est ? `Estimation affichée : ${euros(est.prudent)} à ${euros(est.probable)} par mois (nuit ${est.nuit[0]}–${est.nuit[1]} €, occupation ${est.occ[0]}–${est.occ[1]} %).` : "Estimation non calculée (données insuffisantes) : à faire au rendez-vous.",
    `Accord pour être recontacté donné sur la page d'estimation (${new Date().toISOString()}).`].join("\n");
  const { data: exist } = await admin.from("prospects").select("id, public_token").eq("workspace_id", ws.id).ilike("email", email.replace(/[%_\\]/g, "\\$&")).limit(1);
  let p = exist?.[0] as { id: string; public_token: string } | undefined;
  const champs = { contact_name: `${prenom} ${nom}`.trim(), contact_role: "Propriétaire", phone: tel || null, city: ville, postal_code: cp, activity: `Propriétaire · ${t.label}`,
    source: "Estimation en ligne", channel: "inbound", fit: niveau, fit_reason: resume, notes, next_action: niveau === "chaud" ? "Rappeler aujourd'hui : estimation demandée" : "Rappeler : estimation demandée", next_action_at: new Date().toISOString().slice(0, 10), score: Math.min(100, points * 10) };
  if (p) await admin.from("prospects").update(champs).eq("id", p.id);
  else {
    const { data, error } = await admin.from("prospects").insert({ workspace_id: ws.id, name: `${prenom} ${nom}`.trim() + ` — ${ville}`, email, status: "repondu", ...champs }).select("id, public_token").single();
    if (error) throw new HttpError(500, "Enregistrement impossible, réessaie dans un instant");
    p = data as { id: string; public_token: string };
  }
  await log(ws.id, "radar_alerte", `Nouveau propriétaire (${niveau}) : ${t.label} à ${ville}, disponible ${DISPOS[dispo][0].toLowerCase()}`);
  try {
    const { teamAddress, sendSystem } = await import("./mail.ts");
    const to = await teamAddress(ws);
    if (to) await sendSystem({ to, replyTo: email, subject: `Propriétaire ${niveau} : ${t.label} à ${ville}`, text: `${prenom} ${nom} vient de demander une estimation.\n\n${resume}\nE-mail : ${email}\nTéléphone : ${tel || "non renseigné"}\n\n${est ? `Estimation affichée : ${euros(est.prudent)} à ${euros(est.probable)} par mois.` : "Estimation non calculée : à faire au rendez-vous."}\n\nLa fiche est dans ton espace ${brand}.` });
  } catch (e) { console.error("alerte estimation", e); }

  return { niveau, estimation: est ? { ...est, prudent_txt: euros(est.prudent), probable_txt: euros(est.probable) } : null, rdv: `/rdv/${slug}?t=${p.public_token}`, nom: brand };
}
