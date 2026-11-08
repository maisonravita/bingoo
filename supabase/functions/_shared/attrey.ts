// Attrey Real Estate — recherche web de demandes immobilières ouvertes.
// Utilise le moteur web déjà intégré à Bingoo! et conserve les sources exactes.
// Aucune prise de contact automatique et aucune collecte de coordonnées privées.
import { HttpError } from "./http.ts";
import { admin, askJson, log, setAi, type Workspace } from "./core.ts";

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
export async function attreySearch(ws: Workspace, source: "manuel"|"cron" = "manuel") {
  if (ws.id !== WS_ID) throw new HttpError(403,"Recherche réservée à l'espace Attrey");
  setAi({ws:ws.id,feature:"attrey/recherche"});
  const {data:previous}=await admin.from("attrey_leads").select("source_url")
    .eq("workspace_id",ws.id).order("created_at",{ascending:false}).limit(60);
  const seen=(previous??[]).map(x=>x.source_url).filter(Boolean);
  const cutoff=new Date(Date.now()-75*86400000).toISOString().slice(0,10);
  const scan = await askJson<{opportunities:Row[]}>(`Tu es un analyste immobilier chargé de trouver des DEMANDES RÉELLES déjà exprimées publiquement en ligne, françaises ET internationales, pour Attrey Real Estate.
Cherche activement sur le web avec les outils de recherche disponibles. Utilise au maximum 6 recherches réparties entre 2 axes :
AXE OFFRE : propriétaires en France voulant louer leur appartement, demandes explicites de gestion locative ou de conciergerie, vendeurs avec demande de vente, professionnels proposant une collaboration.
AXE DEMANDE : voyageurs internationaux (notamment US/UK/Canada), expatriés et locataires cherchant activement un logement à Paris/Île-de-France, personnes qui cherchent à ACHETER en France (Paris, Nice, Cannes, Côte d'Azur), services de mobilité pour salariés, sociétés/investisseurs cherchant à acquérir un bien.

Termes anglais : "looking for furnished apartment Paris", "moving to Paris apartment budget", "looking to buy property in France", "corporate accommodation Paris".
Termes français : "cherche appartement meublé Paris budget", "cherche gestion Airbnb Paris", "achat appartement Nice recherche", "investisseur recherche immeuble Paris".
Sources : Reddit public, forums voyage, forums expatriés, forums immobiliers, sites professionnels et demandes publiques indexables. Ne contourne aucune connexion ni restriction et ne recherche pas de coordonnées privées.
Chaque élément DOIT être une demande explicite, non une publicité, un catalogue, un article ou un conseil touristique vague. Pour offre: une annonce de vente publique peut être une offre mais ne doit pas être présentée comme une demande de conciergerie.
Ne retiens QUE les publications entre ${cutoff} et aujourd'hui avec une DATE DE PUBLICATION vérifiable, une URL HTTPS pointant précisément à la publication. N'invente jamais ni liens ni budgets ni dates. Si l'information manque, null.
Les liens déjà enregistrés sont exclus : ${seen.join(" | ") || "aucun"}.
L'intention exacte et la ville doivent être lisibles dans la source. Le pays d'origine est null sauf si explicitement indiqué. 0 à 10 opportunités, liste vide si rien de solide.
Format JSON strict : {"opportunities":[{"direction":"offre|demande","segment":"proprietaire_location|proprietaire_gestion|vendeur|logement_disponible|partenaire|voyageur|locataire|acheteur|entreprise_mobilite|investisseur","intent":"location_courte|location_moyenne|location_longue|vente|achat|gestion|partenariat|hebergement|investissement|autre","title":"","description":"","city":"","country_origin":null,"source_name":"","source_url":"https://...","source_published_at":"YYYY-MM-DD","budget_min":null,"budget_max":null,"budget_period":null,"date_start":null,"date_end":null}]}
N'ajoute aucun commentaire hors JSON.`,{
   maxTokens:6500,
   tools:[{type:"web_search_20250305",name:"web_search",max_uses:6,
     user_location:{type:"approximate",country:"FR",timezone:"Europe/Paris"}}]
 });
 const candidates=Array.isArray(scan?.opportunities)?scan.opportunities:[];
 const urls=new Set(seen);
 const rows=candidates.map(normalize).filter((r):r is NonNullable<typeof r>=>!!r)
   .filter(r=>{if(urls.has(r.source_url))return false;urls.add(r.source_url);return true;})
   .slice(0,10).map(r=>({...r,workspace_id:ws.id}));
 let added=0;
 if(rows.length){
   // Les conflits ne doivent jamais écraser la qualification humaine existante.
   const {data,error}=await admin.from("attrey_leads")
     .upsert(rows,{onConflict:"workspace_id,source_url",ignoreDuplicates:true}).select("id");
   if(error)throw new HttpError(500,error.message);
   added=data?.length??0;
 }
 await admin.from("workspaces").update({
   radar_cfg:{...((ws as Workspace & {radar_cfg?:Record<string,unknown>}).radar_cfg??{}),
     attrey_last_scan_at:new Date().toISOString(),attrey_last_scan_count:added}
 }).eq("id",ws.id);
 await log(ws.id,"radar",`Attrey : ${added} nouvelle(s) piste(s) web à vérifier, lancement ${source}`);
 return {ok:true,scanned:candidates.length,eligible:rows.length,added,source};
}
