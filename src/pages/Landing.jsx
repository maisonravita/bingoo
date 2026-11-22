import { LANGUES, langueActuelle, choisirLangue } from "../lib/langue";
import { commencer } from "../lib/invite";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { cx } from "../lib/utils";
import { legalReady } from "./Legal";
import ResultatsBingoo from "../components/ResultatsBingoo";
import { Fenetre, ApercuTendance, ApercuVersion, ApercuProspects, ApercuSemaine } from "../components/VitrineAccueil";
import { supabase } from "../lib/supabase";
import { BaseSaaS, BingooIA } from "../components/VitrineBase";

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
const MENU = [["La base", "#base"], ["Comment ça marche", "#comment"], ["Dans ton IA", "#ia"], ["Tes clients", "#clients"], ["Questions", "#faq"]];

// Nombre de SaaS suivis dans la base Explorer (vue publique), affiché tel quel
function useNbSaas() {
  const [n, setN] = useState(null);
  useEffect(() => {
    fetch(`${URL_}/rest/v1/rpc/saas_stats_entete`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" }, body: "{}" })
      .then((r) => r.json()).then((d) => { if (d?.total) setN(Number(d.total) + Number(d.applis ?? 0)); }).catch(() => {});
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
  ["Je ne sais pas coder, ça marche quand même ?", "Oui. Tu réponds à quelques questions, tu choisis ton SaaS, et Bingoo! construit ta version : le site, les comptes de tes clients, l'abonnement avec ton Stripe. Tu n'écris pas une ligne de code."],
  ["Le SaaS est à moi ?", "Oui. Il est à ton nom et sur ton domaine, et l'argent de tes clients arrive directement sur ton compte Stripe : Bingoo! ne prend rien sur tes ventes. Tu peux télécharger son code à tout moment."],
  ["En combien de temps ma version est en ligne ?", "Souvent en une journée. Si elle n'est pas en ligne dans les 14 jours qui suivent ton paiement, tu es remboursé."],
  ["Combien ça coûte ?", "Explorer les SaaS est gratuit, avec les revenus masqués. L'offre Trouver débloque tous les chiffres pour 9,99 € HT par mois, sans engagement. L'offre Lancer, qui construit en plus ta version, coûte 24,99 € HT par mois sans engagement, 16,99 € par mois sur 3 mois ou 9,99 € par mois sur 12 mois. Tes clients te paient directement sur ton Stripe : Bingoo! ne prend rien sur tes ventes."],
  ["Qu'est-ce que je vois avant de payer ?", "Tu réponds aux questions sans compte, et tu vois en direct combien de SaaS vérifiés collent à ton profil, leur revenu médian et combien sont en tendance. Les SaaS eux-mêmes, leurs chiffres et ta version se débloquent ensuite, sans engagement."],
  ["Bingoo! garantit que mon SaaS va marcher ?", "Non, et personne ne peut le garantir. Bingoo! garantit une chose : ta version en ligne sous 14 jours, ou remboursé. Ensuite, Bingoo! te donne des SaaS qui ont fait leurs preuves, un plan et des contacts ; trouver des clients dépend du marché et de ce que tu fais chaque jour."],
  ["Combien je vais gagner ?", "Personne ne peut te le promettre, et Bingoo! ne le fait pas. Ce qu'il fait : te faire partir de SaaS qui encaissent déjà (revenus vérifiés chez leur outil de paiement), construire ta version, et te donner chaque jour quoi faire pour trouver tes 10 premiers clients. Le reste dépend de toi."],
  ["Comment Bingoo! trouve mes premiers clients ?", "Pour ta version, il cherche dans le registre public des entreprises les établissements de ton département qui ont le problème (par exemple 50 salons de coiffure à Paris), te prépare le message à envoyer et suit avec toi qui a répondu, qui essaie, qui paie. Tu envoies toi-même, depuis ton adresse."],
  ["D'où viennent les chiffres ?", "Les revenus sont vérifiés directement chez l'outil de paiement des SaaS (Stripe et d'autres), via TrustMRR. La visibilité, les canaux et la pub viennent de leurs propres déclarations et de sources publiques. Chaque chiffre a sa source sur la fiche."],
  ["Faire ma version d'un SaaS, c'est légal ?", "Faire la même chose qu'un autre, oui : c'est la concurrence. Bingoo! construit ta version avec ton nom, tes textes et ton design, et souvent un angle à toi (en français, pour un métier, plus simple). Reprendre la marque, les textes mot pour mot ou le design d'un autre, non."],
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
function VideoAuto({ src, poster }) {
  const ref = useRef(null);
  useLectureAuto(ref);
  return <div className="fx-halo"><video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" controls className="block w-full rounded-2xl bg-white" /></div>;
}
function FilmAuto() {
  const ref = useRef(null);
  const [son, setSon] = useState(false);
  useLectureAuto(ref);
  const basculer = () => { const v = ref.current; if (!v) return; v.muted = !v.muted; setSon(!v.muted); if (!v.muted) v.play().catch(() => {}); };
  return (
    <div id="film" className="hero-in fx-halo mx-auto mt-10 sm:mt-12 max-w-[1100px] scroll-mt-24" style={{ animationDelay: ".3s" }}>
      <video ref={ref} src="/film-lancement.mp4?v=3" poster="/film-lancement.jpg?v=3" muted loop playsInline preload="metadata" controls className="w-full block aspect-video rounded-2xl bg-white" />
      <button onClick={basculer} className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full bg-black/60 px-3.5 py-2 text-[13px] font-semibold text-white backdrop-blur hover:bg-black/75 transition"><span className="inline-flex items-center gap-1.5"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 10v4h4l5 4V6L8 10H4z" />{son ? <path d="M17 9a4 4 0 0 1 0 6" /> : <path d="m17 9 4 6M21 9l-4 6" />}</svg>{son ? "Couper le son" : "Mettre le son"}</span></button>
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
const TYPES_IDEE = [["saas", "Mon SaaS", "M4 6h16v12H4z M4 10h16"], ["site", "Mon site web", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3.5 3 14.5 0 18 M12 3c-3 3.5-3 14.5 0 18"], ["app", "Mon app mobile", "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M11 18h2"]];
const EXEMPLES_IDEE = { saas: ["Une app de réservation pour les coiffeurs", "Un CRM simple pour les agents immobiliers", "notion.so"], site: ["Le site de mon salon de coiffure à Lyon", "Un site pour mon activité de plombier", "Le site de ma pizzeria avec les réservations"], app: ["Une app pour suivre mes séances de sport", "Une app de recettes de la semaine", "Une app pour gérer mon budget"] };
const typeDe = (t) => {
  const x = String(t ?? "").toLowerCase();
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
const ETAPES_FLOU = {
  saas: ["Concevoir les données et les écrans", "Écrire chaque écran", "Tester comme un vrai utilisateur", "Mettre en ligne à ton nom"],
  site: ["Écrire tes textes", "Composer ta page d'accueil", "Préparer ton espace gérant", "Mettre en ligne à ton nom"],
  app: ["Concevoir les onglets de l'app", "Écrire chaque écran", "Tester sur téléphone", "Préparer l'essai dans Expo Go"],
  url: ["Lire le site point par point", "Relever couleurs, polices et rubriques", "Construire ta version écran par écran", "Mettre en ligne à ton nom"],
};
// Ce qui se dessine derrière : un logiciel (menu et contenu), une page de site, ou un téléphone
const Sk = ({ c = "", w }) => <div className={cx("flou-sk rounded", c)} style={w ? { width: w } : null} />;
function ApercuLogiciel({ sombre }) {
  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-black/[.08] bg-white">
      <div className="w-44 shrink-0 space-y-3 p-4" style={{ background: sombre }}>{Array.from({ length: 7 }, (_, i) => <div key={i} className="h-3 rounded bg-white/15" style={{ width: `${60 + (i * 13) % 35}%` }} />)}</div>
      <div className="min-w-0 flex-1 space-y-4 p-6">
        <Sk c="h-6" w="14rem" />
        <div className="grid grid-cols-4 gap-3">{Array.from({ length: 8 }, (_, i) => <div key={i} className="space-y-2 rounded-xl border border-black/[.06] p-3"><Sk c="h-16 rounded-lg" /><Sk c="h-3" w="70%" /></div>)}</div>
        <div className="grid grid-cols-[2fr_1fr] gap-3"><div className="rounded-xl border border-black/[.06] p-4"><Sk c="h-32 rounded-lg" /></div><div className="space-y-2 rounded-xl border border-black/[.06] p-4">{[0, 1, 2, 3].map((i) => <Sk key={i} c="h-4" />)}</div></div>
      </div>
    </div>
  );
}
function ApercuSite() {
  return (
    <div className="h-full overflow-hidden rounded-2xl border border-black/[.08] bg-white">
      <div className="flex items-center gap-1.5 border-b border-black/[.06] px-4 py-2.5"><span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" /><Sk c="ml-3 h-4" w="12rem" /></div>
      <div className="flex items-center justify-between px-8 py-4"><Sk c="h-5" w="7rem" /><div className="flex gap-4">{[0, 1, 2].map((i) => <Sk key={i} c="h-3" w="4rem" />)}</div><div className="h-8 w-28 rounded-full bg-accent/70" /></div>
      <div className="grid grid-cols-2 items-center gap-8 px-8 py-8"><div className="space-y-3"><Sk c="h-9" /><Sk c="h-9" w="80%" /><Sk c="h-4" w="90%" /><Sk c="h-4" w="70%" /><div className="h-10 w-40 rounded-full bg-accent/70" /></div><Sk c="h-56 rounded-2xl" /></div>
      <div className="grid grid-cols-3 gap-4 px-8">{[0, 1, 2].map((i) => <div key={i} className="space-y-2 rounded-xl border border-black/[.06] p-4"><Sk c="h-24 rounded-lg" /><Sk c="h-4" w="60%" /><Sk c="h-3" w="40%" /></div>)}</div>
    </div>
  );
}
function ApercuApp() {
  return (
    <div className="flex h-full items-center justify-center gap-8">
      {[0, 1].map((k) => (
        <div key={k} className={cx("w-[250px] rounded-[2.4rem] bg-[#15161A] p-2.5", k && "hidden lg:block opacity-80")}>
          <div className="space-y-3 rounded-[2rem] bg-[#FAFAF8] p-4" style={{ minHeight: 480 }}>
            <Sk c="h-3" w="40%" /><Sk c="h-7" w="75%" /><Sk c="h-28 rounded-2xl" />
            {[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-2"><Sk c="h-9 w-9 rounded-xl" /><Sk c="h-3 flex-1" /></div>)}
            <div className="grid grid-cols-4 gap-2 pt-6">{[0, 1, 2, 3].map((i) => <div key={i} className={cx("mx-auto h-5 w-5 rounded-md", i ? "bg-[#D9D7D0]" : "bg-accent/70")} />)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
function ChantierFlou({ texte, genre, children }) {
  const etapes = ETAPES_FLOU[genre] ?? ETAPES_FLOU.saas;
  const sombre = "#15171F";
  useEffect(() => { const o = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = o; }; }, []);
  return createPortal(
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-white text-left" style={JK} role="dialog" aria-modal="true" aria-label="Crée ton compte pour lancer la construction">
      <style>{`@keyframes flou-shim{0%{background-position:-400px 0}100%{background-position:400px 0}}.flou-sk{background:linear-gradient(90deg,#EEEDEA 0,#F7F6F3 40%,#EEEDEA 80%);background-size:800px 100%;animation:flou-shim 1.6s linear infinite}@media (prefers-reduced-motion: reduce){.flou-sk{animation:none}}`}</style>
      <div aria-hidden className="pointer-events-none select-none absolute inset-0 flex flex-col" style={{ filter: "blur(3.5px)", transform: "scale(1.01)" }}>
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-black/[.07] px-4"><Logo height={22} /><span className="h-6 w-6 rounded-md bg-accent" /><span className="text-[15px] font-bold text-[#1E2030]">Ta version</span><span className="rounded-full bg-[#FDECD8] px-2.5 py-0.5 text-[12px] font-semibold text-[#C2410C]">Construction</span></div>
        <div className="flex min-h-0 flex-1">
          <div className="hidden w-[400px] shrink-0 flex-col gap-4 border-r border-black/[.07] p-5 md:flex">
            <p className="ml-auto max-w-[85%] rounded-2xl bg-[#F1F0EC] px-4 py-2.5 text-[14px] text-[#1E2030]">{texte}</p>
            <p className="text-[14px] leading-relaxed text-[#3A3F55]"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">B</span>Dès que ton compte est créé, je m'y mets écran par écran, sous tes yeux.</p>
            <div className="rounded-xl border border-black/[.08] p-4"><p className="text-[13px] font-bold text-[#1E2030]">Construction</p><div className="mt-2 h-1.5 rounded-full bg-[#EEEDEA]"><div className="h-full w-[6%] rounded-full bg-accent" /></div>
              <ul className="mt-3 space-y-2.5">{etapes.map((e, i) => <li key={e} className="flex items-center gap-2.5 text-[13.5px] text-[#3A3F55]">{i === 0 ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#EEEDEA] border-t-accent" /> : <span className="h-4 w-4 rounded-full border-2 border-[#EEEDEA]" />}{e}</li>)}</ul></div>
          </div>
          <div className="min-w-0 flex-1 p-4 sm:p-6">{genre === "app" ? <ApercuApp /> : genre === "site" || genre === "url" ? <ApercuSite /> : <ApercuLogiciel sombre={sombre} />}</div>
        </div>
      </div>
      <div className="absolute inset-0 bg-[#15171F]/25" aria-hidden />
      <div className="relative z-[1] flex min-h-full items-center justify-center px-4 py-10">{children}</div>
    </div>,
    document.body,
  );
}

function IdeeHero({ nav }) {
  const [texte, setTexte] = useState(""), [choix, setChoix] = useState(null), [busy, setBusy] = useState(false), [compte, setCompte] = useState(null);
  // Le genre se lit dans la phrase (« un site… », « une app mobile… ») tant que le membre n'a pas choisi lui-même
  const type = choix ?? typeDe(texte);
  const setType = setChoix;
  const zone = useRef(null);
  const url = estAdresse(texte);
  const lancer = async (e) => {
    e?.preventDefault();
    const t = texte.trim();
    if (t.length < 4) { zone.current?.focus(); return; }
    setBusy(true);
    const vers = url ? "/explorer/copie" : "/explorer/idee";
    try {
      if (url) { localStorage.setItem("bingoo-copie", JSON.stringify({ url: t.slice(0, 200), at: Date.now() })); localStorage.removeItem("bingoo-idee"); }
      else { localStorage.setItem("bingoo-idee", JSON.stringify({ texte: t.slice(0, 300), type, at: Date.now() })); localStorage.removeItem("bingoo-copie"); }
      localStorage.removeItem("bingoo-parcours2");
    } catch { /* stockage indisponible */ }
    // Le compte d'abord : Bingoo! ne commence à construire qu'une fois le compte créé
    const { data } = await supabase.auth.getSession();
    setBusy(false);
    if (data.session && !data.session.user?.is_anonymous) { nav(vers); return; }
    setCompte(vers);
  };
  if (compte) return <ChantierFlou texte={texte.trim()} genre={url ? "url" : type}><CompteAvant quoi={url ? `Bingoo! va lire ${texte.trim().replace(/^https?:\/\//, "").replace(/\/$/, "")} point par point et construire ta version, à ton nom et avec ton logo.` : `Bingoo! va construire « ${texte.trim().slice(0, 80)}${texte.trim().length > 80 ? "…" : ""} » écran par écran, sous tes yeux.`} onRetour={() => setCompte(null)} onFini={() => nav(compte)} /></ChantierFlou>;
  return (
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
      {!url && type !== "saas" && <p className="mt-2 px-1 text-[12.5px] text-[#5B6075]">{type === "app" ? "Ton app pensée pour le téléphone, à essayer tout de suite dans Expo Go. La publication sur l'App Store et Google Play arrive bientôt." : "Ton site en ligne en quelques minutes : tes services, tes prix, tes horaires et un formulaire de demande."}</p>}
      {!texte && <div className="mt-3 flex flex-wrap gap-1.5 border-t border-black/[.06] px-1 pt-3">{EXEMPLES_IDEE[type].map((x) => <button key={x} type="button" onClick={() => { setTexte(x); zone.current?.focus(); }} className="rounded-full bg-[#F4F4F1] px-3 py-1.5 text-[13px] text-[#5B6075] hover:bg-[#ECECE7]">{x}</button>)}</div>}
    </form>
  );
}

export default function Landing() {
  // Le compteur de la démonstration est le vrai : SaaS vérifiés que Bingoo! sait construire, et ceux qui sont en tendance
  const [demo, setDemo] = useState(null);
  useEffect(() => { supabase.rpc("saas_pour_moi_apercu", { p: {} }).then(({ data }) => setDemo(data ?? null)); }, []);
  const nav = useNavigate();
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
            {MENU.map(([t, href]) => <a key={t} href={href} onClick={scrollTo(href.slice(1))} className="rounded-full px-3.5 py-2 text-white/75 hover:bg-white/10 hover:text-white transition">{t}</a>)}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[14px] sm:text-[15px] font-semibold whitespace-nowrap">
            <button onClick={() => nav("/connexion?mode=login")} className="rounded-full px-3 sm:px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 transition">Se connecter</button>
            <button onClick={go} className="rounded-full bg-white text-[#15171F] px-4 sm:px-5 py-2.5 hover:bg-white/90 transition"><span className="sm:hidden">Commencer</span><span className="hidden sm:inline">Commencer gratuitement</span></button>
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
              <span className="mt-4 sm:mt-6 hidden sm:flex justify-center"><span className="sr-only">Bingoo!</span><Logo height="clamp(64px, 9vw, 112px)" className="!self-center" /></span>
            </h1>
            <p className="hero-in mx-auto mt-4 sm:mt-7 max-w-[720px] text-[16px] sm:text-[21px] leading-[1.45] text-[#3A3F55]" style={{ ...JK, animationDelay: ".1s" }}>Ton SaaS, ton site ou ton app : Bingoo! le crée écran par écran sous tes yeux, le teste et le met en ligne à ton nom.</p>
            <IdeeHero nav={nav} />
            <button onClick={() => nav("/decouvrir")} className="hero-in group mx-auto mt-6 flex max-w-[680px] w-full items-center gap-4 rounded-2xl border border-black/[.08] bg-[#FAFAF7] px-5 py-4 text-left transition hover:border-black/20 hover:bg-white" style={{ ...JK, animationDelay: ".26s" }}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#1E2030] text-[20px] text-white">✦</span>
              <span className="min-w-0 flex-1"><span className="block text-[16px] font-bold text-[#1E2030]">Pas d'idée ? Découvre les {nb ? `${Math.floor(nb / 1000)}K` : "milliers de"} SaaS et applis mobiles qui marchent déjà</span><span className="block text-[14px] text-[#5B6075]">Choisis celui qui te plaît : Bingoo! construit ta version, à ton nom.</span></span>
              <span className="shrink-0 text-[#1E2030] transition group-hover:translate-x-1"><Arrow className="h-5 w-5" /></span>
            </button>
            <p className="mt-6 text-[12.5px] text-ink-faint">Aucun revenu n'est garanti : tu pars de SaaS qui encaissent déjà, et Bingoo! t'aide à faire pareil.</p>
            <p className="mt-6 text-[13.5px] text-ink-faint">En continuant, j'accepte les <a href="#/conditions" className="underline hover:text-ink">Conditions d'utilisation</a> et la <a href="#/confidentialite" className="underline hover:text-ink">Politique de confidentialité</a> de Bingoo!.</p>
            <FilmAuto />
            <figure className="hero-in mx-auto mt-12 max-w-[1100px]" style={{ animationDelay: ".35s" }}>
              <div id="fx-incline" style={{ transformOrigin: "50% 0%", willChange: "transform" }}><ApercuTendance /></div>
              <figcaption className="mt-2.5 text-[13px] text-ink-faint">Le résultat après les questions. Vrais SaaS, revenus vérifiés relevés en novembre 2026.</figcaption>
            </figure>
          </div>
          </section>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1440px] bg-white">

        {/* Bingoo! en 30 secondes : la vidéo verticale (format TikTok / Reels) */}
        <section id="video-30s" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-20 border-t border-black/[.07]">
          <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[1fr_380px] lg:gap-16">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[.14em] text-accent">En 30 secondes</p>
              <h2 className="mt-3 max-w-[620px] text-[34px] sm:text-[48px] leading-[1.06] tracking-[-.03em] text-ink" style={SERIF}>Pas d'idée géniale. Pas de code. Juste un SaaS qui marche.</h2>
              <ul className="mt-7 space-y-3 text-[17px] text-[#3A3F55]">
                {["Tu choisis un SaaS qui encaisse déjà, avec ses vrais chiffres", "Bingoo! construit ta version : site, comptes clients, paiements", "Puis il t'aide à trouver tes premiers clients, chaque matin"].map((x) => <li key={x} className="flex items-start gap-2.5"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />{x}</li>)}
              </ul>
              <button onClick={go} className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[16px] font-bold text-white hover:bg-black transition">Commencer</button>
            </div>
            <div className="mx-auto w-full max-w-[340px] lg:max-w-none">
              <div className="rounded-[2.2rem] bg-[#111] p-2.5 shadow-[0_30px_80px_-30px_rgba(20,20,40,.55)]"><div className="overflow-hidden rounded-[1.8rem]"><VideoAuto src="/bingoo-30s.mp4" poster="/bingoo-30s.jpg" /></div></div>
            </div>
          </div>
        </section>

        {/* La preuve : ce qu'encaissent les SaaS lancés avec Bingoo! (s'affiche dès 3 SaaS avec des clients payants) */}
        <BaseSaaS go={go} nb={nb} />

        <ResultatsBingoo className="px-5 sm:px-10 lg:px-20 py-14 border-t border-black/[.07] mx-auto max-w-[1180px]" />

        {/* 1. Comment ça marche : 4 étapes, chacune montrée dans la vraie application */}
        <section id="comment" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="max-w-[900px] text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>De « je ne sais pas quoi lancer » à tes premiers paiements.</h2>
            <ol className="relative mt-12 space-y-16 lg:pl-16">
              <span className="fx-rail hidden lg:block" aria-hidden><span id="fx-rail" style={{ transform: "scaleY(0)" }} /></span>
              {[
                ["Réponds à quelques questions", "Ton continent, le revenu que tu vises, à qui tu veux vendre, ton temps, comment tu veux trouver tes clients et les secteurs qui t'attirent. Pendant que tu réponds, tu vois combien de SaaS vérifiés collent déjà à tes réponses.", null],
                ["Tes 3 SaaS en tendance", "Des SaaS qui encaissent déjà, revenus vérifiés chez leur outil de paiement, dont le revenu monte en ce moment. Pour chacun, sa tendance, sa visibilité et ta version : en français, pour un métier, ou plus simple.", "version"],
                ["Bingoo! construit ta version, ou ton IA avec lui", "En un clic, Bingoo! construit ton site, les comptes de tes clients, l'abonnement avec ton Stripe, ton domaine. À ton nom, avec tes mots et ton design. Tu utilises Claude, ChatGPT, Le Chat, Gemini ou Perplexity ? Branche-le à Bingoo! et construis ta version avec lui, écran par écran, sans limite : Bingoo! l'héberge et la met en ligne.", "video"],
                ["Ton plan pour tes 10 premiers clients", "Bingoo! trouve les établissements qui ont le problème dans ton département, te prépare le message, et t'envoie chaque matin l'étape du jour. Les trouver, c'est Bingoo! ; les convaincre, c'est toi.", "prospects"],
              ].map(([h, d, img], i) => (
                <li key={h} className="relative grid lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.5fr)] gap-6 lg:gap-12 items-center">
                  <div>
                    <span className="grid place-items-center h-9 w-9 rounded-full fx-pastille text-white font-bold tnum lg:absolute lg:-left-16 lg:z-[1] lg:ring-[6px] lg:ring-white">{i + 1}</span>
                    <p className="mt-4 text-[28px] sm:text-[34px] leading-tight text-ink" style={SERIF}>{h}</p>
                    <p className="mt-3 text-[16.5px] leading-relaxed text-ink-soft">{d}</p>
                    {i === 0 && <button onClick={go} className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-[16px] font-semibold text-white hover:bg-accent-dark transition">Commencer <Arrow className="h-4 w-4" /></button>}
                  </div>
                  {img === "video" ? (
                    <figure><VideoAuto src="/demo-copie.mp4" poster="/demo-copie.jpg" /><figcaption className="mt-2.5 text-[13px] text-ink-faint">Un vrai SaaS construit par Bingoo! (prise de rendez-vous), avec ses données d'exemple. 35 secondes.</figcaption></figure>
                  ) : img ? (
                    <figure>{img === "version" ? <ApercuVersion /> : <ApercuProspects />}<figcaption className="mt-2.5 text-[13px] text-ink-faint">{img === "version" ? "Ta version, à partir d'un SaaS qui encaisse déjà." : "Aperçu avec des établissements d'exemple."}</figcaption></figure>
                  ) : (
                    <Fenetre titre="Trouver mon SaaS"><div className="bg-[#FAF9F6] p-6 sm:p-8">
                      <div className="mb-4 flex gap-1.5" aria-hidden>{Array.from({ length: 8 }, (_, k) => <span key={k} className={cx("h-1.5 flex-1 rounded-full", k === 0 ? "bg-gradient-to-r from-accent to-[#9B6BFF]" : "bg-line")} />)}</div>
                      <p className="text-[14px] text-ink-faint">Question 5 sur 6</p>
                      <p className="mt-2 text-[24px] sm:text-[30px] leading-tight text-ink" style={SERIF}>Comment te vois-tu trouver tes clients ?</p>
                      <div className="mt-5 grid sm:grid-cols-2 gap-2">{["Écrire et être trouvé sur Google", "Publier sur les réseaux", "Contacter les gens directement", "Bouche-à-oreille et affiliation"].map((x) => <span key={x} className={cx("rounded-xl border-2 px-4 py-3 text-[15px] font-semibold transition", x.startsWith("Écrire") ? "border-ink bg-ink text-white" : "border-line bg-white")}>{x}</span>)}</div>
                      <p className="mt-5 rounded-xl bg-white border border-line px-4 py-3 text-[14.5px]"><b>{demo ? Number(demo.n).toLocaleString("fr-FR") : "…"}</b> SaaS au revenu vérifié collent déjà à tes réponses. Dont <b>{demo ? Number(demo.tendance).toLocaleString("fr-FR") : "…"}</b> en tendance.</p>
                    </div></Fenetre>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <BingooIA go={go} />

        {/* 3. Tes premiers clients */}
        <section id="clients" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px] grid lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.4fr)] gap-10 items-center">
            <div>
              <h2 className="text-[38px] sm:text-[52px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Un SaaS sans clients ne rapporte rien. Bingoo! t'aide aussi à les trouver.</h2>
              <ul className="mt-6 space-y-3 text-[16px] text-ink-soft">
                {["Une semaine, une étape par jour, cochée au fur et à mesure", "Les établissements à contacter, trouvés pour toi dans le registre public", "Le message prêt, adressé au dirigeant", "L'étape du jour chaque matin dans ta boîte mail", "Ton compteur : 0 / 10 clients payants"].map((x) => <li key={x} className="flex gap-2.5"><Check className="h-5 w-5 mt-0.5 shrink-0 text-accent" />{x}</li>)}
              </ul>
            </div>
            <figure><ApercuSemaine /></figure>
          </div>
        </section>

        {/* Pourquoi Bingoo! */}
        <section id="pourquoi" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="max-w-[820px] text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Ailleurs, une idée et un prompt. Ici, ton SaaS et tes clients.</h2>
            <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_70px_-50px_rgba(21,23,42,.5)]">
              <div className="fx-filet" aria-hidden />
              <div className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] sm:grid-cols-[minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)] bg-[#F6F5F3] text-[13px] font-bold uppercase tracking-wide">
                <span className="px-4 sm:px-5 py-3 text-ink-faint" />
                <span className="hidden sm:block px-4 sm:px-5 py-3 text-ink-soft">Ailleurs</span>
                <span className="px-4 sm:px-5 py-3 text-accent-dark">Bingoo!</span>
              </div>
              {[
                ["Quoi lancer", "Une liste d'idées", "Des SaaS qui encaissent déjà, revenus vérifiés"],
                ["Pourquoi celui-là", "Un chiffre de « potentiel »", "Sa tendance, sa visibilité, ses canaux"],
                ["Ton idée à toi", "Un avis d'IA", "Un score sur 100 expliqué par les SaaS et applis qui existent déjà"],
                ["Le construire", "Un prompt à coller dans une IA", "Construit par Bingoo!, en ligne, branché à ton Stripe"],
                ["Tes clients", "Débrouille-toi", "Établissements à contacter trouvés pour toi, message prêt"],
                ["Tenir le rythme", "Seul", "L'étape du jour, chaque matin"],
              ].map(([k, a2, b2]) => (
                <div key={k} className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] sm:grid-cols-[minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)] border-t border-line text-[14.5px] sm:text-[15.5px] leading-snug">
                  <span className="px-4 sm:px-5 py-3.5 font-semibold text-ink">{k}<span className="sm:hidden mt-1 block text-[12.5px] font-normal text-ink-faint line-through">{a2}</span></span>
                  <span className="hidden sm:block px-4 sm:px-5 py-3.5 text-ink-soft">{a2}</span>
                  <span className="px-4 sm:px-5 py-3.5 text-ink bg-accent-soft/30 flex gap-2"><Check className="h-4 w-4 mt-0.5 shrink-0 text-accent" />{b2}</span>
                </div>
              ))}
            </div>
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
          <p className="text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Ton SaaS commence par quelques questions.</p>
          <p className="mt-4 text-[18px] text-ink-soft">Sans compte pour commencer : tu vois tout de suite combien de SaaS en tendance collent à ton profil.</p>
          <button onClick={go} className="fx-brille mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-10 py-4 text-[18px] font-bold text-white hover:bg-accent-dark transition">Commencer <Arrow className="h-4 w-4" /></button>
          </div>
        </section>
        </div>
      </main>

      <footer className="bg-white">
        <div className="fx-filet" aria-hidden />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-2 md:grid-cols-3 gap-8 text-[15px]">
          <div><p className="font-bold">Produit</p><ul className="mt-4 space-y-2.5 text-ink-soft">{[["base", "La base de SaaS"], ["comment", "Comment ça marche"], ["ia", "Bingoo! dans ton IA"], ["clients", "Tes premiers clients"]].map(([id, l]) => <li key={id}><a href={`#${id}`} onClick={scrollTo(id)} className="hover:text-ink">{l}</a></li>)}</ul></div>
          <div><p className="font-bold">Les SaaS</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><a href="/saas" className="hover:text-ink">Tous les SaaS suivis : prix et alternatives</a></li><li><a href="#faq" onClick={scrollTo("faq")} className="hover:text-ink">Questions fréquentes</a></li><li><a href={`mailto:bingoo@maisonravita.fr?subject=${encodeURIComponent("Corriger ou retirer une fiche")}`} title="Écris-nous depuis une adresse de ton domaine : correction ou retrait sous 72 heures." className="hover:text-ink">Corriger ou retirer une fiche</a></li></ul></div>
          <div><p className="font-bold">Compte et légal</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><button onClick={() => nav("/connexion?mode=login")} className="hover:text-ink">Connexion</button></li><li><button onClick={go} className="hover:text-ink">Créer un compte</button></li>{legalReady && <><li><a href="#/mentions-legales" className="hover:text-ink">Mentions légales</a></li><li><a href="#/confidentialite" className="hover:text-ink">Confidentialité</a></li><li><a href="#/conditions" className="hover:text-ink">Conditions</a></li></>}<li><a href="#/opposition" className="hover:text-ink">Ne plus être contacté</a></li></ul></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
          <Logo height={34} />
          <label className="flex items-center gap-2 text-[13.5px] text-ink-soft"><select aria-label="Langue du site" value={langueActuelle()} onChange={(e) => choisirLangue(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1">{LANGUES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></label>
          <p className="text-[13.5px] text-ink-faint">© {new Date().getFullYear()} Bingoo! · Les SaaS en tendance, le tien construit avec tes premiers clients</p>
        </div>
      </footer>
    </div>
  );
}
