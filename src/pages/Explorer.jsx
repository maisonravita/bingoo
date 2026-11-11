import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Spinner, useToast } from "../components/ui";
import CompanyLogo from "../components/CompanyLogo";
import { LineChart } from "../components/Charts";
import { lazy, Suspense } from "react";
const IsoMonde = lazy(() => import("../components/IsoMonde"));
import AppCadre, { API, blogApp, lienApp } from "../components/AppCadre";
import { cleIcone, iconePng } from "../lib/appIcone";
import qrcode from "qrcode-generator";
import { cx } from "../lib/utils";

// Explorer : la base de SaaS de Bingoo! (le « TrendTrack des SaaS »). Liste filtrable, puis fiche détaillée par logiciel.
// Toutes les informations sont lues sur les sites des logiciels eux-mêmes, avec l'adresse de la page et la date du relevé.
const HF = { fontFamily: "var(--font-titre)" };
export const CATEGORIES = ["CRM et ventes", "Prospection et emailing", "Marketing et SEO", "Réseaux sociaux et contenu", "Facturation et comptabilité", "Paie et RH", "Recrutement", "Gestion de projet", "Collaboration et documents", "Support client", "E-commerce", "Paiement et finance", "Juridique", "Immobilier", "Santé", "Éducation et formation", "Commerce et restauration", "Logistique et transport", "Développeurs et no-code", "Données et analytics", "Sécurité et conformité", "IA et automatisation", "Événements", "BTP et artisans", "Agences et freelances", "Autre"];
const PAYS = { FR: "France", BE: "Belgique", CH: "Suisse", DE: "Allemagne", ES: "Espagne", IT: "Italie", GB: "Royaume-Uni", NL: "Pays-Bas", PT: "Portugal", IE: "Irlande", SE: "Suède", DK: "Danemark", PL: "Pologne", AT: "Autriche", US: "États-Unis", CA: "Canada", AU: "Australie", IN: "Inde", IL: "Israël" };
const drapeau = (c) => c && /^[A-Z]{2}$/.test(c) ? String.fromCodePoint(...[...c].map((x) => 127397 + x.charCodeAt(0))) : "";
const date = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : null;
const TRIS = [["copiable", "Les plus faciles à copier"], ["succes_montant", "Plus gros revenu prouvé"], ["score_croissance", "En croissance"], ["postes", "Qui recrutent le plus"], ["nouveaute", "Nouveautés récentes"], ["rang_web", "Les plus connus"], ["prix_entree_eur", "Prix d'entrée"], ["created_at", "Ajoutés récemment"]];
const PAGE = 48;
// Niveau de formule pour Explorer : 1 = Starter, 2 = Pro, 3 = Business (et anciennes formules, aperçu, fondateur)
const niv = (ws) => (ws?.plan === "explorer" ? 1 : ws?.plan === "explorer_pro" ? 2 : 3);
function Verrou({ titre, texte, formule = "Pro", sombre = false }) {
  const nav = useNavigate();
  return (
    <section className={cx("rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3", sombre ? "bg-ink text-white" : "bg-white border border-line")}>
      <div><p className="font-bold">{titre}</p><p className={cx("text-[13.5px]", sombre ? "text-white/70" : "text-ink-soft")}>{texte}</p></div>
      <button onClick={() => nav("/abonnement")} className="shrink-0 rounded-xl bg-accent text-white px-5 py-2.5 font-bold hover:bg-accent-dark">Passer à {formule}</button>
    </section>
  );
}
// Prix d'entrée lisible : abonnement en €/mois, sinon prix à l'usage tel qu'affiché, sinon sur devis
const usage = (s) => s.prix_usage ?? (["usage", "commission"].includes(s.modele_prix) ? s.prix_affiche : null);
const prixCourt = (s) => s.prix_entree_eur != null ? `dès ${s.prix_entree_eur} €/mois` : usage(s) ? `à l'usage` : s.sur_devis ? "sur devis" : "prix non affiché";

export default function Explorer({ domaine: fixe }) {
  const { domaine } = useParams();
  const d = fixe ?? domaine;
  if (d === "bouge") return <><Onglets actif="bouge" /><Fil /></>;
  if (d === "suivis") return <><Onglets actif="suivis" /><Suivis /></>;
  if (d === "marche") return <><Onglets actif="marche" /><Marche /></>;
  if (d === "lancer") return <Lancer />;
  if (d === "carte") return <><Onglets actif="carte" /><Carte /></>;
  if (d === "pubs") return <><Onglets actif="pubs" /><Pubs /></>;
  if (d === "idees") return <><Onglets actif="idees" /><Idees /></>;
  if (d === "createurs") return <><Onglets actif="createurs" /><Createurs /></>;
  if (d === "bourse") return <><Onglets actif="bourse" /><Bourse /></>;
  if (d === "racheter") return <><Onglets actif="racheter" /><Racheter /></>;
  if (d === "classement") return <><Onglets actif="classement" /><Classement /></>;
  if (d === "comparer") return <Comparer />;
  return d ? <Fiche domaine={d} /> : <><Onglets actif="liste" /><Liste /></>;
}

// 5 rubriques ; celles qui regroupent plusieurs pages affichent une petite ligne de sous-onglets
const RUBRIQUES = [
  ["SaaS", [["liste", "Tous les SaaS", "/explorer"]]],
  ["Classement", [["classement", "Classement", "/explorer/classement"]]],
  ["Mes suivis", [["suivis", "Mes suivis", "/explorer/suivis"], ["bouge", "Ce qui a bougé", "/explorer/bouge"]]],
  ["Tendances", [["marche", "Pays et tendances", "/explorer/marche"], ["carte", "Le monde", "/explorer/carte"], ["idees", "Idées et réussites", "/explorer/idees"], ["pubs", "Pubs et e-mails", "/explorer/pubs"]]],
  ["Mes SaaS", [["createurs", "Mes SaaS", "/explorer/createurs"], ["bourse", "Bourse", "/explorer/bourse"], ["racheter", "À racheter", "/explorer/racheter"]]],
];
function Onglets({ actif }) {
  const nav = useNavigate();
  const rub = RUBRIQUES.find(([, pages]) => pages.some(([k]) => k === actif)) ?? RUBRIQUES[0];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
      <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-white border border-line p-1">
        {RUBRIQUES.map(([l, pages]) => <button key={l} onClick={() => nav(pages[0][2])} className={cx("shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-[14px] font-semibold transition", rub[0] === l ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}>{l}</button>)}
      </div>
      {rub[1].length > 1 && (
        <div className="mt-2 flex gap-4 overflow-x-auto px-1 text-[13.5px]">
          {rub[1].map(([k, l, to]) => <button key={k} onClick={() => nav(to)} className={cx("shrink-0 whitespace-nowrap border-b-2 pb-1 font-medium transition", actif === k ? "border-accent text-ink" : "border-transparent text-ink-soft hover:text-ink")}>{l}</button>)}
        </div>
      )}
    </div>
  );
}

const EV = {
  prix_hausse: ["Hausse de prix", "#B91C1C"], prix_baisse: ["Baisse de prix", "#15803D"], gratuit_ajoute: ["Lance une version gratuite", "#15803D"], gratuit_retire: ["Retire sa version gratuite", "#B91C1C"],
  essai_change: ["Change son essai gratuit", "#92400E"], recrutement_hausse: ["Recrute davantage", "#15803D"], recrutement_baisse: ["Recrute moins", "#92400E"], recrute_debut: ["Commence à recruter", "#15803D"],
  recrute_fin: ["N'a plus d'offre d'emploi", "#92400E"], nouveaute: ["Publie une nouveauté", "#E0531F"], nouveau_saas: ["Entre dans la base", "#5B5D66"],
};
export function evTexte(e) {
  const [l, c] = EV[e.type] ?? [e.type, "#5B5D66"];
  const det = e.type === "nouveaute" ? "" : e.avant && e.apres ? ` : ${e.avant} → ${e.apres}` : e.apres ? ` : ${e.apres} poste${Number(e.apres) > 1 ? "s" : ""}` : e.avant ? ` (${e.avant} avant)` : "";
  return <span><span className="font-semibold" style={{ color: c }}>{l}</span>{det}</span>;
}

function Chip({ on, children, onClick }) {
  return <button type="button" onClick={onClick} className={cx("rounded-full border px-3 py-1.5 text-[13px] font-medium transition", on ? "bg-ink text-white border-ink" : "bg-white border-line hover:border-ink-faint")}>{children}</button>;
}

function Liste() {
  const nav = useNavigate();
  const { ws } = useWs();
  const toast = useToast();
  const loc = useLocation();
  const [toutesNiches, setToutesNiches] = useState(false);
  const [f, setF] = useState(() => { const p = new URLSearchParams(loc.search); return { q: "", categorie: p.get("categorie") ?? "", pays: p.get("pays") ?? "", prixMax: "", gratuit: false, recrute: false, actif: false, succes: p.get("succes") === "1", copier: p.get("copier") === "1", genre: p.get("genre") ?? "", tri: p.get("copier") === "1" ? "copiable" : p.get("succes") === "1" ? "succes_montant" : "score_croissance", tag: p.get("tag") ?? "" }; });
  const [ia, setIa] = useState(null); // recherche par le sens : { q, termes, resultats }
  // Export CSV de la liste affichée (formule Business)
  const exporter = (liste) => {
    if (niv(ws) < 3) { toast("L'export est dans la formule Business", "bad"); nav("/abonnement"); return; }
    const col = ["nom", "domaine", "categorie", "pays", "prix_entree_eur", "gratuit", "recrute", "postes", "nouveaute", "rang_web", "tags", "description"];
    const cel = (v) => { const t = Array.isArray(v) ? v.join(" | ") : v == null ? "" : String(v); return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const csv = "\ufeff" + [col.join(";"), ...liste.map((r) => col.map((c) => cel(r[c])).join(";"))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `bingoo-saas-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
  const [iaBusy, setIaBusy] = useState(false);
  const [niches, setNiches] = useState([]);
  useEffect(() => { supabase.rpc("saas_niches", { cat: f.categorie || null }).then(({ data }) => setNiches(data ?? [])); }, [f.categorie]);
  const chercherIA = async () => {
    const q = f.q.trim(); if (q.length < 3) return;
    setIaBusy(true);
    try { const r = await fn("r/saas-recherche", { workspace_id: ws.id, q, categorie: f.categorie || null }); setIa({ q, ...r }); }
    catch (x) { toast(x.message, "bad"); } finally { setIaBusy(false); }
  };
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState(null);
  const [ajout, setAjout] = useState("");
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState([]);
  const basculer = (d) => setSel((x) => x.includes(d) ? x.filter((y) => y !== d) : x.length >= 4 ? x : [...x, d]);
  const set = (k, v) => { setPage(0); setF((x) => ({ ...x, [k]: v })); };

  useEffect(() => {
    let q = supabase.from("saas_liste").select("id, domaine, nom, categorie, description, pays, prix_entree_eur, prix_usage, gratuit, essai, sur_devis, recrute, postes, nouveaute, score_croissance, lu_at, tags, rang_web, succes, estimation, genre, copiable, copiable_raisons, preuve_ancienne", { count: "exact" });
    if (f.tag) q = q.contains("tags", [f.tag]);
    if (f.q.trim()) q = q.or(`nom.ilike.%${f.q.trim().replace(/[%,()]/g, "")}%,domaine.ilike.%${f.q.trim().replace(/[%,()]/g, "")}%,description.ilike.%${f.q.trim().replace(/[%,()]/g, "")}%`);
    if (f.categorie) q = q.eq("categorie", f.categorie);
    if (f.pays) q = q.eq("pays", f.pays);
    if (f.prixMax) q = q.lte("prix_entree_eur", Number(f.prixMax));
    if (f.gratuit) q = q.eq("gratuit", true);
    if (f.recrute) q = q.eq("recrute", true);
    if (f.succes) q = q.eq("a_succes", true);
    if (f.copier) q = q.gte("copiable", 60);
    if (f.genre) q = q.eq("genre", f.genre);
    if (f.actif) q = q.gte("nouveaute", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
    if (f.tri === "copiable") q = q.order("copiable", { ascending: false, nullsFirst: false }).order("revenu_tri", { ascending: false, nullsFirst: false });
    else q = q.order(f.tri, { ascending: f.tri === "prix_entree_eur" || f.tri === "rang_web", nullsFirst: false }).order("nom").range(page * PAGE, page * PAGE + PAGE - 1);
    let vivant = true;
    q.then(({ data, count }) => { if (vivant) { setRows(data ?? []); setTotal(count ?? 0); } });
    return () => { vivant = false; };
  }, [f, page]);

  useEffect(() => {
    supabase.from("saas_liste").select("categorie, pays, recrute, gratuit").limit(5000).then(({ data }) => {
      const d = data ?? [];
      const par = (k) => Object.entries(d.reduce((a, r) => { if (r[k]) a[r[k]] = (a[r[k]] ?? 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]);
      setStats({ total: d.length, cats: par("categorie"), pays: par("pays"), recrutent: d.filter((r) => r.recrute).length });
    });
  }, []);

  const ajouter = async (e) => {
    e.preventDefault(); if (!ajout.trim()) return; setBusy(true);
    try { const r = await fn("r/saas-add", { workspace_id: ws.id, url: ajout }); if (r.statut === "ok") nav(`/explorer/${r.domaine}`); else toast(r.statut === "pas_saas" ? "Ce site ne ressemble pas à un logiciel en ligne." : "Ce site n'a pas pu être lu pour l'instant.", "bad"); }
    catch (x) { toast(x.message, "bad"); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-accent-dark">Explorer</p>
          <h1 className="text-[30px] sm:text-[36px] font-black leading-tight tracking-tight" style={HF}>Tous les SaaS et applis web, au même endroit.</h1>
          <p className="text-ink-soft text-[15px]">{stats ? `${stats.total.toLocaleString("fr-FR")} logiciels suivis · ${stats.cats.length} catégories · ${stats.pays.length} pays · ${stats.recrutent} recrutent en ce moment` : "…"}</p>
        </div>
        <form onSubmit={ajouter} className="flex gap-2">
          <input value={ajout} onChange={(e) => setAjout(e.target.value)} placeholder="Ajouter un SaaS (ex. monsaas.com)" className="w-64 rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ink" />
          <button disabled={busy} className="rounded-xl bg-ink text-white px-4 py-2.5 text-[14px] font-semibold disabled:opacity-60">{busy ? "Lecture…" : "Ajouter"}</button>
        </form>
      </div>

      <Demarrer />

      <div className="mt-5 rounded-2xl bg-white border border-line p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <form onSubmit={(e) => { e.preventDefault(); chercherIA(); }} className="flex-1 min-w-[260px] flex rounded-xl border border-line focus-within:border-ink overflow-hidden">
            <input value={f.q} onChange={(e) => { set("q", e.target.value); setIa(null); }} placeholder="Un nom, ou ce que tu cherches : « relancer mes factures impayées »" className="flex-1 min-w-0 px-3 py-2.5 text-[14px] outline-none" />
            <button disabled={iaBusy || f.q.trim().length < 3} title="Recherche par le sens (français ou anglais)" className="shrink-0 px-3 text-[13px] font-semibold text-accent-dark hover:bg-accent-soft/40 disabled:opacity-40">{iaBusy ? "…" : "Recherche intelligente ↵"}</button>
          </form>
          <select value={f.categorie} onChange={(e) => set("categorie", e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]">
            <option value="">Toutes les catégories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={f.pays} onChange={(e) => set("pays", e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]">
            <option value="">Tous les pays</option>{(stats?.pays ?? []).map(([c, n]) => <option key={c} value={c}>{drapeau(c)} {PAYS[c] ?? c} ({n})</option>)}
          </select>
          <select value={f.prixMax} onChange={(e) => set("prixMax", e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]">
            <option value="">Tous les prix</option>{[10, 20, 50, 100, 200].map((p) => <option key={p} value={p}>Jusqu'à {p} €/mois</option>)}
          </select>
          <select value={f.tri} onChange={(e) => set("tri", e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]">
            {TRIS.map(([k, l]) => <option key={k} value={k}>Trier : {l}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-line bg-white p-0.5">{[["", "Tout"], ["saas", "SaaS"], ["app_web", "Applis web"]].map(([k, l]) => <button key={k || "tout"} type="button" onClick={() => set("genre", k)} className={cx("rounded-full px-3 py-1 text-[13px] font-medium transition", f.genre === k ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}>{l}</button>)}</span>
          <Chip on={f.copier} onClick={() => setF((x) => ({ ...x, copier: !x.copier, tri: !x.copier ? "copiable" : (x.tri === "copiable" ? "score_croissance" : x.tri) }))}>🎯 À copier</Chip>
          <Chip on={f.succes} onClick={() => setF((x) => ({ ...x, succes: !x.succes, tri: !x.succes ? "succes_montant" : (x.tri === "succes_montant" ? "score_croissance" : x.tri) }))}>★ SaaS à succès</Chip>
          <Chip on={f.gratuit} onClick={() => set("gratuit", !f.gratuit)}>Version gratuite</Chip>
          <Chip on={f.recrute} onClick={() => set("recrute", !f.recrute)}>Recrutent</Chip>
          <Chip on={f.actif} onClick={() => set("actif", !f.actif)}>Nouveauté ce mois-ci</Chip>
          {f.categorie && <BoutonSuivre categorie={f.categorie} petit />}
        </div>
        {niches.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[12px] font-semibold text-ink-faint mr-1">Niches{f.categorie ? ` · ${f.categorie}` : ""} :</span>
            {niches.slice(0, toutesNiches ? 16 : 7).map((n) => <button key={n.tag} type="button" onClick={() => set("tag", f.tag === n.tag ? "" : n.tag)} className={cx("rounded-full px-2.5 py-1 text-[12.5px] transition", f.tag === n.tag ? "bg-accent text-white" : "bg-paper hover:bg-accent-soft/50")}>{n.tag} <span className="opacity-60 tnum">{n.n}</span></button>)}
          {niches.length > 7 && <button type="button" onClick={() => setToutesNiches((v) => !v)} className="text-[12.5px] font-semibold text-ink-soft hover:text-ink px-1.5">{toutesNiches ? "Moins" : `+ ${Math.min(16, niches.length) - 7} autres`}</button>}
          </div>
        )}
      </div>

      {ia ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-ink-faint">{ia.resultats.length} résultat{ia.resultats.length > 1 ? "s" : ""} pour « {ia.q} » · cherché aussi :</span>
          {ia.termes.slice(0, 10).map((t) => <span key={t} className="rounded-md bg-paper px-2 py-0.5">{t}</span>)}
          {ia.categorie_suggeree && !f.categorie && <button onClick={() => { set("categorie", ia.categorie_suggeree); setIa(null); }} className="rounded-md border border-line bg-white px-2 py-0.5 hover:border-ink">Voir toute la catégorie {ia.categorie_suggeree}</button>}
          <button onClick={() => setIa(null)} className="underline text-ink-soft">Effacer</button>
        </div>
      ) : <div className="mt-4 flex items-center justify-between gap-2"><p className="text-[13px] text-ink-faint">{rows ? `${total.toLocaleString("fr-FR")} résultat${total > 1 ? "s" : ""}` : ""}{f.tag ? ` · niche « ${f.tag} »` : ""}</p>
        {rows?.length > 0 && <button onClick={() => exporter(rows)} className="text-[13px] font-semibold underline">Exporter (CSV)</button>}</div>}
      {(() => { const liste = ia ? ia.resultats : rows; return !liste ? <div className="py-20 grid place-items-center"><Spinner /></div> : !liste.length ? (
        <p className="py-16 text-center text-ink-soft">Aucun SaaS ne correspond. Élargis les filtres, ou ajoute le logiciel que tu cherches.</p>
      ) : (
        <div className="mt-2 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {liste.map((s) => (
            <div key={s.id} role="button" tabIndex={0} onClick={() => nav(`/explorer/${s.domaine}`)} onKeyDown={(e) => e.key === "Enter" && nav(`/explorer/${s.domaine}`)} className={cx("relative cursor-pointer text-left rounded-2xl bg-white border p-4 hover:shadow-sm transition", sel.includes(s.domaine) ? "border-ink shadow-[0_0_0_1px_#15161A]" : "border-line hover:border-ink-faint")}>
              <label onClick={(e) => e.stopPropagation()} className="absolute right-3 bottom-3 flex items-center gap-1.5 text-[12px] text-ink-faint cursor-pointer"><input type="checkbox" checked={sel.includes(s.domaine)} onChange={() => basculer(s.domaine)} className="accent-[#15161A]" />Comparer</label>
              <div className="flex items-start gap-3">
                <CompanyLogo name={s.nom} url={`https://${s.domaine}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">{s.nom} <span className="font-normal">{drapeau(s.pays)}</span></p>
                  <p className="text-[12.5px] text-ink-faint truncate">{s.categorie} · {s.domaine}</p>
                </div>
                {s.score_croissance > 0 && <span title="Score de croissance (recrutement, nouveautés)" className={cx("rounded-lg px-2 py-1 text-[12px] font-bold tnum", s.score_croissance >= 60 ? "bg-[#DCFCE7] text-[#166534]" : s.score_croissance >= 30 ? "bg-[#FEF3C7] text-[#92400E]" : "bg-paper text-ink-soft")}>{s.score_croissance}</span>}
              </div>
              {s.succes && <p className={cx("mt-2 rounded-lg px-2.5 py-1.5 text-[12.5px] line-clamp-2", s.preuve_ancienne ? "bg-paper text-ink-faint" : "bg-[#FEF3C7] text-[#78350F] font-semibold")}>{s.preuve_ancienne ? "Ancien chiffre : " : "★ "}{s.succes.preuve}</p>}
              {s.copiable >= 60 && <p title={(s.copiable_raisons ?? []).join(" · ")} className="mt-1.5 text-[12px] font-semibold text-[#166534]">🎯 Facile à copier · {s.copiable}/100 <span className="font-normal text-ink-faint">· {(s.copiable_raisons ?? []).filter((r) => !/^Revenu/.test(r)).slice(0, 2).join(" · ")}</span></p>}
              {!s.succes && s.estimation && <p title="Estimation d'après l'effectif officiel (annuaire des entreprises) : 80 000 à 180 000 € de revenu annuel par salarié" className="mt-2 rounded-lg bg-paper text-ink-soft px-2.5 py-1.5 text-[12.5px] line-clamp-2">≈ {montantCourt(s.estimation.bas)} à {montantCourt(s.estimation.haut)} par mois <span className="text-ink-faint">· estimé d'après l'effectif</span></p>}
              {s.description ? <p className="mt-2 text-[13.5px] text-ink-soft line-clamp-2 min-h-[38px]">{s.description}</p> : <p className="mt-2 text-[13px] text-ink-faint italic min-h-[38px]">Description en cours de lecture par Bingoo!</p>}
              <div className="mt-3 flex flex-wrap gap-1.5 text-[12px]">
                <span className="rounded-md bg-paper px-2 py-1 tnum">{prixCourt(s).replace(/^./, (c) => c.toUpperCase())}</span>
                {s.genre === "app_web" && <span className="rounded-md bg-[#E0E7FF] text-[#3730A3] px-2 py-1">Appli web</span>}
                {s.gratuit && <span className="rounded-md bg-paper px-2 py-1">Gratuit</span>}
                {!s.gratuit && s.essai && <span className="rounded-md bg-paper px-2 py-1">Essai</span>}
                {s.recrute && <span className="rounded-md bg-[#DCFCE7] text-[#166534] px-2 py-1">Recrute{s.postes ? ` · ${s.postes}` : ""}</span>}
                {s.nouveaute && Date.parse(s.nouveaute) > Date.now() - 30 * 864e5 && <span className="rounded-md bg-accent-soft text-accent-dark px-2 py-1">Nouveauté {date(s.nouveaute)}</span>}
              </div>
              {(s.tags ?? []).length > 0 && <div className="mt-2 flex flex-wrap gap-1 pr-20">{s.tags.slice(0, 3).map((t) => <button key={t} type="button" onClick={(e) => { e.stopPropagation(); setIa(null); set("tag", t); }} className="text-[11.5px] text-ink-faint hover:text-accent-dark">#{t.replace(/\s+/g, "-")}</button>)}</div>}
              <div className="h-5" />
            </div>
          ))}
        </div>
      ); })()}
      {sel.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 rounded-2xl bg-ink text-white shadow-xl px-4 py-3 flex items-center gap-3">
          <span className="text-[14px]">{sel.length} SaaS sélectionné{sel.length > 1 ? "s" : ""} (4 au plus)</span>
          <button disabled={sel.length < 2} onClick={() => niv(ws) < 2 ? (toast("Comparer est dans la formule Pro", "bad"), nav("/abonnement")) : nav(`/explorer/comparer?d=${sel.join(",")}`)} className="rounded-lg bg-accent px-4 py-2 text-[14px] font-bold disabled:opacity-50">Comparer</button>
          <button onClick={() => setSel([])} className="text-[13px] text-white/70 hover:text-white">Effacer</button>
        </div>
      )}
      {!ia && total > PAGE && (
        <div className="mt-5 flex items-center justify-center gap-3 text-[14px]">
          <button disabled={!page} onClick={() => setPage(page - 1)} className="rounded-lg border border-line bg-white px-3 py-1.5 disabled:opacity-40">Précédent</button>
          <span className="tnum text-ink-soft">{page + 1} / {Math.ceil(total / PAGE)}</span>
          <button disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)} className="rounded-lg border border-line bg-white px-3 py-1.5 disabled:opacity-40">Suivant</button>
        </div>
      )}
    </div>
  );
}

const METHODE = [["affiliation", "Programme d'affiliation"], ["integrations", "Intégrations / marketplace"], ["outils_gratuits", "Outils gratuits"], ["comparatifs", "Pages comparatifs / alternatives"], ["producthunt", "Product Hunt"], ["g2", "Fiche G2"], ["capterra", "Fiche Capterra"], ["linkedin", "LinkedIn"], ["youtube", "YouTube"], ["x", "X (Twitter)"]];

function Fiche({ domaine }) {
  const nav = useNavigate();
  const { ws } = useWs();
  const [s, setS] = useState(undefined);
  const [rel, setRel] = useState([]);
  const [ev, setEv] = useState([]);
  const [sim, setSim] = useState([]);
  const [limite, setLimite] = useState(null);
  const [quota, setQuota] = useState(null);
  const [hist, setHist] = useState(null);
  const [pubs, setPubs] = useState([]);
  const [noto, setNoto] = useState([]);
  const [mails, setMails] = useState([]);
  const [dort, setDort] = useState(null);
  useEffect(() => {
    setS(undefined); setLimite(null); setDort(null);
    supabase.rpc("saas_endormi_de", { p_domaine: domaine }).then(({ data }) => setDort(data ?? null));
    supabase.rpc("saas_fiche", { ws: ws.id, d: domaine }).then(async ({ data, error }) => {
      if (error || !data) { setS(null); return; }
      if (data.limite) { setLimite(data); setS(null); return; }
      setS(data.saas); setRel(data.releves ?? []); setEv(data.evenements ?? []); setQuota(data.max ? { vues: data.vues, max: data.max } : null); setHist(data.histoire ?? null);
      // Pas encore d'histoire : Bingoo! la cherche maintenant (une fois par SaaS), puis on la recharge
      if (!data.histoire) fn("r/saas-histoire-demande", { workspace_id: ws.id, domaine }).then((r) => {
        if (r?.statut !== "en_cours") return;
        setHist({ statut: "en_cours" });
        setTimeout(() => supabase.rpc("saas_fiche", { ws: ws.id, d: domaine }).then(({ data: d2 }) => setHist(d2?.histoire ?? null)), 55000);
      }, () => {});
      supabase.rpc("saas_pubs_de", { ws: ws.id, d: domaine }).then(({ data: p }) => setPubs(p ?? []));
      supabase.rpc("saas_notoriete_de", { ws: ws.id, d: domaine }).then(({ data: n }) => setNoto(n ?? []));
      supabase.rpc("saas_emails_de", { ws: ws.id, d: domaine }).then(({ data: e }) => setMails(e ?? []));
      const { data: o } = await supabase.from("saas_liste").select("id, domaine, nom, pays, prix_entree_eur, prix_usage, sur_devis, score_croissance").eq("categorie", data.saas.categorie).neq("id", data.saas.id).order("score_croissance", { ascending: false, nullsFirst: false }).limit(6);
      setSim(o ?? []);
    });
  }, [domaine, ws.id]);
  const prixPts = useMemo(() => rel.filter((r) => r.prix_entree_eur != null).map((r) => ({ v: r.prix_entree_eur, label: new Date(r.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) })), [rel]);
  const postesPts = useMemo(() => rel.filter((r) => r.postes != null).map((r) => ({ v: r.postes, label: new Date(r.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) })), [rel]);
  if (s === undefined) return <div className="py-24 grid place-items-center"><Spinner /></div>;
  if (limite) return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <p className="text-[13px] font-bold uppercase tracking-wide text-accent-dark">Limite de la semaine atteinte</p>
      <h1 className="mt-2 text-[28px] font-black leading-tight" style={HF}>Tu as ouvert {limite.max} fiches SaaS cette semaine.</h1>
      <p className="mt-2 text-ink-soft">La fiche de {limite.nom} se débloque avec la formule supérieure, ou la semaine prochaine. La liste et les filtres restent illimités.</p>
      <div className="mt-6 flex justify-center gap-2"><button onClick={() => nav("/abonnement")} className="rounded-xl bg-accent text-white px-5 py-3 font-bold">Voir les formules</button><button onClick={() => nav("/explorer")} className="rounded-xl border border-line bg-white px-5 py-3 font-semibold">Retour à Explorer</button></div>
    </div>
  );
  if (!s) return <div className="max-w-3xl mx-auto px-6 py-16 text-center"><p className="text-ink-soft">Ce SaaS n'est pas (encore) dans la base.</p><button onClick={() => nav("/explorer")} className="mt-4 underline">Retour à Explorer</button></div>;
  const m = s.methode ?? {};
  const canaux = METHODE.filter(([k]) => m[k]);
  const lien = (u, t) => u ? <a href={u} target="_blank" rel="noopener noreferrer" className="underline decoration-line hover:decoration-ink">{t}</a> : t;
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <button onClick={() => nav("/explorer")} className="text-[13.5px] text-ink-soft hover:text-ink">← Explorer</button>
      <div className="mt-3 flex flex-wrap items-start gap-4">
        <CompanyLogo name={s.nom} url={`https://${s.domaine}`} className="w-16 h-16" pad="p-2" />
        <div className="flex-1 min-w-[240px]">
          <h1 className="text-[30px] font-black leading-tight tracking-tight" style={HF}>{s.nom} <span className="text-[22px]">{drapeau(s.pays)}</span></h1>
          <p className="text-ink-soft">{s.categorie} · <a href={`https://${s.domaine}`} target="_blank" rel="noopener noreferrer" className="underline">{s.domaine}</a>{s.pays ? ` · ${PAYS[s.pays] ?? s.pays}` : ""}</p>
          <p className="mt-2 text-[15.5px] max-w-2xl">{s.description}</p>
          {s.cible && <p className="mt-1 text-[14px] text-ink-soft">Pour : {s.cible}</p>}
          {s.succes && <p className="mt-3 inline-flex flex-wrap items-center gap-x-2 rounded-xl bg-[#FEF3C7] text-[#78350F] px-3.5 py-2 text-[14px]"><b>{s.succes.annee && s.succes.annee < new Date().getFullYear() - 4 ? "Ancien chiffre :" : "★ Preuve de succès :"}</b> {s.succes.preuve}{s.succes.source && <a href={s.succes.source} target="_blank" rel="noopener noreferrer" className="underline text-[12.5px] opacity-80">source</a>}</p>}
          {s.copiable != null && (
            <div className={cx("mt-3 rounded-xl border px-3.5 py-2.5 max-w-2xl", s.copiable >= 60 ? "border-[#BBF7D0] bg-[#F0FDF4]" : "border-line bg-white")}>
              <p className="text-[14px]"><b>{s.copiable >= 60 ? "🎯 Bon modèle à copier" : s.copiable >= 30 ? "Copiable avec un angle précis" : "Difficile à copier tel quel"}</b> <span className="text-ink-faint tnum">· {s.copiable}/100</span></p>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-ink-soft">{(s.copiable_raisons ?? []).map((r) => <li key={r}>{/Géant|Grosse|devis/.test(r) ? "–" : "✓"} {r}</li>)}</ul>
            </div>
          )}
          {(s.succes?.fondateurs ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2"><span className="text-[12.5px] font-semibold text-ink-faint">Fondé par</span>{s.succes.fondateurs.map((f) => <Fondateur key={f.lien} f={f} grand />)}</div>
          )}
          {!s.succes && s.estimation && <p className="mt-3 inline-flex flex-wrap items-center gap-x-2 rounded-xl bg-paper px-3.5 py-2 text-[14px] text-ink-soft"><b className="text-ink">Revenu estimé :</b> {montantCourt(s.estimation.bas)} à {montantCourt(s.estimation.haut)} par mois <span className="text-[12.5px] text-ink-faint">(d'après l'effectif officiel, {s.estimation.effectif} : 80 000 à 180 000 € par salarié et par an)</span></p>}
          {s.entreprise?.nom && !s.entreprise.refus && <p className="mt-2 text-[13px] text-ink-soft">Société : <b>{s.entreprise.nom}</b>{s.entreprise.creation ? ` · créée en ${s.entreprise.creation.slice(0, 4)}` : ""}{s.entreprise.effectif ? ` · ${s.entreprise.effectif.libelle}` : ""}{s.entreprise.ca ? ` · CA ${s.entreprise.annee} : ${(s.entreprise.ca / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : ""}{s.entreprise.resultat != null && s.entreprise.ca ? ` · résultat : ${(s.entreprise.resultat / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : ""} · <a href={s.entreprise.source} target="_blank" rel="noopener noreferrer" className="underline">annuaire officiel</a></p>}
          {(s.succes?.courbe ?? []).filter((x) => x.m !== new Date().toISOString().slice(0, 7)).length > 2 && (
            <div className="mt-3 max-w-md rounded-xl border border-line bg-white px-4 py-3">
              <div className="flex items-baseline justify-between text-[12.5px]"><b>Revenu vérifié, mois par mois</b><span className="text-ink-faint">{s.succes.abonnements ? `${s.succes.abonnements.toLocaleString("fr-FR")} abonnés · ` : ""}{s.succes.fonde ? `créé en ${s.succes.fonde.slice(0, 4)}` : ""}</span></div>
              <div className="mt-2"><Sparkline pts={s.succes.courbe.filter((x) => x.m !== new Date().toISOString().slice(0, 7)).map((x) => ({ n: x.v }))} h={56} /></div>
              <div className="flex justify-between text-[11.5px] text-ink-faint tnum"><span>{s.succes.courbe[0].m}</span><span>{s.succes.courbe.filter((x) => x.m !== new Date().toISOString().slice(0, 7)).at(-1).m}</span></div>
            </div>
          )}
          {(s.tags ?? []).length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{s.tags.map((t) => <span key={t} className="rounded-full bg-paper px-2.5 py-1 text-[12.5px]">{t}</span>)}</div>}
        </div>
        <div className="flex flex-col gap-2"><BoutonSuivre saasId={s.id} />
          <button onClick={() => nav(`/explorer/lancer?d=${s.domaine}`)} className="rounded-xl bg-accent text-white px-4 py-2.5 text-[14px] font-bold hover:bg-accent-dark">Lancer le mien</button></div>
        <div className="rounded-2xl bg-white border border-line px-5 py-3 text-center">
          <p className="text-[12px] text-ink-faint">Score de croissance</p>
          <p className="text-[34px] font-black tnum leading-none mt-1" style={HF}>{s.score_croissance ?? "—"}</p>
          <p className="text-[11.5px] text-ink-faint mt-1">recrutement · nouveautés</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Prix d'entrée", s.prix_entree_eur != null ? `${s.prix_entree_eur} €/mois` : usage(s) ? "À l'usage" : s.sur_devis ? "Sur devis" : "Non affiché", usage(s) ?? (s.prix_affiche && s.devise !== "€" ? `affiché ${s.prix_affiche}` : ""), s.liens?.prix],
          ["Gratuit / essai", s.gratuit ? "Version gratuite" : s.essai ? (/\d/.test(s.essai) ? `Essai ${s.essai}` : "Essai gratuit") : "Non", "", s.liens?.prix],
          ["Recrute", s.recrute ? `Oui${s.postes ? ` · ${s.postes} poste${s.postes > 1 ? "s" : ""}` : ""}` : "Pas d'offre lue", "", s.liens?.carrieres],
          ["Dernière nouveauté", date(s.nouveaute) ?? "Non trouvée", "changelog ou blog", s.liens?.nouveautes],
        ].map(([t, v, sub, u]) => (
          <div key={t} className="rounded-2xl bg-white border border-line p-4">
            <p className="text-[12.5px] text-ink-faint">{t}</p>
            <p className="mt-1 text-[19px] font-bold">{lien(u, v)}</p>
            {sub && <p className="text-[12px] text-ink-faint">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="mt-4 grid lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 rounded-2xl bg-white border border-line p-5">
          <h2 className="font-bold">Formules</h2>
          {s.formules?.length ? (
            <div className="mt-3 grid sm:grid-cols-2 gap-2">{s.formules.map((x, i) => <div key={i} className="rounded-xl bg-paper px-3 py-2.5"><p className="font-semibold text-[14px]">{x.nom}</p><p className="text-[13.5px] text-ink-soft">{x.prix}</p></div>)}</div>
          ) : <p className="mt-2 text-[14px] text-ink-faint">Formules non lisibles sur la page des tarifs.</p>}
          <h2 className="mt-6 font-bold">Historique du prix d'entrée</h2>
          <div className="mt-2">{prixPts.length > 1 ? <LineChart points={prixPts} unit=" €" height={160} /> : <p className="text-[13.5px] text-ink-faint">Un relevé par semaine : la courbe apparaît dès le deuxième relevé.</p>}</div>
          <h2 className="mt-6 font-bold">Postes ouverts dans le temps</h2>
          <div className="mt-2">{postesPts.length > 1 ? <LineChart points={postesPts} height={140} /> : <p className="text-[13.5px] text-ink-faint">La courbe apparaît dès le deuxième relevé.</p>}</div>
        </section>
        <section className="rounded-2xl bg-white border border-line p-5">
          <h2 className="font-bold">Sa méthode d'acquisition</h2>
          <p className="text-[12.5px] text-ink-faint">Ce qu'on voit sur son site</p>
          {canaux.length ? <ul className="mt-3 space-y-1.5 text-[14px]">{canaux.map(([k, l]) => <li key={k} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{lien(m[k], l)}</li>)}</ul> : <p className="mt-3 text-[14px] text-ink-faint">Aucun canal visible sur la page d'accueil.</p>}
          <h2 className="mt-6 font-bold">Notoriété web</h2>
          {s.rang_web ? (
            <div className="mt-1">
              <p className="text-[22px] font-black tnum" style={HF}>N° {Number(s.rang_web).toLocaleString("fr-FR")} <span className="text-[13px] font-semibold text-ink-faint">mondial</span></p>
              {s.rang_web_avant && s.rang_web_avant !== s.rang_web && <p className={cx("text-[13px] font-semibold", s.rang_web < s.rang_web_avant ? "text-[#15803D]" : "text-[#B91C1C]")}>{s.rang_web < s.rang_web_avant ? "▲ gagne" : "▼ perd"} {Math.abs(s.rang_web_avant - s.rang_web).toLocaleString("fr-FR")} places en un mois</p>}
              {noto.length > 1 && <div className="mt-2"><LineChart points={noto.map((n) => ({ v: n.sous_reseaux ?? 0, label: new Date(n.jour).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) }))} height={90} unit=" sites" /></div>}
              <p className="mt-1 text-[11.5px] text-ink-faint">Classé parmi le million de sites les plus cités par d'autres sites. Source : Majestic Million CSV by Majestic 12, licence CC BY 3.0.</p>
            </div>
          ) : <p className="mt-1 text-[13.5px] text-ink-faint">Pas dans le million de sites les plus cités sur le web (ou pas encore relevé).</p>}
          <h2 className="mt-6 font-bold">Outils de son site</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">{(s.outils ?? []).filter((o) => o.toLowerCase() !== (s.nom ?? "").toLowerCase()).map((o) => <span key={o} className="rounded-md bg-paper px-2 py-1 text-[12.5px]">{o}</span>)}{!(s.outils ?? []).length && <span className="text-[13.5px] text-ink-faint">Aucun repéré</span>}</div>
          <p className="mt-6 text-[12px] text-ink-faint">Relevé du {date(s.lu_at)}. Informations lues sur le site du logiciel.</p>
        </section>
      </div>

      {dort?.score >= 35 && <BlocEndormi d={dort} s={s} />}
      {hist && hist.statut !== "en_cours" && <section className="mt-4"><Histoire h={hist} /></section>}
      {hist?.statut === "en_cours" && <p className="mt-4 flex items-center gap-2 text-[13.5px] text-ink-soft"><span className="h-2 w-2 rounded-full bg-accent animate-pulse" />Bingoo! cherche les chiffres publics de {s.nom} (chiffre d'affaires, levées, fondateurs)…</p>}
      {mails.length > 0 && (
        <section className="mt-4 rounded-2xl bg-white border border-line p-5">
          <h2 className="font-bold">Ses e-mails</h2>
          <p className="text-[12.5px] text-ink-faint">Sa newsletter et ses e-mails marketing, reçus par Bingoo! depuis l'inscription publique</p>
          <div className="mt-3 space-y-2">{mails.slice(0, 10).map((m) => <CarteMail key={m.id} m={m} />)}</div>
        </section>
      )}
      {niv(ws) < 2 ? <div className="mt-4"><Verrou sombre titre={`Ses pubs, ses e-mails et ses clients`} texte={`Avec la formule Pro : les publicités et les e-mails de ${s.nom}, et les types d'entreprises qui achètent ce genre de logiciel.`} /></div>
        : <div className="mt-4"><Clients domaine={s.domaine} titre={`Les clients de ${s.nom}, tes prospects`} /></div>}
      {(pubs.length > 0 || s.pubs_at) && (
        <section className="mt-4 rounded-2xl bg-white border border-line p-5">
          <h2 className="font-bold">Ses publicités</h2>
          <p className="text-[12.5px] text-ink-faint">Bibliothèque publicitaire officielle de Meta · pubs diffusées en Europe sur 12 mois · une pub qui tourne 30 jours ou plus est presque toujours rentable</p>
          {pubs.length ? <div className="mt-3 grid md:grid-cols-2 gap-3">{pubs.slice(0, 8).map((p) => <CartePub key={p.ext_id} p={p} />)}</div>
            : <p className="mt-2 text-[13.5px] text-ink-faint">Aucune pub Facebook ou Instagram diffusée en Europe sur les 12 derniers mois.</p>}
        </section>
      )}

      <section className="mt-4 rounded-2xl bg-white border border-line p-5">
        <h2 className="font-bold">Ce qui a bougé</h2>
        {ev.length ? <ul className="mt-3 divide-y divide-line">{ev.map((e, i) => <li key={i} className="py-2 flex items-center gap-3 text-[14px]"><span className="text-ink-faint tnum w-24 shrink-0">{date(e.at)}</span><span>{evTexte(e)}</span></li>)}</ul>
          : <p className="mt-2 text-[13.5px] text-ink-faint">Rien pour l'instant : chaque relevé est comparé au précédent (prix, formules gratuites, essai, recrutement, nouveautés).</p>}
      </section>
      {quota && <p className="mt-3 text-[12.5px] text-ink-faint text-right">{quota.vues} fiche{quota.vues > 1 ? "s" : ""} ouverte{quota.vues > 1 ? "s" : ""} sur {quota.max} cette semaine</p>}

      {sim.length > 0 && (
        <section className="mt-4 rounded-2xl bg-white border border-line p-5">
          <h2 className="font-bold">SaaS similaires · {s.categorie}</h2>
          <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sim.map((o) => (
              <button key={o.id} onClick={() => nav(`/explorer/${o.domaine}`)} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:border-ink-faint">
                <CompanyLogo name={o.nom} url={`https://${o.domaine}`} className="w-9 h-9" />
                <div className="min-w-0 flex-1"><p className="font-semibold text-[14px] truncate">{o.nom} {drapeau(o.pays)}</p><p className="text-[12.5px] text-ink-faint">{prixCourt(o)}</p></div>
                {o.score_croissance > 0 && <span className="text-[12px] font-bold tnum text-ink-soft">{o.score_croissance}</span>}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}


// ---------------------------------------------------------------- Ce qui a bougé
function Fil() {
  const nav = useNavigate();
  const [jours, setJours] = useState(30);
  const [cat, setCat] = useState("");
  const [rows, setRows] = useState(null);
  useEffect(() => { setRows(null); supabase.rpc("saas_fil", { jours, cat: cat || null }).then(({ data }) => setRows(data ?? [])); }, [jours, cat]);
  const parJour = useMemo(() => { const m = new Map(); for (const r of rows ?? []) { const k = r.at.slice(0, 10); m.set(k, [...(m.get(k) ?? []), r]); } return [...m.entries()]; }, [rows]);
  const compte = (t) => (rows ?? []).filter((r) => t.includes(r.type)).length;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[30px] font-black tracking-tight" style={HF}>Ce qui a bougé</h1>
      <p className="text-ink-soft">Chaque relevé est comparé au précédent : prix, version gratuite, essai, recrutement, nouveautés publiées.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <select value={jours} onChange={(e) => setJours(Number(e.target.value))} className="rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]">{[7, 30, 90].map((j) => <option key={j} value={j}>{j} derniers jours</option>)}</select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]"><option value="">Toutes les catégories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {rows && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[["Changements de prix", ["prix_hausse", "prix_baisse"]], ["Recrutement", ["recrutement_hausse", "recrutement_baisse", "recrute_debut", "recrute_fin"]], ["Nouveautés publiées", ["nouveaute"]], ["Gratuit et essai", ["gratuit_ajoute", "gratuit_retire", "essai_change"]]].map(([t, k]) => (
            <div key={t} className="rounded-2xl bg-white border border-line p-4"><p className="text-[26px] font-black tnum" style={HF}>{compte(k)}</p><p className="text-[13px] text-ink-soft">{t}</p></div>
          ))}
        </div>
      )}
      {!rows ? <div className="py-16 grid place-items-center"><Spinner /></div> : !rows.length ? (
        <p className="mt-6 rounded-2xl bg-white border border-line p-6 text-ink-soft">Aucun changement sur la période. Les SaaS sont relus une fois par semaine : les premiers changements apparaissent après le deuxième relevé de chaque logiciel.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {parJour.map(([j, l]) => (
            <section key={j}>
              <p className="text-[12.5px] font-bold uppercase tracking-wide text-ink-faint">{new Date(j).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
              <ul className="mt-2 rounded-2xl bg-white border border-line divide-y divide-line">
                {l.map((r, i) => (
                  <li key={i} onClick={() => nav(`/explorer/${r.domaine}`)} className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-paper/60">
                    <CompanyLogo name={r.nom} url={`https://${r.domaine}`} className="w-9 h-9" />
                    <div className="min-w-0 flex-1"><p className="text-[14.5px]"><span className="font-bold">{r.nom}</span> {drapeau(r.pays)} · {evTexte(r)}</p><p className="text-[12.5px] text-ink-faint">{r.categorie}</p></div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Pays et tendances
function Sparkline({ pts, h = 44 }) {
  if (pts.length < 2) return <div style={{ height: h }} />;
  const max = Math.max(...pts.map((p) => p.n)), min = Math.min(...pts.map((p) => p.n));
  const W = 200, xy = pts.map((p, i) => [(i / (pts.length - 1)) * W, h - 4 - ((p.n - min) / Math.max(1, max - min)) * (h - 8)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return <svg viewBox={`0 0 ${W} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none"><path d={`${d} L${W},${h} L0,${h} Z`} fill="#E0531F" fillOpacity=".1" /><path d={d} fill="none" stroke="#E0531F" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}

function Marche() {
  const { ws } = useWs();
  const [m, setM] = useState(null);
  const [t, setT] = useState(null);
  const [theme, setTheme] = useState("tous");
  useEffect(() => {
    supabase.rpc("saas_marche").then(({ data }) => setM(data ?? []));
    fn("r/saas-tendances", { workspace_id: ws.id }).then(setT).catch(() => setT({ series: [] }));
  }, [ws.id]);
  const pays = useMemo(() => {
    const g = new Map();
    for (const r of m ?? []) {
      const x = g.get(r.pays) ?? { pays: r.pays, n: 0, recrutent: 0, postes: 0, gratuits: 0, actifs: 0, cats: [] };
      x.n += Number(r.n); x.recrutent += Number(r.recrutent); x.postes += Number(r.postes); x.gratuits += Number(r.gratuits); x.actifs += Number(r.actifs_30j); x.cats.push([r.categorie, Number(r.n), Number(r.postes)]);
      g.set(r.pays, x);
    }
    return [...g.values()].filter((x) => x.pays !== "??").sort((a, b) => b.n - a.n);
  }, [m]);
  // Écarts entre pays : catégories bien représentées ailleurs, peu présentes en France
  const ecarts = useMemo(() => {
    const parCat = new Map();
    for (const r of m ?? []) { if (r.pays === "??") continue; const x = parCat.get(r.categorie) ?? { fr: 0, ailleurs: 0, postes: 0 }; if (r.pays === "FR") x.fr += Number(r.n); else { x.ailleurs += Number(r.n); x.postes += Number(r.postes); } parCat.set(r.categorie, x); }
    return [...parCat.entries()].filter(([c, x]) => c !== "Autre" && x.ailleurs >= 3).map(([c, x]) => ({ c, ...x, ratio: x.ailleurs / Math.max(1, x.fr) })).sort((a, b) => b.ratio - a.ratio).slice(0, 6);
  }, [m]);
  const serie = t?.series?.find((s) => s.id === theme);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[30px] font-black tracking-tight" style={HF}>Pays et tendances</h1>
      <p className="text-ink-soft">Ce qui se crée, ce qui recrute et ce qui manque, par pays et par catégorie.</p>

      <section className="mt-5 rounded-2xl bg-white border border-line p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="font-bold text-[17px]">Créations d'éditeurs de logiciels en France</h2><p className="text-[12.5px] text-ink-faint">{t?.source ?? "…"} · 12 derniers mois complets</p></div>
          <select value={theme} onChange={(e) => setTheme(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2 text-[14px]">{(t?.series ?? []).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        </div>
        <div className="mt-4">{!t ? <div className="py-10 grid place-items-center"><Spinner /></div> : serie?.points?.length ? <LineChart points={serie.points.map((p) => ({ v: p.n, label: new Date(p.mois + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }) }))} height={200} unit=" créations" /> : <p className="text-ink-faint text-[14px]">Données indisponibles pour l'instant.</p>}</div>
        {t?.series?.length > 0 && (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {t.series.filter((s) => s.id !== "tous").sort((a, b) => (b.evolution_3m ?? -999) - (a.evolution_3m ?? -999)).map((s) => (
              <button key={s.id} onClick={() => setTheme(s.id)} className={cx("text-left rounded-xl border p-3 transition", theme === s.id ? "border-ink" : "border-line hover:border-ink-faint")}>
                <div className="flex items-baseline justify-between gap-2"><p className="font-semibold text-[13.5px] truncate">{s.label}</p>{s.evolution_3m != null && <span title="Évolution sur 3 mois" className={cx("shrink-0 whitespace-nowrap text-[12.5px] font-bold tnum", s.evolution_3m >= 0 ? "text-[#15803D]" : "text-[#B91C1C]")}>{s.evolution_3m > 0 ? "+" : ""}{s.evolution_3m} %</span>}</div>
                <p className="text-[12px] text-ink-faint">{s.dernier} créations le mois dernier · évolution sur 3 mois</p>
                <Sparkline pts={s.points} />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl bg-white border border-line p-5">
        <h2 className="font-bold text-[17px]">Les SaaS par pays</h2>
        <p className="text-[12.5px] text-ink-faint">Base Explorer · pays lu sur le site de chaque logiciel</p>
        {!m ? <div className="py-10 grid place-items-center"><Spinner /></div> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[14px] tnum min-w-[720px]">
              <thead><tr className="text-left text-[12px] text-ink-faint border-b border-line"><th className="py-2 pr-3 font-medium">Pays</th><th className="py-2 px-2 font-medium text-right">SaaS</th><th className="py-2 px-2 font-medium text-right">Recrutent</th><th className="py-2 px-2 font-medium text-right">Postes ouverts</th><th className="py-2 px-2 font-medium text-right">Gratuits</th><th className="py-2 px-2 font-medium text-right">Nouveauté &lt; 30 j</th><th className="py-2 pl-3 font-medium">Catégories les plus présentes</th></tr></thead>
              <tbody>{pays.map((p) => (
                <tr key={p.pays} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-3 font-semibold">{drapeau(p.pays)} {PAYS[p.pays] ?? p.pays}</td><td className="py-2.5 px-2 text-right">{p.n}</td><td className="py-2.5 px-2 text-right">{p.recrutent}</td><td className="py-2.5 px-2 text-right">{p.postes}</td><td className="py-2.5 px-2 text-right">{p.gratuits}</td><td className="py-2.5 px-2 text-right">{p.actifs}</td>
                  <td className="py-2.5 pl-3 text-[13px] text-ink-soft">{p.cats.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c} (${n})`).join(" · ")}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {ecarts.length > 0 && (
        <section className="mt-4 rounded-2xl bg-white border border-line p-5">
          <h2 className="font-bold text-[17px]">Fort ailleurs, rare en France</h2>
          <p className="text-[12.5px] text-ink-faint">Catégories où la base compte beaucoup plus de SaaS étrangers que français</p>
          <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ecarts.map((e) => (
              <div key={e.c} className="rounded-xl bg-paper p-4"><p className="font-semibold">{e.c}</p><p className="mt-1 text-[13.5px] text-ink-soft tnum">{e.ailleurs} SaaS à l'étranger ({e.postes} postes ouverts) · {e.fr} en France</p></div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Clients à démarcher (niche ou SaaS → cibles Bingoo!)
function Clients({ domaine, categorie, tag, titre = "Qui démarcher dans cette niche" }) {
  const nav = useNavigate();
  const toast = useToast();
  const { ws, reload } = useWs();
  const [r, setR] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ajout, setAjout] = useState("");
  const voir = async () => {
    setBusy(true);
    try { setR(await fn("r/saas-clients", { workspace_id: ws.id, domaine: domaine ?? null, categorie: categorie ?? null, tag: tag ?? null })); }
    catch (x) { toast(x.message, "bad"); } finally { setBusy(false); }
  };
  const ajouter = async (sg) => {
    setAjout(sg.label);
    try { const x = await fn("r/saas-cible-ajouter", { workspace_id: ws.id, segment: sg }); await reload?.(); toast(x.deja ? "Déjà dans tes cibles" : "Ajouté à tes cibles : Bingoo! commence à chercher ces entreprises", "good"); }
    catch (x) { toast(x.message, "bad"); } finally { setAjout(""); }
  };
  const mes = new Set((ws.targets ?? []).map((t) => String(t.label).toLowerCase()));
  return (
    <section className="rounded-2xl bg-ink text-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-bold text-[17px]">{titre}</h2><p className="text-[13px] text-white/70">Les entreprises qui achètent ce genre de logiciel, comptées dans le registre officiel.{["explorer", "explorer_pro", "business"].includes(ws.plan) ? " Leurs codes d'activité te servent à les trouver dans ton outil de prospection." : " Ajoute-les à tes cibles : Bingoo! trouve le décideur et prépare les messages."}</p></div>
        {!r && <button onClick={voir} disabled={busy} className="shrink-0 rounded-xl bg-accent px-5 py-3 font-bold hover:bg-accent-dark disabled:opacity-60">{busy ? "Recherche…" : "Voir qui démarcher"}</button>}
      </div>
      {r && (r.segments?.length ? (
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          {r.segments.map((sg) => (
            <div key={sg.label} className="rounded-xl bg-white/[.07] p-4 flex flex-col">
              <div className="flex items-start justify-between gap-3"><p className="font-bold">{sg.label}</p>{sg.total != null && <p className="shrink-0 text-right"><span className="text-[20px] font-black tnum" style={HF}>{Number(sg.total) >= 10000 ? "10 000+" : Number(sg.total).toLocaleString("fr-FR")}</span><br /><span className="text-[11.5px] text-white/60">entreprises</span></p>}</div>
              <p className="mt-1 text-[13.5px] text-white/80 flex-1">{sg.pourquoi}</p>
              <p className="mt-2 text-[12.5px] text-white/60">À qui écrire : {sg.interlocuteur || "dirigeant"} · NAF {sg.naf.join(", ")}</p>
              {["explorer", "explorer_pro", "business"].includes(ws.plan) ? null
                : mes.has(sg.label.toLowerCase()) ? <button onClick={() => nav("/radar")} className="mt-3 self-start rounded-lg bg-white/15 px-3 py-2 text-[13px] font-semibold">Dans tes cibles · voir le Radar</button>
                : <button onClick={() => ajouter(sg)} disabled={!!ajout} className="mt-3 self-start rounded-lg bg-white text-ink px-3 py-2 text-[13px] font-bold hover:bg-white/90 disabled:opacity-60">{ajout === sg.label ? "Ajout…" : "Ajouter à mes cibles"}</button>}
            </div>
          ))}
          <p className="md:col-span-2 text-[11.5px] text-white/50">Segments proposés par une IA à partir de ce que ces logiciels vendent et à qui ; nombres : {r.source}.</p>
        </div>
      ) : <p className="mt-3 text-white/70 text-[14px]">Pas assez d'informations sur ces logiciels pour proposer des clients.</p>)}
    </section>
  );
}

// ---------------------------------------------------------------- E-mails (bibliothèque)
const TYPE_MAIL = { promotion: ["Promotion", "#B91C1C"], lancement: ["Lancement", "#E0531F"], contenu: ["Contenu", "#1D4ED8"], evenement: ["Événement", "#7C3AED"], temoignage: ["Témoignage", "#15803D"], relance: ["Relance", "#92400E"], bienvenue: ["Bienvenue", "#0E7490"], autre: ["Autre", "#5B5D66"] };
function CarteMail({ m, saas }) {
  const { ws } = useWs();
  const [corps, setCorps] = useState(null);
  const [l, c] = TYPE_MAIL[m.kind] ?? TYPE_MAIL.autre;
  const lire = async () => { if (corps != null) { setCorps(null); return; } const { data } = await supabase.rpc("saas_email_body", { ws: ws.id, id: m.id }); setCorps(data ?? ""); };
  return (
    <article className="rounded-xl border border-line p-3.5">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        {saas && <span className="font-bold text-[13.5px]">{saas.nom} {drapeau(saas.pays)}</span>}
        <span className="rounded-md px-1.5 py-0.5 font-bold text-white" style={{ background: c }}>{l}</span>
        <span className="text-ink-faint">{date(m.recu_at)}</span>
      </div>
      <p className="mt-1.5 font-semibold text-[14px]">{m.subject}</p>
      {m.resume && <p className="text-[13.5px] text-ink-soft">{m.resume}</p>}
      {m.offre && <p className="mt-1 text-[13px]"><span className="font-semibold">Offre : </span>{m.offre}</p>}
      <button onClick={lire} className="mt-1.5 text-[12.5px] font-semibold underline">{corps != null ? "Fermer" : "Lire l'e-mail"}</button>
      {corps != null && <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-line rounded-lg bg-paper p-3 text-[13px] text-ink-soft">{corps || "Texte indisponible."}</p>}
    </article>
  );
}

// ---------------------------------------------------------------- Pubs (bibliothèque Meta)
const PLATEFORME = { facebook: "Facebook", instagram: "Instagram", messenger: "Messenger", audience_network: "Audience Network", threads: "Threads" };
function CartePub({ p, saas }) {
  const j = Number(p.jours ?? 0), marche = j >= 30;
  return (
    <article className="rounded-xl border border-line p-4 flex flex-col">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        {saas && <span className="font-bold text-[13.5px]">{saas.nom} {drapeau(saas.pays)}</span>}
        <span className={cx("rounded-md px-1.5 py-0.5 font-bold", p.active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-paper text-ink-soft")}>{p.active ? `Active depuis ${j} j` : `Arrêtée après ${j} j`}</span>
        {marche && <span className="rounded-md bg-accent text-white px-1.5 py-0.5 font-bold">Marche</span>}
        <span className="text-ink-faint">{(p.plateformes ?? []).map((x) => PLATEFORME[x] ?? x).join(", ")}</span>
      </div>
      {p.titre && <p className="mt-2 font-semibold text-[14px]">{p.titre}</p>}
      <p className="mt-1 text-[13.5px] text-ink-soft whitespace-pre-line line-clamp-5 flex-1">{p.body || "Pub sans texte (image ou vidéo seule)"}</p>
      <div className="mt-2 flex items-center justify-between text-[12px] text-ink-faint">
        <span>{p.started ? `Depuis le ${date(p.started)}` : ""}{p.reach ? ` · ${Number(p.reach).toLocaleString("fr-FR")} personnes touchées en Europe` : ""}</span>
        <a href={p.snapshot_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline">Voir la pub</a>
      </div>
    </article>
  );
}

function Pubs() {
  const { ws } = useWs();
  if (niv(ws) < 2) return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6"><h1 className="text-[30px] font-black tracking-tight" style={HF}>Pubs et e-mails</h1><div className="mt-4"><Verrou titre="Comment ils vont chercher leurs clients" texte="Les publicités Facebook et Instagram et les e-mails des SaaS de ta niche, dans la formule Pro." /></div></div>;
  return <PubsContenu />;
}
function PubsContenu() {
  const nav = useNavigate();
  const { ws } = useWs();
  const [cat, setCat] = useState("");
  const [tag, setTag] = useState("");
  const [niches, setNiches] = useState([]);
  const [d, setD] = useState(null);
  const [seulMarche, setSeulMarche] = useState(true);
  const [em, setEm] = useState(null);
  useEffect(() => { setEm(null); supabase.rpc("saas_emails_niche", { ws: ws.id, cat: cat || null, tag: tag || null }).then(({ data }) => setEm(data ?? { emails: [], types: {}, inscrits: 0 })); }, [ws.id, cat, tag]);
  useEffect(() => { supabase.rpc("saas_niches", { cat: cat || null }).then(({ data }) => setNiches(data ?? [])); }, [cat]);
  useEffect(() => { setD(null); supabase.rpc("saas_pubs_niche", { ws: ws.id, cat: cat || null, tag: tag || null }).then(({ data }) => setD(data ?? { pubs: [], courbe: [], annonceurs: [], total: 0 })); }, [ws.id, cat, tag]);
  const pubs = (d?.pubs ?? []).filter((p) => !seulMarche || Number(p.jours) >= 30);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[30px] font-black tracking-tight" style={HF}>Pubs et e-mails</h1>
      <p className="text-ink-soft">Comment les SaaS de ta niche vont chercher leurs clients : leurs publicités Facebook et Instagram, et les e-mails qu'ils envoient à leurs abonnés.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select value={cat} onChange={(e) => { setCat(e.target.value); setTag(""); }} className="rounded-xl border border-line bg-white px-3 py-2 text-[14px]"><option value="">Toutes les catégories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        {niches.slice(0, 12).map((n) => <Chip key={n.tag} on={tag === n.tag} onClick={() => setTag(tag === n.tag ? "" : n.tag)}>{n.tag}</Chip>)}
      </div>
      {!d ? <div className="py-16 grid place-items-center"><Spinner /></div> : !Number(d.total) ? (
        <div className="mt-6 rounded-2xl bg-white border border-line p-8 text-center">
          <p className="text-[19px] font-bold">Les publicités arrivent.</p>
          <p className="mt-1 text-ink-soft max-w-xl mx-auto">Bingoo! se branche sur la bibliothèque publicitaire officielle de Meta : chaque pub diffusée en Europe, avec ses dates exactes et le nombre de personnes touchées. Le premier relevé apparaîtra ici.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid lg:grid-cols-3 gap-4">
            <section className="lg:col-span-2 rounded-2xl bg-white border border-line p-5">
              <h2 className="font-bold">Pubs actives par mois</h2>
              <p className="text-[12.5px] text-ink-faint">{cat || tag ? [cat, tag].filter(Boolean).join(" · ") : "Toute la base"} · 12 derniers mois</p>
              <div className="mt-3">{(d.courbe ?? []).some((c) => Number(c.n)) ? <LineChart points={d.courbe.map((c) => ({ v: Number(c.n), label: new Date(c.mois + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }) }))} height={180} unit=" pubs" /> : <p className="text-[13.5px] text-ink-faint">Pas de pub dans cette niche sur 12 mois.</p>}</div>
            </section>
            <section className="rounded-2xl bg-white border border-line p-5">
              <h2 className="font-bold">Qui investit le plus</h2>
              <ul className="mt-2 divide-y divide-line">{(d.annonceurs ?? []).slice(0, 8).map((a) => (
                <li key={a.domaine}><button onClick={() => nav(`/explorer/${a.domaine}`)} className="w-full py-2 flex items-center justify-between gap-2 text-left text-[14px] hover:underline"><span className="truncate">{a.nom} {drapeau(a.pays)}</span><span className="shrink-0 text-[12.5px] text-ink-faint tnum">{a.actives} active{a.actives > 1 ? "s" : ""} · {a.total} en 12 mois</span></button></li>
              ))}</ul>
            </section>
          </div>
          <div className="mt-5 flex items-center justify-between gap-2">
            <h2 className="font-bold text-[17px]">{seulMarche ? "Pubs diffusées 30 jours ou plus" : "Toutes les pubs, les plus longues d'abord"}</h2>
            <Chip on={seulMarche} onClick={() => setSeulMarche(!seulMarche)}>Seulement celles qui marchent</Chip>
          </div>
          {pubs.length ? <div className="mt-3 grid md:grid-cols-2 xl:grid-cols-3 gap-3">{pubs.map((p) => <CartePub key={p.domaine + p.ext_id} p={p} saas={p} />)}</div> : <p className="mt-3 text-ink-faint">Aucune pub de 30 jours ou plus dans cette sélection.</p>}
          <p className="mt-4 text-[12px] text-ink-faint">Source : bibliothèque publicitaire de Meta (pubs diffusées dans l'Union européenne). Seules les pubs publiées par la page du logiciel lui-même sont gardées.</p>
        </>
      )}
      <section className="mt-8">
        <h2 className="font-bold text-[20px]">Leurs derniers e-mails</h2>
        <p className="text-[13px] text-ink-faint">Bingoo! est abonné à la newsletter publique de {em?.inscrits ?? "…"} SaaS. Chaque e-mail reçu est classé et résumé.</p>
        {em && Object.keys(em.types ?? {}).length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(em.types).sort((a, b) => b[1] - a[1]).map(([k, n]) => <span key={k} className="rounded-full bg-white border border-line px-2.5 py-1 text-[12.5px]">{(TYPE_MAIL[k] ?? TYPE_MAIL.autre)[0]} <span className="tnum text-ink-faint">{n}</span></span>)}<span className="text-[12px] text-ink-faint self-center">sur 90 jours</span></div>}
        {!em ? <div className="py-10 grid place-items-center"><Spinner /></div> : em.emails?.length ? <div className="mt-3 grid md:grid-cols-2 gap-3">{em.emails.map((m) => <CarteMail key={m.id} m={m} saas={m} />)}</div>
          : <p className="mt-3 rounded-2xl bg-white border border-line p-5 text-ink-soft">Les premiers e-mails arrivent : les inscriptions aux newsletters se font chaque nuit, et les SaaS envoient en général leur premier e-mail dans la semaine.</p>}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Idées et réussites
const CHIFFRE = { ca: "Chiffre d'affaires", arr: "Revenu annuel récurrent", mrr: "Revenu mensuel récurrent", levee: "Levée de fonds", salaries: "Salariés", clients: "Clients" };
const montant = (v) => v >= 1e9 ? `${(v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md€` : v >= 1e6 ? `${(v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : v >= 1e3 ? `${Math.round(v / 1e3)} k€` : `${v} €`;
const hote = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "source"; } };

function Histoire({ h, saas, onOuvrir }) {
  const ch = [...(h.chiffres ?? [])].sort((a, b) => (b.valeur_eur ?? 0) - (a.valeur_eur ?? 0));
  const tete = ch.find((c) => ["ca", "arr", "mrr"].includes(c.type)) ?? ch.find((c) => c.type === "levee") ?? ch[0];
  return (
    <article className="rounded-2xl bg-white border border-line p-5">
      <div className="flex flex-wrap items-start gap-3">
        {saas && <button onClick={onOuvrir} className="shrink-0"><CompanyLogo name={saas.nom} url={`https://${saas.domaine}`} className="w-11 h-11" /></button>}
        <div className="flex-1 min-w-[200px]">
          {saas ? <button onClick={onOuvrir} className="text-left"><h3 className="font-bold text-[17px] hover:underline">{saas.nom} {drapeau(saas.pays)}</h3></button> : <h2 className="font-bold">Son histoire</h2>}
          <p className="text-[13px] text-ink-faint">{[saas?.categorie, h.annee_creation && `créé en ${h.annee_creation}`, h.fondateurs?.length && `par ${h.fondateurs.join(", ")}`].filter(Boolean).join(" · ")}</p>
        </div>
        {tete && <div className="text-right"><p className="text-[24px] font-black leading-none tnum" style={HF}>{tete.valeur_eur != null ? montant(tete.valeur_eur) : tete.valeur.toLocaleString("fr-FR")}</p><p className="mt-1 text-[12px] text-ink-faint">{CHIFFRE[tete.type]}{tete.annee ? ` · ${tete.annee}` : ""}</p></div>}
      </div>
      {h.histoire && <p className="mt-3 text-[14.5px] leading-relaxed">{h.histoire}</p>}
      {h.lecons?.length > 0 && (
        <div className="mt-3 rounded-xl bg-[#FFF7F3] px-4 py-3">
          <p className="text-[12px] font-bold uppercase tracking-wide text-accent-dark">Comment il a grandi</p>
          <ul className="mt-1 space-y-1 text-[14px]">{h.lecons.map((l, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{l}</li>)}</ul>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {saas && <button onClick={(e) => { e.stopPropagation(); window.location.hash = `#/explorer/lancer?d=${saas.domaine}`; }} className="rounded-full bg-accent text-white px-3 py-1 text-[12.5px] font-bold hover:bg-accent-dark">Lancer le mien</button>}
        {ch.map((c, i) => <a key={i} href={c.source} target="_blank" rel="noopener noreferrer" title={c.source} className="rounded-full border border-line px-2.5 py-1 text-[12.5px] hover:border-ink-faint">{c.texte} <span className="text-ink-faint">· {hote(c.source)}</span></a>)}
      </div>
    </article>
  );
}

const IDEE = {
  importer: ["À lancer en France", "#1D4ED8"],
  gratuit: ["Place pour une offre gratuite", "#15803D"],
  chauffe: ["Marché qui accélère", "#E0531F"],
};
function idees(d) {
  const out = [];
  for (const n of [...(d?.niches ?? []), ...(d?.categories ?? [])]) {
    const x = { ...n, n: Number(n.n), fr: Number(n.fr), etranger: Number(n.etranger), recrutent: Number(n.recrutent), postes: Number(n.postes), gratuits: Number(n.gratuits), actifs: Number(n.actifs), prix: n.prix_median != null ? Math.round(n.prix_median) : null };
    const tag = x.genre === "tag";
    if (x.etranger >= 3 && (tag ? x.fr === 0 : x.etranger >= 4 * Math.max(1, x.fr)))
      out.push({ k: "importer", x, poids: x.etranger * 2 + x.recrutent * 3, texte: `Parmi les ${x.fr + x.etranger} SaaS dont le pays est connu : ${x.etranger} étrangers, ${x.fr === 0 ? "aucun français" : `${x.fr} seulement en France`}.${x.recrutent ? ` ${x.recrutent} d'entre eux recrutent, signe que la demande existe.` : ""}` });
    if (x.n >= 4 && x.gratuits === 0 && x.prix != null && x.prix >= 15)
      out.push({ k: "gratuit", x, poids: x.n + x.prix / 10, texte: `Aucun des ${x.n} SaaS n'a de version gratuite, et l'entrée coûte ${x.prix} € par mois en médiane. Une offre gratuite ou moins chère se remarquerait.` });
    if (x.n >= 3 && (x.recrutent / x.n >= 0.4 || x.actifs / x.n >= 0.5))
      out.push({ k: "chauffe", x, poids: x.recrutent * 3 + x.actifs * 2 + x.postes / 10, texte: `${x.recrutent} sur ${x.n} recrutent (${x.postes} postes ouverts)${x.actifs ? ` et ${x.actifs} ont sorti une nouveauté ce mois-ci` : ""}. L'argent et les équipes arrivent sur ce sujet.` });
  }
  return out.sort((a, b) => b.poids - a.poids);
}

function Idees() {
  const nav = useNavigate();
  const { ws } = useWs();
  const [vue, setVue] = useState("reussites");
  const [cat, setCat] = useState("");
  const [r, setR] = useState(null);
  const [d, setD] = useState(null);
  const [type, setType] = useState("");
  const [cli, setCli] = useState(null);
  useEffect(() => { setR(null); supabase.rpc("saas_reussites", { ws: ws.id, cat: cat || null, lim: 60 }).then(({ data }) => setR(data ?? [])); }, [ws.id, cat]);
  useEffect(() => { supabase.rpc("saas_idees", { ws: ws.id }).then(({ data }) => setD(data ?? {})); }, [ws.id]);
  const liste = useMemo(() => idees(d).filter((i) => !type || i.k === type), [d, type]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[30px] font-black tracking-tight" style={HF}>Idées et réussites</h1>
      <p className="text-ink-soft">Les SaaS qui chiffrent le plus et comment ils ont grandi, puis les idées que la base fait ressortir.</p>
      <div className="mt-4 rounded-2xl bg-ink text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><p className="font-bold text-[17px]">Un SaaS marche ? Lance le même, à ton nom.</p><p className="text-[13.5px] text-white/70">Colle son adresse : ses fonctionnalités, ton équivalent, les prix, le plan d'affaires et le texte pour le faire coder.</p></div>
        <AutreSaas grand />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip on={vue === "reussites"} onClick={() => setVue("reussites")}>Ceux qui chiffrent le plus</Chip>
        <Chip on={vue === "idees"} onClick={() => setVue("idees")}>Idées à prendre</Chip>
      </div>

      {vue === "reussites" && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12.5px] text-ink-faint max-w-2xl">Chiffres publiés par la presse ou par l'entreprise elle-même, chacun avec sa source. Classés par chiffre d'affaires ou revenu annuel connu.</p>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2 text-[14px]"><option value="">Toutes les catégories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          {!r ? <div className="py-16 grid place-items-center"><Spinner /></div> : r.length ? (
            <div className="mt-3 grid lg:grid-cols-2 gap-3">{r.map((h) => <Histoire key={h.domaine} h={h} saas={h} onOuvrir={() => nav(`/explorer/${h.domaine}`)} />)}</div>
          ) : <p className="mt-6 text-ink-faint">Aucune réussite chiffrée pour l'instant dans cette catégorie. La base en ajoute plusieurs par heure.</p>}
        </>
      )}

      {vue === "idees" && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Chip on={!type} onClick={() => setType("")}>Toutes</Chip>
            {Object.entries(IDEE).map(([k, [l]]) => <Chip key={k} on={type === k} onClick={() => setType(k)}>{l}</Chip>)}
          </div>
          <p className="mt-2 text-[12.5px] text-ink-faint">Calculé sur les {d?.total ?? "…"} SaaS lus de la base (pays, prix, recrutement, nouveautés). Plus la base grandit, plus les idées sont fiables.</p>
          {!d ? <div className="py-16 grid place-items-center"><Spinner /></div> : liste.length ? (
            <div className="mt-3 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {liste.map((i) => (
                <article key={i.k + i.x.niche} className="rounded-2xl bg-white border border-line p-5 flex flex-col">
                  <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: IDEE[i.k][1] }}>{IDEE[i.k][0]}</p>
                  <h3 className="mt-1 text-[19px] font-black leading-tight first-letter:uppercase" style={HF}>{i.x.niche}</h3>
                  <p className="text-[12px] text-ink-faint">{i.x.genre === "tag" ? "niche" : "catégorie"} · {i.x.n} SaaS{i.x.prix != null ? ` · ${i.x.prix} €/mois en médiane` : ""}</p>
                  <p className="mt-2 text-[14px] text-ink-soft flex-1">{i.texte}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{(i.x.exemples ?? []).map((e) => <button key={e.domaine} onClick={() => nav(`/explorer/${e.domaine}`)} className="rounded-full bg-paper px-2.5 py-1 text-[12.5px] hover:bg-line">{e.nom} {drapeau(e.pays)}</button>)}</div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                    <button onClick={() => nav(i.x.genre === "tag" ? `/explorer?tag=${encodeURIComponent(i.x.niche)}` : `/explorer?categorie=${encodeURIComponent(i.x.niche)}`)} className="text-[13.5px] font-semibold underline">Voir les {i.x.n} SaaS</button>
                    <button onClick={() => { if (niv(ws) < 2) { nav("/abonnement"); return; } setCli(i.x); setTimeout(() => document.getElementById("clients-niche")?.scrollIntoView({ behavior: "smooth" }), 50); }} className="text-[13.5px] font-semibold text-accent-dark underline">Qui démarcher</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="mt-6 text-ink-faint">Pas encore assez de SaaS lus pour faire ressortir des idées.</p>}
          {cli && <div id="clients-niche" className="mt-4"><Clients key={cli.genre + cli.niche} categorie={cli.genre === "categorie" ? cli.niche : null} tag={cli.genre === "tag" ? cli.niche : null} titre={`Qui démarcher : ${cli.niche}`} /></div>}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Lancer le mien : un SaaS inspiré d'un SaaS qui marche
/** N'importe quel SaaS, même absent de la base : on colle son adresse. */
function AutreSaas({ grand = false }) {
  const nav = useNavigate();
  const [u, setU] = useState("");
  const go = (e) => { e.preventDefault(); const d = u.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].toLowerCase(); if (d.includes(".")) { setU(""); nav(`/explorer/lancer?d=${encodeURIComponent(d)}`); } };
  return (
    <form onSubmit={go} className={cx("flex gap-2", grand ? "w-full max-w-xl" : "")}>
      <input value={u} onChange={(e) => setU(e.target.value)} placeholder={grand ? "adresse du SaaS à concurrencer, ex. notion.so" : "Un autre SaaS : son adresse"} className={cx("flex-1 min-w-0 rounded-xl border border-line bg-white px-3 outline-none focus:border-ink", grand ? "py-3 text-[15px]" : "py-2 text-[13.5px] w-56")} />
      <button className={cx("shrink-0 rounded-xl bg-ink text-white font-bold hover:bg-black", grand ? "px-5 py-3 text-[15px]" : "px-3 py-2 text-[13px]")}>{grand ? "Lancer le mien" : "OK"}</button>
    </form>
  );
}
const eurs = (n) => `${Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
function Lancer() {
  const nav = useNavigate();
  const loc = useLocation();
  const { ws } = useWs();
  const toast = useToast();
  const d = new URLSearchParams(loc.search).get("d") ?? "";
  const [saas, setSaas] = useState(null);
  const [p, setP] = useState(undefined);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from("saas_liste").select("nom, domaine, categorie, description, pays, prix_entree_eur, succes").eq("domaine", d).maybeSingle().then(({ data }) => setSaas(data ?? null));
    supabase.from("saas_projets").select("id, data, at, statut").eq("workspace_id", ws.id).eq("data->inspire->>domaine", d).eq("statut", "pret").order("at", { ascending: false }).limit(1).then(({ data }) => setP(data?.[0] ? { id: data[0].id, ...data[0].data } : null));
  }, [d, ws.id]);
  // Le projet se prépare en tâche de fond (une à deux minutes) : on interroge la base toutes les 4 secondes
  const generer = async () => {
    if (niv(ws) < 2) { nav("/abonnement"); return; }
    setBusy(true);
    try {
      const { id } = await fn("r/saas-lancer", { workspace_id: ws.id, domaine: d });
      for (let i = 0; i < 75; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const { data } = await supabase.from("saas_projets").select("data, statut, erreur").eq("id", id).maybeSingle();
        if (data?.statut === "pret") { setP({ id, ...data.data }); return; }
        if (data?.statut === "erreur") throw new Error("La préparation a échoué, réessaie dans un instant.");
      }
      throw new Error("C'est plus long que prévu : reviens sur cette page dans quelques minutes.");
    } catch (x) { toast(x.message, "bad"); } finally { setBusy(false); }
  };
  const Bloc = ({ titre, sous, children, className }) => <section className={cx("rounded-2xl bg-white border border-line p-5 break-inside-avoid", className)}><h2 className="font-bold text-[17px]">{titre}</h2>{sous && <p className="text-[12.5px] text-ink-faint">{sous}</p>}<div className="mt-3">{children}</div></section>;
  if (p === undefined) return <div className="py-24 grid place-items-center"><Spinner /></div>;
  const nomInspi = saas?.nom ?? p?.inspire?.nom ?? d;
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button onClick={() => nav(saas ? `/explorer/${d}` : "/explorer/idees")} className="text-[13px] text-ink-soft hover:text-ink">← {saas ? nomInspi : "Idées et réussites"}</button>
        <AutreSaas />
      </div>
      {!p ? (
        <div className="mt-4 rounded-3xl bg-ink text-white p-8">
          <p className="text-[13px] font-bold uppercase tracking-wide text-[#F6A06B]">Lancer le mien</p>
          <h1 className="mt-2 text-[32px] sm:text-[42px] font-black leading-[1.05]" style={HF}>{nomInspi} marche. Lance le même, à ton nom.</h1>
          <p className="mt-3 max-w-2xl text-white/75 text-[16px]">Bingoo! lit ce que fait {nomInspi} sur son site et te prépare un SaaS concurrent qui fait la même chose : chaque fonctionnalité et son équivalent chez toi, l'ordre pour les coder, les outils et leur coût, tes prix face aux siens, tes premiers clients, le plan d'affaires sur 12 mois, et le texte à donner à un outil qui code l'application pour toi.</p>
          <p className="mt-3 text-[13px] text-white/55">Concurrence loyale : les mêmes fonctionnalités, mais ton nom, tes mots et ton design. Reprendre la marque, les textes mot pour mot ou le design de {nomInspi} exposerait à des poursuites.</p>
          <button onClick={generer} disabled={busy} className="mt-6 rounded-xl bg-accent px-7 py-3.5 font-bold hover:bg-accent-dark disabled:opacity-60">{busy ? "Préparation de ton projet… (une à deux minutes)" : niv(ws) < 2 ? "Disponible avec la formule Pro" : "Préparer mon projet"}</button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wide text-accent-dark">Ton SaaS concurrent de {nomInspi}</p>
              <h1 className="mt-1 text-[36px] sm:text-[46px] font-black leading-[1.02]" style={HF}>{p.nom}</h1>
              <p className="mt-1 text-[18px] text-ink-soft max-w-3xl">{p.pitch}</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <button onClick={() => window.print()} className="rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] font-semibold hover:border-ink-faint">Imprimer ou PDF</button>
              <button onClick={generer} disabled={busy} className="rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] font-semibold hover:border-ink-faint disabled:opacity-60">{busy ? "Nouvelle version…" : "Autre version"}</button>
            </div>
          </div>

          <Construire projet={p} />
          <Budget projet={p} inspire={saas} />

          <div className="mt-5 grid md:grid-cols-2 gap-4">
            <Bloc titre="Le besoin">{<><p className="text-[14.5px]">{p.probleme}</p><p className="mt-2 text-[14px] text-ink-soft"><b className="text-ink">Pour qui :</b> {p.cible}</p></>}</Bloc>
            <Bloc titre="Le marché" sous="Relevé dans la base Explorer">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[[p.inspire?.prix != null ? `${p.inspire.prix} €` : p.inspire?.usage ? "à l'usage" : "—", p.inspire?.prix == null && p.inspire?.usage ? p.inspire.usage : `prix d'entrée de ${nomInspi}`], [p.marche?.mediane != null ? `${p.marche.mediane} €` : "—", "prix médian du marché"], [p.marche?.concurrents ?? "—", "concurrents suivis"]].map(([v, l]) => <div key={l} className="rounded-xl bg-paper py-3"><p className="text-[22px] font-black tnum" style={HF}>{v}</p><p className="text-[11.5px] text-ink-faint px-1">{l}</p></div>)}
              </div>
            </Bloc>
          </div>

          {p.equivalences?.length > 0 && (
            <Bloc className="mt-4" titre="Fonction par fonction" sous={`Ce que fait ${nomInspi}, lu sur son site, et ton équivalent`}>
              <table className="w-full text-[14px]"><thead><tr className="text-left text-[12px] text-ink-faint"><th className="pb-1.5 font-medium w-1/2">Chez {nomInspi}</th><th className="pb-1.5 font-medium">Chez {p.nom}</th></tr></thead>
                <tbody>{p.equivalences.map((x, i) => <tr key={i} className="border-t border-line align-top"><td className="py-2 pr-4 text-ink-soft">{x.chez_eux}</td><td className="py-2 font-medium">✓ {x.chez_toi}</td></tr>)}</tbody></table>
            </Bloc>
          )}
          <h2 className="mt-6 font-bold text-[20px]">Tes petits plus face à {nomInspi}</h2>
          <div className="mt-2 grid md:grid-cols-3 gap-3">{(p.differences ?? []).map((x, i) => <div key={i} className="rounded-2xl bg-accent-soft/60 border border-accent/20 p-4 break-inside-avoid"><p className="font-bold">{x.angle}</p><p className="mt-1 text-[14px] text-ink-soft">{x.pourquoi}</p></div>)}</div>

          <div className="mt-4 grid lg:grid-cols-2 gap-4">
            <Bloc titre="Le MVP à coder" sous={`${(p.mvp ?? []).reduce((a, x) => a + Number(x.semaines || 0), 0)} semaines au total, estimées pour une personne`}>
              <ol className="space-y-2">{(p.mvp ?? []).map((x, i) => <li key={i} className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-white text-[12px] font-bold">{i + 1}</span><div className="flex-1"><p className="font-semibold text-[14.5px]">{x.fonction} <span className="font-normal text-ink-faint text-[12.5px]">· {x.semaines} sem.</span></p><p className="text-[13.5px] text-ink-soft">{x.pourquoi}</p></div></li>)}</ol>
              {p.plus_tard?.length > 0 && <div className="mt-3"><p className="text-[12px] font-bold uppercase tracking-wide text-ink-faint">Plus tard</p><div className="mt-1 flex flex-wrap gap-1.5">{p.plus_tard.map((x) => <span key={x} className="rounded-full bg-paper px-2.5 py-1 text-[12.5px]">{x}</span>)}</div></div>}
            </Bloc>
            <Bloc titre="Les outils" sous={`Environ ${eurs(p.plan?.couts_fixes ?? 0)} par mois au démarrage`}>
              <table className="w-full text-[14px]"><tbody>{(p.stack ?? []).map((x, i) => <tr key={i} className="border-t border-line first:border-0"><td className="py-2 text-ink-soft">{x.brique}</td><td className="py-2 font-semibold">{x.outil}</td><td className="py-2 text-right tnum">{x.cout_mois ? eurs(x.cout_mois) : "gratuit"}</td></tr>)}</tbody></table>
            </Bloc>
          </div>

          <h2 className="mt-6 font-bold text-[20px]">Tes prix</h2>
          <div className="mt-2 grid md:grid-cols-3 gap-3">{(p.formules ?? []).map((f, i) => <div key={i} className={cx("rounded-2xl border p-5 break-inside-avoid", i === 1 ? "bg-ink text-white border-ink" : "bg-white border-line")}><p className="font-bold">{f.nom}</p><p className="mt-1 text-[32px] font-black tnum" style={HF}>{eurs(f.prix)}<span className={cx("text-[13px] font-medium", i === 1 ? "text-white/60" : "text-ink-faint")}> / mois</span></p><p className={cx("text-[13.5px]", i === 1 ? "text-white/75" : "text-ink-soft")}>{f.pour}</p><ul className="mt-2 space-y-1 text-[13.5px]">{(f.inclus ?? []).map((x) => <li key={x}>✓ {x}</li>)}</ul></div>)}</div>

          <Bloc className="mt-4" titre="Le plan d'affaires sur 12 mois" sous={`Calculé à partir des hypothèses ci-dessous, prix moyen ${eurs(p.plan?.prix_moyen ?? 0)} par mois et par client, frais de paiement 3 %. Ce sont des hypothèses prudentes, pas une promesse.`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[[p.hypotheses?.clients_mois_1, "clients le 1er mois"], [`${p.hypotheses?.croissance_mensuelle_pct} %`, "croissance par mois"], [`${p.hypotheses?.churn_mensuel_pct} %`, "clients perdus par mois"], [p.plan?.equilibre ? `mois ${p.plan.equilibre}` : "après 12 mois", "rentable à partir de"]].map(([v, l]) => <div key={l} className="rounded-xl bg-paper p-3"><p className="text-[20px] font-black tnum" style={HF}>{v}</p><p className="text-[12px] text-ink-faint">{l}</p></div>)}
            </div>
            <div className="mt-4"><LineChart points={(p.plan?.mois ?? []).map((m) => ({ v: m.mrr, label: `M${m.mois}` }))} height={160} unit=" €" /></div>
            <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-[13.5px] tnum">
              <thead><tr className="text-left text-[12px] text-ink-faint"><th className="py-1.5 font-medium">Mois</th><th className="font-medium">Nouveaux</th><th className="font-medium">Clients</th><th className="font-medium">Revenu mensuel</th><th className="font-medium">Charges</th><th className="font-medium">Résultat</th><th className="font-medium">Cumul</th></tr></thead>
              <tbody>{(p.plan?.mois ?? []).map((m) => <tr key={m.mois} className="border-t border-line"><td className="py-1.5">{m.mois}</td><td>{m.nouveaux}</td><td>{m.clients}</td><td className="font-semibold">{eurs(m.mrr)}</td><td>{eurs(m.charges)}</td><td className={m.resultat >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"}>{eurs(m.resultat)}</td><td className={m.cumul >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"}>{eurs(m.cumul)}</td></tr>)}</tbody>
            </table></div>
            <p className="mt-2 text-[12px] text-ink-faint">Sans salaire ni marketing payant : à ajouter selon ta situation. Je ne suis pas un conseiller financier ; vérifie ces chiffres avant d'investir.</p>
          </Bloc>

          <div className="mt-4 grid lg:grid-cols-2 gap-4">
            <Bloc titre="Trouver tes premiers clients">{<ul className="space-y-2">{(p.acquisition ?? []).map((x, i) => <li key={i}><p className="font-semibold text-[14.5px]">{x.canal}</p><p className="text-[13.5px] text-ink-soft">{x.comment}</p></li>)}</ul>}</Bloc>
            <Bloc titre="Les risques et la parade">{<ul className="space-y-2">{(p.risques ?? []).map((x, i) => <li key={i}><p className="font-semibold text-[14.5px]">{x.risque}</p><p className="text-[13.5px] text-ink-soft">{x.parade}</p></li>)}</ul>}</Bloc>
          </div>
          {p.construction && (
            <Bloc className="mt-4" titre="Le cahier des charges" sous="Pour aller plus loin avec ton propre code ou un développeur : tout ton SaaS décrit en un texte.">
              <textarea readOnly value={p.construction} rows={10} className="w-full rounded-xl border border-line bg-paper p-3 text-[13px] font-mono leading-relaxed" />
              <button onClick={() => { navigator.clipboard?.writeText(p.construction).then(() => toast("Texte copié"), () => toast("Copie impossible : sélectionne le texte", "bad")); }} className="mt-2 rounded-xl bg-ink text-white px-4 py-2.5 text-[14px] font-bold hover:bg-black print:hidden">Copier le texte</button>
            </Bloc>
          )}
          <p className="mt-4 text-[12px] text-ink-faint">Projet préparé par une IA à partir des données de la base Explorer. Concurrent de {nomInspi}, sans en reprendre le nom, les textes mot pour mot ni le design. Vérifie la disponibilité du nom (INPI, nom de domaine) avant de le déposer.</p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Bingoo! construit le SaaS
// Une vraie application en ligne (site, comptes, écrans avec données), hébergée sur #/app/<slug>, modifiable en une phrase.
// ---------------------------------------------------------------- Ton budget : ce que coûte le lancement, et ce que rapporte chaque euro de pub
// Coûts certains (abonnement Bingoo!, domaine, frais Stripe) + simulation sur 12 mois à partir de TES hypothèses (modifiables).
const BINGOO_PRO = 39.99; // €/mois, construction, hébergement, e-mails et paiements inclus
const DOMAINE_AN = 12; // ≈ €/an pour un .com ou un .fr
const STRIPE = (prix) => prix * 0.015 + 0.25; // carte européenne standard
function Budget({ projet, inspire }) {
  const cle = `bingoo-budget:${projet.id}`;
  const prixDefaut = Math.round(projet.plan?.prix_moyen ?? projet.formules?.[1]?.prix ?? projet.formules?.[0]?.prix ?? 29);
  const [h, setH] = useState(() => {
    const def = { pub: 300, prix: prixDefaut, cac: prixDefaut * 3, churn: Number(projet.hypotheses?.churn_mensuel_pct ?? 5) };
    try { return { ...def, ...JSON.parse(localStorage.getItem(cle) ?? "{}") }; } catch { return def; }
  });
  const maj = (k, v) => setH((x) => { const n = { ...x, [k]: Math.max(0, Number(v) || 0) }; try { localStorage.setItem(cle, JSON.stringify(n)); } catch { /* stockage indisponible */ } return n; });
  const fixes = BINGOO_PRO + DOMAINE_AN / 12;
  // Simulation mois par mois : nouveaux clients = pub ÷ coût d'acquisition, moins les départs
  const mois = [];
  let clients = 0, cumul = 0, rentable = null;
  for (let m = 1; m <= 12; m++) {
    clients = clients * (1 - h.churn / 100) + (h.cac > 0 ? h.pub / h.cac : 0);
    const revenu = clients * h.prix, frais = clients * STRIPE(h.prix);
    const depenses = fixes + h.pub + frais, resultat = revenu - depenses;
    cumul += resultat;
    if (rentable === null && resultat >= 0) rentable = m;
    mois.push({ m, clients, revenu, depenses, resultat, cumul });
  }
  const fin = mois[11];
  const besoin = -Math.min(0, ...mois.map((x) => x.cumul)); // trésorerie à avancer avant que ça rapporte
  const mrrLeader = inspire?.succes?.mrr ?? (inspire?.succes?.montant ? inspire.succes.montant / 12 : null);
  const e = (n) => `${Math.round(n).toLocaleString("fr-FR")} €`;
  const champ = (k, label, suffixe, pas = 1) => (
    <label key={k} className="flex flex-col gap-1 text-[12.5px] text-ink-soft">{label}
      <span className="flex items-center rounded-xl border border-line bg-white px-3 py-2 focus-within:border-ink"><input type="number" min="0" step={pas} value={h[k]} onChange={(ev) => maj(k, ev.target.value)} className="w-full bg-transparent text-[15px] font-semibold text-ink outline-none tnum" /><span className="text-ink-faint">{suffixe}</span></span>
    </label>
  );
  return (
    <section className="mt-5 rounded-2xl bg-white border border-line p-5 break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-bold text-[17px]">Ton budget</h2><p className="text-[12.5px] text-ink-faint">Change les chiffres : tout se recalcule.</p></div>
      <div className="mt-3 grid lg:grid-cols-[1fr_1.3fr] gap-5">
        <div>
          <p className="text-[13px] font-semibold">Ce que coûte le lancement, chaque mois</p>
          <table className="mt-1.5 w-full text-[14px]"><tbody>
            <tr className="border-t border-line"><td className="py-1.5">Bingoo! Pro <span className="text-ink-faint text-[12.5px]">(construction, hébergement, e-mails, paiements)</span></td><td className="py-1.5 text-right tnum">{e(BINGOO_PRO)}</td></tr>
            <tr className="border-t border-line"><td className="py-1.5">Nom de domaine <span className="text-ink-faint text-[12.5px]">(≈ {DOMAINE_AN} € par an)</span></td><td className="py-1.5 text-right tnum">{e(DOMAINE_AN / 12)}</td></tr>
            <tr className="border-t border-line"><td className="py-1.5">Frais Stripe <span className="text-ink-faint text-[12.5px]">(1,5 % + 0,25 € par paiement)</span></td><td className="py-1.5 text-right tnum text-ink-soft">{(STRIPE(h.prix)).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} € par client</td></tr>
            <tr className="border-t border-line"><td className="py-1.5 font-semibold">Pour démarrer, sans pub</td><td className="py-1.5 text-right tnum font-semibold">{e(fixes)} / mois</td></tr>
          </tbody></table>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {champ("pub", "Ton budget pub par mois", "€", 50)}
            {champ("prix", "Ton prix par client", "€/mois")}
            {champ("cac", "Coût pour gagner un client", "€", 5)}
            {champ("churn", "Clients perdus par mois", "%", 0.5)}
          </div>
          <p className="mt-2 text-[12px] text-ink-faint">Par défaut : gagner un client coûte 3 mois de son abonnement, et {h.churn} % des clients partent chaque mois. Ce sont des hypothèses de départ à remplacer par tes vrais chiffres dès tes premières campagnes.</p>
        </div>
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[[Math.round(fin.clients), "clients au bout d'un an"], [e(fin.revenu), "de revenu mensuel au 12e mois"], [rentable ? `mois ${rentable}` : "après 12 mois", "rentable à partir de"], [e(besoin), "à avancer au total"]].map(([v, l]) => <div key={l} className="rounded-xl bg-paper p-3"><p className="text-[19px] font-black tnum" style={HF}>{v}</p><p className="text-[11.5px] text-ink-faint">{l}</p></div>)}
          </div>
          <div className="mt-3 rounded-xl border border-line p-3"><p className="text-[12.5px] text-ink-soft">Revenu mensuel, mois 1 à 12</p><div className="mt-1"><Sparkline pts={mois.map((x) => ({ n: x.revenu }))} h={60} /></div></div>
          <p className="mt-3 text-[13.5px]">{h.pub > 0 ? <>Avec <b>{e(h.pub)} de pub par mois</b>, tu gagnes environ <b>{(h.pub / Math.max(h.cac, 1)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} clients par mois</b>.</> : <>Sans pub, tes clients viendront du bouche-à-oreille, du référencement et de la prospection : la simulation reste à zéro.</>}
            {mrrLeader && fin.revenu > 0 ? <> {inspire.nom} fait {e(mrrLeader / 1.08)} par mois : tu en serais à {Math.max(0.1, (fin.revenu / (mrrLeader / 1.08)) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % au bout d'un an.</> : null}</p>
        </div>
      </div>
    </section>
  );
}

function Construire({ projet }) {
  const { ws } = useWs();
  const nav = useNavigate();
  const toast = useToast();
  const [app, setApp] = useState(undefined);
  const [ecran, setEcran] = useState("");
  const [demande, setDemande] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [voirLigne, setVoirLigne] = useState(false);
  const charger = () => supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, brouillon, version, maj, paiement, domaine, domaine_statut, public, jumeau_at, lancement, ab, email_dom, icones").eq("projet_id", projet.id).maybeSingle().then(({ data }) => { setApp(data ?? null); return data; });
  useEffect(() => { charger(); }, [projet.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Construction ou modification en tâche de fond : on interroge la base toutes les 5 secondes
  useEffect(() => {
    if (app?.statut !== "en_cours") return;
    const t = setInterval(async () => {
      const d = await charger();
      if (d?.statut === "pret" && d.erreur) toast(d.erreur, "bad");
      if (d?.statut === "erreur") toast(d.erreur || "La construction a échoué, réessaie", "bad");
    }, 5000);
    return () => clearInterval(t);
  }, [app?.statut]); // eslint-disable-line react-hooks/exhaustive-deps
  const construire = async () => {
    if (niv(ws) < 2) { nav("/abonnement"); return; }
    try { await fn("r/saas-construire", { workspace_id: ws.id, projet_id: projet.id }); await charger(); }
    catch (x) { toast(x.message, "bad"); }
  };
  const modifier = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    try { await fn("r/saas-app-modifier", { workspace_id: ws.id, app_id: app.id, ecran: ecran || "nouveau", demande }); setDemande(""); await charger(); toast("Bingoo! code ta modification : l'aperçu arrive dans une minute"); }
    catch (x) { toast(x.message, "bad"); } finally { setEnvoi(false); }
  };
  if (app === undefined) return null;
  const lien = app ? lienApp(app.slug, app.domaine_statut === "ok" ? app.domaine : null) : "";
  const pret = app?.spec?.ecrans?.length > 0;
  // Modification en attente : l'aperçu montre la nouvelle version, à mettre en ligne ou à abandonner
  const attente = app?.statut !== "en_cours" && app?.brouillon?._modif ? app.brouillon : null;
  const decider = async (valider) => {
    try { await fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi: valider ? "brouillon-valider" : "brouillon-annuler" }); await charger(); toast(valider ? "C'est en ligne" : "Modification abandonnée"); setVoirLigne(false); }
    catch (x) { toast(x.message, "bad"); }
  };
  return (
    <section className="mt-5 rounded-3xl bg-ink text-white p-6 sm:p-8 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[13px] font-bold uppercase tracking-wide text-[#F6A06B]">Ton SaaS en ligne</p>
          <h2 className="mt-1 text-[26px] sm:text-[32px] font-black leading-[1.08]" style={HF}>{pret ? `${projet.nom} tourne déjà.` : `Bingoo! construit ${projet.nom} pour toi.`}</h2>
          <p className="mt-2 text-white/70 text-[15px]">{pret ? "Ton site, les comptes de tes clients et chaque écran de l'application, avec des données d'exemple. Partage le lien, essaie-le, et demande des changements en une phrase." : "Bingoo! écrit et met en ligne la première version : le site avec tes prix, la création de compte, et les écrans du produit qui marchent pour de vrai. Trois à cinq minutes."}</p>
        </div>
        {pret && app.statut !== "en_cours" && (
          <div className="flex flex-wrap gap-2">
            <a href={lien} target="_blank" rel="noreferrer" className="rounded-xl bg-accent px-5 py-2.5 text-[14px] font-bold hover:bg-accent-dark">Ouvrir mon SaaS ↗</a>
            <button onClick={() => navigator.clipboard?.writeText(lien).then(() => toast("Lien copié"))} className="rounded-xl bg-white/10 px-4 py-2.5 text-[14px] font-semibold hover:bg-white/20">Copier le lien</button>
            <button onClick={() => { if (confirm("Reconstruire toute l'application ? Les modifications faites jusqu'ici seront remplacées.")) construire(); }} className="rounded-xl bg-white/10 px-4 py-2.5 text-[14px] font-semibold hover:bg-white/20">Reconstruire</button>
          </div>
        )}
      </div>

      {app?.statut === "en_cours" ? (
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-5">
          <div className="flex items-center gap-3"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-[#F6A06B] animate-spin" /><p className="font-semibold">{app.etape ?? "Construction en cours"}…</p></div>
          <ol className="mt-4 grid sm:grid-cols-3 gap-2 text-[13px]">
            {["Conception des données et des écrans", "Écriture et vérification du code", "Mise en ligne"].map((t, i) => {
              const ou = /Écriture|Modification/.test(app.etape ?? "") ? 1 : 0;
              return <li key={t} className={cx("rounded-xl px-3 py-2", i < ou ? "bg-[#F6A06B]/20" : i === ou ? "bg-white/10" : "bg-white/5 text-white/45")}>{i < ou ? "✓ " : ""}{t}</li>;
            })}
          </ol>
          <p className="mt-3 text-[12.5px] text-white/50">Tu peux quitter cette page : la construction continue et ton SaaS t'attendra ici.</p>
        </div>
      ) : !pret ? (
        <>
          {app?.statut === "erreur" && <p className="mt-4 rounded-xl bg-[#7F1D1D]/40 px-4 py-3 text-[14px]">{app.erreur || "La construction a échoué."} Relance-la.</p>}
          <button onClick={construire} className="mt-6 rounded-xl bg-accent px-7 py-3.5 font-bold hover:bg-accent-dark">{niv(ws) < 2 ? "Disponible avec la formule Pro" : "Construire mon SaaS"}</button>
        </>
      ) : null}

      {pret && attente && (
        <div className="mt-6 rounded-2xl bg-[#F6A06B]/15 border border-[#F6A06B]/40 p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[260px]">
            <p className="font-bold">Aperçu : {(attente._modif.liste ?? [attente._modif]).length > 1 ? `${(attente._modif.liste ?? []).length} modifications en attente` : attente._modif.nouveau ? `nouvel écran « ${attente._modif.titre} »` : `« ${attente._modif.titre} » modifié`}</p>
            <ul className="mt-1 text-[13px] text-white/70 space-y-0.5">{(attente._modif.liste ?? [attente._modif]).map((m, i) => <li key={i}>· {m.nouveau ? "Nouvel écran" : m.titre} : {m.demande.slice(0, 140)}</li>)}</ul>
            <p className="mt-1 text-[12px] text-white/50">Rien n'est encore en ligne : tes clients voient toujours l'ancienne version.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setVoirLigne(!voirLigne)} className="rounded-xl bg-white/10 px-4 py-2.5 text-[14px] font-semibold hover:bg-white/20">{voirLigne ? "Voir l'aperçu" : "Voir la version en ligne"}</button>
            <button onClick={() => decider(false)} className="rounded-xl bg-white/10 px-4 py-2.5 text-[14px] font-semibold hover:bg-white/20">Abandonner</button>
            <button onClick={() => decider(true)} className="rounded-xl bg-accent px-5 py-2.5 text-[14px] font-bold hover:bg-accent-dark">Mettre en ligne</button>
          </div>
        </div>
      )}
      {pret && (
        <div className="mt-6 grid lg:grid-cols-[1fr_300px] gap-4">
          <div className="rounded-2xl overflow-hidden bg-white ring-1 ring-white/10">
            <div className="flex items-center gap-2 bg-[#E8E5DE] px-3 py-2"><span className="flex gap-1.5">{["#F87171", "#FBBF24", "#34D399"].map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}</span><span className="flex-1 truncate rounded-md bg-white px-2 py-0.5 text-[12px] text-ink-faint">{lien.replace(/^https?:\/\//, "")}</span></div>
            <Suspense fallback={<div className="h-[620px] grid place-items-center"><Spinner /></div>}><AppCadre slug={app.slug} spec={attente && !voirLigne ? attente : app.spec} version={attente && !voirLigne ? `apercu-${attente._modif.at}` : app.version} paiement={app.paiement} ab={app.ab} articles={app.lancement?.articles ?? []} domaine={app.domaine_statut === "ok" ? app.domaine : null} className="block w-full h-[620px] border-0" apercu /></Suspense>
          </div>
          <form onSubmit={modifier} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3">
            <p className="font-bold">Modifier en une phrase</p>
            <select value={ecran} onChange={(e) => setEcran(e.target.value)} className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-[14px] outline-none">
              <option value="" className="text-ink">+ Ajouter un écran</option>
              {app.spec.ecrans.map((e) => <option key={e.id} value={e.id} className="text-ink">{e.code ? `Changer « ${e.titre} »` : `Réessayer « ${e.titre} » (pas encore en ligne)`}</option>)}
            </select>
            <textarea value={demande} onChange={(e) => setDemande(e.target.value)} rows={5} placeholder={ecran ? "Ex. : ajoute un filtre par statut et un total en bas du tableau" : "Ex. : un écran Factures pour suivre ce que chaque client doit payer"} className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-[14px] outline-none placeholder:text-white/35" />
            <button disabled={envoi || app.statut === "en_cours" || demande.trim().length < 5} className="rounded-xl bg-accent px-4 py-2.5 text-[14px] font-bold hover:bg-accent-dark disabled:opacity-50">{envoi ? "Envoi…" : "Appliquer"}</button>
            <div className="mt-auto text-[12.5px] text-white/55 space-y-1.5">
              <p>{app.spec.ecrans.length} écrans · {app.spec.collections?.length ?? 0} types de données · version {app.version}</p>
              <p>Chaque client qui crée un compte sur ton SaaS a ses propres données. « Voir la démo » ouvre un compte d'essai rempli d'exemples.</p>
            </div>
          </form>
        </div>
      )}
      {pret && <ReglagesApp app={app} onChange={charger} projet={projet} />}
    </section>
  );
}

// Réglages d'un SaaS construit, par onglets : jumeau, lancement, encaissement, prix testés, e-mails, domaine, monde et bourse, code
const ONGLETS_APP = [["jumeau", "Jumeau"], ["lancement", "Lancement"], ["encaisser", "Encaisser"], ["prix", "Prix testés"], ["emails", "E-mails"], ["domaine", "Domaine"], ["monde", "Monde et bourse"], ["mobile", "Mobile"], ["code", "Code"]];
function ReglagesApp({ app, onChange, projet }) {
  const { ws } = useWs();
  const toast = useToast();
  const [onglet, setOnglet] = useState("jumeau");
  const [ch, setCh] = useState(null);
  const [busy, setBusy] = useState("");
  const appel = (quoi, extra = {}) => fn("r/saas-app-reglages", { workspace_id: ws.id, app_id: app.id, quoi, ...extra });
  useEffect(() => { appel("chiffres").then(setCh, () => setCh(null)); }, [app.id, app.version]); // eslint-disable-line react-hooks/exhaustive-deps
  // Icônes PNG de l'app (téléphone, écran d'accueil) : refaites dès que le nom ou la couleur changent
  useEffect(() => {
    const cle = cleIcone(app.spec.nom, app.spec.couleur);
    if (app.icones?.cle === cle) return;
    appel("icones", { cle, png512: iconePng(app.spec.nom, app.spec.couleur, 512), png192: iconePng(app.spec.nom, app.spec.couleur, 192) }).then(() => onChange(), () => {});
  }, [app.id, app.spec.nom, app.spec.couleur]); // eslint-disable-line react-hooks/exhaustive-deps
  const agir = async (k, f, ok) => { setBusy(k); try { const r = await f(); if (ok) toast(ok); await onChange(); return r; } catch (x) { toast(x.message, "bad"); } finally { setBusy(""); } };
  const props = { app, appel, agir, busy, projet, onChange };
  return (
    <div className="mt-4 rounded-2xl bg-white/5 border border-white/10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 rounded-t-2xl overflow-hidden">
        {[[ch?.comptes ?? "—", "comptes"], [ch?.nouveaux_7j ?? "—", "nouveaux cette semaine"], [ch?.abonnes ?? "—", "abonnés"], [ch ? eurs(ch.mrr) : "—", "revenu mensuel vérifié"]].map(([v, l]) => <div key={l} className="bg-ink px-4 py-3"><p className="text-[22px] font-black tnum" style={HF}>{v}</p><p className="text-[12px] text-white/50">{l}</p></div>)}
      </div>
      {ch?.quota && <p className="px-4 pt-2.5 text-[12.5px] text-white/50">Ce mois-ci : {ch.quota.constructions}/{ch.quota.construire} construction{ch.quota.construire > 1 ? "s" : ""} · {ch.quota.modifications}/{ch.quota.modifier} modifications</p>}
      <div className="flex gap-1 overflow-x-auto px-3 pt-3 border-b border-white/10">
        {ONGLETS_APP.map(([k, l]) => <button key={k} onClick={() => setOnglet(k)} className={cx("shrink-0 rounded-t-lg px-3 py-2 text-[13.5px] font-semibold", onglet === k ? "bg-white/10 text-white" : "text-white/55 hover:text-white")}>{l}</button>)}
      </div>
      <div className="p-4 sm:p-5">
        {onglet === "jumeau" && <OngletJumeau {...props} />}
        {onglet === "lancement" && <OngletLancement {...props} />}
        {onglet === "encaisser" && <OngletEncaisser {...props} />}
        {onglet === "prix" && <OngletPrix {...props} />}
        {onglet === "emails" && <OngletEmails {...props} />}
        {onglet === "domaine" && <OngletDomaine {...props} />}
        {onglet === "monde" && <OngletMonde {...props} />}
        {onglet === "mobile" && <OngletMobile {...props} />}
        {onglet === "code" && <OngletCode {...props} />}
      </div>
    </div>
  );
}
const champSombre = "w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-[14px] outline-none placeholder:text-white/35";
const btnSombre = "rounded-xl bg-white/10 px-4 py-2 text-[13.5px] font-semibold hover:bg-white/20 disabled:opacity-50";
const btnAccent = "rounded-xl bg-accent px-4 py-2 text-[13.5px] font-bold hover:bg-accent-dark disabled:opacity-50";
const Explication = ({ children }) => <p className="text-[13.5px] text-white/65 max-w-3xl">{children}</p>;
const TableDns = ({ dns }) => <table className="mt-2 w-full font-mono text-[11.5px]"><thead><tr className="text-left text-white/45"><th className="py-1 font-medium">Type</th><th className="font-medium">Nom</th><th className="font-medium">Valeur</th></tr></thead><tbody>{dns.map((r, i) => <tr key={i} className="border-t border-white/10 align-top"><td className="py-1 pr-2">{r.type}{r.ok ? " ✓" : ""}</td><td className="pr-2 break-all">{r.nom}</td><td className="break-all">{r.valeur}{r.priorite != null ? ` (priorité ${r.priorite})` : ""}</td></tr>)}</tbody></table>;

// 1. Le jumeau : ce que sort le SaaS d'inspiration, à ajouter en un clic
function OngletJumeau({ app, appel, agir, busy, projet, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const [sg, setSg] = useState(null);
  const charger = () => supabase.from("saas_app_suggestions").select("*").eq("app_id", app.id).order("at", { ascending: false }).limit(30).then(({ data }) => setSg(data ?? []));
  useEffect(() => { charger(); }, [app.id, app.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const ajouter = async (x) => {
    try {
      await fn("r/saas-app-modifier", { workspace_id: ws.id, app_id: app.id, ecran: "nouveau", demande: `${x.titre}. ${x.detail ?? ""}`, suggestion: x.id });
      setEnCours((c) => ({ ...c, [x.id]: true }));
      toast("Bingoo! code cet écran : l'aperçu arrive dans une minute, en haut"); onChange();
    } catch (e) { toast(e.message, "bad"); }
  };
  const ignorer = async (x) => { await supabase.from("saas_app_suggestions").update({ statut: "ignoree" }).eq("id", x.id); charger(); };
  const [enCours, setEnCours] = useState({});
  const prix = (x) => agir(`prix${x.id}`, async () => { await appel("prix-suggeres", { suggestion: x.id }); await charger(); }, "Nouveaux prix en ligne");
  const enApercu = new Set(((app.brouillon?._modif?.liste ?? (app.brouillon?._modif ? [app.brouillon._modif] : [])).map((m) => m.suggestion)).filter(Boolean));
  const nomInsp = projet?.inspire?.nom ?? "ton modèle";
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Explication>Chaque semaine, Bingoo! relit le plan du site de {nomInsp} (nouvelles pages fonctionnalités, intégrations, produits) et ses prix. Une nouveauté ? Un clic : Bingoo! la code dans {app.spec.nom}, tu la vois en aperçu, puis tu la mets en ligne. Un changement de prix ? Tes prix suivent dans les mêmes proportions, si tu le veux. Les nouveautés arrivent aussi dans l'e-mail du lundi.</Explication>
        <button disabled={!!busy} onClick={() => agir("jumeau", async () => { const r = await appel("jumeau"); await charger(); if (!r.nouvelles) toast(`Rien de nouveau chez ${nomInsp} pour l'instant`); }, null)} className={btnSombre}>{busy === "jumeau" ? "Recherche…" : "Vérifier maintenant"}</button>
      </div>
      <div className="mt-4 space-y-2">
        {sg === null ? <Spinner /> : !sg.filter((x) => x.statut !== "ignoree").length ? <p className="text-[13.5px] text-white/45">Aucune nouveauté repérée chez {nomInsp} pour l'instant. Prochaine vérification automatique dans la semaine{app.jumeau_at ? "" : " (la première a lieu sous 24 heures)"}.</p> : sg.filter((x) => x.statut !== "ignoree").map((x) => (
          <div key={x.id} className="rounded-xl bg-white/[.06] p-4 flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-[240px]">
              <p className="font-bold">{x.type === "prix" ? "💶 " : "✨ "}{x.titre}</p>
              <p className="mt-0.5 text-[13.5px] text-white/70">{x.detail}</p>
              <p className="mt-1 text-[12px] text-white/40">{new Date(x.at).toLocaleDateString("fr-FR")}{x.source && <> · <a href={x.source} target="_blank" rel="noreferrer" className="underline">source</a></>}</p>
            </div>
            {x.statut === "ajoutee" ? <span className="rounded-lg bg-[#15803D]/30 px-2.5 py-1 text-[12px] font-bold text-[#86EFAC]">{x.type === "prix" ? "PRIX APPLIQUÉS" : "EN LIGNE"}</span>
              : enApercu.has(x.id) ? <span className="rounded-lg bg-[#F6A06B]/25 px-2.5 py-1 text-[12px] font-bold text-[#F6A06B]">EN APERÇU · À VALIDER EN HAUT</span>
              : enCours[x.id] || (app.statut === "en_cours" && Object.keys(enCours).length) ? <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[12px] font-bold">CODAGE EN COURS…</span>
              : x.type === "prix" && x.donnees?.formules ? (
                <div className="flex gap-2"><button onClick={() => prix(x)} disabled={!!busy} className={btnAccent}>Appliquer ces prix</button><button onClick={() => ignorer(x)} className={btnSombre}>Garder les miens</button></div>
              ) : x.type === "fonction" ? (
                <div className="flex gap-2"><button onClick={() => ajouter(x)} disabled={app.statut === "en_cours"} className={btnAccent}>L'ajouter à {app.spec.nom}</button><button onClick={() => ignorer(x)} className={btnSombre}>Ignorer</button></div>
              ) : <button onClick={() => ignorer(x)} className={btnSombre}>Vu</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. Lancement : liens suivis par canal, démo animée, plan des 30 jours à cocher, annuaires, e-mails, articles, qui démarcher.
// Tout sauf les articles marche sans IA (textes construits à partir du projet).
const CANAUX = [["linkedin", "LinkedIn"], ["email", "E-mails"], ["reseau", "Ton réseau (WhatsApp, SMS)"], ["producthunt", "Product Hunt"], ["annuaires", "Annuaires de logiciels"], ["blog", "Articles"], ["pub", "Publicité"]];
const ANNUAIRES = [
  ["Product Hunt", "https://www.producthunt.com/posts/new", "Le lancement mondial des nouveaux logiciels"],
  ["BetaList", "https://betalist.com/submit", "Les premiers utilisateurs curieux"],
  ["Indie Hackers", "https://www.indiehackers.com/products", "La communauté des créateurs indépendants"],
  ["SaaSHub", "https://www.saashub.com/submit", "Alternatives aux grands logiciels"],
  ["AlternativeTo", "https://alternativeto.net/manage-item/", "Ceux qui cherchent une alternative à ton modèle"],
  ["Capterra", "https://www.capterra.fr/vendors/sign-up", "Annuaire des logiciels professionnels (Gartner)"],
  ["appvizer", "https://www.appvizer.fr/", "Comparateur français de logiciels"],
  ["G2", "https://sell.g2.com/", "Avis et comparatifs B2B"],
];
function kitBase(app, projet) {
  const s = app.spec, insp = projet?.inspire?.nom ?? "les outils existants", f0 = (s.formules ?? [])[0];
  const prix = f0 ? `dès ${f0.prix} € par mois` : "à petit prix";
  // Cible en milieu de phrase : seule la première lettre passe en minuscule (« TPE » reste « TPE »)
  const cible = String(s.cible ?? "les professionnels").replace(/\.$/, "").replace(/^(\p{Lu})(\p{Ll})/u, (_, a, b) => a.toLowerCase() + b);
  return {
    emails: [
      { but: "Prospection à froid", sujet: `${s.nom} : ${String(s.slogan || s.pitch).slice(0, 60)}`, corps: `Bonjour {prenom},\n\nJe vous écris car {entreprise} est concernée : ${s.nom} est fait pour ${cible}.\n\n${s.probleme ?? ""}\n\nNous avons créé ${s.nom} pour ça : ${s.pitch} ${prix}, avec ${app.paiement?.essai_jours ?? 14} jours d'essai gratuit.\n\nVous voulez que je vous montre en 15 minutes ?\n\nBonne journée,\n{ton prénom}\n\nSi vous ne souhaitez plus recevoir de message de ma part, répondez simplement « stop ».` },
      { but: "Annonce à ton réseau", sujet: `Je lance ${s.nom} !`, corps: `Salut {prenom},\n\nJe lance ${s.nom} : ${s.pitch}\n\nC'est pensé pour ${cible}, en alternative française à ${insp}, ${prix}.\n\nTu connais quelqu'un à qui ça servirait ? Un transfert de ce message m'aiderait énormément.\n\nMerci !\n{ton prénom}` },
      { but: "Relance", sujet: `Re : ${s.nom}`, corps: `Bonjour {prenom},\n\nJe me permets de revenir vers vous au sujet de ${s.nom}. Une démo de 30 secondes est ici : {lien de la démo}\n\nSi ce n'est pas le bon moment, aucun souci : dites-le-moi et je ne vous relancerai plus.\n\n{ton prénom}` },
    ],
    plan: [
      ["profil", "Jour 1", "Mets le lien de ton SaaS (avec ?src=linkedin) dans ton profil LinkedIn et ta signature e-mail."],
      ["reseau", "Jour 1-2", "Envoie l'annonce à 30 personnes de ton réseau, une par une (lien ?src=reseau)."],
      ["demo", "Jour 2", "Partage la démo animée dans un post LinkedIn : le problème, ta solution, le lien."],
      ["annuaires", "Semaine 1", "Inscris ton SaaS dans les annuaires ci-dessous (lien ?src=annuaires)."],
      ["prospection", "Semaine 1-2", "Écris à 20 entreprises par jour, prises dans « Qui démarcher » (lien ?src=email)."],
      ["appels", "Semaine 2", "Appelle ceux qui ont ouvert ou répondu ; propose 15 minutes de démo."],
      ["producthunt", "Semaine 3", "Lance-toi sur Product Hunt un mardi (lien ?src=producthunt)."],
      ["bilan", "Jour 30", "Regarde ci-dessus quel canal a amené des inscrits et des abonnés : double-le, coupe le reste."],
    ],
  };
}

function OngletLancement({ app, appel, agir, busy, projet, onChange }) {
  const toast = useToast();
  const l = app.lancement ?? {};
  const base = kitBase(app, projet);
  const dom = app.domaine_statut === "ok" ? app.domaine : null;
  const racine = lienApp(app.slug, dom);
  const blog = blogApp(app.slug, dom);
  const avecSrc = (src, extra = "") => `${racine}?src=${src}${extra}`;
  const demo = `${racine}?tour=1&src=demo`;
  const [stats, setStats] = useState(null);
  const [fait, setFait] = useState(l.fait ?? {});
  useEffect(() => { supabase.rpc("saas_app_sources", { p_app: app.id }).then(({ data }) => setStats(data ?? [])); }, [app.id]);
  const copier = (t) => navigator.clipboard?.writeText(t).then(() => toast("Copié"), () => toast("Copie impossible", "bad"));
  const cocher = async (cle) => { const v = !fait[cle]; setFait({ ...fait, [cle]: v }); try { await appel("lancement-fait", { cle, fait: v }); } catch (x) { toast(x.message, "bad"); } };
  const st = (k) => (stats ?? []).find((x) => x.source === k) ?? { vues: 0, inscrits: 0, abonnes: 0 };
  const emails = l.emails?.length ? l.emails : base.emails;
  const faits = base.plan.filter(([k]) => fait[k]).length + ANNUAIRES.filter(([n]) => fait[`a:${n}`]).length;
  const total = base.plan.length + ANNUAIRES.length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Explication>Tout pour trouver tes premiers clients, et savoir quel canal marche. Chaque lien de partage porte sa source : Bingoo! compte les visites, les inscriptions et les abonnés de chacun.</Explication>
        <div className="w-48"><div className="flex justify-between text-[12px] text-white/55"><span>Lancement</span><span>{faits}/{total}</span></div><div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-accent" style={{ width: `${(faits / total) * 100}%` }} /></div></div>
      </div>

      <div>
        <p className="font-bold">Tes liens à partager <span className="font-normal text-white/50 text-[13px]">· 90 derniers jours</span></p>
        <div className="mt-2 overflow-x-auto rounded-xl bg-white/[.06]"><table className="w-full min-w-[620px] text-[13.5px]"><thead><tr className="text-left text-[11.5px] text-white/45"><th className="px-3 py-2 font-medium">Canal</th><th className="font-medium">Lien</th><th className="font-medium text-right">Visites</th><th className="font-medium text-right">Inscrits</th><th className="font-medium text-right px-3">Abonnés</th></tr></thead>
          <tbody>{CANAUX.map(([k, n]) => { const x = st(k); const u = avecSrc(k); return <tr key={k} className="border-t border-white/10"><td className="px-3 py-2 font-semibold">{n}</td><td><button onClick={() => copier(u)} className="max-w-[260px] truncate rounded-md bg-white/10 px-2 py-1 font-mono text-[11.5px] hover:bg-white/20" title={`Copier ${u}`}>…?src={k} · copier</button></td><td className="text-right tnum">{x.vues}</td><td className="text-right tnum">{x.inscrits}</td><td className="text-right tnum px-3">{x.abonnes}</td></tr>; })}
            {(stats ?? []).filter((x) => !CANAUX.some(([k]) => k === x.source)).map((x) => <tr key={x.source} className="border-t border-white/10 text-white/60"><td className="px-3 py-2">{x.source === "direct" ? "Accès direct" : x.source}</td><td /><td className="text-right tnum">{x.vues}</td><td className="text-right tnum">{x.inscrits}</td><td className="text-right tnum px-3">{x.abonnes}</td></tr>)}</tbody></table></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white/[.06] p-4">
          <p className="font-bold">La démo animée</p>
          <p className="text-[13px] text-white/60">{app.spec.nom} se présente tout seul, écran par écran, avec un compte d'exemple. Pour tes posts, tes e-mails, ta signature.</p>
          <div className="mt-2 flex gap-2"><input readOnly value={demo} className={champSombre} onFocus={(e) => e.target.select()} /><button onClick={() => copier(demo)} className={btnSombre}>Copier</button><a href={demo} target="_blank" rel="noreferrer" className={btnSombre}>Voir</a></div>
          <button onClick={() => copier(`<iframe src="${demo}" width="100%" height="620" style="border:0;border-radius:16px" title="${app.spec.nom}" loading="lazy"></iframe>`)} className="mt-2 text-[12.5px] underline text-white/70">Copier le code pour l'intégrer sur un site</button>
        </div>
        <div className="rounded-xl bg-white/[.06] p-4">
          <p className="font-bold">Les 30 premiers jours</p>
          <ul className="mt-2 space-y-1.5">{base.plan.map(([k, q, t]) => <li key={k}><label className="flex gap-2.5 text-[13.5px] cursor-pointer"><input type="checkbox" checked={!!fait[k]} onChange={() => cocher(k)} className="mt-1" /><span className={cx(fait[k] && "line-through text-white/40")}><b className="text-[#F6A06B]">{q}</b> · {t}</span></label></li>)}</ul>
        </div>
      </div>

      <div>
        <p className="font-bold">Les annuaires de logiciels <span className="font-normal text-white/50 text-[13px]">· une inscription chacun, avec le lien {`?src=annuaires`}</span></p>
        <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">{ANNUAIRES.map(([n, u, d]) => <div key={n} className={cx("rounded-xl p-3", fait[`a:${n}`] ? "bg-[#15803D]/20" : "bg-white/[.06]")}><div className="flex items-center justify-between gap-2"><a href={u} target="_blank" rel="noreferrer" className="font-semibold hover:underline">{n} ↗</a><input type="checkbox" checked={!!fait[`a:${n}`]} onChange={() => cocher(`a:${n}`)} title="Fait" /></div><p className="text-[12px] text-white/55">{d}</p></div>)}</div>
      </div>

      <div>
        <p className="font-bold">Les e-mails de lancement <span className="font-normal text-white/50 text-[13px]">· à envoyer toi-même, remplace {"{prenom}"} et {"{entreprise}"}</span></p>
        <div className="mt-2 grid md:grid-cols-3 gap-2">{emails.map((m, i) => <div key={i} className="rounded-xl bg-white/[.06] p-3 flex flex-col"><p className="text-[12px] font-bold uppercase tracking-wide text-[#F6A06B]">{m.but}</p><p className="mt-1 font-semibold text-[14px]">{m.sujet}</p><p className="mt-1 text-[12.5px] text-white/65 whitespace-pre-line flex-1">{String(m.corps).replace("{lien de la démo}", demo)}</p><button onClick={() => copier(`${m.sujet}\n\n${String(m.corps).replace("{lien de la démo}", demo)}`)} className={cx(btnSombre, "mt-2 self-start")}>Copier</button></div>)}</div>
      </div>

      <div className="rounded-xl bg-white/[.06] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="font-bold">Les articles <span className="font-normal text-white/50 text-[13px]">· pages publiques lisibles par Google, liées depuis ton site</span></p><p className="text-[13px] text-white/60">Trois articles sur ce que tape ta cible dans Google (« alternative à {projet?.inspire?.nom ?? "…"} », « comment … »), écrits par l'IA.</p></div>
          <button disabled={!!busy} onClick={() => agir("lancement", () => appel("lancement"), "Articles en ligne")} className={l.articles?.length ? btnSombre : btnAccent}>{busy === "lancement" ? "Écriture… (une minute)" : l.articles?.length ? "Réécrire les articles" : "Écrire les articles"}</button>
        </div>
        {l.articles?.length > 0 && <div className="mt-2 grid md:grid-cols-3 gap-2">{l.articles.map((x) => <a key={x.slug} href={`${blog}${x.slug}`} target="_blank" rel="noreferrer" className="rounded-xl bg-white/5 p-3 hover:bg-white/10"><p className="font-semibold text-[14px]">{x.titre}</p><p className="mt-1 text-[12.5px] text-white/55">{x.resume}</p></a>)}</div>}
      </div>

      {projet?.inspire?.domaine && <Clients domaine={projet.inspire.domaine} titre={`Qui démarcher pour ${app.spec.nom}`} />}
    </div>
  );
}

// Encaissement des abonnements (Stripe du créateur)
function OngletEncaisser({ app, appel, agir, busy }) {
  const [cle, setCle] = useState("");
  const pay = app.paiement ?? {};
  const [essai, setEssai] = useState(pay.essai_jours ?? 14);
  return pay.compte ? (
    <div className="space-y-2.5 max-w-xl">
      <p className="text-[14px] text-white/75">Stripe branché : <b className="text-white">{pay.compte}</b>{pay.test && <span className="ml-1.5 rounded bg-[#F6A06B]/25 px-1.5 py-0.5 text-[11px] font-bold text-[#F6A06B]">MODE TEST</span>}</p>
      <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={!!pay.actif} disabled={!!busy} onChange={(e) => agir("actif", () => appel("paiement", { actif: e.target.checked }), e.target.checked ? "Abonnements activés" : "Application gratuite")} />Abonnement obligatoire après l'essai</label>
      <label className="flex items-center gap-2 text-[14px]">Modèle <select value={pay.modele ?? "abonnement"} onChange={(e) => agir("modele", () => appel("paiement", { modele: e.target.value }), e.target.value === "unique" ? "Paiement unique : tes clients paient une fois, accès à vie" : "Abonnement mensuel enregistré")} className="rounded-lg bg-white/10 border border-white/15 px-2 py-1"><option value="abonnement" className="text-ink">Abonnement mensuel (SaaS)</option><option value="unique" className="text-ink">Paiement unique, accès à vie (appli web)</option></select></label>
      <label className="flex items-center gap-2 text-[14px]">Essai gratuit <input type="number" min={0} max={60} value={essai} onChange={(e) => setEssai(e.target.value)} onBlur={() => Number(essai) !== Number(pay.essai_jours ?? 14) && agir("essai", () => appel("paiement", { essai_jours: Number(essai) }), "Durée d'essai enregistrée")} className="w-16 rounded-lg bg-white/10 border border-white/15 px-2 py-1" /> jours</label>
      <button disabled={!!busy} onClick={() => { if (confirm("Débrancher Stripe ? L'application redevient gratuite.")) agir("cle", () => appel("paiement", { cle: "" }), "Stripe débranché"); }} className="text-[12.5px] text-white/50 underline">Débrancher Stripe</button>
    </div>
  ) : (
    <div className="space-y-2.5 max-w-xl">
      <Explication>L'argent arrive directement sur ton compte Stripe. Colle ta clé secrète (Stripe → Développeurs → Clés API). Elle reste sur le serveur, personne ne peut la relire. Avec une clé sk_test_ tu peux tout essayer sans vrai paiement.</Explication>
      <input value={cle} onChange={(e) => setCle(e.target.value)} placeholder="sk_live_… ou sk_test_…" className={champSombre} autoComplete="off" />
      <button disabled={!!busy || cle.trim().length < 20} onClick={() => agir("cle", async () => { await appel("paiement", { cle: cle.trim(), actif: true }); setCle(""); }, "Stripe branché : tes clients paieront après l'essai")} className={btnAccent}>{busy === "cle" ? "Vérification…" : "Brancher Stripe"}</button>
    </div>
  );
}

// 7. Tests A/B : prix ou durée d'essai. La moitié des visiteurs voit B ; Bingoo! calcule la probabilité que B fasse mieux.
function OngletPrix({ app, appel, agir, busy }) {
  const [r, setR] = useState(null);
  const [type, setType] = useState(app.ab?.type ?? "prix");
  const [ecart, setEcart] = useState(app.ab?.ecart ?? 20);
  const [essaiB, setEssaiB] = useState(app.ab?.essai_b ?? 7);
  useEffect(() => { appel("ab-resultats").then(setR, () => setR(null)); }, [app.id, app.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const actif = !!r?.actif;
  const t = actif ? r.type ?? "prix" : type;
  const f = app.spec.formules ?? [];
  const ec = Number(actif ? r.ecart : ecart);
  const essaiA = Number(actif ? r.essai_a : app.paiement?.essai_jours ?? 14), eB = Number(actif ? r.essai_b : essaiB);
  const decrire = (v) => t === "essai" ? `Essai de ${v === "A" ? essaiA : eB} jours` : f.map((x) => `${x.nom} ${v === "A" ? x.prix : Math.round(Number(x.prix) * (1 + ec / 100))} €`).join(" · ");
  const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1).replace(".", ",")} %` : "—");
  const p = r?.proba_b;
  const lancer = () => agir("ab", async () => setR(await appel("ab", { actif: true, type, ecart: Number(ecart), essai_b: Number(essaiB) })), "Test lancé");
  return (
    <div className="space-y-4">
      <Explication>La moitié des visiteurs voit la version A (la tienne), l'autre la version B. Bingoo! compte visites, inscriptions et abonnements de chaque côté et calcule la probabilité que B fasse mieux. À 95 % (et 50 visites par côté au moins), le gagnant est sûr : tu le gardes en un clic, ou Bingoo! le garde pour toi.</Explication>
      {!actif && (
        <div className="rounded-xl bg-white/[.06] p-4 space-y-3">
          <div className="flex gap-1.5">{[["prix", "Tester les prix"], ["essai", "Tester la durée d'essai"]].map(([k, l]) => <button key={k} onClick={() => setType(k)} className={cx("rounded-lg px-3 py-1.5 text-[13.5px] font-semibold", type === k ? "bg-white text-ink" : "bg-white/10")}>{l}</button>)}</div>
          {type === "prix" ? <label className="block text-[13.5px]">Prix B : tes prix <input type="number" step={5} min={-50} max={100} value={ecart} onChange={(e) => setEcart(e.target.value)} className="mx-1 w-20 rounded-lg bg-white/10 border border-white/15 px-2 py-1" /> % <span className="text-white/50">({decrire("B")})</span></label>
            : <label className="block text-[13.5px]">Essai B : <input type="number" min={0} max={60} value={essaiB} onChange={(e) => setEssaiB(e.target.value)} className="mx-1 w-20 rounded-lg bg-white/10 border border-white/15 px-2 py-1" /> jours <span className="text-white/50">(A : {app.paiement?.essai_jours ?? 14} jours)</span></label>}
          {type === "essai" && !app.paiement?.actif && <p className="text-[12.5px] text-[#F6A06B]">Branche Stripe (onglet « Encaisser ») pour que la durée d'essai compte.</p>}
          <button disabled={!!busy} onClick={lancer} className={btnAccent}>Lancer le test</button>
        </div>
      )}
      {actif && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[14px]">Test en cours depuis le {new Date(r.debut).toLocaleDateString("fr-FR")} · {t === "essai" ? "durée d'essai" : "prix"}</p>
          <label className="flex items-center gap-2 text-[13.5px]"><input type="checkbox" checked={!!r.auto} onChange={(e) => agir("abauto", async () => setR(await appel("ab", { auto: e.target.checked })), e.target.checked ? "Bingoo! gardera le gagnant tout seul" : null)} />Garder le gagnant automatiquement</label>
          <button disabled={!!busy} onClick={() => { if (confirm("Arrêter le test sans rien changer ?")) agir("ab", async () => setR(await appel("ab", { appliquer: "A" })), "Test arrêté"); }} className={btnSombre}>Arrêter le test</button>
        </div>
      )}
      {(actif || r?.debut) && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            {["A", "B"].map((v) => {
              const x = r?.resultats?.[v] ?? { vues: 0, inscrits: 0, abonnes: 0, revenu: 0 };
              return (
                <div key={v} className={cx("rounded-xl p-4", r?.gagnant === v ? "bg-[#15803D]/25 ring-1 ring-[#86EFAC]/40" : "bg-white/[.06]")}>
                  <p className="font-bold">Version {v} {v === "A" && <span className="font-normal text-white/50">(la tienne)</span>} {r?.gagnant === v && <span className="ml-1 text-[12px] text-[#86EFAC]">GAGNANT</span>}</p>
                  <p className="text-[13px] text-white/60">{decrire(v)}</p>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center">{[[x.vues, "visites"], [pct(x.inscrits, x.vues), "s'inscrivent"], [pct(x.abonnes, x.vues), "s'abonnent"], [x.vues ? eurs(Math.round((x.revenu / x.vues) * 100) / 100) : "—", "par visite"]].map(([n, l]) => <div key={l}><p className="text-[16px] font-black tnum" style={HF}>{n}</p><p className="text-[11px] text-white/50">{l}</p></div>)}</div>
                </div>
              );
            })}
          </div>
          {p != null && (
            <div>
              <div className="flex justify-between text-[12.5px] text-white/60"><span>Probabilité que B fasse mieux ({r.mesure})</span><b className="text-white">{Math.round(p * 100)} %</b></div>
              <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden relative"><div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: p >= 0.95 ? "#22C55E" : p <= 0.05 ? "#F87171" : "#F6A06B" }} /><span className="absolute top-0 h-full w-px bg-white/50" style={{ left: "95%" }} /><span className="absolute top-0 h-full w-px bg-white/50" style={{ left: "5%" }} /></div>
              <p className="mt-1 text-[12px] text-white/45">{r.gagnant ? `Gagnant sûr : la version ${r.gagnant}.` : !r.assez ? `Encore ${Math.max(0, 50 - Math.min(r.resultats.A.vues, r.resultats.B.vues))} visites par côté au moins.` : "Pas encore assez net : on continue."} {r.mesure === "taux d'inscription" ? "Dès 5 abonnés, la mesure passe au revenu par visite." : ""}</p>
            </div>
          )}
          {r?.gagnant && actif && <button disabled={!!busy} onClick={() => agir("ab", async () => setR(await appel("ab", { appliquer: r.gagnant })), r.gagnant === "B" ? "Version B gardée" : "Ta version reste")} className={btnAccent}>{r.gagnant === "B" ? (t === "essai" ? `Passer à ${eB} jours d'essai` : "Garder les prix B") : "Garder ma version"}</button>}
        </>
      )}
      {(r?.historique ?? []).length > 0 && (
        <div>
          <p className="font-bold text-[14px]">Tests passés</p>
          <ul className="mt-1 space-y-1 text-[13px] text-white/70">{[...r.historique].reverse().map((h, i) => <li key={i}>· {new Date(h.au).toLocaleDateString("fr-FR")} : {h.type === "essai" ? `essai ${h.essai_a} j contre ${h.essai_b} j` : `prix ${h.ecart > 0 ? "+" : ""}${h.ecart} %`} → {h.gagnant === "B" ? "B gardé" : "A gardé"}{h.proba_b != null ? ` (B meilleur à ${Math.round(h.proba_b * 100)} %)` : ""}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// 9. E-mails de l'app : modèles modifiables (et désactivables), e-mail d'essai, annonces à tous les comptes, domaine d'envoi
const VARS_MAIL = "{prenom} {app} {jours} {formule}";
function OngletEmails({ app, appel, agir, busy }) {
  const toast = useToast();
  const [et, setEt] = useState(null);
  const [edit, setEdit] = useState(null);
  const [ann, setAnn] = useState({ sujet: "", texte: "", bouton: "" });
  const [dom, setDom] = useState("");
  const e = app.email_dom;
  const charger = () => appel("emails").then(setEt, () => setEt(null));
  useEffect(() => { charger(); }, [app.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (e?.id && e.statut !== "ok") appel("email-verifier").then(() => {}, () => {}); }, [e?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const maj = (type, extra, ok) => agir(`m${type}`, async () => setEt(await appel("emails", { type, ...extra })), ok);
  return (
    <div className="space-y-5">
      <Explication>{app.spec.nom} envoie tout seul ses e-mails, au bon moment, depuis {e?.statut === "ok" ? <b>bonjour@{e.domaine}</b> : <><b>apps@maisonravita.fr</b> (ou ton domaine, plus bas)</>}. Modifie leurs textes, coupe ceux que tu ne veux pas, envoie-toi un essai. Chaque e-mail a un lien de désinscription.</Explication>
      {et && <div className="flex flex-wrap gap-2 text-[13px]">{[[et.joignables, "comptes joignables"], [et.desabonnes, "désinscrits"], [Object.values(et.modeles).reduce((n, m) => n + m.envoyes_30j, 0) + et.annonces_30j, "e-mails envoyés sur 30 jours"]].map(([v, l]) => <span key={l} className="rounded-lg bg-white/[.06] px-3 py-1.5"><b className="tnum">{v}</b> {l}</span>)}</div>}
      <div className="space-y-2">{et === null ? <Spinner /> : Object.entries(et.modeles).map(([k, m]) => (
        <div key={k} className={cx("rounded-xl p-3.5", m.actif ? "bg-white/[.06]" : "bg-white/[.03] opacity-70")}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={m.actif} disabled={k === "invitation" || !!busy} onChange={(ev) => maj(k, { actif: ev.target.checked }, ev.target.checked ? `« ${m.nom} » activé` : `« ${m.nom} » coupé`)} /><span className="font-bold">✉ {m.nom}</span></label>
            <span className="text-[12.5px] text-white/50 flex-1">{m.quand} · {m.envoyes_30j} envoyé{m.envoyes_30j > 1 ? "s" : ""} sur 30 jours{m.modifie ? " · texte modifié" : ""}</span>
            <button onClick={() => setEdit(edit?.type === k ? null : { type: k, sujet: m.sujet, texte: m.texte, bouton: m.bouton })} className={btnSombre}>{edit?.type === k ? "Fermer" : "Modifier"}</button>
            <button disabled={!!busy} onClick={() => agir(`t${k}`, async () => { const r = await appel("email-test", { type: k }); toast(`Essai envoyé à ${r.a}`); }, null)} className={btnSombre}>M'envoyer un essai</button>
          </div>
          {edit?.type === k && (
            <div className="mt-3 space-y-2">
              <input value={edit.sujet} onChange={(ev) => setEdit({ ...edit, sujet: ev.target.value })} className={champSombre} placeholder="Sujet" />
              <textarea value={edit.texte} onChange={(ev) => setEdit({ ...edit, texte: ev.target.value })} rows={7} className={champSombre} />
              <input value={edit.bouton} onChange={(ev) => setEdit({ ...edit, bouton: ev.target.value })} className={champSombre} placeholder="Texte du bouton" />
              <div className="flex flex-wrap items-center gap-2"><button disabled={!!busy} onClick={() => { maj(k, { sujet: edit.sujet, texte: edit.texte, bouton: edit.bouton }, "Modèle enregistré"); setEdit(null); }} className={btnAccent}>Enregistrer</button>{m.modifie && <button onClick={() => { maj(k, { reinitialiser: true }, "Texte d'origine remis"); setEdit(null); }} className={btnSombre}>Remettre le texte d'origine</button>}<span className="text-[12px] text-white/45">Variables : {VARS_MAIL}</span></div>
            </div>
          )}
        </div>
      ))}</div>

      <div className="rounded-xl bg-white/[.06] p-4 space-y-2">
        <p className="font-bold">Envoyer une annonce à tes clients</p>
        <p className="text-[13px] text-white/60">Une nouveauté, une offre, un mot : envoyé à tous les comptes {et ? `(${et.joignables})` : ""}, sans les désinscrits. Une annonce par semaine au plus.{et?.derniere_annonce ? ` Dernière : ${new Date(et.derniere_annonce).toLocaleDateString("fr-FR")}.` : ""}</p>
        <input value={ann.sujet} onChange={(ev) => setAnn({ ...ann, sujet: ev.target.value })} className={champSombre} placeholder="Sujet, ex. : Nouveau dans {app} : les relances automatiques" />
        <textarea value={ann.texte} onChange={(ev) => setAnn({ ...ann, texte: ev.target.value })} rows={5} className={champSombre} placeholder={"Bonjour {prenom},\n\n…"} />
        <div className="flex flex-wrap gap-2">
          <button disabled={!!busy || ann.texte.length < 10} onClick={() => agir("anntest", async () => { await appel("annonce", { ...ann, test: true }); toast("Essai envoyé à ton adresse"); }, null)} className={btnSombre}>M'envoyer un essai</button>
          <button disabled={!!busy || ann.texte.length < 10 || ann.sujet.length < 3} onClick={() => { if (confirm(`Envoyer cette annonce à ${et?.joignables ?? "tous les"} comptes ?`)) agir("ann", async () => { const r = await appel("annonce", ann); toast(`Annonce envoyée à ${r.envoyes} compte${r.envoyes > 1 ? "s" : ""}`); setAnn({ sujet: "", texte: "", bouton: "" }); charger(); }, null); }} className={btnAccent}>{busy === "ann" ? "Envoi…" : "Envoyer à tous"}</button>
        </div>
      </div>

      {e ? (
        <div className="rounded-xl bg-white/[.06] p-4">
          <p className="text-[14px]">Domaine d'envoi : <b>{e.domaine}</b> <span className={cx("ml-1 rounded px-1.5 py-0.5 text-[11px] font-bold", e.statut === "ok" ? "bg-[#15803D]/30 text-[#86EFAC]" : "bg-[#F6A06B]/25 text-[#F6A06B]")}>{e.statut === "ok" ? "VÉRIFIÉ" : "EN ATTENTE DU DNS"}</span></p>
          {e.statut !== "ok" && <><p className="mt-2 text-[12.5px] text-white/60">Ajoute ces enregistrements chez ton registraire :</p><TableDns dns={e.dns ?? []} /></>}
          <div className="mt-3 flex gap-2">{e.statut !== "ok" && <button disabled={!!busy} onClick={() => agir("ev", () => appel("email-verifier"), null)} className={btnSombre}>{busy === "ev" ? "Vérification…" : "Vérifier"}</button>}<button disabled={!!busy} onClick={() => agir("ed", () => appel("email-domaine", { domaine: "" }), "Domaine d'envoi retiré")} className={btnSombre}>Retirer</button></div>
        </div>
      ) : (
        <div className="rounded-xl bg-white/[.06] p-4"><p className="font-bold">Envoyer depuis ton domaine</p><p className="text-[13px] text-white/60">Tes e-mails partiront de bonjour@tondomaine.fr : plus pro, et moins de courrier indésirable.</p><div className="mt-2 flex gap-2 max-w-xl"><input value={dom} onChange={(x) => setDom(x.target.value)} placeholder="monsaas.fr" className={champSombre} /><button disabled={!!busy || !/\./.test(dom)} onClick={() => agir("ed", () => appel("email-domaine", { domaine: dom.trim() }), "Domaine ajouté : il reste le DNS")} className={btnAccent}>Utiliser ce domaine</button></div></div>
      )}
    </div>
  );
}

// Nom de domaine de l'app
function OngletDomaine({ app, appel, agir, busy }) {
  const [dom, setDom] = useState("");
  const [dns, setDns] = useState(null);
  useEffect(() => { if (app.domaine && app.domaine_statut !== "ok") appel("domaine-verifier").then((r) => setDns(r.dns), () => {}); }, [app.domaine]); // eslint-disable-line react-hooks/exhaustive-deps
  return app.domaine ? (
    <div className="max-w-2xl">
      <p className="text-[14px]"><b>{app.domaine}</b> <span className={cx("ml-1 rounded px-1.5 py-0.5 text-[11px] font-bold", app.domaine_statut === "ok" ? "bg-[#15803D]/30 text-[#86EFAC]" : "bg-[#F6A06B]/25 text-[#F6A06B]")}>{app.domaine_statut === "ok" ? "EN LIGNE" : "EN ATTENTE DU DNS"}</span></p>
      {app.domaine_statut !== "ok" && dns && <><p className="mt-2 text-[12.5px] text-white/60">Chez ton registraire (OVH, Gandi, IONOS…), ajoute :</p><TableDns dns={dns} /><p className="mt-1 text-[12px] text-white/45">La propagation prend de quelques minutes à quelques heures.</p></>}
      <div className="mt-3 flex gap-2">
        {app.domaine_statut !== "ok" && <button disabled={!!busy} onClick={() => agir("verif", async () => { const r = await appel("domaine-verifier"); setDns(r.dns); if (r.statut !== "ok") throw new Error("Pas encore : le DNS ne pointe pas vers Bingoo!"); }, "Domaine en ligne")} className={btnSombre}>{busy === "verif" ? "Vérification…" : "Vérifier"}</button>}
        <button disabled={!!busy} onClick={() => { if (confirm(`Retirer ${app.domaine} ?`)) agir("dom", () => appel("domaine", { domaine: "" }), "Domaine retiré"); }} className={btnSombre}>Retirer</button>
      </div>
    </div>
  ) : (
    <div className="space-y-2.5 max-w-xl">
      <Explication>Ton SaaS sur ton adresse, par exemple monsaas.fr ou app.monsaas.fr. Achète le domaine chez un registraire, puis indique-le ici. Tes articles seront aussi sur monsaas.fr/blog.</Explication>
      <div className="flex gap-2"><input value={dom} onChange={(e) => setDom(e.target.value)} placeholder="monsaas.fr" className={champSombre} /><button disabled={!!busy || !/\./.test(dom)} onClick={() => agir("dom", async () => { const r = await appel("domaine", { domaine: dom.trim() }); setDns(r.dns); }, "Domaine ajouté : il reste à régler le DNS")} className={btnAccent}>{busy === "dom" ? "Ajout…" : "Utiliser ce domaine"}</button></div>
    </div>
  );
}

// 2 et 3. Le monde des SaaS et la bourse
function OngletMonde({ app, appel, agir, busy }) {
  const nav = useNavigate();
  const [vente, setVente] = useState(undefined);
  const [stats, setStats] = useState(null);
  const [prix, setPrix] = useState("");
  const [desc, setDesc] = useState("");
  const charger = () => {
    supabase.rpc("saas_bourse_liste").then(({ data }) => setVente((data ?? []).find((x) => x.slug === app.slug) ?? null));
    supabase.rpc("saas_apps_monde").then(({ data }) => setStats((data ?? []).find((x) => x.slug === app.slug) ?? null));
  };
  useEffect(() => { charger(); }, [app.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const e = stats ? estimer({ ...stats, resilies_90j: 0, age_jours: Math.round((Date.now() - new Date(stats.at).getTime()) / 864e5) }) : null;
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="rounded-xl bg-white/[.06] p-4 space-y-2">
        <p className="font-bold">🏝 Le monde des SaaS</p>
        <p className="text-[13px] text-white/65">{app.spec.nom} devient un bâtiment sur l'île des créateurs : un étage de plus tous les 1 000 € de revenu mensuel vérifié, un phare à 10 000 €. Il entre aussi dans le classement des créateurs (nom de ton espace, revenu, abonnés).</p>
        {app.public && <div className="rounded-lg bg-white/5 p-2.5"><p className="text-[12.5px] text-white/60">Ton badge à poser sur ton site (il se met à jour tout seul) :</p><img src={`${API}/${app.slug}/badge.svg`} alt="Revenu vérifié par Bingoo!" className="mt-1.5 h-9" /><button onClick={() => navigator.clipboard?.writeText(`<a href="https://kairo.maisonravita.fr/#/explorer/createurs"><img src="${API}/${app.slug}/badge.svg" alt="Revenu vérifié par Bingoo!" height="36"></a>`)} className="mt-1.5 text-[12.5px] underline text-white/70">Copier le code du badge</button></div>}
        <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={!!app.public} disabled={!!busy} onChange={(ev) => agir("pub", () => appel("public", { public: ev.target.checked }), ev.target.checked ? `${app.spec.nom} apparaît dans le monde` : "Retiré du monde et du classement")} />Afficher {app.spec.nom} dans le monde et le classement</label>
      </div>
      <div className="rounded-xl bg-white/[.06] p-4 space-y-2">
        <p className="font-bold">📈 La bourse des SaaS</p>
        {vente === undefined ? <Spinner /> : vente ? (
          <>
            <p className="text-[13.5px]">En vente à <b>{eurs(vente.prix)}</b> · {vente.interets} acheteur{vente.interets > 1 ? "s" : ""} en discussion{vente.meilleure_offre ? ` · meilleure offre ${eurs(vente.meilleure_offre)}` : ""}</p>
            <div className="flex flex-wrap gap-2"><button onClick={() => nav("/explorer/bourse")} className={btnAccent}>Voir les conversations</button><button disabled={!!busy} onClick={() => agir("bourse", async () => { await appel("bourse", { retirer: true }); charger(); }, "Retiré de la bourse")} className={btnSombre}>Retirer de la vente</button></div>
          </>
        ) : (
          <>
            <p className="text-[13px] text-white/65">Mets {app.spec.nom} en vente : les acheteurs voient son revenu, ses abonnés et ses désabonnements relus dans Stripe, sa courbe et son ancienneté. Vous négociez dans Bingoo!, sans échanger vos e-mails.</p>
            {e ? <p className="text-[13px]">Estimation Bingoo! : <b>{eurs(e.bas)} – {eurs(e.haut)}</b> <span className="text-white/50">({e.multiple.toFixed(1).replace(".", ",")} × le revenu annuel)</span> <button onClick={() => setPrix(String(Math.round((e.bas + e.haut) / 2)))} className="ml-1 underline text-white/70">utiliser</button></p> : <p className="text-[12.5px] text-white/45">Pas encore de revenu : l'estimation apparaîtra avec tes premiers abonnés.</p>}
            <input type="number" min={100} value={prix} onChange={(ev) => setPrix(ev.target.value)} placeholder="Prix demandé (€)" className={champSombre} />
            <textarea value={desc} onChange={(ev) => setDesc(ev.target.value)} rows={3} placeholder="Pourquoi tu vends, ce que l'acheteur récupère (code, domaine, clients), le temps que ça demande par semaine…" className={champSombre} />
            <button disabled={!!busy || !(Number(prix) >= 100)} onClick={() => agir("bourse", async () => { await appel("bourse", { prix: Number(prix), description: desc }); charger(); }, `${app.spec.nom} est en vente`)} className={btnAccent}>Mettre en vente</button>
          </>
        )}
      </div>
    </div>
  );
}

// 10. L'app sur téléphone : QR code pour l'ouvrir, icône, raccourcis, installation sur Android, iPhone et ordinateur
function QR({ texte, taille = 168 }) {
  const svg = useMemo(() => { const q = qrcode(0, "M"); q.addData(texte); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }, [texte]);
  return <div className="rounded-xl bg-white p-2" style={{ width: taille, height: taille }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
function OngletMobile({ app }) {
  const dom = app.domaine_statut === "ok" ? app.domaine : null;
  const lien = lienApp(app.slug, dom);
  const ecrans = (app.spec.ecrans ?? []).filter((e) => e.code).slice(0, 4);
  return (
    <div className="grid lg:grid-cols-[auto_1fr] gap-5 items-start">
      <div className="flex flex-col items-center gap-2">
        <QR texte={lien} />
        <p className="text-[12px] text-white/55 text-center">Scanne avec ton téléphone<br />pour ouvrir {app.spec.nom}</p>
      </div>
      <div className="space-y-4">
        <Explication>{app.spec.nom} s'installe comme une vraie application, sur téléphone et sur ordinateur : son icône sur l'écran d'accueil, en plein écran, sans passer par l'App Store ni le Play Store. Tes clients n'ont rien à télécharger.</Explication>
        <div className="flex items-center gap-4">
          {app.icones?.u192 ? <img src={app.icones.u192} alt="" className="h-16 w-16 rounded-2xl shadow-lg" /> : <span className="grid h-16 w-16 place-items-center rounded-2xl text-white text-[28px] font-black" style={{ background: app.spec.couleur }}>{String(app.spec.nom)[0]}</span>}
          <div className="text-[13px] text-white/65"><p className="font-bold text-white">L'icône de {app.spec.nom}</p><p>À ta couleur, refaite toute seule si tu changes le nom ou la couleur.</p></div>
        </div>
        <div className="grid md:grid-cols-3 gap-2 text-[13px]">
          {[["Android", "Un bouton « Installer l'application » apparaît en bas de l'écran ; sinon, menu ⋮ → « Installer l'application »."], ["iPhone et iPad", "Dans Safari : Partager ⬆︎ → « Sur l'écran d'accueil ». Ton SaaS l'explique lui-même à tes clients."], ["Ordinateur", "Chrome et Edge : l'icône d'installation dans la barre d'adresse."]].map(([t, d]) => <div key={t} className="rounded-xl bg-white/[.06] p-3"><p className="font-bold">{t}</p><p className="mt-0.5 text-white/60">{d}</p></div>)}
        </div>
        {ecrans.length > 0 && <div className="text-[13px] text-white/65"><p className="font-bold text-white">Raccourcis</p><p>Un appui long sur l'icône ouvre directement : {ecrans.map((e) => e.titre).join(", ")}.</p></div>}
        <p className="text-[12px] text-white/45">Les bibliothèques de l'app sont gardées sur l'appareil : elle s'ouvre plus vite à chaque fois. Les données, elles, restent en ligne (il faut du réseau pour les voir à jour).</p>
      </div>
    </div>
  );
}

// Le code
function OngletCode({ app }) {
  const pay = app.paiement ?? {};
  const dom = app.domaine_statut === "ok" ? app.domaine : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Explication>Tout ton SaaS dans un dossier : l'application prête à héberger, le code de chaque écran, tes données et leur schéma PostgreSQL, et un mode d'emploi. Il est à toi.</Explication>
      <button onClick={async () => { const { telechargerCode } = await import("../lib/appExport"); telechargerCode({ spec: app.spec, slug: app.slug, api: API, lien: lienApp(app.slug, dom), paiement: { actif: !!pay.actif, essai_jours: pay.essai_jours ?? 14 } }); }} className="rounded-xl bg-white text-ink px-5 py-2.5 text-[14px] font-bold hover:bg-white/90">Télécharger le code (.zip)</button>
    </div>
  );
}

// ---------------------------------------------------------------- Mes SaaS construits et classement des créateurs
const croissance = (a) => Number(a.mrr_30j) > 0 ? Math.round((Number(a.mrr) / Number(a.mrr_30j) - 1) * 100) : Number(a.mrr) > 0 ? null : 0;
const CLASSEMENTS = [["mrr", "Revenu", (a) => Number(a.mrr)], ["croissance", "Croissance du mois", (a) => Number(a.mrr) - Number(a.mrr_30j)], ["nouveaux", "Nouveaux comptes", (a) => Number(a.nouveaux_30j)]];
function Createurs() {
  const nav = useNavigate();
  const { ws } = useWs();
  const [mes, setMes] = useState(null);
  const [cl, setCl] = useState(null);
  const [histo, setHisto] = useState({});
  const [tri, setTri] = useState("mrr");
  useEffect(() => {
    supabase.from("saas_apps").select("id, slug, spec, statut, public, domaine, domaine_statut, at, projet_id, saas_projets(data)").eq("workspace_id", ws.id).order("at", { ascending: false }).then(({ data }) => setMes(data ?? []));
    supabase.rpc("saas_apps_monde").then(({ data }) => setCl(data ?? []));
    supabase.from("saas_app_mrr_jour").select("app_id, jour, mrr").gte("jour", new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)).order("jour").then(({ data }) => {
      const h = {}; for (const r of data ?? []) (h[r.app_id] ??= []).push({ n: Number(r.mrr) }); setHisto(h);
    });
  }, [ws.id]);
  const chiffres = (slug) => (cl ?? []).find((x) => x.slug === slug);
  const f = CLASSEMENTS.find((x) => x[0] === tri)[2];
  const publics = (cl ?? []).filter((a) => a.public).sort((x, y) => f(y) - f(x));
  const mesPrives = (cl ?? []).filter((a) => a.a_moi && !a.public).map((a) => ({ ...a, place: publics.filter((p) => f(p) > f(a)).length + 1 }));
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[30px] font-black tracking-tight" style={HF}>Mes SaaS et classement</h1>
      <p className="text-ink-soft">Les SaaS que Bingoo! a construits pour toi, et le classement des créateurs. Les revenus sont relus chaque nuit dans Stripe : jamais un chiffre déclaré.</p>
      <h2 className="mt-6 font-bold text-[19px]">Mes SaaS construits</h2>
      {mes === null ? <div className="py-10 grid place-items-center"><Spinner /></div> : !mes.length ? (
        <div className="mt-2 rounded-2xl bg-white border border-line p-6"><p>Tu n'as pas encore de SaaS construit. Choisis un SaaS qui marche dans la base, clique « Lancer le mien », puis « Construire mon SaaS ».</p><button onClick={() => nav("/explorer/idees")} className="mt-3 rounded-xl bg-accent text-white px-4 py-2.5 font-bold">Trouver une idée</button></div>
      ) : (
        <div className="mt-2 grid md:grid-cols-2 lg:grid-cols-3 gap-3">{mes.map((a) => {
          const insp = a.saas_projets?.data?.inspire;
          const c = chiffres(a.slug);
          const mrr = Number(c?.mrr ?? 0), etage = Math.floor(mrr / 1000), vers = (etage + 1) * 1000;
          const g = c ? croissance(c) : 0;
          return (
            <div key={a.id} className="rounded-2xl bg-white border border-line p-4 flex flex-col">
              <div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-xl text-white font-black" style={{ background: a.spec?.couleur ?? "#4F46E5" }}>{String(a.spec?.nom ?? "S")[0]}</span><div className="min-w-0 flex-1"><p className="font-bold truncate">{a.spec?.nom ?? "En construction"}</p><p className="text-[12.5px] text-ink-faint truncate">{insp ? `Concurrent de ${insp.nom}` : ""}</p></div><span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", a.public ? "bg-[#DCFCE7] text-[#15803D]" : "bg-paper text-ink-faint")}>{a.public ? "DANS LE MONDE" : "PRIVÉ"}</span></div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">{[[eurs(mrr), "par mois"], [c?.abonnes ?? 0, "abonnés"], [g == null ? "nouveau" : `${g > 0 ? "+" : ""}${g} %`, "sur 30 jours"]].map(([v, l]) => <div key={l} className="rounded-xl bg-paper py-2"><p className="text-[16px] font-black tnum">{v}</p><p className="text-[11px] text-ink-faint">{l}</p></div>)}</div>
              {(histo[a.id]?.length ?? 0) > 1 && <div className="mt-2"><Sparkline pts={histo[a.id]} h={36} /></div>}
              <div className="mt-2"><div className="flex justify-between text-[11.5px] text-ink-faint"><span>{etage ? `${etage} étage${etage > 1 ? "s" : ""}` : "Rez-de-chaussée"}{mrr >= 10000 ? " · phare allumé" : ""}</span><span>prochain étage à {eurs(vers)}</span></div><div className="mt-1 h-1.5 rounded-full bg-paper overflow-hidden"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, ((mrr % 1000) / 1000) * 100)}%` }} /></div></div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => nav(`/explorer/lancer?d=${insp?.domaine ?? ""}`)} className="rounded-xl bg-ink text-white px-3.5 py-2 text-[13.5px] font-bold">Gérer</button>
                {a.spec?.ecrans?.length > 0 && <a href={lienApp(a.slug, a.domaine_statut === "ok" ? a.domaine : null)} target="_blank" rel="noreferrer" className="rounded-xl border border-line px-3.5 py-2 text-[13.5px] font-semibold hover:border-ink-faint">Ouvrir ↗</a>}
              </div>
            </div>
          );
        })}</div>
      )}
      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-bold text-[19px]">Classement des créateurs</h2><p className="text-[13px] text-ink-faint">Seuls les créateurs qui l'ont accepté y figurent (onglet « Monde et bourse » de leur SaaS).</p></div>
        <div className="flex gap-1.5">{CLASSEMENTS.map(([k, l]) => <Chip key={k} on={tri === k} onClick={() => setTri(k)}>{l}</Chip>)}</div>
      </div>
      <div className="mt-2 rounded-2xl bg-white border border-line overflow-hidden">
        {cl === null ? <div className="py-10 grid place-items-center"><Spinner /></div> : !publics.length ? <p className="p-5 text-ink-soft">Personne dans le classement pour l'instant. Sois le premier : dans ton SaaS, onglet « Monde et bourse ».</p> : (
          <table className="w-full text-[14px]"><thead><tr className="text-left text-[12px] text-ink-faint border-b border-line"><th className="px-4 py-2 font-medium w-10">#</th><th className="font-medium">SaaS</th><th className="font-medium hidden sm:table-cell">Créateur</th><th className="font-medium text-right">Revenu / mois</th><th className="font-medium text-right hidden md:table-cell">30 jours</th><th className="font-medium text-right hidden sm:table-cell">Abonnés</th><th className="font-medium text-right px-4">Nouveaux</th></tr></thead>
            <tbody>{publics.slice(0, 100).map((a, i) => { const g = croissance(a); return <tr key={a.slug} className={cx("border-t border-line first:border-0", a.a_moi && "bg-accent-soft/50")}><td className="px-4 py-2.5 font-black tnum">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</td><td><a href={lienApp(a.slug, a.domaine)} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-semibold hover:underline"><span className="h-5 w-5 rounded-md" style={{ background: a.couleur ?? "#4F46E5" }} />{a.nom}{a.a_moi && <span className="rounded-full bg-accent text-white px-1.5 text-[10.5px] font-bold">TOI</span>}</a></td><td className="text-ink-soft hidden sm:table-cell">{a.createur}</td><td className="text-right font-bold tnum">{eurs(a.mrr)}</td><td className={cx("text-right tnum hidden md:table-cell", g > 0 ? "text-[#15803D]" : g < 0 ? "text-[#B91C1C]" : "text-ink-faint")}>{g == null ? "nouveau" : `${g > 0 ? "+" : ""}${g} %`}</td><td className="text-right tnum hidden sm:table-cell">{a.abonnes}</td><td className="text-right tnum px-4">{a.nouveaux_30j}</td></tr>; })}</tbody></table>
        )}
      </div>
      {mesPrives.length > 0 && <p className="mt-2 text-[13px] text-ink-soft">{mesPrives.map((a) => `${a.nom} serait ${a.place}${a.place === 1 ? "er" : "e"} s'il était affiché`).join(" · ")}. Pour entrer dans le classement : onglet « Monde et bourse » de ton SaaS.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Bourse des SaaS
/** Estimation indicative : multiple du revenu annuel selon la croissance, l'ancienneté et les désabonnements. */
function estimer(x) {
  const mrr = Number(x.mrr ?? 0), arr = mrr * 12;
  if (!arr) return null;
  const g = Number(x.mrr_30j) > 0 ? mrr / Number(x.mrr_30j) - 1 : 0;
  const churn = Number(x.abonnes) + Number(x.resilies_90j ?? 0) > 0 ? Number(x.resilies_90j ?? 0) / (Number(x.abonnes) + Number(x.resilies_90j ?? 0)) / 3 : 0;
  let m = 2.5 + (g > 0.1 ? 0.5 : 0) + (g > 0.3 ? 0.5 : 0) + (Number(x.age_jours) > 365 ? 0.5 : 0) - (churn > 0.08 ? 0.7 : 0) - (mrr < 500 ? 0.5 : 0);
  m = Math.max(1, Math.min(5, m));
  const r = (n) => Math.round(n / 100) * 100;
  return { bas: r(arr * (m - 0.5)), haut: r(arr * (m + 0.5)), multiple: m };
}
const TRIS_BOURSE = [["mrr", "Revenu", (x) => -Number(x.mrr)], ["prix", "Prix", (x) => Number(x.prix)], ["multiple", "Multiple", (x) => Number(x.mrr) ? Number(x.prix) / (Number(x.mrr) * 12) : 99], ["croissance", "Croissance", (x) => -(Number(x.mrr) - Number(x.mrr_30j))]];

function Bourse() {
  const { ws } = useWs();
  const [l, setL] = useState(null);
  const [fils, setFils] = useState([]);
  const [tri, setTri] = useState("mrr");
  const [cat, setCat] = useState("");
  const [ouvert, setOuvert] = useState(null);
  const charger = () => { supabase.rpc("saas_bourse_liste").then(({ data }) => setL(data ?? [])); supabase.rpc("saas_bourse_fils").then(({ data }) => setFils(data ?? [])); };
  useEffect(() => { charger(); }, [ws.id]);
  const f = TRIS_BOURSE.find((x) => x[0] === tri)[2];
  const cats = [...new Set((l ?? []).map((x) => x.categorie).filter(Boolean))].sort();
  const liste = (l ?? []).filter((x) => !cat || x.categorie === cat).sort((a, b) => f(a) - f(b));
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[30px] font-black tracking-tight" style={HF}>La bourse des SaaS</h1>
      <p className="text-ink-soft max-w-3xl">Des SaaS construits sur Bingoo!, à reprendre. Revenu, abonnés et désabonnements sont relus chaque nuit dans Stripe : jamais un chiffre déclaré. Vous discutez et négociez ici, sans échanger vos e-mails ; une fois payé, Bingoo! transfère l'application sur l'espace de l'acheteur (commission de 5 %, payée par le vendeur).</p>
      {fils.length > 0 && (
        <div className="mt-5 rounded-2xl bg-white border border-line">
          <p className="px-4 pt-3 font-bold">Mes conversations</p>
          <ul className="mt-1">{fils.map((x) => (
            <li key={x.bourse_id + x.acheteur_ws}><button onClick={() => setOuvert({ bourse_id: x.bourse_id, acheteur: x.acheteur_ws, nom: x.nom, prix: x.prix, vendeur: x.je_vends, autre: x.je_vends ? x.acheteur : x.vendeur })} className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-line text-left hover:bg-paper">
              <span className="min-w-0 flex-1"><span className="font-semibold">{x.nom}</span> <span className="text-[12.5px] text-ink-faint">· {x.je_vends ? `acheteur : ${x.acheteur}` : `vendeur : ${x.vendeur}`}</span><span className="block text-[13px] text-ink-soft truncate">{String(x.dernier ?? "").replace(/^Offre : (\d+) €$/, (_, n) => `Offre : ${eurs(Number(n))}`)}</span></span>
              {x.vente === "attente_paiement" && <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-bold text-[#15803D]">OFFRE ACCEPTÉE</span>}
              {x.statut_offre === "proposee" && x.je_vends && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-dark">OFFRE {eurs(x.offre)}</span>}
              {x.non_lus > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{x.non_lus}</span>}
            </button></li>
          ))}</ul>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5"><Chip on={!cat} onClick={() => setCat("")}>Toutes les catégories</Chip>{cats.map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(cat === c ? "" : c)}>{c}</Chip>)}</div>
        <div className="flex gap-1.5">{TRIS_BOURSE.map(([k, t]) => <Chip key={k} on={tri === k} onClick={() => setTri(k)}>{t}</Chip>)}</div>
      </div>
      {l === null ? <div className="py-16 grid place-items-center"><Spinner /></div> : !liste.length ? (
        <div className="mt-5 rounded-2xl bg-white border border-line p-6"><p>Aucun SaaS en vente pour l'instant. Pour vendre le tien : ouvre-le dans « Mes SaaS et classement », onglet « Monde et bourse ».</p></div>
      ) : (
        <div className="mt-4 grid md:grid-cols-2 gap-4">{liste.map((b) => {
          const e = estimer(b);
          const g = Number(b.mrr_30j) > 0 ? Math.round((Number(b.mrr) / Number(b.mrr_30j) - 1) * 100) : null;
          return (
            <div key={b.id} className="rounded-2xl bg-white border border-line p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white font-black text-[18px]" style={{ background: b.couleur ?? "#4F46E5" }}>{String(b.nom ?? "S")[0]}</span><div className="min-w-0"><p className="font-bold text-[17px] truncate">{b.nom}</p><p className="text-[12.5px] text-ink-faint">{b.categorie ? `${b.categorie} · ` : ""}{b.inspire ? `concurrent de ${b.inspire} · ` : ""}{b.age_jours} jours</p></div></div>
                <p className="shrink-0 text-right"><span className="text-[24px] font-black tnum" style={HF}>{eurs(b.prix)}</span><br /><span className="text-[11.5px] text-ink-faint">{Number(b.mrr) ? `${(b.prix / (b.mrr * 12)).toFixed(1).replace(".", ",")} × le revenu annuel` : "prix demandé"}</span></p>
              </div>
              <p className="mt-2 text-[14px] text-ink-soft">{b.pitch}</p>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">{[[eurs(b.mrr), "par mois ✓"], [g == null ? "—" : `${g > 0 ? "+" : ""}${g} %`, "sur 30 jours"], [b.abonnes, "abonnés"], [b.resilies_90j, "résiliés 90 j"]].map(([v, t]) => <div key={t} className="rounded-xl bg-paper py-2"><p className="text-[15px] font-black tnum">{v}</p><p className="text-[10.5px] text-ink-faint">{t}</p></div>)}</div>
              {(b.courbe?.length ?? 0) > 1 && <div className="mt-2"><Sparkline pts={b.courbe.map((p) => ({ n: Number(p.n) }))} h={34} /></div>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
                {e && <span>Estimation Bingoo! : <b className="text-ink">{eurs(e.bas)} – {eurs(e.haut)}</b></span>}
                {b.meilleure_offre && <span>Meilleure offre : <b className="text-ink">{eurs(b.meilleure_offre)}</b></span>}
                <span>{b.interets} acheteur{b.interets > 1 ? "s" : ""} en discussion</span>
              </div>
              {b.description && <p className="mt-3 text-[13.5px] whitespace-pre-line">{b.description}</p>}
              <div className="mt-auto pt-4 flex flex-wrap gap-2">
                <a href={lienApp(b.slug, null)} target="_blank" rel="noreferrer" className="rounded-xl border border-line px-4 py-2.5 text-[14px] font-semibold hover:border-ink-faint">Essayer ↗</a>
                {b.a_moi ? <p className="self-center text-[13px] text-ink-faint">C'est ton annonce : réponds aux acheteurs dans « Mes conversations ».</p>
                  : <button onClick={() => setOuvert({ bourse_id: b.id, acheteur: ws.id, nom: b.nom, prix: b.prix, vendeur: false, autre: b.vendeur, nouveau: !b.deja })} className="rounded-xl bg-accent text-white px-4 py-2.5 text-[14px] font-bold hover:bg-accent-dark">{b.deja ? "Reprendre la discussion" : "Discuter ou faire une offre"}</button>}
              </div>
            </div>
          );
        })}</div>
      )}
      <p className="mt-4 text-[12px] text-ink-faint">L'estimation est indicative (multiple du revenu annuel selon la croissance, l'ancienneté et les désabonnements). Je ne suis pas un conseiller financier : vérifiez les chiffres et faites-vous accompagner pour une vente importante.</p>
      {ouvert && <FilBourse fil={ouvert} onClose={() => { setOuvert(null); charger(); }} />}
    </div>
  );
}

// Conversation acheteur / vendeur : messages, offre, acceptation, transfert
function FilBourse({ fil, onClose }) {
  const { ws } = useWs();
  const toast = useToast();
  const [msgs, setMsgs] = useState(null);
  const [vente, setVente] = useState(null);
  const [texte, setTexte] = useState(fil.nouveau ? "Bonjour, ton SaaS m'intéresse. " : "");
  const [offre, setOffre] = useState("");
  const [busy, setBusy] = useState(false);
  const bas = useMemo(() => ({ el: null }), []);
  const charger = async () => {
    const { data } = await supabase.from("saas_bourse_messages").select("*").eq("bourse_id", fil.bourse_id).eq("acheteur_ws", fil.acheteur).order("at");
    setMsgs(data ?? []);
    const { data: v } = await supabase.from("saas_bourse_ventes").select("statut, prix, commission").eq("bourse_id", fil.bourse_id).eq("acheteur_ws", fil.acheteur).order("at", { ascending: false }).limit(1);
    setVente(v?.[0] ?? null);
    if ((data ?? []).length) fn("r/saas-bourse-lu", { workspace_id: ws.id, bourse_id: fil.bourse_id, acheteur: fil.acheteur }).catch(() => {});
    setTimeout(() => bas.el?.scrollIntoView({ block: "end" }), 50);
  };
  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (f, ok) => { setBusy(true); try { await f(); if (ok) toast(ok); await charger(); } catch (x) { toast(x.message, "bad"); } finally { setBusy(false); } };
  const envoyer = (e) => { e.preventDefault(); act(async () => { await fn("r/saas-bourse-message", { workspace_id: ws.id, bourse_id: fil.bourse_id, acheteur: fil.acheteur, texte, offre: offre || null }); setTexte(""); setOffre(""); }); };
  const derniere = [...(msgs ?? [])].reverse().find((m) => m.statut_offre === "proposee");
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 grid place-items-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl flex flex-col max-h-[88vh]">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-line">
          <div><p className="font-bold text-[18px]">{fil.nom} <span className="font-normal text-ink-faint text-[14px]">· en vente à {eurs(fil.prix)}</span></p><p className="text-[13px] text-ink-faint">{fil.vendeur ? `Acheteur : ${fil.autre}` : `Vendeur : ${fil.autre}`}</p></div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink text-[22px] leading-none">×</button>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-2.5">
          {msgs === null ? <Spinner /> : !msgs.length ? <p className="text-[14px] text-ink-soft">Présente-toi, pose tes questions (clients, temps passé, raisons de la vente) ou fais directement une offre.</p> : msgs.map((m) => {
            const moi = m.de_ws === ws.id;
            return (
              <div key={m.id} className={cx("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px]", moi ? "ml-auto bg-ink text-white" : "bg-paper")}>
                {m.offre != null && <p className="font-bold">💶 Offre : {eurs(m.offre)} {m.statut_offre === "acceptee" ? "· acceptée ✓" : m.statut_offre === "refusee" ? "· refusée" : m.statut_offre === "remplacee" ? "· remplacée" : "· en attente"}</p>}
                {m.texte && <p className="whitespace-pre-line">{m.texte}</p>}
                <p className={cx("mt-1 text-[11px]", moi ? "text-white/50" : "text-ink-faint")}>{new Date(m.at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            );
          })}
          <div ref={(el) => { bas.el = el; }} />
        </div>
        {fil.vendeur && derniere && !vente?.statut?.startsWith("a") && (
          <div className="mx-5 mb-2 rounded-2xl bg-accent-soft/60 p-3 flex flex-wrap items-center gap-2"><p className="flex-1 text-[14px]">Offre de <b>{eurs(derniere.offre)}</b> à décider</p><button disabled={busy} onClick={() => act(() => fn("r/saas-bourse-offre", { workspace_id: ws.id, message_id: derniere.id, accepter: false }), "Offre refusée")} className="rounded-xl border border-line bg-white px-3 py-2 text-[13.5px] font-semibold">Refuser</button><button disabled={busy} onClick={() => act(() => fn("r/saas-bourse-offre", { workspace_id: ws.id, message_id: derniere.id, accepter: true }), "Offre acceptée")} className="rounded-xl bg-accent text-white px-3 py-2 text-[13.5px] font-bold">Accepter</button></div>
        )}
        {vente?.statut === "attente_paiement" && (
          <div className="mx-5 mb-2 rounded-2xl bg-[#DCFCE7] p-3 text-[13.5px]">
            <p><b>Vente conclue à {eurs(vente.prix)}.</b> {fil.vendeur ? `Une fois le paiement reçu, transfère l'application. Commission Bingoo! : ${eurs(vente.commission)}.` : "Organise le paiement avec le vendeur ; il te transfère l'application dès réception."}</p>
            {fil.vendeur && <button disabled={busy} onClick={() => { if (confirm(`Paiement reçu ? ${fil.nom} va passer sur l'espace de l'acheteur et ton Stripe sera débranché.`)) act(() => fn("r/saas-bourse-vendu", { workspace_id: ws.id, bourse_id: fil.bourse_id, acheteur: fil.acheteur }), "Transféré !"); }} className="mt-2 rounded-xl bg-[#15803D] text-white px-3 py-2 font-bold">Paiement reçu : transférer {fil.nom}</button>}
          </div>
        )}
        {vente?.statut === "a_facturer" ? <p className="p-5 pt-2 text-[14px] font-semibold text-[#15803D]">✓ {fil.nom} a été transféré.</p> : (
          <form onSubmit={envoyer} className="p-5 pt-2 border-t border-line flex flex-col gap-2">
            <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={2} placeholder="Ton message" className="rounded-xl border border-line px-3 py-2 text-[14px] outline-none focus:border-ink" />
            <div className="flex gap-2">
              {!fil.vendeur && <input type="number" min={100} value={offre} onChange={(e) => setOffre(e.target.value)} placeholder="Offre en € (facultatif)" className="flex-1 rounded-xl border border-line px-3 py-2 text-[14px] outline-none focus:border-ink" />}
              <button disabled={busy || (!texte.trim() && !offre)} className="ml-auto rounded-xl bg-ink text-white px-5 py-2 font-bold disabled:opacity-50">{offre ? "Envoyer l'offre" : "Envoyer"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Classement : les SaaS qui grossissent le plus vite (revenus vérifiés)
const ONGLETS_CLASSEMENT = [["mois", "Ce mois-ci", "Croissance du MRR sur 30 jours, à partir de 1 000 $ de MRR."], ["trimestre", "Sur 3 mois", "Revenu du dernier mois complet comparé à celui d'il y a 3 mois."], ["revenu", "Plus gros revenu", "Le MRR vérifié le plus élevé."], ["jeunes", "Nés cette année", "Créés il y a moins de 12 mois, déjà au-dessus de 1 000 $ par mois."]];
const montantCourt = (n) => n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M$` : n >= 1e3 ? `${Math.round(n / 1e3)} k$` : `${Math.round(n)} $`;
const MARCHES_FR = { AI: "IA", "Dev Tools": "Outils développeurs", Marketing: "Marketing", Analytics: "Analytics", Productivity: "Productivité", Sales: "Ventes", "Content Creation": "Création de contenu", Education: "Éducation", "E-comm": "E-commerce", "E-commerce": "E-commerce", "Mobile Apps": "Applis mobiles", "Design Tools": "Design", "Recruiting & HR": "Recrutement et RH", Fintech: "Finance", Security: "Sécurité", "Social Media": "Réseaux sociaux", "Health & Fitness": "Santé et sport", Entertainment: "Divertissement", Community: "Communauté", "No-Code": "No-code", Marketplace: "Marketplace", Games: "Jeux", "Customer Support": "Support client", "Real Estate": "Immobilier", Legal: "Juridique", Travel: "Voyage", Crypto: "Crypto", "News & Magazines": "Médias" };
const marcheFr = (m) => MARCHES_FR[m] ?? m;
const dollar = (n) => n == null ? "—" : n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M$` : n >= 1e4 ? `${Math.round(n / 1e3)} k$` : `${Math.round(n).toLocaleString("fr-FR")} $`;
/** Fondateur affiché publiquement par la startup sur TrustMRR. */
function Fondateur({ f, className = "", grand = false }) {
  const [ok, setOk] = useState(true);
  return (
    <a href={f.lien} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={cx("items-center gap-2 min-w-0 hover:underline", className.includes("hidden") ? "" : "flex", className)}>
      {f.photo && ok ? <img src={f.photo} alt="" onError={() => setOk(false)} referrerPolicy="no-referrer" className={cx("rounded-full object-cover shrink-0 bg-paper", grand ? "w-10 h-10" : "w-7 h-7")} /> : <span className={cx("rounded-full bg-paper grid place-items-center font-bold text-ink-soft shrink-0", grand ? "w-10 h-10" : "w-7 h-7 text-[12px]")}>{f.nom.slice(0, 1).toUpperCase()}</span>}
      <span className="min-w-0"><span className={cx("block truncate font-semibold", grand ? "text-[15px]" : "text-[13px]")}>{f.nom}</span>{f.x_abonnes ? <span className="block text-[11.5px] text-ink-faint">{f.x_abonnes.toLocaleString("fr-FR")} abonnés sur X</span> : null}</span>
    </a>
  );
}

function Classement() {
  const nav = useNavigate();
  const [tri, setTri] = useState("mois");
  const [rows, setRows] = useState(undefined);
  useEffect(() => { setRows(undefined); supabase.rpc("saas_classement", { p_tri: tri }).then(({ data }) => setRows(data ?? [])); }, [tri]);
  const info = ONGLETS_CLASSEMENT.find((o) => o[0] === tri);
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <p className="text-[12.5px] font-bold tracking-wider text-accent-dark">CLASSEMENT</p>
      <h1 className="text-[34px] font-black leading-tight tracking-tight" style={HF}>Les SaaS qui grossissent le plus vite.</h1>
      <p className="mt-1 text-ink-soft max-w-3xl">Uniquement des revenus vérifiés directement chez Stripe (via TrustMRR), pas des chiffres déclarés. Mis à jour chaque jour.</p>
      <div className="mt-5 flex flex-wrap gap-1.5">{ONGLETS_CLASSEMENT.map(([k, l]) => <Chip key={k} on={tri === k} onClick={() => setTri(k)}>{l}</Chip>)}</div>
      <p className="mt-2 text-[12.5px] text-ink-faint">{info[2]}</p>
      {rows === undefined ? <p className="py-16 text-center text-ink-soft">Chargement…</p> : !rows.length ? <p className="py-16 text-center text-ink-soft">Le classement se remplit : Bingoo! lit en ce moment les revenus vérifiés de milliers de SaaS. Reviens dans quelques heures.</p> : (
        <div className="mt-4 rounded-2xl border border-line bg-white overflow-hidden">
          {rows.map((x, i) => {
            const pts = (x.courbe ?? []).map((c) => ({ n: c.v }));
            const crois = tri === "trimestre" ? x.crois_3m : x.crois_30j;
            const ouvrir = () => x.statut === "ok" ? nav(`/explorer/${x.domaine}`) : window.open(x.source, "_blank", "noopener");
            return (
              <button key={x.domaine} onClick={ouvrir} className="w-full text-left flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 border-b border-line last:border-0 hover:bg-paper/60">
                <span className={cx("w-7 text-right tnum font-black", i < 3 ? "text-accent-dark text-[18px]" : "text-ink-faint")}>{i + 1}</span>
                <CompanyLogo name={x.nom} url={`https://${x.domaine}`} className="w-10 h-10 shrink-0" pad="p-1.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">{x.nom} <span className="font-normal">{drapeau(x.pays)}</span></p>
                  <p className="text-[12.5px] text-ink-faint truncate">{x.categorie ?? (x.marches ?? []).filter((m) => m !== "SaaS").slice(0, 2).map(marcheFr).join(" · ")} · {x.domaine}{x.fonde ? ` · créé en ${x.fonde.slice(0, 4)}` : ""}</p>
                </div>
                {x.fondateurs?.[0] && <Fondateur f={x.fondateurs[0]} className="hidden lg:flex w-44" />}
                <div className="hidden md:block w-28">{pts.length > 1 && <Sparkline pts={pts} h={30} />}</div>
                <div className="w-24 text-right"><p className="font-bold tnum">{dollar(x.mrr ?? x.revenu_mois)}</p><p className="text-[11.5px] text-ink-faint">{x.mrr ? "MRR" : "par mois"}</p></div>
                <div className="w-20 text-right">{crois != null && <span className={cx("inline-block rounded-lg px-2 py-1 text-[12.5px] font-bold tnum", crois > 0 ? "bg-[#DCFCE7] text-[#166534]" : crois < 0 ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-paper text-ink-soft")}>{crois > 0 ? "+" : ""}{Number(crois).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %</span>}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- SaaS qui s'endorment : à racheter, ou leurs clients à récupérer
const couleurScore = (n) => n >= 60 ? "#B91C1C" : n >= 45 ? "#E0531F" : "#D97706";
const ScoreSommeil = ({ n }) => (
  <div className="w-24 shrink-0"><div className="flex items-baseline justify-between"><span className="text-[18px] font-black tnum" style={{ color: couleurScore(n), ...HF }}>{n}</span><span className="text-[10.5px] text-ink-faint">/ 100</span></div><div className="h-1.5 rounded-full bg-paper overflow-hidden"><div className="h-full rounded-full" style={{ width: `${n}%`, background: couleurScore(n) }} /></div></div>
);
const messageRachat = (x) => `Bonjour,

Je suis ${"{ton prénom}"}, entrepreneur dans le logiciel. J'utilise et j'apprécie ${x.nom}, et je cherche à reprendre un logiciel ${x.categorie ? `de ${x.categorie.toLowerCase()} ` : ""}déjà apprécié de ses clients pour continuer à le développer.

Envisageriez-vous de céder ${x.nom}, ou d'en discuter ? Je peux reprendre le produit, ses clients et son support, avec une transition à votre rythme.

Un appel de 20 minutes la semaine prochaine vous conviendrait-il ?

Bien cordialement,
${"{ton prénom}"}`;

function Approcher({ x, onClose }) {
  const toast = useToast();
  const [t, setT] = useState(messageRachat(x));
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 grid place-items-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[18px]">Approcher l'éditeur de {x.nom}</p><p className="text-[13px] text-ink-faint">Un message court et respectueux, à envoyer toi-même depuis ta boîte.</p></div><button onClick={onClose} className="text-ink-faint hover:text-ink text-[22px] leading-none">×</button></div>
        <textarea value={t} onChange={(e) => setT(e.target.value)} rows={13} className="mt-3 w-full rounded-xl border border-line p-3 text-[14px] outline-none focus:border-ink" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => navigator.clipboard?.writeText(t).then(() => toast("Message copié"))} className="rounded-xl bg-ink text-white px-4 py-2.5 text-[14px] font-bold">Copier le message</button>
          {x.contact ? <a href={x.contact} target="_blank" rel="noreferrer" className="rounded-xl border border-line px-4 py-2.5 text-[14px] font-semibold hover:border-ink-faint">Sa page de contact ↗</a> : <a href={`https://${x.domaine}`} target="_blank" rel="noreferrer" className="rounded-xl border border-line px-4 py-2.5 text-[14px] font-semibold hover:border-ink-faint">Son site ↗</a>}
        </div>
        <p className="mt-2 text-[12px] text-ink-faint">Remplace {"{ton prénom}"}. Écris à l'adresse de contact officielle de l'entreprise, une seule fois, et relance au plus une fois.</p>
      </div>
    </div>
  );
}

function BlocEndormi({ d, s }) {
  const nav = useNavigate();
  const [ouvert, setOuvert] = useState(false);
  return (
    <section className="mt-4 rounded-2xl bg-[#FDF0EC] border border-[#F5C9B8] p-5">
      <div className="flex flex-wrap items-start gap-4">
        <ScoreSommeil n={d.score} />
        <div className="flex-1 min-w-[240px]"><h2 className="font-bold">{s.nom} s'endort</h2><p className="text-[13px] text-ink-soft">Indices relevés{d.depuis ? ` depuis le ${new Date(d.depuis).toLocaleDateString("fr-FR")}` : ""} : à racheter, ou ses clients à récupérer.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{(d.signes ?? []).map((g) => <span key={g.t} className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-[#9A3412]">{g.t}</span>)}</div></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => setOuvert(true)} className="rounded-xl bg-ink text-white px-4 py-2.5 text-[14px] font-bold">Approcher l'éditeur</button><button onClick={() => nav(`/explorer/lancer?d=${s.domaine}`)} className="rounded-xl bg-white border border-line px-4 py-2.5 text-[14px] font-semibold">Récupérer ses clients</button></div>
      </div>
      {ouvert && <Approcher x={{ ...s, contact: d.contact }} onClose={() => setOuvert(false)} />}
    </section>
  );
}

function Racheter() {
  const nav = useNavigate();
  const [cat, setCat] = useState("");
  const [l, setL] = useState(null);
  const [toutes, setToutes] = useState([]);
  const [appro, setAppro] = useState(null);
  const [clients, setClients] = useState(null);
  useEffect(() => { setL(null); supabase.rpc("saas_endormis", { p_categorie: cat || null }).then(({ data }) => { setL(data ?? []); if (!cat) setToutes([...new Set((data ?? []).map((x) => x.categorie))].sort()); }); }, [cat]);
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[30px] font-black tracking-tight" style={HF}>Les SaaS qui s'endorment</h1>
      <p className="text-ink-soft max-w-3xl">Plus de nouveautés, un pied de page figé, plus de recrutements, du trafic en baisse, des prix qui ne bougent plus : ces SaaS ralentissent. Une cible à racheter (leurs fondateurs sont souvent prêts à vendre), ou des clients à récupérer avec ton propre SaaS. Recalculé chaque nuit ; ceux qui s'endorment dans tes catégories arrivent dans l'e-mail du lundi.</p>
      <div className="mt-4 flex flex-wrap gap-1.5"><Chip on={!cat} onClick={() => setCat("")}>Toutes les catégories</Chip>{toutes.map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(cat === c ? "" : c)}>{c}</Chip>)}</div>
      {l === null ? <div className="py-16 grid place-items-center"><Spinner /></div> : !l.length ? <p className="mt-6 text-ink-soft">Aucun SaaS endormi repéré dans cette catégorie pour l'instant.</p> : (
        <div className="mt-4 rounded-2xl bg-white border border-line overflow-hidden">
          {l.map((x) => (
            <div key={x.domaine} className="px-4 py-3.5 border-t border-line first:border-0">
              <div className="flex flex-wrap items-center gap-3">
                <ScoreSommeil n={x.score} />
                <CompanyLogo name={x.nom} url={`https://${x.domaine}`} className="w-9 h-9" />
                <div className="min-w-[200px] flex-1"><button onClick={() => nav(`/explorer/${x.domaine}`)} className="font-semibold hover:underline">{x.nom}</button>{x.suivi && <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-ink-faint">SUIVI</span>}<p className="text-[12.5px] text-ink-faint">{x.categorie}{x.pays ? ` · ${x.pays}` : ""}{x.prix_entree_eur != null ? ` · dès ${x.prix_entree_eur} €/mois` : ""}{x.rang_web ? ` · N° ${Number(x.rang_web).toLocaleString("fr-FR")} mondial` : ""}{x.depuis ? ` · signalé le ${new Date(x.depuis).toLocaleDateString("fr-FR")}` : ""}</p></div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setAppro(x)} className="rounded-xl bg-ink text-white px-3 py-2 text-[13px] font-bold">Approcher l'éditeur</button>
                  <button onClick={() => nav(`/explorer/lancer?d=${x.domaine}`)} className="rounded-xl border border-line px-3 py-2 text-[13px] font-semibold hover:border-ink-faint">Récupérer ses clients</button>
                  <button onClick={() => setClients(clients === x.domaine ? null : x.domaine)} className="rounded-xl border border-line px-3 py-2 text-[13px] font-semibold hover:border-ink-faint">{clients === x.domaine ? "Fermer" : "Ses clients probables"}</button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 pl-[108px] max-sm:pl-0">{(x.signes ?? []).map((g) => <span key={g.t} className="rounded-full bg-[#FDF0EC] px-2.5 py-1 text-[12px] font-medium text-[#9A3412]">{g.t} <span className="opacity-60">+{g.p}</span></span>)}</div>
              {clients === x.domaine && <div className="mt-3"><Clients domaine={x.domaine} titre={`Les clients probables de ${x.nom}`} /></div>}
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-[12px] text-ink-faint">Indices lus sur les sites publics et dans les relevés de Bingoo!, pas une certitude : vérifie avant d'approcher un fondateur. « Ses clients probables » : les entreprises du type de celles qui achètent ce logiciel, comptées dans le registre officiel.</p>
      {appro && <Approcher x={appro} onClose={() => setAppro(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------- Carte du monde
function Carte() {
  const nav = useNavigate();
  const { ws } = useWs();
  const [data, setData] = useState(null);
  const [apps, setApps] = useState([]);
  useEffect(() => { supabase.rpc("saas_carte", { ws: ws.id }).then(({ data: d }) => setData(d ?? [])); supabase.rpc("saas_apps_monde").then(({ data: d }) => setApps(d ?? [])); }, [ws.id]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[30px] font-black tracking-tight" style={HF}>Le monde des SaaS</h1>
      <p className="text-ink-soft">Chaque île est un continent, chaque bâtiment un pays : plus il est haut, plus il compte de SaaS. Débarque sur une île, puis entre dans un pays.</p>
      <div className="mt-4">
        <Suspense fallback={<div className="py-24 grid place-items-center"><Spinner /></div>}>
          {data ? <IsoMonde data={data} apps={apps} onApp={(a) => window.open(lienApp(a.slug, a.domaine), "_blank")} onVoir={(code, domaine) => nav(domaine ? `/explorer/${domaine}` : `/explorer?pays=${code}`)} /> : <div className="py-24 grid place-items-center"><Spinner /></div>}
        </Suspense>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Comparer
function Comparer() {
  const nav = useNavigate();
  const { ws } = useWs();
  const { search } = useLocation();
  const doms = useMemo(() => (new URLSearchParams(search).get("d") ?? "").split(",").filter(Boolean).slice(0, 4), [search]);
  const [l, setL] = useState(null);
  useEffect(() => { Promise.all(doms.map((d) => supabase.rpc("saas_fiche", { ws: ws.id, d }).then(({ data }) => data))).then(setL); }, [doms, ws.id]);
  if (!l) return <div className="py-24 grid place-items-center"><Spinner /></div>;
  const ok = l.filter((x) => x?.saas).map((x) => ({ ...x.saas, ev: x.evenements ?? [] }));
  const bloques = l.filter((x) => x?.limite);
  const lignes = [
    ["Catégorie", (s) => s.categorie], ["Pays", (s) => s.pays ? `${drapeau(s.pays)} ${PAYS[s.pays] ?? s.pays}` : "—"],
    ["Prix d'entrée", (s) => s.prix_entree_eur != null ? `${s.prix_entree_eur} €/mois` : usage(s) ? `À l'usage : ${usage(s)}` : s.sur_devis ? "Sur devis" : "Non affiché"],
    ["Version gratuite", (s) => s.gratuit ? "Oui" : "Non"], ["Essai", (s) => s.essai ?? "—"],
    ["Formules", (s) => (s.formules ?? []).map((f) => `${f.nom} : ${f.prix}`).join(" · ") || "—"],
    ["Recrute", (s) => s.recrute ? `Oui${s.postes ? ` · ${s.postes} postes` : ""}` : "Non"], ["Dernière nouveauté", (s) => date(s.nouveaute) ?? "—"],
    ["Score de croissance", (s) => s.score_croissance ?? "—"],
    ["Méthode d'acquisition", (s) => METHODE.filter(([k]) => s.methode?.[k]).map(([, t]) => t).join(", ") || "—"],
    ["Outils du site", (s) => (s.outils ?? []).filter((o) => o.toLowerCase() !== (s.nom ?? "").toLowerCase()).slice(0, 6).join(", ") || "—"],
    ["Derniers changements", (s) => s.ev.slice(0, 3).map((e, i) => <div key={i}>{evTexte(e)}</div>)],
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <button onClick={() => nav("/explorer")} className="text-[13.5px] text-ink-soft hover:text-ink">← Explorer</button>
      <h1 className="mt-2 text-[30px] font-black tracking-tight" style={HF}>Comparaison</h1>
      {bloques.length > 0 && <p className="mt-2 rounded-xl bg-accent-soft px-4 py-3 text-[14px] text-accent-dark">{bloques.map((b) => b.nom).join(", ")} : limite de fiches de la semaine atteinte.</p>}
      <div className="mt-4 rounded-2xl bg-white border border-line overflow-x-auto">
        <table className="w-full text-[14px] min-w-[760px]">
          <thead><tr className="border-b border-line"><th className="w-44" />{ok.map((s) => (
            <th key={s.id} className="px-4 py-4 text-left align-top"><button onClick={() => nav(`/explorer/${s.domaine}`)} className="flex items-center gap-3 text-left"><CompanyLogo name={s.nom} url={`https://${s.domaine}`} /><span><span className="block font-bold text-[16px]">{s.nom}</span><span className="block text-[12.5px] text-ink-faint font-normal">{s.domaine}</span></span></button></th>
          ))}</tr></thead>
          <tbody>{lignes.map(([t, f]) => (
            <tr key={t} className="border-b border-line last:border-0 align-top"><td className="px-4 py-3 text-[12.5px] font-semibold text-ink-faint">{t}</td>{ok.map((s) => <td key={s.id} className="px-4 py-3">{f(s)}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}


// ---------------------------------------------------------------- Suivre (un SaaS ou une catégorie) et « Mes suivis »
function BoutonSuivre({ saasId, categorie, petit }) {
  const { ws } = useWs();
  const toast = useToast();
  const [on, setOn] = useState(null);
  useEffect(() => {
    let q = supabase.from("saas_suivis").select("id").eq("workspace_id", ws.id);
    q = saasId ? q.eq("saas_id", saasId) : q.eq("categorie", categorie);
    q.maybeSingle().then(({ data }) => setOn(data?.id ?? false));
  }, [ws.id, saasId, categorie]);
  const basculer = async () => {
    if (on) { await supabase.from("saas_suivis").delete().eq("id", on); setOn(false); toast(categorie ? `Tu ne suis plus « ${categorie} »` : "Tu ne suis plus ce SaaS"); return; }
    const { data, error } = await supabase.from("saas_suivis").insert({ workspace_id: ws.id, ...(saasId ? { saas_id: saasId } : { categorie }) }).select("id").single();
    if (error) { toast(/Starter/.test(error.message) ? error.message : "Impossible pour l'instant, réessaie", "bad"); return; }
    setOn(data.id); toast(categorie ? `Tu suis « ${categorie} » : chaque lundi, ce qui a bougé` : "Suivi : chaque lundi, ce qui a bougé");
  };
  if (on === null) return null;
  return petit ? (
    <Chip on={!!on} onClick={basculer}>{on ? `✓ Catégorie suivie` : `Suivre « ${categorie} »`}</Chip>
  ) : (
    <button onClick={basculer} className={cx("self-start rounded-xl px-4 py-2.5 text-[14px] font-bold transition", on ? "bg-white border border-ink" : "bg-accent text-white hover:bg-accent-dark")}>{on ? "✓ Suivi" : "Suivre"}</button>
  );
}

function Suivis() {
  const nav = useNavigate();
  const { ws } = useWs();
  const [r, setR] = useState(null);
  const [tri, setTri] = useState({ k: "prix", sens: 1 });
  const charger = () => supabase.rpc("saas_mes_suivis", { ws: ws.id, jours: 30 }).then(({ data }) => setR(data ?? { saas: [], categories: [], fil: [] }));
  useEffect(() => { charger(); }, [ws.id]);
  const retirerCat = async (c) => { await supabase.from("saas_suivis").delete().eq("workspace_id", ws.id).eq("categorie", c); charger(); };
  if (!r) return <div className="py-24 grid place-items-center"><Spinner /></div>;
  const vide = !r.saas.length && !r.categories.length;
  const estMoi = (x) => r.moi && (x.domaine === r.moi || r.moi.endsWith("." + x.domaine));
  const moi = r.saas.find(estMoi);
  const autres = r.saas.filter((x) => !estMoi(x));
  // Chiffres du tableau de bord, calculés sur les concurrents (sans ton propre SaaS)
  const prix = autres.map((x) => x.prix_entree_eur).filter((v) => v != null).sort((a, b) => a - b);
  const mediane = prix.length ? (prix.length % 2 ? prix[(prix.length - 1) / 2] : Math.round((prix[prix.length / 2 - 1] + prix[prix.length / 2]) / 2)) : null;
  const recrutent = autres.filter((x) => x.recrute), postes = autres.reduce((n, x) => n + (x.postes ?? 0), 0);
  const mois = Date.now() - 30 * 864e5;
  const nouveaux = autres.filter((x) => x.nouveaute && Date.parse(x.nouveaute) > mois).length;
  const changements = r.fil.length;
  const ecart = moi?.prix_entree_eur != null && mediane ? Math.round(((moi.prix_entree_eur - mediane) / mediane) * 100) : null;
  // Courbe : postes ouverts chez les concurrents suivis, semaine par semaine
  const sem = new Map();
  for (const x of autres) for (const p of x.releves ?? []) { const d = new Date(p.at); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const k = d.toISOString().slice(0, 10); const v = sem.get(k) ?? {}; v[x.id] = p.postes ?? 0; sem.set(k, v); }
  const courbe = [...sem.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ v: Object.values(v).reduce((a, b) => a + b, 0), label: new Date(k).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) }));
  const COL = {
    nom: (x) => x.nom.toLowerCase(), prix: (x) => x.prix_entree_eur ?? 1e9, postes: (x) => -(x.postes ?? 0),
    nouveaute: (x) => -(x.nouveaute ? Date.parse(x.nouveaute) : 0), rang: (x) => x.rang_web ?? 1e9, chg: (x) => -(x.changements ?? 0),
  };
  const lignes = [...autres].sort((a, b) => { const va = COL[tri.k](a), vb = COL[tri.k](b); return (va > vb ? 1 : va < vb ? -1 : 0) * tri.sens; });
  const Th = ({ k, children, className }) => <th className={cx("px-3 py-2.5 font-medium cursor-pointer select-none hover:text-ink whitespace-nowrap", className)} onClick={() => setTri((t) => ({ k, sens: t.k === k ? -t.sens : 1 }))}>{children}{tri.k === k ? (tri.sens > 0 ? " ↓" : " ↑") : ""}</th>;
  const Ligne = ({ x, toi }) => {
    const pts = (x.releves ?? []).map((p) => ({ n: p.postes ?? 0 }));
    const prixAvant = (x.releves ?? []).filter((p) => p.prix != null).slice(-2, -1)[0]?.prix;
    return (
      <tr onClick={() => nav(`/explorer/${x.domaine}`)} className={cx("border-t border-line cursor-pointer hover:bg-paper/60 align-middle", toi && "bg-[#FFF7F3]")}>
        <td className="px-3 py-2.5"><div className="flex items-center gap-2.5 min-w-[180px]"><CompanyLogo name={x.nom} url={`https://${x.domaine}`} className="w-8 h-8" /><span className="min-w-0"><span className="font-semibold">{x.nom}</span> {drapeau(x.pays)}{toi && <span className="ml-1.5 rounded bg-accent text-white px-1.5 py-0.5 text-[10.5px] font-bold">TOI</span>}<span className="block text-[12px] text-ink-faint truncate">{x.domaine}</span></span></div></td>
        <td className="px-3 py-2.5 tnum whitespace-nowrap">{x.prix_entree_eur != null ? <>{x.prix_entree_eur} €{prixAvant != null && prixAvant !== x.prix_entree_eur && <span className={cx("ml-1 text-[12px] font-bold", x.prix_entree_eur > prixAvant ? "text-[#B91C1C]" : "text-[#15803D]")}>{x.prix_entree_eur > prixAvant ? "▲" : "▼"}</span>}</> : <span className="text-ink-faint">{usage(x) ? "à l'usage" : x.sur_devis ? "sur devis" : "—"}</span>}</td>
        <td className="px-3 py-2.5 text-[13px] whitespace-nowrap">{x.gratuit ? "Gratuit" : x.essai ? "Essai" : <span className="text-ink-faint">Non</span>}</td>
        <td className="px-3 py-2.5"><div className="flex items-center gap-2"><span className={cx("tnum w-7 text-right", x.recrute ? "font-semibold text-[#15803D]" : "text-ink-faint")}>{x.postes ?? (x.recrute ? "oui" : 0)}</span><div className="w-20">{pts.length > 1 && new Set(pts.map((p) => p.n)).size > 1 && <Sparkline pts={pts} h={24} />}</div></div></td>
        <td className="px-3 py-2.5 text-[13px] whitespace-nowrap">{x.nouveaute ? date(x.nouveaute) : <span className="text-ink-faint">—</span>}</td>
        <td className="px-3 py-2.5 text-[13px] tnum whitespace-nowrap">{x.rang_web ? <>N° {Number(x.rang_web).toLocaleString("fr-FR")}{x.rang_web_avant && x.rang_web_avant !== x.rang_web && <span className={cx("ml-1 font-bold", x.rang_web < x.rang_web_avant ? "text-[#15803D]" : "text-[#B91C1C]")}>{x.rang_web < x.rang_web_avant ? "▲" : "▼"}</span>}</> : <span className="text-ink-faint">—</span>}</td>
        <td className="px-3 py-2.5 text-center">{x.changements > 0 ? <span className="rounded-md bg-accent-soft text-accent-dark px-2 py-0.5 text-[12px] font-bold">{x.changements}</span> : <span className="text-ink-faint">0</span>}</td>
      </tr>
    );
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[30px] font-black tracking-tight" style={HF}>Mes suivis</h1>
          <p className="text-ink-soft">Tes concurrents côte à côte, relus chaque semaine. Chaque lundi matin, un e-mail résume ce qui a bougé.</p></div>
        <button onClick={() => nav("/explorer")} className="rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] font-semibold hover:border-ink-faint">+ Suivre un SaaS</button>
      </div>
      {vide ? (
        <div className="mt-6 rounded-2xl bg-white border border-line p-6">
          <p className="font-semibold">Tu ne suis encore rien.</p>
          <p className="mt-1 text-ink-soft text-[14.5px]">Ouvre la fiche d'un concurrent et clique sur « Suivre », ou choisis une catégorie dans la liste puis « Suivre la catégorie ».</p>
          <button onClick={() => nav("/explorer")} className="mt-4 rounded-xl bg-ink text-white px-4 py-2.5 text-[14px] font-semibold">Parcourir les SaaS</button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              [mediane != null ? `${mediane} €` : "—", "Prix d'entrée médian", ecart != null ? `Toi : ${moi.prix_entree_eur} € (${ecart > 0 ? "+" : ""}${ecart} %)` : `${prix.length} prix affichés sur ${autres.length}`],
              [`${recrutent.length} / ${autres.length}`, "Recrutent en ce moment", postes ? `${postes} postes ouverts au total` : "Aucun poste publié"],
              [String(nouveaux), "Ont sorti une nouveauté", "ces 30 derniers jours"],
              [String(changements), "Changements repérés", "prix, offres, recrutement, en 30 jours"],
            ].map(([v, t, sub]) => (
              <div key={t} className="rounded-2xl bg-white border border-line p-4">
                <p className="text-[28px] font-black leading-none tnum" style={HF}>{v}</p>
                <p className="mt-2 text-[13.5px] font-semibold">{t}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-faint">{sub}</p>
              </div>
            ))}
          </div>

          {r.saas.length > 0 && (
            <section className="mt-4 rounded-2xl bg-white border border-line overflow-x-auto">
              <div className="px-4 pt-4 flex items-baseline justify-between gap-2"><h2 className="font-bold">Ton marché, côte à côte</h2><span className="text-[12px] text-ink-faint">Clique sur un titre pour trier</span></div>
              <table className="mt-2 w-full text-[14px] min-w-[860px]">
                <thead><tr className="text-left text-[12px] text-ink-faint">
                  <Th k="nom">SaaS</Th><Th k="prix">Prix d'entrée</Th><th className="px-3 py-2.5 font-medium">Gratuit / essai</th><Th k="postes">Postes ouverts</Th><Th k="nouveaute">Dernière nouveauté</Th><Th k="rang">Notoriété</Th><Th k="chg" className="text-center">Changements</Th>
                </tr></thead>
                <tbody>{moi && <Ligne x={moi} toi />}{lignes.map((x) => <Ligne key={x.id} x={x} />)}</tbody>
              </table>
            </section>
          )}

          <div className="mt-4 grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <section className="rounded-2xl bg-white border border-line p-5">
                <h2 className="font-bold">Ce qui a bougé ces 30 derniers jours</h2>
                {r.fil.length ? (
                  <ul className="mt-3 divide-y divide-line">{r.fil.slice(0, 40).map((e, i) => (
                    <li key={i} onClick={() => nav(`/explorer/${e.domaine}`)} className="py-2.5 flex items-center gap-3 cursor-pointer hover:bg-paper/60 -mx-2 px-2 rounded-lg">
                      <span className="text-ink-faint tnum text-[13px] w-20 shrink-0">{date(e.at)}</span>
                      <CompanyLogo name={e.nom} url={`https://${e.domaine}`} className="w-8 h-8" />
                      <span className="text-[14px]"><b>{e.nom}</b> · {evTexte(e)}</span>
                    </li>
                  ))}</ul>
                ) : <p className="mt-2 text-[14px] text-ink-faint">Rien pour l'instant. Chaque SaaS est relu une fois par semaine : les changements apparaissent dès le deuxième relevé.</p>}
              </section>
            </div>
            <div className="space-y-4">
              <section className="rounded-2xl bg-white border border-line p-5">
                <h2 className="font-bold">Postes ouverts chez tes concurrents</h2>
                <p className="text-[12.5px] text-ink-faint">Total semaine par semaine : quand ça monte, ils investissent.</p>
                <div className="mt-2">{courbe.length > 1 ? <LineChart points={courbe} height={120} unit=" postes" /> : <p className="text-[13.5px] text-ink-faint">La courbe apparaît dès le deuxième relevé hebdomadaire.</p>}</div>
              </section>
              <section className="rounded-2xl bg-white border border-line p-5">
                <h2 className="font-bold">Catégories suivies</h2>
                <div className="mt-3 flex flex-wrap gap-2">{r.categories.map((c) => (
                  <span key={c} className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-[13px]">{c}<button onClick={() => retirerCat(c)} title="Ne plus suivre" className="text-ink-faint hover:text-ink">✕</button></span>
                ))}{!r.categories.length && <span className="text-[13.5px] text-ink-faint">Aucune catégorie suivie.</span>}</div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


// ---------------------------------------------------------------- Démarrage : ton SaaS et tes concurrents suivis en un clic
function Demarrer() {
  const nav = useNavigate();
  const { ws } = useWs();
  const toast = useToast();
  const [rien, setRien] = useState(false);
  const [url, setUrl] = useState((ws.website ?? "").replace(/^https?:\/\//i, "").replace(/\/$/, ""));
  const [busy, setBusy] = useState(false);
  useEffect(() => { supabase.from("saas_suivis").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).then(({ count }) => setRien((count ?? 0) === 0)); }, [ws.id]);
  if (!rien) return null;
  const go = async (e) => {
    e.preventDefault(); if (!url.trim()) return; setBusy(true);
    try {
      const r = await fn("r/saas-demarrer", { workspace_id: ws.id, url });
      toast(`${r.concurrents.length} concurrents de ${r.moi.nom} suivis, et la catégorie « ${r.moi.categorie} »`);
      nav("/explorer/suivis");
    } catch (x) { toast(x.message, "bad"); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={go} className="mt-5 rounded-2xl bg-ink text-white p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4">
      <div className="flex-1">
        <p className="text-[19px] font-bold">Commence par ton marché.</p>
        <p className="mt-1 text-white/75 text-[14.5px]">Donne l'adresse de ton SaaS : Bingoo! le lit, trouve tes concurrents directs et les suit pour toi. Chaque lundi, tu sauras ce qui a bougé.</p>
      </div>
      <div className="flex gap-2 w-full lg:w-auto">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="monsaas.com" className="flex-1 lg:w-64 rounded-xl bg-white text-ink px-4 py-3 text-[15px] outline-none" />
        <button disabled={busy} className="shrink-0 rounded-xl bg-accent px-5 py-3 font-bold hover:bg-accent-dark disabled:opacity-70">{busy ? "Lecture (1 à 2 min)…" : "Suivre mon marché"}</button>
      </div>
    </form>
  );
}
