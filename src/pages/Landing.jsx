import { LANGUES, langueActuelle, choisirLangue } from "../lib/langue";
import { commencer } from "../lib/invite";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { cx } from "../lib/utils";
import { legalReady } from "./Legal";
import ResultatsBingoo from "../components/ResultatsBingoo";
import { Fenetre } from "../components/VitrineAccueil";
import { supabase } from "../lib/supabase";
import { BingooIA } from "../components/VitrineBase";

// Page d'accueil publique de Bingoo! : épurée, et chaque promesse adossée à une preuve.
// Deux preuves seulement : l'application filmée sur un vrai compte, et l'essai en direct sur le site du visiteur.
const URL_ = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const JK = { fontFamily: "'Plus Jakarta Sans', Geist, system-ui, sans-serif" };
const SERIF = { fontFamily: "var(--font-titre)", fontWeight: 800, letterSpacing: "-.03em" };
const scrollTo = (id) => (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
const Check = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
const Arrow = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

const ico = (d) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;
const ICONES = {
  tendance: ico(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>),
  oeil: ico(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  pub: ico(<><path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z" /><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /></>),
  verifie: ico(<><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" /><path d="m9 12 2 2 4-4" /></>),
};
// Menu court, comme les concurrents : 4 liens et un menu « Comparer » ; le reste se découvre en descendant la page
const MENU = [["Réalisations", "#realisations"], ["Comment ça marche", "#comment"], ["Tarifs", "#prix"], ["FAQ", "#faq"]];
const COMPARER = [["Bingoo! ou Wix", "/comparer/wix/"], ["Bingoo! ou Webflow", "/comparer/webflow/"], ["Bingoo! ou Codunk", "/comparer/codunk/"]];

// Nombre de SaaS suivis dans la base Explorer (vue publique), affiché tel quel
function useNbSaas() {
  const [n, setN] = useState(null);
  useEffect(() => {
    fetch(`${URL_}/rest/v1/rpc/saas_compte_public`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" }, body: "{}" })
      .then((r) => r.json()).then((n) => { if (Number(n) > 0) setN(Number(n)); }).catch(() => {});
  }, []);
  return n;
}

function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll(".reveal")];
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

/* ---------- La preuve : l'application filmée sur un vrai compte, en 4 onglets ---------- */
const FAQ = [
  ["Je ne sais pas coder, ça marche quand même ?", "Oui. Tu décris ton idée en une phrase (ou tu colles l'adresse d'un site qui te plaît), et Bingoo! construit tout : les écrans, les comptes de tes clients, les paiements avec ton Stripe, la page de présentation. Tu n'écris pas une ligne de code."],
  ["Qu'est-ce que Bingoo! peut construire ?", "Un logiciel en ligne (SaaS) avec ses comptes clients et ses abonnements, un site web pour ton activité, qui marchent aussi sur téléphone. Les apps mobiles pour l'App Store et Google Play arrivent dans une prochaine version. Si une partie de ton idée ne peut pas marcher telle quelle, Bingoo! te le dit avant de construire et propose une autre façon de faire."],
  ["Je vois quoi avant de payer ?", "Après ton inscription gratuite : l'aperçu de ton idée (son nom, ses écrans, une maquette de l'écran principal) et ce qui sera fait autrement. Tu paies seulement quand tu cliques sur « Construire »."],
  ["Combien ça coûte ?", "Un SaaS ou une app : formule Lancer, 24,99 € par mois sans engagement, ou 19 € par mois à vie pour les 50 premiers membres. Un site web : formule Site, 9,99 € par mois, hébergement compris. Explorer les SaaS et voir l'aperçu de ton idée sont gratuits. Tes clients te paient directement sur ton Stripe : Bingoo! ne prend rien sur tes ventes."],
  ["Ça prend combien de temps ?", "Quelques minutes pour un site, souvent moins d'une heure pour un SaaS : tu regardes Bingoo! écrire chaque écran, le tester comme un vrai client et corriger ce qui ne marche pas. Ensuite tu modifies ce que tu veux dans l'atelier, en une phrase ou d'un double-clic sur un texte."],
  ["« Un site qui te plaît » : c'est légal ?", "Bingoo! reprend l'ambiance d'un site (ses couleurs, ses polices, l'organisation de ses pages), qui ne se protègent pas. Il ne reprend jamais ses textes, ses images, son nom ni son logo : ta version porte ton nom, ton logo et tes propres textes."],
  ["Le SaaS est à moi ?", "Oui. Il est à ton nom (sur ton propre nom de domaine avec l'offre Lancer Pro), et l'argent de tes clients arrive sur ton compte Stripe. Tu peux télécharger son code à tout moment."],
  ["Bingoo! garantit que ça va marcher ?", "Non, et personne ne peut le garantir. Bingoo! construit un produit qui fonctionne et t'aide ensuite à trouver tes premiers clients ; le reste dépend du marché et de ce que tu fais chaque jour."],
  ["D'où viennent les chiffres des SaaS ?", "Les revenus sont vérifiés directement chez l'outil de paiement des SaaS (Stripe et d'autres), via TrustMRR. Le reste vient de leurs pages publiques. Chaque chiffre a sa source sur la fiche."],
  ["Et si j'arrête mon abonnement ?", "Tu arrêtes quand tu veux. Ton SaaS est hébergé par Bingoo! tant que tu es abonné : avant d'arrêter, tu télécharges son code pour l'héberger ailleurs, et Bingoo! te prévient avant toute mise hors ligne."],
];


// Le film de lancement : se lance tout seul (sans le son, règle des navigateurs) dès qu'il est à l'écran, se met en pause quand on le quitte
// Une vidéo qui se lance toute seule (sans le son, règle des navigateurs) dès qu'elle est à l'écran, et se met en pause quand on la quitte
function useLectureAuto(ref) {
  useEffect(() => {
    const v = ref.current; if (!v) return;
    if (!("IntersectionObserver" in window)) { v.play().catch(() => {}); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, [ref]);
}
function FilmAuto() {
  const ref = useRef(null);
  useLectureAuto(ref);
  // Le film de 32 s (sans son) : l'idée, la construction en direct, un site qui te plaît, les SaaS qui marchent
  return (
    <div id="film" className="hero-in fx-halo mx-auto mt-10 sm:mt-12 max-w-[1100px] scroll-mt-24" style={{ animationDelay: ".3s" }}>
      <video ref={ref} src="/film-lancement.mp4?v=8" poster="/film-lancement.jpg?v=6" muted loop playsInline preload="metadata" controls aria-label="Film de présentation de Bingoo! : tu écris ton idée, Bingoo! la construit sous tes yeux (vraie construction accélérée), puis ses SaaS, sites, apps et vidéos" className="w-full block aspect-video rounded-2xl bg-white" />
    </div>
  );
}

// Effets de la page : lumière qui suit la souris sur les écrans, menu qui s'affirme au défilement,
// écran du haut qui se redresse en descendant, rail lumineux qui se remplit le long des 4 étapes
function useEffetsPage() {
  useEffect(() => {
    const doux = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const souris = (e) => { const el = e.target.closest?.(".fx-spot"); if (!el) return; const r = el.getBoundingClientRect(); el.style.setProperty("--mx", `${e.clientX - r.left}px`); el.style.setProperty("--my", `${e.clientY - r.top}px`); };
    let raf = 0;
    const maj = () => {
      raf = 0;
      document.querySelector(".fx-entete")?.classList.toggle("defile", window.scrollY > 12);
      const h = window.innerHeight;
      const t = document.getElementById("fx-incline");
      if (t && !doux) { const r = t.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (h - r.top) / (h * 0.75))); t.style.transform = `perspective(1400px) rotateX(${(1 - p) * 16}deg) scale(${0.94 + p * 0.06})`; }
      const rail = document.getElementById("fx-rail");
      if (rail) { const r = rail.parentElement.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (h * 0.6 - r.top) / r.height)); rail.style.transform = `scaleY(${p})`; }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(maj); };
    window.addEventListener("pointermove", souris, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    maj();
    return () => { window.removeEventListener("pointermove", souris); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
}

// Le point d'entrée (façon Foundable) : un seul encadré pour l'idée OU l'adresse d'un site qui plaît.
// Une adresse → Bingoo! lit ce site point par point (sans IA) et fait ta version, même style, ton nom, ton logo.
// Une idée → Bingoo! la construit écran par écran sous tes yeux. Dans les deux cas : le compte d'abord.
const TYPES_IDEE = [["saas", "Mon SaaS", "M4 6h16v12H4z M4 10h16"], ["site", "Mon site web", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3.5 3 14.5 0 18 M12 3c-3 3.5-3 14.5 0 18"], ["video", "Ma vidéo", "M4 5h16v14H4z M10 9l5 3-5 3z"]];
const EXEMPLES_IDEE = { video: ["Une vidéo pour présenter mon salon de barbier", "Le teaser de l'ouverture de ma boulangerie", "Une pub animée pour mon coaching en ligne"], saas: ["Une app de réservation pour les coiffeurs", "Un CRM simple pour les agents immobiliers", "notion.so"], site: ["Le site de mon salon de coiffure à Lyon", "Un site pour mon activité de plombier", "Le site de ma pizzeria avec les réservations"], app: ["Une app pour suivre mes séances de sport", "Une app de recettes de la semaine", "Une app pour gérer mon budget"] };
const typeDe = (t) => {
  const x = String(t ?? "").toLowerCase();
  if (/\b(vid[ée]os?|motion|clip|teaser|reels?|tiktok|pub anim[ée]e|animation)\b/.test(x)) return "video";
  if (/\b(app|appli|application)s?\b[^.]{0,30}\b(mobile|téléphone|telephone|iphone|android|smartphone)\b|\bapp(li)? (mobile|iphone|android)\b|\bapplication mobile\b/.test(x)) return "app";
  if (/\b(site|sites|page|vitrine|landing|boutique en ligne|e-?shop|portfolio|blog)\b/.test(x) && !/\b(logiciel|saas|plateforme|outil|crm|tableau de bord)\b/.test(x)) return "site";
  return "saas";
};
const estAdresse = (t) => /^(https?:\/\/)?(www\.)?[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(String(t ?? "").trim());

// Le compte, juste avant que Bingoo! commence : e-mail et mot de passe, ou connexion si on a déjà un compte
export function CompteAvant({ quoi, onFini, onRetour, retourTexte = "← Modifier" }) {
  const [mode, setMode] = useState("signup"), [email, setEmail] = useState(""), [mdp, setMdp] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState(null);
  const envoyer = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: mdp, options: { emailRedirectTo: window.location.href.split("#")[0] } });
        if (error) throw error;
        if (!data.session) { setMsg({ ok: true, t: `Compte créé. Clique sur le lien envoyé à ${email.trim()} : tu reviendras ici et Bingoo! commencera tout de suite.` }); return; }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou mot de passe incorrect." : error.message === "Email not confirmed" ? "Confirme d'abord ton adresse : clique sur le lien reçu par e-mail." : error.message);
      }
      onFini();
    } catch (x) { setMsg({ t: /already registered/i.test(x.message) ? "Un compte existe déjà avec cette adresse : connecte-toi." : x.message }); if (/already registered/i.test(x.message)) setMode("login"); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={envoyer} className="hero-in mx-auto w-full max-w-[560px] rounded-[28px] border border-black/[.09] bg-white p-5 sm:p-7 text-left shadow-[0_30px_80px_-24px_rgba(20,20,40,.45)]" style={JK}>
      <p className="text-[12px] font-bold uppercase tracking-[.14em] text-accent">Dernière étape avant de construire</p>
      <p className="mt-1.5 text-[24px] font-bold leading-tight text-[#1E2030]">{mode === "signup" ? "Crée ton compte gratuit" : "Connecte-toi"}</p>
      <p className="mt-1 text-[14.5px] text-[#5B6075]">{quoi}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="text-[13px] font-semibold text-[#3A3F55]">E-mail</span><input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-black/[.12] px-3.5 py-3 text-[15px] outline-none focus:border-[#1E2030]" /></label>
        <label className="block"><span className="text-[13px] font-semibold text-[#3A3F55]">Mot de passe</span><input type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={mdp} onChange={(e) => setMdp(e.target.value)} className="mt-1 w-full rounded-xl border border-black/[.12] px-3.5 py-3 text-[15px] outline-none focus:border-[#1E2030]" /></label>
      </div>
      {mode === "signup" && <p className="mt-1.5 text-[12.5px] text-[#9A9EAE]">8 caractères minimum. Gratuit, sans carte bancaire.</p>}
      {msg && <p className={cx("mt-3 rounded-xl px-3.5 py-2.5 text-[14px]", msg.ok ? "bg-[#EEF8F1] text-[#1F6B3A]" : "bg-[#FDF0EC] text-[#9A3412]")}>{msg.t}</p>}
      <button disabled={busy} className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3.5 text-[16px] font-bold text-white shadow-[0_10px_30px_-12px_rgba(226,85,35,.8)] hover:brightness-110 disabled:opacity-60">{busy ? "Un instant…" : <>{mode === "signup" ? "Créer mon compte et lancer Bingoo!" : "Me connecter et lancer Bingoo!"} <Arrow /></>}</button>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
        <button type="button" onClick={onRetour} className="font-semibold text-[#5B6075] hover:text-[#1E2030]">{retourTexte}</button>
        <button type="button" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMsg(null); }} className="font-semibold text-[#1E2030] hover:underline">{mode === "signup" ? "J'ai déjà un compte" : "Créer un compte"}</button>
      </div>
      {mode === "signup" && legalReady && <p className="mt-3 text-[12px] text-[#9A9EAE]">En créant ton compte, tu acceptes les <a href="#/conditions" className="underline">Conditions</a> et la <a href="#/confidentialite" className="underline">Politique de confidentialité</a>.</p>}
    </form>
  );
}

// L'écran de construction, flouté derrière la carte d'inscription : la personne voit où elle va arriver.
// Rien n'est construit tant que le compte n'existe pas, et l'écran ne prétend pas le contraire.
// Vidéo : un lecteur vertical sombre avec un titre animé
// Derrière l'inscription : une vraie capture de Bingoo! en train de construire (jamais une maquette dessinée)
const FOND_FLOU = { saas: "/accueil/construit-en-cours.jpg", app: "/accueil/construit-en-cours.jpg", site: "/accueil/construit-en-cours.jpg", url: "/accueil/site-lu.jpg", video: null };
function ChantierFlou({ texte, genre, children }) {
  useEffect(() => { const o = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = o; }; }, []);
  return createPortal(
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-white text-left" style={JK} role="dialog" aria-modal="true" aria-label="Crée ton compte pour lancer la construction">
      <style>{`@keyframes flou-shim{0%{background-position:-400px 0}100%{background-position:400px 0}}.flou-sk{background:linear-gradient(90deg,#EEEDEA 0,#F7F6F3 40%,#EEEDEA 80%);background-size:800px 100%;animation:flou-shim 1.6s linear infinite}@media (prefers-reduced-motion: reduce){.flou-sk{animation:none}}`}</style>
      <div aria-hidden className="pointer-events-none select-none absolute inset-0" style={{ filter: "blur(3.5px)", transform: "scale(1.02)", background: "#15171F" }}>
        {FOND_FLOU[genre] !== null && <img src={FOND_FLOU[genre] ?? FOND_FLOU.saas} alt="" className="h-full w-full object-cover object-left-top" />}
      </div>
      <div className="absolute inset-0 bg-[#15171F]/25" aria-hidden />
      <div className="relative z-[1] flex min-h-full items-center justify-center px-4 py-10">{children}</div>
    </div>,
    document.body,
  );
}

// Un clic sur un SaaS de la vitrine remplit l'idée (point de départ à adapter)
// Premiers écrans réels de projets construits par Bingoo! (captures du robot, en visiteur) ; 5e valeur : "site" pour un site vitrine
const VITRINE = [
  ["club-randonnee", "Club Randonnée", "Site d'association", "Le site de mon association de randonnée, avec nos sorties", "site"],
  ["rendezo", "Rendezo", "Réservation en ligne", "Un outil de réservation en ligne pour les indépendants, avec rappel la veille"],
  ["tablio", "Tablio", "Restaurant : tables et commandes", "Un outil pour gérer les réservations de tables et les commandes de mon restaurant"],
  ["velofleet", "VéloFleet", "Location de vélos", "Un logiciel pour gérer ma flotte de vélos électriques en location"],
  ["chantiex", "Chantiex", "Suivi de chantiers", "Un outil pour suivre mes chantiers de rénovation, avec photos, tâches et budget"],
  ["profmaths", "ProfMaths", "Cours particuliers", "Une plateforme pour trouver un prof de maths près de chez soi"],
  ["facturo", "Facturo", "Devis et factures", "Un outil pour faire mes devis, mes factures et mes relances"],
  ["salon-domicile", "Salon à domicile", "Site de coiffeuse", "Le site de mon salon de coiffure à domicile à Lyon", "site"],
  ["menagio", "Ménagio", "Entreprises de ménage", "Un outil pour planifier et prouver les passages de mes agents de ménage"],
  ["coachly", "Coachly", "Coachs sportifs", "Un outil pour gérer mes clients de coaching sportif, leurs séances et leurs paiements"],
  ["coupelune", "Coupelune", "Salons de coiffure", "Une app de réservation pour mon salon de coiffure"],
  ["plombipro", "PlombiPro", "Artisans plombiers", "Un outil pour mes devis, mon planning et mes factures de plombier"],
  ["planilo", "Planilo", "Site d'un logiciel", "Le site de présentation de mon logiciel de réservation pour salons", "site"],
  ["tacheo", "Tachéo", "Sociétés d'entretien", "Un outil pour planifier l'entretien et prouver chaque intervention"],
  ["avisio", "Avisio", "Retours clients", "Un outil pour recueillir et trier les demandes de mes clients"],
];
// Vidéos motion design faites par Bingoo! pour de vrais projets (rendues par le moteur vidéo de Bingoo!), lues en boucle
// Vraies vidéos écrites par Bingoo! (les scénarios viennent du générateur), dans les 4 allures et les 3 formats
// Vraies vidéos écrites par Bingoo! (les scénarios viennent du générateur), dans les 4 allures et les 3 formats
// [fichier, nom, légende, forme] ; deux bandes qui défilent en sens inverse, comme la vitrine des SaaS
const VIDEOS_RANGS = [
  [["pointa", "Pointa", "Logiciel pour cabinets · vidéo produit, vrais écrans"], ["foulee", "Foulée", "Chaussures · style pop"], ["encre", "Encre Noire", "Tatouage · style nuit"], ["vintage", "Vintage Atelier", "Boutique vintage · format carré", "1/1"], ["lame", "Lame", "Barbier · style éditorial"]],
  [["calme", "Calme", "Appli de méditation · style minimal"], ["fournil", "Boulangerie artisanale", "Rennes · style pop"], ["factur", "Factur'Artisan", "Logiciel de facturation · format paysage", "16/9"], ["boxe", "Marseille Boxing Club", "Salle de boxe · style nuit"], ["avocate", "Cabinet d'avocate", "Ouverture · style éditorial"]],
];
// Une vidéo ne tourne que quand elle est à l'écran (les bandes en contiennent vingt)
function VideoCarte({ f, nom, quoi, forme = "9/16", cachee }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current; if (!v || typeof IntersectionObserver === "undefined") return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.2 });
    o.observe(v); return () => o.disconnect();
  }, []);
  return (
    <figure aria-hidden={cachee || undefined} className="shrink-0 overflow-hidden rounded-2xl border border-black/[.08] bg-black shadow-[0_14px_34px_-24px_rgba(20,20,40,.6)]">
      <video ref={ref} poster={`/videos/${f}.jpg`} muted loop playsInline preload="none" style={{ aspectRatio: forme }} className="block h-[300px] sm:h-[400px] w-auto object-cover" aria-label={cachee ? undefined : `Vidéo ${nom}, créée avec Bingoo!`}><source src={`/videos/${f}.mp4`} type="video/mp4" /><source src={`/videos/${f}.webm`} type="video/webm" /></video>
      <figcaption className="flex flex-col gap-0.5 bg-white px-3 py-2"><b className="truncate text-[13.5px] text-[#1E2030]">{nom}</b><span className="truncate text-[12px] text-[#5B6075]">{quoi}</span></figcaption>
    </figure>
  );
}
function VideosVitrine({ nav }) {
  const rangee = (l, sens) => (
    <div className="videos-rang flex w-max gap-4" style={{ animation: `vitrine ${sens > 0 ? 75 : 85}s linear infinite${sens < 0 ? " reverse" : ""}` }}>
      {[...l, ...l].map(([f, nom, quoi, forme], i) => <VideoCarte key={f + i} f={f} nom={nom} quoi={quoi} forme={forme} cachee={i >= l.length} />)}
    </div>
  );
  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden pt-10 pb-6 text-left" aria-label="Vidéos créées avec Bingoo!">
      <style>{"@keyframes vitrine{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media (prefers-reduced-motion:reduce){.videos-rang{animation:none!important}}.videos-bande:hover .videos-rang{animation-play-state:paused}"}</style>
      <p className="text-center text-[13px] font-semibold uppercase tracking-[.16em] text-[#5B6075]" style={JK}>Et des vidéos aussi</p>
      <h2 className="mx-auto mt-2 max-w-[760px] px-4 text-center text-[24px] sm:text-[32px] font-bold leading-tight text-[#1E2030]" style={JK}>Des pubs en motion design, faites par Bingoo!</h2>
      <p className="mx-auto mt-2 max-w-[680px] px-4 text-center text-[15px] text-[#5B6075]" style={JK}>Une phrase suffit : Bingoo! écrit le scénario, l'anime à tes couleurs, et tu la retouches en discutant. Pub de marque ou vidéo de ton SaaS avec ses vrais écrans, en vertical, carré ou paysage.</p>
      <div className="videos-bande mt-7 space-y-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        {rangee(VIDEOS_RANGS[0], 1)}
        {rangee(VIDEOS_RANGS[1], -1)}
      </div>
      <div className="mt-6 text-center"><button type="button" onClick={() => nav?.()} className="rounded-full bg-[#1E2030] px-5 py-2.5 text-[14px] font-semibold text-white hover:brightness-125" style={JK}>Créer ma vidéo →</button></div>
    </section>
  );
}

function Vitrine({ choisir }) {
  const rangee = (l, sens) => (
    <div className="vitrine-rang flex w-max gap-4" style={{ animation: `vitrine ${sens > 0 ? 70 : 80}s linear infinite${sens < 0 ? " reverse" : ""}` }}>
      {[...l, ...l].map(([img, nom, quoi, idee, genre], i) => (
        <button type="button" key={img + i} tabIndex={i >= l.length ? -1 : 0} aria-hidden={i >= l.length} onClick={() => choisir?.(idee, genre ?? "saas")} title={`Partir de ${nom}`} className="group w-[300px] sm:w-[380px] shrink-0 overflow-hidden rounded-2xl border border-black/[.08] bg-white text-left shadow-[0_14px_34px_-24px_rgba(20,20,40,.55)] transition hover:-translate-y-1 hover:shadow-[0_22px_44px_-24px_rgba(20,20,40,.6)]">
          <img src={`/vitrine/${img}.jpg`} alt={`${nom}, construit avec Bingoo!`} loading="lazy" className="aspect-[16/10] w-full object-cover object-top" />
          <span className="flex items-center justify-between gap-2 px-3.5 py-2.5"><b className="text-[14px] text-[#1E2030]">{nom}</b><span className="truncate text-[12.5px] text-[#5B6075] group-hover:hidden">{quoi}</span><span className="hidden text-[12.5px] font-semibold text-[#E8571C] group-hover:inline">Partir de celui-ci →</span></span>
        </button>
      ))}
    </div>
  );
  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden pt-12 pb-4 text-left" aria-label="SaaS construits avec Bingoo!">
      <style>{"@keyframes vitrine{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media (prefers-reduced-motion:reduce){.vitrine-rang{animation:none!important}}.vitrine-bande:hover .vitrine-rang{animation-play-state:paused}"}</style>
      <p className="text-center text-[13px] font-semibold uppercase tracking-[.16em] text-[#5B6075]" style={JK}>Construits avec Bingoo!</p>
      <h2 className="mx-auto mt-2 max-w-[760px] px-4 text-center text-[24px] sm:text-[32px] font-bold leading-tight text-[#1E2030]" style={JK}>De vrais SaaS et sites, en ligne, pour tous les métiers</h2>
      <p className="mx-auto mt-2 max-w-[640px] px-4 text-center text-[15px] text-[#5B6075]" style={JK}>Clique sur celui qui ressemble à ton projet : Bingoo! part de là et l'adapte à toi.</p>
      <div className="vitrine-bande mt-7 space-y-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        {rangee(VITRINE.slice(0, 8), 1)}
        {rangee(VITRINE.slice(8), -1)}
      </div>
    </section>
  );
}


// Les cartes de la vitrine (SaaS, vidéos) remplissent le champ d'idée du haut de page
const remplirIdee = (texte, genre) => window.dispatchEvent(new CustomEvent("bingoo-remplir", { detail: { texte, genre } }));
function IdeeHero({ nav, nb }) {
  const [texte, setTexte] = useState(""), [choix, setChoix] = useState(null), [busy, setBusy] = useState(false), [compte, setCompte] = useState(null);
  // Le genre se lit dans la phrase (« un site… », « une app mobile… ») tant que le membre n'a pas choisi lui-même
  // Apps mobiles en V2 : une idée d'« app » est construite comme un logiciel en ligne, qui marche aussi sur téléphone
  const type = ((t) => (t === "app" ? "saas" : t))(choix ?? typeDe(texte));
  const setType = setChoix;
  const zone = useRef(null);
  const url = estAdresse(texte);
  useEffect(() => {
    const f = (e) => { setTexte(e.detail.texte); setChoix(e.detail.genre); zone.current?.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => zone.current?.focus(), 400); };
    window.addEventListener("bingoo-remplir", f); return () => window.removeEventListener("bingoo-remplir", f);
  }, []);
  const lancer = async (e) => {
    e?.preventDefault();
    const t = texte.trim();
    if (t.length < 4) { zone.current?.focus(); return; }
    if (!/headless/i.test(navigator.userAgent)) compter("idee");
    setBusy(true);
    const vers = url ? "/explorer/copie" : type === "video" ? "/explorer/motion" : "/explorer/idee";
    try {
      if (url) { localStorage.setItem("bingoo-copie", JSON.stringify({ url: t.slice(0, 200), at: Date.now() })); localStorage.removeItem("bingoo-idee"); }
      else { localStorage.setItem("bingoo-idee", JSON.stringify({ texte: t.slice(0, 300), type, at: Date.now() })); localStorage.removeItem("bingoo-copie"); }
      localStorage.removeItem("bingoo-parcours2");
    } catch { /* stockage indisponible */ }
    // L'aperçu d'abord, sans compte (comme Lovable ou Bolt) : le visiteur voit son projet prendre forme tout de suite.
    // Le compte n'est demandé qu'au moment de construire. La vidéo aussi : la première se crée sans compte.
    const { data } = await supabase.auth.getSession();
    setBusy(false);
    if (data.session && !data.session.user?.is_anonymous) { nav(vers); return; }
    nav(vers);
  };
  if (compte) return <ChantierFlou texte={texte.trim()} genre={url ? "url" : type}><CompteAvant quoi={url ? `Bingoo! va lire ${texte.trim().replace(/^https?:\/\//, "").replace(/\/$/, "")} point par point et construire ta version, à ton nom et avec ton logo.` : `Bingoo! va construire « ${texte.trim().slice(0, 80)}${texte.trim().length > 80 ? "…" : ""} » écran par écran, sous tes yeux.`} onRetour={() => setCompte(null)} onFini={() => nav(compte)} /></ChantierFlou>;
  return (<>
    <form onSubmit={lancer} className="hero-in mx-auto mt-8 w-full max-w-[680px] rounded-[28px] border border-black/[.09] bg-white p-3 text-left shadow-[0_24px_60px_-28px_rgba(20,20,40,.35)]" style={{ ...JK, animationDelay: ".18s" }}>
      <label htmlFor="idee" className="sr-only">Ton idée, ou l'adresse d'un site qui te plaît</label>
      <textarea id="idee" ref={zone} value={texte} onChange={(e) => setTexte(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) lancer(e); }} rows={2} maxLength={300} placeholder="Décris ton idée, ou colle l'adresse d'un site qui te plaît…" className="block w-full resize-none bg-transparent px-3 pt-2 text-[16px] sm:text-[17px] sm:min-h-[84px] leading-relaxed outline-none placeholder:text-[#9A9EAE]" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {url ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EEFF] px-3.5 py-2 text-[13.5px] font-semibold text-[#4B2FB8]"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>Adresse d'un site : Bingoo! va le lire et faire ta version</span>
        ) : TYPES_IDEE.map(([k, l, d]) => (
          <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)} className={cx("inline-flex items-center gap-1.5 rounded-full border px-3 sm:px-3.5 py-1.5 sm:py-2 text-[13px] sm:text-[14px] font-semibold transition", type === k ? "border-[#1E2030] bg-[#1E2030] text-white" : "border-black/[.1] bg-white text-[#3A3F55] hover:border-black/25")}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>{l}
          </button>
        ))}
        <button type="submit" disabled={busy} className="w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 sm:py-2.5 text-[15px] font-bold text-white shadow-[0_10px_30px_-12px_rgba(226,85,35,.8)] transition hover:brightness-110 disabled:opacity-60">{busy ? "Un instant…" : <>{url ? "Faire ma version" : "Construire mon idée"} <Arrow /></>}</button>
      </div>
      {url && <p className="mt-2 px-1 text-[12.5px] text-[#5B6075]">Bingoo! relève ses couleurs, ses polices et son organisation, puis construit ta version avec ton nom et ton logo. Jamais leurs textes, leurs images ni leur logo.</p>}
      {!url && type !== "saas" && <p className="mt-2 px-1 text-[12.5px] text-[#5B6075]">{type === "video" ? "20 secondes en motion design, à tes couleurs, avec une musique libre de droits : tu la retouches en discutant et tu la télécharges en vertical, carré ou paysage." : type === "app" ? "Ton app pensée pour le téléphone, à essayer tout de suite dans Expo Go. La publication sur l'App Store et Google Play arrive bientôt." : "Ton site en ligne en quelques minutes : tes services, tes prix, tes horaires et un formulaire de demande."}</p>}
      {!texte && <div className="mt-3 flex flex-wrap gap-1.5 border-t border-black/[.06] px-1 pt-3">{EXEMPLES_IDEE[type].map((x) => <button key={x} type="button" onClick={() => { setTexte(x); zone.current?.focus(); }} className="rounded-full bg-[#F4F4F1] px-3 py-1.5 text-[13px] text-[#5B6075] hover:bg-[#ECECE7]">{x}</button>)}</div>}
    </form>
    <p className="hero-in mt-4 text-[14.5px] text-[#5B6075]" style={{ ...JK, animationDelay: ".24s" }}>Pas d'idée ? <button type="button" onClick={() => nav("/decouvrir")} className="font-semibold text-[#1E2030] underline decoration-black/25 underline-offset-4 hover:decoration-black">Pars des {nb ? (Math.floor(nb / 1000) * 1000).toLocaleString("fr-FR") : "milliers de"} SaaS qui marchent déjà</button></p>
  </>);
}

// Entonnoir sans donnée personnelle : une visite comptée une fois par jour et par navigateur, et chaque idée envoyée
const compter = (etape) => supabase.rpc("entonnoir_compter", { p_etape: etape }).then(() => {}, () => {});
function useVisiteComptee() {
  useEffect(() => {
    if (/bot|crawl|spider|headless/i.test(navigator.userAgent)) return;
    const cle = "bingoo-visite-" + new Date().toISOString().slice(0, 10);
    try { if (localStorage.getItem(cle)) return; localStorage.setItem(cle, "1"); } catch { /* navigation privée : compté quand même */ }
    compter("visite");
  }, []);
}
export default function Landing() {
  const nav = useNavigate();
  useVisiteComptee();
  useReveal();
  useEffetsPage();
  const go = () => commencer(nav);
  const nb = useNbSaas();
  return (
    <div className="min-h-full bg-white text-ink">
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}@keyframes land-in{from{opacity:0;transform:translateY(10px)}}.land-in{animation:land-in .45s ease-out both}@keyframes marquee{to{transform:translateX(-50%)}}.marquee-track{animation:marquee 32s linear infinite}.marquee:hover .marquee-track{animation-play-state:paused}@media (prefers-reduced-motion: reduce){.marquee-track{animation:none;flex-wrap:wrap;width:auto;justify-content:center}}`}</style>

      {/* Menu flottant sombre, en pilule */}
      <header className="fx-entete sticky top-0 z-30 px-3 sm:px-6 pt-3" style={JK}>
        <div className="mx-auto flex h-[60px] max-w-[1180px] items-center justify-between gap-3 rounded-full bg-[#15171F]/95 pl-5 pr-2 text-white shadow-[0_18px_40px_-22px_rgba(0,0,0,.7)] backdrop-blur border border-white/[.06]">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Bingoo!" className="shrink-0"><Logo height={28} inverse /></button>
          <nav className="hidden lg:flex items-center gap-1 text-[14.5px] font-medium whitespace-nowrap">
            {MENU.slice(0, 3).map(([t, href]) => <a key={t} href={href} onClick={scrollTo(href.slice(1))} className="rounded-full px-3.5 py-2 text-white/75 hover:bg-white/10 hover:text-white transition">{t}</a>)}
            <div className="group relative">
              <button type="button" aria-haspopup="true" className="flex items-center gap-1 rounded-full px-3.5 py-2 text-white/75 hover:bg-white/10 hover:text-white transition">Comparer<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="m6 9 6 6 6-6" /></svg></button>
              <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="w-56 rounded-2xl border border-white/10 bg-[#15171F] p-1.5 shadow-2xl">{COMPARER.map(([t, href]) => <a key={href} href={href} className="block rounded-xl px-3 py-2.5 text-[14px] text-white/80 hover:bg-white/10 hover:text-white">{t}</a>)}</div>
              </div>
            </div>
            {MENU.slice(3).map(([t, href]) => <a key={t} href={href} onClick={scrollTo(href.slice(1))} className="rounded-full px-3.5 py-2 text-white/75 hover:bg-white/10 hover:text-white transition">{t}</a>)}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[14px] sm:text-[15px] font-semibold whitespace-nowrap">
            <button onClick={() => nav("/connexion?mode=login")} className="rounded-full px-3 sm:px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition">Se connecter</button>
            <button onClick={go} className="rounded-full bg-white text-[#15171F] px-4 sm:px-5 py-2.5 hover:bg-white/90 transition">Commencer</button>
          </div>
        </div>
      </header>
      <div className="bg-white">

        <div className="px-0 sm:px-8">
          <section className="relative overflow-hidden mx-auto max-w-[1440px] bg-white px-5 sm:px-10 pt-8 sm:pt-24 pb-16 sm:pb-20 text-center">
            <div className="fx-grille" aria-hidden />
            <span className="fx-aurore h-[360px] w-[360px] bg-[#F6A06B] left-[8%] top-[60px]" aria-hidden />
            <span className="fx-aurore h-[320px] w-[320px] bg-[#9B6BFF] right-[8%] top-[140px]" style={{ animationDelay: "-6s" }} aria-hidden />
            <div className="relative z-[1]">
            <h1 className="hero-in relative mx-auto max-w-[1180px]" style={JK}>
              <span className="block text-[32px] sm:text-[50px] lg:text-[66px] leading-[1.1] text-[#3A3F55]" style={{ fontWeight: 500, letterSpacing: "-.01em" }}>Donne ton idée.</span>
              <span className="mt-1 block text-[38px] sm:text-[60px] lg:text-[80px] leading-[1.1] text-[#1E2030]" style={{ fontWeight: 700, letterSpacing: "-.01em" }}>Bingoo! <span className="fx-texte">la construit.</span></span>
            </h1>
            <p className="hero-in mx-auto mt-4 sm:mt-7 max-w-[720px] text-[16px] sm:text-[21px] leading-[1.45] text-[#3A3F55]" style={{ ...JK, animationDelay: ".1s" }}>Ton site ou ton logiciel en ligne en 5 minutes, à ton nom, avec tes premiers clients. Bingoo! le crée sous tes yeux, le teste et s'occupe du reste.</p>
            <IdeeHero nav={nav} nb={nb} />
            <FilmAuto />
          </div>
          </section>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1440px] bg-white">

        {/* Ce que Bingoo! a vraiment construit : les SaaS, puis les vidéos */}
        <div id="realisations" className="scroll-mt-24 border-t border-black/[.07] px-5 sm:px-10">
          <Vitrine choisir={(t, ty) => remplirIdee(t, ty)} />
          <VideosVitrine nav={() => remplirIdee("Une vidéo pour présenter mon activité", "video")} />
        </div>

        {/* Comment ça marche : 3 étapes, montrées sur une vraie construction (Agendo, construit par le robot de Bingoo!) */}
        <section id="comment" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px]">
            <p className="text-[13px] font-semibold uppercase tracking-[.14em] text-accent">Comment ça marche</p>
            <h2 className="mt-3 max-w-[860px] text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Une phrase. Tu regardes Bingoo! construire. Tu mets en ligne.</h2>
            <ol className="relative mt-12 space-y-16 lg:pl-16">
              <span className="fx-rail hidden lg:block" aria-hidden><span id="fx-rail" style={{ transform: "scaleY(0)" }} /></span>
              {[
                ["Décris ton idée", "Un logiciel ou un site, en une phrase : « une app de réservation pour les coiffeurs ». Bingoo! te montre tout de suite son nom, ses écrans et une maquette. Si une partie ne peut pas marcher telle quelle, il te le dit avant de construire.", null],
                ["Bingoo! le construit sous tes yeux", "Écran par écran, en direct : il écrit chaque écran, le teste comme un vrai client, corrige ce qui ne marche pas. Quelques minutes pour un site, souvent moins d'une heure pour un SaaS.", ["/accueil/construit-en-cours.jpg", "Une vraie construction en cours : la page du site « Coupe Chez Vous » s'affiche pendant que Bingoo! l'écrit."]],
                ["Il est en ligne, à ton nom", "Ta page de présentation, les comptes de tes clients, l'abonnement branché à ton Stripe. Ensuite tu changes ce que tu veux dans l'atelier : une phrase, ou un double-clic sur un texte.", ["/accueil/construit-fini.jpg", "Le même logiciel, fini et en ligne : sa page de présentation et son intérieur, avec des données d'exemple."]],
              ].map(([h, d, img], i) => (
                <li key={h} className="relative grid lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.5fr)] gap-6 lg:gap-12 items-center">
                  <div>
                    <span className="grid place-items-center h-9 w-9 rounded-full fx-pastille text-white font-bold tnum lg:absolute lg:-left-16 lg:z-[1] lg:ring-[6px] lg:ring-white">{i + 1}</span>
                    <p className="mt-4 text-[28px] sm:text-[34px] leading-tight text-ink" style={SERIF}>{h}</p>
                    <p className="mt-3 text-[16.5px] leading-relaxed text-ink-soft">{d}</p>
                    {i === 0 && <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => document.getElementById("idee")?.focus(), 500); }} className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-[16px] font-semibold text-white hover:bg-accent-dark transition">Décrire mon idée <Arrow className="h-4 w-4" /></button>}
                  </div>
                  {img ? <figure><div className="fx-halo overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_70px_-40px_rgba(21,23,42,.55)]"><picture><source media="(max-width: 640px)" srcSet={img[0].replace(".jpg", "-tel.jpg")} /><img src={img[0]} alt={img[1]} loading="lazy" className="block w-full" /></picture></div><figcaption className="mt-2.5 text-[13px] text-ink-faint">{img[1]}</figcaption></figure>
                    : <Fenetre titre="Ton idée"><div className="bg-[#FAF9F6] p-6 sm:p-8">
                      <p className="rounded-2xl border border-line bg-white px-4 py-3 text-[16px] text-ink">Une app de réservation pour les coiffeurs</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">{["Planning", "Rendez-vous", "Clients", "Prestations", "Disponibilités", "Réserver en ligne"].map((e, k) => <span key={e} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-[14px] font-semibold"><span className="grid h-5 w-5 place-items-center rounded-full bg-paper text-[11px]">{k + 1}</span>{e}</span>)}</div>
                      <p className="mt-4 text-[13.5px] text-ink-soft">Son nom, ses écrans et une maquette, avant de construire.</p>
                    </div></Fenetre>}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Un site qui te plaît */}
        <section id="copie" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.2fr)]">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[.14em] text-accent">Un site qui te plaît</p>
              <h2 className="mt-3 text-[34px] sm:text-[48px] leading-[1.06] tracking-[-.03em] text-ink" style={SERIF}>Tu as vu un site qui te plaît ? Colle son adresse.</h2>
              <ul className="mt-6 space-y-3 text-[16px] text-ink-soft">
                {["Bingoo! le lit point par point : ses couleurs, ses polices, ses rubriques, ce que c'est", "Tu choisis ton nom et tu ajoutes ton logo", "Bingoo! construit ta version, dans la même ambiance, avec tes propres textes"].map((x) => <li key={x} className="flex gap-2.5"><Check className="h-5 w-5 mt-0.5 shrink-0 text-accent" />{x}</li>)}
              </ul>
              <p className="mt-5 text-[13.5px] text-ink-faint">Jamais leurs textes, leurs images, leur nom ni leur logo.</p>
            </div>
            <figure><div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_70px_-40px_rgba(21,23,42,.55)]"><picture><source media="(max-width: 640px)" srcSet="/accueil/site-lu-tel.jpg" /><img src="/accueil/site-lu.jpg" alt="Ce que Bingoo! relève sur cal.com : type, couleurs, ambiance, rubriques, puis le nom et le logo de ta version." loading="lazy" className="block w-full" /></picture></div><figcaption className="mt-2.5 text-[13px] text-ink-faint">Bingoo! vient de lire cal.com. Il reste à choisir ton nom.</figcaption></figure>
          </div>
        </section>

        {/* Pas d'idée : les SaaS qui marchent */}
        <section id="idees" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.9fr)]">
            <figure className="order-2 lg:order-1"><button onClick={() => nav("/decouvrir")} className="block w-full overflow-hidden rounded-2xl border border-line bg-white text-left shadow-[0_30px_70px_-40px_rgba(21,23,42,.55)] transition hover:-translate-y-0.5"><img src="/accueil/decouvrir.jpg" alt="La page des SaaS qui marchent : Salesforce, Stripe et d'autres, avec leur revenu." loading="lazy" className="block w-full" /></button></figure>
            <div className="order-1 lg:order-2">
              <p className="text-[13px] font-semibold uppercase tracking-[.14em] text-accent">Pas d'idée ?</p>
              <h2 className="mt-3 text-[34px] sm:text-[48px] leading-[1.06] tracking-[-.03em] text-ink" style={SERIF}>Pars de ce qui marche déjà.</h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">{nb ? (Math.floor(nb / 1000) * 1000).toLocaleString("fr-FR") : "Des milliers de"} SaaS et applis mobiles, avec leurs revenus vérifiés, leurs prix et ce qu'il faut pour les refaire. Choisis celui qui te plaît : Bingoo! construit ta version, à ton nom.</p>
              <button onClick={() => nav("/decouvrir")} className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[16px] font-bold text-white hover:bg-black transition">Voir les SaaS qui marchent <Arrow className="h-4 w-4" /></button>
            </div>
          </div>
        </section>

        <ResultatsBingoo className="px-5 sm:px-10 lg:px-20 py-14 border-t border-black/[.07] mx-auto max-w-[1180px]" />

        {/* Ensuite : tes premiers clients */}
        <section id="clients" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px] grid lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.4fr)] gap-10 items-center">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[.14em] text-accent">Ensuite</p>
              <h2 className="mt-3 text-[34px] sm:text-[48px] leading-[1.06] tracking-[-.03em] text-ink" style={SERIF}>En ligne, c'est bien. Avec des clients, c'est mieux.</h2>
              <ul className="mt-6 space-y-3 text-[16px] text-ink-soft">
                {["Les établissements à contacter, trouvés pour toi dans le registre public", "Le message prêt, adressé au dirigeant", "Une étape par jour, chaque matin dans ta boîte mail", "Ta vidéo de présentation et tes posts, faits par Bingoo!"].map((x) => <li key={x} className="flex gap-2.5"><Check className="h-5 w-5 mt-0.5 shrink-0 text-accent" />{x}</li>)}
              </ul>
            </div>
            <figure><div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_70px_-40px_rgba(21,23,42,.55)]"><picture><source media="(max-width: 640px)" srcSet="/accueil/premiers-clients-tel.jpg" /><img src="/accueil/premiers-clients.jpg" alt="Le plan « Premiers clients » d'un vrai site construit par Bingoo! : chaque étape avec son texte prêt à copier." loading="lazy" className="block w-full" /></picture></div><figcaption className="mt-2.5 text-[13px] text-ink-faint">Le plan « Premiers clients » d'un vrai site construit par Bingoo!, avec ses textes prêts à copier.</figcaption></figure>
          </div>
        </section>

        <BingooIA go={go} />

        {/* Prix */}
        <section id="prix" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px]">
            <p className="text-[13px] font-semibold uppercase tracking-[.14em] text-accent">Prix</p>
            <h2 className="mt-3 max-w-[820px] text-[34px] sm:text-[48px] leading-[1.06] tracking-[-.03em] text-ink" style={SERIF}>Gratuit pour voir. Tu paies quand tu construis.</h2>
            {/* Notre promesse face aux outils où chaque correction ratée coûte des crédits */}
            <div className="mt-6 flex max-w-[820px] items-start gap-3 rounded-2xl border border-[#2F7A4D]/25 bg-[#EEF7F1] px-5 py-4">
              <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#2F7A4D] text-[13px] font-bold text-white">✓</span>
              <p className="text-[15px] leading-relaxed text-[#1E3A2A]"><b>Tu ne paies jamais nos erreurs.</b> Bingoo! teste tout ce qu'il construit : un défaut trouvé par le test est corrigé gratuitement. Une modification qui ne te convient pas ? Tu l'annules dans les 48 h et elle t'est rendue. Et changer un texte, une photo, une police ou l'ordre de tes sections ne coûte jamais rien.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ["Gratuit", "0 €", "Pour voir", ["L'aperçu de ton idée : nom, écrans, maquette", "La lecture d'un site qui te plaît", "Les SaaS qui marchent, en aperçu"]],
                ["Site", "9,99 €", "par mois, hébergement compris", ["Ton site en ligne en quelques minutes", "Tes services, tes prix, ton formulaire", "Ton espace pour gérer les demandes"]],
                ["Lancer", "24,99 €", "par mois · 19 € à vie pour les 50 premiers", ["Ton SaaS ou ton app, construit et testé", "Comptes clients et abonnements sur ton Stripe", "L'atelier, tes premiers clients, ta vidéo"]],
              ].map(([t, p, sous, l], k) => (
                <div key={t} className={cx("rounded-3xl border p-6", k === 2 ? "border-ink bg-ink text-white" : "border-line bg-white")}>
                  <p className={cx("text-[14px] font-bold uppercase tracking-wide", k === 2 ? "text-[#F6A06B]" : "text-accent")}>{t}</p>
                  <p className="mt-3 text-[40px] font-bold leading-none tnum" style={JK}>{p}</p>
                  <p className={cx("mt-1.5 text-[13.5px]", k === 2 ? "text-white/70" : "text-ink-soft")}>{sous}</p>
                  <ul className="mt-5 space-y-2.5 text-[15px]">{l.map((x) => <li key={x} className="flex gap-2"><Check className={cx("h-4 w-4 mt-1 shrink-0", k === 2 ? "text-[#F6A06B]" : "text-accent")} />{x}</li>)}</ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[13.5px] text-ink-faint">Sans engagement. Tes clients te paient directement sur ton Stripe : Bingoo! ne prend rien sur tes ventes.</p>
          </div>
        </section>

        {/* Questions */}
        <section id="faq" className="bg-white border-y border-line scroll-mt-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
            <h2 className="text-[36px] sm:text-[46px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Questions fréquentes</h2>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group py-5">
                  <summary className="cursor-pointer list-none flex justify-between gap-4 font-semibold text-[17px]">{q}<span className="text-accent group-open:rotate-45 transition text-[24px] leading-none">+</span></summary>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden px-4 sm:px-6 py-24 text-center">
          <div className="fx-grille" style={{ WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 50% 50%, #000 25%, transparent 75%)", maskImage: "radial-gradient(ellipse 60% 70% at 50% 50%, #000 25%, transparent 75%)" }} aria-hidden />
          <span className="fx-aurore h-[300px] w-[300px] bg-[#F6A06B] left-[18%] top-[40px]" aria-hidden />
          <span className="fx-aurore h-[280px] w-[280px] bg-[#9B6BFF] right-[18%] top-[120px]" style={{ animationDelay: "-5s" }} aria-hidden />
          <div className="relative z-[1] max-w-4xl mx-auto">
          <p className="text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Ton idée mérite d'exister.</p>
          <p className="mt-4 text-[18px] text-ink-soft">Écris-la en une phrase : Bingoo! te montre ce qu'il va construire, gratuitement.</p>
          <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => document.getElementById("idee")?.focus(), 500); }} className="fx-brille mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-10 py-4 text-[18px] font-bold text-white hover:bg-accent-dark transition">Décrire mon idée <Arrow className="h-4 w-4" /></button>
          </div>
        </section>
        </div>
      </main>

      <footer className="bg-white">
        <div className="fx-filet" aria-hidden />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-2 md:grid-cols-3 gap-8 text-[15px]">
          <div><p className="font-bold">Produit</p><ul className="mt-3 space-y-0.5 text-ink-soft [&_a]:inline-block [&_a]:py-1.5 [&_button]:py-1.5">{[["comment", "Comment ça marche"], ["copie", "Un site qui te plaît"], ["idees", "Les SaaS qui marchent"], ["prix", "Prix"]].map(([id, l]) => <li key={id}><a href={`#${id}`} onClick={scrollTo(id)} className="hover:text-ink">{l}</a></li>)}</ul></div>
          <div><p className="font-bold">Les SaaS</p><ul className="mt-3 space-y-0.5 text-ink-soft [&_a]:inline-block [&_a]:py-1.5 [&_button]:py-1.5"><li><a href="/comparer/codunk/" className="hover:text-ink">Bingoo! ou Codunk</a></li><li><a href="/comparer/wix/" className="hover:text-ink">Bingoo! ou Wix</a></li><li><a href="/comparer/webflow/" className="hover:text-ink">Bingoo! ou Webflow</a></li><li><a href="/saas" className="hover:text-ink">Tous les SaaS suivis : prix et alternatives</a></li><li><a href="#faq" onClick={scrollTo("faq")} className="hover:text-ink">Questions fréquentes</a></li><li><a href={`mailto:bingoo@maisonravita.fr?subject=${encodeURIComponent("Corriger ou retirer une fiche")}`} title="Écris-nous depuis une adresse de ton domaine : correction ou retrait sous 72 heures." className="hover:text-ink">Corriger ou retirer une fiche</a></li></ul></div>
          <div><p className="font-bold">Compte et légal</p><ul className="mt-3 space-y-0.5 text-ink-soft [&_a]:inline-block [&_a]:py-1.5 [&_button]:py-1.5"><li><button onClick={() => nav("/connexion?mode=login")} className="hover:text-ink">Connexion</button></li><li><button onClick={go} className="hover:text-ink">Créer un compte</button></li>{legalReady && <><li><a href="#/mentions-legales" className="hover:text-ink">Mentions légales</a></li><li><a href="#/confidentialite" className="hover:text-ink">Confidentialité</a></li><li><a href="#/conditions" className="hover:text-ink">Conditions</a></li></>}<li><a href="#/opposition" className="hover:text-ink">Ne plus être contacté</a></li></ul></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
          <Logo height={34} />
          <label className="flex items-center gap-2 text-[13.5px] text-ink-soft"><select aria-label="Langue du site" value={langueActuelle()} onChange={(e) => choisirLangue(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1">{LANGUES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></label>
          <p className="text-[13.5px] text-ink-faint">© {new Date().getFullYear()} Bingoo! · Donne ton idée, Bingoo! la construit</p>
        </div>
      </footer>
    </div>
  );
}
