import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, PageHead, useToast } from "../components/ui";
import { cx } from "../lib/utils";
import { SubNav } from "../components/SubNav";

const FEATURES = {
  solo: ["1 utilisateur", "Radar : appels d'offres, contrats à renouveler, nouveaux dirigeants", "Espion : veille de tes concurrents", "Mission : prospects trouvés, e-mails rédigés, relances", "Boîte mail, CRM, agenda"],
  pro: ["3 utilisateurs", "Quotas IA doublés", "Répartition des prospects"],
  equipe: ["10 utilisateurs", "Quotas IA ×4", "Tableau de bord par commercial", "Accompagnement au démarrage"],
};
const STATUS = { active: ["Actif", "good"], trialing: ["Essai", "accent"], past_due: ["Paiement en retard", "bad"], unpaid: ["Impayé", "bad"], canceled: ["Arrêté", "bad"], incomplete: ["En attente", "warn"] };

const FEAT = { "r/spy-cron": "Espion (veille de nuit)", "espion/rapport": "Espion : rapports complets", "espion/publicites": "Espion : publicités", "espion/decouverte": "Espion : nouveaux concurrents", "espion/besoins": "Espion : besoins publics", "m/autopilot": "Mission : rédaction et relances", "m/cron": "Mission : pilote automatique", "r/radar-scan": "Radar", "r/radar-cron": "Radar (chaque matin)", "a/chat": "Vos salariés (questions)", "m/prepare": "Radar : contacts préparés", "k/draft": "Rédaction des e-mails", "k/linkedin": "LinkedIn", "r/radar-run": "Radar", "m/step": "Mission", "a/turn": "Vos salariés (questions)" };
/** Consommation IA du mois : ce que l'équipe IA a utilisé, et ce qui se passe quand le plafond approche. */
function AiGauge({ ai }) {
  const pct = Math.min(100, Math.round((Number(ai.spent) / Math.max(1, Number(ai.budget))) * 100));
  const extra = Number(ai.balance ?? 0), paused = pct >= 100 && extra <= 0;
  return (
    <Card className="p-5 sm:p-6 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold">Travail de ton équipe IA ce mois-ci</p><p className="text-sm text-ink-soft tnum">{pct} % de l'enveloppe incluse</p></div>
      <div className="mt-3 h-2.5 rounded-full bg-paper overflow-hidden"><div className={cx("h-full rounded-full transition-all", pct >= 100 ? "bg-bad" : pct >= 80 ? "bg-warn" : "bg-accent")} style={{ width: `${pct}%` }} /></div>
      {Object.keys(ai.by ?? {}).length > 0 && <p className="text-[12.5px] text-ink-faint mt-2">{Object.entries(ai.by).slice(0, 5).map(([k]) => FEAT[k] ?? k).join(" · ")}</p>}
      {extra > 0 && <p className="text-sm mt-3"><b>Crédits achetés disponibles :</b> {Math.round((extra / Math.max(0.01, Number(ai.budget))) * 100)} % d'enveloppe en plus, utilisée seulement une fois l'enveloppe du mois finie. Elle ne périme pas.</p>}
      <p className={cx("text-sm mt-3", paused ? "text-bad font-medium" : "text-ink-soft")}>{paused ? "Ton équipe IA est en pause jusqu'au 1er du mois : l'enveloppe est utilisée. Les réponses de tes prospects restent traitées. Achète des crédits pour la relancer tout de suite." : pct >= 100 ? "L'enveloppe du mois est utilisée : ton équipe continue grâce à tes crédits achetés." : pct >= 60 ? "Au-delà de 60 %, la veille de nuit passe en mode économe pour garder l'essentiel (missions, réponses) jusqu'à la fin du mois." : "Tout fonctionne à plein régime. Les réponses de tes prospects sont toujours traitées, quoi qu'il arrive."}</p>
    </Card>
  );
}

/** Acheter des crédits IA : paiement unique, quand l'enveloppe du mois ne suffit pas. */
function Credits({ ai, packs, busy, onBuy }) {
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
            <p className="text-[13px] text-ink-soft mt-1 flex-1">{p.work}, ou l'équivalent en recherches et analyses.</p>
            <Button className="mt-3 w-full" variant={p.key === "m" ? "accent" : "default"} disabled={!!busy} loading={busy === p.key} onClick={() => onBuy(p.key)}>Acheter</Button>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-ink-faint mt-3">Paiement unique, sans abonnement, facture fournie. Les crédits ne périment pas : ils servent seulement une fois l'enveloppe du mois utilisée.</p>
    </Card>
  );
}

export default function Abonnement() {
  const { ws, reload } = useWs();
  const toast = useToast();
  const loc = useLocation();
  const [plans, setPlans] = useState([]);
  const [packs, setPacks] = useState([]);
  const [busy, setBusy] = useState(null);
  const [ai, setAi] = useState(null);
  const [yearly, setYearly] = useState(false);
  useEffect(() => { supabase.rpc("ai_month", { p_ws: ws.id }).then(({ data }) => setAi(data ?? null)); }, [ws.id]);
  useEffect(() => { fn("plans").then((r) => { setPlans(r.plans); setPacks(r.packs ?? []); }).catch(() => {}); }, []);
  useEffect(() => {
    const q = new URLSearchParams(loc.search);
    if (q.get("paiement") === "ok") { toast("Paiement confirmé, merci ! Ton abonnement s'active dans quelques secondes.", "good"); setTimeout(reload, 4000); }
    if (q.get("paiement") === "annule") toast("Paiement annulé : rien n'a été prélevé.");
    if (q.get("recharge") === "ok") { toast("Crédits payés, merci ! Ils sont ajoutés dans quelques secondes et ton équipe IA repart.", "good"); setTimeout(() => supabase.rpc("ai_month", { p_ws: ws.id }).then(({ data }) => setAi(data ?? null)), 5000); }
    if (q.get("recharge") === "annule") toast("Achat annulé : rien n'a été prélevé.");
    if (loc.hash.includes("credits") || q.get("credits")) setTimeout(() => document.getElementById("credits")?.scrollIntoView({ behavior: "smooth" }), 400);
  }, [loc.search]);

  const go = async (route, plan, pack) => {
    setBusy(plan ?? pack ?? route);
    try { const r = await fn(route, { workspace_id: ws.id, plan, yearly, pack }); window.location.href = r.url; }
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
      <Credits ai={ai} packs={packs} busy={busy} onBuy={(k) => go("billing-recharge", undefined, k)} />

      <div className="mb-4 inline-flex rounded-full border border-line bg-white p-1 text-sm">
        {[[false, "Mensuel"], [true, "Annuel · −20 %"]].map(([v, l]) => <button key={l} onClick={() => setYearly(v)} className={cx("rounded-full px-4 py-1.5 font-medium transition", yearly === v ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}>{l}</button>)}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const current = ws.plan === p.key && ["active", "trialing", "past_due"].includes(ws.plan_status);
          const featured = p.key === "pro";
          return (
            <Card key={p.key} className={cx("p-5 sm:p-6 flex flex-col min-w-0", featured && "!border-ink ring-1 ring-ink")}>
              <div className="flex items-center justify-between gap-2"><p className="font-semibold">{p.label}</p>{featured && <Badge tone="accent">Le plus choisi</Badge>}</div>
              <p className="mt-3"><span className="font-serif text-5xl tnum">{yearly ? Math.round(p.price * 0.8) : p.price} €</span><span className="text-ink-soft text-sm"> HT / mois</span></p>
              <p className="text-xs text-ink-faint mt-1">{yearly ? `soit ${Math.round(p.price * 12 * 0.8)} € HT par an, au lieu de ${p.price * 12} €` : "sans engagement"}</p>
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
