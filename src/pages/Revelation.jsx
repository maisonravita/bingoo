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
import AppCadre, { lienApp } from "../components/AppCadre";
import { indexChoisi } from "../lib/choix";

const HF = { fontFamily: "var(--font-titre)" };
const CLE_CHOIX = "bingoo-choix";
const CLE_CHANTIER = "bingoo-chantier";
const dollar = (n) => n == null ? "—" : n >= 1e4 ? `${Math.round(n / 1e3)} k$` : `${Math.round(n).toLocaleString("fr-FR")} $`;
const paye = (ws) => ws?.plan === "fondateur" || (["explorer", "explorer_pro", "lancer_pro", "business", "solo", "pro"].includes(ws?.plan) && ["active", "trialing", "past_due"].includes(ws?.plan_status));
const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };
const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
// Le chantier en cours appartient à un espace : celui d'un autre compte (même navigateur) est ignoré
const chantierDe = (ws) => { const c = lire(CLE_CHANTIER); return c && (!c.ws || c.ws === ws?.id) && !(c.projet && !c.ws) ? c : null; };


export default function Revelation({ paramsDe }) {
  const { ws, reload } = useWs();
  const nav = useNavigate();
  const chantier0 = chantierDe(ws);
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
    const c = { domaine: s.domaine, nom: s.nom, categorie: s.categorie, ws: ws.id };
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
const LECTURE = (nom) => [`Analyse des pages publiques de ${nom}`, "Lecture des sources et préparation de la fiche produit"];
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
// Un vrai problème trouvé par le robot (journal de vérification) : pastille orange, pas une coche verte
const Alerte = () => <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#FDECD8] text-[11px] font-black text-[#C2410C]">!</span>;
const Coche = ({ ok }) => ok
  ? <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-good/15 text-good"><svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>
  : <span className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-line border-t-[#E8571C]" />;

export function Chantier({ ws, nav, init, atelier = false }) {
  const c = init ?? chantierDe(ws) ?? {};
  // Atelier : le SaaS existe déjà, on l'ouvre directement (jamais de nouvelle construction)
  const pretDeja = atelier && c.app?.statut === "pret" && c.app?.spec?.ecrans?.length > 0;
  const [etape, setEtape] = useState(pretDeja ? 5 : 0);
  const [projet, setProjet] = useState(c.projet ?? null);
  const [app, setApp] = useState(pretDeja ? c.app : null);
  const [erreur, setErreur] = useState(null);
  const [essai, setEssai] = useState(0);
  const [echanges, setEchanges] = useState([]); // modifications demandées après la mise en ligne
  const [demande, setDemande] = useState("");
  const [ecran, setEcran] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [vue, setVue] = useState("ordi");
  const [cle, setCle] = useState(0);
  // Outils de l'atelier : modifier un texte en cliquant dessus, pointer un élément, joindre des images, revenir en arrière
  const [outil, setOutil] = useState(null); // null | "texte" | "pointer"
  const [element, setElement] = useState(null); // { description, ecran }
  const [jointes, setJointes] = useState([]); // [{ url, nom }]
  const [envoiImage, setEnvoiImage] = useState(false);
  const [versions, setVersions] = useState(null);
  const cadreRef = useRef(null), fichierRef = useRef(null), saisieRef = useRef(null);
  // Ce que le membre a consommé : modifications du mois, crédits, part de son IA du mois
  const [conso, setConso] = useState(null);
  const majConso = () => { if (!ws?.id) return; Promise.all([fn("r/limites", { workspace_id: ws.id }), fn("r/credits", { workspace_id: ws.id })]).then(([l, c]) => setConso({ mod: l?.mois?.modifier, ia: l?.ia?.pct ?? 0, repart: l?.repart, credits: c?.solde ?? 0 })).catch(() => {}); };
  useEffect(() => { majConso(); }, [ws?.id, echanges.length, occupe]); // eslint-disable-line react-hooks/exhaustive-deps
  const lance = useRef(false);
  const parCredits = useRef(false); // l'utilisateur a accepté de payer ce SaaS supplémentaire en crédits
  // 3 questions avant de construire (facultatives) : le SaaS devient le sien, pas un SaaS généré
  // Idée libre : le nom et la cible viennent déjà de l'aperçu validé, pas de questions en plus
  const [questions, setQuestions] = useState(() => !(atelier || pretDeja || c.projet?.id || c.idee));
  // Réponses gardées dans le navigateur : elles survivent à un rechargement ou à un retour de paiement
  const cleRep = "bingoo-reponses-" + (c.domaine ?? "");
  // L'idée écrite sur la page d'accueil devient « ce que je veux faire mieux » (modifiable)
  const [rep, setRepEtat] = useState(() => ({ nom: "", clients: "", mieux: (lire("bingoo-idee")?.texte ?? "").slice(0, 300), ...(lire(cleRep) ?? {}) }));
  const setRep = (x) => { setRepEtat(x); ecrire(cleRep, x); };
  const angle = useRef((() => { const r0 = lire("bingoo-reponses-" + (c.domaine ?? "")); return r0?.angle ?? null; })());
  const fil = useRef(null);

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
          // Un projet déjà prêt n'est repris que s'il porte le nom choisi (sinon on prépare celui que le membre vient de nommer)
          const voulu = (rep.nom ?? "").trim();
          if (!c.idee && deja?.[0] && (!voulu || deja[0].data?.nom === voulu)) p = { id: deja[0].id, ...deja[0].data };
          else {
            // Idée libre (page d'accueil) : le projet part de l'idée et de l'aperçu validé, sans SaaS d'origine
            const { id } = c.idee
              ? await fn("r/saas-lancer-idee", { workspace_id: ws.id, texte: c.ideeTexte, type: c.type ?? "saas", reponses: c.reponses ?? [], apercu: c.apercu, nom: (rep.nom ?? "").trim() || c.apercu?.nom || null })
              : await fn("r/saas-lancer", { workspace_id: ws.id, domaine: c.domaine, angle: angle.current, nom: (rep.nom ?? "").trim() || null, modele: c.modele ?? null, couleur: c.couleur ?? null, allure: c.allure ?? null });
            setEtape(0);
            const finPreparation = Date.now() + 38 * 60_000;
            let intervalle = 3500;
            while (Date.now() < finPreparation && vivant) {
              await attendre(intervalle);
              if (!vivant) return;
              const { data } = await supabase.from("saas_projets").select("data, statut, erreur").eq("id", id).maybeSingle();
              if (data?.statut === "pret") { p = { id, ...data.data }; break; }
              if (data?.statut === "en_cours") setEtape(1);
              intervalle = data?.statut === "attente_analyse" ? 12_000 : 3500;
              if (data?.statut === "erreur") throw new Error(data.erreur || "La préparation a échoué.");
            }
            if (!p) throw new Error("La préparation prend plus de temps que prévu. Tu peux revenir la consulter.");
          }
          if (!vivant) return;
          const garde = { id: p.id, nom: p.nom, pitch: p.pitch, cible: p.cible, pense: penseDe(p) };
          setProjet(garde); if (!atelier) ecrire(CLE_CHANTIER, { ...c, ws: ws.id, projet: garde });
        }
        setEtape(2);
        const { data: ex } = await supabase.from("saas_apps").select("statut").eq("projet_id", p.id).maybeSingle();
        if (!atelier && (!ex || ex.statut === "erreur")) await fn("r/saas-construire", { workspace_id: ws.id, projet_id: p.id, ...(parCredits.current ? { credits: true } : {}) });
        // La construction finie, Bingoo! teste et corrige avant de dire « prêt » (boucle de vérification, 20 minutes au plus ici ;
        // au-delà, elle continue côté serveur et le SaaS reste en ligne)
        let debutVerif = null;
        for (let i = 0; i < 640 && vivant; i++) {
          await attendre(3000);
          const { data } = await supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut, version, verif").eq("projet_id", p.id).maybeSingle();
          if (!data) continue;
          setApp(data);
          if (/Vérif/i.test(data.etape ?? "")) setEtape(3);
          if (data.statut === "pret" && data.spec?.ecrans?.length) {
            if (data.verif?.phase === "en_cours") { debutVerif ??= Date.now(); if (Date.now() - debutVerif < 20 * 60e3) { setEtape(3); continue; } }
            setEtape(5); return;
          }
          if (data.statut === "erreur") throw new Error(data.erreur || "La construction a échoué.");
        }
        if (vivant) throw new Error("C'est plus long que prévu.");
      } catch (e) {
        // Projet d'un autre espace (ancien chantier resté dans le navigateur) : on le prépare de nouveau pour ce compte
        if (vivant && !atelier && /Projet introuvable/i.test(e.message ?? "") && projet?.id) { ecrire(CLE_CHANTIER, { ...c, ws: ws.id, projet: null }); setProjet(null); lance.current = false; setEssai((x) => x + 1); return; }
        if (vivant) setErreur(e.message);
      }
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
  // L'aperçu passe toujours par Bingoo! (même avec un nom de domaine) : les outils de l'atelier ne parlent qu'à Bingoo!
  const lienApercu = app?.slug ? lienApp(app.slug, null) : "";
  const pct = fini ? 100 : Math.min(96, [8, 24, 40, 86, 94][etape] + (etape === 2 && ecrans.length ? (ecrits / ecrans.length) * 44 : 0));
  useEffect(() => { fil.current?.scrollTo({ top: fil.current.scrollHeight, behavior: "smooth" }); });

  // L'aperçu reçoit l'outil choisi (à chaque changement et à chaque rechargement)
  const pousserOutil = (m = outil) => { try { cadreRef.current?.contentWindow?.postMessage({ type: "bingoo-atelier-mode", mode: m }, "*"); } catch (_) { /* aperçu pas prêt */ } };
  useEffect(() => { pousserOutil(); }, [outil, cle]); // eslint-disable-line react-hooks/exhaustive-deps
  const recharger = async () => { const { data } = await supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut, version, verif").eq("id", app.id).maybeSingle(); if (data) setApp(data); setCle((k) => k + 1); };
  // Messages de l'aperçu : un texte modifié sur place, ou un élément pointé
  useEffect(() => {
    const ecoute = async (e) => {
      if (e.source !== cadreRef.current?.contentWindow) return;
      const d = e.data ?? {};
      if (d.type === "bingoo-atelier-pret") { pousserOutil(); return; }
      if (d.type === "bingoo-atelier-element") { setElement({ description: String(d.description ?? "").slice(0, 300), ecran: String(d.ecran ?? "") }); setOutil(null); setTimeout(() => saisieRef.current?.focus(), 50); return; }
      if (d.type === "bingoo-atelier-texte" && app) {
        const avant = String(d.avant ?? ""), apres = String(d.apres ?? "");
        const n = echanges.length, versionAvant = app.version;
        setEchanges((l) => [...l, { moi: `Texte : « ${avant.slice(0, 60)} » → « ${apres.slice(0, 60)} »`, etat: "encours" }]);
        try {
          const r = await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "texte", avant, apres, ecran: d.ecran });
          if (r?.ok && r.n) { setEchanges((l) => l.map((x, k) => (k === n ? { ...x, etat: "ok", faits: ["texte modifié (gratuit)"], versionAvant } : x))); await recharger(); }
          else { setEchanges((l) => l.filter((_, k) => k !== n)); envoyer(`Remplace le texte « ${avant} » par « ${apres} »`, String(d.ecran ?? "").startsWith("_") ? "" : d.ecran); }
        } catch (x) { setEchanges((l) => l.map((y, k) => (k === n ? { ...y, etat: "ko", erreur: x.message } : y))); }
      }
    };
    addEventListener("message", ecoute);
    return () => removeEventListener("message", ecoute);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Revenir à la version d'avant une modification (ou à une version de l'historique)
  const restaurer = async (version) => {
    if (!app || occupe) return;
    setOccupe(true);
    try { await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "restaurer", version }); setVersions(null); setEchanges((l) => [...l, { moi: `Revenir à la version ${version}`, etat: "ok", faits: [`version ${version} remise en ligne`] }]); await recharger(); }
    catch (x) { setEchanges((l) => [...l, { moi: `Revenir à la version ${version}`, etat: "ko", erreur: x.message }]); }
    finally { setOccupe(false); }
  };
  const ouvrirHistorique = async () => { if (versions) { setVersions(null); return; } try { setVersions(await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "versions" })); } catch (_) { setVersions([]); } };

  // Image jointe : réduite dans le navigateur (1600 px au plus), puis déposée chez Bingoo!
  const joindre = async (fichiers) => {
    for (const f of [...(fichiers ?? [])].slice(0, 4 - jointes.length)) {
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { alert("Image PNG, JPG ou WebP seulement."); continue; }
      setEnvoiImage(true);
      try {
        const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(f); });
        const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL(f.type === "image/png" ? "image/png" : "image/jpeg", 0.88);
        const r = await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "image", image: data });
        setJointes((l) => [...l, { url: r.url, nom: f.name }]);
      } catch (x) { alert(x.message ?? "Image non envoyée"); } finally { setEnvoiImage(false); }
    }
  };

  // Une modification demandée dans la conversation : écrite, puis mise en ligne, puis l'aperçu se recharge
  const envoyer = async (texte, ecranForce) => {
    const t = (texte ?? demande).trim();
    if (t.length < 3 || occupe || !app) return;
    const n = echanges.length;
    const imgs = jointes, el = element, versionAvant = app.version;
    setEchanges((l) => [...l, { moi: t, images: imgs, element: el?.description, etat: "encours" }]); setDemande(""); setJointes([]); setElement(null); setOccupe(true);
    const maj = (o) => setEchanges((l) => l.map((x, k) => (k === n ? { ...x, ...o } : x)));
    try {
      const cibleEcran = ecranForce ?? (el?.ecran && el.ecran !== "_site" && !el.ecran.startsWith("_") ? el.ecran : ecran) ?? "";
      const r = await fn("r/saas-app-modifier", { workspace_id: ws.id, app_id: app.id, ecran: cibleEcran || "nouveau", demande: t, images: imgs.map((x) => x.url), element: el?.description ?? null });
      for (let i = 0; i < 80; i++) {
        await attendre(3000);
        const { data } = await supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut, version, verif").eq("id", app.id).maybeSingle();
        if (data && data.statut !== "en_cours") {
          if (data.erreur) throw new Error(data.erreur);
          const fait = data.brouillon?._modif ?? null;
          if (data.brouillon?._modif) await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "brouillon-valider" });
          const { data: frais } = await supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut, version, verif").eq("id", app.id).maybeSingle();
          setApp(frais ?? data); setCle((k) => k + 1);
          maj({ etat: "ok", credit: r?.credit, faits: fait?.faits ?? [], rates: fait?.rates ?? [], versionAvant });
          return;
        }
      }
      throw new Error("C'est plus long que prévu : l'aperçu se mettra à jour tout seul.");
    } catch (e) { maj({ etat: "ko", erreur: e.message }); } finally { setOccupe(false); }
  };

  // Le robot de Bingoo! : il ouvre chaque écran en coulisses, clique comme un utilisateur, et envoie le résultat.
  // Une seule fois par version et par passage ; il repasse dès qu'une correction arrive.
  const robotFait = useRef(new Set());
  const cleRobot = app?.statut === "pret" && app?.verif?.phase === "en_cours" && !(app.verif.en_reparation ?? []).length ? `${app.version}-${app.verif.passages ?? 0}` : null;
  const robotActif = cleRobot && !robotFait.current.has(cleRobot) ? cleRobot : null;
  useEffect(() => {
    if (!robotActif || !app) return;
    const ecoute = async (e) => {
      if (e.data?.type !== "bingoo-verif" || e.data.slug !== app.slug || robotFait.current.has(robotActif)) return;
      robotFait.current.add(robotActif);
      try { await fn("r/saas-app-verif", { workspace_id: ws.id, app_id: app.id, version: app.version, resultats: e.data.resultats }); } catch { /* le robot du serveur repasse dans les 10 minutes */ }
    };
    window.addEventListener("message", ecoute);
    return () => window.removeEventListener("message", ecoute);
  }, [robotActif]); // eslint-disable-line react-hooks/exhaustive-deps
  // Dans l'atelier, le SaaS existe déjà : pas besoin du SaaS d'origine (un SaaS lancé depuis une idée n'en a pas)
  if (!c.domaine && !(atelier && c.app)) return <Navigate to="/explorer/copier" replace />;
  // Lignes de préparation : jamais « analyse des pages de… » pour une idée (il n'y a pas de SaaS d'origine)
  const lect = c.idee ? ["Lecture de ton idée et de ton aperçu", "Préparation du plan : écrans, données, formules"] : LECTURE(c.nom);
  const lignes = [
    ...lect.slice(0, etape >= 1 ? lect.length : 1).map((t, i) => ({ k: `l${i}`, t, ok: etape > i })),
    ...(etape >= 2 ? ecrans.map((e, i) => ({ k: `e${e.id}`, t: i < ecrits ? <>Écran « {e.titre} » écrit</> : <>J'écris l'écran « {e.titre} »</>, ok: i < ecrits })).filter((x, i) => i <= ecrits) : []),
    // Vérification : uniquement les vrais événements du robot et des corrections (jamais une animation scénarisée)
    ...(etape >= 3 && app?.verif?.phase ? (app.verif.journal ?? []).map((j, i, L) => ({ k: `j${i}`, t: j.t, ok: j.type === "ok" || j.type === "correction" && i < L.length - 1 || app.verif.phase === "fini" && j.type !== "probleme" && j.type !== "reste", alerte: j.type === "probleme" || j.type === "reste", long: true })) : []),
    ...(etape >= 3 && app?.verif?.phase === "en_cours" && (app.verif.journal ?? []).at(-1)?.type !== "info" ? [{ k: "attente", t: (app.verif.en_reparation ?? []).length ? "Correction en cours…" : "Je teste tous les écrans…", ok: false, long: true }] : []),
  ];
  const verifTxt = app?.verif?.phase === "fini" ? ((app.verif.reste ?? []).length ? `Terminé : ${ecrans.length} écrans écrits et testés, ${(app.verif.reste ?? []).length} encore à corriger` : `Terminé : ${ecrans.length} écrans écrits et testés, tout fonctionne`) : app?.verif?.phase === "en_cours" ? `En ligne : ${ecrans.length} écrans écrits, les tests continuent en arrière-plan` : `Terminé : ${ecrans.length} écrans écrits`;

  return (
    <div className="flex h-screen flex-col bg-[#FAF9F6]">
      {/* Barre du haut */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-4">
        <span className="flex items-center"><Logo height={26} /></span>
        <span className="mx-1 h-5 w-px bg-line" />
        <span className="grid h-7 w-7 place-items-center rounded-lg text-[13px] font-black text-white transition-colors duration-700" style={{ background: couleur }}>{(nom ?? c.nom ?? "?").charAt(0).toUpperCase()}</span>
        <p className="min-w-0 truncate font-semibold">{nom ?? `Ta version de ${c.nom}`}</p>
        <span className={cx("hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold", fini ? "bg-good/10 text-good" : "bg-accent-soft text-accent-dark")}>
          <span className={cx("h-1.5 w-1.5 rounded-full pulse-dot", fini ? "bg-good" : "bg-[#E8571C]")} />{fini ? (occupe ? "Modification…" : app?.verif?.phase === "en_cours" ? "En ligne · tests en cours" : "En ligne") : etape === 3 && app?.verif?.phase === "en_cours" ? ((app.verif.en_reparation ?? []).length ? "Bingoo! corrige" : "Bingoo! teste") : `Construction · ${Math.round(pct)} %`}
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
                  <button onClick={() => { const t = [rep.nom.trim() && `Nom souhaité, à utiliser tel quel : ${rep.nom.trim()}`, rep.clients.trim() && `Clients visés : ${rep.clients.trim()}`, rep.mieux.trim() && `Ce que je veux faire mieux : ${rep.mieux.trim()}`].filter(Boolean).join(". "); angle.current = t || null; setRep({ ...rep, angle: t || null }); setQuestions(false); }} className="rounded-lg bg-[#E8571C] px-4 py-2 text-[13px] font-semibold text-white">Construire ma version</button>
                  <button onClick={() => { angle.current = null; setQuestions(false); }} className="rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-soft hover:text-ink">Passer</button>
                </div>
              </Bingoo>
            ) : <>
            <Moi>{c.idee ? <>Construis mon idée : {c.ideeTexte}</> : <>Construis ma version de {c.nom}</>}</Moi>
            <Bingoo>
              <p>{c.idee ? <>C'est parti : je construis {c.apercu?.nom ?? "ton idée"}, avec les {c.apercu?.ecrans?.length ?? ""} écrans de ton aperçu, puis je les teste un par un.</> : <>C'est parti. {c.nom} gagne déjà de l'argent : je construis ta version, avec ton nom, tes mots et ton design.</>}</p>
              <div className="mt-3 rounded-xl border border-line bg-[#FCFBF9] p-3">
                <div className="mb-2 flex items-center justify-between text-[12.5px] text-ink-soft"><span className="font-semibold text-ink">Construction</span><span className="tnum">{Math.round(pct)} %</span></div>
                <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#ECEAE4]"><div className="h-full rounded-full bg-[#E8571C] transition-all duration-[1500ms]" style={{ width: `${pct}%` }} /></div>
                {fini ? (
                  <details className="text-[13.5px]"><summary className="flex cursor-pointer list-none items-center gap-2.5"><Coche ok /><span>{verifTxt}</span><span className="ml-auto text-[12px] text-ink-faint">Détails</span></summary>
                    <ul className="mt-2 space-y-1.5">{lignes.map((l) => <li key={l.k} className={cx("flex gap-2.5", l.long ? "items-start" : "items-center")}>{l.alerte ? <Alerte /> : <Coche ok />}<span className={cx("min-w-0", !l.long && "truncate")}>{l.t}</span></li>)}</ul></details>
                ) : <ul className="space-y-1.5">{lignes.map((l) => <li key={l.k} className={cx("rise flex gap-2.5 text-[13.5px]", l.long ? "items-start" : "items-center")}>{l.alerte ? <Alerte /> : <Coche ok={l.ok} />}<span className={cx("min-w-0", !l.long && "truncate", !l.ok && !l.alerte && "text-ink-soft")}>{l.t}</span></li>)}</ul>}
                {fini && (app?.verif?.reste ?? []).length > 0 && !occupe && (
                  <div className="mt-3 flex flex-wrap gap-2">{app.verif.reste.map((id) => { const e = (app.spec?.ecrans ?? []).find((x) => x.id === id); const err = (app.verif.resultats ?? []).find((r) => r.id === id)?.erreur ?? ""; if (!e) return null;
                    // Écran fait main : l'IA ne le réécrit pas, l'équipe est prévenue (alerte admin) : pas de bouton qui ne ferait rien
                    if (e.modele) return <span key={id} className="rounded-lg bg-paper px-3 py-1.5 text-[12.5px] text-ink-soft">« {e.titre} » : signalé à l'équipe Bingoo!, corrigé sous 24 h</span>;
                    if ((app.verif.offerts?.[id] ?? 0) >= 2) return <span key={id} className="rounded-lg bg-paper px-3 py-1.5 text-[12.5px] text-ink-soft">« {e.titre} » : décris le souci dans l'atelier</span>;
                    return <button key={id} onClick={() => envoyer(`Corrige l'écran « ${e.titre} » : ${String(err).slice(0, 300) || "il ne fonctionne pas correctement"}`, id)} className="rounded-lg border border-[#F5C9A8] bg-[#FFF7F0] px-3 py-1.5 text-[12.5px] font-semibold text-[#C2410C] hover:bg-[#FDECD8]">Corriger « {e.titre} » · offert</button>;
                  })}</div>
                )}
                {robotActif && app && <AppCadre key={robotActif} slug={app.slug} spec={app.spec} version={app.version} verif className="pointer-events-none absolute -left-[9999px] top-0 h-[800px] w-[1200px]" />}
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
                <Moi>{x.element && <span className="mb-1 block text-[12px] text-ink-soft">◎ {x.element}</span>}{x.moi}{x.images?.length > 0 && <span className="mt-1.5 flex gap-1.5">{x.images.map((m) => <img key={m.url} src={m.url} alt="" className="h-12 w-12 rounded-lg object-cover" />)}</span>}</Moi>
                <Bingoo>
                  {x.etat === "encours" ? <p className="flex items-center gap-2.5 text-ink-soft"><Coche ok={false} />Je modifie ton SaaS… (une à deux minutes)</p>
                    : x.etat === "ok" ? <div><p className="flex items-center gap-2.5"><Coche ok />C'est en ligne, regarde l'aperçu.{x.credit ? " (1 crédit utilisé)" : ""}</p>{x.faits?.length > 0 && <ul className="mt-1.5 ml-8 list-disc text-[13.5px] text-ink-soft">{x.faits.map((f) => <li key={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</li>)}</ul>}{x.rates?.length > 0 && <p className="mt-1 ml-8 text-[13px] text-[#9A3412]">{x.rates.join(" ; ")}</p>}{x.versionAvant && <button onClick={() => restaurer(x.versionAvant)} disabled={occupe} className="mt-1.5 ml-8 text-[12.5px] font-semibold text-ink-soft underline-offset-2 hover:underline disabled:opacity-40">↶ Annuler cette modification</button>}</div>
                      : /modifications du mois|Il te faut \d+ crédit/.test(x.erreur ?? "") ? <QuotaAtteint plan={ws?.plan} nav={nav} erreur={x.erreur} />
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
              {(element || jointes.length > 0 || envoiImage) && <div className="mb-1.5 flex flex-wrap items-center gap-1.5 px-1">
                {element && <span className="flex max-w-full items-center gap-1.5 rounded-lg bg-[#FFF1EA] px-2 py-1 text-[12px] text-[#9A3412]"><span className="truncate">◎ {element.description}</span><button type="button" aria-label="Retirer l'élément" onClick={() => setElement(null)} className="font-bold">×</button></span>}
                {jointes.map((m) => <span key={m.url} className="relative"><img src={m.url} alt={m.nom} className="h-10 w-10 rounded-lg object-cover ring-1 ring-line" /><button type="button" aria-label="Retirer l'image" onClick={() => setJointes((l) => l.filter((y) => y.url !== m.url))} className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-ink text-[10px] text-white">×</button></span>)}
                {envoiImage && <span className="text-[12px] text-ink-faint">Image en cours d'envoi…</span>}
              </div>}
              <textarea ref={saisieRef} value={demande} onChange={(e) => setDemande(e.target.value)} disabled={!fini || occupe} rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
                placeholder={fini ? `Demande un changement à Bingoo!…` : "Tu pourras demander des changements dès que ton SaaS est en ligne"}
                className="block w-full resize-none bg-transparent px-1.5 text-[14.5px] outline-none placeholder:text-ink-faint" />
              <div className="mt-1.5 flex items-center gap-2">
                <select value={ecran} onChange={(e) => setEcran(e.target.value)} disabled={!fini} className="min-w-0 max-w-[60%] truncate rounded-lg border border-line bg-[#FCFBF9] px-2 py-1 text-[12.5px] text-ink-soft">
                  <option value="">Où : Bingoo! choisit</option>
                  {ecrans.map((e) => <option key={e.id} value={e.id}>Où : {e.titre}</option>)}
                </select>
                <input ref={fichierRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => { joindre(e.target.files); e.target.value = ""; }} />
                <button type="button" onClick={() => fichierRef.current?.click()} disabled={!fini || occupe || jointes.length >= 4} title="Joindre une image : ton logo, une photo, ou une capture d'un site à imiter" aria-label="Joindre une image" className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-[#F1EFEA] disabled:opacity-30">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.5l-8.5 8.5a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.8-2.8l8.4-8.4" /></svg>
                </button>
                <div className="flex-1" />
                <button type="submit" disabled={!fini || occupe || demande.trim().length < 3} aria-label="Envoyer" className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white disabled:opacity-30">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                </button>
              </div>
            </div>
            {/* Seules les vraies limites de l'atelier : les modifications du mois, puis les crédits (l'IA consommée n'a pas à inquiéter le membre) */}
            <div className="mt-1.5 px-1 text-[11.5px] leading-relaxed text-ink-faint">
              {conso && <p>
                Modifications : <b className="text-ink-soft tabular-nums">{conso.mod?.utilise ?? 0} sur {conso.mod?.max ?? 30}</b> ce mois
                {" · "}Crédits : <b className="text-ink-soft tabular-nums">{conso.credits}</b> <span title="Une fois les modifications du mois utilisées, chaque modification coûte 1 crédit">(1 par modification en plus)</span>
                {(conso.mod?.utilise ?? 0) >= (conso.mod?.max ?? 30) && conso.credits <= 0 ? <> · {ws?.plan === "explorer_pro" ? <button type="button" onClick={() => nav("/abonnement#lancer-pro")} className="font-semibold text-[#E8571C] underline">passer à Lancer Pro (100 par mois)</button> : <button type="button" onClick={() => nav("/abonnement")} className="font-semibold text-ink-soft underline">recharger des crédits</button>}</> : <> · <button type="button" onClick={() => nav("/abonnement")} className="underline-offset-2 hover:underline">recharger</button></>}
                {conso.repart ? <> · nouvelles modifications le {(() => { const d = new Date(conso.repart); return (d.getDate() === 1 ? "1er" : d.getDate()) + " " + d.toLocaleDateString("fr-FR", { month: "long" }); })()}</> : null}
              </p>}
              <p>Double-clic sur un texte de l'aperçu pour le modifier : gratuit, ne compte pas dans tes modifications.</p>
            </div>
          </form>
        </section>

        {/* L'aperçu */}
        <section className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
          <div className="mb-2.5 flex items-center gap-2">
            <div className="flex rounded-lg border border-line bg-white p-0.5 text-[12.5px] font-semibold">
              {[["ordi", "Ordinateur"], ["tel", "Téléphone"]].map(([k, l]) => <button key={k} onClick={() => setVue(k)} className={cx("rounded-md px-2.5 py-1", vue === k ? "bg-ink text-white" : "text-ink-soft")}>{l}</button>)}
            </div>
            <div className="flex rounded-lg border border-line bg-white p-0.5 text-[12.5px] font-semibold">
              {[["texte", "✎ Modifier un texte", "Clique sur un texte de l'aperçu pour le réécrire sur place (gratuit). Astuce : un double-clic sur un texte marche aussi"], ["pointer", "◎ Pointer", "Clique sur un élément de l'aperçu, puis dis ce que tu veux changer"]].map(([k, l, t]) => <button key={k} title={t} disabled={!fini || occupe} onClick={() => setOutil((o) => (o === k ? null : k))} className={cx("rounded-md px-2.5 py-1 disabled:opacity-40", outil === k ? "bg-[#E8571C] text-white" : "text-ink-soft hover:text-ink")}>{l}</button>)}
            </div>
            <div className="relative">
              <button onClick={ouvrirHistorique} disabled={!fini} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:text-ink disabled:opacity-40">Historique</button>
              {versions && <div className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-line bg-white p-1.5 shadow-xl">
                {versions.length ? versions.map((v) => <button key={v.version} onClick={() => restaurer(v.version)} disabled={occupe} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12.5px] hover:bg-[#F7F5F1]"><span>Version {v.version}</span><span className="text-ink-faint">{new Date(v.at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></button>) : <p className="px-2.5 py-2 text-[12.5px] text-ink-faint">Pas encore d'ancienne version.</p>}
              </div>}
            </div>
            <div className="min-w-0 flex-1 truncate rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] text-ink-faint">{outil === "texte" ? "Clique sur un texte de l'aperçu pour le modifier" : outil === "pointer" ? "Clique sur l'élément à changer" : fini ? lien.replace(/^https?:\/\//, "") : "Aperçu en construction…"}</div>
            <button onClick={() => setCle((k) => k + 1)} disabled={!fini} aria-label="Recharger l'aperçu" className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-ink-soft hover:text-ink disabled:opacity-40">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
            </button>
          </div>
          <div className={cx("relative mx-auto min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-line bg-white shadow-[0_30px_80px_-50px_rgba(21,23,42,.5)] transition-[max-width] duration-500", vue === "tel" ? "max-w-[390px]" : "max-w-none")}>
            {fini ? <iframe ref={cadreRef} key={cle} title={`Aperçu de ${nom}`} src={lienApercu} onLoad={() => pousserOutil()} className={cx("absolute inset-0 h-full w-full border-0", outil && "ring-2 ring-inset ring-[#E8571C]")} />
              : <Assemblage nom={nom} couleur={couleur} ecrans={ecrans} ecrits={ecrits} etape={etape} />}
            {occupe && <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-[#ECEAE4]"><div className="h-full w-1/3 animate-[barre_1.2s_ease-in-out_infinite] bg-[#E8571C]" /></div>}
          </div>
        </section>
      </div>
    </div>
  );
}
// Modifications du mois utilisées : on propose la formule supérieure (Lancer Pro), sinon des crédits
function QuotaAtteint({ plan, nav, erreur }) {
  const pro = plan === "lancer_pro" || plan === "business" || plan === "fondateur";
  return (
    <div className="rounded-xl border border-[#E8571C]/30 bg-[#FFF6F1] p-3">
      <p className="font-semibold">{/crédit/.test(erreur) && !/modifications/.test(erreur) ? "Plus de modifications ni de crédits ce mois-ci." : "Tu as utilisé toutes tes modifications du mois."}</p>
      {pro ? <p className="mt-1 text-[13.5px] text-ink-soft">Continue tout de suite avec des crédits (1 crédit par modification), ou attends le 1er du mois.</p>
        : <p className="mt-1 text-[13.5px] text-ink-soft">Passe à <b>Lancer Pro</b> : <b>100 modifications par mois</b> au lieu de 30, pour 39,99 € HT par mois. Tu gardes ton SaaS et ta durée, la différence est facturée au prorata. Ou continue avec des crédits.</p>}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {!pro && <button onClick={() => nav("/abonnement#lancer-pro")} className="rounded-lg bg-[#E8571C] px-3.5 py-2 text-[13px] font-semibold text-white">Passer à Lancer Pro</button>}
        <button onClick={() => nav("/abonnement")} className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] font-semibold">Recharger des crédits</button>
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
