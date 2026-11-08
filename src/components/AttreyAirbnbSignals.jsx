import {useEffect,useState} from "react";
import {supabase} from "../lib/supabase";

const NAMES={menage:"Ménage / propreté",accueil_cles:"Accueil / clés",
  communication:"Communication",entretien:"Entretien / équipements"};
export default function AttreyAirbnbSignals({workspaceId,refresh=0,favoriteUrls=new Set(),
  onToggleFavorite=()=>{},favoriteBusy=false}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    if(!workspaceId)return;
    let alive=true;setLoading(true);
    supabase.from("attrey_airbnb_signals")
      .select("id,listing_url,review_excerpt,category,source_url,evidence_status,context,city,discovered_at")
      .eq("workspace_id",workspaceId)
      .order("discovered_at",{ascending:false}).limit(100)
      .then(({data,error})=>{
        if(!alive)return;
        setItems(data||[]);setError(error?.message||"");setLoading(false);
      });
    return ()=>{alive=false;};
  },[workspaceId,refresh]);
  const byListing=Object.values(items.reduce((acc,x)=>{
    if(!acc[x.listing_url])acc[x.listing_url]={url:x.listing_url,signals:[],city:x.city};
    acc[x.listing_url].signals.push(x);
    return acc;
  },{}));
  return <section className="rounded-xl border border-line p-3 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h4 className="text-sm font-semibold">Avis négatifs repérés automatiquement</h4>
        <p className="mt-1 text-xs text-ink-soft">
          Le moteur cherche des extraits indexés associés à des annonces Airbnb parisiennes.
          Chaque extrait est un indice à confirmer dans les vrais avis de l'annonce, pas une preuve vérifiée.
        </p>
      </div>
      <span className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft">{byListing.length} logement(s) signalé(s)</span>
    </div>
    {loading&&<p className="text-xs text-ink-soft">Lecture des résultats…</p>}
    {error&&<p role="alert" className="text-xs text-red-700">Recherche des avis : {error}</p>}
    {!loading&&!error&&!byListing.length&&
      <div className="rounded-lg bg-slate-50 p-3 space-y-1">
        <p className="text-xs font-semibold">Aucun avis négatif suffisamment identifiable pour l'instant.</p>
        <p className="text-xs text-ink-soft">Lance « Chercher des avis négatifs Airbnb à Paris » au-dessus. Si les résultats indexés ne montrent pas de commentaire précis relié à un logement, Attrey n'inventera pas de problème.</p>
      </div>}
    <div className="space-y-2 max-h-[640px] overflow-y-auto">
      {byListing.map(a=>{
        const saved=favoriteUrls.has(a.url);
        return <article key={a.url} className="rounded-xl border border-line p-3 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Airbnb · logement n° {a.url.split("/").pop()}</p>
              <p className="text-[11px] text-ink-soft">{a.city||"Paris à confirmer"} · {a.signals.length} extrait(s) indexé(s)</p>
            </div>
            <span className="rounded-full bg-amber-50 text-amber-900 px-2 py-1 text-[11px] font-semibold">À confirmer sur Airbnb</span>
          </div>
          <div className="space-y-2">
            {a.signals.map(s=><div key={s.id} className="rounded-lg bg-slate-50 p-2.5 space-y-1">
              <p className="text-xs font-semibold">{NAMES[s.category]||"Autre"}</p>
              <p className="italic text-xs">« {s.review_excerpt} »</p>
              <p className="text-[11px] text-ink-soft">{s.context||"Extrait signalé par les résultats de recherche indexés; non confirmé sur la page originale."}</p>
            </div>)}
          </div>
          <p className="text-[11px] text-ink-soft">La beauté du logement, sa note et le caractère récent ou répété des plaintes ne sont pas vérifiés. Aucun besoin de conciergerie déduit.</p>
          <div className="flex gap-3 flex-wrap items-center">
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Vérifier les avis sur Airbnb</a>
            <button type="button" disabled={favoriteBusy} aria-pressed={saved}
              onClick={()=>onToggleFavorite({url:a.url,title:"Airbnb · logement n° "+a.url.split("/").pop(),kind:"airbnb"})}
              className="text-xs text-ink-soft underline disabled:opacity-50">
              {saved?"★ En favoris":"☆ Ajouter aux favoris"}
            </button>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
