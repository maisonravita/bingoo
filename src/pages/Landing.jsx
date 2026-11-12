import { LANGUES, langueActuelle, choisirLangue } from "../lib/langue";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { legalReady } from "./Legal";
import { cx } from "../lib/utils";

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

const MENU = [["Observer", "#explorer"], ["Copier et lancer", "#copier"], ["Pourquoi Bingoo!", "#pourquoi"], ["Tarifs", "#tarifs"], ["Questions", "#faq"]];

// Nombre de SaaS suivis dans la base Explorer (vue publique), affiché tel quel
function useNbSaas() {
  const [n, setN] = useState(null);
  useEffect(() => {
    fetch(`${URL_}/rest/v1/saas_public?select=domaine`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "count=exact", Range: "0-0" } })
      .then((r) => { const m = (r.headers.get("content-range") ?? "").match(/\/(\d+)$/); if (m) setN(Number(m[1])); }).catch(() => {});
  }, []);
  return n;
}

const EXPLORER = [
  ["apercu-explorer.jpg", "Tous les SaaS, au même endroit", "Filtre par catégorie, pays, prix, version gratuite, recrutement ou nouveauté du mois. Trie par croissance.", "La liste Explorer dans la vraie application."],
  ["apercu-explorer-fiche.jpg", "La fiche complète d'un concurrent", "Prix et historique, formules, postes ouverts, dernière nouveauté, méthode d'acquisition, notoriété web, et son histoire chiffrée quand la presse l'a publiée. Chaque information a son lien.", "La fiche de lemlist, relevée sur son site."],
  ["apercu-tendances.jpg", "Ce qui monte, mois après mois", "Les créations officielles d'éditeurs de logiciels en France par thème, les SaaS par pays et les catégories fortes ailleurs mais rares en France.", "Pays et tendances : annonces légales officielles (BODACC)."],
  ["apercu-idees.jpg", "Les idées que le marché laisse ouvertes", "Ce qui marche ailleurs et manque en France, les niches sans offre gratuite, celles où tout le monde recrute. Et les SaaS qui chiffrent le plus, avec leurs vrais chiffres et comment ils ont grandi.", "Idées et réussites, calculées sur la base."],
  ["apercu-qui-demarcher.jpg", "Puis, qui démarcher", "Pour une niche ou un concurrent : les types d'entreprises qui achètent, comptés au registre officiel. Un clic, et Bingoo! va chercher leurs décideurs.", "Les clients de Sellsy, en France."],
  ["apercu-mes-suivis.jpg", "Suis tes concurrents, sans y penser", "Tu suis des SaaS ou une catégorie entière. Chaque lundi, un e-mail : changements de prix, recrutements, nouveautés, nouveaux entrants.", "Mes suivis, avec quatre SaaS de prospection."],
];
function Explorer({ n }) {
  const [i, setI] = useState(0);
  const [img, titre, texte, legende] = EXPLORER[i];
  return (
    <section id="explorer" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24">
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[14px] font-bold uppercase tracking-wide text-accent-dark">Explorer</p>
        <h2 className="mt-2 max-w-[860px] text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Le marché du SaaS, ouvert devant toi.</h2>
        <p className="mt-5 max-w-[720px] text-[17px] sm:text-[19px] leading-[1.5] text-ink-soft">{n ? `${n.toLocaleString("fr-FR")} logiciels` : "Des centaines de logiciels"} suivis : revenus vérifiés chez Stripe, et sur leurs propres sites ce qu'ils facturent, qui recrute, ce qui sort, comment ils trouvent leurs clients. Chaque chiffre a sa source, et une estimation est toujours signalée comme telle.</p>
        <div className="mt-10 grid lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.6fr)] gap-6 items-start">
          <div className="space-y-2">
            {EXPLORER.map(([, t, d], k) => (
              <button key={t} onClick={() => setI(k)} className={`w-full text-left rounded-2xl border p-5 transition ${k === i ? "border-ink bg-white shadow-[0_10px_30px_-20px_rgba(21,23,42,.5)]" : "border-line bg-[#F6F5F3] hover:border-ink-faint"}`}>
                <p className="text-[19px] leading-tight text-ink" style={SERIF}>{t}</p>
                {k === i && <p className="mt-1.5 text-[15px] leading-snug text-ink-soft">{d}</p>}
              </button>
            ))}
          </div>
          <figure>
            <img key={img} src={`./${img}`} alt={titre} className="land-in w-full rounded-2xl border border-black/10 bg-[#F1EFED] shadow-[0_40px_90px_-45px_rgba(21,23,42,.55)]" />
            <figcaption className="mt-2.5 text-[13px] text-ink-faint">{legende}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
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
  ["Starter", 19.99, "Pour garder un œil sur ton marché.", ["Toute la base SaaS, fiches illimitées", "Revenus vérifiés et SaaS à copier", "10 SaaS suivis, alerte chaque lundi", "Idées et réussites chiffrées", "Notoriété web de chaque SaaS"]],
  ["Pro", 39.99, "Pour observer ton marché et lancer tes propres SaaS.", ["Tout Starter", "SaaS et catégories suivis sans limite", "Leurs e-mails, et bientôt leurs pubs", "Comparer jusqu'à 4 SaaS", "3 SaaS construits par mois, à ton nom"]],
  ["Business", 69.99, "Pour une équipe qui suit le marché ensemble.", ["Tout Pro", "10 SaaS construits par mois", "3 utilisateurs", "Export CSV des listes"]],
];
const FAQ = [
  ["D'où viennent les informations sur les SaaS ?", "De leurs propres sites, relus chaque mois : page d'accueil, tarifs, page carrières, changelog ou blog. Les chiffres d'entreprise (chiffre d'affaires, levées) viennent de la presse ou de documents officiels, la notoriété du Majestic Million, les tendances des annonces légales officielles (BODACC). Les revenus vérifiés viennent de Stripe (via TrustMRR) ou des comptes déposés à l'État. Une estimation est toujours signalée comme telle, une information introuvable est affichée comme telle, et chaque chiffre a son lien."],
  ["Copier un SaaS, c'est légal ?", "Reprendre les mêmes fonctionnalités, oui : c'est la concurrence. Bingoo! construit ton SaaS avec ton nom, tes textes et ton design. Ce qui est interdit, c'est de reprendre la marque, les textes mot pour mot ou le design d'un autre."],
  ["Quels SaaS sont dans Explorer ?", "Des logiciels français, européens et américains, dans 26 catégories. Tu peux ajouter n'importe quel SaaS par son adresse : il est lu tout de suite. La base grandit chaque jour."],
  ["Quelle différence entre Starter, Pro et Business ?", "Starter te donne toute la base, les revenus vérifiés et les SaaS à copier, et suit 10 SaaS ou catégories. Pro suit sans limite, ajoute leurs e-mails et la comparaison, et construit jusqu'à 3 SaaS par mois. Business construit jusqu'à 10 SaaS par mois et ajoute 3 utilisateurs et l'export des listes."],
  ["Comment marche l'alerte du lundi ?", "Tu suis des SaaS ou des catégories entières. Chaque lundi matin, un e-mail te dit ce qui a bougé : changements de prix, version gratuite ajoutée ou retirée, recrutements, nouveautés, nouveaux concurrents, leurs e-mails de la semaine."],
  ["J'édite un SaaS, puis-je corriger ou retirer sa fiche ?", "Oui. Notre robot (BingooBot) respecte le fichier robots.txt et ne lit que des pages publiques. Écris-nous depuis une adresse de ton domaine pour une correction ou un retrait, traité sous 72 heures."],
  ["Et le RGPD ?", "Explorer recense des entreprises, pas des personnes. Les seuls noms affichés sont ceux de fondateurs ou dirigeants cités publiquement par la presse, et toute personne peut en demander le retrait."],
  ["Je peux essayer avant de payer ?", "Oui, sans carte bancaire : 10 fiches par semaine, la recherche et le rapport « Ton marché ». Tu passes à une formule quand tu veux, sans engagement."],
];

export default function Landing() {
  const nav = useNavigate();
  useReveal();
  const [yearly, setYearly] = useState(false);
  const [fond, setFond] = useState(null);
  useEffect(() => { call("founder-slots", {}).then(setFond).catch(() => setFond(null)); }, []);
  const go = () => nav("/connexion");
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
              <span className="block text-[32px] sm:text-[50px] lg:text-[66px] leading-[1.1] text-[#3A3F55]" style={{ fontWeight: 500, letterSpacing: "-.01em" }}>Vois ce qui marche sur le marché SaaS.</span>
              <span className="mt-1 block text-[38px] sm:text-[60px] lg:text-[80px] leading-[1.1] text-[#1E2030]" style={{ fontWeight: 700, letterSpacing: "-.01em" }}>Copie-le. Lance le tien.</span>
              <span className="mt-4 sm:mt-6 flex justify-center"><span className="sr-only">Bingoo!</span><Logo height="clamp(64px, 9vw, 112px)" className="!self-center" /></span>
            </h1>
            <p className="hero-in mx-auto mt-7 max-w-[780px] text-[18px] sm:text-[22px] leading-[1.45] text-[#3A3F55]" style={{ ...JK, animationDelay: ".1s" }}>Observe {nb ? <b>{nb.toLocaleString("fr-FR")} SaaS</b> : "tous les SaaS"} : leurs prix, leurs recrutements, leurs e-mails et leurs vrais revenus. Repère ceux qui gagnent déjà de l'argent, et Bingoo! construit le tien, à ton nom, prêt à encaisser. <span className="font-semibold text-accent-dark">Le TrendTrack des SaaS, qui construit aussi.</span></p>
            <form onSubmit={(e) => { e.preventDefault(); const u = e.currentTarget.site.value.trim().replace(/^https?:\/\//i, ""); if (u) nav(`/marche?u=${encodeURIComponent(u)}`); }}
              className="hero-in mx-auto mt-9 flex max-w-[680px] flex-col sm:flex-row items-stretch gap-2 rounded-[28px] sm:rounded-full border border-black/[.08] bg-white p-2 shadow-[0_10px_40px_-20px_rgba(21,23,42,.35)]" style={{ ...JK, animationDelay: ".2s" }}>
              <label className="sr-only" htmlFor="hero-site">L'adresse de ton SaaS</label>
              <input id="hero-site" name="site" inputMode="url" autoComplete="url" placeholder="monsaas.com" required className="min-w-0 flex-1 bg-transparent px-5 py-3.5 text-[17px] outline-none placeholder:text-[#8A8FA3]" />
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-[17px] font-semibold text-white hover:bg-accent-dark transition">Voir mon marché <Arrow className="h-4 w-4" /></button>
            </form>
            <button onClick={go} className="hero-in mt-4 inline-flex items-center gap-1.5 text-[15.5px] font-semibold text-ink underline decoration-accent/50 decoration-2 underline-offset-4 hover:decoration-accent" style={{ ...JK, animationDelay: ".22s" }}>Ou trouve un SaaS qui gagne déjà de l'argent et copie-le <Arrow className="h-4 w-4" /></button>
            <div className="hero-in mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[15px] text-[#5B6075]" style={{ ...JK, animationDelay: ".25s" }}>
              {["Rapport gratuit, sans compte, en une minute", "Revenus vérifiés chez Stripe ou dans les comptes officiels", "Ton SaaS construit et en ligne en une journée"].map((x) => <span key={x} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-accent" />{x}</span>)}
            </div>
            <p className="mt-6 text-[13.5px] text-ink-faint">En continuant, j'accepte les <a href="#/conditions" className="underline hover:text-ink">Conditions d'utilisation</a> et la <a href="#/confidentialite" className="underline hover:text-ink">Politique de confidentialité</a> de Bingoo!.</p>
            <figure className="hero-in mx-auto mt-12 max-w-[1100px]" style={{ animationDelay: ".35s" }}>
              <img src="./apercu-explorer.jpg" alt="Explorer : la liste des SaaS avec leurs prix, recrutements et nouveautés" className="w-full rounded-2xl border border-black/10 bg-[#F1EFED] shadow-[0_40px_90px_-45px_rgba(21,23,42,.55)]" />
              <figcaption className="mt-2.5 text-[13px] text-ink-faint">Explorer dans la vraie application, avec les données relevées cette semaine.</figcaption>
            </figure>
          </section>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1440px] bg-white">

        {/* 1. Explorer : le marché du SaaS */}
        <Explorer n={nb} />

        {/* 2. Copier ce qui marche */}
        <section id="copier" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07] bg-[#16171B] text-white">
          <div className="mx-auto max-w-[1180px]">
            <p className="text-[14px] font-bold uppercase tracking-wide text-[#F6A06B]">Copier et lancer</p>
            <h2 className="mt-2 max-w-[900px] text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em]" style={SERIF}>Ne pars pas d'une idée. Pars d'un SaaS qui encaisse déjà.</h2>
            <p className="mt-5 max-w-[760px] text-[17px] sm:text-[19px] leading-[1.5] text-white/70">Des centaines de SaaS au revenu vérifié chez Stripe ou dans leurs comptes officiels. Bingoo! te montre ceux qu'une petite équipe peut refaire, souvent sans équivalent en France, puis il construit le tien.</p>
            <ol className="mt-12 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
              {[["Trouve", "Le filtre « À copier » classe les SaaS par facilité : revenu prouvé, petite équipe, prix simple, marché libre en France."], ["Prépare", "Ses fonctionnalités et ton équivalent, tes prix face aux siens, ton budget et le mois où tu deviens rentable."], ["Lance", "Bingoo! construit ton SaaS à ton nom : application en ligne, paiements Stripe, ton domaine, tes e-mails. Tu le modifies en une phrase."], ["Grandis", "Tes revenus suivis chaque nuit, ton jumeau qui surveille le SaaS copié, et le classement des créateurs."]].map(([h, d], i) => (
                <li key={h} className="rounded-2xl bg-white/[.06] border border-white/10 p-5">
                  <span className="text-[15px] text-[#F6A06B] tnum">{i + 1}</span>
                  <p className="mt-1 text-[21px] leading-tight" style={SERIF}>{h}</p>
                  <p className="mt-1.5 text-[14.5px] leading-snug text-white/65">{d}</p>
                </li>
              ))}
            </ol>
            <figure className="mt-12">
              <video src="/demo-copie.mp4" poster="/demo-copie.jpg" controls muted playsInline preload="none" className="w-full rounded-2xl border border-white/10 shadow-2xl" />
              <figcaption className="mt-3 text-[13.5px] text-white/55">Vrai SaaS construit par Bingoo! (prise de rendez-vous), avec ses données d'exemple : le site, l'espace de l'utilisateur, la page où ses clients réservent, la réservation qui arrive. 35 secondes.</figcaption>
            </figure>
            <button onClick={go} className="mt-10 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-[16px] font-semibold hover:bg-accent-dark transition">Voir les SaaS à copier <Arrow className="h-4 w-4" /></button>
            <p className="mt-3 text-[13px] text-white/45">Concurrence loyale : les mêmes fonctionnalités, avec ton nom, tes textes et ton design.</p>
          </div>
        </section>

        {/* 3. Comment ça marche, en 3 pas */}
        <section id="produit" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Ton marché, sans y passer tes journées.</h2>
            <ol className="mt-12 grid gap-3 text-left sm:grid-cols-3">
              {[["Colle l'adresse de ton SaaS", "En une minute, tes concurrents directs côte à côte : leurs prix, qui recrute, qui vient de sortir une nouveauté. Gratuit, sans compte."], ["Suis ta niche", "Tes concurrents et des catégories entières. Bingoo! relit leurs sites chaque semaine, garde l'historique et s'abonne à leurs e-mails."], ["Chaque lundi, ce qui a bougé", "Un e-mail : prix changés, recrutements, nouveautés, nouveaux concurrents. Et dans Explorer, les idées que le marché laisse ouvertes."]].map(([h, d], i) => (
                <li key={h} className="rounded-2xl bg-[#F6F5F3] p-5">
                  <span className="text-[15px] text-accent-dark tnum">{i + 1}</span>
                  <p className="mt-1 text-[19px] leading-tight text-ink" style={SERIF}>{h}</p>
                  <p className="mt-1.5 text-[14.5px] leading-snug text-ink-soft">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pourquoi Bingoo! : face à la veille faite à la main */}
        <section id="pourquoi" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="max-w-[820px] text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>La veille que tu n'as pas le temps de faire. Le SaaS que tu n'as pas le temps de coder.</h2>
            <p className="mt-5 max-w-[680px] text-[17px] sm:text-[19px] leading-[1.5] text-ink-soft">Suivre ses concurrents, c'est ouvrir des dizaines de sites, recopier des prix dans un tableur et oublier de recommencer. Bingoo! le fait pour toi, chaque semaine, avec la source de chaque chiffre.</p>
            <div className="mt-10 overflow-hidden rounded-2xl border border-line">
              <div className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)] bg-[#F6F5F3] text-[13px] font-bold uppercase tracking-wide">
                <span className="px-4 sm:px-5 py-3 text-ink-faint" />
                <span className="px-4 sm:px-5 py-3 text-ink-soft">À la main</span>
                <span className="px-4 sm:px-5 py-3 text-accent-dark">Bingoo!</span>
              </div>
              {[
                ["Leurs prix", "Recopiés de temps en temps dans un tableur", "Relus chaque semaine, avec l'historique et l'alerte"],
                ["Qui grossit", "Deviner à partir de LinkedIn", "Les postes ouverts comptés, la notoriété mesurée"],
                ["Leurs e-mails", "S'abonner à tout, puis tout lire", "Rangés par concurrent, classés et résumés"],
                ["Leurs chiffres", "Des recherches Google sans fin", "Chiffre d'affaires et levées, chacun avec sa source"],
                ["Les idées", "Une intuition", "Ce qui marche ailleurs et manque en France, calculé"],
                ["Lancer le sien", "Des mois de développement", "Construit par Bingoo!, à ton nom, prêt à encaisser"],
                ["Le prix", "Des heures chaque mois", "Dès 19,99 € par mois"],
              ].map(([k, a, b]) => (
                <div key={k} className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1fr)] border-t border-line text-[14.5px] sm:text-[15.5px] leading-snug">
                  <span className="px-4 sm:px-5 py-3.5 font-semibold text-ink">{k}</span>
                  <span className="px-4 sm:px-5 py-3.5 text-ink-soft">{a}</span>
                  <span className="px-4 sm:px-5 py-3.5 text-ink bg-accent-soft/30 flex gap-2"><Check className="h-4 w-4 mt-0.5 shrink-0 text-accent" />{b}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="max-w-[1280px] mx-auto px-4 sm:px-6 py-20 scroll-mt-24 border-t border-black/[.07]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-[38px] sm:text-[54px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Observe et copie, dès 19,99 €.</h2>
              <p className="mt-3 text-[17px] text-ink-soft">Aperçu gratuit sans carte bancaire : 10 fiches par semaine et ton rapport de marché. Prix hors taxes par mois, sans engagement.</p>
            </div>
            <div className="relative inline-flex rounded-full bg-white border border-line p-1 self-start md:self-auto">
              {[[false, "Mensuel"], [true, "Annuel"]].map(([v, l]) => <button key={l} onClick={() => setYearly(v)} className={cx("rounded-full px-5 py-2 text-[14.5px] font-bold transition", yearly === v ? "bg-ink text-white" : "text-ink-soft")}>{l}</button>)}
              <span className="absolute -top-3 -right-2 rounded-full bg-good text-white text-[11.5px] font-bold px-2 py-0.5">-20 %</span>
            </div>
          </div>
          <div className="mt-8 grid md:grid-cols-3 gap-4 items-end">
            {PLANS.map(([n, p0, d, items], i) => {
              const best = i === 1;
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
                  <button onClick={go} className={cx("mt-7 w-full rounded-lg py-3.5 text-[16px] transition", best ? "bg-accent hover:bg-accent-dark text-white" : "bg-ink text-white hover:bg-black")}>Créer mon compte</button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl bg-[#F6F5F3] border border-line px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[15px]"><b>Entreprise, sur devis.</b> <span className="text-ink-soft">Plus de 3 utilisateurs, accès aux données sur mesure, facturation annuelle.</span></p>
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
          <p className="text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Une longueur d'avance sur ton marché.</p>
          <p className="mt-4 text-[18px] text-ink-soft">Tes concurrents relus chaque semaine. Toi, tu décides.</p>
          <div className="mt-8 inline-flex flex-col sm:flex-row gap-1.5 rounded-xl bg-[#F1EFED] p-1.5">
            <button onClick={go} className="rounded-lg bg-[#1C1C1C] text-white px-9 py-4 text-[17px] hover:bg-black transition">Créer mon compte</button>
            <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => document.getElementById("hero-site")?.focus(), 500); }} className="rounded-lg bg-white border border-black/10 px-9 py-4 text-[17px] hover:bg-[#FAFAF9] transition">Voir mon marché, gratuit</button>
          </div>
        </section>
        </div>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-[15px]">
          <div><p className="font-bold">Produit</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><a href="#preuve" onClick={scrollTo("preuve")} className="hover:text-ink">La preuve en vidéo</a></li><li><a href="#essai" onClick={scrollTo("essai")} className="hover:text-ink">Essai en direct</a></li><li><a href="#demandes" onClick={scrollTo("demandes")} className="hover:text-ink">Demandes publiques</a></li><li><a href="#village" onClick={scrollTo("village")} className="hover:text-ink">Ton village</a></li><li><a href="#extension" onClick={scrollTo("extension")} className="hover:text-ink">Extension Chrome</a></li><li><a href="#tarifs" onClick={scrollTo("tarifs")} className="hover:text-ink">Tarifs</a></li></ul></div>
          <div><p className="font-bold">Outils gratuits</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><a href="#/marche" className="hover:text-ink">Ton marché SaaS en une minute</a></li><li><a href="/saas" className="hover:text-ink">Tous les SaaS : prix et alternatives</a></li><li><a href="#/outils/contrats-publics" className="hover:text-ink">Contrats publics qui se terminent</a></li><li><a href="#/outils/analyse-concurrent" className="hover:text-ink">Analyse d'un concurrent</a></li></ul></div>
          <div><p className="font-bold">Pour qui</p><ul className="mt-4 space-y-2.5 text-ink-soft">{[["logiciels", "Fondateurs de SaaS"], ["agences", "Agences et cabinets"]].map(([k, l]) => <li key={k}><a href={`#/metier/${k}`} className="hover:text-ink">{l}</a></li>)}</ul></div>
          <div><p className="font-bold">Compte et légal</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><button onClick={() => nav("/connexion?mode=login")} className="hover:text-ink">Connexion</button></li><li><button onClick={go} className="hover:text-ink">Créer un compte</button></li>{legalReady && <><li><a href="#/mentions-legales" className="hover:text-ink">Mentions légales</a></li><li><a href="#/confidentialite" className="hover:text-ink">Confidentialité</a></li><li><a href="#/conditions" className="hover:text-ink">Conditions</a></li></>}<li><a href="#/opposition" className="hover:text-ink">Ne plus être contacté</a></li></ul></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
          <Logo height={34} />
          <label className="flex items-center gap-2 text-[13.5px] text-ink-soft"><span aria-hidden>🌐</span><select aria-label="Langue du site" value={langueActuelle()} onChange={(e) => choisirLangue(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1">{LANGUES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></label>
          <p className="text-[13.5px] text-ink-faint">© {new Date().getFullYear()} Bingoo! · Le TrendTrack des SaaS</p>
        </div>
      </footer>
    </div>
  );
}
