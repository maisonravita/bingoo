// Vidéo pub en motion design du SaaS : scénario écrit par l'IA (10 crédits), animation et export dans le navigateur.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useToast } from "./ui";
import { cx } from "../lib/utils";
import { DUREE, FORMATS, STYLES, dessiner, exporterVideo, graineDe, preparerPolice } from "../lib/videoPub";
import { STYLES as STYLES_APP, styleDe } from "../lib/appShell";
import { AMBIANCES, ecouterMusique } from "../lib/musiqueVideo";
import AppCadre from "./AppCadre";

const lienCourt = (l) => String(l || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

export default function VideoPub({ app, lien, nu = false, angleInitial = "" }) {
  const { ws } = useWs();
  const toast = useToast();
  const nav = useNavigate();
  const [videos, setVideos] = useState(null);
  const [sel, setSel] = useState(null);
  const [format, setFormat] = useState("vertical");
  const [solde, setSolde] = useState(null);
  const [angle, setAngle] = useState(angleInitial);
  const [busy, setBusy] = useState(false);
  const [demande, setDemande] = useState("");
  const [retouche, setRetouche] = useState(false);
  const [export_, setExport] = useState(null);
  const [lecture, setLecture] = useState(true);
  const canvas = useRef(null);
  const t0 = useRef(performance.now());
  const cout = 10;
  // Style, musique : gardés pour ce SaaS
  const memo = (k, d) => { try { return localStorage.getItem(`bingoo-video-${k}-${app.id}`) ?? d; } catch { return d; } };
  const [style, setStyleV] = useState(() => memo("style", "percutant"));
  const [musique, setMusiqueV] = useState(() => memo("musique", "energique"));
  const garder = (k, v, set) => { set(v); try { localStorage.setItem(`bingoo-video-${k}-${app.id}`, v); } catch { /* stockage indisponible */ } };
  const [ecoute, setEcoute] = useState(null);
  useEffect(() => () => ecoute?.(), [ecoute]);
  const ecouter = () => { if (ecoute) { ecoute(); setEcoute(null); return; } if (musique === "aucune") return; const stop = ecouterMusique(musique, DUREE, graine); setEcoute(() => stop); setTimeout(() => setEcoute(null), DUREE * 1000); };
  // Les vrais écrans du SaaS : photographiés avec les données d'exemple, dans un cadre caché
  const ecransApp = (app.spec?.ecrans ?? []).filter((e) => e.code);
  const norm = (x) => String(x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const idDe = (titre, i) => (ecransApp.find((e) => norm(e.titre) === norm(titre)) ?? ecransApp.filter((e) => !e.public)[i] ?? ecransApp[i])?.id;
  const [imgs, setImgs] = useState({});
  const aCapturer = sel ? [...new Set(sel.script.ecrans.slice(0, 3).map((e, i) => idDe(e.titre, i)).filter(Boolean))].filter((id) => !(id in imgs)) : [];
  useEffect(() => {
    const ecoute = (ev) => {
      const d = ev.data;
      if (d?.slug !== app.slug || d?.type !== "bingoo-capture") return;
      if (!d.png) { setImgs((m) => ({ ...m, [d.id]: null })); return; }
      // Rendue une seule fois en image fixe : redessiner le SVG à chaque image de la vidéo serait trop lourd
      const im = new Image(); im.onload = () => { const cv = document.createElement("canvas"); cv.width = im.width || 1280; cv.height = im.height || 800; try { cv.getContext("2d").drawImage(im, 0, 0); setImgs((m) => ({ ...m, [d.id]: cv })); } catch { setImgs((m) => ({ ...m, [d.id]: null })); } }; im.onerror = () => setImgs((m) => ({ ...m, [d.id]: null })); im.src = d.png;
    };
    window.addEventListener("message", ecoute);
    return () => window.removeEventListener("message", ecoute);
  }, [app.slug]);
  const images = sel ? sel.script.ecrans.slice(0, 3).map((e, i) => imgs[idDe(e.titre, i)] ?? null) : [];

  const charger = async () => {
    const [v, c] = await Promise.all([fn("r/saas-videos", { workspace_id: ws.id, app_id: app.id }).catch(() => ({ videos: [] })), fn("r/credits", { workspace_id: ws.id }).catch(() => null)]);
    setVideos(v.videos ?? []); setSel((s) => s ?? v.videos?.[0] ?? null); setSolde(c?.solde ?? 0);
  };
  // Signature du SaaS : la police de son application, et une graine pour ses motifs, transitions et sa musique
  const police = STYLES_APP[styleDe(app.spec)]?.titres ?? "Plus Jakarta Sans";
  const graine = graineDe(app.slug ?? app.spec?.nom);
  useEffect(() => { charger(); preparerPolice(police); }, [app.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const opts = { nom: app.spec?.nom ?? "Mon SaaS", couleur: sel?.script?.couleur ?? app.spec?.couleur ?? "#4F46E5", lien: lienCourt(lien), images, style, police, graine };
  const [W, H] = FORMATS[format];
  const dessinerA = (t) => { const c = canvas.current; if (c && sel) dessiner(c.getContext("2d"), W, H, t, sel.script, opts); };

  // Lecture en boucle de l'aperçu
  useEffect(() => {
    if (!sel || export_ != null || !lecture) return;
    let id; t0.current = performance.now();
    const image = () => { dessinerA(((performance.now() - t0.current) / 1000) % DUREE); id = requestAnimationFrame(image); };
    id = requestAnimationFrame(image);
    return () => cancelAnimationFrame(id);
  }, [sel, format, export_, lecture, style, Object.keys(imgs).length]); // eslint-disable-line react-hooks/exhaustive-deps

  const creer = async () => {
    if ((solde ?? 0) < cout) { nav("/abonnement#credits"); return; }
    setBusy(true);
    try {
      const v = await fn("r/saas-video", { workspace_id: ws.id, app_id: app.id, format, angle: angle.trim() || undefined });
      setVideos((l) => [v, ...(l ?? [])]); setSel(v); setSolde((s) => (s ?? cout) - cout); setLecture(true); window.dispatchEvent(new Event("bingoo-credits"));
      toast("Ta vidéo est prête : 10 crédits utilisés");
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const coutRetouche = 3;
  const retoucher = async () => {
    if (!sel || demande.trim().length < 3) return;
    if ((solde ?? 0) < coutRetouche) { nav("/abonnement#credits"); return; }
    setRetouche(true);
    try {
      const v = await fn("r/saas-video-retouche", { workspace_id: ws.id, video_id: sel.id, demande: demande.trim() });
      setVideos((l) => [v, ...(l ?? [])]); setSel(v); setSolde((s) => (s ?? coutRetouche) - coutRetouche); setLecture(true); setDemande(""); window.dispatchEvent(new Event("bingoo-credits"));
      toast(v.script?.note ? "Vidéo retouchée, avec une remarque" : `Vidéo retouchée : ${coutRetouche} crédits utilisés`);
    } catch (e) { toast(e.message, "bad"); } finally { setRetouche(false); }
  };
  const telecharger = async () => {
    setExport(0);
    try {
      const { blob, ext } = await exporterVideo(canvas.current, dessinerA, setExport, musique === "aucune" ? null : musique, graine);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${app.slug}-pub-${format}.${ext}`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast("Vidéo téléchargée");
    } catch (e) { toast(e.message, "bad"); } finally { setExport(null); }
  };

  return (
    <div className={nu ? "p-4 sm:p-5" : "mt-6 rounded-2xl bg-white/5 border border-white/10 p-5 sm:p-6"}>
      <div className={cx("flex flex-wrap items-start justify-between gap-3", nu && "hidden")}>
        <div className="max-w-xl">
          <p className="text-[13px] font-bold uppercase tracking-wide text-[#F6A06B]">Vidéo pub</p>
          <h3 className="mt-1 text-[22px] font-black leading-tight">Une pub animée de {opts.nom}, prête à publier</h3>
          <p className="mt-1.5 text-[14px] text-white/65">20 secondes en motion design, aux couleurs de ton SaaS : l'accroche, tes vrais écrans en action, tes bénéfices et ton lien, en musique. Pour TikTok, Reels, Shorts, le fil Instagram ou ta page.</p>
        </div>
        <p className="rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold">{solde == null ? "…" : `${solde} crédit${solde > 1 ? "s" : ""}`}</p>
      </div>

      <div className={cx("grid lg:grid-cols-[auto_1fr] gap-6 items-start", !nu && "mt-5")}>
        <div className="flex flex-col items-center gap-3">
          {aCapturer.length > 0 && <AppCadre slug={app.slug} spec={app.spec} version={app.version ?? 1} capture={aCapturer} className="fixed -left-[9999px] top-0 w-[1280px] h-[800px] pointer-events-none" />}
          <div className={cx("relative overflow-hidden rounded-2xl bg-black/40 border border-white/10 grid place-items-center", format === "vertical" ? "w-[270px] h-[480px]" : format === "carre" ? "w-[400px] h-[400px] max-w-full" : "w-[480px] max-w-full aspect-video")}>
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
            {[["vertical", "Vertical 9:16"], ["carre", "Carré 1:1"], ["paysage", "Paysage 16:9"]].map(([k, l]) => (
              <button key={k} disabled={export_ != null} onClick={() => setFormat(k)} className={cx("rounded-lg px-3 py-1.5", format === k ? "bg-white text-ink" : "text-white/70 hover:text-white")}>{l}</button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {nu && <p className="text-[13px] text-white/60">Ton solde : <b className="text-white">{solde == null ? "…" : `${solde} crédit${solde > 1 ? "s" : ""}`}</b></p>}
          {sel && (
            <div className="rounded-xl bg-black/25 p-4 space-y-3 text-[13px]">
              <div><p className="text-white/45 text-[12px] font-semibold uppercase tracking-wide">Style</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{Object.entries(STYLES).map(([k, l]) => <button key={k} disabled={export_ != null} onClick={() => garder("style", k, setStyleV)} className={cx("rounded-lg px-3 py-1.5 font-semibold", style === k ? "bg-white text-ink" : "bg-white/10 text-white/70 hover:bg-white/20")}>{l}</button>)}</div></div>
              <div><p className="text-white/45 text-[12px] font-semibold uppercase tracking-wide">Musique libre de droits</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{[...Object.entries(AMBIANCES), ["aucune", "Sans musique"]].map(([k, l]) => <button key={k} disabled={export_ != null} onClick={() => { ecoute?.(); setEcoute(null); garder("musique", k, setMusiqueV); }} className={cx("rounded-lg px-3 py-1.5 font-semibold", musique === k ? "bg-white text-ink" : "bg-white/10 text-white/70 hover:bg-white/20")}>{l}</button>)}
                  {musique !== "aucune" && <button onClick={ecouter} disabled={export_ != null} className="rounded-lg px-3 py-1.5 font-semibold text-[#F6A06B] hover:underline">{ecoute ? "■ Arrêter" : "▶ Écouter"}</button>}</div>
                <p className="mt-1 text-[11.5px] text-white/40">Composée par Bingoo! pour ta vidéo : tu peux la publier partout sans problème de droits.</p></div>
              <p className="text-[11.5px] text-white/45">{aCapturer.length ? "Bingoo! photographie les vrais écrans de ton SaaS…" : images.some(Boolean) ? "Les vrais écrans de ton SaaS sont dans la vidéo." : "Écrans stylisés (les captures n'ont pas pu être faites)."}</p>
            </div>
          )}
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
              {sel.script.note && <p className="pt-1 text-[12.5px] text-white/60">Remarque : {sel.script.note}</p>}
            </div>
          )}
          {sel && (
            <div className="rounded-xl border border-white/10 p-4">
              <p className="font-semibold text-[14.5px]">Demande ce que tu veux changer</p>
              <p className="mt-0.5 text-[12.5px] text-white/50">Bingoo! retouche ta vidéo selon ta demande et la garde comme nouvelle version : l'ancienne reste disponible.</p>
              <textarea value={demande} onChange={(e) => setDemande(e.target.value)} maxLength={400} rows={2} placeholder="Ex. : plus drôle, parle aux boulangers, termine par « 14 jours d'essai gratuit », en bleu marine…"
                className="mt-2 w-full resize-none rounded-lg bg-white/10 border border-white/10 px-3 py-2.5 text-[14px] placeholder:text-white/35 outline-none focus:border-white/30" />
              <div className="mt-2 flex flex-wrap gap-1.5">{["Plus drôle", "Plus sérieux", "Accroche plus forte", "Parle aux artisans", "Termine par un essai gratuit"].map((x) => <button key={x} onClick={() => setDemande((d) => d ? `${d}, ${x.toLowerCase()}` : x)} className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] text-white/75 hover:bg-white/20">{x}</button>)}</div>
              <button onClick={retoucher} disabled={retouche || demande.trim().length < 3} className="mt-3 rounded-xl bg-white text-ink px-5 py-2.5 text-[14px] font-bold hover:bg-white/90 disabled:opacity-50">
                {retouche ? "Bingoo! retouche ta vidéo…" : (solde ?? 0) < coutRetouche ? `Recharger mes crédits (il en faut ${coutRetouche})` : `Retoucher · ${coutRetouche} crédits`}
              </button>
            </div>
          )}
          <div className="rounded-xl border border-white/10 p-4">
            <p className="font-semibold text-[14.5px]">{sel ? "Une autre version" : "Créer ma vidéo"}</p>
            <input value={angle} onChange={(e) => setAngle(e.target.value)} maxLength={300} placeholder="Un angle en particulier ? (facultatif, ex. « pour les artisans pressés »)"
              className="mt-2 w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2.5 text-[14px] placeholder:text-white/35 outline-none focus:border-white/30" />
            <button onClick={creer} disabled={busy} className="mt-3 rounded-xl bg-white text-ink px-5 py-2.5 text-[14px] font-bold hover:bg-white/90 disabled:opacity-60">
              {busy ? "Bingoo! écrit ta vidéo…" : (solde ?? 0) < cout ? `Recharger mes crédits (il en faut ${cout})` : `Créer la vidéo · ${cout} crédits`}
            </button>
            <p className="mt-2 text-[12px] text-white/45">Une fois créée, tu la télécharges autant de fois que tu veux : dans les trois formats, les trois styles et avec la musique de ton choix.</p>
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
