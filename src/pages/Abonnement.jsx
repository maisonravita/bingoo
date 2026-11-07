import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, PageHead, useToast } from "../components/ui";
import { cx } from "../lib/utils";
import { SubNav } from "../components/SubNav";

const FEATURES = {
  solo: ["1 utilisateur", "100 prospects contactés par mois", "Décideur trouvé, e-mail vérifié, message écrit pour lui", "Demandes publiques avec réponse prête, chaque jour", "Radar et relances", "Prospects non utilisés reportés au mois suivant"],
  pro: ["2 utilisateurs", "300 prospects contactés par mois", "Tout ce qu'il y a dans Solo", "Espion : tes concurrents surveillés", "LinkedIn par l'extension"],
  equipe: ["5 utilisateurs", "700 prospects contactés par mois", "Tout ce qu'il y a dans Pro", "Répartition des prospects entre commerciaux", "Tableau de bord par commercial"],
};
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
  useEffect(() => { fn("plans").then((r) => { setFond(r.fondateur ?? null); setPlans(r.plans ?? []); setPacks(r.packs ?? []); setPPack(r.prospect_pack ?? null); setPayments(r.payments !== false); }).catch(() => {}); }, []);
  useEffect(() => {
    const q = new URLSearchParams(loc.search);
    if (q.get("paiement") === "ok") { toast("Paiement confirmé, merci ! Ton abonnement s'active dans quelques secondes.", "good"); setTimeout(reload, 4000); }
    if (q.get("paiement") === "annule") toast("Paiement annulé : rien n'a été prélevé.");
    if (q.get("recharge") === "ok") { toast("Crédits payés, merci ! Ils sont ajoutés dans quelques secondes et ton équipe IA repart.", "good"); setTimeout(() => supabase.rpc("ai_month", { p_ws: ws.id }).then(({ data }) => setAi(data ?? null)), 5000); }
    if (q.get("recharge") === "prospects") { toast("Recharge payée, merci ! 100 prospects de plus ce mois-ci.", "good"); setTimeout(() => fn("quota", { workspace_id: ws.id }).then(setQuota).catch(() => {}), 5000); }
    if (q.get("recharge") === "annule") toast("Achat annulé : rien n'a été prélevé.");
    if (loc.hash.includes("credits") || q.get("credits")) setTimeout(() => document.getElementById("credits")?.scrollIntoView({ behavior: "smooth" }), 400);
  }, [loc.search]);

  const go = async (route, plan, pack) => {
    setBusy(plan ?? pack ?? route);
    try { const r = await fn(route, { workspace_id: ws.id, plan, yearly, pack }); window.location.href = r.url; }
    catch (e) { toast(e.message, "bad"); setBusy(null); }
  };

  const daysLeft = ws.trial_ends ? Math.ceil((new Date(ws.trial_ends) - new Date()) / 864e5) : null;
  const [label, tone] = ws.plan === "essai" ? [daysLeft > 0 ? `Aperçu : ${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}` : (payments ? "Essai terminé" : "Accès de lancement"), daysLeft > 0 || !payments ? "accent" : "bad"] : STATUS[ws.plan_status] ?? [ws.plan_status, "muted"];

  return (
    <div>
      <SubNav section="reglages" />
      <PageHead title="Abonnement" sub="Sans engagement : tu changes de formule ou tu arrêtes quand tu veux." />
      {!payments && <Card className="p-4 sm:p-5 mb-6 border-accent/30 bg-accent-soft/40"><p className="font-semibold">Les abonnements ouvrent bientôt</p><p className="text-sm text-ink-soft mt-1">Bingoo! est en phase de lancement : ton accès reste gratuit, même après l'essai. Tu seras prévenu avant l'ouverture des abonnements.</p></Card>}
      <Card className="p-5 sm:p-6 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm text-ink-soft">Ta formule</p>
          <p className="font-serif text-3xl">{ws.plan === "fondateur" ? "Fondateur (offerte)" : plans.find((p) => p.key === ws.plan)?.label ?? "Aperçu gratuit"}</p>
          {ws.period_end && ws.plan !== "essai" && <p className="text-sm text-ink-soft mt-1">Prochaine échéance le {new Date(ws.period_end).toLocaleDateString("fr-FR")}</p>}
        </div>
        <Badge tone={tone}>{label}</Badge>
        {ws.stripe_customer && <Button loading={busy === "billing-portal"} onClick={() => go("billing-portal")}>Factures, carte, résiliation</Button>}
      </Card>

      <Quota q={quota} pack={pPack} payments={payments} busy={busy} onBuy={(k) => go("billing-recharge", undefined, k)} />
      <Garantie g={gar} />
      {ai && <AiGauge ai={ai} />}
      <Credits ai={ai} packs={packs} busy={busy} onBuy={(k) => go("billing-recharge", undefined, k)} />

      <div className="mb-4 inline-flex rounded-full border border-line bg-white p-1 text-sm">
        {[[false, "Mensuel"], [true, "Annuel · −20 %"]].map(([v, l]) => <button key={l} onClick={() => setYearly(v)} className={cx("rounded-full px-4 py-1.5 font-medium transition", yearly === v ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}>{l}</button>)}
      </div>
      {fond && (fond.left > 0 || ws.founder_price) && (
        <Card className="p-4 sm:p-5 mb-4 border-accent/40 bg-accent-soft/40">
          <p className="font-semibold">{ws.founder_price ? "Tu as le prix fondateur : Solo à 29 € à vie" : `Prix fondateur : Solo à ${fond.price} € à vie pour les ${fond.places} premiers`}</p>
          {!ws.founder_price && <p className="text-sm text-ink-soft mt-1">Ensuite, Solo passe à 39 €. Ceux qui sont entrés gardent leur prix tant que l'abonnement continue.</p>}
        </Card>
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((p) => {
          const fondateur = p.key === "solo" && fond && (ws.founder_price || fond.left > 0);
          const prix = fondateur ? fond.price : p.price;
          const current = ws.plan === p.key && ["active", "trialing", "past_due"].includes(ws.plan_status);
          const featured = p.key === "pro";
          return (
            <Card key={p.key} className={cx("p-5 sm:p-6 flex flex-col min-w-0", featured && "!border-ink ring-1 ring-ink")}>
              <div className="flex items-center justify-between gap-2"><p className="font-semibold">{p.label}</p>{featured && <Badge tone="accent">Le plus choisi</Badge>}</div>
              <p className="mt-3">{fondateur && <span className="mr-2 text-ink-faint line-through text-2xl tnum">{yearly ? Math.round(p.price * 0.8) : p.price} €</span>}<span className="font-serif text-5xl tnum">{yearly ? Math.round(prix * 0.8) : prix} €</span><span className="text-ink-soft text-sm"> HT / mois</span></p>
              <p className="text-xs text-ink-faint mt-1">{fondateur ? "prix fondateur, à vie" : ""}{fondateur && " · "}{yearly ? `soit ${Math.round(prix * 12 * 0.8)} € HT par an, au lieu de ${prix * 12} €` : "sans engagement"}</p>
              <ul className="mt-4 space-y-2 text-sm flex-1">{(FEATURES[p.key] ?? []).map((f) => <li key={f} className="flex gap-2"><span className="text-good">✓</span><span>{f}</span></li>)}</ul>
              <Button className="mt-6 w-full" variant={featured ? "primary" : "default"} disabled={current || ws.plan === "fondateur"} loading={busy === p.key} onClick={() => go("billing-checkout", p.key)}>
                {current ? "Ta formule actuelle" : ws.stripe_subscription ? "Changer pour celle-ci" : "Choisir"}
              </Button>
            </Card>
          );
        })}
        <Card className="p-5 sm:p-6 flex flex-col min-w-0 bg-paper/50">
          <p className="font-semibold">Entreprise</p>
          <p className="mt-3"><span className="font-serif text-4xl">Sur devis</span></p>
          <p className="text-xs text-ink-faint mt-1">au-delà de 5 commerciaux</p>
          <ul className="mt-4 space-y-2 text-sm flex-1">{["Utilisateurs et volume sur mesure", "Tout ce qu'il y a dans Équipe", "Accompagnement au démarrage", "Facturation annuelle possible"].map((f) => <li key={f} className="flex gap-2"><span className="text-good">✓</span><span>{f}</span></li>)}</ul>
          <a href={`mailto:${CONTACT}?subject=${encodeURIComponent("Bingoo! Entreprise : demande de devis")}`} className="mt-6 inline-flex justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:border-ink-faint">Parler à l'équipe</a>
        </Card>
      </div>
      <p className="text-xs text-ink-soft mt-4">Paiement sécurisé par Stripe. Facture avec TVA envoyée chaque mois. Code promo accepté à l'étape de paiement.</p>
    </div>
  );
}
