import { useCallback, useEffect, useMemo, useState } from "react";
import Guide from "../components/Guide";

import { fn, quotaLeft, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, Card, Spinner, useToast } from "../components/ui";
import { cx } from "../lib/utils";
import { DEPTS, centerOf, offsetKm } from "../lib/geo";
import { estSimple, useAller } from "../lib/lieu";
import { EXT_IDS, STORE_URL, pingExtension } from "../lib/ext";
import { useDansLieu } from "../lib/lieu";

export const RECRUIT_HINT = "Cette entreprise recrute pour un poste lié à ce que tu vends. C'est souvent le signe d'un besoin actuel et d'un budget : c'est le bon moment pour lui proposer ton service, en complément ou à la place d'une embauche.";
export const KIND = {
  appel_offres: { label: "Appel d'offres", plural: "Appels d'offres", dot: "#F26B2A", chip: "bg-accent-soft text-accent-dark", icon: "doc" },
  croissance: { label: "En croissance", plural: "En croissance", dot: "#22A06B", chip: "bg-good-soft text-good", icon: "up" },
  recrutement: { label: "Recrute en ce moment", plural: "Qui recrutent", dot: "#3B82F6", chip: "bg-[#E3EDFD] text-[#1D5BD6]", icon: "users" },
  besoin: { label: "Cherche une solution", plural: "Besoins exprimés", dot: "#8B5CF6", chip: "bg-[#EDE9FE] text-[#6D28D9]", icon: "bulb" },
  renouvellement: { label: "Contrat public à renouveler", plural: "Contrats à renouveler", dot: "#B45309", chip: "bg-[#FEF3C7] text-[#92400E]", icon: "clock" },
  dirigeant: { label: "Nouveau dirigeant", plural: "Nouveaux dirigeants", dot: "#DB2777", chip: "bg-[#FCE7F3] text-[#9D174D]", icon: "user" },
  demenagement: { label: "Déménage", plural: "Déménagements", dot: "#0891B2", chip: "bg-[#CFFAFE] text-[#155E75]", icon: "truck" },
  creation: { label: "Création ou ouverture", plural: "Créations et ouvertures", dot: "#65A30D", chip: "bg-[#ECFCCB] text-[#3F6212]", icon: "building" },
  site: { label: "Site modifié", plural: "Sites modifiés", dot: "#64748B", chip: "bg-[#F1F5F9] text-[#334155]", icon: "eye" },
  levee: { label: "Levée de fonds", plural: "Levées de fonds", dot: "#16A34A", chip: "bg-good-soft text-good", icon: "up" },
  permis: { label: "Permis de construire", plural: "Permis de construire", dot: "#A16207", chip: "bg-[#FEF9C3] text-[#854D0E]", icon: "building" },
  aide: { label: "Aide publique reçue", plural: "Aides publiques", dot: "#0D9488", chip: "bg-[#CCFBF1] text-[#115E59]", icon: "doc" },
  budget: { label: "Projet voté", plural: "Projets votés", dot: "#7C3AED", chip: "bg-[#EDE9FE] text-[#5B21B6]", icon: "doc" },
  salon: { label: "Salon professionnel", plural: "Salons", dot: "#EA580C", chip: "bg-accent-soft text-accent-dark", icon: "users" },
  client_concurrent: { label: "Cliente d'un concurrent", plural: "Clients de tes concurrents", dot: "#BE123C", chip: "bg-[#FFE4E6] text-[#9F1239]", icon: "target" },
  visite: { label: "Visite de ton site", plural: "Visites de ton site", dot: "#DC2626", chip: "bg-bad-soft text-bad", icon: "eye" },
  obligation: { label: "Obligation réglementaire", plural: "Obligations réglementaires", dot: "#0F766E", chip: "bg-[#CCFBF1] text-[#115E59]", icon: "shield" },
  abonnement: { label: "Abonnement concurrent à renouveler", plural: "Abonnements concurrents à renouveler", dot: "#C2410C", chip: "bg-[#FFEDD5] text-[#9A3412]", icon: "clock" },
  outil: { label: "Changement d'outils", plural: "Changements d'outils", dot: "#6D28D9", chip: "bg-[#EDE9FE] text-[#5B21B6]", icon: "spark" },
  avis: { label: "Client mécontent d'un concurrent", plural: "Clients mécontents de tes concurrents", dot: "#BE123C", chip: "bg-[#FFE4E6] text-[#9F1239]", icon: "target" },
  etablissement: { label: "Nouvel établissement", plural: "Nouveaux établissements", dot: "#0369A1", chip: "bg-[#E0F2FE] text-[#075985]", icon: "pin" },
  demande: { label: "Demande de recommandation", plural: "Demandes de recommandation", dot: "#15803D", chip: "bg-good-soft text-good", icon: "chat" },
  champion: { label: "Ancien utilisateur, nouvelle entreprise", plural: "Anciens utilisateurs", dot: "#B45309", chip: "bg-[#FEF3C7] text-[#92400E]", icon: "users" },
  essai: { label: "Équipe à l'essai", plural: "Équipes à l'essai", dot: "#DB2777", chip: "bg-[#FCE7F3] text-[#9D174D]", icon: "up" },
  difficulte: { label: "Difficultés financières", plural: "Entreprises en difficulté", dot: "#DC2626", chip: "bg-bad-soft text-bad", icon: "x" },
};
const EVENTS = ["dirigeant", "demenagement", "creation"];
const SWEEP = 6; // secondes par tour

const Ico = ({ name, className = "h-5 w-5" }) => {
  const p = {
    shield: <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" />,
    spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
    chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
    doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
    up: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 20a6.5 6.5 0 0 0-3-5.5" /></>,
    radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12l6-6" /><circle cx="12" cy="12" r="1" /></>,
    pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
    bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></>,
    chev: <path d="M9 6l6 6-6 6" />,
    ext: <><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
    building: <><path d="M4 21V5l8-2v18M12 8h8v13M2 21h20" /><path d="M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    truck: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12" /><circle cx="12" cy="12" r="3" /></>,
    star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
    euro: <><path d="M17 6.5A6.5 6.5 0 1 0 17 17.5" /><path d="M4 10h9M4 14h9" /></>,
    flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.3-4.7.3 1.6 1 2.7 2.2 3.2C11 9 11 6 12 3z" />,
    li: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" /></>,
  }[name];
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{p}</svg>;
};

const ago = (d) => {
  if (!d) return "";
  const h = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 36e5));
  return h < 1 ? "à l'instant" : h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`;
};
const dayFr = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const daysTo = (d) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
// Décalage stable (pour séparer plusieurs opportunités d'un même département)
const jitter = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return [((h & 255) / 255) - 0.5, (((h >> 8) & 255) / 255) - 0.5]; };

const SECTIONS = [
  ["opps", "Toutes les opportunités", "Liste complète, par type"],
  ["comptes", "Comptes surveillés", "Tes entreprises rêvées"],
  ["visiteurs", "Visiteurs du site", "Qui te regarde"],
  ["partenaires", "Partenaires", "Apporteurs d'affaires"],
  ["marche", "Marché public", "Renouvellements, prix, concurrents"],
  ["resultats", "Résultats", "Ce que le Radar t'a rapporté"],
  ["reglages", "Réglages et activité", "Ce qu'il cherche, dernier scan"],
];
const euroK = (n) => Number(n) >= 1000 ? `${(Number(n) / 1000).toLocaleString("fr-FR", { maximumFractionDigits: Number(n) >= 10000 ? 0 : 1 })} k€` : `${Math.round(Number(n))} €`;
/** La raison d'en parler maintenant, en une ligne (le signal, pas une promesse d'achat). */
const raison = (o) => {
  const t = String(o.title || "").replace(new RegExp(`^${String(o.company || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*·\\s*`), "").trim();
  const r = t && t !== o.company ? t : String(o.why || "").split(/(?<=[.!?:])\s/)[0].trim();
  return r.length > 110 ? `${r.slice(0, 108)}…` : r;
};

/** Niveaux de chaleur (score de moment, pas une probabilité). */
const HEAT = [[85, "Très chaude", "#EF4444"], [75, "Chaude", "#F97316"], [60, "Prometteuse", "#22C55E"], [40, "À surveiller", "#3B82F6"], [0, "Faible", "#A8A29E"]];
const heatDot = (n) => (HEAT.find(([m]) => (n ?? 0) >= m) ?? HEAT[4])[2];
const heatLabel = (n) => (HEAT.find(([m]) => (n ?? 0) >= m) ?? HEAT[4])[1];
/** Intentions : ce que l'entreprise fait vers toi. Signaux : ce qui lui arrive. */
const INTENT = ["visite", "essai", "demande", "avis", "champion"];
const APPROACH = {
  appel_offres: "Lis l'avis et réponds avant la date limite.",
  renouvellement: "Présente-toi aux achats avant le nouvel appel d'offres.",
  dirigeant: "Félicite-le et propose 15 minutes d'échange.",
  demenagement: "Propose ton aide pour les nouveaux locaux.",
  creation: "Présente-toi pendant qu'elle choisit ses prestataires.",
  etablissement: "Contacte le responsable du nouveau site.",
  recrutement: "Rebondis sur son recrutement : la recrue aura besoin de toi.",
  croissance: "Félicite sa croissance, montre que tu suis le rythme.",
  levee: "Félicite la levée : elle va s'équiper.",
  client_concurrent: "Propose un comparatif, sans critiquer.",
  abonnement: "Propose de comparer avant le renouvellement.",
  outil: "Elle change d'outils : glisse ton offre dans le changement.",
  obligation: "Montre ce que tu règles avant l'échéance.",
  visite: "Écris au décideur aujourd'hui, avec une proposition concrète.",
  essai: "Propose une démo à l'équipe avant la fin de l'essai.",
  demande: "Réponds à sa demande avec un exemple concret.",
  avis: "Propose une solution au problème qu'elle cite.",
  champion: "Félicite-le et propose la même chose chez lui.",
};
const heat = (n) => n >= 80 ? "bg-bad text-white" : n >= 65 ? "bg-accent text-white" : n >= 50 ? "bg-accent-soft text-accent-dark" : "bg-[#EFEEEA] text-ink-soft";
const Score = ({ n, big }) => n ? <span title="Score : à quel point c'est le bon moment" className={cx("inline-flex items-center justify-center rounded-full font-bold tnum shrink-0 leading-none", big ? "h-12 w-12 text-[17px]" : "h-9 w-9 text-[13px]", heat(n))}>{n}</span> : null;

function RadarScope({ opps, zone, scanning, selected, onSelect, round = false, byHeat = false }) {
  const center = centerOf(zone);
  const pts = useMemo(() => {
    const raw = opps.flatMap((o) => {
      const c = DEPTS[o.dept] ?? DEPTS[(o.dept ?? "").slice(0, 2)];
      if (!c) return [];
      const [x, y] = offsetKm(center, c);
      return [{ o, x, y, d: Math.hypot(x, y) }];
    });
    // Échelle réelle (km), calée sur 90 % des opportunités : les plus lointaines restent au bord, avec leur distance.
    const ds = raw.map((p) => p.d).sort((a, b) => a - b);
    const p90 = ds.length ? ds[Math.floor((ds.length - 1) * 0.85)] : 0;
    const R = Math.max(30, p90) * 1.3;
    const byDept = new Map();
    const list = raw.map(({ o, x, y, d }) => {
      const k = byDept.get(o.dept) ?? 0; byDept.set(o.dept, k + 1);
      const far = d > R * 0.92;
      let nx = (far ? (x / d) * 0.92 : x / R), ny = (far ? (y / d) * 0.92 : y / R);
      // Plusieurs opportunités d'un même département : disposées en spirale autour de son centre
      const a = k * 2.4, rr = 0.045 * Math.sqrt(k);
      nx += Math.cos(a) * rr; ny += Math.sin(a) * rr;
      const n = Math.hypot(nx, ny); if (n > 0.95) { nx *= 0.95 / n; ny *= 0.95 / n; }
      const angle = ((Math.atan2(nx, ny) * 180) / Math.PI + 360) % 360;
      return { o, nx, ny, angle, far, km: Math.round(d) };
    });
    const depts = Object.entries(DEPTS).flatMap(([code, c]) => {
      const [x, y] = offsetKm(center, c);
      return Math.hypot(x, y) < R * 0.9 ? [{ code, nx: x / R, ny: y / R }] : [];
    });
    return { R, list, depts };
  }, [opps, zone]);
  const labelled = new Set();
  const placed = [];
  for (const p of pts.list) {
    if (labelled.size >= (round ? 0 : 7)) break;
    if (placed.every((q) => Math.hypot(q.nx - p.nx, (q.ny - p.ny) * 2.6) > 0.26)) { labelled.add(p.o.id); placed.push(p); }
  }
  const ring = (k) => Math.round((pts.R * k) / 4);

  return (
    <div className={cx("relative bg-[#121316] overflow-hidden select-none", round ? "rounded-full aspect-square shadow-[0_0_0_10px_#EDEBE6,0_18px_40px_-12px_rgba(0,0,0,.35)]" : "rounded-2xl aspect-square sm:aspect-[4/3.1]")}>
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(242,107,42,.10), transparent 60%)" }} />
      <div className={cx("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square", round ? "h-[96%]" : "h-[86%]")}>
        <svg viewBox="-100 -100 200 200" className="absolute inset-0 h-full w-full">
          {[1, 2, 3, 4].map((k) => <circle key={k} r={k * 23} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth=".5" />)}
          <line x1="-96" y1="0" x2="96" y2="0" stroke="rgba(255,255,255,.08)" strokeWidth=".4" />
          <line x1="0" y1="-96" x2="0" y2="96" stroke="rgba(255,255,255,.08)" strokeWidth=".4" />
          {[1, 2, 3].map((k) => <text key={k} x={k * 23 + 1.5} y="-1.5" fontSize="4.2" fill="rgba(255,255,255,.28)">{ring(k)} km</text>)}
          {pts.depts.map((d) => <text key={d.code} x={d.nx * 92} y={-d.ny * 92} textAnchor="middle" fontSize="4" fill="rgba(255,255,255,.16)">{d.code}</text>)}
          <text x="0" y="-95" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,.4)">N</text>
          <text x="0" y="99" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,.4)">S</text>
          <text x="96" y="2" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,.4)">E</text>
          <text x="-96" y="2" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,.4)">O</text>
        </svg>
        {/* Balayage */}
        <div className="absolute inset-[4%] rounded-full pointer-events-none" style={{ background: "conic-gradient(from 0deg, rgba(242,107,42,0) 0deg, rgba(242,107,42,0) 300deg, rgba(242,107,42,.10) 330deg, rgba(242,120,52,.45) 359deg, rgba(242,107,42,0) 360deg)", animation: `kspin ${scanning ? SWEEP / 3 : SWEEP}s linear infinite` }} />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF8A4C] shadow-[0_0_18px_6px_rgba(255,138,76,.45)]" />
        {pts.list.map(({ o, nx, ny, angle, far, km }, i) => {
          const k = KIND[o.kind];
          const on = selected === o.id;
          return (
            <button key={o.id} onClick={() => onSelect(o)} title={`${o.company}${far ? ` · à ${km} km` : ""}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${50 + nx * 46}%`, top: `${50 - ny * 46}%`, animation: `kfade .5s ${Math.min(i * 0.08, 1.6)}s both` }}>
              <span className="block rounded-full" style={{ opacity: far ? 0.55 : 1, width: on ? 14 : 9, height: on ? 14 : 9, background: byHeat ? heatDot(o.score) : k.dot, boxShadow: `0 0 0 3px ${byHeat ? heatDot(o.score) : k.dot}33`, animation: `kping ${SWEEP}s ${(angle / 360) * SWEEP}s infinite` }} />
              {on && <span className="absolute left-1/2 top-1/2 -ml-[7px] -mt-[7px] h-[14px] w-[14px] rounded-full ring-out pointer-events-none" style={{ background: byHeat ? heatDot(o.score) : k.dot }} />}
              {on && round && <span className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-lg bg-[#1E1F24] border border-white/10 px-2.5 py-1.5 pointer-events-none z-10"><span className="text-[12px] font-semibold text-white max-w-[170px] truncate">{o.company}</span>{o.score ? <span className="rounded-full px-1.5 py-0.5 text-[10.5px] font-bold text-white" style={{ background: heatDot(o.score) }}>{o.score}</span> : null}</span>}
              {labelled.has(o.id) && (
                <span className="hidden sm:block absolute left-3.5 top-1/2 -translate-y-1/2 whitespace-nowrap text-left pointer-events-none">
                  <span className="block text-[12px] font-semibold text-white leading-tight max-w-[150px] truncate">{o.company}</span>
                  <span className="block text-[11px] text-white/60 leading-tight">{k.label}{far ? ` · ${km} km` : ""}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!round && <div className="absolute left-4 bottom-4 space-y-1.5">
        {Object.entries(KIND).map(([key, k]) => <p key={key} className="flex items-center gap-2 text-[12px] text-white/75"><span className="h-2 w-2 rounded-full" style={{ background: k.dot }} />{k.plural}</p>)}
      </div>}
      {!round && <div className="absolute right-4 top-4 sm:top-auto sm:bottom-4 flex items-center gap-2 text-[11px] sm:text-[12px] text-white/75">
        <span className={cx("h-2 w-2 rounded-full", scanning ? "bg-accent animate-pulse" : "bg-good")} />{scanning ? "Analyse en cours…" : "Analyse automatique chaque matin"}
      </div>}
      {!pts.list.length && !scanning && <p className="absolute inset-x-0 top-[58%] text-center text-sm text-white/50 px-8">Aucune opportunité localisée pour l'instant</p>}
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}@keyframes kfade{from{opacity:0;transform:translate(-50%,-50%) scale(.3)}to{opacity:1}}@keyframes kping{0%,4%{transform:scale(1.9);filter:brightness(1.6)}18%,100%{transform:scale(1);filter:none}}`}</style>
    </div>
  );
}

/** Contact prêt : coordonnées trouvées et e-mail rédigé par Bingoo! à partir du signal. */
function ContactReady({ o, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const nav = useAller();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState(null);
  useEffect(() => { quotaLeft(ws, "enquete").then(setQ).catch(() => {}); }, [ws.id, busy]);
  useEffect(() => {
    if (!o.prospect_id) return setD({});
    (async () => {
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from("prospects").select("id, name, contact_name, contact_role, email, phone, website, linkedin_url, enriched_at").eq("id", o.prospect_id).single(),
        supabase.from("messages").select("id, subject, body, status").eq("prospect_id", o.prospect_id).eq("step", 0).order("created_at", { ascending: false }).limit(1),
      ]);
      setD({ prospect: p, message: m?.[0] ?? null, ready: !!p?.enriched_at && (!!m?.[0] || !p?.email) });
    })();
  }, [o.id, o.prospect_id]);
  const prepare = async () => {
    setBusy(true);
    try {
      const r = await fn("m/prepare", { workspace_id: ws.id, id: o.id });
      setD({ ...r, ready: true });
      onChange({ ...o, status: "ajoute", prospect_id: r.prospect.id });
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const copy = (t) => navigator.clipboard?.writeText(t).then(() => toast("Copié", "good"), () => toast("Copie impossible", "bad"));
  if (!d) return null;
  const p = d.prospect, m = d.message;
  if (!d.ready) return (
    <div className="mt-6 rounded-2xl border border-accent-soft bg-accent-soft/30 p-4">
      <p className="font-semibold">Contacter cette entreprise</p>
      <p className="text-sm text-ink-soft mt-1">Bingoo! trouve le bon contact, son e-mail et son téléphone publiés, puis écrit un e-mail qui part de ce signal. Rien n'est envoyé sans toi.</p>
      <Button variant="accent" className="w-full mt-3" loading={busy} disabled={q && q.left === 0} onClick={prepare}>{busy ? "Bingoo! cherche le contact… (20 à 40 s)" : "Trouver le contact et préparer le message"}</Button>
      {q && <p className={cx("text-xs mt-2 text-center", q.left === 0 ? "text-bad" : "text-ink-faint")}>{q.left === 0 ? "Plus de recherche possible aujourd'hui (maximum de ta formule atteint). Ça repart demain matin." : `${q.left} recherche${q.left > 1 ? "s" : ""} de contact restante${q.left > 1 ? "s" : ""} aujourd'hui sur ${q.max}`}</p>}
    </div>
  );
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-line p-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Contact</p>
        <p className="font-semibold mt-1">{p.contact_name || "Contact non identifié"}{p.contact_role ? <span className="font-normal text-ink-soft"> · {p.contact_role}</span> : null}</p>
        <ul className="mt-2 space-y-1">
          <li>✉️ {p.email ? <button className="underline" onClick={() => copy(p.email)}>{p.email}</button> : <span className="text-ink-soft">aucun e-mail public trouvé</span>}</li>
          <li>☎️ {p.phone ? <a className="underline" href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a> : <span className="text-ink-soft">aucun téléphone public trouvé</span>}</li>
          {p.website && <li>🌐 <a className="underline break-all" href={p.website} target="_blank" rel="noreferrer">{p.website.replace(/^https?:\/\//, "")}</a></li>}
          {p.linkedin_url && <li>in <a className="underline" href={p.linkedin_url} target="_blank" rel="noreferrer">Profil LinkedIn</a></li>}
        </ul>
      </div>
      {m ? (
        <div className="rounded-2xl bg-ink text-white p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Bingoo!</p>
          <p className="mt-1">{o.kind === "recrutement" ? "Cette entreprise recrute pour un besoin que tu couvres : elle a sans doute besoin de toi. Voici un e-mail prêt, qui part de ce signal." : "Cette entreprise est en plein développement : c'est un bon moment pour la contacter. Voici un e-mail prêt, qui part de ce signal."}</p>
          <div className="mt-3 rounded-xl bg-white text-ink p-3">
            <p className="text-xs text-ink-soft">Objet</p><p className="font-medium">{m.subject}</p>
            <p className="whitespace-pre-line mt-2">{m.body}</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {m.status === "brouillon" && <Button size="sm" variant="accent" onClick={() => nav(`/valider?voir=${m.id}`)}>Relire et envoyer</Button>}
            {m.status !== "brouillon" && <span className="text-xs text-white/70 self-center">Message {m.status === "envoye" ? "déjà envoyé" : m.status}</span>}
            <Button size="sm" onClick={() => copy(`${m.subject}\n\n${m.body}`)}>Copier le message</Button>
          </div>
        </div>
      ) : (
        <p className="text-sm rounded-xl bg-paper/70 border border-line p-3">{d.reason === "no_sender" ? "Indique le nom de l'expéditeur dans Réglages pour que Bingoo! puisse rédiger." : p.phone ? "Pas d'e-mail public : appelle directement au numéro ci-dessus, en partant du signal." : "Bingoo! n'a trouvé ni e-mail ni téléphone publics. Le Détective peut creuser depuis la fiche prospect."}</p>
      )}
    </div>
  );
}

/** Aide à décider et à répondre à un appel d'offres. */
function TenderHelp({ o, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const a = o.raw?.analyse;
  const run = async () => {
    setBusy(true);
    try { const r = await fn("r/tender-analyse", { workspace_id: ws.id, id: o.id }); onChange({ ...o, raw: { ...(o.raw ?? {}), analyse: r } }); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  if (!a) return (
    <div className="mt-6 rounded-2xl border border-line p-4 text-sm">
      <p className="font-semibold">Faut-il y répondre ?</p>
      <p className="text-ink-soft mt-1">Le Radar lit l'avis, le compare aux marchés déjà attribués (prix, titulaires) et te donne : un avis « y aller ou pas », un résumé, les pièces à fournir, les critères, les concurrents probables et un premier jet de réponse technique.</p>
      <Button variant="accent" className="mt-3 w-full" loading={busy} onClick={run}>{busy ? "Analyse en cours (1 minute)…" : "Analyser cet appel d'offres"}</Button>
    </div>
  );
  const tone = a.decision === "y aller" ? "bg-good-soft text-good" : a.decision === "ne pas y aller" ? "bg-bad-soft text-bad" : "bg-accent-soft text-accent-dark";
  const L = ({ t, items }) => items?.length ? <div className="mt-3"><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">{t}</p><ul className="space-y-0.5">{items.map((x, i) => <li key={i}>• {x}</li>)}</ul></div> : null;
  return (
    <div className="mt-6 rounded-2xl border border-line p-4 text-sm">
      <div className="flex items-center gap-3"><Score n={a.score} big /><div><p className="font-semibold">Avis du Radar</p><span className={cx("inline-block mt-0.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold", tone)}>{a.decision}</span></div></div>
      <L t="Pourquoi" items={a.raisons} />
      <L t="Résumé de l'avis" items={a.resume} />
      <L t="Pièces à fournir" items={a.pieces} />
      <L t="Critères de sélection" items={a.criteres} />
      <L t="Concurrents probables" items={a.concurrents} />
      {a.prix && <div className="mt-3"><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Prix observés ({a.comparables ?? 0} marchés comparables)</p><p>{a.prix}</p></div>}
      <L t="Questions à poser à l'acheteur" items={a.questions} />
      {a.reponse_technique && (
        <details className="mt-3 rounded-xl bg-paper p-3"><summary className="cursor-pointer font-semibold">Premier jet de réponse technique</summary>
          <p className="whitespace-pre-line mt-2 leading-relaxed">{a.reponse_technique}</p>
          <button onClick={() => { navigator.clipboard?.writeText(a.reponse_technique); toast("Copié", "good"); }} className="mt-2 text-[12.5px] font-semibold text-accent">Copier le texte</button>
        </details>
      )}
      <p className="text-[11.5px] text-ink-faint mt-3">Analyse faite à partir de l'avis public et des marchés déjà attribués. Le dossier de consultation complet reste à lire avant de répondre.</p>
    </div>
  );
}

/** Attribuer le signal à un membre de l'équipe ; l'envoyer dans le CRM. */
function TeamActions({ o, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { supabase.from("members").select("user_id, email").eq("workspace_id", ws.id).then(({ data }) => setMembers(data ?? [])); }, [ws.id]);
  const assign = async (uid) => {
    const { error } = await supabase.from("radar_opps").update({ assigned_to: uid || null }).eq("id", o.id);
    if (error) return toast(error.message, "bad");
    onChange({ ...o, assigned_to: uid || null }); toast(uid ? "Signal attribué" : "Attribution retirée", "good");
  };
  const crm = async () => {
    setBusy(true);
    try { const r = await fn("r/radar-crm", { workspace_id: ws.id, id: o.id }); onChange({ ...o, prospect_id: r.prospect_id, status: "ajoute" }); toast("Envoyée dans ton CRM", "good"); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const hasCrm = ws.integrations?.hubspot?.ok || ws.integrations?.pipedrive?.ok;
  if (members.length < 2 && !hasCrm) return null;
  return (
    <div className="mt-6 rounded-2xl border border-line p-4 text-sm space-y-3">
      {members.length > 1 && <label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Qui s'en occupe</span>
        <select value={o.assigned_to ?? ""} onChange={(e) => assign(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2 bg-white"><option value="">Personne pour l'instant</option>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.email || "Membre"}</option>)}</select></label>}
      {hasCrm && o.kind !== "appel_offres" && <Button className="w-full" loading={busy} onClick={crm}>Envoyer dans mon CRM</Button>}
    </div>
  );
}

function Detail({ o, onClose, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const nav = useAller();
  const [busy, setBusy] = useState(null);
  const k = KIND[o.kind];
  const set = async (status, feedback) => {
    setBusy(feedback ?? status);
    const { error } = await supabase.from("radar_opps").update({ status, ...(feedback ? { feedback } : {}) }).eq("id", o.id);
    setBusy(null);
    if (error) return toast(error.message, "bad");
    if (feedback === "pas_pertinent") toast("Noté. Le Radar écartera les signaux semblables.", "good");
    onChange({ ...o, status }); if (status === "ecarte") onClose();
  };
  const pub = o.kind === "appel_offres" || o.kind === "renouvellement";
  const add = async () => {
    setBusy("add");
    try {
      const r = await fn("r/radar-add", { workspace_id: ws.id, id: o.id });
      onChange({ ...o, status: "ajoute", prospect_id: r.prospect_id });
      toast(r.existing ? "Déjà dans tes prospects" : r.registry ? "Ajoutée aux prospects, avec sa fiche du registre" : "Ajoutée aux prospects (introuvable dans le registre, à vérifier)", "good");
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal>
      <button className="absolute inset-0 bg-ink/30" onClick={onClose} aria-label="Fermer" />
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <span className={cx("text-xs font-semibold rounded-full px-2.5 py-1", k.chip)}>{k.label}</span>
          <button onClick={onClose} className="text-ink-soft hover:text-ink"><Ico name="x" /></button>
        </div>
        <h2 className="font-serif text-3xl leading-tight mt-4">{pub ? o.title : o.company}</h2>
        {pub && <p className="text-sm text-ink-soft mt-1">Acheteur : {o.company}</p>}
        <p className="flex items-center gap-1.5 text-sm text-ink-soft mt-2"><Ico name="pin" className="h-4 w-4" />{[o.city, o.dept && `(${o.dept})`].filter(Boolean).join(" ") || "Lieu non précisé"}</p>

        {o.score ? (
          <div className="mt-5 rounded-2xl border border-line p-4 flex gap-3.5">
            <Score n={o.score} big />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">{o.score >= 80 ? "Entreprise très chaude" : o.score >= 65 ? "Bon moment pour la contacter" : o.score >= 50 ? "À surveiller" : "Signal faible"}</p>
              <ul className="mt-1 space-y-0.5 text-ink-soft">{(o.score_why ?? []).map((w, i) => <li key={i}>• {w}</li>)}</ul>
            </div>
          </div>
        ) : null}
        {o.raw?.valeur ? <p className="mt-3 text-sm rounded-xl bg-paper px-3 py-2"><b>Valeur estimée : ≈ {euroK(o.raw.valeur)} par an</b><span className="text-ink-soft"> · {o.raw.valeur_how}</span></p> : null}
        {o.raw?.offres?.length ? (
          <div className="mt-3 rounded-xl bg-paper px-3 py-2 text-sm">
            <p className="font-semibold">Offres d'emploi ouvertes{o.raw.total ? ` (${o.raw.total} au total)` : ""}</p>
            <ul className="mt-1 space-y-0.5">{o.raw.offres.map((j, i) => <li key={i}><a href={j.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{j.title}</a><span className="text-ink-faint text-[12px]">{[j.place, j.date && new Date(j.date).toLocaleDateString("fr-FR")].filter(Boolean).map((x) => ` · ${x}`).join("")}</span></li>)}</ul>
            {o.raw.outils?.length ? <p className="text-[12px] text-ink-soft mt-1">Outils cités dans ses offres : {o.raw.outils.join(", ")}</p> : null}
          </div>
        ) : null}
        {o.raw?.tech?.length && o.kind !== "recrutement" ? <p className="mt-3 text-[12.5px] text-ink-soft">Outils repérés sur son site : {o.raw.tech.join(", ")}</p> : null}
        {o.kind === "client_concurrent" && <p className="mt-3 text-sm rounded-xl bg-[#FFE4E6]/60 px-3 py-2">Son site cite <b>{(o.raw?.concurrents ?? []).join(", ")}</b>. Ouvre Espion pour l'angle d'approche face à ce concurrent.</p>}
        {o.raw?.contact && (
          <div className="mt-3 rounded-2xl border border-good/30 bg-good-soft/40 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-good">Qui appeler</p>
            <p className="font-semibold text-[15px] mt-1">{o.raw.contact.nom}</p>
            <p className="text-ink-soft">{o.raw.contact.role}{o.raw.contact.source ? ` · source : ${o.raw.contact.source}` : ""}</p>
            {(o.raw.contact.email || o.raw.contact.tel) && <p className="mt-1">{o.raw.contact.email && <a href={`mailto:${o.raw.contact.email}`} className="text-accent font-medium hover:underline mr-3">{o.raw.contact.email}</a>}{o.raw.contact.tel && <a href={`tel:${o.raw.contact.tel.replace(/\s/g, "")}`} className="font-medium">{o.raw.contact.tel}</a>}</p>}
            {o.kind !== "appel_offres" && o.kind !== "renouvellement" && <p className="text-[12px] text-ink-faint mt-1">E-mail et téléphone : « Trouver le contact » ci-dessous cherche ses coordonnées publiques.</p>}
          </div>
        )}
        {o.kind === "difficulte" && <p className="mt-3 text-sm rounded-xl bg-bad-soft text-bad px-3 py-2 font-medium">Entreprise en procédure collective : vérifie sa capacité à payer avant d'y consacrer du temps.</p>}
        {o.expires_at && o.kind !== "appel_offres" && <p className="mt-3 text-sm rounded-xl bg-accent-soft/60 px-3 py-2"><b>À contacter avant le {new Date(o.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</b><span className="text-ink-soft"> · ensuite le signal disparaît du Radar</span></p>}

        <div className="mt-6 space-y-4 text-sm">
          {o.kind === "renouvellement" && (
            <div className="rounded-xl bg-[#FEF3C7]/60 border border-[#FDE68A] p-3 space-y-0.5">
              <p className="font-semibold">Fin estimée du contrat : {o.raw?.fin ? new Date(o.raw.fin).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—"}</p>
              <p className="text-ink-soft">{o.summary}</p>
              <p className="text-ink-faint text-xs pt-1">Fin estimée = date de notification + durée déclarée ; un accord-cadre peut avoir été reconduit. À vérifier auprès de l'acheteur.</p>
            </div>
          )}
          {!pub && <div><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Signal</p><p>{o.summary}</p></div>}
          {o.kind === "appel_offres" && o.summary && <div><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Nature</p><p>{o.summary}</p></div>}
          {o.deadline && o.kind === "appel_offres" && <div className="rounded-xl bg-accent-soft/60 p-3"><p className="font-semibold">Réponse avant le {new Date(o.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p><p className="text-ink-soft">{daysTo(o.deadline)} jour{daysTo(o.deadline) > 1 ? "s" : ""} restant{daysTo(o.deadline) > 1 ? "s" : ""}</p></div>}
          {o.kind === "recrutement" && <p className="text-sm rounded-xl bg-paper/70 border border-line p-3">{RECRUIT_HINT}</p>}
          {o.why && <div><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Pourquoi c'est pour toi</p><p>{o.why}{o.why.length >= 200 ? "…" : ""}</p></div>}
          <div><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Source</p>
            {o.url ? <a className="inline-flex items-center gap-1 text-accent font-medium hover:underline break-all" href={o.url} target="_blank" rel="noreferrer">{o.source || o.url}<Ico name="ext" className="h-3.5 w-3.5 shrink-0" /></a> : <p>{o.source}</p>}
            {o.published && <p className="text-ink-faint text-xs mt-0.5">Publié le {dayFr(o.published)}</p>}
          </div>
        </div>

        {o.kind === "besoin" && (
          <div className="mt-6 rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] p-4 text-sm space-y-1.5">
            <p className="font-semibold text-[#6D28D9]">Demande publique repérée par Espion</p>
            {o.raw?.auteur && <p><span className="text-ink-soft">Auteur : </span>{o.raw.auteur}</p>}
            {o.raw?.intention && <p><span className="text-ink-soft">Intention : </span>{o.raw.intention}</p>}
            {o.raw?.fiabilite && <p><span className="text-ink-soft">Fiabilité : </span>{o.raw.fiabilite}{o.raw?.pertinence ? ` · pertinence ${o.raw.pertinence}/100` : ""}</p>}
            <p className="text-ink-faint text-xs pt-1">Réponds directement là où la demande a été publiée, en restant utile plutôt que commercial.</p>
          </div>
        )}
        {o.kind === "appel_offres" && <TenderHelp o={o} onChange={onChange} />}
        {o.kind !== "appel_offres" && o.kind !== "besoin" && !["salon", "budget", "difficulte"].includes(o.kind) && <ContactReady o={o} onChange={onChange} />}
        <TeamActions o={o} onChange={onChange} />

        <div className="mt-8 flex flex-col gap-2">
          {o.kind === "appel_offres"
            ? <a href={o.url} target="_blank" rel="noreferrer"><Button variant="accent" className="w-full">Lire l'avis complet</Button></a>
            : o.kind === "besoin" ? <a href={o.url} target="_blank" rel="noreferrer"><Button variant="accent" className="w-full">Ouvrir la demande</Button></a>
            : o.prospect_id ? <Button className="w-full" onClick={() => nav(`/prospects?id=${o.prospect_id}`)}>Voir dans mes entreprises</Button> : null}
          {o.status !== "suivi" && o.kind === "appel_offres" && <Button variant="ghost" className="w-full" loading={busy === "suivi"} onClick={() => set("suivi")}>Suivre cet appel d'offres</Button>}
          {o.status !== "ecarte" && <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" className="w-full" loading={busy === "pas_pertinent"} onClick={() => set("ecarte", "pas_pertinent")}>Pas pertinent</Button>
            <Button variant="ghost" className="w-full" loading={busy === "ecarte"} onClick={() => set("ecarte")}>Masquer</Button>
          </div>}
          <p className="text-[11.5px] text-ink-faint text-center">« Pas pertinent » apprend au Radar ce que tu ne veux plus voir.</p>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  ["lance", "Scan lancé", "Zone et cibles chargées"],
  ["marches", "Appels d'offres", "France (BOAMP) et Europe (TED)"],
  ["renouvellements", "Contrats publics à renouveler", "Marchés attribués qui arrivent à échéance"],
  ["annonces", "Annonces légales et sites", "Nouveau dirigeant, déménagement, difficultés, créations ; sites des comptes surveillés"],
  ["emploi", "Offres d'emploi", "Pages carrières des entreprises : qui recrute"],
  ["web", "Recrutements et croissance", "Offres d'emploi, levées, ouvertures (web)"],
  ["registre", "Tes prospects", "Signaux déjà repérés sur ta liste"],
  ["tri", "Score et tri", "Entreprises chaudes, filtre, dates limites"],
];
const hhmm = (d) => d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
const running = (p) => !!p?.started_at && !p.done_at && Date.now() - new Date(p.started_at).getTime() < 6 * 60000;

function Pill({ on, children }) {
  return <span className={cx("inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-medium", on ? "bg-good-soft text-good" : "bg-[#EFEEEA] text-ink-soft")}><span className={cx("h-2 w-2 rounded-full", on ? "bg-good animate-pulse" : "bg-ink-faint")} />{children}</span>;
}

/** Activité du scan : les vraies étapes, avec leur heure et ce qu'elles ont trouvé. */
function ScanActivity({ p, live }) {
  const st = (k) => p?.steps?.[k] ?? { s: "a_venir" };
  return (
    <Card className="p-5 sm:p-6 h-full">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-bold text-[19px]"><span className="text-accent"><Ico name="radar" className="h-6 w-6" /></span>Activité du scan</h2>
        {p?.started_at && <span className="text-xs text-ink-faint">{live ? "en direct" : new Date(p.started_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}
      </div>
      {!p ? <p className="text-sm text-ink-soft mt-4">Aucun scan pour l'instant. Lance le premier : chaque étape s'affichera ici en direct.</p> : (
        <ol className="mt-5 relative">
          {STEPS.map(([k, label, sub], i) => {
            const x = st(k);
            const dot = x.s === "fait" ? <span className="h-6 w-6 rounded-full bg-accent-soft text-accent grid place-items-center"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg></span>
              : x.s === "en_cours" ? <span className="h-6 w-6 rounded-full grid place-items-center"><span className="block h-6 w-6 rounded-full border-2 border-dashed border-accent animate-[kspin_3s_linear_infinite]" /></span>
              : x.s === "erreur" ? <span className="h-6 w-6 rounded-full bg-bad-soft text-bad grid place-items-center text-xs font-bold">!</span>
              : <span className="block h-6 w-6 rounded-full border-2 border-line bg-white" />;
            const right = x.s === "fait" ? hhmm(x.at) : x.s === "en_cours" ? "En cours" : x.s === "saute" ? "Pas cette fois" : x.s === "erreur" ? "Indisponible" : "À venir";
            const n = x.s === "fait" && x.n != null && k !== "lance" ? (k === "tri" ? `${x.n} nouvelle${x.n > 1 ? "s" : ""}` : `${x.n} trouvé${x.n > 1 ? "s" : ""}`) : null;
            return (
              <li key={k} className="relative flex gap-4 pb-5 last:pb-0">
                {i < STEPS.length - 1 && <span className={cx("absolute left-3 top-7 bottom-0 w-px", x.s === "fait" ? "bg-accent/40" : "bg-line")} />}
                <span className="relative z-10 shrink-0">{dot}</span>
                <div className="min-w-0 flex-1 -mt-0.5">
                  <p className={cx("font-medium", x.s === "a_venir" || x.s === "saute" ? "text-ink-soft" : "text-ink")}>{label}{n && <span className="ml-2 text-[12px] font-semibold rounded-full bg-paper border border-line px-2 py-0.5 text-ink-soft">{n}</span>}</p>
                  <p className="text-[12.5px] text-ink-faint">{sub}</p>
                </div>
                <span className={cx("text-[13px] shrink-0", x.s === "en_cours" ? "text-accent font-medium" : x.s === "erreur" ? "text-bad" : "text-ink-soft")}>{right}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

/** Ce que le Radar cherche : zone, postes « signal », mots-clés des marchés publics. Modifiable. */
function Searching({ ws }) {
  const toast = useToast();
  const [c, setC] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fn("r/radar-config", { workspace_id: ws.id }).then(setC).catch(() => setC({ radar_cfg: ws.radar_cfg ?? {}, zone: ws.zone ?? [] })); }, [ws.id]);
  const save = async () => {
    setBusy(true);
    try {
      const split = (t) => t.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
      const r = await fn("r/radar-config", { workspace_id: ws.id, set: true, postes: split(edit.postes), mots_cles: split(edit.mots_cles), activites: split(edit.activites), marches: edit.marches, europe: edit.europe, webhook: edit.webhook ?? "", panier: edit.panier });
      setC({ ...c, radar_cfg: r.radar_cfg }); setEdit(null); toast("Le Radar cherchera avec ces réglages dès le prochain scan", "good");
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const cfg = c?.radar_cfg ?? {};
  const Row = ({ icon, title, children }) => (
    <div className="rounded-xl border border-line p-3.5 flex gap-3">
      <span className="text-accent mt-0.5"><Ico name={icon} /></span>
      <div className="min-w-0 flex-1"><p className="font-medium">{title}</p><div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div></div>
    </div>
  );
  const Tag = ({ children }) => <span className="rounded-full bg-paper border border-line px-2.5 py-0.5 text-[12.5px] text-ink-soft">{children}</span>;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-bold text-[19px]"><span className="text-accent"><Ico name="target" className="h-6 w-6" /></span>Ce que le Radar cherche</h2>
        {c && !edit && <button onClick={() => setEdit({ postes: (cfg.postes ?? []).join(", "), mots_cles: (cfg.mots_cles ?? []).join(", "), activites: (cfg.activites ?? []).join(", "), marches: cfg.marches !== false, europe: !!cfg.europe, webhook: cfg.webhook ?? "", panier: cfg.panier ?? "" })} className="text-[13px] font-semibold text-accent hover:underline">Modifier</button>}
      </div>
      {!c ? <div className="py-8 grid place-items-center"><Spinner /></div> : edit ? (
        <div className="mt-4 space-y-3 text-sm">
          <label className="block"><span className="font-medium">Postes dont le recrutement signale un besoin</span>
            <textarea rows={2} value={edit.postes} onChange={(e) => setEdit({ ...edit, postes: e.target.value })} className="mt-1 w-full rounded-xl border border-line px-3 py-2" placeholder="Business developer, Responsable commercial" /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={edit.marches} onChange={(e) => setEdit({ ...edit, marches: e.target.checked })} /><span className="font-medium">Surveiller les marchés publics</span></label>
          {edit.marches && <label className="block"><span className="font-medium">Mots-clés des appels d'offres</span>
            <textarea rows={2} value={edit.mots_cles} onChange={(e) => setEdit({ ...edit, mots_cles: e.target.value })} className="mt-1 w-full rounded-xl border border-line px-3 py-2" placeholder="nettoyage des locaux, entretien" /></label>}
          {edit.marches && <label className="flex items-center gap-2"><input type="checkbox" checked={edit.europe} onChange={(e) => setEdit({ ...edit, europe: e.target.checked })} /><span>Inclure les appels d'offres des pays voisins (Belgique, Luxembourg, Allemagne, Espagne, Italie, Pays-Bas, Portugal)</span></label>}
          <label className="block"><span className="font-medium">Activités de tes cibles, telles qu'écrites au registre</span>
            <textarea rows={2} value={edit.activites} onChange={(e) => setEdit({ ...edit, activites: e.target.value })} className="mt-1 w-full rounded-xl border border-line px-3 py-2" placeholder="conseil en gestion, agence immobilière" /></label>
          <label className="block"><span className="font-medium">Ce que te rapporte un client moyen par an (€ HT)</span>
            <input type="number" min="0" value={edit.panier} onChange={(e) => setEdit({ ...edit, panier: e.target.value })} className="mt-1 w-full rounded-xl border border-line px-3 py-2" placeholder="ex. 6000" />
            <span className="text-[11.5px] text-ink-faint">Sert à estimer la valeur de chaque opportunité. Vide : calculé à partir de tes clients.</span></label>
          <label className="block"><span className="font-medium">Alertes instantanées dans Slack ou Teams (facultatif)</span>
            <input value={edit.webhook} onChange={(e) => setEdit({ ...edit, webhook: e.target.value })} className="mt-1 w-full rounded-xl border border-line px-3 py-2" placeholder="Adresse de webhook entrant (https://hooks.slack.com/…)" />
            <span className="text-[11.5px] text-ink-faint">Dans Slack : Applications → « Incoming Webhooks ». Dans Teams : connecteur « Incoming Webhook » du canal.</span></label>
          <p className="text-xs text-ink-faint">Sépare par des virgules. La zone et les cibles se règlent dans Réglages.</p>
          <div className="flex gap-2"><Button variant="accent" loading={busy} onClick={save}>Enregistrer</Button><Button variant="ghost" onClick={() => setEdit(null)}>Annuler</Button></div>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          <Row icon="pin" title="Zone surveillée">{(c.zone ?? []).length ? c.zone.slice(0, 12).map((d) => <Tag key={d}>{d}</Tag>) : <Tag>France entière</Tag>}{(c.zone ?? []).length > 12 && <Tag>+{c.zone.length - 12}</Tag>}</Row>
          <Row icon="building" title="Entreprises dans ta cible">{(ws.targets ?? []).filter((t) => t.actif !== false).slice(0, 5).map((t) => <Tag key={t.id}>{t.label}</Tag>)}{!(ws.targets ?? []).length && <Tag>À définir dans Réglages</Tag>}</Row>
          <Row icon="users" title="Recrutements qui signalent un besoin">{(cfg.postes ?? []).map((x) => <Tag key={x}>{x}</Tag>)}</Row>
          <Row icon="up" title="Signaux de croissance"><Tag>Levées de fonds</Tag><Tag>Nouveaux sites</Tag><Tag>Rachats</Tag><Tag>Créations</Tag></Row>
          <Row icon="doc" title="Marchés publics">{cfg.marches === false ? <Tag>Désactivés : pas adaptés à ton offre</Tag> : <>{(cfg.mots_cles ?? []).map((x) => <Tag key={x}>{x}</Tag>)}<Tag>{cfg.europe ? "France + pays voisins" : "France (BOAMP + TED)"}</Tag><Tag>Renouvellements à venir</Tag></>}</Row>
          <Row icon="up" title="Presse et collectivités (chaque semaine)"><Tag>Levées de fonds</Tag><Tag>Aides publiques</Tag><Tag>Projets votés</Tag><Tag>Permis et chantiers</Tag><Tag>Salons</Tag>{cfg.webhook ? <Tag>Alertes Slack / Teams actives</Tag> : null}</Row>
          <Row icon="user" title="Annonces légales (BODACC)"><Tag>Nouveau dirigeant</Tag><Tag>Déménagement</Tag><Tag>Rachat</Tag><Tag>Ouverture d'établissement</Tag>{(cfg.activites ?? []).slice(0, 4).map((x) => <Tag key={x}>créations : {x}</Tag>)}</Row>
          <Learned cfg={cfg} />
        </div>
      )}
    </Card>
  );
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const euro = (n) => n == null ? "—" : `${Math.round(Number(n)).toLocaleString("fr-FR")} €`;
const nrm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const median = (a) => { const s = a.filter((x) => x > 0).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

/** Fiche acheteur : tout ce qu'il achète dans ton secteur, à qui, pour combien, jusqu'à quand. */
function BuyerFiche({ name, rows, onClose }) {
  const list = rows.slice().sort((a, b) => String(b.notified).localeCompare(String(a.notified)));
  const holders = [...new Set(list.map((r) => r.holder_name).filter(Boolean))];
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal>
      <button className="absolute inset-0 bg-ink/30" onClick={onClose} aria-label="Fermer" />
      <div className="relative w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3"><span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-[#FEF3C7] text-[#92400E]">Fiche acheteur</span><button onClick={onClose} className="text-ink-soft hover:text-ink"><Ico name="x" /></button></div>
        <h2 className="font-serif text-3xl leading-tight mt-4">{name}</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[[list.length, "contrats"], [euro(list.reduce((s, r) => s + Number(r.montant ?? 0), 0)), "montant total"], [holders.length, "titulaires différents"]].map(([v, l]) => <div key={l} className="rounded-xl bg-paper p-3"><p className="font-bold tnum">{v}</p><p className="text-[11.5px] text-ink-soft">{l}</p></div>)}
        </div>
        <ul className="mt-5 space-y-2.5">
          {list.map((r) => { const ends = r.fin && new Date(r.fin) > new Date(); return (
            <li key={r.id} className="rounded-xl border border-line p-3 text-sm">
              <p className="font-medium leading-snug">{r.objet}</p>
              <p className="text-[12.5px] text-ink-soft mt-1">{[r.holder_name ? `Titulaire : ${r.holder_name}` : "Titulaire non publié", euro(r.montant), r.duree_mois ? `${r.duree_mois} mois` : null].filter(Boolean).join(" · ")}</p>
              <p className={cx("text-[12px] mt-0.5", ends ? "text-accent-dark font-semibold" : "text-ink-faint")}>Notifié le {r.notified ? new Date(r.notified).toLocaleDateString("fr-FR") : "?"}{r.fin ? ` · fin estimée ${new Date(r.fin).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}` : ""}</p>
            </li>
          ); })}
        </ul>
        <p className="text-[11.5px] text-ink-faint mt-4">Source : données essentielles de la commande publique. Fin estimée = notification + durée déclarée (reconductions possibles).</p>
      </div>
    </div>
  );
}

/** Le marché public de ton secteur : calendrier des renouvellements, clients de tes concurrents, prix gagnants. */
function Market({ ws }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [rivals, setRivals] = useState([]);
  const [tab, setTab] = useState("calendrier");
  const [buyer, setBuyer] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [{ data }, { data: c }] = await Promise.all([
      supabase.from("public_contracts").select("*").eq("workspace_id", ws.id).eq("relevant", true).order("notified", { ascending: false }).limit(1500),
      supabase.from("competitors").select("name").eq("workspace_id", ws.id).neq("status", "ecarte"),
    ]);
    setRows(data ?? []); setRivals((c ?? []).map((x) => nrm(x.name).split(" ")[0]).filter((x) => x.length > 3));
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);
  if (ws.radar_cfg?.marches === false) return null;
  const refresh = async () => {
    setBusy(true);
    try { const r = await fn("r/market-refresh", { workspace_id: ws.id }); await load(); toast(r.skipped ?? `${r.pertinents} contrats de ton secteur dans ta zone`, "good"); } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const list = rows ?? [];
  const now = new Date(), in12 = new Date(now.getFullYear(), now.getMonth() + 12, 1);
  const coming = list.filter((r) => r.fin && new Date(r.fin) >= now && new Date(r.fin) < in12);
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); return { key: `${d.getFullYear()}-${d.getMonth()}`, label: `${MOIS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, rows: coming.filter((r) => { const f = new Date(r.fin); return f.getFullYear() === d.getFullYear() && f.getMonth() === d.getMonth(); }) }; });
  const isRival = (r) => { const h = nrm(r.holder_name); return !!h && rivals.some((x) => h.includes(x)); };
  const rivalRows = list.filter(isRival).sort((a, b) => String(a.fin ?? "9").localeCompare(String(b.fin ?? "9")));
  const byBuyer = (name) => list.filter((r) => (r.buyer_name || r.buyer_id) === name);
  const annual = list.map((r) => r.montant && r.duree_mois ? (Number(r.montant) / Number(r.duree_mois)) * 12 : null).filter(Boolean);
  const holders = Object.values(list.reduce((m, r) => { if (!r.holder_name) return m; const k = r.holder_name; m[k] ??= { name: k, n: 0, total: 0 }; m[k].n++; m[k].total += Number(r.montant ?? 0); return m; }, {})).sort((a, b) => b.n - a.n).slice(0, 8);
  const switched = (() => {
    const by = {};
    for (const r of list.slice().sort((a, b) => String(a.notified).localeCompare(String(b.notified)))) { if (!r.holder_id) continue; (by[r.buyer_id] ??= []).push(r); }
    return Object.values(by).filter((l) => l.length > 1 && l[l.length - 1].holder_id.slice(0, 9) !== l[l.length - 2].holder_id.slice(0, 9)).map((l) => ({ last: l[l.length - 1], prev: l[l.length - 2] })).sort((a, b) => String(b.last.notified).localeCompare(String(a.last.notified)));
  })();
  const tabs = [["calendrier", `Renouvellements à 12 mois (${coming.length})`], ["concurrents", `Clients de tes concurrents (${rivalRows.length})`], ["prix", "Prix gagnants"], ["changes", `Ont changé de prestataire (${switched.length})`]];
  const Line = ({ r }) => (
    <li className="py-2.5 flex items-start gap-3">
      <span className="min-w-0 flex-1">
        <button onClick={() => setBuyer(r.buyer_name || r.buyer_id)} className="block font-medium text-[14px] text-left hover:underline truncate max-w-full">{r.buyer_name || "Acheteur public"}</button>
        <span className="block text-[12.5px] text-ink-soft line-clamp-1">{r.objet}</span>
        <span className="block text-[12px] text-ink-faint">{[r.holder_name ? `tenu par ${r.holder_name}` : null, euro(r.montant)].filter(Boolean).join(" · ")}</span>
      </span>
      {r.fin && <span className="shrink-0 text-right text-[12px]"><span className="block text-ink-faint">fin estimée</span><b>{new Date(r.fin).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}</b></span>}
    </li>
  );
  return (
    <Card className="p-0 overflow-hidden min-w-0">
      <div className="px-5 pt-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 font-bold text-[19px]"><span className="text-accent"><Ico name="clock" className="h-6 w-6" /></span>Marché public de ton secteur</h2>
        <button onClick={refresh} disabled={busy} className="text-[13px] font-semibold text-accent hover:underline disabled:opacity-50">{busy ? "Mise à jour… (1 à 2 min)" : list.length ? "Mettre à jour" : "Charger le marché"}</button>
      </div>
      <div className="flex gap-1 overflow-x-auto px-5 py-3 border-b border-line">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium", tab === k ? "bg-accent-soft text-accent-dark" : "text-ink-soft hover:text-ink")}>{l}</button>)}</div>
      <div className="p-5">
        {!rows ? <div className="py-8 grid place-items-center"><Spinner /></div> : !list.length ? <p className="text-sm text-ink-soft text-center py-6">Pas encore de données. Clique sur « Charger le marché » : le Radar récupère les contrats publics de ton secteur dans ta zone sur 6 ans (mise à jour automatique chaque semaine).</p>
        : tab === "calendrier" ? (
          <>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {months.map((m) => <div key={m.key} className="text-center"><div className="h-16 rounded-lg bg-paper flex items-end overflow-hidden"><div className="w-full rounded-lg bg-[#F59E0B]" style={{ height: `${Math.min(100, m.rows.length * 18)}%` }} /></div><p className="text-[11px] text-ink-soft mt-1">{m.label}</p><p className="text-[11px] font-bold tnum">{m.rows.length}</p></div>)}
            </div>
            <ul className="mt-4 divide-y divide-line">{coming.sort((a, b) => String(a.fin).localeCompare(String(b.fin))).slice(0, 25).map((r) => <Line key={r.id} r={r} />)}</ul>
            <p className="text-[11.5px] text-ink-faint mt-2">Présente-toi aux acheteurs 4 à 6 mois avant la fin : c'est quand ils rédigent le nouveau cahier des charges.</p>
          </>
        ) : tab === "changes" ? (
          !switched.length ? <p className="text-sm text-ink-soft">Aucun changement de prestataire repéré pour l'instant.</p> : (
            <>
              <p className="text-[12.5px] text-ink-soft mb-2">Ces acheteurs ont changé de prestataire à leur dernier contrat : ils sont ouverts au changement. En rouge, ceux qu'un de tes concurrents a perdus.</p>
              <ul className="divide-y divide-line">{switched.slice(0, 30).map(({ last, prev }) => { const lost = isRival(prev); return (
                <li key={last.id} className="py-2.5 text-sm">
                  <button onClick={() => setBuyer(last.buyer_name || last.buyer_id)} className="font-medium hover:underline text-left">{last.buyer_name || "Acheteur public"}</button>
                  <p className="text-[12.5px] text-ink-soft line-clamp-1">{last.objet}</p>
                  <p className="text-[12px]"><span className={cx(lost ? "text-bad font-semibold" : "text-ink-faint")}>{prev.holder_name || "ancien titulaire"}</span><span className="text-ink-faint"> → {last.holder_name || "nouveau titulaire"} · {last.notified ? new Date(last.notified).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : ""}{last.fin ? ` · fin estimée ${new Date(last.fin).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}` : ""}</span></p>
                </li>
              ); })}</ul>
            </>
          )
        ) : tab === "concurrents" ? (
          !rivals.length ? <p className="text-sm text-ink-soft">Ajoute tes concurrents dans Espion : le Radar retrouvera les contrats publics qu'ils détiennent.</p>
          : !rivalRows.length ? <p className="text-sm text-ink-soft">Aucun contrat public de tes concurrents suivis dans ta zone pour l'instant.</p>
          : <ul className="divide-y divide-line">{rivalRows.slice(0, 30).map((r) => <Line key={r.id} r={r} />)}</ul>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-ink-soft mb-2">Repères de prix ({list.length} contrats)</p>
              <ul className="space-y-1.5 text-sm">
                <li className="flex justify-between"><span className="text-ink-soft">Montant médian d'un contrat</span><b className="tnum">{euro(median(list.map((r) => Number(r.montant))))}</b></li>
                <li className="flex justify-between"><span className="text-ink-soft">Montant médian par an</span><b className="tnum">{euro(median(annual))}</b></li>
                <li className="flex justify-between"><span className="text-ink-soft">Durée la plus courante</span><b className="tnum">{(() => { const c = list.reduce((m, r) => { if (r.duree_mois) m[r.duree_mois] = (m[r.duree_mois] ?? 0) + 1; return m; }, {}); const k = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return k ? `${k[0]} mois` : "—"; })()}</b></li>
              </ul>
              <p className="text-[12px] font-bold uppercase tracking-wider text-ink-soft mt-5 mb-2">Dernières attributions</p>
              <ul className="divide-y divide-line">{list.slice(0, 8).map((r) => <Line key={r.id} r={r} />)}</ul>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-ink-soft mb-2">Qui gagne le plus</p>
              <ul className="space-y-2">{holders.map((h) => (
                <li key={h.name} className="text-sm"><div className="flex justify-between gap-2"><span className={cx("truncate", rivals.some((x) => nrm(h.name).includes(x)) && "font-semibold text-bad")}>{h.name}</span><span className="tnum text-ink-soft shrink-0">{h.n} contrat{h.n > 1 ? "s" : ""} · {euro(h.total)}</span></div>
                  <div className="h-1.5 rounded-full bg-paper mt-1 overflow-hidden"><div className="h-full rounded-full bg-accent" style={{ width: `${(h.n / Math.max(1, holders[0].n)) * 100}%` }} /></div></li>
              ))}</ul>
              <p className="text-[11.5px] text-ink-faint mt-3">En rouge : tes concurrents suivis par Espion.</p>
            </div>
          </div>
        )}
      </div>
      {buyer && <BuyerFiche name={buyer} rows={byBuyer(buyer)} onClose={() => setBuyer(null)} />}
    </Card>
  );
}

/** Entreprises reconnues parmi les visiteurs du site (registre public des adresses IP ; jamais l'adresse elle-même). */
function Visitors({ ws }) {
  const nav = useAller();
  const [d, setD] = useState(null);
  useEffect(() => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    Promise.all([
      supabase.from("site_events").select("org, path, source, session_id, type, created_at").eq("workspace_id", ws.id).not("org", "is", null).gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
      supabase.from("site_events").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).gte("created_at", since),
    ]).then(([{ data }, { count }]) => {
      const m = {};
      for (const e of data ?? []) {
        const x = (m[e.org] ??= { org: e.org, pages: new Set(), sessions: new Set(), sources: new Set(), last: e.created_at, lead: false });
        x.pages.add(e.path); x.sessions.add(e.session_id); if (e.source) x.sources.add(e.source); if (e.type === "lead") x.lead = true;
      }
      const hot = (p) => /(tarif|prix|pricing|price|devis|demo|démo|contact|essai|trial|alternative|comparatif)/i.test(p);
      setD({ total: count ?? 0, rows: Object.values(m).map((x) => ({ ...x, hot: [...x.pages].filter(hot) })).sort((a, b) => (b.hot.length - a.hot.length) || (b.sessions.size - a.sessions.size)) });
    });
  }, [ws.id]);
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="flex items-center gap-2.5 font-bold text-[19px]"><span className="text-accent"><Ico name="eye" className="h-6 w-6" /></span>Entreprises qui visitent ton site</h2>
      <p className="text-[13px] text-ink-soft mt-1">Quand quelqu'un visite ton site depuis le réseau de son entreprise, le registre public des adresses Internet indique à quelle entreprise elle appartient. On ne garde que le nom de l'entreprise, jamais l'adresse ni la personne. Le télétravail et le mobile ne sont pas reconnaissables : compte environ 1 visite professionnelle sur 10.</p>
      {!d ? <div className="py-8 grid place-items-center"><Spinner /></div> : !d.total ? (
        <div className="mt-4 rounded-xl bg-paper px-4 py-3 text-sm">Le suivi n'est pas encore installé sur ton site.</div>
      ) : !d.rows.length ? <p className="text-sm text-ink-faint text-center py-8">{d.total} visites ces 30 derniers jours, aucune entreprise reconnue pour l'instant.</p> : (
        <ul className="mt-4 divide-y divide-line">
          {d.rows.slice(0, 60).map((x) => (
            <li key={x.org} className="py-3 flex items-start gap-3">
              <span className={cx("mt-1.5 h-2.5 w-2.5 rounded-full shrink-0", x.hot.length || x.lead ? "bg-bad" : "bg-line")} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[14.5px]">{x.org}</span>
                <span className="block text-[12.5px] text-ink-soft">{x.sessions.size} visite{x.sessions.size > 1 ? "s" : ""} · {x.pages.size} page{x.pages.size > 1 ? "s" : ""}{x.sources.size ? ` · via ${[...x.sources].join(", ")}` : ""} · dernière le {new Date(x.last).toLocaleDateString("fr-FR")}</span>
                {(x.hot.length > 0 || x.lead) && <span className="block text-[12.5px] font-semibold text-bad">{x.lead ? "A envoyé un formulaire · " : ""}{x.hot.length ? `A regardé : ${x.hot.slice(0, 3).join(", ")}` : ""}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Extension installée ? (une seule question par session) et état du pilote LinkedIn (une fois par espace). */
let EXT_PING = null;
const extInstalled = () => (EXT_PING ??= Promise.all(EXT_IDS.map(pingExtension)).then((r) => r.some(Boolean)));
const PILOT = {};
const pilotState = (wsId) => (PILOT[wsId] ??= fn("li-settings", { workspace_id: wsId }).catch(() => null));

/** Recommandation LinkedIn sur la fiche : la note et le message écrits par Bingoo!, validés en un clic,
 *  puis envoyés par l'extension depuis le compte LinkedIn du client (invitation, puis message quand il accepte). */
function LinkedInReco({ ws, o, c, p, onDone }) {
  const toast = useToast();
  const nav = useAller();
  const [busy, setBusy] = useState(null);
  const [ext, setExt] = useState(null);
  const [pilot, setPilot] = useState(null);
  useEffect(() => { extInstalled().then(setExt); pilotState(ws.id).then(setPilot); }, [ws.id]);
  const first = String(c.name ?? "").split(/\s+/)[0];
  const st = p?.linkedin_status ?? "";
  const draftReady = !st && !!p?.linkedin_note;
  const queued = st === "a_envoyer" || st === "envoye";
  // Prépare la note d'invitation et le premier message (rien ne part : ils attendent la validation)
  const prepare = async () => {
    setBusy("prep");
    try {
      let pid = o.prospect_id;
      if (!pid) { const r = await fn("r/radar-crm", { workspace_id: ws.id, id: o.id }); pid = r.prospect_id; }
      // Le profil déjà trouvé sur la fiche sert de cible : Bingoo! écrit sans chercher à nouveau
      const known = /linkedin\.com\/in\//i.test(c.linkedin_url ?? "");
      await supabase.from("prospects").update({
        linkedin_status: "",
        ...(known ? { linkedin_url: c.linkedin_url.replace(/[?#].*$/, ""), linkedin_person: [c.name, c.role].filter(Boolean).join(" · ").slice(0, 120) } : {}),
        ...(!p?.contact_name ? { contact_name: c.name, contact_role: c.role ?? "" } : {}),
      }).eq("id", pid);
      const r = await fn("linkedin", { workspace_id: ws.id, ids: [pid], count: 1, hold: true });
      const res = r.results?.[0];
      if (res?.linkedin_status === "introuvable") toast(`Profil LinkedIn de ${c.name} introuvable. Ouvre-le avec « Le chercher sur LinkedIn ».`, "default");
      else toast(`Invitation et message prêts pour ${first || c.name} : relis, puis valide`, "good");
      await onDone?.();
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const validate = async () => {
    setBusy("ok");
    await supabase.from("prospects").update({ linkedin_status: "a_envoyer" }).eq("id", o.prospect_id);
    toast(pilot?.enabled ? "Validé : l'extension enverra l'invitation, puis le message dès qu'il accepte" : "Validé. Active le pilote LinkedIn pour que l'extension l'envoie.", "good");
    setBusy(null); await onDone?.();
  };
  const copy = (t) => navigator.clipboard?.writeText(t).then(() => toast("Copié", "good"), () => toast("Copie impossible", "bad"));
  // Ce qui manque pour que l'envoi soit automatique (extension, puis pilote)
  const setup = ext === false ? (
    <p className="text-[12px] text-ink-soft">Pour l'envoi automatique : <a href={STORE_URL} target="_blank" rel="noreferrer" className="font-semibold text-li hover:underline">installe l'extension Bingoo!</a> (1 minute), puis <button onClick={() => nav("/linkedin")} className="font-semibold text-li hover:underline">active le pilote</button>.</p>
  ) : pilot && !pilot.enabled ? (
    <p className="text-[12px] text-ink-soft">L'envoi automatique est arrêté : <button onClick={() => nav("/linkedin")} className="font-semibold text-li hover:underline">active le pilote LinkedIn</button>.</p>
  ) : pilot?.paused_reason ? <p className="text-[12px] text-warn">Pilote en pause : {pilot.paused_reason}.</p> : null;

  return (
    <div className="rounded-2xl border border-li/25 bg-li/5 p-3 text-[13px] leading-snug">
      <p className="flex items-center gap-1.5 font-bold text-li"><Ico name="li" className="h-4 w-4" />Recommandé : écris-lui aussi sur LinkedIn</p>
      {queued ? (
        <>
          <p className="mt-1 text-ink-soft">{st === "envoye" ? `Invitation envoyée à ${first || c.name}.` : `Dans la file : l'extension Bingoo! envoie l'invitation à ${first || c.name}, puis le message dès qu'il accepte.`} Bingoo! s'arrête s'il répond par e-mail.</p>
          {st === "a_envoyer" && <div className="mt-1.5">{setup}</div>}
        </>
      ) : draftReady ? (
        <>
          <div className="mt-2 rounded-xl bg-white border border-line p-2.5">
            <p className="text-[11.5px] font-semibold text-ink-soft">Note d'invitation · {p.linkedin_note.length}/200</p>
            <p className="mt-0.5">{p.linkedin_note}</p>
            {p.linkedin_msg && <details className="mt-1.5"><summary className="cursor-pointer text-[12px] text-ink-soft">Message après acceptation</summary><p className="mt-1 whitespace-pre-line">{p.linkedin_msg}</p></details>}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button onClick={validate} disabled={!!busy} style={{ background: "#0A66C2" }} className="rounded-full text-white px-3 py-1.5 text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-60">{busy === "ok" ? "…" : "Valider : l'extension l'envoie"}</button>
            <button onClick={() => copy(p.linkedin_note)} className="rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold hover:bg-paper">Copier la note</button>
          </div>
          <div className="mt-1.5">{setup}</div>
        </>
      ) : (
        <>
          <p className="mt-1 text-ink-soft">Bingoo! écrit l'invitation et le premier message à partir de ce signal. Avec l'extension Bingoo!, ils partent tout seuls depuis ton compte LinkedIn : l'invitation, puis le message quand {first || "la personne"} accepte.{!p?.email && !c.email ? " Ici, c'est le meilleur canal : pas encore d'e-mail vérifié." : ""}</p>
          <button onClick={prepare} disabled={!!busy} style={{ background: "#0A66C2" }} className="mt-2 rounded-full text-white px-3.5 py-1.5 text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-60">{busy === "prep" ? "Bingoo! écrit… (15 à 30 s)" : "Préparer l'invitation LinkedIn"}</button>
          <div className="mt-1.5">{setup}</div>
        </>
      )}
    </div>
  );
}

/** Qui contacter : les bonnes personnes pour ce signal, avec e-mail (publié ou vérifié), téléphone et profil LinkedIn public. */
const AUTO_TRIED = new Set();
const initials = (n) => String(n ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
function ContactsBox({ ws, o, onChange }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [p, setP] = useState(null);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);
  const load = useCallback(async () => {
    if (!o?.prospect_id) { setRows([]); setP(null); return; }
    const [{ data: c }, { data: pr }] = await Promise.all([
      supabase.from("contacts").select("id, name, role, email, email_status, linkedin_url, source, profile").eq("prospect_id", o.prospect_id).order("created_at").limit(6),
      supabase.from("prospects").select("phone, email, website, contact_name, linkedin_url, linkedin_status, linkedin_note, linkedin_msg").eq("id", o.prospect_id).single(),
    ]);
    setRows(c ?? []); setP(pr ?? null);
  }, [o?.prospect_id]);
  useEffect(() => { load(); }, [load, o?.id]);
  const find = async (isAuto = false) => {
    setBusy(true); if (isAuto) setAuto(true);
    try {
      const r = await fn("r/opp-contacts", { workspace_id: ws.id, id: o.id, auto: isAuto });
      if (!isAuto) toast(r.contacts?.length ? `${r.contacts.length} contact${r.contacts.length > 1 ? "s" : ""} trouvé${r.contacts.length > 1 ? "s" : ""}${r.launched ? " · e-mails en cours de vérification" : ""}` : "Aucun décideur trouvé en ligne pour l'instant", r.contacts?.length ? "good" : "muted");
      await onChange?.(); await load();
    } catch (e) { if (!isAuto) toast(e.message, "bad"); } finally { setBusy(false); setAuto(false); }
  };
  // Recherche automatique dès l'ouverture d'une opportunité jamais cherchée (une seule fois, plafonnée côté serveur)
  useEffect(() => {
    if (!o?.id || o.kind === "appel_offres" || o.raw?.contacts_at || AUTO_TRIED.has(o.id) || rows === null || rows.length) return;
    AUTO_TRIED.add(o.id); find(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o?.id, rows]);
  const c0 = o.raw?.contact;
  const li = (name) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${name} ${o.company}`)}`;
  const person = (n) => n && !/^(service|contact de|direction|mairie)/i.test(n);
  const ST = { verifie: ["vérifié", "text-good"], publie: ["publié", "text-good"], en_cours: ["vérification en cours", "text-ink-faint"], introuvable: ["", ""] };
  const clean = (x) => String(x ?? "").split(/\s[(—]/)[0].trim();
  const usable = (rows ?? []).filter((c) => !/n'est pas (un|le) décideur/i.test(c.role ?? "")).map((c) => ({ ...c, role: clean(c.role) }));
  const list = usable.length ? usable : c0?.nom ? [{ id: "r", name: c0.nom, role: c0.role, email: c0.email, email_status: c0.email ? "publie" : "", linkedin_url: c0.linkedin, source: c0.source, profile: {} }] : [];
  const phone = p?.phone || c0?.tel;
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  return (
    <div>
      <p className="flex items-center gap-2 font-bold text-[14.5px]"><Ico name="user" className="h-5 w-5 text-accent" />Qui contacter ?</p>
      {rows === null ? <div className="py-3"><Spinner /></div> : busy && auto && !list.length ? (
        <p className="mt-2 text-[13px] text-ink-soft flex items-center gap-2"><Spinner />Bingoo! cherche qui décide chez {o.company}… (30 s à 1 min)</p>
      ) : (
        <div className="mt-2 space-y-3">
          {list.slice(0, 3).map((c) => {
            const pr = c.profile ?? {};
            return (
              <div key={c.id} className="rounded-2xl border border-line bg-white p-3 text-[13.5px] leading-snug">
                <div className="flex items-start gap-3">
                  {person(c.name) ? <span className="h-10 w-10 shrink-0 rounded-full bg-ink text-white flex items-center justify-center font-bold text-[13px]">{initials(c.name)}</span> : <span className="h-10 w-10 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center"><Ico name="user" className="h-5 w-5" /></span>}
                  <div className="min-w-0 flex-1">
                    <p><b>{c.name}</b></p>
                    {c.role ? <p className="text-ink-soft">{c.role}{pr.depuis ? ` · depuis ${pr.depuis}` : ""}{pr.ville ? ` · ${pr.ville}` : ""}</p> : null}
                    {pr.parcours ? <p className="mt-1 text-[12.5px] text-ink-soft">{pr.parcours}</p> : null}
                  </div>
                </div>
                <div className="mt-2.5 space-y-1">
                  {c.email ? <p><a href={`mailto:${c.email}`} className="text-accent hover:underline break-all">{c.email}</a>{ST[c.email_status]?.[0] ? <span className={cx("text-[11.5px] ml-1.5", ST[c.email_status][1])}>{ST[c.email_status][0]}</span> : null}</p>
                    : c.email_status === "en_cours" ? <p className="text-[12px] text-ink-faint">E-mail : vérification en cours…</p> : null}
                  {person(c.name) && <a href={c.linkedin_url || li(c.name)} target="_blank" rel="noreferrer" style={{ background: "#0A66C2" }} className="inline-flex items-center gap-1 rounded-full text-white px-3 py-1 text-[12px] font-semibold hover:opacity-90">{c.linkedin_url ? "Voir son profil LinkedIn ↗" : "Le chercher sur LinkedIn ↗"}</a>}
                  {c.source && /^https?:/.test(c.source) ? <p className="text-[11.5px] text-ink-faint">Source : <a href={c.source} target="_blank" rel="noreferrer" className="hover:underline">{host(c.source)}</a></p> : c.source ? <p className="text-[11.5px] text-ink-faint">Source : {c.source}</p> : null}
                </div>
              </div>
            );
          })}
          {(() => { const lead = list.find((c) => person(c.name)); return lead && o.kind !== "appel_offres" ? <LinkedInReco ws={ws} o={o} c={lead} p={p} onDone={async () => { await onChange?.(); await load(); }} /> : null; })()}
          {phone && <p className="text-[13.5px]"><span className="text-ink-soft">Téléphone : </span><a href={`tel:${phone.replace(/\s/g, "")}`} className="font-semibold hover:underline">{phone}</a></p>}
          {!usable.length && o.kind !== "appel_offres" && (
            <button onClick={() => find(false)} disabled={busy} className="rounded-full border border-accent/40 text-accent-dark px-3.5 py-1.5 text-[12.5px] font-semibold hover:bg-accent-soft disabled:opacity-60">{busy ? "Recherche… (30 s à 1 min)" : list.length ? "Chercher d'autres décideurs" : "Trouver le décideur"}</button>
          )}
          {!list.length && !phone && !busy && o.kind === "appel_offres" && <p className="text-[13px] text-ink-soft">Le contact de l'acheteur est dans l'avis officiel (Tous les détails).</p>}
        </div>
      )}
    </div>
  );
}

/** Vue d'accueil du Radar : radar par chaleur, fiche de l'opportunité choisie (pourquoi, maintenant, comment), qui contacter, prochaine action, classement. */
function HomeView({ ws, list, loaded, live, onScan, onOpen, onChange }) {
  const toast = useToast();
  const nav = useAller();
  const [mode, setMode] = useState("tout");
  const [selId, setSelId] = useState(null);
  const [tab, setTab] = useState("moment");
  const [busy, setBusy] = useState(null);
  const [full, setFull] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = Date.now() - 7 * 864e5;
  const pool = list.filter((o) => o.status !== "ecarte" && (mode === "tout" || (mode === "intention" ? INTENT.includes(o.kind) : !INTENT.includes(o.kind))));
  // Une ligne par entreprise : son meilleur signal, avec les autres en étiquettes
  const groups = useMemo(() => {
    const m = new Map();
    for (const o of pool) { const g = o.group_key || o.company; const x = m.get(g); if (!x) m.set(g, { top: o, kinds: new Set([o.kind]) }); else { x.kinds.add(o.kind); if ((o.score ?? 0) > (x.top.score ?? 0)) x.top = o; } }
    return [...m.values()].sort((a, b) => (Number(b.top.raw?.top_day === today) - Number(a.top.raw?.top_day === today)) || ((b.top.score ?? 0) - (a.top.score ?? 0)));
  }, [pool, today]);
  const sel = groups.find((g) => g.top.id === selId) ?? groups[0];
  const o = sel?.top;
  const hot = list.filter((x) => (x.score ?? 0) >= 75 && x.status === "nouveau").length;
  const intents = list.filter((x) => INTENT.includes(x.kind) && new Date(x.created_at).getTime() >= weekAgo).length;
  // Le vrai état du premier message : « Message prêt » seulement s'il existe un brouillon à valider
  const [msg, setMsg] = useState(undefined);
  const loadMsg = useCallback(async () => {
    if (!o?.prospect_id) return setMsg(null);
    const { data } = await supabase.from("messages").select("id, status").eq("prospect_id", o.prospect_id).eq("step", 0).order("created_at", { ascending: false }).limit(1);
    setMsg(data?.[0] ?? null);
  }, [o?.prospect_id]);
  useEffect(() => { setMsg(undefined); loadMsg(); }, [loadMsg, o?.id]);
  const prepare = async () => {
    setBusy("prep");
    try {
      // Entreprise déjà dans les prospects : on prépare son message ; sinon on part de l'opportunité
      const r = o.prospect_id ? await fn("m/prospect-prepare", { workspace_id: ws.id, id: o.prospect_id }) : await fn("m/prepare", { workspace_id: ws.id, id: o.id });
      const ok = r.message?.status === "brouillon";
      toast(ok ? `${o.company} : e-mail prêt à valider` : r.reason === "no_email" || (!r.message && !r.prospect?.email) ? `${o.company} : pas encore d'e-mail vérifié. Écris-lui sur LinkedIn (à gauche).` : r.reason === "no_sender" ? "Ajoute ton nom d'expéditeur dans Réglages pour que Bingoo! rédige" : `${o.company} ajouté à tes prospects`, ok ? "good" : "default");
      await onChange(); await loadMsg();
    }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const follow = async () => { await supabase.from("radar_opps").update({ status: "suivi" }).eq("id", o.id); toast(`${o.company} gardée en suivi`, "good"); onChange(); };
  const skip = async () => { await supabase.from("radar_opps").update({ status: "ecarte", feedback: "pas_pertinent" }).eq("id", o.id); toast("Écartée : le Radar en tiendra compte", "default"); setSelId(null); onChange(); };
  const deadline = o && (o.deadline || o.expires_at) ? new Date(o.deadline || o.expires_at) : null;
  const when = (x) => x.deadline && new Date(x.deadline) > new Date() ? `avant le ${new Date(x.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : x.raw?.top_day === today ? "aujourd'hui" : x.published ? `signal du ${new Date(x.published).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : "";
  const live_ = list.filter((x) => x.status !== "ecarte");
  const nI = live_.filter((x) => INTENT.includes(x.kind)).length, nS = live_.length - nI;
  const MODES = [["tout", `Tout (${live_.length})`], ["signal", `Signaux (${nS})`], ["intention", `Intentions (${nI})`]];
  // Mode simple : la liste des entreprises à contacter et une fiche, sans cadran, calendrier ni onglets
  const simple = estSimple(ws);
  return (
    <div className="space-y-5">
      {simple ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px]"><b className="tnum">{live_.length}</b> entreprise{live_.length > 1 ? "s" : ""} à contacter au bon moment{hot ? <>, dont <b className="tnum text-bad">{hot}</b> chaude{hot > 1 ? "s" : ""}</> : null}.</p>
          <Button size="sm" variant="ghost" loading={live} disabled={live} onClick={onScan}>Relancer l'analyse</Button>
        </div>
      ) : (<>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-white border border-line p-1">
          {MODES.map(([k, l]) => <button key={k} title={k === "intention" ? "Entreprises qui te regardent : visites de ton site, essais gratuits, demandes publiques" : k === "signal" ? "Ce qui arrive aux entreprises : contrats, dirigeants, recrutements…" : undefined} onClick={() => { setMode(k); setSelId(null); }} className={cx("rounded-full px-4 py-1.5 text-[14px] font-semibold transition", mode === k ? "bg-accent text-white" : "text-ink-soft hover:text-ink")}>{l}</button>)}
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" loading={live} disabled={live} onClick={onScan}>Relancer l'analyse</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {[["flame", hot, "opportunités chaudes à traiter", "score de 75 ou plus", "text-bad"], ["eye", intents, "intentions cette semaine", "entreprises qui te regardent", "text-accent"]].map(([ic, n, l, sub, col]) => (
          <Card key={l} className="p-4 sm:p-5 flex items-center gap-4">
            <span className={col}><Ico name={ic} className="h-8 w-8" /></span>
            <div><p className="font-black text-[34px] leading-none tnum" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{loaded ? n : "–"}</p><p className="text-[14px] font-semibold mt-1">{l}</p><p className="text-[12px] text-ink-faint">{sub}</p></div>
          </Card>
        ))}
      </div>

      <CalendarStrip ws={ws} />
      </>)}

      <div className={cx("grid gap-5 items-stretch", !simple && "xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]")}>
        {!simple && <Card className="p-5 sm:p-6 min-w-0">
          <h2 title="Le score mesure si c'est le bon moment (1 à 99), pas une probabilité de vente. Position : distance à ta zone." className="flex items-center gap-2.5 font-bold text-[18px]"><span className="text-accent"><Ico name="radar" className="h-6 w-6" /></span>Radar d'opportunités</h2>
          <div className="mt-4 grid sm:grid-cols-[minmax(0,1fr)_130px] gap-4 items-center">
            <div className="w-full max-w-[400px] mx-auto"><RadarScope round byHeat opps={pool} zone={ws.zone ?? []} scanning={live} selected={o?.id} onSelect={(x) => { setSelId((groups.find((g) => (g.top.group_key || g.top.company) === (x.group_key || x.company))?.top ?? x).id); setTab("entreprise"); setFull(false); }} /></div>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 sm:block sm:space-y-2.5">
              {HEAT.map(([m, l, col], i) => <li key={l} className="flex items-start gap-2 text-[12.5px]"><span className="mt-1 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: col }} /><span><b className="font-semibold">{l}</b><br /><span className="text-ink-faint">{i === 0 ? `${m} et plus` : `${m} à ${HEAT[i - 1][0] - 1}`}</span></span></li>)}
            </ul>
          </div>
        </Card>}

        <Card className="p-5 sm:p-6 min-w-0 flex flex-col">
          {!loaded ? <div className="py-16 grid place-items-center"><Spinner /></div> : !o ? (
            <div className="text-center py-16 px-4"><p className="text-sm text-ink-soft">{mode === "intention" ? "Aucune intention repérée pour l'instant : installe le suivi de ton site et publie ta page « Alternative à » (Espion)." : "Lance une première analyse : le Radar cherche les entreprises à contacter au bon moment."}</p>{mode !== "intention" && <Button variant="accent" className="mt-4" loading={live} disabled={live} onClick={onScan}>Lancer le Radar maintenant</Button>}</div>
          ) : (<div key={o.id} className="sheet-in flex flex-col flex-1 min-w-0">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-bold" style={{ background: `${heatDot(o.score)}1A`, color: heatDot(o.score) }}><Ico name="flame" className="h-4 w-4" />Opportunité {heatLabel(o.score).toLowerCase()}{o.raw?.top_day === today ? " · du jour" : ""}</span>
                <h2 className="mt-2 font-black text-[26px] leading-tight break-words" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{o.company}</h2>
                {raison(o) && <p className="mt-1 text-[15px] font-semibold text-ink">{raison(o)}</p>}
                <p className="text-[13px] text-ink-soft">{[o.city && `${o.city}${o.dept ? ` (${o.dept})` : ""}`, INTENT.includes(o.kind) ? "Intention" : "Signal"].filter(Boolean).join(" · ")}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{[...sel.kinds].map((k) => <span key={k} className={cx("rounded-full px-2.5 py-0.5 text-[12px] font-semibold", KIND[k]?.chip ?? "bg-paper")}>{KIND[k]?.label ?? k}</span>)}{o.raw?.valeur ? <span className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold bg-paper">≈ {euroK(o.raw.valeur)}/an</span> : null}</div>
              </div>
              <div className="shrink-0 text-center rounded-2xl border-2 px-3 py-2" style={{ borderColor: `${heatDot(o.score)}55` }}><p className="font-black text-[30px] leading-none tnum" style={{ color: heatDot(o.score) }}>{o.score ?? "–"}</p><p className="text-[11px] font-semibold" style={{ color: heatDot(o.score) }}>score</p></div>
            </div>
            <div className="mt-4 flex gap-1 border-b border-line overflow-x-auto">
              {[["entreprise", "Pourquoi cette entreprise ?"], ["moment", "Pourquoi maintenant ?"], ["approche", "Comment l'aborder ?"]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx("relative shrink-0 px-3 pb-2.5 text-[14px] font-semibold", tab === k ? "text-accent-dark" : "text-ink-soft hover:text-ink")}>{l}{tab === k && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-accent" />}</button>)}
            </div>
            <div className="py-3 text-[14px] leading-relaxed min-h-[80px]">
              {tab === "entreprise" && <><p className={cx(!full && "line-clamp-2")}>{o.summary || o.title}</p>{String(o.summary || "").length > 140 && <button onClick={() => setFull(!full)} className="text-[12px] font-semibold text-ink-soft hover:text-ink">{full ? "Réduire" : "Lire plus"}</button>}
                {(o.score_why ?? []).length > 1 && <div className="mt-2 flex flex-wrap gap-1.5">{o.score_why.filter((w) => !/^retiré/.test(w)).slice(1, 4).map((w) => <span key={w} className="rounded-full bg-paper px-2.5 py-0.5 text-[11.5px] text-ink-soft">{w.length > 42 ? `${w.slice(0, 40)}…` : w}</span>)}</div>}</>}
              {tab === "moment" && <><p className={cx(!full && "line-clamp-2")}>{o.why || "Signal récent : c'est le moment où l'entreprise est la plus réceptive."}</p>{String(o.why || "").length > 140 && <button onClick={() => setFull(!full)} className="text-[12px] font-semibold text-ink-soft hover:text-ink">{full ? "Réduire" : "Lire plus"}</button>}<p className="mt-1.5 text-[12.5px] text-ink-faint">{deadline && deadline > new Date() ? <b className="text-accent-dark">Avant le {deadline.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</b> : null}{deadline && deadline > new Date() && o.url ? " · " : ""}{o.url ? <a href={o.url} target="_blank" rel="noreferrer" className="hover:underline">Source</a> : null}</p></>}
              {tab === "approche" && <p>{APPROACH[o.kind] ?? "Présente-toi en partant de ce signal : une phrase sur ce qui se passe chez eux, une sur ce que tu apportes, une question simple."}</p>}
            </div>
            <div className="mt-auto grid sm:grid-cols-2 gap-4 pt-4 border-t border-line">
              <ContactsBox ws={ws} o={o} onChange={onChange} />
              <div>
                <p className="flex items-center gap-2 font-bold text-[14.5px]"><Ico name="up" className="h-5 w-5 text-accent" />Prochaine action</p>
                <div className="mt-2 space-y-2">
                  {msg === undefined && o.prospect_id ? <div className="py-2 grid place-items-center"><Spinner /></div>
                    : msg?.status === "brouillon" ? <Button variant="accent" className="w-full" onClick={() => nav(`/valider?voir=${msg.id}`)}>Message prêt : valider</Button>
                    : msg?.status === "envoye" ? <Button variant="default" className="w-full" onClick={() => nav("/reponses")}>Message envoyé : voir les réponses</Button>
                    : o.kind === "appel_offres" && !o.prospect_id ? <Button variant="accent" className="w-full" onClick={() => onOpen(o)}>Voir l'appel d'offres</Button>
                    : <Button variant="accent" className="w-full" loading={busy === "prep"} onClick={prepare}>{busy === "prep" ? "Bingoo! prépare… (20 à 40 s)" : "Préparer le message"}</Button>}
                  <div className="flex gap-2">
                    {!simple && <button onClick={() => nav("/mission")} className="flex-1 rounded-full border border-line px-3 py-2 text-[13px] font-semibold hover:bg-paper">Lancer une Mission</button>}
                    <button onClick={follow} className="flex-1 rounded-full border border-line px-3 py-2 text-[13px] font-semibold hover:bg-paper">{o.status === "suivi" ? "En suivi" : "Garder en suivi"}</button>
                  </div>
                  <div className="flex justify-between"><button onClick={() => onOpen(o)} className="text-[12.5px] font-semibold text-ink-soft hover:text-ink">Tous les détails</button><button onClick={skip} className="text-[12.5px] text-ink-faint hover:text-bad">Pas intéressant</button></div>
                </div>
              </div>
            </div>
          </div>)}
        </Card>
      </div>

      {groups.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 font-bold text-[18px]"><span className="text-accent"><Ico name="star" className="h-6 w-6" /></span>Meilleures opportunités du moment</h2>
            <span className="text-[12.5px] text-ink-faint">{groups.length} entreprise{groups.length > 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-[13.5px] min-w-[720px]">
            <thead><tr className="bg-paper text-left text-[12px] font-semibold text-ink-soft"><th className="px-5 py-2.5">Entreprise</th><th className="px-3 py-2.5">Score</th><th className="px-3 py-2.5">Signal</th><th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">Quand</th><th className="px-5 py-2.5 text-right">Action</th></tr></thead>
            <tbody>{groups.slice(0, 8).map(({ top: x, kinds }) => (
              <tr key={x.id} className={cx("border-t border-line", x.id === o?.id && "bg-accent-soft/40")}>
                <td className="px-5 py-2.5 font-semibold max-w-[260px]"><span className="block truncate">{x.company}</span>{x.raw?.top_day === today && <span className="text-[11px] font-bold text-bad">Entreprise du jour</span>}</td>
                <td className="px-3 py-2.5"><span className="rounded-full px-2.5 py-1 text-[12px] font-bold text-white tnum" style={{ background: heatDot(x.score) }}>{x.score ?? "–"}</span></td>
                <td className="px-3 py-2.5"><span className={cx("rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap", KIND[x.kind]?.chip ?? "bg-paper")}>{KIND[x.kind]?.label ?? x.kind}{kinds.size > 1 ? ` +${kinds.size - 1}` : ""}</span></td>
                <td className="px-3 py-2.5 text-ink-soft">{INTENT.includes(x.kind) ? "Intention" : "Signal"}</td>
                <td className="px-3 py-2.5 text-ink-soft whitespace-nowrap">{when(x)}</td>
                <td className="px-5 py-2.5 text-right"><button onClick={() => { setSelId(x.id); setTab("entreprise"); setFull(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-full border border-accent/40 text-accent-dark px-3.5 py-1 text-[12.5px] font-semibold hover:bg-accent-soft">Voir →</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card>
      )}
    </div>
  );
}

/** Partenaires apporteurs d'affaires : métiers qui servent les mêmes clients, et sociétés d'apport d'affaires de ta zone. */
function Partners({ ws }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = useCallback(() => supabase.from("radar_partners").select("*").eq("workspace_id", ws.id).neq("status", "ecarte").order("created_at").limit(300).then(({ data }) => setRows(data ?? [])), [ws.id]);
  useEffect(() => { load(); }, [load]);
  const refresh = async () => { setBusy("refresh"); try { const r = await fn("r/partners-refresh", { workspace_id: ws.id }); await load(); toast(`${r.partenaires ?? 0} partenaires trouvés`, "good"); } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); } };
  const add = async (p) => { setBusy(p.id); try { await fn("r/partner-add", { workspace_id: ws.id, id: p.id }); setRows((x) => x.map((y) => y.id === p.id ? { ...y, status: "ajoute" } : y)); toast(`${p.name} ajouté aux prospects`, "good"); } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); } };
  const drop = async (p) => { await supabase.from("radar_partners").update({ status: "ecarte" }).eq("id", p.id); setRows((x) => x.filter((y) => y.id !== p.id)); };
  const groups = (rows ?? []).reduce((m, p) => { (m[p.type] ??= []).push(p); return m; }, {});
  const order = Object.keys(groups).sort((a, b) => (a === "Société d'apport d'affaires" ? -1 : b === "Société d'apport d'affaires" ? 1 : groups[b].length - groups[a].length));
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-bold text-[19px]"><span className="text-accent"><Ico name="users" className="h-6 w-6" /></span>Partenaires apporteurs d'affaires</h2>
        <button onClick={refresh} disabled={!!busy} className="text-[13px] font-semibold text-accent hover:underline disabled:opacity-50">{busy === "refresh" ? "Recherche… (1 minute)" : rows?.length ? "Mettre à jour" : "Trouver mes partenaires"}</button>
      </div>
      <p className="text-[13px] text-ink-soft mt-1">Des entreprises qui servent les mêmes clients que toi sans te concurrencer, et des sociétés dont le métier est l'apport d'affaires. Un bon partenaire t'envoie des clients chaque mois.</p>
      {!rows ? <div className="py-8 grid place-items-center"><Spinner /></div> : !rows.length ? <p className="text-sm text-ink-faint text-center py-8">Clique sur « Trouver mes partenaires » : le Radar identifie les bons métiers pour ton offre, puis les entreprises de ta zone (mise à jour chaque mois).</p> : (
        <div className="mt-4 space-y-5">
          {order.map((t) => (
            <div key={t}>
              <p className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">{t} <span className="text-ink-faint font-semibold normal-case">· {groups[t].length}</span></p>
              <p className="text-[12.5px] text-ink-faint">{groups[t][0].pourquoi}</p>
              {groups[t][0].message && <p className="text-[12.5px] mt-0.5"><span className="font-semibold text-accent-dark">Angle : </span>{groups[t][0].message}</p>}
              <ul className="mt-2 divide-y divide-line">
                {groups[t].slice(0, 8).map((p) => (
                  <li key={p.id} className="py-2.5 flex items-center gap-3">
                    <span className="min-w-0 flex-1"><span className="block font-medium text-[14px] truncate">{p.name}</span><span className="block text-[12px] text-ink-faint truncate">{[p.city && `${p.city}${p.dept ? ` (${p.dept})` : ""}`, p.contact].filter(Boolean).join(" · ")}</span></span>
                    {p.status === "ajoute" ? <span className="text-[12px] font-semibold text-good shrink-0">Dans tes prospects</span> : <>
                      <Button size="sm" variant="ghost" loading={busy === p.id} onClick={() => add(p)}>Ajouter</Button>
                      <button onClick={() => drop(p)} title="Pas intéressant" className="text-ink-faint hover:text-bad"><Ico name="x" className="h-4 w-4" /></button>
                    </>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Radar adapté au métier : type d'entreprise, outils concurrents repérés sur les sites, obligations qui font acheter tes clients. */
function Adapted({ ws }) {
  const toast = useToast();
  const nav = useAller();
  const [d, setD] = useState(null);
  const [pick, setPick] = useState(false);
  useEffect(() => { fn("r/saas-info", { workspace_id: ws.id }).then(setD).catch(() => setD(null)); }, [ws.id]);
  if (!d) return null;
  const save = async (patch) => { try { await fn("r/saas-set", { workspace_id: ws.id, ...patch }); setD(await fn("r/saas-info", { workspace_id: ws.id })); toast("Enregistré : pris en compte à la prochaine analyse", "good"); } catch (e) { toast(e.message, "bad"); } };
  const toggleTool = (t) => save({ outils_rivaux: d.outils_rivaux.includes(t) ? d.outils_rivaux.filter((x) => x !== t) : [...d.outils_rivaux, t] });
  const ids = d.obligations.map((o) => o.id);
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="flex items-center gap-2.5 font-bold text-[17px]"><span className="text-accent"><Ico name="spark" className="h-5 w-5" /></span>Adapté à ton métier</h2>
      <p className="text-sm mt-2">Type d'entreprise : <b>{d.type_label}</b> <button onClick={() => nav("/reglages")} className="text-accent text-[13px] font-semibold hover:underline ml-1">changer</button></p>
      <p className="text-[12.5px] text-ink-faint mt-0.5">{d.sites} sites lus · {d.carrieres} pages carrières trouvées · {d.offres} offres d'emploi suivies</p>

      <p className="mt-4 text-[13px] font-semibold">Outils concurrents à repérer sur les sites</p>
      <p className="text-[12px] text-ink-faint">Une entreprise qui les utilise peut passer chez toi : le Radar te prévient, et avant la date anniversaire de son abonnement.</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {d.outils_rivaux.map((t) => <button key={t} onClick={() => toggleTool(t)} className="rounded-full bg-ink text-white px-2.5 py-1 text-[12px] font-semibold">{t} ×</button>)}
        <button onClick={() => setPick(!pick)} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold text-ink-soft hover:border-ink-faint">{pick ? "Fermer" : "+ Ajouter"}</button>
      </div>
      {pick && <div className="flex flex-wrap gap-1.5 mt-2 max-h-40 overflow-auto">{d.outils.filter((t) => !d.outils_rivaux.includes(t)).map((t) => <button key={t} onClick={() => toggleTool(t)} className="rounded-full bg-paper px-2.5 py-1 text-[12px] hover:bg-line">{t}</button>)}</div>}

      {d.type === "saas" && <TrialHook ws={ws} />}

      <p className="mt-4 text-[13px] font-semibold">Obligations qui poussent tes clients à acheter</p>
      <div className="mt-1.5 space-y-1">
        {d.obligations_all.map((o) => (
          <label key={o.id} className="flex items-start gap-2 text-[13px]"><input type="checkbox" className="mt-0.5" checked={ids.includes(o.id)} onChange={() => save({ obligations: ids.includes(o.id) ? ids.filter((x) => x !== o.id) : [...ids, o.id] })} /><span>{o.titre}</span></label>
        ))}
      </div>
    </Card>
  );
}

/** Brancher l'essai gratuit : plusieurs inscriptions d'une même entreprise = un achat d'équipe à aller chercher. */
function TrialHook({ ws }) {
  const [open, setOpen] = useState(false);
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/t`;
  const js = `<script defer src="${base}/kairo.js" data-k="${ws.track_key ?? ""}"></script>\n<!-- après une inscription à l'essai : -->\n<script>window.bingooTrial && bingooTrial(emailSaisi)</script>`;
  const api = `curl -X POST ${base}/essai -d '{"k":"${ws.track_key ?? ""}","email":"prenom@entreprise.fr"}'`;
  return (
    <div className="mt-4 rounded-xl bg-paper px-3.5 py-3">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left"><span className="text-[13px] font-semibold">Brancher ton essai gratuit</span><span className="text-[12px] text-accent font-semibold">{open ? "Fermer" : "Voir comment"}</span></button>
      <p className="text-[12px] text-ink-faint">Quand plusieurs personnes d'une même entreprise testent ton produit, le Radar te le signale. Seul le domaine de l'adresse (@entreprise.fr) est gardé, jamais l'adresse.</p>
      {open && <div className="mt-2 space-y-2 text-[12px]">
        <p>Sur ta page d'inscription :</p><pre className="whitespace-pre-wrap break-all rounded-lg bg-white border border-line p-2">{js}</pre>
        <p>Ou depuis ton serveur :</p><pre className="whitespace-pre-wrap break-all rounded-lg bg-white border border-line p-2">{api}</pre>
      </div>}
    </div>
  );
}

/** Calendrier d'achat : frise des 12 prochains mois. Un mois coloré = un moment où tes clients décident ; clic = quoi faire. */
function CalendarStrip({ ws }) {
  const [cal, setCal] = useState(null);
  const [obl, setObl] = useState([]);
  const [pick, setPick] = useState(null);
  useEffect(() => {
    fn("r/radar-calendar", { workspace_id: ws.id }).then(setCal).catch(() => setCal({ moments: [] }));
    fn("r/saas-info", { workspace_id: ws.id }).then((d) => setObl((d?.obligations ?? []).filter((o) => o.date && o.statut !== "en_cours"))).catch(() => setObl([]));
  }, [ws.id]);
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); return { m: d.getMonth() + 1, y: d.getFullYear(), label: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "") }; });
  const oblMonth = (o) => { const d = /^\d{4}/.test(o.date) ? new Date(o.date) : new Date(`2000-${o.date}`); return d.getMonth() + 1; };
  // « mois » : [début, fin] = une période (ex. [1, 3] = janvier à mars, [11, 2] = novembre à février) ; sinon une liste de mois
  const span = (mois = []) => { if (mois.length === 2 && mois[0] !== mois[1]) { const out = []; for (let k = mois[0], n = 0; n < 12; k = (k % 12) + 1, n++) { out.push(k); if (k === mois[1]) break; } return out; } return mois; };
  const of = (m) => ({ moments: (cal?.moments ?? []).filter((x) => span(x.mois).includes(m)), obl: obl.filter((o) => oblMonth(o) === m) });
  if (!cal || (!cal.moments?.length && !obl.length)) return null;
  const firstHot = months.find((x) => { const e = of(x.m); return e.moments.length || e.obl.length; });
  const sel = months.find((x) => x.m === pick) ?? firstHot;
  const e = sel ? of(sel.m) : { moments: [], obl: [] };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-[16px]"><span className="text-accent"><Ico name="clock" className="h-5 w-5" /></span>Quand tes clients achètent</h2>
        <span className="text-[12px] text-ink-faint hidden sm:inline">Clique sur un mois</span>
      </div>
      <div className="mt-3 grid grid-cols-6 sm:grid-cols-12 gap-1.5">
        {months.map((x, i) => { const ev = of(x.m); const on = ev.moments.length || ev.obl.length; const active = sel?.m === x.m; return (
          <button key={i} onClick={() => setPick(x.m)} title={[...ev.moments.map((m) => m.titre), ...ev.obl.map((o) => o.titre)].join(" · ") || undefined}
            className={cx("relative rounded-lg py-2 text-center text-[12.5px] font-semibold transition capitalize", active ? "bg-accent text-white" : on ? "bg-accent-soft text-accent-dark hover:bg-accent/20" : "bg-paper text-ink-faint")}>
            {x.label}{i === 0 && <span className={cx("block text-[10px] font-medium", active ? "text-white/80" : "text-ink-faint")}>maintenant</span>}
            {ev.obl.length > 0 && <span className={cx("absolute top-1 right-1 h-1.5 w-1.5 rounded-full", active ? "bg-white" : "bg-[#0F766E]")} />}
          </button>
        ); })}
      </div>
      {sel && (e.moments.length || e.obl.length) ? (
        <div className="mt-3 space-y-1.5 text-[13.5px]">
          {e.moments.slice(0, 2).map((m, i) => <p key={i} title={m.pourquoi}><b>{m.titre}</b><span className="text-ink-soft"> — {m.action}</span></p>)}
          {e.obl.map((o) => <p key={o.id}><b className="text-[#0F766E]">{o.titre}</b><span className="text-ink-soft"> — échéance {/^\d{4}/.test(o.date) ? new Date(o.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "annuelle"}</span></p>)}
        </div>
      ) : <p className="mt-3 text-[13px] text-ink-faint">Pas de moment d'achat repéré ce mois-là.</p>}
    </Card>
  );
}

/** Ce que le Radar t'a rapporté : du signal au devis signé. */
function Roi({ ws }) {
  const [d, setD] = useState(null);
  const [days, setDays] = useState(30);
  useEffect(() => { supabase.rpc("radar_roi", { p_ws: ws.id, p_since: new Date(Date.now() - days * 864e5).toISOString() }).then(({ data }) => setD(data ?? null)); }, [ws.id, days]);
  if (!d) return null;
  const steps = [["Signaux détectés", d.signaux], ["Devenus prospects", d.prospects], ["Contactés", d.contactes], ["Réponses", d.reponses], ["Rendez-vous", d.rdv], ["Devis signés", d.signes]];
  const max = Math.max(1, d.signaux);
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-bold text-[19px]"><span className="text-accent"><Ico name="euro" className="h-6 w-6" /></span>Ce que le Radar t'a rapporté</h2>
        <div className="flex rounded-full border border-line p-0.5 text-[12.5px]">{[[30, "30 jours"], [90, "3 mois"], [365, "1 an"]].map(([v, l]) => <button key={v} onClick={() => setDays(v)} className={cx("rounded-full px-3 py-1", days === v ? "bg-ink text-white" : "text-ink-soft")}>{l}</button>)}</div>
      </div>
      <div className="mt-4 grid sm:grid-cols-[minmax(0,1fr)_220px] gap-5 items-center">
        <div className="space-y-2">
          {steps.map(([l, n]) => (
            <div key={l} className="flex items-center gap-3 text-[13.5px]">
              <span className="w-36 shrink-0 text-ink-soft">{l}</span>
              <span className="flex-1 h-2.5 rounded-full bg-paper overflow-hidden"><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(n ? 3 : 0, (n / max) * 100)}%` }} /></span>
              <span className="w-10 text-right font-semibold tnum">{n}</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-accent-soft/60 p-4 text-center">
          <p className="text-[12.5px] text-accent-dark font-semibold">Chiffre d'affaires signé grâce au Radar</p>
          <p className="font-black text-[34px] leading-tight tnum mt-1" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{Number(d.ca).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</p>
          <p className="text-[12px] text-ink-soft">{d.rdv} rendez-vous · {d.signes} devis signé{d.signes > 1 ? "s" : ""}</p>
        </div>
      </div>
      {!d.prospects && <p className="text-[12.5px] text-ink-faint mt-3">Le compteur démarre dès que tu transformes un signal en prospect (« Trouver le contact et préparer le message »).</p>}
    </Card>
  );
}

/** Comptes surveillés : les entreprises que tu veux absolument, suivies chaque jour. */
function Watchlist({ ws, opps, onOpen }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [txt, setTxt] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpenList] = useState(false);
  const load = useCallback(() => supabase.from("radar_watch").select("*").eq("workspace_id", ws.id).order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? [])), [ws.id]);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    if (!txt.trim()) return;
    setBusy(true);
    try {
      const r = await fn("r/watch-add", { workspace_id: ws.id, items: txt });
      setTxt(""); await load();
      toast(`${r.added.length} entreprise${r.added.length > 1 ? "s" : ""} ajoutée${r.added.length > 1 ? "s" : ""}${r.missed.length ? ` · introuvable${r.missed.length > 1 ? "s" : ""} : ${r.missed.slice(0, 3).join(", ")}` : ""}`, r.added.length ? "good" : "bad");
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const remove = async (w) => { await supabase.from("radar_watch").delete().eq("id", w.id); setRows((x) => x.filter((y) => y.id !== w.id)); };
  const setUrl = async (w) => {
    const url = window.prompt(`Site web de ${w.name} (pour surveiller ses changements)`, w.url ?? "https://");
    if (url == null) return;
    const clean = /^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(url) ? url.trim() : null;
    await supabase.from("radar_watch").update({ url: clean, site_hash: null }).eq("id", w.id); load();
  };
  const last = (w) => opps.filter((o) => o.siren === w.siren).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const list = rows ?? [];
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-bold text-[19px]"><span className="text-accent"><Ico name="star" className="h-6 w-6" /></span>Comptes surveillés</h2>
        <span className="text-xs font-semibold rounded-full bg-accent-soft text-accent px-2.5 py-0.5">{list.length}</span>
      </div>
      <p className="text-[13px] text-ink-soft mt-1">Tes entreprises rêvées. Le Radar les surveille chaque jour (dirigeant, déménagement, recrutement, difficultés, site) et te prévient le jour même.</p>
      <div className="mt-3 flex gap-2">
        <textarea rows={2} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={"Noms ou SIREN, un par ligne\nex. Cabinet Durand Conseil"} className="flex-1 rounded-xl border border-line px-3 py-2 text-sm" />
        <Button variant="accent" loading={busy} onClick={add} className="self-stretch">Ajouter</Button>
      </div>
      {rows && !list.length && <p className="text-[12.5px] text-ink-faint mt-3">Aucun compte pour l'instant. Tu peux en coller jusqu'à 200 d'un coup.</p>}
      {list.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {list.slice(0, open ? 200 : 6).map((w) => { const o = last(w); return (
            <li key={w.id} className="py-2.5 flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-[14px] truncate">{w.name}</span>
                <span className="block text-[12px] text-ink-faint truncate">{w.source === "jumeau" ? <b className="text-accent-dark">ressemble à tes clients · </b> : null}{[w.city, w.naf].filter(Boolean).join(" · ")}{w.url ? " · site suivi" : ""}</span>
              </span>
              {o ? <button onClick={() => onOpen(o)} className={cx("shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", KIND[o.kind]?.chip)}>{KIND[o.kind]?.label}</button> : <span className="shrink-0 text-[11.5px] text-ink-faint">rien de neuf</span>}
              <button onClick={() => setUrl(w)} title="Site web à surveiller" className="text-ink-faint hover:text-ink"><Ico name="ext" className="h-4 w-4" /></button>
              <button onClick={() => remove(w)} title="Ne plus surveiller" className="text-ink-faint hover:text-bad"><Ico name="x" className="h-4 w-4" /></button>
            </li>
          ); })}
        </ul>
      )}
      {list.length > 6 && <button onClick={() => setOpenList((x) => !x)} className="mt-2 text-[12.5px] font-semibold text-accent">{open ? "Réduire" : `Voir les ${list.length} comptes`}</button>}
    </Card>
  );
}

/** Ce que le Radar a appris de tes retours (« pas pertinent », prospects, réponses, RDV). */
function Learned({ cfg }) {
  const a = Object.entries(cfg.appris ?? {}).filter(([, x]) => x.pas_pertinent || x.prospects);
  return (
    <div className="rounded-xl border border-line p-3.5">
      <p className="font-medium flex items-center gap-2"><span className="text-accent"><Ico name="bulb" className="h-4 w-4" /></span>Ce que le Radar a appris</p>
      {!a.length ? <p className="text-[12.5px] text-ink-faint mt-1">Rien encore. Chaque « Pas pertinent », chaque réponse et chaque rendez-vous ajuste le score des prochains signaux.</p> : (
        <ul className="mt-2 space-y-1 text-[12.5px]">{a.map(([k, x]) => { const w = cfg.poids?.[k] ?? 1; return (
          <li key={k} className="flex justify-between gap-2"><span className="text-ink">{KIND[k]?.plural ?? k}</span><span className="text-ink-soft tnum">{x.prospects} pris · {x.reponses} réponse{x.reponses > 1 ? "s" : ""} · {x.pas_pertinent} rejet{x.pas_pertinent > 1 ? "s" : ""}{w !== 1 && <b className={cx("ml-1.5", w > 1 ? "text-good" : "text-bad")}>{w > 1 ? "▲" : "▼"}</b>}</span></li>
        ); })}</ul>
      )}
    </div>
  );
}

/** Où en est chaque opportunité : nouvelle, à enquêter, contact trouvé, e-mail prêt. */
function useOppStatus(list) {
  const [m, setM] = useState({});
  const ids = list.filter((o) => o.prospect_id).map((o) => o.prospect_id).slice(0, 200);
  const key = ids.join(",");
  useEffect(() => {
    if (!ids.length) return setM({});
    (async () => {
      const [{ data: ps }, { data: ms }] = await Promise.all([
        supabase.from("prospects").select("id, email, enriched_at, status").in("id", ids),
        supabase.from("messages").select("prospect_id, status").in("prospect_id", ids).in("status", ["brouillon", "envoye"]),
      ]);
      const out = {};
      for (const p of ps ?? []) {
        const msg = (ms ?? []).filter((x) => x.prospect_id === p.id);
        out[p.id] = msg.some((x) => x.status === "envoye") ? ["Contacté", "bg-ink text-white", "send"] : msg.length ? ["E-mail prêt", "bg-accent-soft text-accent-dark", "mail"]
          : p.email ? ["Contact trouvé", "bg-good-soft text-good", "check"] : p.enriched_at ? ["Sans e-mail", "bg-[#EFEEEA] text-ink-soft", "x"] : ["À enquêter", "bg-[#EFEEEA] text-ink-soft", "search"];
      }
      setM(out);
    })();
  }, [key]);
  return m;
}

export default function Radar() {
  const dansLieu = useDansLieu();
  const { ws } = useWs();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [open, setOpen] = useState(null);
  const [more, setMore] = useState(false);
  const [prog, setProg] = useState(ws.radar_progress ?? null);
  const [tick, setTick] = useState(0);
  const [hidden, setHidden] = useState([]);
  const [section, setSection] = useState(() => { try { return localStorage.getItem("bingoo:radar-tab") || "opps"; } catch { return "opps"; } });
  const [explore, setExplore] = useState(() => { try { return localStorage.getItem("bingoo:radar-explore") === "1"; } catch { return false; } });
  const toggleExplore = (v) => { setExplore(v); try { localStorage.setItem("bingoo:radar-explore", v ? "1" : "0"); } catch { /* navigation privée */ } };
  const pickSection = (k) => { setSection(k); toggleExplore(true); try { localStorage.setItem("bingoo:radar-tab", k); } catch { /* navigation privée */ } };
  const [showHidden, setShowHidden] = useState(false);

  const load = useCallback(async () => {
    const [{ data }, { data: f }] = await Promise.all([
      supabase.from("radar_opps").select("*").eq("workspace_id", ws.id).in("status", ["nouveau", "suivi", "ajoute"]).order("score", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(400),
      supabase.from("radar_opps").select("id, company, title, kind, score_why").eq("workspace_id", ws.id).eq("status", "filtre").order("created_at", { ascending: false }).limit(100),
    ]);
    // Une opportunité dont la date limite est passée n'en est plus une
    const now = new Date();
    setRows((data ?? []).filter((o) => (!o.expires_at || new Date(o.expires_at) > now) && (o.kind !== "appel_offres" || !o.deadline || new Date(o.deadline) > now)));
    setHidden(f ?? []);
  }, [ws.id]);
  const loadProg = useCallback(async () => {
    const { data } = await supabase.from("workspaces").select("radar_progress, radar_at").eq("id", ws.id).single();
    if (data) setProg(data.radar_progress ?? null);
    return data?.radar_progress;
  }, [ws.id]);
  useEffect(() => { load(); loadProg(); }, [load, loadProg]);
  const live = scanning || running(prog);
  // Pendant un scan (lancé ici ou par la tâche du matin) : avancement relu toutes les 1,5 s
  useEffect(() => {
    if (!live) return;
    const t = setInterval(async () => { setTick((x) => x + 1); const p = await loadProg(); if (p?.done_at && !scanning) load(); }, 1500);
    return () => clearInterval(t);
  }, [live, scanning, loadProg, load]);

  const scan = async () => {
    setScanning(true);
    setProg({ started_at: new Date().toISOString(), done_at: null, steps: { lance: { s: "en_cours", at: new Date().toISOString() } } });
    try {
      const r = await fn("r/radar-scan", { workspace_id: ws.id, web: true });
      await Promise.all([load(), loadProg()]);
      toast(r.added ? `${r.added} nouvelle${r.added > 1 ? "s" : ""} opportunité${r.added > 1 ? "s" : ""}` : "Aucune nouvelle opportunité depuis la dernière analyse", r.added ? "good" : "default");
      if (r.errors?.length) toast(`Source indisponible : ${r.errors.join(", ")}`, "bad");
    } catch (e) { toast(e.message, "bad"); loadProg(); } finally { setScanning(false); }
  };

  const list = rows ?? [];
  const status = useOppStatus(list);
  const count = (k) => list.filter((o) => o.kind === k).length;
  const shown = tab === "all" ? list : list.filter((o) => o.kind === tab);
  const closing = list.filter((o) => o.kind === "appel_offres" && o.deadline && daysTo(o.deadline) <= 10);
  const hotN = list.filter((o) => (o.score ?? 0) >= 75).length;
  const fresh = list.filter((o) => o.status === "nouveau" && o.kind !== "appel_offres" && !o.prospect_id);
  const tip = hotN ? `${hotN} opportunité${hotN > 1 ? "s ont" : " a"} un score de 75 ou plus : commence par celles-là, ce sont celles où le moment est le meilleur.`
    : closing.length
    ? `${closing.length} appel${closing.length > 1 ? "s" : ""} d'offres ferme${closing.length > 1 ? "nt" : ""} dans moins de 10 jours : décide maintenant d'y répondre ou non.`
    : fresh.length ? `${fresh.length} entreprise${fresh.length > 1 ? "s" : ""} en mouvement ne ${fresh.length > 1 ? "sont" : "est"} pas encore dans ta prospection : un message pendant leur changement a plus de chances d'être lu.`
    : list.length ? "Tout est traité. Max relance l'analyse chaque matin de semaine." : "Lance une première analyse : le Radar cherche les appels d'offres de ta zone et les entreprises qui recrutent ou se développent.";
  const tabs = [["all", `Toutes (${list.length})`], ...Object.entries(KIND).filter(([k]) => count(k)).map(([k, v]) => [k, `${v.plural} (${count(k)})`])];
  const active = STEPS.filter(([k]) => prog?.steps?.[k]?.s !== "saute");
  const done = active.filter(([k]) => ["fait", "erreur"].includes(prog?.steps?.[k]?.s)).length;
  const pct = live ? Math.max(6, Math.round((done / Math.max(1, active.length)) * 100)) : 100;
  const elapsed = live && prog?.started_at ? Math.max(0, Math.round((Date.now() - new Date(prog.started_at).getTime()) / 1000)) : 0;
  void tick;
  const lastAt = prog?.done_at ?? ws.radar_at;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className={cx("flex items-center gap-4", dansLieu && "hidden")}>
          <span className="h-16 w-16 rounded-full bg-accent-soft text-accent grid place-items-center"><Ico name="radar" className="h-9 w-9" /></span>
          <div>
            <h1 className="font-black text-[40px] leading-none tracking-tight" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>Opportunités</h1>
            <p className="text-ink-soft mt-1.5">Les entreprises à contacter au bon moment.</p>
          </div>
        </div>
        <Pill on={live}>{live ? "Radar en cours" : lastAt ? `Dernier scan ${ago(lastAt)}` : "Jamais lancé"}</Pill>
      </div>

<Guide id="radar" titre="Ici : les entreprises à contacter au bon moment (création, recrutement, nouveau dirigeant, contrat qui se termine…)." etapes={["Parcours la liste : chaque entreprise dit pourquoi c'est le bon moment.", "Clique « Préparer le message » sur celles qui t'intéressent.", "Bingoo! trouve le décideur, écrit le message, et te le propose dans « Messages à envoyer »."]} />
      <HomeView ws={ws} list={list} loaded={!!rows} live={live} onScan={scan} onOpen={setOpen} onChange={load} />
      <button onClick={() => toggleExplore(!explore)} className="w-full rounded-2xl border border-line bg-white hover:border-ink-faint px-5 py-3.5 flex items-center justify-between gap-3 text-left transition">
        <span><span className="block font-semibold text-[15px]">{explore ? "Masquer les options" : "Plus d'options"}</span><span className="block text-[12.5px] text-ink-faint">Toutes les opportunités, comptes surveillés, partenaires, réglages du Radar</span></span>
        <span className={cx("text-ink-soft transition", explore && "rotate-90")}><Ico name="chev" /></span>
      </button>

      {explore && (<>
      {/* Les espaces du Radar */}
      <nav className="flex gap-1 overflow-x-auto border-b border-line -mx-1 px-1">
        {SECTIONS.filter(([k]) => k !== "marche" || ws.radar_cfg?.marches !== false).map(([k, l, sub]) => (
          <button key={k} onClick={() => pickSection(k)} className={cx("relative shrink-0 px-4 pt-2 pb-3 text-left transition", section === k ? "text-ink" : "text-ink-faint hover:text-ink")}>
            <span className="block text-[14.5px] font-semibold">{l}{k === "opps" && list.length ? <span className="ml-1.5 text-[11px] font-bold rounded-full bg-accent-soft text-accent px-1.5 py-0.5 align-middle">{list.length}</span> : null}</span>
            <span className="hidden sm:block text-[11.5px] text-ink-faint">{sub}</span>
            {section === k && <span className="absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-accent" />}
          </button>
        ))}
      </nav>

      {section === "opps" && (
      <div>
        <div className="space-y-5 min-w-0">
        <Card className="p-0 overflow-hidden min-w-0">
          <div className="px-5 pt-5 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2.5 font-bold text-[19px]"><span className="text-accent"><Ico name="users" className="h-6 w-6" /></span>Toutes les opportunités</h2>
            <span className="text-xs font-semibold rounded-full bg-accent-soft text-accent px-2.5 py-0.5">{list.length}</span>
          </div>
          <div className="flex gap-1 overflow-x-auto px-5 py-3 border-b border-line">
            {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium", tab === k ? "bg-accent-soft text-accent-dark" : "text-ink-soft hover:text-ink")}>{l}</button>)}
          </div>
          {!rows ? <div className="p-10 grid place-items-center"><Spinner /></div>
            : !shown.length ? <p className="p-8 text-sm text-ink-soft text-center">{live ? "Analyse en cours…" : "Rien dans cette catégorie pour l'instant."}</p>
            : <ul className="divide-y divide-line">
                {shown.slice(0, more ? 100 : 6).map((o) => {
                  const k = KIND[o.kind] ?? KIND.croissance;
                  const st = o.prospect_id ? status[o.prospect_id] : null;
                  return (
                    <li key={o.id}>
                      <button onClick={() => setOpen(o)} className="w-full text-left flex items-center gap-3 px-5 py-3.5 hover:bg-paper/70">
                        <span className={cx("grid place-items-center h-11 w-11 rounded-xl shrink-0", k.chip)}><Ico name={k.icon} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold truncate">{o.company}</span>
                          <span className="block text-[13px] text-ink-soft truncate">{o.kind === "appel_offres" || o.kind === "renouvellement" ? o.title : o.summary}</span>
                          <span className="block text-xs text-ink-faint mt-0.5 truncate">{[o.city && `${o.city}${o.dept ? ` (${o.dept})` : ""}`, k?.label, o.kind === "appel_offres" && o.deadline ? `réponse avant le ${dayFr(o.deadline)}` : o.kind === "renouvellement" && o.raw?.fin ? `fin estimée ${new Date(o.raw.fin).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}` : o.expires_at ? `à contacter avant le ${dayFr(o.expires_at)}` : ago(o.created_at)].filter(Boolean).join(" · ")}</span>
                        </span>
                        {o.raw?.valeur ? <span className="hidden md:inline text-[12px] font-semibold text-ink-soft tnum shrink-0">≈ {euroK(o.raw.valeur)}/an</span> : null}
                        <Score n={o.score} />
                        {o.kind === "appel_offres" ? (o.deadline && <span className={cx("hidden sm:inline-flex shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold", daysTo(o.deadline) <= 10 ? "bg-bad-soft text-bad" : "bg-accent-soft text-accent-dark")}>J-{daysTo(o.deadline)}</span>)
                          : st ? <span className={cx("hidden sm:inline-flex shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold", st[1])}>{st[0]}</span>
                          : <span className="hidden sm:inline-flex shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold bg-accent text-white">Nouveau</span>}
                        <span className="text-ink-faint"><Ico name="chev" className="h-4 w-4" /></span>
                      </button>
                    </li>
                  );
                })}
              </ul>}
          {hidden.length > 0 && (
            <div className="px-5 pb-4 pt-1 border-t border-line">
              <button onClick={() => setShowHidden((x) => !x)} className="text-[12.5px] text-ink-faint hover:text-ink mt-3">{hidden.length} signal{hidden.length > 1 ? "s" : ""} retiré{hidden.length > 1 ? "s" : ""} automatiquement (clients, déjà contactés, concurrents, hors cible) · {showHidden ? "masquer" : "voir"}</button>
              {showHidden && <ul className="mt-2 space-y-1 text-[12.5px] text-ink-soft">{hidden.slice(0, 30).map((h) => <li key={h.id}>• <b className="text-ink">{h.company || h.title}</b> : {(h.score_why?.[0] ?? "").replace("retiré automatiquement : ", "")}</li>)}</ul>}
            </div>
          )}
          {shown.length > 6 && <button onClick={() => setMore((m) => !m)} className="w-[calc(100%-2.5rem)] mx-5 my-4 rounded-xl bg-paper border border-line py-3 text-sm font-medium hover:border-ink/20 flex items-center justify-center gap-2">{more ? "Réduire" : `Voir toutes les opportunités (${shown.length})`}<Ico name="chev" className={cx("h-4 w-4", more ? "-rotate-90" : "rotate-90")} /></button>}
        </Card>
        </div>
      </div>
      )}
      {section === "comptes" && <div className="max-w-3xl"><Watchlist ws={ws} opps={list} onOpen={setOpen} /></div>}
      {section === "visiteurs" && <Visitors ws={ws} />}
      {section === "partenaires" && <Partners ws={ws} />}
      {section === "marche" && <Market ws={ws} />}
      {section === "resultats" && <Roi ws={ws} />}
      {section === "reglages" && (
        <div className="grid xl:grid-cols-2 gap-5 items-start">
          <Searching ws={ws} />
          <div className="space-y-5"><Adapted ws={ws} /><ScanActivity p={prog} live={live} /></div>
        </div>
      )}
      </>)}
      {open && <Detail o={open} onClose={() => setOpen(null)} onChange={(n) => { setOpen(n.status === "ecarte" ? null : n); setRows((rs) => n.status === "ecarte" ? rs.filter((x) => x.id !== n.id) : rs.map((x) => x.id === n.id ? n : x)); }} />}
    </div>
  );
}

