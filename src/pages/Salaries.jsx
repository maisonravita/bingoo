import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { cx } from "../lib/utils";

// Les 9 salariés de Bingoo! : chacun est relié aux actions qu'il enregistre dans le journal d'activité.
// Paupières (position, couleurs) relevées sur chaque portrait : [centre x, centre y, rayon x, rayon y, haut, bas].
const EYES = {
  iris: [[49.5, 62.5, 7.8, 6.3, "#e39a6a", "#fdac76"], [77.5, 63.5, 7.8, 6.3, "#e09a69", "#f9ac75"]],
  leo: [[52.5, 62.5, 7.8, 6.3, "#e3a16f", "#fdb37c"], [78.5, 63.5, 7.8, 6.3, "#e3ac7e", "#fdc08d"]],
  sam: [[50.2, 63.5, 7.8, 6.3, "#d36f3b", "#eb7c42"], [79, 63, 7.8, 6.3, "#dd7a47", "#f6884f"]],
  max: [[49.5, 59, 7.8, 6.3, "#de9e70", "#f7b07d"], [75.5, 59.5, 7.8, 6.3, "#dba475", "#f4b783"]],
  hugo: [[51, 59.5, 7.8, 6.3, "#e5a777", "#ffba85"], [77, 59.5, 7.8, 6.3, "#e3ab80", "#fdbf8f"]],
  ines: [[53.5, 61, 7.8, 6.3, "#e3b181", "#fdc590"], [81, 62, 7.8, 6.3, "#dfa06f", "#f8b27c"]],
  lina: [[51.5, 60, 7.8, 6.3, "#df9b64", "#f8ad70"], [79, 60.5, 7.8, 6.3, "#dc9968", "#f5ab74"]],
  paul: [[50, 62.5, 7.8, 6.3, "#e3a475", "#fdb783"], [76.5, 63, 7.8, 6.3, "#e2b180", "#fcc58f"]],
  oscar: [[53, 62, 7.8, 6.3, "#cd733e", "#e48045"], [80, 62.5, 7.8, 6.3, "#d8834f", "#f19258"]],
};

const I = {
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  building: <><path d="M4 21V5l8-2v18M12 8h8v13M2 21h20" /><path d="M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  bars: <path d="M5 20v-6M10 20V9M15 20v-9M20 20V5M3 20h18" />,
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  li: <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M8 10.5V16M8 7.8v.01M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1 1 2.1 2.6V16" /></>,
  cal: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12" /><circle cx="12" cy="12" r="3" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  bubbles: <><path d="M3 5h12v8H7l-4 3z" /><path d="M17 9h4v8l-3-2h-6v-2" /></>,
};
const Ico = ({ n, className = "w-5 h-5" }) => <svg viewBox="0 0 24 24" className={cx(className, "shrink-0")} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{I[n]}</svg>;

const count = (rows, kinds, today) => rows.filter((r) => kinds.includes(r.kind) && (!today || new Date(r.created_at) >= today)).length;
const plural = (n, s, p = `${s}s`) => `${n} ${n > 1 ? p : s}`;

export const TEAM = [
  { id: "iris", first: "Iris", role: "Stratège", desc: "Analyse ton site et définit tes cibles et ta zone.", kinds: ["analyse", "intelligence", "mission"], icon: "target", to: "/reglages",
    metric: (d) => d.targets ? plural(d.targets, "cible définie", "cibles définies") : null },
  { id: "leo", first: "Léo", role: "Chercheur", desc: "Repère les entreprises à contacter dans les registres officiels.", kinds: ["recherche"], icon: "building", to: "/prospects",
    metric: (d) => d.newProspects ? plural(d.newProspects, "nouvel établissement", "nouveaux établissements") : null },
  { id: "sam", first: "Sam", role: "Enquêteur contacts", desc: "Trouve et vérifie les e-mails, téléphones et bons interlocuteurs ; explore d'autres canaux si nécessaire.", kinds: ["enquete", "enquete_plus", "credit_email"], icon: "user", to: "/prospects",
    metric: (d) => { const n = count(d.rows, ["enquete", "enquete_plus"], d.today); const f = d.rows.filter((r) => r.kind === "enquete" && new Date(r.created_at) >= d.today && /e-mail trouvé/i.test(r.summary)).length; return n ? `${plural(n, "enquête")}, ${plural(f, "e-mail trouvé", "e-mails trouvés")}` : null; } },
  { id: "max", first: "Max", role: "Analyste", desc: "Évalue chaque prospect et repère le bon moment pour le contacter.", kinds: ["radar", "radar_scan", "analyse_prospect"], icon: "bars", to: "/radar",
    metric: (d) => d.opps ? plural(d.opps, "opportunité à saisir", "opportunités à saisir") : null },
  { id: "hugo", first: "Hugo", role: "Responsable campagnes", desc: "Rédige les messages personnalisés, prépare les envois et les relances.", kinds: ["redaction", "envoi", "campagne"], icon: "send", to: "/valider",
    mode: (ws) => ws.autonomy === "auto" ? "Envoi automatique" : "Envoi sur validation",
    metric: (d) => { const n = count(d.rows, ["redaction"], d.today); return n ? plural(n, "e-mail rédigé aujourd'hui", "e-mails rédigés aujourd'hui") : d.drafts ? plural(d.drafts, "e-mail prêt à valider", "e-mails prêts à valider") : null; } },
  { id: "ines", first: "Inès", role: "Relation prospects", desc: "Analyse les réponses, prépare les réponses et repère les prospects intéressés.", kinds: ["reponse"], icon: "chat", to: "/reponses",
    metric: (d) => { const n = count(d.rows, ["reponse"], d.today); return n ? plural(n, "réponse analysée", "réponses analysées") : null; } },
  { id: "lina", first: "Lina", role: "Réseaux professionnels", desc: "Identifie les décideurs et prépare les prises de contact LinkedIn.", kinds: ["linkedin"], icon: "li", to: "/prospects",
    mode: () => "Messages à valider",
    metric: (d) => { const n = count(d.rows, ["linkedin"], d.today); return n ? plural(n, "profil préparé", "profils préparés") : null; } },
  { id: "paul", first: "Paul", role: "Assistant commercial", desc: "Prépare les rendez-vous, les fiches prospects et les devis.", kinds: ["rdv", "brief", "devis", "script"], icon: "cal", to: "/agenda",
    metric: (d) => { const n = count(d.rows, ["rdv", "brief", "devis", "script"], d.today); return n ? plural(n, "préparation", "préparations") + " aujourd'hui" : null; } },
  { id: "oscar", first: "Oscar", role: "Veilleur marché", desc: "Surveille les concurrents et repère les évolutions du marché.", kinds: ["veille", "espion"], icon: "eye", to: "/espion",
    metric: (d) => d.rivals ? plural(d.rivals, "concurrent suivi", "concurrents suivis") : null },
];
const WORKING_MS = 4 * 60000; // une action il y a moins de 4 minutes = au travail en ce moment

function Laptop({ id, skin }) {
  return (
    <g className="laptop-in">
      <defs>
        <linearGradient id={`pc-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eef0f3" /><stop offset="1" stopColor="#c7cad1" /></linearGradient>
        <linearGradient id={`hand-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={skin} /><stop offset="1" stopColor={skin} stopOpacity=".85" /></linearGradient>
        <radialGradient id={`glow-${id}`}><stop offset="0" stopColor="#E0531F" stopOpacity=".55" /><stop offset="1" stopColor="#E0531F" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="60" cy="155" rx="56" ry="5" fill="#000" opacity=".08" />
      {/* Socle et clavier, mains qui tapent de chaque côté de l'écran */}
      <path d="M6 147h108l-5 7H11z" fill="#b9bdc5" />
      <rect className="key-l" x="7" y="139" width="17" height="10" rx="5" fill={`url(#hand-${id})`} />
      <rect className="key-r" x="96" y="139" width="17" height="10" rx="5" fill={`url(#hand-${id})`} />
      {/* Dos de l'écran, légèrement incliné */}
      <path d="M23 104Q23 100 27 100H93Q97 100 97 104L101 145Q101 148 98 148H22Q19 148 19 145Z" fill={`url(#pc-${id})`} stroke="#a9adb5" strokeWidth=".7" />
      <path d="M27 101.2H93" stroke="#fff" strokeWidth="1.1" opacity=".9" strokeLinecap="round" />
      <circle cx="60" cy="124" r="13" fill={`url(#glow-${id})`} className="logo-glow" />
      <text x="60" y="129" textAnchor="middle" fontSize="14" fontWeight="900" fill="#E0531F" fontFamily="Nunito, Geist, sans-serif">B!</text>
      {/* Bulle « en train d'écrire » */}
      <g className="typing">
        <rect x="88" y="8" width="26" height="14" rx="7" fill="#fff" stroke="#e7e5df" />
        <circle cx="95" cy="15" r="1.7" fill="#E0531F" /><circle cx="101" cy="15" r="1.7" fill="#E0531F" /><circle cx="107" cy="15" r="1.7" fill="#E0531F" />
      </g>
    </g>
  );
}

/** Portrait qui cligne des yeux ; au travail, il regarde son écran et tape sur son ordinateur. */
export function Avatar({ id, working, className = "w-[112px] h-[144px]" }) {
  const seed = id.charCodeAt(0) + id.length * 7;
  const period = 4.2 + (seed % 9) * 0.35, delay = -((seed * 37) % 50) / 10;
  return (
    <div className={cx("relative shrink-0 select-none", className)}>
      <svg viewBox="0 0 120 154" className="w-full h-full overflow-visible" aria-hidden>
        <g className={working ? "agent-bob" : ""}>
          <image href={`/salaries/${id}.png`} x="0" y="0" width="120" height="154" />
          {working && <ellipse cx="64" cy="78" rx="38" ry="34" fill="#ffd9b8" opacity=".18" className="screen-light" />}
          <defs>
            {EYES[id].map((e, i) => (
              <linearGradient key={i} id={`lid-${id}-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={e[4]} /><stop offset="1" stopColor={e[5]} /></linearGradient>
            ))}
          </defs>
          {EYES[id].map(([x, y, rx, ry], i) => (
            <g key={i} className={cx("lid", working && "lid-down")} style={{ transformOrigin: `${x}px ${y - ry}px`, animationDuration: `${period}s`, animationDelay: `${delay}s` }}>
              <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#lid-${id}-${i})`} />
              <path d={`M${x - rx + 0.8} ${y + ry * 0.35}Q${x} ${y + ry * 1.05} ${x + rx - 0.8} ${y + ry * 0.35}`} stroke="#3b2418" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            </g>
          ))}
        </g>
        {working && <Laptop id={id} skin={EYES[id][0][5]} />}
      </svg>
    </div>
  );
}

function Status({ state }) {
  const s = {
    travail: ["Au travail", "bg-accent-soft text-accent-dark", "bg-accent pulse-dot"],
    aujourdhui: ["A travaillé aujourd'hui", "bg-good-soft text-good", "bg-good"],
    veille: ["En veille", "bg-[#EFEEEA] text-ink-soft", "bg-ink-soft"],
  }[state];
  return <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium", s[1])}><span className={cx("w-1.5 h-1.5 rounded-full", s[2])} />{s[0]}</span>;
}

export function AgentCard({ a, d, ws }) {
  const mine = d.rows.filter((r) => a.kinds.includes(r.kind));
  const last = mine[0];
  const working = !!last && Date.now() - new Date(last.created_at).getTime() < WORKING_MS;
  const state = working ? "travail" : mine.some((r) => new Date(r.created_at) >= d.today) ? "aujourdhui" : "veille";
  const metric = a.metric(d) ?? (last ? last.summary : null);
  return (
    <Link to={a.to} className="group bg-white rounded-2xl border border-line p-3.5 pr-4 flex gap-3.5 hover:border-ink/25 hover:shadow-sm transition" title={last ? `Dernière action : ${last.summary}` : undefined}>
      <div className="relative shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5">
        <Avatar id={a.id} working={working} />
        {/* Bulle « en train d'écrire » quand le salarié travaille */}
        {working && <span className="pop absolute -top-1 right-0 rounded-full bg-white border border-line shadow-sm px-2 py-1 inline-flex gap-0.5">{[0, 1, 2].map((k) => <span key={k} className="w-1 h-1 rounded-full bg-accent typing-dot" style={{ animationDelay: `${k * 0.15}s` }} />)}</span>}
      </div>
      <div className="min-w-0 flex-1 pt-2">
        <p className="text-[19px] font-bold leading-tight">{a.first}</p>
        <p className="text-[14.5px] text-ink-soft mt-0.5">{a.role}</p>
        <p className="text-[13.5px] text-ink-soft leading-snug mt-2">{a.desc}</p>
        {a.mode && <p className="text-[11.5px] text-ink-faint mt-2 flex items-center gap-1"><Ico n="bolt" className="w-3 h-3" />{a.mode(ws)}</p>}
        <div className="mt-2.5"><Status state={state} /></div>
        <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-soft"><Ico n={a.icon} className="w-[18px] h-[18px] text-ink" /><span className="truncate">{metric ?? "Pas encore d'activité"}</span></p>
      </div>
    </Link>
  );
}


/** Visage rond d'un salarié (portrait recadré sur la tête). */
function Head({ id, className = "w-9 h-9" }) {
  return <span aria-hidden className={cx("shrink-0 rounded-full bg-[#eef3f8] bg-no-repeat", className)} style={{ backgroundImage: `url(/salaries/${id}.png)`, backgroundSize: "135% auto", backgroundPosition: "50% 30%" }} />;
}
const NAMES = Object.fromEntries(TEAM.map((a) => [a.first.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), a]));
/** La réponse de l'équipe, une bulle par salarié (« Max : … »). Nettoie toute mise en forme restante. */
function splitTeam(text) {
  const clean = (t) => t.replace(/\*\*|__|^#+\s*/gm, "").replace(/^\s*[-•]\s+/gm, "").trim();
  const out = [];
  for (const line of String(text ?? "").split("\n")) {
    const m = line.match(/^\s*\**([A-Za-zÀ-ÿ]+)\**\s*:\s*(.*)$/);
    const a = m && NAMES[m[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()];
    if (a) out.push({ who: a.id, text: m[2] });
    else if (out.length) out[out.length - 1].text += "\n" + line;
    else if (line.trim()) out.push({ who: "iris", text: line });
  }
  return out.map((b) => ({ ...b, text: clean(b.text) })).filter((b) => b.text);
}
function Said({ who, text, error }) {
  const a = TEAM.find((x) => x.id === who) ?? TEAM[0];
  return (
    <div className="flex items-end gap-2.5 max-w-[88%]">
      <Head id={a.id} />
      <div className="min-w-0">
        <p className="text-[11.5px] text-ink-faint mb-1 ml-1"><span className="font-semibold text-ink-soft">{a.first}</span> · {a.role}</p>
        <div className={cx("rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap", error ? "border-bad/30 bg-bad-soft text-bad" : "border-line bg-paper")}>{text}</div>
      </div>
    </div>
  );
}

const IDEAS = ["Que dois-je prioriser aujourd'hui ?", "Trouve-moi des opportunités dans ma région", "Analyse mes concurrents"];
const KEY = (id) => `bingoo:assistant:${id}`;
const loadMsgs = (id) => { try { return JSON.parse(sessionStorage.getItem(KEY(id)) || "[]"); } catch { return []; } };
const saveMsgs = (id, m) => { try { sessionStorage.setItem(KEY(id), JSON.stringify(m.slice(-30))); } catch { /* stockage indisponible */ } };

export default function Salaries() {
  const { ws } = useWs();
  const [d, setD] = useState(null);
  const [msgs, setMsgs] = useState(() => loadMsgs(ws.id));
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef(null), end = useRef(null);

  const load = useCallback(async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const head = (t) => supabase.from(t).select("id", { count: "exact", head: true }).eq("workspace_id", ws.id);
    const [act, np, op, rv, dr] = await Promise.all([
      supabase.from("activity").select("kind, summary, created_at").eq("workspace_id", ws.id).gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()).order("created_at", { ascending: false }).limit(800),
      head("prospects").gte("created_at", today.toISOString()),
      head("radar_opps").eq("status", "nouveau"),
      head("competitors"),
      head("messages").eq("status", "brouillon"),
    ]);
    setD({ today, rows: act.data ?? [], newProspects: np.count ?? 0, opps: op.count ?? 0, rivals: rv.count ?? 0, drafts: dr.count ?? 0, targets: (ws.targets ?? []).length });
  }, [ws.id, ws.targets]);
  useEffect(() => { load(); const t = setInterval(load, busy ? 4000 : 15000); window.addEventListener("kairo:refresh", load); return () => { clearInterval(t); window.removeEventListener("kairo:refresh", load); }; }, [load, busy]);
  useEffect(() => { setMsgs(loadMsgs(ws.id)); }, [ws.id]);
  useEffect(() => { saveMsgs(ws.id, msgs); if (msgs.length) end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, ws.id]);

  const send = async (text) => {
    const t = (text ?? q).trim();
    if (!t || busy) return;
    const next = [...msgs, { role: "user", text: t }];
    setMsgs(next); setQ(""); setBusy(true);
    try {
      const r = await fn("a/chat", { workspace_id: ws.id, messages: next.map(({ role, text }) => ({ role, text })) });
      setMsgs([...next, { role: "assistant", text: r.reply, steps: r.steps ?? [], links: r.links ?? [] }]);
      window.dispatchEvent(new Event("kairo:refresh"));
    } catch (e) {
      setMsgs([...next, { role: "assistant", text: e.message, error: true }]);
    } finally { setBusy(false); }
  };
  const talk = () => { input.current?.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => input.current?.focus(), 300); };

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }} className="font-black text-[40px] leading-none tracking-tight">Vos salariés</h1>
          <p className="text-ink-soft mt-2.5 text-[16px]">Une équipe qui travaille avec toi pour trouver et convertir de nouvelles opportunités.</p>
        </div>
        <button onClick={talk} className="inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent-dark text-white px-6 py-3 font-medium shadow-sm transition"><Ico n="chat" />Parler à l'équipe</button>
      </header>

      <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {TEAM.map((a) => d ? <AgentCard key={a.id} a={a} d={d} ws={ws} /> : <div key={a.id} className="bg-white rounded-2xl border border-line h-[172px] animate-pulse" />)}
      </div>

      <section className="mt-4 bg-white rounded-2xl border border-line p-4 md:p-5">
        {!!msgs.length && (
          <div className="mb-4 max-h-[420px] overflow-y-auto space-y-3 pr-1">
            {msgs.map((m, i) => m.role === "user" ? (
              <div key={i} className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-br-md bg-ink text-white px-4 py-2.5 text-sm whitespace-pre-wrap">{m.text}</div></div>
            ) : m.error ? (
              <Said key={i} who="iris" text={m.text} error />
            ) : (
              <div key={i} className="space-y-2.5">
                {!!m.steps?.length && <p className="text-[11.5px] text-ink-faint pl-12">{[...new Set(m.steps.map((s) => s.label))].join(" · ")}</p>}
                {splitTeam(m.text).map((b, j) => <Said key={j} who={b.who} text={b.text} />)}
                {!!m.links?.length && <div className="pl-12 flex flex-wrap gap-2">{m.links.map((l) => <Link key={l.to} to={l.to} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium hover:border-ink/40">{l.label} ›</Link>)}</div>}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2">{["iris", "max", "hugo"].map((id) => <Head key={id} id={id} className="w-8 h-8 ring-2 ring-white" />)}</div>
                <span className="rounded-2xl rounded-bl-md bg-paper border border-line px-3.5 py-2.5 inline-flex gap-1">{[0, 1, 2].map((k) => <span key={k} className="w-1.5 h-1.5 rounded-full bg-ink-faint typing-dot" style={{ animationDelay: `${k * 0.15}s` }} />)}</span>
                <span className="text-xs text-ink-faint">L'équipe s'en occupe…</span>
              </div>
            )}
            <div ref={end} />
          </div>
        )}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-3 lg:w-[38%] shrink-0">
            <span className="w-12 h-12 rounded-full bg-accent-soft text-accent grid place-items-center"><Ico n="bubbles" className="w-6 h-6" /></span>
            <div><p className="font-bold">Discute avec ton équipe</p><p className="text-[12.5px] text-ink-soft">Pose une question, donne un objectif ou demande une action à tes salariés.</p></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white pl-3 pr-1.5 py-1.5 focus-within:border-ink/40">
              <Ico n="spark" className="w-4 h-4 text-ink-soft" />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
                placeholder="Écris ton message ici…" className="flex-1 min-w-0 bg-transparent py-1.5 text-sm outline-none" />
              <button aria-label="Envoyer" disabled={busy || !q.trim()} onClick={() => send()} className={cx("w-11 h-9 rounded-lg grid place-items-center text-white transition", q.trim() && !busy ? "bg-accent hover:bg-accent-dark" : "bg-ink/20")}><Ico n="send" className="w-4 h-4" /></button>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {IDEAS.map((s) => <button key={s} disabled={busy} onClick={() => send(s)} className="rounded-full bg-accent-soft text-accent-dark px-3 py-1 text-[12px] font-medium hover:bg-accent hover:text-white transition disabled:opacity-50">{s}</button>)}
              {!!msgs.length && <button className="text-xs text-ink-faint underline ml-auto" onClick={() => setMsgs([])}>Nouvelle conversation</button>}
            </div>
          </div>
        </div>
      </section>
      <p className="mt-3 text-xs text-ink-faint">Rien n'est envoyé à un prospect sans ta validation.</p>
    </div>
  );
}
