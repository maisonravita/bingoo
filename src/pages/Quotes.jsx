import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Empty, Field, Input, PageHead, Spinner, Textarea, useToast } from "../components/ui";
import ProspectPicker from "../components/ProspectPicker";
import { QUOTE, eur, eur2 } from "../lib/labels";
import { fmtDate } from "../lib/utils";

const totals = (lines, vat) => { const ht = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0); return { ht, tva: ht * vat / 100, ttc: ht * (1 + vat / 100) }; };

function Editor({ quote, prospect, onClose }) {
  const { ws } = useWs();
  const toast = useToast();
  const [p, setP] = useState(quote?.prospects ?? prospect ?? null);
  const [q, setQ] = useState(quote ?? { title: "", lines: [{ label: "", qty: 1, unit: "", price: 0 }], recurring: false, notes: "", vat_rate: ws.vat_rate, valid_until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(null);
  const setLine = (i, k, v) => setQ({ ...q, lines: q.lines.map((l, j) => j === i ? { ...l, [k]: v } : l) });
  const t = totals(q.lines, Number(q.vat_rate) || 0);
  const save = async () => {
    if (!p) { toast("Choisis le prospect", "bad"); return null; }
    const lines = q.lines.filter((l) => l.label.trim()).map((l) => ({ ...l, qty: Number(l.qty) || 0, price: Number(l.price) || 0 }));
    if (!lines.length) { toast("Ajoute au moins une ligne", "bad"); return null; }
    const row = { workspace_id: ws.id, prospect_id: p.id, title: q.title, lines, recurring: q.recurring, notes: q.notes, vat_rate: Number(q.vat_rate) || 0, valid_until: q.valid_until || null, total_ht: totals(lines, 0).ht };
    if (q.id) { const { error } = await supabase.from("quotes").update(row).eq("id", q.id); if (error) throw error; return q.id; }
    const { count } = await supabase.from("quotes").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id);
    const { data, error } = await supabase.from("quotes").insert({ ...row, number: `D-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, "0")}` }).select("id").single();
    if (error) throw error;
    setQ((x) => ({ ...x, id: data.id }));
    return data.id;
  };
  const run = async (kind) => {
    setBusy(kind);
    try {
      const id = await save();
      if (!id) return;
      if (kind === "send") { await fn("quote-send", { workspace_id: ws.id, quote_id: id }); toast("Devis envoyé", "good"); }
      else toast("Enregistré", "good");
      onClose();
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  return (
    <Card className="p-5 sm:p-6 space-y-4 rise">
      <div className="flex justify-between"><h2 className="font-serif text-2xl">{q.number || "Nouveau devis"}</h2><button className="text-sm text-ink-soft" onClick={onClose}>✕</button></div>
      <ProspectPicker value={p} onChange={setP} />
      <Field label="Objet"><Input value={q.title} onChange={(e) => setQ({ ...q, title: e.target.value })} placeholder="Ex. Entretien des bureaux – 3 passages par semaine" /></Field>
      <div>
        <p className="text-[13px] font-semibold mb-1.5">Lignes</p>
        {ws.catalog?.length > 0 && <div className="flex flex-wrap gap-1.5 mb-2">{ws.catalog.map((c, i) => <button key={i} className="rounded-full border border-line bg-white px-3 py-1 text-xs hover:border-ink-faint" onClick={() => setQ({ ...q, lines: [...q.lines.filter((l) => l.label), { label: c.label, qty: 1, unit: c.unit, price: c.price }] })}>+ {c.label}</button>)}</div>}
        <div className="space-y-2">
          {q.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_64px_72px_96px_28px] gap-2 items-center">
              <Input value={l.label} onChange={(e) => setLine(i, "label", e.target.value)} placeholder="Prestation" className="py-2 text-sm" />
              <Input type="number" value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value)} className="py-2 text-sm" aria-label="Quantité" />
              <Input value={l.unit} onChange={(e) => setLine(i, "unit", e.target.value)} placeholder="unité" className="py-2 text-sm" />
              <Input type="number" value={l.price} onChange={(e) => setLine(i, "price", e.target.value)} className="py-2 text-sm" aria-label="Prix unitaire HT" />
              <button className="text-ink-faint hover:text-bad" onClick={() => setQ({ ...q, lines: q.lines.filter((_, j) => j !== i) })} aria-label="Supprimer">✕</button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => setQ({ ...q, lines: [...q.lines, { label: "", qty: 1, unit: "", price: 0 }] })}>+ Ligne</Button>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="TVA (%)"><Input type="number" value={q.vat_rate} onChange={(e) => setQ({ ...q, vat_rate: e.target.value })} /></Field>
        <Field label="Valable jusqu'au"><Input type="date" value={q.valid_until ?? ""} onChange={(e) => setQ({ ...q, valid_until: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm pt-6"><input type="checkbox" checked={q.recurring} onChange={(e) => setQ({ ...q, recurring: e.target.checked })} /> Montant mensuel</label>
      </div>
      <Field label="Conditions et notes"><Textarea rows={3} value={q.notes} onChange={(e) => setQ({ ...q, notes: e.target.value })} placeholder="Démarrage, durée d'engagement, modalités de paiement…" /></Field>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
        <p className="text-sm">Total : <b className="text-lg">{eur2(t.ht)} HT</b>{q.recurring && " / mois"} <span className="text-ink-soft">· {eur2(t.ttc)} TTC</span></p>
        <div className="flex gap-2"><Button loading={busy === "save"} onClick={() => run("save")}>Enregistrer</Button><Button variant="accent" loading={busy === "send"} onClick={() => run("send")}>Envoyer pour signature</Button></div>
      </div>
    </Card>
  );
}

export default function Quotes() {
  const { ws } = useWs();
  const [rows, setRows] = useState(null);
  const loc = useLocation();
  const [edit, setEdit] = useState(loc.state?.prospect ? { prospect: loc.state.prospect } : null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("quotes").select("*, prospects(*)").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(200);
    setRows(data ?? []);
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);
  const sum = (st) => (rows ?? []).filter((r) => st.includes(r.status)).reduce((s, r) => s + (Number(r.total_ht) || totals(r.lines ?? [], 0).ht), 0);
  const base = ws.app_url || window.location.href.split("#")[0].replace(/\/$/, "");

  return (
    <div>
      <PageHead title="Devis" sub="Le prospect consulte et signe en ligne. Tu es prévenu dès qu'il l'ouvre et qu'il signe.">
        <Button variant="primary" onClick={() => setEdit({})}>Nouveau devis</Button>
      </PageHead>
      {rows && rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6 max-w-2xl">
          {[["En attente", ["envoye", "vu"]], ["Signés", ["signe"]], ["Brouillons", ["brouillon"]]].map(([l, st]) => (
            <Card key={l} className="p-4"><p className="text-[13px] text-ink-soft">{l}</p><p className="font-serif text-3xl mt-1">{eur(sum(st))}</p></Card>
          ))}
        </div>
      )}
      {edit && <div className="max-w-3xl mb-6"><Editor quote={edit.id ? edit : null} prospect={edit.prospect} onClose={() => { setEdit(null); load(); }} /></div>}
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty title="Aucun devis.">Après un rendez-vous qualifié, crée le devis ici : il part avec un lien de signature en ligne.</Empty> : (
        <div className="bg-white border border-line rounded-2xl divide-y divide-line max-w-4xl">
          {rows.map((r) => (
            <div key={r.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.prospects?.name ?? "—"} <span className="text-ink-soft font-normal">· {r.number}</span></p>
                <p className="text-[13px] text-ink-soft truncate">{r.title || "Sans objet"} · {fmtDate(r.created_at)}{r.viewed_at ? ` · ouvert le ${fmtDate(r.viewed_at)}` : ""}{r.signed_name ? ` · signé par ${r.signed_name}` : ""}</p>
              </div>
              <p className="font-semibold tnum">{eur(Number(r.total_ht) || totals(r.lines ?? [], 0).ht)}{r.recurring ? "/mois" : ""}</p>
              <Badge tone={QUOTE[r.status].tone}>{QUOTE[r.status].label}</Badge>
              {r.status === "brouillon" ? <Button size="sm" onClick={() => setEdit(r)}>Modifier</Button> : <a href={`${base}/#/devis/${r.token}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">Voir ↗</Button></a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
