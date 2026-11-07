import { createClient } from "@supabase/supabase-js";
import { QUOTA_LABEL, QUOTA_OF, quotaMax, refreshQuotas } from "./quota";

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);


/** Nombre d'actions encore possibles aujourd'hui (le compteur serveur repart à minuit UTC). */
export async function quotaLeft(ws, kind) {
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase.from("activity").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("kind", kind).gte("created_at", since.toISOString());
  const max = quotaMax(kind, ws.plan);
  return { left: Math.max(0, max - (count ?? 0)), max };
}

/** Appelle une action serveur ; renvoie les données ou lève une erreur lisible. */
export async function fn(name, body) {
  const { data, error } = await supabase.functions.invoke(name.includes("/") ? name : `k/${name}`, { body });
  if (error) {
    let message = error.message;
    try { const j = await error.context?.json?.(); if (j?.error) message = j.error; } catch { /* corps illisible */ }
    if (/non-2xx|Failed to fetch|FunctionsFetchError/i.test(message)) message = "Le serveur n'a pas pu terminer (délai ou surcharge). Réessaie dans un instant.";
    if (/^Limite du jour atteinte/i.test(message)) {
      const label = QUOTA_LABEL[QUOTA_OF[name.split("/").pop()]];
      message = `Tu as utilisé toutes les ${label ?? "actions de ce type"} prévues par ta formule aujourd'hui. Bingoo! reprendra demain matin ; pour aller plus loin, passe à la formule supérieure (Réglages → Abonnement).`;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  if (QUOTA_OF[name.split("/").pop()]) refreshQuotas();
  return data;
}
