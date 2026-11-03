import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { legalReady } from "./Legal";
import { cx } from "../lib/utils";

// Page d'accueil publique de Bingoo! : la promesse, et l'essai immédiat sans compte (contrats publics qui se terminent).
const URL_ = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
async function call(action, body) {
  const res = await fetch(`${URL_}/functions/v1/r/${action}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || "Erreur réseau, réessaie");
  return data;
}
const D = { fontFamily: "Nunito, Geist, system-ui, sans-serif" };
const euro = (n) => n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : n >= 1e3 ? `${Math.round(n / 1e3).toLocaleString("fr-FR")} k€` : `${Math.round(n)} €`;
const scrollTo = (id) => (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
const Check = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;

// Signaux qui flottent autour du titre : ce que le Radar repère vraiment
const FLOAT = [
  ["Contrat public à renouveler", "left-[4%] top-[24%]", "#F97316"], ["Nouveau dirigeant", "left-[9%] top-[52%]", "#EF4444"], ["Recrute 3 commerciaux", "left-[3%] top-[78%]", "#22C55E"],
  ["A visité ta page tarifs", "right-[4%] top-[20%]", "#EF4444"], ["Déménagement du siège", "right-[8%] top-[48%]", "#3B82F6"], ["Cliente d'un concurrent", "right-[3%] top-[76%]", "#F97316"],
];

/** Essai sans compte : les contrats publics du métier qui se terminent dans les 12 mois. */
function TryIt() {
  const nav = useNavigate();
  const [f, setF] = useState({ secteur: "", dept: "" });
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e) => { e.preventDefault(); setBusy(true); setErr(""); setR(null); try { setR(await call("free-renewals", f)); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[#16171B] text-white p-5 sm:p-8 text-left shadow-[0_40px_80px_-40px_rgba(21,22,26,.7)]">
      <div aria-hidden className="pointer-events-none absolute -right-28 -top-28 h-[440px] w-[440px] rounded-full">
        <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 0deg, transparent 0 300deg, rgba(242,120,52,.35) 359deg, transparent 360deg)", animation: "kspin 7s linear infinite" }} />
        {[0, 1, 2, 3].map((k) => <div key={k} className="absolute rounded-full border border-white/10" style={{ inset: `${k * 14}%` }} />)}
      </div>
      <div className="relative grid grid-cols-1 lg:grid-cols-[.85fr_1.15fr] gap-6 lg:gap-10 items-start [&>*]:min-w-0">
        <div>
          <p className="font-black text-[24px] sm:text-[28px] leading-tight" style={D}>Teste le Radar sur ton marché</p>
          <p className="text-[14.5px] text-white/65 mt-2">Les contrats publics de ton métier qui se terminent dans les 12 mois, dans ton département. Données officielles, résultat en quelques secondes, sans compte.</p>
          <form onSubmit={go} className="mt-5 grid grid-cols-[minmax(0,1fr)_92px] gap-2">
            <label className="sr-only" htmlFor="tr-secteur">Ton métier</label>
            <input id="tr-secteur" value={f.secteur} onChange={(e) => setF({ ...f, secteur: e.target.value })} placeholder="Ton métier (ex. nettoyage)" className="rounded-xl bg-white/10 border border-white/15 px-3.5 py-3 text-[15px] placeholder:text-white/40 outline-none focus:border-[#F27834]" />
            <label className="sr-only" htmlFor="tr-dept">Département</label>
            <input id="tr-dept" value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })} placeholder="Dép." maxLength={3} className="rounded-xl bg-white/10 border border-white/15 px-3.5 py-3 text-[15px] placeholder:text-white/40 outline-none focus:border-[#F27834]" />
            <button type="submit" disabled={busy} className="col-span-2 rounded-xl bg-accent hover:bg-accent-dark disabled:opacity-60 py-3 font-bold text-[15px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{busy ? "Le Radar cherche…" : "Voir les contrats qui se terminent"}</button>
          </form>
          {err && <p className="mt-3 text-[13.5px] text-[#FCA5A5]">{err}</p>}
          <p className="mt-4 text-[13px] text-white/50">Tu veux plutôt espionner un concurrent ? <a href="#/outils/analyse-concurrent" className="text-[#F6A06B] font-semibold hover:underline">Analyse-le gratuitement</a></p>
        </div>
        <div className="min-h-[220px]">
          {!r ? (
            <ul className="space-y-2 opacity-40" aria-hidden>{[0, 1, 2].map((i) => <li key={i} className="rounded-xl border border-dashed border-white/20 px-4 py-4"><div className="h-2.5 w-28 rounded bg-white/25" /><div className="h-3 w-48 rounded bg-white/30 mt-2.5" /><div className="h-2.5 w-full rounded bg-white/15 mt-2" /></li>)}</ul>
          ) : (
            <div>
              <p className="text-[15.5px]"><b className="text-[30px] font-black" style={D}>{r.total}</b> contrat{r.total > 1 ? "s" : ""} « {r.secteur} » à renouveler dans le {r.dept}{r.montant_total ? <>, <b>{euro(r.montant_total)}</b> au total</> : null}.</p>
              {!r.total && <p className="text-white/60 text-[13.5px] mt-1">Essaie un mot plus large ou un autre département.</p>}
              <ul className="mt-3 space-y-2">
                {r.visibles.map((c, i) => (
                  <li key={i} className="rounded-xl bg-white/[.07] border border-white/10 px-4 py-3 land-in" style={{ animationDelay: `${i * 140}ms` }}>
                    <p className="text-[12.5px] font-semibold text-[#F6A06B]">Fin estimée en {new Date(c.fin).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
                    <p className="font-semibold text-[15px] mt-0.5">{c.acheteur}</p>
                    <p className="text-[13px] text-white/65 line-clamp-2">{c.objet}</p>
                    {(c.montant || c.titulaire) && <p className="text-[12.5px] text-white/55 mt-1">{c.montant ? euro(c.montant) : ""}{c.montant && c.titulaire ? ", " : ""}{c.titulaire ? `tenu par ${c.titulaire}` : ""}</p>}
                  </li>
                ))}
              </ul>
              {r.caches > 0 && <button onClick={() => nav("/connexion")} className="mt-3 w-full rounded-xl bg-white text-ink py-3 font-bold text-[14.5px] hover:bg-white/90 transition">Voir les {r.caches} autres, avec le contact de chaque acheteur</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SOURCES = ["Données de la commande publique", "BOAMP", "BODACC", "Registre national des entreprises", "TED (marchés européens)", "Sites des entreprises"];
const STEPS = [
  ["Il repère", "Chaque nuit, le Radar lit les sources officielles et le web : contrats qui se terminent, nouveaux dirigeants, recrutements, visites de ton site."],
  ["Il trouve la bonne personne", "La fonction qui décide, avec son e-mail publié ou vérifié, le téléphone et son profil LinkedIn public."],
  ["Il écrit", "Un message qui part du signal : pourquoi tu écris maintenant et ce que tu changes pour eux. Tu valides avant tout envoi."],
  ["Tu conclus", "Les réponses sont triées, les rendez-vous se posent dans ton agenda, les devis partent depuis Bingoo!."],
];
const WHO = [
  ["terrain", "Services sur site", "Remporte les contrats avant l'appel d'offres", "Nettoyage, sécurité, maintenance, BTP : Bingoo! te montre les contrats publics qui se terminent, qui les tient aujourd'hui et qui contacter aux achats, des mois avant le nouvel appel d'offres.", ["Contrats publics à renouveler", "Appels d'offres de ta zone", "Déménagements et nouveaux sites", "Nouveaux dirigeants"]],
  ["services", "Services aux entreprises", "Arrive au moment où ils changent", "Agences, conseil, ESN, formation : Bingoo! repère les entreprises en mouvement, celles qui changent de dirigeant, recrutent ou ouvrent un site, et prépare le premier message.", ["Nouveaux dirigeants", "Créations d'entreprises", "Recrutements liés à ton offre", "Levées de fonds"]],
  ["saas", "Logiciels / SaaS", "Prends les clients de tes concurrents", "Bingoo! lit les sites et les offres d'emploi : qui utilise un outil concurrent, quand son abonnement se renouvelle, qui recrute l'équipe qui va utiliser ton produit, qui visite ton site.", ["Outils concurrents installés", "Dates de renouvellement d'abonnement", "Recrutements", "Visiteurs de ton site et équipes à l'essai"]],
  ["solo", "Indépendants", "Un commercial à temps plein, pour 49 € par mois", "Tu n'as pas le temps de prospecter : chaque matin, Bingoo! te donne 3 entreprises à contacter, avec la raison, le contact et le message prêt.", ["3 entreprises par jour", "Message prêt à valider", "Relances automatiques", "Rendez-vous dans ton agenda"]],
];
const NIGHT = [
  ["02:00", "Contrats publics lus", "Données de la commande publique"],
  ["02:20", "Annonces légales lues", "BODACC"],
  ["03:05", "Contact trouvé : service achats", "Avis officiel"],
  ["06:30", "3 messages préparés", "En attente de ta validation"],
  ["07:45", "Récap envoyé", "Tes 3 entreprises du jour"],
];
const PLANS = [
  ["Solo", 49, "Pour un indépendant ou un dirigeant qui prospecte seul.", ["Radar, Espion et Mission inclus", "1 utilisateur", "Volume d'actions standard", "Budget IA de 11 € inclus"]],
  ["Pro", 109, "Pour une PME qui veut un flux régulier de rendez-vous.", ["Radar, Espion et Mission inclus", "3 utilisateurs", "Volume d'actions doublé", "Budget IA de 24 € inclus"]],
  ["Équipe", 159, "Pour plusieurs commerciaux sur le même marché.", ["Radar, Espion et Mission inclus", "10 utilisateurs", "Volume d'actions quadruplé", "Budget IA de 46 € inclus"]],
];
const FAQ = [
  ["Bingoo! envoie-t-il des messages sans mon accord ?", "Non. Par défaut, chaque message attend ta validation. Tu peux ensuite activer le pilote automatique, dans la limite d'envoi que tu fixes."],
  ["D'où viennent les informations ?", "De sources publiques et vérifiables : données de la commande publique, BOAMP, annonces légales (BODACC), registre national des entreprises, sites des entreprises. Chaque signal affiche sa source."],
  ["Et le RGPD ?", "Bingoo! travaille au niveau de l'entreprise et des fonctions qui décident. Les e-mails sont publiés ou vérifiés, jamais devinés, et chaque message permet de ne plus être contacté."],
  ["Ça marche pour mon métier ?", "Bingoo! s'adapte à ton activité à l'inscription : services sur site, services aux entreprises, logiciels ou produits. Il ne cherche pas les mêmes signaux pour une entreprise de nettoyage et pour un éditeur de logiciel."],
  ["Que se passe-t-il après les 14 jours ?", "Tu choisis une formule, ou ton espace s'arrête simplement. Aucune carte bancaire n'est demandée pour l'essai."],
];

export default function Landing() {
  const nav = useNavigate();
  const [who, setWho] = useState("terrain");
  const [yearly, setYearly] = useState(false);
  const go = () => nav("/connexion");
  const w = WHO.find((x) => x[0] === who);
  return (
    <div className="min-h-full bg-[#FAF9F6] text-ink">
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}@keyframes land-in{from{opacity:0;transform:translateY(10px)}}.land-in{animation:land-in .45s ease-out both}@keyframes drift{50%{transform:translateY(-8px)}}`}</style>

      {/* Barre de navigation flottante */}
      <div className="sticky top-3 z-30 px-3 sm:px-6">
        <header className="max-w-6xl mx-auto rounded-2xl bg-ink text-white shadow-[0_14px_34px_-14px_rgba(21,22,26,.55)] h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Bingoo!"><Logo inverse height={28} /></button>
          <nav className="flex items-center gap-1 sm:gap-6 text-[14.5px] font-semibold">
            <a href="#produit" onClick={scrollTo("produit")} className="hidden md:inline hover:opacity-80">Produit</a>
            <a href="#pour-qui" onClick={scrollTo("pour-qui")} className="hidden md:inline hover:opacity-80">Pour qui</a>
            <a href="#tarifs" onClick={scrollTo("tarifs")} className="hidden md:inline hover:opacity-80">Tarifs</a>
            <a href="#/outils" className="hidden lg:inline hover:opacity-80">Outils gratuits</a>
            <button onClick={() => nav("/connexion?mode=login")} className="px-2 hover:opacity-80">Connexion</button>
            <button onClick={go} className="rounded-full bg-accent text-white px-4 py-2 font-bold hover:bg-accent-dark transition">S'inscrire</button>
          </nav>
        </header>
      </div>

      <main>
        {/* Titre */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-x-0 top-0 h-[600px] hidden lg:block">
            {FLOAT.map(([t, pos, col], i) => (
              <span key={t} className={cx("absolute rounded-full bg-white border border-line px-3.5 py-2 text-[13px] font-semibold text-ink-soft shadow-[0_8px_20px_-12px_rgba(21,22,26,.35)] flex items-center gap-2", pos)} style={{ animation: `drift ${5 + i}s ease-in-out infinite` }}>
                <span className="h-2 w-2 rounded-full" style={{ background: col }} />{t}
              </span>
            ))}
            <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 h-[720px] w-[720px] rounded-full border border-line/70" />
            <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 h-[520px] w-[520px] rounded-full border border-line/70" />
          </div>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
            <h1 className="font-black text-[46px] sm:text-[76px] leading-[.95] tracking-[-.025em]" style={D}>Sache qui va acheter.<br />Et quand.</h1>
            <p className="mt-6 text-[18px] sm:text-[20px] leading-relaxed text-ink-soft max-w-2xl mx-auto">Bingoo! est ton équipe commerciale IA. Elle repère les entreprises qui ont une raison d'acheter maintenant, trouve la bonne personne et prépare le message. Tu n'as plus qu'à conclure.</p>
            <button onClick={go} className="mt-9 rounded-full bg-ink text-white px-8 sm:px-10 py-4 sm:py-5 font-bold text-[17px] sm:text-[19px] shadow-[0_18px_40px_-16px_rgba(21,22,26,.6)] hover:bg-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">Commencer gratuitement</button>
            <ul className="mt-6 flex flex-wrap justify-center gap-2">
              {["14 jours offerts", "Sans carte bancaire", "Données publiques et sourcées"].map((t) => <li key={t} className="rounded-full bg-white border border-line px-3.5 py-1.5 text-[14px] font-medium flex items-center gap-1.5"><Check className="h-4 w-4 text-good" />{t}</li>)}
            </ul>
          </div>
          <div id="essai" className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-16"><TryIt /></div>
        </section>

        {/* Sources */}
        <section className="border-y border-line bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <p className="text-center text-[14px] text-ink-soft">Bingoo! lit chaque nuit des sources officielles et vérifiables</p>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-3">{SOURCES.map((s) => <li key={s} className="font-black text-[17px] sm:text-[19px] text-ink/35" style={D}>{s}</li>)}</ul>
          </div>
        </section>

        {/* Étapes */}
        <section id="produit" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-24">
          <h2 className="text-center font-black text-[34px] sm:text-[50px] leading-[1.02] tracking-[-.02em]" style={D}>Quatre étapes. Un rendez-vous.</h2>
          <p className="text-center mt-4 text-[17px] text-ink-soft max-w-2xl mx-auto">Les autres outils t'aident à contacter des prospects. Bingoo! te dit d'abord qui, pourquoi et quand.</p>
          <ol className="mt-14 grid md:grid-cols-4 gap-10 md:gap-6">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="relative">
                <div className="flex items-center">
                  <span className="h-14 w-14 rounded-2xl bg-accent text-white grid place-items-center font-black text-[20px] shrink-0" style={D}>{String(i + 1).padStart(2, "0")}</span>
                  {i < STEPS.length - 1 && <span className="hidden md:block h-[2px] flex-1 bg-accent/40 ml-3" />}
                </div>
                <h3 className="mt-5 font-bold text-[19px]">{t}</h3>
                <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Pour qui */}
        <section id="pour-qui" className="bg-white border-y border-line scroll-mt-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
            <h2 className="text-center font-black text-[34px] sm:text-[46px] leading-[1.05]" style={D}>À qui s'adresse Bingoo! ?</h2>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3" role="tablist">
              {WHO.map(([k, l]) => <button key={k} role="tab" aria-selected={who === k} onClick={() => setWho(k)} className={cx("rounded-2xl border px-4 py-4 text-left font-bold text-[15.5px] transition", who === k ? "bg-accent border-accent text-white" : "bg-[#FAF9F6] border-line hover:border-ink-faint")}>{l}</button>)}
            </div>
            <div className="mt-10 grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-center" role="tabpanel">
              <div>
                <h3 className="font-black text-[30px] sm:text-[38px] leading-[1.05]" style={D}>{w[2]}</h3>
                <p className="mt-4 text-[17px] leading-relaxed text-ink-soft max-w-xl">{w[3]}</p>
                <button onClick={go} className="mt-7 rounded-full bg-ink text-white px-6 py-3 font-bold hover:bg-black transition">Essayer pour mon activité</button>
              </div>
              <ul className="rounded-2xl bg-[#FAF9F6] border border-line p-6 space-y-3.5">
                <li className="text-[14px] text-ink-soft">Les signaux que Bingoo! surveille pour toi</li>
                {w[4].map((s) => <li key={s} className="flex items-center gap-3 text-[16.5px] font-semibold"><span className="h-7 w-7 rounded-full bg-accent-soft text-accent-dark grid place-items-center shrink-0"><Check className="h-4 w-4" /></span>{s}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* Confiance */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-black text-[34px] sm:text-[44px] leading-[1.05]" style={D}>Il travaille la nuit. Tu décides le matin.</h2>
            <ul className="mt-8 space-y-6">
              {[["Sources publiques uniquement", "Commande publique, annonces légales, registre officiel, sites des entreprises. Chaque signal affiche sa source."], ["E-mails jamais devinés", "Une adresse est publiée telle quelle ou vérifiée par un service spécialisé. Sinon, Bingoo! ne l'invente pas."], ["Rien ne part sans toi", "Chaque message attend ta validation, tant que tu n'as pas choisi le pilote automatique."], ["Opposition en un clic", "Chaque message permet de ne plus être contacté. La demande est appliquée tout de suite."]].map(([t, d]) => (
                <li key={t} className="flex gap-4"><span className="h-10 w-10 rounded-xl bg-accent-soft text-accent-dark grid place-items-center shrink-0"><Check className="h-5 w-5" /></span><div><p className="font-bold text-[17px]">{t}</p><p className="text-[15.5px] text-ink-soft mt-1 leading-relaxed">{d}</p></div></li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white border border-line shadow-[0_30px_60px_-36px_rgba(21,22,26,.35)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line"><p className="font-bold text-[17px] flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-good pulse-dot" />Une nuit de Bingoo!</p><span className="text-[12.5px] text-ink-faint">Exemple</span></div>
            <ul className="divide-y divide-line">{NIGHT.map(([h, t, s]) => <li key={h} className="px-6 py-4 flex items-center gap-4"><span className="tnum text-[13px] text-ink-faint w-12 shrink-0">{h}</span><div className="flex-1"><p className="font-semibold text-[16px]">{t}</p><p className="text-[13.5px] text-ink-soft">{s}</p></div><span className="h-6 w-6 rounded-full border-2 border-good text-good grid place-items-center"><Check className="h-3.5 w-3.5" /></span></li>)}</ul>
          </div>
        </section>

        {/* Pilotes */}
        <section className="px-3 sm:px-6">
          <div className="max-w-6xl mx-auto rounded-3xl bg-accent text-white px-6 sm:px-12 py-10 grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <p className="font-black text-[28px] sm:text-[34px] leading-tight" style={D}>Deviens l'une des premières entreprises Bingoo!</p>
              <p className="mt-2 text-[16px] text-white/85 max-w-2xl">Nous accompagnons personnellement nos premières entreprises : réglage du Radar sur ton marché, premiers messages relus ensemble, et ton avis compte pour la suite.</p>
            </div>
            <button onClick={go} className="rounded-full bg-white text-accent-dark px-7 py-3.5 font-bold text-[16px] hover:bg-white/90 transition">Rejoindre les pionniers</button>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="font-black text-[34px] sm:text-[50px] leading-[1.02] tracking-[-.02em]" style={D}>Moins cher qu'une journée de commercial.</h2>
              <p className="mt-3 text-[17px] text-ink-soft">Prix hors taxes, par mois, sans engagement.</p>
            </div>
            <div className="relative inline-flex rounded-full bg-white border border-line p-1 self-start md:self-auto">
              {[[false, "Mensuel"], [true, "Annuel"]].map(([v, l]) => <button key={l} onClick={() => setYearly(v)} className={cx("rounded-full px-5 py-2 text-[14.5px] font-bold transition", yearly === v ? "bg-ink text-white" : "text-ink-soft")}>{l}</button>)}
              <span className="absolute -top-3 -right-2 rounded-full bg-good text-white text-[11.5px] font-bold px-2 py-0.5">-20 %</span>
            </div>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-4 items-end">
            {PLANS.map(([n, p, d, items], i) => {
              const best = i === 1;
              const price = yearly ? Math.round(p * 0.8) : p;
              return (
                <div key={n} className={cx("relative rounded-3xl p-7", best ? "bg-[#16171B] text-white md:pb-10 md:pt-10 shadow-[0_30px_60px_-30px_rgba(21,22,26,.6)]" : i === 0 ? "bg-white border border-line" : "bg-accent-soft/60 border border-accent/20")}>
                  {best && <span className="absolute -top-3.5 left-7 rounded-full bg-accent text-white text-[12.5px] font-bold px-3 py-1">Recommandé</span>}
                  <p className="font-bold text-[19px]">{n}</p>
                  <p className="mt-4"><span className="font-black text-[52px] leading-none" style={D}>{price} €</span><span className={cx("text-[14px] ml-1.5", best ? "text-white/60" : "text-ink-faint")}>/ mois</span></p>
                  {yearly && <p className={cx("text-[13px] mt-1", best ? "text-white/60" : "text-ink-faint")}>facturé {price * 12} € par an</p>}
                  <p className={cx("mt-4 text-[15px]", best ? "text-white/75" : "text-ink-soft")}>{d}</p>
                  <ul className="mt-5 space-y-2.5">{items.map((x) => <li key={x} className="flex items-center gap-2.5 text-[15px]"><Check className={cx("h-4 w-4 shrink-0", best ? "text-[#F6A06B]" : "text-accent")} />{x}</li>)}</ul>
                  <button onClick={go} className={cx("mt-7 w-full rounded-full py-3.5 font-bold transition", best ? "bg-accent hover:bg-accent-dark text-white" : "bg-ink text-white hover:bg-black")}>Commencer l'essai gratuit</button>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-[14px] text-ink-soft">Besoin de plus ? Des crédits IA s'achètent à tout moment depuis l'application, dès 7 €.</p>
        </section>

        {/* Questions */}
        <section className="bg-white border-y border-line">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
            <h2 className="font-black text-[32px] sm:text-[40px]" style={D}>Questions fréquentes</h2>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group py-5">
                  <summary className="cursor-pointer list-none flex justify-between gap-4 font-semibold text-[17px]">{q}<span className="text-accent group-open:rotate-45 transition text-[24px] leading-none">+</span></summary>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
          <p className="font-black text-[34px] sm:text-[52px] leading-[1.02] tracking-[-.02em]" style={D}>Une longueur d'avance sur tes prochains clients.</p>
          <button onClick={go} className="mt-8 rounded-full bg-ink text-white px-9 py-4 font-bold text-[17px] hover:bg-black transition">Commencer gratuitement</button>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-[15px]">
          <div><p className="font-bold">Produit</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><a href="#produit" onClick={scrollTo("produit")} className="hover:text-ink">Radar</a></li><li><a href="#produit" onClick={scrollTo("produit")} className="hover:text-ink">Espion</a></li><li><a href="#produit" onClick={scrollTo("produit")} className="hover:text-ink">Mission</a></li><li><a href="#tarifs" onClick={scrollTo("tarifs")} className="hover:text-ink">Tarifs</a></li></ul></div>
          <div><p className="font-bold">Outils gratuits</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><a href="#/outils/contrats-publics" className="hover:text-ink">Contrats publics qui se terminent</a></li><li><a href="#/outils/analyse-concurrent" className="hover:text-ink">Analyse d'un concurrent</a></li></ul></div>
          <div><p className="font-bold">Pour qui</p><ul className="mt-4 space-y-2.5 text-ink-soft">{WHO.map(([k, l]) => <li key={k}><a href="#pour-qui" onClick={(e) => { setWho(k); scrollTo("pour-qui")(e); }} className="hover:text-ink">{l}</a></li>)}</ul></div>
          <div><p className="font-bold">Compte et légal</p><ul className="mt-4 space-y-2.5 text-ink-soft"><li><button onClick={() => nav("/connexion?mode=login")} className="hover:text-ink">Connexion</button></li><li><button onClick={go} className="hover:text-ink">Créer un compte</button></li>{legalReady && <><li><a href="#/mentions-legales" className="hover:text-ink">Mentions légales</a></li><li><a href="#/confidentialite" className="hover:text-ink">Confidentialité</a></li><li><a href="#/conditions" className="hover:text-ink">Conditions</a></li></>}<li><a href="#/opposition" className="hover:text-ink">Ne plus être contacté</a></li></ul></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
          <Logo height={34} />
          <p className="text-[13.5px] text-ink-faint">© {new Date().getFullYear()} Bingoo! · Ton équipe commerciale IA</p>
        </div>
      </footer>
    </div>
  );
}
