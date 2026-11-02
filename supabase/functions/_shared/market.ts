// Radar, étape 2 : le marché public de ton secteur, dans ta zone.
// Source : données essentielles de la commande publique (DECP, data.economie.gouv.fr) — contrats attribués, titulaire, montant, durée.
// Sert au calendrier des renouvellements, aux fiches acheteurs, aux clients de tes concurrents et aux prix gagnants.
import { admin, askJson, log, type Workspace } from "./core.ts";
import { lookup, norm } from "./radar-signals.ts";

const DECP = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/decp-v3-marches-valides/records";
const q = (s: string) => `"${String(s).replace(/"/g, "")}"`;
const addMonths = (d: string, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 10); };

type Row = { id: string; objet: string; acheteur_id: string; acheteur_nom: string | null; titulaire_id_1: number | string | null; datenotification: string; dureemois: number | null; montant: number | null; lieuexecution_code: string | null; procedure: string | null };

/** Recharge les contrats du secteur (6 dernières années), trie leur pertinence par l'IA, puis complète les noms au registre. */
export async function marketRefresh(ws: Workspace & { radar_cfg?: { mots_cles?: string[]; marches?: boolean } | null }) {
  const kw = ws.radar_cfg?.mots_cles ?? [], zone = (ws.zone ?? []).filter((d) => /^\d{2}$/.test(d));
  if (ws.radar_cfg?.marches === false || !kw.length || !zone.length) {
    await admin.from("workspaces").update({ market_at: new Date().toISOString() }).eq("id", ws.id); // à revoir dans une semaine
    return { skipped: "Les marchés publics ne sont pas activés pour cet espace (Radar → Ce que le Radar cherche)" };
  }
  const since = new Date(Date.now() - 6 * 365 * 864e5).toISOString().slice(0, 10);
  const where = [`(${kw.map((k) => `search(objet,${q(k)})`).join(" or ")})`, `datenotification>=date'${since}'`, `(${zone.map((d) => `startswith(lieuexecution_code,${q(d)})`).join(" or ")})`].join(" and ");
  const rows: Row[] = [];
  for (let off = 0; off < 600; off += 100) {
    const u = new URL(DECP);
    for (const [k, v] of Object.entries({ where, limit: "100", offset: String(off), order_by: "datenotification desc", select: "id,objet,acheteur_id,acheteur_nom,titulaire_id_1,datenotification,dureemois,montant,lieuexecution_code,procedure" })) u.searchParams.set(k, v);
    const d = await fetch(u, { signal: AbortSignal.timeout(20000) }).then((r) => r.ok ? r.json() : null).catch(() => null);
    const part = (d?.results ?? []) as Row[];
    rows.push(...part);
    if (part.length < 100) break;
  }
  // Un même marché peut apparaître plusieurs fois (modifications) : on garde une ligne par identifiant + acheteur
  const uniq = new Map<string, Row>();
  for (const r of rows) { const k = `${r.id}:${r.acheteur_id}`; if (!uniq.has(k)) uniq.set(k, r); }
  const list = [...uniq.values()];
  const { data: known } = await admin.from("public_contracts").select("id, relevant").eq("workspace_id", ws.id);
  const seen = new Map(((known ?? []) as { id: string; relevant: boolean | null }[]).map((k) => [k.id, k.relevant]));
  // Pertinence (seulement pour les nouveaux) : par paquets de 80 objets, modèle rapide
  const fresh = list.filter((r) => !seen.has(`${r.id}:${r.acheteur_id}`));
  const keep = new Set<string>();
  const pr = ws.profile ?? {};
  for (let i = 0; i < fresh.length; i += 80) {
    const part = fresh.slice(i, i + 80);
    const v = await askJson<{ retenus: number[] }>(`Entreprise : ${pr.nom ?? ws.name} — Offre : ${pr.offre ?? ""}
Voici des marchés publics attribués. Donne les numéros de ceux qui portent sur ce que cette entreprise vend (elle aurait pu y répondre).
${part.map((r, j) => `${j}. ${String(r.objet).slice(0, 160)}`).join("\n")}
Format : {"retenus": [0, 3]}`, { fast: true, maxTokens: 800 }).catch(() => ({ retenus: part.map((_, j) => j) }));
    for (const j of v.retenus ?? []) if (part[j]) keep.add(`${part[j].id}:${part[j].acheteur_id}`);
  }
  const up = list.map((r) => {
    const key = `${r.id}:${r.acheteur_id}`;
    const fin = r.datenotification && r.dureemois ? addMonths(r.datenotification, Number(r.dureemois)) : null;
    return {
      workspace_id: ws.id, id: key, buyer_id: String(r.acheteur_id ?? "").slice(0, 14), buyer_name: r.acheteur_nom ?? null,
      holder_id: r.titulaire_id_1 ? String(r.titulaire_id_1).slice(0, 14) : null, objet: String(r.objet ?? "").replace(/\s+/g, " ").slice(0, 400),
      montant: r.montant ?? null, notified: r.datenotification, duree_mois: r.dureemois ?? null, fin,
      dept: String(r.lieuexecution_code ?? "").slice(0, 2), procedure: r.procedure ?? null,
      relevant: seen.has(key) ? seen.get(key) : keep.has(key), updated_at: new Date().toISOString(),
    };
  });
  for (let i = 0; i < up.length; i += 300) await admin.from("public_contracts").upsert(up.slice(i, i + 300), { onConflict: "workspace_id,id" });
  await admin.from("workspaces").update({ market_at: new Date().toISOString() }).eq("id", ws.id);
  const names = await marketNames(ws.id, 120);
  await log(ws.id, "radar", `Marché public de ton secteur mis à jour : ${up.filter((x) => x.relevant).length} contrats pertinents dans ta zone`);
  return { contrats: up.length, pertinents: up.filter((x) => x.relevant).length, nouveaux: fresh.length, noms: names };
}

/** Complète les noms d'acheteurs et de titulaires (registre officiel, avec cache). */
export async function marketNames(wsId: string, max = 120) {
  const { data } = await admin.from("public_contracts").select("buyer_id, holder_id, buyer_name, holder_name").eq("workspace_id", wsId).eq("relevant", true).or("buyer_name.is.null,holder_name.is.null").limit(1000);
  const rows = (data ?? []) as { buyer_id: string | null; holder_id: string | null; buyer_name: string | null; holder_name: string | null }[];
  const ids = [...new Set(rows.flatMap((r) => [!r.buyer_name ? r.buyer_id : null, !r.holder_name ? r.holder_id : null]).filter((x): x is string => !!x && x.length >= 9).map((x) => x.slice(0, 9)))];
  const { data: cached } = ids.length ? await admin.from("company_names").select("siren, nom").in("siren", ids.slice(0, 1000)) : { data: [] };
  const names = new Map(((cached ?? []) as { siren: string; nom: string }[]).map((c) => [c.siren, c.nom]));
  let looked = 0;
  for (const id of ids.filter((x) => !names.has(x)).slice(0, max)) {
    const c = await lookup(id);
    looked++;
    if (c?.nom) { names.set(id, c.nom); await admin.from("company_names").upsert({ siren: id, nom: c.nom, naf: c.naf, ville: c.ville, updated_at: new Date().toISOString() }); }
    await new Promise((x) => setTimeout(x, 160)); // l'API publique limite à 7 requêtes par seconde
  }
  // Écrit les noms connus sur les contrats
  for (const [siren, nom] of names) {
    await admin.from("public_contracts").update({ buyer_name: nom }).eq("workspace_id", wsId).like("buyer_id", `${siren}%`).is("buyer_name", null);
    await admin.from("public_contracts").update({ holder_name: nom }).eq("workspace_id", wsId).like("holder_id", `${siren}%`).is("holder_name", null);
  }
  return looked;
}

/** Tâche planifiée : un espace par passage (le plus ancien), puis les noms manquants. */
export async function marketCron() {
  const week = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data } = await admin.from("workspaces").select("*").eq("onboarded", true).or(`market_at.is.null,market_at.lt.${week}`).order("market_at", { ascending: true, nullsFirst: true }).limit(1);
  const ws = data?.[0];
  if (!ws) {
    // Rien à recharger : on complète les noms d'un espace qui en manque
    const { data: one } = await admin.from("public_contracts").select("workspace_id").eq("relevant", true).is("holder_name", null).not("holder_id", "is", null).limit(1);
    return one?.[0] ? { noms: await marketNames(one[0].workspace_id, 200) } : { rien: true };
  }
  const res = await marketRefresh(ws);
  // Partenaires apporteurs d'affaires : une fois par mois
  const pa = String((ws.radar_cfg as Record<string, unknown> | null)?.partners_at ?? "");
  let partenaires: unknown = null;
  if (!pa || pa < new Date(Date.now() - 30 * 864e5).toISOString()) { const { partnersRefresh } = await import("./radar-extra.ts"); partenaires = await partnersRefresh(ws).catch((e) => ({ erreur: (e as Error).message })); }
  return { espace: ws.name, ...res, partenaires };
}

/** Clients de tes concurrents : contrats publics tenus par un concurrent suivi par Espion, avec la date de fin. */
export function rivalMatch(holder: string | null, rivals: string[]) {
  const h = norm(holder ?? "");
  return !!h && rivals.some((r) => r.length > 3 && h.includes(r));
}
