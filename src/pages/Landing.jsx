import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { legalReady } from "./Legal";
import { cx } from "../lib/utils";
import { TEAM, Avatar } from "./Salaries";

// Page d'accueil publique de Bingoo! : la promesse, et l'essai immédiat sans compte (contrats publics qui se terminent).
const URL_ = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
async function call(action, body) {
  const res = await fetch(`${URL_}/functions/v1/r/${action}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || "Erreur réseau, réessaie");
  return data;
}
const D = { fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 400, letterSpacing: "-.02em" };
const SERIF = { fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 400, fontOpticalSizing: "auto" };
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
  ["Produit", [["Radar", "Qui va acheter, et quand", "#radar"], ["Contacts des décideurs", "E-mail, téléphone, LinkedIn", "#contacts"], ["Tes salariés IA", "Neuf métiers, du repérage au rendez-vous", "#equipe"], ["Comment ça marche", "Quatre étapes jusqu'au rendez-vous", "#produit"], ["Essai en direct", "Teste le Radar sur ton marché", "#essai"]]],
  ["Solutions", [["Services sur site", "Nettoyage, sécurité, maintenance, BTP", "#pour-qui"], ["Services aux entreprises", "Agences, conseil, ESN, formation", "#pour-qui"], ["Logiciels / SaaS", "Prends les clients de tes concurrents", "#pour-qui"], ["Indépendants", "Un commercial à temps plein", "#pour-qui"]]],
  ["Nos données", [["Sources officielles", "BOAMP, BODACC, Sirene, DECP, TED", "#donnees"], ["Compteur en direct", "Ce que le Radar a trouvé", "#compteur"]]],
  ["Tarifs", null],
  ["Ressources", [["Outils gratuits", "Contrats publics, analyse de concurrent", "#/outils"], ["Questions fréquentes", "Tout ce qu'on nous demande", "#faq"]]],
];

/** Aperçu du produit sous le titre : la vraie liste du Radar (acheteurs publics réels, relus en direct), la fiche ouverte, le message prêt. */
const cleanObjet = (o) => { let t = String(o ?? "").replace(/\s+/g, " ").replace(/^.*?\bHT\s*-\s*/i, "").replace(/^lot\s*\d+\s*[-:]?\s*/i, "").replace(/[?]/g, "'").replace(/[\s,;:-]+$/, "").trim(); if (t === t.toUpperCase()) t = t.toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
const MOIS = (d) => new Date(d).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
function ProductShot() {
  const v = useLive();
  const rows = (v?.vitrine ?? []).filter((x, i, a) => a.findIndex((y) => y.acheteur === x.acheteur) === i).slice(0, 6)
    .map((x) => ({ nom: shortBuyer(String(x.acheteur)), cat: catOf(String(x.objet ?? "")), objet: cleanObjet(x.objet), montant: Number(x.montant) || null, fin: x.fin }));
  const [sel, setSel] = useState(0);
  useEffect(() => { if (!rows.length) return; const t = setInterval(() => setSel((n) => (n + 1) % Math.min(rows.length, 4)), 4200); return () => clearInterval(t); }, [rows.length]);
  const r = rows[sel];
  const NAV = [["Radar", true], ["Prospects"], ["Messages"], ["Rendez-vous"], ["Espion"], ["Mission"]];
  return (
    <div className="relative mx-auto mt-16 sm:mt-20 max-w-[1180px] text-left">
      <div className="rounded-2xl bg-[#F1EFED] p-2 sm:p-3 shadow-[0_40px_80px_-50px_rgba(21,22,26,.5)]">
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
          <div className="flex items-center gap-2 border-b border-black/10 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E5E2DF]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E5E2DF]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E5E2DF]" />
            <span className="ml-3 rounded-md bg-[#F6F5F3] px-3 py-1 text-[12px] text-ink-soft">app.bingoo · Radar</span>
            <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-[12px] text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-good" />Données réelles, mises à jour cette nuit</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)_320px] min-h-[420px]">
            <aside className="hidden md:block border-r border-black/10 bg-[#FBFAF9] p-3 text-[13.5px]">
              <div className="px-2 pb-3"><Logo height={18} /></div>
              {NAV.map(([l, on]) => <div key={l} className={cx("rounded-md px-2.5 py-1.5", on ? "bg-white border border-black/10 font-medium text-ink" : "text-ink-soft")}>{l}</div>)}
              <div className="mt-6 rounded-lg border border-black/10 bg-white p-2.5">
                <p className="text-[11.5px] text-ink-soft">Trouvées par le Radar</p>
                <p className="text-[20px] tabular-nums text-ink" style={SERIF}>{v ? (v.total ?? 0).toLocaleString("fr-FR") : "…"}</p>
              </div>
            </aside>
            <div className="min-w-0 border-r border-black/10">
              <div className="flex items-center justify-between gap-2 border-b border-black/10 px-4 py-3">
                <p className="text-[15px] text-ink" style={SERIF}>Contrats qui se terminent</p>
                <div className="hidden sm:flex gap-1.5 text-[12px]">{["Tous", "Nettoyage", "Sécurité", "12 mois"].map((f, i) => <span key={f} className={cx("rounded-md border px-2 py-0.5", i === 0 ? "border-ink text-ink" : "border-black/10 text-ink-soft")}>{f}</span>)}</div>
              </div>
              <ul>
                {(rows.length ? rows : Array.from({ length: 6 }, () => null)).map((x, i) => (
                  <li key={i} onClick={() => x && setSel(i)} className={cx("grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-black/[.06] px-4 py-3 cursor-default transition-colors", i === sel && x ? "bg-[#FFF5EF]" : "")}>
                    {x ? <>
                      <div className="min-w-0"><p className="truncate text-[14px] font-medium text-ink">{x.nom}</p><p className="truncate text-[12.5px] text-ink-soft">{x.objet}</p></div>
                      <div className="text-right"><p className="text-[13px] tabular-nums text-ink">{x.montant ? euro(x.montant) : "—"}</p><p className="text-[12px] text-accent-dark">fin {MOIS(x.fin)}</p></div>
                    </> : <><div><div className="h-3 w-40 rounded bg-black/[.06]" /><div className="mt-2 h-2.5 w-64 max-w-full rounded bg-black/[.04]" /></div><div className="h-3 w-12 rounded bg-black/[.06]" /></>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden md:flex flex-col p-4 gap-3">
              {r ? <div key={sel} className="land-in flex flex-col gap-3">
                <span className="self-start rounded-md bg-[#FFF1E8] px-2 py-0.5 text-[12px] font-medium text-accent-dark">{r.cat} · fin {MOIS(r.fin)}</span>
                <p className="text-[19px] leading-tight text-ink" style={SERIF}>{r.nom}</p>
                <p className="text-[12.5px] text-ink-soft line-clamp-3">{r.objet}</p>
                <div className="rounded-lg border border-black/10 p-3">
                  <p className="text-[11.5px] text-ink-soft">Décideur</p>
                  <div className="mt-1.5 flex items-center gap-2.5"><span className="h-8 w-8 rounded-full bg-ink text-white grid place-items-center text-[12px]">?</span><div><p className="text-[13.5px] text-ink select-none blur-[4px]">Prénom Nom</p><p className="text-[12px] text-ink-soft">Service achats</p></div></div>
                  <div className="mt-2.5 grid gap-1.5 text-[12px]">{["E-mail", "Téléphone", "LinkedIn"].map((k) => <div key={k} className="flex justify-between rounded-md bg-[#F6F5F3] px-2 py-1"><span className="text-ink-soft">{k}</span><span className="select-none blur-[4px]">xxxxxxxx</span></div>)}</div>
                </div>
                <div className="rounded-lg border border-black/10 p-3">
                  <p className="text-[11.5px] text-ink-soft">Message préparé</p>
                  <div className="mt-2 space-y-1.5"><div className="h-2 w-full rounded bg-black/[.07]" /><div className="h-2 w-11/12 rounded bg-black/[.07]" /><div className="h-2 w-4/5 rounded bg-black/[.07]" /></div>
                  <div className="mt-3 flex gap-1.5"><span className="rounded-md bg-ink px-2.5 py-1 text-[12px] text-white">Valider l'envoi</span><span className="rounded-md border border-black/10 px-2.5 py-1 text-[12px] text-ink-soft">Modifier</span></div>
                </div>
              </div> : <div className="h-full rounded-lg bg-black/[.03]" />}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[13px] text-ink-soft">Acheteurs et contrats réels, lus dans les données publiques. Le décideur et ses coordonnées s'affichent une fois inscrit.</p>
    </div>
  );
}

/** Rangée des sources qui défile, à la manière d'une rangée de logos clients. */
const SRC = ["BOAMP", "BODACC", "Sirene", "DECP", "TED Europa", "Sites web", "Registre national des entreprises", "Données de la commande publique"];
function SourcesRow() {
  return (
    <div id="donnees" className="mx-auto mt-16 max-w-[1180px] scroll-mt-24">
      <p className="text-[15px] text-ink-soft">Bingoo! lit chaque nuit des sources officielles et vérifiables</p>
      <div className="marquee mt-6 overflow-hidden" style={{ maskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)" }}>
        <ul className="marquee-track flex w-max items-center text-[22px] sm:text-[26px] text-ink/45" style={SERIF}>
          {[...SRC, ...SRC].map((x, i) => <li key={i} aria-hidden={i >= SRC.length} className="shrink-0 whitespace-nowrap px-6 sm:px-9">{x}</li>)}
        </ul>
      </div>
    </div>
  );
}

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
  const [f, setF] = useState({ url: "" });
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const search = async (e) => {
    e?.preventDefault?.();
    setBusy(true); setErr(""); setR(null);
    document.getElementById("essai")?.scrollIntoView({ behavior: "smooth", block: "start" });
    try { setR(await call("free-site", f)); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return { f, setF, r, err, busy, search };
}

const Lock = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;

/** Essai universel : « tes clients, c'est qui ? » → les entreprises de cette cible qui vivent un moment d'achat (annonces légales officielles).
 *  Marche pour un logiciel, un service ou un produit. 3 en clair, la suite floutée, le décideur verrouillé (jamais de faux contact). */
const SIG_TONE = { creation: "#F6A06B", ouverture: "#7DD3B0", reprise: "#A5B4FC" };
function TryIt({ t }) {
  const nav = useNavigate();
  const { f, setF, r, err, busy, search } = t;
  const field = "rounded-xl bg-white/10 border border-white/15 px-3.5 py-3 text-[15px] placeholder:text-white/40 outline-none focus:border-[#F27834] min-w-0";
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[#16171B] text-white p-5 sm:p-8 text-left shadow-[0_40px_80px_-40px_rgba(21,22,26,.7)]">
      <div aria-hidden className="pointer-events-none absolute -right-28 -top-28 h-[440px] w-[440px] rounded-full">
        <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 0deg, transparent 0 300deg, rgba(242,120,52,.35) 359deg, transparent 360deg)", animation: "kspin 7s linear infinite" }} />
        {[0, 1, 2, 3].map((k) => <div key={k} className="absolute rounded-full border border-white/10" style={{ inset: `${k * 14}%` }} />)}
      </div>
      <div className="relative grid grid-cols-1 lg:grid-cols-[.85fr_1.15fr] gap-6 lg:gap-10 items-start [&>*]:min-w-0">
        <div>
          <p className="font-black text-[24px] sm:text-[28px] leading-tight" style={D}>Lance le Radar sur ton entreprise</p>
          <p className="text-[14.5px] text-white/65 mt-2">Donne ton site. Bingoo! comprend ce que tu vends et à qui, puis te montre les entreprises qui viennent de se créer ou d'être reprises : celles qui choisissent leurs fournisseurs en ce moment.</p>
          <form onSubmit={search} className="mt-5 grid gap-2">
            <label className="text-[13px] font-semibold text-white/80" htmlFor="tr-url">Ton site</label>
            <div className="flex items-center rounded-xl bg-white/10 border border-white/15 focus-within:border-[#F27834] min-w-0">
              <span className="pl-3.5 text-white/40 text-[15px] select-none">https://</span>
              <input id="tr-url" value={f.url} onChange={(e) => setF({ url: e.target.value.replace(/^https?:\/\//i, "") })} placeholder="monentreprise.fr" inputMode="url" autoComplete="url" className="w-full min-w-0 bg-transparent px-1 py-3 text-[15px] placeholder:text-white/40 outline-none" />
            </div>
            <button type="submit" disabled={busy || !f.url.trim()} className="rounded-xl bg-accent hover:bg-accent-dark disabled:opacity-60 py-3 font-bold text-[15px] transition">{busy ? "Bingoo! lit ton site et cherche tes clients…" : "Lancer le Radar"}</button>
          </form>
          {err && <p className="mt-3 text-[13.5px] text-[#FCA5A5]">{err}</p>}
          <p className="mt-4 text-[13px] text-white/50">Tu vends aux collectivités ? <a href="#/outils/contrats-publics" className="text-[#F6A06B] font-semibold hover:underline">Vois leurs contrats qui se terminent</a>. Un concurrent à espionner ? <a href="#/outils/analyse-concurrent" className="text-[#F6A06B] font-semibold hover:underline">Analyse-le</a>.</p>
        </div>
        <div className="min-h-[220px]">
          {busy ? (
            <ul className="space-y-2" aria-hidden>{[0, 1, 2].map((i) => <li key={i} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-4 animate-pulse"><div className="h-2.5 w-28 rounded bg-white/25" /><div className="h-3 w-48 rounded bg-white/20 mt-3" /><div className="h-2.5 w-full rounded bg-white/10 mt-3" /></li>)}</ul>
          ) : !r ? (
            <ul className="space-y-2 opacity-40" aria-hidden>{[0, 1, 2].map((i) => <li key={i} className="rounded-xl border border-dashed border-white/20 px-4 py-4"><div className="h-2.5 w-28 rounded bg-white/25" /><div className="h-3 w-48 rounded bg-white/20 mt-3" /><div className="h-2.5 w-full rounded bg-white/10 mt-3" /></li>)}</ul>
          ) : (
            <div>
              {r.offre && <p className="text-[13.5px] text-white/70 mb-2"><b className="text-white">{r.nom}</b> : {r.offre.replace(/\.$/, "")}{r.clients ? `, ${r.clients.replace(/\.$/, "")}` : ""}.</p>}
              <p className="text-[15.5px]"><b className="text-[30px] font-black" style={D}>{r.total}</b> client{r.total > 1 ? "s" : ""} potentiel{r.total > 1 ? "s" : ""} en moment d'achat en France, ces {r.jours} derniers jours.</p>
              {!r.total && <p className="text-white/60 text-[13.5px] mt-1">Rien de neuf ces dernières semaines sur ta cible. Crée ton compte : le Radar suit aussi les changements de dirigeant, les recrutements et les appels d'offres.</p>}
              <ul className="mt-3 space-y-2">
                {r.visibles.map((c, i) => (
                  <li key={i} className="rounded-xl bg-white/[.07] border border-white/10 px-4 py-3 land-in" style={{ animationDelay: `${i * 140}ms` }}>
                    <p className="text-[12.5px] font-semibold" style={{ color: SIG_TONE[c.kind] }}>{c.signal}, le {new Date(c.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
                    <p className="font-semibold text-[15px] mt-0.5">{c.nom}{c.ville ? <span className="font-normal text-white/55">, {c.ville}</span> : null}</p>
                    <p className="text-[13px] text-white/65 line-clamp-2">{c.activite}</p>
                    <p className="text-[12.5px] text-white/55 mt-1">{c.pourquoi}</p>
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/[.06] border border-white/10 px-3 py-2 text-[12.5px]">
                      <Lock className="h-3.5 w-3.5 text-[#F6A06B] shrink-0" />
                      <span className="text-white/70">Le décideur : <span className="select-none blur-[5px] text-white">Prénom Nom, gérant</span></span>
                    </div>
                  </li>
                ))}
                {(r.apercu ?? []).map((c, i) => (
                  <li key={`a${i}`} className="relative rounded-xl bg-white/[.05] border border-white/10 px-4 py-3 land-in" style={{ animationDelay: `${(i + 3) * 120}ms` }}>
                    <p className="text-[12.5px] font-semibold text-white/70">{c.signal}{c.ville ? `, ${c.ville}` : ""}</p>
                    <div className="select-none blur-[6px]" aria-hidden><p className="font-semibold text-[15px] mt-0.5">Entreprise masquée</p><p className="text-[13px] text-white/65">Activité et décideur</p></div>
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] text-white/80"><Lock className="h-3 w-3" />Compte gratuit</span>
                  </li>
                ))}
              </ul>
              {r.caches > 0 && (
                <div className="mt-4 rounded-2xl bg-white text-ink p-4">
                  <p className="font-bold text-[15.5px]">Débloque les {r.caches} autre{r.caches > 1 ? "s" : ""}, avec le décideur de chacune</p>
                  <p className="text-[13.5px] text-ink-soft mt-1">Bingoo! trouve la bonne personne, prépare le message et le relance. 14 jours gratuits, sans carte bancaire.</p>
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

/* ---------- Sections façon Apollo, adaptées à Bingoo! ---------- */
const ICONS = {
  radar: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 12l5-5" /></>,
  doc: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h6M9.5 16h6" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12" /><circle cx="12" cy="12" r="3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  link: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" /></>,
  spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></>,
  send: <><path d="M4 12 20 4l-6 16-3-7z" /><path d="m11 13 9-9" /></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  flag: <><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></>,
};
const Ico = ({ k, className = "h-6 w-6" }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONS[k]}</svg>;

function Feature({ id, flip, title, text, bullets, cta, visual }) {
  const nav = useNavigate();
  const [label, href] = cta;
  const onCta = (e) => { if (!href) { e.preventDefault(); nav("/connexion"); } else if (href.startsWith("#") && !href.startsWith("#/")) scrollTo(href.slice(1))(e); };
  return (
    <section id={id} className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-14 sm:py-20">
      <div className="mx-auto max-w-[1300px] grid lg:grid-cols-2 gap-10 lg:gap-20 items-center [&>*]:min-w-0">
        <div className={cx("rounded-2xl bg-[#F1EFED] p-4 sm:p-12 min-h-[420px] flex items-center justify-center", flip && "lg:order-2")}>{visual}</div>
        <div className={cx("flex flex-col", flip && "lg:order-1")}>
          <h2 className="text-[38px] sm:text-[54px] leading-[1.05] tracking-[-.03em] text-ink" style={SERIF}>{title}</h2>
          <p className="mt-6 max-w-[560px] text-[17px] sm:text-[19px] leading-[1.5] text-ink">{text}</p>
          <ul className="mt-12 space-y-4">
            {bullets.map(([k, t], i) => <li key={i} className="flex gap-3.5 text-[17px] sm:text-[18px] leading-[1.45] text-ink"><Ico k={k} className="h-6 w-6 shrink-0 mt-0.5 text-ink" /><span>{t}</span></li>)}
          </ul>
          <a href={href ?? "#/connexion"} onClick={onCta} className="mt-10 self-start rounded-lg border border-ink px-7 py-3.5 text-[17px] sm:text-[18px] text-ink hover:bg-black/[.04] transition">{label}</a>
        </div>
      </div>
    </section>
  );
}

const Window = ({ children, className = "" }) => (
  <div className={cx("w-full max-w-[480px] overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_24px_50px_-30px_rgba(21,22,26,.35)]", className)}>
    <div className="flex gap-1.5 border-b border-black/[.07] bg-[#F6F5F3] px-3.5 py-2.5"><span className="h-2.5 w-2.5 rounded-full bg-black/15" /><span className="h-2.5 w-2.5 rounded-full bg-black/15" /><span className="h-2.5 w-2.5 rounded-full bg-black/15" /></div>
    {children}
  </div>
);

function RadarVisual() {
  const v = useLive();
  const rows = (v?.vitrine ?? []).filter((x, i, a) => a.findIndex((y) => y.acheteur === x.acheteur) === i).slice(0, 3);
  return (
    <div className="w-full max-w-[480px]">
      <Window>
        <div className="p-4 space-y-2.5">
          <p className="text-[12px] text-ink-soft">Radar · cette nuit</p>
          {(rows.length ? rows : [null, null, null]).map((x, i) => (
            <div key={i} className="rounded-lg border border-black/[.08] p-3">
              {x ? <>
                <div className="flex items-center justify-between gap-2"><span className="rounded bg-[#FFF1E8] px-1.5 py-0.5 text-[11px] font-medium text-accent-dark">Contrat qui se termine</span><span className="text-[12px] text-accent-dark">fin {MOIS(x.fin)}</span></div>
                <p className="mt-1.5 text-[14px] font-medium text-ink truncate">{shortBuyer(String(x.acheteur))}</p>
                <p className="text-[12px] text-ink-soft truncate">{cleanObjet(x.objet)}{x.montant ? ` · ${euro(Number(x.montant))}` : ""}</p>
              </> : <><div className="h-3 w-32 rounded bg-black/[.06]" /><div className="mt-2 h-3 w-48 rounded bg-black/[.05]" /></>}
            </div>
          ))}
        </div>
      </Window>
      <div className="mx-auto mt-0 h-6 w-px bg-black/20" />
      <div className="flex flex-wrap items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#FFE3D2] via-[#FFF1E8] to-[#FFD9C2] p-2">
        <span className="px-2 text-[11px] tracking-wide text-ink-soft">SOURCES</span>
        {["BOAMP", "BODACC", "Sirene", "DECP", "TED"].map((x) => <span key={x} className="rounded-md bg-white px-2.5 py-2 text-[12px] font-medium text-ink shadow-sm">{x}</span>)}
      </div>
    </div>
  );
}

function ContactVisual() {
  return (
    <Window>
      <div className="p-5">
        <div className="grid grid-cols-2 rounded-lg border border-black/10 p-1 text-[12.5px]"><span className="rounded-md bg-ink py-1.5 text-center text-white">Personne</span><span className="py-1.5 text-center text-ink-soft">Organisation</span></div>
        <p className="mt-4 text-[20px] text-ink" style={SERIF}>Claire Martin <span className="ml-1 align-middle text-[11px] text-ink-faint" style={{ fontFamily: "inherit" }}>exemple</span></p>
        <p className="text-[13px] text-ink-soft">Responsable de la commande publique</p>
        <p className="text-[13px] text-ink-soft">Ville de 40 000 habitants</p>
        <div className="mt-4 grid grid-cols-3 rounded-xl border border-black/10 py-3 text-center text-[11.5px] text-ink-soft shadow-sm">
          {[["Ajouter", "bg-accent text-white"], ["À une Mission", "bg-[#F6F5F3] text-ink"], ["Écrire", "bg-[#F6F5F3] text-ink"]].map(([l, c], i) => <div key={l}><span className={cx("mx-auto mb-1.5 grid h-8 w-8 place-items-center rounded-full", c)}><Ico k={["user", "spark", "send"][i]} className="h-4 w-4" /></span>{l}</div>)}
        </div>
        <p className="mt-5 text-[12.5px] font-medium text-ink">Coordonnées</p>
        <p className="mt-3 text-[10.5px] tracking-wide text-ink-soft">E-MAIL</p>
        <span className="mt-1 inline-block rounded-md border border-black/15 px-2.5 py-1 text-[12px] text-ink">Voir l'e-mail</span>
        <p className="mt-3 text-[10.5px] tracking-wide text-ink-soft">TÉLÉPHONE</p>
        <span className="mt-1 inline-block rounded-md border border-black/15 px-2.5 py-1 text-[12px] text-ink">Voir le numéro</span>
      </div>
    </Window>
  );
}

function MissionVisual() {
  return (
    <div className="relative w-full max-w-[460px]">
      <div className="h-2 rounded-t-xl bg-gradient-to-r from-[#FFD9C2] via-[#FFF1E8] to-[#F59A5C]" />
      <div className="rounded-b-xl bg-white px-6 pt-8 pb-6 shadow-[0_24px_50px_-30px_rgba(21,22,26,.35)] text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center text-accent"><Ico k="spark" className="h-9 w-9" /></span>
        <p className="mt-3 text-[26px] text-ink" style={SERIF}>Mission terminée</p>
        <p className="mt-1 text-[14px] text-ink-soft">Cibles choisies, décideurs trouvés, messages prêts.</p>
        <div className="mt-6 rounded-xl bg-[#1F1F1F] p-4 text-left text-white">
          <div className="flex items-center gap-2 text-[13.5px]"><Ico k="doc" className="h-4 w-4" /><span className="truncate">Décideurs des contrats de nettoyage à renouveler</span></div>
          <div className="mt-3 space-y-2">
            {[["Responsable des achats", 1], ["Directeur général", .7], ["Directrice des services", .4]].map(([r, o]) => <div key={r} className="flex items-center justify-between gap-2 rounded-lg bg-white/[.06] px-3 py-2" style={{ opacity: o }}><span className="select-none text-[13px] blur-[3px]">Prénom Nom</span><span className="rounded-full bg-[#3B5B2E] px-2 py-0.5 text-[11.5px] text-[#CFF5B5]">{r}</span></div>)}
          </div>
          <div className="mt-3 flex gap-2 text-[12px]"><span className="rounded-md bg-accent px-2.5 py-1">Valider les messages</span><span className="rounded-md bg-white/10 px-2.5 py-1">Relire</span></div>
        </div>
      </div>
    </div>
  );
}

function SpyVisual() {
  return (
    <div className="w-full max-w-[460px]">
      <div className="mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
        <span className="px-2 text-[11px] tracking-wide text-ink-soft">SUIVI</span>
        {["Site", "Prix", "Pubs", "Avis", "Offres"].map((x) => <span key={x} className="rounded-md bg-[#F6F5F3] px-2.5 py-2 text-[12px] text-ink">{x}</span>)}
      </div>
      <div className="mx-auto h-6 w-px bg-black/20" />
      <div className="rounded-xl bg-white p-5 shadow-[0_24px_50px_-30px_rgba(21,22,26,.35)]">
        <p className="text-[11px] tracking-wide text-ink-soft">CONCURRENT SUIVI</p>
        <div className="mt-3 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-white" style={SERIF}>C</span><p className="text-[18px] text-ink" style={SERIF}>concurrent.fr</p><span className="rounded bg-[#E8F5E0] px-1.5 py-0.5 text-[10.5px] text-[#3B6B2A]">SUIVI</span></div>
        <div className="mt-4 divide-y divide-black/[.07] text-[14px]">
          {[["A changé ses prix", "cette semaine"], ["3 publicités actives", "depuis 12 jours"], ["Avis : délais non tenus", "point faible"], ["Angle pour le battre", "envoyé à Mission"]].map(([a, b]) => <div key={a} className="flex items-center justify-between py-2.5"><span className="text-ink">{a}</span><span className="text-[12px] text-ink-soft">{b}</span></div>)}
        </div>
      </div>
    </div>
  );
}

/** Les 9 salariés IA, comme dans l'application : chacun son métier ; l'un après l'autre se met au travail. */
function Team() {
  const [busy, setBusy] = useState(0);
  useEffect(() => { const t = setInterval(() => setBusy((n) => (n + 1) % TEAM.length), 2600); return () => clearInterval(t); }, []);
  return (
    <section id="equipe" className="reveal scroll-mt-24 px-5 sm:px-10 lg:px-20 py-20 sm:py-28">
      <div className="mx-auto max-w-[1300px]">
        <div className="text-center">
          <h2 className="mx-auto max-w-[820px] text-[42px] sm:text-[64px] leading-[1.02] tracking-[-.03em] text-ink" style={SERIF}>Neuf salariés IA. Un seul abonnement.</h2>
          <p className="mx-auto mt-6 max-w-[640px] text-[17px] sm:text-[19px] leading-[1.5] text-ink">Chacun a son métier, du repérage au rendez-vous. Tu les vois travailler, tu valides ce qui part.</p>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEAM.map((a, i) => (
            <div key={a.id} className={cx("flex gap-4 rounded-2xl border p-5 transition-colors", busy === i ? "border-accent/40 bg-[#FFF8F3]" : "border-black/10 bg-white")}>
              <Avatar id={a.id} working={busy === i} className="w-[92px] h-[118px]" />
              <div className="min-w-0">
                <p className="text-[24px] leading-tight text-ink" style={SERIF}>{a.first}</p>
                <p className="text-[14.5px] text-ink-soft">{a.role}</p>
                <p className="mt-2 text-[15px] leading-[1.45] text-ink">{a.desc}</p>
                {busy === i && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-[12.5px] text-accent-dark land-in"><span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />Au travail</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const LAYERS = [
  ["Détecter", "Le Radar lit chaque nuit les données publiques et repère les entreprises qui ont une raison d'acheter maintenant.", "radar", ["Radar Signal", "Radar Intention", "Contrats publics"]],
  ["Comprendre", "L'Espion suit tes concurrents et trouve les décideurs, pour savoir à qui parler et quoi leur dire.", "eye", ["Espion", "Décideurs", "Veille"]],
  ["Agir", "Mission écrit, relance et pose les rendez-vous. Tu valides, tu conclus.", "send", ["Mission", "Salariés IA", "Rendez-vous"]],
];
function Layers() {
  return (
    <section className="bg-[#F6F5F3] px-5 sm:px-10 py-20 sm:py-28">
      <div className="mx-auto max-w-[1300px] text-center">
        <h2 className="mx-auto max-w-[700px] text-[42px] sm:text-[64px] leading-[1.02] tracking-[-.03em] text-ink" style={SERIF}>Un système. Trois étapes.</h2>
        <p className="mx-auto mt-6 max-w-[600px] text-[17px] sm:text-[19px] leading-[1.5] text-ink">Le Radar trouve. L'Espion éclaire. Mission agit. Chaque réponse apprend au Radar ce qui marche pour toi.</p>
        <div className="relative mt-16">
          <div aria-hidden className="pointer-events-none absolute -inset-x-2 sm:-inset-x-6 -top-6 bottom-1/2 hidden md:block rounded-t-[28px] border border-dashed border-black/25" />
          <div className="relative grid md:grid-cols-3 gap-4">
            {LAYERS.map(([t, d, k, chips]) => (
              <div key={t} className="flex flex-col rounded-2xl border border-black/10 bg-white px-6 sm:px-8 pt-10 pb-8">
                <h3 className="text-[34px] sm:text-[44px] tracking-[-.03em] text-ink" style={SERIF}>{t}</h3>
                <p className="mx-auto mt-3 max-w-[340px] text-[16px] sm:text-[17px] leading-[1.5] text-ink">{d}</p>
                <div className="mx-auto my-10 grid h-28 w-28 place-items-center rounded-full bg-[#FFF1E8] text-accent"><Ico k={k} className="h-14 w-14" /></div>
                <div className="mt-auto flex flex-wrap justify-center gap-2">{chips.map((c) => <span key={c} className="rounded-md bg-[#F1EFED] px-3 py-1.5 text-[15px] text-ink">{c}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const WHY = [
  ["flag", "Fait pour le marché français", "Commande publique, BODACC, registre national, BOAMP : des sources que les outils américains ne lisent pas."],
  ["radar", "Le bon moment, pas une liste", "Bingoo! ne vend pas une base de contacts. Il te dit qui a une raison d'acheter cette semaine, et pourquoi."],
  ["check", "Rien ne part sans toi", "Chaque message attend ta validation, tant que tu n'as pas choisi le pilote automatique et sa limite d'envoi."],
  ["shield", "Conçu pour le RGPD", "E-mails publiés ou vérifiés, jamais devinés. Opposition en un clic, appliquée tout de suite à tous tes envois."],
];
function Why() {
  return (
    <section className="bg-[#F6F5F3] px-5 sm:px-10 py-20 sm:py-24">
      <div className="mx-auto max-w-[1300px] text-center">
        <h2 className="mx-auto max-w-[760px] text-[42px] sm:text-[64px] leading-[1.02] tracking-[-.03em] text-ink" style={SERIF}>Une IA qui prospecte vraiment</h2>
        <p className="mx-auto mt-6 max-w-[640px] text-[17px] sm:text-[19px] leading-[1.5] text-ink">Les autres outils t'aident à contacter des prospects. Bingoo! te dit d'abord qui contacter, pourquoi et quand.</p>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {WHY.map(([k, t, d]) => <div key={t} className="rounded-xl bg-white p-7 sm:p-8"><Ico k={k} className="h-9 w-9 text-ink" /><h3 className="mt-8 text-[24px] sm:text-[28px] leading-[1.15] tracking-[-.02em] text-ink" style={SERIF}>{t}</h3><p className="mt-4 text-[16px] leading-[1.5] text-ink">{d}</p></div>)}
        </div>
      </div>
    </section>
  );
}

const FLOW = [
  ["Ta boîte mail", "Bingoo! lit les réponses à tes messages, les trie et te signale celles qui comptent."],
  ["Ton agenda", "Les prospects réservent un créneau sur ta page de rendez-vous, sans aller-retour d'e-mails."],
  ["Garde le contrôle", "Tu valides chaque message, tu fixes ta limite d'envoi par jour, tu coupes le pilote automatique quand tu veux."],
  ["Reste conforme", "Chaque message permet de ne plus être contacté. Les données anciennes sont purgées automatiquement."],
];
const BADGES = [["shield", "RGPD"], ["flag", "Sources officielles"], ["mail", "E-mails vérifiés"], ["check", "Validation avant envoi"], ["user", "Opposition en 1 clic"], ["trash", "Purge automatique"]];
function Workflow() {
  return (
    <section className="px-5 sm:px-10 lg:px-20 py-20 sm:py-28">
      <div className="mx-auto max-w-[1300px] grid lg:grid-cols-2 gap-12 lg:gap-20">
        <div>
          <h2 className="text-[46px] sm:text-[72px] leading-[1.02] tracking-[-.03em] text-ink" style={SERIF}>Ne change rien à ta façon de travailler. Ajoute simplement Bingoo!</h2>
          <p className="mt-6 max-w-[560px] text-[17px] sm:text-[19px] leading-[1.5] text-ink">Bingoo! se branche sur ta boîte mail et ton agenda. Tu continues comme avant, il prospecte à côté.</p>
          <a href="#/connexion" className="mt-10 inline-block rounded-lg border border-ink px-7 py-3.5 text-[17px] sm:text-[18px] text-ink hover:bg-black/[.04] transition">Commencer gratuitement</a>
        </div>
        <div className="divide-y divide-black/15 border-b border-black/15">
          {FLOW.map(([t, d], i) => (
            <details key={t} open={i < 3} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[24px] sm:text-[30px] tracking-[-.02em] text-ink" style={SERIF}>{t}<span className="text-[28px] leading-none font-light text-ink group-open:hidden">+</span><span className="hidden text-[28px] leading-none font-light text-ink group-open:inline">−</span></summary>
              <p className="mt-4 text-[16px] sm:text-[17px] leading-[1.5] text-ink-soft">{d}</p>
            </details>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-20 max-w-[1300px] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {BADGES.map(([k, l]) => <div key={l} className="text-center"><div className="grid aspect-square place-items-center rounded-xl bg-[#F6F5F3]"><span className="grid h-20 w-20 place-items-center rounded-full border border-black/30 text-ink"><Ico k={k} className="h-9 w-9" /></span></div><p className="mt-3 text-[13px] tracking-[.08em] text-ink-soft uppercase">{l}</p></div>)}
      </div>
    </section>
  );
}

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

      {/* Haut de page : cadre gris, menu à plat, panneau blanc */}
      <div className="bg-[#D6D1CD]">
        <header className="sticky top-0 z-30 bg-[#D6D1CD]">
          <div className="mx-auto max-w-[1440px] h-[64px] px-4 sm:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-10">
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Bingoo!"><Logo height={26} /></button>
              <nav className="hidden lg:flex items-center gap-8 text-[17px] text-ink">
                {MENU.map(([t, items]) => items ? (
                  <div key={t} className="relative group">
                    <button className="inline-flex items-center gap-1.5 py-4 hover:opacity-70" aria-haspopup="true">{t}<Chev /></button>
                    <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition absolute left-0 top-full z-40">
                      <div className="w-72 rounded-xl bg-white text-ink shadow-[0_20px_50px_-20px_rgba(21,22,26,.45)] border border-black/10 p-2">
                        {items.map(([l, d, href]) => <a key={l} href={href} onClick={href.startsWith("#/") ? undefined : scrollTo(href.slice(1))} className="block rounded-lg px-3 py-2.5 hover:bg-black/[.04]"><span className="block text-[15px] font-medium">{l}</span><span className="block text-[13px] text-ink-soft">{d}</span></a>)}
                      </div>
                    </div>
                  </div>
                ) : <a key={t} href="#tarifs" onClick={scrollTo("tarifs")} className="hover:opacity-70">{t}</a>)}
              </nav>
            </div>
            <div className="flex items-center gap-3 sm:gap-5 text-[16px] sm:text-[17px]">
              <button onClick={() => nav("/connexion?mode=login")} className="hidden sm:inline hover:opacity-70">Se connecter</button>
              <a href="#essai" onClick={scrollTo("essai")} className="hidden md:inline-flex rounded-lg border border-ink px-5 py-2.5 hover:bg-black/[.04]">Essayer avec mon site</a>
              <button onClick={go} className="rounded-lg bg-accent text-white px-4 sm:px-5 py-2.5 hover:bg-accent-dark transition">S'inscrire</button>
            </div>
          </div>
        </header>

        <div className="px-0 sm:px-8">
          <section className="mx-auto max-w-[1440px] bg-white px-5 sm:px-10 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
            <h1 className="hero-in mx-auto max-w-[1100px] text-ink text-[46px] sm:text-[72px] lg:text-[96px] leading-[1.02] tracking-[-.035em]" style={SERIF}>Trouve qui va acheter ton offre, et quand</h1>
            <p className="hero-in mx-auto mt-8 max-w-[690px] text-[18px] sm:text-[21px] leading-[1.45] text-ink" style={{ animationDelay: ".1s" }}>Passe plus de temps à vendre et moins à chercher, grâce à une équipe commerciale IA qui repère les entreprises prêtes à acheter, trouve le décideur et prépare le message.</p>
            <div className="hero-in mt-10 inline-flex flex-col sm:flex-row gap-1.5 rounded-xl bg-[#F1EFED] p-1.5" style={{ animationDelay: ".2s" }}>
              <button onClick={go} className="rounded-lg bg-[#1C1C1C] text-white px-10 py-4 text-[18px] sm:text-[19px] hover:bg-black transition">Commencer gratuitement</button>
              <a href="#essai" onClick={scrollTo("essai")} className="rounded-lg bg-white border border-black/10 px-10 py-4 text-[18px] sm:text-[19px] hover:bg-[#FAFAF9] transition">Essayer avec mon site</a>
            </div>
            <div className="hero-in mt-8" style={{ animationDelay: ".25s" }}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EFED] px-3 py-1.5 text-[14.5px] text-ink-soft"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>Aucune carte bancaire requise</span>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const em = new FormData(e.currentTarget).get("email"); nav(`/connexion?email=${encodeURIComponent(String(em ?? "").trim())}`); }} className="hero-in mx-auto mt-8 max-w-[722px] grid sm:grid-cols-[1fr_auto] gap-3" style={{ animationDelay: ".3s" }}>
              <label className="sr-only" htmlFor="hero-email">Ton e-mail professionnel</label>
              <input id="hero-email" name="email" type="email" required autoComplete="email" placeholder="Saisis ton e-mail" className="rounded-lg border border-[#8A8682] bg-white px-4 py-4 text-[18px] outline-none focus:border-ink focus:ring-2 focus:ring-ink/10" />
              <button type="submit" className="rounded-lg bg-accent text-white px-7 py-4 text-[18px] sm:text-[19px] hover:bg-accent-dark transition">Créer mon compte</button>
            </form>
            <p className="mt-8 text-[14.5px] text-ink-soft">En m'inscrivant, j'accepte les <a href="#/conditions" className="underline hover:text-ink">Conditions d'utilisation</a> et la <a href="#/confidentialite" className="underline hover:text-ink">Politique de confidentialité</a> de Bingoo!.</p>
            <ProductShot />
            <SourcesRow />
          </section>
        </div>
      </div>

      <main className="bg-[#D6D1CD] px-0 sm:px-8 pb-8">
        <div className="mx-auto max-w-[1440px] bg-white">
        <div id="radar" className="scroll-mt-24" />
        <Feature id="produit" title="Sache qui va acheter, et quand" text="Chaque nuit, le Radar lit les sources officielles et le web. Il te montre les entreprises qui ont une raison d'acheter maintenant, avec la date, le montant et la source." bullets={[["radar", <><b className="font-medium">Contrats publics</b> qui se terminent, avec le titulaire actuel et l'acheteur</>], ["doc", <><b className="font-medium">Annonces légales</b> : nouveau dirigeant, création, reprise, déménagement</>], ["eye", <><b className="font-medium">Signaux d'intention</b> : visites de ton site, recrutements, clients mécontents d'un concurrent</>]]} cta={["Essayer le Radar sur mon site", "#essai"]} visual={<RadarVisual />} />
        <Feature id="contacts" flip title="Trouve la personne qui décide" text="Pour chaque opportunité, Bingoo! cherche qui signe et comment le joindre. Tu ouvres la fiche, tu appelles ou tu écris." bullets={[["user", <><b className="font-medium">La bonne fonction</b> : achats, direction générale, DSI ou RH selon ton offre</>], ["mail", <><b className="font-medium">E-mail et téléphone</b> publiés ou vérifiés, jamais devinés</>], ["link", <><b className="font-medium">Profil LinkedIn</b> pour un premier contact</>]]} cta={["Trouver mes décideurs", null]} visual={<ContactVisual />} />
        <Feature title="Laisse tes salariés IA faire le reste" text="Donne un objectif en une phrase. Mission choisit les cibles, prépare un message qui part du signal, relance et pose les rendez-vous. Tu valides à chaque étape clé." bullets={[["spark", <><b className="font-medium">Mission</b> : de l'objectif au rendez-vous posé</>], ["send", <><b className="font-medium">Messages et relances</b> écrits à partir de la raison d'acheter</>], ["cal", <><b className="font-medium">Réponses triées</b>, rendez-vous dans ton agenda, devis envoyés</>]]} cta={["Lancer ma première Mission", null]} visual={<MissionVisual />} />
        <Feature flip title="Connais tes concurrents mieux qu'eux" text="L'Espion suit tes concurrents chaque semaine : ce qu'ils vendent, leurs prix, leurs publicités, leurs avis. Il en tire l'angle pour leur prendre des clients." bullets={[["eye", <><b className="font-medium">Veille continue</b> : prix, offres et publicités qui changent</>], ["star", <><b className="font-medium">Avis clients</b> : les mécontents deviennent des opportunités</>], ["target", <><b className="font-medium">Dossiers de combat</b> envoyés à Mission pour tes messages</>]]} cta={["Analyser un concurrent gratuitement", "#/outils/analyse-concurrent"]} visual={<SpyVisual />} />

        <Layers />

        <Team />

        <section className="px-5 sm:px-10 py-20"><div id="essai" className="mx-auto max-w-[1180px] scroll-mt-24"><TryIt t={tryState} /></div></section>

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

        <Why />

        <Workflow />

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
        </div>
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
