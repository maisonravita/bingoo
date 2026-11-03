// Outils gratuits (sans compte) : la porte d'entrée de Bingoo!.
// 1. Contrats publics de ton secteur qui se terminent dans les 12 mois (données officielles, sans IA : coût nul).
// 2. Analyse express d'un concurrent (lecture de son site + modèle rapide : quelques millièmes d'euro).
// Le visiteur voit 3 éléments, le reste demande un compte. Limites par visiteur et par jour (adresse IP jamais stockée en clair).
import { HttpError } from "./http.ts";
import { admin, askJson } from "./core.ts";

const DECP = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/decp-v3-marches-valides/records";
const q = (s: string) => `"${String(s).replace(/["\\]/g, "")}"`;

async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Limite d'usage : par visiteur (empreinte de l'adresse IP, salée et changée chaque jour) et au total sur la plateforme. */
export async function freeLimit(req: Request, tool: string, perVisitor: number, perDay: number, msgs?: { visitor?: string; total?: string }) {
  const day = new Date().toISOString().slice(0, 10);
  const ip = (req.headers.get("cf-connecting-ip") ?? "").trim() || "inconnu"; // posé par Cloudflare, non falsifiable
  const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(-16) ?? "bingoo";
  const who = (await sha(`${salt}:${day}:${ip}`)).slice(0, 32);
  const keys = [`${tool}:${who}`, `${tool}:total`];
  // Compteurs atomiques : incrémentés d'abord, comparés ensuite (des requêtes simultanées ne passent plus toutes)
  const bump = async (k: string) => {
    const r = await admin.rpc("hit", { p_key: k, p_day: day });
    if (!r.error && r.data != null) return Number(r.data);
    // Repli si la fonction n'est pas joignable : lecture puis écriture (jamais « ouvert par défaut »)
    const { data } = await admin.from("free_hits").select("n").eq("key", k).eq("day", day).maybeSingle();
    const n = Number(data?.n ?? 0) + 1;
    await admin.from("free_hits").upsert({ key: k, day, n }, { onConflict: "key,day" });
    return n;
  };
  const [mine, all] = await Promise.all(keys.map(bump));
  if (mine > perVisitor) throw new HttpError(429, msgs?.visitor ?? "Tu as utilisé tes analyses gratuites du jour. Crée ton compte Bingoo! pour continuer sans limite.");
  if (all > perDay) throw new HttpError(429, msgs?.total ?? "L'outil gratuit est très demandé aujourd'hui. Crée ton compte Bingoo! pour y accéder tout de suite.");
}

const addMonths = (d: string, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };
const cap = (s: string) => String(s ?? "").toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());

/** Contrats publics du secteur (mot-clé) dans un département, dont la fin estimée tombe dans les 12 prochains mois. */
export async function freeRenewals(input: { secteur?: string; dept?: string }) {
  const kw = String(input.secteur ?? "").trim().slice(0, 60);
  const dept = String(input.dept ?? "").trim().toUpperCase();
  if (kw.length < 3) throw new HttpError(400, "Indique ton activité (ex. nettoyage, sécurité, informatique)");
  if (!/^(\d{2}|2A|2B|97\d)$/.test(dept)) throw new HttpError(400, "Indique un département (ex. 75, 69, 13)");
  const since = new Date(Date.now() - 6 * 365 * 864e5).toISOString().slice(0, 10);
  const rows: { objet: string; acheteur_id: string | null; acheteur_nom: string | null; titulaire_id_1: string | number | null; datenotification: string; dureemois: number | null; montant: number | null }[] = [];
  for (let off = 0; off < 400; off += 100) {
    const u = new URL(DECP);
    for (const [k, v] of Object.entries({ where: `search(objet,${q(kw)}) and startswith(lieuexecution_code,${q(dept)}) and datenotification>=date'${since}'`, limit: "100", offset: String(off), order_by: "datenotification desc", select: "objet,acheteur_id,acheteur_nom,titulaire_id_1,datenotification,dureemois,montant" })) u.searchParams.set(k, v);
    const d = await fetch(u, { signal: AbortSignal.timeout(15000) }).then((r) => r.ok ? r.json() : null).catch(() => null);
    const part = (d?.results ?? []) as typeof rows;
    rows.push(...part);
    if (part.length < 100) break;
  }
  const now = Date.now(), year = now + 365 * 864e5;
  const seen = new Set<string>();
  const ending = rows.filter((r) => r.datenotification && r.dureemois).map((r) => ({ ...r, fin: addMonths(r.datenotification, Number(r.dureemois)) }))
    .filter((r) => r.fin.getTime() > now && r.fin.getTime() < year)
    .filter((r) => { const k = `${r.acheteur_nom}|${r.objet}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.fin.getTime() - b.fin.getTime());
  // Compteur public : chaque contrat trouvé n'est compté qu'une fois, quelle que soit la recherche
  if (ending.length) {
    const keys = await Promise.all(ending.slice(0, 400).map((r) => sha(`${r.acheteur_id ?? r.acheteur_nom}|${r.objet}|${r.datenotification}`)));
    await admin.from("radar_found").upsert([...new Set(keys)].map((k) => ({ k: k.slice(0, 32), kind: "contrat" })), { onConflict: "k", ignoreDuplicates: true }).then(() => {}, () => {});
  }
  const top = ending.slice(0, 3);
  // Nom du titulaire actuel (registre officiel) pour les 3 visibles
  const { lookup } = await import("./radar-signals.ts");
  const out = [];
  for (const r of top) {
    const sir = r.titulaire_id_1 ? String(r.titulaire_id_1).slice(0, 9) : "";
    const t = sir.length === 9 ? await lookup(sir).catch(() => null) : null;
    const bs = r.acheteur_id ? String(r.acheteur_id).slice(0, 9) : "";
    const b = !r.acheteur_nom && bs.length === 9 ? await lookup(bs).catch(() => null) : null;
    out.push({ acheteur: cap(r.acheteur_nom || b?.nom || "Acheteur public"), objet: String(r.objet ?? "").replace(/\s+/g, " ").slice(0, 200), montant: r.montant ?? null, fin: r.fin.toISOString().slice(0, 10), titulaire: t?.nom ? cap(t.nom) : null });
  }
  const total = ending.reduce((s, r) => s + (Number(r.montant) || 0), 0);
  // Aperçu des contrats suivants, sans nom ni contact (affichés floutés sur la page d'accueil) : montant et date de fin uniquement
  const apercu = ending.slice(3, 10).map((r) => ({ fin: r.fin.toISOString().slice(0, 10), montant: r.montant ?? null }));
  return { secteur: kw, dept, total: ending.length, montant_total: Math.round(total), visibles: out, apercu, caches: Math.max(0, ending.length - out.length) };
}

/** Analyse express d'un concurrent à partir de son site : 3 éléments visibles, le reste réservé aux comptes. */
export async function freeCompetitor(input: { url?: string }) {
  let url = String(input.url ?? "").trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { throw new HttpError(400, "Adresse du site invalide (ex. concurrent.fr)"); }
  if (!/\.[a-z]{2,}$/i.test(host)) throw new HttpError(400, "Adresse du site invalide (ex. concurrent.fr)");
  const { fetchHtml, textOf } = await import("./analyze.ts");
  const html = await fetchHtml(`https://${host}`);
  if (!html) throw new HttpError(422, "Impossible de lire ce site (protégé ou indisponible). Essaie avec une autre adresse.");
  const text = textOf(html).slice(0, 9000);
  const { toolsIn } = await import("./tech-fp.ts");
  const a = await askJson<{ nom: string; offre: string; cible: string; prix: string; arguments: string[]; faiblesses: string[]; angle: string }>(`Voici le contenu de la page d'accueil du site ${host}. Analyse ce concurrent pour une entreprise qui veut lui prendre des clients.
Règles : uniquement ce que dit la page ; les faiblesses sont des hypothèses prudentes déduites de ce qui manque ou de ce qui est flou sur la page (jamais une critique sans base) ; pas de nom de personne.
Contenu :
${text}
Format : {"nom": "", "offre": "ce qu'il vend, en une phrase", "cible": "à qui, en une phrase", "prix": "les prix affichés, ou « non affichés »", "arguments": ["ses 3 arguments principaux"], "faiblesses": ["3 hypothèses de points faibles"], "angle": "l'angle pour le battre, en une phrase"}`, { fast: true, maxTokens: 900 });
  return {
    site: host, nom: String(a.nom || host).slice(0, 80), outils: toolsIn(html).slice(0, 8),
    visibles: [["Ce qu'il vend", a.offre], ["À qui", a.cible], ["Prix", a.prix]].filter(([, v]) => v).map(([t, v]) => ({ titre: t, texte: String(v).slice(0, 300) })),
    caches: [`${(a.arguments ?? []).length} arguments qu'il martèle`, `${(a.faiblesses ?? []).length} points faibles à exploiter`, "L'angle pour lui prendre des clients", "Ses publicités, ses avis clients et ses changements suivis chaque semaine"],
  };
}

/** Essai universel (sans compte, sans IA) : « tes clients, c'est qui ? » → les entreprises de cette cible qui vivent un moment d'achat,
 *  lues dans les annonces légales officielles (BODACC) : création, nouvel établissement, reprise. Marche pour tout vendeur B2B (logiciel, services, produits). */
const BODACC_FREE = "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records";
const STOP = new Set(["de", "des", "du", "la", "le", "les", "l", "d", "et", "en", "a", "au", "aux", "pour", "un", "une", "mes", "nos", "clients", "client", "entreprises", "entreprise", "societes", "societe", "pme", "tpe"]);
const singular = (w: string) => w.length > 4 ? w.replace(/(aux)$/, "al").replace(/s$/, "") : w;
export function cibleWords(s: string) {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w)).map(singular).slice(0, 3);
}
// deno-lint-ignore no-explicit-any
const parseJ = (s: unknown): any => { if (!s) return null; if (typeof s === "object") return s; try { return JSON.parse(String(s)); } catch { return null; } };

export async function freeSignals(input: { cible?: string; dept?: string }) {
  const cible = String(input.cible ?? "").trim().slice(0, 60);
  const dept = String(input.dept ?? "").trim().toUpperCase();
  const all = cible === "*"; // vend à toutes les entreprises : pas de filtre d'activité
  const words = all ? [] : cibleWords(cible);
  if (!all && !words.length) throw new HttpError(400, "Dis-nous qui sont tes clients (ex. restaurants, cabinets comptables, agences immobilières)");
  if (dept && !/^(\d{2}|2A|2B|97\d)$/.test(dept)) throw new HttpError(400, "Département invalide (ex. 75, 69, 13), ou laisse vide pour toute la France");
  const since = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10);
  const read = async (ws: string[]) => {
    const where = [`dateparution>=date'${since}'`, `familleavis in ("creation","vente")`, dept ? `numerodepartement=${q(dept)}` : "", ...ws.map((w) => `search(listeetablissements,${q(w)})`)].filter(Boolean).join(" and ");
    const u = new URL(BODACC_FREE);
    for (const [k, v] of Object.entries({ where, limit: "100", order_by: "dateparution desc", select: "id,familleavis,commercant,registre,dateparution,ville,numerodepartement,listeetablissements,listepersonnes,acte" })) u.searchParams.set(k, v);
    return await fetch(u, { signal: AbortSignal.timeout(15000) }).then((r) => r.ok ? r.json() : null).catch(() => null);
  };
  let d = await read(words);
  // « cabinets comptables » : les annonces disent souvent « expertise comptable » → on réessaie avec le mot le plus parlant
  if (d && !(d.results ?? []).length && words.length > 1) d = await read([[...words].sort((a, b) => b.length - a.length)[0]]);
  if (!d) throw new HttpError(502, "Les annonces officielles ne répondent pas pour l'instant. Réessaie dans une minute.");
  const HOLDING = /(holding|participations?|valeurs mobili[eè]res|soci[ée]t[ée] civile|\bsci[a-z]?\b|acquisition d['’e]\s*(une?|des|la|le)?\s*(maison|immeuble|terrain|appartement|bien)|location de biens? immobiliers?|gestion de (son|leur) patrimoine)/i;
  const seen = new Set<string>();
  // deno-lint-ignore no-explicit-any
  const rows = ((d.results ?? []) as any[]).flatMap((b) => {
    const etab = parseJ(b.listeetablissements)?.etablissement ?? {}, pers = parseJ(b.listepersonnes)?.personne ?? {};
    const act = String(etab.activite ?? pers.activite ?? "").replace(/\s+/g, " ").trim();
    const actN = act.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (pers.typePersonne !== "pm") return []; // sociétés uniquement : jamais de particulier
    if (!act || HOLDING.test(`${b.commercant} ${act}`)) return [];
    if (words.some((w) => new RegExp(`(exclusion|hors|sauf)[^.;]{0,40}${w}`).test(actN))) return [];
    const nom = cap(String(b.commercant ?? "").split(",")[0]);
    if (!nom || seen.has(nom)) return []; seen.add(nom);
    const second = /secondaire/i.test(String(etab.qualiteEtablissement ?? "")) || /secondaire|ouverture/i.test(String(parseJ(b.acte)?.creation?.categorieCreation ?? ""));
    const kind = b.familleavis === "vente" ? "reprise" : second ? "ouverture" : "creation";
    return [{ kind, nom, activite: act.slice(0, 160), ville: cap(b.ville ?? ""), dept: String(b.numerodepartement ?? ""), date: String(b.dateparution ?? "").slice(0, 10) }];
  });
  const LBL: Record<string, [string, string]> = {
    creation: ["Vient de se créer", "Elle choisit ses outils et ses fournisseurs maintenant."],
    ouverture: ["Ouvre un nouveau site", "Un nouveau site s'équipe dans les semaines qui suivent."],
    reprise: ["Vient d'être reprise", "Un nouveau propriétaire revoit ses contrats."],
  };
  const out = rows.map((r) => ({ ...r, signal: LBL[r.kind][0], pourquoi: LBL[r.kind][1] }));
  const parType = { creation: out.filter((r) => r.kind === "creation").length, ouverture: out.filter((r) => r.kind === "ouverture").length, reprise: out.filter((r) => r.kind === "reprise").length };
  return {
    // Sans filtre d'activité, les 100 dernières annonces couvrent quelques jours seulement : on affiche la vraie période
    cible, dept, total: out.length, jours: all && out.length ? Math.max(1, Math.ceil((Date.now() - Math.min(...out.map((r) => new Date(r.date).getTime()))) / 864e5)) : 45, par_type: parType,
    visibles: out.slice(0, 3),
    apercu: out.slice(3, 10).map((r) => ({ signal: r.signal, ville: r.ville, date: r.date })),
    caches: Math.max(0, out.length - 3),
  };
}

/** Essai « ton site et basta » : Bingoo! lit le site, comprend ce que tu vends et à qui (modèle rapide, ~0,1 centime),
 *  puis lance le Radar sur ces clients (annonces légales officielles, sans IA). */
export async function freeSite(input: { url?: string }) {
  let url = String(input.url ?? "").trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { throw new HttpError(400, "Adresse du site invalide (ex. monentreprise.fr)"); }
  if (!/\.[a-z]{2,}$/i.test(host)) throw new HttpError(400, "Adresse du site invalide (ex. monentreprise.fr)");
  const { fetchHtml, textOf } = await import("./analyze.ts");
  const html = await fetchHtml(`https://${host}`);
  if (!html) throw new HttpError(422, "Impossible de lire ce site (protégé ou indisponible). Vérifie l'adresse.");
  // Sites construits en JavaScript (le texte n'est pas dans la page) : on lit aussi le titre et les descriptions
  const meta = [/<title[^>]*>([^<]{3,300})<\/title>/i, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,500})/i, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{3,300})/i, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{10,500})/i]
    .map((r) => html.match(r)?.[1]?.trim()).filter(Boolean).join("\n");
  const text = `${meta}\n${textOf(html)}`.slice(0, 7000);
  const a = await askJson<{ nom: string; offre: string; clients: string; mots: string[] }>(`Voici la page d'accueil du site ${host}. Dis ce que vend cette entreprise et à quels types d'entreprises clientes.
Règles : uniquement ce que dit la page. "mots" = 1 à 3 mots-clés simples qui décrivent l'ACTIVITÉ des entreprises clientes telle qu'elle serait écrite au registre du commerce (ex. "restaurant", "comptable", "immobilier", "boulangerie", "transport", "conseil"), au singulier, sans article. Les mots doivent être des secteurs concrets (jamais "commercial", "commerce", "service", "conseil", "entreprise", "vente", "gestion", "activité"). Si elle vend à toutes les entreprises, choisis les 2 secteurs clients concrets les plus probables (ex. "nettoyage", "transport", "informatique"). Si la page ne dit pas ce qui est vendu (site en construction, page vide, page de connexion), renvoie "mots": [] et "offre": "".
Contenu :
${text}
Format : {"nom": "", "offre": "ce qu'elle vend, 12 mots maximum", "clients": "à qui, en quelques mots (ex. aux restaurants et bars)", "mots": [""]}`, { fast: true, maxTokens: 300 });
  const VAGUE = /^(commercial|commerce|service|services|conseil|entreprise|entreprises|vente|gestion|activit[ée]|soci[ée]t[ée]|b2b|pme|professionnel)s?$/i;
  const mots = (a.mots ?? []).map((m) => String(m).trim()).filter((m) => cibleWords(m).length && !VAGUE.test(m)).slice(0, 2);
  if (!String(a.offre ?? "").trim()) throw new HttpError(422, "Ton site ne dit pas encore clairement ce que tu vends. Crée ton compte : Bingoo! te posera la question.");
  // Aucun secteur précis (elle vend à toutes les entreprises) : toutes les sociétés créées ou reprises récemment
  const parts = mots.length ? await Promise.all(mots.map((m) => freeSignals({ cible: m }).catch(() => null))) : [await freeSignals({ cible: "*" }).catch(() => null)];
  const seen = new Set<string>();
  // Fusion : 3 visibles et l'aperçu, en alternant les cibles, sans doublon
  const vis: NonNullable<typeof parts[0]>["visibles"] = [];
  const ap: NonNullable<typeof parts[0]>["apercu"] = [];
  for (const p of parts) for (const v of p?.visibles ?? []) if (!seen.has(v.nom)) { seen.add(v.nom); vis.push(v); }
  for (const p of parts) ap.push(...(p?.apercu ?? []));
  const total = parts.reduce((s, p) => s + (p?.total ?? 0), 0);
  const visibles = vis.sort((x, y) => y.date.localeCompare(x.date)).slice(0, 3);
  return {
    site: host, nom: String(a.nom || host).slice(0, 80), offre: String(a.offre ?? "").slice(0, 200), clients: String(a.clients ?? "").slice(0, 120),
    cible: mots.length ? mots.join(", ") : "toutes les entreprises", dept: "", jours: Math.max(...parts.map((p) => p?.jours ?? 0), 1), total,
    visibles, apercu: [...vis.slice(3), ...ap].slice(0, 7).map((r) => ({ signal: r.signal, ville: r.ville, date: r.date })),
    caches: Math.max(0, total - visibles.length),
  };
}
