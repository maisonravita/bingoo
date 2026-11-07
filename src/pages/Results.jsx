import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, Card, Input, PageHead, Spinner, useToast } from "../components/ui";
import { eur } from "../lib/labels";
import { cx } from "../lib/utils";
import { SubNav } from "../components/SubNav";
import { CeQuiMarche, PilotageResultats } from "./Pilotage";
import { KIND } from "./Radar";

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : "—");
// Coût IA moyen estimé par action (en euros), pour calculer le coût d'acquisition
const AI_COST = { analyse: 0.06, recherche: 0, enquete: 0.03, enquete_plus: 0.08, redaction: 0.01, linkedin: 0.03, analyse_prospect: 0.04, brief: 0.04, script: 0.01, veille: 0.25, reponse: 0.01, social: 0.25, lettre: 0.01, campagne: 0.02, credit_email: 0.09 };
const PLAN_PRICE = { essai: 0, solo: 39, pro: 69, equipe: 109, fondateur: 0 };

async function all(table, cols, ws) {
  const out = [];
  for (let f = 0; f < 20000; f += 1000) {
    const { data } = await supabase.from(table).select(cols).eq("workspace_id", ws).range(f, f + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

function money(d, since, period, ws) {
  const inP = (x) => x && new Date(x).getTime() >= since;
  const signed = d.quotes.filter((q) => q.status === "signe" && inP(q.signed_at));
  const signedHt = signed.reduce((s, q) => s + Number(q.total_ht || 0), 0);
  const pipeline = d.quotes.filter((q) => ["envoye", "vu"].includes(q.status)).reduce((s, q) => s + Number(q.total_ht || 0), 0);
  const ai = d.activity.filter((a) => inP(a.created_at)).reduce((s, a) => s + (AI_COST[a.kind] ?? 0), 0);
  const sub = (ws.plan === "solo" && ws.founder_price ? 29 : PLAN_PRICE[ws.plan] ?? 0) * period / 30;
  const won = d.prospects.filter((p) => inP(p.won_at)).length;
  const minutes = (d.usage ?? []).filter((u) => inP(u.day)).reduce((s, u) => s + u.minutes, 0);
  const cost = ai + sub;
  const owners = {};
  for (const m of d.members) owners[m.user_id] = { m, prospects: 0, rdv: 0, clients: 0, ca: 0 };
  for (const p of d.prospects) {
    const o = owners[p.owner_id]; if (!o) continue;
    o.prospects++;
    if (["rdv", "client"].includes(p.status)) o.rdv++;
    if (p.status === "client") { o.clients++; o.ca += Number(p.deal_value || 0); }
  }
  return { signedHt, signedN: signed.length, pipeline, ai, sub, cost, cac: won ? cost / won : null, roi: cost ? signedHt / cost : null, owners: Object.values(owners), minutes };
}

// Temps qu'un commercial passerait sur chaque action (même estimation que sur Aujourd'hui)
const MINUTES = { recherche: 20, enquete: 8, enquete_plus: 12, redaction: 10, envoi: 1, reponse: 5, radar: 5, radar_scan: 20, veille: 30, espion: 15, analyse: 30, linkedin: 6, rdv: 20, brief: 15, devis: 15, script: 10, intelligence: 20 };
const hm = (m) => (m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)} h${Math.round(m % 60) ? ` ${String(Math.round(m % 60)).padStart(2, "0")}` : ""}`);

/** La semaine en une phrase, puis 4 chiffres comparés à la semaine d'avant. */
function Week({ d }) {
  const now = Date.now(), W = 7 * 864e5;
  const inW = (t, k) => { const x = new Date(t ?? 0).getTime(); return x >= now - (k + 1) * W && x < now - k * W; };
  const m = (k) => ({
    sent: d.messages.filter((x) => x.status === "envoye" && inW(x.sent_at, k)).length,
    rep: d.replies.filter((x) => inW(x.created_at, k)).length,
    pos: d.replies.filter((x) => inW(x.created_at, k) && ["interesse", "rdv", "rappel"].includes(x.class)).length,
    rdv: d.meetings.filter((x) => inW(x.created_at ?? x.starts_at, k) && x.status !== "annule").length,
    min: d.activity.filter((x) => inW(x.created_at, k)).reduce((a, x) => a + (MINUTES[x.kind] ?? 0), 0),
  });
  const a = m(0), b = m(1);
  const diff = (x, y) => (y ? `${x >= y ? "+" : ""}${Math.round(((x - y) / y) * 100)} % vs semaine d'avant` : x ? "nouveau cette semaine" : "—");
  const parts = [a.sent && `${a.sent} e-mail${a.sent > 1 ? "s" : ""} envoyé${a.sent > 1 ? "s" : ""}`, a.rep && `${a.rep} réponse${a.rep > 1 ? "s" : ""}${a.pos ? ` dont ${a.pos} positive${a.pos > 1 ? "s" : ""}` : ""}`, a.rdv && `${a.rdv} rendez-vous`].filter(Boolean);
  return (
    <Card className="p-5 sm:p-6 mb-8">
      <p className="text-[13px] font-semibold text-accent-dark">Ta semaine</p>
      <p className="mt-1 text-[22px] sm:text-[26px] font-semibold leading-tight">{parts.length ? parts.join(", ") : "Pas encore d'envoi cette semaine"}. {a.min ? <span className="text-ink-soft font-normal">Bingoo! t'a fait gagner environ {hm(a.min)}.</span> : null}</p>
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[["E-mails envoyés", a.sent, b.sent], ["Réponses", a.rep, b.rep], ["Rendez-vous", a.rdv, b.rdv], ["Temps gagné", a.min, b.min, hm]].map(([l, x, y, f]) => (
          <div key={l} className="rounded-xl bg-paper/70 p-3 min-w-0"><p className="text-[12px] text-ink-soft">{l}</p><p className="text-2xl font-semibold tnum mt-0.5">{f ? f(x) : x}</p><p className="text-[11.5px] text-ink-faint mt-0.5">{diff(x, y)}</p></div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] text-ink-faint">Temps gagné : estimation du temps qu'un commercial passerait à faire les mêmes actions à la main. Taux de réponse cette semaine : {a.sent ? `${Math.round((a.rep / a.sent) * 100)} %` : "—"}.</p>
    </Card>
  );
}

function Funnel({ steps }) {
  const max = Math.max(1, steps[0][1]);
  return (
    <div className="space-y-2.5">
      {steps.map(([label, n], i) => (
        <div key={label} className="grid grid-cols-[120px_1fr_auto] sm:grid-cols-[160px_1fr_auto] items-center gap-3 text-sm">
          <span className="text-ink-soft truncate">{label}</span>
          <div className="h-7 bg-paper rounded-lg overflow-hidden"><div className="h-full rounded-lg bg-ink" style={{ width: `${Math.max(n ? 2 : 0, (n / max) * 100)}%`, opacity: 1 - i * 0.12 }} /></div>
          <span className="tnum font-semibold w-20 text-right">{n}{i > 0 && <span className="text-ink-soft font-normal text-xs ml-1">{pct(n, steps[i - 1][1])}</span>}</span>
        </div>
      ))}
    </div>
  );
}

/** La base de contacts : ce que Bingoo! a trouvé pour toi (décideurs, e-mails, téléphones). */
function ContactBase({ p }) {
  const live = p.filter((x) => !["ignore"].includes(x.status));
  const n = live.length, dec = live.filter((x) => x.contact_name).length, mail = live.filter((x) => x.email).length, tel = live.filter((x) => x.phone).length;
  const joint = live.filter((x) => x.email || x.phone).length;
  return (
    <Card className="p-5 sm:p-6 mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Tes contacts</h2>
      <p className="text-sm text-ink-soft mt-1">Les décideurs trouvés pour toi, et comment les joindre.</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
        {[["Entreprises", n, ""], ["Décideurs trouvés", dec, pct(dec, n)], ["E-mails", mail, pct(mail, n)], ["Téléphones", tel, pct(tel, n)], ["Joignables", joint, pct(joint, n)]].map(([l, v, sub]) => (
          <div key={l} className="rounded-xl bg-paper p-4"><p className="text-[12px] text-ink-soft">{l}</p><p className="font-serif text-3xl mt-1 tnum">{v.toLocaleString("fr-FR")}</p>{sub && <p className="text-xs text-ink-faint mt-0.5">{sub} des entreprises</p>}</div>
        ))}
      </div>
    </Card>
  );
}

/** Comparaison anonyme avec les autres clients : quels signaux donnent des réponses, chez toi et en moyenne. */
function Comparaison({ ws }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { supabase.rpc("bench_signaux", { p_ws: ws.id }).then(({ data }) => setRows(data ?? [])); }, [ws.id]);
  if (!rows) return null;
  const nom = (k) => (k === "aucun" ? "Sans signal particulier" : KIND[k]?.label ?? k);
  const assez = rows.filter((r) => r.assez);
  const miens = rows.filter((r) => Number(r.mes_envois) > 0);
  return (
    <Card className="p-5 sm:p-6 mb-8">
      <h2 className="font-semibold">Quel moment fait répondre ?</h2>
      <p className="text-[13px] text-ink-soft mt-1">Réponses positives selon la raison de contacter l'entreprise, chez toi{assez.length ? " et chez l'ensemble des clients Bingoo! (données anonymes)" : ""}.</p>
      {!miens.length && !assez.length ? <p className="text-sm text-ink-soft mt-3">Pas encore de premier message envoyé : les chiffres apparaissent dès les premiers envois.</p> : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[12px] text-ink-soft">{["Raison du contact", "Toi", ...(assez.length ? ["Tous les clients"] : [])].map((h) => <th key={h} className="py-1.5 pr-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {rows.filter((r) => r.assez || Number(r.mes_envois) > 0).map((r) => (
                <tr key={r.signal}>
                  <td className="py-1.5 pr-3">{nom(r.signal)}</td>
                  <td className="py-1.5 pr-3 tnum">{Number(r.mes_envois) ? `${r.mon_taux ?? 0} % sur ${r.mes_envois}` : "—"}</td>
                  {assez.length > 0 && <td className="py-1.5 pr-3 tnum">{r.assez ? `${r.taux} % sur ${r.envois}` : "pas assez de données"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!assez.length && <p className="text-[12.5px] text-ink-faint mt-3">La comparaison avec les autres clients s'affiche dès qu'un type de signal compte au moins 100 envois chez 3 clients différents. Aucun client n'est jamais identifiable.</p>}
    </Card>
  );
}

/** Ce que Bingoo! t'a rapporté : chaque client signé relié à son signal, son premier message et son rendez-vous. */
function Rapporte({ d, ws }) {
  const premier = {}, rdv = {};
  for (const m of d.messages) if (m.status === "envoye" && m.step === 0 && m.sent_at && (!premier[m.prospect_id] || m.sent_at < premier[m.prospect_id])) premier[m.prospect_id] = m.sent_at;
  for (const x of d.meetings) if (x.status !== "annule" && (!rdv[x.prospect_id] || x.created_at < rdv[x.prospect_id])) rdv[x.prospect_id] = x.created_at;
  const gagnes = d.prospects.filter((p) => p.status === "client" && (premier[p.id] || rdv[p.id]));
  const total = gagnes.reduce((t, p) => t + Number(p.deal_value || 0), 0);
  const cible = (id) => ws.targets?.find((t) => t.id === id)?.label ?? "autre";
  const signal = (p) => (p.signals ?? []).find((x) => x.label && !["taille", "reseau"].includes(x.type))?.label ?? "";
  const parCible = {};
  for (const p of gagnes) { const k = cible(p.target); parCible[k] = (parCible[k] ?? 0) + Number(p.deal_value || 0); }
  const jour = (x) => x ? new Date(x).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—";
  return (
    <Card className="p-5 sm:p-6 mb-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Ce que Bingoo! t'a rapporté</h2>
        <p className="font-serif text-3xl tnum">{eur(total)}<span className="text-sm text-ink-soft font-sans"> / mois, {gagnes.length} client{gagnes.length > 1 ? "s" : ""}</span></p>
      </div>
      {gagnes.length === 0 ? (
        <p className="text-sm text-ink-soft mt-2">Quand tu signes avec une entreprise contactée par Bingoo!, passe-la en « Client » et indique le montant : elle apparaît ici avec tout son parcours (signal, premier message, rendez-vous, signature).</p>
      ) : (
        <>
          {/* Téléphone : une ligne lisible par client ; ordinateur : le tableau */}
          <ul className="mt-4 divide-y divide-line sm:hidden">
            {[...gagnes].sort((a, b) => Number(b.deal_value || 0) - Number(a.deal_value || 0)).map((p) => (
              <li key={p.id} className="py-2.5 text-sm">
                <p className="flex justify-between gap-3"><b>{p.name}</b><span className="tnum font-semibold">{p.deal_value ? `${eur(p.deal_value)}/mois` : <span className="text-ink-faint font-normal">à indiquer</span>}</span></p>
                <p className="text-ink-soft">{signal(p) || cible(p.target)}</p>
                <p className="text-[12.5px] text-ink-faint tnum">1er message {jour(premier[p.id])} · rendez-vous {jour(rdv[p.id])} · signé {jour(p.won_at)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 overflow-x-auto hidden sm:block">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[12px] text-ink-soft">{["Client", "Ce qui a déclenché", "1er message", "Rendez-vous", "Signé", "€ / mois"].map((h) => <th key={h} className="py-1.5 pr-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {gagnes.sort((a, b) => Number(b.deal_value || 0) - Number(a.deal_value || 0)).map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 pr-3 font-medium">{p.name}</td>
                    <td className="py-1.5 pr-3 text-ink-soft">{signal(p) || cible(p.target)}</td>
                    <td className="py-1.5 pr-3 tnum">{jour(premier[p.id])}</td>
                    <td className="py-1.5 pr-3 tnum">{jour(rdv[p.id])}</td>
                    <td className="py-1.5 pr-3 tnum">{jour(p.won_at)}</td>
                    <td className="py-1.5 pr-3 tnum font-semibold">{p.deal_value ? eur(p.deal_value) : <span className="text-ink-faint font-normal">à indiquer</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Object.keys(parCible).length > 1 && <p className="text-[13px] text-ink-soft mt-3">Par cible : {Object.entries(parCible).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${eur(v)}`).join(" · ")}</p>}
        </>
      )}
    </Card>
  );
}

export default function Results() {
  const { ws, patch } = useWs();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [period, setPeriod] = useState(30);
  const load = useCallback(async () => {
    const [prospects, messages, meetings, calls, quotes, activity, members, usage, replies] = await Promise.all([
      all("prospects", "id, name, target, status, deal_value, margin_pct, won_at, churned_at, owner_id, contact_name, email, phone, signals, source", ws.id),
      all("messages", "prospect_id, status, sent_at, step", ws.id),
      all("meetings", "prospect_id, status, starts_at, created_at", ws.id),
      all("calls", "prospect_id, outcome, created_at", ws.id),
      all("quotes", "prospect_id, status, total_ht, sent_at, signed_at, recurring", ws.id),
      all("activity", "kind, created_at", ws.id),
      all("members", "user_id, email, role", ws.id),
      all("usage", "day, minutes", ws.id),
      all("replies", "created_at, class", ws.id),
    ]);
    setD({ prospects, messages, meetings, calls, quotes, activity, members, usage, replies });
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    if (!d) return null;
    const since = Date.now() - period * 86400000;
    const sent = d.messages.filter((m) => m.status === "envoye" && new Date(m.sent_at).getTime() >= since);
    const contacted = new Set(sent.map((m) => m.prospect_id));
    const allContacted = new Set(d.messages.filter((m) => m.status === "envoye").map((m) => m.prospect_id));
    d.calls.forEach((c) => allContacted.add(c.prospect_id));
    const byT = {};
    for (const t of ws.targets ?? []) byT[t.id] = { t, contacted: 0, replied: 0, rdv: 0, qualified: 0, clients: 0, mrr: 0, margin: 0, churn: 0 };
    const mt = new Map(); d.meetings.forEach((m) => { if (!mt.has(m.prospect_id)) mt.set(m.prospect_id, []); mt.get(m.prospect_id).push(m); });
    for (const p of d.prospects) {
      const s = byT[p.target]; if (!s) continue;
      if (allContacted.has(p.id)) s.contacted++;
      if (["repondu", "rdv", "client", "refus"].includes(p.status) && allContacted.has(p.id)) s.replied++;
      const ms = mt.get(p.id) ?? [];
      if (ms.length || ["rdv", "client"].includes(p.status)) s.rdv++;
      if (ms.some((m) => m.status === "qualifie") || p.status === "client") s.qualified++;
      if (p.status === "client") { s.clients++; if (p.churned_at) s.churn++; else { s.mrr += Number(p.deal_value || 0); s.margin += Number(p.deal_value || 0) * Number(p.margin_pct ?? 0) / 100; } }
    }
    const rows = Object.values(byT);
    const scored = rows.filter((r) => r.contacted >= 5).map((r) => ({ ...r, value: (r.margin || r.mrr * 0.3 || 0) / r.contacted + r.qualified / r.contacted * 50 + r.replied / r.contacted * 10 }));
    scored.sort((a, b) => b.value - a.value);
    return {
      sent: sent.length, contacted: contacted.size,
      replies: d.prospects.filter((p) => ["repondu", "rdv", "client", "refus"].includes(p.status) && allContacted.has(p.id)).length,
      meetings: d.meetings.filter((m) => new Date(m.starts_at).getTime() >= since).length,
      held: d.meetings.filter((m) => ["tenu", "qualifie"].includes(m.status) && new Date(m.starts_at).getTime() >= since).length,
      qualified: d.meetings.filter((m) => m.status === "qualifie" && new Date(m.starts_at).getTime() >= since).length,
      won: d.prospects.filter((p) => p.won_at && new Date(p.won_at).getTime() >= since).length,
      mrr: rows.reduce((s, r) => s + r.mrr, 0), margin: rows.reduce((s, r) => s + r.margin, 0),
      rows, best: scored[0], worst: scored.length > 1 ? scored[scored.length - 1] : null,
      clients: d.prospects.filter((p) => p.status === "client"),
      ...money(d, since, period, ws),
    };
  }, [d, period, ws.targets]);

  const prioritize = async (id) => {
    const t = [...ws.targets]; const i = t.findIndex((x) => x.id === id); const [x] = t.splice(i, 1); t.unshift({ ...x, actif: true });
    await patch({ targets: t }); toast(`« ${x.label} » passe en priorité`, "good");
  };
  const setClient = async (id, k, v) => {
    await supabase.from("prospects").update({ [k]: v === "" ? null : k === "churned_at" ? (v ? new Date().toISOString() : null) : Number(v) }).eq("id", id);
    load();
  };

  if (!stats) return <Spinner />;
  return (
    <div>
      <SubNav section="resultats" />
      <PageHead title="Résultats" sub="Ce qui marche vraiment, et quels clients te rapportent.">
        <div className="flex gap-1">{[7, 30, 90].map((n) => <button key={n} onClick={() => setPeriod(n)} className={cx("rounded-full px-3 py-1.5 text-sm border", period === n ? "bg-ink text-white border-ink" : "bg-white border-line")}>{n} j</button>)}</div>
      </PageHead>

      <Rapporte d={d} ws={ws} />
      <Comparaison ws={ws} />
      <CeQuiMarche />
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 mb-8">
        <Card className="p-5 sm:p-6 min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-4">Entonnoir sur {period} jours</h2>
          <Funnel steps={[["Contactés", stats.contacted], ["Réponses", stats.replies], ["RDV pris", stats.meetings], ["RDV tenus", stats.held], ["Clients", stats.won]]} />
          <p className="text-xs text-ink-soft mt-4">Le pourcentage compare chaque étape à la précédente.</p>
        </Card>
        <Card className="p-5 sm:p-6 min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-4">Argent sur {period} jours</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div><dt className="text-xs text-ink-soft">Devis signés</dt><dd className="font-serif text-3xl tnum">{eur(stats.signedHt)}</dd><dd className="text-xs text-ink-soft">{stats.signedN} devis · HT</dd></div>
            <div><dt className="text-xs text-ink-soft">En attente de signature</dt><dd className="font-serif text-3xl tnum">{eur(stats.pipeline)}</dd><dd className="text-xs text-ink-soft">devis envoyés ou vus</dd></div>
            <div><dt className="text-xs text-ink-soft">Coût de la prospection</dt><dd className="font-serif text-3xl tnum">{eur(Math.round(stats.cost))}</dd><dd className="text-xs text-ink-soft">IA ≈ {eur(Math.round(stats.ai))}{stats.sub ? ` + abonnement ${eur(Math.round(stats.sub))}` : ""}</dd></div>
            <div><dt className="text-xs text-ink-soft">Coût par client signé</dt><dd className="font-serif text-3xl tnum">{stats.cac == null ? "—" : eur(Math.round(stats.cac))}</dd><dd className="text-xs text-ink-soft">{stats.roi ? `${stats.roi.toFixed(1).replace(".", ",")} € signés pour 1 € dépensé` : "pas encore de client sur la période"}</dd></div>
          </dl>
          <p className="text-sm mt-4 pt-4 border-t border-line">Temps passé dans Bingoo! : <b className="tnum">{stats.minutes >= 60 ? `${Math.floor(stats.minutes / 60)} h ${String(stats.minutes % 60).padStart(2, "0")}` : `${stats.minutes} min`}</b>{stats.won ? <span className="text-ink-soft"> · {Math.round(stats.minutes / stats.won)} min par client signé</span> : null}</p>
          <p className="text-[11px] text-ink-faint mt-2">Coût IA estimé d'après le nombre d'actions réalisées.</p>
        </Card>
      </div>

      {stats.best && (
        <Card className="p-5 sm:p-6 mb-8 !bg-ink text-white !border-ink">
          <p className="text-sm text-white/60">Recommandation</p>
          <p className="font-serif text-3xl mt-1">Concentre-toi sur « {stats.best.t.label} ».</p>
          <p className="text-white/75 mt-2 text-sm">{pct(stats.best.replied, stats.best.contacted)} de réponses, {pct(stats.best.qualified, stats.best.contacted)} de RDV qualifiés{stats.best.mrr ? `, ${eur(stats.best.mrr)}/mois signés` : ""} sur {stats.best.contacted} contactés.{stats.worst && stats.worst.t.id !== stats.best.t.id ? ` À l'inverse, « ${stats.worst.t.label} » rapporte le moins pour le même effort.` : ""}</p>
          <p className="text-white/50 text-xs mt-2">Observation sur tes données, pas une certitude : une vente après un message n'est pas forcément causée par ce message.</p>
          {ws.targets[0]?.id !== stats.best.t.id && <Button className="mt-4" variant="accent" onClick={() => prioritize(stats.best.t.id)}>Mettre cette cible en priorité</Button>}
        </Card>
      )}

      <details className="group mb-8 rounded-2xl border border-line bg-white">
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3">
          <span className="font-semibold">Plus de détails</span>
          <span className="text-sm text-ink-soft"><span className="hidden sm:inline group-open:hidden">Tous les chiffres, tes contacts, ta semaine, par cible, tes clients</span><span className="hidden group-open:inline">Masquer</span></span>
        </summary>
        <div className="px-4 sm:px-5 pb-5 pt-1">
      <Week d={d} />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {[["E-mails envoyés", stats.sent], ["Contacts joints", stats.contacted], ["Réponses", stats.replies], ["RDV pris", stats.meetings], ["RDV tenus", stats.held], ["RDV qualifiés", stats.qualified], ["Clients gagnés", stats.won]].map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-[12px] text-ink-soft leading-tight">{l}</p><p className="font-serif text-3xl mt-1 tnum">{v}</p></Card>
        ))}
      </div>

      <ContactBase p={d.prospects} />
      <PilotageResultats />
      {stats.owners.length > 1 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-3">Par commercial</h2>
          <div className="bg-white border border-line rounded-2xl overflow-x-auto mb-8">
            <table className="w-full text-sm min-w-[520px]">
              <thead><tr className="text-left text-ink-soft text-xs border-b border-line"><th className="p-3">Membre</th><th className="text-right">Prospects</th><th className="text-right">RDV</th><th className="text-right">Clients</th><th className="text-right p-3">CA mensuel</th></tr></thead>
              <tbody className="divide-y divide-line">
                {stats.owners.map((o) => <tr key={o.m.user_id}><td className="p-3 font-medium truncate max-w-[220px]">{o.m.email || "Membre"}</td><td className="text-right tnum">{o.prospects}</td><td className="text-right tnum">{o.rdv}</td><td className="text-right tnum">{o.clients}</td><td className="text-right tnum p-3">{o.ca ? eur(o.ca) : "—"}</td></tr>)}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-3">Par cible (depuis le début)</h2>
      <div className="bg-white border border-line rounded-2xl overflow-x-auto mb-8">
        <table className="w-full text-sm min-w-[720px]">
          <thead><tr className="text-left text-ink-soft text-xs border-b border-line"><th className="p-3">Cible</th><th className="text-right">Contactés</th><th className="text-right">Réponse</th><th className="text-right">RDV</th><th className="text-right">Qualifiés</th><th className="text-right">Clients</th><th className="text-right">CA mensuel</th><th className="text-right p-3">Marge / mois</th></tr></thead>
          <tbody className="divide-y divide-line">
            {stats.rows.map((r) => (
              <tr key={r.t.id} className={r.t.actif === false ? "opacity-50" : ""}>
                <td className="p-3 font-medium">{r.t.label}</td><td className="text-right tnum">{r.contacted}</td><td className="text-right tnum">{pct(r.replied, r.contacted)}</td>
                <td className="text-right tnum">{r.rdv}</td><td className="text-right tnum">{r.qualified}</td><td className="text-right tnum">{r.clients}{r.churn ? <span className="text-bad"> (−{r.churn})</span> : ""}</td>
                <td className="text-right tnum">{r.mrr ? eur(r.mrr) : "—"}</td><td className="text-right tnum p-3">{r.margin ? eur(r.margin) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-line font-semibold"><td className="p-3">Total</td><td colSpan={5} /><td className="text-right tnum">{eur(stats.mrr)}</td><td className="text-right tnum p-3">{eur(stats.margin)}</td></tr></tfoot>
        </table>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-1">Tes clients</h2>
      <p className="text-sm text-ink-soft mb-3">Renseigne le montant mensuel et la marge : la machine apprend quels clients te rapportent vraiment et oriente la prospection vers eux.</p>
      {stats.clients.length === 0 ? <p className="text-sm text-ink-soft">Pas encore de client signé.</p> : (
        <div className="bg-white border border-line rounded-2xl divide-y divide-line">
          {stats.clients.map((p) => (
            <div key={p.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="flex-1 min-w-[160px] font-medium">{p.name}</span>
              <label className="flex items-center gap-1">€/mois <Input type="number" defaultValue={p.deal_value ?? ""} onBlur={(e) => setClient(p.id, "deal_value", e.target.value)} className="!w-24 py-1.5 text-sm" /></label>
              <label className="flex items-center gap-1">Marge % <Input type="number" defaultValue={p.margin_pct ?? ""} onBlur={(e) => setClient(p.id, "margin_pct", e.target.value)} className="!w-20 py-1.5 text-sm" /></label>
              <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked={!!p.churned_at} onChange={(e) => setClient(p.id, "churned_at", e.target.checked)} /> Perdu</label>
            </div>
          ))}
        </div>
      )}
        </div>
      </details>
    </div>
  );
}
