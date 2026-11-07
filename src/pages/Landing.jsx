import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { legalReady } from "./Legal";
import { cx } from "../lib/utils";
import { STORE_URL } from "../lib/ext";

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

const MENU = [["La preuve", "#preuve"], ["Essai en direct", "#essai"], ["Ton village", "#village"], ["Extension", "#extension"], ["Tarifs", "#tarifs"], ["Questions", "#faq"]];

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
const PREUVES = [
  ["radar", "Qui a besoin de toi", "Chaque nuit, le Radar repère les entreprises qui viennent de bouger : recrutement, levée, nouveau dirigeant, outil concurrent installé. Chaque signal affiche sa source.", "preuve-radar", "L'écran Opportunités de la vraie application. Données d'exemple."],
  ["contacts", "Le décideur et son e-mail", "Le dirigeant déclaré au registre officiel, son e-mail professionnel vérifié, son LinkedIn. Jamais une adresse devinée.", "preuve-contacts", "L'écran Contacts de la vraie application. Données d'exemple."],
  ["canaux", "Il écrit. Tu valides.", "Un message par entreprise, qui part de ce qui se passe chez elle. Relances à J+3 et J+7, appel, clôture. Rien ne part sans toi.", "preuve-canaux", "L'écran « À valider » de la vraie application. Données d'exemple."],
  ["espion", "Tes concurrents, surveillés", "Prix, publicités, avis, clients mécontents : l'Espion mesure tout, et ton angle se retrouve dans chaque message.", "preuve-espion", "La page Concurrents de la vraie application. Concurrents d'exemple."],
];
function Preuve() {
  const [on, setOn] = useState("radar");
  const p = PREUVES.find((x) => x[0] === on);
  return (
    <section id="preuve" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24">
      <div className="mx-auto max-w-[1180px]">
        <h2 className="text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>On ne te promet rien.<br />On te montre.</h2>
        <p className="mt-5 max-w-[680px] text-[17px] sm:text-[19px] leading-[1.5] text-ink-soft">Pas de maquette, pas de chiffres inventés : l'application telle qu'elle tourne, en vidéo. Chaque légende dit ce que tu regardes.</p>
        <div className="mt-10 flex flex-wrap gap-2" role="tablist" aria-label="La preuve en vidéo">
          {PREUVES.map(([k, t]) => (
            <button key={k} role="tab" aria-selected={on === k} onClick={() => setOn(k)}
              className={cx("rounded-full px-5 py-2.5 text-[15.5px] font-semibold transition border", on === k ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-line hover:border-ink-faint hover:text-ink")}>{t}</button>
          ))}
        </div>
        <div className="mt-6" role="tabpanel">
          <p className="max-w-[720px] text-[16.5px] leading-[1.5] text-ink">{p[2]}</p>
          <figure className="mt-5">
            <video key={p[3]} src={`./${p[3]}.mp4`} poster={`./${p[3]}.jpg`} autoPlay loop muted playsInline className="w-full rounded-xl border border-black/10 bg-[#F1EFED]" aria-label={p[1]} />
            <figcaption className="mt-2 text-[13.5px] text-ink-soft">{p[4]}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

/* ---------- L'essai en direct : le visiteur voit SES clients potentiels, sans compte ---------- */
function useTry() {
  const [f, setF] = useState({ url: "" });
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const search = async (e) => {
    e?.preventDefault?.();
    setBusy(true); setErr(""); setR(null);
    document.getElementById("essai")?.scrollIntoView({ behavior: "smooth", block: "start" });
    try { setR(await call("free-site", f)); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return { f, setF, r, err, busy, search };
}

const TRY_STEPS = [["Bingoo! lit ton site", "Ce que tu vends, à qui, dans quelle zone."], ["Le Radar fouille les annonces officielles", "Créations, reprises et ouvertures des 45 derniers jours."], ["Tu vois tes clients potentiels", "Ceux qui choisissent leurs fournisseurs en ce moment."]];
function TryIt({ t }) {
  const nav = useNavigate();
  const { f, setF, r, err, busy, search } = t;
  const [step, setStep] = useState(0);
  useEffect(() => { if (!busy) { setStep(0); return; } setStep(0); const a = setTimeout(() => setStep(1), 2500), b = setTimeout(() => setStep(2), 6000); return () => { clearTimeout(a); clearTimeout(b); }; }, [busy]);
  return (
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-start [&>*]:min-w-0">
      <div className="lg:pt-6">
        <h2 className="text-[38px] sm:text-[54px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>La deuxième preuve : ton marché</h2>
        <p className="mt-6 max-w-[560px] text-[17px] sm:text-[19px] leading-[1.5] text-ink">Donne l'adresse de ton site. En une minute, Bingoo! te montre des entreprises qui pourraient devenir tes clients, et pourquoi c'est le moment. Gratuit, sans compte.</p>
        <form onSubmit={search} className="mt-10 grid sm:grid-cols-[minmax(0,1fr)_auto] gap-3">
          <label className="sr-only" htmlFor="tr-url">Ton site</label>
          <div className="flex items-center rounded-lg border border-[#8A8682] bg-white focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10 min-w-0">
            <span className="pl-4 text-[17px] text-ink-faint select-none">https://</span>
            <input id="tr-url" value={f.url} onChange={(e) => setF({ url: e.target.value.replace(/^https?:\/\//i, "") })} placeholder="tonentreprise.fr" inputMode="url" autoComplete="url" className="w-full min-w-0 bg-transparent px-1 py-4 text-[17px] outline-none" />
          </div>
          <button type="submit" disabled={busy || !f.url.trim()} className="rounded-lg bg-accent text-white px-7 py-4 text-[17px] hover:bg-accent-dark disabled:opacity-50 transition">{busy ? "Recherche…" : "Lancer le Radar"}</button>
        </form>
        {err && <p className="mt-4 rounded-lg bg-[#FDF0EC] px-4 py-3 text-[15px] text-[#9A3412]">{err}</p>}
        <p className="mt-6 text-[15px] text-ink-soft">Tu vends aux collectivités ? <a href="#/outils/contrats-publics" className="underline hover:text-ink">Vois leurs contrats qui se terminent</a>.</p>
      </div>

      <div className="rounded-2xl bg-[#F1EFED] p-4 sm:p-8 min-h-[420px]">
        {!r ? (
          <ol className="space-y-3">
            {TRY_STEPS.map(([h, d], i) => {
              const on = busy && step === i, done = busy && step > i;
              return (
                <li key={h} className={cx("flex gap-4 rounded-xl bg-white p-5 transition", on ? "ring-2 ring-accent/40" : "", !busy || on || done ? "opacity-100" : "opacity-60")}>
                  <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px]", done ? "bg-good text-white" : on ? "bg-accent text-white" : "bg-[#F1EFED] text-ink")}>{done ? <Check className="h-4 w-4" /> : on ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" style={{ animation: "kspin .8s linear infinite" }} /> : i + 1}</span>
                  <div><p className="text-[19px] leading-tight text-ink" style={SERIF}>{h}</p><p className="mt-1 text-[14.5px] text-ink-soft">{d}</p></div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="space-y-3">
            {r.offre && <div className="rounded-xl bg-white p-4"><p className="text-[12.5px] text-ink-soft">Bingoo! a compris</p><p className="mt-1 text-[15px] text-ink"><b className="font-medium">{r.nom}</b> : {r.offre.replace(/\.$/, "")}{r.clients ? `, ${r.clients.replace(/\.$/, "")}` : ""}.</p></div>}
            <p className="px-1 pt-1 text-[16px] text-ink"><span className="text-[34px] leading-none tracking-[-.02em] align-[-4px]" style={SERIF}>{r.total}</span> client{r.total > 1 ? "s" : ""} potentiel{r.total > 1 ? "s" : ""} en France, {r.jours > 1 ? `ces ${r.jours} derniers jours` : "ces dernières 24 heures"}</p>
            {r.decideurs > 0 && <p className="px-1 -mt-1 text-[15px] text-ink-soft"><b className="font-medium text-ink">{r.decideurs} décideur{r.decideurs > 1 ? "s" : ""}</b> nommé{r.decideurs > 1 ? "s" : ""} dans les annonces officielles. Crée ton compte pour voir leurs noms, puis Bingoo! cherche leur e-mail et leur téléphone.</p>}
            {!r.total && <p className="rounded-xl bg-white p-4 text-[14.5px] text-ink-soft">Rien de neuf ces dernières semaines sur ta cible. Avec un compte, le Radar suit aussi les changements de dirigeant, les recrutements et les appels d'offres.</p>}
            {r.visibles.map((c, i) => (
              <div key={i} className="rounded-xl bg-white p-4 land-in" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="flex items-center justify-between gap-2"><span className="rounded bg-[#FFF1E8] px-1.5 py-0.5 text-[11.5px] font-medium text-accent-dark">{c.signal}</span><span className="text-[12.5px] text-ink-soft">{new Date(c.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span></div>
                <p className="mt-2 text-[16px] font-medium text-ink">{c.nom}{c.ville ? <span className="font-normal text-ink-soft">, {c.ville}</span> : null}</p>
                <p className="text-[13.5px] text-ink-soft line-clamp-2">{c.activite}</p>
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-md bg-[#F6F5F3] px-2.5 py-1.5 text-[12.5px]"><span className="text-ink-soft">{c.decideur || "Le décideur"}</span><span className="flex items-center gap-1.5"><span className="select-none blur-[4px] text-ink" aria-hidden>Prénom Nom</span><Lock className="h-3.5 w-3.5 text-ink-soft" /></span></div>
                <div className="mt-1 flex items-center justify-between gap-2 rounded-md bg-[#F6F5F3] px-2.5 py-1.5 text-[12.5px]"><span className="text-ink-soft">E-mail et téléphone</span><span className="flex items-center gap-1.5 text-ink-soft">Cherchés avec ton compte<Lock className="h-3.5 w-3.5" /></span></div>
              </div>
            ))}
            {(r.apercu ?? []).slice(0, 3).map((c, i) => (
              <div key={`a${i}`} className="relative rounded-xl bg-white/70 p-4">
                <p className="text-[12.5px] text-ink-soft">{c.signal}{c.ville ? `, ${c.ville}` : ""}{c.decideur ? ` · ${c.decideur} identifié` : ""}</p>
                <p className="select-none blur-[5px] text-[16px] text-ink" aria-hidden>Entreprise masquée</p>
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 text-[12px] text-ink-soft"><Lock className="h-3 w-3" />Avec un compte</span>
              </div>
            ))}
            {r.caches > 0 && <button onClick={() => nav("/connexion")} className="w-full rounded-lg bg-[#1C1C1C] py-4 text-[16px] text-white hover:bg-black transition">Débloquer les {r.caches} autres et leurs décideurs, gratuitement</button>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Les sources, en une ligne qui défile ---------- */
const SRC = ["BODACC", "Sirene", "France Travail", "Reddit", "LinkedIn public", "BOAMP", "Sites web", "Forums et communautés", "Registre national des entreprises", "TED Europa"];
function SourcesRow() {
  return (
    <div id="donnees" className="mx-auto mt-16 max-w-[1180px] scroll-mt-24">
      <p className="text-[15px] text-ink-soft">Tout vient de sources publiques et vérifiables. Chaque signal affiche la sienne.</p>
      <div className="marquee mt-6 overflow-hidden" style={{ maskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)" }}>
        <ul className="marquee-track flex w-max items-center text-[22px] sm:text-[26px] text-ink/45" style={SERIF}>
          {[...SRC, ...SRC].map((x, i) => <li key={i} aria-hidden={i >= SRC.length} className="shrink-0 whitespace-nowrap px-6 sm:px-9">{x}</li>)}
        </ul>
      </div>
    </div>
  );
}

/* ---------- Tarifs et questions ---------- */
const PLANS = [
  ["Solo", 39, "Pour un solo founder ou un petit SaaS qui démarre, 15 minutes par jour.", ["1 utilisateur", "100 prospects contactés par mois", "Décideur trouvé, e-mail vérifié, message écrit pour lui", "Demandes publiques avec réponse prête, chaque jour", "Radar et relances"]],
  ["Pro", 69, "Pour le fondateur dont ça commence à marcher.", ["2 utilisateurs", "300 prospects contactés par mois", "Tout ce qu'il y a dans Solo", "Espion : tes concurrents surveillés", "LinkedIn par l'extension"]],
  ["Équipe", 109, "Pour une startup ou une PME avec quelques commerciaux.", ["5 utilisateurs", "700 prospects contactés par mois", "Tout ce qu'il y a dans Pro", "Répartition des prospects entre commerciaux", "Tableau de bord par commercial"]],
];
const FAQ = [
  ["Et si je n'obtiens aucun résultat ?", "Pendant ton premier mois payant, si tu as laissé partir au moins 60 % des premiers messages de ta formule (60 sur Solo, 180 sur Pro, 420 sur Équipe) et que tu n'as obtenu ni rendez-vous ni réponse positive, ton premier mois t'est remboursé. Tu n'as rien à demander : Bingoo! le calcule et te prévient."],
  ["Bingoo! envoie-t-il des messages sans mon accord ?", "Non. Par défaut, chaque message attend ta validation. Tu peux ensuite activer le pilote automatique, dans la limite d'envoi que tu fixes."],
  ["D'où viennent les informations ?", "De sources publiques et vérifiables : données de la commande publique, BOAMP, annonces légales (BODACC), registre national des entreprises, sites des entreprises. Chaque signal affiche sa source."],
  ["Et le RGPD ?", "Bingoo! travaille au niveau de l'entreprise et des fonctions qui décident. Les e-mails sont publiés ou vérifiés, jamais devinés, et chaque message permet de ne plus être contacté."],
  ["Ça marche pour mon entreprise ?", "Bingoo! est fait pour les entreprises qui vendent à d'autres entreprises : fondateurs de SaaS, startups B2B, PME et TPE, agences, cabinets, services sur site. À l'inscription, tu dis ce que tu es : Bingoo! ne cherche pas les mêmes signaux pour un éditeur de logiciel et pour une entreprise de nettoyage. Il n'est pas fait pour vendre à des particuliers."],
  ["Combien de clients puis-je espérer ?", "À la fin de l'inscription, Bingoo! te montre une fourchette, prudente et probable, calculée à partir de ce que vaut un client pour toi, de ton objectif et de taux de prospection prudents. Les hypothèses sont affichées : ce n'est pas une promesse. Dès tes premiers envois, tes vrais taux remplacent les hypothèses."],
  ["Bingoo! publie-t-il sur Reddit ou LinkedIn à ma place ?", "Non pour les demandes publiques : Bingoo! te prépare la réponse, tu la publies toi-même. Sur LinkedIn, l'extension n'envoie que les invitations et les messages que tu as validés, avec des limites prudentes."],
  ["À quoi sert l'extension Chrome ?", "Elle affiche la fiche d'une entreprise sur son propre site, fait sur LinkedIn les invitations et les messages que tu as validés (à un rythme humain, dans des limites prudentes) et reconnaît tes prospects dans Gmail. Elle est facultative : tout le reste marche sans elle."],
  ["Est-ce que je risque mon compte LinkedIn ?", "Bingoo! ne fait jamais d'envoi en masse ni d'aspiration de profils. Le pilote ne fait que ce que tu as validé, avec des pauses et des limites quotidiennes basses, depuis ton propre navigateur."],
  ["Je peux essayer avant de payer ?", "Oui : pendant 7 jours, sans carte bancaire, Bingoo! trouve tes premières entreprises et écrit tes premiers messages. Tu les lis, tu juges. L'envoi démarre avec ton abonnement, et ton premier mois est remboursé si tu n'obtiens ni rendez-vous ni réponse positive."],
];

export default function Landing() {
  const nav = useNavigate();
  useReveal();
  const tryState = useTry();
  const [yearly, setYearly] = useState(false);
  const [fond, setFond] = useState(null);
  useEffect(() => { call("founder-slots", {}).then(setFond).catch(() => setFond(null)); }, []);
  const go = () => nav("/connexion");
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
              <span className="block text-[34px] sm:text-[54px] lg:text-[72px] leading-[1.1] text-[#3A3F55]" style={{ fontWeight: 500, letterSpacing: "-.01em" }}>Tu as le business parfait.</span>
              <span className="mt-1 block text-[40px] sm:text-[64px] lg:text-[84px] leading-[1.1] text-[#1E2030]" style={{ fontWeight: 700, letterSpacing: "-.01em" }}>Il te manque des clients ?</span>
              <span className="mt-4 sm:mt-6 flex justify-center"><span className="sr-only">Bingoo!</span><Logo height="clamp(64px, 9vw, 112px)" className="!self-center" /></span>
              <span aria-hidden className="pointer-events-none absolute right-0 xl:-right-6 -top-10 hidden lg:flex flex-col items-end text-[24px] text-[#3A3F55] rotate-[-4deg]" style={{ fontFamily: "Caveat, cursive", fontWeight: 500, letterSpacing: 0 }}>
                (oui, ils n'apparaissent pas comme par magie)
                <svg viewBox="0 0 40 60" className="mr-16 mt-1 h-12 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 2c10 14 8 34-10 52M12 54l-2-12M12 54l11-6" /></svg>
              </span>
            </h1>
            <p className="hero-in mx-auto mt-7 max-w-[760px] text-[18px] sm:text-[22px] leading-[1.45] text-[#3A3F55]" style={{ ...JK, animationDelay: ".1s" }}>Bingoo! trouve les entreprises qui ont besoin de toi aujourd'hui, le bon décideur, et décroche le rendez-vous. <span className="font-semibold text-accent-dark">Ton chiffre décolle.</span></p>
            <form onSubmit={(e) => { e.preventDefault(); try { sessionStorage.setItem("bingoo-email", e.currentTarget.email.value.trim()); } catch { /* navigation privée */ } go(); }}
              className="hero-in mx-auto mt-9 flex max-w-[680px] flex-col sm:flex-row items-stretch gap-2 rounded-[28px] sm:rounded-full border border-black/[.08] bg-white p-2 shadow-[0_10px_40px_-20px_rgba(21,23,42,.35)]" style={{ ...JK, animationDelay: ".2s" }}>
              <label className="sr-only" htmlFor="hero-email">Ton e-mail</label>
              <input id="hero-email" name="email" type="email" autoComplete="email" placeholder="ton@email.com" className="min-w-0 flex-1 bg-transparent px-5 py-3.5 text-[17px] outline-none placeholder:text-[#8A8FA3]" />
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1B1D2A] px-8 py-3.5 text-[17px] font-semibold text-white hover:bg-black transition">Commencer <Arrow className="h-4 w-4" /></button>
            </form>
            <div className="hero-in mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[15px] text-[#5B6075]" style={{ ...JK, animationDelay: ".25s" }}>
              {["15 minutes par jour", "Premier mois remboursé sans rendez-vous ni réponse", "Pour les SaaS, startups et PME B2B"].map((x) => <span key={x} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-accent" />{x}</span>)}
            </div>
            <p className="mt-6 text-[13.5px] text-ink-faint">En continuant, j'accepte les <a href="#/conditions" className="underline hover:text-ink">Conditions d'utilisation</a> et la <a href="#/confidentialite" className="underline hover:text-ink">Politique de confidentialité</a> de Bingoo!.</p>
          </section>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1440px] bg-white">

        {/* 1. La preuve : l'application filmée sur un vrai compte */}
        <Preuve />

        {/* 2. La preuve sur TON marché : l'essai en direct, sans compte */}
        <section className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div id="essai" className="mx-auto max-w-[1300px] text-left scroll-mt-24"><TryIt t={tryState} /></div>
          <SourcesRow />
        </section>

        {/* 3. Comment ça marche, en 4 pas */}
        <section id="produit" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>15 minutes par jour. Voilà ta part.</h2>
            <ol className="mt-12 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
              {[["Tu réponds à 6 questions", "Ton type d'entreprise, ce que vaut un client, ton objectif. Puis le lien de ton produit."], ["Bingoo! trouve qui a besoin de toi", "Les entreprises au bon moment, leur décideur vérifié, et ceux qui demandent ta solution en public."], ["Il écrit sur tous les canaux", "E-mail, LinkedIn, réponses aux demandes, appels. Tu valides en 15 minutes par jour."], ["Tu prends les rendez-vous", "Les réponses arrivent triées, avec la tienne déjà prête. Le rendez-vous va dans ton agenda."]].map(([h, d], i) => (
                <li key={h} className="rounded-2xl bg-[#F6F5F3] p-5">
                  <span className="text-[15px] text-accent-dark tnum">{i + 1}</span>
                  <p className="mt-1 text-[19px] leading-tight text-ink" style={SERIF}>{h}</p>
                  <p className="mt-1.5 text-[14.5px] leading-snug text-ink-soft">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4. Ceux qui te cherchent déjà : les demandes publiques, écran réel */}
        <section id="demandes" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px] grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 items-center">
            <div className="min-w-0">
              <h2 className="text-[36px] sm:text-[50px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Des gens demandent déjà ta solution. Bingoo! les entend.</h2>
              <p className="mt-6 text-[17px] sm:text-[19px] leading-[1.5] text-ink">Chaque jour, sur Reddit, LinkedIn, X et les forums : « quelqu'un connaît un outil pour… », « une alternative à… ». Bingoo! te les apporte avec le lien exact et une réponse prête — un vrai conseil d'abord, ton produit ensuite.</p>
              <ul className="mt-6 space-y-3 text-[16px] text-ink">
                {["En français et en anglais, avec le lien exact de la demande", "Tu relis, tu copies, tu publies toi-même", "Jamais de publication automatique : ton compte reste à toi"].map((x) => <li key={x} className="flex gap-2.5"><Check className="h-4 w-4 mt-1 shrink-0 text-accent" />{x}</li>)}
              </ul>
            </div>
            <figure className="min-w-0">
              <video src="./demo-journee.mp4" poster="./demo-journee.jpg" controls muted playsInline preload="none" className="w-full rounded-xl border border-black/10 bg-[#F1EFED]" aria-label="L'écran Aujourd'hui de Bingoo! : demandes publiques et messages à valider" />
              <figcaption className="mt-2 text-[13.5px] text-ink-soft">L'écran « Aujourd'hui » de la vraie application. Données d'exemple.</figcaption>
            </figure>
          </div>
        </section>

        {/* Ton village : à part, en grand */}
        <section id="village" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07] bg-[#FBF6F1]">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-6 lg:gap-16 items-end">
              <h2 className="text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Ta prospection devient une ville.</h2>
              <p className="text-[17px] sm:text-[19px] leading-[1.5] text-ink-soft">Chaque bâtiment est une partie de Bingoo!, avec ce qui t'attend. Un panneau te dit toujours quoi faire ensuite. Et chaque matin, « La nuit de ton équipe » rejoue ce qui a été fait pendant que tu dormais.</p>
            </div>
            <figure className="mt-10">
              <video src="./demo-village.mp4" poster="./demo-village.jpg" autoPlay loop muted playsInline className="w-full rounded-2xl border border-black/10 bg-[#F1EFED] shadow-[0_30px_70px_-40px_rgba(122,74,42,.55)]" aria-label="Le village Bingoo! et la nuit de ton équipe" />
              <figcaption className="mt-2 text-[13.5px] text-ink-soft">La page Village de la vraie application. Données d'exemple.</figcaption>
            </figure>
            <ul className="mt-8 grid sm:grid-cols-3 gap-3">
              {[["Un coup d'œil", "Ce qui t'attend, bâtiment par bâtiment : réponses, messages prêts, rendez-vous, opportunités."], ["Ton matin", "Le travail du jour en une carte, et « Tout traiter » qui t'emmène d'un bâtiment à l'autre."], ["La nuit de ton équipe", "Le journal réel de ce qui a été fait cette nuit, rejoué en 20 secondes."]].map(([t, d]) => (
                <li key={t} className="rounded-2xl bg-white p-5 border border-black/[.05]"><p className="text-[18px] leading-tight text-ink" style={SERIF}>{t}</p><p className="mt-2 text-[15px] leading-[1.5] text-ink-soft">{d}</p></li>
              ))}
            </ul>
          </div>
        </section>

        {/* L'extension Chrome, en une bande */}
        <section id="extension" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-16 sm:py-20 border-t border-black/[.07]">
          <div className="mx-auto max-w-[1180px]">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="max-w-[640px]">
                <h2 className="text-[36px] sm:text-[50px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Bingoo! partout où tu prospectes</h2>
                <p className="mt-4 text-[17px] sm:text-[19px] leading-[1.5] text-ink-soft">L'extension Chrome, gratuite pour les clients et facultative.</p>
              </div>
              <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className="self-start md:self-auto inline-flex items-center gap-2.5 rounded-lg bg-ink text-white px-6 py-3.5 text-[16px] hover:bg-black transition">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M12 8.5h8.5M8.97 13.75 4.7 6.35M15.03 13.75l-4.25 7.37" /></svg>
                Ajouter à Chrome
              </a>
            </div>
            <ul className="mt-10 grid sm:grid-cols-3 gap-3">
              {[["Sur le site d'une entreprise", "Sa fiche en un clic : le dirigeant, la taille, ce qui bouge chez elle. Tu l'ajoutes à tes prospects sans copier-coller."], ["Sur LinkedIn", "Les invitations et messages que tu as validés partent depuis ton compte, à un rythme humain, avec des limites prudentes."], ["Dans Gmail", "Quand un prospect t'écrit, sa fiche s'affiche à côté : ce qu'il a reçu, où il en est, sa réponse déjà classée."]].map(([t, d]) => (
                <li key={t} className="rounded-2xl bg-[#F6F5F3] p-5"><p className="text-[18px] leading-tight text-ink" style={SERIF}>{t}</p><p className="mt-2 text-[15px] leading-[1.5] text-ink-soft">{d}</p></li>
              ))}
            </ul>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="max-w-[1280px] mx-auto px-4 sm:px-6 py-20 scroll-mt-24 border-t border-black/[.07]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-[38px] sm:text-[54px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Moins cher qu'une journée de commercial.</h2>
              <p className="mt-3 text-[17px] text-ink-soft">Aperçu gratuit de 7 jours pour voir tes premiers messages, sans carte bancaire. Prix hors taxes par mois, sans engagement.</p>
            </div>
            <div className="relative inline-flex rounded-full bg-white border border-line p-1 self-start md:self-auto">
              {[[false, "Mensuel"], [true, "Annuel"]].map(([v, l]) => <button key={l} onClick={() => setYearly(v)} className={cx("rounded-full px-5 py-2 text-[14.5px] font-bold transition", yearly === v ? "bg-ink text-white" : "text-ink-soft")}>{l}</button>)}
              <span className="absolute -top-3 -right-2 rounded-full bg-good text-white text-[11.5px] font-bold px-2 py-0.5">-20 %</span>
            </div>
          </div>
          {fond && fond.left > 0 && (
            <div className="mt-8 rounded-2xl border-2 border-accent/40 bg-accent-soft/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="flex-1 text-[16px] text-ink"><b className="font-bold">Prix fondateur : Solo à {fond.price} € à vie</b> pour les {fond.places} premiers abonnés. Ensuite, Solo passe à 39 €.</p>
              <div className="sm:w-56">
                <p className="text-[13px] text-ink-soft tnum">{fond.taken} place{fond.taken > 1 ? "s" : ""} prise{fond.taken > 1 ? "s" : ""} sur {fond.places}</p>
                <div className="mt-1 h-2 rounded-full bg-white overflow-hidden"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, (fond.taken / fond.places) * 100)}%` }} /></div>
              </div>
            </div>
          )}
          <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {PLANS.map(([n, p0, d, items], i) => {
              const best = i === 1;
              const fondateur = i === 0 && fond && fond.left > 0;
              const p = fondateur ? fond.price : p0;
              const annuel = Math.round(p * 12 * 0.8); // même calcul que la facturation Stripe
              const price = yearly ? Math.round(annuel / 12) : p;
              return (
                <div key={n} style={{ transitionDelay: `${i * 0.12}s` }} className={cx("reveal relative rounded-3xl p-7", best ? "bg-[#16171B] text-white md:pb-10 md:pt-10 shadow-[0_30px_60px_-30px_rgba(21,22,26,.6)]" : i === 0 ? "bg-white border border-line" : "bg-accent-soft/60 border border-accent/20")}>
                  {best && <span className="absolute -top-3.5 left-7 rounded-full bg-accent text-white text-[12.5px] font-bold px-3 py-1">Recommandé</span>}
                  <p className="font-bold text-[19px]">{n}</p>
                  <p className="mt-4">{fondateur && <span className="mr-2 text-[22px] text-ink-faint line-through tnum">{yearly ? Math.round(p0 * 0.8) : p0} €</span>}<span className="font-black text-[52px] leading-none" style={SERIF}>{price} €</span><span className={cx("text-[14px] ml-1.5", best ? "text-white/60" : "text-ink-faint")}>/ mois</span></p>
                  {(yearly || fondateur) && <p className={cx("text-[13px] mt-1", best ? "text-white/60" : "text-accent-dark font-semibold")}>{fondateur ? "prix fondateur, à vie" : ""}{fondateur && yearly ? " · " : ""}{yearly ? `facturé ${annuel} € par an` : ""}</p>}
                  <p className={cx("mt-4 text-[15px]", best ? "text-white/75" : "text-ink-soft")}>{d}</p>
                  <ul className="mt-5 space-y-2.5">{items.map((x) => <li key={x} className="flex items-center gap-2.5 text-[15px]"><Check className={cx("h-4 w-4 shrink-0", best ? "text-[#F6A06B]" : "text-accent")} />{x}</li>)}</ul>
                  <button onClick={go} className={cx("mt-7 w-full rounded-lg py-3.5 text-[16px] transition", best ? "bg-accent hover:bg-accent-dark text-white" : "bg-ink text-white hover:bg-black")}>Créer mon compte</button>
                </div>
              );
            })}
            <div className="reveal relative rounded-3xl p-7 bg-[#F6F5F3] border border-line" style={{ transitionDelay: ".36s" }}>
              <p className="font-bold text-[19px]">Entreprise</p>
              <p className="mt-4"><span className="font-black text-[40px] leading-none" style={SERIF}>Sur devis</span></p>
              <p className="mt-4 text-[15px] text-ink-soft">Au-delà de 5 commerciaux, ou pour de gros volumes.</p>
              <ul className="mt-5 space-y-2.5">{["Utilisateurs et volume sur mesure", "Tout ce qu'il y a dans Équipe", "Accompagnement au démarrage", "Facturation annuelle possible"].map((x) => <li key={x} className="flex items-center gap-2.5 text-[15px]"><Check className="h-4 w-4 shrink-0 text-accent" />{x}</li>)}</ul>
              <a href={`mailto:bingoo@maisonravita.fr?subject=${encodeURIComponent("Bingoo! Entreprise : demande de devis")}`} className="mt-7 block w-full rounded-lg py-3.5 text-center text-[16px] border border-ink/80 hover:bg-black/[.04] transition">Parler à l'équipe</a>
            </div>
          </div>
          {/* La garantie, juste sous les prix : c'est elle qui rend le prix sans risque */}
          <div className="mt-5 rounded-2xl bg-white border border-line px-5 py-4 flex items-start gap-3">
            <Check className="h-5 w-5 mt-0.5 shrink-0 text-good" />
            <p className="text-[15.5px] text-ink"><b className="font-bold">Premier mois remboursé.</b> <span className="text-ink-soft">Ni rendez-vous ni réponse positive pendant ton premier mois payant, alors que tu as laissé partir au moins 60 % des premiers messages de ta formule ? Ton premier mois t'est remboursé, sans rien demander.</span></p>
          </div>
          <p className="mt-6 text-center text-[14px] text-ink-soft">Sans engagement : tu changes de formule ou tu arrêtes quand tu veux. Besoin de plus ? +100 prospects contactés pour 19 €, quand tu veux. Un prospect contacté = une entreprise qui reçoit un premier e-mail, avec son décideur trouvé et vérifié ; les relances ne comptent pas.</p>
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
          <p className="text-[38px] sm:text-[56px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Une longueur d'avance sur tes prochains clients.</p>
          <p className="mt-4 text-[18px] text-ink-soft">15 minutes par jour. Bingoo! s'occupe du reste.</p>
          <div className="mt-8 inline-flex flex-col sm:flex-row gap-1.5 rounded-xl bg-[#F1EFED] p-1.5">
            <button onClick={go} className="rounded-lg bg-[#1C1C1C] text-white px-9 py-4 text-[17px] hover:bg-black transition">Créer mon compte</button>
            <a href="#essai" onClick={scrollTo("essai")} className="rounded-lg bg-white border border-black/10 px-9 py-4 text-[17px] hover:bg-[#FAFAF9] transition">Essayer avec mon produit</a>
          </div>
        </section>
        </div>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-[15px]">
          <div><p className="font-bold">Produit</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><a href="#preuve" onClick={scrollTo("preuve")} className="hover:text-ink">La preuve en vidéo</a></li><li><a href="#essai" onClick={scrollTo("essai")} className="hover:text-ink">Essai en direct</a></li><li><a href="#demandes" onClick={scrollTo("demandes")} className="hover:text-ink">Demandes publiques</a></li><li><a href="#village" onClick={scrollTo("village")} className="hover:text-ink">Ton village</a></li><li><a href="#extension" onClick={scrollTo("extension")} className="hover:text-ink">Extension Chrome</a></li><li><a href="#tarifs" onClick={scrollTo("tarifs")} className="hover:text-ink">Tarifs</a></li></ul></div>
          <div><p className="font-bold">Outils gratuits</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><a href="#/outils/contrats-publics" className="hover:text-ink">Contrats publics qui se terminent</a></li><li><a href="#/outils/analyse-concurrent" className="hover:text-ink">Analyse d'un concurrent</a></li></ul></div>
          <div><p className="font-bold">Pour qui</p><ul className="mt-4 space-y-2.5 text-ink-soft">{[["logiciels", "Fondateurs de SaaS"], ["agences", "Agences et cabinets"], ["nettoyage", "Nettoyage"], ["securite", "Sécurité"]].map(([k, l]) => <li key={k}><a href={`#/metier/${k}`} className="hover:text-ink">{l}</a></li>)}</ul></div>
          <div><p className="font-bold">Compte et légal</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><button onClick={() => nav("/connexion?mode=login")} className="hover:text-ink">Connexion</button></li><li><button onClick={go} className="hover:text-ink">Créer un compte</button></li>{legalReady && <><li><a href="#/mentions-legales" className="hover:text-ink">Mentions légales</a></li><li><a href="#/confidentialite" className="hover:text-ink">Confidentialité</a></li><li><a href="#/conditions" className="hover:text-ink">Conditions</a></li></>}<li><a href="#/opposition" className="hover:text-ink">Ne plus être contacté</a></li></ul></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
          <Logo height={34} />
          <p className="text-[13.5px] text-ink-faint">© {new Date().getFullYear()} Bingoo! · Une longueur d'avance sur tes prochains clients</p>
        </div>
      </footer>
    </div>
  );
}
