// Attrey: classification fondée sur le contenu PUBLIC réellement lisible.
// L'absence de page accessible ne devient jamais une fausse demande de conciergerie.
import { admin, askJson, setAi, type Workspace } from "./core.ts";
import { candidateUrl } from "./attrey-candidates.ts";

const WORKSPACE="4e9c20f1-84bb-4854-aca7-adcdc2bc8bfd";
const HOSTS=["allovoisins.com","leboncoin.fr","pap.fr","seloger.com","airbnb.fr","abritel.fr",
  "reddit.com","expat.com","facebook.com","linkedin.com","airbnb.com","vrbo.com"];
const TYPES=[
  "cherche_conciergerie_airbnb","cherche_gestion_locative","cherche_menage_cles",
  "propose_location_courte","propose_location_longue","vend_bien",
  "cherche_location","cherche_achat","cherche_location_saisonniere",
  "entreprise_relocalisation","partenaire_professionnel","page_categorie",
  "discussion_generale","autre","inconnu"
] as const;
type Category=(typeof TYPES)[number];
type Item={source_url:string;opportunity_type:Category;intent_summary:string;evidence_excerpt:string};
const allowed=(url:string)=>{
  const u=candidateUrl(url);if(!u)return false;
  const h=new URL(u).hostname.toLowerCase();
  return HOSTS.some(host=>h===host||h.endsWith("."+host));
};
const plain=(s:string)=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&")
  .replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g," ").trim();
function extract(html:string){
  const title=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]??"";
  const meta=html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)/i)?.[1]
    ??html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)/i)?.[1]??"";
  const structural=html.match(/<(?:h1|h2|p|article)[^>]*>[\s\S]*?<\/(?:h1|h2|p|article)>/gi)?.slice(0,50).join(" ")??"";
  return plain([title,meta,structural].join(" ")).slice(0,3500);
}
async function readablePage(link:string){
  if(!allowed(link))return null;
  try{
    const r=await fetch(link,{headers:{"User-Agent":"Mozilla/5.0 (compatible; AttreyPublicResearch/1.0)",
      "Accept":"text/html","Accept-Language":"fr,en;q=0.8"},
      redirect:"manual",signal:AbortSignal.timeout(9000)});
    const type=r.headers.get("content-type")??"";
    if(!r.ok||!type.toLowerCase().includes("text/html"))return null;
    const body=(await r.text()).slice(0,180000);
    const text=extract(body);
    return text.length>85?text:null;
  }catch{return null;}
}
function generalType(url:string):Category{
  const u=new URL(url);
  const path=u.pathname;
  if(u.hostname.endsWith("allovoisins.com")&&/^\/v\/(?:si\/)?/i.test(path))return "page_categorie";
  return "inconnu";
}
export async function classifyAttreyCandidates(ws:Workspace,ids?:string[]){
  if(ws.id!==WORKSPACE)throw new Error("Espace Attrey uniquement");
  const wanted=Array.isArray(ids)?ids.filter(x=>/^[a-f\d-]{36}$/i.test(x)).slice(0,8):[];
  let query=admin.from("attrey_candidates")
    .select("id,source_url,title,excerpt,opportunity_type,classification_status")
    .eq("workspace_id",ws.id).order("first_seen_at",{ascending:false}).limit(8);
  if(wanted.length)query=query.in("id",wanted);
  else query=query.or("classification_status.eq.non_analyse,classification_status.is.null");
  const {data,error}=await query;
  if(error)throw new Error(error.message);
  const rows=(data??[]).filter(x=>allowed(x.source_url));
  if(!rows.length)return {ok:true,analyses:0,precises:0,indisponibles:0};
  const pages=await Promise.all(rows.map(async row=>({...row,body:await readablePage(row.source_url)})));
  const readable=pages.filter(x=>x.body);
  let predicted:Item[]=[];
  if(readable.length){
    setAi({ws:ws.id,feature:"attrey/classification"});
    try{
      const result=await askJson<{items:Item[]}>(`Tu es analyste de prospection pour Attrey Real Estate. Classe CHAQUE URL selon les faits
visibles sur sa page. NE CONFONDS JAMAIS :
- une annonce Airbnb (propose_location_courte) et un propriétaire qui DEMANDE une conciergerie
  (cherche_conciergerie_airbnb) ; il faut un besoin explicite pour le deuxième ;
- une annonce d'un propriétaire qui LOUE (propose_location_longue) et une personne qui CHERCHE
  une location (cherche_location) ;
- une personne qui VEND (vend_bien) et une qui veut ACHETER (cherche_achat) ;
- une page générale de catégorie AlloVoisins (page_categorie) et une demande concrète ;
- une ancienne publication commerciale (partenaire_professionnel) et un besoin immobilier actuel.
Valeurs permises opportunity_type : ${TYPES.join(" | ")}.
Pour chaque item : source_url exactement tel que fourni, opportunity_type, intent_summary
(une phrase française factuelle de 160 caractères maximum : QUI propose ou cherche QUOI),
evidence_excerpt (citation exacte, CONTIGUË, de 15 à 180 caractères du contenu fourni).
Si la demande n'est pas établie, utiliser inconnu, discussion_generale ou page_categorie.
Si tu ne peux pas citer une preuve textuelle adéquate, utiliser inconnu.
N'invente jamais la date, la ville, le prix, le propriétaire ni les coordonnées.
PAGES :
${readable.map(x=>`URL: ${x.source_url}\nCONTENU PUBLIC: ${x.body}`).join("\n---\n").slice(0,18000)}
Réponds uniquement en JSON avec la clé items.`,{fast:true,maxTokens:3000});
      predicted=Array.isArray(result?.items)?result.items:[];
    }catch(e){console.error("attrey classification IA",e);}
  }
  let precise=0,unavailable=0;
  for(const item of pages){
    const matched=predicted.find(p=>p.source_url===item.source_url);
    const category=matched&&TYPES.includes(matched.opportunity_type)?matched.opportunity_type:"inconnu";
    const quote=matched?.evidence_excerpt?.trim().slice(0,180)??"";
    // Sans preuve effectivement présente dans la page publique, aucune qualification positive.
    const proof=!!(item.body && quote.length>=15 && item.body.toLowerCase().includes(quote.toLowerCase()));
    const type=generalType(item.source_url)==="page_categorie"?"page_categorie":proof?category:"inconnu";
    const status=!item.body?"contenu_inaccessible":type==="inconnu"?"insuffisant":"analyse_texte";
    if(status==="analyse_texte")precise++;
    if(status==="contenu_inaccessible")unavailable++;
    const summary=type==="page_categorie"
      ?"Rubrique de services : aucune demande individuelle de conciergerie n'est établie."
      :proof&&type!=="inconnu"?matched!.intent_summary?.trim().slice(0,240)||null:null;
    const {error:e}=await admin.from("attrey_candidates").update({
      opportunity_type:type,intent_summary:summary,evidence_excerpt:proof?quote:null,
      classification_source:status==="analyse_texte"?"page_publique":status==="contenu_inaccessible"?"url_uniquement":"preuve_insuffisante",
      classification_status:status,classified_at:new Date().toISOString()
    }).eq("workspace_id",ws.id).eq("id",item.id);
    if(e)throw new Error(e.message);
  }
  return {ok:true,analyses:pages.length,precises:precise,indisponibles:unavailable};
}
