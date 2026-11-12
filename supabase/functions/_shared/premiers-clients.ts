// Tes premiers prospects : Bingoo! les trouve à la place de l'utilisateur, sans IA et sans coût,
// dans le registre public des entreprises (API Recherche d'entreprises de l'État : gratuite, sans clé).
// Il renvoie des établissements actifs du métier visé dans le département choisi, avec le dirigeant quand le registre le donne.
// Pas d'e-mail : le registre n'en publie pas ; l'utilisateur ouvre la fiche Google Maps de chacun pour le site et le téléphone.
import { HttpError, sleep } from "./http.ts";

const API = "https://recherche-entreprises.api.gouv.fr/search";

// Métier → codes d'activité (NAF rév. 2). Les mots sont comparés sans accents ni majuscules.
const METIERS: [RegExp, string[], string][] = [
  [/coiff|barbier/, ["96.02A"], "Coiffure"],
  [/esthet|institut|ongle|beaute|spa\b/, ["96.02B"], "Soins de beauté"],
  [/restaura|brasserie|pizzer/, ["56.10A", "56.10C"], "Restauration"],
  [/\bbar\b|bars\b|cafe/, ["56.30Z"], "Débits de boissons"],
  [/boulang|patiss/, ["10.71C", "10.71D"], "Boulangerie, pâtisserie"],
  [/traiteur/, ["56.21Z"], "Traiteurs"],
  [/agen\w* immobili|immobilier/, ["68.31Z"], "Agences immobilières"],
  [/concierg|gestion locative|syndic/, ["68.32A"], "Administration de biens"],
  [/hotel/, ["55.10Z"], "Hôtels"],
  [/gite|location saisonni|chambre d.hote/, ["55.20Z"], "Hébergement touristique"],
  [/coach|sport|fitness|salle de sport/, ["93.13Z", "85.51Z"], "Sport et coaching"],
  [/plomb|chauff/, ["43.22A", "43.22B"], "Plomberie, chauffage"],
  [/electric/, ["43.21A"], "Électricité"],
  [/macon|batiment|btp|artisan|renov|peint/, ["43.99C", "43.34Z", "43.31Z", "43.32A", "41.20A"], "Bâtiment"],
  [/menuis/, ["43.32A"], "Menuiserie"],
  [/kine/, ["86.90E"], "Kinésithérapie"],
  [/osteo|naturo|sophro|psycholog/, ["86.90F"], "Santé (autres professions)"],
  [/medecin|generaliste/, ["86.21Z"], "Médecins généralistes"],
  [/dentist/, ["86.23Z"], "Dentistes"],
  [/infirmi/, ["86.90D"], "Infirmiers"],
  [/veterin/, ["75.00Z"], "Vétérinaires"],
  [/pharma/, ["47.73Z"], "Pharmacies"],
  [/avocat|juridique/, ["69.10Z"], "Activités juridiques"],
  [/compta|expert/, ["69.20Z"], "Comptabilité"],
  [/architect/, ["71.11Z"], "Architectes"],
  [/e-?commer|boutique en ligne|vente en ligne/, ["47.91B"], "Vente à distance"],
  [/fleur/, ["47.76Z"], "Fleuristes"],
  [/garag|mecani|auto/, ["45.20A"], "Garages"],
  [/auto-?ecole/, ["85.53Z"], "Auto-écoles"],
  [/photograph/, ["74.20Z"], "Photographes"],
  [/agence web|marketing|communication|publicit/, ["73.11Z", "70.21Z"], "Agences de communication"],
  [/formation|formateur|organisme/, ["85.59A"], "Formation continue"],
  [/creche|garde d.enfant/, ["88.91A"], "Crèches"],
  [/nettoyage|menage/, ["81.21Z"], "Nettoyage"],
  [/taxi|vtc|chauffeur/, ["49.32Z"], "Taxis et VTC"],
  [/association/, ["94.99Z"], "Associations"],
  [/commer|magasin|boutique/, ["47.19B", "47.71Z"], "Commerce de détail"],
];
// Pour la version française ou plus simple d'un SaaS sans métier précisé : les clients probables selon sa catégorie
const PAR_CATEGORIE: Record<string, [string[], string]> = {
  "Immobilier": [["68.31Z"], "Agences immobilières"],
  "Commerce et restauration": [["56.10A", "56.10C"], "Restauration"],
  "Santé": [["86.90E", "86.21Z"], "Professions de santé"],
  "BTP et artisans": [["43.22A", "43.21A", "43.99C"], "Artisans du bâtiment"],
  "Éducation et formation": [["85.59A"], "Organismes de formation"],
  "E-commerce": [["47.91B"], "Vente à distance"],
};

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const titre = (s: string) => s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());

export function cibleNaf(metier: string | null, categorie: string | null) {
  const m = sansAccent(metier ?? "");
  if (m) for (const [re, naf, libelle] of METIERS) if (re.test(m)) return { naf, libelle, texte: null as string | null };
  if (m) return { naf: [] as string[], libelle: metier!, texte: metier! };
  const c = PAR_CATEGORIE[categorie ?? ""];
  return c ? { naf: c[0], libelle: c[1], texte: null } : null;
}

type Etab = { siret?: string; adresse?: string; code_postal?: string; libelle_commune?: string; liste_enseignes?: string[] | null; nom_commercial?: string | null; etat_administratif?: string; date_creation?: string };
type Res = { nombre_etablissements_ouverts?: number; nom_complet?: string; siren?: string; date_creation?: string; siege?: Etab; matching_etablissements?: Etab[]; dirigeants?: { nom?: string; prenoms?: string; qualite?: string; type_dirigeant?: string }[] };

export async function chercherProspects(metier: string | null, categorie: string | null, departement: string, max = 50) {
  const cible = cibleNaf(metier, categorie);
  if (!cible) throw new HttpError(400, "Précise un métier pour que Bingoo! trouve tes prospects (ex. coiffeurs, restaurants, agences immobilières).");
  const dep = departement.trim().toUpperCase().replace(/^0(?=\d$)/, "0");
  if (!/^(\d{2}|2A|2B|97\d)$/.test(dep)) throw new HttpError(400, "Indique un département (ex. 75, 69, 13, 2A).");
  const out: Record<string, unknown>[] = [];
  const vus = new Set<string>();
  const sirens = new Set<string>();
  for (let page = 1; page <= 6 && out.length < max; page++) {
    const u = new URL(API);
    if (cible.naf.length) u.searchParams.set("activite_principale", cible.naf.join(","));
    if (cible.texte) u.searchParams.set("q", cible.texte);
    u.searchParams.set("departement", dep);
    u.searchParams.set("etat_administratif", "A");
    // Les petites structures (moins de 20 salariés) : ce sont elles qui achètent un petit SaaS, pas les grandes chaînes
    u.searchParams.set("tranche_effectif_salarie", "NN,00,01,02,03,11");
    u.searchParams.set("per_page", "25");
    u.searchParams.set("page", String(page));
    let data: { results?: Res[]; total_results?: number; total_pages?: number } | null = null;
    for (let i = 0; i < 3 && !data; i++) {
      const r = await fetch(u, { headers: { accept: "application/json" } });
      if (r.status === 429) { await sleep(1200); continue; }
      if (!r.ok) throw new HttpError(502, `Registre des entreprises indisponible (${r.status})`);
      data = await r.json();
    }
    if (!data) throw new HttpError(503, "Registre des entreprises saturé, réessaie dans une minute");
    for (const r of data.results ?? []) {
      if ((r.nombre_etablissements_ouverts ?? 1) > 3 || (r.siren && sirens.has(r.siren))) continue; // pas de chaînes ni de franchises en série
      if (r.siren) sirens.add(r.siren);
      const e = (r.matching_etablissements?.length ? r.matching_etablissements : r.siege ? [r.siege] : [])
        .find((x) => (!x.etat_administratif || x.etat_administratif === "A") && (x.code_postal ?? "").startsWith(dep.replace(/^2[AB]$/, "20")));
      if (!e?.siret || vus.has(e.siret)) continue;
      vus.add(e.siret);
      const enseigne = e.liste_enseignes?.[0] ?? e.nom_commercial ?? "";
      const nom = titre(enseigne || r.nom_complet || "");
      const chef = (r.dirigeants ?? []).find((d) => d.type_dirigeant === "personne physique" && d.nom && !/commissaire|suppl[ée]ant/i.test(d.qualite ?? ""));
      const ville = e.libelle_commune ? titre(e.libelle_commune) : "";
      out.push({
        nom, siret: e.siret, adresse: e.adresse ?? "", ville, code_postal: e.code_postal ?? "",
        dirigeant: chef ? titre(`${chef.prenoms?.split(" ")[0] ?? ""} ${chef.nom.replace(/\s*\(.*?\)/g, "")}`.trim()) : null,
        prenom: chef?.prenoms ? titre(chef.prenoms.split(" ")[0]) : null,
        depuis: e.date_creation?.slice(0, 4) ?? null,
        maps: `https://www.google.com/maps/search/${encodeURIComponent(`${nom} ${ville}`)}`,
      });
      if (out.length >= max) break;
    }
    if (page >= (data.total_pages ?? 1)) break;
    await sleep(150);
  }
  return { cible: cible.libelle, departement: dep, prospects: out, source: "Registre national des entreprises (recherche-entreprises.api.gouv.fr)" };
}
