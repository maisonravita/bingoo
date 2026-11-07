import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { legalReady } from "./Legal";
import { cx } from "../lib/utils";
import { STORE_URL } from "../lib/ext";
import { DELAIS, TYPES, VALEURS, arrondi, estimer, euros, mensuel } from "../lib/estimation";
import { TEAM, Avatar } from "./Salaries";

// Page d'accueil publique de Bingoo! : la promesse, et l'essai immédiat sans compte (contrats publics qui se terminent).
const URL_ = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
async function call(action, body) {
  const res = await fetch(`${URL_}/functions/v1/r/${action}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || "Erreur réseau, réessaie");
  return data;
}
const D = { fontFamily: "var(--font-titre)", fontWeight: 800, letterSpacing: "-.03em" };
const JK = { fontFamily: "'Plus Jakarta Sans', Geist, system-ui, sans-serif" };
const SERIF = { fontFamily: "var(--font-titre)", fontWeight: 800, letterSpacing: "-.03em" };
const euro = (n) => n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : n >= 1e3 ? `${Math.round(n / 1e3).toLocaleString("fr-FR")} k€` : `${Math.round(n)} €`;
const scrollTo = (id) => (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
const Check = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;

const Arrow = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

const Chev = () => <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>;
const MENU = [
  ["Produit", [["Le bon moment", "Qui a besoin de toi, maintenant", "#produit"], ["Demandes publiques", "Ceux qui demandent déjà ta solution", "#demandes"], ["Décideurs et e-mails", "E-mail vérifié, téléphone, LinkedIn", "#contacts"], ["Tous les canaux", "E-mail, LinkedIn, appel : tu valides", "#equipe"], ["Plan d'action", "Ton objectif, chiffré honnêtement", "#plan"], ["Espion", "Ce que font tes concurrents", "#espion"], ["Essai en direct", "Teste sur ton marché", "#essai"]]],
  ["Solutions", [["Fondateurs de SaaS", "Prends les clients de tes concurrents", "#/metier/logiciels"], ["Startups B2B", "Tes premiers clients, au bon moment", "#pour-qui"], ["PME et TPE", "Un flux régulier de rendez-vous", "#pour-qui"], ["Agences et cabinets", "Les entreprises qui choisissent leurs partenaires", "#/metier/agences"], ["Services sur site", "Nettoyage, sécurité : les contrats à reprendre", "#/metier/nettoyage"]]],
    ["Cas d'usage", "#pour-qui"],
  ["Ressources", [["Tarifs", "Sans engagement, premier mois remboursé", "#tarifs"], ["Plan d'action", "Ton objectif, chiffré honnêtement", "#plan"], ["Outils gratuits", "Contrats publics, analyse de concurrent", "#/outils"], ["Questions fréquentes", "Tout ce qu'on nous demande", "#faq"]]],
];

/** Aperçu du produit sous le titre : la vraie liste du Radar (acheteurs publics réels, relus en direct), la fiche ouverte, le message prêt. */
const SRC = ["BODACC", "Sirene", "France Travail", "Reddit", "LinkedIn public", "BOAMP", "Sites web", "Forums et communautés", "Registre national des entreprises", "TED Europa"];
function SourcesRow() {
  return (
    <div id="donnees" className="mx-auto mt-16 max-w-[1180px] scroll-mt-24">
      <p className="text-[15px] text-ink-soft">Chaque nuit, Bingoo! lit des sources publiques et vérifiables. Chaque signal affiche la sienne.</p>
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
          <video src="./demo-inscription.mp4" poster="./demo-inscription.jpg" controls muted playsInline preload="none" className="w-full rounded-xl border border-black/10 bg-[#F1EFED]" aria-label="L'inscription Bingoo! : 6 questions, puis le plan d'action chiffré" />
          <figcaption className="mt-2 text-[13.5px] text-ink-soft">L'inscription dans la vraie application : 6 questions, puis ton plan d'action chiffré. Données d'exemple.</figcaption>
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

const WHO = [
  ["saas", "Fondateurs de SaaS", "Prends les clients de tes concurrents", "Tu codes, tu n'as pas le temps de prospecter. Bingoo! trouve qui utilise l'outil d'un concurrent, quand son abonnement arrive à échéance, qui recrute l'équipe qui utilisera ton produit, et qui demande en public une alternative. 15 minutes par jour suffisent.", ["Outils concurrents installés", "Demandes « alternative à… » sur Reddit et LinkedIn", "Recrutements et levées de fonds", "Visiteurs de ton site"]],
  ["startup", "Startups B2B", "Tes premiers clients, au bon moment", "Avant d'avoir une équipe commerciale, Bingoo! te sert de premier commercial : il teste plusieurs cibles, garde celles qui répondent, et te montre chaque semaine ce qui marche.", ["Plusieurs cibles testées en parallèle", "Entreprises qui viennent de lever ou de recruter", "Demandes publiques de ta solution", "Ce qui répond, chaque semaine"]],
  ["pme", "PME et TPE", "Un flux régulier de rendez-vous", "Chaque matin, les entreprises à contacter, la raison, le décideur et le message prêt. Tu valides, Bingoo! relance, et les rendez-vous arrivent dans ton agenda.", ["Nouveaux dirigeants et créations", "Recrutements liés à ton offre", "Déménagements et nouveaux sites", "Relances et appels avec script"]],
  ["services", "Agences et cabinets", "Arrive au moment où ils changent", "Agences, conseil, ESN, formation : Bingoo! repère les entreprises en mouvement, celles qui changent de dirigeant, recrutent ou ouvrent un site, et prépare le premier message.", ["Nouveaux dirigeants", "Recrutements liés à ton offre", "Levées de fonds", "Demandes de recommandation en public"]],
  ["terrain", "Services sur site", "Remporte les contrats avant l'appel d'offres", "Nettoyage, sécurité, maintenance, BTP : Bingoo! te montre les contrats publics qui se terminent, qui les tient aujourd'hui et qui contacter aux achats, des mois avant le nouvel appel d'offres.", ["Contrats publics à renouveler", "Appels d'offres de ta zone", "Déménagements et nouveaux sites", "Nouveaux dirigeants"]],
];
const PLANS = [
  ["Solo", 49, "Pour un fondateur qui prospecte seul, 15 minutes par jour.", ["1 utilisateur", "150 prospects contactés par mois", "Décideur trouvé, e-mail vérifié, message écrit pour lui", "Demandes publiques avec réponse prête, chaque jour", "Relances, Radar, Espion et LinkedIn inclus"]],
  ["Pro", 119, "Pour une startup ou une PME qui veut un flux régulier de rendez-vous.", ["3 utilisateurs", "500 prospects contactés par mois", "Décideur trouvé, e-mail vérifié, message écrit pour lui", "Demandes publiques avec réponse prête, chaque jour", "Répartition des prospects entre commerciaux"]],
  ["Équipe", 229, "Pour plusieurs commerciaux sur le même marché.", ["10 utilisateurs", "1 000 prospects contactés par mois", "Décideur trouvé, e-mail vérifié, message écrit pour lui", "Relances, Radar, Espion et LinkedIn inclus", "Accompagnement au démarrage"]],
];
const FAQ = [
  ["Et si je n'obtiens aucun résultat ?", "Pendant ton premier mois payant, si tu as laissé partir au moins 60 % des premiers messages de ta formule (90 sur Solo, 300 sur Pro, 600 sur Équipe) et que tu n'as obtenu ni rendez-vous ni réponse positive, ton premier mois t'est remboursé. Tu n'as rien à demander : Bingoo! le calcule et te prévient."],
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
function Feature({ id, title, text, bullets, video }) {
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
      {video && (
        <figure className="mx-auto max-w-[1300px] mt-10">
          <video src={`./${video}.mp4`} poster={`./${video}.jpg`} autoPlay loop muted playsInline className="w-full rounded-xl border border-black/10 bg-[#F1EFED]" aria-label={title} />
          <figcaption className="mt-2 text-[13.5px] text-ink-soft">Filmé sur un vrai compte Bingoo!, le 7 novembre 2026. Les noms et coordonnées des personnes sont floutés.</figcaption>
        </figure>
      )}
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

/** Ton village : la vraie interface de l'application, filmée sur un vrai compte (informations personnelles floutées). */
function Village() {
  return (
    <section id="village" className="scroll-mt-24 px-5 sm:px-10 lg:px-20 py-20 sm:py-28 border-t border-black/[.07]">
      <div className="mx-auto max-w-[1180px] grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 items-center">
        <div className="min-w-0">
          <h2 className="text-[36px] sm:text-[50px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Ton village, ton équipe au travail</h2>
          <p className="mt-6 text-[17px] sm:text-[19px] leading-[1.5] text-ink">Chaque bâtiment est une partie de ta prospection : Opportunités, Entreprises, Messages, Réponses, Rendez-vous, Concurrents. Les petits personnages, c'est ton équipe qui travaille. Un panneau te dit toujours quoi faire ensuite.</p>
          <ul className="mt-6 space-y-3 text-[16px] text-ink">
            {["Un coup d'œil : ce qui t'attend, bâtiment par bâtiment", "Un clic sur un bâtiment pour l'ouvrir", "« La nuit de ton équipe » : ce qui a été fait pendant que tu dormais"].map((x) => <li key={x} className="flex gap-2.5"><Check className="h-4 w-4 mt-1 shrink-0 text-accent" />{x}</li>)}
          </ul>
        </div>
        <figure className="min-w-0">
          <video src="./demo-village.mp4" poster="./demo-village.jpg" controls muted playsInline preload="none" className="w-full rounded-xl border border-black/10 bg-[#F1EFED]" aria-label="Le village Bingoo! et le bâtiment Opportunités" />
          <figcaption className="mt-2 text-[13.5px] text-ink-soft">Filmé sur un vrai compte Bingoo!. Les noms et coordonnées des personnes sont floutés.</figcaption>
        </figure>
      </div>
    </section>
  );
}

/** Ta journée dans Bingoo! : les demandes publiques avec ta réponse prête, les messages à valider. Vidéo de la vraie application. */
function Journee() {
  return (
    <section id="journee" className="scroll-mt-24 px-5 sm:px-10 lg:px-20 py-20 sm:py-28 border-t border-black/[.07]">
      <div className="mx-auto max-w-[1180px] grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 items-center">
        <div className="min-w-0">
          <h2 className="text-[36px] sm:text-[50px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Ta journée, en 15 minutes</h2>
          <p className="mt-6 text-[17px] sm:text-[19px] leading-[1.5] text-ink">Chaque matin, un seul écran : les gens qui cherchent ta solution en public, avec ta réponse prête, et les messages écrits pour les entreprises au bon moment.</p>
          <ul className="mt-6 space-y-3 text-[16px] text-ink">
            {["Tu relis, tu corriges un mot si tu veux", "Tu copies ta réponse, tu la publies toi-même", "Tu envoies le message d'un clic. Bingoo! relance pour toi"].map((x) => <li key={x} className="flex gap-2.5"><Check className="h-4 w-4 mt-1 shrink-0 text-accent" />{x}</li>)}
          </ul>
        </div>
        <figure className="min-w-0">
          <video src="./demo-journee.mp4" poster="./demo-journee.jpg" controls muted playsInline preload="none" className="w-full rounded-xl border border-black/10 bg-[#F1EFED]" aria-label="L'écran Aujourd'hui de Bingoo! : demandes publiques et messages à valider" />
          <figcaption className="mt-2 text-[13.5px] text-ink-soft">L'écran « Aujourd'hui » de la vraie application. Données d'exemple.</figcaption>
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
          <p className="mt-6 max-w-[620px] text-[17px] sm:text-[19px] leading-[1.5] text-ink">L'extension Chrome emmène Bingoo! sur le web. Elle est gratuite pour les clients et facultative : tout le reste marche sans elle.</p>
          <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2.5 rounded-lg bg-ink text-white px-6 py-3.5 text-[17px] hover:bg-black transition">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M12 8.5h8.5M8.97 13.75 4.7 6.35M15.03 13.75l-4.25 7.37" /></svg>
            Ajouter à Chrome
          </a>
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

/** Le plan d'action, comme à la fin de l'inscription : le visiteur règle 3 curseurs et voit une fourchette, hypothèses à l'appui. */
function PlanSection({ go }) {
  const [type, setType] = useState("saas");
  const [valeur, setValeur] = useState(120);
  const [h, setH] = useState(3);
  const e = estimer({ type, valeur, horizon: h });
  const [c0, c1] = e.clients.map(arrondi);
  const m = mensuel(type);
  return (
    <section id="plan" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-14 sm:py-20 border-t border-black/[.07]">
      <div className="mx-auto max-w-[1300px] grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-10 lg:gap-20 [&>*]:min-w-0">
        <div>
          <h2 className="text-[36px] sm:text-[50px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>Ton objectif, chiffré honnêtement</h2>
          <p className="mt-6 max-w-[520px] text-[17px] sm:text-[19px] leading-[1.5] text-ink">À l'inscription, tu dis ce que tu es, ce que vaut un client et ce que tu vises. Bingoo! te donne un plan d'action : les canaux, le rythme, et une fourchette de ce que ça peut rapporter. Pas de projection inventée : les hypothèses sont affichées, et tes vrais taux les remplacent dès les premiers envois.</p>
          <button onClick={go} className="mt-8 rounded-lg bg-ink text-white px-6 py-3.5 text-[16px] hover:bg-black transition">Obtenir mon plan d'action</button>
        </div>
        <div className="rounded-2xl border border-line bg-[#FAF9F6] p-5 sm:p-7">
          <div className="grid grid-cols-2 gap-3 text-[14px]">
            <label className="block"><span className="block text-ink-soft mb-1">Tu es</span>
              <select value={type} onChange={(x) => { setType(x.target.value); setValeur(mensuel(x.target.value) ? 120 : 5000); }} className="w-full rounded-lg border border-line bg-white px-3 py-2.5">{TYPES.map(([k]) => <option key={k} value={k}>{{ saas: "SaaS ou logiciel", app: "Application", startup: "Startup", pme: "PME", tpe: "TPE, indépendant", agence: "Agence, cabinet" }[k]}</option>)}</select></label>
            <label className="block col-span-2 order-last"><span className="block text-ink-soft mb-1">Un client rapporte</span>
              <select value={valeur} onChange={(x) => setValeur(Number(x.target.value))} className="w-full rounded-lg border border-line bg-white px-3 py-2.5">{VALEURS[m ? "mois" : "an"].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="block"><span className="block text-ink-soft mb-1">Horizon</span>
              <select value={h} onChange={(x) => setH(Number(x.target.value))} className="w-full rounded-lg border border-line bg-white px-3 py-2.5">{DELAIS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          </div>
          <p className="mt-7 text-[13px] font-semibold text-accent-dark">Ton plan d'action</p>
          <p className="mt-1 text-[34px] sm:text-[42px] leading-[1.05] text-ink" style={SERIF}>{c0} à {c1} nouveaux clients</p>
          <p className="mt-2 text-[16px] text-ink-soft">soit {euros(e.revenu[0])} à {euros(e.revenu[1])} {m ? "de revenu récurrent en plus chaque mois" : "de chiffre d'affaires signé"}, {DELAIS.find(([v]) => Number(v) === h)?.[1].toLowerCase()}.</p>
          <ul className="mt-6 space-y-2 text-[15px] text-ink">
            {["15 e-mails et 10 invitations LinkedIn par jour, écrits par Bingoo!, validés par toi", "Les demandes publiques du jour, avec ta réponse prête", "Un appel avec script après deux relances sans réponse"].map((x) => <li key={x} className="flex gap-2.5"><Check className="h-4 w-4 mt-1 shrink-0 text-accent" />{x}</li>)}
          </ul>
          <details className="mt-5 text-[13.5px] text-ink-soft"><summary className="cursor-pointer font-medium text-ink">Comment on calcule</summary><ul className="mt-2 list-disc pl-5 space-y-1">{e.hypotheses.map((x) => <li key={x}>{x}</li>)}</ul></details>
        </div>
      </div>
    </section>
  );
}

/** Ce qui fait la différence au quotidien : le téléphone qui sonne, les séquences, les boîtes d'envoi, la vérification, l'apprentissage, les imports. */
export default function Landing() {
  const nav = useNavigate();
  useReveal();
  const tryState = useTry();
  const [who, setWho] = useState("saas");
  const [yearly, setYearly] = useState(false);
  const go = () => nav("/connexion");
  const w = WHO.find((x) => x[0] === who);
  return (
    <div className="min-h-full bg-[#FAF9F6] text-ink">
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}@keyframes land-in{from{opacity:0;transform:translateY(10px)}}.land-in{animation:land-in .45s ease-out both}@keyframes drift{50%{transform:translateY(-8px)}}@keyframes marquee{to{transform:translateX(-50%)}}.marquee-track{animation:marquee 32s linear infinite}.marquee:hover .marquee-track{animation-play-state:paused}@media (prefers-reduced-motion: reduce){.marquee-track{animation:none;flex-wrap:wrap;width:auto;justify-content:center}}`}</style>

      {/* Haut de page : fond clair, menu blanc */}
      <div className="bg-white">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-black/[.04]">
          <div className="mx-auto max-w-[1280px] h-[72px] px-4 sm:px-8 flex items-center justify-between gap-4" style={JK}>
            <div className="flex items-center gap-12">
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Bingoo!"><Logo height={34} /></button>
              <nav className="hidden lg:flex items-center gap-9 text-[16px] font-medium text-ink whitespace-nowrap">
                {MENU.map(([t, items]) => Array.isArray(items) ? (
                  <div key={t} className="relative group">
                    <button className="inline-flex items-center gap-1.5 py-4 hover:opacity-70" aria-haspopup="true">{t}<Chev /></button>
                    <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition absolute left-0 top-full z-40">
                      <div className="w-72 rounded-xl bg-white text-ink shadow-[0_20px_50px_-20px_rgba(21,22,26,.45)] border border-black/10 p-2">
                        {items.map(([l, d, href]) => <a key={l} href={href} onClick={href.startsWith("#/") ? undefined : scrollTo(href.slice(1))} className="block rounded-lg px-3 py-2.5 hover:bg-black/[.04]"><span className="block text-[15px] font-medium">{l}</span><span className="block text-[13px] text-ink-soft">{d}</span></a>)}
                      </div>
                    </div>
                  </div>
                ) : <a key={t} href={items} onClick={scrollTo(items.slice(1))} className="py-4 hover:opacity-70">{t}</a>)}
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
              <span className="block text-[34px] sm:text-[54px] lg:text-[72px] leading-[1.1] text-[#3A3F55]" style={{ fontWeight: 500, letterSpacing: "-.01em" }}>Vous avez le business parfait.</span>
              <span className="mt-1 block text-[40px] sm:text-[64px] lg:text-[84px] leading-[1.1] text-[#1E2030]" style={{ fontWeight: 700, letterSpacing: "-.01em" }}>Il vous manque des clients ?</span>
              <span className="mt-4 sm:mt-6 flex justify-center"><span className="sr-only">Bingoo!</span><Logo height="clamp(64px, 9vw, 112px)" className="!self-center" /></span>
              <span aria-hidden className="pointer-events-none absolute right-0 xl:-right-6 -top-10 hidden lg:flex flex-col items-end text-[24px] text-[#3A3F55] rotate-[-4deg]" style={{ fontFamily: "Caveat, cursive", fontWeight: 500, letterSpacing: 0 }}>
                (oui, ils n'apparaissent pas comme par magie)
                <svg viewBox="0 0 40 60" className="mr-16 mt-1 h-12 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 2c10 14 8 34-10 52M12 54l-2-12M12 54l11-6" /></svg>
              </span>
            </h1>
            <p className="hero-in mx-auto mt-7 max-w-[760px] text-[18px] sm:text-[22px] leading-[1.45] text-[#3A3F55]" style={{ ...JK, animationDelay: ".1s" }}>Bingoo! trouve les entreprises qui ont besoin de vous aujourd'hui, le bon décideur, et décroche le rendez-vous. <span className="font-semibold text-accent-dark">Votre chiffre décolle.</span></p>
            <form onSubmit={(e) => { e.preventDefault(); try { sessionStorage.setItem("bingoo-email", e.currentTarget.email.value.trim()); } catch { /* navigation privée */ } go(); }}
              className="hero-in mx-auto mt-9 flex max-w-[680px] flex-col sm:flex-row items-stretch gap-2 rounded-[28px] sm:rounded-full border border-black/[.08] bg-white p-2 shadow-[0_10px_40px_-20px_rgba(21,23,42,.35)]" style={{ ...JK, animationDelay: ".2s" }}>
              <label className="sr-only" htmlFor="hero-email">Votre e-mail</label>
              <input id="hero-email" name="email" type="email" autoComplete="email" placeholder="votre@email.com" className="min-w-0 flex-1 bg-transparent px-5 py-3.5 text-[17px] outline-none placeholder:text-[#8A8FA3]" />
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1B1D2A] px-8 py-3.5 text-[17px] font-semibold text-white hover:bg-black transition">Commencer <Arrow className="h-4 w-4" /></button>
            </form>
            <div className="hero-in mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[15px] text-[#5B6075]" style={{ ...JK, animationDelay: ".25s" }}>
              {["15 minutes par jour", "Premier mois remboursé sans rendez-vous ni réponse", "Pour les SaaS, startups et PME B2B"].map((x) => <span key={x} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-accent" />{x}</span>)}
            </div>
            <p className="mt-6 text-[13.5px] text-ink-faint">En continuant, j'accepte les <a href="#/conditions" className="underline hover:text-ink">Conditions d'utilisation</a> et la <a href="#/confidentialite" className="underline hover:text-ink">Politique de confidentialité</a> de Bingoo!.</p>
            {/* Le produit en 4 étapes : c'est une vraie séquence, d'où les numéros */}
            <ol className="mx-auto mt-14 grid max-w-[1100px] gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
              {[["Tu réponds à 6 questions", "Ton type d'entreprise, ce que vaut un client, ton objectif. Puis le lien de ton produit."], ["Bingoo! trouve qui a besoin de toi", "Les entreprises au bon moment, leur décideur vérifié, et ceux qui demandent ta solution en public."], ["Il écrit sur tous les canaux", "E-mail, LinkedIn, réponses aux demandes, appels. Tu valides en 15 minutes par jour."], ["Tu prends les rendez-vous", "Les réponses arrivent triées, avec la tienne déjà prête. Le rendez-vous va dans ton agenda."]].map(([h, d], i) => (
                <li key={h} className="rounded-2xl bg-[#F6F5F3] p-5">
                  <span className="text-[15px] text-accent-dark tnum">{i + 1}</span>
                  <p className="mt-1 text-[19px] leading-tight text-ink" style={SERIF}>{h}</p>
                  <p className="mt-1.5 text-[14.5px] leading-snug text-ink-soft">{d}</p>
                </li>
              ))}
            </ol>
            {/* L'essai en direct, juste sous le titre : le visiteur voit ses propres clients potentiels, sans compte */}
            <div id="essai" className="mx-auto mt-16 max-w-[1300px] text-left scroll-mt-24"><TryIt t={tryState} /></div>
            <SourcesRow />
          </section>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1440px] bg-white">

        <Feature video="preuve-radar" id="produit" title="Qui a besoin de toi, maintenant" text="Chaque nuit, le Radar repère les entreprises qui viennent de bouger : elles recrutent, lèvent des fonds, changent de dirigeant, utilisent l'outil de ton concurrent ou voient leur contrat se terminer. C'est là qu'elles choisissent un fournisseur." bullets={[["radar", <><b className="font-medium">Signaux SaaS</b> : outils concurrents installés, abonnements qui arrivent à échéance, recrutements de l'équipe qui utilisera ton produit</>], ["doc", <><b className="font-medium">Annonces légales</b> : nouveau dirigeant, création, levée, déménagement</>], ["eye", <><b className="font-medium">Intention</b> : visites de ton site, clients mécontents d'un concurrent, contrats publics à renouveler</>]]} />
        <Feature id="demandes" title="Ils demandent déjà ta solution" text="Chaque matin, Bingoo! lit Reddit, LinkedIn, X et les forums : « quelqu'un connaît un outil pour… », « une alternative à… ». Il te prépare une réponse utile et honnête. Tu la relis, tu la publies toi-même." bullets={[["inbox", <><b className="font-medium">Les demandes du jour</b>, en français et en anglais, avec le lien exact</>], ["send", <><b className="font-medium">Ta réponse prête</b> : un vrai conseil d'abord, ton produit ensuite</>], ["shield", <><b className="font-medium">Jamais de publication automatique</b> : ton compte et ton ton restent à toi</>]]} />
        <Feature video="preuve-contacts" id="contacts" title="Le bon décideur, son e-mail vérifié" text="Dans chaque entreprise, Bingoo! trouve la personne qui signe : son e-mail professionnel vérifié, son téléphone, son profil LinkedIn. Jamais une adresse devinée." bullets={[["user", <><b className="font-medium">La bonne fonction</b> : fondateur, direction générale, commercial, DSI ou RH selon ton offre</>], ["mail", <><b className="font-medium">E-mail et téléphone</b> publiés ou vérifiés, avec leur source</>], ["link", <><b className="font-medium">Profil LinkedIn</b> pour une invitation en parallèle</>]]} />
        <Feature video="preuve-canaux" id="equipe" title="Il écrit sur tous les canaux. Tu valides." text="Pour chaque décideur, un message qui part de ce qui se passe chez lui. E-mail, invitation LinkedIn, relances, puis un appel avec son script si personne ne répond. Rien ne part sans toi." bullets={[["send", <><b className="font-medium">Messages et relances</b> écrits pour chaque entreprise, jamais un modèle</>], ["link", <><b className="font-medium">LinkedIn</b> : invitation et message envoyés par l'extension, depuis ton compte</>], ["layers", <><b className="font-medium">Un seul parcours</b> : s'il répond par e-mail, LinkedIn s'arrête</>]]} />
        <Feature id="rendez-vous" title="Les réponses deviennent des rendez-vous" text="Les réponses arrivent triées, avec la tienne déjà écrite. Ton téléphone te prévient dès qu'un décideur est intéressé." bullets={[["bell", <><b className="font-medium">Une alerte</b> sur ton téléphone pour chaque réponse intéressée</>], ["cal", <><b className="font-medium">Les rendez-vous</b> dans ton agenda, avec une fiche de préparation</>], ["import", <><b className="font-medium">Ton CRM</b> : les contacts qui avancent arrivent dans HubSpot ou Pipedrive</>]]} />
        <PlanSection go={go} />
        <Feature video="preuve-espion" id="espion" title="L'Espion : fais comme tes concurrents, en mieux" text="L'Espion suit tes concurrents chaque semaine : ce qu'ils vendent, leurs prix, leurs publicités, leurs avis. Il en tire l'angle pour leur prendre des clients." bullets={[["eye", <><b className="font-medium">Veille continue</b> : prix, offres et publicités qui changent</>], ["star", <><b className="font-medium">Avis clients</b> : les mécontents deviennent des opportunités</>], ["target", <><b className="font-medium">Ton angle</b> repris dans chaque message</>]]} />

        <Extension />

        <Village />

        <Journee />


        {/* Pour qui */}
        <section id="pour-qui" className="bg-white border-y border-line scroll-mt-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
            <h2 className="text-center text-[38px] sm:text-[54px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>À qui s'adresse Bingoo! ?</h2>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3" role="tablist">
              {WHO.map(([k, l]) => <button key={k} role="tab" aria-selected={who === k} onClick={() => setWho(k)} className={cx("rounded-2xl border px-4 py-4 text-left font-bold text-[15.5px] transition", who === k ? "bg-accent border-accent text-white" : "bg-[#FAF9F6] border-line hover:border-ink-faint")}>{l}</button>)}
            </div>
            <div className="mt-10 grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-center" role="tabpanel">
              <div>
                <h3 className="font-black text-[30px] sm:text-[38px] leading-[1.05]" style={D}>{w[2]}</h3>
                <p className="mt-4 text-[17px] leading-relaxed text-ink-soft max-w-xl">{w[3]}</p>
                <button onClick={go} className="mt-7 rounded-lg bg-ink text-white px-6 py-3.5 text-[16px] hover:bg-black transition">Créer mon compte</button>
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
              <p className="mt-3 text-[17px] text-ink-soft">Aperçu gratuit de 7 jours pour voir tes premiers messages, sans carte bancaire. Prix hors taxes par mois, sans engagement.</p>
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
                  <button onClick={go} className={cx("mt-7 w-full rounded-lg py-3.5 text-[16px] transition", best ? "bg-accent hover:bg-accent-dark text-white" : "bg-ink text-white hover:bg-black")}>Créer mon compte</button>
                </div>
              );
            })}
          </div>
          <div className="mt-8 mx-auto max-w-3xl rounded-3xl border-2 border-accent/30 bg-white px-6 py-5 text-center">
            <p className="font-bold text-[18px] text-ink">Premier mois remboursé</p>
            <p className="mt-1.5 text-[15px] text-ink-soft">Ni rendez-vous ni réponse positive pendant ton premier mois payant, alors que tu as laissé partir au moins 60 % des premiers messages de ta formule ? Ton premier mois t'est remboursé.</p>
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
          <div><p className="font-bold">Produit</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><a href="#produit" onClick={scrollTo("produit")} className="hover:text-ink">Le bon moment</a></li><li><a href="#demandes" onClick={scrollTo("demandes")} className="hover:text-ink">Demandes publiques</a></li><li><a href="#contacts" onClick={scrollTo("contacts")} className="hover:text-ink">Décideurs et e-mails</a></li><li><a href="#plan" onClick={scrollTo("plan")} className="hover:text-ink">Plan d'action</a></li><li><a href="#espion" onClick={scrollTo("espion")} className="hover:text-ink">Espion</a></li><li><a href="#tarifs" onClick={scrollTo("tarifs")} className="hover:text-ink">Tarifs</a></li></ul></div>
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
