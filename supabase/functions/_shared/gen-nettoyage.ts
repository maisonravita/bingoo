// Moteur de pages : les fonctions pures (sans réseau ni IA), testées à part : nettoyage du HTML écrit par l'IA,
// contrôles d'honnêteté et de structure d'une section, remplacement d'un texte au clic dans l'atelier.
import { lintFr } from "../../../src/lib/controlesDesign.js";

// ---------------------------------------------------------------- Nettoyage (le cadre public est isolé, mais une page
// écrite par l'IA ne doit contenir aucun code, aucun formulaire hors marqueurs et aucune ressource extérieure)
const BALISES_INTERDITES = /<\/?(script|iframe|object|embed|form|input|select|textarea|link|meta|base|frame|frameset|applet|portal|noscript)\b[^>]*>/gi;
export function nettoyer(html: string, imagesOk: Set<string>): string {
  let h = String(html ?? "");
  h = h.replace(/<script[\s\S]*?<\/script\s*>/gi, "").replace(/<noscript[\s\S]*?<\/noscript\s*>/gi, "");
  h = h.replace(BALISES_INTERDITES, "");
  h = h.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  h = h.replace(/(href|src|xlink:href|action|formaction|srcset)\s*=\s*("|')\s*(javascript|vbscript|data:text)[^"']*\2/gi, '$1="#"');
  // Feuilles de style : pas d'import ni de ressource extérieure ni d'expression
  h = h.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_m, css) => `<style>${String(css).replace(/@import[^;]*;?/gi, "").replace(/url\(\s*(['"]?)(?!data:image\/)[^)]*\)/gi, "none").replace(/expression\s*\(/gi, "(").replace(/position\s*:\s*fixed/gi, "position:absolute")}</style>`);
  h = h.replace(/style\s*=\s*("|')([^"']*)\1/gi, (_m, q, css) => `style=${q}${String(css).replace(/url\([^)]*\)/gi, "none").replace(/expression\s*\(/gi, "(")}${q}`);
  // Images : seulement les jetons fournis (remplacés à l'affichage) ; une autre source est retirée
  h = h.replace(/<img\b[^>]*>/gi, (tag) => { const s = tag.match(/\ssrc\s*=\s*("|')([^"']*)\1/i)?.[2] ?? ""; return imagesOk.has(s) ? tag : ""; });
  // Liens extérieurs : seulement l'itinéraire OpenStreetMap, le téléphone et l'e-mail
  h = h.replace(/href\s*=\s*("|')(https?:\/\/[^"']*)\1/gi, (m, q, u) => /^https:\/\/(www\.)?openstreetmap\.org\//.test(u) ? m : `href=${q}#${q}`);
  return h.trim();
}

// ---------------------------------------------------------------- Contrôles d'une section (avant le robot du navigateur)
const INVENTE = /(\d[\d\s.,]*\s*(clients?|avis|abonnés|utilisateurs|salons|familles|restaurants|commandes)\b|★|⭐|\b\d[,.]\d\s*\/\s*5\b|satisfaits?|recommandé par|élu |prix du |récompens|témoignage|ils nous font confiance|depuis (19|20)\d\d|\d+\s*ans d.expérience)/i;
export function controlerSection(id: string, html: string, brief: string): string[] {
  const pbs: string[] = [];
  const texte = html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  if (!texte) pbs.push("La section est vide.");
  const invente = texte.match(INVENTE)?.[0];
  if (invente && !brief.toLowerCase().includes(invente.toLowerCase().trim())) pbs.push(`Information inventée interdite : « ${invente.trim()} » (ni avis, ni chiffres, ni récompenses qui ne sont pas dans le brief).`);
  for (const m of texte.matchAll(/(\d+(?:[,.]\d+)?)\s*€/g)) if (!brief.replace(/\s/g, "").includes(m[1].replace(/\s/g, ""))) pbs.push(`Prix « ${m[0]} » absent du brief : utilise le marqueur data-bingoo="services" ou retire-le.`);
  const lint = lintFr(texte, true);
  if (lint.length) pbs.push(...lint.slice(0, 4).map((x) => `Texte : ${x.regle} (« ${x.extrait} »)`));
  if (id !== "nav" && id !== "hero" && !/<h2\b/i.test(html) && !/<footer\b/i.test(html)) pbs.push("Il manque le h2 de la section.");
  if (id !== "hero" && /<h1\b/i.test(html)) pbs.push("Un seul h1 sur la page : il est dans le premier écran.");
  if (/(<button\b(?![^>]*nav__toggle))/i.test(html)) pbs.push("Pas de <button> : un lien .btn vers une ancre.");
  // Textes du modèle recopiés tels quels (« (titre) », « Mot », « Initiale ») : la page se verrait inachevée
  const modele = texte.match(/\(\s*(?:\d+ à \d+ |une? |le |la |les |ce qu'|des? )?(titre|mot|mots|rubrique|libell[ée]|valeur|initiale|[ée]l[ée]ment r[ée]el|fait r[ée]el|phrase|promesse|bouton|m[ée]tier|lien court|deux phrases)\b[^()]{0,60}\)/i)?.[0]
    ?? html.match(/>\s*(Mot|Mots|Initiale|Titre|Rubrique|Libellé|Lorem ipsum)\s*</)?.[1];
  if (modele) pbs.push(`Texte du modèle recopié : « ${modele} ». Remplace-le par un vrai texte du métier.`);
  // Zone ou portée inventée (« partout en France ») : seulement si le brief le dit
  const zone = texte.match(/(partout en France|toute la France|France enti[èe]re|dans toute la r[ée]gion|toute l'Europe|dans le monde entier|\d+\s*km (autour|à la ronde))/i)?.[0];
  if (zone && !brief.toLowerCase().includes(zone.toLowerCase())) pbs.push(`Zone inventée : « ${zone} » n'est pas dans le brief. Retire-la.`);
  // Horaires ou adresse écrits à la main à côté du marqueur qui les affiche déjà : la même information deux fois
  if (/data-bingoo="horaires"/.test(html) && /(lundi|mardi|mercredi|jeudi|vendredi|samedi)[^.]{0,40}\d{1,2}\s*h/i.test(texte)) pbs.push("Les horaires sont déjà affichés par le marqueur horaires : ne les réécris pas (ni en liste, ni en phrase).");
  if (/data-bingoo="(adresse|horaires)"/.test(html) && /\b\d{5}\b/.test(texte)) pbs.push("L'adresse est déjà affichée par le marqueur : ne la réécris pas (ni en liste, ni en phrase).");
  // Section maigre (un titre et une ligne) : sans données ni image, elle doit porter au moins deux phrases ou une liste
  const mots = texte.split(" ").filter((m) => /[A-Za-zÀ-ÿ]{2,}/.test(m)).length;
  if (!/^(nav|hero)$/.test(id) && !/<footer\b/i.test(html) && !/data-bingoo=|<img\b|<form\b|<iframe\b/i.test(html) && mots < 22) pbs.push(`Section trop maigre (${mots} mots) : développe-la avec des faits du brief (deux phrases au moins, ou une liste de 3 éléments réels), ou fusionne-la avec une autre.`);
  return pbs;
}

/** Texte au clic : remplace un texte visible dans le HTML des sections (sans IA). Rend le nombre de remplacements. */
export function remplacerTextePage(page: { sections: { id: string; html: string }[] }, avant: string, apres: string): number {
  const ent = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const variantes = [avant, ent(avant), ent(avant).replace(/ /g, "&nbsp;"), avant.replace(/ /g, "&nbsp;")];
  let n = 0;
  for (const s of page.sections ?? []) {
    for (const v of variantes) {
      if (!v || !s.html.includes(v)) continue;
      // Seulement dans le texte, jamais dans une balise ou un attribut
      s.html = s.html.replace(/(>[^<]*)/g, (seg) => seg.includes(v) ? (n++, seg.split(v).join(ent(apres))) : seg);
      if (n) break;
    }
    if (n) break;
  }
  return n;
}


/** Prestations recopiées à la main alors que le marqueur services les affiche déjà ailleurs (ou dans la même section) */
export function doublonsServices(html: string, titres: string[], marqueurAilleurs: boolean): string[] {
  const t = html.replace(/<div[^>]*data-bingoo="services"[^>]*>[\s\S]*?<\/div>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").toLowerCase();
  const ici = /data-bingoo="services"/.test(html);
  if (!ici && !marqueurAilleurs) return [];
  const vus = titres.map((x) => String(x ?? "").trim().toLowerCase()).filter((x) => x.length > 4 && t.includes(x));
  return vus.length >= 2 ? [`Les prestations (${vus.slice(0, 3).join(", ")}) sont déjà affichées par le marqueur services : ne les réécris pas à la main, parle d'autre chose ou retire la liste.`] : [];
}

// ---------------------------------------------------------------- Deux sections sur le même sujet
const MOTS_VIDES = new Set(["votre", "vos", "notre", "nos", "avec", "pour", "dans", "sans", "chez", "tout", "tous", "toutes", "comment", "pourquoi", "avant", "apres", "entre", "chaque", "cette", "votre", "questions", "question", "contact", "parlons", "projet", "demande", "demandez", "prenons", "rendez", "ecrivez", "appelez"]);
const racine = (m: string) => m.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/(aux|eaux|s|x)$/, "");
/** Mots forts d'un titre h2 (6 lettres ou plus, hors mots vides et hors nom, ville et métier du membre) */
export function motsDuTitre(html: string, exclus: string): Set<string> {
  const h2 = (html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? "").replace(/<[^>]+>/g, " ");
  const ex = new Set((exclus.match(/[A-Za-zÀ-ÿ]{5,}/g) ?? []).map(racine));
  return new Set((h2.match(/[A-Za-zÀ-ÿ'’]{5,}/g) ?? []).map((m) => racine(m.replace(/^[a-z]['’]/i, ""))).filter((m) => m.length >= 5 && !MOTS_VIDES.has(m) && !ex.has(m)));
}
/** Le titre de cette section reprend le sujet d'une section précédente */
export function sujetDejaTraite(id: string, html: string, precedentes: { id: string; html: string }[], exclus: string): string[] {
  if (/<footer\b/i.test(html) || /faq|question/.test(id)) return [];
  const ici = motsDuTitre(html, exclus);
  const h2 = titreDe(html), corps = motsDuCorps(html);
  for (const p of precedentes) {
    if (/<footer\b/i.test(p.html) || /nav/.test(p.id)) continue;
    // Une même formule dans deux titres (« devis gratuit sous 48 h » en bandeau puis en contact) : répétition
    const formule = quatreMots(h2).find((q) => quatreMots(titreDe(p.html, true)).includes(q));
    if (formule) return [`Ce titre répète une formule déjà utilisée en haut de la page (section « ${p.id} » : « ${formule} ») : dis autre chose, ou une autre information du brief.`];
    if (/faq|question|hero/.test(p.id)) continue;
    const commun = [...motsDuTitre(p.html, exclus)].find((m) => ici.has(m));
    if (commun) return [`Cette section reprend le sujet de la section « ${p.id} » (« ${commun} ») : traite un autre aspect du brief, avec un titre différent.`];
    // Même début de titre (« Un salon mixte, rue… » puis « Un salon mixte, au… ») ou même contenu : la même section deux fois
    const debut = (t: string) => t.split(" ").filter((m) => m.length > 2).slice(0, 2).join(" ");
    const autre = titreDe(p.html);
    if (h2 && autre && debut(h2).split(" ").length === 2 && debut(h2) === debut(autre)) return [`Ce titre commence comme celui de la section « ${p.id} » (« ${debut(h2)} ») : c'est le même sujet. Traite un autre aspect du brief, avec un autre titre.`];
    const pc = motsDuCorps(p.html), communs = [...corps].filter((m) => pc.has(m)).length;
    if (corps.size >= 12 && pc.size >= 12 && communs / Math.min(corps.size, pc.size) >= 0.55) return [`Cette section dit presque la même chose que la section « ${p.id} » : traite un autre aspect du brief.`];
  }
  return [];
}
const sansAccent = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Le titre h2 (ou, avec h1, celui du premier écran et ses phrases), en mots simples */
function titreDe(html: string, avecHero = false): string {
  const bouts = [...html.matchAll(avecHero ? /<(h1|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/gi : /<(h2)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => m[2]).join(" ");
  return sansAccent(bouts.replace(/<[^>]+>/g, " ")).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
const quatreMots = (t: string) => { const m = t.split(" ").filter(Boolean); const out: string[] = []; for (let i = 0; i + 4 <= m.length; i++) out.push(m.slice(i, i + 4).join(" ")); return out; };
/** Les mots porteurs du texte d'une section (5 lettres ou plus) */
function motsDuCorps(html: string): Set<string> {
  const t = sansAccent(html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
  return new Set((t.match(/[a-z]{5,}/g) ?? []).filter((m) => !MOTS_VIDES.has(m)).map((m) => m.replace(/(aux|s|x)$/, "")));
}
