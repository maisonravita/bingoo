import { useCallback, useEffect, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Empty, PageHead, Spinner, Textarea, useToast } from "../components/ui";
import { CALL } from "../lib/labels";
import { useAller } from "../lib/lieu";
import { STATUS, cx } from "../lib/utils";

const addDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export default function Calls() {
  const { ws } = useWs();
  const toast = useToast();
  const [queue, setQueue] = useState(null);
  const [today, setToday] = useState(0);
  const [i, setI] = useState(0);
  const nav = useAller();
  const [script, setScript] = useState({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const d = new Date().toISOString().slice(0, 10);
    const [due, fresh, c] = await Promise.all([
      // D'abord les appels prévus (sans réponse après les relances, rappels notés), avec ou sans numéro
      supabase.from("prospects").select("*").eq("workspace_id", ws.id).lte("next_action_at", d).or(`phone.neq."",next_action.ilike.%appeler%`).not("status", "in", "(client,refus,ignore,rdv)").order("next_action_at").limit(30),
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
  const [numero, setNumero] = useState("");
  const trouverNumero = async () => {
    setBusy("numero"); setNumero("");
    try {
      const r = await fn("r/find-phone", { workspace_id: ws.id, id: p.id });
      const { data } = await supabase.from("prospects").select("*").eq("id", p.id).single();
      if (data) setQueue((q) => q.map((x) => x.id === p.id ? data : x));
      setNumero(r.phone ? "" : (r.note || "Aucun numéro trouvé"));
    } catch (e) { setNumero(e.message); } finally { setBusy(null); }
  };
  const getScript = async () => {
    setBusy("script");
    try { const r = await fn("call-script", { workspace_id: ws.id, prospect_id: p.id }); setScript((s) => ({ ...s, [p.id]: r.script })); } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const outcome = async (o) => {
    if (busy) return;
    setBusy(o);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: e1 } = await supabase.from("calls").insert({ workspace_id: ws.id, prospect_id: p.id, outcome: o, notes, created_by: user?.id });
    if (e1) { setBusy(null); return toast("L'appel n'a pas pu être enregistré. Réessaie.", "bad"); }
    const patch = {
      pas_joignable: { next_action_at: addDays(2), next_action: "Rappeler (pas joignable)" },
      rappeler: { next_action_at: addDays(3), next_action: "Rappeler" },
      interesse: { status: "repondu", next_action_at: addDays(1), next_action: "Envoyer les informations / proposer un RDV" },
      rdv: { status: "rdv", next_action_at: null, next_action: "" },
      refus: { status: "refus", next_action_at: addDays(150), next_action: "Reprendre contact (refus téléphonique)" },
      mauvais_numero: { phone: "", next_action_at: null, next_action: "" },
    }[o];
    if (notes) patch.notes = `${p.notes ? p.notes + "\n" : ""}Appel ${new Date().toLocaleDateString("fr-FR")} : ${notes}`;
    const { error: e2 } = await supabase.from("prospects").update(patch).eq("id", p.id);
    if (e2) { setBusy(null); return toast("Appel noté, mais la fiche n'a pas été mise à jour. Réessaie.", "bad"); }
    if (["rdv", "refus", "interesse"].includes(o)) await supabase.from("messages").update({ status: "ignore" }).eq("prospect_id", p.id).eq("status", "brouillon");
    setNotes(""); setToday((x) => x + 1); setI((x) => x + 1); setBusy(null);
    if (o === "rdv") toast("Bravo ! Note le créneau dans Rendez-vous", "good", { label: "Ajouter le créneau", run: () => nav("/agenda") });
  };

  return (
    <div>
      <PageHead title="Appels" sub="Les entreprises qui n'ont pas répondu par e-mail : un appel, avec un script qui reprend ton message.">
        <p className="text-sm text-ink-soft tnum">{today} appel{today > 1 ? "s" : ""} aujourd'hui</p>
      </PageHead>
      {!queue ? <Spinner /> : !p ? <Empty title={i > 0 && queue.length ? "Tu as fait le tour de la liste." : "Plus personne à appeler."}>Les prospects avec un numéro de téléphone apparaissent ici, en commençant par les rappels prévus.
        {i > 0 && queue.length > 0 && <div className="mt-4"><Button variant="accent" onClick={() => { setI(0); load?.(); }}>Recommencer la liste</Button></div>}</Empty> : (
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
            {p.phone ? <>
              <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-ink text-white py-4 text-xl font-semibold hover:bg-black">📞 {p.phone}</a>
              {p.phone_source && <p className="mt-1.5 text-center text-xs text-ink-faint">Source : {p.phone_source}</p>}
            </> : (
              <div className="mt-5 rounded-2xl border border-dashed border-line p-4 text-center">
                <p className="text-sm text-ink-soft">Pas encore de numéro pour cette entreprise.</p>
                <Button className="mt-2" variant="primary" loading={busy === "numero"} onClick={trouverNumero}>Trouver le numéro du dirigeant</Button>
                <p className="mt-1.5 text-xs text-ink-faint">Recherche vérifiée : utilise des crédits. {numero}</p>
              </div>
            )}
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
                <Button key={k} size="sm" variant={k === "rdv" ? "accent" : k === "interesse" ? "primary" : "default"} loading={busy === k} disabled={!!busy} onClick={() => outcome(k)}>{l}</Button>
              ))}
            </div>
            <button className="text-sm text-ink-soft mt-3" onClick={() => setI((x) => x + 1)}>Passer →</button>
          </Card>
          <Card className="p-5 sm:p-6">
            <h3 className="font-semibold">Script</h3>
            {script[p.id] ? <div className="mt-3 whitespace-pre-line text-sm leading-relaxed">{script[p.id]}</div> : (
              <div className="mt-3">
                <p className="text-sm text-ink-soft">Un script pour cette entreprise : il rappelle ton e-mail et le fait récent, puis comment passer le standard, les questions, les objections et le message vocal.</p>
                <Button className="mt-3" variant="primary" loading={busy === "script"} onClick={getScript}>Préparer le script</Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
