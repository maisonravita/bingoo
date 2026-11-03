import { useEffect, useRef, useState } from "react";
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

const Arrow = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

/** Compteur en direct : ce que le Radar a trouvé, tous comptes confondus (relu toutes les 10 secondes). */
// Une seule lecture toutes les 10 secondes, partagée par tous les blocs de la page
const live = { v: null, subs: new Set(), timer: null };
function liveLoad() {
  return fetch(`${URL_}/rest/v1/rpc/radar_live`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` }, body: "{}" })
    .then((r) => r.ok ? r.json() : null).then((d) => { if (typeof d?.signaux === "number") { live.v = d; live.subs.forEach((f) => f(d)); } }).catch(() => {});
}
function useLive() {
  const [v, setV] = useState(live.v);
  useEffect(() => {
    live.subs.add(setV);
    if (!live.timer) { liveLoad(); live.timer = setInterval(() => { if (document.visibilityState === "visible") liveLoad(); }, 10000); }
    return () => { live.subs.delete(setV); if (!live.subs.size) { clearInterval(live.timer); live.timer = null; } };
  }, []);
  return v;
}
function Rolling({ value }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (value == null) return;
    const start = from.current, t0 = performance.now(), dur = start ? 900 : 1600;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { from.current = value; setShown(value); return; }
    let raf; const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); const n = Math.round(start + (value - start) * e); setShown(n); if (k < 1) raf = requestAnimationFrame(step); else from.current = value; };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tabular-nums">{shown.toLocaleString("fr-FR")}</span>;
}
function BigCounter() {
  const v = useLive();
  const [bump, setBump] = useState(0);
  const prev = useRef(null);
  const total = v ? (v.total ?? (v.signaux ?? 0) + (v.prospects ?? 0)) : null;
  useEffect(() => { if (total == null) return; if (prev.current != null && total > prev.current) { setBump(total - prev.current); const t = setTimeout(() => setBump(0), 2500); prev.current = total; return () => clearTimeout(t); } prev.current = total; }, [total]);
  const parts = [["Appels d'offres et contrats", v?.marches], ["Prospects qualifiés", v?.prospects], ["Signaux d'achat", v?.signaux]];
  return (
    <div className="relative max-w-3xl mx-auto rounded-[28px] bg-white/90 backdrop-blur border border-[#F3E3D7] shadow-[0_30px_70px_-40px_rgba(224,83,31,.55)] px-5 sm:px-10 pt-7 pb-6" aria-live="polite">
      <div className="flex items-center justify-center gap-2 text-[14px] font-bold text-good">
        <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full rounded-full bg-good opacity-60 motion-safe:animate-ping" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-good" /></span>En direct
      </div>
      <div className="relative mt-2 font-black leading-none tracking-[-.03em] text-[64px] sm:text-[112px] text-ink" style={D}>
        {total == null ? <span className="text-ink/15">0</span> : <Rolling value={total} />}
        {bump > 0 && <span className="absolute -top-1 sm:top-2 ml-2 rounded-full bg-accent text-white text-[14px] sm:text-[16px] px-2.5 py-1 font-bold tracking-normal land-in">+{bump}</span>}
      </div>
      <div className="mt-2 text-[16px] sm:text-[18px] text-ink-soft">opportunités trouvées par le Radar, tous comptes confondus</div>
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        {parts.map(([l, n]) => (
          <div key={l} className="rounded-2xl bg-[#FFF6F0] px-2 sm:px-4 py-3">
            <div className="font-black text-[22px] sm:text-[30px] text-accent tabular-nums leading-none" style={D}>{n == null ? "…" : n.toLocaleString("fr-FR")}</div>
            <div className="mt-1.5 text-[12px] sm:text-[14px] font-semibold text-ink-soft leading-tight">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LivePill() {
  const v = useLive();
  return (
    <a href="#compteur" onClick={scrollTo("compteur")} className="mt-7 inline-flex items-center gap-3 rounded-full bg-white border border-[#EFE5DC] pl-2 pr-5 py-2 shadow-[0_8px_20px_-14px_rgba(21,22,26,.35)] hover:border-accent/40 transition">
      <span className="flex -space-x-2">{["B", "D", "T"].map((t, i) => <span key={t} className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-[13px] font-black text-white" style={{ ...D, background: ["#E0531F", "#F2843F", "#15161A"][i] }}>{t}</span>)}</span>
      <span className="text-[14px] sm:text-[15.5px] font-bold whitespace-nowrap">{v ? <><Rolling value={v.total ?? 0} /> opportunités trouvées</> : "Le Radar tourne en ce moment"}</span>
      <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full rounded-full bg-good opacity-60 motion-safe:animate-ping" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-good" /></span>
    </a>
  );
}

/** Fond du titre : réseau de points orange reliés. */
const NODES = [[3,12],[9,30],[4,52],[12,66],[2,80],[18,20],[21,44],[16,88],[27,8],[97,10],[90,26],[96,46],[86,58],[98,70],[82,84],[79,16],[74,40],[93,92],[35,95],[66,93]];
function NetBg() {
  const lines = [];
  NODES.forEach((a, i) => NODES.forEach((b, j) => { if (j > i && Math.hypot(a[0] - b[0], (a[1] - b[1]) * .6) < 17) lines.push([a, b]); }));
  return (
    <svg aria-hidden className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      {lines.map(([a, b], i) => <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#F2B48F" strokeOpacity=".45" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
      {NODES.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? .35 : .5} fill={i % 4 ? "#F59A5C" : "#E0531F"} />)}
    </svg>
  );
}
// Bulles autour du titre : les sources que le Radar lit vraiment
// Bulles autour du titre : de vrais acheteurs publics dont le Radar a capté un marché qui se termine (données publiques)
const SPOTS = ["left-[6%] top-[8%]", "left-[2%] top-[31%]", "left-[8%] top-[54%]", "left-[3%] top-[77%]", "right-[6%] top-[7%]", "right-[2%] top-[30%]", "right-[8%] top-[53%]", "right-[3%] top-[76%]"];
const FALLBACK = [["Ville de Paris", "Marché public"], ["AP-HP", "Maintenance"], ["CNRS", "Nettoyage"], ["AFPA", "Nettoyage"], ["INRIA", "Marché public"], ["CAF 92", "Nettoyage"], ["SDIS", "Sécurité"], ["Ville de Montreuil", "Nettoyage"]].map(([n, c]) => ({ nom: n, cat: c, montant: null }));
const titleCase = (x) => x.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
function shortBuyer(a) {
  const par = a.match(/\(([^)]{2,14})\)\s*$/)?.[1];
  if (par) return par.toUpperCase();
  const c = a.match(/^commune\s+(?:de\s+|du\s+|d['’ ]\s*)?(.+)$/i)?.[1];
  if (c) return `Ville de ${titleCase(c)}`.slice(0, 26);
  const t = titleCase(a).replace(/^(Departement|Département) D[eu']\s*/i, "Département ").trim();
  return t.length > 26 ? t.slice(0, 24).replace(/\s\S*$/, "") + "…" : t;
}
const catOf = (o) => /nettoy|vitrer|propret/i.test(o) ? "Nettoyage" : /gardienn|surveill|s[ée]curit/i.test(o) ? "Sécurité" : /maintenan/i.test(o) ? "Maintenance" : /informat|logiciel|num[ée]rique/i.test(o) ? "Informatique" : /restaur|repas/i.test(o) ? "Restauration" : /travaux|b[âa]timent|r[ée]novation/i.test(o) ? "Travaux" : /formation/i.test(o) ? "Formation" : "Marché public";
function HeroBubbles() {
  const v = useLive();
  const list = (v?.vitrine ?? []).length >= 8 ? v.vitrine.map((x) => ({ nom: shortBuyer(String(x.acheteur)), cat: catOf(String(x.objet ?? "")), montant: Number(x.montant) || null })).filter((x, i, a) => a.findIndex((y) => y.nom === x.nom) === i) : FALLBACK;
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 3200); return () => clearInterval(t); }, []);
  // Une bulle change à chaque tour, les autres restent
  const shown = SPOTS.map((_, i) => { const turns = Math.floor((tick + (8 - i)) / 8); return (i + turns * 8) % list.length; });
  return (
    <div aria-hidden className="absolute inset-x-0 top-24 h-[640px] hidden xl:block">
      {SPOTS.map((pos, i) => { const b = list[shown[i]] ?? FALLBACK[i]; return (
        <div key={i} className={cx("absolute h-[118px] w-[118px] rounded-full bg-white shadow-[0_14px_34px_-18px_rgba(21,22,26,.35)]", pos)} style={{ animation: `drift ${6 + i % 4}s ease-in-out infinite`, animationDelay: `${i * .4}s` }}>
          <div key={b.nom} className="land-in h-full w-full flex flex-col items-center justify-center text-center px-2.5">
            <span className="font-black text-[14.5px] leading-[1.1] text-ink line-clamp-2" style={D}>{b.nom}</span>
            <span className="mt-1 text-[11.5px] font-bold text-accent leading-tight">{b.cat}</span>
            {b.montant ? <span className="text-[11px] font-semibold text-ink-faint leading-tight">{euro(b.montant)}</span> : null}
          </div>
        </div>
      ); })}
    </div>
  );
}


const Chev = () => <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>;
const MENU = [
  ["Produit", [["Radar", "Qui va acheter, et quand", "#radar"], ["Contacts des décideurs", "E-mail, téléphone, LinkedIn", "#contacts"], ["Comment ça marche", "Quatre étapes jusqu'au rendez-vous", "#produit"], ["Essai en direct", "Teste le Radar sur ton marché", "#essai"]]],
  ["Solutions", [["Services sur site", "Nettoyage, sécurité, maintenance, BTP", "#pour-qui"], ["Services aux entreprises", "Agences, conseil, ESN, formation", "#pour-qui"], ["Logiciels / SaaS", "Prends les clients de tes concurrents", "#pour-qui"], ["Indépendants", "Un commercial à temps plein", "#pour-qui"]]],
  ["Nos données", [["Sources officielles", "BOAMP, BODACC, Sirene, DECP, TED", "#donnees"], ["Compteur en direct", "Ce que le Radar a trouvé", "#compteur"]]],
  ["Tarifs", null],
  ["Ressources", [["Outils gratuits", "Contrats publics, analyse de concurrent", "#/outils"], ["Questions fréquentes", "Tout ce qu'on nous demande", "#faq"]]],
];

/** Les coordonnées du décideur : ce que Bingoo! trouve pour chaque opportunité. */
const CONTACT_ROWS = [
  ["mail", "E-mail", "Publié par l'organisation ou retrouvé sur le web"],
  ["tel", "Téléphone", "Ligne directe ou standard, relevé sur les pages publiques"],
  ["in", "LinkedIn", "Le profil public du décideur, pour un premier contact"],
  ["role", "La bonne fonction", "Achats, direction générale, DSI, RH : celle qui signe pour ton offre"],
];
const CIcon = ({ k }) => k === "mail" ? <path d="M4 6h16v12H4zM4 7l8 6 8-6" /> : k === "tel" ? <path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" /> : k === "in" ? <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" /></> : <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>;
function ContactShow({ go }) {
  return (
    <section id="contacts" className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-14 scroll-mt-24">
      <div className="grid lg:grid-cols-[1fr_1fr] gap-8 lg:gap-12 items-center">
        <div>
          <h2 className="font-black text-[32px] sm:text-[44px] leading-[1.02] tracking-[-.02em]" style={D}>Pas juste l'entreprise. <span className="text-accent">La personne à appeler.</span></h2>
          <p className="mt-4 text-[17px] sm:text-[19px] text-ink-soft leading-relaxed">Pour chaque opportunité, Bingoo! cherche qui décide et comment le joindre. Tu ouvres la fiche, tu appelles ou tu écris.</p>
          <ul className="mt-6 space-y-4">
            {CONTACT_ROWS.map(([k, t, d]) => (
              <li key={k} className="flex gap-4">
                <span className="h-11 w-11 shrink-0 rounded-2xl bg-[#FFF1E8] text-accent flex items-center justify-center"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><CIcon k={k} /></svg></span>
                <span><span className="block font-bold text-[16.5px]">{t}</span><span className="block text-[15px] text-ink-soft">{d}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13.5px] text-ink-faint">Uniquement des informations professionnelles publiques ou vérifiées. Chaque personne peut s'opposer à tout moment.</p>
        </div>
        <div className="relative">
          <div className="rounded-[28px] bg-white border border-line shadow-[0_30px_70px_-40px_rgba(21,22,26,.45)] p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#FFF1E8] text-accent text-[13px] font-bold px-3 py-1">Contrat public à renouveler</span>
              <span className="text-[12px] font-semibold text-ink-faint">Exemple</span>
            </div>
            <div className="mt-4 font-black text-[22px] leading-tight" style={D}>Une ville de 40 000 habitants</div>
            <div className="text-[15px] text-ink-soft">Nettoyage des bâtiments communaux, 420 k€, fin en mars</div>
            <div className="mt-5 rounded-2xl bg-[#FBF7F3] border border-[#F1E6DC] p-4">
              <div className="flex items-center gap-3">
                <span className="h-11 w-11 rounded-full bg-ink text-white flex items-center justify-center font-black" style={D}>CM</span>
                <div><div className="font-bold text-[16px]">Claire Martin</div><div className="text-[14px] text-ink-soft">Responsable de la commande publique</div></div>
              </div>
              <div className="mt-4 grid gap-2 text-[14.5px]">
                <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-line px-3 py-2.5"><span className="flex items-center gap-2 min-w-0"><svg viewBox="0 0 24 24" className="h-4 w-4 text-accent shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><CIcon k="mail" /></svg><span className="truncate">c.martin@ville-exemple.fr</span></span><span className="text-[12px] font-semibold text-ink-faint shrink-0">Site officiel</span></div>
                <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-line px-3 py-2.5"><span className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><CIcon k="tel" /></svg>01 23 45 67 89</span><span className="text-[12px] font-semibold text-ink-faint">Site officiel</span></div>
                <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-line px-3 py-2.5"><span className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><CIcon k="in" /></svg>Profil LinkedIn</span><span className="text-[12px] font-semibold text-ink-faint">Public</span></div>
              </div>
            </div>
            <button onClick={go} className="mt-5 w-full rounded-full bg-accent text-white py-3.5 font-bold hover:bg-accent-dark transition">Trouver mes décideurs</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Le Radar en démonstration : signaux (faits publics) ou intentions (comportements). */
const MODES = {
  signal: { label: "Radar Signal", items: ["Contrat public à renouveler", "Nouveau dirigeant", "Déménagement du siège", "Recrutement lié à ton offre"], dots: [[30,38],[62,30],[48,62],[70,58],[38,72],[56,44]] },
  intention: { label: "Radar Intention", items: ["A visité ta page tarifs", "Équipe à l'essai chez toi", "Cherche une solution en ligne", "Mécontente d'un concurrent"], dots: [[42,34],[66,46],[34,56],[58,70],[50,40]] },
};
function RadarDemo() {
  const v = useLive();
  const [m, setM] = useState("signal");
  const mode = MODES[m];
  return (
    <section id="radar" className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-14 scroll-mt-24">
      <div className="rounded-[32px] bg-white border border-line shadow-[0_24px_60px_-40px_rgba(21,22,26,.35)] p-6 sm:p-10 grid lg:grid-cols-[1fr_1.1fr] gap-8 items-center">
        <div>
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 48 48" className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden><circle cx="22" cy="26" r="17" /><circle cx="22" cy="26" r="9.5" /><circle cx="22" cy="26" r="2.6" fill="currentColor" /><path d="m22 26 16-16M33 6l5 4 4 5" /></svg>
            <h2 className="font-black text-[32px] sm:text-[42px] leading-none tracking-[-.02em]" style={D}>Le Radar <span className="text-accent">Bingoo!</span></h2>
          </div>
          <p className="mt-4 text-[17px] sm:text-[19px] text-ink-soft leading-relaxed">Détecte les meilleures opportunités commerciales, au bon moment.</p>
          <ul className="mt-6 space-y-2.5">
            {mode.items.map((t) => <li key={t} className="flex items-center gap-3 text-[16px] font-semibold land-in"><span className="h-2.5 w-2.5 rounded-full bg-accent" />{t}</li>)}
          </ul>
        </div>
        <div className="rounded-[28px] bg-[#FBF7F3] border border-[#F1E6DC] p-4 sm:p-6">
          <div className="flex gap-2 justify-center" role="tablist">
            {Object.entries(MODES).map(([k, x]) => (
              <button key={k} role="tab" aria-selected={m === k} onClick={() => setM(k)} className={cx("rounded-full px-4 sm:px-6 py-2.5 text-[14px] sm:text-[15px] font-bold transition inline-flex items-center gap-2", m === k ? "bg-accent text-white shadow-[0_10px_24px_-12px_rgba(224,83,31,.9)]" : "bg-white text-ink-soft border border-line hover:text-ink")}>{k === "signal" ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12h4l2-5 4 10 2-5h6" /></svg> : <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></svg>}{x.label}</button>
            ))}
          </div>
          <div className="relative mt-5 grid sm:grid-cols-[1fr_170px] gap-4 items-center">
            <div className="relative mx-auto aspect-square w-full max-w-[300px]">
              <div className="absolute inset-0 rounded-full border border-[#EBDCCF] bg-white" />
              <div className="absolute inset-[17%] rounded-full border border-[#EBDCCF]" />
              <div className="absolute inset-[34%] rounded-full border border-[#EBDCCF]" />
              <div className="absolute inset-0 rounded-full motion-safe:animate-[kspin_4s_linear_infinite]" style={{ background: "conic-gradient(from 0deg, rgba(224,83,31,.28), transparent 22%)" }} />
              {mode.dots.map(([x, y], i) => (
                <span key={m + i} className="absolute h-3 w-3 -ml-1.5 -mt-1.5" style={{ left: `${x}%`, top: `${y}%` }}>
                  <span className="absolute inset-0 rounded-full bg-accent/50 ring-out" style={{ animationDelay: `${0.6 + i * 0.5}s` }} />
                  <span className="pop absolute inset-0 rounded-full bg-accent shadow-[0_0_0_5px_rgba(224,83,31,.15)]" style={{ animationDelay: `${i * 0.18}s` }} />
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
              <div className="rounded-2xl bg-white border border-line p-4 shadow-[0_10px_24px_-18px_rgba(21,22,26,.4)]"><div className="flex items-start justify-between gap-2"><div className="font-black text-[30px] leading-none tabular-nums" style={D}>+{v ? (m === "signal" ? v.signaux : v.marches).toLocaleString("fr-FR") : "…"}</div><svg viewBox="0 0 24 24" className="h-6 w-6 text-accent" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m3 17 6-6 4 4 8-8M15 7h6v6" /></svg></div><div className="mt-2 text-[13px] text-ink-soft font-semibold">{m === "signal" ? "opportunités détectées" : "marchés publics repérés"}</div></div>
              <div className="rounded-2xl bg-white border border-line p-4"><div className="font-black text-[22px] leading-none" style={D}>Chaque nuit</div><div className="mt-1.5 text-[13px] text-ink-soft font-semibold">sources relues, résultats le matin</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Recherche gratuite (sans compte, sans IA) : les contrats publics du métier qui se terminent. État partagé entre le titre et le panneau de résultats. */
function useTry() {
  const [f, setF] = useState({ secteur: "", dept: "" });
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const search = async (e) => {
    e?.preventDefault?.();
    setBusy(true); setErr(""); setR(null);
    document.getElementById("essai")?.scrollIntoView({ behavior: "smooth", block: "start" });
    const secteur = f.secteur.trim().replace(/^(du|des|de la|de l'|de|le|la|les|l'|un|une)\s*/i, "");
    try { setR(await call("free-renewals", { ...f, secteur })); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return { f, setF, r, err, busy, search };
}

const Lock = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
const mois = (d) => new Date(d).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

/** Panneau de résultats : 3 contrats en clair, les suivants floutés, le contact verrouillé (on n'affiche jamais de faux numéro). */
function TryIt({ t }) {
  const nav = useNavigate();
  const { f, setF, r, err, busy, search } = t;
  const LockedContact = () => (
    <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/[.06] border border-white/10 px-3 py-2 text-[12.5px]">
      <Lock className="h-3.5 w-3.5 text-[#F6A06B] shrink-0" />
      <span className="text-white/70">Qui contacter : <span className="select-none blur-[5px] text-white">Responsable des achats</span></span>
    </div>
  );
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[#16171B] text-white p-5 sm:p-8 text-left shadow-[0_40px_80px_-40px_rgba(21,22,26,.7)]">
      <div aria-hidden className="pointer-events-none absolute -right-28 -top-28 h-[440px] w-[440px] rounded-full">
        <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 0deg, transparent 0 300deg, rgba(242,120,52,.35) 359deg, transparent 360deg)", animation: "kspin 7s linear infinite" }} />
        {[0, 1, 2, 3].map((k) => <div key={k} className="absolute rounded-full border border-white/10" style={{ inset: `${k * 14}%` }} />)}
      </div>
      <div className="relative grid grid-cols-1 lg:grid-cols-[.85fr_1.15fr] gap-6 lg:gap-10 items-start [&>*]:min-w-0">
        <div>
          <p className="font-black text-[24px] sm:text-[28px] leading-tight" style={D}>Qui va acheter ce que tu vends ?</p>
          <p className="text-[14.5px] text-white/65 mt-2">Le Radar cherche les acheteurs dont le contrat se termine dans les 12 mois : ils vont devoir choisir un fournisseur. Données officielles, sans compte.</p>
          <form onSubmit={search} className="mt-5">
            <p className="text-[19px] sm:text-[21px] leading-[2.1] font-semibold">
              Je vends{" "}
              <label className="sr-only" htmlFor="tr-secteur">Ce que tu vends</label>
              <input id="tr-secteur" value={f.secteur} onChange={(e) => setF({ ...f, secteur: e.target.value })} placeholder="du nettoyage" className="w-[11ch] min-w-0 bg-transparent border-b-2 border-[#F27834] px-1 text-[#F6A06B] placeholder:text-white/35 outline-none focus:bg-white/5" />
              {" "}dans le{" "}
              <label className="sr-only" htmlFor="tr-dept">Département</label>
              <input id="tr-dept" value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })} placeholder="75" maxLength={3} inputMode="text" className="w-[3.2ch] bg-transparent border-b-2 border-[#F27834] px-1 text-center text-[#F6A06B] placeholder:text-white/35 outline-none focus:bg-white/5" />
            </p>
            <button type="submit" disabled={busy} className="mt-4 w-full rounded-xl bg-accent hover:bg-accent-dark disabled:opacity-60 py-3 font-bold text-[15px] transition">{busy ? "Le Radar fouille les données officielles…" : "Voir mes prochains clients"}</button>
          </form>
          {err && <p className="mt-3 text-[13.5px] text-[#FCA5A5]">{err}</p>}
          <p className="mt-4 text-[13px] text-white/50">Tu veux plutôt espionner un concurrent ? <a href="#/outils/analyse-concurrent" className="text-[#F6A06B] font-semibold hover:underline">Analyse-le gratuitement</a></p>
        </div>
        <div className="min-h-[220px]">
          {busy ? (
            <ul className="space-y-2" aria-hidden>{[0, 1, 2].map((i) => <li key={i} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-4 animate-pulse"><div className="h-2.5 w-28 rounded bg-white/25" /><div className="h-3 w-48 rounded bg-white/20 mt-3" /><div className="h-2.5 w-full rounded bg-white/10 mt-3" /></li>)}</ul>
          ) : !r ? (
            <ul className="space-y-2 opacity-40" aria-hidden>{[0, 1, 2].map((i) => <li key={i} className="rounded-xl border border-dashed border-white/20 px-4 py-4"><div className="h-2.5 w-28 rounded bg-white/25" /><div className="h-3 w-48 rounded bg-white/20 mt-3" /><div className="h-2.5 w-full rounded bg-white/10 mt-3" /></li>)}</ul>
          ) : (
            <div>
              <p className="text-[15.5px]"><b className="text-[30px] font-black" style={D}>{r.total}</b> contrat{r.total > 1 ? "s" : ""} « {r.secteur} » à renouveler dans le {r.dept}{r.montant_total ? <>, <b>{euro(r.montant_total)}</b> au total</> : null}.</p>
              {!r.total && <p className="text-white/60 text-[13.5px] mt-1">Essaie un mot plus large ou un autre département.</p>}
              <ul className="mt-3 space-y-2">
                {r.visibles.map((c, i) => (
                  <li key={i} className="rounded-xl bg-white/[.07] border border-white/10 px-4 py-3 land-in" style={{ animationDelay: `${i * 140}ms` }}>
                    <p className="text-[12.5px] font-semibold text-[#F6A06B]">Fin estimée en {mois(c.fin)}</p>
                    <p className="font-semibold text-[15px] mt-0.5">{c.acheteur}</p>
                    <p className="text-[13px] text-white/65 line-clamp-2">{c.objet}</p>
                    {(c.montant || c.titulaire) && <p className="text-[12.5px] text-white/55 mt-1">{c.montant ? euro(c.montant) : ""}{c.montant && c.titulaire ? ", " : ""}{c.titulaire ? `tenu par ${c.titulaire}` : ""}</p>}
                    <LockedContact />
                  </li>
                ))}
                {(r.apercu ?? []).map((c, i) => (
                  <li key={`a${i}`} className="relative rounded-xl bg-white/[.05] border border-white/10 px-4 py-3 land-in" style={{ animationDelay: `${(i + 3) * 120}ms` }}>
                    <p className="text-[12.5px] font-semibold text-[#F6A06B]">Fin estimée en {mois(c.fin)}{c.montant ? ` · ${euro(c.montant)}` : ""}</p>
                    <div className="select-none blur-[6px]" aria-hidden><p className="font-semibold text-[15px] mt-0.5">Acheteur public masqué</p><p className="text-[13px] text-white/65">Objet du contrat et titulaire actuel</p></div>
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] text-white/80"><Lock className="h-3 w-3" />Compte gratuit</span>
                  </li>
                ))}
              </ul>
              {r.caches > 0 && (
                <div className="mt-4 rounded-2xl bg-white text-ink p-4">
                  <p className="font-bold text-[15.5px]">Débloque les {r.caches} autre{r.caches > 1 ? "s" : ""} et le contact de chaque acheteur</p>
                  <p className="text-[13.5px] text-ink-soft mt-1">Le décideur, son e-mail et son téléphone quand ils sont publiés. 14 jours gratuits, sans carte bancaire.</p>
                  <button onClick={() => nav("/connexion")} className="mt-3 w-full rounded-xl bg-accent text-white py-3 font-bold text-[15px] hover:bg-accent-dark transition">Voir tout gratuitement</button>
                </div>
              )}
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
  ["Il trouve la bonne personne", "La fonction qui décide et son nom, avec son e-mail, son téléphone et son profil LinkedIn quand ils sont trouvables."],
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

/** Apparition des sections au défilement (une seule fois par section). */
function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll(".reveal")];
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

export default function Landing() {
  const nav = useNavigate();
  useReveal();
  const tryState = useTry();
  const [who, setWho] = useState("terrain");
  const [yearly, setYearly] = useState(false);
  const go = () => nav("/connexion");
  const w = WHO.find((x) => x[0] === who);
  return (
    <div className="min-h-full bg-[#FAF9F6] text-ink">
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}@keyframes land-in{from{opacity:0;transform:translateY(10px)}}.land-in{animation:land-in .45s ease-out both}@keyframes drift{50%{transform:translateY(-8px)}}@keyframes marquee{to{transform:translateX(-50%)}}.marquee-track{animation:marquee 32s linear infinite}.marquee:hover .marquee-track{animation-play-state:paused}@media (prefers-reduced-motion: reduce){.marquee-track{animation:none;flex-wrap:wrap;width:auto;justify-content:center}}`}</style>

      {/* Barre de navigation flottante */}
      <div className="sticky top-3 z-30 px-3 sm:px-6">
        <header className="max-w-6xl mx-auto rounded-full bg-ink text-white shadow-[0_14px_34px_-14px_rgba(21,22,26,.55)] h-14 sm:h-[68px] px-4 sm:px-6 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Bingoo!"><Logo inverse height={28} /></button>
          <nav className="flex items-center gap-1 lg:gap-7 text-[15.5px] font-semibold">
            {MENU.map(([t, items]) => items ? (
              <div key={t} className="relative group hidden lg:block">
                <button className="inline-flex items-center gap-1.5 py-3 hover:opacity-80" aria-haspopup="true">{t}<Chev /></button>
                <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition absolute left-1/2 -translate-x-1/2 top-full pt-2 z-40">
                  <div className="w-64 rounded-2xl bg-white text-ink shadow-[0_20px_50px_-20px_rgba(21,22,26,.5)] border border-line p-2">
                    {items.map(([l, d, href]) => <a key={l} href={href} onClick={href.startsWith("#/") ? undefined : scrollTo(href.slice(1))} className="block rounded-xl px-3 py-2.5 hover:bg-[#FFF4EC]"><span className="block text-[15px] font-bold">{l}</span><span className="block text-[13px] font-medium text-ink-soft">{d}</span></a>)}
                  </div>
                </div>
              </div>
            ) : <a key={t} href="#tarifs" onClick={scrollTo("tarifs")} className="hidden lg:inline hover:opacity-80">{t}</a>)}
            <button onClick={() => nav("/connexion?mode=login")} className="px-2 lg:ml-6 hover:opacity-80">Connexion</button>
            <button onClick={go} className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-4 sm:px-6 py-2 sm:py-3 font-bold hover:bg-accent-dark transition">S'inscrire<Arrow className="h-4 w-4" /></button>
          </nav>
        </header>
      </div>

      <main>
        {/* Titre */}
        <section className="relative overflow-hidden -mt-24 pt-24" style={{ background: "radial-gradient(ellipse at 50% 30%, #FFF4EC 0%, #FDF8F4 45%, #FAF9F6 80%)" }}>
          <div aria-hidden className="absolute inset-x-0 top-0 h-[920px] hidden sm:block"><NetBg /></div>
          <HeroBubbles />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-14 text-center">
            <h1 className="hero-in font-black text-[50px] sm:text-[88px] leading-[.95] tracking-[-.03em]" style={D}>Sache qui va acheter.<br />Et <span className="text-accent">quand.</span></h1>
            <p className="hero-in mt-7 text-[18px] sm:text-[21px] leading-relaxed text-ink-soft max-w-2xl mx-auto" style={{ animationDelay: ".15s" }}>Bingoo! est ton équipe commerciale IA. Elle repère les entreprises qui ont une raison d'acheter maintenant, trouve le décideur avec son e-mail, son téléphone et son LinkedIn, et prépare le message.</p>
            <div className="hero-in mt-9 flex flex-col sm:flex-row items-center justify-center gap-3" style={{ animationDelay: ".3s" }}>
              <button onClick={go} className="w-full sm:w-auto rounded-full bg-accent text-white px-8 py-4 text-[17px] font-bold shadow-[0_18px_40px_-18px_rgba(224,83,31,.8)] hover:bg-accent-dark active:scale-[0.98] transition">Commencer gratuitement</button>
              <a href="#essai" onClick={scrollTo("essai")} className="w-full sm:w-auto rounded-full bg-white border border-[#EFE5DC] px-8 py-4 text-[17px] font-bold hover:border-ink/30 transition">Essayer sur mon marché</a>
            </div>
            <p className="hero-in mt-3 text-[14px] text-ink-soft" style={{ animationDelay: ".35s" }}>14 jours gratuits, sans carte bancaire.</p>
            <ul className="hero-in mt-7 flex flex-wrap justify-center gap-2.5" style={{ animationDelay: ".45s" }}>
              {["15 signaux d'achat", "E-mail, téléphone, LinkedIn", "Sans carte bancaire", "Conforme RGPD"].map((t) => <li key={t} className="rounded-full bg-white border border-[#EFE5DC] px-4 py-2 text-[14.5px] font-medium flex items-center gap-2 shadow-[0_6px_16px_-12px_rgba(21,22,26,.3)]"><Check className="h-4 w-4 text-good" />{t}</li>)}
            </ul>
            <div className="hero-in" style={{ animationDelay: ".6s" }}><LivePill /></div>
          </div>
        </section>

        <div className="reveal"><RadarDemo /></div>

        <div className="reveal"><ContactShow go={go} /></div>

        <section id="compteur" className="reveal relative max-w-6xl mx-auto px-4 sm:px-6 pb-14 scroll-mt-24 text-center"><BigCounter /></section>

        <section className="reveal relative max-w-6xl mx-auto px-4 sm:px-6 pb-16"><div id="essai" className="scroll-mt-24"><TryIt t={tryState} /></div></section>

        {/* Sources */}
        <section id="donnees" className="border-y border-line bg-white scroll-mt-24">
          <div className="py-8">
            <p className="text-center text-[14px] text-ink-soft px-4">Bingoo! lit chaque nuit des sources officielles et vérifiables</p>
            <div className="marquee mt-5 overflow-hidden" style={{ maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}>
              <ul className="marquee-track flex w-max items-center">
                {[...SOURCES, ...SOURCES].map((s, i) => <li key={i} aria-hidden={i >= SOURCES.length} className="flex items-center shrink-0 font-black text-[19px] sm:text-[24px] text-ink/40 whitespace-nowrap" style={D}>{s}<span className="mx-8 sm:mx-12 h-2 w-2 rounded-full bg-accent/70" /></li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* Étapes */}
        <section id="produit" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-24">
          <h2 className="text-center font-black text-[34px] sm:text-[50px] leading-[1.02] tracking-[-.02em]" style={D}>Quatre étapes. Un rendez-vous.</h2>
          <p className="text-center mt-4 text-[17px] text-ink-soft max-w-2xl mx-auto">Les autres outils t'aident à contacter des prospects. Bingoo! te dit d'abord qui, pourquoi et quand.</p>
          <ol className="mt-14 grid md:grid-cols-4 gap-10 md:gap-6">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="reveal relative" style={{ transitionDelay: `${i * 0.12}s` }}>
                <div className="flex items-center">
                  <span className="h-14 w-14 rounded-2xl bg-accent text-white grid place-items-center font-black text-[20px] shrink-0" style={D}>{String(i + 1).padStart(2, "0")}</span>
                  {i < STEPS.length - 1 && <span className="grow-line hidden md:block h-[2px] flex-1 bg-accent/40 ml-3" />}
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
                <div key={n} style={{ transitionDelay: `${i * 0.12}s` }} className={cx("reveal relative rounded-3xl p-7", best ? "bg-[#16171B] text-white md:pb-10 md:pt-10 shadow-[0_30px_60px_-30px_rgba(21,22,26,.6)]" : i === 0 ? "bg-white border border-line" : "bg-accent-soft/60 border border-accent/20")}>
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
        <section id="faq" className="bg-white border-y border-line scroll-mt-24">
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
