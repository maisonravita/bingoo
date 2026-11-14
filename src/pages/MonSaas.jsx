// L'espace de son SaaS, une fois construit : l'accueil (chiffres et prochaine étape), l'atelier, les premiers clients,
// la vidéo pub, les réglages et le dossier du projet.
import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import { Spinner } from "../components/ui";
import { lienApp } from "../components/AppCadre";
import { nomCanal as nomBrut } from "../lib/plan30";
const nomCanal = (c) => { const n = nomBrut(c) ?? ""; return n.charAt(0).toUpperCase() + n.slice(1); };
import { angleDe } from "../lib/angle";
import { ONGLETS_APP, PremiersClients, ReglagesApp } from "./Explorer";
import { Chantier } from "./Revelation";

const VideoPub = lazy(() => import("../components/VideoPub"));
const HF = { fontFamily: "var(--font-titre)" };
const eur = (n) => `${Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };

// Le SaaS du créateur (le plus récent qui n'a pas été remplacé) et son projet
function useMonSaas() {
  const { ws } = useWs();
  const [m, setM] = useState(undefined);
  const charger = async () => {
    const { data } = await supabase.from("saas_apps").select("id, slug, spec, statut, version, domaine, domaine_statut, paiement, icones, public, projet_id, saas_projets(id, data)")
      .eq("workspace_id", ws.id).neq("statut", "remplace").order("at", { ascending: false }).limit(1);
    const a = data?.[0];
    if (!a) { setM(null); return null; }
    const projet = a.saas_projets ? { id: a.saas_projets.id, ...a.saas_projets.data } : null;
    const r = { app: a, projet, domaine: projet?.inspire?.domaine ?? null, nom: a.spec?.nom ?? projet?.nom ?? "Mon SaaS", couleur: a.spec?.couleur ?? "#E8571C" };
    setM(r); return r;
  };
  useEffect(() => { charger(); }, [ws.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return [m, charger];
}

export default function MonSaas({ page }) {
  const [m, charger] = useMonSaas();
  const { ws } = useWs();
  const nav = useNavigate();
  if (m === undefined) return <div className="py-24 grid place-items-center"><Spinner /></div>;
  if (!m) return <PasEncore />;
  if (page === "atelier") return <Chantier ws={ws} nav={nav} init={{ domaine: m.domaine, nom: m.projet?.inspire?.nom ?? m.domaine, projet: m.projet ? { id: m.projet.id, nom: m.projet.nom, pitch: m.projet.pitch, cible: m.projet.cible } : null, app: m.app }} atelier />;
  if (page === "dossier") return m.domaine ? <Navigate to={`/explorer/lancer?d=${encodeURIComponent(m.domaine)}`} replace /> : <PasEncore />;
  return (
    <div>
      {page === "mon-saas" && <Accueil m={m} />}
      {page === "clients" && <Clients m={m} />}
      {page === "methodes" && <CeQuiMarche m={m} />}
      {page === "video" && <Video m={m} />}
      {page === "reglages-saas" && <Reglages m={m} charger={charger} />}
    </div>
  );
}

// ---------------------------------------------------------------- Briques, dans l'esprit de l'administration Shopify
const OMBRE = "shadow-[0_1px_0_0_rgba(26,26,26,.07),0_0_0_1px_rgba(26,26,26,.07)]";
export function Carte({ titre, sous, actions, children, className, pad = true }) {
  return (
    <section className={cx("rounded-xl bg-white", OMBRE, className)}>
      {(titre || actions) && (
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0"><h2 className="text-[14px] font-semibold text-[#1A1A1A]">{titre}</h2>{sous && <p className="mt-0.5 text-[13px] text-[#616161]">{sous}</p>}</div>
          {actions}
        </div>
      )}
      <div className={cx(pad && "p-4")}>{children}</div>
    </section>
  );
}
export const Bouton = ({ principal, className, ...p }) => (
  <button {...p} className={cx("inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition disabled:opacity-50",
    principal ? "bg-[#303030] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_1px_0_rgba(0,0,0,.4)] hover:bg-[#1A1A1A]" : "bg-white text-[#303030] shadow-[0_1px_0_rgba(0,0,0,.08),0_0_0_1px_rgba(0,0,0,.12)] hover:bg-[#F7F7F7]", className)} />
);
export function Tete({ titre, sous, actions, icone }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      {icone}
      <div className="min-w-0 flex-1">
        <h1 className="text-[20px] font-bold leading-tight text-[#1A1A1A]">{titre}</h1>
        {sous && <div className="mt-0.5 text-[13px] text-[#616161]">{sous}</div>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
const Tuile = ({ m, size = "h-9 w-9 text-[16px] rounded-[10px]" }) => (
  <span className={cx("grid shrink-0 place-items-center font-black text-white", size)} style={{ background: `linear-gradient(140deg, ${m.couleur}, ${m.couleur}cc)` }}>{m.nom.charAt(0).toUpperCase()}</span>
);

function PasEncore() {
  return (
    <Carte className="mx-auto mt-10 max-w-lg text-center">
      <div className="py-6">
        <h1 className="text-[20px] font-bold">Ton SaaS n'est pas encore construit</h1>
        <p className="mt-1 text-[13.5px] text-[#616161]">Choisis un SaaS qui marche déjà : Bingoo! construit ta version et la met en ligne.</p>
        <NavLink to="/explorer/trouver" className="mt-4 inline-block rounded-lg bg-[#303030] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1A1A1A]">Trouver mon SaaS</NavLink>
      </div>
    </Carte>
  );
}

const ICONES = {
  ligne: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />,
  stripe: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
  domaine: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  video: <><rect x="3" y="6" width="13" height="12" rx="2.5" /><path d="m16 10.5 5-3v9l-5-3" /></>,
  clients: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2a5 5 0 0 1 5.5 5" /></>,
};
const Ic = ({ k, className = "h-5 w-5" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONES[k]}</svg>;

// ---------------------------------------------------------------- Accueil : ses chiffres, le guide de lancement, son SaaS
function Accueil({ m }) {
  const { ws } = useWs();
  const nav = useNavigate();
  const [ch, setCh] = useState(null);
  const [videos, setVideos] = useState(null);
  const [lance, setLance] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [copie, setCopie] = useState(false);
  const lien = lienApp(m.app.slug, m.app.domaine_statut === "ok" ? m.app.domaine : null);
  useEffect(() => {
    fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: m.app.id, quoi: "chiffres" }).then(setCh, () => setCh({}));
    fn("r/saas-videos", { workspace_id: ws.id, app_id: m.app.id }).then((r) => setVideos(r.videos?.length ?? 0), () => setVideos(0));
    if (m.domaine) supabase.from("saas_lancements").select("id").eq("workspace_id", ws.id).eq("domaine", m.domaine).maybeSingle().then(({ data }) => setLance(!!data));
    else setLance(false);
  }, [m.app.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const etapes = [
    { k: "ligne", t: "Mettre ton SaaS en ligne", d: `${m.nom} est construit, vérifié et en ligne, avec les comptes de tes clients.`, ok: true },
    { k: "stripe", t: "Encaisser tes clients", d: "Branche ton compte Stripe : l'argent de tes abonnés arrive directement chez toi, sans commission de Bingoo!.", ok: !!m.app.paiement?.actif, to: "/explorer/reglages-saas?onglet=encaisser", cta: "Brancher Stripe" },
    { k: "domaine", t: "Ajouter ton nom de domaine", d: "monsaas.fr au lieu d'une adresse Bingoo! : plus professionnel, et mieux référencé sur Google.", ok: m.app.domaine_statut === "ok", to: "/explorer/reglages-saas?onglet=domaine", cta: "Ajouter un domaine" },
    { k: "video", t: "Créer ta vidéo pub", d: "20 secondes animées à tes couleurs, prêtes pour TikTok, Reels et ta page d'accueil.", ok: videos > 0, to: "/explorer/video", cta: "Créer ma vidéo" },
    { k: "clients", t: "Trouver tes 10 premiers clients", d: "Ton plan jour par jour : où trouver tes clients et quoi leur dire.", ok: !!lance, to: "/explorer/clients", cta: "Voir mon plan" },
  ];
  const faites = etapes.filter((e) => e.ok).length;
  const premier = etapes.find((e) => !e.ok)?.k ?? null;
  const vu = ouvert === undefined ? null : (ouvert ?? premier);
  const kpi = [["Visiteurs", ch?.visites_30j ?? null, "30 derniers jours"], ["Comptes créés", ch?.comptes ?? null, ch?.nouveaux_7j ? `+${ch.nouveaux_7j} cette semaine` : "au total"], ["Clients payants", ch?.abonnes ?? null, ch?.essais ? `${ch.essais} en essai` : "abonnés actifs"], ["Revenu mensuel", ch ? eur(ch.mrr) : null, "abonnements en cours"]];

  return (
    <>
      <Tete icone={<Tuile m={m} />} titre={m.nom}
        sous={<span className="inline-flex flex-wrap items-center gap-x-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#CDFEE1] px-2 py-0.5 text-[12px] font-semibold text-[#0C5132]"><span className="h-1.5 w-1.5 rounded-full bg-[#29845A]" />En ligne</span>
          <button onClick={() => navigator.clipboard?.writeText(lien).then(() => { setCopie(true); setTimeout(() => setCopie(false), 1600); })} className="truncate hover:text-[#1A1A1A] hover:underline">{copie ? "Lien copié" : lien.replace(/^https?:\/\//, "")}</button></span>}
        actions={<><Bouton onClick={() => window.open(lien, "_blank", "noopener")}>Voir mon SaaS</Bouton><Bouton principal onClick={() => nav("/explorer/atelier")}>Ouvrir l'atelier</Bouton></>} />

      <Carte pad={false}>
        <div className="grid grid-cols-2 divide-[#EBEBEB] lg:grid-cols-4 lg:divide-x">
          {kpi.map(([l, v, sous], i) => (
            <div key={l} className={cx("p-4", i < 2 && "border-b border-[#EBEBEB] lg:border-b-0", i % 2 === 0 && "border-r border-[#EBEBEB] lg:border-r-0")}>
              <p className="text-[12.5px] font-medium text-[#616161] underline decoration-dotted decoration-[#B5B5B5] underline-offset-4">{l}</p>
              <p className="mt-1.5 text-[22px] font-bold leading-none tnum text-[#1A1A1A]">{v ?? (ch ? 0 : "…")}</p>
              <p className="mt-1.5 text-[12px] text-[#8A8A8A]">{sous}</p>
            </div>
          ))}
        </div>
      </Carte>

      <Carte className="mt-4" pad={false}>
        <div className="px-4 pt-4">
          <h2 className="text-[14px] font-semibold">Guide de lancement</h2>
          <p className="mt-0.5 text-[13px] text-[#616161]">Les étapes qui transforment ton SaaS en ligne en un SaaS qui encaisse.</p>
          <div className="mt-3 flex items-center gap-3"><span className="text-[12.5px] text-[#616161] tnum">{faites} sur {etapes.length} tâches terminées</span><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#EBEBEB]"><div className="h-full rounded-full bg-[#303030] transition-all duration-700" style={{ width: `${(faites / etapes.length) * 100}%` }} /></div></div>
        </div>
        <ul className="mt-3 p-2">
          {etapes.map((e) => {
            const o = vu === e.k;
            return (
              <li key={e.k} className={cx("rounded-xl transition", o && "bg-[#F7F7F7]")}>
                <button onClick={() => setOuvert(o ? undefined : e.k)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-[#F7F7F7]">
                  {e.ok ? <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#303030] text-white"><svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>
                    : <span className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-dashed border-[#8A8A8A]" />}
                  <span className={cx("flex-1 text-[13.5px]", o ? "font-semibold" : "font-medium", e.ok && !o && "text-[#616161]")}>{e.t}</span>
                </button>
                {o && (
                  <div className="flex items-start gap-4 px-2.5 pb-4 pl-[42px]">
                    <div className="flex-1">
                      <p className="text-[13px] text-[#616161]">{e.d}</p>
                      {!e.ok && e.to && <Bouton principal className="mt-3" onClick={() => nav(e.to)}>{e.cta}</Bouton>}
                    </div>
                    <span className="hidden h-[84px] w-[84px] shrink-0 place-items-center rounded-2xl sm:grid" style={{ background: `${m.couleur}14`, color: m.couleur }}><Ic k={e.k} className="h-9 w-9" /></span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Carte>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Carte titre="Ton SaaS" sous="Ce que voient tes clients" actions={<Bouton onClick={() => window.open(lien, "_blank", "noopener")}>Ouvrir</Bouton>}>
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg ring-1 ring-[#EBEBEB]">
            <iframe title={`Aperçu de ${m.nom}`} src={lien} tabIndex={-1} className="pointer-events-none absolute left-0 top-0 h-[300%] w-[300%] origin-top-left scale-[.3333] border-0" />
          </div>
        </Carte>
        <div className="space-y-4">
          <Carte titre="Atelier" sous="Demande un changement en une phrase et regarde-le arriver en direct.">
            <Bouton principal className="w-full" onClick={() => nav("/explorer/atelier")}>Ouvrir l'atelier</Bouton>
            {ch?.quota && <p className="mt-2 text-center text-[12px] text-[#8A8A8A] tnum">{ch.quota.modifications} sur {ch.quota.modifier} modifications utilisées ce mois-ci</p>}
          </Carte>
          <Carte titre="Mon dossier" sous="Le marché, ton plan chiffré sur 12 mois, tes concurrents et les risques à éviter.">
            <Bouton className="w-full" onClick={() => nav("/explorer/dossier")}>Ouvrir mon dossier</Bouton>
          </Carte>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Premiers clients : le plan jour par jour, à partir du SaaS modèle
function Clients({ m }) {
  const [s, setS] = useState(undefined);
  useEffect(() => {
    if (!m.domaine) { setS(null); return; }
    const garde = lire("bingoo-mon-saas-modele");
    if (garde?.domaine === m.domaine) { setS(garde); return; }
    supabase.from("saas_liste").select("*").eq("domaine", m.domaine).maybeSingle().then(({ data }) => setS(data ? { ...data, canaux: data.canaux ?? data.succes?.canaux ?? [], mrr: data.mrr ?? data.succes?.mrr ?? null } : null));
  }, [m.domaine]);
  const r = lire("bingoo-parcours2") ?? {};
  return (
    <>
      <Tete titre="Premiers clients" sous={`Ton plan pour trouver les 10 premiers clients de ${m.nom}, une étape par jour.`} />
      {s === undefined ? <div className="py-16 grid place-items-center"><Spinner /></div>
        : s ? <PremiersClients s={s} a={angleDe(s, r)} r={r} />
          : <Carte><p className="text-[13.5px] text-[#616161]">Le plan se prépare à partir du SaaS modèle : il n'est pas encore disponible pour ton SaaS.</p></Carte>}
    </>
  );
}

// ---------------------------------------------------------------- Vidéo pub
function Video({ m }) {
  const lien = lienApp(m.app.slug, m.app.domaine_statut === "ok" ? m.app.domaine : null);
  return (
    <>
      <Tete titre="Vidéo pub" sous="Une pub animée de 20 secondes, à tes couleurs, prête pour TikTok, Reels et Shorts." />
      <Carte className="clair" pad={false}>
        <Suspense fallback={<div className="py-16 grid place-items-center"><Spinner /></div>}><VideoPub app={m.app} lien={lien} nu /></Suspense>
      </Carte>
    </>
  );
}

// ---------------------------------------------------------------- Réglages du SaaS, rangés comme les paramètres de Shopify
const SECTIONS = [["encaisser", "Paiements", "stripe"], ["domaine", "Nom de domaine", "domaine"], ["emails", "E-mails", null], ["ia", "Assistant IA", null], ["prix", "Prix testés", null], ["lancement", "Kit de lancement", null], ["croissance", "Croissance", null], ["jumeau", "Nouveautés du modèle", null], ["monde", "Visibilité et revente", null], ["mobile", "Application mobile", null], ["versions", "Versions", null], ["code", "Code source", null]];
function Reglages({ m, charger }) {
  const loc = useLocation();
  const nav = useNavigate();
  const o = new URLSearchParams(loc.search).get("onglet") ?? "encaisser";
  const sec = SECTIONS.find((x) => x[0] === o) ?? SECTIONS[0];
  const connus = new Set(ONGLETS_APP.map(([k]) => k));
  return (
    <>
      <Tete titre="Réglages du SaaS" sous={`Les réglages de ${m.nom} : paiements, domaine, e-mails, assistant IA, versions et code.`} />
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <Carte pad={false} className="h-fit">
          <nav className="p-1.5">
            {SECTIONS.filter(([k]) => connus.has(k)).map(([k, l]) => (
              <button key={k} onClick={() => nav(`/explorer/reglages-saas?onglet=${k}`, { replace: true })}
                className={cx("flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium", o === k ? "bg-[#F1F1F1] font-semibold text-[#1A1A1A]" : "text-[#303030] hover:bg-[#F7F7F7]")}>{l}</button>
            ))}
          </nav>
        </Carte>
        <Carte titre={sec[1]} className="clair min-w-0">
          <ReglagesApp app={m.app} projet={m.projet} onChange={charger} nu onglet={sec[0]} />
        </Carte>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Ce qui marche : comment le SaaS modèle et ceux de sa catégorie trouvent leurs clients
const COMMENT = {
  "SEO": "Des pages qui répondent aux recherches Google de tes clients, une ou deux par semaine.",
  "Blog": "Des articles utiles sur leurs problèmes, qui mènent vers ton essai gratuit.",
  "Content marketing": "Guides, modèles et petits outils gratuits qui attirent tes clients idéaux.",
  "Newsletter": "Une lettre régulière qui garde tes visiteurs au chaud jusqu'à l'achat.",
  "Email marketing": "Une série d'e-mails après l'inscription pour transformer l'essai en abonnement.",
  "X / Twitter": "Construire en public : tes chiffres, tes nouveautés, tes leçons.",
  "LinkedIn": "Un post par semaine sur les problèmes de tes clients, là où sont les décideurs.",
  "Instagram": "Des vidéos courtes qui montrent le résultat, avant et après.",
  "TikTok": "Des vidéos courtes et concrètes : le problème, puis ton outil qui le règle.",
  "YouTube": "Des tutoriels qui montrent comment résoudre leur problème avec ton outil.",
  "Facebook": "Les groupes où ton public pose ses questions, et ta page.",
  "Reddit": "Répondre utilement dans les communautés de ta niche, avant de parler de toi.",
  "Product Hunt": "Un lancement d'un jour pour une première vague d'utilisateurs.",
  "Hacker News": "Un « Show HN » sincère quand ton outil intéresse les développeurs.",
  "Cold email": "Des e-mails courts et personnalisés à une liste de clients idéaux.",
  "Cold DM": "Des messages privés personnalisés aux bonnes personnes.",
  "Cold calling": "Appeler directement les entreprises qui ont le problème.",
  "Partnerships": "S'associer à un outil ou un pro qui a déjà tes clients.",
  "Affiliate": "Des partenaires qui touchent une commission sur chaque client apporté.",
  "Referral program": "Tes clients invitent leurs proches contre un mois offert.",
  "Influencers": "Des créateurs de ta niche qui présentent ton outil à leur audience.",
  "Word of mouth": "Un produit si utile que tes clients en parlent d'eux-mêmes.",
  "Google Ads": "Des annonces sur les recherches où tes clients sont prêts à acheter.",
  "Meta Ads": "Des pubs Facebook et Instagram ciblées sur ton public.",
  "TikTok Ads": "Des pubs vidéo courtes, dans le style natif de TikTok.",
  "LinkedIn Ads": "Des pubs ciblées par métier et taille d'entreprise.",
  "YouTube Ads": "Des pubs vidéo avant les tutoriels que regarde ton public.",
  "App store optimization": "Une fiche App Store optimisée sur les bons mots-clés.",
  "Discord": "Une communauté où tes utilisateurs s'entraident.",
  "Pinterest": "Des épingles qui renvoient vers tes guides et modèles.",
  "Events & conferences": "Les salons et événements où se retrouvent tes clients.",
  "Forums": "Les forums spécialisés où ton public cherche des solutions.",
};
const mrr$ = (n) => n == null ? "—" : n >= 1e4 ? `${Math.round(n / 1e3)} k$` : `${Math.round(n).toLocaleString("fr-FR")} $`;
function CeQuiMarche({ m }) {
  const nav = useNavigate();
  const [d, setD] = useState(undefined);
  useEffect(() => { if (!m.domaine) { setD(null); return; } supabase.rpc("saas_ce_qui_marche", { dom: m.domaine }).then(({ data }) => setD(data ?? null)); }, [m.domaine]);
  if (d === undefined) return <div className="py-24 grid place-items-center"><Spinner /></div>;
  const mo = d?.modele;
  const petite = !d || (d.categorie?.total ?? 0) < 5;
  const liste = petite ? (d?.tous?.canaux ?? []) : (d?.canaux ?? []);
  const base = petite ? d?.tous?.total : d?.categorie?.total;
  const max = Math.max(1, ...liste.map((c) => c.n));
  const siens = new Set(mo?.canaux ?? []);
  const video = [...siens].some((c) => /TikTok|Instagram|YouTube|Meta Ads/.test(c));
  // Le canal le plus rentable (revenu médian le plus haut, parmi ceux utilisés par au moins 5 SaaS)
  const rentable = [...liste].filter((c) => c.n >= 5).sort((a, b) => b.mediane - a.mediane)[0]?.canal;
  return (
    <>
      <Tete titre="Ce qui marche" sous={mo ? `Comment ${mo.nom} et les SaaS qui lui ressemblent trouvent leurs clients, d'après leurs chiffres vérifiés.` : "Les méthodes qui rapportent, d'après les chiffres vérifiés des SaaS."} />
      {mo && (
        <Carte titre={`Comment ${mo.nom} trouve ses clients`} sous={`Le SaaS dont ${m.nom} est inspiré · ${mo.categorie}`}>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-[#EBEBEB] sm:grid-cols-4">
            {[["Revenu mensuel", mrr$(mo.mrr), "vérifié"], ["Visiteurs", mo.visiteurs != null ? Number(mo.visiteurs).toLocaleString("fr-FR") : "—", "par mois"], ["Autorité Google", mo.autorite != null ? `${Math.round(mo.autorite)}/100` : "—", "plus c'est haut, mieux il se classe"], ["Par visiteur", mo.par_visiteur != null ? `${Number(mo.par_visiteur).toLocaleString("fr-FR")} $` : "—", "de revenu"]].map(([l, v, s]) => (
              <div key={l} className="bg-white p-3"><p className="text-[12px] text-[#616161]">{l}</p><p className="mt-0.5 text-[18px] font-bold tnum">{v}</p><p className="text-[11.5px] text-[#8A8A8A]">{s}</p></div>
            ))}
          </div>
          {mo.canaux?.length ? (
            <ul className="mt-4 divide-y divide-[#EBEBEB]">
              {mo.canaux.map((c) => (
                <li key={c} className="flex items-start gap-3 py-2.5">
                  <span className="mt-0.5 shrink-0 rounded-md bg-[#F1F1F1] px-2 py-0.5 text-[12.5px] font-semibold">{nomCanal(c)}</span>
                  <p className="text-[13.5px] text-[#303030]">{COMMENT[c] ?? "Un canal qu'il utilise pour trouver ses clients."}</p>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-[13.5px] text-[#616161]">{mo.nom} ne déclare pas ses canaux. Regarde ce qui marche chez les SaaS qui lui ressemblent, juste en dessous.</p>}
          {mo.persona && <p className="mt-3 rounded-lg bg-[#F7F7F7] px-3 py-2 text-[13px] text-[#616161]"><b className="text-[#303030]">Ses clients :</b> {mo.persona}</p>}
        </Carte>
      )}

      <Carte className="mt-4" titre={petite ? "Ce qui rapporte chez les SaaS vérifiés" : `Ce qui rapporte en ${mo?.categorie ?? "ce moment"}`}
        sous={`D'après ${Number(base ?? 0).toLocaleString("fr-FR")} SaaS au revenu vérifié qui déclarent leurs canaux${petite && mo ? " (sa catégorie en compte trop peu)" : ""}.`}>
        {!liste.length ? <p className="text-[13.5px] text-[#616161]">Pas encore assez de données.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13.5px]">
              <thead><tr className="text-left text-[12px] text-[#616161]"><th className="pb-2 font-medium">Canal</th><th className="pb-2 font-medium">Utilisé par</th><th className="pb-2 font-medium">Revenu médian</th>{!petite && <th className="pb-2 font-medium">Exemples</th>}</tr></thead>
              <tbody className="divide-y divide-[#EBEBEB]">
                {liste.map((c) => (
                  <tr key={c.canal}>
                    <td className="py-2.5 pr-3"><span className="flex flex-wrap items-center gap-1.5"><span className="font-semibold">{nomCanal(c.canal)}</span>{c.canal === rentable && <span className="whitespace-nowrap rounded-full bg-[#FFF1E3] px-1.5 py-0.5 text-[11px] font-semibold text-[#8A4B00]">le plus rentable</span>}{siens.has(c.canal) && <span className="whitespace-nowrap rounded-full bg-[#CDFEE1] px-1.5 py-0.5 text-[11px] font-semibold text-[#0C5132]">ton modèle aussi</span>}</span></td>
                    <td className="py-2.5 pr-3"><div className="flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#EBEBEB]"><div className="h-full rounded-full bg-[#303030]" style={{ width: `${(c.n / max) * 100}%` }} /></div><span className="whitespace-nowrap tnum text-[#616161]">{c.n} sur {base}</span></div></td>
                    <td className="whitespace-nowrap py-2.5 pr-3 tnum font-semibold">{mrr$(c.mediane)}<span className="font-normal text-[#8A8A8A]"> /mois</span></td>
                    {!petite && <td className="py-2.5 text-[13px] text-[#616161]">{(c.exemples ?? []).map((e, i) => <span key={e.domaine}>{i > 0 && ", "}<button onClick={() => nav(`/explorer/${e.domaine}`)} className="hover:text-[#1A1A1A] hover:underline">{e.nom}</button> <span className="text-[#8A8A8A]">{mrr$(e.mrr)}</span></span>)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Carte>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Carte titre={mo ? `Les publicités de ${mo.nom}` : "Ses publicités"} sous="Relevées dans la bibliothèque publicitaire officielle de Meta. Une pub qui tourne depuis longtemps est une pub qui rapporte.">
          {d?.pubs?.length ? (
            <ul className="space-y-2.5">
              {d.pubs.map((p, i) => (
                <li key={i} className="rounded-lg border border-[#EBEBEB] p-3">
                  <div className="flex items-center justify-between gap-2 text-[12px] text-[#616161]"><span>{(p.plateformes ?? []).join(", ")}</span><span className="font-semibold text-[#0C5132]">{p.jours} jours {p.stopped ? "" : "· en cours"}</span></div>
                  {p.titre && <p className="mt-1 font-semibold text-[13.5px]">{p.titre}</p>}
                  <p className="mt-1 line-clamp-3 text-[13px] text-[#303030]">{p.body}</p>
                  <a href={p.snapshot_url} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-[12.5px] font-semibold text-[#005BD3] hover:underline">Voir la pub ↗</a>
                </li>
              ))}
            </ul>
          ) : <p className="rounded-lg bg-[#F7F7F7] px-3 py-3 text-[13.5px] text-[#616161]">Aucune pub relevée pour l'instant. Ses publicités Facebook et Instagram apparaîtront ici dès qu'elles seront relevées, avec leur durée de diffusion.</p>}
        </Carte>
        <div className="space-y-4">
          <Carte titre="Passe à l'action" sous="Ton plan jour par jour reprend ces canaux, dans l'ordre.">
            <Bouton principal className="w-full" onClick={() => nav("/explorer/clients")}>Voir mon plan pour mes premiers clients</Bouton>
          </Carte>
          {video && (
            <Carte titre="Ton modèle mise sur la vidéo" sous="Crée ta pub animée à tes couleurs, prête pour TikTok et Reels.">
              <Bouton className="w-full" onClick={() => nav("/explorer/video")}>Créer ma vidéo pub</Bouton>
            </Carte>
          )}
        </div>
      </div>
    </>
  );
}
