// Ce que Bingoo! apprend de tes résultats : parmi les entreprises contactées, quels traits reviennent plus souvent
// chez celles qui ont répondu positivement, pris rendez-vous ou signé. Calcul statistique sur tes propres données
// (aucune IA, aucun crédit), lissé pour ne pas conclure sur deux cas. Sert à choisir qui chercher et contacter d'abord.
import { admin, type Workspace } from "./core.ts";
import { quartier, taille } from "./pilotage.ts";

const CONTACTE = ["envoye", "repondu", "rdv", "client", "refus"];
const HOT = ["interesse", "question", "prix", "rappel"];
const MIN_CONTACTES = 20, MIN_POSITIFS = 3, MIN_PAR_TRAIT = 5, LISSAGE = 6;

type P = { id: string; variante?: string | null; target: string | null; activity: string | null; postal_code: string | null; city: string | null; contact_name: string | null; phone: string | null; signals: unknown; status: string; channel: string | null };
export type Facteur = { cle: string; label: string; n: number; positifs: number; taux: number; lift: number };
export type Appris = { calcule_at: string; contactes: number; positifs: number; rdv: number; base: number; assez: boolean; facteurs: Facteur[] };

const TRANCHES: [number, string][] = [[250, "250 salariés et plus"], [50, "50 à 249 salariés"], [10, "10 à 49 salariés"], [1, "moins de 10 salariés"]];
const SIGNAL: Record<string, string> = { reseau: "réseau de plusieurs établissements", ouverture: "établissement récemment ouvert", creation: "entreprise récente", dirigeant: "nouveau dirigeant", recrutement: "recrute en ce moment", demenagement: "vient de déménager", croissance: "en croissance", renouvellement: "contrat public à renouveler", sans_reservation: "pas de réservation en ligne", sans_schema: "site peu visible sur Google" };
const activite = (a: string | null) => String(a ?? "").toLowerCase().replace(/\s+/g, " ").trim().split(/[,(;]/)[0].slice(0, 60);

/** Les traits d'une entreprise, sous forme de clés comparables. */
export function traits(p: Omit<P, "id" | "status">, ws: Workspace) {
  const out: [string, string][] = [];
  const t = (ws.targets ?? []).find((x) => x.id === p.target);
  if (t) out.push([`cible:${t.id}`, `cible « ${t.label} »`]);
  const a = activite(p.activity);
  if (a) out.push([`activite:${a}`, `activité « ${a} »`]);
  const n = taille(p.signals);
  if (n) { const tr = TRANCHES.find(([min]) => n >= min); if (tr) out.push([`taille:${tr[0]}`, tr[1]]); }
  for (const s of Array.isArray(p.signals) ? p.signals as { type?: string }[] : []) if (s?.type && s.type !== "taille" && SIGNAL[s.type]) out.push([`signal:${s.type}`, SIGNAL[s.type]]);
  const q = quartier(p);
  if (q) out.push([`zone:${q.cle}`, `zone ${q.nom}`]);
  out.push(p.contact_name ? ["decideur:oui", "décideur nommé dans le message"] : ["decideur:non", "message sans décideur nommé"]);
  if ((p as { variante?: string | null }).variante) out.push([`version:${(p as { variante?: string }).variante}`, `version ${(p as { variante?: string }).variante} du message (test A/B)`]);
  if (p.channel && ["email", "linkedin", "telephone", "courrier"].includes(p.channel)) out.push([`canal:${p.channel}`, `contacté par ${p.channel === "linkedin" ? "LinkedIn" : p.channel === "email" ? "e-mail" : p.channel === "telephone" ? "téléphone" : "courrier"}`]);
  return [...new Map(out).entries()];
}

export async function calculerAppris(ws: Workspace): Promise<Appris> {
  const rows: P[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await admin.from("prospects").select("id, target, activity, postal_code, city, contact_name, phone, signals, status, channel").eq("workspace_id", ws.id).in("status", CONTACTE).range(from, from + 999);
    rows.push(...((data ?? []) as P[]));
    if ((data ?? []).length < 1000) break;
  }
  // Version du premier message (test A/B) de chaque entreprise contactée
  const { data: vs } = await admin.from("messages").select("prospect_id, variant").eq("workspace_id", ws.id).eq("step", 0).eq("status", "envoye").neq("variant", "").limit(20000);
  const vmap = new Map((vs ?? []).map((m) => [m.prospect_id, m.variant]));
  for (const r of rows) r.variante = vmap.get(r.id) ?? null;
  const { data: hot } = await admin.from("replies").select("prospect_id").eq("workspace_id", ws.id).in("class", HOT).not("prospect_id", "is", null).limit(5000);
  const chauds = new Set((hot ?? []).map((r) => r.prospect_id));
  const positif = (p: P) => ["rdv", "client"].includes(p.status) || chauds.has(p.id);
  const pos = rows.filter(positif).length;
  const base = (pos + 1) / (rows.length + 2);
  const par = new Map<string, { label: string; n: number; pos: number }>();
  for (const p of rows) for (const [cle, label] of traits(p, ws)) {
    const x = par.get(cle) ?? { label, n: 0, pos: 0 };
    x.n++; if (positif(p)) x.pos++;
    par.set(cle, x);
  }
  const facteurs = [...par.entries()].filter(([, x]) => x.n >= MIN_PAR_TRAIT && x.n < rows.length).map(([cle, x]) => {
    const taux = (x.pos + LISSAGE * base) / (x.n + LISSAGE);
    return { cle, label: x.label, n: x.n, positifs: x.pos, taux: Math.round(taux * 1000) / 1000, lift: Math.round((taux / base) * 100) / 100 };
  }).filter((f) => Math.abs(Math.log(f.lift)) >= Math.log(1.25)).sort((a, b) => b.lift - a.lift).slice(0, 30);
  const a: Appris = { calcule_at: new Date().toISOString(), contactes: rows.length, positifs: pos, rdv: rows.filter((p) => ["rdv", "client"].includes(p.status)).length, base: Math.round(base * 1000) / 1000, assez: rows.length >= MIN_CONTACTES && pos >= MIN_POSITIFS, facteurs };
  await admin.from("workspaces").update({ appris: a }).eq("id", ws.id);
  return a;
}

/** Le dernier calcul, refait s'il a plus de `maxAgeH` heures. */
export async function appris(ws: Workspace, maxAgeH = 12): Promise<Appris> {
  const cur = (ws as { appris?: Appris }).appris;
  if (cur?.calcule_at && Date.now() - Date.parse(cur.calcule_at) < maxAgeH * 3600e3) return cur;
  return await calculerAppris(ws);
}

/** Multiplicateur pour une entreprise pas encore contactée : 1 = neutre, borné entre 0,5 et 3. Neutre tant qu'il n'y a pas assez de résultats. */
export function bonus(p: Omit<P, "id" | "status">, ws: Workspace, a: Appris | null) {
  if (!a?.assez) return 1;
  const f = new Map(a.facteurs.map((x) => [x.cle, x.lift]));
  // Le canal n'est pas encore connu pour une entreprise à contacter : on l'ignore
  const m = traits(p, ws).filter(([k]) => !k.startsWith("canal:") && !k.startsWith("version:")).reduce((t, [k]) => t * (f.get(k) ?? 1), 1);
  return Math.max(0.5, Math.min(3, m));
}
