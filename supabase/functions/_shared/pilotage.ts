// Salle de pilotage : un seul calcul pour la page et pour le récap du lundi. Uniquement des données réelles :
// rendez-vous, réponses, messages, prospects placés sur la carte. Les montants en euros n'apparaissent que si le
// client a saisi la valeur d'un client et la part des rendez-vous qui signent (estimation, toujours expliquée).
import { admin, type Workspace } from "./core.ts";
import { parisParts, parisToUtc } from "./time.ts";

export const HOT = ["interesse", "question", "prix", "rappel"];
const CONTACTE = ["envoye", "repondu", "rdv", "client", "refus"];
const LI_CONTACT = ["invite", "connecte", "message_envoye", "retire"];
type Reglages = { objectif_rdv?: number; valeur_client?: number; taux_signature?: number };
type P = { id: string; name: string; status: string; linkedin_status: string | null; postal_code: string | null; city: string | null; geo_lat: number | null; geo_lon: number | null; contact_name: string | null; email: string | null; linkedin_url: string | null; signals: unknown; strategique: boolean | null; score: number | null };

const jourParis = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
/** Lundi 0 h (heure de Paris) de la semaine de `now`, décalé de `k` semaines. */
export function debutSemaine(now = new Date(), k = 0) {
  const p = parisParts(now);
  return parisToUtc(p.y, p.m, p.d - (p.wd - 1) - 7 * k, 0, 0);
}
const titre = (s: string) => s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());
/** Le quartier d'un prospect : arrondissement pour Paris, Lyon, Marseille ; sinon la ville. */
export function quartier(p: { postal_code?: string | null; city?: string | null }) {
  const cp = String(p.postal_code ?? "").trim();
  const arr = (n: number) => `${n}${n === 1 ? "er" : "e"}`;
  if (/^750\d\d$/.test(cp)) return { cle: cp, nom: `Paris ${arr(Number(cp.slice(3)))}` };
  if (/^6900\d$/.test(cp)) return { cle: cp, nom: `Lyon ${arr(Number(cp.slice(4)))}` };
  if (/^130\d\d$/.test(cp) && Number(cp.slice(3)) >= 1 && Number(cp.slice(3)) <= 16) return { cle: cp, nom: `Marseille ${arr(Number(cp.slice(3)))}` };
  const c = String(p.city ?? "").trim();
  return c ? { cle: c.toLowerCase(), nom: titre(c) } : null;
}
/** Taille de l'entreprise (signal « 250 à 499 salariés ») : le bas de la fourchette. */
export function taille(signals: unknown) {
  for (const s of Array.isArray(signals) ? signals as { label?: string }[] : []) {
    const m = String(s?.label ?? "").match(/(\d[\d\s]*)\s*(?:à|-)\s*\d[\d\s]*\s*salari/i) ?? String(s?.label ?? "").match(/(\d[\d\s]*)\s*salari/i);
    if (m) return Number(m[1].replace(/\s/g, ""));
  }
  return 0;
}
const etat = (p: P) => ["rdv", "client"].includes(p.status) ? "gagne" : p.status === "repondu" ? "discussion" : CONTACTE.includes(p.status) || LI_CONTACT.includes(p.linkedin_status ?? "") ? "contacte" : "a_contacter";

async function all<T>(q: (from: number) => PromiseLike<{ data: T[] | null }>) {
  const out: T[] = [];
  for (let i = 0; i < 20; i++) { const { data } = await q(i * 1000); out.push(...(data ?? [])); if ((data ?? []).length < 1000) break; }
  return out;
}

export async function pilotage(ws: Workspace & { pilotage?: Reglages | null; autonomy?: string }, opts: { now?: Date; carte?: boolean } = {}) {
  const now = opts.now ?? new Date();
  const reg: Reglages = ws.pilotage ?? {};
  const objectif = Math.max(1, Math.round(reg.objectif_rdv ?? 5));
  const valeur = Number(reg.valeur_client) > 0 ? Number(reg.valeur_client) : null;
  const taux = Number(reg.taux_signature) > 0 ? Math.min(100, Number(reg.taux_signature)) : null;
  const lundi = debutSemaine(now), lundiIso = lundi.toISOString();
  const pj = parisParts(now);
  const ouvres = Math.min(5, pj.wd); // jours ouvrés commencés (lundi = 1)
  const ecoule = Math.min(5, Math.max(0.2, (pj.wd <= 5 ? pj.wd - 1 + Math.min(1, Math.max(0, (pj.h - 8) / 10)) : 5)));

  const [prospects, rdvSemaine, hots, jours, rdv12, drafts, liTodo, opps, envoisSemaine] = await Promise.all([
    all<P>((f) => admin.from("prospects").select("id, name, status, linkedin_status, postal_code, city, geo_lat, geo_lon, contact_name, email, linkedin_url, signals, strategique, score").eq("workspace_id", ws.id).neq("status", "ignore").range(f, f + 999)),
    admin.from("meetings").select("id, prospect_id, created_at").eq("workspace_id", ws.id).gte("created_at", lundiIso).neq("status", "annule"),
    admin.from("replies").select("id, prospect_id, class, created_at, handled, handled_at, summary, from_name").eq("workspace_id", ws.id).in("class", HOT).gte("created_at", new Date(lundi.getTime() - 14 * 864e5).toISOString()).order("created_at", { ascending: false }),
    admin.from("pilotage_jours").select("jour").eq("workspace_id", ws.id).gte("jour", jourParis(lundi)),
    admin.from("meetings").select("created_at").eq("workspace_id", ws.id).gte("created_at", debutSemaine(now, 12).toISOString()).neq("status", "annule"),
    admin.from("messages").select("id, prospect_id", { count: "exact" }).eq("workspace_id", ws.id).eq("status", "brouillon").limit(200),
    admin.from("prospects").select("id, name", { count: "exact" }).eq("workspace_id", ws.id).eq("linkedin_status", "").neq("linkedin_note", "").neq("status", "ignore").limit(50),
    admin.from("radar_opps").select("id, company, title, why, score, kind").eq("workspace_id", ws.id).eq("status", "nouveau").gte("score", 70).order("score", { ascending: false }).limit(3),
    admin.from("messages").select("prospect_id, sent_at").eq("workspace_id", ws.id).eq("status", "envoye").eq("step", 0).gte("sent_at", lundiIso).limit(2000),
  ]);
  const byId = new Map(prospects.map((p) => [p.id, p]));

  // Résultats : les rendez-vous de la semaine, l'objectif, la prévision au rythme actuel
  const rdv = (rdvSemaine.data ?? []).length;
  const tot = pj.wd >= 6 || ecoule >= 5;
  const prevision = tot ? rdv : Math.max(rdv, Math.round((rdv / ecoule) * 5));
  // Réactivité : les réponses positives de la semaine traitées le jour même
  const hotSemaine = (hots.data ?? []).filter((r) => r.created_at >= lundiIso);
  const reactifs = hotSemaine.filter((r) => r.handled_at && jourParis(new Date(r.handled_at)) === jourParis(new Date(r.created_at))).length;
  const aJuger = hotSemaine.filter((r) => r.handled || jourParis(new Date(r.created_at)) < jourParis(now)).length;
  // Régularité : les jours ouvrés de la semaine où l'équipe a agi
  const joursFaits = (jours.data ?? []).filter((j) => { const d = new Date(`${j.jour}T12:00:00Z`).getUTCDay(); return d >= 1 && d <= 5; }).length;
  // Record : la meilleure semaine des 12 dernières
  const parSemaine = new Map<number, number>();
  for (const m of rdv12.data ?? []) { const k = Math.floor((new Date(m.created_at).getTime() - debutSemaine(now, 12).getTime()) / (7 * 864e5)); parSemaine.set(k, (parSemaine.get(k) ?? 0) + 1); }
  const record = Math.max(0, ...[...parSemaine.entries()].filter(([k]) => k <= 12).map(([, v]) => v));

  // Pipeline estimé : les rendez-vous obtenus pas encore signés × valeur d'un client × part qui signe
  const ouverts = prospects.filter((p) => p.status === "rdv").length, clients = prospects.filter((p) => p.status === "client").length;
  const pipeline = valeur && taux ? { montant: Math.round(ouverts * valeur * (taux / 100)), semaine: Math.round(rdv * valeur * (taux / 100)), gagne: clients * valeur, rdv_ouverts: ouverts, clients, valeur, taux } : null;
  const parReponse = valeur && taux ? Math.round(valeur * (taux / 100)) : null;

  // Part de marché : par quartier, sur les prospects placés sur la carte
  const premiers = new Set((envoisSemaine.data ?? []).map((m) => m.prospect_id));
  const zones = new Map<string, { cle: string; nom: string; lat: number; lon: number; cibles: number; contactees: number; discussion: number; gagnees: number; semaine: number }>();
  for (const p of prospects) {
    if (p.geo_lat == null || p.geo_lon == null) continue;
    const q = quartier(p);
    if (!q) continue;
    const z = zones.get(q.cle) ?? { ...q, lat: 0, lon: 0, cibles: 0, contactees: 0, discussion: 0, gagnees: 0, semaine: 0 };
    z.lat += p.geo_lat; z.lon += p.geo_lon; z.cibles++;
    const e = etat(p);
    if (e !== "a_contacter") z.contactees++;
    if (e === "discussion") z.discussion++;
    if (e === "gagne") z.gagnees++;
    if (premiers.has(p.id)) z.semaine++;
    zones.set(q.cle, z);
  }
  const zl = [...zones.values()].map((z) => ({ ...z, lat: z.lat / z.cibles, lon: z.lon / z.cibles, pct: Math.round((z.contactees / z.cibles) * 100) })).sort((a, b) => b.cibles - a.cibles);

  // Comptes stratégiques : choisis par le client, sinon les entreprises de 50 salariés et plus
  const strat = prospects.filter((p) => p.strategique === true || (p.strategique == null && taille(p.signals) >= 50 && !["refus"].includes(p.status)))
    .sort((a, b) => Number(b.strategique === true) - Number(a.strategique === true) || taille(b.signals) - taille(a.signals) || (b.score ?? 0) - (a.score ?? 0)).slice(0, 8);
  const sent = strat.length ? await admin.from("messages").select("prospect_id, sent_at").in("prospect_id", strat.map((p) => p.id)).eq("status", "envoye").order("sent_at") : { data: [] };
  const draftOf = new Set((drafts.data ?? []).map((m) => m.prospect_id));
  const comptes = strat.map((p) => {
    const first = (sent.data ?? []).find((m) => m.prospect_id === p.id)?.sent_at ?? null;
    const etapes = [
      { label: p.contact_name ? `Décideur identifié : ${p.contact_name}` : "Décideur à identifier", fait: !!p.contact_name },
      { label: p.email ? "E-mail vérifié" : p.linkedin_url ? "Profil LinkedIn trouvé" : "Contact à trouver", fait: !!(p.email || p.linkedin_url) },
      { label: "Premier contact", fait: !!first || LI_CONTACT.includes(p.linkedin_status ?? ""), date: first },
      { label: "Échange en cours", fait: ["repondu", "rdv", "client"].includes(p.status) },
      { label: "Rendez-vous", fait: ["rdv", "client"].includes(p.status) },
      { label: "Client", fait: p.status === "client" },
    ];
    const n = etapes.findIndex((e) => !e.fait);
    const prochaine = n < 0 ? null : n === 0 ? { texte: "Trouver le décideur", lien: "/prospects" }
      : n === 1 ? { texte: "Chercher son e-mail ou son profil LinkedIn", lien: "/prospects" }
      : n === 2 ? (draftOf.has(p.id) ? { texte: "Valider le premier message", lien: "/valider" } : p.linkedin_status === "" && p.linkedin_url ? { texte: "Préparer l'invitation LinkedIn", lien: "/linkedin" } : { texte: "Préparer le premier message", lien: "/prospects" })
      : n === 3 ? { texte: "Attendre sa réponse (relance prévue)", lien: "/prospects" } : n === 4 ? { texte: "Proposer un rendez-vous", lien: "/reponses" } : { texte: "Conclure", lien: "/devis" };
    return { id: p.id, nom: p.name, taille: taille(p.signals), choisi: p.strategique === true, etapes, faites: etapes.filter((e) => e.fait).length, prochaine };
  });

  // Les priorités du matin : ce qui rapporte le plus, d'abord
  const priorites: { type: string; titre: string; detail: string; valeur: number | null; lien: string; prospect_id?: string }[] = [];
  for (const r of (hots.data ?? []).filter((r) => !r.handled).slice(0, 3)) {
    const p = byId.get(r.prospect_id);
    priorites.push({ type: "reponse", titre: `${p?.name ?? r.from_name ?? "Un prospect"} a répondu`, detail: String(r.summary ?? "Réponse positive à traiter").slice(0, 120), valeur: parReponse, lien: "/reponses", prospect_id: r.prospect_id });
  }
  const strNext = comptes.find((c) => c.prochaine && ["/valider", "/linkedin"].includes(c.prochaine.lien));
  if (strNext) priorites.push({ type: "compte", titre: `${strNext.nom} : étape ${strNext.faites + 1} sur 6`, detail: `Compte stratégique · ${strNext.prochaine!.texte.toLowerCase()}`, valeur: valeur, lien: strNext.prochaine!.lien, prospect_id: strNext.id });
  if ((drafts.count ?? 0) > 0) priorites.push({ type: "messages", titre: `${drafts.count} message${drafts.count! > 1 ? "s" : ""} prêt${drafts.count! > 1 ? "s" : ""} à valider`, detail: "Rien ne part sans toi", valeur: null, lien: "/valider" });
  if ((liTodo.count ?? 0) > 0) priorites.push({ type: "linkedin", titre: `${liTodo.count} invitation${liTodo.count! > 1 ? "s" : ""} LinkedIn à valider`, detail: "Lina les envoie aux heures de bureau", valeur: null, lien: "/linkedin" });
  for (const o of (opps.data ?? []).slice(0, 1)) priorites.push({ type: "opportunite", titre: `Opportunité : ${o.company}`, detail: String(o.why || o.title || "").slice(0, 120), valeur: null, lien: "/radar" });

  const pointsCarte = opts.carte ? prospects.filter((p) => p.geo_lat != null).slice(0, 3000).map((p) => ({ id: p.id, n: p.name, lat: p.geo_lat, lon: p.geo_lon, e: etat(p) })) : undefined;
  return {
    semaine: { lundi: lundiIso, jour: Math.min(5, pj.wd), ouvres },
    objectif, rdv, prevision, manque: Math.max(0, objectif - prevision),
    anneaux: { reactivite: { fait: reactifs, total: aJuger }, regularite: { fait: joursFaits, total: ouvres }, resultats: { fait: rdv, total: objectif } },
    pipeline, par_reponse: parReponse, record, reglages: { objectif_rdv: objectif, valeur_client: valeur, taux_signature: taux },
    zones: zl.slice(0, 40), points: pointsCarte, comptes, priorites: priorites.slice(0, 5),
    places: prospects.filter((p) => p.geo_lat != null).length, total: prospects.length,
  };
}
