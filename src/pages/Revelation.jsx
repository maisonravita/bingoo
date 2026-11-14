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

const HF = { fontFamily: "var(--font-titre)" };
const CLE_CHOIX = "bingoo-choix";
const CLE_CHANTIER = "bingoo-chantier";
const dollar = (n) => n == null ? "—" : n >= 1e4 ? `${Math.round(n / 1e3)} k$` : `${Math.round(n).toLocaleString("fr-FR")} $`;
const paye = (ws) => ws?.plan === "fondateur" || (["explorer", "explorer_pro", "business", "solo", "pro"].includes(ws?.plan) && ["active", "trialing", "past_due"].includes(ws?.plan_status));
const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };
const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const MOTS = [
  "Imagine ton premier client qui s'inscrit pendant que tu dors.",
  "Imagine le jour où ton SaaS paie ton loyer.",
  "Ceux qui réussissent ne sont pas les plus doués : ce sont ceux qui lancent.",
  "Imagine annoncer à tes proches que tu as ton propre logiciel.",
  "Chaque SaaS à succès a commencé par une première version. La tienne arrive.",
];

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
      const l = (data ?? []).slice(0, 9);
      const k = Number(localStorage.getItem(CLE_CHOIX));
      setChoix(Number.isInteger(k) && k >= 0 && k < l.length ? k : 0);
      setListe(l); setPhase("revele");
      setTimeout(() => setVisible(true), 900);
    });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const construire = (s) => {
    const c = { domaine: s.domaine, nom: s.nom, categorie: s.categorie };
    ecrire(CLE_CHANTIER, c); localStorage.removeItem(CLE_CHOIX);
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

// ---------------------------------------------------------------- Le chantier : Bingoo! construit le SaaS sous les yeux du créateur
const ETAPES = ["Lecture", "Conception", "Écrans", "Vérification", "En ligne"];
const LECTURE = (nom) => [`Lecture du site de ${nom}`, "Lecture de ses prix et de ses formules", "Repérage de ses fonctionnalités clés", "Choix d'un nom et d'un angle pour ta version"];

function Chantier({ ws, nav }) {
  const c = lire(CLE_CHANTIER) ?? {};
  const [etape, setEtape] = useState(0);
  const [projet, setProjet] = useState(c.projet ?? null);
  const [app, setApp] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [mot, setMot] = useState(0);
  const [tic, setTic] = useState(0);
  const [essai, setEssai] = useState(0);
  const lance = useRef(false);

  useEffect(() => { const t = setInterval(() => setMot((m) => (m + 1) % MOTS.length), 6000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setTic((x) => x + 1), 7000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (lance.current) return; lance.current = true;
    let vivant = true;
    (async () => {
      try {
        let p = projet;
        if (!p?.id) {
          const { data: deja } = await supabase.from("saas_projets").select("id, data, statut").eq("workspace_id", ws.id).eq("data->inspire->>domaine", c.domaine).eq("statut", "pret").order("at", { ascending: false }).limit(1);
          if (deja?.[0]) p = { id: deja[0].id, ...deja[0].data };
          else {
            const { id } = await fn("r/saas-lancer", { workspace_id: ws.id, domaine: c.domaine });
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
          const garde = { id: p.id, nom: p.nom, pitch: p.pitch, cible: p.cible, formules: (p.formules ?? []).slice(0, 3) };
          setProjet(garde); ecrire(CLE_CHANTIER, { ...c, projet: garde });
        }
        setEtape(2);
        const { data: ex } = await supabase.from("saas_apps").select("statut").eq("projet_id", p.id).maybeSingle();
        if (!ex || ex.statut === "erreur") await fn("r/saas-construire", { workspace_id: ws.id, projet_id: p.id });
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
  }, [essai]); // eslint-disable-line react-hooks/exhaustive-deps

  const spec = app?.spec?.ecrans?.length ? app.spec : app?.brouillon;
  const ecrans = (spec?.ecrans ?? []).filter((e) => !e.public);
  const publics = (spec?.ecrans ?? []).filter((e) => e.public);
  const ecrits = (() => { const m = /\((\d+)\/(\d+)\)/.exec(app?.etape ?? ""); return m ? Number(m[1]) : etape >= 3 ? ecrans.length : 0; })();
  const couleur = spec?.couleur ?? "#E8571C";
  const nom = projet?.nom ?? spec?.nom ?? null;
  const fini = etape >= 5;
  const pct = fini ? 100 : Math.min(96, [8, 24, 40, 86, 94][etape] + (etape === 2 && ecrans.length ? (ecrits / ecrans.length) * 44 : 0));

  // Le journal : ce que Bingoo! fait vraiment, ligne après ligne
  const journal = [];
  const lect = LECTURE(c.nom);
  lect.slice(0, etape >= 1 ? lect.length : Math.min(lect.length, 1 + tic)).forEach((t, i) => journal.push({ k: `l${i}`, t, ok: etape >= 1 || i < Math.min(lect.length, tic) }));
  if (projet?.nom) {
    journal.push({ k: "nom", t: <>Ta version s'appelle <b>{projet.nom}</b></>, ok: true });
    if (projet.cible) journal.push({ k: "cible", t: <>Pour : {String(projet.cible).slice(0, 90)}</>, ok: true });
  }
  if (spec?.couleur) journal.push({ k: "couleur", t: <span className="inline-flex items-center gap-2">Couleur de marque <span className="inline-block h-3.5 w-3.5 rounded" style={{ background: couleur }} /></span>, ok: true });
  ecrans.slice(0, Math.max(ecrits, 0)).forEach((e) => journal.push({ k: `e${e.id}`, t: <>Écran « {e.titre} » écrit</>, ok: true }));
  if (etape === 2 && ecrans.length && ecrits < ecrans.length) journal.push({ k: `w${ecrits}`, t: <>Écriture de l'écran « {ecrans[ecrits]?.titre} »</>, ok: false });
  if (etape >= 3) journal.push({ k: "verif", t: "Chaque écran ouvert avec des données d'exemple", ok: fini });
  if (fini) {
    if (publics.length) journal.push({ k: "pub", t: `${publics.length} page${publics.length > 1 ? "s" : ""} publique${publics.length > 1 ? "s" : ""} pour tes clients`, ok: true });
    journal.push({ k: "fin", t: "Comptes clients, paiements et e-mails branchés", ok: true });
  }
  const fil = useRef(null);
  useEffect(() => { fil.current?.scrollTo({ top: fil.current.scrollHeight, behavior: "smooth" }); }, [journal.length]);

  if (!c.domaine) return <Navigate to="/explorer/copier" replace />;
  if (fini && app) return <EnLigne app={app} nom={nom} couleur={couleur} ecrans={ecrans} projet={projet} c={c} nav={nav} />;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAF9F6]">
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{ WebkitMaskImage: "radial-gradient(ellipse at 50% 20%, #000 25%, transparent 70%)", maskImage: "radial-gradient(ellipse at 50% 20%, #000 25%, transparent 70%)" }}>
        <div className="fx-grille" />
        <span className="fx-aurore h-[380px] w-[380px] left-[18%] top-0 transition-colors duration-1000" style={{ background: couleur, opacity: .28 }} />
        <span className="fx-aurore h-[340px] w-[340px] right-[16%] top-24 bg-[#9B6BFF]" style={{ animationDelay: "-7s", opacity: .22 }} />
      </div>
      <div className="relative z-[1] flex items-center justify-between px-5 pt-5 sm:px-8">
        <Logo />
        <p className="hidden sm:block text-[13px] text-ink-faint">Tu peux fermer cette page, la construction continue.</p>
      </div>

      <div className="relative z-[1] mx-auto max-w-2xl px-5 pb-16 pt-10 sm:pt-14 text-center">
        <div className="relative mx-auto grid h-24 w-24 place-items-center">
          <span className="absolute inset-0 rounded-[30px] opacity-50 blur-2xl transition-colors duration-1000" style={{ background: couleur }} />
          <svg viewBox="0 0 100 100" className="absolute -left-[26px] -top-[26px] h-[148px] w-[148px] animate-spin [animation-duration:2.4s]" aria-hidden><circle cx="50" cy="50" r="47" fill="none" stroke="#ECEAE4" strokeWidth="1.6" /><circle cx="50" cy="50" r="47" fill="none" stroke={couleur} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="60 236" /></svg>
          <span className="relative grid h-24 w-24 place-items-center rounded-[28px] text-[40px] font-black text-white shadow-[0_20px_40px_-18px_rgba(0,0,0,.5)] transition-colors duration-1000" style={{ background: `linear-gradient(140deg, ${couleur}, ${couleur}cc)`, ...HF }}>
            {(nom ?? c.nom ?? "?").trim().charAt(0).toUpperCase()}
          </span>
        </div>
        <p className="mt-12 text-[13px] font-bold uppercase tracking-[.16em] text-accent-dark">Bingoo! construit</p>
        <h1 className="mt-2 text-[38px] sm:text-[54px] font-black leading-[1.02]" style={HF}>{nom ? <span key={nom} className="rise inline-block">{nom}</span> : <>Ta version de {c.nom}</>}</h1>
        <p className="mx-auto mt-3 max-w-xl text-[16.5px] leading-relaxed text-ink-soft">{projet?.pitch ?? `Bingoo! lit ${c.nom} et conçoit ta version : ton nom, tes écrans, ton design.`}</p>

        <div className="mt-9">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#ECEAE4]"><div className="h-full rounded-full transition-all duration-[1500ms] ease-out" style={{ width: `${pct}%`, background: `linear-gradient(90deg, #F6A06B, ${couleur === "#E8571C" ? "#E8571C" : couleur})` }} /></div>
          <div className="mt-3 grid grid-cols-5 text-[12.5px]">
            {ETAPES.map((t, i) => <span key={t} className={cx("transition-colors", i < etape ? "text-ink" : i === etape ? "font-bold text-ink" : "text-ink-faint")}>{i < etape ? "✓ " : ""}{t}</span>)}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white text-left shadow-[0_30px_70px_-45px_rgba(21,23,42,.45)]">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-[#EF4444] pulse-dot" />
            <span className="text-[13px] font-semibold">En direct</span>
            <span className="ml-auto text-[12.5px] tnum text-ink-faint">{Math.round(pct)} %</span>
          </div>
          <ul ref={fil} className="max-h-[260px] space-y-0.5 overflow-y-auto px-2 py-2">
            {journal.map((l) => (
              <li key={l.k} className="rise flex items-center gap-3 rounded-lg px-2.5 py-2 text-[14.5px]">
                {l.ok ? <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-good/15 text-good"><svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>
                  : <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-line border-t-[#E8571C]" />}
                <span className={cx("min-w-0 truncate", l.ok ? "text-ink" : "text-ink-soft")}>{l.t}</span>
              </li>
            ))}
          </ul>
        </div>

        {erreur ? (
          <div className="mt-6 rounded-2xl border border-line bg-white p-5">
            <p className="font-semibold">Petit contretemps : {erreur}</p>
            <p className="mt-1 text-[13.5px] text-ink-soft">Rien n'est perdu : relance, Bingoo! reprend là où il s'est arrêté.</p>
            <button onClick={() => { setErreur(null); setEssai((e) => e + 1); }} className="mt-3 rounded-xl bg-ink px-5 py-2.5 text-[14px] font-bold text-white">Relancer</button>
          </div>
        ) : (
          <p key={mot} className="rise mx-auto mt-8 max-w-md text-[16px] leading-snug text-ink-soft">{MOTS[mot]}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- En ligne : le vrai SaaS, ouvert dans une fenêtre, et la suite
function EnLigne({ app, nom, couleur, ecrans, projet, c, nav }) {
  const lien = lienApp(app.slug, app.domaine_statut === "ok" ? app.domaine : null);
  const [copie, setCopie] = useState(false);
  const entrer = (vers) => { ecrire(CLE_CHANTIER, null); nav(vers ?? `/explorer/lancer?d=${encodeURIComponent(c.domaine)}`); };
  const affiche = lien.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const confettis = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAF9F6]">
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{ WebkitMaskImage: "radial-gradient(ellipse at 50% 10%, #000 25%, transparent 70%)", maskImage: "radial-gradient(ellipse at 50% 10%, #000 25%, transparent 70%)" }}>
        <div className="fx-grille" />
        <span className="fx-aurore h-[420px] w-[420px] left-[14%] -top-20" style={{ background: couleur, opacity: .3 }} />
        <span className="fx-aurore h-[360px] w-[360px] right-[14%] top-10 bg-[#F6A06B]" style={{ animationDelay: "-5s", opacity: .3 }} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0" aria-hidden>
        {confettis.map((i) => <span key={i} className="confetti" style={{ left: `${(i * 97) % 100}%`, background: [couleur, "#F6A06B", "#9B6BFF", "#22C55E", "#FACC15"][i % 5], animationDelay: `${(i % 9) * 0.12}s`, animationDuration: `${2.4 + (i % 5) * 0.35}s`, transform: `rotate(${i * 37}deg)` }} />)}
      </div>
      <div className="relative z-[1] px-5 pt-5 sm:px-8"><Logo /></div>

      <div className="relative z-[1] mx-auto max-w-5xl px-5 pb-20 pt-8 sm:pt-10">
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] text-[28px] font-black text-white shadow-[0_18px_36px_-16px_rgba(0,0,0,.5)] pop" style={{ background: `linear-gradient(140deg, ${couleur}, ${couleur}cc)`, ...HF }}>{(nom ?? "?").charAt(0).toUpperCase()}</span>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-good/10 px-3 py-1 text-[13px] font-bold text-good"><span className="h-2 w-2 rounded-full bg-good pulse-dot" />En ligne</p>
          <h1 className="mt-3 text-[40px] sm:text-[60px] font-black leading-[1] hero-in" style={HF}>{nom} est en ligne.</h1>
          <p className="mx-auto mt-3 max-w-xl text-[16.5px] text-ink-soft">{projet?.pitch ?? "Ton site, les comptes de tes clients et chaque écran sont prêts."}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href={lien} target="_blank" rel="noreferrer" className="fx-brille rounded-2xl bg-accent px-7 py-4 text-[16px] font-bold text-white hover:bg-accent-dark">Ouvrir {nom} ↗</a>
            <button onClick={() => entrer()} className="rounded-2xl bg-ink px-7 py-4 text-[16px] font-bold text-white hover:bg-ink/85">Entrer dans Bingoo!</button>
          </div>
          <button onClick={() => navigator.clipboard?.writeText(lien).then(() => { setCopie(true); setTimeout(() => setCopie(false), 1800); })}
            className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-[13.5px] text-ink-soft hover:border-ink-faint">
            <span className="truncate">{affiche}</span><b className="text-ink">{copie ? "Copié" : "Copier"}</b>
          </button>
        </div>

        <div className="relative mt-12">
          <div className="absolute -inset-x-10 -inset-y-6 rounded-[48px] opacity-40 blur-3xl" style={{ background: `radial-gradient(closest-side, ${couleur}, transparent)` }} aria-hidden />
          <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-[0_60px_120px_-50px_rgba(21,23,42,.55)]">
            <div className="flex items-center gap-2 border-b border-line bg-[#F6F5F2] px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-[#FF5F57]" /><span className="h-3 w-3 rounded-full bg-[#FEBC2E]" /><span className="h-3 w-3 rounded-full bg-[#28C840]" />
              <span className="mx-auto max-w-[60%] truncate rounded-md bg-white px-4 py-1 text-[12.5px] text-ink-soft">{affiche}</span>
            </div>
            <div className="relative aspect-[16/10] w-full">
              <iframe title={`Aperçu de ${nom}`} src={lien} className="absolute left-0 top-0 h-[200%] w-[200%] origin-top-left scale-50 border-0" />
            </div>
          </div>
          <p className="mt-3 text-center text-[13px] text-ink-faint">{ecrans.length} écrans · comptes clients · paiements · e-mails. Clique dedans : c'est ton vrai SaaS.</p>
        </div>

        <div className="mt-14">
          <p className="text-center text-[13px] font-bold uppercase tracking-[.14em] text-ink-faint">La suite, dans Bingoo!</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[["Encaisse tes premiers clients", "Branche ton compte Stripe : l'argent arrive directement chez toi.", "encaisser"], ["Mets ton nom de domaine", "monsaas.fr au lieu d'une adresse Bingoo!, en quelques clics.", "domaine"], ["Crée ta vidéo pub", "20 secondes animées à tes couleurs, prêtes pour TikTok et Reels.", "video"]].map(([t, d]) => (
              <button key={t} onClick={() => entrer()} className="fx-spot rounded-2xl border border-line bg-white p-5 text-left transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(21,23,42,.45)]">
                <p className="font-bold text-[15.5px]">{t}</p>
                <p className="mt-1.5 text-[13.5px] leading-snug text-ink-soft">{d}</p>
                <p className="mt-3 text-[13.5px] font-semibold text-accent-dark">Y aller →</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
