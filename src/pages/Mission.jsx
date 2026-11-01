import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fn, quotaLeft, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Input, PageHead, Spinner, Textarea, useToast } from "../components/ui";
import { cx } from "../lib/utils";

const n = (x) => Number(x ?? 0).toLocaleString("fr-FR");
const range = ([a, b]) => (a === b ? n(a) : `${n(a)} à ${n(b)}`);
const EXAMPLES = [
  "Trouver 15 nouveaux clients à Lyon d'ici fin janvier",
  "Obtenir 20 rendez-vous avec des cabinets comptables en Île-de-France",
  "Signer mes 30 premiers clients pour mon logiciel, partout en France",
];
const goalLabel = (t, c = 2) => (t === "rdv" ? (c > 1 ? "rendez-vous obtenus" : "rendez-vous obtenu") : (c > 1 ? "clients signés" : "client signé"));

// ---------------------------------------------------------------- Création : objectif → plan → lancement
function NewMission({ onCreated, onCancel }) {
  const { ws } = useWs();
  const toast = useToast();
  const [text, setText] = useState("");
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(null);

  const prepare = async () => {
    setBusy("plan");
    try { setPlan(await fn("i/mission-plan", { workspace_id: ws.id, objective: text })); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const launch = async () => {
    setBusy("go");
    try {
      const r = await fn("i/mission-create", { workspace_id: ws.id, ...plan });
      toast(`Mission lancée : ${n(r.linked)} entreprises rattachées${r.inserted ? `, dont ${n(r.inserted)} nouvelles` : ""}`, "good");
      onCreated(r.id);
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const set = (k, v) => setPlan((p) => ({ ...p, [k]: v }));

  if (!plan) return (
    <Card className="p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">Kairo Mission</p>
      <h2 className="font-serif text-3xl sm:text-4xl leading-tight mt-2">Quel est ton objectif ?</h2>
      <p className="text-ink-soft mt-2 max-w-2xl">Écris-le simplement. Kairo prépare un plan chiffré, tu le valides, puis il travaille chaque jour et te montre où tu en es : entreprises contactées, réponses, rendez-vous et clients signés.</p>
      <Textarea rows={3} className="mt-5 text-[16px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex. Trouver 15 nouveaux clients à Lyon d'ici fin janvier" />
      <div className="flex flex-wrap gap-2 mt-3">
        {EXAMPLES.map((x) => <button key={x} onClick={() => setText(x)} className="text-left text-[13px] rounded-full border border-line bg-paper px-3 py-1.5 hover:border-ink-faint">{x}</button>)}
      </div>
      <div className="flex flex-wrap gap-2 mt-6">
        <Button quota="mission" variant="accent" size="lg" loading={busy === "plan"} disabled={text.trim().length < 8} onClick={prepare}>Préparer le plan</Button>
        {onCancel && <Button variant="ghost" size="lg" onClick={onCancel}>Annuler</Button>}
      </div>
    </Card>
  );

  const p = plan.projection;
  return (
    <Card className="p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">Plan proposé</p>
      <h2 className="font-serif text-3xl leading-tight mt-2">{plan.objective}</h2>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <div>
          <p className="text-[13px] font-semibold mb-1.5">Ce que tu vises</p>
          <div className="inline-flex rounded-full border border-line bg-paper p-1">
            {[["clients", "Clients signés"], ["rdv", "Rendez-vous"]].map(([k, l]) => (
              <button key={k} onClick={() => set("goal_type", k)} className={cx("rounded-full px-4 py-1.5 text-sm font-medium", plan.goal_type === k ? "bg-white shadow-sm border border-line" : "text-ink-soft")}>{l}</button>
            ))}
          </div>
          <p className="text-xs text-ink-faint mt-1.5">Un rendez-vous n'est pas un client : Kairo suit les deux séparément.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="block text-[13px] font-semibold mb-1.5">Nombre</span><Input type="number" min={1} value={plan.goal_count} onChange={(e) => set("goal_count", Math.max(1, Number(e.target.value) || 1))} /></label>
          <label><span className="block text-[13px] font-semibold mb-1.5">Échéance</span><Input type="date" value={plan.deadline ?? ""} onChange={(e) => set("deadline", e.target.value)} /></label>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[13px] font-semibold mb-1.5">Cibles</p>
        <div className="flex flex-wrap gap-2">
          {(ws.targets ?? []).map((t) => {
            const on = plan.target_ids.includes(t.id);
            return <button key={t.id} onClick={() => set("target_ids", on ? plan.target_ids.filter((x) => x !== t.id) : [...plan.target_ids, t.id])}
              className={cx("rounded-full border px-3 py-1.5 text-sm", on ? "bg-ink text-white border-ink" : "bg-white border-line text-ink-soft")}>{t.label}</button>;
          })}
        </div>
        {plan.missing_target && <p className="text-sm text-warn mt-2">Ton objectif vise aussi : {plan.missing_target}. Ajoute cette cible dans Réglages → Zone et cibles pour l'inclure.</p>}
        <p className="text-sm text-ink-soft mt-3">Zone : {plan.zone?.length ? plan.zone.join(", ") : (ws.zone?.length ? `${ws.zone.join(", ")} (zone habituelle)` : "toute la France")}</p>
      </div>

      <div className="mt-6 rounded-2xl bg-paper border border-line p-4 sm:p-5">
        <p className="font-semibold">Ce que ça représente</p>
        <p className="text-sm mt-1.5 leading-relaxed">
          Pour viser <b>{n(plan.goal_count)} {goalLabel(plan.goal_type, plan.goal_count)}</b>, il faut en général contacter <b>{range(p.contacts)} entreprises</b>
          {plan.goal_type === "clients" && <> et obtenir <b>{range(p.rdv)} rendez-vous</b></>}.
        </p>
        <p className="text-xs text-ink-soft mt-2">Repères utilisés : {p.taux.rdv[0]} à {p.taux.rdv[1]} % des entreprises contactées acceptent un rendez-vous{plan.goal_type === "clients" && <>, puis {p.taux.signature[0]} à {p.taux.signature[1]} % des rendez-vous deviennent clients</>}. Source : {p.source}. Ce sont des ordres de grandeur, pas une promesse : Kairo les remplace par tes vrais chiffres dès qu'il en a assez.</p>
        <p className="text-sm mt-3"><b>{n(plan.available)}</b> entreprises correspondantes sont déjà dans tes prospects ; Kairo en cherchera d'autres si besoin.</p>
      </div>

      {plan.conseils?.length > 0 && <ul className="mt-5 space-y-1.5 text-sm">{plan.conseils.map((c) => <li key={c} className="flex gap-2"><span className="text-accent">→</span><span>{c}</span></li>)}</ul>}

      <div className="flex flex-wrap gap-2 mt-7">
        <Button variant="accent" size="lg" loading={busy === "go"} disabled={!plan.target_ids.length} onClick={launch}>Lancer la mission</Button>
        <Button variant="ghost" size="lg" onClick={() => setPlan(null)}>Modifier l'objectif</Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Courbe d'évolution (sans librairie)
function Curve({ history, goalType }) {
  if (!history || history.length < 2) return <p className="text-sm text-ink-soft">La courbe apparaît après quelques jours de mission.</p>;
  const series = [["contactes", "Contactées", "#1c1b19"], ["rdv", "Rendez-vous", "#c2410c"], ["clients", "Clients", "#15803d"]];
  const W = 600, H = 150, pad = 4;
  const max = Math.max(1, ...history.map((h) => h.contactes));
  const x = (i) => pad + (i * (W - 2 * pad)) / (history.length - 1);
  const y = (v, m) => H - pad - (v / m) * (H - 2 * pad);
  const maxSmall = Math.max(1, ...history.map((h) => Math.max(h.rdv, h.clients)));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36" preserveAspectRatio="none" role="img" aria-label="Évolution de la mission">
        {series.map(([k, , c]) => (
          <polyline key={k} fill="none" stroke={c} strokeWidth={k === (goalType === "rdv" ? "rdv" : "clients") ? 3 : 1.6} vectorEffect="non-scaling-stroke"
            points={history.map((h, i) => `${x(i)},${y(h[k], k === "contactes" ? max : maxSmall)}`).join(" ")} />
        ))}
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-ink-soft mt-1">
        {series.map(([k, l, c]) => <span key={k} className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: c }} />{l}</span>)}
        <span>· Rendez-vous et clients sur leur propre échelle</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Radar : opportunités réelles qui correspondent à la mission
const AO_STEPS = ["Télécharger le dossier de consultation (DCE) depuis le lien de l'avis", "Réunir Kbis, attestations URSSAF et fiscale, DC1/DC2 ou DUME", "Rédiger un mémoire technique qui répond point par point au cahier des charges", "Déposer l'offre sur la plateforme de l'acheteur avant la date limite"];
function RadarOpps({ m }) {
  const { ws } = useWs();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);
  const [open, setOpen] = useState(null);
  const zone = (m.zone?.length ? m.zone : ws.zone ?? []).map((z) => String(z));
  useEffect(() => {
    supabase.from("radar_opps").select("*").eq("workspace_id", ws.id).in("status", ["nouveau", "suivi"]).order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => {
        const now = new Date().toISOString();
        setRows((data ?? []).filter((o) => (!zone.length || !o.dept || zone.includes(o.dept)) && (o.kind !== "appel_offres" || !o.deadline || o.deadline > now) && !(o.kind !== "appel_offres" && o.prospect_id)).slice(0, 6));
      });
  }, [ws.id, m.id]);
  if (!rows) return null;
  const add = async (o) => {
    setBusy(o.id);
    try {
      const r = await fn("m/prepare", { workspace_id: ws.id, id: o.id });
      await supabase.from("prospects").update({ mission_id: m.id }).eq("id", r.prospect.id);
      toast(r.message ? `${o.company} : contact trouvé, e-mail prêt dans « À valider »` : r.prospect.phone ? `${o.company} ajoutée : pas d'e-mail public, mais un téléphone (${r.prospect.phone})` : `${o.company} ajoutée à la mission : aucune coordonnée publique trouvée pour l'instant`, "good");
      setRows((x) => x.filter((y) => y.id !== o.id));
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const drop = async (o) => { await supabase.from("radar_opps").update({ status: "ecarte" }).eq("id", o.id); setRows((x) => x.filter((y) => y.id !== o.id)); };
  const follow = async (o) => { await supabase.from("radar_opps").update({ status: "suivi" }).eq("id", o.id); setRows((x) => x.map((y) => (y.id === o.id ? { ...y, status: "suivi" } : y))); };
  const KIND = { appel_offres: ["Appel d'offres", "accent"], croissance: ["En croissance", "good"], recrutement: ["Recrute en ce moment", "muted"] };
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div><p className="font-semibold">Opportunités du moment</p><p className="text-sm text-ink-soft">Repérées par le Radar dans la zone de la mission, à partir de sources publiques.</p></div>
        <Link to="/radar" className="text-sm text-ink-soft hover:text-ink shrink-0">Tout voir ›</Link>
      </div>
      {!rows.length ? <p className="text-sm text-ink-soft mt-3">Aucune opportunité nouvelle pour l'instant. Le Radar vérifie les appels d'offres chaque jour ouvré et les signaux web chaque semaine.</p> : (
        <ul className="mt-3 divide-y divide-line">
          {rows.map((o) => (
            <li key={o.id} className="py-3">
              <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm"><Badge tone={KIND[o.kind]?.[1]}>{KIND[o.kind]?.[0]}</Badge> <b className="ml-1">{o.company || o.title}</b>{o.city ? <span className="text-ink-soft"> · {o.city}</span> : null}</p>
                  <p className="text-sm mt-1">{o.kind === "appel_offres" ? o.title : o.summary}</p>
                  {o.kind === "recrutement" && <p className="text-xs text-ink-soft mt-0.5">Elle recrute pour un poste lié à ton offre : signe d'un besoin actuel et d'un budget.</p>}
                  {o.why && <p className="text-xs text-ink-soft mt-0.5">{o.why}</p>}
                  {o.kind === "appel_offres" && o.deadline && <p className="text-xs mt-1"><b>Date limite : {new Date(o.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</b>{o.url && <> · <a href={o.url} target="_blank" rel="noreferrer" className="underline">voir l'avis officiel</a></>}</p>}
                  {o.kind !== "appel_offres" && o.url && <a href={o.url} target="_blank" rel="noreferrer" className="text-xs underline text-ink-soft">source : {o.source}</a>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {o.kind === "appel_offres"
                    ? <Button size="sm" onClick={() => { setOpen(open === o.id ? null : o.id); if (o.status !== "suivi") follow(o); }}>{open === o.id ? "Masquer" : "Préparer ma réponse"}</Button>
                    : <Button quota="enquete" size="sm" variant="accent" loading={busy === o.id} onClick={() => add(o)}>{busy === o.id ? "Kairo prépare le contact…" : "Contacter cette entreprise"}</Button>}
                  <Button size="sm" variant="ghost" onClick={() => drop(o)}>Écarter</Button>
                </div>
              </div>
              {open === o.id && (
                <div className="mt-3 rounded-xl bg-paper/70 border border-line p-3 text-sm">
                  <p className="font-medium">Pour candidater (points habituels, vérifie les exigences exactes dans l'avis) :</p>
                  <ol className="mt-1.5 space-y-1 list-decimal list-inside">{AO_STEPS.map((x) => <li key={x}>{x}</li>)}</ol>
                  <p className="text-xs text-ink-faint mt-2">Un appel d'offres se gagne en répondant à l'avis : Kairo n'envoie pas d'e-mail de prospection à l'acheteur.</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- Limites de la mission (conditions d'arrêt)
const STOP = { echeance: "Échéance atteinte", budget: "Budget IA atteint", objectif: "Objectif atteint" };
const SIGNALS = { recrutement: "Recrutent", pub_google: "Font de la pub Google", pub_meta: "Font de la pub Facebook/Instagram", sans_reservation: "N'ont pas de RDV en ligne", site_inactif: "Ont un site à l'abandon", sans_schema: "Ont un référencement faible", ia_bloquee: "Sont invisibles pour les IA", agence: "Ont une agence web", levee: "Ont levé des fonds", accelerateur: "Sont accompagnées par un accélérateur", concurrent: "Utilisent un de mes concurrents" };

function Limits({ m, onChanged }) {
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ deadline: m.deadline ?? "", max_prospects: m.max_prospects ?? "", max_budget: m.max_budget ?? "", signal_focus: m.signal_focus ?? [], signal_exclude: m.signal_exclude ?? [] });
  const toggle = (key, t) => setF((x) => ({ ...x, [key]: x[key].includes(t) ? x[key].filter((y) => y !== t) : [...x[key], t], [key === "signal_focus" ? "signal_exclude" : "signal_focus"]: x[key === "signal_focus" ? "signal_exclude" : "signal_focus"].filter((y) => y !== t) }));
  const save = async () => {
    const v = { deadline: f.deadline || null, max_prospects: f.max_prospects === "" ? null : Math.max(1, Math.round(Number(f.max_prospects))), max_budget: f.max_budget === "" ? null : Math.max(1, Number(f.max_budget)), signal_focus: f.signal_focus, signal_exclude: f.signal_exclude };
    const { error } = await supabase.from("missions").update(v).eq("id", m.id);
    if (error) return toast(error.message, "bad");
    toast("Limites enregistrées", "good"); setEdit(false); onChanged();
  };
  const spent = Number(m.spent ?? 0);
  const fmt = (x) => Number(x).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Limites de la mission</p>
        {!edit && <button className="text-sm text-ink-soft hover:text-ink" onClick={() => setEdit(true)}>Modifier</button>}
      </div>
      {!edit ? (
        <div className="grid sm:grid-cols-3 gap-3 mt-2 text-sm">
          <div className="rounded-xl bg-paper/70 border border-line p-3"><p className="text-xs text-ink-soft">Date de fin</p><p className="font-semibold">{m.deadline ? new Date(m.deadline).toLocaleDateString("fr-FR") : "Aucune"}</p></div>
          <div className="rounded-xl bg-paper/70 border border-line p-3"><p className="text-xs text-ink-soft">Prospects maximum</p><p className="font-semibold">{m.max_prospects ? n(m.max_prospects) : "Sans limite"}</p></div>
          <div className="rounded-xl bg-paper/70 border border-line p-3"><p className="text-xs text-ink-soft">Budget IA de la mission</p><p className="font-semibold">{fmt(spent)} €{m.max_budget ? ` / ${fmt(m.max_budget)} €` : " dépensés (sans limite)"}</p>
            {m.max_budget ? <span className="mt-1.5 block h-1.5 rounded-full bg-white overflow-hidden"><span className="block h-full bg-accent rounded-full" style={{ width: `${Math.min(100, (spent / m.max_budget) * 100)}%` }} /></span> : null}</div>
          {(m.signal_focus?.length || m.signal_exclude?.length) ? <div className="sm:col-span-3 text-xs text-ink-soft">Ciblage : {m.signal_focus?.length ? <>en priorité <b className="text-good">{m.signal_focus.map((t) => SIGNALS[t] ?? t).join(", ")}</b></> : null}{m.signal_focus?.length && m.signal_exclude?.length ? " · " : ""}{m.signal_exclude?.length ? <>exclus <b className="text-bad">{m.signal_exclude.map((t) => SIGNALS[t] ?? t).join(", ")}</b></> : null}</div> : null}
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-3 mt-2 text-sm">
          <label className="block"><span className="text-xs text-ink-soft">Date de fin</span><Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></label>
          <label className="block"><span className="text-xs text-ink-soft">Prospects maximum</span><Input type="number" min="1" placeholder="Sans limite" value={f.max_prospects} onChange={(e) => setF({ ...f, max_prospects: e.target.value })} /></label>
          <label className="block"><span className="text-xs text-ink-soft">Budget IA maximum (€)</span><Input type="number" min="1" step="1" placeholder="Sans limite" value={f.max_budget} onChange={(e) => setF({ ...f, max_budget: e.target.value })} /></label>
          <div className="sm:col-span-3">
            <p className="text-xs text-ink-soft mb-1.5">Cibler en priorité les entreprises qui… (clic = priorité, re-clic = exclure, 3e clic = neutre)</p>
            <div className="flex flex-wrap gap-1.5">{Object.entries(SIGNALS).map(([t, l]) => {
              const st = f.signal_focus.includes(t) ? "focus" : f.signal_exclude.includes(t) ? "excl" : "";
              return <button key={t} type="button" onClick={() => st === "focus" ? toggle("signal_exclude", t) : st === "excl" ? setF((x) => ({ ...x, signal_exclude: x.signal_exclude.filter((y) => y !== t) })) : toggle("signal_focus", t)}
                className={cx("rounded-full border px-3 py-1 text-xs", st === "focus" ? "bg-good/10 border-good text-good" : st === "excl" ? "bg-bad/10 border-bad text-bad line-through" : "bg-white border-line text-ink-soft")}>{l}</button>;
            })}</div>
          </div>
          <div className="sm:col-span-3 flex gap-2"><Button size="sm" variant="primary" onClick={save}>Enregistrer</Button><Button size="sm" variant="ghost" onClick={() => setEdit(false)}>Annuler</Button></div>
        </div>
      )}
      <label className="mt-3 flex items-start gap-2 text-sm cursor-pointer">
        <input type="checkbox" className="mt-1 accent-[#E0531F]" checked={m.radar_auto !== false} onChange={async (e) => { const { error } = await supabase.from("missions").update({ radar_auto: e.target.checked }).eq("id", m.id); if (error) toast(error.message, "bad"); else onChanged(); }} />
        <span><b>Radar → Mission</b> : ajouter automatiquement les entreprises de ma zone repérées par le Radar (qui recrutent ou se développent), en priorité.</span>
      </label>
      <p className="text-xs text-ink-faint mt-2">La mission se met en pause toute seule à la date de fin, au budget maximum ou quand l'objectif est atteint. Le budget est une estimation du coût IA des recherches et rédactions de la mission.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Pilotage : Kairo fait avancer la mission tout seul
function Pilot({ m, s, onChanged }) {
  const { ws } = useWs();
  const toast = useToast();
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState([]);
  const [q, setQ] = useState(null);
  useEffect(() => { Promise.all([quotaLeft(ws, "enquete"), quotaLeft(ws, "redaction")]).then(([e, r]) => setQ({ e, r })).catch(() => {}); }, [ws.id, running]);
  const stop = useRef(false);
  const journal = [...(m.journal ?? [])].reverse().slice(0, 8);
  const active = m.status === "active";
  const advance = async () => {
    setRunning(true); setSteps([]); stop.current = false;
    try {
      for (let i = 0; i < 8 && !stop.current; i++) {
        const r = await fn("m/step", { workspace_id: ws.id, mission_id: m.id });
        setSteps((x) => [...x, r.text]);
        if (r.done) break;
      }
      onChanged();
    } catch (e) { toast(e.message, "bad"); } finally { setRunning(false); }
  };
  const toggle = async () => { await supabase.from("missions").update({ auto: !m.auto }).eq("id", m.id); onChanged(); };
  const when = (d) => new Date(d).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold flex items-center gap-2">
            <span className={cx("w-2.5 h-2.5 rounded-full", !active ? "bg-ink/20" : s.a_valider >= 15 ? "bg-warn" : m.auto ? "bg-good pulse-dot" : "bg-ink/20")} />
            {!active ? (STOP[m.stop_reason] ? `Mission en pause : ${STOP[m.stop_reason].toLowerCase()}` : "Mission en pause") : s.a_valider >= 15 ? "En attente de ta validation" : m.auto ? "Kairo travaille sur cette mission" : "Pilotage en pause"}
          </p>
          <p className="text-sm text-ink-soft mt-1 max-w-xl">{active && s.a_valider >= 15 ? `${n(s.a_valider)} e-mails sont prêts. Kairo reprend tout seul dès qu'ils sont validés et envoyés.` : !active ? (m.stop_reason === "echeance" ? "Prolonge la date de fin dans les limites ci-dessous, puis clique sur « Reprendre »." : m.stop_reason === "budget" ? "Augmente le budget dans les limites ci-dessous, puis clique sur « Reprendre »." : m.stop_reason === "objectif" ? "Bravo. Tu peux clôturer la mission ou relever l'objectif." : "Clique sur « Reprendre » en haut de la mission pour la relancer.") : m.auto && active
            ? "Chaque jour ouvré, Kairo cherche des entreprises, trouve leurs coordonnées et rédige les e-mails. Rien ne part sans toi : tout arrive dans « À valider »."
            : "Kairo ne prépare plus rien tout seul pour cette mission. Tu peux toujours la faire avancer à la main."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {active && <Button size="sm" variant="ghost" onClick={toggle}>{m.auto ? "Mettre le pilotage en pause" : "Réactiver le pilotage"}</Button>}
          {active && <Button quota="enquete" size="sm" variant="accent" loading={running} onClick={advance}>Avancer maintenant</Button>}
          {running && <Button size="sm" variant="ghost" onClick={() => { stop.current = true; }}>Arrêter</Button>}
        </div>
      </div>
      {q && active && <p className="text-xs text-ink-faint mt-2">Aujourd'hui, il reste {q.e.left}/{q.e.max} recherches de contact et {q.r.left}/{q.r.max} rédactions d'e-mails dans ta formule. Le compteur repart à zéro chaque nuit.</p>}
      {steps.length > 0 && (
        <ul className="mt-4 rounded-xl bg-paper/70 border border-line p-3 space-y-1.5 text-sm">
          {steps.map((t, i) => <li key={i} className="flex gap-2"><span className="text-good">✓</span><span>{t}</span></li>)}
          {running && <li className="flex gap-2 text-ink-soft"><span className="animate-pulse">…</span><span>Kairo continue (une étape prend 20 à 60 secondes)</span></li>}
        </ul>
      )}
      {!running && s.a_valider > 0 && <Link to="/valider" className="inline-block mt-4"><Button size="sm">Valider les {n(s.a_valider)} e-mail{s.a_valider > 1 ? "s" : ""} prêt{s.a_valider > 1 ? "s" : ""} →</Button></Link>}
      <Limits m={m} onChanged={onChanged} />
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Journal de la mission</p>
        {!journal.length ? <p className="text-sm text-ink-soft mt-2">Rien pour l'instant : la première étape apparaîtra ici.</p> : (
          <ul className="mt-2 space-y-1.5 text-sm">{journal.map((j, i) => <li key={i} className="flex gap-3"><span className="text-ink-faint tnum shrink-0 w-32">{when(j.at)}</span><span>{j.text}</span></li>)}</ul>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Suivi d'une mission
function MissionView({ v, onChanged }) {
  const { ws } = useWs();
  const toast = useToast();
  const nav = useNavigate();
  const [busy, setBusy] = useState(null);
  const [prog, setProg] = useState("");
  const { mission: m, stats: s, projection: p, actions, pace } = v;
  const done = m.goal_type === "rdv" ? s.rdv : s.clients;
  const pct = Math.min(100, Math.round((done / m.goal_count) * 100));
  const left = Math.max(0, p.contacts[0] - s.contactes);

  const run = async (a) => {
    if (a.to) return nav(a.to);
    setBusy(a.key);
    try {
      if (a.action === "search") { const r = await fn("i/mission-search", { workspace_id: ws.id, mission_id: m.id, count: a.n ?? 50 }); toast(`${n(r.inserted)} nouvelles entreprises trouvées, ${n(r.linked)} rattachées à la mission`, "good"); }
      if (a.action === "enrich") {
        // Les entreprises de la mission, par lots de 4 (une enquête prend 10 à 20 secondes)
        const { data } = await supabase.from("prospects").select("id").eq("mission_id", m.id).eq("status", "nouveau").is("enriched_at", null).order("score", { ascending: false, nullsFirst: false }).limit(20);
        const ids = (data ?? []).map((x) => x.id);
        let found = 0, doneN = 0;
        for (let i = 0; i < ids.length; i += 4) {
          setProg(`${doneN} / ${ids.length} entreprises étudiées · ${found} e-mail${found > 1 ? "s" : ""} trouvé${found > 1 ? "s" : ""}`);
          const r = await fn("m/enrich", { workspace_id: ws.id, count: 4, ids: ids.slice(i, i + 4) });
          found += r.found ?? 0; doneN += r.done ?? 0;
        }
        toast(`${found} e-mail${found > 1 ? "s" : ""} trouvé${found > 1 ? "s" : ""} sur ${doneN} entreprise${doneN > 1 ? "s" : ""}`, "good");
      }
      if (a.action === "draft") {
        let total = 0;
        for (let i = 0; i < 4; i++) {
          setProg(`${total} e-mail${total > 1 ? "s" : ""} rédigé${total > 1 ? "s" : ""}…`);
          const r = await fn("draft", { workspace_id: ws.id, count: 5 });
          total += r.done ?? 0;
          if (!r.done || !r.remaining) break;
        }
        toast(`${total} e-mail${total > 1 ? "s" : ""} rédigé${total > 1 ? "s" : ""}, à valider`, "good");
      }
      if (a.action === "close") { await supabase.from("missions").update({ status: "terminee" }).eq("id", m.id); toast("Mission clôturée", "good"); }
      onChanged();
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); setProg(""); }
  };
  const setStatus = async (status) => { await supabase.from("missions").update(status === "active" ? { status, stop_reason: null } : { status }).eq("id", m.id); onChanged(); };
  // Le pilotage remplace l'ancien conseil « activer le pilote automatique »
  const [first, ...rest] = actions.filter((a) => a.key !== "auto");

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Mission en cours{m.status === "pause" && " · en pause"}</p>
            <h2 className="font-serif text-2xl sm:text-3xl leading-tight mt-1.5">{m.objective || `${m.goal_count} ${goalLabel(m.goal_type)}`}</h2>
            <p className="text-sm text-ink-soft mt-1">Lancée le {new Date(m.created_at).toLocaleDateString("fr-FR")}{m.deadline && ` · échéance le ${new Date(m.deadline).toLocaleDateString("fr-FR")}`}</p>
          </div>
          <div className="flex gap-1">
            {m.status === "active" ? <Button size="sm" variant="ghost" onClick={() => setStatus("pause")}>Mettre en pause</Button> : <Button size="sm" onClick={() => setStatus("active")}>Reprendre</Button>}
            <Button size="sm" variant="ghost" onClick={() => setStatus("terminee")}>Clôturer</Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="font-serif text-6xl sm:text-7xl leading-none tnum">{n(done)}<span className="text-ink-faint"> / {n(m.goal_count)}</span></p>
            <p className="text-ink-soft mt-1.5">{goalLabel(m.goal_type, done)}</p>
          </div>
          <div className="flex-1 min-w-[220px] pb-2">
            <div className="h-3 rounded-full bg-paper border border-line overflow-hidden"><div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.max(pct, done ? 3 : 0)}%` }} /></div>
            <p className="text-sm mt-2"><b className="tnum">{pct} %</b> de l'objectif
              {pace && <span className={cx("ml-2", pace.early ? "text-ink-soft" : pace.ahead ? "text-good" : "text-warn")}>· {pace.days_left > 0 ? `${pace.days_left} jours restants` : "échéance dépassée"}{pace.early ? ", la mission démarre" : pace.ahead ? ", dans le rythme" : `, en retard sur le rythme (${pace.elapsed} % du temps écoulé)`}</span>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-y-4 mt-7 border-t border-line pt-5">
          {[["Prospects", s.prospects], ["Contactés", s.contactes], ["Réponses", s.reponses], ["RDV obtenus", s.rdv, m.goal_type === "rdv"], ["Clients signés", s.clients, m.goal_type === "clients"]].map(([l, val, hl], i) => (
            <div key={l} className={cx("px-3", i % 3 !== 0 && "border-l border-line", "sm:border-l sm:first:border-l-0")}>
              <p className="text-[13px] text-ink-soft">{l}</p>
              <p className={cx("font-serif text-[32px] leading-none mt-1 tnum", hl && "text-accent")}>{n(val)}</p>
            </div>
          ))}
        </div>
        {s.ca > 0 && <p className="text-sm text-ink-soft mt-4 px-3">Chiffre d'affaires signé : <b className="text-ink">{n(s.ca)} € HT</b></p>}
      </Card>

      <Pilot m={m} s={s} onChanged={onChanged} />
      <RadarOpps m={m} />

      {first && (
        <div className="rounded-2xl bg-ink text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Prochaine action proposée par Kairo</p>
            <p className="font-serif text-2xl leading-snug mt-1">{first.title}</p>
            <p className="text-sm text-white/70 mt-1">{busy === first.key && prog ? prog : first.detail}</p>
          </div>
          <Button variant="accent" size="lg" loading={busy === first.key} onClick={() => run(first)}>{first.to ? "Y aller" : "Lancer"}</Button>
        </div>
      )}
      {rest.length > 0 && (
        <Card className="divide-y divide-line">
          {rest.map((a) => (
            <div key={a.key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-4">
              <div className="flex-1 min-w-0"><p className="font-semibold text-[15px]">{a.title}</p><p className="text-sm text-ink-soft">{a.detail}</p></div>
              <Button size="sm" loading={busy === a.key} onClick={() => run(a)}>{a.to ? "Ouvrir" : "Lancer"}</Button>
            </div>
          ))}
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 sm:p-6">
          <p className="font-semibold">Évolution</p>
          <div className="mt-3"><Curve history={m.history} goalType={m.goal_type} /></div>
        </Card>
        <Card className="p-5 sm:p-6 text-sm">
          <p className="font-semibold">Où on en est</p>
          <ul className="mt-3 space-y-2">
            <li>{n(s.joignables)} entreprise{s.joignables > 1 ? "s" : ""} sur {n(s.prospects)} {s.joignables > 1 ? "ont" : "a"} un e-mail{s.a_enqueter ? `, ${n(s.a_enqueter)} pas encore étudiée${s.a_enqueter > 1 ? "s" : ""}` : ""}{s.sans_email ? `, ${n(s.sans_email)} sans e-mail public pour l'instant` : ""}.</li>
            <li>{s.contactes ? <>Taux de réponse : <b>{(Math.round((s.reponses / s.contactes) * 1000) / 10).toLocaleString("fr-FR")} %</b> ({n(s.reponses)} sur {n(s.contactes)}), dont {n(s.positives)} intéressées.</> : "Aucun e-mail envoyé pour l'instant."}</li>
            <li>{n(s.rdv)} rendez-vous obtenus{s.rdv_tenus ? `, ${n(s.rdv_tenus)} déjà tenus` : ""} · {n(s.clients)} client{s.clients > 1 ? "s" : ""} signé{s.clients > 1 ? "s" : ""}.</li>
            <li>Il reste environ <b>{n(left)}</b> entreprises à contacter (hypothèse basse) pour viser l'objectif.</li>
          </ul>
          <p className="text-xs text-ink-faint mt-4">Projection basée sur {p.source}. L'objectif est un cap, pas une garantie.</p>
        </Card>
      </div>
    </div>
  );
}

export default function Mission() {
  const { ws } = useWs();
  const go = useNavigate();
  const [list, setList] = useState(null);
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => {
    try { const r = await fn("i/missions", { workspace_id: ws.id }); setList(r.missions); } catch { setList([]); }
  }, [ws.id]);
  useEffect(() => { setList(null); load(); }, [load]);

  return (
    <div>
      <PageHead title="Mission" sub="Ton objectif commercial, suivi chaque jour : ce qui est fait, ce qui reste, et la prochaine action." >
        <Button onClick={() => go("/intelligence")}>Ce que disent tes prospects</Button>
        {list?.length > 0 && !creating && <Button onClick={() => setCreating(true)}>Nouvelle mission</Button>}
      </PageHead>
      {list === null ? <div className="py-20 grid place-items-center"><Spinner /></div>
        : creating || !list.length ? <NewMission onCancel={list.length ? () => setCreating(false) : null} onCreated={async () => { setCreating(false); await load(); }} />
        : <div className="space-y-10">{list.map((v) => <MissionView key={v.mission.id} v={v} onChanged={load} />)}</div>}
    </div>
  );
}
