import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, PageHead, useToast } from "../components/ui";
import { cx } from "../lib/utils";
import { SubNav } from "../components/SubNav";

const FEATURES = {
  solo: ["1 utilisateur", "Prospection illimitée dans le registre", "Recherche des coordonnées incluse (site et web)", "Veille de 20 concurrents / jour", "Boîte mail, CRM, agenda"],
  pro: ["3 utilisateurs", "Quotas IA doublés", "Répartition des prospects"],
  equipe: ["10 utilisateurs", "Quotas IA ×4", "Tableau de bord par commercial", "Accompagnement au démarrage"],
};
const STATUS = { active: ["Actif", "good"], trialing: ["Essai", "accent"], past_due: ["Paiement en retard", "bad"], unpaid: ["Impayé", "bad"], canceled: ["Arrêté", "bad"], incomplete: ["En attente", "warn"] };

const FEAT = { "r/spy-cron": "Espion (veille de nuit)", "espion/rapport": "Espion : rapports complets", "espion/publicites": "Espion : publicités", "espion/decouverte": "Espion : nouveaux concurrents", "espion/besoins": "Espion : besoins publics", "m/autopilot": "Mission : rédaction et relances", "m/cron": "Mission : pilote automatique", "r/radar-scan": "Radar", "r/radar-cron": "Radar (chaque matin)", "a/chat": "Vos salariés (questions)", "m/prepare": "Radar : contacts préparés" };
/** Consommation IA du mois : ce que l'équipe IA a utilisé, et ce qui se passe quand le plafond approche. */
function AiGauge({ ai }) {
  const pct = Math.min(100, Math.round((Number(ai.spent) / Math.max(1, Number(ai.budget))) * 100));
  return (
    <Card className="p-5 sm:p-6 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold">Travail de ton équipe IA ce mois-ci</p><p className="text-sm text-ink-soft tnum">{pct} % de l'enveloppe incluse</p></div>
      <div className="mt-3 h-2.5 rounded-full bg-paper overflow-hidden"><div className={cx("h-full rounded-full transition-all", pct >= 100 ? "bg-bad" : pct >= 80 ? "bg-warn" : "bg-accent")} style={{ width: `${pct}%` }} /></div>
      {Object.keys(ai.by ?? {}).length > 0 && <p className="text-[12.5px] text-ink-faint mt-2">{Object.entries(ai.by).slice(0, 5).map(([k]) => FEAT[k] ?? k).join(" · ")}</p>}
      <p className="text-sm text-ink-soft mt-3">{pct >= 100 ? "L'enveloppe du mois est utilisée : les réponses de tes prospects restent traitées, le reste reprend le 1er du mois (ou tout de suite avec l'offre supérieure)." : pct >= 60 ? "Au-delà de 60 %, la veille de nuit passe en mode économe pour garder l'essentiel (missions, réponses) jusqu'à la fin du mois." : "Tout fonctionne à plein régime. Les réponses de tes prospects sont toujours traitées, quoi qu'il arrive."}</p>
    </Card>
  );
}

export default function Abonnement() {
  const { ws, reload } = useWs();
  const toast = useToast();
  const loc = useLocation();
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(null);
  const [ai, setAi] = useState(null);
  useEffect(() => { supabase.rpc("ai_month", { p_ws: ws.id }).then(({ data }) => setAi(data ?? null)); }, [ws.id]);
  useEffect(() => { fn("plans").then((r) => setPlans(r.plans)).catch(() => {}); }, []);
  useEffect(() => {
    const q = new URLSearchParams(loc.search);
    if (q.get("paiement") === "ok") { toast("Paiement confirmé, merci ! Ton abonnement s'active dans quelques secondes.", "good"); setTimeout(reload, 4000); }
    if (q.get("paiement") === "annule") toast("Paiement annulé : rien n'a été prélevé.");
  }, [loc.search]);

  const go = async (route, plan) => {
    setBusy(plan ?? route);
    try { const r = await fn(route, { workspace_id: ws.id, plan }); window.location.href = r.url; }
    catch (e) { toast(e.message, "bad"); setBusy(null); }
  };

  const daysLeft = ws.trial_ends ? Math.ceil((new Date(ws.trial_ends) - new Date()) / 864e5) : null;
  const [label, tone] = ws.plan === "essai" ? [daysLeft > 0 ? `Essai : ${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}` : "Essai terminé", daysLeft > 0 ? "accent" : "bad"] : STATUS[ws.plan_status] ?? [ws.plan_status, "muted"];

  return (
    <div>
      <SubNav section="reglages" />
      <PageHead title="Abonnement" sub="Sans engagement : tu changes de formule ou tu arrêtes quand tu veux." />
      <Card className="p-5 sm:p-6 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm text-ink-soft">Ta formule</p>
          <p className="font-serif text-3xl">{ws.plan === "fondateur" ? "Fondateur (offerte)" : plans.find((p) => p.key === ws.plan)?.label ?? "Essai gratuit"}</p>
          {ws.period_end && ws.plan !== "essai" && <p className="text-sm text-ink-soft mt-1">Prochaine échéance le {new Date(ws.period_end).toLocaleDateString("fr-FR")}</p>}
        </div>
        <Badge tone={tone}>{label}</Badge>
        {ws.stripe_customer && <Button loading={busy === "billing-portal"} onClick={() => go("billing-portal")}>Factures, carte, résiliation</Button>}
      </Card>

      {ai && <AiGauge ai={ai} />}

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const current = ws.plan === p.key && ["active", "trialing", "past_due"].includes(ws.plan_status);
          const featured = p.key === "pro";
          return (
            <Card key={p.key} className={cx("p-5 sm:p-6 flex flex-col min-w-0", featured && "!border-ink ring-1 ring-ink")}>
              <div className="flex items-center justify-between gap-2"><p className="font-semibold">{p.label}</p>{featured && <Badge tone="accent">Le plus choisi</Badge>}</div>
              <p className="mt-3"><span className="font-serif text-5xl tnum">{p.price} €</span><span className="text-ink-soft text-sm"> HT / mois</span></p>
              <ul className="mt-4 space-y-2 text-sm flex-1">{(FEATURES[p.key] ?? []).map((f) => <li key={f} className="flex gap-2"><span className="text-good">✓</span><span>{f}</span></li>)}</ul>
              <Button className="mt-6 w-full" variant={featured ? "primary" : "default"} disabled={current || ws.plan === "fondateur"} loading={busy === p.key} onClick={() => go("billing-checkout", p.key)}>
                {current ? "Ta formule actuelle" : ws.stripe_subscription ? "Changer pour celle-ci" : "Choisir"}
              </Button>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-ink-soft mt-4">Paiement sécurisé par Stripe. Facture avec TVA envoyée chaque mois. Code promo accepté à l'étape de paiement.</p>
    </div>
  );
}
