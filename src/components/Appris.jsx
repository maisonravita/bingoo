import { useEffect, useState } from "react";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";

/** Ce que Bingoo! a appris de tes résultats, en une phrase, et ce qu'il en fait (les prochaines recherches en tiennent compte). */
export default function Appris({ className = "" }) {
  const { ws } = useWs();
  const [a, setA] = useState(null);
  useEffect(() => { fn("m/appris", { workspace_id: ws.id }).then(setA).catch(() => setA(null)); }, [ws.id]);
  if (!a) return null;
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
