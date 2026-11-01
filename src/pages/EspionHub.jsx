import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useToast } from "../components/ui";
import { cx } from "../lib/utils";
import { CompetitorDesk } from "./Espion";

// Espion : le centre de renseignement commercial. Cinq espaces, données sourcées uniquement.
const TEAL = "#E0531F"; // accent Bingoo!
const INK = "#0A0A0A";
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u ?? ""; } };
const txt = (x) => String(typeof x === "string" ? x : x?.texte ?? "").replace(/<\/?cite[^>]*>/g, "").trim();
const srcOf = (x) => (typeof x === "object" && x?.source ? String(x.source).split(/\s*;\s*/)[0] : "");
const nameOf = (c) => (c.name || c.summary?.nom || host(c.url)).replace(/\s*[—(].*$/, "").trim();
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const dateFr = (d) => { const m = String(d ?? "").match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/); return m ? `${m[3] ? `${Number(m[3])} ` : ""}${MOIS[Number(m[2]) - 1]} ${m[1]}` : ""; };
const ago = (d) => { if (!d) return "jamais"; const h = Math.round((Date.now() - new Date(d).getTime()) / 36e5); return h < 1 ? "à l'instant" : h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`; };

const SPACES = [
  ["concurrents", "Mes concurrents", "Fiches, offres, tarifs"],
  ["veille", "Veille concurrentielle", "Mouvements et nouveautés"],
  ["besoins", "Besoins détectés", "Insatisfactions et demandes"],
  ["strategie", "Intelligence stratégique", "Comment gagner"],
  ["dossiers", "Dossiers commerciaux", "Battlecards pour Mission"],
];

const I = {
  plus: <path d="M12 5v14M5 12h14" />, ext: <><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />, chev: <path d="m9 6 6 6-6 6" />, eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12" /><circle cx="12" cy="12" r="3" /></>,
  pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />, search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>, chat: <path d="M4 5h16v11H9l-5 4z" />,
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />, bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />, file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
};
const Ico = ({ n, className = "w-5 h-5" }) => <svg viewBox="0 0 24 24" className={cx(className, "shrink-0")} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{I[n]}</svg>;

/** L'espionne de Bingoo! : son portrait, qui cligne des yeux. Au travail, sa loupe passe sur l'écran et un balayage la traverse. */
const LIDS = [[573, 399, 56, 34], [755, 403, 45, 32]];
export function Spy({ working, className = "w-[205px] h-[246px]" }) {
  const mask = { WebkitMaskImage: "url(/espion.webp)", maskImage: "url(/espion.webp)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%" };
  return (
    <div className={cx("relative shrink-0 select-none", className)}>
      {/* Halo derrière le personnage */}
      <div className={cx("absolute left-1/2 top-[18%] -translate-x-1/2 w-[92%] aspect-square rounded-full bg-gradient-to-b from-accent-soft to-[#FFF4EC]", working && "animate-pulse")} />
      <div className="absolute inset-0">
        <img src="/espion.webp" alt="L'espionne de Bingoo!" className="absolute inset-0 h-full w-full drop-shadow-[0_14px_18px_rgba(10,10,10,.22)]" draggable={false} />
        <svg viewBox="105 8 1040 1246" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs><linearGradient id="spy-lid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#B85F2A" /><stop offset="1" stopColor="#DF7B3B" /></linearGradient></defs>
          {LIDS.map(([x, y, rx, ry], i) => (
            <g key={i} className="lid" style={{ transformOrigin: `${x}px ${y - ry}px`, animationDuration: "5.2s", animationDelay: "-1.3s" }}>
              <ellipse cx={x} cy={y} rx={rx + 6} ry={ry + 6} fill="url(#spy-lid)" />
              <path d={`M${x - rx - 4} ${y + ry * 0.45}Q${x} ${y + ry * 1.15} ${x + rx + 4} ${y + ry * 0.45}`} stroke="#2A160C" strokeWidth="9" fill="none" strokeLinecap="round" />
            </g>
          ))}
        </svg>
        {working && <div className="absolute inset-0 overflow-hidden pointer-events-none" style={mask}><div className="absolute inset-x-0 h-1/3 spy-sweep" style={{ background: "linear-gradient(180deg, rgba(224,83,31,0) 0%, rgba(224,83,31,.35) 50%, rgba(224,83,31,0) 100%)" }} /></div>}
      </div>
      {working && <span className="absolute left-1/2 -translate-x-1/2 -bottom-3 whitespace-nowrap inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[11.5px] font-semibold text-white shadow"><span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />En mission</span>}
      {/* Loupe */}
      <svg viewBox="0 0 80 80" className={cx("absolute -right-4 bottom-6 w-[80px] h-[80px] drop-shadow-lg", working ? "spy-loupe-on" : "spy-loupe")} aria-hidden>
        <line x1="50" y1="50" x2="72" y2="72" stroke="#0A0A0A" strokeWidth="9" strokeLinecap="round" />
        <line x1="50" y1="50" x2="72" y2="72" stroke="#3A3A3A" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="34" cy="34" r="22" fill="rgba(255,255,255,.35)" stroke="#0A0A0A" strokeWidth="6" />
        <path d="M21 27 Q26 18 36 17" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".85" />
      </svg>
    </div>
  );
}

function Panel({ title, icon, right, children, className }) {
  return (
    <section className={cx("rounded-2xl border border-line bg-white p-4 sm:p-5 min-w-0", className)}>
      {title && <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[.08em] text-ink"><span style={{ color: TEAL }}><Ico n={icon} /></span>{title}</h3>{right}
      </div>}
      {children}
    </section>
  );
}
const Src = ({ href }) => href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11.5px] hover:underline" style={{ color: TEAL }}>{host(href)}<Ico n="ext" className="w-3 h-3" /></a> : null;
const Empty = ({ children }) => <p className="text-sm text-ink-faint rounded-xl border border-dashed border-line p-5 text-center">{children}</p>;
const Fav = ({ c, size = "w-10 h-10" }) => <img src={`https://www.google.com/s2/favicons?domain=${host(c.url)}&sz=64`} alt="" className={cx(size, "rounded-xl bg-white p-1.5 shrink-0")} />;

function Threat({ n }) {
  const v = Number(n) || 0;
  return <span className="inline-flex items-center gap-1" title={`Menace ${v} sur 5`}>{[1, 2, 3, 4, 5].map((k) => <span key={k} className="h-1.5 w-3 rounded-full" style={{ background: k <= v ? (v >= 4 ? "#DC2626" : v >= 3 ? "#D97706" : TEAL) : "#E7E5DF" }} />)}</span>;
}

const POS = { devant: ["Devant toi", "bg-bad-soft text-bad"], derriere: ["Derrière toi", "bg-good-soft text-good"], egal: ["À égalité", "bg-paper text-ink-soft"], inconnu: ["Position à établir", "bg-paper text-ink-soft"] };

/** Nouveaux concurrents repérés par l'espion : rien n'est suivi sans l'accord du client. */
function Proposed({ list, ws, onDone }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  if (!list.length) return null;
  const act = async (c, follow) => {
    setBusy(c.id);
    try { await fn("r/spy-follow", { workspace_id: ws.id, competitor_id: c.id, follow }); toast(follow ? `${nameOf(c)} est suivi : rapport complet la nuit prochaine` : `${nameOf(c)} écarté`, "good"); onDone(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  return (
    <Panel title={`L'espion a repéré ${list.length} nouveau${list.length > 1 ? "x" : ""} concurrent${list.length > 1 ? "s" : ""}`} icon="bell" right={<span className="text-[12px] text-ink-faint">à valider</span>}>
      <div className="grid md:grid-cols-2 gap-2.5">
        {list.map((c) => (
          <div key={c.id} className="rounded-xl border border-line bg-paper/60 p-3 flex gap-3 min-w-0">
            <Fav c={c} size="w-9 h-9" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{nameOf(c)} <span className="text-[11.5px] font-normal text-ink-faint">{c.proposal?.type ? `· ${c.proposal.type}` : ""}</span></p>
              <p className="text-[12.5px] text-ink-soft leading-snug line-clamp-2">{c.proposal?.pourquoi || host(c.url)}</p>
              <div className="mt-2 flex gap-2">
                <button disabled={busy === c.id} onClick={() => act(c, true)} className="rounded-full bg-accent text-white px-3 py-1 text-[12px] font-semibold hover:bg-accent-dark disabled:opacity-50">Suivre</button>
                <button disabled={busy === c.id} onClick={() => act(c, false)} className="rounded-full border border-line px-3 py-1 text-[12px] text-ink-soft hover:text-ink disabled:opacity-50">Écarter</button>
                <a href={c.url} target="_blank" rel="noreferrer" className="ml-auto self-center text-[11.5px] text-ink-faint hover:underline">{host(c.url)}</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Rapport de l'espion : ce qu'il a fait ces 3 derniers jours, en pilote automatique ou à ta demande. */
function Report({ items }) {
  if (!items.length) return null;
  return (
    <Panel title="Rapport de l'espion" icon="file" right={<span className="text-[12px] text-ink-faint">3 derniers jours</span>}>
      <ul className="divide-y divide-line">
        {items.slice(0, 10).map((a, i) => (
          <li key={i} className="py-2 flex gap-3 text-[13px]">
            <span className="text-ink-faint shrink-0 w-[92px] tnum">{new Date(a.created_at).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span>
            <span className="text-ink line-clamp-2">{txt(a.summary)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* 1. Mes concurrents */
function Competitors({ rows, onOpen }) {
  if (!rows.length) return <Empty>Ajoute ton premier concurrent ci-dessus (son nom ou son site) : l'espion constitue sa fiche complète, sources à l'appui.</Empty>;
  return (
    <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3.5">
      {rows.map((c) => {
        const s = c.summary ?? {};
        return (
          <button key={c.id} onClick={() => onOpen(c)} className="text-left rounded-2xl border border-line bg-white p-4 hover:border-accent/50 transition group min-w-0">
            <div className="flex items-center gap-3">
              <Fav c={c} />
              <div className="min-w-0 flex-1"><p className="font-bold text-ink truncate">{nameOf(c)}</p><p className="text-[12px] text-ink-faint truncate">{host(c.url)}</p></div>
              {s.menace && <Threat n={s.menace.niveau} />}
            </div>
            {s.position?.verdict && POS[s.position.verdict] && <span className={cx("mt-3 inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", POS[s.position.verdict][1])}>{POS[s.position.verdict][0]}</span>}
            <p className="text-[13px] text-ink-soft mt-2 line-clamp-3 leading-snug">{txt(s.resume || s.offre) || "Pas encore analysé : rapport complet la nuit prochaine."}</p>
            {s.acquisition?.methode && <p className="text-[12px] text-ink-soft mt-2 line-clamp-2"><span className="font-semibold text-ink">Comment ils trouvent leurs clients : </span>{txt(s.acquisition.methode)}</p>}
            {s.clients?.types && <p className="text-[12px] text-ink-soft mt-1 line-clamp-2"><span className="font-semibold text-ink">Leurs clients : </span>{txt(s.clients.types)}{s.clients.references?.length ? ` (${s.clients.references.slice(0, 3).map((r) => txt(r.nom ?? r)).join(", ")})` : ""}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-lg bg-paper/60 border border-line p-2"><p className="text-ink-faint">Tarifs</p><p className="text-ink line-clamp-2 mt-0.5">{txt(s.prix?.affiches)?.slice(0, 90) || "Inconnu"}</p></div>
              <div className="rounded-lg bg-paper/60 border border-line p-2"><p className="text-ink-faint">Faiblesses repérées</p><p className="text-ink mt-0.5">{(s.faiblesses ?? []).length || "—"}</p></div>
            </div>
            <p className="mt-3 flex items-center justify-between text-[11.5px] text-ink-faint">Analysé {ago(c.checked_at)}<span className="inline-flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition" style={{ color: TEAL }}>Ouvrir la fiche<Ico n="chev" className="w-3.5 h-3.5" /></span></p>
          </button>
        );
      })}
    </div>
  );
}

/* 2. Veille concurrentielle : chaque mouvement daté, sourcé, avec son importance */
function Watch({ rows }) {
  const [who, setWho] = useState("all");
  const items = useMemo(() => rows.flatMap((c) => [
    ...(c.summary?.actualites ?? []).map((a) => ({ c, date: a.date, title: txt(a.titre), why: txt(a.impact), src: srcOf(a) || String(a.source ?? "").split(/\s*;\s*/)[0], kind: "Actualité" })),
    ...(c.history ?? []).map((h) => ({ c, date: h.at, title: "Changements constatés à l'analyse", why: txt(h.changes), kind: "Analyse" })),
    ...(c.summary?.recrutements ? [{ c, date: c.checked_at, title: "Recrutements", why: txt(c.summary.recrutements), kind: "Recrutement" }] : []),
  ]).sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""))), [rows]);
  const shown = items.filter((x) => who === "all" || x.c.id === who);
  if (!items.length) return <Empty>Aucun mouvement pour l'instant : ils apparaîtront ici dès la première analyse d'un concurrent.</Empty>;
  return (
    <Panel title="Mouvements détectés" icon="pulse" right={<span className="text-[12px] text-ink-faint">{items.length} au total</span>}>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {[["all", "Tous"], ...rows.map((c) => [c.id, nameOf(c)])].map(([k, l]) => <button key={k} onClick={() => setWho(k)} className={cx("rounded-full px-3 py-1 text-[12px] font-medium border transition", who === k ? "border-accent text-accent-dark bg-accent-soft" : "border-line text-ink-soft hover:text-ink")}>{l}</button>)}
      </div>
      <ol className="relative">
        {shown.slice(0, 30).map((x, i) => (
          <li key={i} className="relative pl-7 pb-5 last:pb-0">
            {i < Math.min(shown.length, 30) - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-[#26343B]" />}
            <span className="absolute left-0 top-1 h-[15px] w-[15px] rounded-full border-2 bg-white" style={{ borderColor: TEAL }} />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              <span className="font-semibold text-ink">{dateFr(x.date) || "Date inconnue"}</span>
              <span className="rounded-full bg-paper px-2 py-0.5 text-ink-soft">{nameOf(x.c)}</span>
              <span className="text-ink-faint">{x.kind}</span>
            </div>
            <p className="text-[14px] font-semibold text-ink mt-1">{x.title}</p>
            {x.why && <p className="text-[13px] text-ink-soft mt-0.5 leading-snug line-clamp-3"><span style={{ color: TEAL }}>Ce que ça change : </span>{x.why}</p>}
            {x.src && <div className="mt-1"><Src href={x.src} /></div>}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/* 3. Besoins détectés : insatisfactions chez leurs clients (avis) ; demandes publiques à venir */
function Needs({ rows }) {
  const weak = rows.flatMap((c) => (c.summary?.faiblesses ?? []).map((f) => ({ c, t: txt(f), src: srcOf(f), fact: f?.type !== "hypothese" })));
  const reviews = rows.filter((c) => c.summary?.avis?.clients);
  return (
    <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
      <Panel title="Insatisfactions chez leurs clients" icon="eye" right={<span className="text-[12px] text-ink-faint">{weak.length} repérées</span>}>
        {!weak.length ? <Empty>Rien de repéré pour l'instant.</Empty> : (
          <ul className="space-y-2.5">
            {weak.slice(0, 14).map((w, i) => (
              <li key={i} className="rounded-xl border border-line bg-paper/60 p-3">
                <div className="flex items-center gap-2 text-[12px]"><span className="rounded-full bg-paper px-2 py-0.5 text-ink-soft">{nameOf(w.c)}</span><span className={w.fact ? "text-accent" : "text-[#FBBF24]"}>{w.fact ? "Fait sourcé" : "Hypothèse"}</span></div>
                <p className="text-[13.5px] text-ink mt-1.5 leading-snug">{w.t}</p>
                {w.src && <div className="mt-1"><Src href={w.src} /></div>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <div className="space-y-4 min-w-0">
        <Panel title="Ce que disent leurs clients" icon="chat">
          {!reviews.length ? <Empty>Aucun avis analysé.</Empty> : reviews.map((c) => (
            <div key={c.id} className="mb-3 last:mb-0"><p className="text-[12.5px] font-semibold text-ink">{nameOf(c)}</p><p className="text-[13px] text-ink-soft mt-0.5 line-clamp-4 leading-snug">{txt(c.summary.avis.clients)}</p></div>
          ))}
        </Panel>
        <Panel title="Demandes publiques de prestataires" icon="search">
          <p className="text-[13px] text-ink-soft leading-snug">Bientôt, l'espion repérera les entreprises qui cherchent un prestataire ou une alternative à tes concurrents, sur les sources publiques autorisées, avec la source, la date et la fiabilité de chaque demande.</p>
          <p className="text-[12px] text-ink-faint mt-2">En attendant, le <Link to="/radar" className="underline" style={{ color: TEAL }}>Radar</Link> détecte déjà les entreprises qui recrutent ou grandissent.</p>
        </Panel>
      </div>
    </div>
  );
}

/* 4. Intelligence stratégique : pourquoi toi plutôt qu'eux */
function Strategy({ rows }) {
  const cmp = rows.flatMap((c) => (c.summary?.comparatif ?? []).map((r) => ({ c, ...r })));
  const ours = cmp.filter((r) => r.avantage === "nous"), theirs = cmp.filter((r) => r.avantage === "eux"), unknown = cmp.filter((r) => !["nous", "eux"].includes(r.avantage));
  const opps = rows.flatMap((c) => (c.summary?.opportunites ?? []).map((o) => ({ c, t: txt(o) })));
  const acts = rows.flatMap((c) => (c.summary?.actions ?? []).slice(0, 3).map((a) => ({ c, t: txt(a) })));
  const Row = ({ r, tone }) => (
    <li className="rounded-xl border border-line bg-paper/60 p-3 text-[13px]">
      <div className="flex items-center gap-2 text-[12px]"><span className="font-semibold text-ink">{r.critere}</span><span className="text-ink-faint">face à {nameOf(r.c)}</span></div>
      <p className="mt-1 text-ink"><span style={{ color: tone }}>Toi : </span>{txt(r.nous)}</p>
      <p className="mt-0.5 text-ink-faint">Eux : {txt(r.eux)}</p>
    </li>
  );
  const pos = rows.filter((c) => c.summary?.position?.pourquoi?.length);
  return (
    <div className="space-y-4">
      {pos.length > 0 && (
        <Panel title="Pourquoi ils sont devant ou derrière toi" icon="bolt">
          <div className="grid md:grid-cols-2 gap-3">
            {pos.map((c) => { const p = c.summary.position; const v = POS[p.verdict] ?? POS.inconnu; return (
              <div key={c.id} className="rounded-xl border border-line bg-paper/60 p-3.5">
                <div className="flex items-center gap-2"><Fav c={c} size="w-7 h-7" /><p className="font-semibold flex-1 truncate">{nameOf(c)}</p><span className={cx("rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", v[1])}>{v[0]}</span></div>
                <ul className="mt-2 space-y-1">{p.pourquoi.slice(0, 4).map((x, i) => <li key={i} className="text-[13px] text-ink-soft leading-snug flex gap-2"><span style={{ color: TEAL }}>•</span>{txt(x)}</li>)}</ul>
              </div>
            ); })}
          </div>
        </Panel>
      )}
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Tes avantages" icon="shield" right={<span className="text-[12px] font-bold" style={{ color: TEAL }}>{ours.length}</span>}>{ours.length ? <ul className="space-y-2">{ours.slice(0, 6).map((r, i) => <Row key={i} r={r} tone={TEAL} />)}</ul> : <Empty>À établir par l'analyse.</Empty>}</Panel>
        <Panel title="Où ils sont devant" icon="bolt" right={<span className="text-[12px] font-bold text-[#F87171]">{theirs.length}</span>}>{theirs.length ? <ul className="space-y-2">{theirs.slice(0, 6).map((r, i) => <Row key={i} r={r} tone="#DC2626" />)}</ul> : <Empty>Rien d'établi.</Empty>}</Panel>
        <Panel title="À vérifier" icon="search" right={<span className="text-[12px] font-bold text-[#FBBF24]">{unknown.length}</span>}>{unknown.length ? <ul className="space-y-2">{unknown.slice(0, 6).map((r, i) => <Row key={i} r={r} tone="#D97706" />)}</ul> : <Empty>Aucun point en suspens.</Empty>}<p className="text-[11.5px] text-ink-faint mt-3">Les données inconnues sont signalées, jamais inventées.</p></Panel>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Opportunités de différenciation" icon="eye">{opps.length ? <ul className="space-y-2">{opps.slice(0, 8).map((o, i) => <li key={i} className="text-[13.5px] text-ink leading-snug flex gap-2"><span style={{ color: TEAL }}>→</span><span>{o.t}<span className="text-ink-faint"> · {nameOf(o.c)}</span></span></li>)}</ul> : <Empty>Pas encore d'opportunité identifiée.</Empty>}</Panel>
        <Panel title="Recommandations de l'espion" icon="bolt">{acts.length ? <ol className="space-y-2.5">{acts.slice(0, 8).map((a, i) => <li key={i} className="flex gap-3 text-[13.5px] text-ink leading-snug"><span className="grid place-items-center h-6 w-6 rounded-full text-[12px] font-bold shrink-0 text-white" style={{ background: TEAL }}>{i + 1}</span><span>{a.t}</span></li>)}</ol> : <Empty>Les recommandations arrivent avec l'analyse.</Empty>}</Panel>
      </div>
    </div>
  );
}

/* 5. Dossiers commerciaux : battlecards prêtes pour Mission */
function Dossiers({ rows }) {
  const list = rows.filter((c) => c.summary?.battlecard);
  const [open, setOpen] = useState(list[0]?.id ?? null);
  if (!list.length) return <Empty>Les battlecards apparaissent après l'analyse d'un concurrent.</Empty>;
  const c = list.find((x) => x.id === open) ?? list[0], b = c.summary.battlecard;
  const L = ({ t, items, tone }) => items?.length ? <div><p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: tone }}>{t}</p><ul className="space-y-1.5">{items.map((x, i) => <li key={i} className="text-[13px] text-ink-soft leading-snug flex gap-2"><span style={{ color: tone }}>•</span>{txt(x)}</li>)}</ul></div> : null;
  return (
    <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-4">
      <div className="space-y-2">
        {list.map((x) => <button key={x.id} onClick={() => setOpen(x.id)} className={cx("w-full text-left rounded-xl border p-3 flex items-center gap-3 transition", x.id === c.id ? "border-accent/50 bg-accent-soft/60" : "border-line bg-white hover:border-line")}><Fav c={x} size="w-8 h-8" /><span className="min-w-0"><span className="block font-semibold text-ink text-[14px] truncate">{nameOf(x)}</span><span className="block text-[11.5px] text-ink-faint">{(x.summary.battlecard.objections ?? []).length ? `${x.summary.battlecard.objections.length} objections préparées` : "Battlecard prête"}</span></span></button>)}
        <p className="text-[11.5px] text-ink-faint px-1 pt-1">Hugo s'en sert pour écrire les e-mails, Inès pour répondre quand un prospect cite ce concurrent.</p>
      </div>
      <Panel title={`Dossier · ${nameOf(c)}`} icon="file">
        {b.pitch && <div className="rounded-xl p-4 text-[14px] text-ink leading-snug border" style={{ borderColor: `${TEAL}55`, background: `${TEAL}12` }}><p className="text-[11.5px] font-bold uppercase tracking-wider mb-1" style={{ color: TEAL }}>Angle d'approche</p>{txt(b.pitch)}</div>}
        {!!b.objections?.length && <div className="mt-4"><p className="text-[12px] font-bold uppercase tracking-wider mb-2 text-ink-soft">Objections et réponses</p>
          <div className="space-y-2">{b.objections.map((o, i) => <details key={i} className="rounded-xl border border-line bg-paper/60 p-3 group"><summary className="cursor-pointer text-[13.5px] font-semibold text-ink list-none flex justify-between gap-2">« {txt(o.objection)} »<Ico n="chev" className="w-4 h-4 text-ink-faint group-open:rotate-90 transition" /></summary><p className="text-[13px] text-ink-soft mt-2 leading-snug">{txt(o.reponse)}</p></details>)}</div></div>}
        <div className="mt-5 grid md:grid-cols-2 gap-5">
          <L t="Quand on gagne" items={b.quand_on_gagne} tone={TEAL} />
          <L t="Quand on perd" items={b.quand_on_perd} tone="#DC2626" />
          <L t="Questions à poser" items={b.questions_pieges} tone="#2563EB" />
          <L t="À ne pas dire" items={b.a_ne_pas_dire} tone="#D97706" />
        </div>
      </Panel>
    </div>
  );
}

export default function EspionHub() {
  const { ws } = useWs();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [space, setSpace] = useState("concurrents");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(null);
  const [recent, setRecent] = useState(false);
  const [proposed, setProposed] = useState([]);
  const [report, setReport] = useState([]);
  const [desk, setDesk] = useState(null);

  const load = useCallback(async () => {
    const [{ data }, { data: act }] = await Promise.all([
      supabase.from("competitors").select("*").eq("workspace_id", ws.id).neq("status", "ecarte").order("created_at"),
      supabase.from("activity").select("kind, summary, created_at").eq("workspace_id", ws.id).in("kind", ["veille", "espion"]).gte("created_at", new Date(Date.now() - 3 * 864e5).toISOString()).order("created_at", { ascending: false }).limit(20),
    ]);
    setRows((data ?? []).filter((c) => (c.status ?? "suivi") === "suivi")); setProposed((data ?? []).filter((c) => c.status === "propose"));
    setReport(act ?? []); setRecent(!!(act ?? []).find((a) => Date.now() - new Date(a.created_at).getTime() < 4 * 60000));
  }, [ws.id]);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const add = async (e) => {
    e.preventDefault(); if (!q.trim() || busy) return;
    try {
      setBusy("Recherche de son site officiel…");
      const r = await fn("r/spy-resolve", { workspace_id: ws.id, query: q });
      let c = (rows ?? []).find((x) => host(x.url) === host(r.url));
      if (!c) { const { data, error } = await supabase.from("competitors").insert({ workspace_id: ws.id, url: r.url, name: r.name }).select("*").single(); if (error) throw new Error(error.message); c = data; }
      setQ("");
      if (!c.summary) { setBusy(`Enquête sur ${r.name || host(r.url)} : site, registre, actualité, avis… (1 à 2 minutes)`); await fn("competitor-check", { workspace_id: ws.id, competitor_id: c.id }); }
      setBusy("Mesure de ses réseaux et de son site…"); await fn("r/spy-social", { workspace_id: ws.id, competitor_id: c.id }).catch(() => null);
      await load(); toast("Dossier constitué", "good");
    } catch (e2) { toast(e2.message, "bad"); } finally { setBusy(null); }
  };

  const list = rows ?? [];
  const working = !!busy || recent;
  const moves = list.reduce((n, c) => n + (c.summary?.actualites?.length ?? 0) + (c.history?.length ?? 0), 0);
  const weak = list.reduce((n, c) => n + (c.summary?.faiblesses?.length ?? 0), 0);
  const cards = list.filter((c) => c.summary?.battlecard).length;
  const fresh = list.filter((c) => c.changed_at && Date.now() - new Date(c.changed_at).getTime() < 7 * 864e5).length;
  const last = list.map((c) => c.checked_at).filter(Boolean).sort().pop();

  return (
    <div>
      {/* En-tête : l'espion et son état */}
      <div className="rounded-3xl bg-white border border-line p-5 sm:p-6 grid lg:grid-cols-[auto_minmax(0,1fr)_auto] gap-6 items-center">
        <div className="mx-auto lg:mx-0"><Spy working={working} /></div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[.2em]" style={{ color: TEAL }}>Centre de renseignement</p>
          <h1 className="font-black text-[44px] sm:text-[52px] leading-none tracking-tight mt-1" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>Espion</h1>
          <p className="text-ink-soft mt-2 text-[16px]">Sachez ce que vos concurrents ignorent.</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-paper/60 px-3 py-1.5 text-[13px]">
            <span className={cx("h-2 w-2 rounded-full", working && "animate-pulse")} style={{ background: working ? TEAL : "#9A9CA3" }} />
            <span className="text-ink truncate max-w-[520px]">{busy ?? (recent ? "Enquête en cours…" : `En veille · dernière enquête ${ago(last)}`)}</span>
          </p>
          <p className="mt-2 text-[12.5px] text-ink-faint">Pilote automatique : chaque nuit, l'espion relit le site de tes concurrents ; rapport complet dès que l'un d'eux bouge, et au moins chaque semaine.</p>
          <form onSubmit={add} className="mt-4 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-line bg-paper/60 px-3 focus-within:border-accent/60">
              <Ico n="search" className="w-4 h-4 text-ink-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ajouter un concurrent : nom ou site web…" className="flex-1 bg-transparent py-3 text-[14.5px] outline-none placeholder:text-ink-faint" />
            </div>
            <button disabled={!!busy || !q.trim()} className="rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-40 transition hover:brightness-110" style={{ background: TEAL }}>Enquêter</button>
          </form>
          <Link to="/salaries" className="mt-3 inline-flex items-center gap-2 text-[13px] text-ink-soft hover:text-ink"><Ico n="chat" className="w-4 h-4" />Parler à l'équipe : « Qu'est-ce qui a changé chez mes concurrents cette semaine ? »</Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:w-[300px]">
          {[[list.length, "concurrents suivis"], [moves, "mouvements repérés"], [weak, "faiblesses à exploiter"], [cards, "dossiers prêts"]].map(([n, l]) => (
            <div key={l} className="rounded-2xl border border-line bg-white p-3.5"><p className="font-black text-[30px] leading-none tnum" style={{ color: TEAL, fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{rows ? n : "–"}</p><p className="text-[12px] text-ink-faint mt-1.5 leading-tight">{l}</p></div>
          ))}
          {fresh > 0 && <p className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full py-2 text-[13px] font-semibold text-white" style={{ background: TEAL }}><Ico n="bell" className="w-4 h-4" />{fresh} concurrent{fresh > 1 ? "s ont" : " a"} bougé cette semaine</p>}
        </div>
      </div>

      {/* Les cinq espaces */}
      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line -mx-1 px-1">
        {SPACES.map(([k, l, sub]) => (
          <button key={k} onClick={() => setSpace(k)} className={cx("relative shrink-0 px-4 pt-2 pb-3 text-left transition", space === k ? "text-ink" : "text-ink-faint hover:text-ink")}>
            <span className="block text-[14.5px] font-semibold">{l}</span><span className="block text-[11.5px] text-ink-faint">{sub}</span>
            {space === k && <span className="absolute inset-x-3 -bottom-px h-[3px] rounded-full" style={{ background: TEAL }} />}
          </button>
        ))}
      </nav>

      <div className="mt-5">
        {!rows ? <div className="py-16 text-center text-ink-faint text-sm">Ouverture des dossiers…</div>
          : space === "concurrents" ? <div className="space-y-5"><Proposed list={proposed} ws={ws} onDone={load} /><Competitors rows={list} onOpen={setDesk} /></div>
          : space === "veille" ? <div className="space-y-4"><Report items={report} /><Watch rows={list} /></div>
          : space === "besoins" ? <Needs rows={list} />
          : space === "strategie" ? <Strategy rows={list} />
          : <Dossiers rows={list} />}
      </div>

      {desk && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal>
          <button className="absolute inset-0 bg-ink/40" onClick={() => setDesk(null)} aria-label="Fermer" />
          <div className="relative w-full max-w-[1100px] h-full overflow-y-auto bg-paper text-ink p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-[12px] font-bold uppercase tracking-[.15em] text-ink-soft">Fiche concurrent</p>
              <button onClick={() => setDesk(null)} className="rounded-full border border-line px-3 py-1 text-sm hover:border-ink/30">Fermer</button>
            </div>
            <CompetitorDesk embedded focusId={desk.id} onChanged={(removed) => { load(); if (removed) setDesk(null); }} />
          </div>
        </div>
      )}
    </div>
  );
}
