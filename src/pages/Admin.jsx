import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Badge, Button, Card, PageHead, Spinner } from "../components/ui";
import { cx } from "../lib/utils";

const eur = (x) => `${Number(x ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const when = (d) => (d ? new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "jamais");
const PLAN = { essai: "Essai", demarrage: "Démarrage", solo: "Solo", pro: "Pro", equipe: "Équipe", fondateur: "Fondateur" };

const BUDGET = { essai: 4, solo: 11, pro: 24, equipe: 46, fondateur: 15 };
const PRICE = { essai: 0, solo: 49, pro: 119, equipe: 229, fondateur: 0 };
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
/** Phase 1 du plan : 10 clients payants, dont 6 avec au moins 2 rendez-vous dans leurs 30 premiers jours. */
function Pilotes() {
  const [rows, setRows] = useState(null);
  const load = () => supabase.rpc("admin_pilotes").then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  if (!rows) return null;
  const payants = rows.filter((r) => !["essai"].includes(r.plan) && r.plan_status === "active");
  const reussis = rows.filter((r) => Number(r.rdv_30j) >= 2);
  const aAppliquer = rows.flatMap((r) => (r.mois_offerts ?? []).map((p) => ({ ...p, ws: r.workspace_id, name: r.name })));
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">Clients pilotes : objectif des 90 jours</p>
        <p className="text-sm tnum"><b>{payants.length}</b>/10 payants · <b>{reussis.length}</b>/6 avec 2 RDV en 30 jours</p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-ink-soft text-[12px]">{["Client", "Formule", "Jour", "Contactées", "Réponses +", "RDV (30 j)", "Rebonds", "E-mails payants", "IA / contact"].map((h) => <th key={h} className="py-1.5 pr-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.workspace_id} className={Number(r.rdv_30j) >= 2 ? "bg-good-soft/40" : ""}>
                <td className="py-1.5 pr-3 font-medium">{r.name}{r.parrain ? <span className="text-ink-faint font-normal"> · parrain {r.parrain}</span> : null}</td>
                <td className="py-1.5 pr-3">{r.plan}{r.plan_status && r.plan !== "essai" ? ` (${r.plan_status})` : ""}</td>
                <td className="py-1.5 pr-3 tnum">J+{r.jours}</td>
                <td className="py-1.5 pr-3 tnum">{r.contactes}</td>
                <td className="py-1.5 pr-3 tnum">{r.positifs}</td>
                <td className="py-1.5 pr-3 tnum font-semibold">{r.rdv_30j}<span className="font-normal text-ink-faint"> / {r.rdv}</span></td>
                <td className={cx("py-1.5 pr-3 tnum", Number(r.rebonds) > 0 && "text-bad")}>{r.rebonds}</td>
                <td className="py-1.5 pr-3 tnum">{r.emails_payants}</td>
                <td className="py-1.5 pr-3 tnum">{r.cout_par_contact != null ? `${Number(r.cout_par_contact).toFixed(3)} €` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="text-sm text-ink-soft py-3">Aucun client pour l'instant (les espaces fondateur ne sont pas comptés).</p>}
      </div>
      {aAppliquer.length > 0 && (
        <div className="mt-4 rounded-xl bg-accent-soft/50 p-3">
          <p className="text-sm font-semibold">Remboursements et mois offerts à appliquer dans Stripe</p>
          <ul className="mt-1 space-y-1 text-sm">{aAppliquer.map((p) => (
            <li key={p.ws + p.at} className="flex flex-wrap items-center gap-2">{p.name} : {p.type === "remboursement" ? "rembourser le premier mois" : "1 mois offert"} · {p.raison} ({p.detail})
              <button className="underline text-ink-soft" onClick={async () => { await supabase.rpc("admin_perk_applique", { p_ws: p.ws, p_at: p.at }); load(); }}>Marquer appliqué</button></li>
          ))}</ul>
        </div>
      )}
    </Card>
  );
}

/** La question produit qui compte : sur les opportunités proposées, combien partent telles quelles ? (objectif : 70 %) */
function Acceptation() {
  const [rows, setRows] = useState(null);
  useEffect(() => { supabase.rpc("admin_acceptation", { p_jours: 30 }).then(({ data }) => setRows(data ?? [])); }, []);
  if (!rows?.length) return null;
  return (
    <Card className="p-5">
      <p className="font-semibold">Les opportunités partent-elles telles quelles ? <span className="font-normal text-ink-soft">(30 jours · objectif 70 %)</span></p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-ink-soft text-[12px]">{["Espace", "Proposées", "Envoyées telles quelles", "Envoyées modifiées", "Écartées", "En attente", "Tel quel", "« Tu l'enverrais ? »"].map((h) => <th key={h} className="py-1.5 pr-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.workspace_id}>
                <td className="py-1.5 pr-3 font-medium">{r.name}</td>
                <td className="py-1.5 pr-3 tnum">{r.proposees}</td><td className="py-1.5 pr-3 tnum">{r.envoyees_telles}</td><td className="py-1.5 pr-3 tnum">{r.envoyees_modifiees}</td>
                <td className="py-1.5 pr-3 tnum">{r.ecartees}</td><td className="py-1.5 pr-3 tnum">{r.en_attente}</td>
                <td className={`py-1.5 pr-3 tnum font-semibold ${r.taux_tel_quel == null ? "text-ink-faint" : Number(r.taux_tel_quel) >= 70 ? "text-good" : "text-warn"}`}>{r.taux_tel_quel == null ? "–" : `${r.taux_tel_quel} %`}</td>
                <td className="py-1.5 pr-3 tnum">{r.magique_oui + r.magique_non ? `${r.magique_oui} oui · ${r.magique_non} non` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** Comment les pilotes utilisent Bingoo! (14 jours) : ville ou liste, téléphone, bâtiments, hésitations, aide. */
const NOMS = { poste: "Réponses", atelier: "Messages à envoyer", rdv: "Rendez-vous", annuaire: "Entreprises", radar: "Opportunités", espion: "Concurrents", linkedin: "LinkedIn", observatoire: "Résultats", mairie: "Réglages" };
function Usage() {
  const [rows, setRows] = useState(null);
  useEffect(() => { supabase.rpc("admin_usage", { p_jours: 14 }).then(({ data }) => setRows(data ?? [])); }, []);
  if (!rows) return null;
  const top = (o, f = (k) => k) => Object.entries(o ?? {}).map(([k, n]) => `${f(k)} ${n}`).join(" · ") || "—";
  return (
    <Card className="p-5">
      <p className="font-semibold">Comment ils utilisent Bingoo! <span className="font-normal text-ink-soft">· 14 derniers jours</span></p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-ink-soft text-[12px]">{["Client", "Ville / liste", "Sur téléphone", "Bâtiments ouverts", "Hésitations", "Aide demandée", "« Tout traiter »"].map((h) => <th key={h} className="py-1.5 pr-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const tot = Number(r.vues_village) + Number(r.vues_liste);
              return (
                <tr key={r.workspace_id}>
                  <td className="py-1.5 pr-3 font-medium">{r.name}</td>
                  <td className="py-1.5 pr-3 tnum">{tot ? `${Math.round((Number(r.vues_village) / tot) * 100)} % ville` : "—"}<span className="text-ink-faint"> ({r.vues_village}/{r.vues_liste})</span></td>
                  <td className="py-1.5 pr-3 tnum">{tot ? `${Math.round((Number(r.vues_mobile) / tot) * 100)} %` : "—"}</td>
                  <td className="py-1.5 pr-3 text-[12.5px]">{top(r.lieux, (k) => NOMS[k] ?? k)}</td>
                  <td className={cx("py-1.5 pr-3 text-[12.5px]", r.hesitations && "text-warn")}>{top(r.hesitations, (k) => k.split(">").map((x) => NOMS[x] ?? x).join(" → "))}</td>
                  <td className="py-1.5 pr-3 text-[12.5px]">{top(r.aides)}</td>
                  <td className="py-1.5 pr-3 tnum">{r.series_fin}/{r.series_debut} finies</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <p className="text-sm text-ink-soft py-3">Pas encore de données : elles arrivent dès que les pilotes se connectent.</p>}
      </div>
      <p className="text-[12px] text-ink-faint mt-2">Une hésitation = un bâtiment quitté en moins de 5 secondes pour un autre. Si un même couple revient souvent, ces deux bâtiments sont à fusionner ou à rapprocher.</p>
    </Card>
  );
}

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

      <Acceptation />
      <Pilotes />
      <Usage />

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
