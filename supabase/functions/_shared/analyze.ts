// Agent Stratège : lit le site de l'entreprise et en déduit son offre, ses
// clients idéaux et les codes d'activité (NAF) à prospecter dans le registre.
import { HttpError } from "./http.ts";
import { ask, askJson, type Profile, type Target } from "./core.ts";
import { countTarget } from "./search.ts";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

function textOf(html: string): string {
  // Découpe simple (peu coûteuse en calcul) : on retire scripts, styles et SVG puis les balises
  let out = "";
  let i = 0;
  const lower = html.toLowerCase();
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt < 0) { out += html.slice(i); break; }
    out += html.slice(i, lt);
    let skipTo = -1;
    for (const tag of ["script", "style", "svg", "noscript"]) {
      if (lower.startsWith(tag, lt + 1)) { const end = lower.indexOf(`</${tag}`, lt); skipTo = end < 0 ? html.length : lower.indexOf(">", end) + 1; break; }
    }
    if (skipTo > 0) { i = skipTo; out += " "; continue; }
    const gt = html.indexOf(">", lt);
    if (gt < 0) break;
    const t = lower.slice(lt + 1, lt + 4);
    out += /^(br|p\b|\/p|h\d|\/h|li|\/li|div|\/di)/.test(t) ? "\n" : " ";
    i = gt + 1;
    if (out.length > 40000) break;
  }
  return out.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

export async function fetchHtml(url: string): Promise<string> { return await get(url); }

async function get(url: string): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "accept-language": "fr-FR,fr;q=0.9,en;q=0.8" }, signal: ctl.signal, redirect: "follow" });
    if (!res.ok) return "";
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) return "";
    return (await res.text()).slice(0, 300_000);
  } catch { return ""; } finally { clearTimeout(t); }
}

export function normalizeUrl(input: string): string {
  let s = String(input ?? "").trim();
  if (!s) throw new HttpError(400, "Indique l'adresse de ton site");
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u: URL;
  try { u = new URL(s); } catch { throw new HttpError(400, "Adresse de site invalide"); }
  if (!/\./.test(u.hostname) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) throw new HttpError(400, "Adresse de site invalide");
  return u.origin + (u.pathname === "/" ? "" : u.pathname);
}

/** Page d'accueil + quelques pages utiles (offre, à propos, contact). */
/** Si le site bloque les robots : l'IA le décrit à partir d'une recherche web. */
async function describeFromWeb(url: string): Promise<string> {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const out = await ask(`Recherche sur le web l'entreprise dont le site est ${host}. Décris précisément, en français et en 250 mots maximum : ce qu'elle vend, à quels clients (types d'entreprises ou d'établissements), où elle intervient, ses chiffres et références publics, ce qui la distingue. Uniquement des faits trouvés, pas de supposition.`,
    { fast: true, maxTokens: 4000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }] });
  return `# Description de ${host} (recherche web, le site n'a pas pu être lu directement)\n${out}`;
}

/** Liens vers les réseaux sociaux trouvés sur la page d'accueil. */
export async function socialLinks(url: string): Promise<Record<string, string>> {
  const html = (await get(url)).slice(0, 300_000);
  const out: Record<string, string> = {};
  const pats: [string, RegExp][] = [
    ["linkedin", /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in|school)\/[^"'\s<>?#]+/i],
    ["instagram", /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.]+/i],
    ["facebook", /https?:\/\/(?:www\.|fr-fr\.)?facebook\.com\/[^"'\s<>?#]+/i],
    ["tiktok", /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.]+/i],
    ["youtube", /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)[^"'\s<>?#]+/i],
    ["x", /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]+/i],
  ];
  for (const [k, re] of pats) {
    const m = html.match(re);
    if (m && !/(sharer|share|intent|plugins|dialog)/i.test(m[0])) out[k] = m[0].replace(/\/$/, "");
  }
  return out;
}

/** Titre, descriptions et données structurées : souvent les seules infos lisibles d'un site en JavaScript (SaaS). */
function metaOf(html: string): string {
  const head = html.slice(0, 60_000);
  const pick = (re: RegExp) => (head.match(re)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').trim();
  const out = [
    pick(/<title[^>]*>([^<]{2,300})<\/title>/i),
    pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{2,600})["']/i) || pick(/<meta[^>]+content=["']([^"']{2,600})["'][^>]+name=["']description["']/i),
    pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{2,600})["']/i),
  ];
  const ld = [...head.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]{2,4000}?)<\/script>/gi)].map((m) => m[1].replace(/\s+/g, " ").slice(0, 1500));
  return [...new Set(out.filter(Boolean)), ...ld].join("\n");
}

export async function readSite(url: string): Promise<string> {
  let home = await get(url);
  if (!home) {
    const u = new URL(url);
    const alt = u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`;
    home = await get(`${u.protocol}//${alt}${u.pathname}`);
  }
  if (!home) {
    try { return await describeFromWeb(url); } catch (e) { console.error("describeFromWeb", e); }
  }
  if (!home) throw new HttpError(422, "Impossible de lire ce site (hors ligne ou protégé). Vérifie l'adresse, ou décris ton activité à la main.");
  // Site en JavaScript (SaaS, application) : presque pas de texte dans la page. On s'appuie sur les métadonnées et le web.
  const homeText = textOf(home);
  if (homeText.length < 600) {
    let web = "";
    try { web = await describeFromWeb(url); } catch (e) { console.error("describeFromWeb", e); }
    const all = [`# Métadonnées du site (${url})\n${metaOf(home)}`, homeText && `# Texte visible\n${homeText}`, web].filter(Boolean).join("\n\n");
    if (all.replace(/#[^\n]*\n/g, "").trim().length < 250) throw new HttpError(422, "Ce site est une application dont le contenu n'est pas lisible. Clique sur « Décris ton activité » et explique en 3 phrases ce que tu vends et à qui.");
    return all.slice(0, 18000);
  }
  const origin = new URL(url).origin;
  const links = [...home.slice(0, 150_000).matchAll(/href=["']([^"'#]{1,200})["']/gi)].map((m) => m[1])
    .map((h) => { try { return new URL(h, origin).href; } catch { return ""; } })
    .filter((h) => h.startsWith(origin) && /(propos|about|qui-sommes|services|offre|prestations|solutions|nos-|metier|expertise|clients|references|contact)/i.test(h));
  const pages = [...new Set(links)].slice(0, 3);
  const others = await Promise.all(pages.map(get));
  const parts = [`# Accueil (${url})\n${metaOf(home)}\n${homeText.slice(0, 7000)}`];
  others.forEach((h, i) => { if (h) parts.push(`# ${pages[i]}\n${textOf(h).slice(0, 3500)}`); });
  return parts.join("\n\n").slice(0, 18000);
}

type Analysis = { profil: Profile; zone: string[]; cibles: Omit<Target, "id">[] };

const NAF_RE = /^\d{2}\.\d{2}[A-Z]$/;
const TRANCHES = ["00", "01", "02", "03", "11", "12", "21", "22", "31", "32", "41", "42", "51", "52", "53"];

export async function analyze(site: string, description: string) {
  const content = site || "";
  const a = await askJson<Analysis>(`Voici le contenu du site d'une entreprise française${description ? " et la description qu'en donne son dirigeant" : ""}.
Ton travail : comprendre ce qu'elle vend et à QUI elle doit le vendre (clients professionnels), pour lancer une prospection B2B par e-mail.

${description ? `Description du dirigeant :\n${description}\n\n` : ""}${content ? `Contenu du site :\n${content}` : ""}

Produis :
1. "profil" : nom commercial, résumé en une phrase, offre (ce qui est vendu, concrètement), clients_types (qui achète), preuves (faits vérifiables trouvés sur le site : années d'existence, références, certifications, chiffres — UNIQUEMENT s'ils figurent dans le contenu), differenciation (ce qui la distingue, d'après le site), ville (siège), ton (comment elle s'exprime : sobre, premium, chaleureux…).
2. "zone" : codes départements français (2 caractères, ex. "75", "92", "2A") où prospecter, déduits de la zone d'intervention indiquée sur le site ; à défaut, le département du siège et ses voisins. Liste vide si l'entreprise travaille dans toute la France.
3. "cibles" : 3 à 6 types d'établissements clients, du plus prometteur au moins prometteur. Pour chacun :
   - label : nom clair (ex. « EHPAD », « Cabinets d'avocats »)
   - pourquoi : pourquoi ils ont besoin de cette offre (une phrase)
   - naf : 1 à 4 codes d'activité NAF rév. 2 de l'INSEE au format "87.10A" qui correspondent EXACTEMENT à ces établissements
   - tranches : tranches d'effectif INSEE à viser (codes parmi 00,01,02,03,11,12,21,22,31,32,41,42,51,52,53 ; 01=1-2, 02=3-5, 03=6-9, 11=10-19, 12=20-49, 21=50-99, 22=100-199, 31=200-249, 32=250-499, 41=500-999…) ; liste vide = toutes tailles
   - siege_only : true s'il faut contacter le siège plutôt que chaque établissement (entreprises de bureaux), false pour des établissements autonomes (hôtels, EHPAD, écoles, restaurants…)
   - interlocuteur : la fonction à qui écrire (ex. « Directeur d'établissement », « Office manager »)
   - pour_qui : les bénéficiaires finaux, comme on en parle dans un e-mail (ex. « vos résidents », « vos collaborateurs », « vos clients »)
   - angle : l'argument principal pour cette cible, en une phrase
Ne vise pas les particuliers. Ne choisis que des cibles qui ont un vrai besoin de cette offre.
Si l'entreprise vend un logiciel, un SaaS, une application ou un service à distance : ses clients sont des entreprises (pas des établissements locaux). Choisis alors les secteurs d'activité de ses clients (codes NAF de ces secteurs, pas celui de l'éditeur), des tranches d'effectif cohérentes avec son prix et sa cible, siege_only = true, l'interlocuteur qui achète ce type d'outil (ex. « Directeur commercial », « DAF », « Responsable RH », « Gérant »), et une zone vide (toute la France) sauf si le site indique une limite géographique.

Format :
{"profil": {"nom": "", "resume": "", "offre": "", "clients_types": "", "preuves": [], "differenciation": "", "ville": "", "ton": ""},
 "zone": ["75"],
 "cibles": [{"label": "", "pourquoi": "", "naf": ["00.00X"], "tranches": [], "siege_only": false, "interlocuteur": "", "pour_qui": "", "angle": ""}]}`, { maxTokens: 4000 });

  const zone = (Array.isArray(a.zone) ? a.zone : []).map((d) => String(d).toUpperCase().trim()).filter((d) => /^(\d{2}|2A|2B|97\d)$/.test(d)).slice(0, 20);
  const cibles = (Array.isArray(a.cibles) ? a.cibles : []).slice(0, 6).map((c, i) => ({
    id: `c${i + 1}`,
    label: String(c.label ?? "").slice(0, 80),
    pourquoi: String(c.pourquoi ?? "").slice(0, 300),
    naf: (c.naf ?? []).map((n) => String(n).trim().toUpperCase()).filter((n) => NAF_RE.test(n)).slice(0, 4),
    tranches: (c.tranches ?? []).map(String).filter((t) => TRANCHES.includes(t)),
    siege_only: !!c.siege_only,
    interlocuteur: String(c.interlocuteur ?? "").slice(0, 80),
    pour_qui: String(c.pour_qui ?? "").slice(0, 80),
    angle: String(c.angle ?? "").slice(0, 300),
    actif: true,
    next_page: 1,
  })).filter((c) => c.label && c.naf.length);
  if (!cibles.length) throw new HttpError(502, "Je n'ai pas assez d'informations sur ce que tu vends. Clique sur « Décris ton activité » et explique en 3 phrases ce que tu vends, à quel type de clients, et où.");

  // Taille réelle de chaque cible dans le registre
  for (const c of cibles) {
    (c as Target).total = await countTarget(c as Target, zone).catch(() => undefined);
  }
  return { profile: a.profil ?? {}, zone, targets: cibles as Target[] };
}
