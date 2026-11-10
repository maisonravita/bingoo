import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Spinner, useToast } from "../components/ui";
import CompanyLogo from "../components/CompanyLogo";
import { LineChart } from "../components/Charts";
import { cx } from "../lib/utils";

// Explorer : la base de SaaS de Bingoo! (le « TrendTrack des SaaS »). Liste filtrable, puis fiche détaillée par logiciel.
// Toutes les informations sont lues sur les sites des logiciels eux-mêmes, avec l'adresse de la page et la date du relevé.
const HF = { fontFamily: "var(--font-titre)" };
export const CATEGORIES = ["CRM et ventes", "Prospection et emailing", "Marketing et SEO", "Réseaux sociaux et contenu", "Facturation et comptabilité", "Paie et RH", "Recrutement", "Gestion de projet", "Collaboration et documents", "Support client", "E-commerce", "Paiement et finance", "Juridique", "Immobilier", "Santé", "Éducation et formation", "Commerce et restauration", "Logistique et transport", "Développeurs et no-code", "Données et analytics", "Sécurité et conformité", "IA et automatisation", "Événements", "BTP et artisans", "Agences et freelances", "Autre"];
const PAYS = { FR: "France", BE: "Belgique", CH: "Suisse", DE: "Allemagne", ES: "Espagne", IT: "Italie", GB: "Royaume-Uni", NL: "Pays-Bas", PT: "Portugal", IE: "Irlande", SE: "Suède", DK: "Danemark", PL: "Pologne", AT: "Autriche", US: "États-Unis", CA: "Canada", AU: "Australie", IN: "Inde", IL: "Israël" };
const drapeau = (c) => c && /^[A-Z]{2}$/.test(c) ? String.fromCodePoint(...[...c].map((x) => 127397 + x.charCodeAt(0))) : "";
const date = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : null;
const TRIS = [["score_croissance", "En croissance"], ["postes", "Qui recrutent le plus"], ["nouveaute", "Nouveautés récentes"], ["prix_entree_eur", "Prix d'entrée"], ["created_at", "Ajoutés récemment"]];
const PAGE = 48;

export default function Explorer({ domaine: fixe }) {
  const { domaine } = useParams();
  const d = fixe ?? domaine;
  if (d === "bouge") return <><Onglets actif="bouge" /><Fil /></>;
  if (d === "suivis") return <><Onglets actif="suivis" /><Suivis /></>;
  if (d === "marche") return <><Onglets actif="marche" /><Marche /></>;
  if (d === "comparer") return <Comparer />;
  return d ? <Fiche domaine={d} /> : <><Onglets actif="liste" /><Liste /></>;
}

function Onglets({ actif }) {
  const nav = useNavigate();
  const T = [["liste", "SaaS", "/explorer"], ["suivis", "Mes suivis", "/explorer/suivis"], ["bouge", "Ce qui a bougé", "/explorer/bouge"], ["marche", "Pays et tendances", "/explorer/marche"]];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
      <div className="inline-flex rounded-xl bg-white border border-line p-1">
        {T.map(([k, l, to]) => <button key={k} onClick={() => nav(to)} className={cx("rounded-lg px-4 py-2 text-[14px] font-semibold transition", actif === k ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}>{l}</button>)}
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
  const [f, setF] = useState({ q: "", categorie: "", pays: "", prixMax: "", gratuit: false, recrute: false, actif: false, tri: "score_croissance" });
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
    let q = supabase.from("saas_liste").select("id, domaine, nom, categorie, description, pays, prix_entree_eur, gratuit, essai, sur_devis, recrute, postes, nouveaute, score_croissance, lu_at", { count: "exact" });
    if (f.q.trim()) q = q.or(`nom.ilike.%${f.q.trim().replace(/[%,()]/g, "")}%,domaine.ilike.%${f.q.trim().replace(/[%,()]/g, "")}%,description.ilike.%${f.q.trim().replace(/[%,()]/g, "")}%`);
    if (f.categorie) q = q.eq("categorie", f.categorie);
    if (f.pays) q = q.eq("pays", f.pays);
    if (f.prixMax) q = q.lte("prix_entree_eur", Number(f.prixMax));
    if (f.gratuit) q = q.eq("gratuit", true);
    if (f.recrute) q = q.eq("recrute", true);
    if (f.actif) q = q.gte("nouveaute", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
    q = q.order(f.tri, { ascending: f.tri === "prix_entree_eur", nullsFirst: false }).order("nom").range(page * PAGE, page * PAGE + PAGE - 1);
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

      <div className="mt-5 rounded-2xl bg-white border border-line p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Rechercher un logiciel, un usage…" className="flex-1 min-w-[220px] rounded-xl border border-line px-3 py-2.5 text-[14px] outline-none focus:border-ink" />
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
      </div>

      <p className="mt-4 text-[13px] text-ink-faint">{rows ? `${total.toLocaleString("fr-FR")} résultat${total > 1 ? "s" : ""}` : ""}</p>
      {!rows ? <div className="py-20 grid place-items-center"><Spinner /></div> : !rows.length ? (
        <p className="py-16 text-center text-ink-soft">Aucun SaaS ne correspond. Élargis les filtres, ou ajoute le logiciel que tu cherches.</p>
      ) : (
        <div className="mt-2 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((s) => (
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
                <span className="rounded-md bg-paper px-2 py-1 tnum">{s.prix_entree_eur != null ? `dès ${s.prix_entree_eur} €/mois` : s.sur_devis ? "Sur devis" : "Prix non affiché"}</span>
                {s.gratuit && <span className="rounded-md bg-paper px-2 py-1">Gratuit</span>}
                {!s.gratuit && s.essai && <span className="rounded-md bg-paper px-2 py-1">Essai</span>}
                {s.recrute && <span className="rounded-md bg-[#DCFCE7] text-[#166534] px-2 py-1">Recrute{s.postes ? ` · ${s.postes}` : ""}</span>}
                {s.nouveaute && Date.parse(s.nouveaute) > Date.now() - 30 * 864e5 && <span className="rounded-md bg-accent-soft text-accent-dark px-2 py-1">Nouveauté {date(s.nouveaute)}</span>}
              </div>
              <div className="h-5" />
            </div>
          ))}
        </div>
      )}
      {sel.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 rounded-2xl bg-ink text-white shadow-xl px-4 py-3 flex items-center gap-3">
          <span className="text-[14px]">{sel.length} SaaS sélectionné{sel.length > 1 ? "s" : ""} (4 au plus)</span>
          <button disabled={sel.length < 2} onClick={() => nav(`/explorer/comparer?d=${sel.join(",")}`)} className="rounded-lg bg-accent px-4 py-2 text-[14px] font-bold disabled:opacity-50">Comparer</button>
          <button onClick={() => setSel([])} className="text-[13px] text-white/70 hover:text-white">Effacer</button>
        </div>
      )}
      {total > PAGE && (
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
  useEffect(() => {
    setS(undefined); setLimite(null);
    supabase.rpc("saas_fiche", { ws: ws.id, d: domaine }).then(async ({ data, error }) => {
      if (error || !data) { setS(null); return; }
      if (data.limite) { setLimite(data); setS(null); return; }
      setS(data.saas); setRel(data.releves ?? []); setEv(data.evenements ?? []); setQuota(data.max ? { vues: data.vues, max: data.max } : null);
      const { data: o } = await supabase.from("saas_liste").select("id, domaine, nom, pays, prix_entree_eur, score_croissance").eq("categorie", data.saas.categorie).neq("id", data.saas.id).order("score_croissance", { ascending: false, nullsFirst: false }).limit(6);
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
        </div>
        <BoutonSuivre saasId={s.id} />
        <div className="rounded-2xl bg-white border border-line px-5 py-3 text-center">
          <p className="text-[12px] text-ink-faint">Score de croissance</p>
          <p className="text-[34px] font-black tnum leading-none mt-1" style={HF}>{s.score_croissance ?? "—"}</p>
          <p className="text-[11.5px] text-ink-faint mt-1">recrutement · nouveautés</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Prix d'entrée", s.prix_entree_eur != null ? `${s.prix_entree_eur} €/mois` : s.sur_devis ? "Sur devis" : "Non affiché", s.prix_affiche && s.devise !== "€" ? `affiché ${s.prix_affiche}` : "", s.liens?.prix],
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
          <h2 className="mt-6 font-bold">Outils de son site</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">{(s.outils ?? []).filter((o) => o.toLowerCase() !== (s.nom ?? "").toLowerCase()).map((o) => <span key={o} className="rounded-md bg-paper px-2 py-1 text-[12.5px]">{o}</span>)}{!(s.outils ?? []).length && <span className="text-[13.5px] text-ink-faint">Aucun repéré</span>}</div>
          <p className="mt-6 text-[12px] text-ink-faint">Relevé du {date(s.lu_at)}. Informations lues sur le site du logiciel.</p>
        </section>
      </div>

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
                <div className="min-w-0 flex-1"><p className="font-semibold text-[14px] truncate">{o.nom} {drapeau(o.pays)}</p><p className="text-[12.5px] text-ink-faint">{o.prix_entree_eur != null ? `dès ${o.prix_entree_eur} €/mois` : "prix non affiché"}</p></div>
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
                <div className="flex items-baseline justify-between gap-2"><p className="font-semibold text-[13.5px] truncate">{s.label}</p>{s.evolution_3m != null && <span className={cx("text-[12.5px] font-bold tnum", s.evolution_3m >= 0 ? "text-[#15803D]" : "text-[#B91C1C]")}>{s.evolution_3m > 0 ? "+" : ""}{s.evolution_3m} %</span>}</div>
                <p className="text-[12px] text-ink-faint">{s.dernier} créations le mois dernier · sur 3 mois</p>
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
    ["Prix d'entrée", (s) => s.prix_entree_eur != null ? `${s.prix_entree_eur} €/mois` : s.sur_devis ? "Sur devis" : "Non affiché"],
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
    if (error) { toast("Impossible pour l'instant, réessaie", "bad"); return; }
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
  const charger = () => supabase.rpc("saas_mes_suivis", { ws: ws.id, jours: 30 }).then(({ data }) => setR(data ?? { saas: [], categories: [], fil: [] }));
  useEffect(() => { charger(); }, [ws.id]);
  const retirerCat = async (c) => { await supabase.from("saas_suivis").delete().eq("workspace_id", ws.id).eq("categorie", c); charger(); };
  if (!r) return <div className="py-24 grid place-items-center"><Spinner /></div>;
  const vide = !r.saas.length && !r.categories.length;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-[30px] font-black tracking-tight" style={HF}>Mes suivis</h1>
      <p className="text-ink-soft">Les SaaS et les catégories que tu suis. Chaque lundi matin, un e-mail résume ce qui a bougé.</p>
      {vide ? (
        <div className="mt-6 rounded-2xl bg-white border border-line p-6">
          <p className="font-semibold">Tu ne suis encore rien.</p>
          <p className="mt-1 text-ink-soft text-[14.5px]">Ouvre la fiche d'un concurrent et clique sur « Suivre », ou choisis une catégorie dans la liste puis « Suivre la catégorie ».</p>
          <button onClick={() => nav("/explorer")} className="mt-4 rounded-xl bg-ink text-white px-4 py-2.5 text-[14px] font-semibold">Parcourir les SaaS</button>
        </div>
      ) : (
        <div className="mt-5 grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <section className="rounded-2xl bg-white border border-line p-5">
              <h2 className="font-bold">Ce qui a bougé ces 30 derniers jours</h2>
              {r.fil.length ? (
                <ul className="mt-3 divide-y divide-line">{r.fil.map((e, i) => (
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
              <h2 className="font-bold">SaaS suivis ({r.saas.length})</h2>
              <ul className="mt-3 space-y-2">{r.saas.map((s) => (
                <li key={s.id} onClick={() => nav(`/explorer/${s.domaine}`)} className="flex items-center gap-3 cursor-pointer rounded-xl border border-line px-3 py-2 hover:border-ink-faint">
                  <CompanyLogo name={s.nom} url={`https://${s.domaine}`} className="w-8 h-8" />
                  <div className="min-w-0 flex-1"><p className="font-semibold text-[14px] truncate">{s.nom} {drapeau(s.pays)}</p><p className="text-[12px] text-ink-faint">{s.prix_entree_eur != null ? `dès ${s.prix_entree_eur} €/mois` : s.sur_devis ? "sur devis" : "prix non affiché"}{s.recrute ? ` · recrute${s.postes ? ` ${s.postes}` : ""}` : ""}</p></div>
                  {s.changements > 0 && <span className="rounded-md bg-accent-soft text-accent-dark px-2 py-0.5 text-[12px] font-bold">{s.changements}</span>}
                </li>
              ))}{!r.saas.length && <li className="text-[13.5px] text-ink-faint">Aucun SaaS suivi.</li>}</ul>
            </section>
            <section className="rounded-2xl bg-white border border-line p-5">
              <h2 className="font-bold">Catégories suivies</h2>
              <div className="mt-3 flex flex-wrap gap-2">{r.categories.map((c) => (
                <span key={c} className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-[13px]">{c}<button onClick={() => retirerCat(c)} title="Ne plus suivre" className="text-ink-faint hover:text-ink">✕</button></span>
              ))}{!r.categories.length && <span className="text-[13.5px] text-ink-faint">Aucune catégorie suivie.</span>}</div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
