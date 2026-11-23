import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
const AppCadre = lazy(() => import("../components/AppCadre"));
import { specApercuSaas } from "../lib/apercuSaas";
import { useNavigate } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import { demanderCompte, estInvite } from "../lib/invite";
import CompanyLogo from "../components/CompanyLogo";

// « Construire mon idée » : l'aperçu gratuit avant de payer.
// Modération et questions si l'idée est floue, puis : les SaaS proches qui gagnent déjà de l'argent (« m'en inspirer »)
// ou l'idée telle quelle, avec son nom, sa cible, ses écrans, une maquette de l'écran principal, ce qui viendra
// ensuite dans l'atelier et ce qui sera fait autrement (annoncé AVANT de payer).
const HF = { fontFamily: "var(--font-titre)" };
const CLE_CHANTIER = "bingoo-chantier";
const DOMAINE_IDEE = "idee.bingoo.fr";
const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };
const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const actif = (ws) => ["active", "trialing", "past_due"].includes(ws?.plan_status);
// Un SaaS demande Lancer (ou plus) ; un site, la formule Site ou n'importe quelle formule qui construit
const paye = (ws, type) => ws?.plan === "fondateur" || (actif(ws) && (["explorer_pro", "lancer_pro", "business", "solo", "pro"].includes(ws?.plan) || (type === "site" && ws?.plan === "site")));
const dollars = (n) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " $";

// Maquette de la page d'accueil d'un site : en-tête, accroche, bouton, services et prix (tirés de l'aperçu)
// L'aperçu d'un site : le VRAI gabarit des sites livrés par Bingoo!, avec les textes, services et le style de l'aperçu.
// Aucune donnée inventée : pas d'avis, pas d'horaires, pas de chiffres ; le membre fait défiler sa future page.
const prixNombre = (p) => { const m = String(p ?? "").replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)/); return m ? Number(m[1].replace(",", ".")) : null; };
function specSite(nom, ap) {
  return {
    type: "site", nom, slogan: ap.accroche || "", pitch: ap.pitch || "", design: ap.design ?? undefined, couleur: ap.design?.couleurs?.primary ?? "#E8571C",
    site: { gabarit: "editorial", metier: ap.metier || "", cta: ap.cta || "Me contacter", modele: ap.modele || "vitrine", demande: /devis/i.test(ap.cta ?? "") ? "devis" : /r[ée]serv/i.test(ap.cta ?? "") ? "reservation" : /rendez|rdv/i.test(ap.cta ?? "") ? "rdv" : "message", points_forts: ap.points_forts ?? [], etapes: ap.etapes ?? [] },
    demo: { services: (ap.services ?? []).map((x) => { const n = prixNombre(x.prix); return { titre: x.titre, description: x.description || "", prix: n, prix_texte: /partir/i.test(x.prix ?? "") }; }), horaires: [], infos: [{}] },
    ecrans: [],
  };
}
// Aperçu d'un SaaS : la vraie coque des SaaS Bingoo! (menu, en-tête, style tiré) avec l'écran principal de l'idée,
// écrit avec les vrais composants et des données d'exemple ; les autres écrans sont annoncés dans le menu.
// Une des trois propositions de style : le VRAI rendu de la page (gabarit des sites, ou coque des SaaS), en petit
function Vignette({ nom, ap, design, type, choisi, onClick, n }) {
  const ap2 = useMemo(() => ({ ...ap, design }), [ap, design]);
  const spec = useMemo(() => (type === "site" ? specSite(nom, ap2) : { ...specApercuSaas(nom, ap2), ...(type === "app" ? { mobile: true } : {}) }), [nom, ap2, type]);
  const boite = useRef(null), [k, setK] = useState(0.22);
  const L = type === "app" ? 390 : 1280, Hs = type === "app" ? 700 : 800;
  useEffect(() => { const el = boite.current; if (!el) return; const o = new ResizeObserver(() => setK(el.clientWidth / L)); o.observe(el); return () => o.disconnect(); }, [L]);
  const slug = `style-${n}-` + (nom || "x").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  return (
    <button type="button" onClick={onClick} aria-pressed={choisi} className={cx("group relative block w-full overflow-hidden rounded-xl border-2 bg-white text-left transition", choisi ? "border-[#E8571C] shadow-[0_10px_30px_-12px_rgba(232,87,28,.6)]" : "border-line hover:border-ink/30")}>
      <div ref={boite} className="pointer-events-none relative w-full overflow-hidden" style={{ height: Hs * k }}>
        <div className="absolute left-0 top-0" style={{ width: L, height: Hs, transform: `scale(${k})`, transformOrigin: "0 0" }}>
          <Suspense fallback={<div className="h-full animate-pulse bg-[#F6F5F2]" />}>
            <AppCadre slug={slug} spec={spec} version={JSON.stringify(design).length + n} {...(type === "site" ? { apercu: true } : { essai: true })} className="h-full w-full" />
          </Suspense>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-[12.5px] font-semibold">
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: design?.couleurs?.primary }} /><span className="truncate">Style {n + 1}{design?.polices?.titres ? ` · ${design.polices.titres}` : ""}</span></span>
        <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[11px]", choisi ? "bg-[#E8571C] text-white" : "bg-[#F1EFEA] text-ink-soft")}>{choisi ? "Choisi" : "Choisir"}</span>
      </div>
    </button>
  );
}
// Aperçu d'une app mobile : la vraie app (coque des apps Bingoo!, largeur de téléphone) avec l'écran principal de l'idée
function TelReel({ nom, ap }) {
  const spec = useMemo(() => ({ ...specApercuSaas(nom, ap), mobile: true }), [nom, ap]);
  const slug = "apercu-tel-" + (nom || "app").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  return (
    <div className="mx-auto w-[390px] max-w-full overflow-hidden rounded-[2rem] border border-black/15 bg-white shadow-[0_30px_70px_-35px_rgba(20,20,40,.55)]">
      <div className="border-b border-black/[.06] bg-[#F6F5F2] px-4 py-2 text-center text-[11px] text-[#9A9EAE]">{nom} · données d'exemple</div>
      <Suspense fallback={<div className="h-[720px] animate-pulse bg-[#F6F5F2]" />}>
        <AppCadre slug={slug} spec={spec} version={JSON.stringify(spec).length} essai className="block h-[720px] w-full" />
      </Suspense>
    </div>
  );
}
function SaasReel({ nom, ap }) {
  const spec = useMemo(() => specApercuSaas(nom, ap), [nom, ap]);
  const slug = "apercu-" + (nom || "saas").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  const boite = useRef(null), [k, setK] = useState(0.6);
  useEffect(() => {
    const el = boite.current; if (!el) return;
    const o = new ResizeObserver(() => { const w = el.clientWidth; setK(w < 640 ? 1 : w / 1280); });
    o.observe(el); return () => o.disconnect();
  }, []);
  const H = 600, large = k < 1;
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_70px_-35px_rgba(20,20,40,.5)]">
      <div className="flex items-center gap-1.5 border-b border-black/[.06] bg-[#F6F5F2] px-3 py-2"><span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" /><span className="ml-2 flex-1 truncate rounded-md bg-white px-2.5 py-0.5 text-[11px] text-[#9A9EAE]">{nom} · données d'exemple</span><span className="text-[10.5px] text-[#9A9EAE]">clique dans le menu ↓</span></div>
      <div ref={boite} className="relative w-full overflow-hidden" style={{ height: H }}>
        <div className={large ? "absolute left-0 top-0" : ""} style={large ? { width: 1280, height: H / k, transform: `scale(${k})`, transformOrigin: "0 0" } : { height: H }}>
          <Suspense fallback={<div className="h-full animate-pulse bg-[#F6F5F2]" />}>
            <AppCadre slug={slug} spec={spec} version={JSON.stringify(spec).length} essai className="h-full w-full" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
function SiteReel({ nom, ap }) {
  const spec = useMemo(() => specSite(nom, ap), [nom, ap]);
  const slug = (nom || "mon-site").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  // Rendu en largeur d'ordinateur (1280 px), réduit à la place disponible : on voit le site comme ses clients le verront
  const boite = useRef(null), [k, setK] = useState(0.6);
  useEffect(() => {
    const el = boite.current; if (!el) return;
    const o = new ResizeObserver(() => { const w = el.clientWidth; setK(w < 640 ? 1 : w / 1280); });
    o.observe(el); return () => o.disconnect();
  }, []);
  const H = 600, large = k < 1;
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_70px_-35px_rgba(20,20,40,.5)]">
      <div className="flex items-center gap-1.5 border-b border-black/[.06] bg-[#F6F5F2] px-3 py-2"><span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" /><span className="ml-2 flex-1 truncate rounded-md bg-white px-2.5 py-0.5 text-[11px] text-[#9A9EAE]">{slug}.fr</span><span className="text-[10.5px] text-[#9A9EAE]">fais défiler ↓</span></div>
      <div ref={boite} className="relative w-full overflow-hidden" style={{ height: H }}>
        <div className={large ? "absolute left-0 top-0" : ""} style={large ? { width: 1280, height: H / k, transform: `scale(${k})`, transformOrigin: "0 0" } : { height: H }}>
          <Suspense fallback={<div className="h-full animate-pulse bg-[#F6F5F2]" />}>
            <AppCadre slug={"apercu-" + slug} spec={spec} version={JSON.stringify(spec).length} apercu className="h-full w-full" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}



// Maquette d'une APP MOBILE : un téléphone, l'écran principal et les onglets en bas

// Maquette fil de fer de l'écran principal, dessinée à partir des blocs de l'aperçu (aucun appel d'IA en plus)

// Le prix, dit AVANT de construire : ce que ça coûte à ce membre-là (compris dans sa formule, crédits, ou la formule à prendre)
const euros = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",")) + " €";
function Prix({ ws, type }) {
  const [t, setT] = useState(null), [deja, setDeja] = useState(null);
  useEffect(() => {
    fn("plans").then(setT).catch(() => setT({}));
    if (ws?.id) supabase.from("saas_apps").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).not("statut", "in", "(remplace,erreur,validation,retire)").then(({ count }) => setDeja((count ?? 0) > 0));
  }, [ws?.id]);
  if (!t) return null;
  const site = type === "site";
  const mois = (k, per = "mois") => (t.plans ?? []).find((p) => p.key === k)?.periodes?.find((x) => x.key === per)?.parMois;
  const fondateur = t.fondateur?.left > 0 ? t.fondateur.price : null;
  const lancer = fondateur ?? mois("explorer_pro") ?? 24.99;
  let txt;
  if (paye(ws, type)) txt = deja ? <>Tu as déjà un {site ? "site ou un SaaS" : "SaaS"} en ligne : celui-ci coûte <b>60 crédits</b>, le premier reste en ligne.</> : <><b>Compris dans ta formule</b> : c'est {site ? "ton site" : "ton SaaS"} de l'abonnement, sans rien payer de plus.</>;
  else if (!site && ws?.plan === "site" && actif(ws)) txt = <>Ta formule Site construit des sites. Pour {type === "app" ? "une app" : "un SaaS"}, passe à la formule Lancer : <b>{euros(lancer)} par mois</b>.</>;
  else if (site) txt = <>Formule Site : <b>{euros(mois("site") ?? 9.99)}/mois, hébergement inclus</b>, sans engagement{mois("site", "an") ? <> (ou {euros(mois("site", "an"))}/mois en payant l'année)</> : null}. Nom de domaine personnalisé en plus : tu l'achètes où tu veux, on le branche gratuitement.</>;
  else txt = <>Formule Lancer : <b>{euros(lancer)} par mois{fondateur ? ", prix fondateur à vie" : ""}</b>, sans engagement. {type === "app" ? "Ton app" : "Ton SaaS"} est compris dans l'abonnement.</>;
  return <p className="w-full rounded-xl bg-[#F7F7F5] px-3 py-2 text-[13.5px]">{txt}</p>;
}

export default function Idee() {
  const { ws, session } = useWs();
  const nav = useNavigate();
  const [idee] = useState(() => lire("bingoo-idee"));
  useEffect(() => { if (idee?.type === "video") nav("/explorer/motion", { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [etat, setEtat] = useState("charge"), [r, setR] = useState(null), [err, setErr] = useState(null);
  const [reponses, setReponses] = useState([]), [choix, setChoix] = useState({}), [nom, setNom] = useState(""), [busy, setBusy] = useState(false);
  const charger = async (rep = []) => {
    setEtat("charge"); setErr(null);
    try {
      const x = await fn("r/saas-idee-apercu", { workspace_id: ws.id, texte: idee.texte, type: idee.type, reponses: rep });
      setR(x); setEtat(x.refus ? "refus" : x.questions ? "questions" : "apercu");
      if (x.apercu) { setNom(idee.nom || x.apercu.nom); ecrire("bingoo-idee", { ...idee, reponses: rep, apercu: x.apercu, proches: x.proches }); }
    } catch (e) { setErr(e.message); setEtat("erreur"); }
  };
  useEffect(() => { if (idee?.texte && ws?.id) { if (idee.apercu?.nom) { setR({ apercu: idee.apercu, proches: idee.proches ?? [] }); setNom(idee.nom || idee.apercu.nom); setEtat("apercu"); } else charger(); } }, [ws?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!idee?.texte) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><p className="text-[20px] font-bold">Écris d'abord ton idée.</p><button onClick={() => nav("/explorer/trouver")} className="mt-4 rounded-full bg-ink px-6 py-3 font-bold text-white">Explorer les SaaS qui marchent</button></div>;

  // Lancer : un compte, l'abonnement, puis la construction habituelle (questions, paiement, construction, vérification)
  // Le style choisi devient celui de l'aperçu (et donc de la construction, qui reprend le design de l'aperçu)
  const choisirStyle = (i) => setR((x) => {
    const apercu = { ...x.apercu, design: x.apercu.designs[i] };
    ecrire("bingoo-idee", { ...idee, apercu, proches: x.proches });
    return { ...x, apercu };
  });
  const lancer = async (quoi, proche) => {
    if (estInvite(session) || !ws) { demanderCompte("Crée ton compte gratuit pour construire ton idée."); return; }
    const ap = r?.apercu;
    if (quoi === "idee") {
      ecrire(`bingoo-reponses-${DOMAINE_IDEE}`, { nom: nom.trim() || ap.nom, clients: ap.cible, mieux: "", angle: null });
      ecrire(CLE_CHANTIER, { idee: true, domaine: DOMAINE_IDEE, nom: nom.trim() || ap.nom, categorie: "", ws: ws.id, ideeTexte: idee.texte, type: idee.type, reponses: idee.reponses ?? [], apercu: { ...ap, nom: nom.trim() || ap.nom }, source: idee.source ?? null });
    } else {
      ecrire(`bingoo-reponses-${proche.domaine}`, { nom: "", clients: ap?.cible ?? "", mieux: idee.texte, angle: `Ce que je veux faire mieux : ${idee.texte}` });
      ecrire(CLE_CHANTIER, { domaine: proche.domaine, nom: proche.nom, categorie: "", ws: ws.id });
    }
    const site = quoi === "idee" && idee.type === "site";
    if (paye(ws, site ? "site" : "saas")) { nav("/explorer/revelation"); return; }
    // Site : sa propre formule, moins chère (9,99 € par mois) ; SaaS : Lancer
    const plan = site ? "site" : "explorer_pro";
    setBusy(true);
    try { const { url } = await fn("billing-checkout", { workspace_id: ws.id, plan, periode: "mois", retour: "revelation" }); if (url) { window.location.href = url; return; } nav("/explorer/revelation"); }
    catch { nav(`/abonnement?formule=${plan}&periode=mois`); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-[13px] font-bold uppercase tracking-[.16em] text-accent-dark">Ton idée{idee.type === "app" ? " d'app" : idee.type === "site" ? " de site" : ""}</p>
      <h1 className="mt-2 text-[28px] sm:text-[38px] font-black leading-[1.08] tracking-tight" style={HF}>{idee.titre ?? <>« {idee.texte} »</>}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[13.5px] text-ink-soft">Bingoo! construit :</span>
        {[["saas", "Un logiciel (SaaS)"], ["site", "Un site web"], ["app", "Une app mobile"]].map(([k, l]) => <button key={k} aria-pressed={(idee.type ?? "saas") === k} disabled={etat === "charge"} onClick={() => { if ((idee.type ?? "saas") === k) return; ecrire("bingoo-idee", { texte: idee.texte, titre: idee.titre, nom: idee.nom, source: idee.source, type: k, at: Date.now() }); window.location.reload(); }} className={cx("rounded-full border px-3 py-1.5 text-[13px] font-semibold transition", (idee.type ?? "saas") === k ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink-faint")}>{l}</button>)}
        <button onClick={() => { ecrire("bingoo-idee", null); nav("/accueil"); }} className="ml-1 text-[13.5px] font-semibold text-ink-soft underline-offset-4 hover:underline">Changer d'idée</button>
      </div>

      {etat === "charge" && <div className="mt-10 flex items-center gap-3 rounded-2xl border border-line bg-white p-6"><span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" /><span className="text-[15px] text-ink-soft">{idee.type === "site" ? "Bingoo! étudie ton idée et prépare l'aperçu de ton site…" : "Bingoo! étudie ton idée et cherche ce qui marche déjà sur ce créneau…"}</span></div>}
      {etat === "erreur" && <div className="mt-10 rounded-2xl border border-bad/30 bg-bad/5 p-6"><p className="font-semibold">{err}</p><button onClick={() => charger(reponses)} className="mt-3 rounded-xl bg-ink px-4 py-2 font-bold text-white">Réessayer</button></div>}
      {etat === "refus" && <div className="mt-10 rounded-2xl border border-bad/30 bg-bad/5 p-6"><p className="text-[17px] font-bold">Bingoo! ne peut pas construire cette idée.</p><p className="mt-1 text-ink-soft">{r.refus}</p><button onClick={() => { ecrire("bingoo-idee", null); nav("/accueil"); }} className="mt-4 rounded-xl bg-ink px-4 py-2 font-bold text-white">Écrire une autre idée</button></div>}

      {etat === "questions" && (
        <div className="mt-8 rounded-3xl border border-line bg-white p-6">
          <p className="text-[18px] font-black" style={HF}>{r.questions.length > 1 ? "Deux précisions pour viser juste" : "Une précision pour viser juste"}</p>
          <p className="text-[14px] text-ink-soft">Ton idée peut partir dans plusieurs directions : dis-moi laquelle.</p>
          <div className="mt-5 space-y-5">{r.questions.map((q) => (
            <div key={q.q}><p className="font-semibold">{q.q}</p>
              <div className="mt-2 flex flex-wrap gap-2">{q.choix.map((c) => <button key={c} aria-pressed={choix[q.q] === c} onClick={() => setChoix({ ...choix, [q.q]: c })} className={cx("rounded-full border px-4 py-2 text-[14px] font-medium transition", choix[q.q] === c ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink-faint")}>{c}</button>)}</div>
              <input placeholder="Ou écris ta réponse…" value={q.choix.includes(choix[q.q]) ? "" : choix[q.q] ?? ""} onChange={(e) => setChoix({ ...choix, [q.q]: e.target.value })} className="mt-2 w-full max-w-md rounded-xl border border-line px-3 py-2 text-[14px] outline-none focus:border-ink" />
            </div>
          ))}</div>
          <button disabled={r.questions.some((q) => !String(choix[q.q] ?? "").trim())} onClick={() => { const rep = r.questions.map((q) => ({ q: q.q, r: choix[q.q] })); setReponses(rep); charger(rep); }} className="mt-6 rounded-full bg-accent px-6 py-3 font-bold text-white disabled:opacity-40">Voir mon aperçu</button>
        </div>
      )}

      {etat === "apercu" && r?.apercu && (() => { const ap = r.apercu, site = idee.type === "site"; return (
        <>
          <section className="mt-8 rounded-3xl border-2 border-ink bg-white p-5 sm:p-7">
            <p className="text-[12px] font-bold uppercase tracking-[.14em] text-ink-faint">L'aperçu de ta première version</p>
            <div className={cx("mt-4 grid grid-cols-1 gap-6 [&>*]:min-w-0", idee.type === "app" && "lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start")}>
              <div>
                <label className="text-[12.5px] font-semibold text-ink-soft" htmlFor="nom-idee">{site ? "Le nom affiché sur ton site" : "Son nom"}</label>
                <input id="nom-idee" value={nom} onChange={(e) => setNom(e.target.value.slice(0, 40))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-[22px] font-black outline-none focus:border-ink" style={HF} />
                <p className="mt-3 text-[15px]">{ap.pitch}</p>
                <p className="mt-1 text-[13.5px] text-ink-soft">Pour : {ap.cible}</p>
                <p className="mt-5 text-[13px] font-bold">{site ? `Ce que Bingoo! construit maintenant (${ap.ecrans.length} parties)` : idee.type === "app" ? `Ce que Bingoo! construit maintenant (${ap.ecrans.length} onglets)` : `Ce que Bingoo! construit maintenant (${ap.ecrans.length} écrans)`}</p>
                <ol className="mt-2 space-y-1.5">{ap.ecrans.map((e, i) => <li key={e.titre} className="flex gap-2.5 text-[14px]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-paper text-[11px] font-bold">{i + 1}</span><span><b>{e.titre}</b> <span className="text-ink-soft">— {e.role}</span></span></li>)}</ol>
                {ap.plus_tard?.length > 0 && <><p className="mt-5 text-[13px] font-bold">Ensuite, dans l'atelier</p><p className="mt-1 text-[13.5px] text-ink-soft">{ap.plus_tard.join(" · ")}</p></>}
                {ap.limites?.length > 0 && <div className="mt-5 rounded-xl bg-[#FFF7F0] p-3"><p className="text-[13px] font-bold text-[var(--p)]">Fait autrement</p><ul className="mt-1 space-y-1">{ap.limites.map((l) => <li key={l.demande} className="text-[13.5px]"><span className="line-through decoration-[#C2410C]/50">{l.demande}</span> → {l.alternative}</li>)}</ul></div>}
              </div>
              {(ap.designs?.length ?? 0) > 1 && <div className="order-first">
                <p className="mb-2 text-[14px] font-bold">Choisis ton style <span className="font-normal text-ink-faint">· trois vrais rendus de ta page, Bingoo! construit celui que tu choisis</span></p>
                <div className={cx("grid gap-3", idee.type === "app" ? "grid-cols-3 max-w-[560px]" : "grid-cols-1 sm:grid-cols-3")}>{ap.designs.map((d, i) => <Vignette key={i} n={i} nom={nom || ap.nom} ap={ap} design={d} type={site ? "site" : idee.type === "app" ? "app" : "saas"} choisi={JSON.stringify(d) === JSON.stringify(ap.design)} onClick={() => choisirStyle(i)} />)}</div>
              </div>}
              <div className="order-first">{site ? <SiteReel nom={nom || ap.nom} ap={ap} /> : idee.type === "app" ? <TelReel nom={nom || ap.nom} ap={ap} /> : <SaasReel nom={nom || ap.nom} ap={ap} />}<p className="mt-2 text-center text-[12px] text-ink-faint">{site ? "Ta future page d'accueil, faite avec le gabarit des sites Bingoo! : fais-la défiler. Tu ajouteras ta photo, tes horaires et ton adresse ensuite." : "Ton écran principal dans la vraie coque de ton SaaS, avec des données d'exemple : la construction écrit chaque écran pour de vrai, avec ces couleurs et ces polices."}</p>{!site && (ap.principal?.blocs ?? []).some((b) => (b.images ?? []).some(Boolean)) && <p className="mt-1 text-center text-[11px] text-ink-faint">Images d'exemple créées par l'IA pour cet aperçu : tu mettras les tiennes.</p>}</div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <Prix ws={ws} type={idee.type} />
              <button disabled={busy || nom.trim().length < 2} onClick={() => lancer("idee")} className="rounded-full bg-accent px-7 py-3.5 text-[16px] font-bold text-white shadow-[0_12px_30px_-14px_rgba(226,85,35,.9)] disabled:opacity-50">{busy ? "Un instant…" : `Construire ${nom.trim() || ap.nom}`}</button>
              <p className="text-[13px] text-ink-soft">{site ? <>Bingoo! écrit tes textes, met ton site en ligne et teste ton espace gérant. Tu vérifies ensuite tes prix et tes horaires.</> : <>Bingoo! le construit, teste chaque écran comme un vrai utilisateur, corrige, puis le met en ligne.{idee.type === "app" ? " Tu l'essaies ensuite sur ton téléphone dans Expo Go (gratuit). La publication sur l'App Store et Google Play arrive bientôt." : ""}</>}</p>
            </div>
          </section>

          {!site && idee.type !== "app" && r.proches?.length > 0 && (
            <section className="mt-10">
              <p className="text-[15px] font-bold">Pour t'inspirer, si tu veux : {r.proches.length > 1 ? `${r.proches.length} logiciels proches qui marchent déjà` : "un logiciel proche qui marche déjà"}</p>
              <p className="text-[14px] text-ink-soft">Facultatif : ton idée se construit telle quelle avec le bouton ci-dessus. Tu peux aussi partir de leur logique, qui a fait ses preuves.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">{r.proches.map((s) => (
                <div key={s.domaine} className="flex flex-col rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center gap-3"><CompanyLogo name={s.nom} url={`https://${s.domaine}`} className="h-10 w-10" pad="p-1.5" /><div className="min-w-0"><p className="truncate font-bold">{s.nom}</p><p className="text-[12.5px] text-ink-faint">{s.mrr ? <span className="font-semibold text-good">{dollars(s.mrr)} par mois, vérifié</span> : s.domaine}</p></div></div>
                  <p className="mt-2 flex-1 text-[13.5px] text-ink-soft line-clamp-3">{s.description}</p>
                  <button disabled={busy} onClick={() => lancer("inspirer", s)} className="mt-3 rounded-xl border border-ink px-3 py-2 text-[13.5px] font-bold hover:bg-ink hover:text-white">M'en inspirer</button>
                </div>
              ))}</div>
            </section>
          )}

        </>
      ); })()}
    </div>
  );
}
