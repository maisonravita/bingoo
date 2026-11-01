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
};
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

function RadarScope({ opps, zone, scanning, selected, onSelect }) {
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
    if (labelled.size >= 7) break;
    if (placed.every((q) => Math.hypot(q.nx - p.nx, (q.ny - p.ny) * 2.6) > 0.26)) { labelled.add(p.o.id); placed.push(p); }
  }
  const ring = (k) => Math.round((pts.R * k) / 4);

  return (
    <div className="relative rounded-2xl bg-[#121316] overflow-hidden aspect-square sm:aspect-[4/3.1] select-none">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(242,107,42,.10), transparent 60%)" }} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[86%] aspect-square">
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
      <div className="absolute left-4 bottom-4 space-y-1.5">
        {Object.entries(KIND).map(([key, k]) => <p key={key} className="flex items-center gap-2 text-[12px] text-white/75"><span className="h-2 w-2 rounded-full" style={{ background: k.dot }} />{k.plural}</p>)}
      </div>
      <div className="absolute right-4 top-4 sm:top-auto sm:bottom-4 flex items-center gap-2 text-[11px] sm:text-[12px] text-white/75">
        <span className={cx("h-2 w-2 rounded-full", scanning ? "bg-accent animate-pulse" : "bg-good")} />{scanning ? "Analyse en cours…" : "Analyse automatique chaque matin"}
      </div>
      {!pts.list.length && !scanning && <p className="absolute inset-x-0 top-[58%] text-center text-sm text-white/50 px-8">Aucune opportunité localisée pour l'instant</p>}
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}@keyframes kfade{from{opacity:0;transform:translate(-50%,-50%) scale(.3)}to{opacity:1}}@keyframes kping{0%,4%{transform:scale(1.9);filter:brightness(1.6)}18%,100%{transform:scale(1);filter:none}}`}</style>
    </div>
  );
}

/** Contact prêt : coordonnées trouvées et e-mail rédigé par Kairo à partir du signal. */
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
      <p className="text-sm text-ink-soft mt-1">Kairo trouve le bon contact, son e-mail et son téléphone publiés, puis écrit un e-mail qui part de ce signal. Rien n'est envoyé sans toi.</p>
      <Button variant="accent" className="w-full mt-3" loading={busy} disabled={q && q.left === 0} onClick={prepare}>{busy ? "Kairo cherche le contact… (20 à 40 s)" : "Trouver le contact et préparer le message"}</Button>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Kairo</p>
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
        <p className="text-sm rounded-xl bg-paper/70 border border-line p-3">{d.reason === "no_sender" ? "Indique le nom de l'expéditeur dans Réglages pour que Kairo puisse rédiger." : p.phone ? "Pas d'e-mail public : appelle directement au numéro ci-dessus, en partant du signal." : "Kairo n'a trouvé ni e-mail ni téléphone publics. Le Détective peut creuser depuis la fiche prospect."}</p>
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
  const set = async (status) => {
    setBusy(status);
    const { error } = await supabase.from("radar_opps").update({ status }).eq("id", o.id);
    setBusy(null);
    if (error) return toast(error.message, "bad");
    onChange({ ...o, status }); if (status === "ecarte") onClose();
  };
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
        <h2 className="font-serif text-3xl leading-tight mt-4">{o.kind === "appel_offres" ? o.title : o.company}</h2>
        {o.kind === "appel_offres" && <p className="text-sm text-ink-soft mt-1">Acheteur : {o.company}</p>}
        <p className="flex items-center gap-1.5 text-sm text-ink-soft mt-2"><Ico name="pin" className="h-4 w-4" />{[o.city, o.dept && `(${o.dept})`].filter(Boolean).join(" ") || "Lieu non précisé"}</p>

        <div className="mt-6 space-y-4 text-sm">
          {o.kind !== "appel_offres" && <div><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Signal</p><p>{o.summary}</p></div>}
          {o.kind === "appel_offres" && o.summary && <div><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Nature</p><p>{o.summary}</p></div>}
          {o.deadline && <div className="rounded-xl bg-accent-soft/60 p-3"><p className="font-semibold">Réponse avant le {new Date(o.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p><p className="text-ink-soft">{daysTo(o.deadline)} jour{daysTo(o.deadline) > 1 ? "s" : ""} restant{daysTo(o.deadline) > 1 ? "s" : ""}</p></div>}
          {o.kind === "recrutement" && <p className="text-sm rounded-xl bg-paper/70 border border-line p-3">{RECRUIT_HINT}</p>}
          {o.why && <div><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Pourquoi c'est pour toi</p><p>{o.why}{o.why.length >= 200 ? "…" : ""}</p></div>}
          <div><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Source</p>
            {o.url ? <a className="inline-flex items-center gap-1 text-accent font-medium hover:underline break-all" href={o.url} target="_blank" rel="noreferrer">{o.source || o.url}<Ico name="ext" className="h-3.5 w-3.5 shrink-0" /></a> : <p>{o.source}</p>}
            {o.published && <p className="text-ink-faint text-xs mt-0.5">Publié le {dayFr(o.published)}</p>}
          </div>
        </div>

        {o.kind !== "appel_offres" && <ContactReady o={o} onChange={onChange} />}

        <div className="mt-8 flex flex-col gap-2">
          {o.kind === "appel_offres"
            ? <a href={o.url} target="_blank" rel="noreferrer"><Button variant="accent" className="w-full">Lire l'avis complet</Button></a>
            : o.prospect_id ? <Button className="w-full" onClick={() => nav("/prospects")}>Voir dans mes prospects</Button> : null}
          {o.status !== "suivi" && o.kind === "appel_offres" && <Button variant="ghost" className="w-full" loading={busy === "suivi"} onClick={() => set("suivi")}>Suivre cet appel d'offres</Button>}
          {o.status !== "ecarte" && <Button variant="ghost" className="w-full" loading={busy === "ecarte"} onClick={() => set("ecarte")}>Écarter</Button>}
        </div>
      </div>
    </div>
  );
}

export default function Radar() {
  const { ws } = useWs();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [open, setOpen] = useState(null);
  const [last, setLast] = useState(ws.radar_at);
  const [more, setMore] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("radar_opps").select("*").eq("workspace_id", ws.id).neq("status", "ecarte").order("created_at", { ascending: false }).limit(300);
    // Les appels d'offres expirés ne sont plus des opportunités
    setRows((data ?? []).filter((o) => !o.deadline || new Date(o.deadline) > new Date()));
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);

  const scan = async (web) => {
    setScanning(true);
    try {
      const r = await fn("r/radar-scan", { workspace_id: ws.id, web });
      await load(); setLast(new Date().toISOString());
      toast(r.added ? `${r.added} nouvelle${r.added > 1 ? "s" : ""} opportunité${r.added > 1 ? "s" : ""}` : "Aucune nouvelle opportunité depuis la dernière analyse", r.added ? "good" : "default");
      if (r.errors?.length) toast(`Source indisponible : ${r.errors.join(", ")}`, "bad");
    } catch (e) { toast(e.message, "bad"); } finally { setScanning(false); }
  };

  const list = rows ?? [];
  const count = (k) => list.filter((o) => o.kind === k).length;
  const shown = tab === "all" ? list : list.filter((o) => o.kind === tab);
  const closing = list.filter((o) => o.deadline && daysTo(o.deadline) <= 10);
  const fresh = list.filter((o) => o.status === "nouveau" && o.kind !== "appel_offres" && !o.prospect_id);
  const tip = closing.length
    ? `${closing.length} appel${closing.length > 1 ? "s" : ""} d'offres ferme${closing.length > 1 ? "nt" : ""} dans moins de 10 jours : décide maintenant d'y répondre ou non.`
    : fresh.length ? `${fresh.length} entreprise${fresh.length > 1 ? "s" : ""} en mouvement ne ${fresh.length > 1 ? "sont" : "est"} pas encore dans ta prospection : un message pendant leur changement a plus de chances d'être lu.`
    : list.length ? "Tout est traité. Kairo relance l'analyse chaque matin." : "Lance une première analyse : Kairo cherche les appels d'offres de ta zone et les entreprises qui recrutent ou se développent.";
  const tabs = [["all", `Toutes (${list.length})`], ["appel_offres", `Appels d'offres (${count("appel_offres")})`], ["croissance", `En croissance (${count("croissance")})`], ["recrutement", `Qui recrutent (${count("recrutement")})`]];
  const tendersOff = ws.radar_cfg && ws.radar_cfg.marches === false;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-accent"><Ico name="radar" className="h-10 w-10" /></span>
          <div>
            <h1 className="font-serif text-4xl leading-none">Kairo Radar</h1>
            <p className="text-ink-soft mt-1.5">Les appels d'offres, les entreprises en croissance et celles qui recrutent, autour de toi.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {last && <span className="text-xs text-ink-soft flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-good" />Dernière analyse : {ago(last)}</span>}
          <Button quota="radar_scan" variant="accent" loading={scanning} onClick={() => scan(true)}>Analyser maintenant</Button>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_420px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          <Card className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-line">
            {[["radar", list.length, "Opportunités"], ["doc", count("appel_offres"), "Appels d'offres"], ["up", count("croissance"), "En croissance"], ["users", count("recrutement"), "Qui recrutent"]].map(([ic, n, l], i) => (
              <div key={l} className={cx("flex items-center gap-3 p-4", i === 1 && "border-t-0")}>
                <span className={cx("grid place-items-center h-10 w-10 rounded-full shrink-0", i === 0 ? "bg-accent-soft text-accent" : "text-ink-soft")}><Ico name={ic} /></span>
                <div className="min-w-0"><p className="text-2xl font-semibold leading-none tabular-nums">{rows ? n : "–"}</p><p className="text-xs text-ink-soft mt-1">{l}</p></div>
              </div>
            ))}
          </Card>
          <RadarScope opps={list} zone={ws.zone ?? []} scanning={scanning} selected={open?.id} onSelect={setOpen} />
          <Card className="p-4 flex items-start gap-3">
            <span className="text-accent mt-0.5"><Ico name="bulb" /></span>
            <div className="flex-1"><p className="font-semibold text-accent text-sm">Conseil du jour</p><p className="text-sm text-ink-soft mt-0.5">{tip}</p>
              {tendersOff && <p className="text-xs text-ink-faint mt-2">Les marchés publics sont désactivés : d'après ton offre, Kairo estime qu'ils ne te concernent pas.</p>}
            </div>
          </Card>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-5 flex items-center gap-2"><h2 className="font-semibold text-lg">Opportunités détectées</h2><span className="text-xs font-semibold rounded-full bg-accent-soft text-accent px-2 py-0.5">{list.length}</span></div>
          <div className="flex gap-1 overflow-x-auto px-5 py-3 border-b border-line">
            {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium", tab === k ? "bg-accent-soft text-accent-dark" : "text-ink-soft hover:text-ink")}>{l}</button>)}
          </div>
          {!rows ? <div className="p-10 grid place-items-center"><Spinner /></div>
            : !shown.length ? <p className="p-8 text-sm text-ink-soft text-center">{scanning ? "Analyse en cours…" : "Rien dans cette catégorie pour l'instant."}</p>
            : <ul className="divide-y divide-line">
                {shown.slice(0, more ? 100 : 7).map((o) => {
                  const k = KIND[o.kind];
                  return (
                    <li key={o.id}>
                      <button onClick={() => setOpen(o)} className="w-full text-left flex items-start gap-3 px-5 py-4 hover:bg-paper/70">
                        <span className={cx("grid place-items-center h-11 w-11 rounded-xl shrink-0", k.chip)}><Ico name={k.icon} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2 flex-wrap"><span className="font-semibold truncate max-w-[220px]">{o.kind === "appel_offres" ? o.company : o.company}</span><span className={cx("text-[11px] font-medium rounded-full px-2 py-0.5", k.chip)}>{k.label}</span>{o.prospect_id && <span className="text-[11px] text-good">· dans tes prospects</span>}</span>
                          <span className="block text-sm text-ink-soft mt-1 line-clamp-2">{o.kind === "appel_offres" ? o.title : o.summary}</span>
                          <span className="flex items-center gap-1 text-xs text-ink-faint mt-1.5"><Ico name="pin" className="h-3.5 w-3.5" />{[o.city, o.dept && `(${o.dept})`].filter(Boolean).join(" ") || "—"} · {o.deadline ? `réponse avant le ${dayFr(o.deadline)}` : ago(o.created_at)}</span>
                        </span>
                        <span className="text-ink-faint mt-3"><Ico name="chev" className="h-4 w-4" /></span>
                      </button>
                    </li>
                  );
                })}
              </ul>}
          {shown.length > 7 && <button onClick={() => setMore((m) => !m)} className="w-full flex items-center justify-between px-5 py-3.5 border-t border-line text-sm font-medium hover:bg-paper/70">{more ? "Réduire" : "Voir toutes les opportunités"}<Ico name="chev" className={cx("h-4 w-4", more && "-rotate-90")} /></button>}
        </Card>
      </div>
      {open && <Detail o={open} onClose={() => setOpen(null)} onChange={(n) => { setOpen(n.status === "ecarte" ? null : n); setRows((rs) => n.status === "ecarte" ? rs.filter((x) => x.id !== n.id) : rs.map((x) => x.id === n.id ? n : x)); }} />}
    </div>
  );
}
