import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Badge, Button, Card, PageHead, Spinner } from "../components/ui";
import { cx } from "../lib/utils";

const eur = (x) => `${Number(x ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const when = (d) => (d ? new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "jamais");
const PLAN = { essai: "Essai", demarrage: "Démarrage", solo: "Solo", pro: "Pro", equipe: "Équipe", fondateur: "Fondateur" };

const BUDGET = { essai: 4, solo: 11, pro: 24, equipe: 46, fondateur: 15 };
const PRICE = { essai: 0, solo: 59, pro: 129, equipe: 249, fondateur: 0 };
/** Coût IA réel (mesuré à chaque appel) : par espace, budget, marge, fonctions les plus coûteuses. */
function AiCosts({ rows }) {
  if (!rows) return null;
  const total = rows.reduce((s, r) => s + Number(r.spent), 0);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-semibold text-lg">Coût IA réel du mois</h2><p className="text-sm text-ink-soft">Total : <b className="text-ink">{eur(total)}</b> · plafond de sécurité 12 € par jour pour toute la plateforme</p></div>
      {!rows.length ? <p className="text-sm text-ink-soft mt-2">La mesure démarre : les premiers chiffres arrivent avec les prochains appels.</p> : (
        <div className="mt-3 overflow-x-auto"><table className="w-full text-sm min-w-[720px]">
          <thead><tr className="text-left text-xs text-ink-soft border-b border-line"><th className="py-2 font-medium">Espace</th><th className="font-medium text-right">Dépensé</th><th className="font-medium text-right">Budget</th><th className="font-medium w-40">Utilisation</th><th className="font-medium text-right">Marge brute</th><th className="font-medium pl-4">Ce qui coûte le plus</th></tr></thead>
          <tbody className="divide-y divide-line">{rows.map((r) => {
            const b = Number(r.budget ?? BUDGET[r.plan] ?? 4), pct = Math.min(100, Math.round((Number(r.spent) / b) * 100)), price = PRICE[r.plan] ?? 0;
            return (
              <tr key={r.workspace_id ?? "x"}>
                <td className="py-2.5 font-medium">{r.name}<span className="text-ink-faint font-normal"> · {PLAN[r.plan] ?? "—"}</span></td>
                <td className="text-right tabular-nums">{eur(r.spent)}</td>
                <td className="text-right tabular-nums">{r.workspace_id ? eur(b) : "—"}</td>
                <td>{r.workspace_id && <div className="flex items-center gap-2 pl-3"><div className="h-2 flex-1 rounded-full bg-paper overflow-hidden"><div className={cx("h-full rounded-full", pct >= 100 ? "bg-bad" : pct >= 80 ? "bg-warn" : "bg-good")} style={{ width: `${pct}%` }} /></div><span className="text-xs tabular-nums w-9 text-right">{pct} %</span></div>}</td>
                <td className="text-right tabular-nums">{price ? eur(price - Number(r.spent)) : "—"}</td>
                <td className="pl-4 text-xs text-ink-soft">{Object.entries(r.top ?? {}).map(([k, v]) => `${k} ${eur(v)}`).join(" · ")}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      )}
    </Card>
  );
}

/** Tableau de bord de l'administrateur de la plateforme (accès vérifié côté serveur). */
export default function Admin() {
  const [d, setD] = useState(null);
  const [inc, setInc] = useState(null);
  const [fbk, setFbk] = useState([]);
  const [ai, setAi] = useState(null);
  const [err, setErr] = useState("");
  const load = async () => {
    setErr("");
    const [a, b, c, u] = await Promise.all([supabase.rpc("admin_overview"), supabase.rpc("admin_incidents"), supabase.rpc("admin_feedback"), supabase.rpc("ai_overview")]);
    setFbk(c.data ?? []); setAi(u.data ?? []);
    if (a.error) return setErr(a.error.message);
    setD(a.data); setInc(b.data ?? []);
  };
  useEffect(() => { load(); }, []);
  if (err) return <Card className="p-6"><p className="font-semibold">Accès refusé</p><p className="text-sm text-ink-soft mt-1">{err}</p></Card>;
  if (!d) return <Spinner />;
  const ws = d.workspaces ?? [], ms = d.missions ?? [];
  const tot = ws.reduce((s, w) => ({ today: s.today + Number(w.cost_today), m: s.m + Number(w.cost30), sent: s.sent + Number(w.sent7) }), { today: 0, m: 0, sent: 0 });
  return (
    <div className="space-y-5">
      <PageHead title="Administration" sub={`Vue d'ensemble de la plateforme · mise à jour ${when(d.at)}`}><Button onClick={load}>Actualiser</Button></PageHead>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Entreprises", ws.length], ["Missions en cours", ms.filter((m) => m.status === "active").length], ["Coût IA aujourd'hui", eur(tot.today)], ["Coût IA sur 30 jours", eur(tot.m)]].map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-2xl font-semibold tabular-nums">{v}</p><p className="text-xs text-ink-soft mt-1">{l}</p></Card>
        ))}
      </div>

      <AiCosts rows={ai} plans={ws} />

      <Card className={cx("p-5", inc?.length ? "border-bad/40" : "")}>
        <h2 className="font-semibold text-lg">Incidents à traiter</h2>
        {!inc?.length ? <p className="text-sm text-good mt-2">Aucun incident en cours.</p> : <ul className="mt-2 space-y-1.5 text-sm">{inc.map((x, i) => <li key={i} className="flex gap-2"><span className="text-bad">●</span>{x}</li>)}</ul>}
        <p className="text-xs text-ink-faint mt-3">Les mêmes incidents partent par e-mail chaque matin dès qu'une adresse d'alerte est configurée.</p>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-lg">Questions et avis des utilisateurs</h2>
        {!fbk.length ? <p className="text-sm text-ink-soft mt-2">Rien pour l'instant.</p> : (
          <ul className="mt-2 divide-y divide-line text-sm">{fbk.slice(0, 10).map((f, i) => (
            <li key={i} className="py-2.5"><p className="text-xs text-ink-faint">{when(f.at)} · {f.ws} · {f.email ? <a className="underline" href={`mailto:${f.email}`}>{f.email}</a> : "?"} · {f.page === "aide" ? <Badge tone="accent">Question</Badge> : `avis ${f.score ?? "–"}/10`}</p><p className="mt-1 whitespace-pre-line">{f.message}</p></li>
          ))}</ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-lg">Entreprises</h2>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-sm min-w-[760px]">
          <thead><tr className="text-left text-xs text-ink-soft border-b border-line"><th className="py-2 font-medium">Entreprise</th><th className="font-medium">Formule</th><th className="font-medium">Envoi</th><th className="font-medium text-right">IA aujourd'hui</th><th className="font-medium text-right">IA 30 j</th><th className="font-medium text-right">Envoyés 7 j</th><th className="font-medium text-right">Échecs</th><th className="font-medium text-right">Rebonds</th><th className="font-medium text-right">Refus</th><th className="font-medium text-right">À valider</th></tr></thead>
          <tbody className="divide-y divide-line">{ws.map((w) => (
            <tr key={w.id}>
              <td className="py-2.5 font-medium">{w.name}<p className="text-[11px] text-ink-faint font-normal">{Object.entries(w.actions_today ?? {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "aucune action aujourd'hui"}</p></td>
              <td>{PLAN[w.plan] ?? w.plan}{w.plan_status && w.plan_status !== "active" ? <span className="text-ink-faint"> · {w.plan_status}</span> : null}</td>
              <td>{w.mailbox_ok === false ? <Badge tone="bad">Boîte déconnectée</Badge> : w.mailbox_ok ? <Badge tone="good">Boîte OK</Badge> : w.domain === "verified" ? <Badge tone="good">Domaine OK</Badge> : <Badge tone="muted">Non configuré</Badge>}</td>
              <td className="text-right tabular-nums">{eur(w.cost_today)}</td>
              <td className="text-right tabular-nums">{eur(w.cost30)}</td>
              <td className="text-right tabular-nums">{w.sent7}</td>
              <td className={cx("text-right tabular-nums", w.failed7 > 0 && "text-bad font-semibold")}>{w.failed7}</td>
              <td className={cx("text-right tabular-nums", w.bounced7 > 0 && "text-bad font-semibold")}>{w.bounced7}</td>
              <td className="text-right tabular-nums">{w.refus}</td>
              <td className="text-right tabular-nums">{w.drafts}</td>
            </tr>
          ))}</tbody>
        </table></div>
        <p className="text-xs text-ink-faint mt-2">Coûts IA estimés à partir des actions enregistrées. Le montant réel facturé se lit dans la console Anthropic.</p>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-lg">Missions</h2>
        {!ms.length ? <p className="text-sm text-ink-soft mt-2">Aucune mission en cours.</p> : (
          <ul className="mt-2 divide-y divide-line text-sm">{ms.map((m) => (
            <li key={m.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2"><b>{m.ws}</b><Badge tone={m.status === "active" ? (m.auto ? "good" : "muted") : "warn"}>{m.status === "active" ? (m.auto ? "Pilotée" : "Manuelle") : `En pause${m.stop_reason ? ` · ${m.stop_reason}` : ""}`}</Badge><span className="text-ink-faint">dernier passage {when(m.run_at)} · {eur(m.spent)}{m.max_budget ? ` / ${eur(m.max_budget)}` : ""}</span></div>
              <p className="text-ink-soft truncate">{m.objective}</p>
              {m.last && <p className="text-xs text-ink-faint">{when(m.last.at)} : {m.last.text}</p>}
            </li>
          ))}</ul>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h2 className="font-semibold text-lg">Tâches automatiques</h2>
          <ul className="mt-2 divide-y divide-line text-sm">{(d.crons ?? []).map((c) => (
            <li key={c.name} className="py-2 flex items-center justify-between gap-2"><span>{c.name}<span className="block text-[11px] text-ink-faint">{c.schedule}</span></span><span className="text-right text-xs">{c.failed7 > 0 ? <Badge tone="bad">{c.failed7} échec(s)</Badge> : null} <span className="text-ink-faint">{when(c.last)}</span></span></li>
          ))}</ul>
          <p className="text-xs text-ink-faint mt-2">{d.http_errors24} appel(s) automatique(s) en erreur sur 24 h.</p>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-lg">Dernières erreurs</h2>
          {!(d.errors ?? []).length ? <p className="text-sm text-good mt-2">Aucune erreur récente.</p> : (
            <ul className="mt-2 space-y-2 text-sm">{d.errors.map((e, i) => <li key={i}><p><b>{e.what}</b> <span className="text-ink-faint">· {e.ws} · {when(e.at)}</span></p><p className="text-xs text-ink-soft break-all">{e.detail}</p></li>)}</ul>
          )}
        </Card>
      </div>
    </div>
  );
}
