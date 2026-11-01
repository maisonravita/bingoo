import { useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "./Charts";

/** Onglets qui regroupent plusieurs pages sous une seule entrée du menu. */
export const SECTIONS = {
  reglages: [["/reglages", "Mon entreprise"], ["/connexions", "Connexions"], ["/equipe", "Équipe"], ["/abonnement", "Abonnement"]],
  resultats: [["/resultats", "Prospection"], ["/distribution", "Trafic du site"], ["/conversion", "Conversion du site"]],
  prospects: [["/prospects", "Liste"], ["/prospection", "Vue d'ensemble"], ["/linkedin", "LinkedIn"]],
};

export function SubNav({ section }) {
  const loc = useLocation();
  const nav = useNavigate();
  return <div className="mb-5"><Tabs tabs={SECTIONS[section]} value={loc.pathname} onChange={(k) => k !== loc.pathname && nav(k)} /></div>;
}
