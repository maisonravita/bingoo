// Vidéo en motion design (produit ouvert à tous, façon Bolt) : une phrase → Bingoo! écrit le scénario et choisit un style
// → la vidéo joue aussitôt à droite → on la retouche en discutant à gauche → export MP4/WebM dans le navigateur.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { envoyerLogo, lireLogoEspace, poserLogoEspace } from "../lib/logo";
import { fn, supabase } from "../lib/supabase";
import AppCadre from "../components/AppCadre";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import { DUREE, FORMATS, dessiner, exporterVideo, graineDe, preparerPolice } from "../lib/videoPub";
import { AMBIANCES, ecouterMusique, tempoMusique } from "../lib/musiqueVideo";
import { caleSurTempo, coupesScenes, dessinerScenes, dureeTotale, policeMotion, sousInstants } from "../lib/motion";

const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };
const IDEES = ["Ajoute mon logo", "Plus dynamique", "Fond blanc", "Accroche plus forte", "Ajoute un mot géant qui claque", "Mets-la en bleu marine", "Termine par mon site"];
const EXEMPLES = ["Une vidéo pour présenter mon salon de barbier à Lyon", "Le teaser de l'ouverture de ma boulangerie le 3 décembre", "Une pub pour mon coaching sportif en ligne"];

export default function Motion() {
  const { ws } = useWs();
  // « Fait avec Bingoo! » sur les vidéos, sauf pour l'offre Lancer Pro (marque blanche)
  const sansFiligrane = ["lancer_pro", "business", "fondateur"].includes(ws?.plan) && ["active", "trialing", "past_due"].includes(ws?.plan_status);
  const nav = useNavigate();
  const [videos, setVideos] = useState(null);
  const [sel, setSel] = useState(null);
  const [fil, setFil] = useState([]); // échanges : { moi, etat: encours|ok|ko, note, erreur }
  const [saisie, setSaisie] = useState("");
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState("vertical");
  const [lecture, setLecture] = useState(true);
  const [musique, setMusique] = useState("energique");
  const [export_, setExport] = useState(null);
  const [ecoute, setEcoute] = useState(null);
  const canvas = useRef(null), t0 = useRef(performance.now()), bas = useRef(null), lance = useRef(false), fichier = useRef(null);
  const [logoImg, setLogoImg] = useState(null), [envoiLogo, setEnvoiLogo] = useState(false);
  // Son SaaS ou son site construit par Bingoo! : ses vrais écrans peuvent entrer dans la vidéo
  const [monApp, setMonApp] = useState(undefined), [avecProduit, setAvecProduit] = useState(true); // undefined : pas encore chargé
  useEffect(() => {
    if (!ws?.id) return;
    supabase.from("saas_apps").select("id, slug, spec, version").eq("workspace_id", ws.id).eq("statut", "pret").order("at", { ascending: false }).limit(1)
      .then(({ data }) => setMonApp(data?.[0] && (data[0].spec?.ecrans ?? []).some((e) => e.code) ? data[0] : null), () => setMonApp(null));
  }, [ws?.id]);

  // Les vidéos de l'espace ; une idée venue de l'accueil (type « vidéo ») est lancée tout de suite
  useEffect(() => {
    if (!ws?.id) return;
    fn("r/videos-libres", { workspace_id: ws.id }).then((r) => { setVideos(r.videos ?? []); setSel((s) => s ?? r.videos?.[0] ?? null); }, () => setVideos([]));
    const i = lire("bingoo-idee");
    if (monApp === undefined) return; // on attend de savoir s'il a un SaaS (ses écrans entrent dans la vidéo)
    if (!lance.current && i?.type === "video" && i.texte && Date.now() - Number(i.at ?? 0) < 2 * 864e5) {
      lance.current = true;
      try { localStorage.removeItem("bingoo-idee"); } catch { /* stockage indisponible */ }
      envoyer(i.texte, true);
    }
  }, [ws?.id, monApp === undefined]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => ecoute?.(), [ecoute]);
  useEffect(() => { bas.current?.scrollTo({ top: bas.current.scrollHeight, behavior: "smooth" }); }, [fil.length, busy]);

  // Les scènes sont calées sur le tempo de la musique choisie : chaque changement tombe sur un temps
  const script = useMemo(() => caleSurTempo(sel?.script, musique === "aucune" ? 0 : tempoMusique(musique, graineDe(sel?.script?.nom ?? sel?.id))), [sel?.script, sel?.id, musique]);
  // Le logo de la vidéo, chargé en image autorisée (sinon l'export serait bloqué par le navigateur)
  useEffect(() => {
    if (!script?.logo) { setLogoImg(null); return; }
    const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => setLogoImg(im); im.onerror = () => setLogoImg(null); im.src = script.logo;
  }, [script?.logo]);
  // Captures de ses écrans (avec les données d'exemple), une fois, dans un cadre caché ; rangées par titre
  const [captures, setCaptures] = useState({});
  const produit = script?.produit && monApp && script.produit.app_id === monApp.id ? monApp : null;
  const titresVoulus = produit ? [...new Set((script.scenes ?? []).flatMap((e) => [e.ecran, ...(e.ecrans ?? [])]).filter(Boolean))] : [];
  const normT = (x) => String(x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const ecransApp = produit ? (produit.spec?.ecrans ?? []).filter((e) => e.code) : [];
  const idsVoulus = produit ? [...new Set([...titresVoulus.map((ti) => ecransApp.find((e) => normT(e.titre) === normT(ti))?.id), ...ecransApp.filter((e) => !e.public).slice(0, 4).map((e) => e.id)].filter(Boolean))] : [];
  const aCapturer = idsVoulus.filter((id) => !(id in captures));
  useEffect(() => {
    if (!produit) return;
    const ecoute = (ev) => {
      const d = ev.data; if (d?.slug !== produit.slug || d?.type !== "bingoo-capture") return;
      if (!d.png) { setCaptures((m) => ({ ...m, [d.id]: null })); return; }
      const im = new Image(); im.onload = () => { const cv = document.createElement("canvas"); cv.width = im.width || 1280; cv.height = im.height || 800; try { cv.getContext("2d").drawImage(im, 0, 0); setCaptures((m) => ({ ...m, [d.id]: cv })); } catch { setCaptures((m) => ({ ...m, [d.id]: null })); } };
      im.onerror = () => setCaptures((m) => ({ ...m, [d.id]: null })); im.src = d.png;
    };
    window.addEventListener("message", ecoute); return () => window.removeEventListener("message", ecoute);
  }, [produit?.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const ecransVideo = produit ? Object.fromEntries(ecransApp.filter((e) => captures[e.id]).map((e) => [e.titre, captures[e.id]])) : null;
  const police = policeMotion(script);
  useEffect(() => { preparerPolice(police); }, [police]);
  // La police des vidéos à scènes : Inter Tight, de 600 à 900 (chargée une fois)
  useEffect(() => {
    if (document.getElementById("police-motion")) return;
    const l = document.createElement("link"); l.id = "police-motion"; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800;900&display=swap"; document.head.appendChild(l);
    Promise.all(["600", "700", "800", "900"].map((p) => document.fonts.load(`${p} 80px "Inter Tight"`))).catch(() => {});
  }, []);
  const graine = graineDe(script?.nom ?? sel?.id);
  const style = script?.style === "sobre" ? "sobre" : "percutant";
  const [W, H] = FORMATS[format];
  const opts = { nom: script?.nom ?? "", couleur: script?.couleur ?? "#E8571C", lien: script?.lien ?? "", images: [], style, police, graine };
  // Nouvelles vidéos : suite de scènes (moteur « pub premium ») ; anciennes : gabarit fixe de 21 s
  const scenes = !!script?.scenes?.length, duree = scenes ? dureeTotale(script) : DUREE;
  const dessinerA = (t) => { const c = canvas.current; if (!c || !script) return; if (scenes) dessinerScenes(c.getContext("2d"), W, H, t, script, { logo: logoImg, ecrans: ecransVideo, filigrane: !sansFiligrane }); else dessiner(c.getContext("2d"), W, H, t, script, opts); };

  // Lecture en boucle
  useEffect(() => {
    if (!script || export_ != null || !lecture) return;
    let id; t0.current = performance.now();
    const image = () => { dessinerA(((performance.now() - t0.current) / 1000) % duree); id = requestAnimationFrame(image); };
    id = requestAnimationFrame(image);
    return () => cancelAnimationFrame(id);
  }, [sel?.id, format, export_, lecture, logoImg, Object.keys(captures).length, musique]); // eslint-disable-line react-hooks/exhaustive-deps

  // Le logo : réduit dans le navigateur (transparence gardée), sa couleur dominante relevée, puis posé dans la vidéo
  // Le logo de l'espace d'abord, sinon celui gardé dans ce navigateur
  const [logoEsp, setLogoEsp] = useState(null);
  useEffect(() => { if (ws?.id) lireLogoEspace(ws).then(setLogoEsp); }, [ws?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const memoLogo = () => { if (logoEsp?.url) return logoEsp; try { return JSON.parse(localStorage.getItem("bingoo-motion-logo") ?? "null"); } catch { return null; } };
  async function poserLogo(v, l) {
    const n = await fn("r/video-logo", { workspace_id: ws.id, video_id: v.id, logo: l.url, couleur: l.couleur });
    setVideos((x) => [n, ...(x ?? [])]); setSel(n); setLecture(true); return n;
  }
  async function choisirLogo(f) {
    setEnvoiLogo(true);
    const n = fil.length; setFil((l) => [...l, { moi: "Mon logo", logo: true, etat: "encours" }]);
    try {
      const l = await envoyerLogo(ws, f);
      try { localStorage.setItem("bingoo-motion-logo", JSON.stringify(l)); } catch { /* stockage indisponible */ }
      // Il devient le logo de tout l'espace (son SaaS ou son site sans logo le reçoit aussi)
      await poserLogoEspace(ws, l, { appliquer: true }).catch(() => null); setLogoEsp(l);
      if (sel) await poserLogo(sel, l);
      setFil((x) => x.map((y, k2) => (k2 === n ? { ...y, etat: "ok", texte: (sel ? "Ton logo est dans la vidéo : en petit en haut, et en grand à la fin." : "Ton logo est prêt : il sera dans ta vidéo dès qu'elle est créée.") + " C'est aussi le logo de ton espace : tes prochaines vidéos, ton site et ton SaaS le reprennent." } : y)));
    } catch (e) { setFil((x) => x.map((y, k2) => (k2 === n ? { ...y, etat: "ko", erreur: e.message } : y))); }
    finally { setEnvoiLogo(false); }
  }

  // Une phrase : la première crée la vidéo, les suivantes la retouchent
  async function envoyer(texte, nouvelle = false) {
    const t = String(texte ?? saisie).trim();
    if (t.length < 3 || busy || !ws?.id) return;
    // « Ajoute mon logo » : il faut le fichier, on ouvre le choix d'image
    if (/\blogo\b/i.test(t) && t.length < 60 && !/(enl[eè]ve|retire|supprime|sans)/i.test(t)) { setSaisie(""); fichier.current?.click(); return; }
    const creer = nouvelle || !sel;
    const n = fil.length;
    setFil((l) => [...l, { moi: t, etat: "encours", creer }]); setSaisie(""); setBusy(true);
    try {
      const v = creer ? await fn("r/video-creer", { workspace_id: ws.id, texte: t, format, ...(monApp && avecProduit ? { app_id: monApp.id } : {}) }) : await fn("r/video-retouche", { workspace_id: ws.id, video_id: sel.id, demande: t, format });
      setVideos((l) => [v, ...(l ?? [])]); setSel(v); setLecture(true);
      const lm = creer ? memoLogo() : null; if (lm?.url) await poserLogo(v, lm).catch(() => null);
      setFil((l) => l.map((x, k) => (k === n ? { ...x, etat: "ok", note: v.script?.note } : x)));
    } catch (e) {
      setFil((l) => l.map((x, k) => (k === n ? { ...x, etat: "ko", erreur: e.message } : x)));
    } finally { setBusy(false); }
  }

  const ecouter = () => { if (ecoute) { ecoute(); setEcoute(null); return; } if (musique === "aucune") return; const stop = ecouterMusique(musique, duree, graine, scenes ? coupesScenes(script) : []); setEcoute(() => stop); setTimeout(() => setEcoute(null), duree * 1000); };
  const telecharger = async () => {
    setExport(0);
    try {
      const { blob, ext } = await exporterVideo(canvas.current, dessinerA, setExport, musique === "aucune" ? null : musique, graine, duree, scenes ? { instants: (t) => sousInstants(script, t), coupes: coupesScenes(script) } : {});
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `${String(script?.nom ?? "video").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}-${format}.${ext}`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { alert(e.message); } finally { setExport(null); }
  };

  return (
    <div className="flex h-[calc(100vh-112px)] min-h-[560px] overflow-hidden rounded-2xl border border-line flex-col lg:flex-row bg-[#FAF9F6]">
      {/* La discussion */}
      <section className="flex min-h-0 w-full shrink-0 flex-col border-r border-line bg-white lg:w-[400px]">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div><p className="text-[12px] font-bold uppercase tracking-wide text-[#E8571C]">Vidéo motion design</p><p className="text-[15px] font-bold">{script?.nom ?? "Ta vidéo"}</p></div>
          {sel && <button onClick={() => { setSel(null); setFil([]); }} disabled={busy} className="rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:text-ink">Nouvelle vidéo</button>}
        </div>
        <div ref={bas} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-[14px]">
          {!sel && !fil.length && <div className="rounded-2xl bg-[#F7F5F1] p-4">
            <p className="font-semibold">Décris ta vidéo en une phrase.</p>
            <p className="mt-1 text-ink-soft">Pour quoi, pour qui : Bingoo! écrit le scénario, choisit les couleurs et l'anime tout de suite. 20 secondes, en vertical, carré ou paysage, avec une musique libre de droits.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{EXEMPLES.map((x) => <button key={x} onClick={() => setSaisie(x)} className="rounded-full border border-line bg-white px-3 py-1.5 text-left text-[12.5px] hover:border-ink/30">{x}</button>)}</div>
          </div>}
          {fil.map((x, i) => <div key={i} className="space-y-2">
            <p className="ml-auto w-fit max-w-[90%] rounded-2xl bg-[#F1EFEA] px-3.5 py-2">{x.moi}</p>
            <div className="flex gap-2.5"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#E8571C] text-[12px] font-black text-white">B</span>
              <div className="pt-1">{x.etat === "encours" ? <p className="text-ink-soft">{x.logo ? "Je pose ton logo et je reprends sa couleur…" : x.creer ? "J'écris le scénario et je choisis le style…" : "Je retouche ta vidéo…"}</p>
                : x.etat === "ok" && x.texte ? <p>{x.texte}</p>
                : x.etat === "ok" ? <p>{x.creer ? "Ta vidéo est prête, elle joue à droite." : "C'est fait, regarde la nouvelle version."}{x.note ? <span className="mt-1 block text-ink-soft">Remarque : {x.note}</span> : null}</p>
                : <p className="text-bad">{x.erreur}</p>}</div></div>
          </div>)}
          {sel && !fil.length && <p className="text-ink-soft">Dis-moi ce que tu veux changer : le ton, les textes, les couleurs, le fond clair ou sombre.</p>}
          {script && scenes && <details className="rounded-xl border border-line p-3 text-[13px]"><summary className="cursor-pointer font-semibold">Le scénario · {script.scenes.length} scènes · {Math.round(duree)} s</summary>
            <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-ink-soft">{script.scenes.map((e, i) => <li key={i}>{e.texte || e.barre || (e.items ?? []).map((x) => x.texte ?? x).join(" · ") || e.valeur || script.nom}</li>)}</ol></details>}
          {script && !scenes && <details className="rounded-xl border border-line p-3 text-[13px]"><summary className="cursor-pointer font-semibold">Le scénario</summary>
            <div className="mt-2 space-y-1"><p><b>{script.accroche}</b></p>{script.probleme && <p className="text-ink-soft">{script.probleme}</p>}<p className="text-ink-soft">{script.presentation}</p>
              <p className="text-ink-faint">{(script.ecrans ?? []).map((e) => e.titre).join(" · ")}</p><p className="text-ink-faint">{(script.benefices ?? []).join(" · ")}</p><p className="font-semibold text-[#E8571C]">{script.appel}</p></div></details>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); envoyer(); }} className="border-t border-line p-3">
          {sel && !busy && !saisie && <div className="mb-1.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">{IDEES.map((x) => <button key={x} type="button" onClick={() => setSaisie(x)} className="shrink-0 rounded-full border border-line bg-white px-3 py-1 text-[12px] font-medium text-ink-soft hover:text-ink">{x}</button>)}</div>}
          {monApp && !sel && <label className="mb-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-[#FCFBF9] px-3 py-2 text-[13px]">
            <input type="checkbox" checked={avecProduit} onChange={(e) => setAvecProduit(e.target.checked)} className="h-4 w-4 accent-[#E8571C]" />
            <span>Montrer les vrais écrans de <b>{monApp.spec?.nom ?? "mon SaaS"}</b> dans la vidéo</span>
          </label>}
          <div className="rounded-2xl border border-line bg-[#FCFBF9] p-2 focus-within:border-ink/30">
            <textarea value={saisie} onChange={(e) => setSaisie(e.target.value)} rows={2} disabled={busy} maxLength={800}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
              placeholder={sel ? "Demande un changement (ex. : fond blanc, plus court, change l'accroche)…" : "Ex. : une vidéo pour présenter mon salon de barbier"} className="block w-full resize-none bg-transparent px-1.5 text-[14.5px] outline-none placeholder:text-ink-faint" />
            <div className="flex items-center justify-between">
              <input ref={fichier} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { choisirLogo(e.target.files?.[0]); e.target.value = ""; }} />
              <button type="button" onClick={() => fichier.current?.click()} disabled={busy || envoiLogo} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-ink-soft hover:bg-[#F1EFEA] hover:text-ink disabled:opacity-40">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.5l-8.5 8.5a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.8-2.8l8.4-8.4" /></svg>{envoiLogo ? "Envoi du logo…" : script?.logo ? "Changer mon logo" : "Ajouter mon logo"}</button>
              <button type="submit" disabled={busy || saisie.trim().length < 3} aria-label="Envoyer" className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white disabled:opacity-30">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>
            </div>
          </div>
        </form>
      </section>

      {/* La vidéo */}
      <section className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-auto bg-[#111114] p-4 text-white">
        <div className={cx("relative overflow-hidden rounded-2xl bg-black shadow-[0_40px_120px_-40px_rgba(0,0,0,.8)] ring-1 ring-white/10", format === "vertical" ? "h-[min(68vh,640px)] aspect-[9/16]" : format === "carre" ? "h-[min(60vh,560px)] aspect-square" : "w-[min(100%,900px)] aspect-video")}>
          {produit && aCapturer.length > 0 && <AppCadre slug={produit.slug} spec={produit.spec} version={produit.version ?? 1} capture={aCapturer} className="fixed -left-[9999px] top-0 w-[1280px] h-[800px] pointer-events-none" />}
          {script ? <canvas ref={canvas} width={W} height={H} className="h-full w-full" /> : <div className="grid h-full w-full place-items-center p-6 text-center text-[13.5px] text-white/45">{busy ? "Bingoo! écrit ta vidéo…" : videos == null ? "Chargement…" : "Ta vidéo apparaîtra ici."}</div>}
          {busy && <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-white/10"><div className="h-full w-1/3 animate-[barre_1.2s_ease-in-out_infinite] bg-[#E8571C]" /></div>}
          {export_ != null && <div className="absolute inset-x-0 bottom-0 bg-black/75 px-4 py-3 text-[12.5px]"><p className="font-semibold">Enregistrement… {Math.round(export_ * 100)} %</p><p className="text-white/55">Garde cet onglet ouvert ({Math.round(duree)} secondes).</p></div>}
        </div>
        {script && <div className="flex flex-wrap items-center justify-center gap-2 text-[13px] font-semibold">
          <div className="flex gap-1 rounded-xl bg-white/10 p-1">{[["vertical", "9:16"], ["carre", "1:1"], ["paysage", "16:9"]].map(([k, l]) => <button key={k} disabled={export_ != null} onClick={() => setFormat(k)} className={cx("rounded-lg px-3 py-1.5", format === k ? "bg-white text-ink" : "text-white/70 hover:text-white")}>{l}</button>)}</div>
          <button onClick={() => setLecture(!lecture)} disabled={export_ != null} className="rounded-xl bg-white/10 px-3.5 py-2 hover:bg-white/20">{lecture ? "Pause" : "Lecture"}</button>
          <select value={musique} onChange={(e) => { ecoute?.(); setEcoute(null); setMusique(e.target.value); }} disabled={export_ != null} className="rounded-xl bg-white/10 px-3 py-2 text-white outline-none">
            {[...Object.entries(AMBIANCES), ["aucune", "Sans musique"]].map(([k, l]) => <option key={k} value={k} className="text-ink">{k === "aucune" ? l : `Musique : ${l}`}</option>)}
          </select>
          {musique !== "aucune" && <button onClick={ecouter} disabled={export_ != null} className="rounded-xl px-2 py-2 text-[#F6A06B] hover:underline">{ecoute ? "■ Arrêter" : "▶ Écouter"}</button>}
          <button onClick={telecharger} disabled={export_ != null} className="rounded-xl bg-[#E8571C] px-5 py-2 font-bold hover:brightness-110 disabled:opacity-60">{export_ != null ? "Enregistrement…" : "Télécharger"}</button>
        </div>}
        {videos?.length > 1 && <div className="flex max-w-full flex-wrap justify-center gap-1.5">{videos.slice(0, 8).map((v, i) => <button key={v.id} onClick={() => setSel(v)} className={cx("rounded-lg px-2.5 py-1 text-[12px] font-semibold", sel?.id === v.id ? "bg-white text-ink" : "bg-white/10 text-white/70 hover:bg-white/20")}>{v.script?.nom ?? "Vidéo"} · v{videos.length - i}</button>)}</div>}
        <p className="text-[11.5px] text-white/35">Musique composée par Bingoo! : libre de droits, publiable partout.</p>
      </section>
    </div>
  );
}
