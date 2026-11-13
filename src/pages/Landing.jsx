import { LANGUES, langueActuelle, choisirLangue } from "../lib/langue";
import { commencer } from "../lib/invite";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { legalReady } from "./Legal";
import { cx } from "../lib/utils";
import ResultatsBingoo from "../components/ResultatsBingoo";
import { supabase } from "../lib/supabase";

// Page d'accueil publique de Bingoo! : épurée, et chaque promesse adossée à une preuve.
// Deux preuves seulement : l'application filmée sur un vrai compte, et l'essai en direct sur le site du visiteur.
const URL_ = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
async function call(action, body) {
  const res = await fetch(`${URL_}/functions/v1/r/${action}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || "Erreur réseau, réessaie");
  return data;
}
const JK = { fontFamily: "'Plus Jakarta Sans', Geist, system-ui, sans-serif" };
const SERIF = { fontFamily: "var(--font-titre)", fontWeight: 800, letterSpacing: "-.03em" };
const scrollTo = (id) => (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
const Check = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
const Arrow = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const Lock = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;

const MENU = [["Comment ça marche", "#comment"], ["Les SaaS en tendance", "#tendances"], ["Tes premiers clients", "#clients"], ["Tarifs", "#tarifs"], ["Questions", "#faq"]];

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
const eur = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));
const PLANS = [
  ["Trouver", 19.99, "Pour trouver le SaaS à lancer et tes premiers clients.", ["Tes SaaS en tendance débloqués, avec leurs vrais revenus", "Leur visibilité, leur pub et leurs canaux", "Ton plan sur 30 jours", "Tes 10 premiers clients en 7 jours : prospects trouvés pour toi", "L'étape du jour chaque matin par e-mail"]],
  ["Lancer", 39.99, "Pour que Bingoo! construise ta version et la mette en ligne.", ["Tout Trouver", "3 SaaS construits par mois, à ton nom", "En ligne avec ton domaine, prêt à encaisser (ton Stripe)", "Toute la base : tendances, niches, classement", "Les SaaS à vendre et à racheter"]],
  ["Lancer à plusieurs", 69.99, "Pour une équipe qui lance plusieurs SaaS.", ["Tout Lancer", "10 SaaS construits par mois", "3 utilisateurs", "Export des listes"]],
];
const FAQ = [
  ["Je ne sais pas coder, ça marche quand même ?", "Oui. Tu réponds à 8 questions, tu choisis ton SaaS, et Bingoo! construit ta version : le site, les comptes de tes clients, l'abonnement avec ton Stripe. Tu n'écris pas une ligne de code."],
  ["Combien je vais gagner ?", "Personne ne peut te le promettre, et Bingoo! ne le fait pas. Ce qu'il fait : te faire partir de SaaS qui encaissent déjà (revenus vérifiés chez leur outil de paiement), construire ta version, et te donner chaque jour quoi faire pour trouver tes 10 premiers clients. Le reste dépend de toi."],
  ["D'où viennent les chiffres ?", "Les revenus sont vérifiés directement chez l'outil de paiement des SaaS (Stripe et d'autres), via TrustMRR. La visibilité, les canaux et la pub viennent de leurs propres déclarations et de sources publiques. Chaque chiffre a sa source sur la fiche."],
  ["Faire ma version d'un SaaS, c'est légal ?", "Faire la même chose qu'un autre, oui : c'est la concurrence. Bingoo! construit ta version avec ton nom, tes textes et ton design, et souvent un angle à toi (en français, pour un métier, plus simple). Reprendre la marque, les textes mot pour mot ou le design d'un autre, non."],
  ["Comment Bingoo! trouve mes premiers clients ?", "Pour ta version, il cherche dans le registre public des entreprises les établissements de ton département qui ont le problème (par exemple 50 salons de coiffure à Paris), te prépare le message à envoyer et suit avec toi qui a répondu, qui essaie, qui paie. Tu envoies toi-même, depuis ton adresse."],
  ["Et si ça ne marche pas pour moi ?", "Avec « Lancer », si ta version n'est pas en ligne dans les 14 jours qui suivent ton paiement, tu es remboursé. Sans engagement ensuite : tu arrêtes quand tu veux."],
  ["Qu'est-ce que je vois avant de payer ?", "Tu réponds aux questions sans compte, et tu vois en direct combien de SaaS vérifiés collent à ton profil, leur revenu médian et combien sont en tendance. Les SaaS eux-mêmes, leurs chiffres et ta version se débloquent avec une formule, sans engagement. Avec « Lancer », si ta version n'est pas en ligne sous 14 jours, tu es remboursé."],
  ["Et si un éditeur veut corriger sa fiche ?", "Notre robot ne lit que des pages publiques et respecte le fichier robots.txt. Écris-nous depuis une adresse de ton domaine : correction ou retrait sous 72 heures."],
];

export default function Landing() {
  // Le compteur de la démonstration est le vrai : SaaS vérifiés que Bingoo! sait construire, et ceux qui sont en tendance
  const [demo, setDemo] = useState(null);
  useEffect(() => { supabase.rpc("saas_pour_moi_apercu", { p: {} }).then(({ data }) => setDemo(data ?? null)); }, []);
  const nav = useNavigate();
  useReveal();
  const [yearly, setYearly] = useState(false);
  const [fond, setFond] = useState(null);
  useEffect(() => { call("founder-slots", {}).then(setFond).catch(() => setFond(null)); }, []);
  const go = () => commencer(nav);
  const nb = useNbSaas();
  return (
    <div className="min-h-full bg-[#FAF9F6] text-ink">
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}@keyframes land-in{from{opacity:0;transform:translateY(10px)}}.land-in{animation:land-in .45s ease-out both}@keyframes marquee{to{transform:translateX(-50%)}}.marquee-track{animation:marquee 32s linear infinite}.marquee:hover .marquee-track{animation-play-state:paused}@media (prefers-reduced-motion: reduce){.marquee-track{animation:none;flex-wrap:wrap;width:auto;justify-content:center}}`}</style>

      {/* Haut de page : fond clair, menu blanc */}
      <div className="bg-white">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-black/[.04]">
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

        <div className="px-0 sm:px-8">
          <section className="mx-auto max-w-[1440px] bg-white px-5 sm:px-10 pt-14 sm:pt-24 pb-16 sm:pb-20 text-center">
            <h1 className="hero-in relative mx-auto max-w-[1180px]" style={JK}>
              <span className="block text-[32px] sm:text-[50px] lg:text-[66px] leading-[1.1] text-[#3A3F55]" style={{ fontWeight: 500, letterSpacing: "-.01em" }}>Pars d'un SaaS à succès.</span>
              <span className="mt-1 block text-[38px] sm:text-[60px] lg:text-[80px] leading-[1.1] text-[#1E2030]" style={{ fontWeight: 700, letterSpacing: "-.01em" }}>Lance ta version. Encaisse.</span>
              <span className="mt-4 sm:mt-6 flex justify-center"><span className="sr-only">Bingoo!</span><Logo height="clamp(64px, 9vw, 112px)" className="!self-center" /></span>
            </h1>
            <p className="hero-in mx-auto mt-7 max-w-[780px] text-[18px] sm:text-[22px] leading-[1.45] text-[#3A3F55]" style={{ ...JK, animationDelay: ".1s" }}>Bingoo! repère les SaaS en tendance qui encaissent déjà{nb ? <> (parmi <b>{nb.toLocaleString("fr-FR")}</b> suivis, revenus vérifiés)</> : null}, construit ta version à ton nom, et te trouve tes premiers clients en 7 jours.</p>
            <button onClick={go} className="hero-in mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-10 py-4 text-[18px] font-bold text-white shadow-[0_14px_40px_-16px_rgba(226,85,35,.8)] hover:bg-accent-dark transition" style={{ ...JK, animationDelay: ".2s" }}>Commencer <Arrow className="h-4 w-4" /></button>
            <p className="hero-in mt-3 text-[14px] text-[#5B6075]" style={{ ...JK, animationDelay: ".22s" }}>8 questions, sans compte, et tu vois combien de SaaS collent à ton profil.</p>
            <div className="hero-in mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[15px] text-[#5B6075]" style={{ ...JK, animationDelay: ".25s" }}>
              {["Des SaaS qui encaissent déjà, revenus vérifiés chez Stripe", "Ta version construite et en ligne en une journée", "Tes premiers clients trouvés pour toi"].map((x) => <span key={x} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-accent" />{x}</span>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const u = e.currentTarget.site.value.trim().replace(/^https?:\/\//i, ""); if (u) nav(`/marche?u=${encodeURIComponent(u)}`); }}
              className="hero-in mx-auto mt-8 flex max-w-[520px] items-stretch gap-2 rounded-full border border-black/[.08] bg-white p-1.5" style={{ ...JK, animationDelay: ".28s" }}>
              <label className="sr-only" htmlFor="hero-site">L'adresse d'un SaaS</label>
              <input id="hero-site" name="site" inputMode="url" autoComplete="url" placeholder="Ou regarde les chiffres d'un SaaS : monsaas.com" required className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-[15px] outline-none placeholder:text-[#8A8FA3]" />
              <button type="submit" className="rounded-full border border-ink/80 px-5 py-2.5 text-[15px] font-semibold hover:bg-black/[.04] transition">Voir</button>
            </form>
            <p className="mt-6 text-[12.5px] text-ink-faint">Aucun revenu n'est garanti : tu pars de SaaS qui encaissent déjà, et Bingoo! t'aide à faire pareil.</p>
            <p className="mt-6 text-[13.5px] text-ink-faint">En continuant, j'accepte les <a href="#/conditions" className="underline hover:text-ink">Conditions d'utilisation</a> et la <a href="#/confidentialite" className="underline hover:text-ink">Politique de confidentialité</a> de Bingoo!.</p>
            <figure className="hero-in mx-auto mt-12 max-w-[1100px]" style={{ animationDelay: ".35s" }}>
              <img src="./apercu-tendance.jpg" alt="Tes 3 SaaS en tendance, avec leur revenu vérifié et ta version" className="w-full rounded-2xl border border-black/10 bg-[#F1EFED] shadow-[0_40px_90px_-45px_rgba(21,23,42,.55)]" />
              <figcaption className="mt-2.5 text-[13px] text-ink-faint">Le résultat après les 8 questions, dans la vraie application.</figcaption>
            </figure>
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
            <ol className="mt-12 space-y-16">
              {[
                ["Réponds à 8 questions", "Comment tu veux trouver tes clients, ce que tu refuses de faire, ton temps, le revenu visé, le métier que tu connais. Pendant que tu réponds, tu vois combien de SaaS vérifiés collent déjà à tes réponses.", null],
                ["Tes 3 SaaS en tendance", "Des SaaS qui encaissent déjà, revenus vérifiés chez leur outil de paiement, dont le revenu monte en ce moment. Pour chacun, sa tendance, sa visibilité et ta version : en français, pour un métier, ou plus simple.", "apercu-tendance.jpg"],
                ["Bingoo! construit ta version", "Ton site, les comptes de tes clients, l'abonnement avec ton Stripe, ton domaine. À ton nom, avec tes mots et ton design, en ligne en une journée.", "video"],
                ["Tes 10 premiers clients en 7 jours", "Bingoo! trouve les établissements qui ont le problème dans ton département, te prépare le message, et t'envoie chaque matin l'étape du jour. Tu suis qui répond, qui essaie, qui paie.", "apercu-prospects.jpg"],
              ].map(([h, d, img], i) => (
                <li key={h} className="grid lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.5fr)] gap-6 lg:gap-12 items-center">
                  <div>
                    <span className="grid place-items-center h-9 w-9 rounded-full bg-accent text-white font-bold tnum">{i + 1}</span>
                    <p className="mt-4 text-[28px] sm:text-[34px] leading-tight text-ink" style={SERIF}>{h}</p>
                    <p className="mt-3 text-[16.5px] leading-relaxed text-ink-soft">{d}</p>
                    {i === 0 && <button onClick={go} className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-[16px] font-semibold text-white hover:bg-accent-dark transition">Commencer <Arrow className="h-4 w-4" /></button>}
                  </div>
                  {img === "video" ? (
                    <figure><video src="/demo-copie.mp4" poster="/demo-copie.jpg" controls muted playsInline preload="none" className="w-full rounded-2xl border border-black/10 shadow-[0_40px_90px_-45px_rgba(21,23,42,.55)]" /><figcaption className="mt-2.5 text-[13px] text-ink-faint">Un vrai SaaS construit par Bingoo! (prise de rendez-vous), avec ses données d'exemple. 35 secondes.</figcaption></figure>
                  ) : img ? (
                    <figure><img src={`./${img}`} alt={h} loading="lazy" className="w-full rounded-2xl border border-black/10 bg-[#F1EFED] shadow-[0_40px_90px_-45px_rgba(21,23,42,.55)]" /><figcaption className="mt-2.5 text-[13px] text-ink-faint">Dans la vraie application.{img === "apercu-prospects.jpg" ? " Noms des dirigeants floutés." : ""}</figcaption></figure>
                  ) : (
                    <div className="rounded-2xl bg-[#F6F5F3] border border-line p-6 sm:p-8">
                      <p className="text-[14px] text-ink-faint">Question 1 sur 8</p>
                      <p className="mt-2 text-[24px] sm:text-[30px] leading-tight text-ink" style={SERIF}>Comment te vois-tu trouver tes clients ?</p>
                      <div className="mt-5 grid sm:grid-cols-2 gap-2">{["Écrire et être trouvé sur Google", "Publier sur les réseaux", "Contacter les gens directement", "Bouche-à-oreille et affiliation"].map((x) => <span key={x} className="rounded-xl border-2 border-line bg-white px-4 py-3 text-[15px] font-semibold">{x}</span>)}</div>
                      <p className="mt-5 rounded-xl bg-white border border-line px-4 py-3 text-[14.5px]"><b>{demo ? Number(demo.n).toLocaleString("fr-FR") : "…"}</b> SaaS au revenu vérifié collent déjà à tes réponses. Dont <b>{demo ? Number(demo.tendance).toLocaleString("fr-FR") : "…"}</b> en tendance.</p>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 2. Le radar : ce qui fait la preuve (tendances, visibilité, pub, revenus vérifiés) */}
        <section id="tendances" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07] bg-[#16171B] text-white">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="max-w-[900px] text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em]" style={SERIF}>On ne te donne pas une idée. On te montre ce qui encaisse.</h2>
            <p className="mt-5 max-w-[760px] text-[17px] sm:text-[19px] leading-[1.5] text-white/70">{nb ? `${nb.toLocaleString("fr-FR")} SaaS suivis` : "Des milliers de SaaS suivis"}, avec leurs revenus vérifiés jour par jour, leur tendance sur 30 jours, leur trafic, leur visibilité sur Google, la pub qu'ils font et les canaux qui leur amènent des clients.</p>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[["🔥", "Leur tendance", "Revenu des 4 dernières semaines et variation sur 30 jours : tu pars de ce qui monte."], ["👀", "Leur visibilité", "Visites par mois, revenu par visite, autorité sur Google : tu vois où la place est à prendre."], ["📣", "Leur pub", "Ce qu'ils paient pour se montrer, et les liens vers leurs pubs Facebook, Instagram et Google."], ["✅", "Leurs vrais revenus", "Vérifiés chez leur outil de paiement, pas estimés."]].map(([e, h, d]) => (
                <div key={h} className="rounded-2xl bg-white/[.06] border border-white/10 p-5"><p className="text-[26px]">{e}</p><p className="mt-2 text-[20px] leading-tight" style={SERIF}>{h}</p><p className="mt-1.5 text-[14.5px] leading-snug text-white/65">{d}</p></div>
              ))}
            </div>
            <figure className="mt-10"><img src="./apercu-visibilite.jpg" alt="Comment un SaaS se fait connaître" loading="lazy" className="w-full rounded-2xl border border-white/10" /><figcaption className="mt-2.5 text-[13px] text-white/50">« Comment il se fait connaître », sur chacun de tes SaaS.</figcaption></figure>
          </div>
        </section>

        {/* 3. Tes premiers clients */}
        <section id="clients" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px] grid lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.4fr)] gap-10 items-center">
            <div>
              <h2 className="text-[38px] sm:text-[52px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Un SaaS sans clients ne rapporte rien. Bingoo! s'occupe aussi de ça.</h2>
              <ul className="mt-6 space-y-3 text-[16px] text-ink-soft">
                {["Une semaine, une étape par jour, cochée au fur et à mesure", "Les établissements à contacter, trouvés pour toi dans le registre public", "Le message prêt, adressé au dirigeant", "L'étape du jour chaque matin dans ta boîte mail", "Ton compteur : 0 / 10 clients payants"].map((x) => <li key={x} className="flex gap-2.5"><Check className="h-5 w-5 mt-0.5 shrink-0 text-accent" />{x}</li>)}
              </ul>
            </div>
            <figure><img src="./apercu-semaine.jpg" alt="Tes 10 premiers clients en 7 jours" loading="lazy" className="w-full rounded-2xl border border-black/10 shadow-[0_40px_90px_-45px_rgba(21,23,42,.55)]" /></figure>
          </div>
        </section>

        {/* Pourquoi Bingoo! */}
        <section id="pourquoi" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="max-w-[820px] text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Ailleurs, une idée et un prompt. Ici, ton SaaS et tes clients.</h2>
            <div className="mt-10 overflow-hidden rounded-2xl border border-line">
              <div className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)] bg-[#F6F5F3] text-[13px] font-bold uppercase tracking-wide">
                <span className="px-4 sm:px-5 py-3 text-ink-faint" />
                <span className="px-4 sm:px-5 py-3 text-ink-soft">Ailleurs</span>
                <span className="px-4 sm:px-5 py-3 text-accent-dark">Bingoo!</span>
              </div>
              {[
                ["Quoi lancer", "Une liste d'idées", "Des SaaS qui encaissent déjà, revenus vérifiés"],
                ["Pourquoi celui-là", "Un chiffre de « potentiel »", "Sa tendance, sa visibilité, sa pub, ses canaux"],
                ["Le construire", "Un prompt à coller dans une IA", "Construit par Bingoo!, en ligne, prêt à encaisser"],
                ["Tes clients", "Débrouille-toi", "Trouvés pour toi, message prêt, suivi jusqu'au paiement"],
                ["Tenir le rythme", "Seul", "L'étape du jour, chaque matin"],
              ].map(([k, a2, b2]) => (
                <div key={k} className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)] border-t border-line text-[14.5px] sm:text-[15.5px] leading-snug">
                  <span className="px-4 sm:px-5 py-3.5 font-semibold text-ink">{k}</span>
                  <span className="px-4 sm:px-5 py-3.5 text-ink-soft">{a2}</span>
                  <span className="px-4 sm:px-5 py-3.5 text-ink bg-accent-soft/30 flex gap-2"><Check className="h-4 w-4 mt-0.5 shrink-0 text-accent" />{b2}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="max-w-[1280px] mx-auto px-4 sm:px-6 py-20 scroll-mt-24 border-t border-black/[.07]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-[38px] sm:text-[54px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Ton SaaS et tes premiers clients, dès 19,99 €.</h2>
              <p className="mt-3 text-[17px] text-ink-soft">Tu réponds aux questions sans compte et tu vois combien de SaaS collent à ton profil. Tes SaaS se débloquent avec une formule. Prix hors taxes par mois, sans engagement.</p>
            </div>
            <div className="relative inline-flex rounded-full bg-white border border-line p-1 self-start md:self-auto">
              {[[false, "Mensuel"], [true, "Annuel"]].map(([v, l]) => <button key={l} onClick={() => setYearly(v)} className={cx("rounded-full px-5 py-2 text-[14.5px] font-bold transition", yearly === v ? "bg-ink text-white" : "text-ink-soft")}>{l}</button>)}
              <span className="absolute -top-3 -right-2 rounded-full bg-good text-white text-[11.5px] font-bold px-2 py-0.5">-20 %</span>
            </div>
          </div>
          <div className="mt-8 grid md:grid-cols-2 gap-4 items-end max-w-[880px]">
            {PLANS.slice(0, 2).map(([n, p0, d, items], i) => {
              const best = i === 1; // « Lancer » : la formule mise en avant
              const fondateur = i === 1 && fond && fond.left > 0;
              const p = fondateur ? fond.price : p0;
              const annuel = Math.round(p * 12 * 0.8); // même calcul que la facturation Stripe
              const price = yearly ? Math.round(annuel / 12) : p;
              return (
                <div key={n} style={{ transitionDelay: `${i * 0.12}s` }} className={cx("reveal relative rounded-3xl p-6", best ? "bg-[#16171B] text-white md:pb-10 md:pt-10 shadow-[0_30px_60px_-30px_rgba(21,22,26,.6)]" : i === 0 ? "bg-white border border-line" : "bg-accent-soft/60 border border-accent/20")}>
                  {best && <span className="absolute -top-3.5 left-7 rounded-full bg-accent text-white text-[12.5px] font-bold px-3 py-1">Recommandé</span>}
                  <p className="font-bold text-[19px]">{n}</p>
                  <p className="mt-4">{fondateur && <span className="mr-2 text-[22px] text-ink-faint line-through tnum">{yearly ? Math.round(p0 * 12 * 0.8 / 12) : eur(p0)} €</span>}<span className="font-black text-[46px] leading-none" style={SERIF}>{eur(price)} €</span><span className={cx("text-[14px] ml-1.5", best ? "text-white/60" : "text-ink-faint")}>/ mois</span></p>
                  {(yearly || fondateur) && <p className={cx("text-[13px] mt-1", best ? "text-white/60" : "text-accent-dark font-semibold")}>{fondateur ? "prix fondateur, à vie" : ""}{fondateur && yearly ? " · " : ""}{yearly ? `facturé ${annuel} € par an` : ""}</p>}
                  <p className={cx("mt-4 text-[15px]", best ? "text-white/75" : "text-ink-soft")}>{d}</p>
                  <ul className="mt-5 space-y-2.5">{items.map((x) => <li key={x} className="flex items-center gap-2.5 text-[15px]"><Check className={cx("h-4 w-4 shrink-0", best ? "text-[#F6A06B]" : "text-accent")} />{x}</li>)}</ul>
                  <button onClick={go} className={cx("mt-7 w-full rounded-lg py-3.5 text-[16px] transition", best ? "bg-accent hover:bg-accent-dark text-white" : "bg-ink text-white hover:bg-black")}>Commencer</button>
                  {best && <p className="mt-3 text-center text-[13px] text-white/70">Remboursé sous 14 jours si ta version n'est pas en ligne.</p>}
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl bg-[#F6F5F3] border border-line px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[15px]"><b>Tu lances plusieurs SaaS ou tu es une équipe ?</b> <span className="text-ink-soft">« Lancer à plusieurs » : 10 SaaS construits par mois et 3 utilisateurs, 69,99 € par mois. Au-delà, sur devis.</span></p>
            <a href={`mailto:bingoo@maisonravita.fr?subject=${encodeURIComponent("Bingoo! Entreprise : demande de devis")}`} className="shrink-0 rounded-lg px-4 py-2.5 text-center text-[15px] border border-ink/80 hover:bg-black/[.04] transition">Parler à l'équipe</a>
          </div>
          <p className="mt-6 text-center text-[14px] text-ink-soft">Sans engagement : tu changes de formule ou tu arrêtes quand tu veux. À l'année : −20 %.</p>
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

        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
          <p className="text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Ton premier paiement commence par 8 questions.</p>
          <p className="mt-4 text-[18px] text-ink-soft">Sans compte pour commencer : tu vois tout de suite combien de SaaS en tendance collent à ton profil.</p>
          <button onClick={go} className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-10 py-4 text-[18px] font-bold text-white hover:bg-accent-dark transition">Commencer <Arrow className="h-4 w-4" /></button>
        </section>
        </div>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-2 md:grid-cols-3 gap-8 text-[15px]">
          <div><p className="font-bold">Produit</p><ul className="mt-4 space-y-2.5 text-ink-soft">{[["comment", "Comment ça marche"], ["tendances", "Les SaaS en tendance"], ["clients", "Tes premiers clients"], ["tarifs", "Tarifs"]].map(([id, l]) => <li key={id}><a href={`#${id}`} onClick={scrollTo(id)} className="hover:text-ink">{l}</a></li>)}</ul></div>
          <div><p className="font-bold">Les SaaS</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><a href="/saas" className="hover:text-ink">Tous les SaaS suivis : prix et alternatives</a></li><li><a href="#faq" onClick={scrollTo("faq")} className="hover:text-ink">Questions fréquentes</a></li></ul></div>
          <div><p className="font-bold">Compte et légal</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><button onClick={() => nav("/connexion?mode=login")} className="hover:text-ink">Connexion</button></li><li><button onClick={go} className="hover:text-ink">Créer un compte</button></li>{legalReady && <><li><a href="#/mentions-legales" className="hover:text-ink">Mentions légales</a></li><li><a href="#/confidentialite" className="hover:text-ink">Confidentialité</a></li><li><a href="#/conditions" className="hover:text-ink">Conditions</a></li></>}<li><a href="#/opposition" className="hover:text-ink">Ne plus être contacté</a></li></ul></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
          <Logo height={34} />
          <label className="flex items-center gap-2 text-[13.5px] text-ink-soft"><span aria-hidden>🌐</span><select aria-label="Langue du site" value={langueActuelle()} onChange={(e) => choisirLangue(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1">{LANGUES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></label>
          <p className="text-[13.5px] text-ink-faint">© {new Date().getFullYear()} Bingoo! · Les SaaS en tendance, le tien construit avec tes premiers clients</p>
        </div>
      </footer>
    </div>
  );
}
