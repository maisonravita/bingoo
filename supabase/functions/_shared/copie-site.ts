// « Un site qui te plaît » : Bingoo! lit la page d'accueil d'un site, sans IA, point par point
// (nom, type, couleurs, polices, rubriques, boutons) pour construire TA version : ton nom, ton logo, tes textes,
// l'ambiance de ce site (palette et polices, qui ne se protègent pas). Jamais leurs textes, leurs images ni leur logo.
import { safeFetchText } from "./safefetch.ts";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const ENTETES = { "user-agent": UA, accept: "text/html,text/css,*/*;q=0.8", "accept-language": "fr-FR,fr;q=0.9,en;q=0.8" };

const net = (s: string) => s.replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const meta = (h: string, cle: string) => {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${cle}["'][^>]*>`, "i");
  const m = h.match(re)?.[0];
  return m ? net(m.match(/content=["']([^"']*)["']/i)?.[1] ?? "") : "";
};

type Rgb = [number, number, number];
const hexRgb = (h: string): Rgb | null => {
  let x = h.replace("#", "").toLowerCase();
  if (x.length === 3 || x.length === 4) x = x.slice(0, 3).split("").map((c) => c + c).join("");
  if (x.length === 8) x = x.slice(0, 6);
  if (!/^[0-9a-f]{6}$/.test(x)) return null;
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
};
const rgbHex = ([r, g, b]: Rgb) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const lum = ([r, g, b]: Rgb) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const sat = ([r, g, b]: Rgb) => { const M = Math.max(r, g, b), m = Math.min(r, g, b); return M === 0 ? 0 : (M - m) / M; };
const contraste = (a: Rgb, b: Rgb) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Deux teintes presque identiques comptent pour une
const proche = (a: Rgb, b: Rgb) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 40;

const GENERIQUES = /^(inherit|initial|unset|sans-serif|serif|monospace|system-ui|-apple-system|blinkmacsystemfont|segoe ui|roboto|helvetica|helvetica neue|arial|ui-sans-serif|ui-serif|ui-monospace|apple color emoji|segoe ui emoji|noto color emoji|var\(.*)$/i;

export type Scan = {
  domaine: string; url: string; nom: string; titre: string; description: string;
  type: "saas" | "site" | "app"; indices: string[];
  couleurs: { primaire: string | null; fond: string; texte: string; autres: string[] }; mode: "light" | "dark";
  polices: { titres: string | null; texte: string | null };
  rubriques: string[]; titres: string[]; boutons: string[]; css_lus: number;
};

export async function scannerSite(entree: string): Promise<Scan> {
  let s = String(entree ?? "").trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u: URL;
  try { u = new URL(s); } catch { throw new Error("Adresse invalide (exemple : monsite.fr)"); }
  if (!/\.[a-z]{2,}$/i.test(u.hostname)) throw new Error("Adresse invalide (exemple : monsite.fr)");
  const r = await safeFetchText(u.toString(), { headers: ENTETES }, 1_500_000, 15000);
  if (!r.ok || !/html/i.test(r.type) || r.text.length < 200) throw new Error("Ce site n'a pas pu être lu (il bloque peut-être les visites automatiques). Essaie une autre adresse, ou décris ton idée.");
  const html = r.text.slice(0, 800_000);
  const base = new URL(r.url || u.toString());
  const domaine = base.hostname.replace(/^www\./, "");

  // 1. Nom, titre, description
  const titre = net(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").slice(0, 160);
  const nomBrut = meta(html, "og:site_name") || meta(html, "application-name") || titre.split(/\s[|–—·:-]\s/)[0] || domaine.split(".")[0];
  const nom = nomBrut.slice(0, 40) || domaine;
  const description = (meta(html, "description") || meta(html, "og:description")).slice(0, 300);

  // 2. Feuilles de style : celles de la page (2 au plus, même site ou CDN), en plus des styles écrits dans la page
  const liens = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)].map((m) => m[0].match(/href=["']([^"']+)["']/i)?.[1]).filter(Boolean) as string[];
  const google = liens.filter((l) => /fonts\.googleapis\.com/.test(l));
  let css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n") + "\n" + [...html.matchAll(/style=["']([^"']+)["']/gi)].map((m) => m[1]).join(";\n");
  let lus = 0;
  for (const l of liens.filter((x) => !/fonts\.googleapis\.com/.test(x)).slice(0, 3)) {
    try {
      const cu = new URL(l, base).toString();
      const c = await safeFetchText(cu, { headers: ENTETES }, 900_000, 8000);
      if (c.ok && c.text) { css += "\n" + c.text.slice(0, 900_000); lus++; }
    } catch { /* feuille illisible : on continue */ }
  }

  // 3. Polices : Google Fonts d'abord, puis les font-family déclarées (la plus fréquente sur les titres, puis sur le texte)
  const familles = new Map<string, number>();
  for (const g of google) for (const f of g.matchAll(/family=([^&:]+)/g)) { const n = decodeURIComponent(f[1]).replace(/\+/g, " ").trim(); familles.set(n, (familles.get(n) ?? 0) + 5); }
  // Noms de polices « emballés » (Next.js : __Inter_d65c78, « Inter Fallback ») ramenés à leur vrai nom
  const propre = (x: string) => x.trim().replace(/^["']|["']$/g, "").replace(/^__(.+?)_[0-9a-f]{5,}$/i, "$1").replace(/_/g, " ").replace(/\s+Fallback$/i, "").trim();
  const premiere = (decl: string) => decl.split(",").map(propre).find((x) => x && !GENERIQUES.test(x)) ?? null;
  let polTitres: string | null = null;
  for (const m of css.matchAll(/(h1|h2|\.h1|\.title|\.heading|\.display)[^{]{0,80}\{[^}]*font-family\s*:\s*([^;}]+)/gi)) { const p = premiere(m[2]); if (p) { polTitres = p; break; } }
  for (const m of css.matchAll(/@font-face\s*\{[^}]*font-family\s*:\s*([^;}]+)/gi)) { const p = premiere(m[1]); if (p) familles.set(p, (familles.get(p) ?? 0) + 2); }
  for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/gi)) { const p = premiere(m[1]); if (p && !/icon|awesome|material|glyph|swiper|slick/i.test(p)) familles.set(p, (familles.get(p) ?? 0) + 1); }
  const triees = [...familles.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n).filter((n) => n.length < 40);
  let polTexte = triees.find((n) => n !== polTitres) ?? triees[0] ?? null;
  polTitres = polTitres && !/icon|awesome/i.test(polTitres) ? polTitres : triees[0] ?? null;
  // Seules les polices disponibles chez Google Fonts sont gardées (celles d'une marque, payantes, ne se chargent pas)
  const dispo = async (p: string | null) => {
    if (!p || !/^[A-Za-z0-9 ]{2,40}$/.test(p)) return null;
    const g = await safeFetchText(`https://fonts.googleapis.com/css2?family=${p.trim().replace(/ /g, "+")}`, { headers: ENTETES }, 60_000, 5000).catch(() => null);
    return g?.ok && /font-face/.test(g.text) ? p.trim() : null;
  };
  [polTitres, polTexte] = await Promise.all([dispo(polTitres), dispo(polTexte)]);
  if (!polTitres && polTexte) polTitres = polTexte;

  // 4. Couleurs : la couleur de marque (theme-color, boutons, liens, puis la plus fréquente parmi les teintes vives),
  // le fond et le texte (body), le mode clair ou sombre
  const compte = new Map<string, number>();
  const ajouter = (hex: string, poids = 1) => { const c = hexRgb(hex); if (!c) return; const k = rgbHex(c); compte.set(k, (compte.get(k) ?? 0) + poids); };
  for (const m of css.matchAll(/#([0-9a-f]{3,8})\b/gi)) ajouter(m[0]);
  for (const m of css.matchAll(/rgba?\(\s*(\d{1,3})[ ,]+(\d{1,3})[ ,]+(\d{1,3})/gi)) { const k = rgbHex([+m[1], +m[2], +m[3]]); compte.set(k, (compte.get(k) ?? 0) + 1); }
  const theme = hexRgb(meta(html, "theme-color"));
  const boutons: Rgb[] = [];
  for (const m of css.matchAll(/(button|\.btn|\.button|\.cta|\[type=.?submit|a\.primary|\.primary)[^{]{0,60}\{[^}]*background(?:-color)?\s*:\s*(#[0-9a-f]{3,8})/gi)) { const c = hexRgb(m[2]); if (c) boutons.push(c); }
  for (const m of html.matchAll(/<(?:a|button)\b[^>]*class=["'][^"']*\bbg-\[(#[0-9a-f]{3,8})\]/gi)) { const c = hexRgb(m[1]); if (c) boutons.push(c); }
  const vives = [...compte.entries()].map(([k, n]) => [hexRgb(k)!, n] as [Rgb, number]).filter(([c]) => sat(c) > 0.35 && lum(c) > 0.03 && lum(c) < 0.75).sort((a, b) => b[1] - a[1]);
  const fusion: [Rgb, number][] = [];
  for (const [c, n] of vives) { const f = fusion.find(([d]) => proche(c, d)); if (f) f[1] += n; else fusion.push([c, n]); }
  fusion.sort((a, b) => b[1] - a[1]);
  // Variables de marque déclarées (--brand, --primary, --color-accent…) : le signal le plus fiable
  const marque = [...css.matchAll(/--(?:[a-z-]*-)?(?:brand|primary|accent)(?:-[a-z0-9]+)?\s*:\s*(#[0-9a-f]{3,8})\b/gi)].map((m) => hexRgb(m[1])).filter((c): c is Rgb => !!c);
  // La variable de marque principale (--brand, --cal-brand, --primary, sans suffixe) l'emporte, même sobre (noir)
  const principale = [...css.matchAll(/--(?:[a-z]+-)?(?:brand|primary)\s*:\s*(#[0-9a-f]{3,8})\b/gi)].map((m) => hexRgb(m[1])).find((c): c is Rgb => !!c && lum(c) < 0.75) ?? null;
  const marqueVive = marque.find((c) => sat(c) > 0.3 && lum(c) > 0.03 && lum(c) < 0.75);
  // Bouton principal noir (ou presque) : une marque sobre, gardée telle quelle
  const boutonSombre = boutons.find((c) => sat(c) < 0.15 && lum(c) < 0.06) ?? marque.find((c) => sat(c) < 0.15 && lum(c) < 0.06);
  const primaire = (theme && sat(theme) > 0.3 ? theme : null) ?? principale ?? marqueVive ?? boutons.find((c) => sat(c) > 0.3) ?? boutonSombre ?? fusion[0]?.[0] ?? null;
  const fondBody = [...css.matchAll(/(?:^|[}\s,])(?:body|html|:root)\s*\{[^}]*background(?:-color)?\s*:\s*(#[0-9a-f]{3,8})/gi)].map((m) => hexRgb(m[1])).find(Boolean) ?? null;
  const texteBody = [...css.matchAll(/(?:^|[}\s,])body\s*\{[^}]*[^-]color\s*:\s*(#[0-9a-f]{3,8})/gi)].map((m) => hexRgb(m[1])).find(Boolean) ?? null;
  const fond: Rgb = fondBody ?? [255, 255, 255];
  const mode = lum(fond) < 0.2 ? "dark" : "light";
  let texte: Rgb = texteBody ?? (mode === "dark" ? [241, 241, 241] : [23, 23, 23]);
  if (contraste(texte, fond) < 4.5) texte = mode === "dark" ? [241, 241, 241] : [23, 23, 23];
  const autres = fusion.slice(0, 6).map(([c]) => rgbHex(c)).filter((h) => !primaire || h !== rgbHex(primaire)).slice(0, 4);

  // 5. Rubriques (menu), titres de sections, boutons d'action
  const zoneMenu = [...html.matchAll(/<(nav|header)[\s\S]*?<\/\1>/gi)].map((m) => m[0]).join(" ");
  const textesLiens = (zone: string) => [...zone.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => net(m[1]).replace(/\s*[→›»↗]+$/, "")).filter((t) => t.length > 1 && t.length < 28 && !/^(fr|en|de|es|it|nl)$/i.test(t));
  const uniq = (l: string[]) => [...new Map(l.map((x) => [x.toLowerCase(), x])).values()];
  const rubriques = uniq(textesLiens(zoneMenu)).slice(0, 8);
  const titres = uniq([...html.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi)].map((m) => net(m[1])).filter((t) => t.length > 5 && t.length < 70 && !/\d{1,2}[:h]\d{2}|\b(AM|PM)\b/.test(t))).slice(0, 8);
  const btn = uniq([...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi), ...html.matchAll(/<a\b[^>]*class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => net(m[1]).replace(/\s*[→›»↗]+$/, "")).filter((t) => t.length > 2 && t.length < 32 && !/cookie|accepter|refuser|personnaliser|continuer sans|accept|reject|decline|fermer|close|menu/i.test(t))).slice(0, 6);

  // 6. Type : logiciel en ligne, site vitrine, ou app mobile (indices visibles, sans IA)
  const tout = (titre + " " + description + " " + net(html.slice(0, 400_000)).slice(0, 60_000)).toLowerCase();
  const n = (re: RegExp) => (tout.match(re) ?? []).length;
  const pSaas = n(/essai gratuit|free trial|tarifs|pricing|tableau de bord|dashboard|sign ?up|s'inscrire|inscription|log ?in|se connecter|connexion|api\b|intégrations?|integrations?|par mois|\/mois|per month|\/mo\b|logiciel|software|plateforme|platform/g);
  const pSite = n(/horaires|nous contacter|contactez|réserver|reservation|réservation|devis gratuit|notre équipe|nos services|adresse|téléphone|menu du jour|carte|rendez-vous|prendre rdv|galerie|portfolio/g);
  const pApp = n(/apps\.apple\.com|play\.google\.com|app store|google play|télécharger l'app|download the app/g);
  const liensSaas = (html.match(/href=["'][^"']*(?:\/login|\/signin|\/sign-in|\/signup|\/sign-up|\/register|\/inscription|\/connexion|\/pricing|\/tarifs|\/\/app\.|\/dashboard|\/trial|\/demo)[^"']*["']/gi) ?? []).length;
  const pSaas2 = pSaas + Math.min(12, liensSaas * 2);
  const type: Scan["type"] = pApp >= 3 && pApp >= pSaas2 / 2 ? "app" : pSaas2 >= Math.max(3, pSite) ? "saas" : "site";
  const indices = [pSaas2 && `${pSaas2} indices de logiciel en ligne`, pSite && `${pSite} indices de site d'entreprise`, pApp && `${pApp} liens vers une app`].filter(Boolean) as string[];

  return {
    domaine, url: base.toString(), nom, titre, description, type, indices,
    couleurs: { primaire: primaire ? rgbHex(primaire) : null, fond: rgbHex(fond), texte: rgbHex(texte), autres }, mode,
    polices: { titres: polTitres, texte: polTexte }, rubriques, titres, boutons: btn, css_lus: lus,
  };
}

/** Le style relevé, appliqué au système de design d'une construction (palette et polices), lisible quoi qu'il arrive. */
// deno-lint-ignore no-explicit-any
export function appliquerStyle(design: any, st: any) {
  if (!design || !st) return design;
  const c = { ...(design.couleurs ?? {}) };
  const prim = hexRgb(String(st.couleurs?.primaire ?? ""));
  const fond = hexRgb(String(st.couleurs?.fond ?? ""));
  const texte = hexRgb(String(st.couleurs?.texte ?? ""));
  const dark = st.mode === "dark";
  if (fond) { c.background = rgbHex(fond); c.card = dark ? rgbHex(fond.map((v) => v + 14) as Rgb) : "#FFFFFF"; c.muted = dark ? rgbHex(fond.map((v) => v + 24) as Rgb) : rgbHex(fond.map((v) => v - 10) as Rgb); }
  if (texte && fond && contraste(texte, fond) >= 4.5) c.foreground = rgbHex(texte);
  if (prim) {
    // La couleur de marque doit rester lisible sur le fond : assombrie (fond clair) ou éclaircie (fond sombre) si besoin
    let p = prim; const f = fond ?? [255, 255, 255];
    for (let i = 0; i < 12 && contraste(p, f) < 3; i++) p = p.map((v) => dark ? v + (255 - v) * 0.15 : v * 0.85) as Rgb;
    c.primary = rgbHex(p); c.ring = c.primary; c.primary_origine = rgbHex(prim);
    c.on_primary = contraste([255, 255, 255], p) >= 4.5 ? "#FFFFFF" : "#111111";
  }
  const polices = { ...(design.polices ?? {}) };
  if (st.polices?.titres) polices.titres = String(st.polices.titres).slice(0, 40);
  if (st.polices?.texte) polices.texte = String(st.polices.texte).slice(0, 40);
  return { ...design, couleurs: c, polices, mode: dark ? "dark" : "light", source_style: st.domaine ?? null };
}

/** Ce que le navigateur renvoie du scan et du logo, nettoyé avant d'entrer dans le projet. */
// deno-lint-ignore no-explicit-any
export function sourceNette(x: any) {
  if (!x || typeof x !== "object") return null;
  const hex = (v: unknown) => /^#[0-9a-f]{6}$/i.test(String(v ?? "")) ? String(v).toUpperCase() : null;
  const pol = (v: unknown) => /^[A-Za-z0-9 ]{2,40}$/.test(String(v ?? "")) ? String(v).trim() : null;
  const base = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/apps/images/`;
  const logo = typeof x.logo === "string" && x.logo.startsWith(base) && x.logo.length < 300 ? x.logo : null;
  const st = x.style && typeof x.style === "object" ? {
    domaine: String(x.style.domaine ?? "").replace(/[^a-z0-9.-]/gi, "").slice(0, 120) || null,
    couleurs: { primaire: hex(x.style.couleurs?.primaire), fond: hex(x.style.couleurs?.fond), texte: hex(x.style.couleurs?.texte) },
    mode: x.style.mode === "dark" ? "dark" : "light",
    polices: { titres: pol(x.style.polices?.titres), texte: pol(x.style.polices?.texte) },
  } : null;
  return logo || st ? { logo, style: st } : null;
}

/** Le logo et le style d'origine, posés sur la spec d'une construction. */
// deno-lint-ignore no-explicit-any
export function poserSource(spec: any, source: any) {
  if (!spec || !source) return spec;
  if (source.logo) spec.logo = source.logo;
  if (source.style) {
    spec.design = appliquerStyle(spec.design ?? { couleurs: {}, polices: {} }, source.style);
    if (spec.design?.couleurs?.primary) spec.couleur = spec.design.couleurs.primary;
  }
  return spec;
}
