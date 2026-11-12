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
import Village from "./pages/Village";
// Accueil : la carte-village par défaut, ou la vue liste si la personne l'a choisie
function Accueil() { return accueilVille() ? <Village /> : <Today />; }
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
import Connexions from "./pages/Connexions";
import Equipe from "./pages/Equipe";
import Radar from "./pages/Radar";
import Admin from "./pages/Admin";
import Aide from "./pages/Aide";
import Espion from "./pages/EspionHub";
import Mission from "./pages/Mission";
import Abonnement from "./pages/Abonnement";
import Join, { JOIN_KEY } from "./pages/Join";
import PublicBooking from "./pages/PublicBooking";
import Explorer from "./pages/Explorer";
import PublicRetrait from "./pages/PublicRetrait";
import PublicMarche from "./pages/PublicMarche";
import PublicEstimation from "./pages/PublicEstimation";
import PublicQuote from "./pages/PublicQuote";
import Envoyer from "./pages/Envoyer";
import FreeTools from "./pages/FreeTools";
import Landing from "./pages/Landing";
import PublicApp from "./pages/PublicApp";
import OnboardingExplorer from "./pages/OnboardingExplorer";
import { modeExplorer } from "./lib/mode";
import Metier from "./pages/Metier";
import { Conditions, Confidentialite, legalReady, MentionsLegales, Opposition } from "./pages/Legal";
import { supabase } from "./lib/supabase";
import { EntreeInvite, EspaceInvite, estInvite } from "./lib/invite";
import { accueilVille } from "./lib/lieu";

function Gate() {
  const { session, list, ws } = useWs();
  const loc = useLocation();
  useEffect(() => {
    if (!ws) return;
    const url = (window.location.origin + window.location.pathname).replace(/\/$/, "");
    if (ws.app_url !== url && /^https:/.test(url)) supabase.from("workspaces").update({ app_url: url }).eq("id", ws.id).then(() => {});
  }, [ws?.id, ws?.app_url]);
  if (loc.pathname.startsWith("/rdv/")) return <PublicBooking />;
  if (loc.pathname.startsWith("/estimation/")) return <PublicEstimation />;
  if (loc.pathname === "/marche") return <PublicMarche />;
  if (loc.pathname === "/retrait") return <PublicRetrait />;
  if (loc.pathname.startsWith("/devis/")) return <PublicQuote />;
  // Lien de l'e-mail du matin : la page fonctionne sans être connecté (le lien à usage unique fait office de clé)
  if (loc.pathname === "/envoyer") return <Envoyer />;
  if (loc.pathname === "/outils" || loc.pathname.startsWith("/outils/")) return <FreeTools />;
  if (loc.pathname === "/accueil") return <Landing />;
  if (loc.pathname.startsWith("/app/")) return <PublicApp slug={loc.pathname.split("/")[2] ?? ""} />;
  if (loc.pathname === "/desabonne") return <div className="min-h-screen grid place-items-center bg-paper p-6 text-center"><div><p className="text-[22px] font-black">{new URLSearchParams(loc.search).get("ok") === "1" ? "C'est noté." : "Lien expiré."}</p><p className="mt-2 text-ink-soft">{new URLSearchParams(loc.search).get("ok") === "1" ? "Tu ne recevras plus les relances ni les annonces de cette application. Les e-mails liés à ton compte et à ton paiement restent envoyés." : "Ce lien de désinscription n'est plus valable."}</p></div></div>;
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
  if (!session && !pendingJoin && loc.pathname.startsWith("/explorer")) return <EntreeInvite repli={<Auth />} />;
  if (!session) return <Auth invited={!!pendingJoin} />;
  if (pendingJoin) return <Join token={pendingJoin} />;
  // Nouvelle inscription : le TrendTrack des SaaS (une question, l'adresse du SaaS)
  if (estInvite(session) && (!ws || !ws.onboarded)) return <EspaceInvite />;
  if (!ws || !ws.onboarded) return <OnboardingExplorer />;
  return (
    <Layout>
      <ErrorBoundary resetKey={loc.pathname}>
      <Routes>
        <Route path="/" element={modeExplorer(ws) ? <Navigate to="/explorer" replace /> : <Accueil />} />
        <Route path="/liste" element={<Today />} />
        <Route path="/village" element={<Village />} />
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
        <Route path="/resultats" element={<Results />} />
        <Route path="/connexions" element={<Connexions />} />
        <Route path="/equipe" element={<Equipe />} />
        <Route path="/mission" element={<Mission />} />
        <Route path="/radar" element={<Radar />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/explorer/:domaine" element={<Explorer />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/aide" element={<Aide />} />
        <Route path="/abonnement" element={<Abonnement />} />
        <Route path="/extension" element={<ExtensionLink />} />
        {/* Anciennes pages retirées (pilotage, salariés IA, réseaux, studio, campagnes, trafic, conversion, intelligence) : renvoyées vers l'accueil */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </Layout>
  );
}

// Un nom de domaine qui n'est pas celui de Bingoo! : c'est le domaine d'un SaaS construit par Bingoo!, on n'affiche que lui
const HOTE = window.location.hostname;
const DOMAINE_APP = /(^|\.)maisonravita\.fr$|\.vercel\.app$|^localhost$|^127\.0\.0\.1$/.test(HOTE) ? null : HOTE;

export default function App() {
  if (DOMAINE_APP) return <PublicApp domaine={DOMAINE_APP} />;
  return <AppBingoo />;
}
function AppBingoo() {
  // Lien « mot de passe oublié » : Supabase ouvre une session de récupération, on demande le nouveau mot de passe
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setRecovery(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  return <ToastProvider><WsProvider><Gate />{recovery && <PasswordRecovery onDone={() => setRecovery(false)} />}</WsProvider></ToastProvider>;
}
