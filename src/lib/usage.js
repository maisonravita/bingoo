import { supabase } from "./supabase";

/* Mesure de l'usage, pour décider avec des chiffres : quelle vue, quels bâtiments, où l'on hésite, où l'on cherche de l'aide.
   Jamais bloquant, jamais de contenu personnel : seulement le type d'action et un repère court. */
const derniers = new Map();
export function trace(wsId, kind, detail = "") {
  if (!wsId) return;
  const cle = `${kind}:${detail}`, t = Date.now();
  if (t - (derniers.get(cle) ?? 0) < 4000) return; // pas de doublon rapproché (rechargements, double montage)
  derniers.set(cle, t);
  supabase.auth.getUser().then(({ data }) => {
    if (!data?.user) return;
    supabase.from("usage_events").insert({ workspace_id: wsId, kind, detail: String(detail).slice(0, 80), user_id: data.user.id }).then(() => {}, () => {});
  }).catch(() => {});
}
export const estMobile = () => typeof window !== "undefined" && !!window.matchMedia?.("(max-width: 767px)").matches;
