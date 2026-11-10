import { useEffect, useState } from "react";
import Logo from "../components/Logo";
import { cx } from "../lib/utils";

// « Ton marché SaaS » : le visiteur colle l'adresse de son logiciel, et voit ses concurrents côte à côte
// (prix d'entrée, version gratuite, recrutement, dernière nouveauté, outils du site). Sans compte, 2 rapports par jour.
const URL_ = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
async function call(action, body) {
  const res = await fetch(`${URL_}/functions/v1/r/${action}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || "Erreur réseau, réessaie");
  return data;
}
const HF = { fontFamily: "var(--font-titre)" };
const ETAPES = ["Lecture de ton site", "Recherche de tes concurrents", "Lecture de leurs prix", "Recrutement et nouveautés"];
const date = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : null;
const prixTxt = (l) => l.prix_entree != null ? `${l.prix_entree} ${l.devise || "€"}${l.periode === "an" ? "/an" : "/mois"}` : l.sur_devis ? "Sur devis" : "Non affiché";

export default function PublicMarche({ embedded = false, initial = null }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [r, setR] = useState(initial);
  const lancer = async (u) => {
    setBusy(true); setErr(""); setR(null);
    try { setR(await call("free-marche", { url: u })); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const go = (e) => { e.preventDefault(); lancer(url); };
  // Lien direct depuis la page d'accueil : /marche?u=monsaas.com lance le rapport tout de suite
  useEffect(() => {
    if (initial) return;
    const u = new URLSearchParams(window.location.hash.split("?")[1] ?? window.location.search.slice(1)).get("u");
    if (u) { setUrl(u); lancer(u); }
  }, []);
  const s = r?.synthese;
  const ecart = s?.ton_prix != null && s?.prix_median ? Math.round(((s.ton_prix - s.prix_median) / s.prix_median) * 100) : null;
  return (
    <div className={cx("bg-paper text-ink", !embedded && "min-h-screen")}>
      {!embedded && <header className="max-w-6xl mx-auto px-5 pt-6 flex items-center justify-between"><a href="#/accueil"><Logo /></a><a href="#/" className="text-[14px] font-semibold underline">Se connecter</a></header>}
      <main className="max-w-6xl mx-auto px-5 py-10">
        <p className="text-[13px] font-bold uppercase tracking-wide text-accent-dark">Pour les SaaS · gratuit, sans compte</p>
        <h1 className="mt-2 text-[34px] sm:text-[48px] font-black leading-[1.03] tracking-tight max-w-3xl" style={HF}>Vois ton marché en une minute.</h1>
        <p className="mt-3 text-[17px] text-ink-soft max-w-2xl">Colle l'adresse de ton logiciel : tes concurrents directs, leurs prix, qui recrute et qui vient de sortir une nouveauté. Tout est lu sur leurs sites, avec le lien.</p>
        <form onSubmit={go} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-2xl">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="monsaas.com" required className="flex-1 rounded-xl border border-line bg-white px-4 py-3.5 text-[16px] outline-none focus:border-ink" />
          <button disabled={busy} className="rounded-xl bg-accent text-white px-6 py-3.5 font-bold hover:bg-accent-dark disabled:opacity-60">{busy ? "Analyse en cours…" : "Voir mon marché"}</button>
        </form>
        {err && <p className="mt-3 max-w-2xl rounded-xl bg-[#FDF0EC] px-4 py-3 text-[14.5px] text-[#9A3412]">{err}</p>}
        {busy && (
          <ul className="mt-6 space-y-1.5 text-[14.5px] text-ink-soft">
            {ETAPES.map((t, i) => <li key={t} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: `${i * 250}ms` }} />{t}</li>)}
            <li className="text-ink-faint text-[13px]">Compte 30 à 60 secondes.</li>
          </ul>
        )}

        {r && (
          <section className="mt-10 rise">
            <p className="text-[14px] text-ink-soft">{r.moi.nom} · {r.moi.categorie} · rapport du {date(r.date)}</p>
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                [s.prix_median != null ? `${s.environ ? "≈ " : ""}${s.prix_median} €` : "—", "Prix d'entrée médian de tes concurrents", ecart != null ? `Toi : ${s.ton_prix} € par mois (${ecart > 0 ? "+" : ""}${ecart} %) · ${s.prix_lus} prix lus` : s.ton_prix == null ? "Ton prix n'est pas affiché" : `${s.prix_lus} prix lus`],
                [`${s.gratuits} / ${s.concurrents}`, "Ont une version gratuite", ""],
                [`${s.recrutent} / ${s.concurrents}`, "Recrutent en ce moment", "Signe qu'ils grossissent"],
                [`${s.actifs_30j} / ${s.concurrents}`, "Ont publié une nouveauté ce mois-ci", "Changelog ou blog"],
              ].map(([v, t, sub]) => (
                <div key={t} className="rounded-2xl bg-white border border-line p-4">
                  <p className="text-[28px] font-black leading-none tnum" style={HF}>{v}</p>
                  <p className="mt-2 text-[13.5px] font-semibold">{t}</p>
                  {sub && <p className="mt-0.5 text-[12.5px] text-ink-faint">{sub}</p>}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-white border border-line overflow-x-auto">
              <table className="w-full text-[14px] min-w-[860px]">
                <thead><tr className="text-left text-[12px] text-ink-faint border-b border-line">
                  <th className="px-4 py-3 font-medium">Logiciel</th><th className="px-3 py-3 font-medium">Prix d'entrée</th><th className="px-3 py-3 font-medium">Gratuit / essai</th>
                  <th className="px-3 py-3 font-medium">Recrute</th><th className="px-3 py-3 font-medium">Dernière nouveauté</th><th className="px-3 py-3 font-medium">Outils de son site</th>
                </tr></thead>
                <tbody>
                  {r.lignes.map((l) => (
                    <tr key={l.site} className={cx("border-b border-line last:border-0 align-top", l.moi && "bg-[#FFF7F3]")}>
                      <td className="px-4 py-3"><a href={l.site} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{l.nom}</a>{l.moi && <span className="ml-2 rounded-md bg-accent text-white px-1.5 py-0.5 text-[11px] font-bold">TOI</span>}<p className="text-[12px] text-ink-faint">{l.site.replace(/^https:\/\//, "")}</p></td>
                      <td className="px-3 py-3 tnum">{l.prix_url ? <a href={l.prix_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{prixTxt(l)}</a> : prixTxt(l)}{l.formules.length > 1 && <p className="text-[12px] text-ink-faint">{l.formules.length} formules</p>}</td>
                      <td className="px-3 py-3">{l.gratuit ? "Version gratuite" : l.essai ? (/\d/.test(l.essai) ? `Essai ${l.essai}` : "Essai gratuit") : <span className="text-ink-faint">Non</span>}</td>
                      <td className="px-3 py-3">{l.recrute.oui ? <a href={l.recrute.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#15803D] hover:underline">Oui{l.recrute.postes ? ` · ${l.recrute.postes} poste${l.recrute.postes > 1 ? "s" : ""}` : ""}</a> : l.recrute.url ? <span className="text-ink-faint">Pas d'offre lue</span> : <span className="text-ink-faint">Page introuvable</span>}</td>
                      <td className="px-3 py-3">{l.nouveaute.date ? <a href={l.nouveaute.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{date(l.nouveaute.date)}</a> : <span className="text-ink-faint">Non trouvée</span>}</td>
                      <td className="px-3 py-3 text-[12.5px] text-ink-soft">{l.outils.filter((o) => o.toLowerCase() !== l.nom.toLowerCase()).length ? l.outils.filter((o) => o.toLowerCase() !== l.nom.toLowerCase()).slice(0, 5).join(", ") : <span className="text-ink-faint">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12.5px] text-ink-faint">Concurrents trouvés par une IA sur le web, informations lues sur leurs propres sites ce jour. Une case vide veut dire que l'information n'est pas publiée, pas qu'elle n'existe pas.</p>

            <div className="mt-6 rounded-2xl bg-ink text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[19px] font-bold">Sois prévenu dès qu'un concurrent bouge.</p>
                <p className="mt-1 text-white/75 text-[15px]">Changement de prix, version gratuite, recrutement, nouveautés : chaque lundi dans ta boîte, avec Bingoo!.</p>
              </div>
              <a href="#/" className="shrink-0 inline-flex rounded-xl bg-accent px-6 py-3.5 font-bold hover:bg-accent-dark">Suivre mon marché</a>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
