import { useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "./Charts";
import { useWs } from "../lib/ws";
import { estSimple } from "../lib/lieu";
import { modeExplorer } from "../lib/mode";

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
  // Bingoo! (SaaS) : seulement l'abonnement, et l'équipe pour « Lancer à plusieurs ». Les réglages de prospection ne servent pas ici.
  const tabs = section === "reglages" && modeExplorer(ws) ? [["/abonnement", "Abonnement"], ...(["business", "fondateur"].includes(ws.plan) ? [["/equipe", "Équipe"]] : [])] : estSimple(ws) ? SECTIONS[section].filter(([k]) => !AVANCES.includes(k) || k === loc.pathname) : SECTIONS[section];
  if (tabs.length < 2) return null;
  return <div className="mb-5"><Tabs tabs={tabs} value={loc.pathname} onChange={(k) => k !== loc.pathname && nav(k)} /></div>;
}
