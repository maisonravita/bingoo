import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter;
// L'écran de chargement (dans index.html) a le temps de jouer son animation en entier : 1,5 s au plus après l'ouverture
const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const wait = reduce ? 0 : Math.max(0, 1500 - performance.now());
setTimeout(() => ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><ErrorBoundary><Router><App /></Router></ErrorBoundary></React.StrictMode>,
), wait);
