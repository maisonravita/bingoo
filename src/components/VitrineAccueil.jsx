// Les aperçus de l'application sur la page d'accueil, dessinés en vrai (nets à toutes les tailles, sur téléphone aussi).
// Les SaaS et leurs chiffres sont réels (revenus vérifiés TrustMRR, relevés en novembre 2026) ;
// les établissements de l'aperçu « Tes prospects » sont des exemples.
import { cx } from "../lib/utils";

const HF = { fontFamily: "var(--font-titre)" };
const Tick = ({ className = "h-3.5 w-3.5" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;

export const SAAS = [
  {
    nom: "TryPost.it", init: "T", teinte: "#1F7A4D", cat: "Réseaux sociaux", mrr: "2 616 $", cr: "+46 %",
    angle: "pour les restaurants",
    desc: "Publie tout seul sur Instagram, Facebook et TikTok : idées de posts, textes et programmation, sans y passer ses soirées.",
    points: ["Trouve ses clients comme toi : Google, affiliation", "Aucun démarchage à faire", "Prix simple : 19 $ par mois"],
  },
  {
    nom: "JourneyFuse", init: "J", teinte: "#2B59C3", cat: "Gestion de clients", mrr: "12 486 $", cr: "+43 %",
    angle: "en français",
    desc: "Suit chaque client de la première demande jusqu'au paiement complet. Fait pour les agences de voyage.",
    points: ["Pas d'équivalent français repéré", "Vend aux professionnels", "Prix simple : 25 $ par mois"],
  },
  {
    nom: "The SEO Agent", init: "S", teinte: "#7A3FB8", cat: "Marketing et SEO", mrr: "1 391 $", cr: "+40 %",
    angle: "plus simple",
    desc: "Écrit et publie les articles de blog d'un site pour le faire monter sur Google, du choix des mots-clés à la mise en ligne.",
    points: ["Trouve ses clients comme toi : Google", "Vend aux professionnels", "Bingoo! sait le construire en entier"],
  },
];

// Le cadre « fenêtre d'application » commun à tous les aperçus
export function Fenetre({ children, className = "", titre }) {
  return (
    <div className={cx("overflow-hidden rounded-2xl border border-black/10 bg-white text-left text-ink shadow-[0_40px_90px_-45px_rgba(21,23,42,.55)]", className)} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div className="flex items-center gap-1.5 border-b border-line bg-[#FBFAF8] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#E3E1D9]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E3E1D9]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E3E1D9]" />
        {titre && <span className="ml-3 truncate text-[12px] font-medium text-ink-faint">{titre}</span>}
      </div>
      {children}
    </div>
  );
}

function Pastille({ s, grand }) {
  return <span className={cx("grid shrink-0 place-items-center rounded-xl font-extrabold text-white", grand ? "h-11 w-11 text-[18px]" : "h-9 w-9 text-[15px]")} style={{ background: s.teinte }}>{s.init}</span>;
}

function Carte({ s, choisi }) {
  return (
    <div className={cx("flex flex-col rounded-2xl bg-white p-4 sm:p-5", choisi ? "border-2 border-ink" : "border border-line")}>
      <div className="flex items-start gap-3">
        <Pastille s={s} grand />
        <div className="min-w-0 flex-1"><p className="truncate font-bold text-[15.5px] leading-tight">{s.nom}</p><p className="mt-0.5 truncate text-[12.5px] text-ink-faint">{s.cat}</p></div>
        <div className="text-right"><p className="font-extrabold text-[16px] leading-tight tabular-nums">{s.mrr}</p><p className="text-[11px] text-ink-faint">par mois, vérifié</p></div>
      </div>
      <p className="mt-3 w-fit rounded-full bg-good-soft px-2.5 py-1 text-[12px] font-semibold text-good">↗ En hausse · {s.cr} en 30 j</p>
      <p className="mt-2.5 rounded-lg bg-accent-soft px-3 py-1.5 text-[13px] font-semibold text-accent-dark">Ta version : {s.angle}</p>
      <p className="mt-3 text-[13.5px] leading-snug text-ink-soft">{s.desc}</p>
      <ul className="mt-3 space-y-1.5 text-[12.5px]">{s.points.map((p) => <li key={p} className="flex gap-2"><Tick className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" />{p}</li>)}</ul>
      <div className="mt-auto flex gap-2 pt-4">
        <span className={cx("flex-1 rounded-xl py-2.5 text-center text-[13px] font-bold", choisi ? "bg-ink text-white" : "border border-line")}>{choisi ? "Choisi" : "Choisir celui-ci"}</span>
        <span className="rounded-xl border border-line px-3.5 py-2.5 text-[13px] font-semibold">Sa fiche</span>
      </div>
    </div>
  );
}

/** « Tes 3 SaaS en tendance » : le résultat après les 8 questions */
export function ApercuTendance({ compact = false }) {
  const reponses = ["Écrire et être trouvé sur Google", "Sans démarcher", "5 à 15 h par semaine", "Aux professionnels", "En vivre"];
  return (
    <Fenetre titre="Trouver mon SaaS">
      <div className="bg-[#FAF9F6] p-4 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[24px] sm:text-[30px] font-extrabold leading-tight tracking-tight" style={HF}>Tes 3 SaaS en tendance</p>
            <p className="mt-1 text-[13px] sm:text-[14px] text-ink-soft">Ils encaissent déjà, leur revenu monte en ce moment, et ils trouvent leurs clients comme tu veux le faire.</p>
          </div>
          <span className="hidden sm:inline rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] font-semibold">Changer mes réponses</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{reponses.map((x) => <span key={x} className="rounded-full border border-line bg-white px-2.5 py-1 text-[12px] text-ink-soft">{x}</span>)}</div>
        <div className={cx("mt-5 grid gap-3 sm:gap-4", compact ? "md:grid-cols-2" : "md:grid-cols-3")}>
          {SAAS.slice(0, compact ? 2 : 3).map((s, i) => <div key={s.nom} className={cx(i > 0 && "hidden md:block")}><Carte s={s} choisi={i === 0} /></div>)}
        </div>
      </div>
    </Fenetre>
  );
}

/** « Ta version » : l'angle choisi et la construction par Bingoo! */
export function ApercuVersion() {
  const s = SAAS[0];
  return (
    <Fenetre titre="Trouver mon SaaS · Ta version">
      <div className="bg-[#FAF9F6] p-4 sm:p-7 space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
          <Pastille s={s} />
          <div className="min-w-0 flex-1"><p className="font-bold text-[15px]">Tu pars de {s.nom}</p><p className="text-[12.5px] text-ink-faint">{s.mrr} par mois, vérifié · {s.cr} en 30 jours</p></div>
          <span className="hidden sm:inline rounded-full bg-good-soft px-2.5 py-1 text-[12px] font-semibold text-good">En hausse</span>
        </div>
        <div className="rounded-2xl border-2 border-ink bg-white p-5 sm:p-6">
          <p className="text-[12.5px] font-semibold text-accent-dark">Ta version</p>
          <p className="mt-1 text-[21px] sm:text-[25px] font-extrabold leading-tight tracking-tight" style={HF}>Le community manager automatique des restaurants</p>
          <p className="mt-2 text-[13.5px] sm:text-[14px] leading-snug text-ink-soft">Chaque semaine, les posts du restaurant sont prêts : le plat du jour, les soirées, les avis clients. Le restaurateur valide en un clic depuis son téléphone.</p>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-ink-faint mr-1">Un autre angle ?</span>
            {["En français", "Pour un métier", "Plus simple"].map((x, i) => <span key={x} className={cx("rounded-full border px-3 py-1 text-[12px] font-medium", i === 1 ? "bg-ink text-white border-ink" : "bg-white border-line")}>{x}</span>)}
          </div>
          <span className="mt-5 inline-block rounded-xl bg-accent px-5 py-3 text-[14px] font-bold text-white">Bingoo! construit ma version</span>
        </div>
      </div>
    </Fenetre>
  );
}

function Entete({ onglet }) {
  const onglets = ["Ta semaine (5/7)", "Tes prospects (25)", "Quoi leur dire", "Où chercher encore"];
  return (
    <div className="border-b border-line px-4 sm:px-6 pt-4 sm:pt-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[17px] sm:text-[20px] font-extrabold leading-tight tracking-tight" style={HF}>Tes 10 premiers clients en 7 jours</p><p className="mt-0.5 text-[12px] sm:text-[12.5px] text-ink-soft">Ta version pour les restaurants · une étape par jour</p></div>
        <div className="text-right"><p className="text-[22px] font-extrabold leading-none tabular-nums">2<span className="text-[14px] text-ink-faint">/10</span></p><p className="text-[11px] text-ink-faint">clients payants</p></div>
      </div>
      <div className="mt-3 flex gap-4 overflow-hidden text-[12.5px] whitespace-nowrap">{onglets.map((o, i) => <span key={o} className={cx("pb-2.5", i === onglet ? "border-b-2 border-accent font-bold text-ink" : "text-ink-soft", i > 1 && "hidden sm:inline")}>{o}</span>)}</div>
    </div>
  );
}

const ETAT = { contacte: ["Contacté", "bg-paper text-ink-soft"], repondu: ["A répondu", "bg-warn-soft text-warn"], essai: ["En essai", "bg-[#E4ECFB] text-[#2B59C3]"], payant: ["Payant", "bg-good-soft text-good"], "": ["À contacter", "bg-white text-ink-soft border border-line"] };
/** « Tes prospects » : les établissements trouvés par Bingoo! (exemples) */
export function ApercuProspects() {
  const lignes = [["Le Comptoir des Halles", "Paris 1er", "payant"], ["Bistrot Saint-Honoré", "Paris 1er", "payant"], ["Trattoria Lucia", "Paris 2e", "essai"], ["Café des Arts", "Paris 3e", "repondu"], ["La Table du Marais", "Paris 4e", "repondu"], ["Le Petit Vauban", "Paris 7e", "contacte"], ["Maison Okra", "Paris 9e", ""]];
  return (
    <Fenetre titre="Tes premiers clients">
      <Entete onglet={1} />
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent-soft/60 px-4 py-3">
          <div><p className="text-[13.5px] font-bold">50 restaurants de ton département</p><p className="text-[12px] text-ink-soft">Trouvés dans le registre public des entreprises, avec le nom du dirigeant.</p></div>
          <span className="rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-bold text-white">En trouver d'autres</span>
        </div>
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
          {lignes.map(([n, v, e]) => (
            <li key={n} className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold">{n}</p><p className="text-[11.5px] text-ink-faint">{v} · <span className="inline-block h-2 w-16 translate-y-[1px] rounded bg-line align-middle" aria-label="dirigeant" /></p></div>
              <span className="hidden sm:inline rounded-lg border border-line px-2.5 py-1.5 text-[11.5px] font-semibold">Copier son message</span>
              <span className={cx("w-[86px] rounded-lg py-1.5 text-center text-[11.5px] font-semibold", ETAT[e][1])}>{ETAT[e][0]}</span>
            </li>
          ))}
        </ul>
      </div>
    </Fenetre>
  );
}

/** « Ta semaine » : une étape par jour, cochée au fur et à mesure */
export function ApercuSemaine() {
  const jours = [
    ["Ta liste", "Garde les 25 restaurants qui te parlent le plus parmi les 50 trouvés.", true],
    ["Ton offre", "Un mois offert, puis −30 % à vie pour les 10 premiers.", true],
    ["Premiers contacts", "Envoie ton message aux 10 premiers, depuis ton adresse.", true],
    ["Deuxième vague", "Les 15 suivants, et relance ceux qui ont répondu.", true],
    ["Montre-le", "Une démo de 10 minutes à ceux qui sont intéressés.", true],
    ["Ouvre les essais", "Donne l'accès et aide chacun à publier son premier post.", false],
  ];
  return (
    <Fenetre titre="Tes premiers clients">
      <Entete onglet={0} />
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FAF9F6] border border-line px-4 py-3">
          <div><p className="text-[13.5px] font-bold">Jour 6 : ouvre les essais</p><p className="text-[12px] text-ink-soft">Bingoo! t'envoie chaque matin l'étape du jour, avec où tu en es.</p></div>
          <span className="rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-bold text-white">Voir l'étape du jour</span>
        </div>
        <div className="mt-3 grid sm:grid-cols-2 gap-2.5">
          {jours.map(([t, d, fait], i) => (
            <div key={t} className={cx("rounded-xl border p-3.5", i === 5 ? "border-ink" : "border-line", fait && "bg-[#FAF9F6]")}>
              <p className="flex items-center gap-2 text-[13px]"><span className={cx("grid h-[18px] w-[18px] place-items-center rounded-md border-2", fait ? "border-good bg-good text-white" : "border-line")}>{fait && <Tick className="h-3 w-3" />}</span><span className="text-ink-faint">Jour {i + 1}</span><b className={cx(fait && "line-through decoration-ink-faint/60 text-ink-soft")}>{t}</b></p>
              <p className="mt-1.5 pl-[26px] text-[12.5px] leading-snug text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </Fenetre>
  );
}

/** La fiche d'un SaaS : revenu vérifié et sa progression, visibilité, pub et canaux */
export function ApercuFiche() {
  const s = SAAS[0];
  return (
    <Fenetre titre={`Fiche · ${s.nom}`}>
      <div className="p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <Pastille s={s} grand />
          <div className="min-w-0 flex-1"><p className="text-[18px] sm:text-[21px] font-extrabold leading-tight tracking-tight" style={HF}>{s.nom}</p><p className="text-[12.5px] text-ink-faint">{s.cat} · tenu par une petite équipe</p></div>
          <span className="rounded-full bg-good-soft px-2.5 py-1 text-[12px] font-semibold text-good">↗ {s.cr} en 30 j</span>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-[#FAF9F6] p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-[12px] text-ink-faint">Revenu vérifié chez son outil de paiement</p><p className="mt-0.5 text-[28px] sm:text-[32px] font-extrabold leading-none tracking-tight tabular-nums" style={HF}>{s.mrr}<span className="ml-1 text-[14px] font-semibold text-ink-faint">/ mois</span></p></div>
          </div>
          <div className="mt-4 space-y-2.5">
            {[["Il y a 30 jours", "1 792 $", 68, "bg-[#E3E1D9]"], ["Aujourd'hui", s.mrr, 100, "bg-accent"]].map(([l, v, w, c]) => (
              <div key={l} className="flex items-center gap-3 text-[12.5px]">
                <span className="w-[92px] shrink-0 text-ink-soft">{l}</span>
                <span className="relative h-3 flex-1 rounded-full bg-white"><span className={cx("absolute inset-y-0 left-0 rounded-full", c)} style={{ width: `${w}%` }} /></span>
                <b className="w-[64px] shrink-0 text-right tabular-nums">{v}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-line p-4">
            <p className="text-[12px] text-ink-faint">Visibilité sur Google</p>
            <p className="mt-1 font-extrabold text-[17px]">26<span className="text-[13px] font-semibold text-ink-faint">/100</span></p>
            <span className="mt-2 block h-1.5 rounded-full bg-[#F1EFEA]"><span className="block h-full w-[26%] rounded-full bg-warn" /></span>
            <p className="mt-2 text-[12px] leading-snug text-ink-soft">Moyenne : la place se prend avec du contenu.</p>
          </div>
          <div className="rounded-2xl border border-line p-4">
            <p className="text-[12px] text-ink-faint">Pub payante</p>
            <p className="mt-1 font-extrabold text-[17px]">Aucune</p>
            <p className="mt-2 text-[12px] leading-snug text-ink-soft">Il grandit sans payer de pub : tu peux faire pareil.</p>
          </div>
          <div className="rounded-2xl border border-line p-4">
            <p className="text-[12px] text-ink-faint">Ses canaux</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{["Google", "Affiliation"].map((c) => <span key={c} className="rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent-dark">{c}</span>)}</div>
            <p className="mt-2 text-[12px] leading-snug text-ink-soft">Déclarés par le fondateur.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">{["Voir ses pubs", "Voir son site", "Lancer ma version"].map((x, i) => <span key={x} className={cx("rounded-xl px-3.5 py-2 text-[12.5px] font-semibold", i === 2 ? "bg-accent text-white" : "border border-line")}>{x}</span>)}</div>
      </div>
    </Fenetre>
  );
}
