import { useEffect, useState } from "react";
import { cx } from "../lib/utils";
import { CANAUX, DELAIS, STADES, TYPES, VALEURS, mensuel } from "../lib/estimation";

// Inscription en questions : une question par écran, de grandes réponses, des écrans qui expliquent entre les questions.
// Les réponses servent au plan d'action final (fourchette honnête, hypothèses visibles) et à l'analyse du produit.
const HF = { fontFamily: "Nunito, Geist, system-ui, sans-serif" };
const KEY = "bingoo-quiz";

const ECRANS = [
  { id: "stade", type: "un", titre: "Où en es-tu en ce moment ?", options: STADES },
  { id: "type", type: "un", titre: "Tu es…", options: TYPES },
  { id: "info_signaux", type: "info" },
  { id: "valeur", type: "un", titre: (r) => mensuel(r.type) ? "Combien paie un client, par mois ?" : "Combien te rapporte un client, sur un an ?", options: (r) => VALEURS[mensuel(r.type) ? "mois" : "an"].map(([v, l]) => [v, l, "💶"]) },
  { id: "canaux", type: "plusieurs", titre: "Comment trouves-tu tes clients aujourd'hui ?", options: CANAUX },
  { id: "info_canaux", type: "info" },
  { id: "objectif", type: "curseur", titre: "Combien de nouveaux clients veux-tu par mois ?" },
  { id: "horizon", type: "un", titre: "Pour quand ?", options: DELAIS.map(([v, l]) => [v, l, "🗓️"]) },
];

function Info({ id, r }) {
  if (id === "info_signaux") return (
    <div className="text-center">
      <h1 className="text-[32px] sm:text-[44px] font-black leading-[1.05] tracking-tight" style={HF}>Tes prochains clients sont déjà en train de bouger.</h1>
      <p className="mt-4 text-[17px] text-ink-soft max-w-lg mx-auto">Une entreprise qui recrute, lève des fonds, change de dirigeant ou cherche une alternative à ton concurrent a besoin d'une solution maintenant. Bingoo! repère ces moments chaque nuit, dans les registres officiels et sur le web.</p>
      <div className="mt-8 grid gap-2.5 max-w-md mx-auto text-left">
        {[["🧲", "Recrute 2 commerciaux", "Offre d'emploi publiée hier"], ["💸", "Lève 1,5 M€", "Annoncé cette semaine"], ["🔁", "« Une alternative à … ? »", "Demandé en public sur LinkedIn"]].map(([i, t, d]) => (
          <div key={t} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_10px_30px_-24px_rgba(21,22,26,.5)]">
            <span className="h-10 w-10 grid place-items-center rounded-full bg-accent-soft text-[20px]">{i}</span>
            <span><span className="block font-semibold">{t}</span><span className="block text-[13px] text-ink-soft">{d}</span></span>
            <span className="ml-auto rounded-full bg-good-soft text-good px-2.5 py-0.5 text-[12px] font-bold">Bon moment</span>
          </div>
        ))}
        <p className="text-center text-[12px] text-ink-faint">Exemples de signaux. Les tiens arrivent dans une minute.</p>
      </div>
    </div>
  );
  return (
    <div className="text-center">
      <h1 className="text-[32px] sm:text-[44px] font-black leading-[1.05] tracking-tight" style={HF}>Bingoo! prospecte sur tous les canaux à la fois.</h1>
      <p className="mt-4 text-[17px] text-ink-soft max-w-lg mx-auto">{(r.canaux ?? []).includes("rien") || !(r.canaux ?? []).length ? "Pas besoin d'avoir déjà une méthode : Bingoo! en met une en place pour toi." : "Tu gardes ce qui marche déjà. Bingoo! ajoute le reste, au même endroit."} Il écrit, tu valides en un clic.</p>
      <div className="mt-8 grid grid-cols-2 gap-3 max-w-md mx-auto text-left">
        {[["✉️", "E-mail", "Au décideur, sur un fait récent"], ["💼", "LinkedIn", "Invitation puis message"], ["🗣️", "Demandes publiques", "Reddit, X, forums : réponse prête"], ["📞", "Appel", "Numéro et script après les relances"]].map(([i, t, d]) => (
          <div key={t} className="rounded-2xl border border-line bg-white p-4">
            <span className="text-[24px]">{i}</span>
            <p className="mt-1 font-bold">{t}</p>
            <p className="text-[13px] text-ink-soft leading-snug">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Quiz({ onDone }) {
  const [r, setR] = useState(() => { try { return JSON.parse(sessionStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const [i, setI] = useState(0);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(r)); } catch { /* navigation privée */ } }, [r]);
  const e = ECRANS[i];
  const val = (x) => (typeof x === "function" ? x(r) : x);
  const suivant = (nr = r) => { if (i + 1 < ECRANS.length) { setI(i + 1); window.scrollTo({ top: 0 }); } else onDone(nr); };
  const choisir = (v) => { const nr = { ...r, [e.id]: v }; setR(nr); setTimeout(() => suivant(nr), 220); };
  const basculer = (v) => setR((x) => { const cur = x[e.id] ?? []; const on = cur.includes(v); const next = v === "rien" ? (on ? [] : ["rien"]) : (on ? cur.filter((k) => k !== v) : [...cur.filter((k) => k !== "rien"), v]); return { ...x, [e.id]: next }; });
  const objectif = r.objectif ?? 5;
  const peutContinuer = e.type === "info" || e.type === "curseur" || (e.type === "plusieurs" && (r[e.id] ?? []).length > 0);

  return (
    <div className="min-h-[calc(100vh-160px)] flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <button type="button" onClick={() => setI(Math.max(0, i - 1))} className={cx("h-9 w-9 grid place-items-center rounded-full hover:bg-black/5", !i && "invisible")} aria-label="Retour">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>
        </button>
        <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${ECRANS.length + 2}, minmax(0, 1fr))` }} aria-hidden>
          {Array.from({ length: ECRANS.length + 2 }, (_, k) => <span key={k} className={cx("h-1.5 rounded-full transition-colors duration-500", k <= i ? "bg-ink" : "bg-line")} />)}
        </div>
      </div>

      <div key={e.id} className="rise flex-1">
        {e.type === "info" ? <Info id={e.id} r={r} /> : (<>
          <h1 className="text-center text-[32px] sm:text-[44px] font-black leading-[1.05] tracking-tight" style={HF}>{val(e.titre)}</h1>
          {e.type === "curseur" ? (
            <div className="mt-12 max-w-md mx-auto text-center">
              <p className="text-[64px] font-black leading-none tnum" style={HF}>{objectif >= 30 ? "30+" : objectif}</p>
              <p className="text-ink-soft mt-1">nouveau{objectif > 1 ? "x" : ""} client{objectif > 1 ? "s" : ""} par mois</p>
              <input type="range" min="1" max="30" value={objectif} onChange={(x) => setR({ ...r, objectif: Number(x.target.value) })} className="mt-8 w-full accent-[#E0531F]" aria-label="Objectif de nouveaux clients par mois" />
              <div className="mt-2 flex justify-between text-[13px] text-ink-faint tnum"><span>1</span><span>10</span><span>20</span><span>30+</span></div>
            </div>
          ) : (
            <ul className="mt-9 max-w-md mx-auto space-y-2.5">
              {val(e.options).map(([v, l, ic]) => {
                const on = e.type === "plusieurs" ? (r[e.id] ?? []).includes(v) : r[e.id] === v;
                return (
                  <li key={v}>
                    <button type="button" onClick={() => (e.type === "plusieurs" ? basculer(v) : choisir(v))}
                      className={cx("w-full flex items-center gap-4 rounded-2xl border bg-white px-4 py-3 text-left transition active:scale-[0.99]", on ? "border-ink shadow-[0_0_0_1px_#15161A]" : "border-line hover:border-ink-faint")}>
                      <span className="h-11 w-11 shrink-0 grid place-items-center rounded-full bg-accent-soft/70 text-[22px]" aria-hidden>{ic}</span>
                      <span className="flex-1 text-[16.5px]">{l}</span>
                      <span className={cx("h-6 w-6 shrink-0 grid place-items-center border-2 transition", e.type === "plusieurs" ? "rounded-md" : "rounded-full", on ? "bg-ink border-ink text-white" : "border-line")}>
                        {on && <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 8 3.5 3.5L13 5" /></svg>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>)}
      </div>

      {e.type !== "un" && (
        <div className="sticky bottom-4 mt-10 max-w-md w-full mx-auto">
          <button type="button" disabled={!peutContinuer} onClick={() => suivant()} className="w-full rounded-2xl bg-ink text-white py-4 text-[17px] font-bold hover:bg-black disabled:bg-line disabled:text-ink-faint transition">Continuer ›</button>
        </div>
      )}
    </div>
  );
}
