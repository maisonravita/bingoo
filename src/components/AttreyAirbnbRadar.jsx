import { useEffect,useMemo,useState } from "react";
import { fn,supabase } from "../lib/supabase";
const CATEGORIES={menage:"Ménage / propreté",accueil_cles:"Accueil / remise de clés",
  communication:"Communication hôte",entretien:"Entretien / équipements",autre:"Autre critique"};
const canonical=(url)=>{
  const m=String(url||"").match(/^https:\/\/(?:[\w-]+\.)?airbnb\.(?:fr|com|co\.uk)\/rooms\/(\d+)/i);
  return m?"https://www.airbnb.fr/rooms/"+m[1]:null;
};
const fmt=(v)=>v==null?"Non renseigné":Number(v).toLocaleString("fr-FR");
export default function AttreyAirbnbRadar({workspaceId,refresh=0,favoriteUrls=new Set(),onToggleFavorite=()=>{},favoriteBusy=false}){
  const [audits,setAudits]=useState([]);
  const [candidates,setCandidates]=useState([]);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [form,setForm]=useState({listing_url:"",property_name:"",location:"Paris",
    quality_rating:"",listing_rating:"",review_count:"",reviews_input:""});
  const reload=()=>{
    if(!workspaceId)return;
    setLoading(true);
    Promise.all([
      supabase.from("attrey_airbnb_audits").select("*").eq("workspace_id",workspaceId)
        .order("updated_at",{ascending:false}).limit(60),
      supabase.from("attrey_candidates").select("source_url,title,first_seen_at")
        .eq("workspace_id",workspaceId).ilike("source_url","%airbnb.%/rooms/%")
        .order("first_seen_at",{ascending:false}).limit(50)
    ]).then(([a,c])=>{
      setError(a.error?.message||c.error?.message||"");
      setAudits(a.data||[]);setCandidates(c.data||[]);
    }).finally(()=>setLoading(false));
  };
  useEffect(()=>{reload();},[workspaceId,refresh]);
  const unique=useMemo(()=>[...new Map(candidates.map(x=>[canonical(x.source_url),x])
    .filter(([url])=>url)).values()], [candidates]);
  const submit=async(e)=>{
    e.preventDefault();setBusy(true);setError("");
    try{
      const result=await fn("r/attrey-airbnb-audit",{workspace_id:workspaceId,...form,
        quality_rating:form.quality_rating===""?null:Number(form.quality_rating),
        listing_rating:form.listing_rating===""?null:Number(form.listing_rating),
        review_count:form.review_count===""?null:Number(form.review_count)});
      setError(result.evidence_count
        ?`Analyse enregistrée : ${result.evidence_count} élément(s) lié(s) à la gestion.`
        :"Analyse enregistrée. Aucun problème de gestion vérifié dans ces extraits.");
      reload();
    }catch(e){setError(e.message||"Impossible d'analyser les avis");}
    finally{setBusy(false);}
  };
  const auditCount=audits.filter(x=>x.evidence_count>0).length;
  return <section className="rounded-2xl border border-line bg-white p-4 space-y-4">
    <div>
      <h3 className="text-sm font-semibold">Radar Airbnb · Qualité & avis voyageurs</h3>
      <p className="mt-1 text-xs text-ink-soft">Repérer des logements parisiens attractifs dont les avis signalent des problèmes de ménage, d'accueil, de communication ou d'entretien. Ce sont des hypothèses commerciales, pas des demandes explicites de conciergerie.</p>
    </div>
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-xl bg-slate-50 p-3"><p className="font-semibold text-xl">{unique.length}</p><p className="text-[11px] text-ink-soft">Annonces repérées</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="font-semibold text-xl">{audits.length}</p><p className="text-[11px] text-ink-soft">Annonces étudiées</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="font-semibold text-xl">{auditCount}</p><p className="text-[11px] text-ink-soft">Avec signalements vérifiés</p></div>
    </div>
    {unique.length>0&&<div className="space-y-2">
      <h4 className="text-sm font-semibold">Annonces Airbnb repérées · à consulter ou sauvegarder</h4>
      <div className="max-h-[245px] overflow-y-auto space-y-2">
        {unique.map(x=>{
          const url=canonical(x.source_url),saved=favoriteUrls.has(url)||favoriteUrls.has(x.source_url);
          return <div key={x.source_url} className="rounded-xl border border-line p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold">Airbnb · annonce n° {url.split("/").pop()}</p>
              <p className="text-[11px] text-ink-soft">Avis et qualité non encore évalués</p>
            </div>
            <div className="flex gap-2 items-center">
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Ouvrir</a>
              <button type="button" disabled={favoriteBusy}
                aria-pressed={saved}
                onClick={()=>onToggleFavorite({url,title:"Airbnb · annonce n° "+url.split("/").pop(),kind:"airbnb"})}
                className="rounded-lg border border-line px-2 py-1 text-xs disabled:opacity-50">
                {saved?"★ En favoris":"☆ Favoris"}
              </button>
            </div>
          </div>;
        })}
      </div>
    </div>}
    <div className="rounded-xl border border-line p-3 space-y-3">
      <h4 className="text-sm font-semibold">Analyser les avis d'un beau logement</h4>
      <p className="text-xs text-ink-soft">Sélectionne une annonce déjà repérée ou colle son lien. Consulte les avis normalement sur Airbnb puis ajoute les passages utiles. Attrey n'aspire pas automatiquement les avis d'Airbnb.</p>
      <form onSubmit={submit} className="space-y-3">
        {unique.length>0&&<label className="block text-xs font-semibold">Annonces déjà repérées
          <select className="mt-1 block w-full rounded-xl border border-line p-2.5 text-sm bg-white"
            value={unique.some(x=>canonical(x.source_url)===form.listing_url)?form.listing_url:""}
            onChange={e=>setForm(f=>({...f,listing_url:e.target.value}))}>
            <option value="">Choisir une annonce Airbnb…</option>
            {unique.map(x=><option key={x.source_url} value={canonical(x.source_url)}>
              {canonical(x.source_url).split("/").pop()} · Airbnb
            </option>)}
          </select>
        </label>}
        <label className="block text-xs font-semibold">Lien de l'annonce
          <input required type="url" placeholder="https://www.airbnb.fr/rooms/..." value={form.listing_url}
            onChange={e=>setForm(f=>({...f,listing_url:e.target.value}))}
            className="mt-1 block w-full rounded-xl border border-line p-2.5 text-sm" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold">Nom du logement
            <input value={form.property_name} placeholder="Ex. Appartement lumineux" maxLength={160}
              onChange={e=>setForm(f=>({...f,property_name:e.target.value}))}
              className="mt-1 block w-full rounded-xl border border-line p-2.5 text-sm"/>
          </label>
          <label className="text-xs font-semibold">Quartier / ville
            <input value={form.location} maxLength={100} placeholder="Paris 11e"
              onChange={e=>setForm(f=>({...f,location:e.target.value}))}
              className="mt-1 block w-full rounded-xl border border-line p-2.5 text-sm"/>
          </label>
          <label className="text-xs font-semibold">Qualité esthétique (1 à 5)
            <select className="mt-1 block w-full rounded-xl border border-line p-2.5 text-sm bg-white"
              value={form.quality_rating} onChange={e=>setForm(f=>({...f,quality_rating:e.target.value}))}>
              <option value="">Non évaluée</option>
              {[1,2,3,4,5].map(v=><option value={v} key={v}>{v}/5</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold">Note Airbnb observée
            <input type="number" step="0.01" min="0" max="5" value={form.listing_rating}
              placeholder="Ex. 4.42" onChange={e=>setForm(f=>({...f,listing_rating:e.target.value}))}
              className="mt-1 block w-full rounded-xl border border-line p-2.5 text-sm"/>
          </label>
          <label className="text-xs font-semibold">Nombre total d'avis
            <input type="number" min="0" max="100000" value={form.review_count}
              onChange={e=>setForm(f=>({...f,review_count:e.target.value}))}
              className="mt-1 block w-full rounded-xl border border-line p-2.5 text-sm"/>
          </label>
        </div>
        <label className="block text-xs font-semibold">Extraits des avis à analyser
          <textarea required rows={6} minLength={35} maxLength={12000}
            placeholder={"Un avis par paragraphe, avec les commentaires portant sur le ménage, l'arrivée, la communication, les équipements…"}
            value={form.reviews_input} onChange={e=>setForm(f=>({...f,reviews_input:e.target.value}))}
            className="mt-1 block w-full rounded-xl border border-line p-2.5 text-sm"/>
        </label>
        <button type="submit" disabled={busy||!canonical(form.listing_url)||form.reviews_input.trim().length<35}
          className="rounded-xl bg-ink text-white font-semibold px-4 py-2.5 text-sm disabled:opacity-50">
          {busy?"Analyse des commentaires…":"Analyser les problèmes et calculer le potentiel"}
        </button>
      </form>
    </div>
    {error&&<p role="status" className="text-xs text-ink-soft">{error}</p>}
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Logements étudiés · par intérêt commercial</h4>
      {loading&&<p className="text-xs text-ink-soft">Chargement…</p>}
      {!loading&&!audits.length&&<p className="text-xs text-ink-soft">Aucun logement étudié pour l'instant. Les annonces découvertes ne prouvent pas l'existence de mauvais avis.</p>}
      {[...audits].sort((a,b)=>(b.opportunity_score||0)-(a.opportunity_score||0)).map(a=>{
        const findings=Array.isArray(a.analysis?.findings)?a.analysis.findings:[];
        return <article key={a.id} className="rounded-xl border border-line p-3 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div><h5 className="font-semibold text-sm">{a.property_name||"Annonce Airbnb "+a.listing_url.split("/").pop()}</h5>
              <p className="text-[11px] text-ink-soft">{a.location||"Localisation non confirmée"} · Note : {fmt(a.listing_rating)}/5 · {fmt(a.review_count)} avis indiqués</p>
            </div>
            <div className="text-right shrink-0"><p className="text-base font-bold">{a.opportunity_score}/100</p>
              <p className="text-[11px] text-ink-soft">Potentiel estimatif</p></div>
          </div>
          <p className="text-xs">{a.analysis?.summary||"Analyse indisponible"}</p>
          <div className="flex gap-1.5 flex-wrap">
            {[...new Set(findings.map(f=>f.category))].map(key=><span key={key}
              className="rounded-full bg-slate-100 px-2 py-1 text-[11px]">{CATEGORIES[key]||key}</span>)}
            {!findings.length&&<span className="text-[11px] text-ink-soft">Aucun problème démontré dans les extraits</span>}
          </div>
          {findings.slice(0,5).map((f,i)=><div key={i} className="rounded-lg bg-slate-50 p-2 text-xs">
            <p className="font-semibold">{CATEGORIES[f.category]||"Autre"} · {f.severity}</p>
            <p className="mt-1 italic">« {f.quote} »</p>
            <p className="mt-1 text-ink-soft">{f.explanation}</p>
          </div>)}
          <p className="text-[11px] text-ink-soft">Analyse de passages fournis manuellement. Le propriétaire n'a pas nécessairement exprimé de besoin de conciergerie.</p>
          <div className="flex flex-wrap gap-3 items-center">
            <a href={a.listing_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Voir l'annonce originale</a>
            <button type="button" disabled={favoriteBusy}
              aria-pressed={favoriteUrls.has(a.listing_url)}
              onClick={()=>onToggleFavorite({url:a.listing_url,
                title:a.property_name||"Airbnb · annonce n° "+a.listing_url.split("/").pop(),kind:"airbnb"})}
              className="text-xs underline text-ink-soft disabled:opacity-50">
              {favoriteUrls.has(a.listing_url)?"★ En favoris":"☆ Ajouter aux favoris"}
            </button>
            <button type="button" onClick={()=>{setForm({listing_url:a.listing_url,property_name:a.property_name||"",
                location:a.location||"Paris",quality_rating:a.quality_rating==null?"":String(a.quality_rating),
                listing_rating:a.listing_rating==null?"":String(a.listing_rating),
                review_count:a.review_count==null?"":String(a.review_count),
                reviews_input:a.reviews_input||""});
              }} className="text-xs underline text-ink-soft">Compléter les avis</button>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
