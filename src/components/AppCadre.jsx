import { useEffect, useMemo } from "react";
import { appHtml } from "../lib/appShell";

// Un SaaS construit par Bingoo!, affiché dans un cadre isolé : sandbox SANS allow-same-origin, donc le code généré
// ne peut lire ni la session Bingoo!, ni le stockage du site. La session de l'application est gardée ici, par application.
// allow-top-navigation-by-user-activation : seulement pour partir vers le paiement Stripe après un clic.
export const API = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/t/app`;
const cle = (slug) => `bingoo-app:${slug}`;
const lire = (slug) => { try { return localStorage.getItem(cle(slug)); } catch { return null; } };

/** Adresse publique de l'application : son nom de domaine s'il est actif, sinon le lien Bingoo!. */
export const lienApp = (slug, domaine) => domaine ? `https://${domaine}/` : import.meta.env.VITE_HASH_ROUTER ? `${window.location.origin}${window.location.pathname}#/app/${slug}` : `${window.location.origin}/app/${slug}`;

/** Adresse des articles de l'app (pages indexables rendues par le serveur). */
export const blogApp = (slug, domaine) => domaine ? `https://${domaine}/blog/` : `${window.location.origin}/a/${slug}/`;

// Test de prix : chaque visiteur reçoit une variante, gardée dans son navigateur
function variante(slug, ab) {
  if (!ab?.actif) return "A";
  try { let v = localStorage.getItem(`bingoo-ab:${slug}`); if (!v) { v = Math.random() < 0.5 ? "A" : "B"; localStorage.setItem(`bingoo-ab:${slug}`, v); } return v; } catch { return "A"; }
}

export default function AppCadre({ slug, spec, version, paiement, domaine, ab, articles, className, apercu = false, retourPaiement = false, invite = null, tour = false, source = null, ecran = null, validation = null, precommande = null, verif = false, page = null }) {
  const doc = useMemo(() => appHtml({ spec, slug, api: API, token: tour ? null : lire(slug), apercu, paiement, retour: lienApp(slug, domaine), retourPaiement, ab, variante: variante(slug, ab), invite, tour, articles: articles ?? [], blog: blogApp(slug, domaine), source, ecran, validation, precommande, verif, page }), [slug, version, validation?.inscrits, paiement?.actif, paiement?.essai_jours, paiement?.modele, ab?.actif, ab?.ecart, tour]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const ecoute = (e) => {
      const d = e.data;
      if (d?.type !== "bingoo-app-token" || d.slug !== slug) return;
      try { if (d.token && /^[a-f0-9]{64}$/.test(d.token)) localStorage.setItem(cle(slug), d.token); else localStorage.removeItem(cle(slug)); } catch { /* stockage indisponible */ }
    };
    window.addEventListener("message", ecoute);
    return () => window.removeEventListener("message", ecoute);
  }, [slug]);
  return <iframe key={`${slug}-${version}-${tour ? 1 : 0}`} title={spec?.nom ?? "Application"} srcDoc={doc} sandbox={verif ? "allow-scripts" : "allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"} className={className} />;
}
