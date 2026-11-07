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

/** L'accueil montre-t-il la ville ? Ordinateur : oui sauf choix « liste ». Téléphone : non (liste d'abord), sauf choix « ville ». */
export function accueilVille() {
  let v = "", vm = "";
  try { v = localStorage.getItem("bingoo-vue") ?? ""; vm = localStorage.getItem("bingoo-vue-mobile") ?? ""; } catch { /* rien */ }
  const mobile = typeof window !== "undefined" && !!window.matchMedia?.("(max-width: 767px)").matches;
  return mobile ? vm === "village" : v !== "liste";
}

/** Un seul nom par lieu, partout (ville, menu, titres, barre du téléphone). Dans l'ordre du travail. */
export const LIEUX = [
  { art: "radar", to: "/radar", nom: "Tour Radar", court: "Radar", icon: "radar", avance: false },
  { art: "annuaire", to: "/prospects", nom: "Annuaire", court: "Annuaire", icon: "list" },
  { art: "espion", to: "/espion", nom: "Espion", court: "Espion", icon: "eye", avance: true },
  { art: "atelier", to: "/valider", nom: "Atelier", court: "Atelier", icon: "send" },
  { art: "poste", to: "/reponses", nom: "Poste", court: "Poste", icon: "inbox" },
  { art: "linkedin", to: "/linkedin", nom: "Café LinkedIn", court: "LinkedIn", icon: "li", avance: true },
  { art: "rdv", to: "/agenda", nom: "Rendez-vous", court: "RDV", icon: "cal" },
  { art: "observatoire", to: "/resultats", nom: "Observatoire", court: "Résultats", icon: "chart" },
  { art: "mairie", to: "/reglages", nom: "Mairie", court: "Réglages", icon: "cog" },
];
export const nomDe = (to) => LIEUX.find((l) => l.to === to)?.nom ?? "";
