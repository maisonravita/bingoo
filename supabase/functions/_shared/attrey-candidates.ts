// Sauvegarde des liens publics candidats AVANT la qualification commerciale.
// Un lien issu d'une réponse IA n'est pas une source vérifiée.
import { admin } from "./core.ts";
type Candidate = {
  source_url: string; title?: string; excerpt?: string; source_name?: string;
  source_published_at?: string|null; city?: string|null;
};
const clean=(v:unknown,n:number)=>typeof v==="string"?v.trim().slice(0,n):"";
export function candidateUrl(v:unknown,host?:string) {
  if(typeof v!=="string")return null;
  try {
    const u=new URL(v.replace(/[.,;:)\]}>]+$/g,""));
    if(u.protocol!=="https:"||u.username||u.password||!u.hostname.includes("."))return null;
    if(/^(google\.|bing\.|t\.co$|bit\.ly$|tinyurl\.)/i.test(u.hostname.replace(/^www\./,"")))return null;
    if(host && !(u.hostname.toLowerCase()===host || u.hostname.toLowerCase().endsWith("."+host)))return null;
    u.hash="";
    return u.toString();
  }catch{return null;}
}
export function publicLinks(text:string,host?:string):Candidate[] {
  const seen=new Set<string>();
  const result:Candidate[]=[];
  for(const line of text.split("\n")) {
    const links=line.match(/https:\/\/[^\s<>"']+/g)??[];
    for(const link of links){
      const url=candidateUrl(link,host);
      if(!url||seen.has(url))continue;
      seen.add(url);
      result.push({source_url:url,title:line.replace(link,"").replace(/^[\s\-*#\d.)]+/,"").slice(0,240)||"Publication publique à vérifier",
        excerpt:line.slice(0,700),source_name:new URL(url).hostname});
      if(result.length>=25)return result;
    }
  }
  return result;
}
export async function saveCandidates(wsId:string,canal:string,variante:string,items:Candidate[]) {
  const unique=new Map<string,Candidate>();
  for(const item of items){
    const url=candidateUrl(item.source_url);
    if(url&&!unique.has(url))unique.set(url,{...item,source_url:url});
  }
  if(!unique.size)return 0;
  // ignoreDuplicates empêche d'effacer la qualification humaine existante.
  const rows=[...unique.values()].map(r=>({
    workspace_id:wsId,canal,variante,source_url:r.source_url,
    title:clean(r.title,240)||"Publication publique à vérifier",
    excerpt:clean(r.excerpt,700)||null,source_name:clean(r.source_name,120)||null,
    city:clean(r.city,100)||null,
    source_published_at:/^\d{4}-\d{2}-\d{2}$/.test(r.source_published_at??"")?r.source_published_at:null
  }));
  const {error}=await admin.from("attrey_candidates").upsert(rows,
    {onConflict:"workspace_id,source_url",ignoreDuplicates:true});
  if(error)throw new Error("Impossible de sauvegarder les pistes : "+error.message);
  return rows.length;
}
