import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Empty, Input, PageHead, Spinner, Textarea, useToast } from "../components/ui";
import { cx } from "../lib/utils";

export default function Review() {
  const { ws } = useWs();
  const toast = useToast();
  const [queue, setQueue] = useState(null);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(null);
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(0);
  const start = useRef(null);
  const domainOk = ws.domain_status === "verified" || !!ws.integrations?.mailbox?.ok;

  const load = useCallback(async () => {
    const { data } = await supabase.from("messages").select("*, prospects(*)").eq("workspace_id", ws.id).eq("status", "brouillon").order("step", { ascending: false }).order("created_at").limit(100);
    setQueue(data ?? []);
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);

  const cur = queue?.[0];
  const lock = useRef(false); // un seul envoi à la fois, même en cas de double clic
  const next = () => { setEdit(false); setDx(0); setLeaving(0); setQueue((q) => q.slice(1)); window.dispatchEvent(new Event("kairo:refresh")); };
  const animateOut = (dir, after) => { setLeaving(dir); setTimeout(after, 220); };

  const save = async () => {
    await supabase.from("messages").update({ subject: cur.subject, body: cur.body }).eq("id", cur.id);
  };
  const send = async () => {
    if (!cur || busy || lock.current) return;
    lock.current = true;
    if (!domainOk) return toast("Connecte d'abord ta boîte mail (Connexions) ou ton domaine d'envoi (Réglages)", "bad");
    setBusy("send");
    try {
      if (edit) await save();
      const r = await fn("m/send", { workspace_id: ws.id, message_id: cur.id });
      if (r.error) throw new Error(r.error);
      toast(r.skipped ? `Non envoyé : ${r.skipped}` : `Envoyé à ${cur.prospects?.name} · ${r.sent_today}/${r.limit} aujourd'hui`, r.skipped ? "default" : "good");
      animateOut(1, () => { next(); lock.current = false; });
    } catch (e) { toast(e.message, "bad"); setDx(0); lock.current = false; } finally { setBusy(null); }
  };
  const skip = async () => {
    if (!cur || busy) return;
    setBusy("skip");
    await supabase.from("messages").update({ status: "ignore" }).eq("id", cur.id);
    if (cur.step === 0) await supabase.from("prospects").update({ status: "ignore" }).eq("id", cur.prospect_id);
    setBusy(null);
    animateOut(-1, next);
  };
  const replied = async () => {
    setBusy("replied");
    await supabase.from("messages").update({ status: "ignore" }).eq("id", cur.id);
    await supabase.from("prospects").update({ status: "repondu" }).eq("id", cur.prospect_id);
    setBusy(null);
    toast("Noté : il a répondu. Pas de relance.", "good");
    animateOut(-1, next);
  };
  const rewrite = async () => {
    setBusy("rewrite");
    try {
      const fresh = await fn("redraft", { workspace_id: ws.id, message_id: cur.id });
      setQueue((q) => [{ ...fresh, prospects: cur.prospects }, ...q.slice(1)]);
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (edit || ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (e.key === "ArrowRight") send();
      if (e.key === "ArrowLeft") skip();
      if (e.key.toLowerCase() === "e") { e.preventDefault(); setEdit(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onDown = (e) => { if (edit || e.target.closest("button,a,textarea,input")) return; start.current = e.clientX; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => { if (start.current != null) setDx(e.clientX - start.current); };
  const onUp = () => {
    if (start.current == null) return;
    start.current = null;
    if (dx > 110) send(); else if (dx < -110) skip(); else setDx(0);
  };

  if (!queue) return <div className="text-ink-soft"><Spinner /></div>;
  if (!cur) return (
    <>
      <PageHead title="À valider" />
      <Empty title="Tout est validé.">Lance la rédaction de nouveaux messages depuis <Link to="/" className="underline">Ta journée</Link>.</Empty>
    </>
  );
  const p = cur.prospects ?? {};
  const x = leaving ? leaving * 700 : dx;
  const hint = dx > 60 ? "send" : dx < -60 ? "skip" : null;

  return (
    <div>
      <PageHead title="À valider" sub={<>{queue.length} en attente<span className="hidden md:inline"> · → envoyer · ← passer · E modifier</span></>} />
      {!domainOk && <p className="mb-4 text-sm bg-warn-soft text-warn rounded-xl px-4 py-3">Pour envoyer, connecte ta boîte mail (2 minutes) ou vérifie ton domaine d'envoi. En attendant, tu peux relire et modifier. <Link to="/connexions" className="underline font-semibold">Connecter ma boîte</Link> · <Link to="/reglages#domaine" className="underline font-semibold">Domaine</Link></p>}

      <div className="relative max-w-2xl">
        {queue[1] && <div className="absolute inset-x-4 top-3 bottom-24 bg-white/60 border border-line rounded-3xl pointer-events-none" aria-hidden />}
        <article
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          style={{ transform: `translateX(${x}px) rotate(${x / 40}deg)`, transition: start.current != null ? "none" : "transform .22s ease-out", touchAction: "pan-y" }}
          className={cx("relative bg-white border rounded-3xl p-5 sm:p-7 shadow-sm select-none", hint === "send" ? "border-good" : hint === "skip" ? "border-bad" : "border-line")}>
          {hint && <span className={cx("absolute top-5 right-5 rounded-full px-3 py-1 text-sm font-bold", hint === "send" ? "bg-good text-white" : "bg-bad text-white")}>{hint === "send" ? "Envoyer" : "Passer"}</span>}
          <div className="flex flex-wrap items-center gap-2">
            {cur.step > 0 ? <Badge tone="warn">Relance n°{cur.step}</Badge> : <Badge tone="accent">Premier message</Badge>}
            <Badge>{p.activity}</Badge>
          </div>
          <h2 className="font-serif text-3xl leading-tight mt-3">{p.name}</h2>
          <p className="text-sm text-ink-soft mt-1">
            {[p.contact_name && `${p.contact_name}${p.contact_role ? `, ${p.contact_role}` : ""}`, [p.postal_code, p.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
          </p>
          <p className="text-sm mt-1"><span className="text-ink-soft">À :</span> <span className="font-medium">{p.email}</span>{p.website && <> · <a href={p.website} target="_blank" rel="noreferrer" className="text-ink-soft underline">site</a></>}</p>

          <div className="mt-5 pt-5 border-t border-line">
            {edit ? (
              <div className="space-y-3">
                <Input value={cur.subject} onChange={(e) => setQueue((q) => [{ ...cur, subject: e.target.value }, ...q.slice(1)])} />
                <Textarea rows={11} value={cur.body} onChange={(e) => setQueue((q) => [{ ...cur, body: e.target.value }, ...q.slice(1)])} />
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" onClick={async () => { await save(); setEdit(false); toast("Modifications enregistrées"); }}>Enregistrer</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEdit(false)}>Fermer</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-semibold">{cur.subject}</p>
                <div className="mt-3 whitespace-pre-line leading-relaxed text-[15px]">{cur.body}</div>
                <p className="mt-4 text-sm text-ink-faint whitespace-pre-line">{ws.signature || `${ws.sender_name}\n${ws.profile?.nom || ws.name}`}</p>
              </>
            )}
          </div>
        </article>

        <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 mt-6">
          <Button size="lg" variant="default" onClick={skip} loading={busy === "skip"} aria-label="Passer">← Passer</Button>
          {!edit && <Button size="lg" variant="ghost" onClick={() => setEdit(true)}>Modifier</Button>}
          {cur.step === 0 ? (
            <Button quota="redaction" size="lg" variant="ghost" onClick={rewrite} loading={busy === "rewrite"}>Réécrire</Button>
          ) : (
            <Button size="lg" variant="ghost" onClick={replied} loading={busy === "replied"}>Il a répondu</Button>
          )}
          <Button size="lg" variant="accent" onClick={send} loading={busy === "send"} disabled={!domainOk}>Envoyer →</Button>
        </div>
      </div>
    </div>
  );
}
