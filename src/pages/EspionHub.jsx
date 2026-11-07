import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useToast } from "../components/ui";
import { cx } from "../lib/utils";
import CompetitorDossier from "./CompetitorDossier";
import CompanyLogo from "../components/CompanyLogo";
import { useDansLieu } from "../lib/lieu";
import { estSimple } from "../lib/lieu";

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
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
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
const Fav = ({ c, size = "w-10 h-10" }) => <CompanyLogo name={nameOf(c)} url={c.url} className={size} />;

function Threat({ n }) {
  const v = Number(n) || 0;
  return <span className="inline-flex items-center gap-1" title={`Menace ${v} sur 5`}>{[1, 2, 3, 4, 5].map((k) => <span key={k} className="h-1.5 w-3 rounded-full" style={{ background: k <= v ? (v >= 4 ? "#DC2626" : v >= 3 ? "#D97706" : TEAL) : "#E7E5DF" }} />)}</span>;
}

const POS = { devant: ["Devant toi", "bg-bad-soft text-bad"], derriere: ["Derrière toi", "bg-good-soft text-good"], egal: ["À égalité", "bg-paper text-ink-soft"], inconnu: ["Position à établir", "bg-paper text-ink-soft"] };


/** Mission de la nuit : ce que l'espionne fera entre 1 h et 7 h, d'après l'état réel des fiches. */
function Tonight({ rows, proposed, ws }) {
  const day = new Date(); day.setHours(0, 0, 0, 0);
  const week = Date.now() - 7 * 864e5;
  const reports = rows.filter((c) => c.spy_due || !c.summary || !c.checked_at || new Date(c.checked_at).getTime() < week).length;
  const ads = rows.filter((c) => c.summary && (!c.ads_at || new Date(c.ads_at).getTime() < week)).length;
  const seen = rows.filter((c) => c.watched_at && new Date(c.watched_at) >= day).length;
  const nextFind = ws.spy_at ? new Date(new Date(ws.spy_at).getTime() + 7 * 864e5) : null;
  const findTonight = !nextFind || nextFind.getTime() <= Date.now() + 864e5;
  const Row = ({ icon, children, on = true }) => <li className={cx("flex items-start gap-2.5 text-[13.5px] leading-snug", on ? "text-ink" : "text-ink-faint")}><span className="mt-0.5" style={{ color: on ? TEAL : "#9A9CA3" }}><Ico n={icon} className="w-4 h-4" /></span><span>{children}</span></li>;
  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-accent-soft/50 to-white p-4">
      <p className="text-[11.5px] font-bold uppercase tracking-wider text-accent-dark">Sa mission de cette nuit · 1 h – 7 h</p>
      <ul className="mt-3 space-y-2.5">
        <Row icon="eye" on={rows.length > 0}>{rows.length ? `Relire le site de ${rows.length} concurrent${rows.length > 1 ? "s" : ""}` : "Aucun site à relire pour l'instant"}{seen ? <span className="text-ink-faint"> · {seen} déjà contrôlé{seen > 1 ? "s" : ""} aujourd'hui</span> : null}</Row>
        <Row icon="file" on={reports > 0}>{reports ? `${reports} rapport${reports > 1 ? "s" : ""} complet${reports > 1 ? "s" : ""} : offre, prix, clients, pubs, chiffre d'affaires` : "Rapports à jour : rien à refaire"}</Row>
        <Row icon="bolt" on={ads > 0}>{ads ? `Actualiser les publicités de ${ads} concurrent${ads > 1 ? "s" : ""}` : "Publicités à jour"}</Row>
        <Row icon="search" on={findTonight}>{findTonight ? "Chercher de nouveaux concurrents" : `Prochaine recherche de concurrents le ${nextFind.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`}</Row>
      </ul>
      {proposed.length > 0 && <p className="mt-3 text-[12.5px] font-semibold text-accent-dark">{proposed.length} concurrent{proposed.length > 1 ? "s" : ""} trouvé{proposed.length > 1 ? "s" : ""} attend{proposed.length > 1 ? "ent" : ""} ta validation ↓</p>}
    </div>
  );
}

/** Premier démarrage : l'espionne trouve elle-même les concurrents. */
function FirstRun({ ws, onDone }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { const r = await fn("r/spy-discover", { workspace_id: ws.id }); toast(r.found ? `${r.found} concurrent${r.found > 1 ? "s" : ""} trouvé${r.found > 1 ? "s" : ""} : choisis ceux à suivre` : "Aucun concurrent trouvé : ajoute-en un toi-même ci-dessus", r.found ? "good" : "default"); onDone(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-3xl border border-line bg-white p-6 sm:p-8 grid md:grid-cols-[minmax(0,1fr)_auto] gap-6 items-center">
      <div>
        <p className="font-black text-[26px] leading-tight" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>Pas besoin de lui donner tes concurrents : elle les trouve.</p>
        <p className="text-ink-soft mt-2 max-w-2xl">D'après ton offre, ta zone et tes cibles, l'espionne cherche les leaders, les acteurs de ta taille près de chez toi et les solutions alternatives. Tu choisis ensuite ceux qu'elle surveille ; elle fait leur rapport complet la nuit suivante.</p>
        <ol className="mt-4 grid sm:grid-cols-3 gap-2.5 text-[13px]">
          {[["1", "Elle trouve tes concurrents", "en 1 à 2 minutes"], ["2", "Tu choisis qui suivre", "un clic : Suivre ou Écarter"], ["3", "Elle enquête chaque nuit", "rapport complet, publicités, mouvements"]].map(([n, t, sub]) => (
            <li key={n} className="rounded-xl border border-line bg-paper/60 p-3 flex gap-3"><span className="grid place-items-center h-7 w-7 rounded-full text-white font-bold shrink-0" style={{ background: TEAL }}>{n}</span><span><span className="block font-semibold">{t}</span><span className="block text-ink-faint text-[12px]">{sub}</span></span></li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col items-center gap-2">
        <button onClick={go} disabled={busy} className="rounded-2xl px-6 py-4 font-bold text-white text-[15px] shadow-sm hover:brightness-110 disabled:opacity-60" style={{ background: TEAL }}>{busy ? "Elle cherche… (1 à 2 min)" : "Trouver mes concurrents maintenant"}</button>
        <p className="text-[12px] text-ink-faint text-center max-w-[220px]">Sinon, elle s'en chargera toute seule cette nuit.</p>
      </div>
    </div>
  );
}

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
function Competitors({ rows, onOpen, ws, onDone }) {
  const toast = useToast();
  const [busy, setBusy] = useState({});
  const analyse = async (e, c) => {
    e.stopPropagation();
    setBusy((b) => ({ ...b, [c.id]: true }));
    try {
      await fn("competitor-check", { workspace_id: ws.id, competitor_id: c.id, force: true });
      await fn("r/spy-social", { workspace_id: ws.id, competitor_id: c.id }).catch(() => null);
      toast(`Rapport de ${nameOf(c)} prêt`, "good"); onDone();
    } catch (err) { toast(err.message, "bad"); } finally { setBusy((b) => ({ ...b, [c.id]: false })); }
  };
  if (!rows.length) return <Empty>Choisis ci-dessus les concurrents à suivre : l'espionne fera leur rapport complet cette nuit.</Empty>;
  return (
    <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3.5">
      {rows.map((c) => {
        const s = c.summary ?? {};
        return (
          <div key={c.id} role="button" tabIndex={0} onClick={() => onOpen(c)} onKeyDown={(e) => e.key === "Enter" && onOpen(c)} className={cx("cursor-pointer text-left rounded-2xl border bg-white p-4 hover:border-accent/50 transition group min-w-0", busy[c.id] ? "border-accent/60" : "border-line")}>
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
            <p className="mt-3 flex items-center justify-between text-[11.5px] text-ink-faint">{busy[c.id] ? <span className="font-semibold text-accent-dark animate-pulse">Enquête en cours… (1 à 2 min)</span> : !c.summary ? <span className="flex items-center gap-2"><span className="font-semibold text-accent-dark">Rapport cette nuit</span><button onClick={(e) => analyse(e, c)} className="rounded-full bg-accent text-white px-2.5 py-1 text-[11.5px] font-semibold hover:bg-accent-dark">Analyser maintenant</button></span> : c.spy_due ? <span className="font-semibold text-accent-dark">Nouveau rapport cette nuit</span> : c.watched_at && new Date(c.watched_at).toDateString() === new Date().toDateString() ? `Contrôlé aujourd'hui · rapport ${ago(c.checked_at)}` : `Rapport ${ago(c.checked_at)}`}<span className="inline-flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition" style={{ color: TEAL }}>Ouvrir la fiche<Ico n="chev" className="w-3.5 h-3.5" /></span></p>
          </div>
        );
      })}
    </div>
  );
}

/* 2. Veille concurrentielle : chaque mouvement daté, sourcé, avec son importance */
/** Bibliothèque des e-mails des concurrents : l'adresse de veille à inscrire à leurs newsletters, puis tout ce qu'ils envoient, rangé et résumé. */
function RivalEmails({ ws, rows }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [who, setWho] = useState("all");
  useEffect(() => { fn("r/rival-emails", { workspace_id: ws.id }).then(setD).catch(() => setD({ address: "", emails: [] })); }, [ws.id]);
  if (!d) return null;
  const name = (id) => nameOf(rows.find((c) => c.id === id) ?? { name: "" }) || "Expéditeur non rattaché";
  const list = d.emails.filter((e) => who === "all" || e.competitor_id === who);
  const KIND = { promotion: "Promotion", lancement: "Lancement", contenu: "Contenu", evenement: "Événement", temoignage: "Témoignage", confirmation: "À confirmer", autre: "Autre" };
  const copy = async () => { try { await navigator.clipboard.writeText(d.address); toast("Adresse copiée", "good"); } catch { toast(d.address); } };
  return (
    <Panel title="Leurs e-mails" icon="mail" right={<span className="text-[12px] text-ink-faint">{d.emails.length} reçu{d.emails.length > 1 ? "s" : ""}</span>}>
      <div className="rounded-xl bg-paper/70 border border-line p-3.5 flex flex-wrap items-center gap-3">
        <p className="text-[13.5px] flex-1 min-w-[220px]">Inscris cette adresse aux newsletters de tes concurrents (sur leur site). Espion range et résume tout ce qu'ils envoient.</p>
        <code className="rounded-lg bg-white border border-line px-2.5 py-1.5 text-[12.5px] break-all">{d.address || "Adresse indisponible"}</code>
        {d.address && <button onClick={copy} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: TEAL }}>Copier</button>}
      </div>
      {d.emails.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{[["all", "Tous"], ...rows.filter((c) => d.emails.some((e) => e.competitor_id === c.id)).map((c) => [c.id, nameOf(c)])].map(([k, l]) => <button key={k} onClick={() => setWho(k)} className={cx("rounded-full px-3 py-1 text-[12.5px] font-semibold", who === k ? "bg-ink text-white" : "bg-paper text-ink-soft")}>{l}</button>)}</div>}
      {!list.length ? <p className="text-[13px] text-ink-faint mt-3">Aucun e-mail reçu pour l'instant.</p> : (
        <ul className="mt-3 divide-y divide-line">{list.slice(0, 30).map((e) => (
          <li key={e.id} className="py-3">
            <div className="flex items-center gap-2 flex-wrap"><span className="text-[12px] font-bold" style={{ color: TEAL }}>{name(e.competitor_id)}</span><span className={cx("rounded-full px-2 py-0.5 text-[11px] font-semibold", e.kind === "confirmation" ? "bg-accent-soft text-accent-dark" : "bg-paper text-ink-soft")}>{KIND[e.kind] ?? e.kind}</span><span className="text-[11.5px] text-ink-faint ml-auto">{new Date(e.received_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span></div>
            <p className="text-[14px] font-semibold mt-1">{e.subject}</p>
            {e.summary && <p className="text-[13px] text-ink-soft">{e.summary}{e.offer ? <b className="text-ink"> · {e.offer}</b> : null}</p>}
            {e.confirm_url && <a href={e.confirm_url} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-accent hover:underline">Confirmer l'inscription ↗</a>}
          </li>
        ))}</ul>
      )}
    </Panel>
  );
}

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

/* 3. Besoins détectés : demandes publiques (sources autorisées, sans nom de personne) + insatisfactions mesurées */
const FIAB = { haute: "text-good", moyenne: "text-[#B45309]", faible: "text-ink-faint" };
const INTENT = { recherche: "Cherche un prestataire", remplacement: "Veut changer de fournisseur", recommandation: "Demande une recommandation", projet: "Projet annoncé" };
function PublicNeeds({ ws }) {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => supabase.from("radar_opps").select("*").eq("workspace_id", ws.id).eq("kind", "besoin").neq("status", "ecarte").order("created_at", { ascending: false }).limit(40).then(({ data }) => setList(data ?? [])), [ws.id]);
  useEffect(() => { load(); }, [load]);
  const search = async () => {
    setBusy(true);
    try { const r = await fn("r/spy-needs", { workspace_id: ws.id }); await load(); toast(r?.found ? `${r.found} besoin${r.found > 1 ? "s" : ""} trouvé${r.found > 1 ? "s" : ""}` : "Rien de solide trouvé cette fois : relance la recherche quand tu veux", r?.found ? "good" : undefined); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const drop = async (o) => { await supabase.from("radar_opps").update({ status: "ecarte" }).eq("id", o.id); setList((x) => x.filter((y) => y.id !== o.id)); };
  const sorted = (list ?? []).slice().sort((a, b) => (b.raw?.pertinence ?? 0) - (a.raw?.pertinence ?? 0));
  return (
    <Panel title="Entreprises qui cherchent une solution" icon="search" right={<button onClick={search} disabled={busy} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: TEAL }}>{busy ? "Recherche… (1 à 2 min)" : "Chercher maintenant"}</button>}>
      <p className="text-[12.5px] text-ink-soft -mt-1 mb-3 leading-snug">Demandes publiques de moins de 60 jours : forums, communautés pro, sites de devis, presse. Jamais de nom de personne, seulement sa fonction. Pas de LinkedIn automatisé. Recherche automatique chaque semaine.</p>
      {!list ? <p className="text-sm text-ink-faint">Chargement…</p> : !sorted.length ? <Empty>Aucune demande publique repérée pour l'instant. Lance une recherche ou attends la prochaine nuit.</Empty> : (
        <ul className="space-y-2.5">
          {sorted.map((o) => (
            <li key={o.id} className="rounded-xl border border-line bg-paper/60 p-3.5">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="rounded-full bg-[#EDE9FE] text-[#6D28D9] px-2 py-0.5 font-semibold">{INTENT[o.raw?.intention] ?? "Besoin exprimé"}</span>
                {o.raw?.pertinence ? <span className="font-bold tnum" style={{ color: TEAL }}>{o.raw.pertinence}/100</span> : null}
                {o.raw?.fiabilite && <span className={FIAB[o.raw.fiabilite] ?? "text-ink-faint"}>Fiabilité {o.raw.fiabilite}</span>}
                <span className="text-ink-faint ml-auto">{o.published ? dateFr(o.published) : ago(o.created_at)}</span>
              </div>
              <p className="text-[14px] text-ink font-medium mt-1.5 leading-snug">{o.title}</p>
              <p className="text-[12.5px] text-ink-soft mt-0.5">{[o.company, o.raw?.auteur, o.city].filter(Boolean).join(" · ")}</p>
              {o.why && <p className="text-[13px] mt-2 leading-snug"><span className="font-semibold" style={{ color: TEAL }}>Comment l'aborder : </span>{o.why}</p>}
              <div className="mt-2 flex items-center gap-3"><Src href={o.url} /><button onClick={() => drop(o)} className="text-[12px] text-ink-faint hover:text-ink ml-auto">Écarter</button></div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Insatisfaction mesurée : les avis négatifs comptés par thème, avec période et source. */
function Dissatisfaction({ rows }) {
  const items = rows.flatMap((c) => (c.summary?.insatisfactions ?? []).map((x) => ({ c, ...x, n: Number(x.nombre_avis) || 0 }))).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...items.map((x) => x.n));
  const weak = rows.flatMap((c) => (c.summary?.faiblesses ?? []).map((f) => ({ c, t: txt(f), src: srcOf(f), fact: f?.type !== "hypothese" })));
  return (
    <Panel title="Insatisfaction mesurée chez leurs clients" icon="eye" right={<span className="text-[12px] text-ink-faint">{items.length ? `${items.reduce((n, x) => n + x.n, 0)} avis négatifs comptés` : `${weak.length} faiblesses`}</span>}>
      {items.length ? (
        <div className="overflow-x-auto -mx-1"><table className="w-full text-[13px] min-w-[560px]">
          <thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-faint"><th className="px-1 pb-2 font-semibold">Thème</th><th className="px-1 pb-2 font-semibold">Concurrent</th><th className="px-1 pb-2 font-semibold w-[150px]">Avis</th><th className="px-1 pb-2 font-semibold">Période</th><th className="px-1 pb-2 font-semibold">Ta réponse</th></tr></thead>
          <tbody>{items.slice(0, 16).map((x, i) => (
            <tr key={i} className="border-t border-line align-top">
              <td className="px-1 py-2.5 font-semibold text-ink">{txt(x.theme)}{x.exemples && <p className="font-normal text-[12px] text-ink-faint mt-0.5 line-clamp-2">« {txt(Array.isArray(x.exemples) ? x.exemples[0] : x.exemples)} »</p>}</td>
              <td className="px-1 py-2.5 text-ink-soft">{nameOf(x.c)}</td>
              <td className="px-1 py-2.5"><div className="flex items-center gap-2"><span className="h-2 rounded-full" style={{ width: `${Math.max(8, (x.n / max) * 90)}px`, background: x.n >= 3 ? TEAL : "#D6D3CB" }} /><span className="tnum font-semibold">{x.n}</span></div>{x.n < 3 && <p className="text-[11px] text-ink-faint">signal faible</p>}</td>
              <td className="px-1 py-2.5 text-ink-soft">{txt(x.periode) || "—"}</td>
              <td className="px-1 py-2.5 text-ink leading-snug">{txt(x.notre_reponse) || "—"}{x.sources && <div className="mt-1"><Src href={String(Array.isArray(x.sources) ? x.sources[0] : x.sources).split(/\s*;\s*/)[0]} /></div>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : !weak.length ? <Empty>Rien de mesuré pour l'instant. Le comptage des avis arrive avec le prochain rapport complet de chaque concurrent.</Empty> : (
        <>
          <p className="text-[12.5px] text-ink-faint mb-3">Le comptage par thème arrive avec le prochain rapport de nuit. En attendant, les faiblesses repérées :</p>
          <ul className="space-y-2.5">{weak.slice(0, 10).map((w, i) => (
            <li key={i} className="rounded-xl border border-line bg-paper/60 p-3">
              <div className="flex items-center gap-2 text-[12px]"><span className="rounded-full bg-paper px-2 py-0.5 text-ink-soft">{nameOf(w.c)}</span><span className={w.fact ? "text-accent" : "text-[#B45309]"}>{w.fact ? "Fait sourcé" : "Hypothèse"}</span></div>
              <p className="text-[13.5px] text-ink mt-1.5 leading-snug">{w.t}</p>{w.src && <div className="mt-1"><Src href={w.src} /></div>}
            </li>
          ))}</ul>
        </>
      )}
    </Panel>
  );
}

function Needs({ rows, ws }) {
  return <div className="space-y-4"><PublicNeeds ws={ws} /><Dissatisfaction rows={rows} /></div>;
}

/* 4a. Toi contre tous : une ligne par concurrent, les mêmes critères pour tous */
const short = (x, n = 70) => { const t = txt(x).replace(/\s+/g, " "); return !t || /^non (trouvé|affichés?|visible)/i.test(t) ? "" : t.length > n ? `${t.slice(0, n - 1)}…` : t; };
function VersusAll({ rows }) {
  const done = rows.filter((c) => c.summary);
  if (!done.length) return null;
  const score = (c) => { const cmp = c.summary.comparatif ?? []; return [cmp.filter((r) => r.avantage === "nous").length, cmp.filter((r) => r.avantage === "eux").length]; };
  const crit = {};
  done.forEach((c) => (c.summary.comparatif ?? []).forEach((r) => { const k = String(r.critere ?? "").trim().toLowerCase(); if (!k) return; crit[k] ??= { label: r.critere, nous: 0, eux: 0, egal: 0, who: [] }; const a = ["nous", "eux"].includes(r.avantage) ? r.avantage : "egal"; crit[k][a]++; if (a === "eux") crit[k].who.push(nameOf(c)); }));
  const crits = Object.values(crit).sort((a, b) => (b.nous + b.eux + b.egal) - (a.nous + a.eux + a.egal)).slice(0, 8);
  const Cell = ({ v }) => v ? <span className="text-ink">{v}</span> : <span className="text-ink-faint">inconnu</span>;
  return (
    <Panel title="Toi contre tous" icon="shield" right={<span className="text-[12px] text-ink-faint">{done.length} concurrent{done.length > 1 ? "s" : ""} comparé{done.length > 1 ? "s" : ""}</span>}>
      <div className="overflow-x-auto -mx-1"><table className="w-full text-[13px] min-w-[820px]">
        <thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-faint">
          {["Concurrent", "Menace", "Position", "Prix", "Taille", "Chiffre d'affaires", "Avis clients", "Comment ils vendent", "Toi / eux"].map((h) => <th key={h} className="px-1.5 pb-2 font-semibold whitespace-nowrap">{h}</th>)}
        </tr></thead>
        <tbody>{done.map((c) => { const S = c.summary, v = POS[S.position?.verdict] ?? POS.inconnu, [w, l] = score(c); return (
          <tr key={c.id} className="border-t border-line align-top">
            <td className="px-1.5 py-2.5"><div className="flex items-center gap-2"><Fav c={c} size="w-7 h-7" /><span className="font-semibold text-ink whitespace-nowrap">{nameOf(c)}</span></div></td>
            <td className="px-1.5 py-2.5"><Threat n={S.menace?.niveau} /></td>
            <td className="px-1.5 py-2.5"><span className={cx("rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap", v[1])}>{v[0]}</span></td>
            <td className="px-1.5 py-2.5 max-w-[150px]"><Cell v={short(S.prix?.affiches, 50)} /></td>
            <td className="px-1.5 py-2.5 max-w-[110px]"><Cell v={short(S.fiche?.effectif, 30)} /></td>
            <td className="px-1.5 py-2.5 max-w-[140px]"><Cell v={short(S.fiche?.chiffre_affaires, 45)} /></td>
            <td className="px-1.5 py-2.5 max-w-[170px]"><Cell v={short(S.avis?.clients, 60)} /></td>
            <td className="px-1.5 py-2.5 max-w-[190px]"><Cell v={short(S.acquisition?.methode, 70)} /></td>
            <td className="px-1.5 py-2.5 whitespace-nowrap font-bold tnum"><span style={{ color: TEAL }}>{w}</span><span className="text-ink-faint"> / </span><span className="text-bad">{l}</span></td>
          </tr>
        ); })}</tbody>
      </table></div>
      {crits.length > 0 && (
        <div className="mt-5">
          <p className="text-[12px] font-bold uppercase tracking-wider text-ink-soft mb-2.5">Critère par critère, face à tout le marché</p>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-2.5">
            {crits.map((k) => { const n = k.nous + k.eux + k.egal; return (
              <div key={k.label}>
                <div className="flex justify-between text-[13px]"><span className="font-medium text-ink truncate">{k.label}</span><span className="text-ink-faint text-[12px] shrink-0 ml-2">tu gagnes {k.nous} sur {n}</span></div>
                <div className="mt-1 flex h-2 rounded-full overflow-hidden bg-paper"><span style={{ width: `${(k.nous / n) * 100}%`, background: TEAL }} /><span style={{ width: `${(k.egal / n) * 100}%`, background: "#D6D3CB" }} /><span style={{ width: `${(k.eux / n) * 100}%`, background: "#DC2626" }} /></div>
                {k.who.length > 0 && <p className="text-[11.5px] text-ink-faint mt-0.5">Devant toi : {k.who.join(", ")}</p>}
              </div>
            ); })}
          </div>
        </div>
      )}
    </Panel>
  );
}

/* 4b. Apprentissage : ce qui marche vraiment, mesuré sur tes envois, réponses et rendez-vous */
const SENT = ["envoye", "repondu", "refus", "client"];
function Learning({ ws }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    Promise.all([
      supabase.from("prospects").select("id, target, status, insight").eq("workspace_id", ws.id).in("status", SENT).limit(2000),
      supabase.from("replies").select("prospect_id, class").eq("workspace_id", ws.id).limit(2000),
      supabase.from("meetings").select("prospect_id").eq("workspace_id", ws.id).limit(2000),
    ]).then(([{ data: p }, { data: r }, { data: m }]) => setD({ p: p ?? [], r: r ?? [], m: m ?? [] }));
  }, [ws.id]);
  if (!d) return null;
  const pos = new Set(d.r.filter((x) => ["interesse", "question", "prix", "rappel"].includes(x.class)).map((x) => x.prospect_id));
  const any = new Set(d.r.map((x) => x.prospect_id)), rdv = new Set(d.m.map((x) => x.prospect_id));
  const label = (t) => (ws.targets ?? []).find((x) => x.id === t || x.key === t)?.label ?? t ?? "Sans cible";
  const group = (keyOf) => {
    const g = {};
    d.p.forEach((p) => { const k = keyOf(p); if (!k) return; g[k] ??= { k, n: 0, rep: 0, pos: 0, rdv: 0 }; const x = g[k]; x.n++; if (any.has(p.id) || p.status === "repondu") x.rep++; if (pos.has(p.id)) x.pos++; if (rdv.has(p.id) || p.status === "client") x.rdv++; });
    return Object.values(g).sort((a, b) => b.n - a.n).slice(0, 8);
  };
  const byTarget = group((p) => label(p.target));
  const byAngle = group((p) => p.insight?.espion ? (p.insight.espion.concurrent ? `Face à ${p.insight.espion.concurrent}` : "Angle général Espion") : "Sans dossier Espion");
  const pct = (a, n) => n ? `${Math.round((a / n) * 100)} %` : "—";
  const Table = ({ title, rows }) => (
    <div className="min-w-0">
      <p className="text-[12px] font-bold uppercase tracking-wider text-ink-soft mb-2">{title}</p>
      <table className="w-full text-[13px]"><thead><tr className="text-left text-[11px] uppercase tracking-wider text-ink-faint"><th className="pb-1.5 font-semibold">Groupe</th><th className="pb-1.5 font-semibold text-right">Contactés</th><th className="pb-1.5 font-semibold text-right">Réponses</th><th className="pb-1.5 font-semibold text-right">Positives</th><th className="pb-1.5 font-semibold text-right">RDV</th></tr></thead>
        <tbody>{rows.map((x) => <tr key={x.k} className="border-t border-line"><td className="py-2 pr-2 text-ink truncate max-w-[180px]">{x.k}{x.n < 20 && <span className="block text-[11px] text-ink-faint">trop tôt pour conclure</span>}</td><td className="py-2 text-right tnum">{x.n}</td><td className="py-2 text-right tnum">{pct(x.rep, x.n)}</td><td className="py-2 text-right tnum font-semibold" style={{ color: TEAL }}>{pct(x.pos, x.n)}</td><td className="py-2 text-right tnum font-semibold">{pct(x.rdv, x.n)}</td></tr>)}</tbody>
      </table>
    </div>
  );
  return (
    <Panel title="Ce qui marche vraiment" icon="pulse" right={<span className="text-[12px] text-ink-faint">{d.p.length} prospects contactés</span>}>
      {!d.p.length ? <Empty>Dès les premiers envois, l'espionne mesure ici quelles cibles et quels angles obtiennent des réponses et des rendez-vous.</Empty> : (
        <>
          <div className="grid lg:grid-cols-2 gap-6"><Table title="Par cible" rows={byTarget} /><Table title="Par angle d'approche" rows={byAngle} /></div>
          <p className="text-[11.5px] text-ink-faint mt-3">Mesuré sur tes vrais envois. Une tendance n'est fiable qu'à partir d'une vingtaine de contacts par groupe.</p>
        </>
      )}
    </Panel>
  );
}

/* 4. Intelligence stratégique : pourquoi toi plutôt qu'eux */
function Strategy({ rows, ws }) {
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
      <VersusAll rows={rows} />
      <Learning ws={ws} />
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
  const dansLieu = useDansLieu();
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
      {/* En-tête : l'espionne, son état et sa mission de la nuit */}
      <div className="rounded-3xl bg-white border border-line p-5 sm:p-6 grid lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,330px)] gap-6 items-center">
        <div className="mx-auto lg:mx-0"><Spy working={working} /></div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[.2em]" style={{ color: TEAL }}>Centre de renseignement</p>
          <h1 className={cx("font-black text-[44px] sm:text-[52px] leading-none tracking-tight mt-1", dansLieu && "sr-only")} style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>Concurrents</h1>
          <p className="text-ink-soft mt-2 text-[16px]">Elle surveille tes concurrents jour et nuit, et te dit comment les battre.</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-paper/60 px-3 py-1.5 text-[13px]">
            <span className={cx("h-2 w-2 rounded-full", working ? "animate-pulse" : "")} style={{ background: working ? TEAL : "#1F7A4D" }} />
            <span className="text-ink truncate max-w-[520px]">{busy ?? (recent ? "Enquête en cours…" : "Pilote automatique actif")}</span>
          </p>
          <form onSubmit={add} className="mt-4 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-line bg-paper/60 px-3 focus-within:border-accent/60">
              <Ico n="search" className="w-4 h-4 text-ink-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tu en connais un ? Nom ou site web…" className="flex-1 bg-transparent py-3 text-[14.5px] outline-none placeholder:text-ink-faint" />
            </div>
            <button disabled={!!busy || !q.trim()} className="rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-40 transition hover:brightness-110" style={{ background: TEAL }}>Enquêter</button>
          </form>
        </div>
        <Tonight rows={list} proposed={proposed} ws={ws} />
      </div>

      {/* Les chiffres du renseignement */}
      {list.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white border border-line grid grid-cols-2 md:grid-cols-4 md:divide-x divide-line py-3">
          {[[list.length, "concurrents suivis"], [moves, "mouvements repérés"], [weak, "faiblesses à exploiter"], [cards, "dossiers commerciaux prêts"]].map(([n, l]) => (
            <div key={l} className="px-5 py-1.5"><p className="font-black text-[28px] leading-none tnum" style={{ color: TEAL, fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{n}</p><p className="text-[12.5px] text-ink-soft mt-1">{l}</p></div>
          ))}
        </div>
      )}
      {fresh > 0 && <p className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white" style={{ background: TEAL }}><Ico n="bell" className="w-4 h-4" />{fresh} concurrent{fresh > 1 ? "s ont" : " a"} bougé cette semaine</p>}

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
          : space === "concurrents" ? <div className="space-y-5"><Proposed list={proposed} ws={ws} onDone={load} />{!list.length && !proposed.length ? <FirstRun ws={ws} onDone={load} /> : <Competitors rows={list} onOpen={setDesk} ws={ws} onDone={load} />}</div>
          : space === "veille" ? <div className="space-y-4"><Report items={report} /><RivalEmails ws={ws} rows={list} /><Watch rows={list} /></div>
          : space === "besoins" ? <Needs rows={list} ws={ws} />
          : space === "strategie" ? <Strategy rows={list} ws={ws} />
          : <Dossiers rows={list} />}
      </div>

      {desk && <CompetitorDossier id={desk.id} onClose={() => setDesk(null)} onChanged={() => load()} />}
    </div>
  );
}
