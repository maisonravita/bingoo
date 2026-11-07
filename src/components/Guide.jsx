import { useState } from "react";
import { useWs } from "../lib/ws";
import { trace } from "../lib/usage";
import { useDansLieu } from "../lib/lieu";

/** En haut de chaque page : à quoi elle sert et quoi faire, en 2 ou 3 gestes. Se replie d'un clic (mémorisé sur cet appareil). */
export default function Guide({ id, titre, etapes }) {
  const key = `bingoo-guide-${id}`;
  const { ws } = useWs();
  const [ferme, setFerme] = useState(() => { try { return localStorage.getItem(key) === "1"; } catch { return false; } });
  const toggle = (v) => { setFerme(v); try { localStorage.setItem(key, v ? "1" : "0"); } catch { /* stockage indisponible */ } };
  const dans = useDansLieu();
  const [vu, setVu] = useState(false);
  // Dans un bâtiment : une seule ligne, les gestes s'ouvrent à la demande (la ville a déjà dit à quoi sert le lieu)
  if (dans && !vu) return (
    <button onClick={() => { setVu(true); trace(ws?.id, "aide", id); }} className="mb-4 flex w-full items-center gap-2.5 rounded-2xl bg-[#FFF1E6] px-3.5 py-2.5 text-left text-[13.5px] text-ink hover:bg-[#FFE8D6]">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#F26A21] text-[11px] font-black text-white" aria-hidden>?</span>
      <span className="min-w-0 flex-1 truncate">{titre.replace(/^Ici : (.)/, (_, c) => c.toUpperCase())}</span>
      <span className="shrink-0 font-semibold text-[#C2410C]">Comment faire</span>
    </button>
  );
  if (ferme && !dans) return <button onClick={() => { toggle(false); trace(ws?.id, "aide", id); }} className="mb-4 text-[13px] text-ink-soft underline hover:text-ink">Comment utiliser cette page ?</button>;
  return (
    <section aria-label="Comment utiliser cette page" className="mb-5 rounded-2xl border border-accent/25 bg-accent-soft/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-[15px]">{titre}</p>
        <button onClick={() => toggle(true)} className="shrink-0 text-[13px] text-ink-soft hover:text-ink">J'ai compris</button>
      </div>
      <ol className="mt-2 space-y-1.5">
        {etapes.map((e, i) => (
          <li key={i} className="flex gap-2.5 text-[14px]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">{i + 1}</span><span>{e}</span></li>
        ))}
      </ol>
    </section>
  );
}
