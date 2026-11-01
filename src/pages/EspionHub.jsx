import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useToast } from "../components/ui";
import { cx } from "../lib/utils";
import { CompetitorDesk } from "./Espion";

// Espion : le centre de renseignement commercial. Cinq espaces, données sourcées uniquement.
const TEAL = "#2DD4BF";
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

/** L'espion : silhouette (chapeau, col relevé, regard). Au travail, sa loupe passe sur les dossiers et ses yeux la suivent. */
export function Spy({ working, className = "w-[210px] h-[210px]" }) {
  return (
    <svg viewBox="0 0 220 220" className={cx(className, "overflow-visible")} aria-hidden>
      <defs>
        <radialGradient id="spy-halo"><stop offset="0" stopColor={TEAL} stopOpacity=".28" /><stop offset="1" stopColor={TEAL} stopOpacity="0" /></radialGradient>
        <linearGradient id="spy-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={TEAL} stopOpacity=".9" /><stop offset="1" stopColor={TEAL} stopOpacity=".15" /></linearGradient>
        <radialGradient id="spy-glass"><stop offset="0" stopColor="#E9FFFB" stopOpacity=".35" /><stop offset="1" stopColor={TEAL} stopOpacity=".08" /></radialGradient>
      </defs>
      <circle cx="96" cy="112" r="96" fill="url(#spy-halo)" className={working ? "spy-halo-on" : ""} />
      {/* Dossiers examinés */}
      <g className={working ? "spy-docs-on" : ""} opacity=".9">
        {[[150, 120, -8], [168, 150, 6], [138, 168, -3]].map(([x, y, r], k) => (
          <g key={k} transform={`rotate(${r} ${x} ${y})`}>
            <rect x={x - 22} y={y - 14} width="44" height="30" rx="4" fill="#16232A" stroke="#2A3B44" />
            <rect x={x - 16} y={y - 8} width="20" height="3" rx="1.5" fill={TEAL} opacity=".7" />
            <rect x={x - 16} y={y - 1} width="30" height="2.5" rx="1.2" fill="#3A4C55" />
            <rect x={x - 16} y={y + 5} width="24" height="2.5" rx="1.2" fill="#3A4C55" />
          </g>
        ))}
        {working && [[162, 112], [178, 146], [146, 164]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="3" fill={TEAL} className="spy-ping" style={{ animationDelay: `${k * 0.9}s` }} />)}
      </g>
      {/* Silhouette : manteau à col relevé, chapeau à large bord */}
      <g>
        <path d="M18 220 Q24 160 62 140 L96 176 L130 140 Q168 160 174 220 Z" fill="#05080A" stroke="url(#spy-rim)" strokeWidth="1.4" />
        <path d="M62 140 L58 96 Q70 112 96 118 L96 176 Z" fill="#070B0D" stroke="url(#spy-rim)" strokeWidth="1.2" />
        <path d="M130 140 L134 96 Q122 112 96 118 L96 176 Z" fill="#06090B" stroke="url(#spy-rim)" strokeWidth="1.2" />
        <ellipse cx="96" cy="94" rx="30" ry="26" fill="#05080A" />
        <path d="M66 70 Q68 34 96 32 Q124 34 126 70 Z" fill="#05080A" stroke="url(#spy-rim)" strokeWidth="1.2" />
        <path d="M67 62 Q96 68 125 62 L126 70 Q96 76 66 70 Z" fill="#0D1418" />
        <ellipse cx="96" cy="72" rx="62" ry="11" fill="#05080A" stroke="url(#spy-rim)" strokeWidth="1.2" />
        {/* Regard */}
        <g className={working ? "spy-eyes-on" : ""}>
          <g className="spy-blink" style={{ transformOrigin: "96px 92px" }}>
            <path d="M80 92 Q86 87.5 92 92 Q86 94.5 80 92 Z" fill="#F4FFFD" />
            <path d="M100 92 Q106 87.5 112 92 Q106 94.5 100 92 Z" fill="#F4FFFD" />
          </g>
        </g>
      </g>
      {/* Loupe */}
      <g className={working ? "spy-loupe-on" : "spy-loupe"}>
        <line x1="166" y1="146" x2="186" y2="168" stroke="#C9D6DA" strokeWidth="7" strokeLinecap="round" />
        <line x1="166" y1="146" x2="186" y2="168" stroke="#7E8D93" strokeWidth="3" strokeLinecap="round" />
        <circle cx="152" cy="132" r="19" fill="url(#spy-glass)" stroke={TEAL} strokeWidth="4.5" />
        <path d="M141 125 Q146 118 154 117" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity=".7" />
      </g>
    </svg>
  );
}

function Panel({ title, icon, right, children, className }) {
  return (
    <section className={cx("rounded-2xl border border-[#1F2C33] bg-[#111A1F] p-4 sm:p-5 min-w-0", className)}>
      {title && <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[.08em] text-white/90"><span style={{ color: TEAL }}><Ico n={icon} /></span>{title}</h3>{right}
      </div>}
      {children}
    </section>
  );
}
const Src = ({ href }) => href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11.5px] hover:underline" style={{ color: TEAL }}>{host(href)}<Ico n="ext" className="w-3 h-3" /></a> : null;
const Empty = ({ children }) => <p className="text-sm text-white/50 rounded-xl border border-dashed border-[#2A3B44] p-5 text-center">{children}</p>;
const Fav = ({ c, size = "w-10 h-10" }) => <img src={`https://www.google.com/s2/favicons?domain=${host(c.url)}&sz=64`} alt="" className={cx(size, "rounded-xl bg-white p-1.5 shrink-0")} />;

function Threat({ n }) {
  const v = Number(n) || 0;
  return <span className="inline-flex items-center gap-1" title={`Menace ${v} sur 5`}>{[1, 2, 3, 4, 5].map((k) => <span key={k} className="h-1.5 w-3 rounded-full" style={{ background: k <= v ? (v >= 4 ? "#F87171" : v >= 3 ? "#FBBF24" : TEAL) : "#26343B" }} />)}</span>;
}

/* 1. Mes concurrents */
function Competitors({ rows, onOpen }) {
  if (!rows.length) return <Empty>Ajoute ton premier concurrent ci-dessus (son nom ou son site) : l'espion constitue sa fiche complète, sources à l'appui.</Empty>;
  return (
    <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3.5">
      {rows.map((c) => {
        const s = c.summary ?? {};
        return (
          <button key={c.id} onClick={() => onOpen(c)} className="text-left rounded-2xl border border-[#1F2C33] bg-[#111A1F] p-4 hover:border-[#2DD4BF]/50 transition group min-w-0">
            <div className="flex items-center gap-3">
              <Fav c={c} />
              <div className="min-w-0 flex-1"><p className="font-bold text-white truncate">{nameOf(c)}</p><p className="text-[12px] text-white/45 truncate">{host(c.url)}</p></div>
              {s.menace && <Threat n={s.menace.niveau} />}
            </div>
            <p className="text-[13px] text-white/70 mt-3 line-clamp-3 leading-snug">{txt(s.resume || s.offre) || "Pas encore analysé."}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-lg bg-[#0C1418] border border-[#1C2930] p-2"><p className="text-white/40">Tarifs</p><p className="text-white/80 line-clamp-2 mt-0.5">{txt(s.prix?.affiches)?.slice(0, 90) || "Inconnu"}</p></div>
              <div className="rounded-lg bg-[#0C1418] border border-[#1C2930] p-2"><p className="text-white/40">Faiblesses repérées</p><p className="text-white/80 mt-0.5">{(s.faiblesses ?? []).length || "—"}</p></div>
            </div>
            <p className="mt-3 flex items-center justify-between text-[11.5px] text-white/40">Analysé {ago(c.checked_at)}<span className="inline-flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition" style={{ color: TEAL }}>Ouvrir la fiche<Ico n="chev" className="w-3.5 h-3.5" /></span></p>
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
    <Panel title="Mouvements détectés" icon="pulse" right={<span className="text-[12px] text-white/45">{items.length} au total</span>}>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {[["all", "Tous"], ...rows.map((c) => [c.id, nameOf(c)])].map(([k, l]) => <button key={k} onClick={() => setWho(k)} className={cx("rounded-full px-3 py-1 text-[12px] font-medium border transition", who === k ? "border-[#2DD4BF] text-[#2DD4BF] bg-[#2DD4BF]/10" : "border-[#26343B] text-white/60 hover:text-white")}>{l}</button>)}
      </div>
      <ol className="relative">
        {shown.slice(0, 30).map((x, i) => (
          <li key={i} className="relative pl-7 pb-5 last:pb-0">
            {i < Math.min(shown.length, 30) - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-[#26343B]" />}
            <span className="absolute left-0 top-1 h-[15px] w-[15px] rounded-full border-2 bg-[#0B1216]" style={{ borderColor: TEAL }} />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              <span className="font-semibold text-white/85">{dateFr(x.date) || "Date inconnue"}</span>
              <span className="rounded-full bg-[#1A262C] px-2 py-0.5 text-white/60">{nameOf(x.c)}</span>
              <span className="text-white/40">{x.kind}</span>
            </div>
            <p className="text-[14px] font-semibold text-white mt-1">{x.title}</p>
            {x.why && <p className="text-[13px] text-white/65 mt-0.5 leading-snug line-clamp-3"><span style={{ color: TEAL }}>Ce que ça change : </span>{x.why}</p>}
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
      <Panel title="Insatisfactions chez leurs clients" icon="eye" right={<span className="text-[12px] text-white/45">{weak.length} repérées</span>}>
        {!weak.length ? <Empty>Rien de repéré pour l'instant.</Empty> : (
          <ul className="space-y-2.5">
            {weak.slice(0, 14).map((w, i) => (
              <li key={i} className="rounded-xl border border-[#1F2C33] bg-[#0C1418] p-3">
                <div className="flex items-center gap-2 text-[12px]"><span className="rounded-full bg-[#1A262C] px-2 py-0.5 text-white/70">{nameOf(w.c)}</span><span className={w.fact ? "text-[#2DD4BF]" : "text-[#FBBF24]"}>{w.fact ? "Fait sourcé" : "Hypothèse"}</span></div>
                <p className="text-[13.5px] text-white/85 mt-1.5 leading-snug">{w.t}</p>
                {w.src && <div className="mt-1"><Src href={w.src} /></div>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <div className="space-y-4 min-w-0">
        <Panel title="Ce que disent leurs clients" icon="chat">
          {!reviews.length ? <Empty>Aucun avis analysé.</Empty> : reviews.map((c) => (
            <div key={c.id} className="mb-3 last:mb-0"><p className="text-[12.5px] font-semibold text-white/85">{nameOf(c)}</p><p className="text-[13px] text-white/60 mt-0.5 line-clamp-4 leading-snug">{txt(c.summary.avis.clients)}</p></div>
          ))}
        </Panel>
        <Panel title="Demandes publiques de prestataires" icon="search">
          <p className="text-[13px] text-white/65 leading-snug">Bientôt, l'espion repérera les entreprises qui cherchent un prestataire ou une alternative à tes concurrents, sur les sources publiques autorisées, avec la source, la date et la fiabilité de chaque demande.</p>
          <p className="text-[12px] text-white/40 mt-2">En attendant, le <Link to="/radar" className="underline" style={{ color: TEAL }}>Radar</Link> détecte déjà les entreprises qui recrutent ou grandissent.</p>
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
    <li className="rounded-xl border border-[#1F2C33] bg-[#0C1418] p-3 text-[13px]">
      <div className="flex items-center gap-2 text-[12px]"><span className="font-semibold text-white/85">{r.critere}</span><span className="text-white/35">face à {nameOf(r.c)}</span></div>
      <p className="mt-1 text-white/80"><span style={{ color: tone }}>Toi : </span>{txt(r.nous)}</p>
      <p className="mt-0.5 text-white/55">Eux : {txt(r.eux)}</p>
    </li>
  );
  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Tes avantages" icon="shield" right={<span className="text-[12px] font-bold" style={{ color: TEAL }}>{ours.length}</span>}>{ours.length ? <ul className="space-y-2">{ours.slice(0, 6).map((r, i) => <Row key={i} r={r} tone={TEAL} />)}</ul> : <Empty>À établir par l'analyse.</Empty>}</Panel>
        <Panel title="Où ils sont devant" icon="bolt" right={<span className="text-[12px] font-bold text-[#F87171]">{theirs.length}</span>}>{theirs.length ? <ul className="space-y-2">{theirs.slice(0, 6).map((r, i) => <Row key={i} r={r} tone="#F87171" />)}</ul> : <Empty>Rien d'établi.</Empty>}</Panel>
        <Panel title="À vérifier" icon="search" right={<span className="text-[12px] font-bold text-[#FBBF24]">{unknown.length}</span>}>{unknown.length ? <ul className="space-y-2">{unknown.slice(0, 6).map((r, i) => <Row key={i} r={r} tone="#FBBF24" />)}</ul> : <Empty>Aucun point en suspens.</Empty>}<p className="text-[11.5px] text-white/40 mt-3">Les données inconnues sont signalées, jamais inventées.</p></Panel>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Opportunités de différenciation" icon="eye">{opps.length ? <ul className="space-y-2">{opps.slice(0, 8).map((o, i) => <li key={i} className="text-[13.5px] text-white/80 leading-snug flex gap-2"><span style={{ color: TEAL }}>→</span><span>{o.t}<span className="text-white/35"> · {nameOf(o.c)}</span></span></li>)}</ul> : <Empty>Pas encore d'opportunité identifiée.</Empty>}</Panel>
        <Panel title="Recommandations de l'espion" icon="bolt">{acts.length ? <ol className="space-y-2.5">{acts.slice(0, 8).map((a, i) => <li key={i} className="flex gap-3 text-[13.5px] text-white/80 leading-snug"><span className="grid place-items-center h-6 w-6 rounded-full text-[12px] font-bold shrink-0 text-[#0B1216]" style={{ background: TEAL }}>{i + 1}</span><span>{a.t}</span></li>)}</ol> : <Empty>Les recommandations arrivent avec l'analyse.</Empty>}</Panel>
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
  const L = ({ t, items, tone }) => items?.length ? <div><p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: tone }}>{t}</p><ul className="space-y-1.5">{items.map((x, i) => <li key={i} className="text-[13px] text-white/75 leading-snug flex gap-2"><span style={{ color: tone }}>•</span>{txt(x)}</li>)}</ul></div> : null;
  return (
    <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-4">
      <div className="space-y-2">
        {list.map((x) => <button key={x.id} onClick={() => setOpen(x.id)} className={cx("w-full text-left rounded-xl border p-3 flex items-center gap-3 transition", x.id === c.id ? "border-[#2DD4BF]/60 bg-[#2DD4BF]/10" : "border-[#1F2C33] bg-[#111A1F] hover:border-[#2A3B44]")}><Fav c={x} size="w-8 h-8" /><span className="min-w-0"><span className="block font-semibold text-white text-[14px] truncate">{nameOf(x)}</span><span className="block text-[11.5px] text-white/45">{(x.summary.battlecard.objections ?? []).length ? `${x.summary.battlecard.objections.length} objections préparées` : "Battlecard prête"}</span></span></button>)}
        <p className="text-[11.5px] text-white/40 px-1 pt-1">Hugo s'en sert pour écrire les e-mails, Inès pour répondre quand un prospect cite ce concurrent.</p>
      </div>
      <Panel title={`Dossier · ${nameOf(c)}`} icon="file">
        {b.pitch && <div className="rounded-xl p-4 text-[14px] text-white/90 leading-snug border" style={{ borderColor: `${TEAL}55`, background: `${TEAL}12` }}><p className="text-[11.5px] font-bold uppercase tracking-wider mb-1" style={{ color: TEAL }}>Angle d'approche</p>{txt(b.pitch)}</div>}
        {!!b.objections?.length && <div className="mt-4"><p className="text-[12px] font-bold uppercase tracking-wider mb-2 text-white/60">Objections et réponses</p>
          <div className="space-y-2">{b.objections.map((o, i) => <details key={i} className="rounded-xl border border-[#1F2C33] bg-[#0C1418] p-3 group"><summary className="cursor-pointer text-[13.5px] font-semibold text-white/90 list-none flex justify-between gap-2">« {txt(o.objection)} »<Ico n="chev" className="w-4 h-4 text-white/40 group-open:rotate-90 transition" /></summary><p className="text-[13px] text-white/70 mt-2 leading-snug">{txt(o.reponse)}</p></details>)}</div></div>}
        <div className="mt-5 grid md:grid-cols-2 gap-5">
          <L t="Quand on gagne" items={b.quand_on_gagne} tone={TEAL} />
          <L t="Quand on perd" items={b.quand_on_perd} tone="#F87171" />
          <L t="Questions à poser" items={b.questions_pieges} tone="#93C5FD" />
          <L t="À ne pas dire" items={b.a_ne_pas_dire} tone="#FBBF24" />
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
  const [desk, setDesk] = useState(null);

  const load = useCallback(async () => {
    const [{ data }, { data: act }] = await Promise.all([
      supabase.from("competitors").select("*").eq("workspace_id", ws.id).order("created_at"),
      supabase.from("activity").select("created_at").eq("workspace_id", ws.id).in("kind", ["veille", "espion"]).gte("created_at", new Date(Date.now() - 4 * 60000).toISOString()).limit(1),
    ]);
    setRows(data ?? []); setRecent(!!act?.length);
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
    <div className="-mx-4 md:mx-0 rounded-none md:rounded-[28px] bg-[#0B1216] text-white p-4 sm:p-6 md:p-7 shadow-[0_30px_80px_-30px_rgba(11,18,22,.6)] ring-1 ring-[#1A262C]">
      {/* En-tête : l'espion et son état */}
      <div className="grid lg:grid-cols-[auto_minmax(0,1fr)_auto] gap-6 items-center">
        <div className="mx-auto lg:mx-0"><Spy working={working} /></div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[.2em]" style={{ color: TEAL }}>Centre de renseignement</p>
          <h1 className="font-black text-[44px] sm:text-[52px] leading-none tracking-tight mt-1" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>Espion</h1>
          <p className="text-white/70 mt-2 text-[16px]">Sachez ce que vos concurrents ignorent.</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#22313A] bg-[#0F181C] px-3 py-1.5 text-[13px]">
            <span className={cx("h-2 w-2 rounded-full", working && "animate-pulse")} style={{ background: working ? TEAL : "#4B5B62" }} />
            <span className="text-white/80 truncate max-w-[520px]">{busy ?? (recent ? "Oscar enquête en ce moment…" : `En veille · dernière enquête ${ago(last)}`)}</span>
          </p>
          <form onSubmit={add} className="mt-4 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-[#22313A] bg-[#0F181C] px-3 focus-within:border-[#2DD4BF]/60">
              <Ico n="search" className="w-4 h-4 text-white/40" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ajouter un concurrent : nom ou site web…" className="flex-1 bg-transparent py-3 text-[14.5px] outline-none placeholder:text-white/35" />
            </div>
            <button disabled={!!busy || !q.trim()} className="rounded-xl px-5 py-3 font-semibold text-[#0B1216] disabled:opacity-40 transition hover:brightness-110" style={{ background: TEAL }}>Enquêter</button>
          </form>
          <Link to="/salaries" className="mt-3 inline-flex items-center gap-2 text-[13px] text-white/60 hover:text-white"><Ico n="chat" className="w-4 h-4" />Parler à Oscar, ton veilleur marché : « Qu'est-ce qui a changé chez mes concurrents cette semaine ? »</Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:w-[300px]">
          {[[list.length, "concurrents suivis"], [moves, "mouvements repérés"], [weak, "faiblesses à exploiter"], [cards, "dossiers prêts"]].map(([n, l]) => (
            <div key={l} className="rounded-2xl border border-[#1F2C33] bg-[#111A1F] p-3.5"><p className="font-black text-[30px] leading-none tnum" style={{ color: TEAL, fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{rows ? n : "–"}</p><p className="text-[12px] text-white/55 mt-1.5 leading-tight">{l}</p></div>
          ))}
          {fresh > 0 && <p className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full py-2 text-[13px] font-semibold text-[#0B1216]" style={{ background: TEAL }}><Ico n="bell" className="w-4 h-4" />{fresh} concurrent{fresh > 1 ? "s ont" : " a"} bougé cette semaine</p>}
        </div>
      </div>

      {/* Les cinq espaces */}
      <nav className="mt-7 flex gap-1 overflow-x-auto border-b border-[#1F2C33] -mx-1 px-1">
        {SPACES.map(([k, l, sub]) => (
          <button key={k} onClick={() => setSpace(k)} className={cx("relative shrink-0 px-4 pt-2 pb-3 text-left transition", space === k ? "text-white" : "text-white/50 hover:text-white/80")}>
            <span className="block text-[14.5px] font-semibold">{l}</span><span className="block text-[11.5px] text-white/40">{sub}</span>
            {space === k && <span className="absolute inset-x-3 -bottom-px h-[3px] rounded-full" style={{ background: TEAL, boxShadow: `0 0 12px ${TEAL}` }} />}
          </button>
        ))}
      </nav>

      <div className="mt-5">
        {!rows ? <div className="py-16 text-center text-white/50 text-sm">Ouverture des dossiers…</div>
          : space === "concurrents" ? <Competitors rows={list} onOpen={setDesk} />
          : space === "veille" ? <Watch rows={list} />
          : space === "besoins" ? <Needs rows={list} />
          : space === "strategie" ? <Strategy rows={list} />
          : <Dossiers rows={list} />}
      </div>

      {desk && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal>
          <button className="absolute inset-0 bg-[#05080A]/70" onClick={() => setDesk(null)} aria-label="Fermer" />
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
