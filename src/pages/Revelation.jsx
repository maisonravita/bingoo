// Après le paiement : le flou disparaît, le SaaS choisi apparaît en grand, puis Bingoo! construit sa version en plein écran.
// Une fois en ligne, le créateur entre dans l'interface complète de Bingoo!.
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import { resumeFr } from "../lib/angle";
import CompanyLogo from "../components/CompanyLogo";
import Logo from "../components/Logo";
import AppCadre, { lienApp } from "../components/AppCadre";
import AppTelephone from "../components/AppTelephone";
import { indexChoisi } from "../lib/choix";
// Polices proposées à l'atelier : la liste acceptée par la coque des apps (src/lib/appShell.js, POLICES), titres en premier choix
const POLICES_TITRES = ["Cormorant Garamond", "Playfair Display", "DM Serif Display", "Fraunces", "Lora", "Merriweather", "Bebas Neue", "Oswald", "Barlow Condensed", "Space Grotesk", "Sora", "Outfit", "Poppins", "Montserrat", "Plus Jakarta Sans", "Archivo", "Urbanist", "Raleway"];
const POLICES_TEXTE = ["Inter", "DM Sans", "Manrope", "Plus Jakarta Sans", "Work Sans", "Lato", "Open Sans", "Roboto", "Nunito", "Rubik", "Lexend", "Barlow", "Quicksand", "Outfit", "Lora", "Merriweather"];

const HF = { fontFamily: "var(--font-titre)" };
const CLE_CHOIX = "bingoo-choix";
const CLE_CHANTIER = "bingoo-chantier";
const dollar = (n) => n == null ? "—" : n >= 1e4 ? `${Math.round(n / 1e3)} k$` : `${Math.round(n).toLocaleString("fr-FR")} $`;
const paye = (ws) => ws?.plan === "fondateur" || (["explorer", "explorer_pro", "lancer_pro", "business", "solo", "pro", "site"].includes(ws?.plan) && ["active", "trialing", "past_due"].includes(ws?.plan_status));
const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };
const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
// Le chantier en cours appartient à un espace : celui d'un autre compte (même navigateur) est ignoré
const chantierDe = (ws) => { const c = lire(CLE_CHANTIER); return c && (!c.ws || c.ws === ws?.id) && !(c.projet && !c.ws) ? c : null; };


/** Sous une modification mise en ligne : le résultat du robot de l'atelier (en cours, testée, ou annulée et rendue). */
function TestAtelier({ x, verif, apercu }) {
  if (x.publieA == null || !verif) return null;
  const d = verif.dernier_atelier;
  const enTest = apercu?._test?.phase === "en_cours";
  const conclu = d && !enTest && !verif.atelier && String(d.at ?? "") >= x.publieA;
  if (!conclu) {
    if (enTest) return <p className="mt-1.5 ml-8 flex items-center gap-2 text-[13px] text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-[#E8571C] pulse-dot" />{(apercu._test.en_reparation ?? []).length ? "Un écran a un souci sur la version d'aperçu : je le corrige avant de publier (offert)…" : "Je la teste sur une version d'aperçu, écran par écran. Elle ne sera mise en ligne que si tout fonctionne…"}</p>;
    return verif.atelier ? <p className="mt-1.5 ml-8 flex items-center gap-2 text-[13px] text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-[#E8571C] pulse-dot" />Je teste la modification écran par écran, comme un vrai utilisateur…</p> : null;
  }
  if (!d.annule) return <p className="mt-1.5 ml-8 text-[13px] text-good">{d.avant_publication ? "Testée sur la version d'aperçu : tous les écrans fonctionnent. Elle est en ligne, regarde l'aperçu." : "Testée : tous les écrans fonctionnent. Elle reste en ligne."}</p>;
  const msg = [...(verif.journal ?? [])].reverse().find((j) => j.type === "probleme" && /version d'avant|pas mise en ligne/.test(j.t))?.t;
  return <p className="mt-1.5 ml-8 rounded-lg bg-[#FFF7F0] px-3 py-2 text-[13px] text-[#9A3412]">{msg ?? "Cette modification cassait un écran : elle n'a pas été mise en ligne, et elle t'est rendue."}</p>;
}

// « C'est publié » : l'adresse en ligne, à copier ou à envoyer (WhatsApp, e-mail). Affichée à la fin de la construction
// et derrière le bouton « Partager » de l'atelier.
function CartePublie({ lien, nom, estSite, compact = false }) {
  const [copie, setCopie] = useState(false);
  if (!lien) return null;
  const msg = `${estSite ? "Mon site est en ligne" : "Mon application est en ligne"} : ${nom} ${lien}`;
  const copier = () => { navigator.clipboard?.writeText(lien).then(() => { setCopie(true); setTimeout(() => setCopie(false), 2000); }, () => window.prompt("Copie ce lien :", lien)); };
  const b = "rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:border-ink-faint";
  return (
    <div className={cx("rounded-xl border border-[#2F7A4D]/25 bg-[#EEF7F1] p-3", compact ? "" : "mt-3")}>
      <p className="flex items-center gap-2 text-[13px] font-bold text-[#1E3A2A]"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#2F7A4D]" />Publié : tout le monde peut l'ouvrir à cette adresse</p>
      <p className="mt-1.5 truncate rounded-lg bg-white px-2.5 py-1.5 font-mono text-[12.5px] text-ink">{lien.replace(/^https?:\/\//, "")}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" onClick={copier} className={b}>{copie ? "Lien copié ✓" : "Copier le lien"}</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className={b}>Envoyer par WhatsApp</a>
        <a href={`mailto:?subject=${encodeURIComponent(nom)}&body=${encodeURIComponent(msg)}`} className={b}>Envoyer par e-mail</a>
        <a href={lien} target="_blank" rel="noreferrer" className={b}>Ouvrir ↗</a>
      </div>
    </div>
  );
}
function BoutonPartager({ lien, nom, estSite }) {
  const [o, setO] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setO(!o)} aria-expanded={o} className="rounded-lg bg-[#2F7A4D] px-3 py-1.5 text-[13.5px] font-semibold text-white hover:brightness-110">Publié · Partager</button>
      {o && <div className="absolute right-0 top-full z-30 mt-2 w-[min(380px,calc(100vw-32px))] rounded-xl bg-white p-1 shadow-2xl"><CartePublie lien={lien} nom={nom} estSite={estSite} compact /></div>}
    </div>
  );
}

// Panneau de l'outil Police : deux listes (titres, texte), chaque nom écrit dans sa propre police
function PanneauPolices({ polices, essayer, enregistrer, annuler }) {
  const [t, setT] = useState(polices?.titres ?? null), [x, setX] = useState(polices?.texte ?? null);
  useEffect(() => {
    if (document.getElementById("polices-atelier")) return;
    const l = document.createElement("link"); l.id = "polices-atelier"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?" + [...new Set([...POLICES_TITRES, ...POLICES_TEXTE])].map((p) => "family=" + p.replace(/ /g, "+")).join("&") + "&display=swap";
    document.head.appendChild(l);
  }, []);
  const choisir = (nt, nx) => { setT(nt); setX(nx); if (nt && nx) essayer({ titres: nt, texte: nx }); else if (nt || nx) essayer({ titres: nt ?? nx, texte: nx ?? "Inter" }); };
  const liste = (titre, l, val, f) => (
    <div className="min-w-0 flex-1">
      <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">{titre}</p>
      <div className="flex max-h-[180px] flex-col gap-0.5 overflow-y-auto pr-1">
        {l.map((p) => <button key={p} type="button" onClick={() => f(p)} className={cx("rounded-lg px-2.5 py-1.5 text-left text-[16px] text-white", val === p ? "bg-[#E8571C]" : "hover:bg-white/10")} style={{ fontFamily: `"${p}", system-ui` }}>{p}</button>)}
      </div>
    </div>
  );
  return (
    <div className="absolute left-1/2 top-3 z-20 w-[min(560px,calc(100%-24px))] -translate-x-1/2 rounded-xl bg-ink/95 p-3 shadow-2xl">
      <div className="flex gap-3">{liste("Titres", POLICES_TITRES, t, (p) => choisir(p, x ?? "Inter"))}{liste("Texte", POLICES_TEXTE, x, (p) => choisir(t ?? p, p))}</div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button type="button" onClick={annuler} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-white/70 hover:text-white">Annuler</button>
        <button type="button" onClick={enregistrer} disabled={!polices} className="rounded-lg bg-[#E8571C] px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40">Garder ces polices (gratuit)</button>
      </div>
    </div>
  );
}

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
  if (!p || p.type === "site") return null;
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
const IDEES_SAAS = ["Ajoute une page de tarifs", "Ajoute un tableau de bord de mes ventes", "Ajoute une page d'aide pour mes clients", "Ajoute un export CSV", "Change les couleurs"];
const IDEES_SITE = ["Change la couleur du site", "Rends l'accroche plus chaleureuse", "Ajoute une question sur les délais", "Mets mes tarifs à jour", "Ajoute une section à propos"];
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
  // Atelier : l'état complet de l'app (dont la modification en attente de test) est relu à l'ouverture ;
  // sans ça, une modification validée restait « en test » pour toujours (le robot de vérification ne démarrait pas)
  useEffect(() => {
    if (!atelier || !c.app?.id) return;
    supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut, version, verif").eq("id", c.app.id).maybeSingle().then(({ data }) => { if (data) setApp((x) => ({ ...(x ?? {}), ...data })); });
  }, [atelier, c.app?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [erreur, setErreur] = useState(null);
  const [essai, setEssai] = useState(0);
  const [echanges, setEchanges] = useState([]); // modifications demandées après la mise en ligne
  const [demande, setDemande] = useState("");
  const [ecran, setEcran] = useState("");
  const [occupe, setOccupe] = useState(false), [modifEtape, setModifEtape] = useState("");
  const [vue, setVue] = useState("ordi");
  const [cle, setCle] = useState(0);
  // Outils de l'atelier : modifier un texte en cliquant dessus, pointer un élément, joindre des images, revenir en arrière
  const [outil, setOutil] = useState(null); // null | "texte" | "pointer" | "commenter" | "sections" | "image" | "police"
  const imageVisee = useRef(null), fichierImage = useRef(null);
  const [imageCible, setImageCible] = useState(null);
  const [polices, setPolices] = useState(null); // { titres, texte } en cours d'essai
  const [element, setElement] = useState(null); // { description, ecran }
  const [jointes, setJointes] = useState([]); // [{ url, nom }]
  const [envoiImage, setEnvoiImage] = useState(false);
  const [versions, setVersions] = useState(null);
  // File de demandes : écrites pendant que Bingoo! travaille, lancées une par une dès qu'il est libre
  const [file, setFile] = useState([]);
  const [modePlan, setModePlan] = useState(false);
  const [commentaires, setCommentaires] = useState([]); // remarques épinglées sur l'aperçu
  const [remarque, setRemarque] = useState(""); // mode plan : Bingoo! montre son plan avant de toucher au SaaS
  const sauverRetouche = useRef(0);
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
              ? await fn("r/saas-lancer-idee", { workspace_id: ws.id, texte: c.ideeTexte, type: c.type ?? "saas", reponses: c.reponses ?? [], apercu: c.apercu, nom: (rep.nom ?? "").trim() || c.apercu?.nom || null, source: c.source ?? null })
              : await fn("r/saas-lancer", { workspace_id: ws.id, domaine: c.domaine, angle: angle.current, nom: (rep.nom ?? "").trim() || null, modele: c.modele ?? null, couleur: c.couleur ?? null, allure: c.allure ?? null, source: c.source ?? null });
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
          const { data } = await supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut, version, verif, maj").eq("projet_id", p.id).maybeSingle();
          if (!data) continue;
          setApp(data);
          if (/Vérif/i.test(data.etape ?? "")) setEtape(3);
          if (data.statut === "pret" && data.spec?.ecrans?.length) {
            // Mise en ligne toute fraîche, vérification pas encore posée : on attend un peu (jamais « prêt » sans test)
            if (!data.verif?.phase && Date.now() - new Date(data.maj ?? 0).getTime() < 90_000) continue;
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
  const estSite = spec?.type === "site" || c.type === "site";
  const estApp = !!spec?.mobile || c.type === "app";
  // App mobile : l'aperçu s'ouvre sur la vue téléphone
  useEffect(() => { if (estApp) setVue("tel"); }, [estApp]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // L'aperçu reçoit l'outil choisi (à chaque changement et à chaque rechargement), et les remarques épinglées
  const pousserEpingles = (l = commentaires) => { try { cadreRef.current?.contentWindow?.postMessage({ type: "bingoo-atelier-epingles", liste: l.map((c, i) => ({ n: i + 1, chemin: c.chemin, ecran: c.ecran, texte: c.texte })) }, "*"); } catch (_) { /* aperçu pas prêt */ } };
  const pousserOutil = (m = outil) => { try { cadreRef.current?.contentWindow?.postMessage({ type: "bingoo-atelier-mode", mode: m === "police" ? null : m }, "*"); } catch (_) { /* aperçu pas prêt */ } pousserEpingles(); };
  useEffect(() => { if (fini && app?.id) fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "commentaires" }).then((l) => setCommentaires(Array.isArray(l) ? l : []), () => null); }, [fini, app?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { pousserEpingles(); }, [commentaires]); // eslint-disable-line react-hooks/exhaustive-deps
  // Les remarques s'enregistrent une par une (jamais deux écritures en même temps, sinon l'une effacerait l'autre)
  const chaineRemarques = useRef(Promise.resolve());
  const [remarqueEnvoi, setRemarqueEnvoi] = useState(0);
  const enSerie = (f) => { setRemarqueEnvoi((n) => n + 1); const p = chaineRemarques.current.then(f).finally(() => setRemarqueEnvoi((n) => n - 1)); chaineRemarques.current = p.catch(() => null); return p; };
  const epingler = () => {
    const t = remarque.trim(); if (t.length < 2 || !element?.chemin) return;
    const c = { texte: t, chemin: element.chemin, ecran: element.ecran, signe: element.signe, element: element.description };
    // Affichée tout de suite (pastille comprise), enregistrée derrière
    setCommentaires((l) => [...l, { ...c, id: "tmp" + Date.now() }]); setRemarque(""); deselectionner();
    enSerie(async () => { try { setCommentaires(await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "commentaires", action: "ajouter", commentaire: c })); } catch (x) { setEchanges((l) => [...l, { moi: "Épingler une remarque", etat: "ko", erreur: x.message }]); } });
  };
  const retirerRemarques = (ids) => enSerie(async () => { try { setCommentaires(await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "commentaires", action: "retirer", ids })); } catch (_) { /* rien */ } });
  // Toutes les remarques en une seule demande : Bingoo! les traite une par une, puis elles sont décrochées
  const traiterRemarques = () => {
    if (!commentaires.length || remarqueEnvoi > 0) return;
    const t = `Traite ces remarques que j'ai épinglées sur la page, une par une :\n${commentaires.map((c, i) => `${i + 1}. Sur ${c.element || "l'élément épinglé"} : ${c.texte}`).join("\n")}`;
    const ecr = [...new Set(commentaires.map((c) => c.ecran))]; const seul = ecr.length === 1 && !ecr[0].startsWith("_") ? ecr[0] : "";
    envoyer(t, seul); retirerRemarques(commentaires.map((c) => c.id));
  };
  useEffect(() => { pousserOutil(); }, [outil, cle]); // eslint-disable-line react-hooks/exhaustive-deps
  // Sortie de l'outil Police sans garder : l'essai est retiré de l'aperçu
  useEffect(() => { if (outil !== "police" && polices) { setPolices(null); setCle((k) => k + 1); } }, [outil]); // eslint-disable-line react-hooks/exhaustive-deps
  const recharger = async () => { const { data } = await supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut, version, verif").eq("id", app.id).maybeSingle(); if (data) setApp(data); setCle((k) => k + 1); };
  // Messages de l'aperçu : un texte modifié sur place, ou un élément pointé
  useEffect(() => {
    const ecoute = async (e) => {
      if (e.source !== cadreRef.current?.contentWindow) return;
      const d = e.data ?? {};
      if (d.type === "bingoo-atelier-pret") { pousserOutil(); return; }
      if (d.type === "bingoo-atelier-element") { setElement({ description: String(d.description ?? "").slice(0, 300), ecran: String(d.ecran ?? ""), chemin: String(d.chemin ?? ""), signe: String(d.signe ?? ""), texte: !!d.texte, couleur: d.couleur, fond: d.fond, retouche: d.retouche ?? {} }); return; }
      if (d.type === "bingoo-atelier-ordre" && app && Array.isArray(d.ordre)) {
        const n = echanges.length;
        setEchanges((l) => [...l, { moi: "Sections réordonnées", etat: "encours" }]);
        try { await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "sections-ordre", ordre: d.ordre.map(String).slice(0, 40) }); setEchanges((l) => l.map((x, k) => (k === n ? { ...x, etat: "ok", faits: ["ordre des sections enregistré (gratuit)"] } : x))); }
        catch (x) { setEchanges((l) => l.map((y, k) => (k === n ? { ...y, etat: "ko", erreur: x.message } : y))); setCle((k) => k + 1); }
        return;
      }
      // Image cliquée : un bandeau propose de choisir la photo (le navigateur n'ouvre le choix de fichier que sur un vrai clic)
      if (d.type === "bingoo-atelier-image" && app && d.src) { imageVisee.current = String(d.src); setImageCible(String(d.description ?? "cette image").slice(0, 80)); return; }
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
    try {
      const r = await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "restaurer", version }); setVersions(null);
      const rendu = r?.rendue ? [r.rendue.credits ? `${r.rendue.credits} crédit${r.rendue.credits > 1 ? "s" : ""} rendu${r.rendue.credits > 1 ? "s" : ""}` : "", r.rendue.modifications ? `${r.rendue.modifications} modification${r.rendue.modifications > 1 ? "s" : ""} du mois rendue${r.rendue.modifications > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ") : "";
      setEchanges((l) => [...l, { moi: `Revenir à la version ${version}`, etat: "ok", faits: [`version ${version} remise en ligne`, ...(rendu ? [`${rendu} : tu ne paies jamais un résultat qui ne te convient pas`] : [])] }]);
      await recharger(); majConso();
    }
    catch (x) { setEchanges((l) => [...l, { moi: `Revenir à la version ${version}`, etat: "ko", erreur: x.message }]); }
    finally { setOccupe(false); }
  };
  // Nouveau design de Bingoo! (au clic, jamais sans prévenir) : l'ancien est gardé, « Revenir au design précédent » le rend
  const nouveauDesign = async () => {
    if (!app || occupe) return;
    setOccupe(true);
    try { const r = await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "design-nouveau" }); setVersions(null); setEchanges((l) => [...l, { moi: "Appliquer le nouveau design", etat: "ok", faits: [r.saas ? "nouvel intérieur appliqué ; la page de présentation s'écrit (environ une minute), l'aperçu se met à jour tout seul. L'ancien design est gardé : Historique → Revenir au design précédent" : `nouveau design « ${r.style ?? ""} » (l'ancien est gardé : Historique → Revenir au design précédent)`] }]); await recharger(); if (r.saas) [60000, 120000].forEach((t) => setTimeout(() => recharger(), t)); }
    catch (x) { setEchanges((l) => [...l, { moi: "Appliquer le nouveau design", etat: "ko", erreur: x.message }]); }
    finally { setOccupe(false); }
  };
  // Retour au design précédent : l'apparence seule, les textes et prix modifiés depuis restent (un second clic annule)
  const revenirDesign = async () => {
    if (!app || occupe) return;
    setOccupe(true);
    try { await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "design-revenir" }); setVersions(null); setEchanges((l) => [...l, { moi: "Revenir au design précédent", etat: "ok", faits: ["design précédent remis en ligne (textes et prix inchangés)"] }]); await recharger(); }
    catch (x) { setEchanges((l) => [...l, { moi: "Revenir au design précédent", etat: "ko", erreur: x.message }]); }
    finally { setOccupe(false); }
  };
  const ouvrirHistorique = async () => { if (versions) { setVersions(null); return; } try { setVersions(await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "versions" })); } catch (_) { setVersions([]); } };

  // Outil Image : la photo choisie remplace celle cliquée dans l'aperçu (réduite à 2000 px, sans IA, gratuit)
  const remplacerImage = async (f) => {
    const avant = imageVisee.current; imageVisee.current = null;
    if (!f || !avant || !app) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { alert("Image PNG, JPG ou WebP seulement."); return; }
    const n = echanges.length;
    setEchanges((l) => [...l, { moi: `Image remplacée par « ${f.name.slice(0, 40)} »`, etat: "encours" }]);
    try {
      const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(f); });
      const k = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const { url } = await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "image", image: c.toDataURL(f.type === "image/png" ? "image/png" : "image/jpeg", 0.88) });
      await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "image-remplacer", avant, url });
      setEchanges((l) => l.map((x, k2) => (k2 === n ? { ...x, etat: "ok", faits: ["image remplacée (gratuit)"] } : x)));
      await recharger(); setCle((k2) => k2 + 1);
    } catch (x) { setEchanges((l) => l.map((y, k2) => (k2 === n ? { ...y, etat: "ko", erreur: x.message } : y))); }
  };
  // Outil Police : essai en direct dans l'aperçu, puis enregistrement (sans IA, gratuit)
  const essayerPolice = (p) => { setPolices(p); try { cadreRef.current?.contentWindow?.postMessage({ type: "bingoo-atelier-police", ...p }, "*"); } catch (_) { /* aperçu pas prêt */ } };
  const enregistrerPolice = async () => {
    if (!polices || !app) return;
    const n = echanges.length;
    setEchanges((l) => [...l, { moi: `Polices : ${polices.titres} pour les titres, ${polices.texte} pour le texte`, etat: "encours" }]);
    try { await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "police", ...polices }); setEchanges((l) => l.map((x, k) => (k === n ? { ...x, etat: "ok", faits: ["polices enregistrées (gratuit)"] } : x))); setPolices(null); setOutil(null); await recharger(); setCle((k) => k + 1); }
    catch (x) { setEchanges((l) => l.map((y, k) => (k === n ? { ...y, etat: "ko", erreur: x.message } : y))); }
  };
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
  const envoyer = async (texte, ecranForce, attendue) => {
    const t = (texte ?? demande).trim();
    if (t.length < 3 || !app) return;
    const imgs = attendue ? attendue.images : jointes, el = attendue ? attendue.element : element;
    // Bingoo! est occupé (ou construit encore) : la demande attend son tour dans la file
    // Mode plan : d'abord le plan (gratuit, rien n'est modifié), le membre valide ensuite
    if (!attendue && modePlan && fini) {
      const n = echanges.length, ecr = ecranForce ?? ecran;
      setEchanges((l) => [...l, { moi: t, images: imgs, element: el?.description, etat: "plan-encours" }]); setDemande(""); setJointes([]); setElement(null); setOutil(null);
      try {
        const p = await fn("r/saas-app-plan", { workspace_id: ws.id, app_id: app.id, demande: t, ecran: ecr || null, element: el?.description ?? null });
        setEchanges((l) => l.map((x, k) => (k === n ? { ...x, etat: "plan", plan: p, attente: { texte: t, ecran: ecr, images: imgs, element: el } } : x)));
      } catch (x) { setEchanges((l) => l.map((y, k) => (k === n ? { ...y, etat: "ko", erreur: x.message } : y))); }
      return;
    }
    if (attendue && occupe) { setFile((f) => [...f, attendue]); return; }
    if (!attendue && (occupe || !fini || testEnCours)) {
      setFile((f) => [...f, { texte: t, ecran: ecranForce ?? ecran, images: imgs, element: el }]); setDemande(""); setJointes([]); setElement(null); setOutil(null);
      return;
    }
    if (occupe) return;
    const n = echanges.length, versionAvant = app.version;
    setEchanges((l) => [...l, { moi: t, images: imgs, element: el?.description, etat: "encours" }]); setDemande(""); setJointes([]); setElement(null); setOutil(null); setOccupe(true);
    const maj = (o) => setEchanges((l) => l.map((x, k) => (k === n ? { ...x, ...o } : x)));
    try {
      const cibleEcran = ecranForce ?? (el?.ecran && el.ecran !== "_site" && !el.ecran.startsWith("_") ? el.ecran : ecran) ?? "";
      const r = await fn("r/saas-app-modifier", { workspace_id: ws.id, app_id: app.id, ecran: cibleEcran || "nouveau", demande: t, images: imgs.map((x) => x.url), element: el?.description ?? null });
      for (let i = 0; i < 80; i++) {
        await attendre(3000);
        const { data } = await supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut, version, verif").eq("id", app.id).maybeSingle();
        if (data?.etape) setModifEtape(data.etape);
        if (data && data.statut !== "en_cours") {
          if (data.erreur) throw new Error(data.erreur);
          const fait = data.brouillon?._modif ?? null;
          if (data.brouillon?._modif) await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "brouillon-valider" });
          const { data: frais } = await supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut, version, verif").eq("id", app.id).maybeSingle();
          setApp(frais ?? data); setCle((k) => k + 1);
          maj({ etat: "ok", credit: r?.credit, faits: fait?.faits ?? [], rates: fait?.rates ?? [], versionAvant, publieA: fait ? new Date(Date.now() - 5000).toISOString() : null });
          return;
        }
      }
      throw new Error("C'est plus long que prévu : l'aperçu se mettra à jour tout seul.");
    } catch (e) { maj({ etat: "ko", erreur: e.message }); } finally { setOccupe(false); setModifEtape(""); }
  };

  // Robot de l'atelier : pendant le test d'une modification, l'état est relu toutes les 4 s ; si la modification est
  // annulée (elle cassait un écran), l'aperçu se recharge sur la version remise.
  const testEnCours = (!!app?.verif?.atelier && app?.verif?.phase === "en_cours") || app?.brouillon?._test?.phase === "en_cours";
  useEffect(() => {
    if (!testEnCours || !app?.id) return;
    const t = setInterval(async () => {
      const { data } = await supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, domaine, domaine_statut, version, verif").eq("id", app.id).maybeSingle();
      if (!data) return;
      setApp(data);
      // Fin du test : publiée (nouvelle version) ou annulée après publication → l'aperçu se recharge
      if (!data.brouillon?._test && !data.verif?.atelier) setCle((k) => k + 1);
    }, 4000);
    return () => clearInterval(t);
  }, [testEnCours, app?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // La file avance toute seule : dès que Bingoo! est libre (construction finie, rien en test), la demande suivante part
  useEffect(() => {
    if (!file.length || occupe || !fini || testEnCours || !app) return;
    const [x, ...reste] = file; setFile(reste);
    const ecr = x.ecran && !String(x.ecran).startsWith("_") ? x.ecran : (x.element?.ecran && !x.element.ecran.startsWith("_") ? x.element.ecran : "");
    envoyer(x.texte, ecr, x);
  }, [file, occupe, fini, testEnCours, app?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Outil Sélectionner : retouche directe de l'élément choisi, visible tout de suite, enregistrée sans IA
  const retoucher = (patch) => {
    if (!element?.chemin || !app) return;
    const css = { ...(element.retouche ?? {}), ...patch };
    for (const k of Object.keys(css)) if (css[k] == null || css[k] === false || (k === "echelle" && Math.abs(css[k] - 1) < 0.01)) delete css[k];
    const el = { ...element, retouche: patch === null ? {} : css };
    setElement(el);
    const msg = { type: "bingoo-atelier-retouche", chemin: el.chemin, ecran: el.ecran || "_site", signe: el.signe, css: el.retouche };
    try { cadreRef.current?.contentWindow?.postMessage(msg, "*"); } catch (_) { /* aperçu pas prêt */ }
    clearTimeout(sauverRetouche.current);
    sauverRetouche.current = setTimeout(async () => {
      try { await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: "retouche", chemin: msg.chemin, ecran: msg.ecran, signe: msg.signe, css: msg.css }); }
      catch (x) { setEchanges((l) => [...l, { moi: "Retouche de l'élément", etat: "ko", erreur: x.message }]); }
    }, 700);
  };
  const deselectionner = () => { setElement(null); try { cadreRef.current?.contentWindow?.postMessage({ type: "bingoo-atelier-deselect" }, "*"); } catch (_) { /* rien */ } };

  // Le robot de Bingoo! : il ouvre chaque écran en coulisses, clique comme un utilisateur, et envoie le résultat.
  // Une seule fois par version et par passage ; il repasse dès qu'une correction arrive.
  const robotFait = useRef(new Set());
  // Une modification de l'atelier en test sur sa version d'aperçu passe avant tout : le robot teste l'aperçu, pas la version en ligne
  const testApercu = app?.brouillon?._test;
  const apercuEnTest = testApercu?.phase === "en_cours" && !(testApercu.en_reparation ?? []).length;
  const specApercu = useMemo(() => { if (!app?.brouillon?._test) return null; const { _modif, _test, ...sp } = app.brouillon; return sp; }, [app?.brouillon]); // eslint-disable-line no-unused-vars
  const cleRobot = apercuEnTest ? `apercu-${testApercu.debut}-${testApercu.passages ?? 0}` : app?.statut === "pret" && !testApercu && app?.verif?.phase === "en_cours" && !(app.verif.en_reparation ?? []).length ? `${app.version}-${app.verif.passages ?? 0}` : null;
  const robotActif = cleRobot && !robotFait.current.has(cleRobot) ? cleRobot : null;
  useEffect(() => {
    if (!robotActif || !app) return;
    const ecoute = async (e) => {
      if (e.data?.type !== "bingoo-verif" || e.data.slug !== app.slug || robotFait.current.has(robotActif)) return;
      robotFait.current.add(robotActif);
      try {
        if (robotActif.startsWith("apercu-")) await fn("r/saas-app-verif-brouillon", { workspace_id: ws.id, app_id: app.id, passage: testApercu?.passages ?? 0, resultats: e.data.resultats });
        else await fn("r/saas-app-verif", { workspace_id: ws.id, app_id: app.id, version: app.version, resultats: e.data.resultats });
      } catch { /* le robot du serveur repasse dans les 10 minutes */ }
    };
    window.addEventListener("message", ecoute);
    return () => window.removeEventListener("message", ecoute);
  }, [robotActif]); // eslint-disable-line react-hooks/exhaustive-deps
  // Dans l'atelier, le SaaS existe déjà : pas besoin du SaaS d'origine (un SaaS lancé depuis une idée n'en a pas)
  if (!c.domaine && !(atelier && c.app)) return <Navigate to="/explorer/copier" replace />;
  // Lignes de préparation : jamais « analyse des pages de… » pour une idée (il n'y a pas de SaaS d'origine)
  const lect = c.idee && c.type === "site" ? ["Lecture de ton idée et de ton aperçu", "Écriture des textes de ton site : accroche, services, prix, horaires"] : c.idee ? ["Lecture de ton idée et de ton aperçu", "Préparation du plan : écrans, données, formules"] : LECTURE(c.nom);
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
        {fini && <BoutonPartager lien={lien} nom={nom} estSite={estSite} />}
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
                {fini && <div className="mt-3 flex flex-wrap gap-1.5">{(estSite ? IDEES_SITE : IDEES_SAAS).map((x) => <button key={x} onClick={() => { setEcran(""); envoyer(x); }} disabled={occupe} className="rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium hover:border-ink-faint disabled:opacity-50">{x}</button>)}</div>}
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
              <p>{c.idee && c.type === "site" ? <>C'est parti : j'écris les textes de {c.apercu?.nom ?? "ton site"}, je le mets en ligne, puis je teste ton espace gérant (demandes, services, horaires). Ensuite, vérifie tes prix : ils sont proposés, à toi de mettre les vrais.</> : c.idee ? <>C'est parti : je construis {c.apercu?.nom ?? "ton idée"}, avec les {c.apercu?.ecrans?.length ?? ""} écrans de ton aperçu, puis je les teste un par un.</> : <>C'est parti. {c.nom} gagne déjà de l'argent : je construis ta version, avec ton nom, tes mots et ton design.</>}</p>
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
                {estApp && <div className="mb-3"><p className="mb-2"><b>{nom} est prête.</b> Essaie-la sur ton téléphone :</p><AppTelephone app={app} wsId={ws.id} /></div>}
                <p>{estSite ? <><b>{nom} est en ligne.</b> C'est ton vrai site, à droite. En bas de page, « Espace gérant » : crée ton accès avec l'adresse e-mail de ton compte, puis vérifie tes prix et ajoute ton téléphone. Les demandes de tes visiteurs t'arrivent par e-mail.</> : <><b>{nom} est en ligne.</b> Essaie-le à droite : crée un compte, ajoute des données, clique partout. C'est ton vrai SaaS.</>}</p>
                <CartePublie lien={lien} nom={nom} estSite={estSite} />
                <p className="mt-1.5">Dis-moi ce que tu veux changer, en une phrase.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{(estSite ? IDEES_SITE : IDEES_SAAS).map((x) => <button key={x} onClick={() => { setEcran(""); envoyer(x); }} disabled={occupe} className="rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium hover:border-ink-faint disabled:opacity-50">{x}</button>)}</div>
              </Bingoo>
            )}
            {!echanges.length && app?.verif && (app.verif.atelier || app.brouillon?._test || (app.verif.dernier_atelier?.annule && Date.now() - new Date(app.verif.dernier_atelier.at ?? 0).getTime() < 24 * 3600e3)) && (
              <Bingoo><p className="font-semibold">Ta dernière modification</p><TestAtelier x={{ publieA: app.verif.atelier || app.brouillon?._test ? "" : String(app.verif.dernier_atelier?.at ?? "") }} verif={app.verif} apercu={app.brouillon} /></Bingoo>
            )}
            {echanges.map((x, i) => (
              <div key={i} className="space-y-5">
                <Moi>{x.element && <span className="mb-1 block text-[12px] text-ink-soft">◎ {x.element}</span>}{x.moi.split("\n\nPlan validé")[0]}{x.moi.includes("\n\nPlan validé") && <span className="mt-1 block text-[12px] text-ink-soft">selon le plan validé</span>}{x.images?.length > 0 && <span className="mt-1.5 flex gap-1.5">{x.images.map((m) => <img key={m.url} src={m.url} alt="" className="h-12 w-12 rounded-lg object-cover" />)}</span>}</Moi>
                <Bingoo>
                  {x.etat === "plan-encours" ? <p className="flex items-center gap-2.5 text-ink-soft"><Coche ok={false} />J'écris mon plan, sans rien toucher…</p>
                    : x.etat === "plan" || x.etat === "plan-lance" ? <div className="rounded-xl border border-line bg-[#FCFBF9] p-3.5">
                      <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-faint">Mon plan</p>
                      <p className="mt-1 font-medium">{x.plan.resume}</p>
                      <ol className="mt-2 space-y-1 text-[13.5px] text-ink-soft">{x.plan.etapes.map((e, k) => <li key={k} className="flex gap-2"><span className="tabular-nums text-ink-faint">{k + 1}.</span><span>{e}</span></li>)}</ol>
                      {x.plan.ecrans?.length > 0 && <p className="mt-2 text-[12.5px] text-ink-faint">Touché : {x.plan.ecrans.join(", ")}</p>}
                      {x.plan.question && <p className="mt-2 text-[13.5px] text-[#9A3412]">{x.plan.question}</p>}
                      {x.etat === "plan" ? <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => { setEchanges((l) => l.map((y, k) => (k === i ? { ...y, etat: "plan-lance" } : y))); const a = x.attente; envoyer(`${a.texte}\n\nPlan validé par le membre, à suivre :\n${x.plan.etapes.map((e, k) => `${k + 1}. ${e}`).join("\n")}`, a.ecran || "", a); }} className="rounded-lg bg-ink px-3.5 py-1.5 text-[13px] font-semibold text-white">Construire ce plan</button>
                        <button onClick={() => { setEchanges((l) => l.filter((_, k) => k !== i)); setDemande(x.attente.texte); saisieRef.current?.focus(); }} className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-[13px] font-semibold">Changer ma demande</button>
                      </div> : <p className="mt-2 text-[12.5px] text-ink-faint">Plan lancé ↓</p>}
                    </div>
                    : x.etat === "encours" ? <p className="flex items-center gap-2.5 text-ink-soft"><Coche ok={false} />Je modifie ton SaaS… (une à deux minutes)</p>
                    : x.etat === "ok" ? <div><p className="flex items-center gap-2.5"><Coche ok />{x.publieA ? "Modification écrite." : "C'est en ligne, regarde l'aperçu."}{x.credit ? " (1 crédit utilisé)" : ""}</p><TestAtelier x={x} verif={app?.verif} apercu={app?.brouillon} />{x.faits?.length > 0 && <ul className="mt-1.5 ml-8 list-disc text-[13.5px] text-ink-soft">{x.faits.map((f) => <li key={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</li>)}</ul>}{x.rates?.length > 0 && <p className="mt-1 ml-8 text-[13px] text-[#9A3412]">{x.rates.join(" ; ")}</p>}{x.versionAvant && <button onClick={() => restaurer(x.versionAvant)} disabled={occupe} title="Annuler dans les 48 h : la modification (ou le crédit) t'est rendue" className="mt-1.5 ml-8 text-[12.5px] font-semibold text-ink-soft underline-offset-2 hover:underline disabled:opacity-40">↶ Pas ce que tu voulais ? Annule, elle t'est rendue</button>}</div>
                      : /modifications du mois|Il te faut \d+ crédit/.test(x.erreur ?? "") ? <QuotaAtteint plan={ws?.plan} nav={nav} erreur={x.erreur} />
                      : <p className="text-[#B42318]">{x.erreur}</p>}
                </Bingoo>
              </div>
            ))}
            {/* Le robot de Bingoo! (construction ET atelier) : toujours monté, hors de tout message, pour tester chaque version */}
            {robotActif && app && <AppCadre key={robotActif} slug={app.slug} spec={robotActif.startsWith("apercu-") && specApercu ? specApercu : app.spec} version={app.version} verif className="pointer-events-none absolute -left-[9999px] top-0 h-[800px] w-[1200px]" />}
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
              {commentaires.length > 0 && <div className="mb-2 space-y-1 border-b border-line px-1 pb-2">
                <div className="flex items-center justify-between"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-faint">Remarques épinglées · {commentaires.length}</p>
                  <button type="button" onClick={traiterRemarques} disabled={!fini || remarqueEnvoi > 0} className="rounded-md bg-[#E8571C] px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-40">Faire traiter par Bingoo!</button></div>
                {commentaires.map((c, i) => <div key={c.id} className="flex items-center gap-2 text-[13px]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full rounded-bl-sm bg-[#E8571C] text-[11px] font-bold text-white">{i + 1}</span><span className="min-w-0 flex-1 truncate" title={c.element}>{c.texte}</span><button type="button" aria-label="Retirer la remarque" onClick={() => retirerRemarques([c.id])} className="text-ink-faint hover:text-ink">×</button></div>)}
              </div>}
              {file.length > 0 && <div className="mb-2 space-y-1 border-b border-line px-1 pb-2">
                <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-faint">En attente · {file.length}</p>
                {file.map((x, i) => <div key={i} className="flex items-center gap-2 text-[13px]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#F1EFEA] text-[11px] font-bold tabular-nums text-ink-soft">{i + 1}</span><span className="min-w-0 flex-1 truncate">{x.texte}</span><button type="button" aria-label="Retirer de la file" onClick={() => setFile((f) => f.filter((_, k) => k !== i))} className="text-ink-faint hover:text-ink">×</button></div>)}
              </div>}
              {(element || jointes.length > 0 || envoiImage) && <div className="mb-1.5 flex flex-wrap items-center gap-1.5 px-1">
                {element && <span className="flex max-w-full items-center gap-1.5 rounded-lg bg-[#FFF1EA] px-2 py-1 text-[12px] text-[#9A3412]"><span className="truncate">◎ {element.description}</span><button type="button" aria-label="Retirer l'élément" onClick={deselectionner} className="font-bold">×</button></span>}
                {jointes.map((m) => <span key={m.url} className="relative"><img src={m.url} alt={m.nom} className="h-10 w-10 rounded-lg object-cover ring-1 ring-line" /><button type="button" aria-label="Retirer l'image" onClick={() => setJointes((l) => l.filter((y) => y.url !== m.url))} className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-ink text-[10px] text-white">×</button></span>)}
                {envoiImage && <span className="text-[12px] text-ink-faint">Image en cours d'envoi…</span>}
              </div>}
              {fini && !occupe && !demande && echanges.length > 0 && <div className="mb-1.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">{(estSite ? IDEES_SITE : IDEES_SAAS).map((x) => <button key={x} type="button" onClick={() => { setDemande(x); saisieRef.current?.focus(); }} className="shrink-0 rounded-full border border-line bg-white px-3 py-1 text-[12px] font-medium text-ink-soft hover:border-ink/30 hover:text-ink">{x}</button>)}</div>}
              <textarea ref={saisieRef} value={demande} onChange={(e) => setDemande(e.target.value)} disabled={!app} rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
                placeholder={!fini ? "Écris déjà ta première demande : Bingoo! la lance dès que la construction est finie" : occupe ? "Écris la suivante : elle attend son tour" : element ? "Que veux-tu changer sur cet élément ?" : `Demande un changement à Bingoo!…`}
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
                <button type="button" onClick={() => setModePlan((v) => !v)} disabled={!fini} title="Mode plan : Bingoo! te montre ce qu'il va faire avant de toucher à ton SaaS (gratuit)" className={cx("rounded-lg px-2.5 py-1 text-[12.5px] font-semibold disabled:opacity-30", modePlan ? "bg-[#E8571C] text-white" : "text-ink-soft hover:bg-[#F1EFEA]")}>Plan d'abord</button>
                <div className="flex-1" />
                <button type="submit" disabled={!app || demande.trim().length < 3} aria-label={occupe || !fini ? "Ajouter à la file" : "Envoyer"} title={occupe || !fini ? "Ajouter à la file : Bingoo! la lance dès qu'il est libre" : "Envoyer"} className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white disabled:opacity-30">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                </button>
              </div>
            </div>
            {/* Seules les vraies limites de l'atelier : les modifications du mois, puis les crédits (l'IA consommée n'a pas à inquiéter le membre) */}
            <div className="mt-1.5 px-1 text-[11.5px] leading-relaxed text-ink-faint">
              <p className="mb-1 font-semibold text-[#2F7A4D]">Tu ne paies jamais nos erreurs : un défaut trouvé par notre test est corrigé gratuitement, et une modification annulée t'est rendue.</p>
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
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-line bg-white p-0.5 text-[12.5px] font-semibold">
              {[["ordi", "Ordinateur"], ["tel", "Téléphone"]].map(([k, l]) => <button key={k} onClick={() => setVue(k)} className={cx("rounded-md px-2.5 py-1", vue === k ? "bg-ink text-white" : "text-ink-soft")}>{l}</button>)}
            </div>
            <div className="flex rounded-lg border border-line bg-white p-0.5 text-[12.5px] font-semibold">
              {[["texte", "✎ Modifier un texte", "Clique sur un texte de l'aperçu pour le réécrire sur place (gratuit). Astuce : un double-clic sur un texte marche aussi"], ["pointer", "◎ Sélectionner", "Clique sur un élément de l'aperçu : change sa couleur, sa taille, son texte, ou demande à Bingoo!"], ["commenter", "💬 Commenter", "Épingle une remarque sur un élément ; Bingoo! les traite toutes d'un coup"], ...(app?.spec?.site?.page?.sections?.length > 1 ? [["sections", "⠿ Sections", "Fais glisser les sections de la page pour changer leur ordre (gratuit)"]] : []), ["image", "▣ Image", "Clique sur une image de l'aperçu pour la remplacer par la tienne (gratuit)"], ["police", "Aa Police", "Choisis la police des titres et du texte, avec l'aperçu immédiat (gratuit)"]].map(([k, l, t]) => <button key={k} title={t} disabled={!fini} onClick={() => { setOutil((o) => (o === k ? null : k)); if (outil === k) deselectionner(); }} className={cx("rounded-md px-2.5 py-1 disabled:opacity-40", outil === k ? "bg-[#E8571C] text-white" : "text-ink-soft hover:text-ink")}>{l}</button>)}
            </div>
            <div className="relative">
              <button onClick={ouvrirHistorique} disabled={!fini} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:text-ink disabled:opacity-40">Historique</button>
              {versions && <div className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-line bg-white p-1.5 shadow-xl">
                {(app?.spec?.type === "site" || !app?.spec?.gabarit_app) && !app?.spec?.mobile && <button onClick={nouveauDesign} disabled={occupe} className="mb-1 flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold hover:bg-[#F7F5F1]">Appliquer le nouveau design</button>}
                {app?.spec?.designs_precedents?.length > 0 && <button onClick={revenirDesign} disabled={occupe} className="mb-1 flex w-full items-center justify-between rounded-lg border-b border-line px-2.5 py-2 text-left text-[12.5px] font-semibold hover:bg-[#F7F5F1]"><span>Revenir au design précédent</span><span className="font-normal text-ink-faint">{new Date(app.spec.designs_precedents[0].at).toLocaleString("fr-FR", { day: "numeric", month: "short" })}</span></button>}
                {versions.length ? versions.map((v) => <button key={v.version} onClick={() => restaurer(v.version)} disabled={occupe} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12.5px] hover:bg-[#F7F5F1]"><span>Version {v.version}</span><span className="text-ink-faint">{new Date(v.at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></button>) : <p className="px-2.5 py-2 text-[12.5px] text-ink-faint">Pas encore d'ancienne version.</p>}
              </div>}
            </div>
            <div className="min-w-[160px] flex-1 truncate rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] text-ink-faint">{outil === "texte" ? "Clique sur un texte de l'aperçu pour le modifier" : outil === "pointer" ? "Clique sur un élément de l'aperçu pour le sélectionner" : outil === "commenter" ? "Clique sur un élément pour y épingler une remarque" : outil === "sections" ? "Attrape « ⠿ Glisser » et dépose la section où tu veux (ou ↑ ↓)" : outil === "image" ? "Clique sur une image de l'aperçu pour la remplacer par la tienne" : outil === "police" ? "Choisis une police : l'aperçu change tout de suite" : fini ? lien.replace(/^https?:\/\//, "") : "Aperçu en construction…"}</div>
            <button onClick={() => setCle((k) => k + 1)} disabled={!fini} aria-label="Recharger l'aperçu" className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-ink-soft hover:text-ink disabled:opacity-40">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
            </button>
          </div>
          <div className={cx("relative mx-auto min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-line bg-white shadow-[0_30px_80px_-50px_rgba(21,23,42,.5)] transition-[max-width] duration-500", vue === "tel" ? "max-w-[390px]" : "max-w-none")}>
            {fini ? <iframe ref={cadreRef} key={cle} title={`Aperçu de ${nom}`} src={lienApercu} onLoad={() => pousserOutil()} className={cx("absolute inset-0 h-full w-full border-0", outil && "ring-2 ring-inset ring-[#E8571C]")} />
              : specEnDirect(app?.brouillon ?? (app?.statut === "pret" ? app?.spec : null)) ? <EnDirect app={app} etape={etape} /> : <Assemblage nom={nom} couleur={couleur} ecrans={ecrans} ecrits={ecrits} etape={etape} />}
            <input ref={fichierImage} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; remplacerImage(f); }} />
            {fini && outil === "image" && imageCible && <div className="absolute left-1/2 top-3 z-20 flex w-[min(560px,calc(100%-24px))] -translate-x-1/2 items-center gap-2 rounded-xl bg-ink/95 p-1.5 shadow-2xl">
              <span className="min-w-0 flex-1 truncate px-2 text-[13px] text-white/80">Remplacer {imageCible}</span>
              <button type="button" onClick={() => { fichierImage.current?.click(); setImageCible(null); }} className="shrink-0 rounded-lg bg-[#E8571C] px-3 py-1.5 text-[12.5px] font-semibold text-white">Choisir ma photo</button>
              <button type="button" onClick={() => { setImageCible(null); imageVisee.current = null; }} aria-label="Annuler" className="shrink-0 px-2 text-white/70 hover:text-white">×</button>
            </div>}
            {fini && outil === "police" && <PanneauPolices polices={polices} essayer={essayerPolice} enregistrer={enregistrerPolice} annuler={() => { setPolices(null); setOutil(null); setCle((k) => k + 1); }} />}
            {fini && element?.chemin && outil === "commenter" && <div className="absolute left-1/2 top-3 z-20 flex w-[min(560px,calc(100%-24px))] -translate-x-1/2 items-center gap-2 rounded-xl bg-ink/95 p-1.5 shadow-2xl">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#E8571C] text-[12px] font-bold text-white">{commentaires.length + 1}</span>
              <input autoFocus value={remarque} onChange={(e) => setRemarque(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") epingler(); if (e.key === "Escape") deselectionner(); }} placeholder={`Ta remarque sur ${element.description.slice(0, 40)}…`} className="min-w-0 flex-1 bg-transparent px-1 text-[13.5px] text-white outline-none placeholder:text-white/45" />
              <button type="button" onClick={epingler} disabled={remarque.trim().length < 2} className="shrink-0 rounded-lg bg-[#E8571C] px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40">Épingler</button>
              <button type="button" onClick={deselectionner} aria-label="Annuler" className="shrink-0 px-2 text-white/70 hover:text-white">×</button>
            </div>}
            {fini && element?.chemin && outil !== "commenter" && <BarreSelection element={element} retoucher={retoucher} fermer={deselectionner}
              editer={() => { try { cadreRef.current?.contentWindow?.postMessage({ type: "bingoo-atelier-editer" }, "*"); } catch (_) { /* rien */ } }}
              demander={() => saisieRef.current?.focus()} />}
            {occupe && <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-[#ECEAE4]"><div className="h-full w-1/3 animate-[barre_1.2s_ease-in-out_infinite] bg-[#E8571C]" /></div>}
            {occupe && fini && <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/45 backdrop-blur-[1.5px]">
              <div className="flex max-w-[86%] items-center gap-3 rounded-2xl bg-ink/90 px-5 py-3.5 text-white shadow-2xl">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#E8571C] pulse-dot" />
                <div className="min-w-0"><p className="text-[14px] font-semibold">Bingoo! applique ta demande</p><p className="truncate text-[12.5px] text-white/65">{modifEtape || "Je lis ta demande…"} · l'aperçu se met à jour tout seul</p></div>
              </div>
            </div>}
          </div>
        </section>
      </div>
    </div>
  );
}
// Barre de l'outil Sélectionner, au-dessus de l'aperçu : retouches directes (gratuites, sans IA) ou demande à Bingoo!
function BarreSelection({ element, retoucher, fermer, editer, demander }) {
  const r = element.retouche ?? {}, ech = r.echelle ?? 1;
  const btn = "grid h-8 min-w-8 shrink-0 place-items-center whitespace-nowrap rounded-lg px-2 text-[12.5px] font-semibold text-white/85 hover:bg-white/10 hover:text-white";
  return (
    <div className="absolute left-1/2 top-3 z-20 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto whitespace-nowrap rounded-xl bg-ink/95 p-1 text-white shadow-2xl ring-1 ring-black/10 [scrollbar-width:none]">
      <span className="hidden max-w-[160px] shrink truncate px-2 text-[12px] text-white/55 2xl:block">{element.description}</span>
      {element.texte && <button type="button" onClick={editer} className={btn} title="Réécrire ce texte sur place">✎ Texte</button>}
      <label className={cx(btn, "cursor-pointer gap-1.5 !flex items-center")} title="Couleur du texte">
        <span className="h-4 w-4 rounded-full ring-2 ring-white/30" style={{ background: r.couleur ?? element.couleur }} />Couleur
        <input type="color" value={r.couleur ?? element.couleur ?? "#111111"} onChange={(e) => retoucher({ couleur: e.target.value })} className="sr-only" />
      </label>
      <label className={cx(btn, "cursor-pointer gap-1.5 !flex items-center")} title="Couleur du fond">
        <span className="h-4 w-4 rounded ring-2 ring-white/30" style={{ background: r.fond ?? element.fond }} />Fond
        <input type="color" value={r.fond ?? element.fond ?? "#ffffff"} onChange={(e) => retoucher({ fond: e.target.value })} className="sr-only" />
      </label>
      <span className="mx-0.5 h-5 w-px bg-white/15" />
      <button type="button" onClick={() => retoucher({ echelle: Math.max(0.5, Math.round((ech - 0.1) * 100) / 100) })} className={btn} title="Plus petit">A−</button>
      <span className="w-11 shrink-0 text-center text-[11.5px] tabular-nums text-white/60">{Math.round(ech * 100)} %</span>
      <button type="button" onClick={() => retoucher({ echelle: Math.min(3, Math.round((ech + 0.1) * 100) / 100) })} className={btn} title="Plus grand">A+</button>
      <button type="button" onClick={() => retoucher({ gras: !r.gras })} className={cx(btn, r.gras && "bg-white/15")} title="Gras"><b>G</b></button>
      <button type="button" onClick={() => retoucher({ cache: !r.cache })} className={cx(btn, r.cache && "bg-white/15")} title="Masquer cet élément">{r.cache ? "Afficher" : "Masquer"}</button>
      {Object.keys(r).length > 0 && <button type="button" onClick={() => retoucher(null)} className={btn} title="Annuler les retouches de cet élément">↺</button>}
      <span className="mx-0.5 h-5 w-px bg-white/15" />
      <button type="button" onClick={demander} className="shrink-0 whitespace-nowrap rounded-lg bg-[#E8571C] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:brightness-110">Demander à Bingoo!</button>
      <button type="button" onClick={fermer} aria-label="Fermer la sélection" className={btn}>×</button>
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
// Construction en direct (façon Bolt) : la page se remplit section par section pendant que Bingoo! l'écrit.
// Site : sections déjà écrites par le moteur + emplacements « en cours d'écriture » ; avant le plan, le brouillon dans le gabarit éditorial.
// SaaS : l'application avec ses données d'exemple, limitée aux écrans déjà écrits, ouverte sur le dernier.
const echap = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const enAttente = (a) => `<section id="${echap(a.id)}" style="padding:96px 24px;border-top:1px solid rgba(0,0,0,.06)"><div style="max-width:1100px;margin:0 auto"><p style="font:600 12px/1 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#E8571C">● Bingoo! écrit cette section</p><p style="margin-top:16px;font:400 24px/1.45 system-ui,sans-serif;color:#9a9eae;max-width:52ch">${echap(a.attente)}</p><div style="margin-top:30px;display:grid;gap:12px"><div style="height:14px;width:72%;border-radius:8px;background:#ecebe6"></div><div style="height:14px;width:56%;border-radius:8px;background:#ecebe6"></div><div style="height:14px;width:64%;border-radius:8px;background:#ecebe6"></div></div></div></section>`;
export function specEnDirect(b) {
  if (!b?.nom) return null;
  const { _modif, _test, ...sp } = b; // eslint-disable-line no-unused-vars
  if (sp.type === "site") {
    const live = sp.site?.page_live;
    if (live?.sections?.some((x) => x.html)) return { spec: { ...sp, site: { ...sp.site, page_live: undefined, page: { sections: live.sections.map((x) => ({ id: x.id, html: x.html || enAttente(x) })), images: live.images ?? {}, nav: live.nav ?? [] } } }, cle: "p" + live.sections.filter((x) => x.html).length, quoi: "site" };
    if ((sp.site?.page?.sections ?? []).length) return { spec: sp, cle: "fin", quoi: "site" };
    return { spec: { ...sp, site: { ...sp.site, gabarit: sp.site?.modele === "portfolio" ? sp.site?.gabarit : "editorial", page: undefined } }, cle: "g", quoi: "site" };
  }
  const faits = (sp.ecrans ?? []).filter((e) => e.code);
  if (!faits.some((e) => !e.public)) return null;
  return { spec: { ...sp, ecrans: faits }, cle: "e" + faits.length, quoi: "saas", ecran: faits.filter((e) => !e.public).at(-1)?.id };
}
function EnDirect({ app, etape }) {
  const src = app?.brouillon ?? (app?.statut === "pret" ? app?.spec : null);
  const d = useMemo(() => specEnDirect(src), [src]);
  // La section qui vient d'arriver (la première nouvelle depuis la dernière lecture), hors premier écran
  const vues = useRef(new Set()), [ancre, setAncre] = useState(null);
  useEffect(() => {
    const ecrites = (src?.site?.page_live?.sections ?? []).filter((x) => x.html).map((x) => x.id);
    const neuves = ecrites.filter((id) => !vues.current.has(id) && id !== "nav");
    ecrites.forEach((id) => vues.current.add(id));
    if (neuves.length) setAncre(neuves[0] === "hero" ? null : neuves[0]);
  }, [src]);
  if (!d) return null;
  const n = (() => { const m = /\((\d+)\/(\d+)\)/.exec(app?.etape ?? ""); return m ? [Number(m[1]), Number(m[2])] : null; })();
  return (
    <div className="absolute inset-0">
      <AppCadre key={d.cle} slug={app.slug} spec={d.spec} version={d.cle} apercu essai={d.quoi === "saas"} ecran={d.ecran} ancre={d.quoi === "site" && d.cle.startsWith("p") ? ancre : null} className="absolute inset-0 h-full w-full border-0" />
      <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-xl">
        <span className="h-2 w-2 rounded-full bg-[#E8571C] pulse-dot" />
        {etape >= 3 ? "Bingoo! teste ta version…" : d.quoi === "site" ? (d.cle === "g" ? "Bingoo! prépare ta page…" : `Bingoo! écrit ta page${n ? ` · ${n[0]}/${n[1]} sections` : ""}`) : `Bingoo! écrit tes écrans${n ? ` · ${n[0]}/${n[1]}` : ""}`}
      </div>
    </div>
  );
}

// Avant que la première version ne s'affiche : un simple état, sans fausse interface dessinée
function Assemblage({ nom, etape }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#FAF9F6] p-6 text-center">
      <div>
        <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-[3px] border-[#ECEAE4] border-t-[#E8571C]" />
        <p className="mt-4 text-[16px] font-semibold">{etape < 1 ? "Bingoo! lit ton idée…" : `Bingoo! écrit ${nom ?? "ta version"}…`}</p>
        <p className="mt-1 text-[13.5px] text-ink-faint">Ta page s'affiche ici dès que les premiers textes sont écrits.</p>
      </div>
    </div>
  );
}
