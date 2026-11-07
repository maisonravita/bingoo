import { useCallback, useEffect, useState } from "react";
import Guide from "../components/Guide";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Empty, Field, Input, PageHead, Spinner, Textarea, useToast } from "../components/ui";
import ProspectPicker from "../components/ProspectPicker";
import { MEETING } from "../lib/labels";
import { cx } from "../lib/utils";
import { Link } from "react-router-dom";

function FollowUp({ m, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const f = m.followup;
  const [notes, setNotes] = useState(f?.notes ?? "");
  const [mail, setMail] = useState({ subject: f?.email?.objet ?? "", body: f?.email?.corps ?? "" });
  const [busy, setBusy] = useState(null);
  const [quote, setQuote] = useState(null);
  useEffect(() => { setMail({ subject: f?.email?.objet ?? "", body: f?.email?.corps ?? "" }); }, [f?.at]);
  const prepare = async () => {
    setBusy("prep");
    try { const r = await fn("meeting-followup", { workspace_id: ws.id, meeting_id: m.id, notes }); setQuote(r.quote_id); toast(r.quote_id ? "Suite prête, et une proposition chiffrée t'attend dans Devis" : "Suite prête", "good"); onChange(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const send = async () => {
    setBusy("send");
    try { await fn("meeting-followup-send", { workspace_id: ws.id, meeting_id: m.id, ...mail }); toast("E-mail de suite envoyé", "good"); onChange(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  return (
    <div className="mt-4 rounded-xl border border-line p-4 bg-paper/40">
      <p className="font-semibold">Compte rendu et suite</p>
      {!f ? (
        <>
          <p className="text-sm text-ink-soft mt-1">Note en vrac ce qui s'est dit (besoin, budget, délai, qui décide, objections). Bingoo! rédige le compte rendu, l'e-mail de suite et une proposition chiffrée à partir de ton catalogue.</p>
          <Textarea rows={5} className="mt-3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. 3 sites à Paris, nettoyage actuel insatisfaisant, budget ~2 000 €/mois, décision avec le DAF fin novembre, inquiet sur la continuité pendant les congés…" />
          <Button quota="brief" className="mt-3" variant="primary" loading={busy === "prep"} disabled={notes.trim().length < 15} onClick={prepare}>Préparer la suite</Button>
        </>
      ) : (
        <>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mt-3">
            {[["Besoin", f.besoin], ["Décideurs", f.decideurs], ["Budget", f.budget], ["Délai", f.delai]].map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-xs text-ink-soft">{k}</dt><dd className="break-words">{v || "—"}</dd></div>)}
          </dl>
          {f.objections?.filter(Boolean).length > 0 && <p className="text-sm mt-2"><span className="text-xs text-ink-soft">Objections : </span>{f.objections.filter(Boolean).join(" · ")}</p>}
          <p className="text-sm mt-2"><span className="text-xs text-ink-soft">Prochaine étape : </span><b>{f.prochaine_etape}</b>{typeof f.chance === "number" && <span className="text-ink-soft"> · chance de signature estimée {f.chance} %</span>}</p>
          {f.sent ? (
            <p className="text-sm text-good mt-3 font-semibold">E-mail de suite envoyé{f.sent_at ? ` le ${new Date(f.sent_at).toLocaleDateString("fr-FR")}` : ""}.</p>
          ) : (
            <div className="mt-3 space-y-2">
              <Input value={mail.subject} onChange={(e) => setMail({ ...mail, subject: e.target.value })} />
              <Textarea rows={8} value={mail.body} onChange={(e) => setMail({ ...mail, body: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                <Button variant="accent" loading={busy === "send"} onClick={send}>Envoyer à {m.contact_name || m.contact_email}</Button>
                {(quote || ws.profile?.avance === true) && <Link to="/devis"><Button>{quote ? "Voir la proposition" : "Aller aux devis"}</Button></Link>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const fmtDay = (d) => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const fmtHour = (d) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function Meeting({ m, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const setStatus = async (status) => {
    await supabase.from("meetings").update({ status }).eq("id", m.id);
    if (m.prospect_id && status === "qualifie") await supabase.from("prospects").update({ next_action: "Envoyer le devis", next_action_at: new Date().toISOString().slice(0, 10) }).eq("id", m.prospect_id);
    onChange();
  };
  const brief = async () => {
    setBusy(true); setOpen(true);
    try { await fn("brief", { workspace_id: ws.id, meeting_id: m.id }); onChange(); } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const past = new Date(m.ends_at) < new Date();
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-16 shrink-0 text-center">
          <p className="font-serif text-3xl leading-none tnum">{fmtHour(m.starts_at)}</p>
          <p className="text-xs text-ink-soft mt-1">{Math.round((new Date(m.ends_at) - new Date(m.starts_at)) / 60000)} min</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg">{m.company}</p>
          <p className="text-sm text-ink-soft">{m.contact_name} · <a className="underline" href={`mailto:${m.contact_email}`}>{m.contact_email}</a>{m.contact_phone && <> · <a className="underline" href={`tel:${m.contact_phone}`}>{m.contact_phone}</a></>}</p>
          {m.notes && <p className="text-sm mt-1">« {m.notes} »</p>}
        </div>
        <Badge tone={m.status === "qualifie" ? "good" : m.status === "annule" || m.status === "absent" ? "bad" : m.status === "tenu" ? "accent" : "muted"}>{MEETING[m.status]}</Badge>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {m.brief ? <Button size="sm" onClick={() => setOpen((x) => !x)}>{open ? "Masquer la fiche" : "Fiche de préparation"}</Button> : <Button quota="brief" size="sm" variant="primary" loading={busy} onClick={brief}>Préparer le RDV avec l'IA</Button>}
        {past && m.status === "confirme" && <>
          <Button size="sm" variant="ghost" onClick={() => setStatus("tenu")}>Tenu</Button>
          <Button size="sm" variant="ghost" onClick={() => setStatus("qualifie")}>Qualifié (besoin réel)</Button>
          <Button size="sm" variant="ghost" onClick={() => setStatus("absent")}>Absent</Button>
        </>}
        {past && m.status === "tenu" && <Button size="sm" variant="ghost" onClick={() => setStatus("qualifie")}>Qualifié</Button>}
        {!past && m.status === "confirme" && <Button size="sm" variant="danger" onClick={() => setStatus("annule")}>Annuler</Button>}
      </div>
      {past && ["confirme", "tenu", "qualifie"].includes(m.status) && <FollowUp m={m} onChange={onChange} />}
      {open && (busy ? <p className="text-sm text-ink-soft mt-4">L'IA cherche des informations et prépare la fiche… (30 s environ)</p> : m.brief && <div className="mt-4 whitespace-pre-line text-sm bg-paper rounded-xl p-4 leading-relaxed">{m.brief}</div>)}
    </Card>
  );
}

function AddMeeting({ onDone }) {
  const { ws } = useWs();
  const toast = useToast();
  const [p, setP] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const save = async () => {
    if (!p || !date) return toast("Choisis un prospect et une date", "bad");
    const start = new Date(`${date}T${time}`);
    const { error } = await supabase.from("meetings").insert({ workspace_id: ws.id, prospect_id: p.id, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + ws.meeting_minutes * 60000).toISOString(), company: p.name, contact_name: p.contact_name, contact_email: p.email, contact_phone: p.phone, notes, booked_by: "manuel" });
    if (error) return toast(error.code === "23P01" ? "Tu as déjà un RDV sur ce créneau" : error.message, "bad");
    await supabase.from("prospects").update({ status: p.status === "client" ? "client" : "rdv" }).eq("id", p.id);
    await supabase.from("messages").update({ status: "ignore" }).eq("prospect_id", p.id).eq("status", "brouillon");
    toast("Rendez-vous ajouté", "good"); onDone();
  };
  return (
    <Card className="p-5 space-y-3 rise">
      <ProspectPicker value={p} onChange={setP} />
      <div className="grid grid-cols-2 gap-3"><Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Heure"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field></div>
      <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Button variant="primary" onClick={save}>Ajouter</Button>
    </Card>
  );
}

export default function Agenda() {
  const { ws } = useWs();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [add, setAdd] = useState(false);
  const [past, setPast] = useState(false);
  const load = useCallback(async () => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    let q = supabase.from("meetings").select("*").eq("workspace_id", ws.id);
    q = past ? q.lt("starts_at", now.toISOString()).order("starts_at", { ascending: false }) : q.gte("starts_at", now.toISOString()).order("starts_at");
    const { data } = await q.limit(100);
    setRows(data ?? []);
    window.dispatchEvent(new Event("kairo:refresh"));
  }, [ws.id, past]);
  useEffect(() => { load(); }, [load]);
  const link = ws.app_url ? `${ws.app_url}/#/rdv/${ws.booking_slug}` : `${window.location.href.split("#")[0]}#/rdv/${ws.booking_slug}`;
  const byDay = (rows ?? []).reduce((a, m) => { const k = new Date(m.starts_at).toDateString(); (a[k] ||= []).push(m); return a; }, {});

  return (
    <div>
      <PageHead title="Rendez-vous" sub="Tes prospects réservent eux-mêmes, et chaque rendez-vous reçoit une fiche de préparation.">
        <Button onClick={async () => { try { await navigator.clipboard.writeText(link); toast("Lien de réservation copié"); } catch { toast(link); } }}>Copier mon lien de réservation</Button>
        <Button variant="primary" onClick={() => setAdd((x) => !x)}>Ajouter un RDV</Button>
      </PageHead>
      <Guide id="rdv" titre="Ici : tes rendez-vous avec des prospects." etapes={["Ils arrivent tout seuls quand un prospect réserve un créneau depuis tes e-mails.", "Avant chaque rendez-vous, ouvre-le : Bingoo! a préparé une fiche (ce qu'on sait, les questions à poser).", "Après le rendez-vous, note comment ça s'est passé : Bingoo! prépare le suivi."]} />
      {add && <div className="max-w-xl mb-6"><AddMeeting onDone={() => { setAdd(false); load(); }} /></div>}
      <div className="flex gap-2 mb-5">
        {[[false, "À venir"], [true, "Passés"]].map(([k, l]) => <button key={l} onClick={() => setPast(k)} className={cx("rounded-full px-3.5 py-1.5 text-sm font-medium border", past === k ? "bg-ink text-white border-ink" : "bg-white border-line")}>{l}</button>)}
        <a href={link} target="_blank" rel="noreferrer" className="ml-auto text-sm text-ink-soft underline self-center">Voir ma page de réservation ↗</a>
      </div>
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty title={past ? "Aucun rendez-vous passé." : "Aucun rendez-vous à venir."}>Le lien de réservation est ajouté automatiquement à tes e-mails de prospection.</Empty> : (
        <div className="space-y-8 max-w-3xl">
          {Object.entries(byDay).map(([k, list]) => (
            <section key={k}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-3 capitalize">{fmtDay(list[0].starts_at)}</h2>
              <div className="space-y-3">{list.map((m) => <Meeting key={m.id} m={m} onChange={load} />)}</div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
