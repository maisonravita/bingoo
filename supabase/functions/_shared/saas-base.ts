// Explorer : la base de SaaS de Bingoo!. Chaque logiciel est relu régulièrement sur son propre site (accueil, tarifs,
// page carrières, changelog ou blog) ; chaque relevé est gardé pour l'historique (prix, recrutement, nouveautés).
// L'IA sert seulement à classer le logiciel et à lire les prix affichés ; tout le reste est lu tel quel, avec l'adresse de la page.
import { admin, ask, askJson, env, setAi, type Workspace } from "./core.ts";
import { fetchHtml, textOf } from "./analyze.ts";
import { autorise, lienStrict, lireSite, robots } from "./marche-saas.ts";

export const CATEGORIES = [
  "CRM et ventes", "Prospection et emailing", "Marketing et SEO", "Réseaux sociaux et contenu", "Facturation et comptabilité",
  "Paie et RH", "Recrutement", "Gestion de projet", "Collaboration et documents", "Support client", "E-commerce",
  "Paiement et finance", "Juridique", "Immobilier", "Santé", "Éducation et formation", "Commerce et restauration",
  "Logistique et transport", "Développeurs et no-code", "Données et analytics", "Sécurité et conformité",
  "IA et automatisation", "Événements", "BTP et artisans", "Agences et freelances", "Autre",
];
const TLD_PAYS: Record<string, string> = { fr: "FR", de: "DE", es: "ES", it: "IT", be: "BE", nl: "NL", ch: "CH", uk: "GB", io: "", com: "", co: "", ai: "", app: "", pt: "PT", ca: "CA", se: "SE", dk: "DK", pl: "PL", at: "AT", ie: "IE" };

// Sous-niches : 3 à 6 étiquettes courtes en français, en minuscules (métier visé, type de client, usage précis)
export const TAGS_REGLE = "3 à 6 étiquettes courtes en français et en minuscules qui précisent la niche : le métier ou secteur visé (ex. « agences immobilières », « restaurants »), le type de client (« indépendants », « tpe », « pme », « grands comptes »), l'usage précis (« relance de factures », « prise de rendez-vous », « signature électronique »)";
export const nettoieTags = (t: unknown) => [...new Set((Array.isArray(t) ? t : []).map((x) => String(x).toLowerCase().trim().replace(/[«»"]/g, "").slice(0, 40)).filter((x) => x.length >= 3 && !["autre", "autres", "divers", "général", "entreprises"].includes(x)))].slice(0, 6);

export const domaineDe = (u: string) => {
  let s = String(u ?? "").trim().toLowerCase();
  if (!s) return "";
  if (!/^https?:\/\//.test(s)) s = `https://${s}`;
  try { return new URL(s).hostname.replace(/^www\./, ""); } catch { return ""; }
};

/** Ajoute des domaines à la base (ignorés s'ils y sont déjà). */
export async function saasAdd(urls: string[], source: string) {
  const doms = [...new Set(urls.map(domaineDe).filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) && !/(google|facebook|linkedin|youtube|wikipedia|github|apple|microsoft)\.com$/.test(d)))];
  if (!doms.length) return 0;
  const { data } = await admin.from("saas").upsert(doms.map((d) => ({ domaine: d, source })), { onConflict: "domaine", ignoreDuplicates: true }).select("id");
  return data?.length ?? 0;
}

/** Signaux de méthode lus sur l'accueil (liens publics) : programme d'affiliation, intégrations, réseaux, outils gratuits. */
function methode(html: string, base: string) {
  const liens = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1], base).href; } catch { return ""; } }).filter(Boolean);
  const un = (re: RegExp) => liens.find((u) => re.test(u)) ?? "";
  return {
    affiliation: un(/(affiliat|partenaire|partner-?program|referral|parrainage)/i),
    integrations: un(/(integrations?|marketplace|apps?-store|connecteurs?)/i),
    outils_gratuits: un(/(free-tools?|outils-gratuits|tools\/|calculat|generat|templates?|modeles)/i),
    comparatifs: un(/(\/vs\/|-vs-|alternatives?|comparatif|compare)/i),
    linkedin: un(/linkedin\.com\/company/i), youtube: un(/youtube\.com\/(c\/|channel|@)/i), x: un(/(twitter|x)\.com\/[a-z0-9_]+$/i),
    producthunt: un(/producthunt\.com\/(posts|products)/i), g2: un(/g2\.com\/products/i), capterra: un(/capterra\./i),
  };
}

/** Relecture complète d'un SaaS (accueil, tarifs, carrières, nouveautés) et enregistrement d'un relevé. */
export async function saasLire(id: string) {
  const { data: s } = await admin.from("saas").select("*").eq("id", id).single();
  if (!s) return null;
  const site = `https://${s.domaine}`;
  const f = await lireSite(site, s.nom ?? s.domaine);
  if (!f.lisible) {
    const essais = (s.essais ?? 0) + 1;
    await admin.from("saas").update({ essais, lu_at: new Date().toISOString(), ...(essais >= 3 ? { statut: "illisible" } : {}) }).eq("id", id);
    return { id, statut: "illisible" };
  }
  const home = (await fetchHtml(site).catch(() => "")).slice(0, 400_000);
  const texteHome = textOf(home);
  // Début de l'accueil (l'offre) et fin (pied de page : adresse, mentions légales, pour le pays)
  const accueil = texteHome.slice(0, 2600) + (texteHome.length > 3400 ? `\n[…]\n${texteHome.slice(-900)}` : "");
  // Pages de tarifs affichées par JavaScript : texte rendu par un vrai navigateur (workflow « Explorer – tarifs »), s'il a moins de 8 jours
  const rendu = s.prix_rendu && s.prix_rendu_at && Date.now() - Date.parse(s.prix_rendu_at) < 8 * 864e5 ? String(s.prix_rendu) : "";
  const tarifs = rendu.length > f.prix_texte.length ? rendu : f.prix_texte;
  setAi({ feature: "explorer/lecture" });
  const a = await askJson<{ est_saas: boolean; nom: string; categorie: string; description: string; cible: string; pays: string | null; langue: string | null;
    gratuit: boolean; essai: string | null; modele: string | null; prix_usage: string | null; prix_entree: number | null; devise: string | null; periode: string | null; sur_devis: boolean; formules: { nom: string; prix: string }[]; tags: string[] }>(
    `Voici le site ${s.domaine}. Classe ce logiciel et lis ses prix, sans rien inventer (null si absent).
ACCUEIL :
${accueil}
TARIFS :
${tarifs.slice(0, 3500)}
Clés : est_saas (true si c'est un logiciel vendu en ligne, par abonnement ou à l'usage ; false pour une agence, un média, un site vitrine), nom, categorie (exactement une de : ${CATEGORIES.join(" | ")}),
description (une phrase en français : ce qu'il fait), cible (une phrase en français : pour qui), tags (${TAGS_REGLE}), pays (code à 2 lettres du pays du siège s'il est écrit ou évident : adresse, mentions légales, devise ; sinon null), langue (code de la langue du site),
gratuit (formule gratuite), essai (durée de l'essai gratuit ou null), modele (abonnement : prix fixe par mois, an ou semaine ; usage : prix par ticket, résolution, crédit, unité, boîte mail… ; commission : pourcentage ou frais par transaction ou par billet),
prix_entree (prix le plus bas d'une formule d'ABONNEMENT payante, nombre ; null si le seul prix affiché est à l'usage ou une commission), devise (€ $ £), periode (mois, an ou semaine), prix_usage (si usage ou commission : le prix tel qu'affiché en quelques mots, ex. « 0,99 $ par résolution » ; sinon null), sur_devis, formules (au plus 4 : nom et prix tel qu'affiché).`,
    { fast: true, maxTokens: 900 }).catch(() => null);
  if (!a) { await admin.from("saas").update({ essais: (s.essais ?? 0) + 1, lu_at: new Date().toISOString() }).eq("id", id); return { id, statut: "erreur" }; }
  if (a.est_saas === false) { await admin.from("saas").update({ statut: "pas_saas", nom: a.nom || s.nom, lu_at: new Date().toISOString() }).eq("id", id); return { id, statut: "pas_saas" }; }
  const tld = s.domaine.split(".").pop() ?? "";
  const pays = (a.pays && /^[A-Z]{2}$/.test(a.pays.toUpperCase()) ? a.pays.toUpperCase() : null) ?? (TLD_PAYS[tld] || null) ?? s.pays ?? (await paysDe(site, home).catch(() => null))?.pays ?? null;
  const taux = a.devise === "$" ? 0.92 : a.devise === "£" ? 1.16 : 1;
  const brut = a.prix_entree && a.prix_entree > 0 ? a.prix_entree * taux * (a.periode === "an" ? 1 / 12 : a.periode === "semaine" ? 52 / 12 : 1) : null;
  // Moins de 2 € par mois : c'est presque toujours un prix à l'usage lu comme un abonnement
  const prix = brut != null && brut >= 2 ? Math.round(brut) : null;
  const modele = ["abonnement", "usage", "commission"].includes(a.modele ?? "") ? a.modele : null;
  const il30 = Date.now() - 30 * 864e5;
  const actif = f.nouveaute.date ? Date.parse(f.nouveaute.date) >= il30 : false;
  // Score de croissance (0 à 100), à partir de faits relevés : postes ouverts, nouveauté récente, hausse de postes depuis le relevé précédent
  const { data: prev } = await admin.from("saas_releves").select("postes").eq("saas_id", id).order("at", { ascending: false }).limit(1);
  const hausse = prev?.[0]?.postes != null && f.recrute.postes != null ? f.recrute.postes - prev[0].postes : 0;
  const score = Math.max(0, Math.min(100, Math.round((f.recrute.oui ? 25 : 0) + Math.min(35, (f.recrute.postes ?? 0) * 2.5) + (actif ? 25 : 0) + Math.max(0, Math.min(15, hausse * 3)))));
  const champs = {
    nom: (a.nom || s.domaine).slice(0, 80), categorie: CATEGORIES.includes(a.categorie) ? a.categorie : "Autre",
    description: (a.description ?? "").slice(0, 300), cible: (a.cible ?? "").slice(0, 200), tags: nettoieTags(a.tags), pays, langue: (a.langue ?? "").slice(0, 5) || null, est_saas: true,
    prix_entree_eur: prix, devise: a.devise ?? null, prix_affiche: prix != null ? `${a.prix_entree} ${a.devise ?? ""}/${a.periode === "an" ? "an" : a.periode === "semaine" ? "semaine" : "mois"}` : a.prix_usage ? String(a.prix_usage).slice(0, 80) : null, modele_prix: modele,
    gratuit: !!a.gratuit, essai: a.essai ?? null, sur_devis: !!a.sur_devis, formules: (a.formules ?? []).slice(0, 4),
    recrute: f.recrute.oui, postes: f.recrute.postes, nouveaute: f.nouveaute.date, outils: f.outils,
    liens: { prix: f.prix_url || null, carrieres: f.recrute.url || null, nouveautes: f.nouveaute.url || null },
    methode: methode(home, site), score_croissance: score, statut: "ok", essais: 0, lu_at: new Date().toISOString(),
  };
  const { data: meme } = await admin.from("saas").select("id").eq("statut", "ok").ilike("nom", champs.nom.replace(/[%_\\]/g, "\\$&")).neq("id", id).limit(1);
  if (meme?.length) { await admin.from("saas").update({ statut: "doublon", nom: champs.nom, lu_at: new Date().toISOString() }).eq("id", id); return { id, statut: "doublon" }; }
  // Ce qui a bougé depuis le relevé précédent (seulement pour une fiche déjà lue)
  if (s.statut === "ok") {
    const ev: { type: string; avant?: string | null; apres?: string | null }[] = [];
    const txt = (v: unknown) => v == null || v === "" ? null : String(v);
    if (s.prix_entree_eur != null && prix != null && prix !== s.prix_entree_eur) ev.push({ type: prix > s.prix_entree_eur ? "prix_hausse" : "prix_baisse", avant: `${s.prix_entree_eur} €`, apres: `${prix} €` });
    if (s.gratuit === false && champs.gratuit) ev.push({ type: "gratuit_ajoute" });
    if (s.gratuit === true && !champs.gratuit && a.prix_entree) ev.push({ type: "gratuit_retire" });
    if (s.essai && champs.essai && s.essai !== champs.essai) ev.push({ type: "essai_change", avant: s.essai, apres: champs.essai });
    if (!s.recrute && champs.recrute) ev.push({ type: "recrute_debut", apres: txt(champs.postes) });
    else if (s.recrute && !champs.recrute) ev.push({ type: "recrute_fin", avant: txt(s.postes) });
    else if (s.postes != null && champs.postes != null && Math.abs(champs.postes - s.postes) >= Math.max(3, Math.round(s.postes * 0.3))) ev.push({ type: champs.postes > s.postes ? "recrutement_hausse" : "recrutement_baisse", avant: String(s.postes), apres: String(champs.postes) });
    if (champs.nouveaute && (!s.nouveaute || champs.nouveaute > s.nouveaute)) ev.push({ type: "nouveaute", avant: txt(s.nouveaute), apres: champs.nouveaute });
    if (ev.length) await admin.from("saas_evenements").insert(ev.map((e) => ({ saas_id: id, ...e })));
  }
  await admin.from("saas").update(champs).eq("id", id);
  await admin.from("saas_releves").insert({ saas_id: id, prix_entree_eur: prix, formules: champs.formules, gratuit: champs.gratuit, essai: champs.essai, recrute: champs.recrute, postes: champs.postes, nouveaute: champs.nouveaute, outils: champs.outils });
  return { id, statut: "ok", nom: champs.nom };
}

/** Relevés de nuit : les SaaS jamais lus d'abord, puis ceux relus il y a plus de 7 jours. Budget de temps de l'appel respecté. */
export async function saasCron(maxMs = 110_000) {
  const t0 = Date.now();
  const semaine = new Date(Date.now() - 7 * 864e5).toISOString();
  // D'abord les fiches à relire tout de suite (tarifs rendus par le navigateur), puis les nouvelles, puis les plus anciennes
  const { data: urgent } = await admin.from("saas").select("id").eq("statut", "ok").is("lu_at", null).limit(15);
  const { data } = await admin.from("saas").select("id").or(`statut.eq.a_lire,and(statut.eq.ok,lu_at.lt.${semaine})`).lt("essais", 3).order("lu_at", { ascending: true, nullsFirst: true }).limit(15);
  const ids = [...new Set([...(urgent ?? []), ...(data ?? [])].map((x) => x.id))].slice(0, 15);
  const out = { lus: 0, ok: 0, illisibles: 0, pas_saas: 0 };
  for (let i = 0; i < ids.length; i += 3) {
    if (Date.now() - t0 > maxMs - 35_000) break;
    const r = await Promise.all(ids.slice(i, i + 3).map((id) => saasLire(id).catch(() => null)));
    for (const x of r) { out.lus++; if (x?.statut === "ok") out.ok++; else if (x?.statut === "illisible") out.illisibles++; else if (x?.statut === "pas_saas") out.pas_saas++; }
  }
  return out;
}

/** Amorçage : pour une catégorie et une région, une liste de SaaS réels (domaines vérifiés ensuite par la lecture du site). */
export async function saasSeed(categorie: string, region: string) {
  setAi({ feature: "explorer/amorcage" });
  const r = await askJson<{ saas: { nom: string; site: string }[] }>(`Liste 40 logiciels SaaS réels et en activité de la catégorie « ${categorie} », dont le siège est en ${region}, des plus connus aux plus petits (inclus des SaaS de solos et de petites équipes).
Donne seulement ceux dont tu connais le site officiel avec certitude ; n'invente aucune adresse.
Clé : saas, liste d'objets nom et site (adresse du site officiel).`, { fast: true, maxTokens: 2500 }).catch(() => ({ saas: [] }));
  return await saasAdd((r.saas ?? []).map((x) => x.site), `amorcage:${categorie}:${region}`);
}

// ---------------------------------------------------------------- Tendances (données officielles)
// Créations d'entreprises dont l'activité déclarée parle de logiciel, mois par mois sur 12 mois, par thème
// (annonces légales BODACC). Mis en cache 24 heures.
const BODACC = "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records";
export const THEMES: [string, string, string[]][] = [
  ["tous", "Tous les logiciels", []],
  ["ia", "Intelligence artificielle", ["intelligence artificielle", "IA"]],
  ["facturation", "Facturation et comptabilité", ["facturation", "comptab"]],
  ["crm", "CRM et ventes", ["CRM", "relation client"]],
  ["rh", "RH et paie", ["ressources humaines", "paie", "recrutement"]],
  ["ecommerce", "E-commerce", ["e-commerce", "vente en ligne"]],
  ["formation", "Formation", ["formation", "éducation"]],
  ["sante", "Santé", ["santé", "médical"]],
  ["immobilier", "Immobilier", ["immobilier"]],
  ["securite", "Cybersécurité", ["cybersécurité", "sécurité informatique"]],
  ["marketing", "Marketing", ["marketing", "publicité"]],
  ["nocode", "No-code et automatisation", ["no-code", "automatisation"]],
];
export async function saasTendances() {
  const { data: c } = await admin.from("explorer_cache").select("v, at").eq("k", "tendances").maybeSingle();
  if (c && Date.now() - Date.parse(c.at) < 24 * 3600_000) return c.v;
  const depuis = new Date(); depuis.setUTCMonth(depuis.getUTCMonth() - 12); depuis.setUTCDate(1);
  const q = (s: string) => `"${s.replace(/"/g, "")}"`;
  const series = await Promise.all(THEMES.map(async ([id, label, mots]) => {
    const where = [`dateparution>=date'${depuis.toISOString().slice(0, 10)}'`, `familleavis="creation"`, `(search(listeetablissements,"logiciel") or search(listeetablissements,"SaaS"))`,
      ...(mots.length ? [`(${mots.map((m) => `search(listeetablissements,${q(m)})`).join(" or ")})`] : [])].join(" and ");
    const u = new URL(BODACC);
    for (const [k, v] of Object.entries({ select: "count(*) as n", group_by: `date_format(dateparution,"yyyy-MM") as mois`, where, order_by: "mois", limit: "24" })) u.searchParams.set(k, v);
    const r = await fetch(u, { signal: AbortSignal.timeout(20000) }).then((x) => x.json()).catch(() => null);
    const pts = ((r?.results ?? []) as { mois: string; n: number }[]).map((x) => ({ mois: x.mois, n: Number(x.n) }));
    // Mois en cours incomplet : retiré de la courbe
    const enCours = new Date().toISOString().slice(0, 7);
    const complets = pts.filter((p) => p.mois < enCours);
    const der = complets.at(-1)?.n ?? 0, avant = complets.at(-4)?.n ?? 0;
    return { id, label, points: complets, dernier: der, evolution_3m: avant ? Math.round(((der - avant) / avant) * 100) : null };
  }));
  const v = { series, source: "BODACC (annonces légales officielles), créations dont l'activité mentionne un logiciel", maj: new Date().toISOString() };
  if (series.some((x) => x.points.length)) await admin.from("explorer_cache").upsert({ k: "tendances", v, at: new Date().toISOString() });
  return v;
}

// ---------------------------------------------------------------- Alerte du lundi
// Pour chaque espace qui suit des SaaS ou des catégories : les changements des 7 derniers jours et les nouveaux SaaS des catégories suivies.
const EV_TXT: Record<string, string> = {
  prix_hausse: "hausse de prix", prix_baisse: "baisse de prix", gratuit_ajoute: "lance une version gratuite", gratuit_retire: "retire sa version gratuite",
  essai_change: "change son essai gratuit", recrutement_hausse: "recrute davantage", recrutement_baisse: "recrute moins", recrute_debut: "commence à recruter",
  recrute_fin: "n'a plus d'offre d'emploi", nouveaute: "publie une nouveauté", nouveau_saas: "entre dans la base",
};
const escH = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
export async function saasAlertes(seulement?: string) {
  const { teamAddress, sendSystem } = await import("./mail.ts");
  const { data: suivis } = await admin.from("saas_suivis").select("workspace_id, saas_id, categorie");
  const parWs = new Map<string, { saas: Set<string>; cats: Set<string> }>();
  for (const f of (suivis ?? []) as { workspace_id: string; saas_id: string | null; categorie: string | null }[]) {
    if (seulement && f.workspace_id !== seulement) continue;
    const x = parWs.get(f.workspace_id) ?? { saas: new Set(), cats: new Set() };
    if (f.saas_id) x.saas.add(f.saas_id); if (f.categorie) x.cats.add(f.categorie);
    parWs.set(f.workspace_id, x);
  }
  const depuis = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: evs } = await admin.from("saas_evenements").select("at, type, avant, apres, saas:saas_id(id, domaine, nom, categorie, statut)").gte("at", depuis).order("at", { ascending: false }).limit(5000);
  const { data: nouveaux } = await admin.from("saas").select("id, domaine, nom, categorie, description, prix_entree_eur").eq("statut", "ok").gte("created_at", depuis).limit(3000);
  const { data: mails } = await admin.from("saas_emails").select("saas_id, subject, kind, offre, resume").gte("recu_at", depuis).not("kind", "in", "(confirmation,a_classer)").limit(3000);
  const { data: pubs } = await admin.from("saas_pubs").select("saas_id, titre, body").gte("started", depuis.slice(0, 10)).limit(3000);
  const { data: noms } = await admin.from("saas").select("id, nom, domaine").in("id", [...new Set([...(mails ?? []), ...(pubs ?? [])].map((x) => x.saas_id).filter(Boolean))]);
  const nomDe = new Map(((noms ?? []) as { id: string; nom: string; domaine: string }[]).map((x) => [x.id, x]));
  const site = "https://kairo.maisonravita.fr";
  let envoyes = 0;
  for (const [wsId, f] of parWs) {
    const mes = ((evs ?? []) as { at: string; type: string; avant: string | null; apres: string | null; saas: { id: string; domaine: string; nom: string; categorie: string; statut: string } | null }[])
      .filter((e) => e.saas && e.saas.statut === "ok" && (f.saas.has(e.saas.id) || f.cats.has(e.saas.categorie))).slice(0, 40);
    const neufs = ((nouveaux ?? []) as { domaine: string; nom: string; categorie: string; description: string; prix_entree_eur: number | null }[]).filter((s) => f.cats.has(s.categorie)).slice(0, 15);
    const sesMails = ((mails ?? []) as { saas_id: string; subject: string; kind: string; offre: string; resume: string }[]).filter((m) => f.saas.has(m.saas_id) && nomDe.has(m.saas_id)).slice(0, 10);
    const parPub = new Map<string, number>();
    for (const p of (pubs ?? []) as { saas_id: string }[]) if (f.saas.has(p.saas_id)) parPub.set(p.saas_id, (parPub.get(p.saas_id) ?? 0) + 1);
    const sesPubs = [...parPub].filter(([id]) => nomDe.has(id));
    if (!mes.length && !neufs.length && !sesMails.length && !sesPubs.length) continue;
    const { data: w } = await admin.from("workspaces").select("*").eq("id", wsId).single();
    if (!w) continue;
    const to = await teamAddress(w as Workspace);
    if (!to) continue;
    const ligne = (e: typeof mes[number]) => `${e.saas!.nom} : ${EV_TXT[e.type] ?? e.type}${e.type !== "nouveaute" && e.avant && e.apres ? ` (${e.avant} → ${e.apres})` : ""}`;
    const text = [`Ton marché cette semaine`, "", ...(mes.length ? ["Ce qui a bougé :", ...mes.map((e) => `- ${ligne(e)}`), ""] : []),
      ...(neufs.length ? ["Nouveaux SaaS dans tes catégories :", ...neufs.map((s) => `- ${s.nom} (${s.categorie})${s.prix_entree_eur != null ? `, dès ${s.prix_entree_eur} €/mois` : ""}`), ""] : []),
      ...(sesMails.length ? ["Leurs e-mails :", ...sesMails.map((m) => `- ${nomDe.get(m.saas_id)!.nom} : ${m.subject}${m.offre ? ` (${m.offre})` : ""}`), ""] : []),
      ...(sesPubs.length ? ["Nouvelles pubs Facebook et Instagram :", ...sesPubs.map(([id, n]) => `- ${nomDe.get(id)!.nom} : ${n} nouvelle${n > 1 ? "s" : ""}`), ""] : []),
      `Tout voir : ${site}/#/explorer/suivis`].join("\n");
    const html = `<div style="font-family:Arial,sans-serif;color:#15161A;max-width:560px"><h2 style="margin:0 0 4px">Ton marché cette semaine</h2><p style="color:#5B5D66;margin:0 0 16px">${mes.length} changement${mes.length > 1 ? "s" : ""} chez les SaaS que tu suis${neufs.length ? `, ${neufs.length} nouveau${neufs.length > 1 ? "x" : ""} SaaS dans tes catégories` : ""}.</p>
${mes.length ? `<h3 style="margin:16px 0 6px">Ce qui a bougé</h3><ul style="padding-left:18px">${mes.map((e) => `<li style="margin:4px 0"><a href="${site}/#/explorer/${escH(e.saas!.domaine)}" style="color:#15161A;font-weight:bold">${escH(e.saas!.nom)}</a> : ${escH(EV_TXT[e.type] ?? e.type)}${e.type !== "nouveaute" && e.avant && e.apres ? ` (${escH(e.avant)} → ${escH(e.apres)})` : ""}</li>`).join("")}</ul>` : ""}
${neufs.length ? `<h3 style="margin:16px 0 6px">Nouveaux SaaS dans tes catégories</h3><ul style="padding-left:18px">${neufs.map((s) => `<li style="margin:4px 0"><a href="${site}/#/explorer/${escH(s.domaine)}" style="color:#15161A;font-weight:bold">${escH(s.nom)}</a> · ${escH(s.categorie)}${s.prix_entree_eur != null ? ` · dès ${s.prix_entree_eur} €/mois` : ""}</li>`).join("")}</ul>` : ""}
${sesMails.length ? `<h3 style="margin:16px 0 6px">Leurs e-mails</h3><ul style="padding-left:18px">${sesMails.map((m) => `<li style="margin:4px 0"><a href="${site}/#/explorer/${escH(nomDe.get(m.saas_id)!.domaine)}" style="color:#15161A;font-weight:bold">${escH(nomDe.get(m.saas_id)!.nom)}</a> : ${escH(m.subject)}${m.offre ? ` <span style="color:#5B5D66">(${escH(m.offre)})</span>` : ""}</li>`).join("")}</ul>` : ""}
${sesPubs.length ? `<h3 style="margin:16px 0 6px">Nouvelles pubs Facebook et Instagram</h3><ul style="padding-left:18px">${sesPubs.map(([id, n]) => `<li style="margin:4px 0"><a href="${site}/#/explorer/${escH(nomDe.get(id)!.domaine)}" style="color:#15161A;font-weight:bold">${escH(nomDe.get(id)!.nom)}</a> : ${n} nouvelle${n > 1 ? "s" : ""}</li>`).join("")}</ul>` : ""}
<p style="margin-top:20px"><a href="${site}/#/explorer/suivis" style="background:#E0531F;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Tout voir dans Explorer</a></p></div>`;
    try {
      await sendSystem({ to, subject: `Ton marché cette semaine : ${mes.length} changement${mes.length > 1 ? "s" : ""}${neufs.length ? `, ${neufs.length} nouveau${neufs.length > 1 ? "x" : ""} SaaS` : ""}`, text, html, key: `alerte-saas-${wsId}-${new Date().toISOString().slice(0, 10)}` });
      envoyes++;
    } catch (e) { console.error("alerte saas", wsId, e); }
  }
  return { espaces: parWs.size, envoyes };
}


// ---------------------------------------------------------------- Sous-niches des fiches déjà lues (sans relire les sites)
export async function saasTags(max = 80) {
  setAi({ feature: "explorer/niches" });
  const { data } = await admin.from("saas").select("id, nom, categorie, description, cible").eq("statut", "ok").eq("tags", "{}").limit(max);
  const rows = (data ?? []) as { id: string; nom: string; categorie: string; description: string | null; cible: string | null }[];
  let faits = 0;
  for (let i = 0; i < rows.length; i += 10) {
    const lot = rows.slice(i, i + 10);
    const r = await askJson<{ saas: { i: number; tags: string[] }[] }>(`Pour chaque logiciel ci-dessous, donne ${TAGS_REGLE}. N'invente rien qui ne ressorte pas de la description.
${lot.map((x, k) => `${k}. ${x.nom} (${x.categorie}) : ${x.description ?? ""} Pour : ${x.cible ?? ""}`).join("\n")}
Clé : saas, liste d'objets i (le numéro) et tags.`, { fast: true, maxTokens: 2500 }).catch(() => ({ saas: [] }));
    for (const x of r.saas ?? []) { const row = lot[Number(x.i)]; const tags = nettoieTags(x.tags); if (row && tags.length) { await admin.from("saas").update({ tags }).eq("id", row.id); faits++; } }
  }
  return { faits, restant: rows.length - faits };
}

// ---------------------------------------------------------------- Recherche par le sens
// La question (« un outil pour relancer mes factures impayées ») devient des termes : synonymes français et anglais,
// noms d'usage, étiquettes de niche, et une catégorie si elle est évidente. La notation se fait ensuite en base.
export async function saasRecherche(q: string, categorie?: string | null) {
  setAi({ feature: "explorer/recherche" });
  const r = await askJson<{ termes: string[]; categorie: string | null }>(`Quelqu'un cherche un logiciel SaaS avec cette demande : « ${q.slice(0, 200)} ».
Donne les termes à chercher dans des fiches de logiciels (nom, description, étiquettes) : 6 à 14 mots ou groupes de 1 à 3 mots, en français ET en anglais, synonymes et usages concrets (ex. pour « relancer mes factures impayées » : relance, impayés, recouvrement, facturation, factures, dunning, accounts receivable, encaissement).
Et la catégorie si elle est évidente, exactement une de : ${CATEGORIES.join(" | ")} ; sinon null.
Clés : termes, categorie.`, { fast: true, maxTokens: 300 }).catch(() => ({ termes: q.split(/\s+/), categorie: null }));
  const termes = [...new Set((r.termes ?? []).map((t) => String(t).toLowerCase().trim()).filter((t) => t.length >= 3))].slice(0, 16);
  const { data, error } = await admin.rpc("saas_recherche", { termes, cat: categorie || null, lim: 60 });
  if (error) throw new Error(error.message);
  return { termes, categorie_suggeree: CATEGORIES.includes(r.categorie ?? "") ? r.categorie : null, resultats: data ?? [] };
}

// ---------------------------------------------------------------- Réussites : chiffres publics, chacun avec sa source
// Recherche web (articles, interviews, communiqués de levée, pages « à propos »), puis extraction stricte : un chiffre
// sans adresse de page lue pendant la recherche est écarté. Aucun chiffre public : la fiche est marquée « rien ».
const TAUX: Record<string, number> = { "€": 1, EUR: 1, "$": 0.92, USD: 0.92, "£": 1.16, GBP: 1.16 };
export async function saasHistoire(id: string) {
  const { data: s } = await admin.from("saas").select("id, nom, domaine, categorie, description").eq("id", id).single();
  if (!s) return null;
  setAi({ feature: "explorer/histoire" });
  const etude = await ask(`Cherche les chiffres publics du logiciel ${s.nom} (${s.domaine}) : ${s.description ?? s.categorie}.
Ce que je veux, seulement s'il est publié quelque part (article de presse, interview du fondateur, communiqué de levée de fonds, page « à propos », registre officiel) :
année de création, fondateurs, chiffre d'affaires ou ARR ou MRR (avec l'année), montant total levé, nombre de salariés, nombre de clients,
et surtout comment il a trouvé ses clients et grandi (bouche-à-oreille, référencement, version gratuite, partenariats, vente directe, communauté, place de marché, rachat…) si une interview ou un article le raconte. 3 recherches au plus.
Réponds en texte. Après CHAQUE chiffre ou fait, écris l'adresse exacte de la page où tu l'as lu. Si rien n'est publié, dis-le ; n'estime rien.`,
    { maxTokens: 1800, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }] }).catch(() => "");
  if (!etude) return { id, statut: "erreur" };
  const x = await askJson<{ annee_creation: number | null; fondateurs: string[]; chiffres: { type: string; valeur: number; devise: string | null; annee: number | null; texte: string; source: string }[]; histoire: string | null; lecons: string[] }>(
    `Extrais de ce texte, sans rien ajouter ni estimer :
${etude.slice(0, 7000)}
Clés : annee_creation (nombre ou null), fondateurs (noms), chiffres (liste : type parmi ca | arr | mrr | levee | salaries | clients, valeur (nombre entier, ex. 12000000 pour 12 M), devise (€ $ £ ou null), annee (année du chiffre ou null), texte (le chiffre tel qu'écrit en français court, ex. « 12 M€ de chiffre d'affaires en 2023 »), source (adresse https de la page citée pour ce chiffre)),
histoire (2 à 4 phrases en français qui racontent son parcours avec ces faits, comme un journaliste : pas de remarque sur les sources, pas de mise en garde ; null si le texte n'a rien),
lecons (0 à 3 phrases courtes et concrètes sur la méthode qui lui a apporté des clients ou de la croissance, ex. « A grandi grâce à sa version open source, adoptée par 50 000 équipes avant de vendre l'offre payante. » ; seulement si le texte le décrit, sinon liste vide).`,
    { fast: true, maxTokens: 1200 }).catch(() => null);
  if (!x) return { id, statut: "erreur" };
  const chiffres = (x.chiffres ?? []).filter((c) => /^https?:\/\//.test(c.source ?? "") && etude.includes(c.source.replace(/\/$/, "")) && Number(c.valeur) > 0 && ["ca", "arr", "mrr", "levee", "salaries", "clients"].includes(c.type))
    .map((c) => ({ ...c, valeur: Math.round(Number(c.valeur)), valeur_eur: ["salaries", "clients"].includes(c.type) ? null : Math.round(Number(c.valeur) * (TAUX[c.devise ?? "€"] ?? 1)) })).slice(0, 8);
  const rev = Math.max(0, ...chiffres.map((c) => c.type === "mrr" ? (c.valeur_eur ?? 0) * 12 : ["ca", "arr"].includes(c.type) ? c.valeur_eur ?? 0 : 0));
  const sources = [...new Set(chiffres.map((c) => c.source))];
  const ok = chiffres.length > 0;
  const annee = Number(x.annee_creation) >= 1980 && Number(x.annee_creation) <= new Date().getFullYear() ? Number(x.annee_creation) : null;
  await admin.from("saas_histoires").upsert({ saas_id: id, statut: ok ? "ok" : "rien", annee_creation: annee, fondateurs: (x.fondateurs ?? []).slice(0, 4).map(String),
    chiffres, histoire: ok ? (x.histoire ?? null) : null, lecons: ok ? (x.lecons ?? []).slice(0, 3).map(String) : [], sources, revenu_eur: rev || null, at: new Date().toISOString() });
  return { id, statut: ok ? "ok" : "rien", chiffres: chiffres.length };
}

/** Réussites en tâche de fond : les SaaS qui recrutent le plus d'abord (les plus susceptibles d'avoir des chiffres publiés). */
export async function saasHistoires(n = 3) {
  const { data: faits } = await admin.from("saas_histoires").select("saas_id");
  const vus = new Set((faits ?? []).map((f) => f.saas_id));
  const { data } = await admin.from("saas").select("id").eq("statut", "ok").order("postes", { ascending: false, nullsFirst: false }).order("score_croissance", { ascending: false }).limit(vus.size + 40);
  const ids = (data ?? []).map((r) => r.id).filter((i) => !vus.has(i)).slice(0, n);
  const r = await Promise.all(ids.map((i) => saasHistoire(i).catch(() => null)));
  return { faits: r.filter(Boolean).length, ok: r.filter((x) => x?.statut === "ok").length };
}

// ---------------------------------------------------------------- Pays du siège, lu dans les mentions légales
// Pied de page de l'accueil + page « mentions légales / imprint / legal », dans le respect du robots.txt.
// L'IA doit citer mot pour mot le passage qui donne le pays ; une citation absente du texte est rejetée.
const ADRESSE = /(si[eè]ge|registered (office|address)|headquarter|head office|incorporated|immatricul|RCS|SIRE[NT]|Handelsregister|Sitz|company number|VAT|TVA|\b(SAS|SARL|SA|GmbH|Ltd|Limited|Inc\.?|LLC|B\.V\.|S\.L\.|S\.r\.l\.|AB|ApS|Oy)\b|\b\d{5}\b)/i;
function passages(t: string, max = 2500) {
  const out: string[] = []; let n = 0;
  for (const m of t.matchAll(new RegExp(ADRESSE.source, "gi"))) {
    const i = m.index ?? 0; out.push(t.slice(Math.max(0, i - 200), i + 250)); n += 450;
    if (n > max) break;
  }
  return out.join("\n…\n");
}
export async function paysDe(site: string, homeHtml?: string) {
  const home = homeHtml ?? (await fetchHtml(site).catch(() => "")).slice(0, 400_000);
  if (!home) return null;
  const interdit = await robots(site);
  const legal = lienStrict(home, site, /(mentions-?legales|legal-?notice|legal-?info|imprint|impressum|aviso-?legal|note-?legali|colofon|\/legal\/?$|\/legal\/?\?|company-?info)/i, /^\s*(mentions légales|legal notice|legal|imprint|impressum|aviso legal|note legali|colofon|legal information)\s*$/i);
  const pages = [legal].filter((u) => u && autorise(interdit, u));
  const textes = [textOf(home).slice(-1500)];
  for (const u of pages) textes.push(passages(textOf((await fetchHtml(u).catch(() => "")).slice(0, 400_000))));
  const texte = textes.join("\n---\n").slice(0, 5000);
  if (!ADRESSE.test(texte)) return { pays: null };
  setAi({ feature: "explorer/pays" });
  const r = await askJson<{ pays: string | null; preuve: string | null }>(`Voici le pied de page et les mentions légales du site ${site}. Dans quel pays est le siège de l'entreprise ?
${texte}
Clés : pays (code à 2 lettres, ou null si le texte ne le dit pas clairement : adresse, registre du commerce, forme de société d'un pays précis), preuve (le passage exact du texte, copié mot pour mot, 3 à 15 mots, qui le montre ; null sinon).`, { fast: true, maxTokens: 150 }).catch(() => null);
  const norm = (x: string) => x.replace(/\s+/g, " ").trim().toLowerCase();
  const p = r?.pays && /^[A-Z]{2}$/i.test(r.pays) ? r.pays.toUpperCase() : null;
  if (!p || !r?.preuve || !norm(texte).includes(norm(r.preuve))) return { pays: null };
  return { pays: p, preuve: r.preuve };
}

/** Pays du siège d'après Wikidata (site officiel P856 → pays P17, ou siège P159 → pays), pour une liste de domaines. */
export async function paysWikidata(domaines: string[]) {
  const variantes = domaines.flatMap((d) => [`https://${d}`, `https://${d}/`, `https://www.${d}`, `https://www.${d}/`, `http://${d}/`, `http://www.${d}/`]);
  // Le pays du siège (P159 → P17) prime sur le pays de l'entreprise (P17). Un site lié à plusieurs pays différents est ignoré.
  const q = `SELECT ?site ?code ?src WHERE { VALUES ?site { ${variantes.map((v) => `<${v}>`).join(" ")} } ?item wdt:P856 ?site .
  { ?item wdt:P159 ?lieu . ?lieu wdt:P17 ?pays . BIND("siege" AS ?src) } UNION { ?item wdt:P17 ?pays . BIND("pays" AS ?src) }
  ?pays wdt:P297 ?code . }`;
  // POST : la liste des adresses dépasse la longueur permise dans une adresse GET
  const r = await fetch("https://query.wikidata.org/sparql", { method: "POST", body: new URLSearchParams({ query: q, format: "json" }),
    headers: { "user-agent": "BingooBot/1.0 (+https://kairo.maisonravita.fr/#/retrait; bingoo@maisonravita.fr)", accept: "application/sparql-results+json", "content-type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(30000) })
    .then(async (x) => { if (!x.ok) { console.error("wikidata", x.status, (await x.text()).slice(0, 300)); return null; } return x.json(); }).catch((e) => { console.error("wikidata", String(e)); return null; });
  const parDom = new Map<string, { siege: Set<string>; pays: Set<string> }>();
  for (const b of (r?.results?.bindings ?? []) as { site: { value: string }; code: { value: string }; src: { value: string } }[]) {
    const d = domaineDe(b.site.value); const c = b.code?.value ?? "";
    if (!d || !/^[A-Z]{2}$/.test(c)) continue;
    const x = parDom.get(d) ?? { siege: new Set(), pays: new Set() };
    (b.src?.value === "siege" ? x.siege : x.pays).add(c); parDom.set(d, x);
  }
  const out = new Map<string, string>();
  for (const [d, x] of parDom) { const choix = x.siege.size ? x.siege : x.pays; if (choix.size === 1) out.set(d, [...choix][0]); }
  return out;
}

/** Rattrapage : pays des fiches déjà lues qui n'en ont pas (une tentative par fiche tous les 30 jours). */
export async function saasPays(max = 24) {
  const mois = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data } = await admin.from("saas").select("id, domaine").eq("statut", "ok").is("pays", null).or(`pays_essai.is.null,pays_essai.lt.${mois}`).limit(max);
  const rows = (data ?? []) as { id: string; domaine: string }[];
  let trouves = 0;
  const wd = rows.length ? await paysWikidata(rows.map((x) => x.domaine)) : new Map<string, string>();
  for (let i = 0; i < rows.length; i += 4) {
    await Promise.all(rows.slice(i, i + 4).map(async (x) => {
      const r = wd.has(x.domaine) ? { pays: wd.get(x.domaine)! } : await paysDe(`https://${x.domaine}`).catch(() => null);
      await admin.from("saas").update({ pays_essai: new Date().toISOString(), ...(r?.pays ? { pays: r.pays } : {}) }).eq("id", x.id);
      if (r?.pays) trouves++;
    }));
  }
  return { essayes: rows.length, trouves };
}

// ---------------------------------------------------------------- Publicités (bibliothèque publicitaire officielle de Meta)
// Pubs diffusées dans l'Union européenne sur 12 mois, avec dates exactes de début et de fin et portée UE.
// Il faut le secret META_ADS_TOKEN (jeton d'une app Meta dont l'identité est confirmée). Sans lui, rien ne se passe.
const normN = (x: string) => String(x ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
export async function saasPubs(n = 6) {
  const token = env("META_ADS_TOKEN");
  if (!token) return { meta: false };
  const semaine = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data } = await admin.from("saas").select("id, nom, domaine").eq("statut", "ok").or(`pubs_at.is.null,pubs_at.lt.${semaine}`)
    .order("pubs_at", { ascending: true, nullsFirst: true }).order("score_croissance", { ascending: false }).limit(n);
  const out = { meta: true, lus: 0, pubs: 0, erreur: null as string | null };
  const depuis = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  for (const x of (data ?? []) as { id: string; nom: string; domaine: string }[]) {
    const u = new URL("https://graph.facebook.com/v21.0/ads_archive");
    for (const [k, v] of Object.entries({ access_token: token, search_terms: x.nom, ad_reached_countries: '["FR","DE","ES","IT","NL","BE","IE","SE","PL","AT"]', ad_active_status: "ALL", ad_type: "ALL",
      ad_delivery_date_min: depuis, limit: "100", fields: "id,page_name,ad_delivery_start_time,ad_delivery_stop_time,ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,publisher_platforms,eu_total_reach,languages" })) u.searchParams.set(k, v);
    const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
    const d = await r.json().catch(() => null);
    if (!r.ok) { out.erreur = String(d?.error?.message ?? r.status).slice(0, 200); if (r.status === 400 || r.status === 403 || d?.error?.code === 4 || d?.error?.code === 613) break; continue; }
    // Seulement les pubs publiées par la page du SaaS lui-même (nom de page identique ou qui commence par son nom)
    const nom = normN(x.nom);
    // deno-lint-ignore no-explicit-any
    const pubs = ((d?.data ?? []) as any[]).filter((a) => { const p = normN(a.page_name ?? ""); return p === nom || p.startsWith(nom + " ") || p.replace(/ /g, "") === nom.replace(/ /g, ""); });
    const auj = new Date().toISOString().slice(0, 10);
    const jour = (v?: string) => v && !isNaN(Date.parse(v)) ? new Date(v).toISOString().slice(0, 10) : null;
    const rows = pubs.map((a) => ({ saas_id: x.id, ext_id: String(a.id), page_name: String(a.page_name ?? "").slice(0, 120),
      body: String(a.ad_creative_bodies?.[0] ?? "").slice(0, 1500), titre: String(a.ad_creative_link_titles?.[0] ?? "").slice(0, 200) || null, // Lien public de la bibliothèque (l'adresse « snapshot » de l'API contient le jeton : jamais enregistrée)
      snapshot_url: `https://www.facebook.com/ads/library/?id=${encodeURIComponent(String(a.id))}`,
      plateformes: (a.publisher_platforms ?? []).map(String), started: jour(a.ad_delivery_start_time), stopped: jour(a.ad_delivery_stop_time), reach: Number(a.eu_total_reach) || null,
      langues: (a.languages ?? []).map(String), last_seen: auj }));
    if (rows.length) await admin.from("saas_pubs").upsert(rows, { onConflict: "saas_id,ext_id" });
    await admin.from("saas").update({ pubs_at: new Date().toISOString(), pubs_actives: rows.filter((r) => !r.stopped).length }).eq("id", x.id);
    out.lus++; out.pubs += rows.length;
  }
  return out;
}

// ---------------------------------------------------------------- Clients à démarcher (pour une niche ou un SaaS)
// À partir de ce que vendent les SaaS de la niche et à qui (lu sur leurs sites), les types d'entreprises qui achètent,
// en codes d'activité NAF ; chaque type est compté dans le registre officiel des entreprises (France entière).
// Ces types peuvent devenir des cibles Bingoo! en un clic (Radar et Mission les prospectent ensuite).
const NAF_OK = /^\d{2}\.\d{2}[A-Z]$/;
const TRANCHES_OK = ["00", "01", "02", "03", "11", "12", "21", "22", "31", "32", "41", "42", "51", "52", "53"];
export async function saasClients(o: { domaine?: string | null; categorie?: string | null; tag?: string | null }) {
  const cle = `clients:${o.domaine ?? ""}:${o.categorie ?? ""}:${o.tag ?? ""}`.toLowerCase();
  const { data: c } = await admin.from("explorer_cache").select("v, at").eq("k", cle).maybeSingle();
  if (c && Date.now() - Date.parse(c.at) < 7 * 864e5) return c.v;
  let q = admin.from("saas").select("nom, categorie, description, cible, prix_entree_eur").eq("statut", "ok");
  if (o.domaine) q = q.eq("domaine", o.domaine.toLowerCase());
  else { if (o.categorie) q = q.eq("categorie", o.categorie); if (o.tag) q = q.contains("tags", [o.tag]); }
  const { data } = await q.order("score_croissance", { ascending: false }).limit(12);
  const rows = (data ?? []) as { nom: string; categorie: string; description: string | null; cible: string | null; prix_entree_eur: number | null }[];
  if (!rows.length) return { segments: [] };
  setAi({ feature: "explorer/clients" });
  const r = await askJson<{ segments: { label: string; pourquoi: string; naf: string[]; tranches: string[]; interlocuteur: string; angle: string }[] }>(
    `Voici des logiciels SaaS ${o.domaine ? "" : "d'une même niche "}avec ce qu'ils vendent et à qui (lu sur leurs sites) :
${rows.map((x) => `- ${x.nom} (${x.categorie}${x.prix_entree_eur ? `, dès ${x.prix_entree_eur} €/mois` : ""}) : ${x.description ?? ""} Pour : ${x.cible ?? ""}`).join("\n")}
Quels types d'entreprises françaises achètent ce genre de logiciel ? Donne 3 à 5 segments concrets, du plus évident au plus original, uniquement des entreprises (pas de particuliers).
Pour chacun : label (court, 8 mots au plus, ex. « Agences immobilières de 3 à 20 salariés »), pourquoi (une phrase : leur besoin), naf (1 à 4 codes NAF rév. 2 de CES CLIENTS au format 00.00A, pas celui de l'éditeur), tranches (codes de tranche d'effectif INSEE parmi ${TRANCHES_OK.join(", ")}, cohérents avec le prix), interlocuteur (le poste qui achète, ex. « Gérant », « DAF »), angle (une phrase : l'argument qui le fera répondre).
Clé : segments.`, { fast: true, maxTokens: 1500 }).catch(() => ({ segments: [] }));
  const { countTarget } = await import("./search.ts");
  const segments = [];
  for (const [i, x] of (r.segments ?? []).slice(0, 5).entries()) {
    const naf = (x.naf ?? []).map((n) => String(n).trim().toUpperCase()).filter((n) => NAF_OK.test(n)).slice(0, 4);
    if (!x.label || !naf.length) continue;
    const t = { id: `x${i}`, label: String(x.label).slice(0, 120), pourquoi: String(x.pourquoi ?? "").slice(0, 300), naf, tranches: (x.tranches ?? []).map(String).filter((v) => TRANCHES_OK.includes(v)),
      siege_only: true, interlocuteur: String(x.interlocuteur ?? "").slice(0, 80), angle: String(x.angle ?? "").slice(0, 300) };
    // deno-lint-ignore no-explicit-any
    const total = await countTarget(t as any, []).catch(() => null);
    segments.push({ ...t, total });
  }
  const v = { segments, source: "Registre national des entreprises (recherche-entreprises.api.gouv.fr), France entière, sièges seulement" };
  if (segments.length) await admin.from("explorer_cache").upsert({ k: cle, v, at: new Date().toISOString() });
  return v;
}

// ---------------------------------------------------------------- Bibliothèque d'e-mails (newsletters des SaaS)
// L'adresse explorer-veille@ est inscrite aux newsletters publiques des SaaS (robot de nuit « Explorer – newsletters »).
// Chaque e-mail reçu est rattaché au SaaS par le domaine de l'expéditeur, classé et résumé.
// Confirmation d'inscription (double opt-in) : le lien n'est suivi que s'il mène au domaine du SaaS ou à un service d'envoi connu.
const ESP = /(list-manage\.com|mailchimp\.com|sendinblue\.com|brevo\.com|sibforms\.com|substack\.com|beehiiv\.com|convertkit\.com|kit\.com|mailerlite\.com|hubspot\.com|hs-sites\.com|hsforms\.com|klaviyo\.com|customer\.io|mailjet\.com|activehosted\.com|createsend\.com|getresponse\.com|systeme\.io|plezi\.co|sendgrid\.net|loops\.so|buttondown\.email)/i;
const racine = (h: string) => h.toLowerCase().replace(/^www\./, "").split(".").slice(-2).join(".");
export async function explorerMail(d: Record<string, unknown>, text: string, html: string) {
  const from = String(d.from ?? "");
  const fm = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/);
  const fromEmail = (fm ? fm[2] : from).trim().toLowerCase();
  const fromName = fm ? fm[1].trim() : "";
  const dom = racine(fromEmail.split("@")[1] ?? "");
  // SaaS : domaine de l'expéditeur, sinon nom de l'expéditeur
  const { data: parDom } = await admin.from("saas").select("id, nom, domaine").or(`domaine.eq.${dom},domaine.like.%.${dom}`).limit(1);
  let s = parDom?.[0] as { id: string; nom: string; domaine: string } | undefined;
  if (!s && fromName) { const { data: parNom } = await admin.from("saas").select("id, nom, domaine").eq("statut", "ok").ilike("nom", fromName.split(/\s+(from|de|chez|@|\||-)\s+/i)[0].replace(/[%_\\]/g, "").slice(0, 60)).limit(1); s = parNom?.[0] as typeof s; }
  const body = (text || html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, 20000);
  const sujet = String(d.subject ?? "");
  const estConfirmation = /(confirm|valid|v[ée]rifi|activate|activ|double opt|opt-in|subscribe)/i.test(sujet) && body.length < 4000;
  if (estConfirmation) {
    const liens = [...html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)].map((m) => m[1].replace(/&amp;/g, "&"));
    const lien = liens.find((u) => /(confirm|valid|verif|activ|subscribe|optin|opt-in)/i.test(u) && (() => { try { const h = new URL(u).hostname; return (s && racine(h) === racine(s.domaine)) || ESP.test(h); } catch { return false; } })());
    let suivi = false;
    if (lien) suivi = await fetch(lien, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "user-agent": "BingooBot/1.0 (+https://kairo.maisonravita.fr/#/retrait)" } }).then((r) => r.ok).catch(() => false);
    await admin.from("saas_emails").insert({ saas_id: s?.id ?? null, from_email: fromEmail.slice(0, 200), from_name: fromName.slice(0, 120), subject: sujet.slice(0, 300), kind: "confirmation", resume: suivi ? "Inscription confirmée" : "Lien de confirmation non suivi", body: "" });
    if (s && suivi) await admin.from("saas").update({ newsletter_statut: "inscrit" }).eq("id", s.id);
    return { confirmation: true, suivi, saas: s?.nom ?? null };
  }
  setAi({ feature: "explorer/emails" });
  const v = body.length > 40 ? await askJson<{ type: string; offre: string; resume: string }>(`E-mail marketing reçu de ${fromName || fromEmail}${s ? ` (logiciel ${s.nom})` : ""}. Objet : ${sujet}
Texte : ${body.slice(0, 5000)}
Classe-le et résume-le pour une veille concurrentielle, sans rien inventer.
Clés : type (promotion | lancement | contenu | evenement | temoignage | relance | bienvenue | autre), offre (l'offre ou le prix mis en avant, sinon vide), resume (une phrase en français).`, { fast: true, maxTokens: 250 }).catch(() => null) : null;
  await admin.from("saas_emails").insert({ saas_id: s?.id ?? null, from_email: fromEmail.slice(0, 200), from_name: fromName.slice(0, 120), subject: sujet.slice(0, 300),
    kind: v ? String(v.type ?? "autre").slice(0, 20) : "a_classer", offre: String(v?.offre ?? "").slice(0, 200), resume: String(v?.resume ?? "").slice(0, 300), body });
  if (s) await admin.from("saas").update({ newsletter_statut: "inscrit" }).eq("id", s.id);
  return { ok: true, saas: s?.nom ?? null };
}

/** E-mails reçus quand l'enveloppe IA était épuisée : classés au passage suivant (appelé par la tâche des niches). */
export async function saasEmailsAClasser(max = 10) {
  const { data } = await admin.from("saas_emails").select("id, from_name, from_email, subject, body").eq("kind", "a_classer").limit(max);
  for (const e of (data ?? []) as { id: string; from_name: string; from_email: string; subject: string; body: string }[]) {
    setAi({ feature: "explorer/emails" });
    const v = await askJson<{ type: string; offre: string; resume: string }>(`E-mail marketing reçu de ${e.from_name || e.from_email}. Objet : ${e.subject}
Texte : ${String(e.body ?? "").slice(0, 5000)}
Classe-le et résume-le pour une veille concurrentielle, sans rien inventer.
Clés : type (promotion | lancement | contenu | evenement | temoignage | relance | bienvenue | autre), offre (l'offre ou le prix mis en avant, sinon vide), resume (une phrase en français).`, { fast: true, maxTokens: 250 }).catch(() => null);
    if (!v) break;
    await admin.from("saas_emails").update({ kind: String(v.type ?? "autre").slice(0, 20), offre: String(v.offre ?? "").slice(0, 200), resume: String(v.resume ?? "").slice(0, 300) }).eq("id", e.id);
  }
}

// ---------------------------------------------------------------- « Lancer le mien » : un SaaS inspiré d'un SaaS qui marche
// On ne copie ni le nom, ni les textes, ni le design (droit d'auteur, marques, parasitisme) : on reprend le besoin prouvé
// et on construit une offre différenciée, à partir des données de la base (prix du marché, concurrents, chiffres publics).
// Le plan d'affaires est calculé ici, à partir d'hypothèses affichées, jamais inventé par l'IA.
type Projet = {
  nom: string; pitch: string; cible: string; probleme: string;
  differences: { angle: string; pourquoi: string }[];
  mvp: { fonction: string; pourquoi: string; semaines: number }[]; plus_tard: string[];
  stack: { brique: string; outil: string; cout_mois: number }[];
  formules: { nom: string; prix: number; pour: string; inclus: string[] }[];
  acquisition: { canal: string; comment: string }[];
  risques: { risque: string; parade: string }[];
  hypotheses: { clients_mois_1: number; croissance_mensuelle_pct: number; churn_mensuel_pct: number; conversion_essai_pct: number };
};
export async function saasLancer(wsId: string, domaine: string) {
  const { data: s } = await admin.from("saas").select("id, nom, domaine, categorie, description, cible, pays, prix_entree_eur, gratuit, essai, formules, recrute, postes, tags, methode").eq("domaine", domaine.toLowerCase()).eq("statut", "ok").single();
  if (!s) throw new Error("SaaS introuvable");
  const { data: h } = await admin.from("saas_histoires").select("annee_creation, chiffres, histoire, lecons").eq("saas_id", s.id).eq("statut", "ok").maybeSingle();
  const { data: conc } = await admin.from("saas").select("nom, pays, prix_entree_eur, gratuit, description").eq("statut", "ok").eq("categorie", s.categorie).neq("id", s.id).order("rang_web", { ascending: true, nullsFirst: false }).limit(12);
  const prixMarche = (conc ?? []).map((c) => c.prix_entree_eur).filter((v) => v != null && v > 0).sort((a, b) => a - b);
  const mediane = prixMarche.length ? prixMarche[Math.floor(prixMarche.length / 2)] : null;
  setAi({ ws: wsId, feature: "explorer/lancer", live: true });
  const p = await askJson<Projet>(`Tu aides un entrepreneur français à lancer un SaaS en s'inspirant d'un SaaS qui marche, SANS le copier : ni son nom, ni ses textes, ni son design, ni sa marque.
Le SaaS qui marche : ${s.nom} (${s.domaine}), catégorie ${s.categorie}, pays ${s.pays ?? "inconnu"}.
Ce qu'il fait : ${s.description ?? ""}. Pour : ${s.cible ?? ""}.
Prix d'entrée : ${s.prix_entree_eur != null ? `${s.prix_entree_eur} €/mois` : "non affiché"}${s.gratuit ? ", version gratuite" : ""}${s.essai ? `, essai ${s.essai}` : ""}. Formules : ${JSON.stringify(s.formules ?? []).slice(0, 600)}.
${s.recrute ? `Il recrute (${s.postes ?? "?"} postes).` : ""} Canaux visibles sur son site : ${JSON.stringify(s.methode ?? {}).slice(0, 300)}.
${h ? `Chiffres publics : ${(h.chiffres ?? []).map((c: { texte: string }) => c.texte).join(" ; ").slice(0, 600)}. Ce qui l'a fait grandir : ${(h.lecons ?? []).join(" ; ")}` : ""}
Ses concurrents dans la base : ${(conc ?? []).map((c) => `${c.nom} (${c.pays ?? "?"}, ${c.prix_entree_eur != null ? `${c.prix_entree_eur} €` : "prix ?"}${c.gratuit ? ", gratuit" : ""})`).join(", ")}. Prix d'entrée médian du marché : ${mediane ?? "inconnu"} €/mois.

Propose un SaaS à lancer en France par une petite équipe (1 à 3 personnes), différent et meilleur sur un point précis.
Clés JSON :
nom (un nom ORIGINAL, sans ressemblance avec ${s.nom} ni avec un concurrent), pitch (une phrase), cible (qui exactement, en France), probleme (le besoin prouvé par le succès de ${s.nom}),
differences (3 objets angle + pourquoi : ce qui le rend meilleur ou différent, ex. niche plus précise, prix, simplicité, français, intégrations locales),
mvp (5 à 8 objets fonction + pourquoi + semaines de développement estimées), plus_tard (3 à 5 fonctions pour après),
stack (5 à 8 objets brique + outil + cout_mois en euros, outils réels et courants : hébergement, base de données, paiement, e-mails, analytics, IA si utile),
formules (2 ou 3 objets nom + prix en euros par mois + pour + inclus : 3 à 5 éléments ; cohérents avec le prix médian du marché),
acquisition (4 à 6 objets canal + comment, concrets pour les 6 premiers mois),
risques (3 objets risque + parade),
hypotheses (prudentes : clients_mois_1 nombre de clients payants le premier mois, croissance_mensuelle_pct, churn_mensuel_pct, conversion_essai_pct).`, { maxTokens: 3500 });
  // Plan d'affaires sur 12 mois, calculé à partir des hypothèses (prix moyen = moyenne des formules)
  // Garde-fous : un premier SaaS démarre lentement, quoi que propose l'IA
  const h0 = p.hypotheses ?? {} as Projet["hypotheses"];
  const H = { clients_mois_1: Math.min(5, Math.max(1, Number(h0.clients_mois_1) || 2)), croissance_mensuelle_pct: Math.min(20, Math.max(5, Number(h0.croissance_mensuelle_pct) || 12)),
    churn_mensuel_pct: Math.min(10, Math.max(3, Number(h0.churn_mensuel_pct) || 5)), conversion_essai_pct: Math.min(25, Math.max(5, Number(h0.conversion_essai_pct) || 12)) };
  p.hypotheses = H;
  const prixMoyen = Math.round(((p.formules ?? []).reduce((a, f) => a + Number(f.prix || 0), 0) / Math.max(1, (p.formules ?? []).length)) * 100) / 100;
  const couts = Math.round((p.stack ?? []).reduce((a, x) => a + Number(x.cout_mois || 0), 0));
  const mois = []; let clients = 0, nouveaux = Math.max(1, Number(H.clients_mois_1) || 1), cumul = 0;
  for (let m = 1; m <= 12; m++) {
    clients = Math.max(0, Math.round(clients * (1 - Number(H.churn_mensuel_pct || 0) / 100) + nouveaux));
    const mrr = Math.round(clients * prixMoyen);
    const charges = couts + Math.round(mrr * 0.03); // + frais de paiement ≈ 3 %
    cumul += mrr - charges;
    mois.push({ mois: m, nouveaux: Math.round(nouveaux), clients, mrr, charges, resultat: mrr - charges, cumul });
    nouveaux = nouveaux * (1 + Number(H.croissance_mensuelle_pct || 0) / 100);
  }
  const data = { ...p, inspire: { nom: s.nom, domaine: s.domaine, categorie: s.categorie, prix: s.prix_entree_eur }, marche: { mediane, prix: prixMarche, concurrents: (conc ?? []).length },
    plan: { prix_moyen: prixMoyen, couts_fixes: couts, mois, equilibre: mois.find((x) => x.resultat > 0)?.mois ?? null } };
  const { data: row } = await admin.from("saas_projets").insert({ workspace_id: wsId, saas_id: s.id, data }).select("id").single();
  return { id: row?.id, ...data };
}
