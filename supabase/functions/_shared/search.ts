// Agent Chercheur : établissements actifs du registre public des entreprises
// (API Recherche d'entreprises de l'État : gratuite, sans clé, toute la France).
import { HttpError, sleep } from "./http.ts";
import { admin, type Target } from "./core.ts";

const API = "https://recherche-entreprises.api.gouv.fr/search";

type Etab = { siret?: string; adresse?: string; code_postal?: string; libelle_commune?: string; est_siege?: boolean; liste_enseignes?: string[] | null; nom_commercial?: string | null; etat_administratif?: string; date_creation?: string; tranche_effectif_salarie?: string | null };
type Result = { date_creation?: string; tranche_effectif_salarie?: string | null; nombre_etablissements_ouverts?: number; nom_complet?: string; nom_raison_sociale?: string; siren?: string; siege?: Etab; matching_etablissements?: Etab[]; dirigeants?: { nom?: string; prenoms?: string; qualite?: string; type_dirigeant?: string }[] };

const title = (s: string) => s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());

function urlFor(t: Target, zone: string[], page: number, perPage: number) {
  const u = new URL(API);
  u.searchParams.set("activite_principale", t.naf.join(","));
  if (t.tranches?.length) u.searchParams.set("tranche_effectif_salarie", t.tranches.join(","));
  if (zone.length) u.searchParams.set("departement", zone.join(","));
  u.searchParams.set("etat_administratif", "A");
  u.searchParams.set("per_page", String(perPage));
  u.searchParams.set("page", String(page));
  return u;
}

async function fetchJson(u: URL) {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(u, { headers: { accept: "application/json" } });
    if (res.status === 429) { await sleep(1200); continue; }
    if (!res.ok) throw new HttpError(502, `Registre des entreprises indisponible (${res.status})`);
    return await res.json();
  }
  throw new HttpError(503, "Registre des entreprises saturé, réessaie dans une minute");
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const TRANCHE_LABEL: Record<string, string> = { "11": "10 à 19", "12": "20 à 49", "21": "50 à 99", "22": "100 à 199", "31": "200 à 249", "32": "250 à 499", "41": "500 à 999", "42": "1 000 à 1 999", "51": "2 000 à 4 999", "52": "5 000 à 9 999", "53": "10 000 et plus" };

/** Faits tirés du registre, utiles pour choisir le bon moment. */
function signalsOf(r: Result, e: Etab) {
  const out: { type: string; label: string }[] = [];
  const months = (d?: string) => d ? (Date.now() - new Date(d).getTime()) / (30.4 * 86400_000) : 999;
  if (months(e.date_creation) < 18) {
    const d = new Date(e.date_creation!);
    out.push({ type: "ouverture", label: `Établissement ouvert en ${MOIS[d.getMonth()]} ${d.getFullYear()}` });
  } else if (months(r.date_creation) < 24) {
    const d = new Date(r.date_creation!);
    out.push({ type: "creation", label: `Entreprise créée en ${MOIS[d.getMonth()]} ${d.getFullYear()}` });
  }
  const tr = e.tranche_effectif_salarie ?? r.tranche_effectif_salarie;
  if (tr && TRANCHE_LABEL[tr]) out.push({ type: "taille", label: `${TRANCHE_LABEL[tr]} salariés` });
  if ((r.nombre_etablissements_ouverts ?? 1) > 3) out.push({ type: "reseau", label: `Réseau de ${r.nombre_etablissements_ouverts} établissements` });
  return out;
}

/** Nombre d'entreprises correspondant à une cible (pour montrer le potentiel). */
export async function countTarget(t: Target, zone: string[]): Promise<number> {
  const d = await fetchJson(urlFor(t, zone, 1, 1));
  return Number(d.total_results ?? 0);
}

/** Cherche les prochains établissements d'une cible et les ajoute à l'espace. */
export async function searchTarget(workspaceId: string, t: Target, zone: string[], pages = 2) {
  const start = Math.max(1, t.next_page ?? 1);
  const rows: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  let next = start;
  let done = false;
  for (let page = start; page < start + Math.min(Math.max(pages, 1), 6); page++) {
    const data = await fetchJson(urlFor(t, zone, page, 25));
    const results: Result[] = data.results ?? [];
    for (const r of results) {
      const nom = title(r.nom_complet ?? r.nom_raison_sociale ?? "");
      const boss = (r.dirigeants ?? []).find((d) => d.type_dirigeant === "personne physique" && d.nom && !/commissaire|suppl[ée]ant/i.test(d.qualite ?? ""));
      const etabs = (t.siege_only ? (r.siege ? [r.siege] : []) : (r.matching_etablissements?.length ? r.matching_etablissements : r.siege ? [r.siege] : []))
        .filter((e) => !zone.length || zone.some((z) => (e.code_postal ?? "").startsWith(z.replace(/^2[AB]$/, "20"))))
        .filter((e) => !e.etat_administratif || e.etat_administratif === "A")
        .slice(0, 5); // au plus 5 établissements par entreprise
      for (const e of etabs) {
        if (!e.siret || seen.has(e.siret)) continue;
        seen.add(e.siret);
        const enseigne = e.liste_enseignes?.[0] ?? e.nom_commercial ?? "";
        rows.push({
          workspace_id: workspaceId,
          target: t.id,
          name: enseigne ? title(enseigne) : nom,
          org: enseigne ? nom : "",
          siren: r.siren ?? null,
          siret: e.siret,
          activity: t.label,
          address: e.adresse ?? "",
          postal_code: e.code_postal ?? "",
          city: e.libelle_commune ? title(e.libelle_commune) : "",
          contact_name: boss ? title(`${boss.prenoms?.split(" ")[0] ?? ""} ${boss.nom}`.trim()) : "", contact_source: boss ? "registre des dirigeants (INSEE)" : "",
          contact_role: boss?.qualite ?? "",
          signals: signalsOf(r, e),
        });
      }
    }
    next = page + 1;
    if (page >= (data.total_pages ?? 1)) { done = true; break; }
    await sleep(200);
  }
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const { data, error } = await admin.from("prospects").upsert(rows.slice(i, i + 200), { onConflict: "workspace_id,siret", ignoreDuplicates: true }).select("id");
    if (error) throw new HttpError(500, error.message);
    inserted += data?.length ?? 0;
  }
  return { found: rows.length, inserted, nextPage: done ? null : next };
}
