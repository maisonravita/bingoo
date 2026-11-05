import { useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Empty, Field, Input, PageHead, Spinner, Textarea, useToast } from "../components/ui";
import { REPLY_CLASSES } from "../lib/labels";
import { cx, fmtTime } from "../lib/utils";

function Paste({ onDone }) {
  const { ws } = useWs();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  const [p, setP] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("prospects").select("id, name, email, city").eq("workspace_id", ws.id).or(`name.ilike.%${q.replace(/[%,()]/g, "")}%,email.ilike.%${q.replace(/[%,()]/g, "")}%`).limit(6);
      setFound(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, ws.id]);
  const go = async () => {
    setBusy(true);
    try { const r = await fn("reply-paste", { workspace_id: ws.id, prospect_id: p?.id, text }); toast(`Classée : ${r.label}`, "good"); setOpen(false); setText(""); setP(null); setQ(""); onDone(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  if (!open) return <Button onClick={() => setOpen(true)}>Coller une réponse reçue</Button>;
  return (
    <Card className="p-5 w-full space-y-3 rise">
      <p className="font-semibold">Une réponse reçue dans ta messagerie ? Colle-la ici.</p>
      {p ? <p className="text-sm">Prospect : <b>{p.name}</b> <button className="text-ink-soft underline ml-2" onClick={() => setP(null)}>changer</button></p> : (
        <div className="relative">
          <Input placeholder="De quel prospect ? (nom ou e-mail)" value={q} onChange={(e) => setQ(e.target.value)} />
          {found.length > 0 && <div className="absolute z-10 mt-1 w-full bg-white border border-line rounded-xl shadow-lg overflow-hidden">{found.map((f) => <button key={f.id} className="block w-full text-left px-3 py-2 text-sm hover:bg-paper" onClick={() => { setP(f); setFound([]); }}>{f.name} <span className="text-ink-soft">· {f.email || f.city}</span></button>)}</div>}
        </div>
      )}
      <Textarea rows={6} placeholder="Texte de la réponse" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex gap-2"><Button quota="reponse" variant="primary" loading={busy} onClick={go}>Analyser</Button><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button></div>
    </Card>
  );
}

export function ReplyCard({ r, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const [subject, setSubject] = useState(r.reply_subject);
  const [body, setBody] = useState(r.reply_body);
  const [busy, setBusy] = useState(null);
  const cls = REPLY_CLASSES[r.class] ?? REPLY_CLASSES.autre;
  const send = async () => {
    setBusy("send");
    try { await fn("reply-send", { workspace_id: ws.id, reply_id: r.id, subject, body }); toast("Réponse envoyée", "good"); onChange(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const done = async () => { await supabase.from("replies").update({ handled: true }).eq("id", r.id); onChange(); };
  const p = r.prospects;
  return (
    <Card className={cx("p-5 sm:p-6", r.needs_human && !r.handled && "border-accent/40")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={cls.tone}>{cls.label}</Badge>
        {r.needs_human && !r.handled && <Badge tone="accent">Ton avis est nécessaire</Badge>}
        <span className="text-xs text-ink-faint ml-auto">{fmtTime(r.created_at)}</span>
      </div>
      <h3 className="font-serif text-2xl mt-2">{p?.name ?? r.from_email}</h3>
      <p className="text-sm text-ink-soft">{r.from_name || r.from_email}{p?.activity ? ` · ${p.activity}` : ""}</p>
      <p className="mt-3 font-medium">{r.summary}</p>
      <details className="mt-2 text-sm"><summary className="cursor-pointer text-ink-soft">Message complet</summary><p className="mt-2 whitespace-pre-line bg-paper rounded-xl p-3">{r.body}</p></details>
      {!r.handled && r.reply_body && (
        <div className="mt-4 pt-4 border-t border-line space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Réponse proposée</p>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      )}
      {!r.handled && (
        <div className="flex flex-wrap gap-2 mt-4 [&>*]:flex-1 sm:[&>*]:flex-none [&_button]:w-full sm:[&_button]:w-auto">
          {r.reply_body && (r.from_email === "linkedin"
            ? <Button variant="li" onClick={async () => { try { await navigator.clipboard.writeText(body); toast("Réponse copiée : colle-la dans la conversation LinkedIn", "good"); } catch { toast("Copie impossible, sélectionne le texte", "bad"); } }}>Copier pour LinkedIn</Button>
            : <Button variant="accent" loading={busy === "send"} onClick={send}>Envoyer la réponse</Button>)}
          <Button variant="ghost" onClick={done}>Traité</Button>
          {p?.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`}><Button variant="ghost">Appeler {p.phone}</Button></a>}
        </div>
      )}
    </Card>
  );
}

export default function Replies() {
  const { ws } = useWs();
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState("todo");
  // Ouverte depuis une notification : la réponse concernée passe en premier
  const focus = new URLSearchParams(useLocation().search).get("id");
  const load = useCallback(async () => {
    let q = supabase.from("replies").select("*, prospects(name, activity, phone, email)").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(100);
    if (tab === "todo") q = q.eq("handled", false);
    const { data } = await q;
    setRows(data ?? []);
    window.dispatchEvent(new Event("kairo:refresh"));
  }, [ws.id, tab]);
  useEffect(() => { load(); }, [load]);
  const tracked = ws.reply_status === "verified";

  return (
    <div>
      <PageHead title="Réponses" sub={tracked ? "Les réponses arrivent ici automatiquement, triées, avec une réponse proposée. Les relances s'arrêtent seules." : "Active le suivi des réponses dans Réglages pour qu'elles arrivent ici toutes seules."}>
        <Paste onDone={load} />
      </PageHead>
      <div className="flex gap-2 mb-5">
        {[["todo", "À traiter"], ["all", "Toutes"]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx("rounded-full px-3.5 py-1.5 text-sm font-medium border", tab === k ? "bg-ink text-white border-ink" : "bg-white border-line")}>{l}</button>)}
      </div>
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty title={tab === "todo" ? "Rien à traiter." : "Aucune réponse pour l'instant."}>Les réponses de tes prospects apparaîtront ici.</Empty> : (
        <div className="grid gap-4 max-w-3xl">{[...rows].sort((a, b) => (b.id === focus) - (a.id === focus)).map((r) => <div key={r.id} className={r.id === focus ? "rounded-3xl ring-2 ring-accent ring-offset-2" : ""}><ReplyCard r={r} onChange={load} /></div>)}</div>
      )}
    </div>
  );
}
