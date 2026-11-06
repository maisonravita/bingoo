import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { legalReady } from "./Legal";
import { cx } from "../lib/utils";
import { TEAM, Avatar } from "./Salaries";

// Page d'accueil publique de Bingoo! : la promesse, et l'essai immédiat sans compte (contrats publics qui se terminent).
const URL_ = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
async function call(action, body) {
  const res = await fetch(`${URL_}/functions/v1/r/${action}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || "Erreur réseau, réessaie");
  return data;
}
const D = { fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 400, letterSpacing: "-.02em" };
const SERIF = { fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 400, fontOpticalSizing: "auto" };
const euro = (n) => n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : n >= 1e3 ? `${Math.round(n / 1e3).toLocaleString("fr-FR")} k€` : `${Math.round(n)} €`;
const scrollTo = (id) => (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
const Check = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;

const Arrow = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

const Chev = () => <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>;
const MENU = [
  ["Produit", [["Radar", "Qui va acheter, et quand", "#produit"], ["Contacts des décideurs", "E-mail, téléphone, LinkedIn", "#contacts"], ["Tes salariés IA", "Neuf métiers, du repérage au rendez-vous", "#equipe"], ["Essai en direct", "Teste le Radar sur ton marché", "#essai"], ["Ta ville interactive", "La carte de ton équipe, à jouer", "#ville"], ["Extension Chrome", "Bingoo! sur chaque site et sur LinkedIn", "#extension"], ["Nouveautés", "Téléphone, séquences, boîtes d'envoi", "#nouveautes"]]],
  ["Solutions", [["Nettoyage", "Les contrats à reprendre avant l'appel d'offres", "#/metier/nettoyage"], ["Sécurité", "Gardiennage et surveillance à renouveler", "#/metier/securite"], ["Agences", "Les entreprises qui choisissent leurs partenaires", "#/metier/agences"], ["Logiciels / SaaS", "Prends les clients de tes concurrents", "#/metier/logiciels"], ["Indépendants", "Un commercial à temps plein", "#pour-qui"]]],
  ["Nos données", [["Sources officielles", "BOAMP, BODACC, Sirene, DECP, TED", "#donnees"]]],
  ["Tarifs", null],
  ["Ressources", [["Outils gratuits", "Contrats publics, analyse de concurrent", "#/outils"], ["Questions fréquentes", "Tout ce qu'on nous demande", "#faq"]]],
];

/** Aperçu du produit sous le titre : la vraie liste du Radar (acheteurs publics réels, relus en direct), la fiche ouverte, le message prêt. */
const SRC = ["BOAMP", "BODACC", "Sirene", "DECP", "TED Europa", "Sites web", "Registre national des entreprises", "Données de la commande publique"];
function SourcesRow() {
  return (
    <div id="donnees" className="mx-auto mt-16 max-w-[1180px] scroll-mt-24">
      <p className="text-[15px] text-ink-soft">Bingoo! lit chaque nuit des sources officielles et vérifiables</p>
      <div className="marquee mt-6 overflow-hidden" style={{ maskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)" }}>
        <ul className="marquee-track flex w-max items-center text-[22px] sm:text-[26px] text-ink/45" style={SERIF}>
          {[...SRC, ...SRC].map((x, i) => <li key={i} aria-hidden={i >= SRC.length} className="shrink-0 whitespace-nowrap px-6 sm:px-9">{x}</li>)}
        </ul>
      </div>
    </div>
  );
}

/** Les coordonnées du décideur : ce que Bingoo! trouve pour chaque opportunité. */
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

const Lock = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;

/** Essai universel : « tes clients, c'est qui ? » → les entreprises de cette cible qui vivent un moment d'achat (annonces légales officielles).
 *  Marche pour un logiciel, un service ou un produit. 3 en clair, la suite floutée, le décideur verrouillé (jamais de faux contact). */
const TRY_STEPS = [["Bingoo! lit ton site", "Ce que tu vends, à qui, dans quelle zone."], ["Le Radar fouille les annonces officielles", "Créations, reprises et ouvertures des 45 derniers jours."], ["Tu vois tes clients potentiels", "Ceux qui choisissent leurs fournisseurs en ce moment."]];
function TryIt({ t }) {
  const nav = useNavigate();
  const { f, setF, r, err, busy, search } = t;
  const [step, setStep] = useState(0);
  useEffect(() => { if (!busy) { setStep(0); return; } setStep(0); const a = setTimeout(() => setStep(1), 2500), b = setTimeout(() => setStep(2), 6000); return () => { clearTimeout(a); clearTimeout(b); }; }, [busy]);
  return (
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-start [&>*]:min-w-0">
      <div className="lg:pt-6">
        <h2 className="text-[38px] sm:text-[54px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Essaie le Radar sur ton entreprise</h2>
        <p className="mt-6 max-w-[560px] text-[17px] sm:text-[19px] leading-[1.5] text-ink">Donne l'adresse de ton site. En une minute, Bingoo! te montre des entreprises qui pourraient devenir tes clients, et pourquoi c'est le moment.</p>
        <form onSubmit={search} className="mt-10 grid sm:grid-cols-[minmax(0,1fr)_auto] gap-3">
          <label className="sr-only" htmlFor="tr-url">Ton site</label>
          <div className="flex items-center rounded-lg border border-[#8A8682] bg-white focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10 min-w-0">
            <span className="pl-4 text-[17px] text-ink-faint select-none">https://</span>
            <input id="tr-url" value={f.url} onChange={(e) => setF({ url: e.target.value.replace(/^https?:\/\//i, "") })} placeholder="tonentreprise.fr" inputMode="url" autoComplete="url" className="w-full min-w-0 bg-transparent px-1 py-4 text-[17px] outline-none" />
          </div>
          <button type="submit" disabled={busy || !f.url.trim()} className="rounded-lg bg-accent text-white px-7 py-4 text-[17px] hover:bg-accent-dark disabled:opacity-50 transition">{busy ? "Recherche…" : "Lancer le Radar"}</button>
        </form>
        {err && <p className="mt-4 rounded-lg bg-[#FDF0EC] px-4 py-3 text-[15px] text-[#9A3412]">{err}</p>}
        <p className="mt-6 text-[15px] text-ink-soft">Gratuit, sans compte. Tu vends aux collectivités ? <a href="#/outils/contrats-publics" className="underline hover:text-ink">Vois leurs contrats qui se terminent</a>.</p>
        <figure className="mt-10">
          <video src="./demo-radar.mp4" poster="./demo-radar.jpg" controls muted playsInline preload="none" className="w-full rounded-xl border border-black/10 bg-[#F1EFED]" aria-label="Démonstration du Radar en 30 secondes" />
          <figcaption className="mt-2 text-[13.5px] text-ink-soft">Démo réelle en 30 secondes : le Radar lancé sur notre propre site, résultats du 4 novembre 2026.</figcaption>
        </figure>
      </div>

      <div className="rounded-2xl bg-[#F1EFED] p-4 sm:p-8 min-h-[420px]">
        {!r ? (
          <ol className="space-y-3">
            {TRY_STEPS.map(([h, d], i) => {
              const on = busy && step === i, done = busy && step > i;
              return (
                <li key={h} className={cx("flex gap-4 rounded-xl bg-white p-5 transition", on ? "ring-2 ring-accent/40" : "", !busy || on || done ? "opacity-100" : "opacity-60")}>
                  <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px]", done ? "bg-good text-white" : on ? "bg-accent text-white" : "bg-[#F1EFED] text-ink")}>{done ? <Check className="h-4 w-4" /> : on ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : i + 1}</span>
                  <div><p className="text-[19px] leading-tight text-ink" style={SERIF}>{h}</p><p className="mt-1 text-[14.5px] text-ink-soft">{d}</p></div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="space-y-3">
            {r.offre && <div className="rounded-xl bg-white p-4"><p className="text-[12.5px] text-ink-soft">Bingoo! a compris</p><p className="mt-1 text-[15px] text-ink"><b className="font-medium">{r.nom}</b> : {r.offre.replace(/\.$/, "")}{r.clients ? `, ${r.clients.replace(/\.$/, "")}` : ""}.</p></div>}
            <p className="px-1 pt-1 text-[16px] text-ink"><span className="text-[34px] leading-none tracking-[-.02em] align-[-4px]" style={SERIF}>{r.total}</span> client{r.total > 1 ? "s" : ""} potentiel{r.total > 1 ? "s" : ""} en France, {r.jours > 1 ? `ces ${r.jours} derniers jours` : "ces dernières 24 heures"}</p>
            {!r.total && <p className="rounded-xl bg-white p-4 text-[14.5px] text-ink-soft">Rien de neuf ces dernières semaines sur ta cible. Avec un compte, le Radar suit aussi les changements de dirigeant, les recrutements et les appels d'offres.</p>}
            {r.visibles.map((c, i) => (
              <div key={i} className="rounded-xl bg-white p-4 land-in" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="flex items-center justify-between gap-2"><span className="rounded bg-[#FFF1E8] px-1.5 py-0.5 text-[11.5px] font-medium text-accent-dark">{c.signal}</span><span className="text-[12.5px] text-ink-soft">{new Date(c.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span></div>
                <p className="mt-2 text-[16px] font-medium text-ink">{c.nom}{c.ville ? <span className="font-normal text-ink-soft">, {c.ville}</span> : null}</p>
                <p className="text-[13.5px] text-ink-soft line-clamp-2">{c.activite}</p>
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-md bg-[#F6F5F3] px-2.5 py-1.5 text-[12.5px]"><span className="text-ink-soft">Le décideur</span><span className="flex items-center gap-1.5"><span className="select-none blur-[4px] text-ink">Prénom Nom</span><Lock className="h-3.5 w-3.5 text-ink-soft" /></span></div>
              </div>
            ))}
            {(r.apercu ?? []).slice(0, 3).map((c, i) => (
              <div key={`a${i}`} className="relative rounded-xl bg-white/70 p-4">
                <p className="text-[12.5px] text-ink-soft">{c.signal}{c.ville ? `, ${c.ville}` : ""}</p>
                <p className="select-none blur-[5px] text-[16px] text-ink" aria-hidden>Entreprise masquée</p>
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 text-[12px] text-ink-soft"><Lock className="h-3 w-3" />Avec un compte</span>
              </div>
            ))}
            {r.caches > 0 && <button onClick={() => nav("/connexion")} className="w-full rounded-lg bg-[#1C1C1C] py-4 text-[16px] text-white hover:bg-black transition">Voir les {r.caches} autres et leurs décideurs</button>}
          </div>
        )}
      </div>
    </div>
  );
}

const WHO = [
  ["terrain", "Services sur site", "Remporte les contrats avant l'appel d'offres", "Nettoyage, sécurité, maintenance, BTP : Bingoo! te montre les contrats publics qui se terminent, qui les tient aujourd'hui et qui contacter aux achats, des mois avant le nouvel appel d'offres.", ["Contrats publics à renouveler", "Appels d'offres de ta zone", "Déménagements et nouveaux sites", "Nouveaux dirigeants"]],
  ["services", "Services aux entreprises", "Arrive au moment où ils changent", "Agences, conseil, ESN, formation : Bingoo! repère les entreprises en mouvement, celles qui changent de dirigeant, recrutent ou ouvrent un site, et prépare le premier message.", ["Nouveaux dirigeants", "Créations d'entreprises", "Recrutements liés à ton offre", "Levées de fonds"]],
  ["saas", "Logiciels / SaaS", "Prends les clients de tes concurrents", "Bingoo! lit les sites et les offres d'emploi : qui utilise un outil concurrent, quand son abonnement arrive probablement à échéance, qui recrute l'équipe qui va utiliser ton produit, qui visite ton site.", ["Outils concurrents installés", "Renouvellements d'abonnement probables", "Recrutements", "Visiteurs de ton site et équipes à l'essai"]],
  ["solo", "Indépendants", "Un commercial à temps plein, pour 49 € par mois", "Tu n'as pas le temps de prospecter : chaque matin, Bingoo! te donne 3 entreprises à contacter, avec la raison, le contact et le message prêt.", ["3 entreprises par jour", "Message prêt à valider", "Relances automatiques", "Rendez-vous dans ton agenda"]],
];
const PLANS = [
  ["Solo", 49, "Pour un indépendant ou un dirigeant qui prospecte seul.", ["1 utilisateur", "60 entreprises cherchées par jour", "40 recherches de contact par jour", "80 messages rédigés par jour", "Radar, Espion et LinkedIn inclus", "Budget IA de 11 € inclus"]],
  ["Pro", 109, "Pour une PME qui veut un flux régulier de rendez-vous.", ["3 utilisateurs", "120 entreprises cherchées par jour", "80 recherches de contact par jour", "160 messages rédigés par jour", "Radar, Espion et LinkedIn inclus", "Budget IA de 24 € inclus"]],
  ["Équipe", 159, "Pour plusieurs commerciaux sur le même marché.", ["10 utilisateurs", "240 entreprises cherchées par jour", "160 recherches de contact par jour", "320 messages rédigés par jour", "Radar, Espion et LinkedIn inclus", "Budget IA de 46 € inclus"]],
];
const FAQ = [
  ["Bingoo! envoie-t-il des messages sans mon accord ?", "Non. Par défaut, chaque message attend ta validation. Tu peux ensuite activer le pilote automatique, dans la limite d'envoi que tu fixes."],
  ["D'où viennent les informations ?", "De sources publiques et vérifiables : données de la commande publique, BOAMP, annonces légales (BODACC), registre national des entreprises, sites des entreprises. Chaque signal affiche sa source."],
  ["Et le RGPD ?", "Bingoo! travaille au niveau de l'entreprise et des fonctions qui décident. Les e-mails sont publiés ou vérifiés, jamais devinés, et chaque message permet de ne plus être contacté."],
  ["Ça marche pour mon métier ?", "Bingoo! s'adapte à ton activité à l'inscription : services sur site, services aux entreprises, logiciels ou produits. Il ne cherche pas les mêmes signaux pour une entreprise de nettoyage et pour un éditeur de logiciel."],
  ["À quoi sert l'extension Chrome ?", "Elle affiche la fiche d'une entreprise sur son propre site, fait sur LinkedIn les invitations et les messages que tu as validés (à un rythme humain, dans des limites prudentes) et reconnaît tes prospects dans Gmail. Elle est facultative : tout le reste marche sans elle."],
  ["Est-ce que je risque mon compte LinkedIn ?", "Bingoo! ne fait jamais d'envoi en masse ni d'aspiration de profils. Le pilote ne fait que ce que tu as validé, avec des pauses et des limites quotidiennes basses, depuis ton propre navigateur."],
  ["Que se passe-t-il après les 14 jours ?", "Tu choisis une formule, ou ton espace s'arrête simplement. Aucune carte bancaire n'est demandée pour l'essai."],
];

/* ---------- Sections façon Apollo, adaptées à Bingoo! ---------- */
const ICONS = {
  radar: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 12l5-5" /></>,
  doc: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h6M9.5 16h6" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12" /><circle cx="12" cy="12" r="3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  link: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" /></>,
  spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></>,
  send: <><path d="M4 12 20 4l-6 16-3-7z" /><path d="m11 13 9-9" /></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  flag: <><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></>,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  puzzle: <><path d="M14 4a2 2 0 1 0-4 0v2H6v4h2a2 2 0 1 1 0 4H6v4h4v-2a2 2 0 1 1 4 0v2h4v-4h-2a2 2 0 1 1 0-4h2V6h-4z" /></>,
  inbox: <><path d="M3 13h5l1.5 2.5h5L16 13h5" /><path d="M5 5h14l2 8v6H3v-6z" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
  learn: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
  import: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 21h16" /></>,
};
const Ico = ({ k, className = "h-6 w-6" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONS[k]}</svg>;

/** Une capacité de Bingoo! : le titre et ce qu'elle fait, puis trois points concrets. Pas d'écran dessiné. */
function Feature({ id, title, text, bullets }) {
  return (
    <section id={id} className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-14 sm:py-20 border-t border-black/[.07] first:border-t-0">
      <div className="mx-auto max-w-[1300px] grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-10 lg:gap-20 [&>*]:min-w-0">
        <div>
          <h2 className="text-[36px] sm:text-[50px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>{title}</h2>
          <p className="mt-6 max-w-[520px] text-[17px] sm:text-[19px] leading-[1.5] text-ink">{text}</p>
        </div>
        <ul className="space-y-6 lg:pt-3">
          {bullets.map(([k, t], i) => <li key={i} className="flex gap-4 text-[17px] sm:text-[18px] leading-[1.45] text-ink"><Ico k={k} className="h-7 w-7 shrink-0 text-ink" /><span>{t}</span></li>)}
        </ul>
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

/** Ta ville : la nuit rejouée, et le mode Jouer (se promener, ouvrir une entreprise, répondre, envoyer). */
function Ville() {
  const [v, setV] = useState("jouer");
  const VIDS = { jouer: ["./demo-carte.mp4", "./demo-carte.jpg", "Le mode Jouer : se promener dans sa ville, ouvrir une entreprise, répondre et envoyer depuis la carte"], nuit: ["./demo-equipe.mp4", "./demo-equipe.jpg", "Une nuit de l'équipe Bingoo! rejouée dans Paris"] };
  return (
    <section id="ville" className="scroll-mt-24 px-5 sm:px-10 lg:px-20 py-20 sm:py-28 border-t border-black/[.07]">
      <div className="mx-auto max-w-[1100px] grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 items-center">
        <div className="min-w-0">
          <h2 className="text-[36px] sm:text-[50px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Ta ville, à conquérir</h2>
          <p className="mt-6 text-[17px] sm:text-[19px] leading-[1.5] text-ink">Tes entreprises cibles sont placées dans les vraies rues de ta ville. Elle se colore à mesure que tu avances : contactées, en discussion, gagnées. Chaque matin, Bingoo! te rejoue la nuit de ton équipe.</p>
          <p className="mt-4 text-[17px] leading-[1.5] text-ink">Appuie sur <b className="font-medium">Jouer</b> : tu te promènes, tu entres chez une entreprise, tu lis sa réponse et tu envoies ton message, sans quitter la carte.</p>
          <div className="mt-6 inline-flex rounded-lg bg-[#F1EFED] p-1" role="tablist">
            {[["jouer", "Le mode Jouer"], ["nuit", "La nuit rejouée"]].map(([k, l]) => <button key={k} role="tab" aria-selected={v === k} onClick={() => setV(k)} className={cx("rounded-md px-4 py-2 text-[15px] transition", v === k ? "bg-white shadow-sm text-ink" : "text-ink-soft hover:text-ink")}>{l}</button>)}
          </div>
        </div>
        <figure className="min-w-0">
          <video key={v} src={VIDS[v][0]} poster={VIDS[v][1]} controls muted playsInline preload="none" className="w-full rounded-xl border border-black/10 bg-[#0b0910]" aria-label={VIDS[v][2]} />
          <figcaption className="mt-2 text-[13.5px] text-ink-soft">Démonstration avec des données d'exemple, dans les vraies rues de Paris. Carte © contributeurs OpenStreetMap.</figcaption>
        </figure>
      </div>
    </section>
  );
}

/** L'extension Chrome : ce qu'elle fait, en trois points (sans écran dessiné). */
function Extension() {
  const items = [
    ["puzzle", "Sur chaque site", "Ouvre le site d'une entreprise : sa fiche s'affiche en un clic, avec le dirigeant, la taille et ce qui bouge chez elle. Tu l'ajoutes à tes prospects sans copier-coller."],
    ["link", "Le pilote LinkedIn", "Tu valides les invitations et les messages dans Bingoo!, l'extension les fait pour toi, avec des pauses et des limites prudentes, depuis ton propre navigateur."],
    ["mail", "Dans Gmail", "Quand un prospect t'écrit, sa fiche s'affiche à côté de son message : ce qu'il a reçu, où il en est, et sa réponse déjà classée."],
  ];
  return (
    <section id="extension" className="scroll-mt-24 px-5 sm:px-10 lg:px-20 py-20 sm:py-28 border-t border-black/[.07]">
      <div className="mx-auto max-w-[1300px]">
        <div className="max-w-[820px]">
          <h2 className="text-[38px] sm:text-[54px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Bingoo! partout où tu prospectes</h2>
          <p className="mt-6 max-w-[620px] text-[17px] sm:text-[19px] leading-[1.5] text-ink">L'extension Chrome emmène Bingoo! sur le web. Elle est facultative : tout le reste marche sans elle.</p>
        </div>
        <ul className="mt-14 grid sm:grid-cols-3 gap-x-10 gap-y-10">
          {items.map(([k, t, d]) => (
            <li key={t} className="min-w-0">
              <Ico k={k} className="h-7 w-7 text-ink" />
              <p className="mt-3 text-[19px] font-medium text-ink">{t}</p>
              <p className="mt-2 text-[16px] leading-[1.5] text-ink-soft">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Ce qui fait la différence au quotidien : le téléphone qui sonne, les séquences, les boîtes d'envoi, la vérification, l'apprentissage, les imports. */
function Nouveautes() {
  const items = [
    ["bell", "Les réponses chaudes sur ton téléphone", "Dès qu'une réponse intéressée arrive, ton téléphone ou ton ordinateur te prévient, avec la réponse déjà rédigée. Tu la relis, tu l'envoies."],
    ["layers", "Séquences multicanales", "E-mail, LinkedIn et appel, aux jours que tu choisis. Les relances partent dans le même fil, et tout s'arrête dès que le prospect répond."],
    ["inbox", "Plusieurs boîtes d'envoi", "Branche plusieurs adresses : les envois tournent entre elles, chacune dans sa limite du jour. Tu envoies plus sans abîmer ta réputation."],
    ["shield", "Chaque adresse vérifiée", "Avant chaque envoi : adresse mal formée, jetable, domaine qui ne reçoit rien, adresse déjà revenue en erreur. Une adresse douteuse ne part jamais."],
    ["learn", "Bingoo! apprend ce qui marche", "Il regarde ce qu'ont en commun les entreprises qui t'ont dit oui, et cherche d'abord celles qui leur ressemblent."],
    ["import", "Tes listes et ton CRM", "Importe tes relations LinkedIn ou un export Waalaxy, lemlist, Sales Navigator. Les prospects qui avancent arrivent dans HubSpot ou Pipedrive."],
  ];
  return (
    <section id="nouveautes" className="scroll-mt-24 px-5 sm:px-10 lg:px-20 py-20 sm:py-28 border-t border-black/[.07]">
      <div className="mx-auto max-w-[1300px]">
        <div className="max-w-[820px]">
          <h2 className="text-[38px] sm:text-[54px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>De la réponse au rendez-vous, sans rien laisser filer</h2>
          <p className="mt-6 max-w-[620px] text-[17px] sm:text-[19px] leading-[1.5] text-ink">Le matin, Bingoo! te dit quoi faire, dans l'ordre, et combien de temps ça prend. Le reste de la journée, il te prévient quand ça compte.</p>
        </div>
        <ul className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
          {items.map(([k, t, d]) => (
            <li key={t} className="min-w-0">
              <Ico k={k} className="h-7 w-7 text-ink" />
              <p className="mt-3 text-[19px] font-medium text-ink">{t}</p>
              <p className="mt-2 text-[16px] leading-[1.5] text-ink-soft">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Landing() {
  const nav = useNavigate();
  useReveal();
  const tryState = useTry();
  const [who, setWho] = useState("terrain");
  const [yearly, setYearly] = useState(false);
  const go = () => nav("/connexion");
  const w = WHO.find((x) => x[0] === who);
  return (
    <div className="min-h-full bg-[#FAF9F6] text-ink">
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}@keyframes land-in{from{opacity:0;transform:translateY(10px)}}.land-in{animation:land-in .45s ease-out both}@keyframes drift{50%{transform:translateY(-8px)}}@keyframes marquee{to{transform:translateX(-50%)}}.marquee-track{animation:marquee 32s linear infinite}.marquee:hover .marquee-track{animation-play-state:paused}@media (prefers-reduced-motion: reduce){.marquee-track{animation:none;flex-wrap:wrap;width:auto;justify-content:center}}`}</style>

      {/* Haut de page : cadre gris, menu à plat, panneau blanc */}
      <div className="bg-[#D6D1CD]">
        <header className="sticky top-0 z-30 bg-[#D6D1CD]">
          <div className="mx-auto max-w-[1440px] h-[64px] px-4 sm:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-10">
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Bingoo!"><Logo height={26} /></button>
              <nav className="hidden lg:flex items-center gap-8 text-[17px] text-ink">
                {MENU.map(([t, items]) => items ? (
                  <div key={t} className="relative group">
                    <button className="inline-flex items-center gap-1.5 py-4 hover:opacity-70" aria-haspopup="true">{t}<Chev /></button>
                    <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition absolute left-0 top-full z-40">
                      <div className="w-72 rounded-xl bg-white text-ink shadow-[0_20px_50px_-20px_rgba(21,22,26,.45)] border border-black/10 p-2">
                        {items.map(([l, d, href]) => <a key={l} href={href} onClick={href.startsWith("#/") ? undefined : scrollTo(href.slice(1))} className="block rounded-lg px-3 py-2.5 hover:bg-black/[.04]"><span className="block text-[15px] font-medium">{l}</span><span className="block text-[13px] text-ink-soft">{d}</span></a>)}
                      </div>
                    </div>
                  </div>
                ) : <a key={t} href="#tarifs" onClick={scrollTo("tarifs")} className="hover:opacity-70">{t}</a>)}
              </nav>
            </div>
            <div className="flex items-center gap-3 sm:gap-5 text-[16px] sm:text-[17px]">
              <button onClick={() => nav("/connexion?mode=login")} className="hover:opacity-70 text-[15px] sm:text-[17px]">Se connecter</button>
              <a href="#essai" onClick={scrollTo("essai")} className="hidden md:inline-flex rounded-lg border border-ink px-5 py-2.5 hover:bg-black/[.04]">Essayer avec mon site</a>
              <button onClick={go} className="rounded-lg bg-accent text-white px-4 sm:px-5 py-2.5 hover:bg-accent-dark transition">S'inscrire</button>
            </div>
          </div>
        </header>

        <div className="px-0 sm:px-8">
          <section className="mx-auto max-w-[1440px] bg-white px-5 sm:px-10 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
            <h1 className="hero-in mx-auto max-w-[1100px] text-ink text-[46px] sm:text-[72px] lg:text-[96px] leading-[1.02] tracking-[-.035em]" style={SERIF}>Trouve qui va acheter ton offre, et quand</h1>
            <p className="hero-in mx-auto mt-8 max-w-[690px] text-[18px] sm:text-[21px] leading-[1.45] text-ink" style={{ animationDelay: ".1s" }}>Passe plus de temps à vendre et moins à chercher, grâce à une équipe commerciale IA qui repère les entreprises prêtes à acheter, trouve le décideur et prépare le message.</p>
            <div className="hero-in mt-10 inline-flex flex-col sm:flex-row gap-1.5 rounded-xl bg-[#F1EFED] p-1.5" style={{ animationDelay: ".2s" }}>
              <button onClick={go} className="rounded-lg bg-[#1C1C1C] text-white px-10 py-4 text-[18px] sm:text-[19px] hover:bg-black transition">Créer mon compte</button>
              <a href="#essai" onClick={scrollTo("essai")} className="rounded-lg bg-white border border-black/10 px-10 py-4 text-[18px] sm:text-[19px] hover:bg-[#FAFAF9] transition">Essayer avec mon site</a>
            </div>
            <div className="hero-in mt-8" style={{ animationDelay: ".25s" }}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EFED] px-3 py-1.5 text-[14.5px] text-ink-soft"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>14 jours gratuits, sans carte bancaire</span>
            </div>
            <p className="mt-8 text-[14.5px] text-ink-soft">En m'inscrivant, j'accepte les <a href="#/conditions" className="underline hover:text-ink">Conditions d'utilisation</a> et la <a href="#/confidentialite" className="underline hover:text-ink">Politique de confidentialité</a> de Bingoo!.</p>
            {/* L'essai en direct, juste sous le titre : le visiteur voit ses propres clients potentiels, sans compte */}
            <div id="essai" className="mx-auto mt-16 max-w-[1300px] text-left scroll-mt-24"><TryIt t={tryState} /></div>
            <SourcesRow />
          </section>
        </div>
      </div>

      <main className="bg-[#D6D1CD] px-0 sm:px-8 pb-8">
        <div className="mx-auto max-w-[1440px] bg-white">

        <Feature id="produit" title="Sache qui va acheter, et quand" text="Chaque nuit, le Radar lit les sources officielles et le web. Il te montre les entreprises qui ont une raison d'acheter maintenant, avec la date, le montant et la source." bullets={[["radar", <><b className="font-medium">Contrats publics</b> qui se terminent, avec le titulaire actuel et l'acheteur</>], ["doc", <><b className="font-medium">Annonces légales</b> : nouveau dirigeant, création, reprise, déménagement</>], ["eye", <><b className="font-medium">Signaux d'intention</b> : visites de ton site, recrutements, clients mécontents d'un concurrent</>]]} />
        <Feature id="contacts" title="Trouve la personne qui décide" text="Pour chaque opportunité, Bingoo! cherche qui signe et comment le joindre. Tu ouvres la fiche, tu appelles ou tu écris." bullets={[["user", <><b className="font-medium">La bonne fonction</b> : achats, direction générale, DSI ou RH selon ton offre</>], ["mail", <><b className="font-medium">E-mail et téléphone</b> publiés ou vérifiés, jamais devinés</>], ["link", <><b className="font-medium">Profil LinkedIn</b> pour un premier contact</>]]} />
        <Feature id="equipe" title="Laisse tes salariés IA faire le reste" text="Donne un objectif en une phrase. Mission choisit les cibles, prépare un message qui part du signal, relance et pose les rendez-vous. Tu valides à chaque étape clé." bullets={[["spark", <><b className="font-medium">Mission</b> : de l'objectif au rendez-vous posé</>], ["send", <><b className="font-medium">Messages et relances</b> écrits à partir de la raison d'acheter</>], ["cal", <><b className="font-medium">Réponses triées</b>, rendez-vous dans ton agenda, devis envoyés</>]]} />
        <Feature id="espion" title="Connais tes concurrents mieux qu'eux" text="L'Espion suit tes concurrents chaque semaine : ce qu'ils vendent, leurs prix, leurs publicités, leurs avis. Il en tire l'angle pour leur prendre des clients." bullets={[["eye", <><b className="font-medium">Veille continue</b> : prix, offres et publicités qui changent</>], ["star", <><b className="font-medium">Avis clients</b> : les mécontents deviennent des opportunités</>], ["target", <><b className="font-medium">Dossiers de combat</b> envoyés à Mission pour tes messages</>]]} />


        <Ville />

        <Extension />

        <Nouveautes />


        {/* Pour qui */}
        <section id="pour-qui" className="bg-white border-y border-line scroll-mt-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
            <h2 className="text-center text-[38px] sm:text-[54px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>À qui s'adresse Bingoo! ?</h2>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3" role="tablist">
              {WHO.map(([k, l]) => <button key={k} role="tab" aria-selected={who === k} onClick={() => setWho(k)} className={cx("rounded-2xl border px-4 py-4 text-left font-bold text-[15.5px] transition", who === k ? "bg-accent border-accent text-white" : "bg-[#FAF9F6] border-line hover:border-ink-faint")}>{l}</button>)}
            </div>
            <div className="mt-10 grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-center" role="tabpanel">
              <div>
                <h3 className="font-black text-[30px] sm:text-[38px] leading-[1.05]" style={D}>{w[2]}</h3>
                <p className="mt-4 text-[17px] leading-relaxed text-ink-soft max-w-xl">{w[3]}</p>
                <button onClick={go} className="mt-7 rounded-full bg-ink text-white px-6 py-3 font-bold hover:bg-black transition">Créer mon compte</button>
              </div>
              <ul className="rounded-2xl bg-[#FAF9F6] border border-line p-6 space-y-3.5">
                <li className="text-[14px] text-ink-soft">Les signaux que Bingoo! surveille pour toi</li>
                {w[4].map((s) => <li key={s} className="flex items-center gap-3 text-[16.5px] font-semibold"><span className="h-7 w-7 rounded-full bg-accent-soft text-accent-dark grid place-items-center shrink-0"><Check className="h-4 w-4" /></span>{s}</li>)}
              </ul>
            </div>
          </div>
        </section>



        {/* Tarifs */}
        <section id="tarifs" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-[38px] sm:text-[54px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Moins cher qu'une journée de commercial.</h2>
              <p className="mt-3 text-[17px] text-ink-soft">14 jours gratuits, sans carte bancaire. Ensuite, prix hors taxes par mois, sans engagement.</p>
            </div>
            <div className="relative inline-flex rounded-full bg-white border border-line p-1 self-start md:self-auto">
              {[[false, "Mensuel"], [true, "Annuel"]].map(([v, l]) => <button key={l} onClick={() => setYearly(v)} className={cx("rounded-full px-5 py-2 text-[14.5px] font-bold transition", yearly === v ? "bg-ink text-white" : "text-ink-soft")}>{l}</button>)}
              <span className="absolute -top-3 -right-2 rounded-full bg-good text-white text-[11.5px] font-bold px-2 py-0.5">-20 %</span>
            </div>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-4 items-end">
            {PLANS.map(([n, p, d, items], i) => {
              const best = i === 1;
              const annuel = Math.round(p * 12 * 0.8); // même calcul que la facturation Stripe
              const price = yearly ? Math.round(annuel / 12) : p;
              return (
                <div key={n} style={{ transitionDelay: `${i * 0.12}s` }} className={cx("reveal relative rounded-3xl p-7", best ? "bg-[#16171B] text-white md:pb-10 md:pt-10 shadow-[0_30px_60px_-30px_rgba(21,22,26,.6)]" : i === 0 ? "bg-white border border-line" : "bg-accent-soft/60 border border-accent/20")}>
                  {best && <span className="absolute -top-3.5 left-7 rounded-full bg-accent text-white text-[12.5px] font-bold px-3 py-1">Recommandé</span>}
                  <p className="font-bold text-[19px]">{n}</p>
                  <p className="mt-4"><span className="font-black text-[52px] leading-none" style={D}>{price} €</span><span className={cx("text-[14px] ml-1.5", best ? "text-white/60" : "text-ink-faint")}>/ mois</span></p>
                  {yearly && <p className={cx("text-[13px] mt-1", best ? "text-white/60" : "text-ink-faint")}>facturé {annuel} € par an</p>}
                  <p className={cx("mt-4 text-[15px]", best ? "text-white/75" : "text-ink-soft")}>{d}</p>
                  <ul className="mt-5 space-y-2.5">{items.map((x) => <li key={x} className="flex items-center gap-2.5 text-[15px]"><Check className={cx("h-4 w-4 shrink-0", best ? "text-[#F6A06B]" : "text-accent")} />{x}</li>)}</ul>
                  <button onClick={go} className={cx("mt-7 w-full rounded-full py-3.5 font-bold transition", best ? "bg-accent hover:bg-accent-dark text-white" : "bg-ink text-white hover:bg-black")}>Créer mon compte</button>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-[14px] text-ink-soft">Sans engagement : tu changes de formule ou tu arrêtes quand tu veux. Besoin de plus ? Des crédits IA s'achètent depuis l'application, dès 7 €.</p>
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
          <button onClick={go} className="mt-8 rounded-full bg-ink text-white px-9 py-4 font-bold text-[17px] hover:bg-black transition">Créer mon compte</button>
        </section>
        </div>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-[15px]">
          <div><p className="font-bold">Produit</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><a href="#produit" onClick={scrollTo("produit")} className="hover:text-ink">Radar</a></li><li><a href="#espion" onClick={scrollTo("espion")} className="hover:text-ink">Espion</a></li><li><a href="#equipe" onClick={scrollTo("equipe")} className="hover:text-ink">Mission</a></li><li><a href="#tarifs" onClick={scrollTo("tarifs")} className="hover:text-ink">Tarifs</a></li></ul></div>
          <div><p className="font-bold">Outils gratuits</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><a href="#/outils/contrats-publics" className="hover:text-ink">Contrats publics qui se terminent</a></li><li><a href="#/outils/analyse-concurrent" className="hover:text-ink">Analyse d'un concurrent</a></li></ul></div>
          <div><p className="font-bold">Par métier</p><ul className="mt-4 space-y-2.5 text-ink-soft">{[["nettoyage", "Nettoyage"], ["securite", "Sécurité"], ["agences", "Agences"], ["logiciels", "Logiciels / SaaS"]].map(([k, l]) => <li key={k}><a href={`#/metier/${k}`} className="hover:text-ink">{l}</a></li>)}</ul></div>
          <div><p className="font-bold">Compte et légal</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><button onClick={() => nav("/connexion?mode=login")} className="hover:text-ink">Connexion</button></li><li><button onClick={go} className="hover:text-ink">Créer un compte</button></li>{legalReady && <><li><a href="#/mentions-legales" className="hover:text-ink">Mentions légales</a></li><li><a href="#/confidentialite" className="hover:text-ink">Confidentialité</a></li><li><a href="#/conditions" className="hover:text-ink">Conditions</a></li></>}<li><a href="#/opposition" className="hover:text-ink">Ne plus être contacté</a></li></ul></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
          <Logo height={34} />
          <p className="text-[13.5px] text-ink-faint">© {new Date().getFullYear()} Bingoo! · Ton équipe commerciale IA</p>
        </div>
      </footer>
    </div>
  );
}
