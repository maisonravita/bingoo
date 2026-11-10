import { useEffect, useMemo } from "react";
import { appHtml } from "../lib/appShell";

// Un SaaS construit par Bingoo!, affiché dans un cadre isolé : sandbox SANS allow-same-origin, donc le code généré
// ne peut lire ni la session Bingoo!, ni le stockage du site. La session de l'application est gardée ici, par application.
const API = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/t/app`;
const cle = (slug) => `bingoo-app:${slug}`;
const lire = (slug) => { try { return localStorage.getItem(cle(slug)); } catch { return null; } };

export default function AppCadre({ slug, spec, version, className, apercu = false }) {
  const doc = useMemo(() => appHtml({ spec, slug, api: API, token: lire(slug), apercu }), [slug, version]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const ecoute = (e) => {
      const d = e.data;
      if (d?.type !== "bingoo-app-token" || d.slug !== slug) return;
      try { if (d.token && /^[a-f0-9]{64}$/.test(d.token)) localStorage.setItem(cle(slug), d.token); else localStorage.removeItem(cle(slug)); } catch { /* stockage indisponible */ }
    };
    window.addEventListener("message", ecoute);
    return () => window.removeEventListener("message", ecoute);
  }, [slug]);
  return <iframe key={`${slug}-${version}`} title={spec?.nom ?? "Application"} srcDoc={doc} sandbox="allow-scripts allow-forms allow-modals allow-popups" className={className} />;
}
