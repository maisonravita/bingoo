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
import { PremiersClients, ReglagesApp } from "./Explorer";
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {page === "mon-saas" && <Accueil m={m} />}
      {page === "clients" && <Clients m={m} />}
      {page === "video" && <Video m={m} />}
      {page === "reglages-saas" && <Reglages m={m} charger={charger} />}
    </div>
  );
}

function PasEncore() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-[32px] font-black leading-tight" style={HF}>Ton SaaS n'est pas encore construit</h1>
      <p className="mt-2 text-ink-soft">Choisis un SaaS qui marche déjà : Bingoo! construit ta version et la met en ligne.</p>
      <NavLink to="/explorer/trouver" className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 font-bold text-white hover:bg-accent-dark">Trouver mon SaaS</NavLink>
    </div>
  );
}

const Tuile = ({ m, size = "h-12 w-12 text-[22px] rounded-2xl" }) => (
  <span className={cx("grid shrink-0 place-items-center font-black text-white", size)} style={{ background: `linear-gradient(140deg, ${m.couleur}, ${m.couleur}cc)`, ...HF }}>{m.nom.charAt(0).toUpperCase()}</span>
);
function Entete({ m, titre, sous, actions }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Tuile m={m} />
      <div className="min-w-0 flex-1">
        <h1 className="text-[28px] sm:text-[34px] font-black leading-tight" style={HF}>{titre}</h1>
        {sous && <p className="text-[14.5px] text-ink-soft">{sous}</p>}
      </div>
      {actions}
    </div>
  );
}

// ---------------------------------------------------------------- Accueil : en ligne ?, ses chiffres, la prochaine étape, la liste de lancement
function Accueil({ m }) {
  const { ws } = useWs();
  const nav = useNavigate();
  const [ch, setCh] = useState(null);
  const [videos, setVideos] = useState(null);
  const [lance, setLance] = useState(null);
  const [copie, setCopie] = useState(false);
  const lien = lienApp(m.app.slug, m.app.domaine_statut === "ok" ? m.app.domaine : null);
  useEffect(() => {
    fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: m.app.id, quoi: "chiffres" }).then(setCh, () => setCh({}));
    fn("r/saas-videos", { workspace_id: ws.id, app_id: m.app.id }).then((r) => setVideos(r.videos?.length ?? 0), () => setVideos(0));
    if (m.domaine) supabase.from("saas_lancements").select("id").eq("workspace_id", ws.id).eq("domaine", m.domaine).maybeSingle().then(({ data }) => setLance(!!data));
    else setLance(false);
  }, [m.app.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const etapes = [
    { k: "ligne", t: "Ton SaaS est en ligne", d: "Construit, vérifié, avec les comptes de tes clients.", ok: true },
    { k: "stripe", t: "Encaisse tes clients", d: "Branche ton compte Stripe : l'argent de tes abonnés arrive directement chez toi.", ok: !!m.app.paiement?.actif, to: "/explorer/reglages-saas?onglet=encaisser", cta: "Brancher Stripe" },
    { k: "domaine", t: "Mets ton nom de domaine", d: "monsaas.fr au lieu d'une adresse Bingoo! : plus pro, et meilleur pour Google.", ok: m.app.domaine_statut === "ok", to: "/explorer/reglages-saas?onglet=domaine", cta: "Ajouter mon domaine" },
    { k: "video", t: "Crée ta vidéo pub", d: "20 secondes animées à tes couleurs, pour TikTok, Reels et ta page.", ok: videos > 0, to: "/explorer/video", cta: "Créer ma vidéo" },
    { k: "clients", t: "Trouve tes 10 premiers clients", d: "Ton plan jour par jour : où les trouver, quoi leur dire.", ok: !!lance, to: "/explorer/clients", cta: "Voir mon plan" },
  ];
  const prochaine = etapes.find((e) => !e.ok);
  const faites = etapes.filter((e) => e.ok).length;
  const kpi = [["Visiteurs", ch?.visites_30j, "30 derniers jours"], ["Comptes créés", ch?.comptes, ch?.nouveaux_7j ? `+${ch.nouveaux_7j} cette semaine` : "sur ton SaaS"], ["Clients payants", ch?.abonnes, ch?.essais ? `${ch.essais} en essai` : "abonnés actifs"], ["Revenu mensuel", ch ? eur(ch.mrr) : null, "abonnements en cours"]];

  return (
    <>
      <Entete m={m} titre={m.nom} sous={<span className="inline-flex items-center gap-2"><span className="inline-flex items-center gap-1.5 font-semibold text-good"><span className="h-2 w-2 rounded-full bg-good pulse-dot" />En ligne</span><span className="text-ink-faint">·</span><button onClick={() => navigator.clipboard?.writeText(lien).then(() => { setCopie(true); setTimeout(() => setCopie(false), 1600); })} className="truncate hover:text-ink">{copie ? "Lien copié" : lien.replace(/^https?:\/\//, "")}</button></span>}
        actions={<div className="flex gap-2">
          <a href={lien} target="_blank" rel="noreferrer" className="rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] font-semibold hover:border-ink-faint">Voir mon SaaS ↗</a>
          <button onClick={() => nav("/explorer/atelier")} className="rounded-xl bg-ink px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-ink/85">Ouvrir l'atelier</button>
        </div>} />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpi.map(([l, v, s]) => (
          <div key={l} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-[13px] text-ink-soft">{l}</p>
            <p className="mt-1 text-[28px] font-black leading-tight tnum" style={HF}>{v ?? (ch ? 0 : "…")}</p>
            <p className="text-[12.5px] text-ink-faint">{s}</p>
          </div>
        ))}
      </div>

      {prochaine && (
        <div className="mt-6 fx-halo rounded-3xl">
          <div className="flex flex-wrap items-center gap-5 rounded-3xl bg-white p-6 sm:p-7">
            <div className="min-w-[240px] flex-1">
              <p className="text-[13px] font-bold uppercase tracking-[.12em] text-accent-dark">Ta prochaine étape</p>
              <h2 className="mt-1 text-[24px] sm:text-[28px] font-black leading-tight" style={HF}>{prochaine.t}</h2>
              <p className="mt-1.5 text-[15px] text-ink-soft">{prochaine.d}</p>
            </div>
            <button onClick={() => nav(prochaine.to)} className="fx-brille rounded-xl bg-accent px-6 py-3.5 font-bold text-white hover:bg-accent-dark">{prochaine.cta}</button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold text-[17px]">Ton lancement</h2><p className="text-[13px] text-ink-soft tnum">{faites}/{etapes.length}</p></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-[#E8571C] transition-all duration-700" style={{ width: `${(faites / etapes.length) * 100}%` }} /></div>
          <ul className="mt-3 divide-y divide-line">
            {etapes.map((e) => (
              <li key={e.k} className="flex items-center gap-3 py-3">
                <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full", e.ok ? "bg-good text-white" : "border-2 border-line")}>
                  {e.ok && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>}
                </span>
                <div className="min-w-0 flex-1"><p className={cx("font-semibold text-[14.5px]", e.ok && "text-ink-soft line-through decoration-ink-faint/50")}>{e.t}</p>{!e.ok && <p className="text-[13px] text-ink-soft">{e.d}</p>}</div>
                {!e.ok && e.to && <button onClick={() => nav(e.to)} className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold hover:border-ink-faint">{e.cta}</button>}
              </li>
            ))}
          </ul>
        </section>
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-bold text-[17px]">Modifier {m.nom}</h2>
            <p className="mt-1 text-[14px] text-ink-soft">Dis à Bingoo! ce que tu veux changer, en une phrase, et regarde le résultat en direct.</p>
            <button onClick={() => nav("/explorer/atelier")} className="mt-3 w-full rounded-xl bg-ink py-2.5 text-[14px] font-semibold text-white hover:bg-ink/85">Ouvrir l'atelier</button>
            {ch?.quota && <p className="mt-2 text-center text-[12.5px] text-ink-faint">{ch.quota.modifications}/{ch.quota.modifier} modifications utilisées ce mois-ci</p>}
          </section>
          <NavLink to="/explorer/dossier" className="block rounded-2xl border border-line bg-white p-5 hover:border-ink-faint">
            <h2 className="font-bold text-[17px]">Mon dossier</h2>
            <p className="mt-1 text-[14px] text-ink-soft">Le marché, ton plan chiffré sur 12 mois, tes concurrents, les risques et comment les éviter.</p>
            <p className="mt-2 text-[13.5px] font-semibold text-accent-dark">Ouvrir →</p>
          </NavLink>
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
      <Entete m={m} titre="Tes premiers clients" sous={`Ton plan pour trouver les 10 premiers clients de ${m.nom}, une étape par jour.`} />
      <div className="mt-6">
        {s === undefined ? <div className="py-16 grid place-items-center"><Spinner /></div>
          : s ? <PremiersClients s={s} a={angleDe(s, r)} r={r} />
            : <p className="rounded-2xl border border-line bg-white p-6 text-ink-soft">Le plan se prépare à partir du SaaS modèle : il n'est pas encore disponible pour ton SaaS.</p>}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Vidéo pub
function Video({ m }) {
  const lien = lienApp(m.app.slug, m.app.domaine_statut === "ok" ? m.app.domaine : null);
  return (
    <>
      <Entete m={m} titre="Ta vidéo pub" sous="Une pub animée de 20 secondes, à tes couleurs, prête pour TikTok, Reels et Shorts." />
      <div className="mt-6 rounded-3xl bg-ink p-5 text-white sm:p-7">
        <Suspense fallback={<div className="py-16 grid place-items-center"><Spinner /></div>}><VideoPub app={m.app} lien={lien} /></Suspense>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Réglages du SaaS (paiements, domaine, e-mails, IA, versions, code…)
function Reglages({ m, charger }) {
  const loc = useLocation();
  const initial = new URLSearchParams(loc.search).get("onglet") ?? "encaisser";
  return (
    <>
      <Entete m={m} titre={`Réglages de ${m.nom}`} sous="Paiements, nom de domaine, e-mails, assistant IA, versions et code." />
      <div className="mt-6 rounded-3xl bg-ink p-4 text-white sm:p-6">
        <ReglagesApp key={initial} app={m.app} projet={m.projet} onChange={charger} initial={initial} />
      </div>
    </>
  );
}
