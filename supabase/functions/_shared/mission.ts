// Kairo Mission : un objectif commercial suivi dans le temps.
// Règles : clients signés et RDV obtenus sont toujours comptés séparément ; les projections sont des fourchettes
// présentées comme des hypothèses, remplacées par les vrais taux dès qu'il y a assez de données. Rien n'est garanti.
import { HttpError } from "./http.ts";
import { admin, askJson, log, planOk, quota, setAi, type Target, type Workspace } from "./core.ts";
import { searchTarget } from "./search.ts";
import { draft, enrich } from "./agents.ts";
import { radarToProspect } from "./radar.ts";
import type { Prospect } from "./core.ts";

export type Mission = {
  id: string; workspace_id: string; objective: string; goal_type: "clients" | "rdv"; goal_count: number;
  deadline: string | null; target_ids: string[]; zone: string[]; plan: Record<string, unknown>; history: Snapshot[]; status: string; created_at: string;
  auto?: boolean; journal?: { at: string; text: string }[]; run_at?: string | null;
  max_prospects?: number | null; max_budget?: number | null; signal_focus?: string[]; signal_exclude?: string[]; radar_auto?: boolean; spent?: number; stop_reason?: string | null;
};
type Snapshot = { d: string; prospects: number; contactes: number; reponses: number; rdv: number; clients: number };

// Repères prudents de la prospection B2B à froid (fourchettes basses / hautes), utilisés tant qu'il n'y a pas de vraies données
const BENCH = { rdv: [0.01, 0.03], close: [0.15, 0.35] };
const CONTACTED = ["envoye", "repondu", "rdv", "client", "refus"];
const POSITIVE = ["interesse", "question", "prix", "rappel"];
const zoneOf = (m: Mission, ws: Workspace) => (m.zone?.length ? m.zone : ws.zone ?? []);
const inZone = (cp: string, zone: string[]) => !zone.length || zone.some((z) => (cp ?? "").startsWith(z.replace(/^2[AB]$/, "20")));
const ceil = (n: number) => Math.max(1, Math.ceil(n));

/** Ce qu'il faut contacter pour viser l'objectif, en fourchette, à partir des vrais taux si on en a assez. */
export function projection(goalType: string, goal: number, s?: Stats) {
  const realRdv = s && s.contactes >= 50 && s.rdv >= 2 ? s.rdv / s.contactes : null;
  const realClose = s && s.rdv >= 5 && s.clients >= 1 ? s.clients / s.rdv : null;
  const rdv = realRdv ? [realRdv * 0.75, realRdv * 1.25] : BENCH.rdv;
  const close = realClose ? [realClose * 0.75, Math.min(1, realClose * 1.25)] : BENCH.close;
  const need = (lo: boolean) => goalType === "rdv" ? goal / (lo ? rdv[1] : rdv[0]) : goal / ((lo ? rdv[1] : rdv[0]) * (lo ? close[1] : close[0]));
  const rdvForGoal = goalType === "clients" ? [ceil(goal / close[1]), ceil(goal / close[0])] : [goal, goal];
  return {
    contacts: [ceil(need(true)), ceil(need(false))] as [number, number],
    rdv: rdvForGoal as [number, number],
    source: realRdv ? (realClose ? "tes résultats réels" : "tes résultats réels (taux de signature encore estimé)") : "repères de la prospection B2B, à confirmer avec tes résultats",
    taux: { rdv: rdv.map((x) => Math.round(x * 1000) / 10), signature: close.map((x) => Math.round(x * 100)) },
  };
}

export type Stats = {
  prospects: number; joignables: number; contactes: number; reponses: number; positives: number; rdv: number; rdv_tenus: number; clients: number; ca: number;
  a_valider: number; reponses_a_traiter: number; sans_email: number; a_enqueter: number; prets: number; rdv_sans_suite: number; devis_ouverts: number;
};

export async function missionStats(m: Mission): Promise<Stats> {
  const { data: ps } = await admin.from("prospects").select("id, status, email, enriched_at, deal_value").eq("mission_id", m.id).limit(10000);
  const list = ps ?? [];
  const ids = list.map((p) => p.id);
  const chunk = <T,>(a: T[]) => { const out: T[][] = []; for (let i = 0; i < a.length; i += 300) out.push(a.slice(i, i + 300)); return out; };
  let replies: { prospect_id: string; class: string; handled: boolean }[] = [], meetings: { prospect_id: string; status: string; followup: unknown; starts_at: string }[] = [], quotes: { status: string; total_ht: number }[] = [], drafts = 0;
  for (const c of chunk(ids)) {
    const [r, mt, q, d] = await Promise.all([
      admin.from("replies").select("prospect_id, class, handled").in("prospect_id", c),
      admin.from("meetings").select("prospect_id, status, followup, starts_at").in("prospect_id", c).neq("status", "annule"),
      admin.from("quotes").select("status, total_ht").in("prospect_id", c),
      admin.from("messages").select("id", { count: "exact", head: true }).in("prospect_id", c).eq("status", "brouillon"),
    ]);
    replies = replies.concat(r.data ?? []); meetings = meetings.concat(mt.data ?? []); quotes = quotes.concat(q.data ?? []); drafts += d.count ?? 0;
  }
  const now = Date.now();
  const rdvSet = new Set(meetings.map((x) => x.prospect_id));
  for (const p of list) if (["rdv", "client"].includes(p.status)) rdvSet.add(p.id);
  const signed = quotes.filter((q) => q.status === "signe").reduce((s, q) => s + Number(q.total_ht || 0), 0);
  return {
    prospects: list.length,
    joignables: list.filter((p) => p.email).length,
    contactes: list.filter((p) => CONTACTED.includes(p.status)).length,
    reponses: list.filter((p) => ["repondu", "rdv", "client", "refus"].includes(p.status)).length,
    positives: new Set(replies.filter((r) => POSITIVE.includes(r.class)).map((r) => r.prospect_id)).size,
    rdv: rdvSet.size,
    rdv_tenus: meetings.filter((x) => x.status === "tenu" || (x.followup && new Date(x.starts_at).getTime() < now)).length,
    clients: list.filter((p) => p.status === "client").length,
    ca: Math.round(signed),
    a_valider: drafts,
    reponses_a_traiter: replies.filter((r) => !r.handled && POSITIVE.includes(r.class)).length,
    sans_email: list.filter((p) => p.status === "sans_email").length,
    a_enqueter: list.filter((p) => p.status === "nouveau" && !p.enriched_at).length,
    prets: list.filter((p) => p.status === "pret").length,
    rdv_sans_suite: meetings.filter((x) => new Date(x.starts_at).getTime() < now - 3600e3 && !x.followup).length,
    devis_ouverts: quotes.filter((q) => ["envoye", "vu"].includes(q.status)).length,
  };
}

/** Prochaines actions, calculées à partir de l'état réel de la mission (pas d'IA : c'est fiable et explicable). */
export function nextActions(m: Mission, s: Stats, ws: Workspace) {
  const p = projection(m.goal_type, m.goal_count, s);
  const reached = (m.goal_type === "rdv" ? s.rdv : s.clients) >= m.goal_count;
  const stock = s.prets + s.a_valider + s.a_enqueter + s.sans_email;
  const toContact = Math.max(0, p.contacts[0] - s.contactes);
  const acts: { key: string; title: string; detail: string; to?: string; action?: string; n?: number }[] = [];
  if (reached) acts.push({ key: "atteint", title: "Objectif atteint", detail: "Tu peux clôturer la mission ou relever l'objectif.", action: "close" });
  if (s.reponses_a_traiter) acts.push({ key: "reponses", title: `Répondre ${s.reponses_a_traiter > 1 ? `aux ${s.reponses_a_traiter} prospects intéressés` : "au prospect intéressé"}`, detail: "Les réponses sont prêtes, avec des créneaux : chaque heure compte pour transformer un intérêt en rendez-vous.", to: "/reponses" });
  if (s.rdv_sans_suite) acts.push({ key: "suite", title: `Faire la suite de ${s.rdv_sans_suite} rendez-vous`, detail: "Note quelques lignes : Kairo prépare le compte rendu, l'e-mail de suite et le devis.", to: "/agenda" });
  if (s.devis_ouverts) acts.push({ key: "devis", title: `Suivre ${s.devis_ouverts} devis en attente`, detail: "Un devis sans réponse se relance après 4 jours.", to: "/devis" });
  if (s.a_valider) acts.push({ key: "valider", title: `Valider ${s.a_valider} e-mail${s.a_valider > 1 ? "s" : ""} prêt${s.a_valider > 1 ? "s" : ""}`, detail: "Relis et envoie d'un geste.", to: "/valider" });
  if (!reached && stock < Math.min(toContact, 60)) acts.push({ key: "chercher", title: `Rechercher ${Math.min(Math.max(toContact - stock, 25), 100)} nouvelles entreprises`, detail: `Il reste environ ${toContact.toLocaleString("fr-FR")} entreprises à contacter (hypothèse basse) et ${stock} en réserve.`, action: "search", n: Math.min(Math.max(toContact - stock, 25), 100) });
  if (s.a_enqueter && s.prets < 10) acts.push({ key: "enquete", title: `Trouver les coordonnées de ${Math.min(s.a_enqueter, 20)} entreprises`, detail: "Kairo cherche l'e-mail et le décideur de chaque entreprise.", action: "enrich" });
  if (s.prets && !s.a_valider) acts.push({ key: "rediger", title: `Rédiger ${Math.min(s.prets, 20)} e-mail${s.prets > 1 ? "s" : ""}`, detail: "Ces prospects ont un e-mail : Kairo prépare des messages personnalisés.", action: "draft" });
  if (s.sans_email > 5) acts.push({ key: "decideurs", title: `Trouver les décideurs de ${s.sans_email} entreprises sans e-mail`, detail: "Par fonction, avec e-mail vérifié quand c'est possible.", to: "/prospects" });
  if (ws.autonomy !== "auto" && !reached) acts.push({ key: "auto", title: "Activer le pilote automatique", detail: "Kairo enchaîne recherche, enquête, rédaction et relances chaque jour ouvré, dans tes limites.", to: "/reglages" });
  return acts.slice(0, 5);
}

/** Rythme : où on devrait en être à cette date, si une échéance est fixée. */
export function pace(m: Mission, s: Stats) {
  if (!m.deadline) return null;
  const start = new Date(m.created_at).getTime(), end = new Date(`${m.deadline}T23:59:59`).getTime(), now = Date.now();
  const elapsed = Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
  const done = (m.goal_type === "rdv" ? s.rdv : s.clients) / m.goal_count;
  const days = Math.ceil((end - now) / 864e5);
  return { elapsed: Math.round(elapsed * 100), done: Math.round(done * 100), days_left: days, ahead: done >= elapsed * 0.9, early: elapsed < 0.1 && done < 1 };
}

async function assign(ws: Workspace, m: Mission, max: number) {
  const zone = zoneOf(m, ws);
  const { data } = await admin.from("prospects").select("id, postal_code").eq("workspace_id", ws.id).is("mission_id", null)
    .in("target", m.target_ids.length ? m.target_ids : (ws.targets ?? []).map((t) => t.id))
    .in("status", ["nouveau", "pret", "sans_email", "a_valider"]).order("score", { ascending: false, nullsFirst: false }).limit(3000);
  const ids = (data ?? []).filter((p) => inZone(p.postal_code, zone)).slice(0, max).map((p) => p.id);
  for (let i = 0; i < ids.length; i += 200) await admin.from("prospects").update({ mission_id: m.id }).in("id", ids.slice(i, i + 200));
  return ids.length;
}

/** Recherche de nouvelles entreprises pour la mission, puis rattachement. */
export async function missionSearch(ws: Workspace, m: Mission, wanted = 50) {
  const targets = ws.targets ?? [];
  const chosen = targets.filter((t) => (m.target_ids.length ? m.target_ids.includes(t.id) : t.actif !== false) && t.next_page !== null);
  if (!chosen.length) throw new HttpError(400, "Toutes les entreprises de ces cibles ont déjà été trouvées : ajoute une cible ou élargis la zone.");
  let inserted = 0;
  for (const t of chosen) {
    if (inserted >= wanted) break;
    await quota(ws.id, "recherche", 60);
    const r = await searchTarget(ws.id, t as Target, zoneOf(m, ws), 2);
    t.next_page = r.nextPage; inserted += r.inserted;
    await log(ws.id, "recherche", `${t.label} : ${r.inserted} nouveaux établissements (mission)`);
  }
  await admin.from("workspaces").update({ targets }).eq("id", ws.id);
  const linked = await assign(ws, m, m.max_prospects ? wanted : Math.max(wanted, inserted));
  return { inserted, linked };
}

/** Plan proposé à partir de l'objectif écrit en langage naturel. Rien n'est lancé tant que l'utilisateur ne valide pas. */
export async function planMission(ws: Workspace, objective: string) {
  const text = objective.trim().slice(0, 600);
  if (text.length < 8) throw new HttpError(400, "Décris ton objectif en une phrase, par exemple : « Trouver 15 nouveaux clients à Lyon d'ici fin janvier »");
  const targets = (ws.targets ?? []).map((t) => ({ id: t.id, label: t.label, interlocuteur: t.interlocuteur }));
  const today = new Date().toISOString().slice(0, 10);
  const r = await askJson<{ type: string; nombre: number; echeance: string; departements: string[]; cibles: string[]; cibles_manquantes: string; reformulation: string; conseils: string[] }>(
    `Un dirigeant fixe un objectif commercial à son outil de prospection. Interprète-le précisément, sans rien inventer.
Entreprise : ${ws.profile?.nom ?? ws.name} — ${ws.profile?.offre ?? ""}
Zone habituelle : ${(ws.zone ?? []).join(", ") || "toute la France"}
Cibles déjà définies : ${JSON.stringify(targets)}
Aujourd'hui : ${today}
Objectif écrit : « ${text} »

Règles :
- type : "clients" si l'objectif parle de clients, contrats, ventes ou signatures ; "rdv" s'il parle de rendez-vous, démos ou échanges. Un rendez-vous n'est pas un client.
- nombre : le nombre visé (entier). S'il n'est pas écrit, mets 10.
- echeance : date AAAA-MM-JJ si une échéance est indiquée (« fin janvier », « en 3 mois »), sinon "".
- departements : codes à 2 caractères si une ville ou une région est citée (Lyon → 69 ; Île-de-France → 75, 77, 78, 91, 92, 93, 94, 95), sinon liste vide.
- cibles : identifiants des cibles existantes qui correspondent (toutes si l'objectif ne précise pas de type de client).
- cibles_manquantes : si l'objectif vise un type de client absent des cibles, décris-le en une phrase, sinon "".
- reformulation : l'objectif reformulé clairement en une phrase.
- conseils : 2 ou 3 conseils concrets et prudents pour cette mission (pas de promesse de résultat). Désigne les cibles par leur nom, jamais par leur identifiant.
Format : {"type": "clients", "nombre": 10, "echeance": "", "departements": [], "cibles": [], "cibles_manquantes": "", "reformulation": "", "conseils": [""]}`,
    { fast: true, maxTokens: 1500 });
  const goal_type = r.type === "rdv" ? "rdv" : "clients";
  const goal_count = Math.min(Math.max(Math.round(Number(r.nombre) || 10), 1), 10000);
  const target_ids = (r.cibles ?? []).filter((id) => targets.some((t) => t.id === id));
  const zone = (r.departements ?? []).map((d) => String(d).toUpperCase()).filter((d) => /^(\d{2}|2A|2B|97\d)$/.test(d)).slice(0, 20);
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(r.echeance ?? "") && r.echeance > today ? r.echeance : "";
  // Données réelles de l'espace pour affiner la projection
  const { data: all } = await admin.from("prospects").select("status").eq("workspace_id", ws.id).in("status", CONTACTED).limit(10000);
  const { count: rdvAll } = await admin.from("meetings").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).neq("status", "annule");
  const base = { contactes: (all ?? []).length, rdv: rdvAll ?? 0, clients: (all ?? []).filter((p) => p.status === "client").length } as Stats;
  const proj = projection(goal_type, goal_count, base);
  const zoneList = zone.length ? zone : ws.zone ?? [];
  const { data: avail } = await admin.from("prospects").select("postal_code").eq("workspace_id", ws.id).is("mission_id", null)
    .in("target", target_ids.length ? target_ids : targets.map((t) => t.id)).in("status", ["nouveau", "pret", "sans_email", "a_valider"]).limit(5000);
  const available = (avail ?? []).filter((p) => inZone(p.postal_code, zoneList)).length;
  return {
    objective: r.reformulation || text, goal_type, goal_count, deadline, target_ids: target_ids.length ? target_ids : targets.map((t) => t.id), zone,
    missing_target: String(r.cibles_manquantes ?? ""), conseils: (r.conseils ?? []).slice(0, 3), projection: proj, available,
  };
}

export async function createMission(ws: Workspace, userId: string, b: Record<string, unknown>) {
  const goal_type = b.goal_type === "rdv" ? "rdv" : "clients";
  const goal_count = Math.min(Math.max(Math.round(Number(b.goal_count) || 10), 1), 10000);
  const target_ids = (Array.isArray(b.target_ids) ? b.target_ids : []).map(String).filter((id) => (ws.targets ?? []).some((t) => t.id === id));
  if (!target_ids.length) throw new HttpError(400, "Choisis au moins une cible");
  const zone = (Array.isArray(b.zone) ? b.zone : []).map((d) => String(d).toUpperCase()).filter((d) => /^(\d{2}|2A|2B|97\d)$/.test(d)).slice(0, 20);
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(String(b.deadline ?? "")) ? String(b.deadline) : null;
  const { data: m, error } = await admin.from("missions").insert({
    workspace_id: ws.id, objective: String(b.objective ?? "").slice(0, 300), goal_type, goal_count, deadline, target_ids, zone,
    plan: { projection: b.projection ?? null, conseils: b.conseils ?? [] }, created_by: userId,
  }).select("*").single();
  if (error) throw new HttpError(500, error.message);
  const proj = projection(goal_type, goal_count);
  let linked = await assign(ws, m as Mission, Math.min(proj.contacts[1], 1500));
  let inserted = 0;
  if (linked < Math.min(proj.contacts[0], 60)) {
    try { const r = await missionSearch(ws, m as Mission, 60); inserted = r.inserted; linked += r.linked; } catch (e) { console.error("mission search", e); }
  }
  await snapshot(m as Mission);
  await log(ws.id, "mission", `Mission lancée : ${m.objective || `${goal_count} ${goal_type === "rdv" ? "rendez-vous" : "clients"}`} (${linked} entreprises rattachées)`);
  return { id: m.id, linked, inserted };
}

export async function snapshot(m: Mission) {
  const s = await missionStats(m);
  const d = new Date().toISOString().slice(0, 10);
  const h = (m.history ?? []).filter((x) => x.d !== d);
  h.push({ d, prospects: s.prospects, contactes: s.contactes, reponses: s.reponses, rdv: s.rdv, clients: s.clients });
  await admin.from("missions").update({ history: h.slice(-180) }).eq("id", m.id);
  return s;
}

export async function missionView(ws: Workspace, m: Mission) {
  const s = await missionStats(m);
  return { mission: m, stats: s, projection: projection(m.goal_type, m.goal_count, s), actions: nextActions(m, s, ws), pace: pace(m, s) };
}

// ================================================================ Mission pilotée
// Kairo enchaîne recherche → enquête → rédaction pour la mission. Les e-mails restent en brouillon dans « À valider » :
// la mission n'envoie jamais rien elle-même.
const MAX_QUEUE = 15; // au-delà, on attend que le client valide avant de préparer davantage
const paris = () => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());

async function journal(m: Mission, text: string) {
  const { data } = await admin.from("missions").select("journal").eq("id", m.id).single();
  const j = [...((data?.journal ?? []) as { at: string; text: string }[]), { at: new Date().toISOString(), text }].slice(-60);
  await admin.from("missions").update({ journal: j }).eq("id", m.id);
}

/** Une étape de travail (30 à 60 s max). Renvoie ce qui a été fait et s'il reste quelque chose à faire maintenant. */
const COST = { enquete: 0.04, redaction: 0.01 }; // coût IA estimé par action, en euros
async function stopMission(m: Mission, reason: string, text: string) {
  await admin.from("missions").update({ status: "pause", stop_reason: reason }).eq("id", m.id);
  await journal(m, text);
  return { phase: "arret", done: true, stopped: reason, text };
}
async function addSpent(m: Mission, eur: number) {
  const { data } = await admin.from("missions").select("spent").eq("id", m.id).single();
  const spent = Math.round((Number(data?.spent ?? 0) + eur) * 100) / 100;
  await admin.from("missions").update({ spent }).eq("id", m.id);
  m.spent = spent;
}

/** Ajoute à la mission les opportunités du Radar de sa zone (hors appels d'offres), en tête de file. */
async function radarIntake(ws: Workspace, m: Mission, max: number): Promise<string[]> {
  const zone = ((m as { zone?: string[] }).zone?.length ? (m as { zone?: string[] }).zone : ws.zone) ?? [];
  const { data: opps } = await admin.from("radar_opps").select("id, company, dept").eq("workspace_id", ws.id).eq("status", "nouveau").in("kind", ["recrutement", "croissance"]).order("created_at", { ascending: false }).limit(30);
  const pick = (opps ?? []).filter((o) => !zone.length || zone.includes(o.dept)).slice(0, max);
  const names: string[] = [];
  for (const o of pick) {
    try {
      const r = await radarToProspect(ws, o.id);
      await admin.from("prospects").update({ mission_id: m.id, score: 95 }).eq("id", r.prospect_id).is("mission_id", null);
      names.push(o.company);
    } catch (e) { console.error("radar → mission", o.id, e); await admin.from("radar_opps").update({ status: "ecarte" }).eq("id", o.id); }
  }
  return names;
}

/** État affiché au client, à partir de l'étape jouée. */
export function stateOf(phase: string): string {
  return ({ radar: "en_recherche", recherche: "en_recherche", enquete: "en_analyse", redaction: "en_analyse", attente: "attente_validation",
    limite: "bloquee_limite", reglages: "bloquee_reglages", arret: "arretee", pause: "en_pause", fini: "attente_reponses" } as Record<string, string>)[phase] ?? "en_cours";
}

/** Politique d'erreur : on réessaie au passage suivant ; après 3 erreurs d'affilée, la mission passe « en erreur » (alerte plateforme). */
export function errorState(errors: number) { return errors >= 3 ? "erreur" : "reessai"; }

/** Une étape de mission, avec état enregistré et erreurs visibles dans le journal. */
export async function missionStep(ws: Workspace, m: Mission) {
  try {
    const r = await stepOnce(ws, m);
    await admin.from("missions").update({ state: stateOf(r.phase), state_text: String(r.text ?? "").slice(0, 300), errors: 0, last_error: "", last_step_at: new Date().toISOString() }).eq("id", m.id);
    return r;
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    const { data } = await admin.from("missions").select("errors").eq("id", m.id).single();
    const errors = Number(data?.errors ?? 0) + 1;
    const state = errorState(errors);
    await admin.from("missions").update({ state, state_text: state === "erreur" ? `En erreur : ${msg}` : "Nouvel essai au prochain passage", errors, last_error: msg, last_step_at: new Date().toISOString() }).eq("id", m.id);
    await journal(m, state === "erreur" ? `Erreur répétée (${errors} fois) : ${msg}. La mission attend une intervention.` : `Erreur : ${msg}. Nouvel essai au prochain passage.`);
    throw e;
  }
}

async function stepOnce(ws: Workspace, m: Mission) {
  if (m.status !== "active") return { phase: "pause", done: true, text: "La mission est en pause." };
  // Conditions d'arrêt : échéance, budget, objectif
  if (m.deadline && new Date(`${m.deadline}T23:59:59`).getTime() < Date.now())
    return await stopMission(m, "echeance", "Échéance atteinte : la mission est mise en pause. Prolonge la date pour la relancer.");
  if (m.max_budget != null && Number(m.spent ?? 0) >= Number(m.max_budget))
    return await stopMission(m, "budget", `Budget IA de la mission atteint (${Number(m.spent ?? 0).toLocaleString("fr-FR")} € sur ${Number(m.max_budget).toLocaleString("fr-FR")} €) : mission en pause.`);
  const s = await missionStats(m);
  const reached = (m.goal_type === "rdv" ? s.rdv : s.clients) >= m.goal_count;
  if (reached) return await stopMission(m, "objectif", "Objectif atteint : la mission est mise en pause. Tu peux la clôturer ou relever l'objectif.");
  if (s.a_valider >= MAX_QUEUE) return { phase: "attente", done: true, waiting: true, text: `En attente de ta validation : ${s.a_valider} e-mails sont prêts. Kairo reprend tout seul dès qu'ils sont envoyés.` };

  const room = m.max_prospects ? Math.max(0, m.max_prospects - s.prospects) : 40;

  // 0. Détecter → Agir : les opportunités du Radar (recrutement, croissance) entrent d'elles-mêmes dans la mission
  if (m.radar_auto !== false && room > 0) {
    const added = await radarIntake(ws, m, Math.min(5, room));
    if (added.length) {
      const text = `Radar : ${added.length} opportunité${added.length > 1 ? "s" : ""} ajoutée${added.length > 1 ? "s" : ""} en priorité (${added.slice(0, 3).join(", ")}${added.length > 3 ? "…" : ""}).`;
      await journal(m, text);
      return { phase: "radar", done: false, text, n: added.length };
    }
  }

  // 1. Stock trop bas : nouvelles entreprises (une fois par jour au plus)
  const today = paris();
  if (room > 0 && s.a_enqueter + s.prets < 8 && (m.plan as { searched_on?: string })?.searched_on !== today) {
    await admin.from("missions").update({ plan: { ...m.plan, searched_on: today } }).eq("id", m.id);
    m.plan = { ...m.plan, searched_on: today };
    try {
      const r = await missionSearch(ws, m, Math.min(40, room));
      const text = r.linked ? `Recherche : ${r.linked} nouvelles entreprises ajoutées à la mission.` : "Recherche : aucune nouvelle entreprise dans ces cibles et cette zone.";
      await journal(m, text);
      return { phase: "recherche", done: !r.linked, text, n: r.linked };
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      await journal(m, `Recherche impossible : ${text}`);
      if (!s.a_enqueter && !s.prets) return { phase: "recherche", done: true, text };
    }
  }

  // 2. Rédaction d'abord quand des prospects ont un e-mail (c'est ce qui fait avancer le plus vite)
  if (s.prets > 0 && ws.sender_name) {
    const n = await quota(ws.id, "redaction", 80, Math.min(5, MAX_QUEUE - s.a_valider)).catch(() => 0);
    if (n > 0) {
      const { data: pool } = await admin.from("prospects").select("*").eq("mission_id", m.id).eq("status", "pret").neq("email", "").order("score", { ascending: false, nullsFirst: false }).limit(80);
      // Ciblage par signaux : on écarte les exclus, on passe d'abord ceux qui ont un signal recherché
      const types = (p: Prospect) => new Set((p.signals ?? []).map((x) => x.type));
      const focus = m.signal_focus ?? [], excl = m.signal_exclude ?? [];
      const weight = (p: Prospect) => focus.filter((t) => types(p).has(t)).length * 10 + (types(p).has("recrutement") || types(p).has("croissance") ? 1 : 0);
      const data = (pool ?? []).filter((p) => !excl.some((t) => types(p as Prospect).has(t)))
        .sort((a, b) => weight(b as Prospect) - weight(a as Prospect)).slice(0, n);
      const res = await Promise.allSettled(((data ?? []) as Prospect[]).map((p) => draft(ws, p)));
      const ok = res.filter((r) => r.status === "fulfilled").length;
      for (let i = 0; i < ok; i++) await log(ws.id, "redaction", "E-mail rédigé (mission)");
      if (ok) await addSpent(m, ok * COST.redaction);
      if (ok) {
        const text = `Rédaction : ${ok} e-mail${ok > 1 ? "s" : ""} personnalisé${ok > 1 ? "s" : ""} prêt${ok > 1 ? "s" : ""} à valider.`;
        await journal(m, text);
        return { phase: "redaction", done: false, text, n: ok };
      }
    }
  }

  // 3. Enquête : trouver l'e-mail et le décideur des entreprises de la mission
  if (s.a_enqueter > 0) {
    const n = await quota(ws.id, "enquete", 40, 4).catch(() => 0);
    if (n > 0) {
      const { data } = await admin.from("prospects").select("*").eq("mission_id", m.id).eq("status", "nouveau").is("enriched_at", null).order("score", { ascending: false, nullsFirst: false }).limit(n);
      const batch = (data ?? []) as Prospect[];
      const res = await Promise.allSettled(batch.map((p) => enrich(p, (ws.targets ?? []).find((t) => t.id === p.target)?.interlocuteur ?? "")));
      let found = 0;
      for (let i = 0; i < batch.length; i++) {
        const ok = res[i].status === "fulfilled" && (res[i] as PromiseFulfilledResult<{ email: string }>).value.email;
        if (ok) found++;
        await log(ws.id, "enquete", `${batch[i].name} : ${ok ? "e-mail trouvé" : "rien trouvé"} (mission)`);
      }
      await addSpent(m, batch.length * COST.enquete);
      const text = `Enquête : ${batch.length} entreprise${batch.length > 1 ? "s" : ""} étudiée${batch.length > 1 ? "s" : ""}, ${found} e-mail${found > 1 ? "s" : ""} trouvé${found > 1 ? "s" : ""}.`;
      await journal(m, text);
      return { phase: "enquete", done: false, text, n: batch.length };
    }
    return { phase: "limite", done: true, text: "Limite du jour atteinte pour les enquêtes : Kairo reprend demain." };
  }
  if (s.prets > 0 && !ws.sender_name) return { phase: "reglages", done: true, text: "Indique le nom de l'expéditeur dans Réglages pour que Kairo puisse rédiger." };
  return { phase: "fini", done: true, text: s.a_valider ? `${s.a_valider} e-mail${s.a_valider > 1 ? "s" : ""} prêt${s.a_valider > 1 ? "s" : ""} à valider.` : "Rien de plus à préparer pour l'instant." };
}

/** Tâche planifiée : jours ouvrés, 8 h – 18 h, quelques missions par passage, budget de temps limité. */
export async function missionPilotCron() {
  if (await (await import("./core.ts")).backgroundPaused()) return { pause: "IA automatique en pause" };
  const h = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const dow = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short" }).format(new Date());
  if (["Sat", "Sun"].includes(dow) || h < 8 || h >= 18) return { skipped: "hors horaires" };
  const { data } = await admin.from("missions").select("*").eq("status", "active").eq("auto", true).order("run_at", { ascending: true, nullsFirst: true }).limit(2);
  const t0 = Date.now(), out: unknown[] = [];
  for (const m of (data ?? []) as Mission[]) {
    await admin.from("missions").update({ run_at: new Date().toISOString() }).eq("id", m.id);
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", m.workspace_id).single();
    if (!ws?.onboarded || !planOk(ws)) continue;
    setAi({ ws: ws.id });
    for (let i = 0; i < 3 && Date.now() - t0 < 70e3; i++) {
      try { const r = await missionStep(ws as Workspace, m); out.push({ m: m.id, ...r }); if (r.done) break; }
      catch (e) { console.error("mission pilot", m.id, e); break; }
    }
  }
  return { runs: out };
}
