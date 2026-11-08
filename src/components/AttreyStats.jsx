import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Rendement par canal sur 30 jours : ce qui ramène vraiment des prospects, et à quel coût.
// Les chiffres viennent de la base (passages enregistrés, pistes, statuts, coût IA réel) : rien n'est estimé.
const eur = (n) => (n == null ? "—" : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);

export default function AttreyStats({ workspaceId, refresh = 0 }) {
  const [rows, setRows] = useState(null);
  const [jours, setJours] = useState(30);
  useEffect(() => {
    supabase.rpc("attrey_stats", { ws: workspaceId, jours }).then(({ data }) => setRows(data ?? []));
  }, [workspaceId, jours, refresh]);
  if (!rows) return null;
  const tot = rows.reduce((t, r) => ({ pistes: t.pistes + Number(r.pistes), q: t.q + Number(r.qualifiees), rdv: t.rdv + Number(r.rdv), cout: t.cout + Number(r.cout_eur) }), { pistes: 0, q: 0, rdv: 0, cout: 0 });
  return (
    <div className="rounded-2xl border border-line bg-white p-4" data-stats>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-[15px]">Rendement par source</p>
          <p className="text-[12.5px] text-ink-faint">Une piste devient « qualifiée » quand tu l'ajoutes à tes prospects ou la passes en « Qualifié ».</p>
        </div>
        <select value={jours} onChange={(e) => setJours(Number(e.target.value))} className="rounded-lg border border-line bg-white px-2 py-1.5 text-[13px]">
          <option value={7}>7 jours</option><option value={30}>30 jours</option><option value={90}>90 jours</option>
        </select>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[13.5px] tnum">
          <thead><tr className="text-left text-ink-faint text-[12px]">
            <th className="py-1.5 pr-3 font-medium">Source</th><th className="py-1.5 px-2 font-medium text-right">Passages</th><th className="py-1.5 px-2 font-medium text-right">Pistes</th>
            <th className="py-1.5 px-2 font-medium text-right">Qualifiées</th><th className="py-1.5 px-2 font-medium text-right">Rendez-vous</th><th className="py-1.5 px-2 font-medium text-right">Coût</th><th className="py-1.5 pl-2 font-medium text-right">Coût / qualifiée</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.canal} className="border-t border-line">
                <td className="py-2 pr-3 font-medium">{r.libelle}</td>
                <td className="py-2 px-2 text-right text-ink-soft">{["web", "forums"].includes(r.canal) ? r.recherches : "chaque nuit"}</td>
                <td className="py-2 px-2 text-right">{r.pistes}</td>
                <td className="py-2 px-2 text-right">{r.qualifiees}</td>
                <td className="py-2 px-2 text-right font-semibold">{r.rdv}</td>
                <td className="py-2 px-2 text-right text-ink-soft">{eur(r.cout_eur)}</td>
                <td className="py-2 pl-2 text-right">{r.cout_par_qualifiee == null ? (Number(r.cout_eur) === 0 && Number(r.qualifiees) > 0 ? "gratuit" : "—") : eur(r.cout_par_qualifiee)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-ink/80 font-semibold">
              <td className="py-2 pr-3">Total</td><td /><td className="py-2 px-2 text-right">{tot.pistes}</td><td className="py-2 px-2 text-right">{tot.q}</td>
              <td className="py-2 px-2 text-right">{tot.rdv}</td><td className="py-2 px-2 text-right">{eur(tot.cout)}</td><td className="py-2 pl-2 text-right">{tot.q ? eur(tot.cout / tot.q) : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
