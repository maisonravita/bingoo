// trouvé! (trouveapp.fr) : SIREN → dirigeants déclarés rapprochés de leur fiche → déblocage de l'e-mail PROFESSIONNEL seulement.
// Doc lue le 6 nov. 2026 : https://www.trouveapp.fr/docs
// - /companies/officers (match: true) : 1 recherche par dirigeant, aucune clé ; un dirigeant n'est rapproché que si nom + prénom + date
//   de naissance désignent une seule personne (pas d'homonyme).
// - /people/unlock field "work_email" : 1 clé, rien débité s'il n'y en a pas ; adresse vérifiée au moment de la demande.
// - Téléphone : 3 clés, à la demande seulement (jamais la nuit) : appeler un particulier exige son accord préalable (loi 2025-594).
// - Jamais d'adresse postale de domicile, jamais d'e-mail personnel (direct_email).
import { admin, env, log, type Prospect, type Workspace } from "./core.ts";

const BASE = "https://www.trouveapp.fr/api/v1";
export const trouveReady = () => !!env("TROUVE_API_KEY");

type Officer = { last_name?: string; first_names?: string; role?: string; match?: { found?: boolean; contact_ids?: (string | number)[]; reason?: string } };
export class TrouveError extends Error { constructor(public code: string, msg: string, public status = 0) { super(msg); } }

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST", headers: { Authorization: `Bearer ${env("TROUVE_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new TrouveError(String(j.code ?? `http.${r.status}`), String(j.message ?? `trouvé! a répondu ${r.status}`), r.status);
  return j as T;
}

const MSG: Record<string, string> = {
  "credits.insufficient": "solde de clés trouvé! épuisé",
  "quota.searches_exhausted": "quota de recherches trouvé! du mois atteint",
  "rate.too_many_searches": "trop de recherches trouvé! d'un coup, réessai plus tard",
  "rate.search_without_unlock": "trop de fiches consultées sans déblocage sur trouvé!",
  "rate.too_many_unlocks": "trop de déblocages à la minute, réessai plus tard",
  "api.key.unknown": "clé trouvé! inconnue ou révoquée",
  "email.verification_unavailable": "vérification de l'e-mail indisponible pour l'instant, rien n'a été débité",
};
export const trouveMsg = (e: unknown) => e instanceof TrouveError ? (MSG[e.code] ?? e.message) : "trouvé! indisponible pour l'instant";
/** Erreurs qui doivent arrêter une passe entière (inutile d'insister sur les fiches suivantes). */
export const trouveStop = (e: unknown) => e instanceof TrouveError && ["credits.insufficient", "quota.searches_exhausted", "rate.too_many_searches", "rate.search_without_unlock", "api.key.unknown", "authorization.not_set"].includes(e.code);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, " ").trim();
const cap = (s: string) => s.toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());
const DECIDEUR = /(pr[ée]sident|g[ée]rant|directeur g[ée]n[ée]ral|directrice g[ée]n[ée]rale|dirigeant)/i;

/** Le bon dirigeant : celui déjà nommé sur la fiche s'il est déclaré, sinon le premier président / gérant / DG apparié. */
function pickOfficer(officers: Officer[], contact: string) {
  const ok = officers.filter((o) => o.match?.found && (o.match.contact_ids ?? []).length);
  if (contact) {
    const words = norm(contact).split(" ").filter((w) => w.length > 1);
    const same = ok.find((o) => words.some((w) => norm(o.last_name ?? "").split(" ").includes(w)));
    if (same) return same;
  }
  return ok.find((o) => DECIDEUR.test(o.role ?? "")) ?? ok[0] ?? null;
}

export async function trouveOfficer(p: Prospect) {
  const siren = String(p.siren || p.siret || "").replace(/\D/g, "").slice(0, 9);
  if (siren.length !== 9) return { officer: null, note: "pas de SIREN : recherche trouvé! impossible" };
  const r = await call<{ company?: { status?: string; identity_withheld?: boolean }; officers?: Officer[]; metadata?: { matched?: number } }>("/companies/officers", { siren, match: true });
  if (r.company?.status === "ceased") return { officer: null, note: "entreprise fermée d'après le registre", ceased: true };
  if (r.company?.identity_withheld) return { officer: null, note: "dirigeants opposés à la diffusion de leur identité" };
  const o = pickOfficer(r.officers ?? [], String(p.contact_name ?? ""));
  if (!o) return { officer: null, note: (r.officers ?? []).length ? "dirigeants déclarés, mais aucun rapproché d'une fiche sans doute possible" : "aucun dirigeant déclaré" };
  const name = `${cap(String(o.first_names ?? "").split(/\s+/)[0] ?? "")} ${cap(String(o.last_name ?? ""))}`.trim();
  return { officer: { name, role: cap(String(o.role ?? "Dirigeant")).slice(0, 80), ids: (o.match?.contact_ids ?? []).map((x) => Number(x)).filter(Number.isFinite) }, note: "" };
}

export let lastRaw = "";
async function unlock(ids: number[], field: "work_email" | "phone") {
  let r: { unlocked?: unknown[]; keys_charged?: number };
  try { r = await call("/people/unlock", { contact_ids: ids.slice(0, 50), field }); }
  catch (e) {
    // « Aucune donnée à débloquer » : la fiche n'a pas cette coordonnée, rien n'est débité
    if (e instanceof TrouveError && (/aucune donn/i.test(e.message) || /nothing|no_data|empty|not_found/i.test(e.code))) return { value: "", keys: 0 };
    throw e;
  }
  // Valeurs à plat, quel que soit le nom du champ ou sa forme (chaîne, liste, objet)
  const flat = (v: unknown): string[] => v == null ? [] : Array.isArray(v) ? v.flatMap(flat) : typeof v === "object" ? Object.values(v as Record<string, unknown>).flatMap(flat) : [String(v)];
  // « unlocked » peut être une liste de valeurs (["julien@…"]) ou d'objets ({ id, phone })
  const vals = ((r.unlocked ?? []) as unknown[]).flatMap((u) => u && typeof u === "object" && !Array.isArray(u) ? Object.entries(u as Record<string, unknown>).filter(([k]) => k !== "id").flatMap(([, v]) => flat(v)) : flat(u));
  lastRaw = JSON.stringify(r).slice(0, 1500);
  const value = field === "phone" ? vals.find((v) => /\d{6,}/.test(v.replace(/\D/g, ""))) ?? "" : vals.find((v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()))?.trim().toLowerCase() ?? "";
  return { value, keys: Number(r.keys_charged ?? 0) };
}

/** E-mail pro du décideur. dry = seulement les dirigeants (aucune clé). */
export async function trouveEmail(ws: Workspace, p: Prospect, dry = false) {
  const now = new Date().toISOString();
  const { officer, note, ceased } = await trouveOfficer(p) as { officer: { name: string; role: string; ids: number[] } | null; note: string; ceased?: boolean };
  const base: Record<string, unknown> = { dc_tried_at: now };
  if (!officer) {
    if (!dry) await admin.from("prospects").update({ ...base, enrich_note: `trouvé! : ${note}`.slice(0, 600), ...(ceased ? { status: "ignore", fit: "non", fit_reason: "Entreprise fermée (registre)" } : {}) }).eq("id", p.id);
    return { email: "", decideur: "", note, keys: 0 };
  }
  if (dry) return { email: "", decideur: `${officer.name}, ${officer.role}`, note: "dirigeant rapproché d'une fiche trouvé! (test sans clé)", keys: 0 };
  const u = await unlock(officer.ids, "work_email");
  const patch: Record<string, unknown> = { ...base };
  // L'e-mail appartient au dirigeant rapproché : la fiche prend son nom, même si un autre contact y figurait (jamais un e-mail sous le mauvais nom)
  const autre = !!p.contact_name && norm(p.contact_name) !== norm(officer.name);
  if (!p.contact_name || (u.value && autre)) Object.assign(patch, { contact_name: officer.name, contact_role: officer.role });
  if (u.value && autre) patch.notes = `${p.notes ? `${p.notes}\n` : ""}Ancien contact : ${p.contact_name}${p.contact_role ? ` (${p.contact_role})` : ""}`.slice(0, 2000);
  let ok = false, raison = "";
  if (u.value) {
    // L'e-mail est-il bien chez CETTE entreprise ? (un dirigeant peut avoir une autre société)
    const { emailPatch } = await import("./deep.ts");
    const ep = await emailPatch(p as never, u.value, "trouvé! (e-mail pro vérifié)");
    Object.assign(patch, ep.patch); ok = ep.ok; raison = ep.raison;
    await log(ws.id, "credit_email", `${p.name} : e-mail de ${officer.name} trouvé par trouvé!${ok ? "" : ` (à vérifier : ${raison})`}`);
  } else patch.enrich_note = `trouvé! : ${officer.name} identifié, pas d'e-mail professionnel connu`;
  await admin.from("prospects").update(patch).eq("id", p.id);
  return { email: ok ? u.value : "", a_verifier: !ok && u.value ? u.value : "", decideur: `${officer.name}, ${officer.role}`, note: !u.value ? "pas d'e-mail professionnel connu" : ok ? `e-mail professionnel vérifié (${raison})` : `e-mail mis de côté : ${raison}`, keys: u.keys };
}

/** Téléphone du décideur : à la demande seulement (3 clés). */
export async function trouvePhone(ws: Workspace, p: Prospect) {
  const { officer, note } = await trouveOfficer(p);
  if (!officer) return { phone: "", note, keys: 0 };
  const u = await unlock(officer.ids, "phone");
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  const autre = !!p.contact_name && norm(p.contact_name) !== norm(officer.name);
  if (!p.contact_name || (u.value && autre)) Object.assign(patch, { contact_name: officer.name, contact_role: officer.role });
  if (u.value) Object.assign(patch, { phone: u.value.slice(0, 30), phone_source: `trouvé! (${officer.name})`, phone_checked_at: now });
  if (Object.keys(patch).length) await admin.from("prospects").update(patch).eq("id", p.id);
  if (u.value) await log(ws.id, "credit_phone", `${p.name} : téléphone de ${officer.name} trouvé par trouvé!`).catch(() => {});
  return { phone: u.value, note: u.value ? `téléphone de ${officer.name}` : "pas de téléphone connu", keys: u.keys };
}
