import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import AppCadre, { API } from "../components/AppCadre";
import Splash from "../components/Splash";

// Page publique d'un SaaS construit par Bingoo! : #/app/<slug>, ou son propre nom de domaine. L'application en plein écran,
// installable sur téléphone et ordinateur (manifeste servi par Bingoo!, service worker minimal).
const param = (k) => new URLSearchParams(window.location.href.split("?").slice(1).join("&").split("#")[0]).get(k);

export default function PublicApp({ slug, domaine }) {
  const [app, setApp] = useState(undefined);
  const [installer, setInstaller] = useState(null);
  // iPhone et iPad : pas d'installation automatique, on explique le geste (une fois, et jamais dans l'app installée)
  const [ios, setIos] = useState(() => { try { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone && !localStorage.getItem("bingoo-ios-vu"); } catch { return false; } });
  // Retour du paiement Stripe (?paiement=ok), invitation d'équipe (?invite=…), démo animée (?tour=1)
  const [ctx] = useState(() => ({ retour: param("paiement") === "ok", invite: param("invite"), tour: param("tour") === "1", ecran: param("ecran"), source: param("src") || (document.referrer && !document.referrer.includes(window.location.host) ? (() => { try { return new URL(document.referrer).hostname.replace(/^www\./, "").split(".")[0]; } catch { return null; } })() : null) }));
  useEffect(() => {
    if (ctx.retour || ctx.invite) window.history.replaceState(null, "", window.location.href.replace(/[?&](paiement=ok|invite=[a-f0-9]+)/g, ""));
    const q = domaine ? supabase.rpc("saas_app_par_domaine", { p_domaine: domaine }) : supabase.rpc("saas_app_public", { p_slug: slug });
    q.then(({ data }) => setApp(data ?? null));
  }, [slug, domaine]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!app?.spec?.nom) return;
    document.title = app.spec.nom;
    const tete = (tag, attrs) => { const el = document.createElement(tag); Object.assign(el, attrs); document.head.appendChild(el); return el; };
    const els = [
      tete("link", { rel: "manifest", href: `${API}/${app.slug}/manifest`, crossOrigin: "anonymous" }),
      tete("link", { rel: "apple-touch-icon", href: app.icone ?? `${API}/${app.slug}/icone.svg` }),
      tete("meta", { name: "apple-mobile-web-app-title", content: String(app.spec.nom ?? "").slice(0, 12) }),
      tete("meta", { name: "theme-color", content: app.spec.couleur ?? "#4F46E5" }),
      tete("meta", { name: "apple-mobile-web-app-capable", content: "yes" }),
    ];
    document.querySelectorAll('link[rel="icon"]').forEach((l) => { l.dataset.avant = l.href; l.href = `${API}/${app.slug}/icone.svg`; });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw-app.js").catch(() => {});
    const ecoute = (e) => { e.preventDefault(); setInstaller(e); };
    window.addEventListener("beforeinstallprompt", ecoute);
    return () => { els.forEach((x) => x.remove()); window.removeEventListener("beforeinstallprompt", ecoute); };
  }, [app?.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  if (app === undefined) return <Splash />;
  if (!app) return <div className="min-h-screen grid place-items-center bg-paper text-ink-soft p-6 text-center"><p>Cette application n'existe pas ou n'est plus en ligne.</p></div>;
  return (
    <>
      <AppCadre slug={app.slug} spec={app.spec} version={app.version} paiement={app.paiement} domaine={app.domaine} ab={app.ab} articles={app.articles} retourPaiement={ctx.retour} invite={ctx.invite} tour={ctx.tour} source={ctx.source} ecran={ctx.ecran} className="fixed inset-0 w-full h-full border-0" />
      {ios && (
        <div className="fixed inset-x-3 bottom-3 z-10 rounded-2xl bg-white/97 shadow-xl ring-1 ring-black/10 p-3.5 text-[13.5px] text-[#0F172A] flex items-start gap-3">
          <span className="text-[22px]">📲</span>
          <p className="flex-1">Installe <b>{app.spec.nom}</b> sur ton écran d'accueil : touche <b>Partager</b> <span aria-hidden>⬆︎</span> puis <b>« Sur l'écran d'accueil »</b>.</p>
          <button onClick={() => { setIos(false); try { localStorage.setItem("bingoo-ios-vu", "1"); } catch { /* stockage indisponible */ } }} className="text-[#64748B] text-[18px] leading-none">×</button>
        </div>
      )}
      {installer && (
        <button onClick={async () => { installer.prompt(); await installer.userChoice.catch(() => null); setInstaller(null); }} className="fixed bottom-4 left-4 z-10 rounded-full bg-white/95 shadow-lg ring-1 ring-black/10 px-4 py-2.5 text-[13.5px] font-semibold text-[#0F172A]">⬇ Installer l'application</button>
      )}
    </>
  );
}
