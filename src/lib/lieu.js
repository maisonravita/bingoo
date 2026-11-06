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
