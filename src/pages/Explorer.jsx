import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Spinner, useToast } from "../components/ui";
import CompanyLogo from "../components/CompanyLogo";
import { LineChart } from "../components/Charts";
import { lazy, Suspense } from "react";
const IsoMonde = lazy(() => import("../components/IsoMonde"));
const AppCadre = lazy(() => import("../components/AppCadre"));
import { cx } from "../lib/utils";

// Explorer : la base de SaaS de Bingoo! (le « TrendTrack des SaaS »). Liste filtrable, puis fiche détaillée par logiciel.
// Toutes les informations sont lues sur les sites des logiciels eux-mêmes, avec l'adresse de la page et la date du relevé.
const HF = { fontFamily: "var(--font-titre)" };
export const CATEGORIES = ["CRM et ventes", "Prospection et emailing", "Marketing et SEO", "Réseaux sociaux et contenu", "Facturation et comptabilité", "Paie et RH", "Recrutement", "Gestion de projet", "Collaboration et documents", "Support client", "E-commerce", "Paiement et finance", "Juridique", "Immobilier", "Santé", "Éducation et formation", "Commerce et restauration", "Logistique et transport", "Développeurs et no-code", "Données et analytics", "Sécurité et conformité", "IA et automatisation", "Événements", "BTP et artisans", "Agences et freelances", "Autre"];
const PAYS = { FR: "France", BE: "Belgique", CH: "Suisse", DE: "Allemagne", ES: "Espagne", IT: "Italie", GB: "Royaume-Uni", NL: "Pays-Bas", PT: "Portugal", IE: "Irlande", SE: "Suède", DK: "Danemark", PL: "Pologne", AT: "Autriche", US: "États-Unis", CA: "Canada", AU: "Australie", IN: "Inde", IL: "Israël" };
const drapeau = (c) => c && /^[A-Z]{2}$/.test(c) ? String.fromCodePoint(...[...c].map((x) => 127397 + x.charCodeAt(0))) : "";
const date = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : null;
const TRIS = [["score_croissance", "En croissance"], ["postes", "Qui recrutent le plus"], ["nouveaute", "Nouveautés récentes"], ["rang_web", "Les plus connus"], ["prix_entree_eur", "Prix d'entrée"], ["created_at", "Ajoutés récemment"]];
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
  if (d === "comparer") return <Comparer />;
  return d ? <Fiche domaine={d} /> : <><Onglets actif="liste" /><Liste /></>;
}

function Onglets({ actif }) {
  const nav = useNavigate();
  const T = [["liste", "SaaS", "/explorer"], ["carte", "Le monde", "/explorer/carte"], ["suivis", "Mes suivis", "/explorer/suivis"], ["bouge", "Ce qui a bougé", "/explorer/bouge"], ["marche", "Pays et tendances", "/explorer/marche"], ["pubs", "Pubs et e-mails", "/explorer/pubs"], ["idees", "Idées et réussites", "/explorer/idees"]];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
      <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-white border border-line p-1">
        {T.map(([k, l, to]) => <button key={k} onClick={() => nav(to)} className={cx("shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-[14px] font-semibold transition", actif === k ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}>{l}</button>)}
      </div>
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
  const [f, setF] = useState(() => { const p = new URLSearchParams(loc.search); return { q: "", categorie: p.get("categorie") ?? "", pays: p.get("pays") ?? "", prixMax: "", gratuit: false, recrute: false, actif: false, tri: "score_croissance", tag: p.get("tag") ?? "" }; });
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
    let q = supabase.from("saas_liste").select("id, domaine, nom, categorie, description, pays, prix_entree_eur, prix_usage, gratuit, essai, sur_devis, recrute, postes, nouveaute, score_croissance, lu_at, tags, rang_web", { count: "exact" });
    if (f.tag) q = q.contains("tags", [f.tag]);
    if (f.q.trim()) q = q.or(`nom.ilike.%${f.q.trim().replace(/[%,()]/g, "")}%,domaine.ilike.%${f.q.trim().replace(/[%,()]/g, "")}%,description.ilike.%${f.q.trim().replace(/[%,()]/g, "")}%`);
    if (f.categorie) q = q.eq("categorie", f.categorie);
    if (f.pays) q = q.eq("pays", f.pays);
    if (f.prixMax) q = q.lte("prix_entree_eur", Number(f.prixMax));
    if (f.gratuit) q = q.eq("gratuit", true);
    if (f.recrute) q = q.eq("recrute", true);
    if (f.actif) q = q.gte("nouveaute", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
    q = q.order(f.tri, { ascending: f.tri === "prix_entree_eur" || f.tri === "rang_web", nullsFirst: false }).order("nom").range(page * PAGE, page * PAGE + PAGE - 1);
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
          <h1 className="text-[30px] sm:text-[36px] font-black leading-tight tracking-tight" style={HF}>Tous les SaaS, au même endroit.</h1>
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
          <Chip on={f.gratuit} onClick={() => set("gratuit", !f.gratuit)}>Version gratuite</Chip>
          <Chip on={f.recrute} onClick={() => set("recrute", !f.recrute)}>Recrutent</Chip>
          <Chip on={f.actif} onClick={() => set("actif", !f.actif)}>Nouveauté ce mois-ci</Chip>
          {f.categorie && <BoutonSuivre categorie={f.categorie} petit />}
        </div>
        {niches.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[12px] font-semibold text-ink-faint mr-1">Niches{f.categorie ? ` · ${f.categorie}` : ""} :</span>
            {niches.slice(0, 16).map((n) => <button key={n.tag} type="button" onClick={() => set("tag", f.tag === n.tag ? "" : n.tag)} className={cx("rounded-full px-2.5 py-1 text-[12.5px] transition", f.tag === n.tag ? "bg-accent text-white" : "bg-paper hover:bg-accent-soft/50")}>{n.tag} <span className="opacity-60 tnum">{n.n}</span></button>)}
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
              <p className="mt-2 text-[13.5px] text-ink-soft line-clamp-2 min-h-[38px]">{s.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[12px]">
                <span className="rounded-md bg-paper px-2 py-1 tnum">{prixCourt(s).replace(/^./, (c) => c.toUpperCase())}</span>
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
  useEffect(() => {
    setS(undefined); setLimite(null);
    supabase.rpc("saas_fiche", { ws: ws.id, d: domaine }).then(async ({ data, error }) => {
      if (error || !data) { setS(null); return; }
      if (data.limite) { setLimite(data); setS(null); return; }
      setS(data.saas); setRel(data.releves ?? []); setEv(data.evenements ?? []); setQuota(data.max ? { vues: data.vues, max: data.max } : null); setHist(data.histoire ?? null);
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

      {hist && <section className="mt-4"><Histoire h={hist} /></section>}
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
    supabase.from("saas_liste").select("nom, domaine, categorie, description, pays, prix_entree_eur").eq("domaine", d).maybeSingle().then(({ data }) => setSaas(data ?? null));
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
function Construire({ projet }) {
  const { ws } = useWs();
  const nav = useNavigate();
  const toast = useToast();
  const [app, setApp] = useState(undefined);
  const [ecran, setEcran] = useState("");
  const [demande, setDemande] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const charger = () => supabase.from("saas_apps").select("id, slug, statut, etape, erreur, spec, version, maj").eq("projet_id", projet.id).maybeSingle().then(({ data }) => { setApp(data ?? null); return data; });
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
    try { await fn("r/saas-app-modifier", { workspace_id: ws.id, app_id: app.id, ecran: ecran || "nouveau", demande }); setDemande(""); await charger(); toast("Modification lancée, une minute environ"); }
    catch (x) { toast(x.message, "bad"); } finally { setEnvoi(false); }
  };
  if (app === undefined) return null;
  const lien = app ? `${window.location.origin}${window.location.pathname}#/app/${app.slug}` : "";
  const pret = app?.spec?.ecrans?.length > 0;
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

      {pret && (
        <div className="mt-6 grid lg:grid-cols-[1fr_300px] gap-4">
          <div className="rounded-2xl overflow-hidden bg-white ring-1 ring-white/10">
            <div className="flex items-center gap-2 bg-[#E8E5DE] px-3 py-2"><span className="flex gap-1.5">{["#F87171", "#FBBF24", "#34D399"].map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}</span><span className="flex-1 truncate rounded-md bg-white px-2 py-0.5 text-[12px] text-ink-faint">{lien.replace(/^https?:\/\//, "")}</span></div>
            <Suspense fallback={<div className="h-[620px] grid place-items-center"><Spinner /></div>}><AppCadre slug={app.slug} spec={app.spec} version={app.version} className="block w-full h-[620px] border-0" apercu /></Suspense>
          </div>
          <form onSubmit={modifier} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3">
            <p className="font-bold">Modifier en une phrase</p>
            <select value={ecran} onChange={(e) => setEcran(e.target.value)} className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-[14px] outline-none">
              <option value="" className="text-ink">+ Ajouter un écran</option>
              {app.spec.ecrans.map((e) => <option key={e.id} value={e.id} className="text-ink">Changer « {e.titre} »{e.ok === false ? " (à corriger)" : ""}</option>)}
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
    </section>
  );
}

// ---------------------------------------------------------------- Carte du monde
function Carte() {
  const nav = useNavigate();
  const { ws } = useWs();
  const [data, setData] = useState(null);
  useEffect(() => { supabase.rpc("saas_carte", { ws: ws.id }).then(({ data: d }) => setData(d ?? [])); }, [ws.id]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[30px] font-black tracking-tight" style={HF}>Le monde des SaaS</h1>
      <p className="text-ink-soft">Chaque île est un continent, chaque bâtiment un pays : plus il est haut, plus il compte de SaaS. Débarque sur une île, puis entre dans un pays.</p>
      <div className="mt-4">
        <Suspense fallback={<div className="py-24 grid place-items-center"><Spinner /></div>}>
          {data ? <IsoMonde data={data} onVoir={(code, domaine) => nav(domaine ? `/explorer/${domaine}` : `/explorer?pays=${code}`)} /> : <div className="py-24 grid place-items-center"><Spinner /></div>}
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
