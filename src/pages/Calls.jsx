import { useCallback, useEffect, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Empty, PageHead, Spinner, Textarea, useToast } from "../components/ui";
import { CALL } from "../lib/labels";
import { STATUS, cx } from "../lib/utils";

const GOAL = 20;
const addDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export default function Calls() {
  const { ws } = useWs();
  const toast = useToast();
  const [queue, setQueue] = useState(null);
  const [today, setToday] = useState(0);
  const [i, setI] = useState(0);
  const [script, setScript] = useState({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const d = new Date().toISOString().slice(0, 10);
    const [due, fresh, c] = await Promise.all([
      supabase.from("prospects").select("*").eq("workspace_id", ws.id).neq("phone", "").lte("next_action_at", d).not("status", "in", "(client,refus,ignore)").order("next_action_at").limit(30),
      supabase.from("prospects").select("*").eq("workspace_id", ws.id).neq("phone", "").is("next_action_at", null).in("status", ["sans_email", "envoye", "pret"]).order("score", { ascending: false, nullsFirst: false }).limit(60),
      supabase.from("calls").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).gte("created_at", t.toISOString()),
    ]);
    const seen = new Set();
    setQueue([...(due.data ?? []), ...(fresh.data ?? [])].filter((p) => !seen.has(p.id) && seen.add(p.id)));
    setToday(c.count ?? 0);
    setI(0);
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);

  const p = queue?.[i];
  const getScript = async () => {
    setBusy("script");
    try { const r = await fn("call-script", { workspace_id: ws.id, prospect_id: p.id }); setScript((s) => ({ ...s, [p.id]: r.script })); } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const outcome = async (o) => {
    setBusy(o);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("calls").insert({ workspace_id: ws.id, prospect_id: p.id, outcome: o, notes, created_by: user?.id });
    const patch = {
      pas_joignable: { next_action_at: addDays(2), next_action: "Rappeler (pas joignable)" },
      rappeler: { next_action_at: addDays(3), next_action: "Rappeler" },
      interesse: { status: "repondu", next_action_at: addDays(1), next_action: "Envoyer les informations / proposer un RDV" },
      rdv: { status: "rdv", next_action_at: null, next_action: "" },
      refus: { status: "refus", next_action_at: addDays(150), next_action: "Reprendre contact (refus téléphonique)" },
      mauvais_numero: { phone: "", next_action_at: null, next_action: "" },
    }[o];
    if (notes) patch.notes = `${p.notes ? p.notes + "\n" : ""}Appel ${new Date().toLocaleDateString("fr-FR")} : ${notes}`;
    await supabase.from("prospects").update(patch).eq("id", p.id);
    if (["rdv", "refus", "interesse"].includes(o)) await supabase.from("messages").update({ status: "ignore" }).eq("prospect_id", p.id).eq("status", "brouillon");
    setNotes(""); setToday((x) => x + 1); setI((x) => x + 1); setBusy(null);
    if (o === "rdv") toast("Ajoute le créneau dans l'Agenda", "good");
  };

  return (
    <div>
      <PageHead title="Appels" sub="Les prospects à appeler, dans le bon ordre, avec un script préparé par l'IA.">
        <div className="text-right">
          <p className="text-sm text-ink-soft">Aujourd'hui</p>
          <p className="font-serif text-3xl tnum">{today}<span className="text-ink-faint text-xl">/{GOAL}</span></p>
        </div>
      </PageHead>
      <div className="h-1.5 bg-line rounded-full overflow-hidden mb-6 max-w-3xl"><div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, (today / GOAL) * 100)}%` }} /></div>
      {!queue ? <Spinner /> : !p ? <Empty title="Plus personne à appeler.">Les prospects avec un numéro de téléphone apparaissent ici, en commençant par les rappels prévus.</Empty> : (
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6 max-w-5xl">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              <Badge tone={STATUS[p.status]?.tone}>{STATUS[p.status]?.label}</Badge>
              {p.next_action && <Badge tone="warn">{p.next_action}</Badge>}
              <span className="text-xs text-ink-faint ml-auto">{i + 1} / {queue.length}</span>
            </div>
            <h2 className="font-serif text-3xl leading-tight mt-3">{p.name}</h2>
            <p className="text-sm text-ink-soft">{p.activity} · {[p.postal_code, p.city].filter(Boolean).join(" ")}</p>
            {p.contact_name && <p className="text-sm mt-1">Demander : <b>{p.contact_name}</b>{p.contact_role ? ` (${p.contact_role})` : ""}</p>}
            <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-ink text-white py-4 text-xl font-semibold hover:bg-black">📞 {p.phone}</a>
            {(p.signals?.length > 0 || p.insight) && (
              <div className="mt-4 text-sm space-y-1">
                {p.signals?.map((s, k) => <p key={k}>• {s.label}</p>)}
                {p.insight?.resume && <p className="text-ink-soft">{p.insight.resume}</p>}
              </div>
            )}
            {p.notes && <p className="text-xs text-ink-soft mt-3 whitespace-pre-line">{p.notes}</p>}
            <Textarea rows={2} placeholder="Notes de l'appel" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              {Object.entries(CALL).map(([k, l]) => (
                <Button key={k} size="sm" variant={k === "rdv" ? "accent" : k === "interesse" ? "primary" : "default"} loading={busy === k} onClick={() => outcome(k)}>{l}</Button>
              ))}
            </div>
            <button className="text-sm text-ink-soft mt-3" onClick={() => setI((x) => x + 1)}>Passer →</button>
          </Card>
          <Card className="p-5 sm:p-6">
            <h3 className="font-semibold">Script</h3>
            {script[p.id] ? <div className="mt-3 whitespace-pre-line text-sm leading-relaxed">{script[p.id]}</div> : (
              <div className="mt-3">
                <p className="text-sm text-ink-soft">L'IA écrit un script adapté à ce prospect : passer le standard, accroche, questions, objections, message vocal.</p>
                <Button className="mt-3" variant="primary" loading={busy === "script"} onClick={getScript}>Préparer le script</Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
