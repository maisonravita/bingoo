import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHead } from "../components/ui";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";

const IDEAS = [
  "Qui devrais-je contacter cette semaine, et pourquoi ?",
  "Montre-moi les entreprises du Radar qui recrutent en Île-de-France et prépare les e-mails des 3 meilleures",
  "Lance une mission : 10 rendez-vous avec des cliniques à Lyon d'ici fin janvier",
  "Quelles réponses dois-je traiter en priorité ?",
  "Comment me positionner face à mes concurrents ?",
];

const KEY = (id) => `bingoo:assistant:${id}`;
const load = (id) => { try { return JSON.parse(sessionStorage.getItem(KEY(id)) || "[]"); } catch { return []; } };
const save = (id, m) => { try { sessionStorage.setItem(KEY(id), JSON.stringify(m.slice(-30))); } catch { /* stockage indisponible */ } };

export default function Assistant() {
  const { ws } = useWs();
  const [msgs, setMsgs] = useState(() => load(ws.id));
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => { setMsgs(load(ws.id)); }, [ws.id]);
  useEffect(() => { save(ws.id, msgs); end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, ws.id]);

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

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <PageHead title="Assistant" sub="Dis ce que tu veux en une phrase : Bingoo cherche, prépare et te montre le résultat. Rien n'est envoyé sans ta validation." />
      <div className="flex-1 space-y-4">
        {!msgs.length && (
          <Card className="p-5">
            <p className="font-semibold">Par exemple</p>
            <div className="mt-3 flex flex-col gap-2">
              {IDEAS.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-left rounded-xl border border-line bg-white px-4 py-3 text-sm hover:border-ink/40">{s}</button>
              ))}
            </div>
          </Card>
        )}
        {msgs.map((m, i) => m.role === "user" ? (
          <div key={i} className="flex justify-end"><div className="max-w-[85%] rounded-2xl bg-ink text-white px-4 py-2.5 text-sm whitespace-pre-wrap">{m.text}</div></div>
        ) : (
          <div key={i} className="max-w-[92%]">
            {!!m.steps?.length && (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {m.steps.map((s, j) => <span key={j} className="rounded-full bg-paper border border-line px-2.5 py-0.5 text-[11px] text-ink-soft">✓ {s.label}</span>)}
              </div>
            )}
            <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.error ? "border-bad/30 bg-bad-soft text-bad" : "border-line bg-white"}`}>{m.text}</div>
            {!!m.links?.length && (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.links.map((l) => <Link key={l.to} to={l.to} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium hover:border-ink/40">{l.label} ›</Link>)}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="text-sm text-ink-faint animate-pulse">Bingoo travaille… (jusqu'à une minute si des e-mails sont à préparer)</div>}
        <div ref={end} />
      </div>
      <div className="sticky bottom-16 md:bottom-0 mt-4 bg-paper pt-2 pb-3">
        <div className="flex gap-2 items-end">
          <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2} placeholder="Ta demande…"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="flex-1 rounded-xl border border-line px-3 py-2.5 bg-white text-sm resize-none" />
          <button disabled={busy || !q.trim()} onClick={() => send()} className="rounded-full bg-ink text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40">Envoyer</button>
        </div>
        {!!msgs.length && <button className="mt-1.5 text-xs text-ink-faint underline" onClick={() => setMsgs([])}>Nouvelle conversation</button>}
      </div>
    </div>
  );
}
