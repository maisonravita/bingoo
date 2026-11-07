import { createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";

/* Dans le village, l'intérieur d'un bâtiment s'ouvre en panneau. Quand une page veut aller ailleurs
   (« Message prêt : valider » → l'Atelier), on ouvre l'autre bâtiment au lieu de quitter la ville. */
export const LieuContext = createContext(null);

export function useAller() {
  const nav = useNavigate();
  const ouvre = useContext(LieuContext);
  return (to, opts) => { if (typeof to === "string" && ouvre?.(to)) return; nav(to, opts); };
}

/** Vrai quand la page est affichée dans le panneau d'un bâtiment (le titre est déjà dans l'en-tête du panneau). */
export const useDansLieu = () => !!useContext(LieuContext);

/** Mode simple (par défaut) : seuls les outils qui mènent à un rendez-vous sont visibles. Les outils avancés
 *  (trafic du site, réseaux sociaux, studio, salariés IA, intelligence…) restent accessibles en les activant dans Réglages. */
export const estSimple = (ws) => !(ws?.profile && ws.profile.avance === true);
