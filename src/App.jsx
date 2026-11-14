import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { WsProvider, useWs } from "./lib/ws";
import { ToastProvider } from "./components/ui";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Splash from "./components/Splash";
import Auth, { PasswordRecovery } from "./pages/Auth";
import Parametres from "./pages/Parametres";
import Equipe from "./pages/Equipe";
import Admin from "./pages/Admin";
import Aide from "./pages/Aide";
import Abonnement from "./pages/Abonnement";
import Join, { JOIN_KEY } from "./pages/Join";
import Explorer from "./pages/Explorer";
import PublicRetrait from "./pages/PublicRetrait";
import Landing from "./pages/Landing";
import PublicApp from "./pages/PublicApp";
import OnboardingExplorer from "./pages/OnboardingExplorer";
import { Conditions, Confidentialite, legalReady, MentionsLegales, Opposition } from "./pages/Legal";
import { supabase } from "./lib/supabase";
import { EntreeInvite, EspaceInvite, estInvite } from "./lib/invite";

function Gate() {
  const { session, list, ws } = useWs();
  const loc = useLocation();
  useEffect(() => {
    if (!ws) return;
    const url = (window.location.origin + window.location.pathname).replace(/\/$/, "");
    if (ws.app_url !== url && /^https:/.test(url)) supabase.from("workspaces").update({ app_url: url }).eq("id", ws.id).then(() => {});
  }, [ws?.id, ws?.app_url]);
  if (loc.pathname === "/retrait") return <PublicRetrait />;
  if (loc.pathname === "/accueil") return <Landing />;
  if (loc.pathname.startsWith("/app/")) return <PublicApp slug={loc.pathname.split("/")[2] ?? ""} />;
  if (loc.pathname === "/desabonne") return <div className="min-h-screen grid place-items-center bg-paper p-6 text-center"><div><p className="text-[22px] font-black">{new URLSearchParams(loc.search).get("ok") === "1" ? "C'est noté." : "Lien expiré."}</p><p className="mt-2 text-ink-soft">{new URLSearchParams(loc.search).get("ok") === "1" ? "Tu ne recevras plus les relances ni les annonces de cette application. Les e-mails liés à ton compte et à ton paiement restent envoyés." : "Ce lien de désinscription n'est plus valable."}</p></div></div>;
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
        <Route path="/" element={<Navigate to="/explorer/mon-saas" replace />} />
        <Route path="/reglages" element={<Parametres />} />
        <Route path="/equipe" element={<Equipe />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/explorer/:domaine" element={<Explorer />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/aide" element={<Aide />} />
        <Route path="/abonnement" element={<Abonnement />} />
        {/* Les pages de l'ancien Bingoo (prospection) ont été retirées : tout le reste renvoie vers son SaaS */}
        <Route path="*" element={<Navigate to="/explorer/mon-saas" replace />} />
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
