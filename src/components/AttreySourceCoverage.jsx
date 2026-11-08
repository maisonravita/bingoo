import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Recherche de pages PUBLIQUES indexées, pas une intégration privée avec les plateformes.
export const SEARCH_SOURCES = [
  ["auto","Automatique · meilleure formule"],
  ["allovoisins","AlloVoisins · gestion locative"],
  ["reddit","Reddit · voyageurs et acheteurs"],
  ["leboncoin","Leboncoin · annonces immobilières"],
  ["pap","PAP · propriétaires"],
  ["seloger","SeLoger · biens immobiliers"],
  ["facebook","Facebook · publications publiques"],
  ["linkedin","LinkedIn · entreprises et partenaires"],
  ["airbnb","Airbnb · annonces publiques"],
  ["abritel","Abritel · locations saisonnières"],
  ["forums","Forums publics · expatriés et voyage"],
];
const dateLabel = (v) => v ? new Date(v).toLocaleDateString("fr-FR", { day:"numeric",month:"short" }) : "Jamais";
export default function AttreySourceCoverage({ workspaceId, refresh=0 }) {
  const [runs,setRuns]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let mounted=true;
    setLoading(true);
    supabase.from("attrey_runs").select("at,canal,variante,ajoutes,candidats,cout_eur")
      .eq("workspace_id",workspaceId).in("canal",["web","forums"])
      .order("at",{ascending:false}).limit(250)
      .then(({data,error})=>{
        if(!mounted)return;
        setRuns(error?[]:(data||[]));
        setLoading(false);
      });
    return ()=>{mounted=false;};
  },[workspaceId,refresh]);
  const sourceIds=SEARCH_SOURCES.slice(1);
  const rollup=(id)=>{
    const relevant=runs.filter((r)=>
      id==="forums" ? (r.canal==="forums" || (r.canal==="web" && r.variante==="forums")) :
      r.canal==="web" && r.variante===id
    );
    return {
      count:relevant.length,
      found:relevant.reduce((sum,r)=>sum+Number(r.ajoutes||0),0),
      cost:relevant.reduce((sum,r)=>sum+Number(r.cout_eur||0),0),
      last:relevant[0]?.at||null
    };
  };
  return <section className="rounded-2xl border border-line p-4 bg-white">
    <h3 className="font-semibold text-sm">Couverture des sources</h3>
    <p className="text-xs text-ink-soft mt-1">Recherches publiques indexées, pas d'accès aux comptes ou messageries privés. Les résultats ne sont pas garantis.</p>
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-[530px] w-full text-xs">
        <thead><tr className="border-b border-line text-ink-soft text-left">
          <th className="py-2">Plateforme</th><th className="py-2 text-right">Passages</th>
          <th className="py-2 text-right">Pistes</th><th className="py-2 text-right">Coût IA</th>
          <th className="py-2 text-right">Dernier contrôle</th></tr></thead>
        <tbody>
          {sourceIds.map(([id,name])=>{
            const x=rollup(id);
            return <tr key={id} className="border-b border-line/60">
              <td className="py-2 pr-2 font-medium">{name}</td>
              <td className="py-2 text-right">{loading?"…":x.count}</td>
              <td className="py-2 text-right">{loading?"…":x.found}</td>
              <td className="py-2 text-right">{loading?"…":x.cost.toLocaleString("fr-FR",{style:"currency",currency:"EUR"})}</td>
              <td className="py-2 text-right text-ink-soft">{loading?"…":dateLabel(x.last)}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <p className="mt-2 text-[11px] text-ink-faint">Historique limité aux 250 derniers passages. « 0 piste » signifie qu'aucune demande suffisamment documentée n'a été retenue, pas que la plateforme est entièrement couverte.</p>
  </section>;
}
