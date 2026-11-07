import { useLocation } from "react-router-dom";
import Guide from "../components/Guide";
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

/** Le message du prospect, lisible tout de suite (replié seulement s'il est long). */
function Lu({ texte }) {
  const [ouvert, setOuvert] = useState(false);
  const t = String(texte ?? "").trim();
  if (!t) return null;
  const long = t.length > 420;
  return (
    <div className="mt-2 text-sm bg-paper rounded-xl p-3">
      <p className={cx("whitespace-pre-line", long && !ouvert && "line-clamp-6")}>{t}</p>
      {long && <button type="button" onClick={() => setOuvert((x) => !x)} className="mt-1 text-[13px] font-semibold text-ink-soft hover:text-ink">{ouvert ? "Réduire" : "Lire tout le message"}</button>}
    </div>
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
  const lienRdv = ws.app_url && ws.booking_slug ? `${ws.app_url.replace(/\/$/, "")}/#/rdv/${ws.booking_slug}` : "";
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
      <Lu texte={r.body} />
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
          {r.reply_body && r.from_email !== "linkedin" && lienRdv && !body.includes(lienRdv) && <Button variant="ghost" onClick={() => setBody((x) => `${x.trim()}\n\nVous pouvez choisir directement le créneau qui vous arrange ici : ${lienRdv}`)}>Ajouter mon agenda</Button>}
          <Button variant="ghost" onClick={done}>Traité</Button>
          {p && <Button variant="ghost" onClick={async () => { await supabase.from("prospects").update({ status: "refus" }).eq("id", r.prospect_id); await done(); toast("Noté : plus de relance pour lui", "good"); }}>Pas intéressé</Button>}
          {p?.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`}><Button variant="ghost">Appeler {p.phone}</Button></a>}
        </div>
      )}
    </Card>
  );
}

/** Les messages déjà partis : à qui, quand, et ce qu'il s'est passé ensuite. */
function Envoyes() {
  const { ws } = useWs();
  const [rows, setRows] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    supabase.from("messages").select("id, step, subject, body, sent_at, opened_at, clicked_at, bounced, prospect_id, prospects(name, contact_name, email, status)")
      .eq("workspace_id", ws.id).eq("status", "envoye").order("sent_at", { ascending: false }).limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, [ws.id]);
  if (!rows) return <Spinner />;
  if (!rows.length) return <Empty title="Aucun message envoyé pour l'instant.">Dès que tu valides un message à l'Atelier, il part et apparaît ici.</Empty>;
  const etape = (n) => (n >= 100 ? "Reprise de contact" : n === 0 ? "Premier message" : `Relance ${n}`);
  const suite = (m) => {
    const st = m.prospects?.status;
    if (m.bounced) return ["Adresse invalide", "bg-bad-soft text-bad"];
    if (st === "rdv" || st === "client") return ["Rendez-vous", "bg-good-soft text-good"];
    if (st === "repondu") return ["A répondu", "bg-good-soft text-good"];
    if (st === "refus") return ["Pas intéressé", "bg-paper text-ink-soft"];
    if (m.clicked_at) return ["A cliqué", "bg-accent-soft text-accent-dark"];
    if (m.opened_at) return ["Ouvert", "bg-accent-soft text-accent-dark"];
    return ["Envoyé", "bg-paper text-ink-soft"];
  };
  const f = q.trim().toLowerCase();
  const liste = f ? rows.filter((m) => `${m.prospects?.name ?? ""} ${m.prospects?.contact_name ?? ""} ${m.prospects?.email ?? ""} ${m.subject ?? ""}`.toLowerCase().includes(f)) : rows;
  const ouverts = rows.filter((m) => m.opened_at).length;
  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="text-[14px] text-ink-soft"><b className="text-ink">{rows.length}</b> message{rows.length > 1 ? "s" : ""} envoyé{rows.length > 1 ? "s" : ""}{ouverts ? <> · <b className="text-ink">{ouverts}</b> ouvert{ouverts > 1 ? "s" : ""}</> : null}</p>
        <Input className="ml-auto max-w-[260px]" placeholder="Chercher une entreprise…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card className="divide-y divide-line overflow-hidden p-0">
        {liste.map((m) => {
          const [lab, tone] = suite(m), on = ouvert === m.id, p = m.prospects;
          return (
            <div key={m.id}>
              <button onClick={() => setOuvert(on ? null : m.id)} aria-expanded={on} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper/60">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p?.name ?? "Prospect"}{p?.contact_name ? <span className="font-normal text-ink-soft"> · {p.contact_name}</span> : null}</span>
                  <span className="block truncate text-[13px] text-ink-soft">{etape(m.step)} · {m.subject}</span>
                </span>
                <span className={cx("shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold", tone)}>{lab}</span>
                <span className="hidden sm:block w-[92px] shrink-0 text-right text-[12.5px] text-ink-faint">{fmtTime(m.sent_at)}</span>
              </button>
              {on && (
                <div className="bg-paper/50 px-4 pb-4 pt-1 text-sm">
                  <p className="text-[12.5px] text-ink-soft">À {p?.email || "—"} · envoyé {fmtTime(m.sent_at)}{m.opened_at ? ` · ouvert ${fmtTime(m.opened_at)}` : ""}</p>
                  <p className="mt-2 font-medium">{m.subject}</p>
                  <p className="mt-1 whitespace-pre-line text-ink">{m.body}</p>
                </div>
              )}
            </div>
          );
        })}
        {!liste.length && <p className="px-4 py-6 text-sm text-ink-soft">Aucun message ne correspond.</p>}
      </Card>
    </div>
  );
}

export default function Replies() {
  const { ws } = useWs();
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState(() => (new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("vue") === "envoyes" ? "sent" : "todo"));
  // Ouverte depuis une notification : la réponse concernée passe en premier
  const focus = new URLSearchParams(useLocation().search).get("id");
  const load = useCallback(async () => {
    let q = supabase.from("replies").select("*, prospects(name, activity, phone, email)").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(100);
    if (tab === "sent") return;
    if (tab === "todo") q = q.eq("handled", false);
    const { data } = await q;
    setRows(data ?? []);
    window.dispatchEvent(new Event("kairo:refresh"));
  }, [ws.id, tab]);
  useEffect(() => { load(); }, [load]);
  const tracked = true; // les réponses reviennent toujours (domaine de la plateforme), comme côté serveur

  return (
    <div>
      <PageHead title="Réponses" resume sub={tracked ? "Les réponses arrivent ici automatiquement, triées, avec une réponse proposée. Les relances s'arrêtent seules." : "Active le suivi des réponses dans Réglages pour qu'elles arrivent ici toutes seules."}>
        <Paste onDone={load} />
      </PageHead>
      <Guide id="reponses" titre="Ici : les prospects qui t'ont répondu, déjà triés." etapes={["Commence par ceux marqués « Intéressé » : une réponse est déjà prête.", "Relis-la, corrige si besoin, puis clique « Envoyer la réponse ».", "Il propose un rendez-vous ? Il arrive tout seul dans « Rendez-vous »."]} />
      <div className="flex flex-wrap gap-2 mb-5">
        {[["todo", "À traiter"], ["all", "Toutes les réponses"], ["sent", "Messages envoyés"]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx("rounded-full px-3.5 py-1.5 text-sm font-medium border", tab === k ? "bg-ink text-white border-ink" : "bg-white border-line")}>{l}</button>)}
      </div>
      {tab === "sent" ? <Envoyes /> : !rows ? <Spinner /> : rows.length === 0 ? <Empty title={tab === "todo" ? "Rien à traiter." : "Aucune réponse pour l'instant."}>Les réponses de tes prospects apparaîtront ici.</Empty> : (
        <div className="grid gap-4 max-w-3xl">{[...rows].sort((a, b) => (b.id === focus) - (a.id === focus)).map((r) => <div key={r.id} className={r.id === focus ? "rounded-3xl ring-2 ring-accent ring-offset-2" : ""}><ReplyCard r={r} onChange={load} /></div>)}</div>
      )}
    </div>
  );
}
