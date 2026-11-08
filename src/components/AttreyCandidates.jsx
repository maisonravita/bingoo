import { useEffect,useMemo,useState } from "react";
import { fn,supabase } from "../lib/supabase";
import { explainAttreyCandidate } from "../lib/attreyCandidateExplain";

const INTENT_LABELS={
  cherche_conciergerie_airbnb:"Recherche une conciergerie Airbnb",
  cherche_gestion_locative:"Recherche une gestion locative",
  cherche_menage_cles:"Recherche ménage / remise de clés",
  propose_location_courte:"Propose un logement saisonnier",
  propose_location_longue:"Propose un logement à louer",
  vend_bien:"Propose un bien à vendre",
  cherche_location:"Recherche un logement à louer",
  cherche_achat:"Recherche un bien à acheter",
  cherche_location_saisonniere:"Recherche une location de courte durée",
  entreprise_relocalisation:"Demande de logement professionnel",
  partenaire_professionnel:"Prestataire / partenaire potentiel",
  page_categorie:"Page générale, pas une demande",
  discussion_generale:"Discussion générale sans demande claire",
  autre:"Autre sujet immobilier",
  inconnu:"Besoin non identifié"
};
const FILTERS=[
  ["tous","Tous les liens"],
  ["a_examiner","Discussions à examiner"],
  ["annonce","Biens / annonces"],
  ["veille","Veille / partenaires"]
];
// Boîte de réception séparée : aucun lien IA ne devient automatiquement prospect qualifié.
export default function AttreyCandidates({workspaceId,refresh=0,favoriteUrls=new Set(),onToggleFavorite=()=>{},favoriteBusy=false}) {
  const [data,setData]=useState([]);
  const [filter,setFilter]=useState("tous");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [classifying,setClassifying]=useState(false);
  const [classifyMessage,setClassifyMessage]=useState("");
  const [localRefresh,setLocalRefresh]=useState(0);
  useEffect(()=>{
    let alive=true;
    setLoading(true);
    supabase.from("attrey_candidates")
      .select("id,source_url,source_name,title,excerpt,canal,variante,first_seen_at,source_published_at,status,opportunity_type,intent_summary,evidence_excerpt,classification_status,classified_at")
      .eq("workspace_id",workspaceId).order("first_seen_at",{ascending:false}).limit(100)
      .then(({data,error})=>{
        if(!alive)return;
        setData(data||[]);
        setError(error?.message||"");
        setLoading(false);
      });
    return ()=>{alive=false;};
  },[workspaceId,refresh,localRefresh]);
  const classify=async(ids)=>{
    if(classifying)return;
    setClassifying(true);setClassifyMessage("");
    try{
      const result=await fn("r/attrey-classify",{workspace_id:workspaceId,...(ids?{ids}:{})});
      setClassifyMessage(`${result.analyses||0} page(s) analysée(s) · ${result.precises||0} intention(s) appuyée(s) par le texte · ${result.indisponibles||0} page(s) non accessibles.`);
      setLocalRefresh(x=>x+1);
    }catch(e){setClassifyMessage(e.message||"Analyse indisponible");}
    finally{setClassifying(false);}
  };
  const explained=useMemo(()=>data.map(x=>({item:x,info:explainAttreyCandidate(x)})).filter(x=>x.info),[data]);
  const filtered=useMemo(()=>filter==="tous"?explained:explained.filter(x=>x.info.group===filter),[explained,filter]);
  const counts=useMemo(()=>Object.fromEntries(FILTERS.map(([id])=>[id,id==="tous"?explained.length:explained.filter(x=>x.info.group===id).length])),[explained]);
  return <section className="rounded-2xl border border-line bg-white p-4">
    <div className="flex flex-wrap justify-between gap-2 items-start">
      <div>
        <h3 className="text-sm font-semibold">Pistes publiques à vérifier</h3>
        <p className="text-xs text-ink-soft mt-1">Chaque lien indique désormais sa nature, son intérêt potentiel pour Attrey et les vérifications à faire. Aucune de ces fiches ne prouve à elle seule qu'un client cherche nos services.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-faint">{loading?"Chargement…":explained.length+" liens examinables"}</span>
        <button type="button" disabled={loading||classifying||!data.length}
          onClick={()=>classify()}
          className="rounded-xl border border-line px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
          {classifying?"Analyse des pages publiques…":"Identifier les besoins (8 liens)"}
        </button>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrer les pistes par nature">
      {FILTERS.map(([id,label])=><button key={id} type="button"
        className={`rounded-full px-3 py-1.5 border text-xs ${filter===id?"bg-ink text-white border-ink":"bg-white border-line text-ink-soft"}`}
        onClick={()=>setFilter(id)}>{label} · {counts[id]||0}</button>)}
    </div>
    {classifyMessage && <p role="status" className="mt-3 text-xs text-ink-soft">{classifyMessage}</p>}
    {error && <p className="mt-3 text-sm text-red-700">Lecture indisponible : {error}</p>}
    {!loading&&!error&&!filtered.length && <p className="mt-3 text-xs text-ink-soft">Aucun lien dans cette catégorie pour l'instant. Les futures recherches conserveront les URL publiques trouvées, même lorsque certains détails ne sont pas connus.</p>}
    <div className="mt-3 space-y-3 max-h-[650px] overflow-y-auto">
      {filtered.map(({item:x,info})=><article key={x.id} className="rounded-xl border border-line p-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="font-semibold text-sm flex-1 min-w-[180px] break-words">{info.headline}</h4>
          <div className="shrink-0 flex flex-wrap gap-2 items-center">
            <span className="rounded-full border border-line px-2 py-1 text-[11px] text-ink-soft">{info.label}</span>
            <button type="button" disabled={favoriteBusy}
              onClick={()=>onToggleFavorite({url:x.source_url,title:info.headline,kind:"piste"})}
              aria-pressed={favoriteUrls.has(x.source_url)}
              className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50">
              {favoriteUrls.has(x.source_url)?"★ En favoris":"☆ Ajouter aux favoris"}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-ink-faint">{info.source} · {info.firstSeenLabel} · {info.publishedLabel}</p>
        <div className="rounded-lg bg-slate-50 p-2.5 text-xs space-y-1">
          <p className="font-semibold">{INTENT_LABELS[x.opportunity_type] || "Besoin exact non encore analysé"}</p>
          <p className="text-ink-soft">{x.intent_summary || (x.classification_status==="contenu_inaccessible"
            ?"La page ne peut pas être lue automatiquement. Ne pas déduire une demande du seul lien."
            :x.classification_status==="insuffisant"
            ?"Le contenu visible ne permet pas de déterminer avec certitude qui cherche ou propose quoi."
            :"Clique sur « Analyser ce lien » pour lire la page et identifier l'intention.")}</p>
          {x.evidence_excerpt && <p className="italic text-ink-soft">Preuve sur la page : « {x.evidence_excerpt} »</p>}
          <p className="text-[11px] text-ink-faint">{x.classification_status==="analyse_texte"
            ?"Classification basée sur une citation contrôlée du contenu public."
            :x.classification_status==="contenu_inaccessible"
            ?"Page inaccessible à l'analyse automatique."
            :x.classification_status==="insuffisant"?"Preuve insuffisante.": "Non analysé en détail."}</p>
          <button type="button" disabled={classifying} onClick={()=>classify([x.id])}
            className="underline text-xs text-accent disabled:opacity-50">
            Analyser ce lien
          </button>
        </div>
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
    <p className="mt-3 text-[11px] text-ink-faint">La classification précise tente de lire le texte public de la page. Si l'accès échoue ou qu'aucune preuve n'est disponible, le besoin reste inconnu. Aucune prise de contact automatique.</p>
  </section>;
}
