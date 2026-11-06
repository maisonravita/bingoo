// Filtre de cible : chaque fiche est relue avant d'être montrée ou contactée.
// 1) Règles sans IA (doublons, établissements publics quand la cible est privée, sociétés civiles) ;
// 2) le modèle rapide relit le reste par lots de 20 (nom, raison sociale, site, activité) : oui / non / doute + raison courte.
// « non » = la fiche passe en « ignore » (rien n'est supprimé) avec la raison ; « Remettre » la fait revenir.
import { admin, askJson, log, type Workspace } from "./core.ts";

type Row = { id: string; name: string; org: string | null; siren: string | null; activity: string | null; website: string | null; city: string | null; target: string | null; status: string; source: string | null };
const OPEN = ["nouveau", "sans_email", "pret"];
const PUBLIC = /\b(commune|mairie|centre hospitalier|ch [a-z]|chu|chr|ehpad public|departement|conseil (departemental|regional)|prefecture|lycee|college|ecole publique|syndicat intercommunal|communaute de communes|metropole)\b/;
const CIVIL = /\b(sci|scp|scm|sccv|holding|soci[eé]t[eé] civile)\b/i;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

async function setFit(ws: Workspace, r: Row, fit: "oui" | "non" | "doute", reason: string) {
  const patch: Record<string, unknown> = { fit, fit_reason: reason.slice(0, 140) };
  if (fit === "non" && OPEN.includes(r.status)) patch.status = "ignore";
  await admin.from("prospects").update(patch).eq("id", r.id);
}

/** Relit jusqu'à `max` fiches pas encore vérifiées de l'espace. dry = rien n'est enregistré. */
export async function fitCheck(ws: Workspace, opts: { max?: number; dry?: boolean } = {}) {
  const max = Math.min(opts.max ?? 60, 200);
  const { data, error } = await admin.from("prospects").select("id, name, org, siren, activity, website, city, target, status, source")
    .eq("workspace_id", ws.id).eq("fit", "").in("status", OPEN).order("score", { ascending: false, nullsFirst: false }).limit(max);
  if (error) throw new Error(`fit : ${error.message}`);
  const rows = (data ?? []) as Row[];
  if (!rows.length) return { relues: 0, hors_cible: 0, doutes: 0, detail: [] as { nom: string; fit: string; raison: string }[] };
  const targets = new Map((ws.targets ?? []).map((t) => [t.id, t]));
  const detail: { nom: string; fit: string; raison: string }[] = [];
  const out = async (r: Row, fit: "oui" | "non" | "doute", raison: string) => { detail.push({ nom: r.name, fit, raison }); if (!opts.dry) await setFit(ws, r, fit, raison); };

  // 1) Règles
  const { data: known } = await admin.from("prospects").select("id, siren, name").eq("workspace_id", ws.id).neq("fit", "").neq("status", "ignore").limit(5000);
  const seen = new Set((known ?? []).map((k) => k.siren || norm(k.name ?? "")).filter(Boolean));
  const rest: Row[] = [];
  for (const r of rows) {
    const key = r.siren || norm(r.name);
    const t = targets.get(r.target ?? "");
    const label = norm(`${t?.label ?? ""} ${t?.pourquoi ?? ""}`);
    const txt = norm(`${r.name} ${r.org ?? ""}`);
    if (key && seen.has(key)) { await out(r, "non", "Doublon : cette entreprise est déjà dans ta liste"); continue; }
    if (key) seen.add(key);
    if (PUBLIC.test(txt) && !/public|collectivit|mairie|hopita|commune/.test(label)) { await out(r, "non", "Établissement public, alors que ta cible est privée"); continue; }
    if (CIVIL.test(`${r.name} ${r.org ?? ""}`) && !/immobili|patrimoine|holding/.test(label)) { await out(r, "non", "Société civile ou holding, sans activité commerciale"); continue; }
    rest.push(r);
  }

  // 2) Relecture par le modèle rapide, par lots de 20
  const offre = `${ws.profile?.nom ?? ws.name} : ${ws.profile?.offre ?? ""}`.slice(0, 400);
  for (let i = 0; i < rest.length; i += 20) {
    const lot = rest.slice(i, i + 20);
    const lines = lot.map((r, k) => { const t = targets.get(r.target ?? ""); return `${k + 1}. ${r.name}${r.org && r.org !== r.name ? ` (${r.org})` : ""}${r.city ? `, ${r.city}` : ""}${r.website ? ` · site ${r.website.replace(/^https?:\/\//, "")}` : ""} · rangée dans la cible « ${t?.label ?? r.activity ?? "?"} »`; }).join("\n");
    let v: { r?: { n: number; fit: string; raison: string }[] } = {};
    try {
      v = await askJson(`Tu tries une liste de prospects B2B avant qu'un commercial les contacte.
Ce que vend le client : ${offre}
Pour chaque entreprise, dis si elle correspond vraiment à la cible où elle est rangée et peut acheter cette offre.
"non" seulement si c'est clair (autre métier que la cible, filiale d'un grand groupe sans décision locale quand la cible vise des PME, particulier, association sans budget, concurrent direct du client). "doute" si tu ne sais pas. Sinon "oui".
Raison : 10 mots maximum, en français simple, sans inventer de fait.
${lines}
Format : {"r": [{"n": 1, "fit": "oui", "raison": ""}]}`, { fast: true, maxTokens: 1600 });
    } catch (e) { console.error("fit", e); continue; }
    for (const x of v.r ?? []) {
      const r = lot[Number(x.n) - 1];
      if (!r) continue;
      const fit = x.fit === "non" ? "non" : x.fit === "doute" ? "doute" : "oui";
      await out(r, fit, String(x.raison ?? "").trim() || (fit === "oui" ? "Correspond à ta cible" : "À vérifier"));
    }
  }
  const hors = detail.filter((d) => d.fit === "non").length;
  if (hors && !opts.dry) await log(ws.id, "fit", `${hors} fiche${hors > 1 ? "s" : ""} hors cible écartée${hors > 1 ? "s" : ""} (sur ${detail.length} relues)`).catch(() => {});
  return { relues: detail.length, hors_cible: hors, doutes: detail.filter((d) => d.fit === "doute").length, detail };
}

/** « Remettre dans ma liste » : la fiche revient, marquée comme validée par l'utilisateur. */
export async function fitRestore(wsId: string, id: string) {
  await admin.from("prospects").update({ fit: "oui", fit_reason: "Remise dans la liste par toi", status: "nouveau" }).eq("workspace_id", wsId).eq("id", id).eq("fit", "non");
  return { ok: true };
}
