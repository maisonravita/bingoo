// Explorer : la base de SaaS de Bingoo!. Chaque logiciel est relu régulièrement sur son propre site (accueil, tarifs,
// page carrières, changelog ou blog) ; chaque relevé est gardé pour l'historique (prix, recrutement, nouveautés).
// L'IA sert seulement à classer le logiciel et à lire les prix affichés ; tout le reste est lu tel quel, avec l'adresse de la page.
import { admin, ask, askJson, setAi, type Workspace } from "./core.ts";
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
  const site = "https://kairo.maisonravita.fr";
  let envoyes = 0;
  for (const [wsId, f] of parWs) {
    const mes = ((evs ?? []) as { at: string; type: string; avant: string | null; apres: string | null; saas: { id: string; domaine: string; nom: string; categorie: string; statut: string } | null }[])
      .filter((e) => e.saas && e.saas.statut === "ok" && (f.saas.has(e.saas.id) || f.cats.has(e.saas.categorie))).slice(0, 40);
    const neufs = ((nouveaux ?? []) as { domaine: string; nom: string; categorie: string; description: string; prix_entree_eur: number | null }[]).filter((s) => f.cats.has(s.categorie)).slice(0, 15);
    if (!mes.length && !neufs.length) continue;
    const { data: w } = await admin.from("workspaces").select("*").eq("id", wsId).single();
    if (!w) continue;
    const to = await teamAddress(w as Workspace);
    if (!to) continue;
    const ligne = (e: typeof mes[number]) => `${e.saas!.nom} : ${EV_TXT[e.type] ?? e.type}${e.type !== "nouveaute" && e.avant && e.apres ? ` (${e.avant} → ${e.apres})` : ""}`;
    const text = [`Ton marché cette semaine`, "", ...(mes.length ? ["Ce qui a bougé :", ...mes.map((e) => `- ${ligne(e)}`), ""] : []),
      ...(neufs.length ? ["Nouveaux SaaS dans tes catégories :", ...neufs.map((s) => `- ${s.nom} (${s.categorie})${s.prix_entree_eur != null ? `, dès ${s.prix_entree_eur} €/mois` : ""}`), ""] : []),
      `Tout voir : ${site}/#/explorer/suivis`].join("\n");
    const html = `<div style="font-family:Arial,sans-serif;color:#15161A;max-width:560px"><h2 style="margin:0 0 4px">Ton marché cette semaine</h2><p style="color:#5B5D66;margin:0 0 16px">${mes.length} changement${mes.length > 1 ? "s" : ""} chez les SaaS que tu suis${neufs.length ? `, ${neufs.length} nouveau${neufs.length > 1 ? "x" : ""} SaaS dans tes catégories` : ""}.</p>
${mes.length ? `<h3 style="margin:16px 0 6px">Ce qui a bougé</h3><ul style="padding-left:18px">${mes.map((e) => `<li style="margin:4px 0"><a href="${site}/#/explorer/${escH(e.saas!.domaine)}" style="color:#15161A;font-weight:bold">${escH(e.saas!.nom)}</a> : ${escH(EV_TXT[e.type] ?? e.type)}${e.type !== "nouveaute" && e.avant && e.apres ? ` (${escH(e.avant)} → ${escH(e.apres)})` : ""}</li>`).join("")}</ul>` : ""}
${neufs.length ? `<h3 style="margin:16px 0 6px">Nouveaux SaaS dans tes catégories</h3><ul style="padding-left:18px">${neufs.map((s) => `<li style="margin:4px 0"><a href="${site}/#/explorer/${escH(s.domaine)}" style="color:#15161A;font-weight:bold">${escH(s.nom)}</a> · ${escH(s.categorie)}${s.prix_entree_eur != null ? ` · dès ${s.prix_entree_eur} €/mois` : ""}</li>`).join("")}</ul>` : ""}
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

/** Rattrapage : pays des fiches déjà lues qui n'en ont pas (une tentative par fiche tous les 30 jours). */
export async function saasPays(max = 24) {
  const mois = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data } = await admin.from("saas").select("id, domaine").eq("statut", "ok").is("pays", null).or(`pays_essai.is.null,pays_essai.lt.${mois}`).limit(max);
  const rows = (data ?? []) as { id: string; domaine: string }[];
  let trouves = 0;
  for (let i = 0; i < rows.length; i += 4) {
    await Promise.all(rows.slice(i, i + 4).map(async (x) => {
      const r = await paysDe(`https://${x.domaine}`).catch(() => null);
      await admin.from("saas").update({ pays_essai: new Date().toISOString(), ...(r?.pays ? { pays: r.pays } : {}) }).eq("id", x.id);
      if (r?.pays) trouves++;
    }));
  }
  return { essayes: rows.length, trouves };
}
