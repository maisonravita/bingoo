import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useJob } from "../lib/useJob";
import { Button, Card, useToast } from "../components/ui";
import { cx, fmtTime, plural } from "../lib/utils";
import { fmtN } from "../lib/zones";
import { AGENTS } from "./Agents";

const FUNNEL = [
  { key: "found", label: "Trouvés" },
  { key: "email", label: "Joignables" },
  { key: "sent", label: "Contactés" },
  { key: "replied", label: "Réponses" },
  { key: "rdv", label: "RDV" },
  { key: "client", label: "Clients" },
];

function Action({ tone = "default", title, sub, children }) {
  return (
    <div className={cx("rise flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border p-4 sm:p-5", tone === "hot" ? "bg-ink text-white border-ink" : "bg-white border-line")}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[16px]">{title}</p>
        {sub && <p className={cx("text-sm mt-0.5", tone === "hot" ? "text-white/65" : "text-ink-soft")}>{sub}</p>}
      </div>
      <div className="flex gap-2 shrink-0">{children}</div>
    </div>
  );
}

function Opportunities() {
  const { ws } = useWs();
  const [items, setItems] = useState(null);
  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      const old = new Date(Date.now() - 4 * 86400000).toISOString();
      const [due, quotes, meet, reps] = await Promise.all([
        supabase.from("prospects").select("id, name, next_action, next_action_at, phone, status").eq("workspace_id", ws.id).lte("next_action_at", today).not("status", "in", "(ignore)").order("next_action_at").limit(8),
        supabase.from("quotes").select("id, number, total_ht, sent_at, status, prospects(name)").eq("workspace_id", ws.id).in("status", ["envoye", "vu"]).lt("sent_at", old).limit(5),
        supabase.from("meetings").select("id, company, starts_at").eq("workspace_id", ws.id).eq("status", "confirme").gte("starts_at", t0.toISOString()).lt("starts_at", new Date(t0.getTime() + 86400000).toISOString()).order("starts_at"),
        supabase.from("replies").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("handled", false),
      ]);
      setItems({ due: due.data ?? [], quotes: quotes.data ?? [], meet: meet.data ?? [], reps: reps.count ?? 0 });
    })();
  }, [ws.id]);
  if (!items) return null;
  const late = (d) => Math.round((Date.now() - new Date(d).getTime()) / 86400000);
  const any = items.due.length || items.quotes.length || items.meet.length || items.reps;
  if (!any) return null;
  return (
    <div className="space-y-3 mb-3">
      {items.meet.map((m) => (
        <Action key={m.id} tone="hot" title={`RDV à ${new Date(m.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · ${m.company}`} sub="La fiche de préparation t'attend dans l'agenda.">
          <Link to="/agenda"><Button variant="accent">Préparer</Button></Link>
        </Action>
      ))}
      {items.reps > 0 && (
        <Action tone="hot" title={`${plural(items.reps, "réponse à traiter", "réponses à traiter")}`} sub="Triées par l'IA, avec une réponse prête à envoyer.">
          <Link to="/reponses"><Button variant="accent">Répondre</Button></Link>
        </Action>
      )}
      {(items.due.length > 0 || items.quotes.length > 0) && (
        <div className="rise rounded-2xl border border-line bg-white p-4 sm:p-5">
          <p className="font-semibold text-[16px]">Occasions à ne pas laisser filer</p>
          <ul className="mt-3 divide-y divide-line">
            {items.quotes.map((q) => (
              <li key={q.id} className="py-2.5 flex items-center gap-3 text-sm">
                <span className="flex-1"><b>{q.prospects?.name}</b> — devis {q.number} {q.status === "vu" ? "ouvert" : "envoyé"} il y a {late(q.sent_at)} jours, sans signature</span>
                <Link to="/devis" className="text-accent font-semibold whitespace-nowrap">Relancer</Link>
              </li>
            ))}
            {items.due.map((p) => (
              <li key={p.id} className="py-2.5 flex items-center gap-3 text-sm">
                <span className="flex-1"><b>{p.name}</b> — {p.next_action || "À suivre"}{late(p.next_action_at) > 0 ? <span className="text-bad"> · en retard de {late(p.next_action_at)} j</span> : ""}</span>
                {p.phone ? <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="text-accent font-semibold whitespace-nowrap">Appeler</a> : <Link to="/prospects" className="text-accent font-semibold">Ouvrir</Link>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Ce que l'équipe IA a réellement fait aujourd'hui (journal d'activité). */
/** Détecter : les opportunités repérées par le Radar, en tête de journée. */
function Detected() {
  const { ws } = useWs();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    supabase.from("radar_opps").select("id, kind, company, summary, city, created_at").eq("workspace_id", ws.id).eq("status", "nouveau").order("created_at", { ascending: false }).limit(4).then(({ data }) => setRows(data ?? []));
  }, [ws.id]);
  if (!rows?.length) return null;
  const KIND = { recrutement: "Recrute", croissance: "Se développe", appel_offres: "Appel d'offres" };
  return (
    <Card className="p-4 sm:p-5 mb-6 border-accent/30">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">Détecté pour toi</h2>
        <Link to="/radar" className="text-sm text-ink-soft hover:text-ink">Tout le Radar ›</Link>
      </div>
      <p className="text-sm text-ink-soft mt-1">Des entreprises qui ont une raison concrète d'acheter maintenant. Ta mission en cours prend en priorité celles qui sont dans sa zone.</p>
      <ul className="mt-3 divide-y divide-line">{rows.map((o) => (
        <li key={o.id} className="py-2.5 flex items-start gap-3 text-sm">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide rounded-full bg-accent-soft text-accent-dark px-2 py-0.5 mt-0.5">{KIND[o.kind] ?? o.kind}</span>
          <span className="min-w-0"><b>{o.company}</b>{o.city ? <span className="text-ink-faint"> · {o.city}</span> : null}<span className="block text-ink-soft truncate">{o.summary}</span></span>
        </li>
      ))}</ul>
    </Card>
  );
}

function TeamToday() {
  const { ws } = useWs();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    let alive = true;
    const load = () => supabase.from("activity").select("kind").eq("workspace_id", ws.id).gte("created_at", start.toISOString()).limit(2000).then(({ data }) => alive && setRows(data ?? []));
    load();
    window.addEventListener("kairo:refresh", load);
    return () => { alive = false; window.removeEventListener("kairo:refresh", load); };
  }, [ws.id]);
  if (!rows) return null;
  const busy = AGENTS.map((a) => ({ ...a, n: rows.filter((r) => a.kinds.includes(r.kind)).length })).filter((a) => a.n > 0).sort((a, b) => b.n - a.n);
  return (
    <Card className="p-4 sm:p-5 mb-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Tes agents IA aujourd'hui</h2>
        <Link to="/salaries" className="text-sm text-ink-soft hover:text-ink">Voir l'équipe ›</Link>
      </div>
      {!busy.length ? <p className="text-sm text-ink-soft mt-2">Ton équipe n'a encore rien fait aujourd'hui.{ws.autonomy === "auto" ? " Le pilote automatique passera dans la journée." : " Lance une action ci-dessous ou passe en pilote automatique dans Réglages."}</p> : (
        <div className="flex flex-wrap gap-2 mt-3">
          {busy.map((a) => (
            <Link key={a.id} to={a.to} className="flex items-center gap-2 rounded-full border border-line bg-paper/60 px-3 py-1.5 text-sm hover:border-ink/30">
              <span className="w-2 h-2 rounded-full bg-good" /><span className="font-medium">{a.first} <span className="font-normal text-ink-soft">({a.name})</span></span><span className="tnum text-ink-soft">{fmtN(a.n)} action{a.n > 1 ? "s" : ""}</span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Today() {
  const { ws } = useWs();
  const toast = useToast();
  const { job, run } = useJob(toast);
  const [s, setS] = useState(null);
  const [feed, setFeed] = useState([]);

  const load = useCallback(async () => {
    const c = (q) => q.then((r) => r.count ?? 0);
    const P = () => supabase.from("prospects").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id);
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const [found, todo, ready, drafts, sent, replied, rdv, client, li, sentToday, act] = await Promise.all([
      c(P()), c(P().eq("status", "nouveau")), c(P().eq("status", "pret")),
      c(supabase.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "brouillon")),
      c(P().in("status", ["envoye", "repondu", "rdv", "client", "refus"]).not("email", "eq", "")),
      c(P().in("status", ["repondu", "rdv", "client", "refus"])), c(P().in("status", ["rdv", "client"])), c(P().eq("status", "client")),
      c(P().eq("linkedin_status", "a_envoyer")),
      c(supabase.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", since.toISOString())),
      supabase.from("activity").select("*").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(12),
    ]);
    const [email, hard, phone, letters] = await Promise.all([
      c(P().neq("email", "")), c(P().eq("status", "sans_email").lt("enrich_level", 2)),
      c(P().eq("status", "sans_email").eq("channel", "telephone")), c(P().eq("status", "sans_email").in("channel", ["courrier", "formulaire"])),
    ]);
    setS({ found, todo, ready, drafts, sent, replied, rdv, client, li, sentToday, email, hard, phone, letters });
    setFeed(act.data ?? []);
  }, [ws.id]);

  useEffect(() => {
    fn("followups", { workspace_id: ws.id }).catch(() => {}).finally(load);
    window.addEventListener("kairo:refresh", load);
    return () => window.removeEventListener("kairo:refresh", load);
  }, [ws.id, load]);

  const hour = new Date().getHours();
  const hello = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const first = (ws.sender_name || "").split(" ")[0];
  const domainOk = ws.domain_status === "verified" || !!ws.integrations?.mailbox?.ok;
  // Même règle que le serveur : préchauffage 10 → 20 → 35 → 50 par jour, plafonné par la limite choisie
  const RAMP = [10, 20, 35, 50];
  const wk = ws.warmup_started ? Math.floor((Date.now() - new Date(`${ws.warmup_started}T00:00:00Z`).getTime()) / 6048e5) : 0;
  const cap = Math.min(wk >= RAMP.length ? ws.daily_limit : RAMP[wk], ws.daily_limit || 20);
  const left = Math.max(0, cap - (s?.sentToday ?? 0));
  const potential = (ws.targets ?? []).filter((t) => t.actif !== false).reduce((a, t) => a + (t.total ?? 0), 0);

  return (
    <div>
      <header className="mb-8">
        <p className="text-ink-soft first-letter:uppercase">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="font-serif text-[44px] sm:text-[56px] leading-none tracking-tight mt-1">{hello}{first ? ` ${first}` : ""}.</h1>
        {s && <p className="text-lg text-ink-soft mt-3 max-w-2xl">
          {s.drafts > 0 ? <>{plural(s.drafts, "message attend", "messages attendent")} ta validation. </> : null}
          {s.replied > 0 ? <>{plural(s.replied, "prospect a répondu", "prospects ont répondu")} jusqu'ici. </> : null}
          {s.drafts === 0 && s.replied === 0 && "Voici ce que la machine peut faire pour toi aujourd'hui."}
        </p>}
      </header>

      {s && (
        <Card className="p-4 sm:p-5 mb-8">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-y-4">
            {FUNNEL.map((f, i) => {
              const v = { found: s.found, email: s.email, sent: s.sent, replied: s.replied, rdv: s.rdv, client: s.client }[f.key];
              return (
                <div key={f.key} className={cx("px-3", i % 3 !== 0 && "border-l border-line", "sm:border-l sm:first:border-l-0")}>
                  <p className="text-[13px] text-ink-soft">{f.label}</p>
                  <p className={cx("font-serif text-[34px] leading-none mt-1 tnum", f.key === "rdv" || f.key === "client" ? "text-accent" : "")}>{fmtN(v)}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-ink-faint mt-4 px-3">Potentiel dans ta zone : {fmtN(potential)} établissements · {s.sentToday}/{cap} envois aujourd'hui{cap < ws.daily_limit ? " (préchauffage)" : ""}</p>
        </Card>
      )}

      <Detected />
      <TeamToday />

      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-3">À faire maintenant</h2>
          <Opportunities />
          {!s ? <p className="text-ink-soft">Chargement…</p> : (
            <div className="space-y-3">
              {s.drafts > 0 && (
                <Action tone="hot" title={`Valider ${plural(s.drafts, "message", "messages")}`} sub={domainOk ? `D'un geste : envoyer, modifier ou passer. Encore ${left} envois possibles aujourd'hui.` : "Tu peux les relire dès maintenant ; l'envoi démarre quand ton domaine est vérifié."}>
                  <Link to="/valider"><Button variant="accent">Valider →</Button></Link>
                </Action>
              )}
              {!domainOk && (
                <Action title="Connecter ta boîte mail" sub="2 minutes, une seule fois. Les messages partent de ta propre adresse (Gmail, OVH…), ou de ton domaine d'envoi.">
                  <Link to="/connexions"><Button>Connecter</Button></Link>
                </Action>
              )}
              {s.ready > 0 && (
                <Action title={`Rédiger ${plural(s.ready, "message personnalisé", "messages personnalisés")}`} sub="Chaque message parle du métier du prospect et de ses besoins.">
                  <Button quota="redaction" loading={job?.key === "draft"} disabled={!!job} onClick={() => run({ key: "draft", action: "draft", body: { workspace_id: ws.id, count: 5 }, rounds: Math.ceil(Math.min(s.ready, 20) / 5), label: "Rédaction", done: (n) => `${plural(n, "message rédigé", "messages rédigés")}, à valider` })}>
                    {job?.key === "draft" ? job.text : "Rédiger"}
                  </Button>
                </Action>
              )}
              {s.todo > 0 && (
                <Action title={`Trouver les coordonnées de ${fmtN(Math.min(s.todo, 12))} prospects`} sub={`L'IA cherche sur le web l'e-mail et le téléphone de chaque établissement. ${fmtN(s.todo)} en attente.`}>
                  <Button quota="enquete" loading={job?.key === "enrich"} disabled={!!job} onClick={() => run({ key: "enrich", action: "m/enrich", body: { workspace_id: ws.id, count: 4 }, rounds: 3, label: "Enquête", done: (n, f) => `${f} e-mails trouvés sur ${n} prospects` })}>
                    {job?.key === "enrich" ? job.text : "Lancer l'enquête"}
                  </Button>
                </Action>
              )}
              {s.hard > 0 && (
                <Action title={`Creuser ${plural(Math.min(s.hard, 5), "prospect sans e-mail", "prospects sans e-mail")}`} sub={`Le Détective fouille leur site, les annuaires officiels et les documents publics. ${fmtN(s.hard)} en attente.`}>
                  <Button quota="enquete_plus" loading={job?.key === "deep"} disabled={!!job} onClick={() => run({ key: "deep", action: "enrich-deep", body: { workspace_id: ws.id }, rounds: 5, label: "Enquête approfondie", done: (n, f) => `${f} e-mails trouvés sur ${n} prospects` })}>
                    {job?.key === "deep" ? job.text : "Creuser"}
                  </Button>
                </Action>
              )}
              {(s.phone > 0 || s.letters > 0) && (
                <Action title="Plan B : les joindre autrement" sub={[s.phone > 0 && plural(s.phone, "prospect à appeler", "prospects à appeler"), s.letters > 0 && plural(s.letters, "lettre ou formulaire", "lettres ou formulaires")].filter(Boolean).join(" · ")}>
                  <Link to="/prospects"><Button>Voir</Button></Link>
                </Action>
              )}
              {s.li > 0 && (
                <Action title={`${plural(s.li, "invitation LinkedIn prête", "invitations LinkedIn prêtes")}`} sub="Le décideur est trouvé et le message écrit : tu envoies en un clic.">
                  <Link to="/linkedin"><Button variant="li">Ouvrir</Button></Link>
                </Action>
              )}
              <Action title="Trouver de nouveaux prospects" sub="Dans le registre officiel des entreprises, pour toutes tes cibles actives.">
                <Button quota="recherche" loading={job?.key === "search"} disabled={!!job} onClick={() => run({ key: "search", action: "search", body: { workspace_id: ws.id, pages: 2 }, rounds: 1, label: "Recherche", done: (n) => `${plural(n, "nouveau prospect", "nouveaux prospects")}` })}>
                  {job?.key === "search" ? job.text : "Chercher"}
                </Button>
              </Action>
            </div>
          )}
        </section>

        <aside>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-3">Ce que la machine a fait</h2>
          <ol className="space-y-3">
            {feed.length === 0 && <li className="text-sm text-ink-soft">Rien pour l'instant.</li>}
            {feed.map((a) => (
              <li key={a.id} className="text-sm border-l-2 border-line pl-3">
                <p>{a.summary}</p>
                <p className="text-xs text-ink-faint mt-0.5">{fmtTime(a.created_at)}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
