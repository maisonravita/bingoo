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

/** L'accueil est toujours « Aujourd'hui » : la ville est une vue en option (menu « Plus » → « Ma ville »). */
export function accueilVille() { return false; }

/** Un seul nom par lieu, partout (ville, menu, titres, barre du téléphone). Dans l'ordre du travail. */
export const LIEUX = [
  { art: "radar", to: "/radar", nom: "Opportunités", court: "Opportunités", icon: "radar", avance: false },
  { art: "annuaire", to: "/prospects", nom: "Entreprises", court: "Entreprises", icon: "list" },
  { art: "espion", to: "/espion", nom: "Concurrents", court: "Concurrents", icon: "eye", avance: true },
  { art: "atelier", to: "/valider", nom: "Messages à envoyer", court: "Messages", icon: "send" },
  { art: "poste", to: "/reponses", nom: "Réponses", court: "Réponses", icon: "inbox" },
  { art: "linkedin", to: "/linkedin", nom: "LinkedIn", court: "LinkedIn", icon: "li", avance: true },
  { art: "rdv", to: "/agenda", nom: "Rendez-vous", court: "RDV", icon: "cal" },
  { art: "observatoire", to: "/resultats", nom: "Résultats", court: "Résultats", icon: "chart" },
  { art: "mairie", to: "/reglages", nom: "Réglages", court: "Réglages", icon: "cog" },
];
export const nomDe = (to) => LIEUX.find((l) => l.to === to)?.nom ?? "";
