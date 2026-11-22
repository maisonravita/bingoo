import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import { demanderCompte, estInvite } from "../lib/invite";

// « Un site qui te plaît » : Bingoo! lit sa page d'accueil point par point (sans IA), puis construit TA version :
// ton nom, ton logo, tes textes, avec l'ambiance de ce site (couleurs, polices, organisation).
// Jamais leurs textes, leurs images ni leur logo.
const HF = { fontFamily: "var(--font-titre)" };
const CLE_CHANTIER = "bingoo-chantier";
const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };
const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const actif = (ws) => ["active", "trialing", "past_due"].includes(ws?.plan_status);
const paye = (ws, type) => ws?.plan === "fondateur" || (actif(ws) && (["explorer_pro", "lancer_pro", "business", "solo", "pro"].includes(ws?.plan) || (type === "site" && ws?.plan === "site")));
const simple = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const TYPES = [["saas", "Un logiciel (SaaS)"], ["site", "Un site web"], ["app", "Une app mobile"]];
const LECTURE = ["J'ouvre la page d'accueil", "Je relève le nom et la description", "Je lis les feuilles de style", "Je repère les couleurs", "Je reconnais les polices", "Je liste les rubriques et les boutons", "Je regarde ce que c'est : logiciel, site ou app"];

const Coche = ({ ok }) => ok
  ? <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-good/15 text-good"><svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5 9-10" /></svg></span>
  : <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent" />;
const Pastille = ({ c, l }) => c ? <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pl-1 pr-2.5 text-[12.5px] font-semibold tnum"><span className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: c }} />{l ? `${l} ` : ""}{c}</span> : null;

export default function Copie() {
  const { ws, session } = useWs();
  const nav = useNavigate();
  const [demande] = useState(() => lire("bingoo-copie"));
  const [scan, setScan] = useState(null), [err, setErr] = useState(null), [pas, setPas] = useState(0), [vu, setVu] = useState(0);
  const [nom, setNom] = useState(""), [type, setType] = useState("saas"), [mieux, setMieux] = useState("");
  const [logo, setLogo] = useState(null), [envoi, setEnvoi] = useState(false), [busy, setBusy] = useState(false), [erreurNom, setErreurNom] = useState("");
  const fichier = useRef(null);

  // La lecture, étape par étape : le fil avance pendant l'appel, puis chaque point trouvé s'affiche l'un après l'autre
  useEffect(() => {
    if (!demande?.url || !ws?.id) return;
    if (estInvite(session)) { demanderCompte("Crée ton compte gratuit pour que Bingoo! lise ce site et construise ta version."); return; }
    const t = setInterval(() => setPas((p) => Math.min(LECTURE.length - 1, p + 1)), 900);
    fn("r/site-scan", { workspace_id: ws.id, url: demande.url })
      .then((r) => { setScan(r); setType(r.type); setPas(LECTURE.length); })
      .catch((e) => setErr(e.message))
      .finally(() => clearInterval(t));
    return () => clearInterval(t);
  }, [ws?.id, session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!scan) return; const t = setInterval(() => setVu((v) => (v >= 6 ? (clearInterval(t), v) : v + 1)), 420); return () => clearInterval(t); }, [scan]);

  if (!demande?.url) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><p className="text-[20px] font-bold">Colle d'abord l'adresse d'un site qui te plaît.</p><button onClick={() => nav("/accueil")} className="mt-4 rounded-full bg-ink px-6 py-3 font-bold text-white">Retour à l'accueil</button></div>;

  const envoyerLogo = async (f) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { alert("Logo en PNG, JPG ou WebP."); return; }
    setEnvoi(true);
    try {
      const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(f); });
      const k = Math.min(1, 512 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const r = await fn("r/saas-logo", { workspace_id: ws.id, image: c.toDataURL("image/png") });
      setLogo(r.url);
    } catch (x) { alert(x.message ?? "Logo non envoyé"); } finally { setEnvoi(false); }
  };

  const source = scan ? { logo, style: { domaine: scan.domaine, couleurs: scan.couleurs, mode: scan.mode, polices: scan.polices } } : null;
  const construire = async () => {
    const n = nom.trim();
    if (n.length < 2) { setErreurNom("Donne un nom à ta version."); return; }
    if (simple(n) === simple(scan.nom) || simple(n) === simple(scan.domaine.split(".")[0])) { setErreurNom(`Choisis ton propre nom : « ${scan.nom} » appartient à ce site.`); return; }
    if (estInvite(session) || !ws) { demanderCompte("Crée ton compte gratuit pour construire ta version."); return; }
    setErreurNom("");
    // Site ou app : le parcours « idée » (aperçu gratuit, puis construction écran par écran), avec ce style et ce logo
    if (type !== "saas") {
      const texte = [`${type === "site" ? "Mon site" : "Mon app"} dans le même esprit que ${scan.domaine}${scan.description ? ` : ${scan.description}` : ""}`, scan.rubriques.length ? `Rubriques : ${scan.rubriques.slice(0, 6).join(", ")}` : "", mieux.trim() ? `Ce que je veux en plus : ${mieux.trim()}` : ""].filter(Boolean).join(". ").slice(0, 300);
      ecrire("bingoo-idee", { texte, titre: `Ta version de ${scan.domaine}`, type, nom: n, source, at: Date.now() });
      nav("/explorer/idee");
      return;
    }
    // Logiciel : Bingoo! l'analyse comme ceux de l'Explorer, et construit ta version à ton nom
    ecrire(`bingoo-reponses-${scan.domaine}`, { nom: n, clients: "", mieux: mieux.trim(), angle: [`Nom souhaité, à utiliser tel quel : ${n}`, mieux.trim() && `Ce que je veux faire mieux : ${mieux.trim()}`].filter(Boolean).join(". ") });
    ecrire(CLE_CHANTIER, { domaine: scan.domaine, nom: n, categorie: "", ws: ws.id, source });
    if (paye(ws, "saas")) { nav("/explorer/revelation"); return; }
    setBusy(true);
    try { const { url } = await fn("billing-checkout", { workspace_id: ws.id, plan: "explorer_pro", periode: "mois", retour: "revelation" }); if (url) { window.location.href = url; return; } nav("/explorer/revelation"); }
    catch { nav("/abonnement?formule=explorer_pro&periode=mois"); }
    finally { setBusy(false); }
  };

  const points = scan ? [
    ["Page lue", <><b>{scan.titre || scan.domaine}</b>{scan.css_lus ? <span className="text-ink-faint"> · {scan.css_lus} feuille{scan.css_lus > 1 ? "s" : ""} de style</span> : null}</>],
    ["Ce que c'est", <><b>{TYPES.find(([k]) => k === scan.type)?.[1]}</b>{scan.indices[0] ? <span className="text-ink-faint"> · {scan.indices.join(", ")}</span> : null}</>],
    ["Couleurs", scan.couleurs.primaire || scan.couleurs.autres.length ? <span className="flex flex-wrap gap-1.5"><Pastille c={scan.couleurs.primaire} l="Marque" /><Pastille c={scan.couleurs.fond} l="Fond" />{scan.couleurs.autres.slice(0, 2).map((c) => <Pastille key={c} c={c} />)}</span> : <span className="text-ink-faint">Pas de couleur de marque nette : Bingoo! en choisira une proche de l'ambiance.</span>],
    ["Ambiance", scan.mode === "dark" ? "Fond sombre" : "Fond clair"],
    ["Polices", scan.polices.titres || scan.polices.texte ? <>{scan.polices.titres && <span style={{ fontFamily: `'${scan.polices.titres}'` }} className="font-bold">{scan.polices.titres}</span>}{scan.polices.texte && scan.polices.texte !== scan.polices.titres ? <> pour les titres, {scan.polices.texte} pour le texte</> : " pour les titres et le texte"}</> : <span className="text-ink-faint">Police propre à la marque : Bingoo! prend une police libre qui lui ressemble.</span>],
    ["Rubriques", scan.rubriques.length ? scan.rubriques.join(" · ") : <span className="text-ink-faint">Menu non trouvé</span>],
    ["Sections et boutons", [...scan.titres.slice(0, 4), ...scan.boutons.slice(0, 3).map((b) => `« ${b} »`)].join(" · ") || <span className="text-ink-faint">—</span>],
  ] : [];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-[13px] font-bold uppercase tracking-[.16em] text-accent-dark">Un site qui te plaît</p>
      <h1 className="mt-2 break-words text-[28px] sm:text-[38px] font-black leading-[1.08] tracking-tight" style={HF}>{scan?.domaine ?? demande.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</h1>
      <button onClick={() => { ecrire("bingoo-copie", null); nav("/accueil"); }} className="mt-2 text-[13.5px] font-semibold text-ink-soft underline-offset-4 hover:underline">Changer d'adresse</button>

      {err ? (
        <div className="mt-8 rounded-2xl border border-bad/30 bg-bad/5 p-6"><p className="font-semibold">{err}</p><button onClick={() => { ecrire("bingoo-copie", null); nav("/accueil"); }} className="mt-3 rounded-xl bg-ink px-4 py-2 font-bold text-white">Essayer autre chose</button></div>
      ) : (
        <section className="mt-8 rounded-3xl border border-line bg-white p-5 sm:p-7">
          <p className="text-[12px] font-bold uppercase tracking-[.14em] text-ink-faint">{scan ? "Ce que Bingoo! a relevé" : "Bingoo! lit ce site, point par point"}</p>
          {!scan ? (
            <ol className="mt-4 space-y-2.5">{LECTURE.slice(0, pas + 1).map((t, i) => <li key={t} className="flex items-center gap-2.5 text-[15px]"><Coche ok={i < pas} />{t}</li>)}</ol>
          ) : (
            <dl className="mt-4 divide-y divide-line">{points.slice(0, vu + 1).map(([k, v]) => (
              <div key={k} className="grid gap-1 py-3 sm:grid-cols-[170px_1fr] sm:gap-4 land-in"><dt className="flex items-center gap-2 text-[14px] font-semibold"><Coche ok />{k}</dt><dd className="min-w-0 text-[14.5px] text-ink-soft">{v}</dd></div>
            ))}</dl>
          )}
        </section>
      )}

      {scan && vu >= 6 && (
        <section className="mt-6 rounded-3xl border-2 border-ink bg-white p-5 sm:p-7 land-in">
          <p className="text-[20px] font-black" style={HF}>Ta version, à ton nom</p>
          <p className="mt-1 text-[14px] text-ink-soft">Bingoo! garde l'ambiance de ce site (couleurs, polices, organisation) et écrit tout le reste pour toi. Il ne reprend jamais leurs textes, leurs images ni leur logo.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="copie-nom" className="text-[13px] font-semibold">Le nom de ta version</label>
              <input id="copie-nom" value={nom} onChange={(e) => { setNom(e.target.value.slice(0, 40)); setErreurNom(""); }} placeholder="Ex. Planilo" className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-[20px] font-black outline-none focus:border-ink" style={HF} />
              {erreurNom && <p className="mt-1.5 text-[13px] font-semibold text-[#9A3412]">{erreurNom}</p>}
            </div>
            <div>
              <p className="text-[13px] font-semibold">Ton logo <span className="font-normal text-ink-faint">(facultatif)</span></p>
              <button type="button" onClick={() => fichier.current?.click()} className="mt-1 flex h-[52px] items-center gap-2.5 rounded-xl border border-dashed border-ink-faint px-3 text-[13.5px] font-semibold hover:border-ink">
                {logo ? <img src={logo} alt="Ton logo" className="h-9 w-9 rounded-lg object-contain" /> : <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] font-black text-white" style={{ background: scan.couleurs.primaire ?? "#1E2030" }}>{(nom.trim() || "?").charAt(0).toUpperCase()}</span>}
                {envoi ? "Envoi…" : logo ? "Changer" : "Ajouter mon logo"}
              </button>
              <input ref={fichier} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { envoyerLogo(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
          </div>
          <p className="mt-5 text-[13px] font-semibold">Ce que tu veux construire</p>
          <div className="mt-1.5 flex flex-wrap gap-2">{TYPES.map(([k, l]) => <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)} className={cx("rounded-full border px-4 py-2 text-[14px] font-semibold transition", type === k ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink-faint")}>{l}</button>)}</div>
          <label htmlFor="copie-mieux" className="mt-5 block text-[13px] font-semibold">Ce que tu veux de différent <span className="font-normal text-ink-faint">(facultatif)</span></label>
          <input id="copie-mieux" value={mieux} onChange={(e) => setMieux(e.target.value.slice(0, 200))} placeholder="Ex. pour les coiffeurs, en français, plus simple" className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-[15px] outline-none focus:border-ink" />
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <button disabled={busy || envoi} onClick={construire} className="rounded-full bg-accent px-7 py-3.5 text-[16px] font-bold text-white shadow-[0_12px_30px_-14px_rgba(226,85,35,.9)] disabled:opacity-50">{busy ? "Un instant…" : `Construire ${nom.trim() || "ma version"}`}</button>
            <p className="text-[13px] text-ink-soft">{type === "saas" ? "Bingoo! analyse ses fonctions, construit ta version écran par écran sous tes yeux, la teste et la met en ligne." : "Bingoo! te montre d'abord l'aperçu gratuit, puis construit écran par écran sous tes yeux."}</p>
          </div>
        </section>
      )}
    </div>
  );
}
