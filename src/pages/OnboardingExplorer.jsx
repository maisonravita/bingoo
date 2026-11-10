import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";

// Inscription du TrendTrack des SaaS : une seule question, l'adresse de ton SaaS.
// Bingoo! lit ton site, trouve tes concurrents, les lit à leur tour, puis les suit pour toi (alerte du lundi).
// Sans SaaS (tu cherches une idée) : direction les idées et réussites.
const HF = { fontFamily: "var(--font-titre)" };
const ETAPES = ["Lecture de ton site", "Recherche de tes concurrents", "Lecture de leurs prix et de leurs offres d'emploi", "Mise en place du suivi"];

export default function OnboardingExplorer() {
  const { ws, create, reload } = useWs();
  const nav = useNavigate();
  const [site, setSite] = useState((ws?.website ?? "").replace(/^https?:\/\//i, "").replace(/\/$/, ""));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [r, setR] = useState(null);

  // Crée l'espace s'il n'existe pas encore, puis le marque comme prêt (mode Explorer)
  const espace = async (website = "") => ws?.id ?? (await create("", website));
  const terminer = async (id, vers, nom = "") => {
    const profile = { ...(ws?.profile ?? {}), mode: "explorer", type: "saas", ...(nom ? { nom } : {}) };
    await supabase.from("workspaces").update({ onboarded: true, profile, ...(nom && !ws?.name ? { name: nom } : {}) }).eq("id", id);
    await reload();
    nav(vers);
  };

  const lancer = async (e) => {
    e.preventDefault();
    const u = site.trim().replace(/^https?:\/\//i, "");
    if (!u) return;
    setBusy(true); setErr("");
    try {
      const id = await espace(u);
      setR({ id, ...(await fn("r/saas-demarrer", { workspace_id: id, url: u })) });
    } catch (x) { setErr(x.message || "Erreur, réessaie"); } finally { setBusy(false); }
  };
  const sansSaas = async () => { setBusy(true); try { await terminer(await espace(), "/explorer/idees"); } catch (x) { setErr(x.message); setBusy(false); } };

  return (
    <div className="min-h-full bg-paper text-ink">
      <header className="max-w-3xl mx-auto px-5 pt-6 flex items-center justify-between"><Logo /><button onClick={() => supabase.auth.signOut()} className="text-[14px] text-ink-soft hover:text-ink">Se déconnecter</button></header>
      <main className="max-w-3xl mx-auto px-5 py-12">
        {!r ? (
          <>
            <p className="text-[13px] font-bold uppercase tracking-wide text-accent-dark">Bienvenue sur Bingoo!</p>
            <h1 className="mt-2 text-[34px] sm:text-[46px] font-black leading-[1.05] tracking-tight" style={HF}>Quel est ton SaaS ?</h1>
            <p className="mt-3 text-[17px] text-ink-soft">Bingoo! lit ton site, trouve tes concurrents directs et les suit pour toi. Chaque lundi, tu sauras ce qui a bougé chez eux.</p>
            <form onSubmit={lancer} className="mt-7 flex flex-col sm:flex-row gap-2">
              <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="monsaas.com" inputMode="url" autoFocus required disabled={busy} className="flex-1 rounded-xl border border-line bg-white px-4 py-3.5 text-[17px] outline-none focus:border-ink" />
              <button disabled={busy} className="rounded-xl bg-accent text-white px-7 py-3.5 font-bold hover:bg-accent-dark disabled:opacity-60">{busy ? "Analyse en cours…" : "Voir mon marché"}</button>
            </form>
            {err && <p className="mt-3 rounded-xl bg-[#FDF0EC] px-4 py-3 text-[14.5px] text-[#9A3412]">{err} <button onClick={async () => { setBusy(true); await terminer(await espace(site.trim()), "/explorer"); }} className="ml-1 font-semibold underline">Continuer sans</button></p>}
            {busy ? (
              <ul className="mt-6 space-y-1.5 text-[14.5px] text-ink-soft">
                {ETAPES.map((t, i) => <li key={t} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: `${i * 250}ms` }} />{t}</li>)}
                <li className="text-ink-faint text-[13px]">Compte une minute environ.</li>
              </ul>
            ) : (
              <button onClick={sansSaas} className="mt-6 text-[15px] font-semibold underline decoration-accent/50 decoration-2 underline-offset-4">Je n'ai pas encore de SaaS : montre-moi les idées qui marchent</button>
            )}
          </>
        ) : (
          <>
            <p className="text-[13px] font-bold uppercase tracking-wide text-accent-dark">C'est prêt</p>
            <h1 className="mt-2 text-[32px] sm:text-[42px] font-black leading-[1.05] tracking-tight" style={HF}>{r.concurrents.length ? `Tu suis ${r.concurrents.length} concurrent${r.concurrents.length > 1 ? "s" : ""} de ${r.moi.nom}.` : `${r.moi.nom} est dans la base.`}</h1>
            <p className="mt-3 text-[17px] text-ink-soft">Et toute la catégorie « {r.moi.categorie} ». Chaque lundi, un e-mail te dit ce qui a changé : prix, recrutements, nouveautés, nouveaux arrivants.</p>
            {r.concurrents.length > 0 && (
              <ul className="mt-6 grid sm:grid-cols-2 gap-2">
                {r.concurrents.map((c) => (
                  <li key={c.domaine} className="rounded-xl bg-white border border-line px-4 py-3 flex items-center justify-between gap-3">
                    <span className="min-w-0"><span className="font-semibold">{c.nom}</span><span className="block text-[12.5px] text-ink-faint truncate">{c.domaine}</span></span>
                    <span className={cx("shrink-0 text-[13px] tnum", c.prix_entree_eur != null ? "text-ink" : "text-ink-faint")}>{c.prix_entree_eur != null ? `dès ${c.prix_entree_eur} €/mois` : "prix non affiché"}</span>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => terminer(r.id, "/explorer/suivis", r.moi.nom)} className="mt-8 rounded-xl bg-ink text-white px-7 py-3.5 font-bold hover:bg-black">Ouvrir Explorer</button>
          </>
        )}
      </main>
    </div>
  );
}
