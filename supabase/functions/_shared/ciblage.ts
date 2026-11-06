// Ciblage automatique : le client n'a jamais à redemander « qui viser ». Chaque semaine, Bingoo! regarde ce que donne chaque cible
// (entreprises contactées, réponses positives, rendez-vous), met en pause celles qui ne répondent pas, garde celles qui marchent,
// et ajoute de nouvelles pistes à tester quand il en manque. Tout est noté dans un journal visible.
import { admin, askJson, log, type Target, type Workspace } from "./core.ts";
import { countTarget } from "./search.ts";

const CONTACTE = ["envoye", "repondu", "rdv", "client", "refus"];
const HOT = ["interesse", "question", "prix", "rappel"];
const MIN_VERDICT = 30; // pas de conclusion avant 30 entreprises contactées sur une cible
const NAF_RE = /^\d{2}\.\d{2}[A-Z]$/;
const TR = ["00", "01", "02", "03", "11", "12", "21", "22", "31", "32", "41", "42", "51", "52", "53"];

export type CibleStat = { id: string; label: string; actif: boolean; confiance: string; contactes: number; positifs: number; rdv: number; taux: number; etat: "marche" | "en_test" | "pause" | "a_lancer"; note: string };
type Journal = { at: string; texte: string };
type Ciblage = { at?: string; propose_at?: string; journal?: Journal[] };

export async function cibleStats(ws: Workspace): Promise<CibleStat[]> {
  const targets = (ws.targets ?? []) as (Target & { pause_raison?: string })[];
  const { data: ps } = await admin.from("prospects").select("id, target, status").eq("workspace_id", ws.id).in("status", CONTACTE).limit(20000);
  const ids = (ps ?? []).map((p) => p.id);
  const hot = new Set<string>();
  for (let i = 0; i < ids.length; i += 500) {
    const { data: r } = await admin.from("replies").select("prospect_id").in("prospect_id", ids.slice(i, i + 500)).in("class", HOT);
    (r ?? []).forEach((x) => hot.add(x.prospect_id));
  }
  return targets.map((t) => {
    const mine = (ps ?? []).filter((p) => p.target === t.id);
    const rdv = mine.filter((p) => ["rdv", "client"].includes(p.status)).length;
    const positifs = mine.filter((p) => hot.has(p.id) || ["rdv", "client"].includes(p.status)).length;
    const contactes = mine.length, taux = contactes ? Math.round((positifs / contactes) * 1000) / 10 : 0;
    const etat = t.actif === false ? "pause" : !contactes ? "a_lancer" : positifs > 0 ? "marche" : "en_test";
    return { id: t.id, label: t.label, actif: t.actif !== false, confiance: t.confiance ?? "moyenne", contactes, positifs, rdv, taux, etat, note: t.actif === false ? (t.pause_raison ?? "mise en pause") : "" };
  });
}

/** La revue de la semaine. dry = calcule et dit ce qui serait fait, sans rien changer. */
export async function autoCiblage(ws: Workspace, opts: { dry?: boolean; force?: boolean } = {}) {
  const stats = await cibleStats(ws);
  const targets = [...((ws.targets ?? []) as (Target & { pause_raison?: string })[])];
  const prof = (ws.profile ?? {}) as Record<string, unknown>;
  const cib = (prof.ciblage ?? {}) as Ciblage;
  const actions: string[] = [];
  const best = Math.max(0, ...stats.filter((s) => s.contactes >= 10).map((s) => s.taux));

  // 1) Mettre en pause : assez contactées, aucune réponse positive, alors qu'une autre cible répond (ou 60 contactées sans rien)
  for (const s of stats) {
    if (!s.actif || s.contactes < MIN_VERDICT || s.positifs > 0) continue;
    if (best > 0 || s.contactes >= 2 * MIN_VERDICT) {
      const t = targets.find((x) => x.id === s.id)!;
      t.actif = false; t.pause_raison = `0 réponse positive sur ${s.contactes} entreprises contactées`;
      actions.push(`« ${s.label} » mise en pause : ${t.pause_raison}${best > 0 ? ", d'autres cibles répondent mieux" : ""}`);
    }
  }
  // Une cible qui marche bien et qui était « à tester » devient sûre
  for (const s of stats) {
    const t = targets.find((x) => x.id === s.id)!;
    if (s.actif && s.positifs >= 2 && t.confiance !== "forte") { t.confiance = "forte"; actions.push(`« ${s.label} » confirmée : ${s.positifs} réponses positives sur ${s.contactes}`); }
  }

  // 2) Nouvelles pistes : moins de 2 cibles actives encore en test, et pas de proposition depuis 14 jours
  const actives = targets.filter((t) => t.actif !== false);
  const enTest = stats.filter((s) => s.actif && s.etat !== "marche").length;
  const recent = cib.propose_at && Date.now() - new Date(cib.propose_at).getTime() < 14 * 864e5;
  if ((opts.force || !recent) && (actives.length < 3 || enTest < 2 || actions.some((a) => a.includes("mise en pause")))) {
    const bilan = stats.map((s) => `- ${s.label} : ${s.contactes} contactées, ${s.positifs} positives${s.etat === "pause" || !targets.find((t) => t.id === s.id)?.actif ? " (en pause)" : ""}`).join("\n");
    const r = await askJson<{ cibles: { label: string; pourquoi: string; naf: string[]; tranches: string[]; siege_only: boolean; interlocuteur: string; pour_qui: string; angle: string; moment: string }[] }>(
      `Un outil de prospection B2B cherche de nouveaux types de clients pour cette entreprise, sans lui poser de question.
Entreprise : ${String(prof.nom ?? ws.name)} — ${String(prof.offre ?? "")}
Clients connus ou supposés : ${String(prof.clients_types ?? "")}
Résultats des cibles déjà testées :
${bilan || "aucune encore"}

Propose 2 NOUVEAUX types de clients, différents de toutes les cibles ci-dessus, plausibles vu l'offre et vu ce qui a marché ou non (inspire-toi des cibles qui répondent, évite ce qui ressemble aux cibles en pause).
Pour chacun : label, pourquoi (une phrase), naf (1 à 4 codes NAF rév. 2 au format "62.02A" qui correspondent EXACTEMENT), tranches (codes d'effectif INSEE ; liste vide = toutes), siege_only, interlocuteur, pour_qui, angle (une phrase), moment (quand ils en ont le plus besoin).
Format : {"cibles": [{"label": "", "pourquoi": "", "naf": [""], "tranches": [], "siege_only": true, "interlocuteur": "", "pour_qui": "", "angle": "", "moment": ""}]}`, { fast: true, maxTokens: 1500 });
    const known = new Set(targets.map((t) => t.label.toLowerCase()));
    let n = Math.max(0, ...targets.map((t) => Number(String(t.id).replace(/\D/g, "")) || 0));
    for (const c of (r.cibles ?? []).slice(0, 2)) {
      const naf = (c.naf ?? []).map((x) => String(x).trim().toUpperCase()).filter((x) => NAF_RE.test(x)).slice(0, 4);
      if (!c.label || !naf.length || known.has(String(c.label).toLowerCase())) continue;
      const t = { id: `c${++n}`, label: String(c.label).slice(0, 80), pourquoi: String(c.pourquoi ?? "").slice(0, 300), naf, tranches: (c.tranches ?? []).map(String).filter((x) => TR.includes(x)),
        siege_only: !!c.siege_only, interlocuteur: String(c.interlocuteur ?? "").slice(0, 80), pour_qui: String(c.pour_qui ?? "").slice(0, 80), angle: String(c.angle ?? "").slice(0, 300),
        moment: String(c.moment ?? "").slice(0, 200), confiance: "a_tester" as const, actif: true, next_page: 1 } as Target;
      t.total = await countTarget(t, ws.zone ?? []).catch(() => 0);
      if (!t.total) continue;
      targets.push(t); known.add(t.label.toLowerCase());
      actions.push(`Nouvelle piste à tester : « ${t.label} » (${t.total.toLocaleString("fr-FR")} entreprises)`);
    }
    cib.propose_at = new Date().toISOString();
  }

  if (opts.dry) return { stats, actions, applique: false };
  const journal = [...actions.map((texte) => ({ at: new Date().toISOString(), texte })), ...(cib.journal ?? [])].slice(0, 20);
  await admin.from("workspaces").update({ targets, profile: { ...prof, ciblage: { ...cib, at: new Date().toISOString(), journal } } }).eq("id", ws.id);
  for (const a of actions) await log(ws.id, "ciblage", a).catch(() => {});
  return { stats: await cibleStats({ ...ws, targets } as Workspace), actions, applique: true };
}
