// L'espace de son SaaS, une fois construit : l'accueil (chiffres et prochaine étape), l'atelier, les premiers clients,
// la vidéo pub, les réglages et le dossier du projet.
import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";
import { Spinner } from "../components/ui";
import { lienApp } from "../components/AppCadre";
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
