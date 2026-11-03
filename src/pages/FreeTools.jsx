import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { Button, Input } from "../components/ui";
import { cx } from "../lib/utils";

// Outils gratuits, sans compte : la porte d'entrée de Bingoo!. Le visiteur voit 3 résultats, le reste demande un compte.
const URL_ = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
async function call(action, body) {
  const res = await fetch(`${URL_}/functions/v1/r/${action}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || "Erreur réseau, réessaie");
  return data;
}
const NUNITO = { fontFamily: "Nunito, Geist, system-ui, sans-serif" };
const euro = (n) => n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : n >= 1e3 ? `${Math.round(n / 1e3).toLocaleString("fr-FR")} k€` : `${Math.round(n)} €`;
const TOOLS = [
  ["/outils/contrats-publics", "Contrats publics qui se terminent", "Les marchés de ton secteur à renouveler dans les 12 mois, avec le titulaire actuel."],
  ["/outils/analyse-concurrent", "Analyse express d'un concurrent", "Ce qu'il vend, à qui, ses prix, et ses points faibles."],
];

function Shell({ children }) {
  const nav = useNavigate();
  return (
    <div className="min-h-full bg-paper">
      <header className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => nav("/outils")} aria-label="Outils gratuits Bingoo!"><Logo height={28} /></button>
        <Button size="sm" variant="accent" onClick={() => nav("/")}>Créer mon compte</Button>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">{children}</main>
    </div>
  );
}

/** Ce qui reste caché : flouté, avec l'invitation à créer un compte. */
function Locked({ items, label }) {
  const nav = useNavigate();
  return (
    <div className="relative mt-3 rounded-2xl border border-line bg-white overflow-hidden">
      <ul className="p-5 space-y-3 blur-[5px] select-none" aria-hidden>{items.map((t, i) => <li key={i} className="text-[14px]"><b>{t}</b><br /><span className="text-ink-soft">Détail réservé aux comptes Bingoo! : informations complètes et sourcées.</span></li>)}</ul>
      <div className="absolute inset-0 grid place-items-center bg-white/40">
        <div className="text-center px-4">
          <p className="font-bold text-[16px]">{label}</p>
          <Button className="mt-3" variant="accent" onClick={() => nav("/")}>Créer mon compte gratuit</Button>
        </div>
      </div>
    </div>
  );
}

function Renewals() {
  const [f, setF] = useState({ secteur: "", dept: "" });
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e) => { e.preventDefault(); setBusy(true); setErr(""); setR(null); try { setR(await call("free-renewals", f)); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return (
    <>
      <h1 className="font-black text-[34px] sm:text-[44px] leading-[1.05] tracking-tight" style={NUNITO}>Quels contrats publics de ton secteur se terminent bientôt ?</h1>
      <p className="text-ink-soft text-[16px] mt-3 max-w-2xl">Les marchés attribués par les collectivités, hôpitaux et administrations de ton département, qui arrivent à échéance dans les 12 mois. Données officielles de la commande publique.</p>
      <form onSubmit={go} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-2xl">
        <Input value={f.secteur} onChange={(e) => setF({ ...f, secteur: e.target.value })} placeholder="Ton activité (ex. nettoyage)" className="flex-1" />
        <Input value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })} placeholder="Département (ex. 75)" className="sm:!w-44" maxLength={3} />
        <Button type="submit" variant="accent" loading={busy}>Chercher</Button>
      </form>
      {err && <p className="mt-3 text-bad text-sm">{err}</p>}
      {r && (
        <section className="mt-8">
          <p className="text-[17px]"><b className="text-[26px] font-black" style={NUNITO}>{r.total}</b> contrat{r.total > 1 ? "s" : ""} « {r.secteur} » se termine{r.total > 1 ? "nt" : ""} dans les 12 mois dans le {r.dept}{r.montant_total ? <>, pour <b>{euro(r.montant_total)}</b> au total</> : null}.</p>
          {!r.total && <p className="text-ink-soft mt-2">Essaie un mot plus large (ex. « entretien » au lieu de « vitrerie ») ou un autre département.</p>}
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            {r.visibles.map((c, i) => (
              <div key={i} className="rounded-2xl border border-line bg-white p-4">
                <p className="text-[12px] font-bold uppercase tracking-wider text-accent-dark">Fin estimée {new Date(c.fin).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
                <p className="font-bold mt-1.5 leading-snug">{c.acheteur}</p>
                <p className="text-[13.5px] text-ink-soft mt-1 line-clamp-3">{c.objet}</p>
                <p className="text-[13px] mt-2">{c.montant ? <b>{euro(c.montant)}</b> : null}{c.titulaire ? <span className="text-ink-soft">{c.montant ? " · " : ""}titulaire : {c.titulaire}</span> : null}</p>
              </div>
            ))}
          </div>
          {r.caches > 0 && <Locked items={["Les " + r.caches + " autres contrats", "Le contact du service achats de chaque acheteur", "Les prix gagnants et les concurrents titulaires", "Une alerte chaque semaine"]} label={`${r.caches} autre${r.caches > 1 ? "s" : ""} contrat${r.caches > 1 ? "s" : ""}, avec le contact de l'acheteur`} />}
        </section>
      )}
    </>
  );
}

function Competitor() {
  const [url, setUrl] = useState("");
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e) => { e.preventDefault(); setBusy(true); setErr(""); setR(null); try { setR(await call("free-competitor", { url })); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return (
    <>
      <h1 className="font-black text-[34px] sm:text-[44px] leading-[1.05] tracking-tight" style={NUNITO}>Analyse gratuite de ton concurrent</h1>
      <p className="text-ink-soft text-[16px] mt-3 max-w-2xl">Donne l'adresse de son site : Bingoo! te dit ce qu'il vend, à qui, à quel prix, et où il est attaquable.</p>
      <form onSubmit={go} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-2xl">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="concurrent.fr" className="flex-1" />
        <Button type="submit" variant="accent" loading={busy}>{busy ? "Analyse… (20 s)" : "Analyser"}</Button>
      </form>
      {err && <p className="mt-3 text-bad text-sm">{err}</p>}
      {r && (
        <section className="mt-8">
          <p className="text-[22px] font-black" style={NUNITO}>{r.nom} <span className="text-[14px] font-medium text-ink-faint">{r.site}</span></p>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            {r.visibles.map((c) => <div key={c.titre} className="rounded-2xl border border-line bg-white p-4"><p className="text-[12px] font-bold uppercase tracking-wider text-accent-dark">{c.titre}</p><p className="mt-1.5 text-[14px] leading-snug">{c.texte}</p></div>)}
          </div>
          {r.outils?.length > 0 && <p className="mt-3 text-[13px] text-ink-soft">Outils repérés sur son site : {r.outils.join(", ")}</p>}
          <Locked items={r.caches} label="Ses points faibles et l'angle pour lui prendre des clients" />
        </section>
      )}
    </>
  );
}

export default function FreeTools() {
  const loc = useLocation();
  const nav = useNavigate();
  const page = loc.pathname.replace(/\/$/, "");
  return (
    <Shell>
      {page === "/outils/contrats-publics" ? <Renewals /> : page === "/outils/analyse-concurrent" ? <Competitor /> : (
        <>
          <h1 className="font-black text-[34px] sm:text-[44px] leading-[1.05] tracking-tight" style={NUNITO}>Outils gratuits pour trouver tes prochains clients</h1>
          <p className="text-ink-soft text-[16px] mt-3">Sans compte, en quelques secondes.</p>
        </>
      )}
      <div className={cx("grid sm:grid-cols-2 gap-3", page === "/outils" ? "mt-8" : "mt-14")}>
        {TOOLS.filter(([p]) => p !== page).map(([p, t, d]) => (
          <button key={p} onClick={() => nav(p)} className="text-left rounded-2xl border border-line bg-white p-5 hover:border-ink-faint transition">
            <p className="font-bold text-[16px]">{t} →</p><p className="text-[13.5px] text-ink-soft mt-1">{d}</p>
          </button>
        ))}
      </div>
      <p className="mt-10 text-[13px] text-ink-faint">Bingoo! — ton équipe commerciale IA : elle détecte qui va acheter, trouve le bon interlocuteur et prospecte jusqu'au rendez-vous.</p>
    </Shell>
  );
}
