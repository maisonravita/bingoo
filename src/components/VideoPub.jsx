// Vidéo pub en motion design du SaaS : scénario écrit par l'IA (10 crédits), animation et export dans le navigateur.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useToast } from "./ui";
import { cx } from "../lib/utils";
import { DUREE, FORMATS, dessiner, exporterVideo, preparerPolice } from "../lib/videoPub";

const lienCourt = (l) => String(l || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

export default function VideoPub({ app, lien }) {
  const { ws } = useWs();
  const toast = useToast();
  const nav = useNavigate();
  const [videos, setVideos] = useState(null);
  const [sel, setSel] = useState(null);
  const [format, setFormat] = useState("vertical");
  const [solde, setSolde] = useState(null);
  const [angle, setAngle] = useState("");
  const [busy, setBusy] = useState(false);
  const [export_, setExport] = useState(null);
  const [lecture, setLecture] = useState(true);
  const canvas = useRef(null);
  const t0 = useRef(performance.now());
  const cout = 10;

  const charger = async () => {
    const [v, c] = await Promise.all([fn("r/saas-videos", { workspace_id: ws.id, app_id: app.id }).catch(() => ({ videos: [] })), fn("r/credits", { workspace_id: ws.id }).catch(() => null)]);
    setVideos(v.videos ?? []); setSel((s) => s ?? v.videos?.[0] ?? null); setSolde(c?.solde ?? 0);
  };
  useEffect(() => { charger(); preparerPolice(); }, [app.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const opts = { nom: app.spec?.nom ?? "Mon SaaS", couleur: app.spec?.couleur ?? "#4F46E5", lien: lienCourt(lien) };
  const [W, H] = FORMATS[format];
  const dessinerA = (t) => { const c = canvas.current; if (c && sel) dessiner(c.getContext("2d"), W, H, t, sel.script, opts); };

  // Lecture en boucle de l'aperçu
  useEffect(() => {
    if (!sel || export_ != null || !lecture) return;
    let id; t0.current = performance.now();
    const image = () => { dessinerA(((performance.now() - t0.current) / 1000) % DUREE); id = requestAnimationFrame(image); };
    id = requestAnimationFrame(image);
    return () => cancelAnimationFrame(id);
  }, [sel, format, export_, lecture]); // eslint-disable-line react-hooks/exhaustive-deps

  const creer = async () => {
    if ((solde ?? 0) < cout) { nav("/abonnement#credits"); return; }
    setBusy(true);
    try {
      const v = await fn("r/saas-video", { workspace_id: ws.id, app_id: app.id, format, angle: angle.trim() || undefined });
      setVideos((l) => [v, ...(l ?? [])]); setSel(v); setSolde((s) => (s ?? cout) - cout); setLecture(true);
      toast("Ta vidéo est prête : 10 crédits utilisés");
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const telecharger = async () => {
    setExport(0);
    try {
      const { blob, ext } = await exporterVideo(canvas.current, dessinerA, setExport);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${app.slug}-pub-${format}.${ext}`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast("Vidéo téléchargée");
    } catch (e) { toast(e.message, "bad"); } finally { setExport(null); }
  };

  return (
    <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <p className="text-[13px] font-bold uppercase tracking-wide text-[#F6A06B]">Vidéo pub</p>
          <h3 className="mt-1 text-[22px] font-black leading-tight">Une pub animée de {opts.nom}, prête à publier</h3>
          <p className="mt-1.5 text-[14px] text-white/65">20 secondes en motion design, aux couleurs de ton SaaS : l'accroche, tes écrans, tes bénéfices et ton lien. Pour TikTok, Reels, Shorts ou ta page.</p>
        </div>
        <p className="rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold">{solde == null ? "…" : `${solde} crédit${solde > 1 ? "s" : ""}`}</p>
      </div>

      <div className="mt-5 grid lg:grid-cols-[auto_1fr] gap-6 items-start">
        <div className="flex flex-col items-center gap-3">
          <div className={cx("relative overflow-hidden rounded-2xl bg-black/40 border border-white/10 grid place-items-center", format === "vertical" ? "w-[270px] h-[480px]" : "w-[480px] max-w-full aspect-video")}>
            {sel ? <canvas ref={canvas} width={W} height={H} className="w-full h-full" />
              : <p className="px-6 text-center text-[13.5px] text-white/50">{videos == null ? "Chargement…" : "Ta vidéo apparaîtra ici."}</p>}
            {export_ != null && (
              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-4 py-3 text-[12.5px]">
                <p className="font-semibold">Enregistrement de la vidéo… {Math.round(export_ * 100)} %</p>
                <p className="text-white/55">Garde cet onglet ouvert ({DUREE} secondes).</p>
              </div>
            )}
          </div>
          <div className="flex gap-1 rounded-xl bg-white/10 p-1 text-[13px] font-semibold">
            {[["vertical", "Vertical 9:16"], ["paysage", "Paysage 16:9"]].map(([k, l]) => (
              <button key={k} disabled={export_ != null} onClick={() => setFormat(k)} className={cx("rounded-lg px-3 py-1.5", format === k ? "bg-white text-ink" : "text-white/70 hover:text-white")}>{l}</button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {sel && (
            <div className="flex flex-wrap gap-2">
              <button onClick={telecharger} disabled={export_ != null} className="rounded-xl bg-accent px-5 py-2.5 text-[14px] font-bold hover:bg-accent-dark disabled:opacity-60">{export_ != null ? "Enregistrement…" : "Télécharger la vidéo"}</button>
              <button onClick={() => setLecture(!lecture)} disabled={export_ != null} className="rounded-xl bg-white/10 px-4 py-2.5 text-[14px] font-semibold hover:bg-white/20">{lecture ? "Pause" : "Lecture"}</button>
            </div>
          )}
          {sel && (
            <div className="rounded-xl bg-black/25 p-4 text-[13.5px] space-y-1.5">
              <p className="text-white/45 text-[12px] font-semibold uppercase tracking-wide">Le scénario</p>
              <p><b>{sel.script.accroche}</b></p>
              {sel.script.probleme && <p className="text-white/70">{sel.script.probleme}</p>}
              <p className="text-white/70">{sel.script.presentation}</p>
              <p className="text-white/55">{sel.script.ecrans.map((e) => e.titre).join(" · ")}</p>
              <p className="text-white/55">{sel.script.benefices.join(" · ")}</p>
              <p className="text-[#F6A06B] font-semibold">{sel.script.appel}</p>
            </div>
          )}
          <div className="rounded-xl border border-white/10 p-4">
            <p className="font-semibold text-[14.5px]">{sel ? "Une autre version" : "Créer ma vidéo"}</p>
            <input value={angle} onChange={(e) => setAngle(e.target.value)} maxLength={300} placeholder="Un angle en particulier ? (facultatif, ex. « pour les artisans pressés »)"
              className="mt-2 w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2.5 text-[14px] placeholder:text-white/35 outline-none focus:border-white/30" />
            <button onClick={creer} disabled={busy} className="mt-3 rounded-xl bg-white text-ink px-5 py-2.5 text-[14px] font-bold hover:bg-white/90 disabled:opacity-60">
              {busy ? "Bingoo! écrit ta vidéo…" : (solde ?? 0) < cout ? `Recharger mes crédits (il en faut ${cout})` : `Créer la vidéo · ${cout} crédits`}
            </button>
            <p className="mt-2 text-[12px] text-white/45">Une fois créée, tu la télécharges autant de fois que tu veux, dans les deux formats. Vidéo sans son : ajoute une musique tendance directement sur TikTok ou Instagram.</p>
          </div>
          {videos?.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {videos.map((v, i) => (
                <button key={v.id} onClick={() => setSel(v)} className={cx("rounded-lg px-3 py-1.5 text-[12.5px] font-semibold", sel?.id === v.id ? "bg-white text-ink" : "bg-white/10 text-white/70 hover:bg-white/20")}>Version {videos.length - i}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
