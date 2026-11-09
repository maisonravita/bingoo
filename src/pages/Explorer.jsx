import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  return d ? <Fiche domaine={d} /> : <Liste />;
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
  const set = (k, v) => { setPage(0); setF((x) => ({ ...x, [k]: v })); };

  useEffect(() => {
    let q = supabase.from("saas").select("id, domaine, nom, categorie, description, pays, prix_entree_eur, gratuit, essai, sur_devis, recrute, postes, nouveaute, score_croissance, lu_at", { count: "exact" }).eq("statut", "ok");
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
    supabase.from("saas").select("categorie, pays, recrute, gratuit").eq("statut", "ok").limit(5000).then(({ data }) => {
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
        </div>
      </div>

      <p className="mt-4 text-[13px] text-ink-faint">{rows ? `${total.toLocaleString("fr-FR")} résultat${total > 1 ? "s" : ""}` : ""}</p>
      {!rows ? <div className="py-20 grid place-items-center"><Spinner /></div> : !rows.length ? (
        <p className="py-16 text-center text-ink-soft">Aucun SaaS ne correspond. Élargis les filtres, ou ajoute le logiciel que tu cherches.</p>
      ) : (
        <div className="mt-2 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((s) => (
            <button key={s.id} type="button" onClick={() => nav(`/explorer/${s.domaine}`)} className="text-left rounded-2xl bg-white border border-line p-4 hover:border-ink-faint hover:shadow-sm transition">
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
            </button>
          ))}
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
  const [s, setS] = useState(undefined);
  const [rel, setRel] = useState([]);
  const [sim, setSim] = useState([]);
  useEffect(() => {
    setS(undefined);
    supabase.from("saas").select("*").eq("domaine", domaine).maybeSingle().then(async ({ data }) => {
      setS(data ?? null);
      if (!data) return;
      const [{ data: r }, { data: o }] = await Promise.all([
        supabase.from("saas_releves").select("at, prix_entree_eur, postes, recrute, nouveaute").eq("saas_id", data.id).order("at"),
        supabase.from("saas").select("id, domaine, nom, pays, prix_entree_eur, score_croissance").eq("statut", "ok").eq("categorie", data.categorie).neq("id", data.id).order("score_croissance", { ascending: false, nullsFirst: false }).limit(6),
      ]);
      setRel(r ?? []); setSim(o ?? []);
    });
  }, [domaine]);
  const prixPts = useMemo(() => rel.filter((r) => r.prix_entree_eur != null).map((r) => ({ v: r.prix_entree_eur, label: new Date(r.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) })), [rel]);
  const postesPts = useMemo(() => rel.filter((r) => r.postes != null).map((r) => ({ v: r.postes, label: new Date(r.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) })), [rel]);
  if (s === undefined) return <div className="py-24 grid place-items-center"><Spinner /></div>;
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
