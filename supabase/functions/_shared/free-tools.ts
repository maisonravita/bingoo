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
  const [mine, all] = await Promise.all(keys.map(async (k) => Number((await admin.rpc("hit", { p_key: k, p_day: day })).data ?? 0)));
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
  return { secteur: kw, dept, total: ending.length, montant_total: Math.round(total), visibles: out, caches: Math.max(0, ending.length - out.length) };
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
