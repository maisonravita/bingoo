// Attrey : recherche ciblée d'extraits publics INDEXÉS. Aucun scraping Airbnb.
// Un extrait indexé n'est jamais un avis authentifié et doit être confirmé manuellement.
import {admin,ask,setAi,type Workspace} from "./core.ts";
import {saveCandidates} from "./attrey-candidates.ts";
import {HttpError} from "./http.ts";
const W="4e9c20f1-84bb-4854-aca7-adcdc2bc8bfd";
type Cat="menage"|"accueil_cles"|"communication"|"entretien";
type Signal={listing_url:string;review_excerpt:string;category:Cat;source_url:string;city:string;context:string};
const cats:Record<Cat,RegExp>={
menage:/sale|dirty|filthy|unclean|poussi|dust|drap|sheet|linge|linen|tache|stain|m[eé]nage|clean|odor|odeur|moisiss|mold|cafard|toilette|bathroom/i,
accueil_cles:/arriv|check.?in|check.?out|cl[eé]s|keys?|lockbox|access|accueil|instructions/i,
communication:/communication|r[eé]pon|reply|respond|injoignable|unreachable|h[oô]te|host|messag|contact/i,
entretien:/panne|cass[eé]|broken|repair|maintenance|entretien|chauffage|heating|eau chaude|hot water|climatisation|fuite|leak|wifi|equipment|[eé]quipement/i
};
const bad=/pas |jamais |mal |d[eé]cev|sale|dirty|filthy|unclean|poussi|dust|mauvais|manqu|cass[eé]|panne|fuite|broken|didn.t|wasn.t|not |never |no |poor|bad |worst|terrible|awful|horrible|unresponsive|rude|late|difficult|difficile|probl[eè]me|problem|odor|odeur|moisiss|mold|unreachable|injoignable|waited/i;
function listing(input:unknown){
 if(typeof input!=="string")return null;
 try{
  const u=new URL(input.trim());
  const h=u.hostname.toLowerCase();
  if(u.protocol!=="https:"||u.username||u.password||
  !["airbnb.fr","airbnb.com","airbnb.co.uk"].some(x=>h===x||h.endsWith("."+x)))return null;
  const m=u.pathname.match(/^\/rooms\/(\d+)(?:\/|$)/);
  return m?"https://www.airbnb.fr/rooms/"+m[1]:null;
 }catch{return null;}
}
const trim=(s:string,n:number)=>s.replace(/\s+/g," ").trim().slice(0,n);
export function parseIndexedSignals(raw:string):Signal[]{
 const found:Signal[]=[],seen=new Set<string>();
 for(const block of raw.split(/(?:^|\n)---(?:\n|$)/)){
  const fields:Record<string,string>={};
  for(const line of block.split("\n")){
   const m=line.trim().match(/^(ANNONCE|VILLE|CATEGORIE|AVIS|CONTEXTE)\s*:\s*(.*)$/i);
   if(m)fields[m[1].toUpperCase()]=m[2].trim();
  }
  const url=listing(fields.ANNONCE);
  const quote=trim(fields.AVIS||"",220).replace(/^["«]|["»]$/g,"").trim();
  const category=fields.CATEGORIE as Cat,city=trim(fields.VILLE||"",90);
  if(!url||!Object.hasOwn(cats,category)||!/\bparis\b/i.test(city)||
      quote.length<28||!bad.test(quote)||!cats[category].test(quote)||
      /exemple fictif|sample review|example review|invent[eé]/i.test(quote))continue;
  const key=url+"|"+category+"|"+quote.toLowerCase();
  if(seen.has(key))continue;seen.add(key);
  found.push({listing_url:url,review_excerpt:quote,category,source_url:url,
   city,context:trim(fields.CONTEXTE||"",300)});
  if(found.length>=8)break;
 }
 return found;
}
export async function attreyAirbnbIndexedSearch(ws:Workspace,source:"manuel"|"cron"="manuel"){
 if(ws.id!==W)throw new HttpError(403,"Espace Attrey uniquement");
 setAi({ws:ws.id,feature:"attrey/airbnb-index"});
 const prompt=[
  "Recherche dans les résultats web INDEXÉS (sans scraper Airbnb) des avis négatifs",
  "sur des logements Airbnb situés à Paris intra-muros. Deux recherches web maximum:",
  'site:airbnb.fr/rooms Paris "sale" "propreté" avis',
  'site:airbnb.com/rooms Paris "dirty" "check-in" "host" review',
  "Conditions strictes : lien DIRECT réel /rooms/NUMERO, Paris explicite dans la source,",
  "et EXTRAIT TEXTUEL d'un avis négatif de voyageur visible dans les résultats indexés,",
  "relié sans ambiguïté à CETTE annonce. Ne jamais inférer la présence d'avis",
  "de la description, des équipements, d'une mauvaise note, ou d'un article générique.",
  "N'invente aucun lien, aucune citation, aucune note ni identité.",
  "N'utilise pas de messages privés ni de connexion. N'essaie pas de parcourir tout Airbnb.",
  "Si un extrait n'est pas montré explicitement, ignore le logement.",
  "Format exact, jusqu'à 8 blocs séparés par une ligne --- :",
  "ANNONCE: URL Airbnb exacte réellement retrouvée (ne jamais inventer de numéro)",
  "VILLE: Paris (uniquement si confirmé explicitement)",
  "CATEGORIE: menage OU accueil_cles OU communication OU entretien",
  "AVIS: citation exacte d'un commentaire négatif indexé, sans reformulation",
  "CONTEXTE: origine et limites de cet extrait",
  "Si aucun extrait solide, réponds uniquement AUCUN. Ne fournis aucun exemple fictif."
 ].join("\n");
 const t0=new Date().toISOString();
 // Avec 4 recherches et 2700 jetons, Anthropic renvoyait max_tokens sans aucun texte,
 // malgré une facturation d'environ 0,20 € par tentative. Deux recherches et une
 // fenêtre de sortie plus large évitent ce blocage, sans multiplier les appels.
 let raw="";
 try {
  raw=await ask(prompt,{fast:true,maxTokens:6500,tools:[{type:"web_search_20250305",
   name:"web_search",max_uses:2,user_location:{type:"approximate",country:"FR",timezone:"Europe/Paris"}}]});
 } catch(e) {
  if(!(e instanceof HttpError) || !/aucun texte \(max_tokens\)/i.test(e.message))throw e;
  console.warn("Attrey Airbnb: Anthropic a atteint max_tokens avant réponse exploitable");
  await admin.from("attrey_runs").insert({
   workspace_id:ws.id,canal:"web",variante:"airbnb",declenchement:source,
   recherches:1,candidats:0,ajoutes:0,scan_status:"erreur",
   scan_detail:"L'IA a épuisé son budget de génération sans fournir de résultats"
  });
  return {ok:false,liens_detectes:0,signals_found:0,added:0,
   mode:"recherche_interrompue",reason:"max_tokens",
   note:"Claude a effectué une recherche mais n'a pas fourni de résultat exploitable. Aucun avis n'a été inventé. Une nouvelle tentative peut être facturée."};
 }
 const found=parseIndexedSignals(raw);
 if(found.length){
  const {error}=await admin.from("attrey_airbnb_signals").upsert(
   found.map(s=>({...s,workspace_id:ws.id,evidence_status:"index_a_confirmer",
     last_seen_at:new Date().toISOString()})),
   {onConflict:"workspace_id,listing_url,category,review_excerpt",ignoreDuplicates:true});
  if(error)throw new HttpError(500,"Impossible de sauvegarder les indices Airbnb : "+error.message);
  await saveCandidates(ws.id,"web","airbnb",found.map(s=>({
   source_url:s.listing_url,title:"Airbnb Paris · avis indexé à confirmer",
   excerpt:s.review_excerpt,source_name:"airbnb.fr",city:s.city
  })));
 }
 await admin.from("attrey_runs").insert({
  workspace_id:ws.id,canal:"web",variante:"airbnb",declenchement:source,
  recherches:1,candidats:found.length,ajoutes:0,
  scan_status:found.length?"liens_trouves":"aucun_lien",
  scan_detail:found.length?String(found.length)+" indice(s) indexés non vérifiés":
   "Aucun commentaire négatif associable à une annonce dans les résultats indexés"
 });
 const {data:usage}=await admin.from("ai_usage").select("cost_eur")
  .eq("workspace_id",ws.id).eq("feature","attrey/airbnb-index").gte("at",t0);
 const cost=(usage||[]).reduce((n,r)=>n+Number(r.cost_eur||0),0);
 return {ok:true,liens_detectes:found.length,signals_found:found.length,added:0,
  mode:"avis_indexes_a_confirmer",cout_eur:Math.round(cost*1000)/1000,
  note:"Recherche non exhaustive d'extraits indexés. Vérifier chaque commentaire sur Airbnb."};
}
