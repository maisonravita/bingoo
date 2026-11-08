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
   const m=line.trim().match(/^(LOGEMENT|ANNONCE|VILLE|CATEGORIE|AVIS|CONTEXTE)\s*:\s*(.*)$/i);
   if(m)fields[m[1].toUpperCase()]=m[2].trim();
  }
  const url=listing(fields.LOGEMENT||fields.ANNONCE);
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
// Les annonces sont distinctes des avis négatifs : elles ne deviennent pas des pistes
// « mauvais avis » sans extrait pertinent. La cible est 10 liens différents PAR
// RECHERCHE, jamais dix résultats inventés pour remplir un quota.
type Listing={source_url:string;title:string;city:string;source_name:string;excerpt:string};
export function parseParisListings(raw:string):Listing[]{
 const found:Listing[]=[],seen=new Set<string>();
 for(const block of raw.split(/(?:^|\n)---(?:\n|$)/)){
  const f:Record<string,string>={};
  for(const line of block.split("\n")){
   const m=line.trim().match(/^(?:LOGEMENT|ANNONCE|VILLE|TITRE|AVIS|CONTEXTE)\s*:\s*(.*)$/i);
   if(m){
    const k=line.trim().split(":")[0].toUpperCase();
    f[k]=m[1].trim();
   }
  }
  const u=listing(f.LOGEMENT||f.ANNONCE);
  // Paris est déclaré dans la source indexée, non confirmé par une API Airbnb.
  if(!u||!/\bparis\b/i.test(f.VILLE||"")||seen.has(u))continue;
  seen.add(u);
  const id=u.split("/").pop()||"";
  found.push({source_url:u,source_name:"airbnb.fr",
   title:trim(f.TITRE||"Logement Airbnb n° "+id,220),
   city:trim(f.VILLE||"Paris",100),
   excerpt:trim(f.CONTEXTE||"Annonce Airbnb indexée à Paris, avis à examiner.",600)});
  if(found.length>=25)break;
 }
 return found;
}
export async function attreyAirbnbIndexedSearch(ws:Workspace,source:"manuel"|"cron"="manuel"){
 if(ws.id!==W)throw new HttpError(403,"Espace Attrey uniquement");
 setAi({ws:ws.id,feature:"attrey/airbnb-index"});
 const prompt=[
  "Attrey recherche des annonces de logements Airbnb indexées situées à Paris intra-muros.",
  "OBJECTIF : trouver 15 à 20 annonces Airbnb DISTINCTES, pour obtenir au moins 10 logements",
  "réels à examiner. Faire au plus deux recherches web ciblées :",
  'site:airbnb.fr/rooms/ appartement Paris location entière',
  'site:airbnb.com/rooms/ Paris apartment Airbnb rental',
  "Pour chaque logement, donner l'URL EXACTE trouvée en recherche, au format /rooms/NUMERO,",
  "le titre si disponible, et Paris uniquement si la localisation est explicitement indiquée",
  "par l'index. Aucun faux lien, aucune déduction de localisation ni doublon.",
  "Ne pas confondre une annonce et un avis négatif.",
  "Si un VRAI EXTRAIT de commentaire voyageur négatif visible dans l'index est relié",
  "à cette annonce, recopier cet extrait sans invention et donner une catégorie parmi",
  "menage, accueil_cles, communication, entretien. Sinon laisser AVIS vide.",
  "Format obligatoire : blocs séparés par une ligne --- et ces champs :",
  "LOGEMENT: https://www.airbnb.fr/rooms/NUMERO_REEL",
  "VILLE: Paris (uniquement si indiqué dans la source)",
  "TITRE: titre visible ou Logement Airbnb",
  "AVIS: (vide si aucune citation d'avis négatif accessible)",
  "CATEGORIE: menage | accueil_cles | communication | entretien (uniquement si AVIS rempli)",
  "CONTEXTE: phrase prudente sur la source indexée",
  "Donne autant de logements distincts que les résultats web permettent, maximum 20.",
  "Si seulement 3 liens fiables sont trouvés, donne 3 : JAMAIS de liens imaginés.",
  "N'accède à aucun compte privé et n'essaie pas de parcourir l'intégralité d'Airbnb."
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
  return {ok:false,liens_detectes:0,listings_found:0,signals_found:0,added:0,
   mode:"recherche_interrompue",reason:"max_tokens",
   note:"Claude a effectué une recherche mais n'a pas fourni de résultat exploitable. Aucun avis n'a été inventé. Une nouvelle tentative peut être facturée."};
 }
 let listings=parseParisListings(raw);
 // Une tentative complémentaire au maximum, et uniquement si l'index a trouvé moins
 // de dix logements distincts. Aucun résultat synthétique, aucun scan en boucle.
 if(listings.length<10){
  try{
   const already=listings.map(x=>x.source_url).join(" | ");
   const extra=await ask([
    "Recherche ciblée de logements Airbnb PUBLICS indexés dans Paris intra-muros.",
    "Une seule recherche web maximum. Trouve jusqu'à 15 nouvelles annonces distinctes",
    "dans Paris 3e, 4e, 9e, 10e, 11e, 15e et 18e, sans recopier ces liens : "+(already||"aucun"),
    'Requête proposée : site:airbnb.fr/rooms/ "Paris" "Appartement"',
    "Ne donne que des URL /rooms/ réelles présentes dans les résultats de recherche.",
    "La localisation Paris doit être mentionnée dans la source; ne l'invente jamais.",
    "Format : blocs séparés par --- ; chaque bloc contient LOGEMENT: URL exacte,",
    "VILLE: Paris, TITRE: titre public si disponible, CONTEXTE: source indexée.",
    "Si tu ne peux pas vérifier un lien, ne le donne pas. Aucun avis négatif supposé."
   ].join("\n"),{fast:true,maxTokens:5500,tools:[{type:"web_search_20250305",
    name:"web_search",max_uses:1,user_location:{type:"approximate",country:"FR",timezone:"Europe/Paris"}}]});
   const present=new Set(listings.map(x=>x.source_url));
   for(const candidate of parseParisListings(extra)){
    if(!present.has(candidate.source_url)){listings.push(candidate);present.add(candidate.source_url);}
   }
  }catch(e){console.warn("Attrey: recherche complémentaire Airbnb indisponible",
   e instanceof Error?e.message:String(e));}
 }
 const found=parseIndexedSignals(raw);
 if(listings.length)await saveCandidates(ws.id,"web","airbnb",listings);
 if(found.length){
  const {error}=await admin.from("attrey_airbnb_signals").upsert(
   found.map(s=>({...s,workspace_id:ws.id,evidence_status:"index_a_confirmer",
     last_seen_at:new Date().toISOString()})),
   {onConflict:"workspace_id,listing_url,category,review_excerpt",ignoreDuplicates:true});
  if(error)throw new HttpError(500,"Impossible de sauvegarder les indices Airbnb : "+error.message);
 }
 await admin.from("attrey_runs").insert({
  workspace_id:ws.id,canal:"web",variante:"airbnb",declenchement:source,
  recherches:1,candidats:listings.length,ajoutes:0,
  scan_status:listings.length?"liens_trouves":"aucun_lien",
  scan_detail:listings.length?String(listings.length)+" annonce(s) indexée(s), "+String(found.length)+" avis négatif(s) à confirmer":
   "Aucune annonce Airbnb parisienne fiable dans les résultats de cette recherche"
 });
 const {data:usage}=await admin.from("ai_usage").select("cost_eur")
  .eq("workspace_id",ws.id).eq("feature","attrey/airbnb-index").gte("at",t0);
 const cost=(usage||[]).reduce((n,r)=>n+Number(r.cost_eur||0),0);
 return {ok:true,liens_detectes:listings.length,listings_found:listings.length,signals_found:found.length,added:0,
  mode:"avis_indexes_a_confirmer",cout_eur:Math.round(cost*1000)/1000,
  note:"Objectif de 10 annonces par recherche, sans garantie si l’index fournit moins de liens vérifiables. Les commentaires restent à confirmer."};
}
