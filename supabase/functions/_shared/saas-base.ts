// Explorer : la base de SaaS de Bingoo!. Chaque logiciel est relu régulièrement sur son propre site (accueil, tarifs,
// page carrières, changelog ou blog) ; chaque relevé est gardé pour l'historique (prix, recrutement, nouveautés).
// L'IA sert seulement à classer le logiciel et à lire les prix affichés ; tout le reste est lu tel quel, avec l'adresse de la page.
import { admin, askJson, setAi } from "./core.ts";
import { fetchHtml, textOf } from "./analyze.ts";
import { lireSite } from "./marche-saas.ts";

export const CATEGORIES = [
  "CRM et ventes", "Prospection et emailing", "Marketing et SEO", "Réseaux sociaux et contenu", "Facturation et comptabilité",
  "Paie et RH", "Recrutement", "Gestion de projet", "Collaboration et documents", "Support client", "E-commerce",
  "Paiement et finance", "Juridique", "Immobilier", "Santé", "Éducation et formation", "Commerce et restauration",
  "Logistique et transport", "Développeurs et no-code", "Données et analytics", "Sécurité et conformité",
  "IA et automatisation", "Événements", "BTP et artisans", "Agences et freelances", "Autre",
];
const TLD_PAYS: Record<string, string> = { fr: "FR", de: "DE", es: "ES", it: "IT", be: "BE", nl: "NL", ch: "CH", uk: "GB", io: "", com: "", co: "", ai: "", app: "", pt: "PT", ca: "CA", se: "SE", dk: "DK", pl: "PL", at: "AT", ie: "IE" };

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
  const home = await fetchHtml(site).catch(() => "");
  const accueil = textOf(home).slice(0, 3000);
  setAi({ feature: "explorer/lecture" });
  const a = await askJson<{ est_saas: boolean; nom: string; categorie: string; description: string; cible: string; pays: string | null; langue: string | null;
    gratuit: boolean; essai: string | null; prix_entree: number | null; devise: string | null; periode: string | null; sur_devis: boolean; formules: { nom: string; prix: string }[] }>(
    `Voici le site ${s.domaine}. Classe ce logiciel et lis ses prix, sans rien inventer (null si absent).
ACCUEIL :
${accueil}
TARIFS :
${f.prix_texte.slice(0, 3000)}
Clés : est_saas (true si c'est un logiciel vendu en ligne, par abonnement ou à l'usage ; false pour une agence, un média, un site vitrine), nom, categorie (exactement une de : ${CATEGORIES.join(" | ")}),
description (une phrase en français : ce qu'il fait), cible (une phrase en français : pour qui), pays (code à 2 lettres du pays du siège s'il est écrit ou évident : adresse, mentions légales, devise ; sinon null), langue (code de la langue du site),
gratuit (formule gratuite), essai (durée de l'essai gratuit ou null), prix_entree (prix mensuel le plus bas d'une formule payante, nombre), devise (€ $ £), periode (mois ou an), sur_devis, formules (au plus 4 : nom et prix tel qu'affiché).`,
    { fast: true, maxTokens: 900 }).catch(() => null);
  if (!a) { await admin.from("saas").update({ essais: (s.essais ?? 0) + 1, lu_at: new Date().toISOString() }).eq("id", id); return { id, statut: "erreur" }; }
  if (a.est_saas === false) { await admin.from("saas").update({ statut: "pas_saas", nom: a.nom || s.nom, lu_at: new Date().toISOString() }).eq("id", id); return { id, statut: "pas_saas" }; }
  const tld = s.domaine.split(".").pop() ?? "";
  const pays = (a.pays && /^[A-Z]{2}$/.test(a.pays.toUpperCase()) ? a.pays.toUpperCase() : null) ?? (TLD_PAYS[tld] || null);
  const taux = a.devise === "$" ? 0.92 : a.devise === "£" ? 1.16 : 1;
  const prix = a.prix_entree && a.prix_entree > 0 ? Math.round(a.prix_entree * taux / (a.periode === "an" ? 12 : 1)) : null;
  const il30 = Date.now() - 30 * 864e5;
  const actif = f.nouveaute.date ? Date.parse(f.nouveaute.date) >= il30 : false;
  // Score de croissance (0 à 100), à partir de faits relevés : postes ouverts, nouveauté récente, hausse de postes depuis le relevé précédent
  const { data: prev } = await admin.from("saas_releves").select("postes").eq("saas_id", id).order("at", { ascending: false }).limit(1);
  const hausse = prev?.[0]?.postes != null && f.recrute.postes != null ? f.recrute.postes - prev[0].postes : 0;
  const score = Math.max(0, Math.min(100, Math.round((f.recrute.oui ? 25 : 0) + Math.min(35, (f.recrute.postes ?? 0) * 2.5) + (actif ? 25 : 0) + Math.max(0, Math.min(15, hausse * 3)))));
  const champs = {
    nom: (a.nom || s.domaine).slice(0, 80), categorie: CATEGORIES.includes(a.categorie) ? a.categorie : "Autre",
    description: (a.description ?? "").slice(0, 300), cible: (a.cible ?? "").slice(0, 200), pays, langue: (a.langue ?? "").slice(0, 5) || null, est_saas: true,
    prix_entree_eur: prix, devise: a.devise ?? null, prix_affiche: a.prix_entree ? `${a.prix_entree} ${a.devise ?? ""}/${a.periode === "an" ? "an" : "mois"}` : null,
    gratuit: !!a.gratuit, essai: a.essai ?? null, sur_devis: !!a.sur_devis, formules: (a.formules ?? []).slice(0, 4),
    recrute: f.recrute.oui, postes: f.recrute.postes, nouveaute: f.nouveaute.date, outils: f.outils,
    liens: { prix: f.prix_url || null, carrieres: f.recrute.url || null, nouveautes: f.nouveaute.url || null },
    methode: methode(home, site), score_croissance: score, statut: "ok", essais: 0, lu_at: new Date().toISOString(),
  };
  await admin.from("saas").update(champs).eq("id", id);
  await admin.from("saas_releves").insert({ saas_id: id, prix_entree_eur: prix, formules: champs.formules, gratuit: champs.gratuit, essai: champs.essai, recrute: champs.recrute, postes: champs.postes, nouveaute: champs.nouveaute, outils: champs.outils });
  return { id, statut: "ok", nom: champs.nom };
}

/** Relevés de nuit : les SaaS jamais lus d'abord, puis ceux relus il y a plus de 7 jours. Budget de temps de l'appel respecté. */
export async function saasCron(maxMs = 110_000) {
  const t0 = Date.now();
  const semaine = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data } = await admin.from("saas").select("id").or(`statut.eq.a_lire,and(statut.eq.ok,lu_at.lt.${semaine})`).lt("essais", 3).order("lu_at", { ascending: true, nullsFirst: true }).limit(36);
  const ids = (data ?? []).map((x) => x.id);
  const out = { lus: 0, ok: 0, illisibles: 0, pas_saas: 0 };
  for (let i = 0; i < ids.length; i += 6) {
    if (Date.now() - t0 > maxMs - 35_000) break;
    const r = await Promise.all(ids.slice(i, i + 6).map((id) => saasLire(id).catch(() => null)));
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
