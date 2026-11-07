// Garantie « premier rendez-vous » et parrainage.
// Garantie : si, pendant le premier mois payant, le client a laissé partir au moins 60 % de son quota de premiers messages
// et n'a obtenu aucun rendez-vous, son deuxième mois est offert. On ne promet pas un résultat sans effort de sa part,
// mais on ne le fait pas payer deux fois pour rien.
// Parrainage : un mois offert au parrain et au filleul, au premier paiement du filleul.
import { admin, log, PLANS, type Workspace } from "./core.ts";

const MOIS = 30 * 864e5;
export type Perk = { type: "mois_offert"; raison: "garantie" | "parrainage"; at: string; detail: string; applique?: boolean };

export async function garantie(ws: Workspace & { paid_since?: string | null; perks?: Perk[] }) {
  const plan = PLANS[ws.plan as keyof typeof PLANS] as { quota?: number } | undefined;
  const quota = Number(plan?.quota ?? 0);
  if (!ws.paid_since || !quota || ["essai", "fondateur"].includes(String(ws.plan))) {
    return { etat: "pas_commence" as const, message: "La garantie démarre avec ton premier mois payant." };
  }
  const debut = new Date(ws.paid_since), fin = new Date(debut.getTime() + MOIS);
  const requis = Math.ceil(quota * 0.6);
  const [{ count: envoyes }, { count: rdv }] = await Promise.all([
    admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "envoye").eq("step", 0).gte("sent_at", debut.toISOString()).lt("sent_at", fin.toISOString()),
    admin.from("meetings").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).neq("status", "annule").gte("created_at", debut.toISOString()).lt("created_at", fin.toISOString()),
  ]);
  const deja = (ws.perks ?? []).some((p) => p.raison === "garantie");
  const base = { debut: debut.toISOString(), fin: fin.toISOString(), envoyes: envoyes ?? 0, requis, rdv: rdv ?? 0 };
  if (deja) return { ...base, etat: "accordee" as const, message: "Garantie appliquée : ton deuxième mois est offert." };
  if ((rdv ?? 0) > 0) return { ...base, etat: "tenue" as const, message: `Garantie tenue : ${rdv} rendez-vous pendant ton premier mois.` };
  if (Date.now() < fin.getTime()) return { ...base, etat: "en_cours" as const, message: `Premier mois en cours. Laisse partir au moins ${requis} premiers messages d'ici le ${fin.toLocaleDateString("fr-FR")} : sans rendez-vous, ton deuxième mois sera offert.` };
  if ((envoyes ?? 0) >= requis) return { ...base, etat: "eligible" as const, message: "Aucun rendez-vous pendant ton premier mois malgré tes envois : ton deuxième mois est offert." };
  return { ...base, etat: "non_eligible" as const, message: `Premier mois terminé avec ${envoyes ?? 0} premiers messages envoyés sur les ${requis} nécessaires pour la garantie.` };
}

async function offrir(wsId: string, perks: Perk[], p: Perk) {
  await admin.from("workspaces").update({ perks: [...perks, p] }).eq("id", wsId);
  await log(wsId, "abonnement", `Mois offert (${p.raison}) : ${p.detail}`).catch(() => {});
}

/** Chaque nuit : garanties à accorder et parrainages à récompenser. Les mois offerts sont notés ; Jean les applique dans Stripe. */
export async function perksCron(dry = false) {
  const { data: wss } = await admin.from("workspaces").select("id, name, plan, plan_status, paid_since, perks, referred_by").not("paid_since", "is", null);
  const out: string[] = [];
  for (const ws of wss ?? []) {
    const perks = (ws.perks ?? []) as Perk[];
    const g = await garantie(ws as never);
    if (g.etat === "eligible") {
      out.push(`${ws.name} : garantie → 2e mois offert`);
      if (!dry) await offrir(ws.id, perks, { type: "mois_offert", raison: "garantie", at: new Date().toISOString(), detail: `aucun rendez-vous pour ${g.envoyes} premiers messages` });
    }
    if (ws.referred_by && !perks.some((p) => p.raison === "parrainage" && p.detail.startsWith("parrainé"))) {
      const { data: parrain } = await admin.from("workspaces").select("id, name, perks").eq("id", ws.referred_by).single();
      out.push(`${ws.name} (filleul de ${parrain?.name ?? "?"}) : 1 mois offert à chacun`);
      if (!dry) {
        const at = new Date().toISOString();
        const fresh = (await admin.from("workspaces").select("perks").eq("id", ws.id).single()).data?.perks as Perk[] ?? perks;
        await offrir(ws.id, fresh, { type: "mois_offert", raison: "parrainage", at, detail: `parrainé par ${parrain?.name ?? "un client"}` });
        if (parrain) await offrir(parrain.id, (parrain.perks ?? []) as Perk[], { type: "mois_offert", raison: "parrainage", at, detail: `${ws.name} s'est abonné grâce à toi` });
      }
    }
  }
  return { faits: out, dry };
}
