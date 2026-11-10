import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import AppCadre from "../components/AppCadre";
import Splash from "../components/Splash";

// Page publique d'un SaaS construit par Bingoo! : #/app/<slug>, l'application en plein écran
export default function PublicApp({ slug }) {
  const [app, setApp] = useState(undefined);
  useEffect(() => { supabase.rpc("saas_app_public", { p_slug: slug }).then(({ data }) => setApp(data ?? null)); }, [slug]);
  useEffect(() => { if (app?.spec?.nom) document.title = app.spec.nom; }, [app]);
  if (app === undefined) return <Splash />;
  if (!app) return <div className="min-h-screen grid place-items-center bg-paper text-ink-soft p-6 text-center"><p>Cette application n'existe pas ou n'est plus en ligne.</p></div>;
  return <AppCadre slug={app.slug} spec={app.spec} version={app.version} className="fixed inset-0 w-full h-full border-0" />;
}
