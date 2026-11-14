import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, PageHead, useToast } from "../components/ui";
import { cx } from "../lib/utils";
import { SubNav } from "../components/SubNav";
import { modeExplorer } from "../lib/mode";
import ChoixFormule from "../components/ChoixFormule";

// Prix affiché à la française : 19,99 € ; un prix rond reste rond (29 €)
const eur = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));
const FEATURES = {
  explorer: ["Tes SaaS en tendance débloqués, avec leurs vrais revenus", "Leur visibilité, leur pub et leurs canaux", "Ton plan sur 30 jours", "Ton plan pour tes 10 premiers clients, avec des établissements à contacter", "L'étape du jour chaque matin par e-mail", "Toute la base SaaS et 10 SaaS suivis"],
  explorer_pro: ["Tout Trouver", "3 SaaS construits par mois, à ton nom (30 modifications)", "En ligne avec ton domaine, branché à ton Stripe", "SaaS et catégories suivis sans limite", "Les SaaS à vendre et à racheter", "1 000 réponses de l'assistant IA de tes SaaS par mois"],
  business: ["Tout Lancer", "10 SaaS construits par mois (100 modifications)", "3 000 réponses de l'assistant IA de tes SaaS par mois", "3 utilisateurs", "Export CSV des listes", "Support prioritaire"],
};
const VEILLE = ["explorer", "explorer_pro", "business"];
const CONTACT = "bingoo@maisonravita.fr";

/** Prospects contactés ce mois-ci : le quota de la formule, le report, les recharges, et le bouton +100. */
function Quota({ q, pack, payments, busy, onBuy }) {
  if (!q || q.total == null) return null;
  const pct = Math.min(100, Math.round((q.used / Math.max(1, q.total)) * 100));
  return (
    <Card id="quota" className={cx("p-5 sm:p-6 mb-6 scroll-mt-6", q.left <= 0 && "!border-accent ring-1 ring-accent")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold">Prospects contactés ce mois-ci</p><p className="text-sm tnum"><b>{q.used.toLocaleString("fr-FR")}</b> <span className="text-ink-soft">sur {q.total.toLocaleString("fr-FR")}</span></p></div>
      <div className="mt-3 h-2.5 rounded-full bg-paper overflow-hidden"><div className={cx("h-full rounded-full transition-all", pct >= 100 ? "bg-bad" : pct >= 80 ? "bg-warn" : "bg-accent")} style={{ width: `${pct}%` }} /></div>
      <p className="text-[13px] text-ink-soft mt-2">{q.base.toLocaleString("fr-FR")} inclus dans ta formule{q.report ? `, ${q.report} reportés du mois dernier` : ""}{q.recharge ? `, ${q.recharge} rechargés` : ""}. Un prospect contacté = un premier e-mail parti ; les relances ne comptent pas. Remise à zéro le {new Date(q.reset).toLocaleDateString("fr-FR")}.</p>
      {pack && <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant={q.left <= 0 ? "accent" : "default"} disabled={!payments || !!busy} loading={busy === pack.key} onClick={() => onBuy(pack.key)}>+100 prospects pour {pack.price} € HT</Button>
        <span className="text-[12.5px] text-ink-faint">{payments ? "Paiement unique, valable ce mois-ci." : "Les recharges ouvrent avec les abonnements."}</span>
      </div>}
    </Card>
  );
}
/** Garantie premier mois remboursé, mois offerts, et lien de parrainage. */
function Garantie({ g }) {
  const toast = useToast();
  if (!g?.garantie) return null;
  const G = g.garantie, lien = g.code ? `${window.location.origin}/?parrain=${g.code}` : "";
  const pct = G.requis ? Math.min(100, Math.round(((G.envoyes ?? 0) / G.requis) * 100)) : 0;
  const offerts = (g.perks ?? []).filter((p) => p.type === "mois_offert" || p.type === "remboursement");
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      <Card className="p-5 sm:p-6">
        <p className="font-semibold">Premier mois remboursé</p>
        <p className="text-sm text-ink-soft mt-1">{G.message}</p>
        {G.etat === "en_cours" && <>
          <div className="mt-3 h-2 rounded-full bg-paper overflow-hidden"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
          <p className="text-[12.5px] text-ink-faint mt-1.5 tnum">{G.envoyes} / {G.requis} premiers messages · {G.rdv} rendez-vous · {G.positives ?? 0} réponse{(G.positives ?? 0) > 1 ? "s" : ""} positive{(G.positives ?? 0) > 1 ? "s" : ""}</p>
        </>}
        {offerts.length > 0 && <ul className="mt-3 space-y-1 text-sm">{offerts.map((p) => <li key={p.at + p.raison}><b>{p.type === "remboursement" ? "Premier mois remboursé" : "1 mois offert"}</b> <span className="text-ink-soft">· {p.detail}{p.applique ? (p.type === "remboursement" ? " · remboursé" : " · appliqué") : p.type === "remboursement" ? " · remboursement en cours" : " · sera déduit de ta prochaine facture"}</span></li>)}</ul>}
      </Card>
      <Card className="p-5 sm:p-6">
        <p className="font-semibold">Parraine un dirigeant</p>
        <p className="text-sm text-ink-soft mt-1">Quand il s'abonne, vous gagnez chacun un mois offert.{g.filleuls ? ` ${g.filleuls} inscrit${g.filleuls > 1 ? "s" : ""} grâce à toi.` : ""}</p>
        {lien && <div className="mt-3 flex gap-2">
          <input readOnly value={lien} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm" aria-label="Ton lien de parrainage" />
          <Button onClick={async () => { try { await navigator.clipboard.writeText(lien); toast("Lien copié", "good"); } catch { toast("Sélectionne le lien pour le copier"); } }}>Copier</Button>
        </div>}
      </Card>
    </div>
  );
}
const STATUS = { active: ["Actif", "good"], trialing: ["Essai", "accent"], past_due: ["Paiement en retard", "bad"], unpaid: ["Impayé", "bad"], canceled: ["Arrêté", "bad"], incomplete: ["En attente", "warn"] };

const FEAT = { "explorer/lecture": "Lecture des fiches SaaS", "explorer/histoire": "Histoires des SaaS", "explorer/recherche": "Recherche intelligente", "explorer/clients": "Qui démarcher", "explorer/lancer": "Projets de copie", "explorer/construire": "Construction de tes SaaS", "explorer/modifier": "Modifications de tes SaaS", "k/analyze": "Analyse de ton entreprise", "r/spy-cron": "Espion (veille de nuit)", "espion/rapport": "Espion : rapports complets", "espion/publicites": "Espion : publicités", "espion/decouverte": "Espion : nouveaux concurrents", "espion/besoins": "Espion : besoins publics", "m/autopilot": "Mission : rédaction et relances", "m/cron": "Mission : pilote automatique", "r/radar-scan": "Radar", "r/radar-cron": "Radar (chaque matin)", "a/chat": "Vos salariés (questions)", "m/prepare": "Radar : contacts préparés", "k/draft": "Rédaction des e-mails", "k/linkedin": "LinkedIn", "r/radar-run": "Radar", "m/step": "Mission", "a/turn": "Vos salariés (questions)" };
/** Consommation IA du mois : ce que l'équipe IA a utilisé, et ce qui se passe quand le plafond approche. */
function AiGauge({ ai, saas }) {
  const pct = Math.min(100, Math.round((Number(ai.spent) / Math.max(1, Number(ai.budget))) * 100));
  const extra = Number(ai.balance ?? 0), paused = pct >= 100 && extra <= 0;
  return (
    <Card className="p-5 sm:p-6 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold">{saas ? "IA utilisée ce mois-ci" : "Travail de ton équipe IA ce mois-ci"}</p><p className="text-sm text-ink-soft tnum">{pct} % de l'enveloppe incluse</p></div>
      <div className="mt-3 h-2.5 rounded-full bg-paper overflow-hidden"><div className={cx("h-full rounded-full transition-all", pct >= 100 ? "bg-bad" : pct >= 80 ? "bg-warn" : "bg-accent")} style={{ width: `${pct}%` }} /></div>
      {Object.keys(ai.by ?? {}).length > 0 && <p className="text-[12.5px] text-ink-faint mt-2">{Object.entries(ai.by).slice(0, 5).map(([k]) => FEAT[k] ?? (k.startsWith("app/") ? "Assistant IA de tes SaaS" : k.startsWith("explorer/") ? "Bingoo!" : "Autres tâches")).filter((x, i, a) => a.indexOf(x) === i).join(" · ")}</p>}
      {extra > 0 && <p className="text-sm mt-3"><b>Crédits achetés disponibles :</b> {Math.round((extra / Math.max(0.01, Number(ai.budget))) * 100)} % d'enveloppe en plus, utilisée seulement une fois l'enveloppe du mois finie. Elle ne périme pas.</p>}
      <p className={cx("text-sm mt-3", paused ? "text-bad font-medium" : "text-ink-soft")}>{paused ? (saas ? "L'IA de Bingoo! est en pause jusqu'au 1er du mois : l'enveloppe est utilisée. Tes SaaS en ligne continuent de tourner. Achète des crédits pour la relancer tout de suite." : "Ton équipe IA est en pause jusqu'au 1er du mois : l'enveloppe est utilisée. Les réponses de tes prospects restent traitées. Achète des crédits pour la relancer tout de suite.") : pct >= 100 ? "L'enveloppe du mois est utilisée : ton équipe continue grâce à tes crédits achetés." : pct >= 60 ? (saas ? "Quand l'enveloppe est finie, l'IA s'arrête jusqu'au 1er du mois, sauf crédits achetés. Tes SaaS en ligne continuent de tourner." : "Au-delà de 60 %, la veille de nuit passe en mode économe pour garder l'essentiel (missions, réponses) jusqu'à la fin du mois.") : (saas ? "Tout fonctionne à plein régime." : "Tout fonctionne à plein régime. Les réponses de tes prospects sont toujours traitées, quoi qu'il arrive.")}</p>
    </Card>
  );
}

/** Acheter des crédits IA : paiement unique, quand l'enveloppe du mois ne suffit pas. */
// Ce que paie un pack de crédits côté Bingoo! (une construction de SaaS coûte environ 1 € d'IA)
const TRAVAIL_SAAS = { s: "environ 3 SaaS construits de plus", m: "environ 8 SaaS construits de plus", l: "environ 17 SaaS construits de plus" };
function Credits({ ai, packs, busy, onBuy, saas }) {
  if (!packs.length) return null;
  const pct = ai ? Math.round((Number(ai.spent) / Math.max(1, Number(ai.budget))) * 100) : 0;
  const paused = ai && pct >= 100 && Number(ai.balance ?? 0) <= 0;
  return (
    <Card id="credits" className={cx("p-5 sm:p-6 mb-6 scroll-mt-6", paused && "!border-accent ring-1 ring-accent")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-lg">Acheter des crédits IA</p>
        {ai && <p className="text-sm text-ink-soft">Crédits achetés disponibles : <b className="text-ink">{Number(ai.balance ?? 0) > 0 ? "oui" : "aucun"}</b></p>}
      </div>
      <p className="text-sm text-ink-soft mt-1">{paused ? "Ton équipe IA est en pause : achète des crédits pour la relancer tout de suite." : "Pour en faire plus que ce qui est inclus dans ta formule ce mois-ci."}</p>
      <div className="mt-4 grid sm:grid-cols-3 gap-3">
        {packs.map((p) => (
          <div key={p.key} className={cx("rounded-2xl border p-4 flex flex-col", p.key === "m" ? "border-accent bg-accent-soft/30" : "border-line bg-white")}>
            <div className="flex items-center justify-between"><span className="font-semibold">{p.label.replace("Recharge", "Crédits")}</span>{p.key === "m" && <Badge tone="accent">Le plus pris</Badge>}</div>
            <p className="mt-2"><span className="font-serif text-4xl tnum">{p.price} €</span><span className="text-ink-soft text-sm"> HT</span></p>
            <p className="text-[13px] text-ink-soft mt-1 flex-1">{saas ? `${TRAVAIL_SAAS[p.key] ?? p.work}, ou l'équivalent en modifications et lectures de fiches.` : `${p.work}, ou l'équivalent en recherches et analyses.`}</p>
            <Button className="mt-3 w-full" variant={p.key === "m" ? "accent" : "default"} disabled={!!busy} loading={busy === p.key} onClick={() => onBuy(p.key)}>Acheter</Button>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-ink-faint mt-3">Paiement unique, sans abonnement, facture fournie. Les crédits ne périment pas : ils servent seulement une fois l'enveloppe du mois utilisée.</p>
    </Card>
  );
}

// Crédits Bingoo! (formule Lancer) : une modification en plus, une vidéo pub, un autre SaaS
const ACTIONS_CREDITS = [["Une modification en plus", "modification", "au-delà des 30 du mois"], ["Une vidéo pub de ton SaaS", "video", "20 s en motion design, 2 formats"], ["Un autre SaaS", "saas", "ton premier reste en ligne"]];
// Ce que l'abonné a utilisé ce mois-ci, face aux limites de sa formule
const LIGNES_MOIS = [["construire", "Constructions de SaaS", "Reconstruire ou repartir de zéro"], ["modifier", "Modifications dans l'Atelier", "Au-delà : 1 crédit la modification"], ["tiktok", "Recherches TikTok", "Vidéos et comptes à étudier"], ["pareil", "Scripts « Faire pareil »", "Une vidéo TikTok adaptée à ton SaaS"]];
function MoisEnCours({ l }) {
  if (!l) return null;
  const repart = new Date(l.repart).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return (
    <Card className="p-5 sm:p-6 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-lg">Ton mois</p>
        <p className="text-sm text-ink-soft">Tout repart à zéro le {repart}</p>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-4">
        {LIGNES_MOIS.map(([k, t, sous]) => {
          const m = l.mois?.[k] ?? { utilise: 0, max: 0 };
          const pct = m.max ? Math.min(100, Math.round((m.utilise / m.max) * 100)) : 100;
          return (
            <div key={k}>
              <div className="flex items-baseline justify-between gap-2"><p className="text-[14px] font-semibold">{t}</p><p className="text-[13px] tnum"><b>{m.utilise}</b><span className="text-ink-soft"> / {m.max || "—"}</span></p></div>
              <div className="mt-1.5 h-1.5 rounded-full bg-paper overflow-hidden"><div className={cx("h-full rounded-full", pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-ink")} style={{ width: `${m.max ? pct : 0}%` }} /></div>
              <p className="mt-1 text-[12px] text-ink-soft">{m.max ? sous : "Compris dans la formule Lancer"}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 border-t border-line pt-3 flex items-center gap-3">
        <p className="text-[13px] text-ink-soft flex-1">Utilisation de l'IA ce mois-ci</p>
        <div className="w-40 h-1.5 rounded-full bg-paper overflow-hidden"><div className={cx("h-full rounded-full", l.ia.pct >= 90 ? "bg-red-500" : l.ia.pct >= 70 ? "bg-amber-500" : "bg-ink")} style={{ width: `${l.ia.pct}%` }} /></div>
        <p className="text-[13px] tnum w-10 text-right">{l.ia.pct} %</p>
      </div>
    </Card>
  );
}

function CreditsBingoo({ c, packs, busy, onBuy, payments }) {
  if (!packs.length) return null;
  return (
    <Card id="credits" className="p-5 sm:p-6 mb-6 scroll-mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-lg">Tes crédits</p>
        <p className="text-sm text-ink-soft">Solde : <b className="text-ink text-base tnum">{c ? `${c.solde} crédit${c.solde > 1 ? "s" : ""}` : "…"}</b></p>
      </div>
      <div className="mt-3 grid sm:grid-cols-3 gap-2">
        {ACTIONS_CREDITS.map(([l, k, sous]) => (
          <div key={k} className="rounded-xl bg-paper/70 border border-line px-3.5 py-2.5">
            <p className="text-[13.5px] font-semibold">{l}</p>
            <p className="text-[12.5px] text-ink-soft"><b className="text-ink">{c?.couts?.[k] ?? { modification: 1, video: 10, saas: 60 }[k]} crédit{k === "modification" ? "" : "s"}</b> · {sous}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid sm:grid-cols-3 gap-3">
        {packs.map((p) => (
          <div key={p.key} className={cx("rounded-2xl border p-4 flex flex-col", p.key === "c60" ? "border-accent bg-accent-soft/30" : "border-line bg-white")}>
            <div className="flex items-center justify-between"><span className="font-semibold">{p.label}</span>{p.key === "c60" && <Badge tone="accent">Le plus pris</Badge>}</div>
            <p className="mt-2"><span className="font-serif text-4xl tnum">{eur(p.price)} €</span><span className="text-ink-soft text-sm"> HT</span></p>
            <p className="text-[13px] text-ink-soft mt-1 flex-1">Par exemple {p.work}.</p>
            <Button className="mt-3 w-full" variant={p.key === "c60" ? "accent" : "default"} disabled={!!busy || !payments} loading={busy === p.key} onClick={() => onBuy(p.key)}>Acheter</Button>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-ink-faint mt-3">Paiement unique, sans abonnement, facture fournie. Tes crédits ne périment pas tant que ton abonnement est actif. Une action qui échoue te rend ses crédits.</p>
      {c?.mouvements?.length > 0 && (
        <details className="mt-3 text-[13px]"><summary className="cursor-pointer text-ink-soft">Historique</summary>
          <ul className="mt-2 space-y-1">{c.mouvements.map((m, i) => <li key={i} className="flex justify-between gap-3"><span>{m.motif} <span className="text-ink-faint">· {new Date(m.at).toLocaleDateString("fr-FR")}</span></span><b className={cx("tnum", m.delta > 0 ? "text-[#15803D]" : "")}>{m.delta > 0 ? "+" : ""}{m.delta}</b></li>)}</ul>
        </details>
      )}
    </Card>
  );
}

export default function Abonnement() {
  const { ws, reload } = useWs();
  const toast = useToast();
  const loc = useLocation();
  const [plans, setPlans] = useState([]);
  const [packs, setPacks] = useState([]);
  const [cPacks, setCPacks] = useState([]);
  const [credits, setCredits] = useState(null);
  const chargerCredits = () => fn("r/credits", { workspace_id: ws.id }).then(setCredits).catch(() => {});
  useEffect(() => { chargerCredits(); }, [ws.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [lim, setLim] = useState(null);
  useEffect(() => { fn("r/limites", { workspace_id: ws.id }).then(setLim).catch(() => {}); }, [ws.id]);
  const [pPack, setPPack] = useState(null);
  const [quota, setQuota] = useState(null);
  useEffect(() => { fn("quota", { workspace_id: ws.id }).then(setQuota).catch(() => {}); }, [ws.id]);
  const [gar, setGar] = useState(null);
  useEffect(() => { fn("garantie", { workspace_id: ws.id }).then(setGar).catch(() => {}); }, [ws.id]);
  const [busy, setBusy] = useState(null);
  const [ai, setAi] = useState(null);
  const [yearly, setYearly] = useState(false);
  useEffect(() => { supabase.rpc("ai_month", { p_ws: ws.id }).then(({ data }) => setAi(data ?? null)); }, [ws.id]);
  const [payments, setPayments] = useState(true);
  const [fond, setFond] = useState(null);
  useEffect(() => { fn("plans").then((r) => { setFond(r.fondateur ?? null); setPlans(r.plans ?? []); setPacks(r.packs ?? []); setCPacks(r.credit_packs ?? []); setPPack(r.prospect_pack ?? null); setPayments(r.payments !== false); }).catch(() => {}); }, []);
  useEffect(() => {
    const q = new URLSearchParams(loc.search);
    if (q.get("paiement") === "ok") { toast("Paiement confirmé, merci ! Ton abonnement s'active dans quelques secondes.", "good"); setTimeout(reload, 4000); }
    if (q.get("paiement") === "annule") toast("Paiement annulé : rien n'a été prélevé.");
    if (q.get("recharge") === "ok") { toast("Crédits payés, merci ! Ils sont ajoutés dans quelques secondes et ton équipe IA repart.", "good"); setTimeout(() => supabase.rpc("ai_month", { p_ws: ws.id }).then(({ data }) => setAi(data ?? null)), 5000); }
    if (q.get("recharge") === "prospects") { toast("Recharge payée, merci ! 100 prospects de plus ce mois-ci.", "good"); setTimeout(() => fn("quota", { workspace_id: ws.id }).then(setQuota).catch(() => {}), 5000); }
    if (q.get("recharge") === "credits") { toast("Crédits payés, merci ! Ils arrivent sur ton solde dans quelques secondes.", "good"); setTimeout(chargerCredits, 4000); }
    if (q.get("recharge") === "annule") toast("Achat annulé : rien n'a été prélevé.");
    if (loc.hash.includes("credits") || q.get("credits")) setTimeout(() => document.getElementById("credits")?.scrollIntoView({ behavior: "smooth" }), 400);
  }, [loc.search]);

  const go = async (route, plan, pack, periode) => {
    setBusy(periode ?? plan ?? pack ?? route);
    try { const r = await fn(route, { workspace_id: ws.id, plan, yearly, pack, periode }); window.location.href = r.url; }
    catch (e) { toast(e.message, "bad"); setBusy(null); }
  };

  // Arrivée depuis « Lancer celui-ci » : on ouvre directement le paiement de la formule demandée
  const formule = new URLSearchParams(loc.search).get("formule");
  const periodeVoulue = new URLSearchParams(loc.search).get("periode");
  useEffect(() => { if (formule && periodeVoulue && payments && plans.some((p) => p.key === formule) && !["active", "trialing"].includes(ws.plan_status)) go("billing-checkout", formule, undefined, periodeVoulue); }, [formule, periodeVoulue, payments, plans.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const saas = modeExplorer(ws) || ws.plan === "fondateur";
  const daysLeft = ws.trial_ends ? Math.ceil((new Date(ws.trial_ends) - new Date()) / 864e5) : null;
  const [label, tone] = ws.plan === "essai" ? [saas ? "Verrouillé" : daysLeft > 0 ? `Aperçu : ${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}` : (payments ? "Essai terminé" : "Accès de lancement"), daysLeft > 0 || !payments ? "accent" : "bad"] : STATUS[ws.plan_status] ?? [ws.plan_status, "muted"];

  return (
    <div>
      <SubNav section="reglages" />
      <PageHead title="Abonnement" sub="Sans engagement : tu changes de formule ou tu arrêtes quand tu veux." />
      {!payments && <Card className="p-4 sm:p-5 mb-6 border-accent/30 bg-accent-soft/40"><p className="font-semibold">Les abonnements ouvrent très bientôt</p><p className="text-sm text-ink-soft mt-1">Tu seras prévenu par e-mail dès l'ouverture : tes SaaS se débloqueront dès ton paiement.</p></Card>}
      <Card className="p-5 sm:p-6 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm text-ink-soft">Ta formule</p>
          <p className="font-serif text-3xl">{ws.plan === "fondateur" ? "Fondateur (offerte)" : plans.find((p) => p.key === ws.plan)?.label ?? "Aucune formule"}</p>
          {ws.period_end && ws.plan !== "essai" && <p className="text-sm text-ink-soft mt-1">Prochaine échéance le {new Date(ws.period_end).toLocaleDateString("fr-FR")}</p>}
        </div>
        <Badge tone={tone}>{label}</Badge>
        {ws.stripe_customer && <Button loading={busy === "billing-portal"} onClick={() => go("billing-portal")}>Factures, carte, résiliation</Button>}
      </Card>

      {!saas && <Quota q={quota} pack={pPack} payments={payments} busy={busy} onBuy={(k) => go("billing-recharge", undefined, k)} />}
      {!saas && <Garantie g={gar} />}
      {saas ? <MoisEnCours l={lim} /> : ai && <AiGauge ai={ai} saas={saas} />}
      {saas ? <CreditsBingoo c={credits} packs={cPacks} payments={payments} busy={busy} onBuy={(k) => go("billing-recharge", undefined, k)} />
        : <Credits saas={saas} ai={ai} packs={packs.filter((p) => !p.prospects)} busy={busy} onBuy={(k) => go("billing-recharge", undefined, k)} />}

      <h2 className="font-serif text-2xl mb-1">Lancer ton SaaS</h2>
      <p className="text-sm text-ink-soft mb-6">Un SaaS par abonnement. Plus la durée est longue, moins c'est cher par mois et plus c'est complet.</p>
      <ChoixFormule periodes={plans.find((p) => p.key === "explorer_pro")?.periodes} fondateur={fond && (ws.founder_price || fond.left > 0) ? fond.price : null}
        actuelle={ws.plan === "explorer_pro" && ["active", "trialing", "past_due"].includes(ws.plan_status) ? (ws.periode ?? "mois") : null}
        busy={busy} onChoisir={(k) => go("billing-checkout", "explorer_pro", undefined, k)} />
      <Card className="mt-6 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 bg-paper/50">
        <div><p className="font-semibold">Plusieurs SaaS, une équipe, un incubateur ?</p><p className="text-sm text-ink-soft mt-1">Formule sur devis : utilisateurs et SaaS sur mesure, accompagnement au lancement.</p></div>
        <a href={`mailto:${CONTACT}?subject=${encodeURIComponent("Bingoo! Entreprise : demande de devis")}`} className="inline-flex justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:border-ink-faint">Nous écrire</a>
      </Card>
      <p className="text-xs text-ink-soft mt-4">Paiement sécurisé par Stripe. Facture avec TVA envoyée chaque mois. Code promo accepté à l'étape de paiement.</p>
    </div>
  );
}
