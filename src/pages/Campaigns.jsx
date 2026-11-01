import { useCallback, useEffect, useMemo, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Empty, Field, Input, PageHead, Spinner, Textarea, useToast } from "../components/ui";
import { cx, fmtDate } from "../lib/utils";

const GOALS = { rdv: "Obtenir un RDV", devis: "Obtenir une demande de devis", visite: "Obtenir une visite", essai: "Obtenir un essai / une démo" };
const STATUS = { active: ["En cours", "good"], pause: ["En pause", "warn"], terminee: ["Terminée", "muted"] };
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : "—");
const blank = () => [{ key: "A", nom: "", angle: "", objet: "" }, { key: "B", nom: "", angle: "", objet: "" }];

/** Une ligne par prospect contacté : on agrège premier message et relances. */
function statsOf(msgs) {
  const per = new Map();
  for (const m of msgs) {
    const cur = per.get(m.prospect_id) ?? { v: m.variant || "A", o: false, c: false, b: false, st: m.prospects?.status ?? "" };
    cur.o ||= !!m.opened_at; cur.c ||= !!m.clicked_at; cur.b ||= !!m.bounced;
    per.set(m.prospect_id, cur);
  }
  const by = {};
  for (const x of per.values()) {
    const s = (by[x.v] ??= { sent: 0, opened: 0, clicked: 0, bounced: 0, replied: 0, rdv: 0, clients: 0 });
    s.sent++; if (x.o) s.opened++; if (x.c) s.clicked++; if (x.b) s.bounced++;
    if (["repondu", "rdv", "client", "refus"].includes(x.st)) s.replied++;
    if (["rdv", "client"].includes(x.st)) s.rdv++;
    if (x.st === "client") s.clients++;
  }
  return by;
}
const sum = (by) => Object.values(by).reduce((t, s) => { for (const k in s) t[k] = (t[k] ?? 0) + s[k]; return t; }, { sent: 0, opened: 0, clicked: 0, replied: 0, rdv: 0, clients: 0, bounced: 0 });

function NewCampaign({ onDone, onCancel }) {
  const { ws } = useWs();
  const toast = useToast();
  const targets = (ws.targets ?? []).filter((t) => t.actif !== false);
  const [f, setF] = useState({ name: "", target_id: targets[0]?.id ?? "", goal: "rdv", count: 50, followups: true, ends_on: "", variants: blank() });
  const [busy, setBusy] = useState(null);
  const [tip, setTip] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setV = (i, k, v) => setF((x) => ({ ...x, variants: x.variants.map((y, j) => (j === i ? { ...y, [k]: v } : y)) }));
  const suggest = async () => {
    setBusy("ia");
    try { const r = await fn("campaign-suggest", { workspace_id: ws.id, target_id: f.target_id, goal: f.goal }); set("variants", r.variants); setTip(r.conseil); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const create = async () => {
    setBusy("go");
    try {
      const r = await fn("campaign-create", { workspace_id: ws.id, ...f, variants: f.variants.filter((v) => v.angle.trim()) });
      toast(`Campagne lancée avec ${r.assigned} prospects`, "good"); onDone();
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const t = targets.find((x) => x.id === f.target_id);
  return (
    <Card className="p-5 sm:p-6 mb-6 rise">
      <p className="font-serif text-2xl">Nouvelle campagne</p>
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <Field label="Nom"><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex. EHPAD Île-de-France — novembre" /></Field>
        <Field label="Cible">
          <select className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px]" value={f.target_id} onChange={(e) => set("target_id", e.target.value)}>
            {targets.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </Field>
        <Field label="Objectif">
          <select className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px]" value={f.goal} onChange={(e) => set("goal", e.target.value)}>
            {Object.entries(GOALS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prospects" hint="Les mieux notés de la cible"><Input type="number" min={1} max={500} value={f.count} onChange={(e) => set("count", e.target.value)} /></Field>
          <Field label="Fin (facultatif)"><Input type="date" value={f.ends_on} onChange={(e) => set("ends_on", e.target.value)} /></Field>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={f.followups} onChange={(e) => set("followups", e.target.checked)} /> Relances automatiques à J+4 et J+9 (s'arrêtent dès qu'il répond)</label>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-6">
        <div><p className="font-semibold">Test A/B</p><p className="text-sm text-ink-soft">Les prospects sont répartis entre les versions. Quand une version fait nettement plus répondre, elle est envoyée à tous.</p></div>
        <Button size="sm" variant="primary" loading={busy === "ia"} disabled={!t} onClick={suggest}>Proposer avec l'IA</Button>
      </div>
      {tip && <p className="text-sm bg-accent-soft rounded-xl p-3 mt-3">{tip}</p>}
      <div className="grid lg:grid-cols-2 gap-3 mt-3">
        {f.variants.map((v, i) => (
          <div key={v.key} className="rounded-xl border border-line p-3 bg-paper/50">
            <div className="flex items-center gap-2"><Badge tone="accent">Version {v.key}</Badge><Input value={v.nom} onChange={(e) => setV(i, "nom", e.target.value)} placeholder="Nom court (ex. Gain de temps)" className="!py-1.5 text-sm" /></div>
            <Textarea rows={3} className="mt-2 text-sm" value={v.angle} onChange={(e) => setV(i, "angle", e.target.value)} placeholder="Angle : l'argument qui guidera chaque e-mail" />
            <Input className="mt-2 text-sm" value={v.objet} onChange={(e) => setV(i, "objet", e.target.value)} placeholder="Objet de l'e-mail" />
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-3 text-sm">
        {f.variants.length < 3 && <button className="text-accent font-semibold" onClick={() => set("variants", [...f.variants, { key: "C", nom: "", angle: "", objet: "" }])}>+ Version C</button>}
        {f.variants.length > 1 && <button className="text-ink-soft" onClick={() => set("variants", f.variants.slice(0, -1))}>Retirer la dernière</button>}
      </div>
      <p className="text-xs text-ink-faint mt-2">Laisse les angles vides pour utiliser l'argument habituel de la cible, sans test A/B.</p>
      <div className="flex gap-2 mt-5">
        <Button variant="accent" loading={busy === "go"} disabled={!f.name.trim() || !t} onClick={create}>Lancer la campagne</Button>
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
      </div>
    </Card>
  );
}

function CampaignCard({ c, msgs, count, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const by = useMemo(() => statsOf(msgs), [msgs]);
  const tot = sum(by);
  const t = ws.targets?.find((x) => x.id === c.target_id);
  const st = STATUS[c.status] ?? STATUS.active;
  const setStatus = async (status) => { await supabase.from("campaigns").update({ status }).eq("id", c.id); onChange(); };
  const analyze = async () => {
    setBusy(true); setOpen(true);
    try { await fn("campaign-analyze", { workspace_id: ws.id, campaign_id: c.id }); onChange(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const a = c.analysis;
  const variants = (c.variants ?? []).length ? c.variants : [{ key: "A", nom: "Argument de la cible" }];
  return (
    <Card className="p-5 sm:p-6 min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-[220px]">
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-serif text-2xl leading-tight">{c.name}</h3><Badge tone={st[1]}>{st[0]}</Badge></div>
          <p className="text-sm text-ink-soft mt-0.5">{[t?.label, GOALS[c.goal], `${count} prospects`, `depuis le ${fmtDate(c.starts_on)}`, c.ends_on && `jusqu'au ${fmtDate(c.ends_on)}`].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.status === "active" && <Button size="sm" onClick={() => setStatus("pause")}>Mettre en pause</Button>}
          {c.status === "pause" && <Button size="sm" variant="primary" onClick={() => setStatus("active")}>Reprendre</Button>}
          {c.status !== "terminee" && <Button size="sm" variant="ghost" onClick={() => setStatus("terminee")}>Terminer</Button>}
          <Button size="sm" variant="primary" loading={busy} onClick={analyze}>Analyser</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-5">
        {[["Contactés", tot.sent], ["Ouverts", pct(tot.opened, tot.sent)], ["Cliqués", pct(tot.clicked, tot.sent)], ["Réponses", pct(tot.replied, tot.sent)], ["RDV", tot.rdv], ["Clients", tot.clients]].map(([l, v]) => (
          <div key={l}><p className="text-xs text-ink-soft">{l}</p><p className="font-serif text-2xl tnum leading-tight">{v}</p></div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="text-left text-xs text-ink-soft border-b border-line"><th className="py-2">Version</th><th className="text-right">Contactés</th><th className="text-right">Ouverts</th><th className="text-right">Cliqués</th><th className="text-right">Réponses</th><th className="text-right">RDV</th><th className="text-right">Rebonds</th></tr></thead>
          <tbody className="divide-y divide-line">
            {variants.map((v) => {
              const s = by[v.key] ?? { sent: 0, opened: 0, clicked: 0, replied: 0, rdv: 0, bounced: 0 };
              const win = c.winner === v.key;
              return (
                <tr key={v.key} className={cx(c.winner && !win && "opacity-60")}>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2"><Badge tone={win ? "good" : "accent"}>{v.key}</Badge><span className="font-medium">{v.nom || "Version " + v.key}</span>{win && <span className="text-xs font-semibold text-good">gagnante</span>}</div>
                    {v.objet && <p className="text-xs text-ink-soft mt-0.5">Objet : {v.objet}</p>}
                  </td>
                  <td className="text-right tnum">{s.sent}</td><td className="text-right tnum">{pct(s.opened, s.sent)}</td><td className="text-right tnum">{pct(s.clicked, s.sent)}</td>
                  <td className="text-right tnum font-semibold">{pct(s.replied, s.sent)}</td><td className="text-right tnum">{s.rdv}</td><td className="text-right tnum">{s.bounced || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {variants.length > 1 && !c.winner && <p className="text-xs text-ink-faint mt-2">La gagnante est désignée automatiquement à partir de 25 envois par version, quand l'écart de réponses est net (et pas dû au hasard).</p>}
      </div>

      {(a || busy) && (
        <div className="mt-5">
          <button className="text-sm font-semibold text-ink-soft" onClick={() => setOpen((x) => !x)}>{open ? "▾" : "▸"} Analyse du directeur de campagne</button>
          {open && (busy ? <p className="text-sm text-ink-soft mt-2">Analyse en cours…</p> : a && (
            <div className="text-sm mt-3 space-y-3">
              <p className="text-[15px]">{a.verdict}</p>
              {a.ce_qui_marche?.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-good">Ce qui marche</p>{a.ce_qui_marche.map((x, i) => <p key={i}>• {x}</p>)}</div>}
              {a.a_changer?.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-warn">À changer</p>{a.a_changer.map((x, i) => <p key={i}>• {x}</p>)}</div>}
              {a.prochaine_etape && <p className="bg-accent-soft rounded-xl p-3"><b>Prochaine étape : </b>{a.prochaine_etape}</p>}
              {a.nouvelle_version?.angle && <p className="rounded-xl border border-dashed border-line p-3"><span className="text-xs font-semibold text-ink-soft block">Version à tester ensuite</span><b>{a.nouvelle_version.nom}</b> — {a.nouvelle_version.angle}{a.nouvelle_version.objet && <> · objet « {a.nouvelle_version.objet} »</>}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Campaigns() {
  const { ws } = useWs();
  const [rows, setRows] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [counts, setCounts] = useState({});
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from("campaigns").select("*").eq("workspace_id", ws.id).order("created_at", { ascending: false });
    const ids = (data ?? []).map((c) => c.id);
    if (ids.length) {
      const [{ data: m }, { data: ps }] = await Promise.all([
        supabase.from("messages").select("campaign_id, prospect_id, variant, opened_at, clicked_at, bounced, prospects(status)").in("campaign_id", ids).eq("status", "envoye").limit(10000),
        supabase.from("prospects").select("campaign_id").in("campaign_id", ids).limit(20000),
      ]);
      setMsgs(m ?? []);
      const n = {}; for (const p of ps ?? []) n[p.campaign_id] = (n[p.campaign_id] ?? 0) + 1; setCounts(n);
    }
    setRows(data ?? []);
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHead title="Campagnes" sub="Chaque campagne a sa cible, son objectif et ses versions testées. Tu vois ce qui fait vraiment répondre.">
        {!creating && <Button variant="accent" onClick={() => setCreating(true)}>Nouvelle campagne</Button>}
      </PageHead>
      {ws.domain_status !== "verified" && <p className="text-sm text-ink-soft mb-4">Les ouvertures et les clics seront suivis dès que ton domaine d'envoi sera vérifié. Les réponses et les RDV, eux, sont toujours comptés.</p>}
      {creating && <NewCampaign onCancel={() => setCreating(false)} onDone={() => { setCreating(false); load(); }} />}
      {!rows ? <Spinner /> : rows.length === 0 && !creating ? (
        <Empty title="Aucune campagne pour l'instant.">Crée une campagne pour une cible, laisse l'IA proposer deux versions, et Kairo te dira laquelle fait le plus répondre.</Empty>
      ) : (
        <div className="grid grid-cols-1 gap-5 max-w-5xl">{rows.map((c) => <CampaignCard key={c.id} c={c} msgs={msgs.filter((m) => m.campaign_id === c.id)} count={counts[c.id] ?? 0} onChange={load} />)}</div>
      )}
      <p className="text-xs text-ink-faint mt-6 max-w-3xl">À savoir : les ouvertures sont approximatives (certaines messageries les bloquent, d'autres les simulent). Fie-toi d'abord aux réponses et aux RDV. Les e-mails des campagnes en cours sont rédigés en priorité par le pilote automatique.</p>
    </div>
  );
}
