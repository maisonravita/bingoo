import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter;
// Écran de chargement (index.html) : joué en entier (5 s) à la première ouverture ; ensuite, dans la même session, la page s'affiche tout de suite
const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
let seen = false;
try { seen = sessionStorage.getItem("bingoo-splash") === "1"; sessionStorage.setItem("bingoo-splash", "1"); } catch { /* stockage indisponible */ }
const wait = reduce || seen ? 0 : Math.max(0, 5000 - performance.now());
setTimeout(() => ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><ErrorBoundary><Router><App /></Router></ErrorBoundary></React.StrictMode>,
), wait);
