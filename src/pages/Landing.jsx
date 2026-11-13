import { LANGUES, langueActuelle, choisirLangue } from "../lib/langue";
import { commencer } from "../lib/invite";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { cx } from "../lib/utils";
import { legalReady } from "./Legal";
import ResultatsBingoo from "../components/ResultatsBingoo";
import { Fenetre, ApercuTendance, ApercuVersion, ApercuFiche, ApercuProspects, ApercuSemaine } from "../components/VitrineAccueil";
import { supabase } from "../lib/supabase";

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
const MENU = [["Comment ça marche", "#comment"], ["Les SaaS en tendance", "#tendances"], ["Tes premiers clients", "#clients"], ["Questions", "#faq"]];

// Nombre de SaaS suivis dans la base Explorer (vue publique), affiché tel quel
function useNbSaas() {
  const [n, setN] = useState(null);
  useEffect(() => {
    fetch(`${URL_}/rest/v1/saas_public?select=domaine`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "count=exact", Range: "0-0" } })
      .then((r) => { const m = (r.headers.get("content-range") ?? "").match(/\/(\d+)$/); if (m) setN(Number(m[1])); }).catch(() => {});
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
  ["Combien ça coûte ?", "Un abonnement mensuel sans engagement, que tu choisis après avoir vu combien de SaaS collent à ton profil."],
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
      <video ref={ref} src="/film-lancement.mp4" poster="/film-lancement.jpg" muted loop playsInline preload="metadata" controls className="w-full block aspect-video rounded-2xl bg-white" />
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
    <div className="min-h-full bg-[#FAF9F6] text-ink">
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}@keyframes land-in{from{opacity:0;transform:translateY(10px)}}.land-in{animation:land-in .45s ease-out both}@keyframes marquee{to{transform:translateX(-50%)}}.marquee-track{animation:marquee 32s linear infinite}.marquee:hover .marquee-track{animation-play-state:paused}@media (prefers-reduced-motion: reduce){.marquee-track{animation:none;flex-wrap:wrap;width:auto;justify-content:center}}`}</style>

      {/* Haut de page : fond clair, menu blanc */}
        <header className="fx-entete sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-black/[.04]">
          <div className="mx-auto max-w-[1280px] h-[72px] px-4 sm:px-8 flex items-center justify-between gap-4" style={JK}>
            <div className="flex items-center gap-12">
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Bingoo!"><Logo height={34} /></button>
              <nav className="hidden lg:flex items-center gap-9 text-[16px] font-medium text-ink whitespace-nowrap">
                {MENU.map(([t, href]) => <a key={t} href={href} onClick={scrollTo(href.slice(1))} className="py-4 hover:opacity-70">{t}</a>)}
              </nav>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-4 text-[15px] sm:text-[16px] font-medium whitespace-nowrap">
              <button onClick={() => nav("/connexion?mode=login")} className="rounded-full border border-ink/80 px-4 sm:px-6 py-2 sm:py-2.5 hover:bg-black/[.04] transition">Se connecter</button>
              <button onClick={go} className="rounded-full bg-[#1B1D2A] text-white px-4 sm:px-6 py-2 sm:py-2.5 hover:bg-black transition">Commencer</button>
            </div>
          </div>
        </header>
      <div className="bg-white">

        <div className="px-0 sm:px-8">
          <section className="relative overflow-hidden mx-auto max-w-[1440px] bg-white px-5 sm:px-10 pt-14 sm:pt-24 pb-16 sm:pb-20 text-center">
            <div className="fx-grille" aria-hidden />
            <span className="fx-aurore h-[360px] w-[360px] bg-[#F6A06B] left-[8%] top-[60px]" aria-hidden />
            <span className="fx-aurore h-[320px] w-[320px] bg-[#9B6BFF] right-[8%] top-[140px]" style={{ animationDelay: "-6s" }} aria-hidden />
            <div className="relative z-[1]">
            <h1 className="hero-in relative mx-auto max-w-[1180px]" style={JK}>
              <span className="block text-[32px] sm:text-[50px] lg:text-[66px] leading-[1.1] text-[#3A3F55]" style={{ fontWeight: 500, letterSpacing: "-.01em" }}>Pars d'un SaaS à succès.</span>
              <span className="mt-1 block text-[38px] sm:text-[60px] lg:text-[80px] leading-[1.1] text-[#1E2030]" style={{ fontWeight: 700, letterSpacing: "-.01em" }}>Lance ta version. <span className="fx-texte">Encaisse.</span></span>
              <span className="mt-4 sm:mt-6 flex justify-center"><span className="sr-only">Bingoo!</span><Logo height="clamp(64px, 9vw, 112px)" className="!self-center" /></span>
            </h1>
            <p className="hero-in mx-auto mt-7 max-w-[780px] text-[18px] sm:text-[22px] leading-[1.45] text-[#3A3F55]" style={{ ...JK, animationDelay: ".1s" }}>Bingoo! repère les SaaS en tendance qui encaissent déjà{nb ? <> (parmi <b>{nb.toLocaleString("fr-FR")}</b> suivis, revenus vérifiés)</> : null}, construit ta version à ton nom, et te donne un plan pour décrocher tes premiers clients.</p>
            <button onClick={go} className="hero-in fx-brille mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-10 py-4 text-[18px] font-bold text-white shadow-[0_14px_40px_-16px_rgba(226,85,35,.8)] hover:bg-accent-dark transition" style={{ ...JK, animationDelay: ".2s" }}>Commencer <Arrow className="h-4 w-4" /></button>
            <p className="hero-in mt-3 text-[14px] text-[#5B6075]" style={{ ...JK, animationDelay: ".22s" }}>Quelques questions, sans compte, et tu vois combien de SaaS collent à ton profil.</p>
            <div className="hero-in mx-auto mt-7 flex w-fit flex-col sm:w-auto sm:flex-row sm:flex-wrap items-start sm:items-center justify-center gap-x-5 gap-y-2 text-left text-[15px] text-[#5B6075]" style={{ ...JK, animationDelay: ".25s" }}>
              {["Des SaaS qui encaissent déjà, revenus vérifiés chez Stripe", "Ta version construite et mise en ligne pour toi", "Des établissements à contacter, trouvés pour toi"].map((x) => <span key={x} className="inline-flex items-start gap-1.5"><Check className="h-4 w-4 mt-[3px] shrink-0 text-accent" />{x}</span>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const u = e.currentTarget.site.value.trim().replace(/^https?:\/\//i, ""); if (u) nav(`/marche?u=${encodeURIComponent(u)}`); }}
              className="hero-in mx-auto mt-8 flex max-w-[520px] items-stretch gap-2 rounded-full border border-black/[.08] bg-white p-1.5" style={{ ...JK, animationDelay: ".28s" }}>
              <label className="sr-only" htmlFor="hero-site">L'adresse d'un SaaS</label>
              <input id="hero-site" name="site" inputMode="url" autoComplete="url" placeholder="Ou regarde les chiffres d'un SaaS : monsaas.com" required className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-[15px] outline-none placeholder:text-[#8A8FA3]" />
              <button type="submit" className="rounded-full border border-ink/80 px-5 py-2.5 text-[15px] font-semibold hover:bg-black/[.04] transition">Voir</button>
            </form>
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

        {/* La preuve : ce qu'encaissent les SaaS lancés avec Bingoo! (s'affiche dès 3 SaaS avec des clients payants) */}
        <ResultatsBingoo className="px-5 sm:px-10 lg:px-20 py-14 border-t border-black/[.07] mx-auto max-w-[1180px]" />

        {/* 1. Comment ça marche : 4 étapes, chacune montrée dans la vraie application */}
        <section id="comment" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="max-w-[900px] text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>De « je ne sais pas quoi lancer » à tes premiers paiements.</h2>
            <ol className="relative mt-12 space-y-16 lg:pl-16">
              <span className="fx-rail hidden lg:block" aria-hidden><span id="fx-rail" style={{ transform: "scaleY(0)" }} /></span>
              {[
                ["Réponds à quelques questions", "Comment tu veux trouver tes clients, ce que tu refuses de faire, ton temps, le revenu visé, le métier que tu connais. Pendant que tu réponds, tu vois combien de SaaS vérifiés collent déjà à tes réponses.", null],
                ["Tes 3 SaaS en tendance", "Des SaaS qui encaissent déjà, revenus vérifiés chez leur outil de paiement, dont le revenu monte en ce moment. Pour chacun, sa tendance, sa visibilité et ta version : en français, pour un métier, ou plus simple.", "version"],
                ["Bingoo! construit ta version", "Ton site, les comptes de tes clients, l'abonnement avec ton Stripe, ton domaine. À ton nom, avec tes mots et ton design, en ligne en une journée.", "video"],
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
                      <p className="text-[14px] text-ink-faint">Question 1 sur 8</p>
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

        {/* 2. Ce que Bingoo! montre sur chaque SaaS : tendance, visibilité, pub, revenus vérifiés */}
        <section id="tendances" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07] bg-[#FAF9F6]">
          <div className="mx-auto max-w-[1180px] grid lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.3fr)] gap-10 lg:gap-14 items-center">
            <div>
              <h2 className="text-[38px] sm:text-[52px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>On ne te donne pas une idée. On te montre ce qui encaisse.</h2>
              <p className="mt-5 text-[17px] leading-[1.55] text-ink-soft">{nb ? <><b className="text-ink">{nb.toLocaleString("fr-FR")}</b> SaaS suivis</> : "Des milliers de SaaS suivis"}, et pour chacun :</p>
              <ul className="mt-6 space-y-5">
                {[
                  [ICONES.tendance, "Leur tendance", "Leur revenu sur 30 jours : tu pars de ce qui monte."],
                  [ICONES.oeil, "Leur visibilité", "Visites, revenu par visite, place sur Google : tu vois où la place est à prendre."],
                  [ICONES.pub, "Leur pub", "Ce qu'ils paient pour se montrer, avec les liens vers leurs pubs."],
                  [ICONES.verifie, "Leurs vrais revenus", "Vérifiés chez leur outil de paiement, jamais estimés."],
                ].map(([ic, h, d]) => (
                  <li key={h} className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl fx-pastille text-white">{ic}</span>
                    <div><p className="text-[17px] font-bold text-ink">{h}</p><p className="mt-0.5 text-[15px] leading-snug text-ink-soft">{d}</p></div>
                  </li>
                ))}
              </ul>
            </div>
            <figure><ApercuFiche /><figcaption className="mt-2.5 text-[13px] text-ink-faint">La fiche d'un SaaS, avec ses vrais chiffres.</figcaption></figure>
          </div>
        </section>

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
                ["Pourquoi celui-là", "Un chiffre de « potentiel »", "Sa tendance, sa visibilité, sa pub, ses canaux"],
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
          <div><p className="font-bold">Produit</p><ul className="mt-4 space-y-2.5 text-ink-soft">{[["comment", "Comment ça marche"], ["tendances", "Les SaaS en tendance"], ["clients", "Tes premiers clients"]].map(([id, l]) => <li key={id}><a href={`#${id}`} onClick={scrollTo(id)} className="hover:text-ink">{l}</a></li>)}</ul></div>
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
