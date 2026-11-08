import { useEffect,useState } from "react";
import { supabase } from "../lib/supabase";

// Boîte de réception séparée : aucun lien IA ne devient automatiquement un prospect qualifié.
export default function AttreyCandidates({workspaceId,refresh=0}) {
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    let alive=true;
    setLoading(true);
    supabase.from("attrey_candidates")
      .select("id,source_url,source_name,title,excerpt,canal,variante,first_seen_at,status")
      .eq("workspace_id",workspaceId).order("first_seen_at",{ascending:false}).limit(50)
      .then(({data,error})=>{
        if(!alive)return;
        setData(data||[]);
        setError(error?.message||"");
        setLoading(false);
      });
    return ()=>{alive=false;};
  },[workspaceId,refresh]);
  return <section className="rounded-2xl border border-line bg-white p-4">
    <div className="flex flex-wrap justify-between gap-2 items-start">
      <div>
        <h3 className="text-sm font-semibold">Pistes publiques à vérifier</h3>
        <p className="text-xs text-ink-soft mt-1">Liens conservés avant qualification. Une piste peut être ancienne, non pertinente ou incomplète : ce n'est pas encore un prospect.</p>
      </div>
      <span className="text-xs text-ink-faint">{loading?"Chargement…":data.length+" liens affichés"}</span>
    </div>
    {error && <p className="mt-3 text-sm text-red-700">Lecture indisponible : {error}</p>}
    {!loading&&!error&&!data.length && <p className="mt-3 text-xs text-ink-soft">Aucun lien candidat pour l'instant. La collecte enregistre ici les liens trouvés, même lorsque leur date ou leur ville reste à vérifier.</p>}
    <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto">
      {data.map(x=><div key={x.id} className="rounded-xl border border-line p-3">
        <div className="flex gap-2 justify-between">
          <p className="font-medium text-xs line-clamp-2">{x.title||"Publication publique à vérifier"}</p>
          <span className="text-[11px] shrink-0 text-ink-faint">{x.canal==="forums"?"Forum":"Web"} · À vérifier</span>
        </div>
        <p className="mt-1 text-[11px] text-ink-faint">{x.source_name||x.variante||"Source publique"} · {new Date(x.first_seen_at).toLocaleDateString("fr-FR")}</p>
        {x.excerpt && <p className="text-xs text-ink-soft mt-1 line-clamp-2">{x.excerpt}</p>}
        <a href={x.source_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs text-accent hover:underline">Ouvrir et vérifier la publication</a>
      </div>)}
    </div>
  </section>;
}
