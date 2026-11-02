import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fn, quotaLeft, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, Card, Spinner, useToast } from "../components/ui";
import { cx } from "../lib/utils";
import { DEPTS, centerOf, offsetKm } from "../lib/geo";

export const RECRUIT_HINT = "Cette entreprise recrute pour un poste lié à ce que tu vends. C'est souvent le signe d'un besoin actuel et d'un budget : c'est le bon moment pour lui proposer ton service, en complément ou à la place d'une embauche.";
const KIND = {
  appel_offres: { label: "Appel d'offres", plural: "Appels d'offres", dot: "#F26B2A", chip: "bg-accent-soft text-accent-dark", icon: "doc" },
  croissance: { label: "En croissance", plural: "En croissance", dot: "#22A06B", chip: "bg-good-soft text-good", icon: "up" },
  recrutement: { label: "Recrute en ce moment", plural: "Qui recrutent", dot: "#3B82F6", chip: "bg-[#E3EDFD] text-[#1D5BD6]", icon: "users" },
  besoin: { label: "Cherche une solution", plural: "Besoins exprimés", dot: "#8B5CF6", chip: "bg-[#EDE9FE] text-[#6D28D9]", icon: "bulb" },
  renouvellement: { label: "Contrat public à renouveler", plural: "Contrats à renouveler", dot: "#B45309", chip: "bg-[#FEF3C7] text-[#92400E]", icon: "clock" },
  dirigeant: { label: "Nouveau dirigeant", plural: "Nouveaux dirigeants", dot: "#DB2777", chip: "bg-[#FCE7F3] text-[#9D174D]", icon: "user" },
  demenagement: { label: "Déménage", plural: "Déménagements", dot: "#0891B2", chip: "bg-[#CFFAFE] text-[#155E75]", icon: "truck" },
  creation: { label: "Création ou ouverture", plural: "Créations et ouvertures", dot: "#65A30D", chip: "bg-[#ECFCCB] text-[#3F6212]", icon: "building" },
};
const EVENTS = ["dirigeant", "demenagement", "creation"];
const SWEEP = 6; // secondes par tour

const Ico = ({ name, className = "h-5 w-5" }) => {
  const p = {
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
    flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.3-4.7.3 1.6 1 2.7 2.2 3.2C11 9 11 6 12 3z" />,
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

const heat = (n) => n >= 80 ? "bg-bad text-white" : n >= 65 ? "bg-accent text-white" : n >= 50 ? "bg-accent-soft text-accent-dark" : "bg-[#EFEEEA] text-ink-soft";
const Score = ({ n, big }) => n ? <span title="Score : à quel point c'est le bon moment" className={cx("inline-flex items-center justify-center rounded-full font-bold tnum shrink-0 leading-none", big ? "h-12 w-12 text-[17px]" : "h-9 w-9 text-[13px]", heat(n))}>{n}</span> : null;

/** Entreprises chaudes : plusieurs signaux sur la même entreprise, ou un signal très fort. Classées par score, avec la raison. */
function HotCompanies({ list, onOpen }) {
  const groups = useMemo(() => {
    const m = new Map();
    for (const o of list) { const k = o.group_key || o.id; m.set(k, [...(m.get(k) ?? []), o]); }
    return [...m.values()].map((g) => ({ g, top: g.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] }))
      .filter(({ g, top }) => new Set(g.map((x) => x.kind)).size > 1 || (top.score ?? 0) >= 75)
      .sort((a, b) => (b.top.score ?? 0) - (a.top.score ?? 0)).slice(0, 5);
  }, [list]);
  if (!groups.length) return null;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-bold text-[19px]"><span className="text-bad"><Ico name="flame" className="h-6 w-6" /></span>Entreprises chaudes</h2>
        <span className="text-[12.5px] text-ink-faint">À contacter en premier</span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {groups.map(({ g, top }) => (
          <li key={top.id}>
            <button onClick={() => onOpen(top)} className="w-full text-left rounded-2xl border border-line hover:border-accent/40 bg-white p-3.5 flex items-start gap-3.5">
              <Score n={top.score} big />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[15px] truncate">{top.company || top.title}</span>
                <span className="mt-1 flex flex-wrap gap-1.5">{[...new Set(g.map((x) => x.kind))].map((k) => <span key={k} className={cx("rounded-full px-2 py-0.5 text-[11.5px] font-semibold", KIND[k]?.chip)}>{KIND[k]?.label}</span>)}</span>
                <span className="block text-[12.5px] text-ink-soft mt-1.5 line-clamp-2">{(top.score_why ?? []).slice(1).join(" · ") || top.why}</span>
              </span>
              {top.expires_at && <span className="hidden sm:block text-[12px] text-ink-faint shrink-0 text-right">avant le<br /><b className="text-ink">{dayFr(top.expires_at)}</b></span>}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RadarScope({ opps, zone, scanning, selected, onSelect, round = false }) {
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
              <span className="block rounded-full" style={{ opacity: far ? 0.55 : 1, width: on ? 14 : 9, height: on ? 14 : 9, background: k.dot, boxShadow: `0 0 0 3px ${k.dot}33`, animation: `kping ${SWEEP}s ${(angle / 360) * SWEEP}s infinite` }} />
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
  const nav = useNavigate();
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
            {m.status === "brouillon" && <Button size="sm" variant="accent" onClick={() => nav("/valider")}>Relire et envoyer</Button>}
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

function Detail({ o, onClose, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const nav = useNavigate();
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
        {o.kind !== "appel_offres" && o.kind !== "besoin" && <ContactReady o={o} onChange={onChange} />}

        <div className="mt-8 flex flex-col gap-2">
          {o.kind === "appel_offres"
            ? <a href={o.url} target="_blank" rel="noreferrer"><Button variant="accent" className="w-full">Lire l'avis complet</Button></a>
            : o.kind === "besoin" ? <a href={o.url} target="_blank" rel="noreferrer"><Button variant="accent" className="w-full">Ouvrir la demande</Button></a>
            : o.prospect_id ? <Button className="w-full" onClick={() => nav("/prospects")}>Voir dans mes prospects</Button> : null}
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
  ["annonces", "Annonces légales", "Nouveau dirigeant, déménagement, créations (BODACC)"],
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
      const r = await fn("r/radar-config", { workspace_id: ws.id, set: true, postes: split(edit.postes), mots_cles: split(edit.mots_cles), activites: split(edit.activites), marches: edit.marches, europe: edit.europe });
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
        {c && !edit && <button onClick={() => setEdit({ postes: (cfg.postes ?? []).join(", "), mots_cles: (cfg.mots_cles ?? []).join(", "), activites: (cfg.activites ?? []).join(", "), marches: cfg.marches !== false, europe: !!cfg.europe })} className="text-[13px] font-semibold text-accent hover:underline">Modifier</button>}
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
          <Row icon="user" title="Annonces légales (BODACC)"><Tag>Nouveau dirigeant</Tag><Tag>Déménagement</Tag><Tag>Rachat</Tag><Tag>Ouverture d'établissement</Tag>{(cfg.activites ?? []).slice(0, 4).map((x) => <Tag key={x}>créations : {x}</Tag>)}</Row>
          <Learned cfg={cfg} />
        </div>
      )}
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
        <div className="flex items-center gap-4">
          <span className="h-16 w-16 rounded-full bg-accent-soft text-accent grid place-items-center"><Ico name="radar" className="h-9 w-9" /></span>
          <div>
            <h1 className="font-black text-[40px] leading-none tracking-tight" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>Radar</h1>
            <p className="text-ink-soft mt-1.5">Qui va acheter, et pourquoi maintenant : appels d'offres, contrats publics à renouveler, nouveaux dirigeants, déménagements, recrutements.</p>
          </div>
        </div>
        <Pill on={live}>{live ? "Radar en cours" : lastAt ? `Dernier scan ${ago(lastAt)}` : "Jamais lancé"}</Pill>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-5 items-stretch">
        <Card className="p-4 sm:p-5 grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-5 items-center min-w-0">
          <div className="relative p-5">
            {["left-0 top-0 border-l-2 border-t-2 rounded-tl-lg", "right-0 top-0 border-r-2 border-t-2 rounded-tr-lg", "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-lg", "right-0 bottom-0 border-r-2 border-b-2 rounded-br-lg"].map((c) => <span key={c} className={cx("absolute w-6 h-6 border-accent", c)} />)}
            <RadarScope round opps={list} zone={ws.zone ?? []} scanning={live} selected={open?.id} onSelect={setOpen} />
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1">{Object.entries(KIND).map(([key, k]) => <span key={key} className="flex items-center gap-1.5 text-[12px] text-ink-soft"><span className="h-2 w-2 rounded-full" style={{ background: k.dot }} />{k.plural}</span>)}</div>
          </div>
          <div className="min-w-0">
            <Pill on={live}>{live ? "Scan en cours" : "Prêt"}</Pill>
            {live ? (
              <>
                <p className="mt-3 font-black text-[48px] leading-none tnum" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{pct} %</p>
                <div className="mt-3 h-2.5 rounded-full bg-ink/10 overflow-hidden"><div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} /></div>
                <p className="text-[12.5px] text-ink-faint mt-2 tnum">{Math.floor(elapsed / 60)} min {String(elapsed % 60).padStart(2, "0")} · en général 1 à 2 minutes</p>
              </>
            ) : (
              <>
                <p className="mt-3 font-black text-[48px] leading-none tnum" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{rows ? list.length : "–"}</p>
                <p className="text-ink-soft mt-1">opportunité{list.length > 1 ? "s" : ""} en cours dans ton Radar</p>
              </>
            )}
            <ul className="mt-5 space-y-3">
              {[["flame", hotN, "entreprises chaudes (score 75+)"], ["doc", count("appel_offres") + count("renouvellement"), "marchés publics ouverts ou à renouveler"], ["user", EVENTS.reduce((n, k) => n + count(k), 0), "dirigeants, déménagements, créations"], ["users", count("recrutement") + count("croissance") + count("besoin"), "recrutent, grandissent ou cherchent"]].map(([ic, n, l]) => (
                <li key={l} className="flex items-center gap-3"><span className="text-ink-soft"><Ico name={ic} /></span><span className="font-bold text-[18px] tnum w-10">{rows ? n : "–"}</span><span className="text-[14px] text-ink-soft">{l}</span></li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button quota="radar_scan" variant="accent" loading={live} disabled={live} onClick={scan}>{live ? "Analyse en cours…" : "Lancer un scan"}</Button>
            </div>
            <p className="text-[12px] text-ink-faint mt-2">Rien n'est contacté pendant un scan. Le Radar tourne aussi tout seul chaque matin de semaine.</p>
          </div>
        </Card>
        <ScanActivity p={prog} live={live} />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-5 items-start">
        <div className="space-y-5 min-w-0">
        <HotCompanies list={list} onOpen={setOpen} />
        <Card className="p-0 overflow-hidden min-w-0">
          <div className="px-5 pt-5 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2.5 font-bold text-[19px]"><span className="text-accent"><Ico name="users" className="h-6 w-6" /></span>Opportunités détectées</h2>
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
        <div className="space-y-5 min-w-0">
          <Searching ws={ws} />
          <Card className="p-4 flex items-start gap-3">
            <span className="text-accent mt-0.5"><Ico name="bulb" /></span>
            <div className="flex-1"><p className="font-semibold text-accent text-sm">Conseil de Max</p><p className="text-sm text-ink-soft mt-0.5">{tip}</p></div>
          </Card>
        </div>
      </div>
      {open && <Detail o={open} onClose={() => setOpen(null)} onChange={(n) => { setOpen(n.status === "ecarte" ? null : n); setRows((rs) => n.status === "ecarte" ? rs.filter((x) => x.id !== n.id) : rs.map((x) => x.id === n.id ? n : x)); }} />}
    </div>
  );
}
