import { useEffect, useRef, useState } from "react";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";

/** Bulle d'aide, sur toutes les pages : réponse immédiate (l'assistant connaît Bingoo! et le compte),
 *  puis « Parler à un humain », qui prévient l'équipe par e-mail (réponse le jour même). */
export default function Assistance({ haut = false } = {}) {
  const { ws } = useWs();
  const [ouvert, setOuvert] = useState(false);
  const [fil, setFil] = useState([]); // { qui: "moi" | "bingoo" | "humain", texte }
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const bas = useRef(null);
  useEffect(() => { bas.current?.scrollIntoView({ block: "end" }); }, [fil, busy]);
  if (!ws?.id) return null;
  const poser = async () => {
    const question = q.trim(); if (question.length < 3 || busy) return;
    setFil((f) => [...f, { qui: "moi", texte: question }]); setQ(""); setBusy(true);
    try { const r = await fn("r/support", { workspace_id: ws.id, question }); setFil((f) => [...f, { qui: "bingoo", texte: r.reponse }]); }
    catch (e) { setFil((f) => [...f, { qui: "bingoo", texte: `Je n'arrive pas à répondre (${e.message}). Clique sur « Parler à un humain ».` }]); }
    finally { setBusy(false); }
  };
  const humain = async () => {
    const derniere = [...fil].reverse().find((x) => x.qui === "moi")?.texte || q.trim();
    if (!derniere) { setFil((f) => [...f, { qui: "bingoo", texte: "Écris d'abord ta question en une phrase, puis clique sur « Parler à un humain »." }]); return; }
    setBusy(true);
    try { await fn("r/support", { workspace_id: ws.id, question: derniere, humain: true, echange: fil }); setFil((f) => [...f, { qui: "humain", texte: "C'est transmis à l'équipe Bingoo! : tu reçois la réponse par e-mail, à l'adresse de ton compte, le jour même." }]); }
    catch (e) { setFil((f) => [...f, { qui: "bingoo", texte: `L'envoi n'a pas marché (${e.message}). Réessaie dans un instant.` }]); }
    finally { setBusy(false); }
  };
  return (
    <>
      {ouvert && <div className={(haut ? "bottom-[136px]" : "bottom-20") + " fixed right-4 z-[60] flex h-[min(520px,calc(100vh-120px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-30px_rgba(21,23,42,.45)]"}>
        <div className="flex items-center justify-between bg-ink px-4 py-3 text-white">
          <div><p className="text-[14px] font-semibold">Une question ?</p><p className="text-[12px] text-white/70">Réponse immédiate, et un humain si besoin.</p></div>
          <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer l'aide" className="grid h-8 w-8 place-items-center rounded-lg text-white/80 hover:bg-white/10">×</button>
        </div>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3 text-[14px] leading-relaxed">
          {!fil.length && <p className="text-ink-soft">Demande par exemple : « comment changer la photo de mon site ? », « pourquoi ma modification ne marche pas ? », « comment brancher mon nom de domaine ? »</p>}
          {fil.map((x, i) => <div key={i} className={cx("max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2", x.qui === "moi" ? "ml-auto bg-[#F1EEE8] text-ink" : x.qui === "humain" ? "bg-[#EEF7F1] text-[#1E3A2A]" : "bg-white text-ink ring-1 ring-line")}>{x.texte}</div>)}
          {busy && <p className="text-[13px] text-ink-faint">…</p>}
          <div ref={bas} />
        </div>
        <div className="border-t border-line p-3">
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") poser(); }} placeholder="Ta question…" aria-label="Ta question" className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-[14px] outline-none focus:border-ink" />
            <button type="button" onClick={poser} disabled={busy || q.trim().length < 3} className="rounded-xl bg-ink px-3.5 text-[13px] font-semibold text-white disabled:opacity-40">Envoyer</button>
          </div>
          <button type="button" onClick={humain} disabled={busy} className="mt-2 w-full rounded-xl border border-line py-2 text-[13px] font-semibold text-ink-soft hover:text-ink disabled:opacity-40">Parler à un humain (réponse par e-mail le jour même)</button>
        </div>
      </div>}
      <button type="button" onClick={() => setOuvert((o) => !o)} aria-label={ouvert ? "Fermer l'aide" : "Ouvrir l'aide"} className={(haut ? "bottom-[72px]" : "bottom-4") + " fixed right-4 z-[60] flex h-12 items-center gap-2 rounded-full bg-ink px-4 text-[14px] font-semibold text-white shadow-lg hover:brightness-125"}>
        <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-white/15 text-[13px]">?</span>{ouvert ? "Fermer" : "Aide"}
      </button>
    </>
  );
}
