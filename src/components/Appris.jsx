import { useEffect, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { typeDe } from "../lib/opportunite";
import { useWs } from "../lib/ws";

/** Ce que Bingoo! a appris de tes résultats, en une phrase, et ce qu'il en fait (les prochaines recherches en tiennent compte). */
export default function Appris({ className = "", seulementSiAssez = false }) {
  const { ws } = useWs();
  const [a, setA] = useState(null);
  const [bench, setBench] = useState([]);
  useEffect(() => { fn("m/appris", { workspace_id: ws.id }).then(setA).catch(() => setA(null)); }, [ws.id]);
  // Résultats des autres utilisateurs (anonymes, seulement à partir de 3 espaces et 100 envois par type de fait)
  useEffect(() => { supabase.rpc("bench_signaux", { p_ws: ws.id }).then(({ data }) => setBench((data ?? []).filter((r) => r.assez))).catch(() => {}); }, [ws.id]);
  if (!a) return null;
  // Pas encore assez de recul : on le dit, on montre où on en est, et ce qui marche ailleurs si on le sait vraiment
  if (!a.assez && seulementSiAssez) return null;
  if (!a.assez) {
    const c = Math.min(a.contactes ?? 0, 20), p = Math.min(a.positifs ?? 0, 3);
    const aucun = bench.find((r) => r.signal === "aucun");
    const meilleur = bench.filter((r) => r.signal !== "aucun").sort((x, y) => Number(y.taux) - Number(x.taux))[0];
    return (
      <div className={`rounded-2xl bg-[#EEF4FF] px-4 py-3 text-[14px] text-ink ${className}`}>
        <p className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#2F80ED] text-[11px] font-black text-white" aria-hidden>↗</span>
          <span>J'apprends de tes résultats. Pour te dire ce qui marche pour toi, il me faut <b>20 entreprises contactées</b> et <b>3 réponses positives</b>. D'ici là, j'écris d'abord à celles qui ont un fait récent (embauche, ouverture, nouveau dirigeant).</span>
        </p>
        <div className="mt-2.5 ml-7 grid gap-1.5 sm:grid-cols-2 text-[12.5px] text-ink-soft">
          {[["Contactées", c, 20], ["Réponses positives", p, 3]].map(([l, n, max]) => (
            <div key={l}><span className="tnum">{l} : {n} sur {max}</span><span className="mt-1 block h-1.5 rounded-full bg-white overflow-hidden"><span className="block h-full rounded-full bg-[#2F80ED]" style={{ width: `${Math.max(4, Math.round((n / max) * 100))}%` }} /></span></div>
          ))}
        </div>
        {meilleur && <p className="mt-2.5 ml-7 text-[13px] text-ink-soft">Chez les autres utilisateurs de Bingoo! : « {typeDe(meilleur.signal)} » obtient {meilleur.taux} % de réponses positives{aucun?.assez ? `, contre ${aucun.taux} % sans fait récent` : ""}.</p>}
      </div>
    );
  }
  const top = (a.facteurs ?? []).filter((f) => f.lift >= 1.3 && f.n >= 5 && !String(f.cle).startsWith("canal:")).sort((x, y) => y.lift - x.lift)[0];
  const texte = a.assez && top
    ? <>Ce que j'apprends : <b>{top.label}</b>, c'est {top.lift >= 1.95 ? `${Math.round(top.lift * 10) / 10} fois` : `${Math.round((top.lift - 1) * 100)} %`} plus de réponses positives. Je les cherche et je les écris en premier.</>
    : a.contactes > 0 ? <>J'apprends de chaque réponse : après {a.contactes} entreprise{a.contactes > 1 ? "s" : ""} contactée{a.contactes > 1 ? "s" : ""}, il me faut encore un peu de recul pour savoir ce qui marche le mieux pour toi.</> : null;
  if (!texte) return null;
  return (
    <p className={`flex items-start gap-2.5 rounded-2xl bg-[#EEF4FF] px-4 py-3 text-[14px] text-ink ${className}`}>
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#2F80ED] text-[11px] font-black text-white" aria-hidden>↗</span>
      <span>{texte}</span>
    </p>
  );
}
