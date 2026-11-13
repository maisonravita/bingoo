// Le choix de la formule « Lancer » : un seul SaaS, payé pour 1, 3 ou 12 mois (prix affichés par mois).
// Utilisé à la fin du parcours « Trouver mon SaaS » et sur la page Abonnement.
import { cx } from "../lib/utils";

// Repli si le serveur ne répond pas : mêmes valeurs que PERIODES dans supabase/functions/_shared/core.ts
export const PERIODES_LOCAL = [
  { key: "mois", label: "1 mois", mois: 1, parMois: 34.99, inclus: ["Ton SaaS construit et en ligne, à ton nom", "Tes SaaS à succès, avec leur nom et leurs chiffres", "Ton plan sur 30 jours"] },
  { key: "trimestre", label: "3 mois", mois: 3, parMois: 22.99, inclus: ["Tout ce qu'il y a dans 1 mois", "Ton plan pour tes 10 premiers clients, avec des établissements à contacter trouvés pour toi", "L'étape du jour chaque matin par e-mail", "L'assistant IA de ton SaaS"] },
  { key: "an", label: "12 mois", mois: 12, parMois: 11.99, inclus: ["Tout ce qu'il y a dans 3 mois", "Changer de SaaS une fois dans l'année", "Réponse prioritaire par e-mail"] },
];
const eur = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));
const Tick = () => <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;

export default function ChoixFormule({ periodes, fondateur, onChoisir, busy, actuelle, sombre = false }) {
  const liste = periodes?.length ? periodes : PERIODES_LOCAL;
  return (
    <div>
      <div className={cx("mb-6 flex items-center gap-3 rounded-2xl px-4 py-3.5", sombre ? "bg-white/10" : "bg-good-soft")}>
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-good" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" /><path d="m9 12 2 2 4-4" /></svg>
        <p className="text-[15px]"><b>Ta version en ligne sous 14 jours, ou remboursé intégralement.</b> <span className="text-ink-soft">Sans engagement : tu arrêtes quand tu veux.</span></p>
      </div>
      <div className="grid md:grid-cols-3 gap-4 items-stretch">
        {liste.map((p) => {
          const vedette = p.key === "trimestre";
          const prixFondateur = p.key === "mois" && fondateur ? fondateur : null;
          const parMois = prixFondateur ?? p.parMois;
          const total = Math.round(parMois * p.mois * 100) / 100;
          const courante = actuelle === p.key;
          return (
            <div key={p.key} className={cx("relative flex flex-col rounded-3xl p-5 sm:p-6", vedette ? "bg-[#16171B] text-white shadow-[0_30px_60px_-30px_rgba(21,22,26,.6)] md:-my-2 md:py-8" : "border border-line bg-white")}>
              {vedette && <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-[12px] font-bold text-white">Le plus choisi</span>}
              <p className="font-bold text-[17px]">{p.label}</p>
              <p className="mt-3 flex items-baseline gap-1.5">
                {prixFondateur && <span className={cx("text-[18px] line-through tnum", vedette ? "text-white/45" : "text-ink-faint")}>{eur(p.parMois)} €</span>}
                <span className="text-[40px] font-black leading-none tnum" style={{ fontFamily: "var(--font-titre)" }}>{eur(parMois)} €</span>
                <span className={cx("text-[14px]", vedette ? "text-white/60" : "text-ink-faint")}>/ mois</span>
              </p>
              <p className={cx("mt-1.5 text-[13px]", vedette ? "text-white/65" : "text-ink-soft")}>{prixFondateur ? "prix fondateur, à vie · " : ""}{p.mois === 1 ? "facturé chaque mois" : `${eur(total)} € facturés tous les ${p.mois === 12 ? "ans" : `${p.mois} mois`}`} · sans engagement</p>
              <ul className="mt-5 space-y-2.5 text-[14px] flex-1">{p.inclus.map((x) => <li key={x} className="flex gap-2.5"><span className={vedette ? "text-[#F6A06B]" : "text-accent"}><Tick /></span><span>{x}</span></li>)}</ul>
              <button onClick={() => onChoisir(p.key)} disabled={!!busy || courante} className={cx("mt-6 w-full rounded-xl py-3.5 text-[15px] font-bold transition disabled:opacity-60", vedette ? "bg-accent text-white hover:bg-accent-dark" : "bg-ink text-white hover:bg-black")}>
                {courante ? "Ta formule actuelle" : busy === p.key ? "Ouverture du paiement…" : `Choisir ${p.label}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className={cx("mt-5 text-center text-[13.5px]", sombre ? "text-white/60" : "text-ink-soft")}>Un SaaS par abonnement. Prix hors taxes. Bingoo! construit et met en ligne ton SaaS ; ses ventes dépendent du marché et de ton travail, aucun revenu n'est garanti.</p>
    </div>
  );
}
