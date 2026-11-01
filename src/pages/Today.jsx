import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useJob } from "../lib/useJob";
import { Button, useToast } from "../components/ui";
import { cx, plural } from "../lib/utils";
import { fmtN } from "../lib/zones";
import { Avatar, TEAM } from "./Salaries";

const I = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  cal: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2a5 5 0 0 1 5.5 5" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
};
const Ico = ({ n, className = "w-5 h-5", fill }) => <svg viewBox="0 0 24 24" className={cx(className, "shrink-0")} fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{I[n]}</svg>;

// Temps qu'un commercial passerait sur chaque action faite par l'équipe (estimation affichée comme telle)
const MINUTES = { recherche: 20, enquete: 8, enquete_plus: 12, redaction: 10, envoi: 1, reponse: 5, radar: 5, radar_scan: 20, veille: 30, espion: 15, analyse: 30, linkedin: 6, rdv: 20, brief: 15, devis: 15, script: 10, intelligence: 20 };
const KIND = { recrutement: "Recrute", croissance: "Se développe", appel_offres: "Appel d'offres" };
const ago = (d) => { const h = Math.round((Date.now() - new Date(d).getTime()) / 36e5); return h < 1 ? "à l'instant" : h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`; };
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

function Sparks({ className }) {
  return <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="#E0531F" strokeWidth="4.5" strokeLinecap="round"><path d="M10 6l3 9M24 4l-4 10M30 18l-9 3" /></svg>;
}

function Stat({ icon, label, value, delta, accent }) {
  return (
    <div className="flex items-start gap-3 px-4 py-1">
      <span className="w-10 h-10 rounded-full bg-accent-soft text-accent grid place-items-center"><Ico n={icon} /></span>
      <div className="min-w-0">
        <p className="text-[14px] text-ink-soft">{label}</p>
        <p className={cx("text-[28px] font-bold leading-tight tnum", accent && value > 0 && "text-accent")}>{fmtN(value)}</p>
        <p className={cx("text-[12px] mt-0.5 tnum", delta > 0 ? "text-good font-medium" : "text-ink-faint")}>{delta == null ? " " : delta > 0 ? `↑ +${fmtN(delta)} en 7 jours` : "→ 0 en 7 jours"}</p>
      </div>
    </div>
  );
}

function Priority({ icon, n, one, many, sub, empty, to, cta, img, hot }) {
  const on = n > 0;
  return (
    <div className={cx("relative overflow-hidden rounded-2xl border bg-white p-5 min-h-[178px] flex flex-col", on && hot ? "border-accent/40" : "border-line")}>
      <img src={`/illus/${img}.png`} alt="" aria-hidden className={cx("absolute right-2 bottom-2 w-[112px] pointer-events-none select-none transition", !on && "opacity-40 grayscale")} />
      <div className="flex items-start gap-3 pr-16">
        <span className="w-11 h-11 rounded-full bg-accent-soft text-accent grid place-items-center shrink-0"><Ico n={icon} /></span>
        <div>
          <p className="font-bold text-[16.5px] leading-snug">{on ? plural(n, one, many) : empty}</p>
          <p className="text-[13.5px] text-ink-soft mt-1 leading-snug pr-8">{sub}</p>
        </div>
      </div>
      <div className="mt-auto pt-4">
        <Link to={to} className={cx("inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition", on ? "bg-accent text-white hover:bg-accent-dark" : "bg-paper text-ink-soft border border-line hover:text-ink")}>{cta}<Ico n="arrow" className="w-4 h-4" /></Link>
      </div>
    </div>
  );
}

function Logo({ name, url }) {
  const [bad, setBad] = useState(false);
  const h = host(url);
  const hue = [...(name || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  if (h && !bad) return <img src={`https://www.google.com/s2/favicons?domain=${h}&sz=64`} alt="" onError={() => setBad(true)} onLoad={(e) => e.currentTarget.naturalWidth < 20 && setBad(true)} className="w-10 h-10 rounded-xl border border-line bg-white p-1.5 object-contain shrink-0" />;
  return <span className="w-10 h-10 rounded-xl grid place-items-center text-white font-black text-lg shrink-0" style={{ background: `hsl(${hue} 35% 22%)` }}>{(name || "?").trim()[0]?.toUpperCase()}</span>;
}

function Detected({ rows, onPrepared }) {
  const { ws } = useWs();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const prepare = async (o) => {
    setBusy(o.id);
    try {
      const r = await fn("m/prepare", { workspace_id: ws.id, id: o.id });
      toast(r.message ? `${o.company} : contact trouvé et e-mail prêt à valider` : r.reason === "no_email" ? `${o.company} ajouté aux prospects (e-mail introuvable pour l'instant)` : `${o.company} ajouté aux prospects`, "good");
      onPrepared();
      window.dispatchEvent(new Event("kairo:refresh"));
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  return (
    <section className="bg-white rounded-2xl border border-line p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2.5 font-bold text-[16px] uppercase tracking-wide"><Ico n="target" className="w-6 h-6 text-accent" />Détecté pour toi</h2>
        <Link to="/radar" className="text-[13px] text-ink-soft hover:text-ink inline-flex items-center gap-1">Voir toutes les opportunités<Ico n="arrow" className="w-3.5 h-3.5" /></Link>
      </div>
      {!rows.length ? <p className="text-sm text-ink-soft py-6 text-center">Rien de nouveau pour l'instant : Max relance le Radar chaque matin de semaine.</p> : (
        <ul className="space-y-2">
          {rows.map((o) => (
            <li key={o.id} className="rounded-xl border border-line px-3 sm:px-4 py-3 flex items-center gap-3 hover:border-ink/20 transition">
              <span className="hidden sm:inline-block w-[112px] shrink-0"><span className="inline-block text-[11px] font-bold uppercase tracking-wide rounded-full bg-accent-soft text-accent-dark px-2.5 py-1">{KIND[o.kind] ?? o.kind}</span></span>
              <Logo name={o.company} url={o.url} />
              <Link to="/radar" className="min-w-0 flex-1">
                <p className="font-semibold truncate">{o.company}</p>
                <p className="text-[13px] text-ink-soft truncate">{o.summary}</p>
                <p className="text-[11.5px] text-ink-faint mt-0.5"><span className="sm:hidden font-semibold text-accent-dark">{KIND[o.kind] ?? o.kind} · </span>{[o.city, ago(o.created_at)].filter(Boolean).join(" · ")}</p>
              </Link>
              {o.kind !== "appel_offres" && (
                <button onClick={() => prepare(o)} disabled={!!busy} title="Sam trouve le contact, Hugo écrit l'e-mail (rien n'est envoyé)"
                  className="shrink-0 rounded-full bg-accent-soft text-accent-dark px-3 py-1.5 text-[12.5px] font-semibold hover:bg-accent hover:text-white transition disabled:opacity-50">
                  {busy === o.id ? "Préparation…" : "Préparer"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TeamAtWork({ rows }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lastOf = (a) => rows.find((r) => a.kinds.includes(r.kind));
  const ranked = TEAM.map((a) => ({ a, last: lastOf(a) })).sort((x, y) => (y.last ? new Date(y.last.created_at) : 0) - (x.last ? new Date(x.last.created_at) : 0));
  const active = ranked.filter((x) => x.last && new Date(x.last.created_at) >= today).length;
  return (
    <section className="bg-white rounded-2xl border border-line p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2.5 font-bold text-[15px] xl:text-[16px] uppercase tracking-wide"><Ico n="users" className="w-6 h-6 text-accent" />Ton équipe au travail</h2>
        <Link to="/salaries" className="text-[13px] text-ink-soft inline-flex items-center gap-1.5 whitespace-nowrap"><span className={cx("w-2 h-2 rounded-full", active ? "bg-good" : "bg-ink-faint")} />{active} actif{active > 1 ? "s" : ""}</Link>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {ranked.slice(0, 3).map(({ a, last }) => {
          const working = !!last && Date.now() - new Date(last.created_at).getTime() < 4 * 60000;
          const todayDone = !!last && new Date(last.created_at) >= today;
          return (
            <Link key={a.id} to="/salaries" title={last ? `Dernière action : ${last.summary}` : undefined} className="min-w-0 rounded-xl border border-line pt-2 pb-3 px-1.5 flex flex-col items-center text-center hover:border-ink/25 transition">
              <Avatar id={a.id} working={working} className="w-[92px] h-[118px]" />
              <p className="font-bold mt-1">{a.first}</p>
              <p className="text-[12.5px] text-ink-soft">{a.role}</p>
              <span className={cx("mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium whitespace-nowrap", working ? "bg-accent-soft text-accent-dark" : todayDone ? "bg-good-soft text-good" : "bg-[#EFEEEA] text-ink-soft")}>
                <span className={cx("w-1.5 h-1.5 rounded-full", working ? "bg-accent pulse-dot" : todayDone ? "bg-good" : "bg-ink-soft")} />
                {working ? "Au travail" : todayDone ? ago(last.created_at).replace("il y a ", "Actif · ") : "En veille"}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Rendez-vous du jour, relances dues et devis sans réponse : ce qui ne doit pas attendre. */
function Urgent({ u }) {
  if (!u || (!u.meet.length && !u.due.length && !u.quotes.length)) return null;
  const late = (d) => Math.round((Date.now() - new Date(d).getTime()) / 864e5);
  return (
    <section className="mb-6 rounded-2xl bg-ink text-white p-4 sm:p-5">
      <p className="font-bold flex items-center gap-2"><Ico n="bolt" className="w-5 h-5 text-accent" fill />À ne pas laisser filer aujourd'hui</p>
      <ul className="mt-2 divide-y divide-white/10 text-[14px]">
        {u.meet.map((m) => <li key={m.id} className="py-2 flex gap-3"><span className="flex-1"><b>RDV à {new Date(m.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</b> · {m.company}, Paul a préparé la fiche</span><Link to="/agenda" className="text-accent font-semibold">Préparer</Link></li>)}
        {u.quotes.map((q) => <li key={q.id} className="py-2 flex gap-3"><span className="flex-1"><b>{q.prospects?.name}</b> · devis {q.number} {q.status === "vu" ? "ouvert" : "envoyé"} il y a {late(q.sent_at)} jours, sans signature</span><Link to="/devis" className="text-accent font-semibold">Relancer</Link></li>)}
        {u.due.map((p) => <li key={p.id} className="py-2 flex gap-3"><span className="flex-1"><b>{p.name}</b> · {p.next_action || "À suivre"}{late(p.next_action_at) > 0 ? <span className="text-white/60"> · en retard de {late(p.next_action_at)} j</span> : ""}</span>{p.phone ? <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="text-accent font-semibold">Appeler</a> : <Link to="/prospects" className="text-accent font-semibold">Ouvrir</Link>}</li>)}
      </ul>
    </section>
  );
}

export default function Today() {
  const { ws } = useWs();
  const toast = useToast();
  const { job, run } = useJob(toast);
  const [s, setS] = useState(null);

  const load = useCallback(async () => {
    const c = (q) => q.then((r) => r.count ?? 0);
    const head = (t) => supabase.from(t).select("id", { count: "exact", head: true }).eq("workspace_id", ws.id);
    const P = () => head("prospects");
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const w1 = new Date(Date.now() - 7 * 864e5).toISOString(), w2 = new Date(Date.now() - 14 * 864e5).toISOString();
    const today = new Date().toISOString().slice(0, 10), old = new Date(Date.now() - 4 * 864e5).toISOString();
    const [found, toContact, sent, replied, rdv, client, found7, sent7, replied7, rdv7, opps, oppsWeek, oppsPrev, replies, drafts, li, todo, ready, hard, act, detected, due, quotes, meet] = await Promise.all([
      c(P()), c(P().in("status", ["pret", "a_valider"])),
      c(P().in("status", ["envoye", "repondu", "rdv", "client", "refus"]).not("email", "eq", "")),
      c(P().in("status", ["repondu", "rdv", "client", "refus"])), c(P().in("status", ["rdv", "client"])), c(P().eq("status", "client")),
      c(P().gte("created_at", w1)), c(head("messages").eq("status", "envoye").gte("sent_at", w1)), c(head("replies").gte("created_at", w1)), c(head("meetings").neq("status", "annule").gte("created_at", w1)),
      c(head("radar_opps").eq("status", "nouveau")), c(head("radar_opps").gte("created_at", w1)), c(head("radar_opps").gte("created_at", w2).lt("created_at", w1)),
      c(head("replies").eq("handled", false)), c(head("messages").eq("status", "brouillon")), c(P().eq("linkedin_status", "a_envoyer")),
      c(P().eq("status", "nouveau")), c(P().eq("status", "pret")), c(P().eq("status", "sans_email").lt("enrich_level", 2)),
      supabase.from("activity").select("kind, summary, created_at").eq("workspace_id", ws.id).gte("created_at", w1).order("created_at", { ascending: false }).limit(2000),
      supabase.from("radar_opps").select("id, kind, company, summary, city, url, created_at").eq("workspace_id", ws.id).eq("status", "nouveau").order("created_at", { ascending: false }).limit(3),
      supabase.from("prospects").select("id, name, next_action, next_action_at, phone").eq("workspace_id", ws.id).lte("next_action_at", today).not("status", "in", "(ignore,refus)").order("next_action_at").limit(5),
      supabase.from("quotes").select("id, number, sent_at, status, prospects(name)").eq("workspace_id", ws.id).in("status", ["envoye", "vu"]).lt("sent_at", old).limit(3),
      supabase.from("meetings").select("id, company, starts_at").eq("workspace_id", ws.id).eq("status", "confirme").gte("starts_at", t0.toISOString()).lt("starts_at", new Date(t0.getTime() + 864e5).toISOString()).order("starts_at"),
    ]);
    const rows = act.data ?? [];
    const minutes = rows.reduce((m, r) => m + (MINUTES[r.kind] ?? 0), 0);
    setS({ found, toContact, sent, replied, rdv, client, found7, sent7, replied7, rdv7, opps, oppsWeek, oppsPrev, replies, drafts, li, todo, ready, hard,
      rows, minutes, actions: rows.filter((r) => MINUTES[r.kind]).length, detected: detected.data ?? [], urgent: { due: due.data ?? [], quotes: quotes.data ?? [], meet: meet.data ?? [] } });
  }, [ws.id]);

  useEffect(() => {
    fn("followups", { workspace_id: ws.id }).catch(() => {}).finally(load);
    const t = setInterval(load, 30000);
    window.addEventListener("kairo:refresh", load);
    return () => { clearInterval(t); window.removeEventListener("kairo:refresh", load); };
  }, [ws.id, load]);

  const hour = new Date().getHours();
  const hello = hour < 18 ? "Bonjour" : "Bonsoir";
  const first = (ws.sender_name || "").split(" ")[0];
  const trend = s && s.oppsPrev > 0 ? Math.round(((s.oppsWeek - s.oppsPrev) / s.oppsPrev) * 100) : null;
  const hours = s ? s.minutes / 60 : 0;

  return (
    <div>
      <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 mb-6">
        <div>
          <h1 className="font-black text-[44px] sm:text-[60px] leading-none tracking-tight flex items-start gap-1" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>
            {hello}{first ? ` ${first}` : ""} !<Sparks className="w-10 h-10 sm:w-12 sm:h-12 -mt-2" />
          </h1>
          <p className="text-ink-soft text-[17px] mt-3">Voici les opportunités et les actions à ne pas manquer aujourd'hui.</p>
        </div>
        {s && (
          <Link to="/resultats" className="lg:w-[360px] shrink-0 rounded-2xl p-4 pr-5 flex items-center gap-4 bg-gradient-to-br from-accent-soft to-[#FFF4EC] border border-accent/15 hover:border-accent/40 transition">
            <span className="w-12 h-12 rounded-xl bg-white/70 text-accent grid place-items-center shrink-0"><Ico n="clock" className="w-7 h-7" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-[15px]">{hours >= 1 ? `≈ ${hours.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h de prospection faites pour toi` : "Ton équipe démarre la semaine"}</span>
              <span className="block text-[12.5px] text-ink-soft mt-0.5">
                {s.actions ? `${plural(s.actions, "action", "actions")} sur 7 jours (estimation)` : "Les actions de ton équipe s'afficheront ici."}
                {trend != null && trend > 0 ? ` · +${trend} % d'opportunités détectées` : ""}
              </span>
            </span>
            <Ico n="chevron" className="w-5 h-5 text-accent" />
          </Link>
        )}
      </header>

      {s && (
        <section className="bg-white rounded-2xl border border-line py-4 mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-4 lg:divide-x divide-line">
          <Stat icon="search" label="Trouvés" value={s.found} delta={s.found7} />
          <Stat icon="send" label="À contacter" value={s.toContact} delta={null} />
          <Stat icon="check" label="Contactés" value={s.sent} delta={s.sent7} />
          <Stat icon="chat" label="Réponses" value={s.replied} delta={s.replied7} />
          <Stat icon="cal" label="RDV" value={s.rdv} delta={s.rdv7} accent />
          <Stat icon="users" label="Clients" value={s.client} delta={null} accent />
        </section>
      )}

      {s && <Urgent u={s.urgent} />}

      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2.5 font-bold text-[16px] uppercase tracking-wide"><Ico n="star" className="w-6 h-6 text-accent" fill />Tes priorités du jour</h2>
      </div>
      {s ? (
        <div className="grid md:grid-cols-3 gap-3.5 mb-6">
          <Priority icon="target" n={s.opps} one="opportunité à examiner" many="opportunités à examiner" empty="Pas de nouvelle opportunité" img="immeuble"
            sub={s.opps ? "Des entreprises montrent des signaux d'intérêt pour ton offre." : "Max surveille le marché et te prévient dès qu'une entreprise bouge."} to="/radar" cta="Voir les opportunités" />
          <Priority icon="chat" n={s.replies} one="réponse à traiter" many="réponses à traiter" empty="Aucune réponse en attente" img="reponses" hot
            sub={s.replies ? "Des prospects t'ont répondu : Inès a préparé une réponse pour chacun." : "Inès lit chaque réponse dès qu'elle arrive."} to="/reponses" cta="Voir les réponses" />
          <Priority icon="check" n={s.drafts + s.li} one="action à valider" many="actions à valider" empty="Rien à valider" img="valider" hot
            sub={s.drafts + s.li ? [s.drafts && plural(s.drafts, "e-mail prêt", "e-mails prêts"), s.li && plural(s.li, "message LinkedIn", "messages LinkedIn")].filter(Boolean).join(" et ") + " attendent ton feu vert." : "Hugo prépare les prochains e-mails."} to="/valider" cta="Voir les actions" />
        </div>
      ) : <div className="grid md:grid-cols-3 gap-3.5 mb-6">{[0, 1, 2].map((k) => <div key={k} className="h-[178px] rounded-2xl bg-white border border-line animate-pulse" />)}</div>}

      {s && (
        <div className="grid xl:grid-cols-[1.35fr_1fr] gap-3.5 mb-6">
          <Detected rows={s.detected} onPrepared={load} />
          <TeamAtWork rows={s.rows} />
        </div>
      )}

      {s && (s.ready > 0 || s.todo > 0 || s.hard > 0) && (
        <section className="rounded-2xl border border-dashed border-line p-4 sm:p-5">
          <p className="font-semibold">Faire travailler l'équipe maintenant</p>
          <p className="text-[13px] text-ink-soft mt-0.5">La mission le fait toute seule en semaine ; ces boutons servent à aller plus vite. Rien n'est envoyé sans toi.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.ready > 0 && <Button quota="redaction" loading={job?.key === "draft"} disabled={!!job} onClick={() => run({ key: "draft", action: "draft", body: { workspace_id: ws.id, count: 5 }, rounds: Math.ceil(Math.min(s.ready, 20) / 5), label: "Rédaction", done: (n) => `${plural(n, "message rédigé", "messages rédigés")}, à valider` })}>{job?.key === "draft" ? job.text : `Hugo : rédiger ${fmtN(Math.min(s.ready, 20))} e-mails`}</Button>}
            {s.todo > 0 && <Button quota="enquete" loading={job?.key === "enrich"} disabled={!!job} onClick={() => run({ key: "enrich", action: "m/enrich", body: { workspace_id: ws.id, count: 4 }, rounds: 3, label: "Enquête", done: (n, f) => `${f} e-mails trouvés sur ${n} prospects` })}>{job?.key === "enrich" ? job.text : `Sam : trouver les contacts (${fmtN(s.todo)} en attente)`}</Button>}
            {s.hard > 0 && <Button quota="enquete_plus" loading={job?.key === "deep"} disabled={!!job} onClick={() => run({ key: "deep", action: "enrich-deep", body: { workspace_id: ws.id }, rounds: 5, label: "Enquête approfondie", done: (n, f) => `${f} e-mails trouvés sur ${n} prospects` })}>{job?.key === "deep" ? job.text : `Creuser ${fmtN(Math.min(s.hard, 5))} prospects sans e-mail`}</Button>}
            <Button quota="recherche" loading={job?.key === "search"} disabled={!!job} onClick={() => run({ key: "search", action: "search", body: { workspace_id: ws.id, pages: 2 }, rounds: 1, label: "Recherche", done: (n) => `${plural(n, "nouveau prospect", "nouveaux prospects")}` })}>{job?.key === "search" ? job.text : "Léo : chercher de nouvelles entreprises"}</Button>
          </div>
        </section>
      )}
    </div>
  );
}
