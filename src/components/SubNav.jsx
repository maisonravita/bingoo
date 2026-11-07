import { useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "./Charts";
import { useWs } from "../lib/ws";
import { estSimple } from "../lib/lieu";

/** Onglets qui regroupent plusieurs pages sous une seule entrée du menu. */
export const SECTIONS = {
  reglages: [["/reglages", "Mon entreprise"], ["/connexions", "Connexions"], ["/equipe", "Équipe"], ["/abonnement", "Abonnement"]],
  resultats: [["/resultats", "Prospection"]],
  prospects: [["/prospects", "Liste"]],
};

const AVANCES = [];

export function SubNav({ section }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { ws } = useWs();
  const tabs = estSimple(ws) ? SECTIONS[section].filter(([k]) => !AVANCES.includes(k) || k === loc.pathname) : SECTIONS[section];
  if (tabs.length < 2) return null;
  return <div className="mb-5"><Tabs tabs={tabs} value={loc.pathname} onChange={(k) => k !== loc.pathname && nav(k)} /></div>;
}
