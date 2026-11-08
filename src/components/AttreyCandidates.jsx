import { useEffect,useMemo,useState } from "react";
import { supabase } from "../lib/supabase";
import { explainAttreyCandidate } from "../lib/attreyCandidateExplain";

const FILTERS=[
  ["tous","Tous les liens"],
  ["a_examiner","Discussions à examiner"],
  ["annonce","Biens / annonces"],
  ["veille","Veille / partenaires"]
];
// Boîte de réception séparée : aucun lien IA ne devient automatiquement prospect qualifié.
export default function AttreyCandidates({workspaceId,refresh=0}) {
  const [data,setData]=useState([]);
  const [filter,setFilter]=useState("tous");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    let alive=true;
    setLoading(true);
    supabase.from("attrey_candidates")
      .select("id,source_url,source_name,title,excerpt,canal,variante,first_seen_at,source_published_at,status")
      .eq("workspace_id",workspaceId).order("first_seen_at",{ascending:false}).limit(100)
      .then(({data,error})=>{
        if(!alive)return;
        setData(data||[]);
        setError(error?.message||"");
        setLoading(false);
      });
    return ()=>{alive=false;};
  },[workspaceId,refresh]);
  const explained=useMemo(()=>data.map(x=>({item:x,info:explainAttreyCandidate(x)})).filter(x=>x.info),[data]);
  const filtered=useMemo(()=>filter==="tous"?explained:explained.filter(x=>x.info.group===filter),[explained,filter]);
  const counts=useMemo(()=>Object.fromEntries(FILTERS.map(([id])=>[id,id==="tous"?explained.length:explained.filter(x=>x.info.group===id).length])),[explained]);
  return <section className="rounded-2xl border border-line bg-white p-4">
    <div className="flex flex-wrap justify-between gap-2 items-start">
      <div>
        <h3 className="text-sm font-semibold">Pistes publiques à vérifier</h3>
        <p className="text-xs text-ink-soft mt-1">Chaque lien indique désormais sa nature, son intérêt potentiel pour Attrey et les vérifications à faire. Aucune de ces fiches ne prouve à elle seule qu'un client cherche nos services.</p>
      </div>
      <span className="text-xs text-ink-faint">{loading?"Chargement…":explained.length+" liens examinables"}</span>
    </div>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrer les pistes par nature">
      {FILTERS.map(([id,label])=><button key={id} type="button"
        className={`rounded-full px-3 py-1.5 border text-xs ${filter===id?"bg-ink text-white border-ink":"bg-white border-line text-ink-soft"}`}
        onClick={()=>setFilter(id)}>{label} · {counts[id]||0}</button>)}
    </div>
    {error && <p className="mt-3 text-sm text-red-700">Lecture indisponible : {error}</p>}
    {!loading&&!error&&!filtered.length && <p className="mt-3 text-xs text-ink-soft">Aucun lien dans cette catégorie pour l'instant. Les futures recherches conserveront les URL publiques trouvées, même lorsque certains détails ne sont pas connus.</p>}
    <div className="mt-3 space-y-3 max-h-[650px] overflow-y-auto">
      {filtered.map(({item:x,info})=><article key={x.id} className="rounded-xl border border-line p-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="font-semibold text-sm flex-1 min-w-[180px] break-words">{info.headline}</h4>
          <span className="shrink-0 rounded-full border border-line px-2 py-1 text-[11px] text-ink-soft">{info.label}</span>
        </div>
        <p className="text-[11px] text-ink-faint">{info.source} · {info.firstSeenLabel} · {info.publishedLabel}</p>
        <div className="space-y-1.5 text-xs leading-relaxed">
          <p><strong>De quoi s'agit-il ?</strong> {info.what}</p>
          <p><strong>Pourquoi Attrey l'a trouvé ?</strong> {info.why}</p>
          <p><strong>Que faire ensuite ?</strong> {info.next}</p>
        </div>
        {info.detail && <details className="text-xs text-ink-soft">
          <summary className="cursor-pointer font-medium">Voir le texte détecté</summary>
          <p className="mt-1 whitespace-pre-wrap break-words">{info.detail}</p>
        </details>}
        <a href={x.source_url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-accent hover:underline break-all">
          Consulter la source originale
        </a>
      </article>)}
    </div>
    <p className="mt-3 text-[11px] text-ink-faint">Explications de premier niveau établies à partir de l'URL, du domaine et du texte collecté. La page originale n'est pas systématiquement ouverte : dates, disponibilité, auteur et intention restent à vérifier. Aucun contact automatique.</p>
  </section>;
}
