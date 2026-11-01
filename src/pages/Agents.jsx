import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Card, PageHead, Spinner } from "../components/ui";
import { cx } from "../lib/utils";

// Chaque agent correspond à un type d'action enregistré dans le journal d'activité.
export const AGENTS = [
  { id: "stratege", first: "Iris", name: "Stratège", role: "Lit ton site, définit tes cibles et ta zone", kinds: ["analyse"], to: "/reglages", auto: false },
  { id: "chercheur", first: "Léo", name: "Chercheur", role: "Trouve les entreprises à contacter dans le registre officiel", kinds: ["recherche"], to: "/prospects", auto: true, limit: 60 },
  { id: "enqueteur", first: "Sam", name: "Enquêteur", role: "Cherche l'e-mail pro, le téléphone et le bon contact", kinds: ["enquete"], to: "/prospects", auto: true, limit: 40 },
  { id: "detective", first: "Nora", name: "Détective", role: "Creuse quand l'e-mail est introuvable, vérifie chaque adresse et choisit un autre canal", kinds: ["enquete_plus", "credit_email", "lettre"], to: "/prospects", auto: true, limit: 30 },
  { id: "analyste", first: "Max", name: "Analyste", role: "Note chaque prospect et repère le bon moment", kinds: ["analyse_prospect"], to: "/prospects", auto: false, limit: 40 },
  { id: "redacteur", first: "Hugo", name: "Rédacteur", role: "Écrit des e-mails personnalisés pour chaque prospect", kinds: ["redaction"], to: "/valider", auto: true, limit: 80 },
  { id: "expediteur", first: "Tom", name: "Expéditeur", role: "Envoie depuis ton domaine, en respectant la limite du jour", kinds: ["envoi"], to: "/valider", auto: true },
  { id: "relanceur", first: "Lou", name: "Relanceur", role: "Prépare les relances à J+4 et J+9, s'arrête dès qu'on répond", kinds: [], to: "/valider", auto: true },
  { id: "reponses", first: "Inès", name: "Analyste réponses", role: "Lit chaque réponse, la classe et prépare ta réponse", kinds: ["reponse"], to: "/reponses", auto: true, limit: 60 },
  { id: "linkedin", first: "Lina", name: "Agent LinkedIn", role: "Trouve le décideur et prépare invitation et message", kinds: ["linkedin"], to: "/linkedin", auto: false, limit: 30 },
  { id: "rdv", first: "Paul", name: "Préparateur RDV", role: "Prend les rendez-vous et prépare une fiche avant chacun", kinds: ["rdv", "brief"], to: "/agenda", auto: true, limit: 20 },
  { id: "devis", first: "Eva", name: "Agent devis", role: "Envoie tes devis et te prévient dès qu'ils sont signés", kinds: ["devis"], to: "/devis", auto: false },
  { id: "veilleur", first: "Oscar", name: "Veilleur", role: "Surveille tes concurrents et prépare tes battlecards", kinds: ["veille"], to: "/espion", auto: false, limit: 20 },
];

const GLYPH = {
  stratege: "M12 3l2.6 5.6L20 9.5l-4 4 1 5.8L12 16.6 7 19.3l1-5.8-4-4 5.4-.9z",
  chercheur: "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM16 16l5 5",
  enqueteur: "M4 6h16v12H4zM4 7l8 6 8-6",
  detective: "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM16 16l5 5M7.5 10.5h6M10.5 7.5v6",
  analyste: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  redacteur: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  expediteur: "M3 11 21 3l-8 18-2-8z",
  relanceur: "M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5",
  reponses: "M3.5 13.5 6 5h12l2.5 8.5V19H3.5zM3.5 13.5H9l1 2h4l1-2h5.5",
  linkedin: "M3.5 3.5h17v17h-17zM8 10.5V16M8 7.8v.01M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1 1 2.1 2.6V16",
  rdv: "M3.5 5h17v15h-17zM3.5 10h17M8 3v4M16 3v4",
  coach: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  devis: "M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6",
  campagne: "M12 20.5a8.5 8.5 0 1 1 0-17 8.5 8.5 0 0 1 0 17zM12 16.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zM12 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z",
  social: "M6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6",
  veilleur: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};

const ago = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "hier" : `il y a ${d} j`;
};
const hhmm = (iso) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** Prochain passage du pilote : toutes les 20 min, en semaine, de 8 h à 18 h (heure de Paris). */
function nextRun(now = new Date()) {
  const t = new Date(now);
  t.setSeconds(0, 0);
  t.setMinutes(Math.floor(t.getMinutes() / 20) * 20 + 20);
  for (let i = 0; i < 24 * 3 * 8; i++) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(t).map((x) => [x.type, x.value]));
    if (!["Sat", "Sun"].includes(p.weekday) && +p.hour >= 8 && +p.hour < 18) return t;
    t.setMinutes(t.getMinutes() + 20);
  }
  return null;
}

function Glyph({ id, className }) {
  return <svg viewBox="0 0 24 24" className={cx("w-5 h-5", className)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={GLYPH[id]} /></svg>;
}

export default function Agents() {
  const { ws } = useWs();
  const [data, setData] = useState(null);
  const [focus, setFocus] = useState(null);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [act, recent, fu] = await Promise.all([
      supabase.from("activity").select("kind, summary, created_at").eq("workspace_id", ws.id).gte("created_at", today.toISOString()).order("created_at", { ascending: false }).limit(1000),
      supabase.from("activity").select("kind, summary, created_at").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(300),
      supabase.from("messages").select("status, created_at, sent_at").eq("workspace_id", ws.id).gt("step", 0).order("created_at", { ascending: false }).limit(500),
    ]);
    setData({ today: act.data ?? [], recent: recent.data ?? [], followups: fu.data ?? [], at: Date.now() });
  }, [ws.id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    const c = setInterval(() => tick((x) => x + 1), 30000);
    window.addEventListener("kairo:refresh", load);
    return () => { clearInterval(t); clearInterval(c); window.removeEventListener("kairo:refresh", load); };
  }, [load]);

  const agents = useMemo(() => {
    if (!data) return [];
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return AGENTS.map((a) => {
      let last, count;
      if (a.id === "relanceur") {
        const created = data.followups.filter((m) => new Date(m.created_at) >= start);
        const sent = data.followups.filter((m) => m.sent_at && new Date(m.sent_at) >= start);
        const latest = data.followups[0];
        last = latest ? { created_at: latest.sent_at && latest.sent_at > latest.created_at ? latest.sent_at : latest.created_at, summary: latest.sent_at ? "Relance envoyée" : "Relance préparée" } : null;
        count = created.length + sent.length;
      } else {
        last = data.recent.find((x) => a.kinds.includes(x.kind)) ?? null;
        count = data.today.filter((x) => a.kinds.includes(x.kind)).length;
      }
      const age = last ? Date.now() - new Date(last.created_at).getTime() : Infinity;
      const state = age < 3 * 60000 ? "live" : count > 0 ? "today" : "idle";
      return { ...a, last, count, state };
    });
  }, [data]);

  if (!data) return <Spinner />;
  const auto = ws.autonomy === "auto";
  const next = nextRun();
  const live = agents.filter((a) => a.state === "live").length;
  const actions = data.today.length + (agents.find((a) => a.id === "relanceur")?.count ?? 0);
  const feed = (focus ? data.recent.filter((x) => AGENTS.find((a) => a.id === focus)?.kinds.includes(x.kind)) : data.recent).slice(0, 40);
  const agentOf = (kind) => AGENTS.find((a) => a.kinds.includes(kind));

  return (
    <div>
      <PageHead title="Tes agents" sub="Ce sont des agents logiciels, pas des personnes. Chacun fait une tâche précise, dans les limites de ta formule, et tout ce qu'il fait est écrit ci-dessous." />

      <Card className={cx("p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4", auto ? "!bg-ink text-white !border-ink" : "")}>
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            <span className={cx("w-2.5 h-2.5 rounded-full", auto ? "bg-good pulse-dot" : "bg-ink-faint")} />
            {auto ? "Pilote automatique actif" : "Pilote automatique en pause"}
          </p>
          <p className={cx("text-sm mt-1", auto ? "text-white/70" : "text-ink-soft")}>
            {auto
              ? <>Les agents marqués « auto » travaillent seuls toutes les 20 minutes, en semaine de 8 h à 18 h.{next && <> Prochain passage : <b className="text-white">{next.toLocaleDateString("fr-FR", { weekday: "long" })} à {hhmm(next)}</b>.</>}</>
              : <>Les agents préparent le travail, tu valides chaque envoi. Active le mode automatique dans Réglages pour qu'ils travaillent seuls.</>}
          </p>
        </div>
        <div className="flex gap-6 shrink-0">
          <div><p className={cx("text-xs", auto ? "text-white/60" : "text-ink-soft")}>En action</p><p className="font-serif text-3xl tnum">{live}</p></div>
          <div><p className={cx("text-xs", auto ? "text-white/60" : "text-ink-soft")}>Actions aujourd'hui</p><p className="font-serif text-3xl tnum">{actions}</p></div>
        </div>
        {!auto && <Link to="/reglages" className="shrink-0 rounded-full bg-ink text-white px-4 py-2 text-sm font-semibold text-center">Activer</Link>}
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
        {agents.map((a) => (
          <button key={a.id} onClick={() => setFocus(focus === a.id ? null : a.id)}
            className={cx("w-full min-w-0 text-left bg-white border rounded-2xl p-4 transition hover:border-ink-faint rise", focus === a.id ? "border-ink ring-1 ring-ink" : "border-line")}>
            <div className="flex items-start gap-3">
              <span className={cx("relative grid place-items-center w-10 h-10 rounded-xl shrink-0", a.state === "live" ? "bg-accent text-white" : a.state === "today" ? "bg-ink text-white" : "bg-paper text-ink-soft")}>
                <Glyph id={a.id} />
                {a.state === "live" && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-good border-2 border-white pulse-dot" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold flex items-center gap-1.5">{a.first} <span className="font-normal text-ink-soft">· {a.name}</span><span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent-soft text-accent-dark">Agent IA</span></p>
                  {a.auto && <Badge tone={auto ? "good" : "muted"}>auto</Badge>}
                </div>
                <p className="text-[13px] text-ink-soft leading-snug mt-0.5">{a.role}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-line flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className={cx("text-xs font-semibold", a.state === "live" ? "text-accent" : a.state === "today" ? "text-ink" : "text-ink-faint")}>
                  {a.state === "live" ? "En action" : a.state === "today" ? "A travaillé aujourd'hui" : "En veille"}
                </p>
                <p className="text-[13px] text-ink-soft truncate">{a.last ? `${a.last.summary} · ${ago(a.last.created_at)}` : "Pas encore d'activité"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-serif text-2xl leading-none tnum">{a.count}</p>
                <p className="text-[11px] text-ink-faint">{a.limit ? `/ ${a.limit} auj.` : "auj."}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-end justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
          {focus ? `Journal · ${AGENTS.find((a) => a.id === focus).first} (${AGENTS.find((a) => a.id === focus).name})}` : "Journal en direct"}
        </h2>
        <div className="flex items-center gap-3 text-sm">
          {focus && <button className="text-ink-soft hover:text-ink" onClick={() => setFocus(null)}>Tout voir</button>}
          {focus && <Link className="font-semibold text-accent" to={AGENTS.find((a) => a.id === focus).to}>Ouvrir →</Link>}
        </div>
      </div>
      {feed.length === 0 ? (
        <Card className="p-8 text-center text-ink-soft text-sm">{focus === "relanceur" ? "Les relances apparaissent dans « À valider » et dans les compteurs ci-dessus." : "Rien pour l'instant. Dès qu'un agent travaille, tu le vois ici."}</Card>
      ) : (
        <Card className="divide-y divide-line">
          {feed.map((x, i) => {
            const a = agentOf(x.kind);
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="grid place-items-center w-8 h-8 rounded-lg bg-paper text-ink-soft shrink-0">{a && <Glyph id={a.id} className="w-4 h-4" />}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate"><span className="font-semibold">{a?.name ?? x.kind}</span> <span className="text-ink-soft">· {x.summary}</span></p>
                </div>
                <span className="text-xs text-ink-faint shrink-0 tnum" title={new Date(x.created_at).toLocaleString("fr-FR")}>{ago(x.created_at)}</span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
