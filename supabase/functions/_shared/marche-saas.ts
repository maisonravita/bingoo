// « Ton marché SaaS » (essai gratuit, sans compte) : à partir de l'adresse d'un SaaS, ses concurrents directs et, pour chacun,
// ce qui se voit publiquement : prix d'entrée, version gratuite ou essai, recrutement, dernière nouveauté publiée, outils du site.
// Tout est lu sur les sites eux-mêmes (adresse de la page gardée) ; l'IA ne fait que trouver les concurrents et lire les prix.
// Rien n'est estimé : une information introuvable est affichée comme telle.
import { HttpError } from "./http.ts";
import { ask, askJson } from "./core.ts";
import { fetchHtml, textOf } from "./analyze.ts";
import { toolsIn } from "./tech-fp.ts";

const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
const MOIS: Record<string, number> = { janvier: 1, january: 1, jan: 1, janv: 1, fevrier: 2, février: 2, february: 2, feb: 2, fev: 2, févr: 2, mars: 3, march: 3, mar: 3, avril: 4, april: 4, apr: 4, avr: 4, mai: 5, may: 5, juin: 6, june: 6, jun: 6, juillet: 7, july: 7, jul: 7, juil: 7, aout: 8, août: 8, august: 8, aug: 8, septembre: 9, september: 9, sep: 9, sept: 9, octobre: 10, october: 10, oct: 10, novembre: 11, november: 11, nov: 11, decembre: 12, décembre: 12, december: 12, dec: 12, déc: 12 };

/** Date la plus récente écrite dans une page (formats ISO, « 12 octobre 2026 », « Oct 12, 2026 »), jamais dans le futur. */
function derniereDate(html: string): string | null {
  const now = Date.now(), dates: number[] = [];
  for (const m of html.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})/g)) dates.push(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const t = textOf(html).toLowerCase();
  for (const m of t.matchAll(/\b(\d{1,2})(?:er)?\s+([a-zéû]{3,9})\.?\s+(20\d{2})\b/g)) { const mo = MOIS[m[2]]; if (mo) dates.push(Date.UTC(+m[3], mo - 1, +m[1])); }
  for (const m of t.matchAll(/\b([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/g)) { const mo = MOIS[m[1]]; if (mo) dates.push(Date.UTC(+m[3], mo - 1, +m[2])); }
  const ok = dates.filter((d) => d <= now + 864e5 && d > now - 3 * 365 * 864e5);
  return ok.length ? new Date(Math.max(...ok)).toISOString().slice(0, 10) : null;
}

/** Liens internes repérés par leur adresse ou leur texte. */
function lien(html: string, base: string, re: RegExp) {
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    const txt = m[2].replace(/<[^>]+>/g, " ").trim();
    if (!re.test(m[1]) && !re.test(txt)) continue;
    try { return new URL(m[1], base).href; } catch { /* lien illisible */ }
  }
  return "";
}

export function lienStrict(html: string, base: string, chemin: RegExp, texte: RegExp) {
  const liens = [...html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)].map((m) => {
    try { const u = new URL(m[1], base); return { u, txt: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }; } catch { return null; }
  }).filter((x): x is { u: URL; txt: string } => !!x && x.u.hostname.replace(/^www\./, "") === new URL(base).hostname.replace(/^www\./, ""));
  return (liens.find((l) => chemin.test(l.u.pathname)) ?? liens.find((l) => texte.test(l.txt)))?.u.href ?? "";
}

const ATS = /(welcometothejungle\.com|jobs\.lever\.co|ashbyhq\.com|greenhouse\.io|teamtailor\.com|workable\.com|recruitee\.com|smartrecruiters\.com|jobs\.personio|join\.com|breezy\.hr|flatchr|taleez)/i;

export type Fiche = {
  nom: string; site: string; host: string; outils: string[];
  prix_url: string; prix_texte: string; recrute: { oui: boolean; postes: number | null; url: string } ;
  nouveaute: { date: string | null; url: string }; lisible: boolean;
};

/** Règles robots.txt du site pour tous les robots (« User-agent: * ») : chemins interdits. Lecture courte, en cas d'échec rien n'est interdit. */
export async function robots(site: string) {
  try {
    const r = await fetch(new URL("/robots.txt", site).href, { signal: AbortSignal.timeout(6000), headers: { "user-agent": "BingooBot/1.0 (+https://kairo.maisonravita.fr/#/retrait)" } });
    if (!r.ok) return [] as string[];
    const lignes = (await r.text()).slice(0, 100_000).split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim());
    const interdit: string[] = []; let pourTous = false, vuRegle = false;
    for (const l of lignes) {
      const m = l.match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
      const k = m[1].toLowerCase(), v = m[2].trim();
      if (k === "user-agent") { if (vuRegle) { pourTous = false; vuRegle = false; } if (v === "*" || /bingoo/i.test(v)) pourTous = true; }
      else { vuRegle = true; if (pourTous && k === "disallow" && v) interdit.push(v); }
    }
    return interdit;
  } catch { return [] as string[]; }
}
// Règle robots.txt → expression : « * » = n'importe quoi, « $ » = fin de l'adresse ; une règle s'applique au début du chemin (+ requête)
const regle = (x: string) => new RegExp("^" + x.replace(/[.+?^${}()|[\]\\]/g, (c) => (c === "$" ? "$" : "\\" + c)).replace(/\*/g, ".*").replace(/\\\$$/, "$"));
export const autorise = (interdit: string[], u: string) => {
  try {
    const x = new URL(u); const chemin = x.pathname + x.search;
    return !interdit.some((r) => { try { return regle(r).test(chemin); } catch { return chemin.startsWith(r.replace(/\*.*$/, "")); } });
  } catch { return false; }
};

export async function lireSite(site: string, nom: string): Promise<Fiche> {
  const interdit = await robots(site);
  const html = autorise(interdit, site) ? (await fetchHtml(site).catch(() => "")).slice(0, 400_000) : ""; // au-delà de 400 Ko, le calcul dépasse les limites de la fonction
  const base = site;
  const f: Fiche = { nom, site, host: hostOf(site), outils: toolsIn(html).slice(0, 10), prix_url: "", prix_texte: "", recrute: { oui: false, postes: null, url: "" }, nouveaute: { date: null, url: "" }, lisible: !!html };
  if (!html) return f;
  // Page des tarifs : d'abord une adresse qui se termine par pricing / tarifs / prix / plans, sinon un lien dont le texte est exactement « Tarifs »
  const prix = lienStrict(html, base, /\/(pricing|tarifs?|prix|plans|nos-offres|offres|abonnements?)\/?(\?|$)/i, /^\s*(tarifs?|prix|pricing|plans|tarification|nos offres|offres)\s*$/i);
  const jobs = lien(html, base, /(careers?|jobs?|recrut|carri[eè]res?|join-?us|nous-rejoindre|rejoignez|hiring)/i) || (html.match(ATS) ? (html.match(new RegExp(`https?://[^"'\\s]*${ATS.source}[^"'\\s]*`, "i"))?.[0] ?? "") : "");
  const news = lien(html, base, /(changelog|release|nouveaut|what'?s-?new|updates?|product-?news|blog|actualit)/i);
  const coupe = (h: string) => h.slice(0, 400_000);
  const ok = (u: string) => u && (!u.startsWith(site.replace(/\/$/, "")) || autorise(interdit, u)); // une page d'un autre site (offres d'emploi) n'est pas concernée
  const [hp, hj, hn] = (await Promise.all([ok(prix) ? fetchHtml(prix).catch(() => "") : "", ok(jobs) ? fetchHtml(jobs).catch(() => "") : "", ok(news) ? fetchHtml(news).catch(() => "") : ""])).map(coupe);
  f.prix_url = hp ? prix : "";
  f.prix_texte = textOf(hp || html).slice(0, 3500);
  if (jobs) {
    // Postes ouverts : liens vers un outil de recrutement ou vers des offres de la page carrières
    const offres = new Set([...(hj || "").matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]).filter((u) => ATS.test(u) || /\/(jobs?|careers?|offres?|postes?|positions?)\/[^/?#]{6,}/i.test(u)));
    const ferme = /(no (open )?positions|aucun(e)? (poste|offre)|pas de poste|no openings)/i.test(textOf(hj || "").slice(0, 20000));
    f.recrute = { oui: !ferme && (offres.size > 0 || ATS.test(hj || "")), postes: offres.size || null, url: jobs };
  }
  if (hn) f.nouveaute = { date: derniereDate(hn), url: news };
  return f;
}

/** Concurrents directs d'un SaaS : recherche web en texte libre, puis extraction (le JSON direct après une recherche revenait vide). */
export async function concurrentsDe(host: string, moi: { nom: string; categorie: string; offre: string; cible: string }) {
  const etude = await ask(`Trouve les 6 concurrents les plus directs de ${moi.nom} (${host}) : ${moi.categorie}. ${moi.offre} Cible : ${moi.cible}
Des logiciels réels qui vendent la même chose à la même cible (en priorité ceux présents en France ou en Europe), avec leur site officiel. 3 recherches au plus.
Réponds en texte : une ligne par concurrent, « nom — adresse du site officiel ».`, { maxTokens: 1500, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }] }).catch(() => "");
  const ext = etude ? await askJson<{ concurrents: { nom: string; site: string }[] }>(`Extrais la liste des concurrents de ce texte, sans en ajouter.
${etude.slice(0, 5000)}
Clé : concurrents, liste d'objets nom et site (adresse https du site officiel).`, { fast: true, maxTokens: 600 }).catch(() => ({ concurrents: [] })) : { concurrents: [] };
  const vus = new Set([host]);
  const concurrents = (ext.concurrents ?? []).filter((c) => /^https?:\/\//.test(c.site ?? "")).filter((c) => { const h = hostOf(c.site); if (!h || vus.has(h)) return false; vus.add(h); return true; }).slice(0, 6);
  return concurrents;
}

export async function marcheSaas(input: { url?: string }) {
  let url = String(input.url ?? "").trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const host = hostOf(url);
  if (!/\.[a-z]{2,}$/i.test(host)) throw new HttpError(400, "Adresse du site invalide (ex. monsaas.com)");
  const home = await fetchHtml(`https://${host}`).catch(() => "");
  if (!home) throw new HttpError(422, "Impossible de lire ce site (protégé ou indisponible). Essaie avec une autre adresse.");

  // 1. Ce que fait le SaaS (lu sur sa page d'accueil)
  const moi = await askJson<{ nom: string; categorie: string; offre: string; cible: string; saas: boolean }>(`Voici la page d'accueil de ${host}. Dis ce que vend ce site, sans rien inventer.
Contenu :
${textOf(home).slice(0, 6000)}
Clés : nom, categorie (la catégorie de logiciel en 3 à 6 mots, ex. « logiciel de facturation pour indépendants »), offre (une phrase), cible (une phrase), saas (true si c'est un logiciel vendu en ligne).`, { fast: true, maxTokens: 400 });
  if (moi.saas === false) throw new HttpError(422, "Ce site ne ressemble pas à un logiciel en ligne. Ce rapport est fait pour les SaaS : essaie avec l'adresse de ton logiciel.");

  // 2. Concurrents directs
  const concurrents = await concurrentsDe(host, moi);
  // Les concurrents trouvés entrent dans la base Explorer (lus la nuit suivante)
  import("./saas-base.ts").then(({ saasAdd }) => saasAdd([`https://${host}`, ...concurrents.map((c) => c.site)], "rapport-marche")).catch(() => {});
  if (!concurrents.length) throw new HttpError(422, "Aucun concurrent fiable trouvé pour ce logiciel. Réessaie, ou crée ton compte pour les ajouter toi-même.");

  // 3. Lecture des sites (en parallèle), puis lecture des prix en une seule fois
  const fiches = await Promise.all([lireSite(`https://${host}`, moi.nom), ...concurrents.map((c) => lireSite(c.site, c.nom))]);
  const prix = await askJson<{ sites: { i: number; gratuit: boolean; essai: string | null; prix_entree: number | null; devise: string | null; periode: string | null; sur_devis: boolean; formules: { nom: string; prix: string }[] }[] }>(`Pour chaque site ci-dessous, lis les prix affichés (sans rien inventer : null si absent).
${fiches.map((f, i) => `### ${i} — ${f.nom} (${f.host})\n${f.prix_texte.slice(0, 2500)}`).join("\n\n")}
Clé : sites, liste d'objets avec i (le numéro), gratuit (true si une formule gratuite existe), essai (durée de l'essai gratuit, ex. « 14 jours », sinon null), prix_entree (prix mensuel le plus bas d'une formule payante, nombre), devise (€ ou $), periode (« mois » ou « an » selon l'affichage), sur_devis (true si les prix ne sont que sur devis), formules (au plus 4, nom et prix tel qu'affiché).`, { fast: true, maxTokens: 2500 }).catch(() => ({ sites: [] }));
  const P = new Map((prix.sites ?? []).map((s) => [Number(s.i), s]));

  const lignes = fiches.map((f, i) => {
    const p = P.get(i);
    return {
      moi: i === 0, nom: f.nom, site: `https://${f.host}`, lisible: f.lisible,
      prix_entree: p?.prix_entree && p.prix_entree > 0 ? Math.round(p.prix_entree) : null, devise: p?.devise ?? null, periode: p?.periode ?? null,
      gratuit: !!p?.gratuit, essai: p?.essai ?? null, sur_devis: !!p?.sur_devis, formules: (p?.formules ?? []).slice(0, 4), prix_url: f.prix_url,
      recrute: f.recrute, nouveaute: f.nouveaute, outils: f.outils,
    };
  });

  // 4. Position (calculée, pas devinée)
  const autres = lignes.filter((l) => !l.moi);
  // Prix ramenés en euros pour comparer (dollar converti à 0,92 €, affiché « environ ») ; un prix annuel est ramené au mois
  const enEuros = (l: typeof lignes[number]) => l.prix_entree == null ? null : Math.round(l.prix_entree * (l.devise === "$" ? 0.92 : 1) / (l.periode === "an" ? 12 : 1));
  const converti = lignes.some((l) => l.prix_entree != null && (l.devise === "$" || l.periode === "an"));
  const prixAutres = autres.map(enEuros).filter((x): x is number => x != null).sort((a, b) => a - b);
  const median = prixAutres.length ? prixAutres[Math.floor((prixAutres.length - 1) / 2)] : null;
  const il30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const synthese = {
    concurrents: autres.length, prix_median: median, ton_prix: enEuros(lignes[0]), environ: converti, prix_lus: prixAutres.length,
    gratuits: autres.filter((l) => l.gratuit).length, recrutent: autres.filter((l) => l.recrute.oui).length,
    actifs_30j: autres.filter((l) => l.nouveaute.date && l.nouveaute.date >= il30).length,
  };
  return { moi: { nom: moi.nom, categorie: moi.categorie, offre: moi.offre, site: `https://${host}` }, lignes, synthese, date: new Date().toISOString().slice(0, 10) };
}
