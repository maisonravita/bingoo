import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button, useToast } from "./ui";
import { cx } from "../lib/utils";

// Demande publique : quelqu'un cherche en ce moment, en public, une solution comme celle du client.
// Bingoo! propose une réponse ; le client la relit, la copie et la publie LUI-MÊME (jamais de publication automatique).
const PLAT = {
  Reddit: "bg-[#FFE6DA] text-[#C2410C]", X: "bg-ink text-white", LinkedIn: "bg-[#E8F1FB] text-[#0A66C2]",
  "Indie Hackers": "bg-[#E0F2FE] text-[#0369A1]", "Product Hunt": "bg-[#FDE8E1] text-[#C2410C]", Forum: "bg-paper text-ink-soft", Devis: "bg-good-soft text-good",
};
const quand = (d) => {
  if (!d) return "";
  const j = Math.round((Date.now() - new Date(d).getTime()) / 864e5);
  return j <= 0 ? "aujourd'hui" : j === 1 ? "hier" : `il y a ${j} jours`;
};

export default function Demande({ o, onDone, compact = false }) {
  const toast = useToast();
  const [txt, setTxt] = useState(o.raw?.reponse ?? "");
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState("");
  const plat = o.raw?.plateforme || o.source || "Web";
  const fait = !!o.raw?.repondu_at;

  const ecrire = async (patch, ok) => {
    setBusy(ok);
    const { error } = await supabase.from("radar_opps").update(patch).eq("id", o.id);
    setBusy("");
    if (error) return toast("Échec, réessaie", "bad");
    onDone?.(o.id, patch);
    return true;
  };
  // Copier la réponse puis ouvrir la publication : le client colle et publie lui-même
  const repondre = async () => {
    try { await navigator.clipboard.writeText(txt); toast("Réponse copiée : colle-la sous la publication", "good"); }
    catch { toast("Copie impossible : sélectionne le texte", "bad"); }
    if (txt !== (o.raw?.reponse ?? "")) supabase.from("radar_opps").update({ raw: { ...(o.raw ?? {}), reponse: txt } }).eq("id", o.id).then(() => {});
    window.open(o.url, "_blank", "noopener");
  };
  const repondu = () => ecrire({ status: "suivi", raw: { ...(o.raw ?? {}), reponse: txt, repondu_at: new Date().toISOString() } }, "ok").then((r) => r && toast("Noté. Reviens voir si la personne te répond.", "good"));
  const ecarter = () => ecrire({ status: "ecarte", feedback: "pas_pertinent" }, "non").then((r) => r && toast("Écartée : Bingoo! en tiendra compte", "default"));

  return (
    <article className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className={cx("rounded-full px-2.5 py-0.5 font-semibold", PLAT[plat] ?? "bg-paper text-ink-soft")}>{plat}</span>
        {o.raw?.intention === "remplacement" && <span className="rounded-full bg-bad-soft text-bad px-2.5 py-0.5 font-semibold">Veut changer d'outil</span>}
        <span className="text-ink-faint">{[o.raw?.auteur, quand(o.published || o.created_at)].filter(Boolean).join(" · ")}</span>
        {fait && <span className="ml-auto rounded-full bg-good-soft text-good px-2.5 py-0.5 font-semibold">Tu as répondu</span>}
      </div>
      <p className="mt-2 text-[15.5px] font-semibold leading-snug">« {o.title || o.summary} »</p>
      {o.why && !compact && <p className="mt-1 text-[13.5px] text-ink-soft">{o.why}</p>}
      {txt ? (
        <div className="mt-3 rounded-xl bg-paper p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-bold text-ink-soft">Ta réponse, prête à publier</p>
            <button onClick={() => setEdit((x) => !x)} className="text-[12px] font-semibold text-ink-soft hover:text-ink">{edit ? "Terminé" : "Modifier"}</button>
          </div>
          {edit
            ? <textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={5} className="mt-1.5 w-full rounded-lg border border-line bg-white p-2.5 text-[14px] leading-relaxed" />
            : <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-line">{txt}</p>}
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
        <Button variant="accent" onClick={repondre} disabled={!o.url}>{txt ? "Copier et ouvrir" : "Ouvrir la demande"}</Button>
        <Button variant="ghost" loading={busy === "ok"} disabled={!!busy || fait} onClick={repondu}>{fait ? "Répondu ✓" : "J'ai répondu"}</Button>
        <Button variant="ghost" loading={busy === "non"} disabled={!!busy} onClick={ecarter}>Pas pour moi</Button>
      </div>
      {!compact && <p className="mt-2 text-[11.5px] text-ink-faint">Bingoo! ne publie jamais à ta place : tu restes maître de ton compte et de ton ton.</p>}
    </article>
  );
}
