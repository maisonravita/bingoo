import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { WsProvider, useWs } from "./lib/ws";
import { ToastProvider, Spinner } from "./components/ui";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Today from "./pages/Today";
import Review from "./pages/Review";
import Prospects from "./pages/Prospects";
import LinkedIn from "./pages/LinkedIn";
import Settings from "./pages/Settings";
import Replies from "./pages/Replies";
import Agenda from "./pages/Agenda";
import Quotes from "./pages/Quotes";
import Calls from "./pages/Calls";
import Results from "./pages/Results";
import Salaries from "./pages/Salaries";
import Socials from "./pages/Socials";
import Connexions from "./pages/Connexions";
import Equipe from "./pages/Equipe";
import Radar from "./pages/Radar";
import Admin from "./pages/Admin";
import Aide from "./pages/Aide";
import Prospection from "./pages/Prospection";
import Distribution from "./pages/Distribution";
import Conversion from "./pages/Conversion";
import Espion from "./pages/Espion";
import Mission from "./pages/Mission";
import Intelligence from "./pages/Intelligence";
import Abonnement from "./pages/Abonnement";
import Join, { JOIN_KEY } from "./pages/Join";
import PublicBooking from "./pages/PublicBooking";
import PublicQuote from "./pages/PublicQuote";
import { Conditions, Confidentialite, legalReady, MentionsLegales, Opposition } from "./pages/Legal";
import { supabase } from "./lib/supabase";

function Gate() {
  const { session, list, ws } = useWs();
  const loc = useLocation();
  useEffect(() => {
    if (!ws) return;
    const url = (window.location.origin + window.location.pathname).replace(/\/$/, "");
    if (ws.app_url !== url && /^https:/.test(url)) supabase.from("workspaces").update({ app_url: url }).eq("id", ws.id).then(() => {});
  }, [ws?.id, ws?.app_url]);
  if (loc.pathname.startsWith("/rdv/")) return <PublicBooking />;
  if (loc.pathname.startsWith("/devis/")) return <PublicQuote />;
  if (loc.pathname === "/opposition") return <Opposition />;
  if (legalReady && loc.pathname === "/mentions-legales") return <MentionsLegales />;
  if (legalReady && loc.pathname === "/confidentialite") return <Confidentialite />;
  if (legalReady && loc.pathname === "/conditions") return <Conditions />;
  const jm = loc.pathname.match(/^\/rejoindre\/([0-9a-f-]{36})/i);
  if (jm) { try { localStorage.setItem(JOIN_KEY, jm[1]); } catch { /* stockage indisponible */ } }
  let pendingJoin = jm?.[1] ?? null;
  if (!pendingJoin) { try { pendingJoin = localStorage.getItem(JOIN_KEY); } catch { /* stockage indisponible */ } }
  if (session === undefined || (session && list === null)) {
    return <div className="h-full grid place-items-center text-ink-soft"><Spinner /></div>;
  }
  if (!session) return <Auth invited={!!pendingJoin} />;
  if (pendingJoin) return <Join token={pendingJoin} />;
  if (!ws || !ws.onboarded) return <Onboarding />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/valider" element={<Review />} />
        <Route path="/prospects" element={<Prospects />} />
        <Route path="/linkedin" element={<LinkedIn />} />
        <Route path="/reglages" element={<Settings />} />
        <Route path="/reponses" element={<Replies />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/devis" element={<Quotes />} />
        <Route path="/appels" element={<Calls />} />
        <Route path="/concurrents" element={<Navigate to="/espion" replace />} />
        <Route path="/espion" element={<Espion />} />
        <Route path="/studio" element={<Navigate to="/distribution" replace />} />
        <Route path="/resultats" element={<Results />} />
        <Route path="/salaries" element={<Salaries />} />
        <Route path="/agents" element={<Navigate to="/salaries" replace />} />
        <Route path="/reseaux" element={<Socials />} />
        <Route path="/campagnes" element={<Navigate to="/prospection" replace />} />
        <Route path="/connexions" element={<Connexions />} />
        <Route path="/equipe" element={<Equipe />} />
        <Route path="/mission" element={<Mission />} />
        <Route path="/radar" element={<Radar />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/aide" element={<Aide />} />
        <Route path="/assistant" element={<Navigate to="/salaries" replace />} />
        <Route path="/prospection" element={<Prospection />} />
        <Route path="/distribution" element={<Distribution />} />
        <Route path="/conversion" element={<Conversion />} />
        <Route path="/intelligence" element={<Intelligence />} />
        <Route path="/abonnement" element={<Abonnement />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return <ToastProvider><WsProvider><Gate /></WsProvider></ToastProvider>;
}
