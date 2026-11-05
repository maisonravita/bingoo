import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, useToast } from "./ui";
import { cx, plural } from "../lib/utils";
import { ReplyCard } from "../pages/Replies";

// Le fil « Aujourd'hui » : tout ce qui demande le client, dans l'ordre où ça rapporte.
// 1. les réponses (un prospect attend), 2. les rendez-vous du jour, 3. les messages prêts à envoyer (une carte, deux boutons).
const why = (p) => {
  const s = (p?.signals ?? []).find((x) => x?.label && !["taille", "reseau"].includes(x.type));
  return s ? String(s.label).replace(/^[^:]{0,40}:\s*/, "").replace(/\s*(?:publi[ée]e? )?(?:au|dans le) (?:BODACC|registre[^,.;]*)/gi, "") : "";
};

function Section({ id, title, count, to, more, children }) {
  return (
    <section id={id} className="mb-8 scroll-mt-24">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-[19px] font-semibold">{title}{count > 0 && <span className="ml-2 text-ink-faint font-normal">{count}</span>}</h2>
        {to && <Link to={to} className="text-sm text-ink-soft hover:text-ink underline-offset-4 hover:underline">{more}</Link>}
      </div>
      {children}
    </section>
  );
}

/** Un message prêt : pourquoi maintenant, à qui, le texte, et deux décisions. */
function DraftCard({ m, canSend, onDone }) {
  const { ws } = useWs();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const lock = useRef(false);
  const p = m.prospects ?? {};
  const reason = why(p);
  const send = async () => {
    if (lock.current) return;
    if (!canSend) return toast("Connecte d'abord ta boîte mail (Réglages → Connexions) pour envoyer", "bad");
    lock.current = true; setBusy("send");
    try {
      const r = await fn("m/send", { workspace_id: ws.id, message_id: m.id });
      if (r.error) throw new Error(r.error);
      toast(r.skipped ? `Non envoyé : ${r.skipped}` : `Envoyé à ${p.name}`, r.skipped ? "default" : "good");
      onDone(m.id);
    } catch (e) { toast(e.message, "bad"); lock.current = false; } finally { setBusy(""); }
  };
  const skip = async () => {
    setBusy("skip");
    await supabase.from("messages").update({ status: "ignore" }).eq("id", m.id);
    if (m.step === 0) await supabase.from("prospects").update({ status: "ignore" }).eq("id", m.prospect_id);
    setBusy(""); onDone(m.id);
  };
  return (
    <article className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[17px] font-semibold">{p.name}{p.city ? <span className="font-normal text-ink-soft">, {p.city}</span> : null}</p>
        <p className="text-[13px] text-ink-soft">{m.step > 0 ? `Relance n° ${m.step}` : "Premier message"}</p>
      </div>
      {reason && <p className="mt-1 text-[14.5px] text-accent-dark">{reason}</p>}
      <p className="mt-1 text-[13.5px] text-ink-soft">À {p.contact_name || "l'entreprise"}{p.contact_role ? `, ${String(p.contact_role).replace(/\s*\(.*$/, "")}` : ""}{p.email ? ` · ${p.email}` : ""}</p>
      <button onClick={() => setOpen((x) => !x)} className="mt-3 block w-full text-left rounded-xl bg-paper p-4 hover:bg-paper/70 transition" aria-expanded={open}>
        <p className="text-[14px] font-semibold">{m.subject}</p>
        <p className={cx("mt-1 text-[14px] text-ink-soft whitespace-pre-line", !open && "line-clamp-3")}>{m.body}</p>
        {!open && <span className="mt-1 inline-block text-[12.5px] text-ink-faint">Lire tout le message</span>}
      </button>
      <div className="mt-4 grid grid-cols-3 sm:flex sm:flex-wrap gap-2 [&>*]:w-full sm:[&>*]:w-auto [&_button]:w-full sm:[&_button]:w-auto">
        <Button variant="primary" loading={busy === "send"} disabled={!!busy} onClick={send}>Envoyer</Button>
        <Link to="/valider"><Button variant="ghost" disabled={!!busy}>Modifier</Button></Link>
        <Button variant="ghost" loading={busy === "skip"} disabled={!!busy} onClick={skip}>Pas pour moi</Button>
      </div>
    </article>
  );
}

/** Tout envoyer d'un coup, après une confirmation claire : chaque message part depuis la boîte connectée, un par un. */
function SendAll({ total, onDone }) {
  const { ws } = useWs();
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const [prog, setProg] = useState(null);
  const go = async () => {
    setAsk(false);
    const { data } = await supabase.from("messages").select("id").eq("workspace_id", ws.id).eq("status", "brouillon").order("step", { ascending: false }).order("created_at").limit(50);
    const ids = (data ?? []).map((m) => m.id);
    let sent = 0, skipped = 0;
    for (let i = 0; i < ids.length; i++) {
      setProg(`${i + 1} / ${ids.length}`);
      try { const r = await fn("m/send", { workspace_id: ws.id, message_id: ids[i] }); if (r?.skipped) skipped++; else sent++; }
      catch (e) { toast(`Arrêté : ${e.message}`, "bad"); break; }
    }
    setProg(null);
    toast(`${sent} message${sent > 1 ? "s" : ""} envoyé${sent > 1 ? "s" : ""}${skipped ? `, ${skipped} non envoyé${skipped > 1 ? "s" : ""} (voir Messages à valider)` : ""}`, sent ? "good" : "default");
    onDone();
  };
  if (prog) return <p className="mb-3 text-sm text-ink-soft">Envoi en cours… {prog}</p>;
  if (ask) return (
    <div className="mb-3 rounded-xl border border-accent/40 bg-accent-soft/50 p-4">
      <p className="text-[15px] font-semibold">Envoyer les {total > 50 ? 50 : total} messages maintenant ?</p>
      <p className="mt-1 text-[13.5px] text-ink-soft">Ils partent depuis ta boîte connectée, un par un. Relis-les d'abord si tu as un doute.</p>
      <div className="mt-3 flex gap-2"><Button variant="primary" onClick={go}>Oui, tout envoyer</Button><Button variant="ghost" onClick={() => setAsk(false)}>Annuler</Button></div>
    </div>
  );
  return <div className="mb-3"><Button variant="ghost" onClick={() => setAsk(true)}>Tout envoyer ({total > 50 ? 50 : total})</Button></div>;
}

export default function TodayFeed() {
  const { ws } = useWs();
  const [d, setD] = useState(null);
  const canSend = ws.domain_status === "verified" || !!ws.integrations?.mailbox?.ok;
  const load = useCallback(async () => {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const since = new Date(Date.now() - 24 * 36e5).toISOString();
    const head = (t) => supabase.from(t).select("id", { count: "exact", head: true }).eq("workspace_id", ws.id);
    const [rep, meet, dr, nDr, o24, c24, m24] = await Promise.all([
      supabase.from("replies").select("*, prospects(name, activity, phone, email)").eq("workspace_id", ws.id).eq("handled", false).order("created_at", { ascending: false }).limit(3),
      supabase.from("meetings").select("id, company, starts_at").eq("workspace_id", ws.id).eq("status", "confirme").gte("starts_at", t0.toISOString()).lt("starts_at", new Date(t0.getTime() + 864e5).toISOString()).order("starts_at"),
      supabase.from("messages").select("id, step, subject, body, prospect_id, prospects(name, city, contact_name, contact_role, email, signals)").eq("workspace_id", ws.id).eq("status", "brouillon").order("step", { ascending: false }).order("created_at").limit(5),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "brouillon"),
      head("radar_opps").gte("created_at", since), head("prospects").gte("enriched_at", since).neq("email", ""), head("messages").gte("created_at", since),
    ]);
    const night = [[o24.count, "opportunité repérée", "opportunités repérées"], [c24.count, "contact trouvé", "contacts trouvés"], [m24.count, "message préparé", "messages préparés"]].filter(([k]) => k > 0).map(([k, a, b]) => plural(k, a, b));
    setD({ replies: rep.data ?? [], meetings: meet.data ?? [], drafts: dr.data ?? [], draftsTotal: nDr.count ?? 0, night });
  }, [ws.id]);
  useEffect(() => { load(); window.addEventListener("kairo:refresh", load); return () => window.removeEventListener("kairo:refresh", load); }, [load]);
  if (!d) return <div className="h-40 rounded-2xl bg-white border border-line animate-pulse mb-8" />;
  const gone = (id) => { setD((x) => ({ ...x, drafts: x.drafts.filter((m) => m.id !== id), draftsTotal: x.draftsTotal - 1 })); window.dispatchEvent(new Event("kairo:refresh")); };
  const nothing = !d.replies.length && !d.meetings.length && !d.drafts.length;

  return (
    <div>
      {d.night.length > 0 && <p className="mb-6 rounded-xl bg-accent-soft/60 px-4 py-3 text-[15px]"><b className="font-semibold">Ces dernières 24 heures</b> : {d.night.join(", ")}.</p>}

      {d.replies.length > 0 && (
        <Section title="Ils t'ont répondu" count={d.replies.length} to="/reponses" more="Toutes les réponses">
          <div className="grid gap-4">{d.replies.map((r) => <ReplyCard key={r.id} r={r} onChange={load} />)}</div>
        </Section>
      )}

      {d.meetings.length > 0 && (
        <Section title="Tes rendez-vous du jour" count={d.meetings.length} to="/agenda" more="Agenda">
          <div className="grid gap-2">
            {d.meetings.map((m) => (
              <Link key={m.id} to="/agenda" className="flex items-center gap-4 rounded-2xl border border-line bg-white px-5 py-4 hover:border-ink/30 transition">
                <span className="text-[20px] font-semibold tnum">{new Date(m.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="min-w-0"><span className="block font-medium truncate">{m.company}</span><span className="block text-[13px] text-ink-soft">Fiche de préparation prête</span></span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {d.drafts.length > 0 && (
        <Section id="prets" title="Messages prêts à partir" count={d.draftsTotal} to="/valider" more={d.draftsTotal > d.drafts.length ? `Les ${d.draftsTotal} messages` : "Tout voir"}>
          {!canSend && <p className="mb-3 text-sm text-warn">Pour envoyer, connecte ta boîte mail : <Link className="underline" to="/connexions">Réglages → Connexions</Link>.</p>}
          {canSend && d.draftsTotal > 1 && <SendAll total={d.draftsTotal} onDone={() => { load(); window.dispatchEvent(new Event("kairo:refresh")); }} />}
          <div className="grid gap-4">{d.drafts.map((m) => <DraftCard key={m.id} m={m} canSend={canSend} onDone={gone} />)}</div>
        </Section>
      )}

      {nothing && (
        <div className="mb-8 rounded-2xl border border-line bg-white p-6">
          <p className="text-[17px] font-semibold">Tout est à jour.</p>
          <p className="mt-1 text-[15px] text-ink-soft">Aucune réponse en attente, aucun message à valider. Les nouvelles opportunités arrivent chaque nuit.</p>
        </div>
      )}
    </div>
  );
}

