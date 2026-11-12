import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import { enregistrerSW } from "./lib/push";
import { chargerTraducteur } from "./lib/langue";

const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter;
// Anciens liens (e-mails, favoris) en « /#/chemin » : convertis en vrai chemin quand le site n'utilise pas les ancres
if (!import.meta.env.VITE_HASH_ROUTER && window.location.hash.startsWith("#/")) {
  try { window.history.replaceState(null, "", window.location.hash.slice(1)); } catch { /* navigateur ancien */ }
}
// Lien de parrainage (?parrain=code) : gardé jusqu'à la création du compte
try { const c = new URLSearchParams(window.location.search).get("parrain") || new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("parrain"); if (c && /^[a-z0-9]{4,16}$/i.test(c)) localStorage.setItem("bingoo-parrain", c.toLowerCase()); } catch { /* stockage indisponible */ }
// Écran de chargement (index.html, au-dessus de la page) : l'appli se prépare derrière, et la page ne s'ouvre
// après 1,5 s pour un visiteur ou 5 s pour un client connecté, puis l'écran s'efface en fondu
const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
chargerTraducteur();
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><ErrorBoundary><Router><App /></Router></ErrorBoundary></React.StrictMode>,
);
// Écran d'accueil court : 1,5 s pour un visiteur, 1,2 s pour un client connecté à la première ouverture de la session,
// rien ensuite (un client l'ouvre plusieurs fois par jour sur son téléphone : il ne doit jamais attendre)
function splashMs() {
  try { if (sessionStorage.getItem("bingoo-vu")) return 0; sessionStorage.setItem("bingoo-vu", "1"); } catch { /* stockage indisponible */ }
  try { for (let i = 0; i < localStorage.length; i++) if (/^sb-.+-auth-token$/.test(localStorage.key(i) ?? "")) return 1200; } catch { /* stockage indisponible */ }
  return 1500;
}
const splash = document.getElementById("bingoo-splash");
if (splash) {
  setTimeout(() => {
    splash.classList.add("out");
    setTimeout(() => splash.remove(), 600);
  }, reduce ? 0 : Math.max(0, splashMs() - performance.now()));
}

// Notifications sur le téléphone (réponses chaudes) : le service worker ne garde rien en cache
enregistrerSW();
