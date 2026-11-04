import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { WsProvider, useWs } from "./lib/ws";
import { ToastProvider } from "./components/ui";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Splash from "./components/Splash";
import Auth, { PasswordRecovery } from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Today from "./pages/Today";
import Review from "./pages/Review";
import Prospects from "./pages/Prospects";
import LinkedIn from "./pages/LinkedIn";
import Settings from "./pages/Settings";
import ExtensionLink from "./pages/ExtensionLink";
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
import Espion from "./pages/EspionHub";
import Mission from "./pages/Mission";
import Intelligence from "./pages/Intelligence";
import Abonnement from "./pages/Abonnement";
import Join, { JOIN_KEY } from "./pages/Join";
import PublicBooking from "./pages/PublicBooking";
import PublicQuote from "./pages/PublicQuote";
import FreeTools from "./pages/FreeTools";
import Landing from "./pages/Landing";
import Metier from "./pages/Metier";
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
  if (loc.pathname === "/outils" || loc.pathname.startsWith("/outils/")) return <FreeTools />;
  if (loc.pathname === "/accueil") return <Landing />;
  if (loc.pathname.startsWith("/metier/")) return <Metier slug={loc.pathname.split("/")[2]} />;
  if (loc.pathname === "/opposition") return <Opposition />;
  if (legalReady && loc.pathname === "/mentions-legales") return <MentionsLegales />;
  if (legalReady && loc.pathname === "/confidentialite") return <Confidentialite />;
  if (legalReady && loc.pathname === "/conditions") return <Conditions />;
  const jm = loc.pathname.match(/^\/rejoindre\/([0-9a-f-]{36})/i);
  if (jm) { try { localStorage.setItem(JOIN_KEY, jm[1]); } catch { /* stockage indisponible */ } }
  let pendingJoin = jm?.[1] ?? null;
  if (!pendingJoin) { try { pendingJoin = localStorage.getItem(JOIN_KEY); } catch { /* stockage indisponible */ } }
  if (session === undefined || (session && list === null)) {
    return <Splash />;
  }
  // Visiteur : la page d'accueil ; la connexion et l'inscription sont sur /connexion
  if (!session && loc.pathname === "/" && !pendingJoin) return <Landing />;
  if (!session) return <Auth invited={!!pendingJoin} />;
  if (pendingJoin) return <Join token={pendingJoin} />;
  if (!ws || !ws.onboarded) return <Onboarding />;
  return (
    <Layout>
      <ErrorBoundary resetKey={loc.pathname}>
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
        <Route path="/extension" element={<ExtensionLink />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </Layout>
  );
}

export default function App() {
  // Lien « mot de passe oublié » : Supabase ouvre une session de récupération, on demande le nouveau mot de passe
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setRecovery(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  return <ToastProvider><WsProvider><Gate />{recovery && <PasswordRecovery onDone={() => setRecovery(false)} />}</WsProvider></ToastProvider>;
}
