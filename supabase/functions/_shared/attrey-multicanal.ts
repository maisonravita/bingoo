// Attrey — exploration de TOUS les domaines publics en deux lots de cinq.
// Ce module ne se connecte pas aux comptes privés et n'assure pas l'indexation des annonces.
// Une tentative consignée n'est pas une preuve que la plateforme a répondu.
import { ask, askJson, admin, setAi, type Workspace } from "./core.ts";
import { candidateUrl, publicLinks, saveCandidates } from "./attrey-candidates.ts";

const WS_ID = "4e9c20f1-84bb-4854-aca7-adcdc2bc8bfd";
const GROUPS = [
  [
    {key:"allovoisins",host:"allovoisins.com",query:'site:allovoisins.com "cherche" "conciergerie" Paris',desc:"demande publique de gestion locative ou remise de clés"},
    {key:"reddit",host:"reddit.com",query:'site:reddit.com "looking for apartment" "Paris"',desc:"demande personnelle de logement ou d'achat"},
    {key:"facebook",host:"facebook.com",query:'site:facebook.com "looking for apartment" "Paris"',desc:"publication publique de demande de logement"},
    {key:"linkedin",host:"linkedin.com",query:'site:linkedin.com/posts "relocation" "Paris" "housing"',desc:"demande B2B de logement ou partenaire"},
    {key:"forums",host:"expat.com",query:'site:expat.com/en/forum/europe/france/paris "apartment"',desc:"forum public d'expatriés cherchant un logement"},
  ],
  [
    {key:"leboncoin",host:"leboncoin.fr",query:'site:leboncoin.fr/ad/locations "Paris" "particulier"',desc:"annonce immobilière publique de location"},
    {key:"pap",host:"pap.fr",query:'site:pap.fr/annonces "location" "Paris" appartement',desc:"annonce publique propriétaire particulier"},
    {key:"seloger",host:"seloger.com",query:'site:seloger.com/annonces/ "Paris" "meublé"',desc:"annonce de bien immobilier"},
    {key:"airbnb",host:"airbnb.fr",query:'site:airbnb.fr/rooms "Paris" logement entier',desc:"annonce publique de logement, pas une demande de gestion"},
    {key:"abritel",host:"abritel.fr",query:'site:abritel.fr/location-vacances "Paris" appartement',desc:"annonce de location saisonnière, pas une demande de gestion"},
  ],
] as const;
type Finding={source_url:string;title?:string;description?:string;city?:string|null;
  direction?:"offre"|"demande";segment?:string;intent?:string;
  source_published_at?:string|null;source_name?:string};
type Output={opportunities?:Finding[]};
const OFFRE=new Set(["proprietaire_location","proprietaire_gestion","vendeur","logement_disponible","partenaire"]);
const DEMANDE=new Set(["voyageur","locataire","acheteur","entreprise_mobilite","investisseur"]);
const INTENTS=new Set(["location_courte","location_moyenne","location_longue","vente","achat","gestion","partenariat","hebergement","investissement","autre"]);
const trim=(value:unknown,max:number)=>typeof value==="string"?value.trim().slice(0,max):"";
const dateValue=(d:unknown)=>{
  if(typeof d!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(d))return null;
  const t=Date.parse(d+"T00:00:00Z");
  if(!Number.isFinite(t)||t>Date.now()||Date.now()-t>75*86400000)return null;
  return d;
};
function platform(url:string) {
  for(const p of GROUPS.flat()){
    if(candidateUrl(url,p.host))return p.key;
  }
  return null;
}
export async function attreyMultiScan(ws:Workspace,source:"manuel"|"cron"="manuel"){
  if(ws.id!==WS_ID)throw new Error("Espace Attrey uniquement");
  const start=new Date().toISOString();
  setAi({ws:ws.id,feature:"attrey/multicanal"});
  const results:Record<string,{passages:number;liens:number;ajoutes:number;status:string;detail:string|null}>={};
  const rawTexts:string[]=[];
  const bySource=new Map<string,ReturnType<typeof publicLinks>>();
  const {data:old}=await admin.from("attrey_leads").select("source_url").eq("workspace_id",ws.id).limit(100);
  const known=new Set((old??[]).map(r=>r.source_url).filter(Boolean));

  // Deux lots fixes : chaque requête demande cinq recherches avec opérateur site:.
  // Les résultats réellement identifiés sont contrôlés PAR DOMAINE, sans inventer un statut connecté.
  for(const group of GROUPS){
    const instructions=group.map((p,i)=>`${i+1}. ${p.query} — ${p.desc}`).join("\n");
    let content="";
    let issue:string|null=null;
    try {
      content=await ask(`Tu cherches des pistes IMMOBILIÈRES PUBLIQUES pour Attrey Real Estate en France.
Effectue cinq recherches web DISTINCTES, une par ligne de la liste suivante, à l'aide de l'outil web :
${instructions}
Ne remplace pas une plateforme par une autre. Pour chacune, donne 1 à 5 liens HTTPS DIRECTS vers
des publications ou annonces pertinentes, avec titre et contexte ; indique si la date n'est pas connue.
Une annonce Airbnb n'indique pas un besoin de gestion. Pas de groupe privé, pas de messagerie,
pas de coordonnées privées, pas de contournement de restrictions.
Si une plateforme ne renvoie aucun lien direct, écris « aucun lien exploitable » pour elle.
Ne fabrique jamais de liens, dates ou besoins. Réponds en texte, pas en JSON.`,{
        maxTokens:3600,
        tools:[{type:"web_search_20250305",name:"web_search",max_uses:5,
          user_location:{type:"approximate",country:"FR",timezone:"Europe/Paris"}}]
      });
    }catch(e){issue=String(e instanceof Error?e.message:e).slice(0,180);}
    rawTexts.push(content);
    for(const p of group){
      const links=publicLinks(content,p.host).slice(0,12);
      bySource.set(p.key,links);
      results[p.key]={passages:1,liens:links.length,ajoutes:0,
        status:issue?"erreur":links.length?"liens_trouves":"aucun_lien",detail:issue};
      // Aucun résultat n'est qualifié sans contrôle humain de la source.
      if(links.length)await saveCandidates(ws.id,"web",p.key,links);
    }
  }
  // Une seule qualification légère pour les deux lots ; n'utiliser que les URL présentes dans le résultat web.
  const grounded=new Set([...bySource.values()].flat().map(x=>x.source_url));
  let candidates:Finding[]=[];
  if(grounded.size){
    try {
      const parsed=await askJson<Output>(`À partir des liens publics observés, relève seulement les demandes
ou annonces immobilières pertinentes. Ne conserve que des liens EXACTEMENT présents dans ce texte.
Une demande de conciergerie doit être explicite ; une annonce est seulement un bien disponible,
jamais une demande de gestion. La date de publication inconnue vaut null ; aucune supposition.
${rawTexts.join("\n").slice(0,13000)}
JSON attendu : opportunities: liste avec source_url, title, description, city, direction (offre|demande),
segment (proprietaire_location|proprietaire_gestion|vendeur|logement_disponible|partenaire|voyageur|locataire|acheteur|entreprise_mobilite|investisseur),
intent (location_courte|location_moyenne|location_longue|vente|achat|gestion|partenariat|hebergement|investissement|autre),
source_published_at au format AAAA-MM-JJ ou null, source_name.`,{fast:true,maxTokens:2800});
      candidates=Array.isArray(parsed?.opportunities)?parsed.opportunities:[];
    }catch(e){console.error("attrey qualification multicanal",e);}
  }
  const validRows=[] as Record<string,unknown>[];
  const seen=new Set<string>();
  for(const item of candidates){
    const url=candidateUrl(item.source_url);
    const p=url?platform(url):null;
    const d=dateValue(item.source_published_at);
    const title=trim(item.title,240),city=trim(item.city,100);
    if(!url||!p||!grounded.has(url)||!d||title.length<14||!city||seen.has(url)||known.has(url))continue;
    if(item.direction!=="offre"&&item.direction!=="demande")continue;
    if(item.direction==="offre"&&!OFFRE.has(item.segment??""))continue;
    if(item.direction==="demande"&&!DEMANDE.has(item.segment??""))continue;
    // Ne jamais présenter une annonce de logement comme un propriétaire qui cherche une gestion.
    if(["airbnb","abritel","leboncoin","pap","seloger"].includes(p)&&item.direction==="offre"
      &&!["vendeur","logement_disponible"].includes(item.segment??""))continue;
    seen.add(url);
    validRows.push({workspace_id:ws.id,canal:"web",variante:p,source_url:url,
      direction:item.direction,segment:item.segment,intent:INTENTS.has(item.intent??"")?item.intent:"autre",
      title,description:trim(item.description,700)||null,city,source_name:trim(item.source_name,100)||p,
      source_published_at:d,evidence_level:"a_verifier",contact_route:"a_verifier",status:"a_verifier",
      priority:"moyenne"});
  }
  if(validRows.length){
    const {data,error}=await admin.from("attrey_leads").upsert(validRows,{onConflict:"workspace_id,source_url",ignoreDuplicates:true}).select("id,variante");
    if(error)throw new Error("Impossible d'enregistrer les pistes qualifiées : "+error.message);
    for(const x of data??[]){if(results[x.variante])results[x.variante].ajoutes++;}
  }
  // Une ligne par source et par lancement, y compris les recherches sans résultat.
  const {data:usage}=await admin.from("ai_usage").select("cost_eur").eq("workspace_id",ws.id)
    .eq("feature","attrey/multicanal").gte("at",start);
  const cost=(usage??[]).reduce((n,r)=>n+Number(r.cost_eur||0),0);
  const rows=GROUPS.flat().map(p=>({
    workspace_id:ws.id,canal:"web",variante:p.key,declenchement:source,
    recherches:1,candidats:results[p.key].liens,ajoutes:results[p.key].ajoutes,
    cout_eur:Math.round(cost/10*100000)/100000,
    scan_status:results[p.key].status,scan_detail:results[p.key].detail
  }));
  const {error:logError}=await admin.from("attrey_runs").insert(rows);
  if(logError)throw new Error("Journal multicanal non enregistré : "+logError.message);
  const added=Object.values(results).reduce((n,x)=>n+x.ajoutes,0);
  const totalLinks=grounded.size;
  const {error:stateError}=await admin.from("attrey_scan_state").upsert({
    workspace_id:ws.id,last_scan_at:new Date().toISOString(),last_added:added,
    last_error:null,updated_at:new Date().toISOString()
  },{onConflict:"workspace_id"});
  if(stateError)throw new Error(stateError.message);
  return {ok:true,multicanal:true,passages:2,platforms:results,liens_detectes:totalLinks,
    liens_archives:totalLinks,added,cout_eur:Math.round(cost*1000)/1000};
}
