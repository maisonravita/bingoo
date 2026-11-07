import { useState } from "react";
import { useWs } from "../lib/ws";
import { trace } from "../lib/usage";
import { useDansLieu } from "../lib/lieu";

/** En haut de chaque page : à quoi elle sert et quoi faire, en 2 ou 3 gestes. Se replie d'un clic (mémorisé sur cet appareil). */
export default function Guide({ id, titre, etapes }) {
  const { ws } = useWs();
  const dans = useDansLieu();
  const [ouvert, setOuvert] = useState(false);
  // Dans un bâtiment, l'en-tête dit déjà à quoi sert le lieu : rien de plus. Ailleurs : un petit lien, les gestes à la demande.
  if (dans) return null;
  if (!ouvert) return <button onClick={() => { setOuvert(true); trace(ws?.id, "aide", id); }} className="mb-4 text-[13px] text-ink-soft underline hover:text-ink">Comment faire ?</button>;
  return (
    <section aria-label="Comment faire" className="mb-5 rounded-2xl bg-[#FFF1E6] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-[15px]">{titre.replace(/^Ici : (.)/, (_, c) => c.toUpperCase())}</p>
        <button onClick={() => setOuvert(false)} className="shrink-0 text-[13px] text-ink-soft hover:text-ink">Fermer</button>
      </div>
      <ol className="mt-2 space-y-1.5">
        {etapes.map((e, i) => (
          <li key={i} className="flex gap-2.5 text-[14px]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">{i + 1}</span><span>{e}</span></li>
        ))}
      </ol>
    </section>
  );
}
