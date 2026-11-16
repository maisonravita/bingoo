import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { cx } from "../lib/utils";
import { CarteAppli } from "./Cartes";

// Explorer → Applis mobiles : les applis de l'App Store (hors jeux), lues sans IA dans les données publiques d'Apple.
// Apple ne publie aucun revenu : le seul signal est le rang dans le classement « meilleures recettes » de sa catégorie.
const HF = { fontFamily: "var(--font-titre)" };
const TRIS = [["avis", "Les plus utilisées"], ["revenus", "Meilleures recettes"], ["note", "Les mieux notées"], ["recent", "Mises à jour récemment"]];
const nb = (n) => (n == null ? "—" : n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M` : n >= 1e3 ? `${(n / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k` : String(n));
const prixDe = (a) => (a.prix > 0 ? `${a.prix.toLocaleString("fr-FR")} ${a.devise === "USD" ? "$" : a.devise ?? ""}` : "Gratuite");

function Pastille({ on, onClick, children }) {
  return <button onClick={onClick} className={cx("rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold border", on ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-line hover:text-ink")}>{children}</button>;
}

export default function ApplisMobiles() {
  const [q, setQ] = useState("");
  const [cherche, setCherche] = useState("");
  const [tri, setTri] = useState("avis");
  const [cat, setCat] = useState("");
  const [abo, setAbo] = useState(false);
  const [cats, setCats] = useState([]);
  const [rows, setRows] = useState(undefined);
  const [page, setPage] = useState(0);
  useEffect(() => { supabase.rpc("saas_mobiles_categories").then(({ data }) => setCats(data ?? [])); }, []);
  useEffect(() => { const t = setTimeout(() => setCherche(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(0); }, [cherche, tri, cat, abo]);
  useEffect(() => {
    let vivant = true;
    setRows(undefined);
    supabase.rpc("saas_mobiles_liste", { p_q: cherche || null, p_categorie: cat || null, p_tri: tri, p_abonnement: abo ? true : null, p_offset: page * 30 })
      .then(({ data }) => vivant && setRows(data ?? []));
    return () => { vivant = false; };
  }, [cherche, tri, cat, abo, page]);
  const total = rows?.[0]?.total ?? 0;
  const totalBase = cats.reduce((s, c) => s + Number(c.n), 0);
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <p className="text-[12.5px] font-bold tracking-wider text-accent-dark">APPLIS MOBILES</p>
      <h1 className="text-[34px] font-black leading-tight tracking-tight" style={HF}>{totalBase ? `${totalBase.toLocaleString("fr-FR")} applis` : "Les applis"} pour trouver ton idée.</h1>
      <p className="mt-1 text-ink-soft max-w-3xl">Les applis de l'App Store (hors jeux), avec leur note, leur nombre d'avis et leur prix, relevés chaque semaine chez Apple. Apple ne publie pas les revenus : « Meilleures recettes » classe les applis selon leur meilleur rang dans le classement des recettes de leur catégorie.</p>

      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une appli, un éditeur, un usage (calories, factures, méditation…)" className="flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-[15px]" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2.5 text-[14.5px]">
          <option value="">Toutes les catégories</option>
          {cats.map((c) => <option key={c.categorie} value={c.categorie}>{c.categorie} ({Number(c.n).toLocaleString("fr-FR")})</option>)}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TRIS.map(([k, l]) => <Pastille key={k} on={tri === k} onClick={() => setTri(k)}>{l}</Pastille>)}
        <Pastille on={abo} onClick={() => setAbo(!abo)}>Avec abonnement</Pastille>
      </div>

      {rows === undefined ? <p className="py-16 text-center text-ink-soft">Chargement…</p>
        : !rows.length ? <p className="py-16 text-center text-ink-soft">{totalBase ? "Aucune appli ne correspond. Essaie un autre mot." : "Les applis arrivent : Bingoo! relève en ce moment l'App Store. Reviens dans quelques heures."}</p>
        : (
          <>
            <p className="mt-4 text-[13px] text-ink-faint">{Number(total).toLocaleString("fr-FR")} applis</p>
            <div className="mt-2 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {rows.map((a) => <CarteAppli key={a.id} a={a} />)}
            </div>
            <div className="mt-5 flex justify-center gap-2">
              {page > 0 && <button onClick={() => setPage(page - 1)} className="rounded-xl border border-line bg-white px-4 py-2 font-semibold">Précédentes</button>}
              {(page + 1) * 30 < total && page < 160 && <button onClick={() => setPage(page + 1)} className="rounded-xl bg-ink text-white px-4 py-2 font-semibold">Suivantes</button>}
            </div>
          </>
        )}
    </div>
  );
}
