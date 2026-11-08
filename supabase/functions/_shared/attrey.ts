// Attrey Real Estate — recherche web de demandes immobilières ouvertes.
// Utilise le moteur web déjà intégré à Bingoo! et conserve les sources exactes.
// Aucune prise de contact automatique et aucune collecte de coordonnées privées.
import { HttpError } from "./http.ts";
import { admin, ask, askJson, log, setAi, type Workspace } from "./core.ts";

const WS_ID = "4e9c20f1-84bb-4854-aca7-adcdc2bc8bfd";
type Row = {
  direction: "offre" | "demande";
  segment: "proprietaire_location"|"proprietaire_gestion"|"vendeur"|"logement_disponible"|"partenaire"|
           "voyageur"|"locataire"|"acheteur"|"entreprise_mobilite"|"investisseur";
  intent: "location_courte"|"location_moyenne"|"location_longue"|"vente"|"achat"|"gestion"|
          "partenariat"|"hebergement"|"investissement"|"autre";
  title: string; description?: string; source_name?: string; source_url: string;
  source_published_at?: string; city?: string; country_origin?: string;
  budget_min?: number|null; budget_max?: number|null; budget_period?: "total"|"nuit"|"mois"|"achat"|null;
  date_start?: string|null; date_end?: string|null;
};
const OFFER = new Set(["proprietaire_location","proprietaire_gestion","vendeur","logement_disponible","partenaire"]);
const DEMAND = new Set(["voyageur","locataire","acheteur","entreprise_mobilite","investisseur"]);
const INTENTS = new Set(["location_courte","location_moyenne","location_longue","vente","achat","gestion","partenariat","hebergement","investissement","autre"]);
const PERIODS = new Set(["total","nuit","mois","achat"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function validUrl(s: unknown) {
  if (typeof s !== "string") return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" || !u.hostname.includes(".") || u.username || u.password) return null;
    // Ne garder que les liens directs vérifiables, pas des requêtes Google ou des raccourcisseurs.
    if (/^(google\.|bing\.|t\.co$|bit\.ly$|tinyurl\.)/i.test(u.hostname.replace(/^www\./,""))) return null;
    u.hash = "";
    return u.toString();
  } catch { return null; }
}
function n(v: unknown): number|null {
  if (v === undefined || v === null || v === "") return null;
  const q = Number(v);
  return Number.isFinite(q) && q >= 0 && q <= 1000000000 ? q : null;
}
const str = (v: unknown, max=250) => typeof v === "string" ? v.trim().slice(0,max) : "";
function date(v: unknown): string|null {
  const s=str(v,25).slice(0,10);
  return DATE_RE.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
}
function normalize(x: Row) {
  if (!x || typeof x !== "object") return null;
  if (x.direction !== "offre" && x.direction !== "demande") return null;
  if (x.direction === "offre" && !OFFER.has(x.segment)) return null;
  if (x.direction === "demande" && !DEMAND.has(x.segment)) return null;
  const url=validUrl(x.source_url), title=str(x.title,240), city=str(x.city,100);
  if (!url || title.length < 14 || !city) return null;
  // Ne jamais classer une simple page d'annonce comme demande du propriétaire.
  const pdate=date(x.source_published_at);
  if (!pdate || Date.parse(pdate) > Date.now() || Date.now()-Date.parse(pdate)>75*86400000) return null;
  const bmin=n(x.budget_min),bmax=n(x.budget_max);
  const period=PERIODS.has(String(x.budget_period)) ? x.budget_period : null;
  return {
    direction:x.direction,segment:x.segment,intent:INTENTS.has(x.intent)?x.intent:"autre",
    title,description:str(x.description,700)||null,
    city,source_name:str(x.source_name,100)||null,source_url:url,
    source_published_at:pdate,source_verified_at:null,
    country_origin:str(x.country_origin,80)||null,
    budget_min:bmin,budget_max:bmax, budget_period:period,
    date_start:date(x.date_start),date_end:date(x.date_end),
    evidence_level:"a_verifier",contact_route:"a_verifier",
    status:"a_verifier",priority:"moyenne"
  };
}
// ---------------------------------------------------------------- Formulations testées à tour de rôle
// Chaque recherche web coûte environ 0,10 € : au lieu d'un prompt fourre-tout, une formulation ciblée par passage.
// Les formulations encore peu essayées passent d'abord ; ensuite, celle qui a ramené le plus de pistes par passage, avec 20 % d'exploration.
const VARIANTES: Record<string, { label: string; axe: string; termes: string }> = {
  en_logement: { label: "Anglais · cherche un logement à Paris", axe: "DEMANDE : expatriés, étudiants, salariés en mutation et voyageurs de longue durée (États-Unis, Royaume-Uni, Canada, Australie, Inde…) qui cherchent un appartement meublé à Paris ou en Île-de-France pour 1 à 12 mois.",
    termes: `"looking for a furnished apartment in Paris", "moving to Paris next month", "relocating to Paris housing", "mid-term rental Paris", "need a flat in Paris for 3 months", "corporate housing Paris"` },
  en_achat: { label: "Anglais · projet d'achat en France", axe: "DEMANDE : étrangers ou expatriés qui préparent l'achat d'un appartement à Paris, en Île-de-France ou sur la Côte d'Azur (résidence secondaire ou investissement locatif).",
    termes: `"buying an apartment in Paris as a foreigner", "looking to buy a flat in Paris", "pied-à-terre Paris buy", "investment property Paris rental yield", "buying property in France advice 2026"` },
  fr_gestion: { label: "Français · propriétaire qui cherche une gestion", axe: "OFFRE : propriétaires en Île-de-France qui cherchent une conciergerie, une gestion Airbnb, une gestion locative, ou qui n'arrivent plus à gérer leur location courte durée.",
    termes: `"cherche conciergerie Airbnb", "quelle conciergerie choisir Paris", "gestion location courte durée avis", "je n'ai plus le temps de gérer mon Airbnb", "déléguer la gestion de mon appartement meublé"` },
  fr_demenagement: { label: "Français · mutation et meublé à Paris", axe: "DEMANDE : personnes et entreprises qui cherchent un logement meublé à Paris ou en Île-de-France pour une mutation, une mission, des travaux ou une formation (bail mobilité, moyenne durée).",
    termes: `"cherche appartement meublé Paris bail mobilité", "mutation Paris logement temporaire", "cherche logement pour stagiaire Paris", "logement pour salariés en mission Île-de-France"` },
};
async function choisirVariante(wsId: string) {
  const { data } = await admin.from("attrey_runs").select("variante, ajoutes").eq("workspace_id", wsId).eq("canal", "web").gte("at", new Date(Date.now() - 60 * 864e5).toISOString());
  const st = new Map<string, { n: number; a: number }>(Object.keys(VARIANTES).map((k) => [k, { n: 0, a: 0 }]));
  for (const r of (data ?? []) as { variante: string; ajoutes: number }[]) { const x = st.get(r.variante); if (x) { x.n++; x.a += r.ajoutes ?? 0; } }
  const peu = [...st].filter(([, v]) => v.n < 3).sort((a, b) => a[1].n - b[1].n);
  if (peu.length) return peu[0][0];
  if (Math.random() < 0.2) return Object.keys(VARIANTES)[Math.floor(Math.random() * Object.keys(VARIANTES).length)];
  return [...st].sort((a, b) => b[1].a / b[1].n - a[1].a / a[1].n)[0][0];
}
/** Coût IA réel d'un passage (somme du journal ai_usage depuis son début). */
async function coutDepuis(wsId: string, feature: string, t0: string) {
  const { data } = await admin.from("ai_usage").select("cost_eur").eq("workspace_id", wsId).eq("feature", feature).gte("at", t0);
  return ((data ?? []) as { cost_eur: number }[]).reduce((s, r) => s + Number(r.cost_eur || 0), 0);
}

export async function attreySearch(ws: Workspace, source: "manuel"|"cron" = "manuel", variante?: string) {
  if (ws.id !== WS_ID) throw new HttpError(403,"Recherche réservée à l'espace Attrey");
  const t0 = new Date().toISOString();
  const v = variante && VARIANTES[variante] ? variante : await choisirVariante(ws.id);
  const V = VARIANTES[v];
  setAi({ws:ws.id,feature:"attrey/recherche"});
  const {data:previous}=await admin.from("attrey_leads").select("source_url")
    .eq("workspace_id",ws.id).order("created_at",{ascending:false}).limit(60);
  const seen=(previous??[]).map(x=>x.source_url).filter(Boolean);
  const cutoff=new Date(Date.now()-75*86400000).toISOString().slice(0,10);
  // Deux temps (comme l'estimation) : la recherche web en texte libre avec ses sources, puis l'extraction en JSON par un modèle léger.
  // Demander directement le JSON après une recherche web faisait recopier le modèle de format, vide.
  const etude = await ask(`Tu es un analyste immobilier chargé de trouver des DEMANDES RÉELLES déjà exprimées publiquement en ligne, pour Attrey Real Estate (Paris et Île-de-France).
Cherche activement sur le web, 5 recherches au plus, sur un seul axe :
${V.axe}
Formulations à essayer (adapte-les, garde la langue) : ${V.termes}.
Sources : Reddit public, forums d'expatriés et de voyage, forums immobiliers, Quora, sites de petites annonces publics. Ne contourne aucune connexion ni restriction et ne recherche pas de coordonnées privées.
Une publication retenue est écrite par une personne qui exprime SON besoin (« je cherche », « we are moving », « I'm looking to buy ») : pas une publicité, un comparatif, un article ou un guide.
Ne retiens QUE les publications entre ${cutoff} et aujourd'hui avec une DATE DE PUBLICATION visible et l'adresse exacte de la page. N'invente jamais ni liens ni budgets ni dates.
Liens déjà enregistrés, à ignorer : ${seen.join(" | ") || "aucun"}.
Réponds en texte : pour chaque publication retenue, une ligne avec le sens (offre ou demande), la catégorie, l'intention, le titre, la ville, la date de publication (AAAA-MM-JJ), le nom du site, l'adresse exacte de la page, le budget et les dates s'ils sont écrits. Si rien de solide, réponds « aucune ».`,{
   maxTokens:3500,
   tools:[{type:"web_search_20250305",name:"web_search",max_uses:5,
     user_location:{type:"approximate",country:"FR",timezone:"Europe/Paris"}}]
 }).catch((e)=>{ console.error("attrey recherche", e); return ""; });
  const scan = etude && !/^\s*aucune\b/i.test(etude) ? await askJson<{opportunities:Row[]}>(`Voici le résultat d'une recherche web. Transforme chaque publication en objet, sans rien inventer : une information absente vaut null, et une publication sans adresse de page ou sans date est ignorée.
Résultat :
${etude.slice(0, 9000)}
Clé attendue : opportunities, liste d'objets avec direction (offre|demande), segment (proprietaire_location|proprietaire_gestion|vendeur|logement_disponible|partenaire|voyageur|locataire|acheteur|entreprise_mobilite|investisseur), intent (location_courte|location_moyenne|location_longue|vente|achat|gestion|partenariat|hebergement|investissement|autre), title, description, city, country_origin, source_name, source_url, source_published_at (AAAA-MM-JJ), budget_min, budget_max, budget_period (total|nuit|mois|achat), date_start, date_end.`,
   { fast:true, maxTokens:3000 }).catch(()=>null) : null;
 const candidates=Array.isArray(scan?.opportunities)?scan.opportunities:[];
 const urls=new Set(seen);
 const rows=candidates.map(normalize).filter((r):r is NonNullable<typeof r>=>!!r)
   .filter(r=>{if(urls.has(r.source_url))return false;urls.add(r.source_url);return true;})
   .slice(0,10).map(r=>({...r,workspace_id:ws.id,canal:"web",variante:v}));
 let added=0;
 if(rows.length){
   // Les conflits ne doivent jamais écraser la qualification humaine existante.
   const {data,error}=await admin.from("attrey_leads")
     .upsert(rows,{onConflict:"workspace_id,source_url",ignoreDuplicates:true}).select("id");
   if(error)throw new HttpError(500,error.message);
   added=data?.length??0;
 }
 const cout = await coutDepuis(ws.id, "attrey/recherche", t0);
 await admin.from("attrey_runs").insert({ workspace_id: ws.id, canal: "web", variante: v, declenchement: source, recherches: 1, candidats: candidates.length, ajoutes: added, cout_eur: cout });
 const {error:stateError}=await admin.from("attrey_scan_state").upsert({
   workspace_id:ws.id,last_scan_at:new Date().toISOString(),last_added:added,
   last_error:null,updated_at:new Date().toISOString()
 },{onConflict:"workspace_id"});
 if(stateError) throw new HttpError(500,stateError.message);
 await log(ws.id,"radar",`Attrey : ${added} nouvelle(s) piste(s) web à vérifier (${V.label}), lancement ${source}`);
 return {ok:true,scanned:candidates.length,eligible:rows.length,added,source,variante:V.label,cout_eur:Math.round(cout*1000)/1000};
}

// ---------------------------------------------------------------- Forums d'expatriés (lecture directe, sans recherche web payante)
// Les pages de liste des forums sont lues telles quelles (gratuit), seuls les titres nouveaux passent au tri par un modèle léger,
// puis les sujets retenus sont ouverts pour leur date et leur texte. On ne répond jamais à la place de Jean.
const FORUMS = [
  { nom: "Expat.com · Paris (EN)", url: "https://www.expat.com/en/forum/europe/france/paris/" },
  { nom: "Expat.com · France (EN)", url: "https://www.expat.com/en/forum/europe/france/" },
  { nom: "Expat.com · Paris (FR)", url: "https://www.expat.com/fr/forum/europe/france/paris/" },
  { nom: "Expat.com · France (FR)", url: "https://www.expat.com/fr/forum/europe/france/" },
];
const UA = { "User-Agent": "Mozilla/5.0 (compatible; BingooVeille/1.0; +https://kairo.maisonravita.fr)", "Accept-Language": "fr,en;q=0.8" };
async function page(u: string) {
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(15000) }).catch(() => null);
  return r?.ok ? await r.text() : "";
}
const decode = (t: string) => t.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

export async function attreyForums(ws: Workspace, source: "manuel"|"cron" = "manuel") {
  if (ws.id !== WS_ID) throw new HttpError(403,"Recherche réservée à l'espace Attrey");
  const t0 = new Date().toISOString();
  setAi({ ws: ws.id, feature: "attrey/forums" });
  // 1. Sujets des pages de liste (titre lisible dans l'adresse)
  const sujets = new Map<string, { url: string; titre: string; forum: string }>();
  const pages = await Promise.all(FORUMS.map(async (f) => ({ f, html: await page(f.url) })));
  for (const { f, html } of pages) {
    for (const m of html.matchAll(/<a[^>]+href="(https:\/\/www\.expat\.com\/(?:en|fr)\/forum\/europe\/france\/(?:[a-z-]+\/)?(\d+)-([a-z0-9-]+)\.html)"[^>]*>([\s\S]{0,300}?)<\/a>/g)) {
      if (sujets.has(m[2])) continue;
      const texte = decode(m[4].replace(/<[^>]+>/g, " "));
      sujets.set(m[2], { url: m[1], titre: texte.length > 8 ? texte : m[3].replace(/-/g, " "), forum: f.nom });
    }
  }
  // 2. Seulement les sujets jamais vus
  const tous = [...sujets.values()];
  const { data: vus } = await admin.from("attrey_vus").select("url").eq("workspace_id", ws.id).in("url", tous.map((s) => s.url));
  const deja = new Set(((vus ?? []) as { url: string }[]).map((x) => x.url));
  const nouveaux = tous.filter((s) => !deja.has(s.url)).slice(0, 80);
  if (nouveaux.length) await admin.from("attrey_vus").upsert(nouveaux.map((s) => ({ workspace_id: ws.id, url: s.url })), { onConflict: "workspace_id,url", ignoreDuplicates: true });
  // 3. Tri des titres (français et anglais) : besoin de logement, déménagement, achat, gestion
  const tri = nouveaux.length ? await askJson<{ garder: number[] }>(`Voici des titres de sujets de forums d'expatriés en France. Garde uniquement ceux où l'auteur exprime probablement un besoin immobilier personnel ou professionnel :
- chercher un logement à louer à Paris ou en Île-de-France (meublé, moyenne durée, colocation exclue sauf logement entier), « looking for an apartment », « housing », « accommodation », « flat », « rent » ;
- un déménagement ou une mutation vers Paris (« moving to Paris », « relocating », « mutation ») ;
- un projet d'achat (« buying property », « acheter un appartement », « mortgage as a foreigner ») ;
- un propriétaire qui cherche à louer ou à faire gérer son bien.
Écarte les sujets sur les visas, la langue, les sorties, l'emploi, la santé, les démarches sans lien avec le logement.
Titres :
${nouveaux.map((s, i) => `${i}. ${s.titre}`).join("\n")}
Clé attendue : garder, liste des numéros retenus (liste vide si aucun).`, { fast: true, maxTokens: 400 }).catch(() => ({ garder: [] })) : { garder: [] };
  const retenus = [...new Set((tri.garder ?? []).map(Number))].filter((i) => nouveaux[i]).slice(0, 12).map((i) => nouveaux[i]);
  // 4. Ouverture des sujets retenus : date de publication et premier message
  const fiches = await Promise.all(retenus.map(async (s) => {
    const html = await page(s.url);
    const date = html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
    const texte = decode((html.match(/<meta[^>]+(?:property="og:description"|name="description")[^>]+content="([^"]*)"/)?.[1] ?? "")).slice(0, 600);
    return { s, date, texte };
  }));
  const recents = fiches.filter((f) => f.date && Date.now() - Date.parse(f.date) <= 75 * 864e5);
  const det = recents.length ? await askJson<{ pistes: Row[] }>(`Pour chaque sujet de forum ci-dessous, décide s'il s'agit d'un besoin immobilier exprimé par son auteur, et remplis les champs sans rien inventer (null si absent). Écarte ceux qui ne sont pas un besoin réel.
${recents.map((f, i) => `#${i} | titre : ${f.s.titre} | adresse : ${f.s.url} | date : ${f.date} | début du message : ${f.texte}`).join("\n")}
Clé attendue : pistes, liste d'objets avec direction (offre si un propriétaire propose ou veut faire gérer un bien, demande si quelqu'un cherche un logement ou veut acheter), segment (proprietaire_location|proprietaire_gestion|vendeur|logement_disponible|partenaire|voyageur|locataire|acheteur|entreprise_mobilite|investisseur), intent (location_courte|location_moyenne|location_longue|vente|achat|gestion|partenariat|hebergement|investissement|autre), title (le besoin en une phrase en français), description (2 phrases en français), city (ville citée, sinon « Paris » seulement si le forum est celui de Paris, sinon null), country_origin, source_name, source_url (l'adresse donnée), source_published_at (la date donnée), budget_min, budget_max, budget_period, date_start, date_end.`, { fast: true, maxTokens: 2500 }).catch(() => ({ pistes: [] })) : { pistes: [] };
  const lignes = (det.pistes ?? []).map((x) => normalize({ ...x, source_name: x.source_name || "Expat.com" } as Row))
    .filter((r): r is NonNullable<typeof r> => !!r && recents.some((f) => f.s.url === r.source_url))
    .map((r) => ({ ...r, workspace_id: ws.id, canal: "forums", variante: "expat.com", contact_route: "reponse_publique" }));
  let added = 0;
  if (lignes.length) {
    const { data, error } = await admin.from("attrey_leads").upsert(lignes, { onConflict: "workspace_id,source_url", ignoreDuplicates: true }).select("id");
    if (error) throw new HttpError(500, error.message);
    added = data?.length ?? 0;
  }
  const cout = await coutDepuis(ws.id, "attrey/forums", t0);
  await admin.from("attrey_runs").insert({ workspace_id: ws.id, canal: "forums", variante: "expat.com", declenchement: source, recherches: 1, candidats: nouveaux.length, ajoutes: added, cout_eur: cout });
  return { ok: true, sujets: tous.length, nouveaux: nouveaux.length, retenus: retenus.length, recents: recents.length, added, cout_eur: Math.round(cout * 1000) / 1000 };
}
