import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// La preuve que personne d'autre n'a : ce qu'encaissent les SaaS lancés avec Bingoo! (paiements de leurs clients).
// Totaux anonymes ; seuls les SaaS rendus publics par leur créateur sont nommés.
// Rien ne s'affiche tant qu'au moins 3 SaaS n'ont pas de clients payants : pas de chiffres creux.
const MIN = 3;
const euros = (n) => `${Number(n || 0).toLocaleString("fr-FR")} €`;

export default function ResultatsBingoo({ sombre = false, className = "" }) {
  const [d, setD] = useState(null);
  useEffect(() => { supabase.rpc("saas_resultats_bingoo").then(({ data }) => setD(data ?? null)); }, []);
  if (!d || d.avec_clients < MIN) return null;
  const c = sombre ? "text-white" : "text-ink";
  const doux = sombre ? "text-white/65" : "text-ink-soft";
  return (
    <section className={className}>
      <p className={`text-[14px] font-semibold ${sombre ? "text-[#F6A06B]" : "text-accent-dark"}`}>Lancés avec Bingoo!</p>
      <h2 className={`mt-1 text-[26px] sm:text-[34px] font-black leading-tight ${c}`} style={{ fontFamily: "var(--font-titre)" }}>
        {d.avec_clients} SaaS lancés avec Bingoo! ont déjà des clients payants
      </h2>
      <div className="mt-5 grid grid-cols-3 gap-3 max-w-xl">
        {[[d.avec_clients, "SaaS avec des clients"], [d.clients, "clients abonnés"], [euros(d.mrr), "encaissés chaque mois"]].map(([v, l]) => (
          <div key={l} className={`rounded-2xl border p-4 ${sombre ? "border-white/15" : "border-line bg-white"}`}>
            <p className={`text-[24px] font-black tnum leading-none ${c}`}>{typeof v === "number" ? v.toLocaleString("fr-FR") : v}</p>
            <p className={`mt-1 text-[12.5px] ${doux}`}>{l}</p>
          </div>
        ))}
      </div>
      {d.publics?.length > 0 && (
        <ul className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{d.publics.map((a) => (
          <li key={a.nom} className={`rounded-2xl border p-4 ${sombre ? "border-white/15" : "border-line bg-white"}`}>
            <p className={`font-bold ${c}`}>{a.nom}</p>
            {a.pitch && <p className={`mt-0.5 text-[13px] line-clamp-2 ${doux}`}>{a.pitch}</p>}
            <p className={`mt-2 text-[13px] font-semibold ${c}`}>{euros(a.mrr)} par mois · {a.abonnes} clients</p>
          </li>
        ))}</ul>
      )}
      <p className={`mt-3 text-[12px] ${doux}`}>Chiffres tirés des paiements reçus par ces SaaS. Seuls ceux que leur créateur a rendus publics sont nommés.</p>
    </section>
  );
}
