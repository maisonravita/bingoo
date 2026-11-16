import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { cx } from "../lib/utils";

// Valider une idée, sans IA : Bingoo! cherche les concurrents dans sa base (SaaS au revenu vérifié + applis mobiles),
// puis calcule un score sur 100 à partir de chiffres réels. Chaque point du score est expliqué.
const HF = { fontFamily: "var(--font-titre)" };
const $ = (n) => (n == null ? "—" : `${Math.round(n).toLocaleString("fr-FR")} $`);
const EXEMPLES = ["Un outil de facturation et de devis pour les freelances", "Une appli qui compte les calories à partir d'une photo du repas", "Un logiciel de réservation pour les salons de toilettage", "Une appli pour gérer les prêts de livres entre amis"];

export function noter(r) {
  const lignes = [];
  let demande;
  if (r.avec_revenu >= 10 && (r.mrr_1000 ?? 0) >= 3) { demande = 40; lignes.push([40, 40, `Demande prouvée : ${r.avec_revenu} concurrents encaissent déjà (revenu médian ${$(r.mrr_median)} par mois, jusqu'à ${$(r.mrr_max)}).`]); }
  else if (r.avec_revenu >= 3) { demande = 28; lignes.push([28, 40, `Demande réelle mais encore petite : ${r.avec_revenu} concurrents encaissent (revenu médian ${$(r.mrr_median)} par mois${(r.mrr_1000 ?? 0) ? `, ${r.mrr_1000} dépasse${r.mrr_1000 > 1 ? "nt" : ""} 1 000 $` : ", aucun ne dépasse 1 000 $"}).`]); }
  else if (r.avec_revenu >= 1) { demande = 15; lignes.push([15, 40, `Peu de preuves : ${r.avec_revenu} concurrent${r.avec_revenu > 1 ? "s" : ""} avec un revenu vérifié (jusqu'à ${$(r.mrr_max)} par mois).`]); }
  else if (r.applis_recettes >= 5) { demande = 25; lignes.push([25, 40, `Pas de revenu vérifié sur le web, mais ${r.applis_recettes} applis du même type sont dans les classements de recettes de l'App Store : le marché est surtout sur mobile.`]); }
  else { demande = 0; lignes.push([0, 40, "Aucun concurrent avec un revenu vérifié : personne n'a encore prouvé qu'on paie pour ça."]); }
  const c = r.concurrents;
  const conc = c === 0 ? 8 : c <= 2 ? 18 : c <= 30 ? 25 : c <= 80 ? 15 : 8;
  lignes.push([conc, 25, c === 0 ? "Aucun SaaS du même type dans la base : soit un vrai vide, soit pas de marché." : c <= 2 ? `Seulement ${c} SaaS du même type : la place est libre, mais le marché est peu testé.` : c <= 30 ? `${c} SaaS du même type : assez pour prouver le marché, pas trop pour se faire une place.` : `${c} SaaS du même type : marché encombré, il te faut un angle précis (une niche, un pays, un métier).`]);
  const p = r.prix_median;
  const prix = p == null ? 7 : p >= 20 ? 15 : p >= 10 ? 10 : 5;
  lignes.push([prix, 15, p == null ? "Prix rarement affichés chez les concurrents." : `Prix d'entrée médian des concurrents : ${Math.round(p)} € par mois${p < 10 ? " (bas : il faudra beaucoup de clients)" : ""}.`]);
  const g = r.croissance_mediane;
  const crois = g == null ? 5 : g >= 5 ? 10 : g >= 0 ? 6 : 2;
  lignes.push([crois, 10, g == null ? "Croissance des concurrents inconnue." : `Croissance médiane des concurrents sur 30 jours : ${g > 0 ? "+" : ""}${Number(g).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %.`]);
  const f = r.facile_median;
  const fac = f == null ? 5 : f >= 60 ? 10 : f >= 30 ? 6 : 3;
  lignes.push([fac, 10, f == null ? "Difficulté de construction inconnue." : f >= 60 ? "Les concurrents sont simples à construire : Bingoo! peut lancer ta version vite." : f >= 30 ? "Construction de difficulté moyenne." : "Les concurrents sont lourds à construire : commence par une version réduite."]);
  const score = demande + conc + prix + crois + fac;
  return { score, lignes };
}

export default function ValiderIdee() {
  const nav = useNavigate();
  const [texte, setTexte] = useState("");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState(null);
  const lancer = async (t = texte) => {
    if (!t.trim()) return;
    setTexte(t); setBusy(true); setR(null);
    const { data, error } = await supabase.rpc("saas_valider_idee", { p_texte: t });
    setBusy(false);
    setR(error ? { erreur: "La vérification n'a pas abouti. Réessaie dans un instant." } : data);
  };
  const n = r && !r.erreur ? noter(r) : null;
  const verdict = n && (n.score >= 70 ? ["Fonce", "bg-[#DCFCE7] text-[#166534]", "Le marché paie déjà et la place existe."] : n.score >= 50 ? ["Prometteur, il faut un angle", "bg-[#FEF3C7] text-[#92400E]", "Le marché existe : choisis une niche précise pour te démarquer."] : ["Risqué", "bg-[#FEE2E2] text-[#991B1B]", "Peu de preuves que des gens paient pour ça aujourd'hui."]);
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <p className="text-[12.5px] font-bold tracking-wider text-accent-dark">VALIDER UNE IDÉE</p>
      <h1 className="text-[34px] font-black leading-tight tracking-tight" style={HF}>Ton idée, face aux vrais chiffres.</h1>
      <p className="mt-1 text-ink-soft max-w-3xl">Décris ton idée : Bingoo! cherche les concurrents dans sa base de SaaS au revenu vérifié et d'applis mobiles, puis donne un score sur 100. Chaque point est expliqué par un chiffre réel. Aucune IA : le résultat ne s'invente rien.</p>
      <div className="mt-5 rounded-2xl border border-line bg-white p-4">
        <textarea value={texte} onChange={(e) => setTexte(e.target.value.slice(0, 500))} rows={3} placeholder="Ex. : un outil de facturation et de devis pour les freelances" className="w-full resize-none text-[15.5px] outline-none" />
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
          {EXEMPLES.map((e) => <button key={e} onClick={() => lancer(e)} className="rounded-full border border-line px-3 py-1 text-[12.5px] text-ink-soft hover:text-ink">{e}</button>)}
          <button onClick={() => lancer()} disabled={busy || !texte.trim()} className="ml-auto rounded-xl bg-ink text-white px-5 py-2.5 font-bold disabled:opacity-50">{busy ? "Vérification…" : "Valider mon idée"}</button>
        </div>
      </div>

      {r?.erreur && <p className="mt-5 text-ink-soft">{r.erreur}</p>}
      {n && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5 flex gap-5 items-start">
            <div className="rounded-2xl bg-paper w-24 h-24 grid place-items-center shrink-0"><div className="text-center"><p className="text-[38px] font-black leading-none tnum">{n.score}</p><p className="text-[12px] text-ink-faint">/ 100</p></div></div>
            <div className="min-w-0">
              <span className={cx("inline-block rounded-full px-3 py-1 text-[13px] font-bold", verdict[1])}>{verdict[0]}</span>
              <p className="mt-2 text-[16px] font-semibold">{verdict[2]}</p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {[["Concurrents", r.concurrents], ["Avec revenu vérifié", r.avec_revenu], ["Revenu médian", r.mrr_median != null ? $(r.mrr_median) : "—"], ["Applis mobiles", r.applis]].map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-paper py-2"><p className="font-black tnum text-[17px]">{v}</p><p className="text-[11.5px] text-ink-faint">{l}</p></div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="font-bold text-[16px]">Le détail du score</p>
            <ul className="mt-3 space-y-2.5">
              {n.lignes.map(([pts, max, t]) => (
                <li key={t} className="flex gap-3 text-[14px]"><span className="w-14 shrink-0 font-bold tnum text-right">{pts}/{max}</span><span className="text-ink-soft">{t}</span></li>
              ))}
            </ul>
          </div>
          {r.top?.length > 0 && (
            <div className="rounded-2xl border border-line bg-white overflow-hidden">
              <p className="px-5 pt-4 pb-2 font-bold text-[16px]">Les concurrents les plus proches</p>
              {r.top.map((x) => (
                <button key={x.domaine} onClick={() => nav(`/explorer/${x.domaine}`)} className="w-full text-left flex items-center gap-3 px-5 py-3 border-t border-line hover:bg-paper/60">
                  <div className="min-w-0 flex-1"><p className="font-semibold truncate">{x.nom}</p><p className="text-[12.5px] text-ink-faint truncate">{x.description}</p></div>
                  <span className="w-28 text-right text-[13.5px] font-bold tnum">{x.mrr > 0 ? `${$(x.mrr)}/mois` : <span className="text-ink-faint font-normal">pas de revenu public</span>}</span>
                </button>
              ))}
            </div>
          )}
          {r.top_applis?.length > 0 && (
            <div className="rounded-2xl border border-line bg-white overflow-hidden">
              <p className="px-5 pt-4 pb-2 font-bold text-[16px]">Sur mobile</p>
              {r.top_applis.map((x) => (
                <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-5 py-3 border-t border-line hover:bg-paper/60">
                  <p className="flex-1 min-w-0 font-semibold truncate">{x.nom}</p>
                  <span className="text-[13px] text-ink-soft tnum">{x.note != null ? `${Number(x.note).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ★` : ""} · {Number(x.avis ?? 0).toLocaleString("fr-FR")} avis{x.rang_revenus ? ` · ${x.rang_revenus}ᵉ des recettes` : ""}</span>
                </a>
              ))}
            </div>
          )}
          <p className="text-[12.5px] text-ink-faint">Mots cherchés : {(r.mots ?? []).map((m) => m.replace(/[()]|:\*/g, "")).join(", ")}. Un score n'est pas une garantie : il dit seulement ce que montrent les SaaS et applis déjà en ligne.</p>
        </div>
      )}
    </div>
  );
}
