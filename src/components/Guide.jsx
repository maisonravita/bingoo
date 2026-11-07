import { useState } from "react";
import { useWs } from "../lib/ws";
import { trace } from "../lib/usage";

/** En haut de chaque page : à quoi elle sert et quoi faire, en 2 ou 3 gestes. Se replie d'un clic (mémorisé sur cet appareil). */
export default function Guide({ id, titre, etapes }) {
  const key = `bingoo-guide-${id}`;
  const { ws } = useWs();
  const [ferme, setFerme] = useState(() => { try { return localStorage.getItem(key) === "1"; } catch { return false; } });
  const toggle = (v) => { setFerme(v); try { localStorage.setItem(key, v ? "1" : "0"); } catch { /* stockage indisponible */ } };
  if (ferme) return <button onClick={() => { toggle(false); trace(ws?.id, "aide", id); }} className="mb-4 text-[13px] text-ink-soft underline hover:text-ink">Comment utiliser cette page ?</button>;
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
