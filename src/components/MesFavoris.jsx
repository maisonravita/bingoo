import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import CompanyLogo from "./CompanyLogo";
import Favori from "./Favori";
import { cx } from "../lib/utils";

// Mes favoris : les SaaS et les applis que l'on a mis de côté d'un clic sur le cœur
const HF = { fontFamily: "var(--font-titre)" };
const $ = (n) => `${Math.round(n).toLocaleString("fr-FR")} $`;

export default function MesFavoris() {
  const nav = useNavigate();
  const { ws } = useWs();
  const [rows, setRows] = useState(undefined);
  const [filtre, setFiltre] = useState("tous");
  useEffect(() => { if (ws?.id) supabase.rpc("saas_favoris_liste", { ws: ws.id }).then(({ data }) => setRows(data ?? [])); }, [ws?.id]);
  const liste = (rows ?? []).filter((x) => filtre === "tous" || x.type === filtre);
  const n = (t) => (rows ?? []).filter((x) => x.type === t).length;
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <p className="text-[12.5px] font-bold tracking-wider text-accent-dark">MES FAVORIS</p>
      <h1 className="text-[34px] font-black leading-tight tracking-tight" style={HF}>Les SaaS et les applis qui t'ont plu.</h1>
      <p className="mt-1 text-ink-soft max-w-3xl">Clique sur le cœur d'un SaaS ou d'une appli, partout dans Bingoo!, pour le retrouver ici. Quand tu as choisi, lance ta version en un clic.</p>
      {rows?.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {[["tous", `Tout (${rows.length})`], ["saas", `SaaS (${n("saas")})`], ["appli", `Applis mobiles (${n("appli")})`]].map(([k, l]) => (
            <button key={k} onClick={() => setFiltre(k)} className={cx("rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold border", filtre === k ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-line hover:text-ink")}>{l}</button>
          ))}
        </div>
      )}
      {rows === undefined ? <p className="py-16 text-center text-ink-soft">Chargement…</p> : !rows.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="text-[17px] font-bold">Pas encore de favori</p>
          <p className="mt-1 text-ink-soft">Parcours les SaaS ou les applis mobiles et clique sur le cœur de ceux qui te plaisent.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => nav("/explorer")} className="rounded-xl bg-ink text-white px-4 py-2.5 font-bold">Voir les SaaS</button>
            <button onClick={() => nav("/explorer/applis")} className="rounded-xl border border-line bg-white px-4 py-2.5 font-bold">Voir les applis</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {liste.map((x) => (
            <div key={`${x.type}-${x.id}`} role="button" tabIndex={0} onClick={() => (x.type === "saas" ? nav(`/explorer/${x.domaine}`) : window.open(x.url, "_blank", "noopener"))}
              className="cursor-pointer rounded-2xl border border-line bg-white p-4 hover:border-ink/30 flex flex-col">
              <div className="flex items-start gap-3">
                {x.type === "saas" ? <CompanyLogo name={x.nom} url={`https://${x.domaine}`} className="w-11 h-11 shrink-0" pad="p-1.5" />
                  : x.icone ? <img src={x.icone} alt="" className="w-11 h-11 rounded-xl border border-line shrink-0" /> : <span className="w-11 h-11 rounded-xl bg-paper shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[15.5px] leading-tight truncate">{x.nom}</p>
                  <p className="text-[12.5px] text-ink-faint truncate">{x.type === "saas" ? x.domaine : `Appli · ${x.editeur ?? ""}`}</p>
                </div>
                <Favori type={x.type} id={x.id} nom={x.nom} />
              </div>
              {x.categorie && <span className="mt-2.5 self-start rounded-full bg-accent/10 text-accent-dark px-2.5 py-0.5 text-[12px] font-semibold">{x.categorie}</span>}
              {x.description && <p className="mt-2 text-[13.5px] text-ink-soft line-clamp-2">{x.description}</p>}
              <div className="mt-auto pt-3 flex items-center gap-2 text-[13px]">
                {x.type === "saas" ? (
                  <>
                    <span className="font-bold tnum">{x.mrr > 0 ? `${$(x.mrr)}/mois vérifiés` : <span className="font-normal text-ink-faint">pas de revenu public</span>}</span>
                    <button onClick={(e) => { e.stopPropagation(); nav(`/explorer/lancer?d=${x.domaine}`); }} className="ml-auto rounded-lg bg-accent text-white px-3 py-1.5 text-[12.5px] font-bold hover:bg-accent-dark">Lancer ma version</button>
                  </>
                ) : (
                  <span className="text-ink-soft tnum">{x.note != null ? `${Number(x.note).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ★ · ` : ""}{Number(x.avis ?? 0).toLocaleString("fr-FR")} avis{x.rang_revenus ? ` · ${x.rang_revenus}ᵉ des recettes` : ""}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
