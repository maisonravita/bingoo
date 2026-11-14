// Après le paiement : le flou disparaît, le SaaS choisi apparaît en grand, puis Bingoo! construit sa version en plein écran.
// Une fois en ligne, le créateur entre dans l'interface complète de Bingoo!.
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import { resumeFr } from "../lib/angle";
import CompanyLogo from "../components/CompanyLogo";
import Logo from "../components/Logo";
import { lienApp } from "../components/AppCadre";
import { indexChoisi } from "../lib/choix";

const HF = { fontFamily: "var(--font-titre)" };
const CLE_CHOIX = "bingoo-choix";
const CLE_CHANTIER = "bingoo-chantier";
const dollar = (n) => n == null ? "—" : n >= 1e4 ? `${Math.round(n / 1e3)} k$` : `${Math.round(n).toLocaleString("fr-FR")} $`;
const paye = (ws) => ws?.plan === "fondateur" || (["explorer", "explorer_pro", "business", "solo", "pro"].includes(ws?.plan) && ["active", "trialing", "past_due"].includes(ws?.plan_status));
const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };
const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));


export default function Revelation({ paramsDe }) {
  const { ws, reload } = useWs();
  const nav = useNavigate();
  const chantier0 = lire(CLE_CHANTIER);
  const [phase, setPhase] = useState(chantier0 ? "construction" : "attente");
  const [liste, setListe] = useState(null);
  const [choix, setChoix] = useState(0);
  const [visible, setVisible] = useState(false);
  const [lent, setLent] = useState(false);

  // 1. Le paiement s'active (quelques secondes après le retour de Stripe)
  useEffect(() => {
    if (phase !== "attente") return;
    if (paye(ws)) { setPhase("chargement"); return; }
    let vivant = true;
    (async () => { for (let i = 0; i < 40 && vivant; i++) { await attendre(2500); await reload?.(); } if (vivant) setLent(true); })();
    return () => { vivant = false; };
  }, [phase, ws?.plan_status]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Les SaaS, cette fois avec leur nom
  useEffect(() => {
    if (phase !== "chargement") return;
    const r = lire("bingoo-parcours2") ?? {};
    supabase.rpc("saas_pour_moi3", { p: paramsDe({ canaux: [], refus: [], secteurs: [], ...r }) }).then(({ data }) => {
      // Le SaaS choisi passe en premier (retrouvé par sa référence, même s'il était au-delà des 9 premiers)
      const tous = data ?? [];
      const k = indexChoisi(tous);
      const l = (k >= 0 ? [tous[k], ...tous.filter((_, i) => i !== k)] : tous).slice(0, 9);
      setChoix(0);
      setListe(l); setPhase("revele");
      setTimeout(() => setVisible(true), 900);
    });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const construire = (s) => {
    const c = { domaine: s.domaine, nom: s.nom, categorie: s.categorie };
    ecrire(CLE_CHANTIER, c); ecrire("bingoo-mon-saas-modele", s); localStorage.removeItem(CLE_CHOIX);
    setPhase("construction");
  };

  if (!ws) return null;
  if (phase === "construction") return <Chantier ws={ws} nav={nav} />;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Decor />
      <div className="relative z-[1] px-5 pt-5 sm:px-8"><Logo /></div>
      <div className="relative z-[1] mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {phase === "attente" || phase === "chargement" ? (
          <div className="grid place-items-center py-24 text-center">
            <span className="relative grid h-16 w-16 place-items-center">
              <span className="absolute inset-0 rounded-full border-4 border-line" />
              <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#E8571C]" />
            </span>
            <h1 className="mt-6 text-[30px] sm:text-[40px] font-black leading-tight" style={HF}>Paiement reçu, merci.</h1>
            <p className="mt-2 text-[16px] text-ink-soft">Bingoo! retire le flou de tes SaaS à succès…</p>
            {lent && <p className="mt-6 max-w-md text-[14px] text-ink-soft">C'est plus long que d'habitude. Recharge la page dans une minute ; si rien ne change, écris-nous à bingoo@maisonravita.fr.</p>}
          </div>
        ) : !liste?.length ? (
          <Navigate to="/explorer/copier" replace />
        ) : (
          <>
            <div className="text-center">
              <p className={cx("text-[13px] font-bold uppercase tracking-[.14em] text-accent-dark transition-opacity duration-700", visible ? "opacity-100" : "opacity-0")}>Le flou est levé</p>
              <h1 className="mt-2 text-[34px] sm:text-[52px] font-black leading-[1.02]" style={HF}>
                {visible ? <>Voici ton SaaS : <span className="fx-texte">{liste[choix].nom}</span></> : "Tes SaaS à succès…"}
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-[16px] text-ink-soft">Son nom, ses chiffres, ce qu'il fait. Bingoo! va construire ta version, à ton nom, avec ton design.</p>
            </div>
            <Vedette s={liste[choix]} visible={visible} onConstruire={() => construire(liste[choix])} />
            {liste.length > 1 && (
              <div className="mt-12">
                <p className="text-center text-[14px] font-semibold text-ink-soft">Tu préfères un autre ? Clique dessus.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {liste.map((s, i) => i === choix ? null : (
                    <button key={s.domaine} onClick={() => setChoix(i)} className="fx-spot rounded-2xl border border-line bg-white p-4 text-left transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(21,23,42,.45)]"
                      style={{ filter: visible ? "blur(0)" : "blur(9px)", transitionDelay: `${300 + i * 140}ms` }}>
                      <div className="flex items-center gap-2.5">
                        <CompanyLogo name={s.nom} url={`https://${s.domaine}`} className="h-9 w-9" />
                        <div className="min-w-0"><p className="truncate font-bold text-[14.5px]">{s.nom}</p><p className="truncate text-[12px] text-ink-faint">{s.categorie}</p></div>
                      </div>
                      <p className="mt-2.5 text-[13px] text-ink-soft"><b className="text-ink tnum">{dollar(s.mrr)}</b> par mois, vérifié</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Decor() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden style={{ WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, #000 30%, transparent 75%)", maskImage: "radial-gradient(ellipse at 50% 30%, #000 30%, transparent 75%)" }}>
      <div className="fx-grille" />
      <span className="fx-aurore h-[320px] w-[320px] bg-[#F6A06B] left-[12%] top-10" />
      <span className="fx-aurore h-[300px] w-[300px] bg-[#9B6BFF] right-[10%] top-40" style={{ animationDelay: "-6s" }} />
    </div>
  );
}

// Le SaaS choisi, en grand : il sort du flou
function Vedette({ s, visible, onConstruire }) {
  return (
    <div className="mx-auto mt-10 max-w-3xl fx-halo rounded-[28px]">
      <div className="rounded-[28px] bg-white p-6 sm:p-8 transition-all duration-[1400ms] ease-out" style={{ filter: visible ? "blur(0)" : "blur(14px)", transform: visible ? "scale(1)" : "scale(.97)" }}>
        <div className="flex flex-wrap items-start gap-4">
          <CompanyLogo name={s.nom} url={`https://${s.domaine}`} className="h-16 w-16" pad="p-2" />
          <div className="min-w-0 flex-1">
            <p className="text-[28px] sm:text-[34px] font-black leading-tight" style={HF}>{s.nom}</p>
            <p className="text-[14px] text-ink-faint">{s.categorie} · <a href={`https://${s.domaine}`} target="_blank" rel="noreferrer" className="hover:underline">{s.domaine}</a></p>
          </div>
          <div className="text-right">
            <p className="text-[30px] font-black leading-none tnum" style={HF}>{dollar(s.mrr)}</p>
            <p className="mt-1 text-[12.5px] text-ink-faint">par mois, revenu vérifié</p>
          </div>
        </div>
        <p className="mt-5 text-[16px] leading-relaxed text-ink-soft">{resumeFr(s)}</p>
        {s.pourquoi?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">{s.pourquoi.slice(0, 3).map((p) => <span key={p} className="rounded-full bg-paper px-3 py-1.5 text-[13px] font-semibold text-ink-soft">{p}</span>)}</div>
        )}
        <button onClick={onConstruire} disabled={!visible} className="fx-brille mt-7 w-full rounded-2xl bg-accent py-4 text-[17px] font-bold text-white hover:bg-accent-dark disabled:opacity-60">Construire ma version de {s.nom}</button>
        <p className="mt-3 text-center text-[12.5px] text-ink-faint">Les mêmes fonctionnalités, avec ton nom, tes mots et ton design. Jamais sa marque ni ses textes.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- L'atelier, comme Lovable : la conversation à gauche, le SaaS qui se construit à droite.
// Une fois en ligne, le créateur demande ses changements dans la conversation et les voit apparaître dans l'aperçu.
const LECTURE = (nom) => [`Je lis le site de ${nom}`, "Je lis ses prix et ses formules", "Je repère ses fonctionnalités clés", "Je choisis un nom et un angle pour ta version"];
// Ce que Bingoo! a réellement décidé pour ta version, présenté comme sa réflexion (questions qu'il se pose, puis sa réponse)
function penseDe(p) {
  if (!p) return null;
  const l = [];
  if (p.cible) l.push({ q: "Qui paie déjà pour ce genre d'outil ?", r: [p.cible] });
  if (p.probleme) l.push({ q: "Quel problème il règle vraiment ?", r: [p.probleme] });
  const eq = (p.equivalences ?? []).slice(0, 4).map((x) => x.chez_toi).filter(Boolean);
  if (eq.length) l.push({ q: "Qu'est-ce que ta version doit savoir faire ?", r: eq });
  const di = (p.differences ?? []).slice(0, 3).map((x) => x.angle).filter(Boolean);
  if (di.length) l.push({ q: "Comment tu te démarques ?", r: di });
  const fo = (p.formules ?? []).slice(0, 3).filter((x) => x?.nom).map((x) => `${x.nom}${x.prix ? ` · ${x.prix} €/mois` : ""}`);
  if (fo.length) l.push({ q: "À quel prix le vendre ?", r: fo });
  const mv = (p.mvp ?? []).slice(0, 3).map((x) => x.fonction).filter(Boolean);
  if (mv.length) l.push({ q: "Par quoi je commence ?", r: mv });
  return l.length ? l : null;
}
function Reflexion({ pense, enCours }) {
  const [n, setN] = useState(enCours ? 1 : pense.length);
  useEffect(() => { if (n >= pense.length) return; const t = setTimeout(() => setN((x) => x + 1), 2200); return () => clearTimeout(t); }, [n, pense.length]);
  return (
    <div className="mt-3 space-y-3 border-l-2 border-[#F3D3C2] pl-3.5">
      {pense.slice(0, n).map((x, i) => (
        <div key={i} className="rise">
          <p className="text-[13px] font-semibold text-ink">{x.q}</p>
          <ul className="mt-1 space-y-0.5 text-[13px] text-ink-soft">{x.r.map((t, k) => <li key={k} className="flex gap-1.5"><span className="text-[#E8571C]">→</span><span>{t}</span></li>)}</ul>
        </div>
      ))}
      {n < pense.length && <p className="flex items-center gap-2 text-[12.5px] text-ink-faint"><span className="h-1.5 w-1.5 rounded-full bg-[#E8571C] pulse-dot" />Je réfléchis…</p>}
    </div>
  );
}
const IDEES = ["Ajoute une page de tarifs", "Ajoute un tableau de bord de mes ventes", "Ajoute une page d'aide pour mes clients"];
const Coche = ({ ok }) => ok
  ? <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-good/15 text-good"><svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>
  : <span className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-line border-t-[#E8571C]" />;

export function Chantier({ ws, nav, init, atelier = false }) {
  const c = init ?? lire(CLE_CHANTIER) ?? {};
  // Atelier : le SaaS existe déjà, on l'ouvre directement (jamais de nouvelle construction)
  const pretDeja = atelier && c.app?.statut === "pret" && c.app?.spec?.ecrans?.length > 0;
  const [etape, setEtape] = useState(pretDeja ? 5 : 0);
  const [projet, setProjet] = useState(c.projet ?? null);
  const [app, setApp] = useState(pretDeja ? c.app : null);
  const [erreur, setErreur] = useState(null);
  const [tic, setTic] = useState(0);
  const [essai, setEssai] = useState(0);
  const [echanges, setEchanges] = useState([]); // modifications demandées après la mise en ligne
  const [demande, setDemande] = useState("");
  const [ecran, setEcran] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [vue, setVue] = useState("ordi");
  const [cle, setCle] = useState(0);
  const lance = useRef(false);
  const parCredits = useRef(false); // l'utilisateur a accepté de payer ce SaaS supplémentaire en crédits
  // 3 questions avant de construire (facultatives) : le SaaS devient le sien, pas un SaaS généré
  const [questions, setQuestions] = useState(() => !(atelier || pretDeja || c.projet?.id));
  const [rep, setRep] = useState({ nom: "", clients: "", mieux: "" });
  const angle = useRef(null);
  const fil = useRef(null);

  useEffect(() => { const t = setInterval(() => setTic((x) => x + 1), 6500); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (questions) return;
    if (lance.current) return; lance.current = true;
    let vivant = true;
    if (pretDeja) return () => { vivant = false; lance.current = false; };
    (async () => {
      try {
        let p = projet;
        if (atelier && !p?.id) throw new Error("Ton SaaS est introuvable.");
        if (!p?.id) {
          const { data: deja } = await supabase.from("saas_projets").select("id, data, statut").eq("workspace_id", ws.id).eq("data->inspire->>domaine", c.domaine).eq("statut", "pret").order("at", { ascending: false }).limit(1);
          if (deja?.[0]) p = { id: deja[0].id, ...deja[0].data };
          else {
            const { id } = await fn("r/saas-lancer", { workspace_id: ws.id, domaine: c.domaine, angle: angle.current });
            for (let i = 0; i < 90 && vivant; i++) {
              await attendre(3500);
              if (i === 8) setEtape(1);
              const { data } = await supabase.from("saas_projets").select("data, statut, erreur").eq("id", id).maybeSingle();
              if (data?.statut === "pret") { p = { id, ...data.data }; break; }
              if (data?.statut === "erreur") throw new Error(data.erreur || "La préparation a échoué.");
            }
            if (!p) throw new Error("C'est plus long que prévu.");
          }
          if (!vivant) return;
          const garde = { id: p.id, nom: p.nom, pitch: p.pitch, cible: p.cible, pense: penseDe(p) };
          setProjet(garde); if (!atelier) ecrire(CLE_CHANTIER, { ...c, projet: garde });
        }
        setEtape(2);
        const { data: ex } = await supabase.from("saas_apps").select("statut").eq("projet_id", p.id).maybeSingle();
        if (!atelier && (!ex || ex.statut === "erreur")) await fn("r/saas-construire", { workspace_id: ws.id, projet_id: p.id, ...(parCredits.current ? { credits: true } : {}) });
        for (let i = 0; i < 240 && vivant; i++) {
          await attendre(3000);
          const { data } = await supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut").eq("projet_id", p.id).maybeSingle();
          if (!data) continue;
          setApp(data);
          if (/Vérif/i.test(data.etape ?? "")) setEtape(3);
          if (data.statut === "pret" && data.spec?.ecrans?.length) { setEtape(5); return; }
          if (data.statut === "erreur") throw new Error(data.erreur || "La construction a échoué.");
        }
        if (vivant) throw new Error("C'est plus long que prévu.");
      } catch (e) { if (vivant) setErreur(e.message); }
    })();
    return () => { vivant = false; lance.current = false; };
  }, [essai, questions]); // eslint-disable-line react-hooks/exhaustive-deps

  const spec = app?.spec?.ecrans?.length ? app.spec : app?.brouillon;
  const ecrans = (spec?.ecrans ?? []).filter((e) => !e.public);
  const ecrits = (() => { const m = /\((\d+)\/(\d+)\)/.exec(app?.etape ?? ""); return m ? Number(m[1]) : etape >= 3 ? ecrans.length : 0; })();
  const couleur = spec?.couleur ?? "#E8571C";
  const nom = projet?.nom ?? spec?.nom ?? null;
  const fini = etape >= 5;
  const lien = app?.slug ? lienApp(app.slug, app.domaine_statut === "ok" ? app.domaine : null) : "";
  const pct = fini ? 100 : Math.min(96, [8, 24, 40, 86, 94][etape] + (etape === 2 && ecrans.length ? (ecrits / ecrans.length) * 44 : 0));
  useEffect(() => { fil.current?.scrollTo({ top: fil.current.scrollHeight, behavior: "smooth" }); });

  // Une modification demandée dans la conversation : écrite, puis mise en ligne, puis l'aperçu se recharge
  const envoyer = async (texte) => {
    const t = (texte ?? demande).trim();
    if (t.length < 5 || occupe || !app) return;
    const n = echanges.length;
    setEchanges((l) => [...l, { moi: t, etat: "encours" }]); setDemande(""); setOccupe(true);
    const maj = (o) => setEchanges((l) => l.map((x, k) => (k === n ? { ...x, ...o } : x)));
    try {
      const r = await fn("r/saas-app-modifier", { workspace_id: ws.id, app_id: app.id, ecran: ecran || "nouveau", demande: t });
      for (let i = 0; i < 80; i++) {
        await attendre(3000);
        const { data } = await supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut").eq("id", app.id).maybeSingle();
        if (data && data.statut !== "en_cours") {
          if (data.erreur) throw new Error(data.erreur);
          if (data.brouillon?._modif) await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "brouillon-valider" });
          const { data: frais } = await supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut").eq("id", app.id).maybeSingle();
          setApp(frais ?? data); setCle((k) => k + 1);
          maj({ etat: "ok", credit: r?.credit });
          return;
        }
      }
      throw new Error("C'est plus long que prévu : l'aperçu se mettra à jour tout seul.");
    } catch (e) { maj({ etat: "ko", erreur: e.message }); } finally { setOccupe(false); }
  };

  // Dans l'atelier, le SaaS existe déjà : pas besoin du SaaS d'origine (un SaaS lancé depuis une idée n'en a pas)
  if (!c.domaine && !(atelier && c.app)) return <Navigate to="/explorer/copier" replace />;
  const lect = LECTURE(c.nom);
  const lignes = [
    ...lect.slice(0, etape >= 1 ? lect.length : Math.min(lect.length, 1 + tic)).map((t, i) => ({ k: `l${i}`, t, ok: etape >= 1 || i < Math.min(lect.length, tic) })),
    ...(etape >= 2 ? ecrans.map((e, i) => ({ k: `e${e.id}`, t: i < ecrits ? <>Écran « {e.titre} » écrit</> : <>J'écris l'écran « {e.titre} »</>, ok: i < ecrits })).filter((x, i) => i <= ecrits) : []),
    ...(etape >= 3 ? [{ k: "v", t: "Je vérifie chaque écran avec des données d'exemple", ok: fini }] : []),
  ];

  return (
    <div className="flex h-screen flex-col bg-[#FAF9F6]">
      {/* Barre du haut */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-4">
        <span className="flex items-center"><Logo height={26} /></span>
        <span className="mx-1 h-5 w-px bg-line" />
        <span className="grid h-7 w-7 place-items-center rounded-lg text-[13px] font-black text-white transition-colors duration-700" style={{ background: couleur }}>{(nom ?? c.nom ?? "?").charAt(0).toUpperCase()}</span>
        <p className="min-w-0 truncate font-semibold">{nom ?? `Ta version de ${c.nom}`}</p>
        <span className={cx("hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold", fini ? "bg-good/10 text-good" : "bg-accent-soft text-accent-dark")}>
          <span className={cx("h-1.5 w-1.5 rounded-full pulse-dot", fini ? "bg-good" : "bg-[#E8571C]")} />{fini ? (occupe ? "Modification…" : "En ligne") : `Construction · ${Math.round(pct)} %`}
        </span>
        <div className="flex-1" />
        {fini && <a href={lien} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-3 py-1.5 text-[13.5px] font-semibold hover:bg-paper">Ouvrir ↗</a>}
        <button onClick={() => { if (!atelier) ecrire(CLE_CHANTIER, null); nav("/explorer/mon-saas"); }} disabled={!fini && !atelier}
          className="rounded-lg bg-ink px-3.5 py-1.5 text-[13.5px] font-semibold text-white hover:bg-ink/85 disabled:opacity-40">{atelier ? "Fermer l'atelier" : "Entrer dans Bingoo!"}</button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* La conversation */}
        <section className="flex min-h-0 flex-col border-line bg-white lg:w-[440px] lg:shrink-0 lg:border-r max-lg:h-[46vh] max-lg:border-b">
          <div ref={fil} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
            {atelier ? (
              <Bingoo>
                <p>Bienvenue dans l'atelier de <b>{nom ?? "ton SaaS"}</b>. {fini ? "Essaie-le à droite, puis dis-moi ce que tu veux changer, en une phrase." : "J'ouvre ton SaaS…"}</p>
                {fini && <div className="mt-3 flex flex-wrap gap-1.5">{IDEES.map((x) => <button key={x} onClick={() => { setEcran(""); envoyer(x); }} disabled={occupe} className="rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium hover:border-ink-faint disabled:opacity-50">{x}</button>)}</div>}
              </Bingoo>
            ) : <>
            {questions ? (
              <Bingoo>
                <p>Avant de construire ta version de {c.nom}, trois questions pour qu'elle soit vraiment <b>la tienne</b>. Tout est facultatif.</p>
                <div className="mt-3 space-y-2.5">
                  {[["nom", "Comment veux-tu l'appeler ?", "Laisse vide : Bingoo! propose un nom", 40], ["clients", "Qui sont tes clients, exactement ?", "Ex. les salons de coiffure à Lyon", 160], ["mieux", "Qu'est-ce que tu veux faire mieux que " + c.nom + " ?", "Ex. plus simple, moins cher, en français", 200]].map(([k, q, ph, n]) => (
                    <label key={k} className="block"><span className="text-[13px] font-semibold">{q}</span>
                      <input value={rep[k]} maxLength={n} onChange={(e) => setRep({ ...rep, [k]: e.target.value })} placeholder={ph} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-[13.5px] outline-none focus:border-[#E8571C]" /></label>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { const t = [rep.nom.trim() && `Nom souhaité, à utiliser tel quel : ${rep.nom.trim()}`, rep.clients.trim() && `Clients visés : ${rep.clients.trim()}`, rep.mieux.trim() && `Ce que je veux faire mieux : ${rep.mieux.trim()}`].filter(Boolean).join(". "); angle.current = t || null; setQuestions(false); }} className="rounded-lg bg-[#E8571C] px-4 py-2 text-[13px] font-semibold text-white">Construire ma version</button>
                  <button onClick={() => { angle.current = null; setQuestions(false); }} className="rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-soft hover:text-ink">Passer</button>
                </div>
              </Bingoo>
            ) : <>
            <Moi>Construis ma version de {c.nom}</Moi>
            <Bingoo>
              <p>C'est parti. {c.nom} gagne déjà de l'argent : je construis ta version, avec ton nom, tes mots et ton design.</p>
              <div className="mt-3 rounded-xl border border-line bg-[#FCFBF9] p-3">
                <div className="mb-2 flex items-center justify-between text-[12.5px] text-ink-soft"><span className="font-semibold text-ink">Construction</span><span className="tnum">{Math.round(pct)} %</span></div>
                <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#ECEAE4]"><div className="h-full rounded-full bg-[#E8571C] transition-all duration-[1500ms]" style={{ width: `${pct}%` }} /></div>
                {fini ? (
                  <details className="text-[13.5px]"><summary className="flex cursor-pointer list-none items-center gap-2.5"><Coche ok /><span>Terminé : {ecrans.length} écrans écrits et vérifiés</span><span className="ml-auto text-[12px] text-ink-faint">Détails</span></summary>
                    <ul className="mt-2 space-y-1.5">{lignes.map((l) => <li key={l.k} className="flex items-center gap-2.5"><Coche ok /><span className="min-w-0 truncate">{l.t}</span></li>)}</ul></details>
                ) : <ul className="space-y-1.5">{lignes.map((l) => <li key={l.k} className="rise flex items-center gap-2.5 text-[13.5px]"><Coche ok={l.ok} /><span className={cx("min-w-0 truncate", !l.ok && "text-ink-soft")}>{l.t}</span></li>)}</ul>}
              </div>
            </Bingoo>
            {projet?.nom && (
              <Bingoo>
                <p>Ta version s'appelle <b>{projet.nom}</b>.{projet.pitch ? ` ${projet.pitch}` : ""}</p>
                {projet.pense ? <Reflexion pense={projet.pense} enCours={!fini} /> : projet.cible && <p className="mt-1.5 text-ink-soft">Pour : {projet.cible}</p>}
              </Bingoo>
            )}
            </>}
            </>}
            {fini && !atelier && (
              <Bingoo>
                <p><b>{nom} est en ligne.</b> Essaie-le à droite : crée un compte, ajoute des données, clique partout. C'est ton vrai SaaS.</p>
                <p className="mt-1.5">Dis-moi ce que tu veux changer, en une phrase.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{IDEES.map((x) => <button key={x} onClick={() => { setEcran(""); envoyer(x); }} disabled={occupe} className="rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium hover:border-ink-faint disabled:opacity-50">{x}</button>)}</div>
              </Bingoo>
            )}
            {echanges.map((x, i) => (
              <div key={i} className="space-y-5">
                <Moi>{x.moi}</Moi>
                <Bingoo>
                  {x.etat === "encours" ? <p className="flex items-center gap-2.5 text-ink-soft"><Coche ok={false} />Je modifie ton SaaS… (une à deux minutes)</p>
                    : x.etat === "ok" ? <p className="flex items-center gap-2.5"><Coche ok />C'est en ligne, regarde l'aperçu.{x.credit ? " (1 crédit utilisé)" : ""}</p>
                      : <p className="text-[#B42318]">{x.erreur}</p>}
                </Bingoo>
              </div>
            ))}
            {erreur && (
              <Bingoo>
                {/Un autre SaaS coûte/.test(erreur) ? <>
                  <p>{erreur}</p>
                  {/il te manque/.test(erreur)
                    ? <button onClick={() => nav("/abonnement")} className="mt-2.5 rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white">Recharger mes crédits</button>
                    : <button onClick={() => { parCredits.current = true; setErreur(null); setEssai((e) => e + 1); }} className="mt-2.5 rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white">Construire avec 60 crédits</button>}
                </> : <>
                  <p>Petit contretemps : {erreur} Rien n'est perdu, je reprends là où je me suis arrêté.</p>
                  <button onClick={() => { setErreur(null); setEssai((e) => e + 1); }} className="mt-2.5 rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white">Relancer</button>
                </>}
              </Bingoo>
            )}
          </div>
          {/* La zone de saisie */}
          <form onSubmit={(e) => { e.preventDefault(); envoyer(); }} className="shrink-0 border-t border-line p-3">
            <div className={cx("rounded-2xl border bg-white p-2.5 transition", fini ? "border-line focus-within:border-ink-faint focus-within:shadow-[0_8px_30px_-18px_rgba(21,23,42,.4)]" : "border-line opacity-60")}>
              <textarea value={demande} onChange={(e) => setDemande(e.target.value)} disabled={!fini || occupe} rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
                placeholder={fini ? `Demande un changement à Bingoo!…` : "Tu pourras demander des changements dès que ton SaaS est en ligne"}
                className="block w-full resize-none bg-transparent px-1.5 text-[14.5px] outline-none placeholder:text-ink-faint" />
              <div className="mt-1.5 flex items-center gap-2">
                <select value={ecran} onChange={(e) => setEcran(e.target.value)} disabled={!fini} className="min-w-0 max-w-[60%] truncate rounded-lg border border-line bg-[#FCFBF9] px-2 py-1 text-[12.5px] text-ink-soft">
                  <option value="">Où : un nouvel écran</option>
                  {ecrans.map((e) => <option key={e.id} value={e.id}>Où : {e.titre}</option>)}
                </select>
                <div className="flex-1" />
                <button type="submit" disabled={!fini || occupe || demande.trim().length < 5} aria-label="Envoyer" className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white disabled:opacity-30">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                </button>
              </div>
            </div>
            <p className="mt-1.5 px-1 text-[11.5px] text-ink-faint">30 modifications par mois incluses, puis 1 crédit chacune.</p>
          </form>
        </section>

        {/* L'aperçu */}
        <section className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
          <div className="mb-2.5 flex items-center gap-2">
            <div className="flex rounded-lg border border-line bg-white p-0.5 text-[12.5px] font-semibold">
              {[["ordi", "Ordinateur"], ["tel", "Téléphone"]].map(([k, l]) => <button key={k} onClick={() => setVue(k)} className={cx("rounded-md px-2.5 py-1", vue === k ? "bg-ink text-white" : "text-ink-soft")}>{l}</button>)}
            </div>
            <div className="min-w-0 flex-1 truncate rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] text-ink-faint">{fini ? lien.replace(/^https?:\/\//, "") : "Aperçu en construction…"}</div>
            <button onClick={() => setCle((k) => k + 1)} disabled={!fini} aria-label="Recharger l'aperçu" className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-ink-soft hover:text-ink disabled:opacity-40">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
            </button>
          </div>
          <div className={cx("relative mx-auto min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-line bg-white shadow-[0_30px_80px_-50px_rgba(21,23,42,.5)] transition-[max-width] duration-500", vue === "tel" ? "max-w-[390px]" : "max-w-none")}>
            {fini ? <iframe key={cle} title={`Aperçu de ${nom}`} src={lien} className="absolute inset-0 h-full w-full border-0" />
              : <Assemblage nom={nom} couleur={couleur} ecrans={ecrans} ecrits={ecrits} etape={etape} />}
            {occupe && <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-[#ECEAE4]"><div className="h-full w-1/3 animate-[barre_1.2s_ease-in-out_infinite] bg-[#E8571C]" /></div>}
          </div>
        </section>
      </div>
    </div>
  );
}
const Moi = ({ children }) => <div className="ml-10 flex justify-end"><p className="rounded-2xl rounded-br-md bg-[#F1EFEA] px-3.5 py-2.5 text-[14.5px] leading-snug">{children}</p></div>;
const Bingoo = ({ children }) => (
  <div className="rise flex gap-2.5">
    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#E8571C] text-[12px] font-black text-white">B</span>
    <div className="min-w-0 flex-1 text-[14.5px] leading-relaxed">{children}</div>
  </div>
);

// Pendant la construction : l'application s'assemble (sa couleur, son nom, chaque écran qui apparaît)
function Assemblage({ nom, couleur, ecrans, ecrits, etape }) {
  const sel = Math.max(0, Math.min(ecrans.length - 1, ecrits - 1));
  const vu = ecrans[sel];
  return (
    <div className="absolute inset-0 grid grid-cols-[180px_1fr] max-sm:grid-cols-[110px_1fr]">
      <div className="p-4 transition-colors duration-1000" style={{ background: etape >= 1 ? couleur : "#E2E8F0" }}>
        <p className="mb-5 truncate text-[15px] font-black text-white">{nom ?? <span className="inline-block h-3.5 w-24 animate-pulse rounded bg-white/50" />}</p>
        {(ecrans.length ? ecrans : Array.from({ length: 6 }, (_, i) => ({ id: i }))).slice(0, 9).map((e, i) => (
          <div key={e.id} className={cx("mb-1 truncate rounded-lg px-2.5 py-2 text-[13px] text-white transition-all duration-500", i < ecrits ? "opacity-100" : "opacity-35", i === sel && i < ecrits && "bg-white/20 font-semibold")}>
            {e.titre && i < ecrits ? e.titre : <span className="inline-block h-2.5 w-20 rounded bg-white/50 align-middle" />}
          </div>
        ))}
      </div>
      <div className="relative overflow-hidden p-6">
        <div className="fx-grille opacity-40" aria-hidden />
        <div className="relative">
          {vu && ecrits > 0 ? <p key={vu.id} className="rise text-[22px] font-black">{vu.titre}</p> : <span className="block h-5 w-48 animate-pulse rounded bg-[#E2E8F0]" />}
          <div className="mt-6 grid grid-cols-3 gap-3">{[0, 1, 2].map((k) => <div key={k} className="h-20 rounded-xl border border-line bg-white p-3"><span className="block h-2 w-14 rounded bg-[#E2E8F0]" /><span className="mt-3 block h-5 rounded animate-pulse" style={{ width: `${45 + k * 12}%`, background: ecrits > k ? couleur : "#E2E8F0", opacity: ecrits > k ? .85 : 1 }} /></div>)}</div>
          <div className="mt-4 space-y-2.5">{[0, 1, 2, 3, 4].map((k) => <div key={k} className="flex h-12 items-center gap-3 rounded-xl border border-line bg-white px-4"><span className="h-2.5 rounded bg-[#E2E8F0]" style={{ width: `${26 + ((k * 13) % 30)}%` }} /><span className="ml-auto h-5 w-16 rounded-full transition-colors duration-700" style={{ background: ecrits > k + 1 ? `${couleur}33` : "#F1F5F9" }} /></div>)}</div>
          <p className="mt-8 text-center text-[13px] text-ink-faint">{etape < 2 ? "Bingoo! conçoit ta version…" : `Écriture des écrans · ${Math.min(ecrits, ecrans.length)}/${ecrans.length || "…"}`}</p>
        </div>
      </div>
    </div>
  );
}
