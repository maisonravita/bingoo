import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { demanderCompte, estInvite } from "../lib/invite";
import { useToast } from "./ui";
import { cx } from "../lib/utils";

// Favoris : un cœur sur chaque SaaS et chaque appli. Les favoris de l'espace sont chargés une seule fois,
// puis partagés entre tous les cœurs de la page (un changement se voit partout tout de suite).
let cache = { ws: null, saas: new Map(), appli: new Map(), promesse: null };
const ecouteurs = new Set();
const prevenir = () => ecouteurs.forEach((f) => f());

function charger(ws) {
  if (cache.ws === ws && cache.promesse) return cache.promesse;
  cache = { ws, saas: new Map(), appli: new Map(), promesse: null };
  cache.promesse = supabase.from("saas_favoris").select("id, saas_id, mobile_id").eq("workspace_id", ws).then(({ data }) => {
    for (const f of data ?? []) f.saas_id ? cache.saas.set(String(f.saas_id), f.id) : cache.appli.set(String(f.mobile_id), f.id);
    prevenir();
  });
  return cache.promesse;
}
export const oublierFavoris = () => { cache = { ws: null, saas: new Map(), appli: new Map(), promesse: null }; };

export default function Favori({ type = "saas", id, nom, grand = false, className }) {
  const { ws, session } = useWs();
  const toast = useToast();
  const [, maj] = useState(0);
  useEffect(() => { const f = () => maj((n) => n + 1); ecouteurs.add(f); if (ws?.id) charger(ws.id); return () => ecouteurs.delete(f); }, [ws?.id]);
  if (!id || !ws) return null;
  const table = type === "saas" ? cache.saas : cache.appli;
  const on = table.has(String(id));
  const basculer = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (estInvite(session)) return demanderCompte("Tes favoris sont gardés dans ton compte.");
    if (on) {
      const fid = table.get(String(id)); table.delete(String(id)); prevenir();
      const { error } = await supabase.from("saas_favoris").delete().eq("id", fid);
      if (error) { table.set(String(id), fid); prevenir(); return toast("Impossible pour l'instant, réessaie", "bad"); }
      return toast(`${nom ?? "Retiré"} retiré de tes favoris`);
    }
    table.set(String(id), "…"); prevenir();
    const { data, error } = await supabase.from("saas_favoris").insert({ workspace_id: ws.id, ...(type === "saas" ? { saas_id: id } : { mobile_id: id }) }).select("id").single();
    if (error) { table.delete(String(id)); prevenir(); return toast("Impossible pour l'instant, réessaie", "bad"); }
    table.set(String(id), data.id); prevenir();
    toast(`${nom ?? "Ajouté"} ajouté à tes favoris`, "good");
  };
  const coeur = <svg viewBox="0 0 24 24" className={grand ? "w-5 h-5" : "w-[18px] h-[18px]"} fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" /></svg>;
  if (grand) return (
    <button onClick={basculer} className={cx("rounded-xl border px-4 py-2.5 text-[14px] font-bold inline-flex items-center justify-center gap-2", on ? "border-[#F43F5E] text-[#E11D48] bg-[#FFF1F2]" : "border-line bg-white text-ink hover:border-ink/30", className)}>
      {coeur}{on ? "Dans mes favoris" : "Ajouter aux favoris"}
    </button>
  );
  return (
    <button onClick={basculer} title={on ? "Retirer des favoris" : "Ajouter aux favoris"} aria-label={on ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cx("shrink-0 grid place-items-center w-9 h-9 rounded-full border bg-white hover:scale-105 transition", on ? "text-[#E11D48] border-[#FECDD3]" : "text-ink-faint border-line hover:text-ink", className)}>
      {coeur}
    </button>
  );
}
