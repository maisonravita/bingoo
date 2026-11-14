import { useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "./Charts";
import { useWs } from "../lib/ws";

/** Onglets du compte : l'abonnement, et l'équipe pour « Lancer à plusieurs ». */
export function SubNav() {
  const loc = useLocation();
  const nav = useNavigate();
  const { ws } = useWs();
  const tabs = [["/abonnement", "Abonnement"], ...(["business", "fondateur"].includes(ws.plan) ? [["/equipe", "Équipe"]] : [])];
  if (tabs.length < 2) return null;
  return <div className="mb-5"><Tabs tabs={tabs} value={loc.pathname} onChange={(k) => k !== loc.pathname && nav(k)} /></div>;
}
