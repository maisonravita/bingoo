import { useCallback, useEffect, useRef, useState } from "react";
import Guide from "../components/Guide";
import { Link } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Empty, Input, PageHead, Spinner, Textarea, useToast } from "../components/ui";
import { cx } from "../lib/utils";
import Opportunite from "../components/Opportunite";
import Appris from "../components/Appris";

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
    // Ouvert depuis « Modifier » sur une carte : ce message-là d'abord, en mode édition
    const id = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("id");
    const rows = data ?? [];
    setQueue(id ? [...rows].sort((a, b) => (b.id === id) - (a.id === id)) : rows);
    if (id && rows.some((r) => r.id === id)) setEdit(true);
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);

  const cur = queue?.[0];
  const lock = useRef(false); // un seul envoi à la fois, même en cas de double clic
  const next = () => { setEdit(false); setDx(0); setLeaving(0); setQueue((q) => q.slice(1)); window.dispatchEvent(new Event("kairo:refresh")); };
  const animateOut = (dir, after) => { setLeaving(dir); setTimeout(after, 220); };

  // Version rédigée par Bingoo!, gardée pour apprendre des corrections (« Bingoo! écrit comme toi »)
  const orig = useRef({});
  if (cur && orig.current[cur.id] === undefined) orig.current[cur.id] = cur.body;
  const save = async () => {
    const avant = orig.current[cur.id];
    const change = avant && avant.trim() !== (cur.body ?? "").trim();
    // Message relu et corrigé par le client : le doute sur les faits est levé (c'est lui qui valide)
    await supabase.from("messages").update({ subject: cur.subject, body: cur.body, ...(change ? { check_note: "", edited: true } : {}) }).eq("id", cur.id);
    if (change && cur.check_note) setQueue((q) => [{ ...q[0], check_note: "" }, ...q.slice(1)]);
    if (avant && avant.trim() !== (cur.body ?? "").trim()) { orig.current[cur.id] = cur.body; fn("r/style-learn", { workspace_id: ws.id, before: avant, after: cur.body }).catch(() => {}); }
  };
  // Écarter en disant pourquoi : le tri des prochaines fiches en tient compte
  const refuse = async (raison) => {
    if (!cur || busy) return;
    setBusy("refus");
    try { await fn("r/refus", { workspace_id: ws.id, id: cur.prospect_id, raison }); toast(`${cur.prospects?.name || "Fiche"} écartée. Bingoo! s'en souviendra.`); animateOut(-1, next); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
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
    const m = cur, avant = cur.prospects?.status;
    await supabase.from("messages").update({ status: "ignore" }).eq("id", m.id);
    if (m.step === 0) await supabase.from("prospects").update({ status: "ignore" }).eq("id", m.prospect_id);
    setBusy(null);
    animateOut(-1, next);
    toast(`${m.prospects?.name || "Prospect"} écarté`, "default", { label: "Annuler", run: async () => {
      await supabase.from("messages").update({ status: "brouillon" }).eq("id", m.id).eq("status", "ignore");
      if (m.step === 0 && avant) await supabase.from("prospects").update({ status: avant }).eq("id", m.prospect_id).eq("status", "ignore");
      load();
    } });
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
    // Raccourcis : traiter 50 messages au clavier sans toucher la souris
    const onKey = (e) => {
      if (!cur || e.metaKey && !edit || e.altKey) return;
      if (edit) {
        if (e.key === "Escape") { e.preventDefault(); setEdit(false); }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save().then(() => { setEdit(false); toast("Modifications enregistrées"); }); }
        return;
      }
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) || e.ctrlKey || e.repeat || busy) return;
      const k = e.key.toLowerCase();
      if (e.key === "ArrowRight" || k === "v") { e.preventDefault(); if (domainOk) send(); }
      else if (e.key === "ArrowLeft" || k === "p") { e.preventDefault(); skip(); }
      else if (k === "e") { e.preventDefault(); setEdit(true); }
      else if (k === "r" && cur.step === 0) { e.preventDefault(); rewrite(); }
      else if (cur.step === 0 && /^[1-5]$/.test(e.key)) { e.preventDefault(); refuse(["Pas ma cible", "Trop petite", "Trop grande", "Déjà client", "Concurrent"].at(Number(e.key) - 1)); }
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
      <PageHead title="Atelier" />
      <Empty title="Aucune opportunité à traiter.">Bingoo! n'écrit que lorsqu'une entreprise a un fait récent et vérifié. Les prochaines arrivent ici d'elles-mêmes.</Empty>
    </>
  );
  const p = cur.prospects ?? {};
  const x = leaving ? leaving * 700 : dx;
  const hint = dx > 60 ? "send" : dx < -60 ? "skip" : null;

  return (
    <div>
      <PageHead title="Atelier" resume sub={<>{queue.length} opportunité{queue.length > 1 ? "s" : ""} prête{queue.length > 1 ? "s" : ""}</>} />
      <Guide id="valider" titre="Ici : les messages que Bingoo! a écrits pour toi. Rien ne part sans ton accord." etapes={["Lis le message. S'il te va, clique « Envoyer » (ou glisse vers la droite).", "Tu veux changer un mot ? « Modifier ». Bingoo! apprend ton style.", "L'entreprise ne te correspond pas ? Clique sur la raison (« Pas ma cible »…) : Bingoo! s'en souviendra."]} />
      {!domainOk && <p className="mb-4 text-sm bg-warn-soft text-warn rounded-xl px-4 py-3">Pour envoyer, connecte ta boîte mail (2 minutes) ou vérifie ton domaine d'envoi. En attendant, tu peux relire et modifier. <Link to="/connexions" className="underline font-semibold">Connecter ma boîte</Link> · <Link to="/reglages#domaine" className="underline font-semibold">Domaine</Link></p>}

      <Appris className="mb-4 max-w-2xl" />
      <div className="relative max-w-2xl">
        {queue[1] && <div className="absolute inset-x-4 top-3 bottom-24 bg-white/60 border border-line rounded-3xl pointer-events-none" aria-hidden />}
        <article
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          style={{ transform: `translateX(${x}px) rotate(${x / 40}deg)`, transition: start.current != null ? "none" : "transform .22s ease-out", touchAction: "pan-y" }}
          className={cx("relative bg-white border rounded-3xl p-5 sm:p-7 shadow-sm select-none", hint === "send" ? "border-good" : hint === "skip" ? "border-bad" : "border-line")}>
          {hint && <span className={cx("absolute top-5 right-5 rounded-full px-3 py-1 text-sm font-bold", hint === "send" ? "bg-good text-white" : "bg-bad text-white")}>{hint === "send" ? "Envoyer" : "Passer"}</span>}
          <div className="flex flex-wrap items-center gap-2">
            {cur.step >= 100 ? <Badge tone="accent">Reprise de contact</Badge> : cur.step > 0 ? <Badge tone="warn">Relance n°{cur.step}</Badge> : <Badge tone="accent">Opportunité</Badge>}
            <Badge>{p.activity}</Badge>
          </div>
          <h2 className="mt-3 text-[30px] font-black leading-tight tracking-tight" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{p.name}</h2>
          <p className="text-sm text-ink-soft mt-0.5">{[[p.postal_code, p.city].filter(Boolean).join(" "), p.website && "site"].filter(Boolean).length ? <>{[p.postal_code, p.city].filter(Boolean).join(" ")}{p.website && <> · <a href={p.website} target="_blank" rel="noreferrer" className="underline">site</a></>}</> : null}</p>
          {/* L'opportunité : pourquoi maintenant, et à qui */}
          {cur.step === 0 ? <div className="mt-4"><Opportunite p={p} /></div> : (
            <p className="text-sm mt-2"><span className="text-ink-soft">À :</span> <span className="font-medium">{p.contact_name ? `${p.contact_name} · ` : ""}{p.email}</span></p>
          )}

          {cur.check_note && !edit && (
            <div className="mt-4 rounded-2xl border border-warn/40 bg-warn-soft px-4 py-3 text-[13.5px] text-warn">
              <p className="font-semibold">À vérifier avant d'envoyer : Bingoo! n'a pas trouvé de source pour</p>
              <ul className="mt-1 list-disc pl-5">{cur.check_note.split("\n").map((l) => <li key={l}>{l}</li>)}</ul>
              <p className="mt-1 text-[12.5px]">Corrige ou retire la phrase (« Modifier »), ou envoie si tu sais que c'est vrai.</p>
            </div>
          )}
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
                <p className="text-[12.5px] font-bold text-ink-soft">Le message</p>
                <p className="mt-1 font-semibold">{cur.subject}</p>
                <div className="mt-3 whitespace-pre-line leading-relaxed text-[15px]">{cur.body}</div>
                {/* Ce que le prospect reçoit vraiment : lien de réservation, signature, pied de page légal */}
                {ws.app_url && ws.booking_slug && cur.step < 2 && <p className="mt-4 text-[15px] leading-relaxed">Si c'est plus simple, vous pouvez choisir directement un créneau ici : <span className="text-accent-dark underline">ton lien de réservation</span></p>}
                <p className="mt-4 text-sm text-ink-faint whitespace-pre-line">{ws.signature?.trim() || `${ws.sender_name}\n${ws.profile?.nom || ws.name}`}</p>
                <p className="mt-4 pt-3 border-t border-line text-[12px] text-ink-faint">{ws.profile?.nom || ws.name}{ws.postal_address ? ` · ${ws.postal_address}` : " · adresse postale à ajouter dans Réglages"}<br />Pour ne plus recevoir de messages de notre part, répondez simplement « STOP ».</p>
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
        {cur.step === 0 && (
          <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[13px]">
            <span className="text-ink-soft mr-1">Pas pour toi ?</span>
            {["Pas ma cible", "Trop petite", "Trop grande", "Déjà client", "Concurrent"].map((r, i) => (
              <button key={r} disabled={!!busy} onClick={() => refuse(r)} className="rounded-full border border-line bg-white px-3 py-1 text-ink-soft hover:text-ink hover:border-ink-faint disabled:opacity-50"><kbd className="hidden md:inline mr-1 font-sans text-[11px] text-ink-faint">{i + 1}</kbd>{r}</button>
            ))}
          </div>
        )}
        {/* Les raccourcis, visibles sur ordinateur */}
        <p className="hidden md:flex relative z-10 mt-5 flex-wrap justify-center gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
          {(edit ? [["Ctrl + Entrée", "enregistrer"], ["Échap", "fermer"]] : [["V ou →", "envoyer"], ["P ou ←", "passer"], ["E", "modifier"], ...(cur.step === 0 ? [["R", "réécrire"], ["1 à 5", "écarter"]] : [])]).map(([k, l]) => (
            <span key={k}><kbd className="rounded-md border border-line bg-white px-1.5 py-0.5 font-sans text-[11.5px] font-semibold text-ink">{k}</kbd> {l}</span>
          ))}
        </p>
      </div>
    </div>
  );
}
