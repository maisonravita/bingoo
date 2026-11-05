import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import { enregistrerSW } from "./lib/push";

const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter;
// Écran de chargement (index.html, au-dessus de la page) : l'appli se prépare derrière, et la page ne s'ouvre
// après 1,5 s pour un visiteur ou 5 s pour un client connecté, puis l'écran s'efface en fondu
const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><ErrorBoundary><Router><App /></Router></ErrorBoundary></React.StrictMode>,
);
// Visiteur du site : 1,5 s (il vient découvrir, pas attendre). Client connecté : l'animation complète, 5 s.
function splashMs() {
  try { for (let i = 0; i < localStorage.length; i++) if (/^sb-.+-auth-token$/.test(localStorage.key(i) ?? "")) return 5000; } catch { /* stockage indisponible */ }
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
