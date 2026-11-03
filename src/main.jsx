import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter;
// Écran de chargement (index.html, au-dessus de la page) : l'appli se prépare derrière, et la page ne s'ouvre
// qu'une fois l'animation terminée (5 s), puis l'écran s'efface en fondu
const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><ErrorBoundary><Router><App /></Router></ErrorBoundary></React.StrictMode>,
);
const splash = document.getElementById("bingoo-splash");
if (splash) {
  setTimeout(() => {
    splash.classList.add("out");
    setTimeout(() => splash.remove(), 600);
  }, reduce ? 0 : Math.max(0, 5000 - performance.now()));
}
