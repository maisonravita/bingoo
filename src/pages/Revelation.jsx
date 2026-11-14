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
const ETAPES = ["Lecture du SaaS modèle", "Conception de ta version", "Écriture des écrans", "Vérification de chaque écran", "Mise en ligne"];

function Chantier({ ws, nav }) {
  const c = lire(CLE_CHANTIER) ?? {};
  const [etape, setEtape] = useState(0);
  const [projet, setProjet] = useState(c.projet ?? null);
  const [app, setApp] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [mot, setMot] = useState(0);
  const [essai, setEssai] = useState(0);
  const lance = useRef(false);

  useEffect(() => { const t = setInterval(() => setMot((m) => (m + 1) % MOTS.length), 5200); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (lance.current) return; lance.current = true;
    let vivant = true;
    (async () => {
      try {
        // Étapes 1-2 : le projet (une à deux minutes)
        let p = projet;
        if (!p?.id) {
          const { data: deja } = await supabase.from("saas_projets").select("id, data, statut").eq("workspace_id", ws.id).eq("data->inspire->>domaine", c.domaine).eq("statut", "pret").order("at", { ascending: false }).limit(1);
          if (deja?.[0]) p = { id: deja[0].id, ...deja[0].data };
          else {
            const { id } = await fn("r/saas-lancer", { workspace_id: ws.id, domaine: c.domaine });
            for (let i = 0; i < 90 && vivant; i++) {
              await attendre(3500);
              if (i === 6) setEtape(1);
              const { data } = await supabase.from("saas_projets").select("data, statut, erreur").eq("id", id).maybeSingle();
              if (data?.statut === "pret") { p = { id, ...data.data }; break; }
              if (data?.statut === "erreur") throw new Error(data.erreur || "La préparation a échoué.");
            }
            if (!p) throw new Error("C'est plus long que prévu.");
          }
          if (!vivant) return;
          setProjet(p); ecrire(CLE_CHANTIER, { ...c, projet: { id: p.id, nom: p.nom, pitch: p.pitch } });
        }
        setEtape(2);
        // Étapes 3-5 : la construction
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
  const ecrits = (() => { const m = /\((\d+)\/(\d+)\)/.exec(app?.etape ?? ""); return m ? Number(m[1]) : etape >= 3 ? ecrans.length : 0; })();
  const couleur = spec?.couleur ?? "#E8571C";
  const nom = projet?.nom ?? spec?.nom ?? c.nom;
  const fini = etape >= 5;
  const pct = fini ? 100 : Math.min(96, [6, 22, 38, 82, 92][etape] + (etape === 2 && ecrans.length ? (ecrits / ecrans.length) * 40 : 0));
  const entrer = () => { ecrire(CLE_CHANTIER, null); nav(`/explorer/lancer?d=${encodeURIComponent(c.domaine)}`); };

  if (!c.domaine) return <Navigate to="/explorer/copier" replace />;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0B12] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="fx-grille opacity-[.35]" />
        <span className="fx-aurore h-[420px] w-[420px] left-[-80px] top-[-60px]" style={{ background: couleur, opacity: .45 }} />
        <span className="fx-aurore h-[380px] w-[380px] right-[-60px] bottom-[-60px] bg-[#9B6BFF]" style={{ animationDelay: "-7s", opacity: .3 }} />
      </div>
      <div className="relative z-[1] px-5 pt-5 sm:px-8"><Logo inverse /></div>
      <div className="relative z-[1] mx-auto grid max-w-6xl gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:py-12">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[.14em] text-[#F6A06B]">{fini ? "C'est en ligne" : "Bingoo! construit"}</p>
          <h1 className="mt-2 text-[36px] sm:text-[50px] font-black leading-[1.02]" style={HF}>{fini ? <>{nom} est en ligne.</> : <>Ta version de {c.nom}{projet?.nom ? <> : <span className="text-[#F6A06B]">{projet.nom}</span></> : null}</>}</h1>
          <p className="mt-3 max-w-lg text-[16px] text-white/70">{fini ? "Ton site, les comptes de tes clients et chaque écran sont prêts. Partage le lien, essaie-le, puis demande des changements en une phrase." : projet?.pitch ?? "Bingoo! lit le SaaS modèle et conçoit ta version : ton nom, tes écrans, ton design."}</p>

          <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#F6A06B] to-[#E8571C] transition-all duration-[1500ms] ease-out" style={{ width: `${pct}%` }} /></div>
          <ol className="mt-6 space-y-3">
            {ETAPES.map((t, i) => {
              const fait = i < etape || fini, encours = i === etape && !fini;
              return (
                <li key={t} className={cx("flex items-center gap-3 text-[15.5px] transition-opacity duration-500", !fait && !encours && "opacity-40")}>
                  <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-full", fait ? "bg-[#E8571C]" : "border-2 border-white/25")}>
                    {fait ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                      : encours ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
                  </span>
                  <span className={cx(encours && "font-semibold")}>{t}{i === 2 && ecrans.length > 0 && !fini ? ` (${Math.min(ecrits, ecrans.length)}/${ecrans.length})` : ""}</span>
                </li>
              );
            })}
          </ol>

          {erreur ? (
            <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-4">
              <p className="font-semibold">Petit contretemps : {erreur}</p>
              <p className="mt-1 text-[13.5px] text-white/60">Rien n'est perdu : relance, Bingoo! reprend là où il s'est arrêté.</p>
              <button onClick={() => { setErreur(null); setEssai((e) => e + 1); }} className="mt-3 rounded-xl bg-white px-5 py-2.5 text-[14px] font-bold text-ink">Relancer</button>
            </div>
          ) : fini ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={lienApp(app.slug, app.domaine_statut === "ok" ? app.domaine : null)} target="_blank" rel="noreferrer" className="fx-brille rounded-xl bg-accent px-6 py-3.5 text-[15.5px] font-bold hover:bg-accent-dark">Ouvrir mon SaaS ↗</a>
              <button onClick={entrer} className="rounded-xl bg-white px-6 py-3.5 text-[15.5px] font-bold text-ink hover:bg-white/90">Entrer dans Bingoo!</button>
            </div>
          ) : (
            <p key={mot} className="mt-10 max-w-md text-[17px] italic leading-snug text-white/80 rise">« {MOTS[mot]} »</p>
          )}
          {!fini && !erreur && <p className="mt-6 text-[12.5px] text-white/45">Compte quelques minutes. Tu peux fermer cette page : la construction continue et ton SaaS t'attendra.</p>}
        </div>

        <Maquette nom={nom} couleur={couleur} ecrans={ecrans} ecrits={fini ? ecrans.length : ecrits} fini={fini} etape={etape} />
      </div>
    </div>
  );
}

// L'application qui s'assemble : la fenêtre, puis chaque écran qui apparaît dans le menu au fil de l'écriture
function Maquette({ nom, couleur, ecrans, ecrits, fini, etape }) {
  const [sel, setSel] = useState(0);
  useEffect(() => { if (ecrits > 0) setSel(Math.max(0, ecrits - 1)); }, [ecrits]);
  useEffect(() => { if (!fini || !ecrans.length) return; const t = setInterval(() => setSel((s) => (s + 1) % ecrans.length), 1800); return () => clearInterval(t); }, [fini, ecrans.length]);
  const pret = (i) => i < ecrits;
  const barres = [62, 38, 80, 52, 70, 44, 90, 58];
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[40px] opacity-60 blur-3xl" style={{ background: `radial-gradient(closest-side, ${couleur}66, transparent)` }} aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white text-ink shadow-[0_50px_120px_-40px_rgba(0,0,0,.8)] transition-transform duration-700" style={{ transform: etape >= 1 ? "none" : "perspective(1200px) rotateX(8deg) scale(.96)" }}>
        <div className="flex items-center gap-2 border-b border-line bg-[#F6F5F2] px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-[#FF5F57]" /><span className="h-3 w-3 rounded-full bg-[#FEBC2E]" /><span className="h-3 w-3 rounded-full bg-[#28C840]" />
          <span className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-[12px] text-ink-faint">{nom ? `${String(nom).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "")}.app` : "…"}</span>
        </div>
        <div className="grid min-h-[420px] grid-cols-[150px_1fr]">
          <div className="p-3 text-white transition-colors duration-700" style={{ background: etape >= 1 ? couleur : "#CBD5E1" }}>
            <p className="mb-4 truncate px-1 text-[14px] font-black">{nom ?? <span className="inline-block h-3 w-20 rounded bg-white/40" />}</p>
            {(ecrans.length ? ecrans : Array.from({ length: 5 }, (_, i) => ({ id: i }))).slice(0, 8).map((e, i) => (
              <div key={e.id} className={cx("mb-1 truncate rounded-lg px-2 py-1.5 text-[12.5px] transition-all duration-500", pret(i) ? "opacity-100" : "opacity-30", sel === i && pret(i) ? "bg-white/25 font-semibold" : "")}>
                {e.titre && pret(i) ? e.titre : <span className="inline-block h-2.5 w-20 rounded bg-white/40 align-middle" />}
              </div>
            ))}
          </div>
          <div className="p-5">
            <p className="text-[18px] font-black">{pret(sel) && ecrans[sel]?.titre ? ecrans[sel].titre : <span className="inline-block h-4 w-40 animate-pulse rounded bg-[#E2E8F0]" />}</p>
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {[0, 1, 2].map((k) => (
                <div key={k} className="rounded-xl bg-[#F8FAFC] p-3">
                  <span className="block h-2 w-12 rounded bg-[#CBD5E1]" />
                  <span className={cx("mt-2.5 block h-4 rounded transition-all duration-700", ecrits > 0 ? "" : "animate-pulse")} style={{ width: ecrits > 0 ? `${50 + k * 12}%` : "40%", background: k === 0 && ecrits > 0 ? couleur : "#0F172A22" }} />
                </div>
              ))}
            </div>
            <div className="mt-5 flex h-[110px] items-end gap-2">
              {barres.map((h, k) => <span key={`${sel}-${k}`} className="flex-1 rounded-t-md transition-all duration-700" style={{ height: ecrits > 0 ? `${h}%` : "12%", transitionDelay: `${k * 60}ms`, background: k === barres.length - 1 ? couleur : `${couleur}40` }} />)}
            </div>
            <div className="mt-5 space-y-2">
              {[0, 1, 2].map((k) => (
                <div key={k} className="flex items-center gap-3 rounded-lg bg-[#F8FAFC] px-3 py-2.5">
                  <span className="h-2.5 rounded bg-[#CBD5E1]" style={{ width: `${30 + k * 8}%` }} />
                  <span className="ml-auto h-4 w-14 rounded-full transition-colors duration-700" style={{ background: ecrits > k ? ["#22C55E", couleur, "#F59E0B"][k] : "#E2E8F0" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {fini && <p className="relative mt-4 text-center text-[13px] text-white/55">{ecrans.length} écrans · comptes clients · paiements · e-mails</p>}
    </div>
  );
}
