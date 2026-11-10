import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import AppCadre from "../components/AppCadre";
import Splash from "../components/Splash";

// Page publique d'un SaaS construit par Bingoo! : #/app/<slug>, ou son propre nom de domaine. L'application en plein écran.
export default function PublicApp({ slug, domaine }) {
  const [app, setApp] = useState(undefined);
  // Retour du paiement Stripe (?paiement=ok) : on le signale à l'app puis on nettoie l'adresse
  const [retour] = useState(() => /paiement=ok/.test(window.location.href));
  useEffect(() => {
    if (retour) window.history.replaceState(null, "", window.location.href.replace(/[?&]paiement=ok/, ""));
    const q = domaine ? supabase.rpc("saas_app_par_domaine", { p_domaine: domaine }) : supabase.rpc("saas_app_public", { p_slug: slug });
    q.then(({ data }) => setApp(data ?? null));
  }, [slug, domaine]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (app?.spec?.nom) document.title = app.spec.nom; }, [app]);
  if (app === undefined) return <Splash />;
  if (!app) return <div className="min-h-screen grid place-items-center bg-paper text-ink-soft p-6 text-center"><p>Cette application n'existe pas ou n'est plus en ligne.</p></div>;
  return <AppCadre slug={app.slug} spec={app.spec} version={app.version} paiement={app.paiement} domaine={app.domaine} retourPaiement={retour} className="fixed inset-0 w-full h-full border-0" />;
}
