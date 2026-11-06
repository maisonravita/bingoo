// Compteur de prospects contactés du mois : quota de la formule + report du mois dernier (plafonné à un mois) + recharges du mois.
// Un « prospect contacté » = un premier e-mail réellement parti. Les relances ne comptent pas.
import { admin, PLANS, type Workspace } from "./core.ts";

const monthStart = (d = new Date(), back = 0) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1));
const firstSends = async (wsId: string, from: Date, to?: Date) => {
  let q = admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).eq("step", 0).eq("status", "envoye").gte("sent_at", from.toISOString());
  if (to) q = q.lt("sent_at", to.toISOString());
  return (await q).count ?? 0;
};

export async function prospectQuota(ws: Workspace & { plan?: string; created_at?: string }) {
  const plan = PLANS[ws.plan ?? "essai"] ?? PLANS.essai;
  const m0 = monthStart(), m1 = monthStart(new Date(), 1);
  const [used, usedPrev, { data: tops }] = await Promise.all([
    firstSends(ws.id, m0), firstSends(ws.id, m1, m0),
    admin.from("prospect_topups").select("prospects").eq("workspace_id", ws.id).gte("created_at", m0.toISOString()),
  ]);
  // Report : seulement pour une formule payante, déjà active le mois dernier
  const paid = !["essai", "fondateur"].includes(ws.plan ?? "essai") && !!ws.created_at && new Date(ws.created_at) < m0;
  const report = paid ? Math.min(plan.quota, Math.max(0, plan.quota - usedPrev)) : 0;
  const recharge = (tops ?? []).reduce((n, t) => n + Number(t.prospects ?? 0), 0);
  const total = plan.quota + report + recharge;
  return { used, base: plan.quota, report, recharge, total, left: Math.max(0, total - used), reset: monthStart(new Date(Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth() + 1, 1))).toISOString().slice(0, 10) };
}
