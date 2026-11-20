// Gabarit des SaaS construits par Bingoo! : une page complète (site public, connexion, application) assemblée
// à partir de la spec générée. Elle tourne dans un cadre isolé (sandbox sans same-origin) : le code généré
// n'a accès ni à la session Bingoo!, ni au stockage du site. Les écrans sont écrits par l'IA avec Preact + htm ;
// le gabarit fournit le reste (navigation, comptes, composants, accès aux données).
// Versions figées : un gabarit qui change d'un jour à l'autre casserait les applications déjà générées.
const PREACT = "https://esm.sh/preact@10.24.3";
const HOOKS = "https://esm.sh/preact@10.24.3/hooks";
const HTM = "https://esm.sh/htm@3.1.1";

import { CODE_DEMANDER } from "./demander";
import { CODE_KIT_FAMILLES } from "./kitFamilles";
import { CODE_VERIF_GESTES } from "./verifGestes";

const safe = (o) => JSON.stringify(o).replace(/</g, "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");

// Styles des SaaS construits : chaque SaaS a sa propre allure (police, menu, page d'accueil), choisie par le créateur
// ou, à défaut, déduite de son nom (deux SaaS côte à côte ne se ressemblent pas).
export const STYLES = {
  moderne: { label: "Moderne", police: "Inter", titres: "Inter", menu: "clair", hero: "cote" },
  doux: { label: "Doux", police: "Plus Jakarta Sans", titres: "Plus Jakarta Sans", menu: "teinte", hero: "centre" },
  sombre: { label: "Sombre", police: "Manrope", titres: "Manrope", menu: "sombre", hero: "sombre" },
  editorial: { label: "Éditorial", police: "Inter", titres: "Fraunces", menu: "clair", hero: "cote" },
  vif: { label: "Vif", police: "DM Sans", titres: "DM Sans", menu: "couleur", hero: "degrade" },
  rond: { label: "Rond", police: "Nunito", titres: "Nunito", menu: "teinte", hero: "centre" },
  tech: { label: "Tech", police: "Inter", titres: "Space Grotesk", menu: "sombre", hero: "sombre" },
  elegant: { label: "Élégant", police: "Inter", titres: "Playfair Display", menu: "clair", hero: "centre" },
  sport: { label: "Sport", police: "Barlow", titres: "Barlow Condensed", menu: "couleur", hero: "degrade" },
  geometrique: { label: "Géométrique", police: "Outfit", titres: "Outfit", menu: "clair", hero: "cote" },
  nature: { label: "Nature", police: "Inter", titres: "Inter", menu: "couleur", hero: "centre", fond: "creme" },
};
// Les SaaS sans style choisi gardent celui qu'ils avaient (calculé sur les 5 styles d'origine)
const STYLES_ORIGINE = ["moderne", "doux", "sombre", "editorial", "vif"];
export function styleDe(spec) {
  if (spec?.style && STYLES[spec.style]) return spec.style;
  const k = STYLES_ORIGINE; let h = 0;
  for (const c of String(spec?.nom ?? "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return k[h % k.length];
}
/** Polices proposées à l'atelier (« change la police ») : remplacent celles de l'allure, texte et/ou titres */
export const POLICES = ["Inter", "Plus Jakarta Sans", "Manrope", "DM Sans", "Nunito", "Space Grotesk", "Outfit", "Poppins", "Montserrat", "Raleway", "Lato", "Open Sans", "Roboto", "Work Sans", "Sora", "Lexend", "Barlow", "Barlow Condensed", "Rubik", "Quicksand", "Fraunces", "Playfair Display", "Lora", "Merriweather", "DM Serif Display", "Cormorant Garamond", "Bebas Neue", "Oswald", "Archivo", "Urbanist"];
export function policesDe(spec) {
  const st = STYLES[styleDe(spec)];
  return { ...st, police: POLICES.includes(spec?.police) ? spec.police : st.police, titres: POLICES.includes(spec?.police_titres) ? spec.police_titres : POLICES.includes(spec?.police) ? spec.police : st.titres };
}
const policeUrl = (st) => "https://fonts.googleapis.com/css2?" + [...new Set([st.police, st.titres])].map((p) => "family=" + p.replace(/ /g, "+") + (p === "Fraunces" ? ":opsz,wght@9..144,500;9..144,700" : p === "Playfair Display" || p === "Bebas Neue" || p === "DM Serif Display" ? (p === "Playfair Display" ? ":wght@500;700;800" : "") : ":wght@400;500;600;700;800")).join("&") + "&display=swap";

export function appHtml({ spec, slug, api, token = null, apercu = false, paiement = null, retour = null, retourPaiement = false, ab = null, variante = "A", invite = null, tour = false, articles = [], blog = null, source = null, ecran = null, validation = null, precommande = null, verif = false, page = null, capture = null, essai = false }) {
  // Capture (vidéo pub) : mêmes données d'exemple que la vérification, aucune requête au serveur
  if (capture) verif = true;
  const boot = { style: styleDe(spec), spec, slug, api, token, apercu, paiement: paiement ?? { actif: false, essai_jours: 14 }, retour, retourPaiement, ab: ab ?? { actif: false }, variante, invite, tour, articles, blog, source, ecran, validation, precommande, verif, page, capture, essai };
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${String(spec.nom ?? "Mon SaaS").replace(/[<&]/g, "")}</title>
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.13/dist/index.global.js"></script>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${policeUrl(policesDe(spec))}">
<style>:root{--c:${/^#[0-9a-f]{6}$/i.test(spec.couleur ?? "") ? spec.couleur : "#4F46E5"};--fh:"${policesDe(spec).titres}",ui-sans-serif,system-ui,sans-serif}body{font-family:"${policesDe(spec).police}",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#F8FAFC;color:#0F172A}h1,h2,h3,.fh{font-family:var(--fh)}.menu-fonce [class~="text-slate-600"],.menu-fonce [class~="text-slate-500"]{color:rgba(255,255,255,.72)}.menu-fonce [class~="text-slate-400"]{color:rgba(255,255,255,.55)}.menu-fonce [class~="bg-slate-50"]{background:rgba(255,255,255,.08)}.menu-fonce [class~="border-slate-100"]{border-color:rgba(255,255,255,.12)}.menu-fonce [class~="hover:bg-slate-50"]:hover,.menu-fonce [class~="hover:bg-slate-100"]:hover{background:rgba(255,255,255,.1)}.menu-fonce a{color:inherit}
.forme-carre .rounded-2xl,.forme-carre .rounded-xl,.forme-carre .rounded-3xl{border-radius:.375rem}.forme-carre .rounded-lg{border-radius:.25rem}
.forme-pilule .rounded-2xl{border-radius:1.5rem}.forme-pilule .rounded-xl{border-radius:1.1rem}.forme-pilule button.rounded-xl,.forme-pilule button.rounded-lg,.forme-pilule a.rounded-xl{border-radius:999px}
.fond-creme{background:#FAF7F2}.fond-creme main [class~="bg-slate-50"]{background:#F3EEE6}
.fond-gris{background:#EEF1F5}
.fond-sombre{background:#0E1116;color:#E5E7EB}.fond-sombre [class~="bg-white"]{background:#161A22}.fond-sombre [class~="bg-slate-50"],.fond-sombre [class~="bg-slate-100"]{background:#1C212B}.fond-sombre [class*="border-slate-"]{border-color:#262C38}
.fond-sombre [class~="text-slate-900"],.fond-sombre [class~="text-slate-800"]{color:#F1F5F9}.fond-sombre [class~="text-slate-700"],.fond-sombre [class~="text-slate-600"]{color:#CBD5E1}.fond-sombre [class~="text-slate-500"],.fond-sombre [class~="text-slate-400"]{color:#94A3B8}
.fond-sombre [class*="bg-white/"]{background:rgba(22,26,34,.92)}.fond-sombre [class*="hover:bg-slate-100"]:hover{background:#222836}
.fond-sombre input,.fond-sombre select,.fond-sombre textarea{background:#0E1116;color:#F1F5F9;border-color:#2B3240}.fond-sombre [class~="hover:bg-slate-50"]:hover,.fond-sombre [class~="hover:bg-slate-100"]:hover{background:#222836}
main section{max-width:100%;overflow-x:auto}
@media (max-width:640px){main table,main thead,main tbody,main tr,main td{display:block;width:100%}main thead{display:none}main tr{border:1px solid rgba(100,116,139,.22)!important;border-radius:14px;margin:0 0 10px;padding:4px 14px}main td{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:7px 0!important;border:0!important;text-align:right;min-height:0}main td:empty{display:none}main table{min-width:0!important;width:100%!important;table-layout:auto!important}main td,main td *{white-space:normal!important}main td>*{min-width:0;max-width:62%;margin-left:auto;text-align:right}main td:first-child>*{max-width:100%;margin-left:0;text-align:left}main td>div,main td>span{display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:6px}main td:first-child>div,main td:first-child>span{justify-content:flex-start}main td[data-label]::before{content:attr(data-label);font-size:12px;font-weight:600;color:#64748B;text-align:left;flex-shrink:0;max-width:45%}main td:first-child{font-weight:600;text-align:left}main td:first-child::before{display:none}main .overflow-x-auto{margin-left:0!important;margin-right:0!important;overflow:visible}main section{overflow-x:visible}}.anim{animation:a .18s ease-out}@keyframes barre{from{width:0}to{width:100%}}@keyframes a{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}</style>
</head><body><div id="root"><div style="min-height:100vh;display:grid;place-items:center;color:#94A3B8;font-size:14px">Chargement…</div></div>
<script>window.__BOOT=${safe(boot)};</script>
<script type="module">
import { h, render, Fragment, Component } from "${PREACT}";
import { useState, useEffect, useMemo, useRef, useCallback } from "${HOOKS}";
import htm from "${HTM}";
const html = htm.bind(h);
${CODE_DEMANDER}
window.demander = demander; window.avertir = avertir;
const B = window.__BOOT, S = B.spec;
// Atouts de la page de présentation : ceux fournis, sinon les écrans du SaaS (titre et rôle), pour ne jamais laisser la section vide
const ATOUTS = (Array.isArray(S.atouts) && S.atouts.length ? S.atouts : (S.ecrans ?? []).filter((e) => !e.public && e.but).slice(0, 6).map((e) => ({ titre: e.titre, texte: e.but, icone: e.icone })));
// Session : gardée par la page Bingoo! qui encadre l'app (cadre isolé), ou dans le navigateur quand l'app tourne seule (code téléchargé)
const SEULE = window.parent === window;
let token = B.token;
if (!token && SEULE) { try { token = localStorage.getItem("app-token:" + B.slug); } catch (e) {} }
const persist = (t) => { token = t; if (SEULE) { try { t ? localStorage.setItem("app-token:" + B.slug, t) : localStorage.removeItem("app-token:" + B.slug); } catch (e) {} } else { try { parent.postMessage({ type: "bingoo-app-token", slug: B.slug, token: t }, "*"); } catch (e) {} } };
const PAY = B.paiement ?? {};
const UNIQUE = PAY.modele === "unique"; // appli web : paiement unique, accès à vie
// Test de prix : la variante B affiche les prix augmentés (ou baissés) de l'écart choisi par le créateur
let VARIANTE = B.ab?.actif && B.variante === "B" ? "B" : "A";
// Test sur la durée d'essai : la variante B affiche sa propre durée
const ESSAI = VARIANTE === "B" && B.ab?.type === "essai" && B.ab?.essai_b != null ? Number(B.ab.essai_b) : Number(PAY.essai_jours ?? 14);
const prixDe = (p) => VARIANTE === "B" && B.ab?.actif && B.ab?.type !== "essai" ? Math.round(Number(p) * (1 + Number(B.ab.ecart ?? 20) / 100)) : Number(p);
const RETOUR = () => B.retour || location.href.split("?")[0];
// Vers Stripe : la page entière quitte l'app (le cadre isolé ne peut que demander la navigation), sinon un nouvel onglet
const allerVers = (url) => { try { window.top.location.href = url; } catch (e) { window.open(url, "_blank"); } };

// ---------------------------------------------------------------- Accès aux données (chaque compte ne voit que les siennes)
async function call(action, body = {}) {
  // Vérification et essai local (robot mobile) : données d'exemple en mémoire, aucune requête au serveur
  if (B.verif || B.essai) return verifCall(action, body);
  const r = await fetch(B.api + "/" + B.slug + "/" + action, { method: "POST", headers: { "content-type": "application/json", ...(token ? { "x-app-token": token } : {}) }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && action !== "login") { persist(null); bus.emit("auth"); }
  if (r.status === 402) bus.emit("acces");
  if (!r.ok) throw new Error(d.error || "Erreur " + r.status);
  return d;
}
// Vérification avant livraison : données d'exemple en mémoire, aucune requête au serveur
const VSTORE = {}; let VSEQ = 0;
// Mêmes dates que dans le vrai SaaS : les exemples sont recentrés sur aujourd'hui (comme recalerDemo côté serveur)
function recaler(demo, ancre) {
  const RJ = /^(\\d{4}-\\d{2}-\\d{2})(T[\\d:.]+(?:Z|[+-]\\d{2}:?\\d{2})?)?$/, jours = [];
  const a = ancre ? Date.parse(String(ancre).slice(0, 10) + "T12:00:00Z") : NaN;
  if (!isNaN(a)) jours.push(a);
  for (const xs of Object.values(demo)) for (const x of Array.isArray(xs) ? xs : []) if (x && typeof x === "object") for (const v of Object.values(x)) { const m = typeof v === "string" && RJ.exec(v); if (m) { const t = Date.parse(m[1] + "T12:00:00Z"); if (!isNaN(t)) jours.push(t); } }
  if (!jours.length) return demo;
  jours.sort((a, b) => a - b);
  const dec = Math.round((Date.parse(new Date().toISOString().slice(0, 10) + "T12:00:00Z") - (isNaN(a) ? jours[Math.floor(jours.length / 2)] : a)) / 864e5) * 864e5;
  if (!dec) return demo;
  const dv = (v) => { const m = typeof v === "string" && RJ.exec(v); if (!m) return v; const t = Date.parse(m[1] + "T12:00:00Z"); return isNaN(t) ? v : new Date(t + dec).toISOString().slice(0, 10) + (m[2] ?? ""); };
  const profond = (v, n = 0) => n > 6 ? v : Array.isArray(v) ? v.map((y) => profond(y, n + 1)) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([c, y]) => [c, profond(y, n + 1)])) : dv(v);
  return Object.fromEntries(Object.entries(demo).map(([k, xs]) => [k, Array.isArray(xs) ? xs.map((x) => x && typeof x === "object" && !Array.isArray(x) ? profond(x) : x) : xs]));
}
if (B.verif || B.essai) {
  const refs = new Map(), items = [];
  for (const [col, xs] of Object.entries(recaler(S.demo ?? {}, S.demo_ancre))) for (const x of (Array.isArray(xs) ? xs : []).slice(0, 60)) { const id = "v" + (++VSEQ); if (x && x.ref != null) refs.set(String(x.ref), id); items.push({ id, col, x: x ?? {} }); }
  items.forEach(({ id, col, x }, i) => { const d = {}; for (const [k, v] of Object.entries(x)) if (k !== "ref" && k !== "id" && k !== "cree_le") d[k] = typeof v === "string" && refs.has(v) && /_id$/.test(k) ? refs.get(v) : v; const c = typeof x.cree_le === "string" && !isNaN(Date.parse(x.cree_le)) ? new Date(Date.parse(x.cree_le.length === 10 ? x.cree_le + "T10:00:00Z" : x.cree_le)).toISOString() : new Date(Date.now() - i * 25e6).toISOString(); (VSTORE[col] ??= []).push({ ...d, id, created_at: c, updated_at: null }); });
}
async function verifCall(action, b) {
  if (VAPPELS[action] != null) VAPPELS[action]++; else if (!/^(list|get|public-info)$/.test(action)) VAPPELS.autre++;
  if (action === "public-list") action = "list"; else if (action === "public-add") action = "add"; else if (action === "public-ia") action = "ia"; else if (action === "public-info") return { nom: "Atelier Exemple" };
  const L = VSTORE[b.col] ??= [];
  if (action === "list") return L.filter((x) => Object.entries(b.where ?? {}).every(([k, v]) => String(x[k]) === String(v))).slice().reverse();
  if (action === "get") { const r = L.find((x) => x.id === b.id); if (!r) throw new Error("Élément introuvable"); return r; }
  if (action === "add") { const r = { ...b.data, id: "v" + (++VSEQ), created_at: new Date().toISOString(), updated_at: null }; L.push(r); return r; }
  if (action === "update") { const r = L.find((x) => x.id === b.id); if (r) Object.assign(r, b.data, { updated_at: new Date().toISOString() }); return r ?? {}; }
  if (action === "remove") { VSTORE[b.col] = L.filter((x) => x.id !== b.id); return { ok: true }; }
  if (action === "ia") return { resultat: b.json ? {} : "Texte d'essai rédigé par l'IA." };
  if (action === "mail") return { id: "m" + (++VSEQ), quand: b.quand ?? new Date().toISOString() };
  if (action === "mails") return [];
  if (action === "upload") return { id: "f" + (++VSEQ), nom: b.nom, type: b.type, taille: 1, url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" };
  if (action === "agenda") return { url: "https://exemple.fr/agenda.ics" };
  return {};
}
const VERRS = [];
${CODE_VERIF_GESTES}
// Image introuvable (lien mort, exemple inventé) : remplacée par un fond doux plutôt qu'une icône cassée
const IMG_VIDE = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef2f7"/><stop offset="1" stop-color="#dfe6ef"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="200" cy="138" r="34" fill="none" stroke="#b6c2d2" stroke-width="8"/><path d="M150 214h100" stroke="#b6c2d2" stroke-width="8" stroke-linecap="round"/></svg>');
addEventListener("error", (e) => { const t = e.target; if (t && t.tagName === "IMG" && !t.dataset.vide) { t.dataset.vide = "1"; t.src = IMG_VIDE; } }, true);
if (B.verif) {
  addEventListener("error", (e) => VERRS.push(String(e.message ?? e)));
  addEventListener("unhandledrejection", (e) => VERRS.push(String(e.reason?.message ?? e.reason)));
  const ce = console.error.bind(console); console.error = (...a) => { VERRS.push(a.map((x) => x?.message ?? String(x)).join(" ").slice(0, 300)); ce(...a); };
}
const bus = { l: {}, on(e, f) { (this.l[e] ??= new Set()).add(f); return () => this.l[e].delete(f); }, emit(e, x) { (this.l[e] ?? []).forEach((f) => f(x)); } };
const db = {
  list: (col, where) => call("list", { col, where }),
  get: (col, id) => call("get", { col, id }),
  add: async (col, data) => { const r = await call("add", { col, data }); bus.emit("col:" + col); return r; },
  update: async (col, id, data) => { const r = await call("update", { col, id, data }); bus.emit("col:" + col); return r; },
  remove: async (col, id) => { const r = await call("remove", { col, id }); bus.emit("col:" + col); return r; },
};
const mkUseCollection = (dbx) => function useCollection(col, where) {
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(null);
  const key = JSON.stringify(where ?? {});
  const reload = useCallback(() => dbx.list(col, where).then((r) => { setRows(r); setError(null); }, (e) => setError(e.message)).finally(() => setLoading(false)), [col, key]);
  useEffect(() => { reload(); return bus.on("col:" + col, reload); }, [reload]);
  return { rows, loading, error, reload, add: (d) => dbx.add(col, d), update: (id, d) => dbx.update(col, id, d), remove: (id) => dbx.remove(col, id) };
};
const useCollection = mkUseCollection(db);
// Pages publiques : lecture et envoi limités à ce que la page déclare, pour l'espace de l'utilisateur qui la partage
const PAGE = B.page && /^[a-z0-9_]{1,60}$/.test(B.page.id ?? "") ? B.page : null;
const refuse = () => Promise.reject(new Error("Action impossible sur une page publique"));
const dbPublic = {
  list: (col) => call("public-list", { page: PAGE?.id, espace: PAGE?.espace, col }),
  get: (col, id) => call("public-list", { page: PAGE?.id, espace: PAGE?.espace, col }).then((r) => r.find((x) => x.id === id) ?? null),
  add: async (col, data, o = {}) => { const r = await call("public-add", { page: PAGE?.id, espace: PAGE?.espace, col, data, mails: [o.confirmation, ...(o.rappels ?? (o.rappel ? [o.rappel] : []))].filter(Boolean) }); bus.emit("col:" + col); return r; },
  update: refuse, remove: refuse,
};
const toast = (msg, type = "ok") => bus.emit("toast", { msg, type, id: Math.random() });

// ---------------------------------------------------------------- Mise en forme
const fmt = {
  eur: (n) => n == null || n === "" || isNaN(Number(n)) ? "—" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: Number(n) % 1 ? 2 : 0 }).format(Number(n)),
  num: (n) => n == null || isNaN(Number(n)) ? "—" : new Intl.NumberFormat("fr-FR").format(Number(n)),
  date: (s) => { if (!s) return "—"; const d = new Date(s); return isNaN(d) ? String(s) : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); },
  dateHeure: (s) => { if (!s) return "—"; const d = new Date(s); return isNaN(d) ? String(s) : d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); },
  pct: (n) => n == null || isNaN(Number(n)) ? "—" : Math.round(Number(n)) + " %",
};

// ---------------------------------------------------------------- Icônes
const P = { accueil: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z", liste: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", contacts: "M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 10a4 4 0 100-8 4 4 0 000 8zM21 20v-2a4 4 0 00-3-3.9M16 2.1a4 4 0 010 7.8", agenda: "M3 5h18v16H3zM16 3v4M8 3v4M3 10h18", graphique: "M4 20V10M10 20V4M16 20v-7M22 20H2", reglages: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z", fichier: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5", boite: "M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8", mail: "M4 4h16v16H4zM22 6l-10 7L2 6", carte: "M2 5h20v14H2zM2 10h20", tag: "M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8zM7 7h.01", etoile: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z", horloge: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2", panier: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0", message: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", plus: "M12 5v14M5 12h14", recherche: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3", sortie: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9", croix: "M18 6L6 18M6 6l12 12", menu: "M3 6h18M3 12h18M3 18h18", check: "M20 6L9 17l-5-5", poubelle: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6", crayon: "M17 3a2.8 2.8 0 114 4L7.5 20.5 2 22l1.5-5.5z" };
const Icone = ({ nom, class: c = "w-5 h-5" }) => html\`<svg class=\${c} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d=\${P[nom] ?? P.liste}/></svg>\`;

// ---------------------------------------------------------------- Composants
const cls = (...a) => a.filter(Boolean).join(" ");
const ui = {};
ui.Icone = Icone;
ui.Page = ({ titre, sous, actions, children }) => html\`<div class="anim"><div class="flex flex-wrap items-end justify-between gap-3 mb-6"><div><h1 class="text-2xl font-bold tracking-tight">\${titre}</h1>\${sous && html\`<p class="text-slate-500 mt-0.5">\${sous}</p>\`}</div><div class="flex gap-2">\${actions}</div></div>\${children}</div>\`;
ui.Card = ({ titre, actions, children, class: c }) => html\`<section class=\${cls("bg-white rounded-2xl border border-slate-200/70 p-5 shadow-[0_1px_2px_rgba(15,23,42,.04)]", c)}>\${(titre || actions) && html\`<div class="flex items-center justify-between mb-3"><h2 class="font-semibold">\${titre}</h2>\${actions}</div>\`}\${children}</section>\`;
ui.Button = ({ variant = "primary", onClick, type = "button", disabled, children, class: c, icone }) => html\`<button type=\${type} disabled=\${disabled} onClick=\${onClick} class=\${cls("inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50", variant === "primary" && "bg-[var(--c)] text-white hover:brightness-110", variant === "secondary" && "bg-white border border-slate-200 hover:border-slate-300", variant === "danger" && "bg-red-600 text-white hover:bg-red-700", variant === "ghost" && "hover:bg-slate-100 text-slate-600", c)}>\${icone && html\`<\${Icone} nom=\${icone} class="w-4 h-4"/>\`}\${children}</button>\`;
const champ = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--c)] focus:ring-2 focus:ring-[var(--c)]/15";
const Lab = ({ label, children }) => html\`<label class="block">\${label && html\`<span class="block text-xs font-medium text-slate-500 mb-1">\${label}</span>\`}\${children}</label>\`;
ui.Input = ({ label, value, onInput, type = "text", placeholder, required, min, step }) => html\`<\${Lab} label=\${label}><input class=\${champ} type=\${type} value=\${value ?? ""} placeholder=\${placeholder} required=\${required} min=\${min} step=\${step} onInput=\${(e) => onInput?.(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}/></\${Lab}>\`;
ui.Textarea = ({ label, value, onInput, rows = 3, placeholder }) => html\`<\${Lab} label=\${label}><textarea class=\${champ} rows=\${rows} placeholder=\${placeholder} value=\${value ?? ""} onInput=\${(e) => onInput?.(e.target.value)}/></\${Lab}>\`;
ui.Select = ({ label, value, onChange, options = [] }) => html\`<\${Lab} label=\${label}><select class=\${champ} value=\${value ?? ""} onChange=\${(e) => onChange?.(e.target.value)}>\${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return html\`<option value=\${v}>\${l}</option>\`; })}</select></\${Lab}>\`;
ui.Modal = ({ open, onClose, titre, children, actions }) => !open ? null : html\`<div class="fixed inset-0 z-50 bg-slate-900/40 grid place-items-center p-4" onClick=\${(e) => e.target === e.currentTarget && onClose?.()}><div class="anim w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-auto"><div class="flex items-center justify-between px-5 pt-4"><h3 class="font-semibold text-lg">\${titre}</h3><button onClick=\${onClose} class="text-slate-400 hover:text-slate-700"><\${Icone} nom="croix"/></button></div><div class="p-5 space-y-3">\${children}</div>\${actions && html\`<div class="px-5 pb-5 flex justify-end gap-2">\${actions}</div>\`}</div></div>\`;
ui.Table = ({ colonnes = [], lignes = [], onClick, vide = "Rien pour l'instant." }) => !lignes.length ? html\`<\${ui.Empty} texte=\${vide}/>\` : html\`<div class="overflow-x-auto -mx-5"><table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-500 border-b border-slate-100">\${colonnes.map((c) => html\`<th class="px-5 py-2 font-medium">\${c.label}</th>\`)}</tr></thead><tbody>\${lignes.map((l) => html\`<tr class=\${cls("border-b border-slate-50 last:border-0", onClick && "cursor-pointer hover:bg-slate-50")} onClick=\${() => onClick?.(l)}>\${colonnes.map((c) => html\`<td class="px-5 py-2.5">\${c.rendu ? c.rendu(l) : l[c.cle] ?? "—"}</td>\`)}</tr>\`)}</tbody></table></div>\`;
// tendance : évolution en % (nombre) affichée ↑ / ↓ ; inverse : une baisse est une bonne nouvelle (annulations, retards)
ui.Stat = ({ label, valeur, sous, icone, tendance, inverse }) => { const t = typeof tendance === "number" && isFinite(tendance) ? tendance : null, bon = t != null && (inverse ? t <= 0 : t >= 0); return html\`<div class="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] flex items-start gap-3">\${icone && html\`<span class="grid w-10 h-10 shrink-0 place-items-center rounded-xl bg-[var(--c)]/10 text-[var(--c)]"><\${Icone} nom=\${icone} class="w-5 h-5"/></span>\`}<div class="min-w-0"><p data-kpi=\${label} class="text-2xl font-bold leading-tight tabular-nums truncate">\${valeur}</p><p class="text-xs text-slate-500 truncate">\${label}</p>\${(t != null || sous) && html\`<div class="mt-1 flex flex-wrap items-center gap-x-2">\${t != null && html\`<span class=\${cls("text-xs font-semibold", bon ? "text-emerald-600" : "text-rose-600")}>\${t >= 0 ? "↑ +" : "↓ "}\${Math.round(t)} %</span>\`}\${sous && html\`<span class="text-xs text-slate-400">\${sous}</span>\`}</div>\`}</div></div>\`; };
const TEINTE = { vert: "bg-emerald-50 text-emerald-700", rouge: "bg-red-50 text-red-700", orange: "bg-amber-50 text-amber-700", bleu: "bg-sky-50 text-sky-700", violet: "bg-violet-50 text-violet-700", gris: "bg-slate-100 text-slate-600" };
ui.Badge = ({ couleur = "gris", children }) => html\`<span class=\${cls("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TEINTE[couleur] ?? TEINTE.gris)}>\${children}</span>\`;
ui.Empty = ({ texte = "Rien pour l'instant.", action }) => html\`<div data-vide="1" class="text-center py-10 text-slate-500"><p>\${texte}</p>\${action && html\`<div class="mt-3">\${action}</div>\`}</div>\`;
ui.Loading = () => html\`<div class="py-10 grid place-items-center"><div class="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[var(--c)] animate-spin"/></div>\`;
ui.Tabs = ({ valeur, onChange, onglets = [] }) => html\`<div role="tablist" class="inline-flex flex-wrap rounded-full bg-slate-100 p-1 text-sm">\${onglets.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return html\`<button role="tab" aria-selected=\${valeur === v ? "true" : "false"} onClick=\${() => onChange?.(v)} class=\${cls("px-3.5 py-1.5 rounded-full font-medium transition", valeur === v ? "bg-[var(--c)] text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}>\${l}</button>\`; })}</div>\`;
ui.Bar = ({ donnees = [] }) => { const m = Math.max(1, ...donnees.map((d) => Number(d.valeur) || 0)); const vide = !donnees.some((d) => Number(d.valeur) > 0); return html\`<div data-vide=\${vide ? "1" : null} class="flex gap-2 h-44">\${donnees.map((d) => html\`<div class="flex-1 min-w-0 flex flex-col items-center gap-1"><div class="w-full flex-1 flex items-end"><div class=\${"w-full rounded-t-lg " + ((Number(d.valeur) || 0) === m && !vide ? "bg-[var(--c)]" : "bg-[var(--c)]/35")} style=\${"height:" + Math.max(2, (Number(d.valeur) || 0) / m * 100) + "%"} title=\${d.valeur}/></div><span class="text-[11px] text-slate-500 truncate max-w-full">\${d.label}</span></div>\`)}</div>\`; };
ui.Fichier = ({ label, value, onChange, accept = "image/*,application/pdf" }) => {
  const [busy, setBusy] = useState(false);
  const choisir = async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (f.size > 4.5e6) { toast("Fichier trop lourd (4,5 Mo au plus)", "bad"); return; }
    setBusy(true);
    try { const data = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(f); }); onChange?.(await call("upload", { nom: f.name, type: f.type, data })); }
    catch (x) { toast(x.message, "bad"); } finally { setBusy(false); e.target.value = ""; }
  };
  const image = value?.url && String(value.type ?? "").startsWith("image/");
  return html\`<\${Lab} label=\${label}><div class="flex flex-wrap items-center gap-3">\${image ? html\`<img src=\${value.url} alt="" class="h-20 w-20 rounded-xl object-cover border border-slate-200"/>\` : value?.url ? html\`<a href=\${value.url} target="_blank" rel="noopener" class="text-sm font-medium text-[var(--c)] underline">\${value.nom ?? "Fichier"}</a>\` : null}<label class=\${cls("inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium cursor-pointer hover:bg-slate-50", busy && "opacity-60 pointer-events-none")}><input type="file" accept=\${accept} class="hidden" onChange=\${choisir}/>\${busy ? "Envoi…" : value?.url ? "Remplacer" : "Choisir un fichier"}</label>\${value?.url && html\`<button type="button" class="text-sm text-slate-500 hover:text-red-600" onClick=\${() => onChange?.(null)}>Retirer</button>\`}</div></\${Lab}>\`;
};

// Fichier téléchargé depuis l'app (CSV…)
const telecharger = (nom, texte, type = "text/csv;charset=utf-8") => { const u = URL.createObjectURL(new Blob(["﻿" + texte], { type })); const a = document.createElement("a"); a.href = u; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); };
const celluleCsv = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
ui.Empty = ({ texte = "Rien pour l'instant.", action }) => html\`<div data-vide="1" class="text-center py-12"><span class="mx-auto mb-3 grid w-12 h-12 place-items-center rounded-2xl bg-[var(--c)]/10 text-[var(--c)]"><\${Icone} nom="boite"/></span><p class="text-slate-500">\${texte}</p>\${action && html\`<div class="mt-4">\${action}</div>\`}</div>\`;
// Valeur affichée proprement : nombres à la française, dates lisibles, « en_cours » → « En cours », oui/non
const joli = (v) => {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (typeof v === "number") return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  if (typeof v !== "string") return "—";
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(v)) return new Date(v + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  if (/^\\d{4}-\\d{2}-\\d{2}T/.test(v)) return new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  if (/^[a-z]+(_[a-z]+)+$|^[a-z]+$/.test(v) && v.length < 30) { const t = v.replace(/_/g, " ").replace(/ee\\b/g, "ée"); return t.charAt(0).toUpperCase() + t.slice(1); }
  return v;
};
// Tableau : recherche, tri par colonne, export Excel (CSV) et pagination, pour tous les écrans
// Cellules soignées : un avatar devant le nom (1re colonne), une pastille de couleur pour les statuts
const TEINTES_AV = ["#F43F5E", "#8B5CF6", "#0EA5E9", "#10B981", "#F59E0B", "#6366F1", "#EC4899", "#14B8A6"];
const teinteAv = (n) => { let h = 0; for (const c of String(n || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TEINTES_AV[h % TEINTES_AV.length]; };
const initiales = (n) => String(n || "?").trim().split(" ").filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
const tonStatut = (v) => { const t = String(v).toLowerCase(); return /gagn|pay|actif|active|confirm|termin|livr|valid|resolu|résolu|client|publi|accept|fait/.test(t) ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : /attente|relanc|demande|prospect|brouillon|envoy|nouveau|ouvert|à venir|a venir|en cours/.test(t) ? "bg-amber-50 text-amber-700 ring-amber-200" : /perdu|annul|retard|refus|impay|inactif|ferm|bloqu/.test(t) ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-100 text-slate-600 ring-slate-200"; };
const celluleJolie = (c, v, i) => {
  if (i === 0 && typeof v === "string" && v && /^(nom|name|client_nom|contact_nom|nom_complet|client|contact|patient|eleve|membre)$/.test(c.cle ?? "")) return html\`<span class="flex items-center gap-2.5"><span class="grid w-8 h-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white" style=\${"background:" + teinteAv(v)}>\${initiales(v)}</span><span class="font-medium whitespace-nowrap">\${v}</span></span>\`;
  if (typeof v === "string" && v && /^(statut|etat|état|etape|étape|status)$/.test(c.cle ?? "")) return html\`<span class=\${"inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 " + tonStatut(v)}>\${v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ")}</span>\`;
  return joli(v);
};
ui.Table = function Table({ colonnes = [], lignes = [], onClick, vide = "Rien pour l'instant.", parPage = 25 }) {
  const [q, setQ] = useState(""), [tri, setTri] = useState(null), [p, setP] = useState(0);
  if (!lignes.length) return html\`<\${ui.Empty} texte=\${vide}/>\`;
  const brut = (l, c) => { const v = c.cle ? l[c.cle] : null; return v == null || typeof v === "object" ? "" : v; };
  const ql = q.trim().toLowerCase();
  let L = ql ? lignes.filter((l) => Object.values(l).some((v) => (typeof v === "string" || typeof v === "number") && String(v).toLowerCase().includes(ql))) : lignes;
  if (tri) { const c = colonnes[tri.i]; L = [...L].sort((a, b) => { const x = brut(a, c), y = brut(b, c); return tri.sens * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr", { numeric: true })); }); }
  const pages = Math.max(1, Math.ceil(L.length / parPage)), P = Math.min(p, pages - 1), V = L.slice(P * parPage, P * parPage + parPage);
  const exporter = () => telecharger((S.nom ?? "export") + ".csv", [colonnes.map((c) => celluleCsv(c.label)).join(";"), ...L.map((l) => colonnes.map((c) => celluleCsv(brut(l, c))).join(";"))].join("\\n"));
  return html\`<div>
    <div class="flex flex-wrap items-center gap-2 mb-3">\${lignes.length > 5 && html\`<input value=\${q} onInput=\${(e) => { setQ(e.target.value); setP(0); }} placeholder="Rechercher…" class="flex-1 min-w-[160px] rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[var(--c)]"/>\`}<span class="ml-auto text-xs text-slate-400">\${L.length} ligne\${L.length > 1 ? "s" : ""}</span><button onClick=\${exporter} class="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">Exporter</button></div>
    <div class="overflow-x-auto -mx-5"><table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-500 border-b border-slate-100">\${colonnes.map((c, i) => html\`<th class="px-5 py-2 font-medium whitespace-nowrap \${c.cle ? "cursor-pointer select-none hover:text-slate-800" : ""}" onClick=\${() => c.cle && setTri(tri?.i === i ? { i, sens: -tri.sens } : { i, sens: 1 })}>\${c.label}\${tri?.i === i ? (tri.sens > 0 ? " ↑" : " ↓") : ""}</th>\`)}</tr></thead>
    <tbody>\${V.map((l) => html\`<tr class=\${cls("border-b border-slate-50 last:border-0", onClick && "cursor-pointer hover:bg-slate-50/80")} onClick=\${() => onClick?.(l)}>\${colonnes.map((c, i) => html\`<td class="px-5 py-2.5">\${c.rendu ? c.rendu(l) : celluleJolie(c, l[c.cle], i)}</td>\`)}</tr>\`)}</tbody></table></div>
    \${!V.length && html\`<p class="py-6 text-center text-sm text-slate-400">Aucun résultat pour « \${q} ».</p>\`}
    \${pages > 1 && html\`<div class="mt-3 flex items-center justify-end gap-2 text-sm"><button disabled=\${P === 0} onClick=\${() => setP(P - 1)} class="rounded-lg px-2 py-1 hover:bg-slate-100 disabled:opacity-40">‹</button><span class="text-slate-500">\${P + 1} / \${pages}</span><button disabled=\${P >= pages - 1} onClick=\${() => setP(P + 1)} class="rounded-lg px-2 py-1 hover:bg-slate-100 disabled:opacity-40">›</button></div>\`}
  </div>\`;
};
// Colonnes à glisser (suivi par étape : prospects, commandes, tâches…)
ui.Kanban = ({ colonnes = [], lignes = [], champ = "statut", onDeplacer, rendu, onClick, somme }) => html\`<div class="flex gap-3 overflow-x-auto pb-2">\${colonnes.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; const L = lignes.filter((x) => x[champ] === v); return html\`<div class="w-72 shrink-0 rounded-2xl bg-slate-100/70 p-2" onDragOver=\${(e) => e.preventDefault()} onDrop=\${(e) => { const id = e.dataTransfer.getData("text"); if (id) onDeplacer?.(id, v); }}><div class="px-2 py-1.5"><p class="text-sm font-semibold flex items-center justify-between">\${l}<span class="grid min-w-[22px] h-[22px] place-items-center rounded-full bg-white px-1.5 text-xs font-semibold text-slate-500">\${L.length}</span></p>\${somme && html\`<p class="text-base font-bold tabular-nums">\${fmt.eur(L.reduce((a, x) => a + (Number(x[somme]) || 0), 0))}</p>\`}</div><div class="space-y-2 min-h-[40px]">\${L.map((x) => html\`<div draggable="true" onDragStart=\${(e) => e.dataTransfer.setData("text", x.id)} onClick=\${() => onClick?.(x)} class="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200/70 cursor-grab transition hover:shadow-md active:cursor-grabbing">\${rendu ? rendu(x) : x.nom ?? x.titre ?? ""}</div>\`)}</div></div>\`; })}</div>\`;
// Calendrier du mois (rendez-vous, interventions, échéances)
ui.Calendrier = function Calendrier({ lignes = [], champ = "date", rendu, onClick, onJour }) {
  const [m, setM] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const debut = new Date(m); debut.setDate(1 - ((m.getDay() + 6) % 7));
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const jours = Array.from({ length: 42 }, (_, i) => { const d = new Date(debut); d.setDate(debut.getDate() + i); return d; });
  const par = {}; for (const x of lignes) { const k = String(x[champ] ?? "").slice(0, 10); (par[k] ??= []).push(x); }
  const auj = iso(new Date());
  return html\`<div class="rounded-2xl bg-white border border-slate-200 overflow-hidden"><div class="flex items-center justify-between px-4 py-3 border-b border-slate-100"><p class="font-semibold capitalize">\${m.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p><div class="flex gap-1 text-sm"><button class="rounded-lg px-2 py-1 hover:bg-slate-100" onClick=\${() => setM(new Date(m.getFullYear(), m.getMonth() - 1, 1))}>‹</button><button class="rounded-lg px-2 py-1 hover:bg-slate-100" onClick=\${() => { const d = new Date(); setM(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Aujourd'hui</button><button class="rounded-lg px-2 py-1 hover:bg-slate-100" onClick=\${() => setM(new Date(m.getFullYear(), m.getMonth() + 1, 1))}>›</button></div></div>
    <div class="grid grid-cols-7 text-xs text-slate-500 border-b border-slate-100">\${["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((j) => html\`<p class="px-2 py-1.5">\${j}</p>\`)}</div>
    <div class="grid grid-cols-7">\${jours.map((d) => { const k = iso(d), L = par[k] ?? []; return html\`<div class=\${cls("min-h-[88px] border-b border-r border-slate-100 p-1.5", d.getMonth() !== m.getMonth() && "bg-slate-50/60 text-slate-400", onJour && "cursor-pointer hover:bg-slate-50")} onClick=\${() => onJour?.(k)}><p class=\${cls("text-xs font-medium w-6 h-6 grid place-items-center rounded-full", k === auj && "bg-[var(--c)] text-white")}>\${d.getDate()}</p>\${L.slice(0, 3).map((x) => html\`<button onClick=\${(e) => { e.stopPropagation(); onClick?.(x); }} class="mt-0.5 block w-full truncate rounded-md bg-[var(--c)]/10 px-1.5 py-0.5 text-left text-[11px] font-medium text-[var(--c)]">\${rendu ? rendu(x) : x.nom ?? x.titre ?? ""}</button>\`)}\${L.length > 3 && html\`<p class="px-1 text-[11px] text-slate-400">+\${L.length - 3}</p>\`}</div>\`; })}</div></div>\`;
};
${CODE_KIT_FAMILLES}
// Courbe (évolution dans le temps) et anneau (répartition)
ui.Ligne = ({ donnees = [], hauteur = 180 }) => { const n = donnees.length; if (!n) return html\`<\${ui.Empty}/>\`; const m = Math.max(1, ...donnees.map((d) => Number(d.valeur) || 0)); const W = 600, H = hauteur; const pt = (d, i) => [n === 1 ? W / 2 : (i / (n - 1)) * W, H - 8 - ((Number(d.valeur) || 0) / m) * (H - 24)]; const pts = donnees.map(pt); const ligne = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" "); return html\`<div data-vide=\${donnees.some((d) => Number(d.valeur) > 0) ? null : "1"}><svg viewBox=\${"0 0 " + W + " " + H} class="w-full" preserveAspectRatio="none" style=\${"height:" + H + "px"}><path d=\${ligne + " L" + W + " " + H + " L0 " + H + " Z"} fill="var(--c)" fill-opacity=".12" style="fill:color-mix(in srgb,var(--c) 12%,transparent)"/><path d=\${ligne} fill="none" stroke="var(--c)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg><div class="mt-1 flex justify-between text-[11px] text-slate-400">\${donnees.filter((_, i) => n <= 7 || i % Math.ceil(n / 6) === 0 || i === n - 1).map((d) => html\`<span>\${d.label}</span>\`)}</div></div>\`; };
ui.Donut = ({ donnees = [] }) => { const t = donnees.reduce((a, d) => a + (Number(d.valeur) || 0), 0) || 1; let a0 = 0; const op = [1, .7, .48, .3, .18, .1]; return html\`<div data-vide=\${donnees.some((d) => Number(d.valeur) > 0) ? null : "1"} class="flex items-center gap-5"><svg viewBox="0 0 42 42" class="w-32 h-32 -rotate-90">\${donnees.map((d, i) => { const v = (Number(d.valeur) || 0) / t * 100; const el = html\`<circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--c)" stroke-opacity=\${op[i % op.length]} stroke-width="6" stroke-dasharray=\${v + " " + (100 - v)} stroke-dashoffset=\${-a0}/>\`; a0 += v; return el; })}</svg><ul class="space-y-1 text-sm">\${donnees.map((d, i) => html\`<li class="flex items-center gap-2"><span class="w-2.5 h-2.5 shrink-0 rounded-full bg-[var(--c)]" style=\${"opacity:" + op[i % op.length]}/><span class="min-w-0">\${d.label}</span><span class="shrink-0 whitespace-nowrap text-slate-400">\${Math.round((Number(d.valeur) || 0) / t * 100)} %</span></li>\`)}</ul></div>\`; };
// Composants « appli » (pas de tableau) : liste aérée, galerie de cartes, fil de publications, anneau de progression
const vide = (lignes, t) => !lignes?.length ? h(ui.Empty, { texte: t || "Rien pour l'instant." }) : null;
ui.Liste = ({ lignes = [], rendu, onClick, vide: tv }) => vide(lignes, tv) || h("div", { class: "divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white" },
  lignes.map((l, i) => { const r = (rendu ? rendu(l) : { titre: l.titre ?? l.nom ?? "" }) || {};
    return h(onClick ? "button" : "div", { key: l.id ?? i, type: onClick ? "button" : undefined, onClick: onClick ? () => onClick(l) : undefined, class: "flex w-full items-center gap-3 px-4 py-3.5 text-left" + (onClick ? " hover:bg-slate-50" : "") },
      r.emoji ? h("span", { class: "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl", style: "background:color-mix(in srgb,var(--c) 12%,transparent)" }, r.emoji) : null,
      h("span", { class: "min-w-0 flex-1" }, h("span", { class: "block truncate font-semibold" }, r.titre), r.sous ? h("span", { class: "block truncate text-sm text-slate-500" }, r.sous) : null),
      r.droite != null ? h("span", { class: "shrink-0 text-right font-semibold tabular-nums", style: r.couleur ? "color:" + r.couleur : "" }, r.droite) : null); }));
ui.Galerie = ({ lignes = [], rendu, onClick, colonnes = 3, vide: tv }) => vide(lignes, tv) || h("div", { class: "grid gap-4 grid-cols-2 " + ({ 2: "", 3: "md:grid-cols-3", 4: "md:grid-cols-3 lg:grid-cols-4" }[colonnes] ?? "md:grid-cols-3") },
  lignes.map((l, i) => { const r = (rendu ? rendu(l) : { titre: l.titre ?? l.nom ?? "" }) || {};
    return h(onClick ? "button" : "div", { key: l.id ?? i, type: onClick ? "button" : undefined, onClick: onClick ? () => onClick(l) : undefined, class: "group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg" },
      r.image ? h("img", { src: r.image, alt: "", class: "aspect-[4/3] w-full object-cover", loading: "lazy" }) : h("div", { class: "grid aspect-[4/3] place-items-center text-5xl", style: "background:linear-gradient(135deg,color-mix(in srgb,var(--c) 18%,#fff),color-mix(in srgb,var(--c) 6%,#fff))" }, r.emoji || "✨"),
      h("div", { class: "p-3.5" }, r.etiquette ? h("span", { class: "mb-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-[var(--c)]", style: "background:color-mix(in srgb,var(--c) 12%,transparent)" }, r.etiquette) : null,
        h("p", { class: "font-semibold leading-snug" }, r.titre), r.sous ? h("p", { class: "mt-0.5 text-sm text-slate-500 line-clamp-2" }, r.sous) : null)); }));
ui.Fil = ({ lignes = [], rendu, actions, vide: tv }) => vide(lignes, tv) || h("div", { class: "space-y-3" },
  lignes.map((l, i) => { const r = (rendu ? rendu(l) : { auteur: l._auteur ?? "", texte: l.texte ?? "" }) || {};
    return h("article", { key: l.id ?? i, class: "rounded-2xl border border-slate-200 bg-white p-4" },
      h("div", { class: "flex items-center gap-3" }, h("span", { class: "grid h-10 w-10 place-items-center rounded-full bg-[var(--c)] font-bold text-white" }, r.emoji || String(r.auteur || "?").slice(0, 1).toUpperCase()),
        h("div", { class: "min-w-0" }, h("p", { class: "font-semibold" }, r.auteur || "Membre"), r.date ? h("p", { class: "text-xs text-slate-500" }, r.date) : null)),
      r.texte ? h("p", { class: "mt-3 whitespace-pre-line leading-relaxed" }, r.texte) : null,
      r.image ? h("img", { src: r.image, alt: "", class: "mt-3 w-full rounded-xl", loading: "lazy" }) : null,
      actions ? h("div", { class: "mt-3 flex gap-2 border-t border-slate-100 pt-3" }, actions(l)) : null); }));
ui.Anneau = ({ valeur = 0, max = 100, label, sous, taille = "grand" }) => { const g = taille !== "petit", R = g ? 54 : 30, W = g ? 12 : 7, T = (R + W) * 2, C = 2 * Math.PI * R, p = Math.max(0, Math.min(1, Number(valeur) / (Number(max) || 1)));
  return h("div", { class: "flex flex-col items-center text-center" }, h("div", { class: "relative", style: "width:" + T + "px;height:" + T + "px" },
    h("svg", { width: T, height: T, class: "-rotate-90" }, h("circle", { cx: T / 2, cy: T / 2, r: R, fill: "none", stroke: "color-mix(in srgb,var(--c) 14%,transparent)", "stroke-width": W }),
      h("circle", { cx: T / 2, cy: T / 2, r: R, fill: "none", stroke: "var(--c)", "stroke-width": W, "stroke-linecap": "round", "stroke-dasharray": C, "stroke-dashoffset": C * (1 - p), style: "transition:stroke-dashoffset .6s" })),
    h("div", { class: "absolute inset-0 grid place-items-center" }, h("span", { class: g ? "text-3xl font-bold" : "text-base font-bold" }, Math.round(p * 100) + "%"))),
    label ? h("p", { class: "mt-2 font-semibold" }, label) : null, sous ? h("p", { class: "text-sm text-slate-500" }, sous) : null); };
// Créneaux libres (prise de rendez-vous) : jours à venir, heures d'ouverture, sans les créneaux déjà pris ni passés
// horaires : { 1: [["09:00","12:00"],["14:00","18:00"]], … } (1 = lundi … 7 = dimanche) ; pris : réservations existantes
const HORAIRES_DEFAUT = { 1: [["09:00", "12:00"], ["14:00", "18:00"]], 2: [["09:00", "12:00"], ["14:00", "18:00"]], 3: [["09:00", "12:00"], ["14:00", "18:00"]], 4: [["09:00", "12:00"], ["14:00", "18:00"]], 5: [["09:00", "12:00"], ["14:00", "18:00"]] };
const debutDe = (x, champ) => { const v = x?.[champ] ?? x?.debut ?? x?.date_heure ?? (x?.date && x?.heure ? x.date + "T" + x.heure : x?.date); const t = v ? Date.parse(String(v).length <= 10 ? v + "T00:00" : v) : NaN; return isNaN(t) ? null : t; };
ui.Creneaux = function Creneaux({ duree = 60, pas, pris = [], champ = "debut", horaires, jours = 21, delaiMin = 60, valeur, onChange }) {
  const H = horaires && Object.keys(horaires).length ? horaires : HORAIRES_DEFAUT;
  const d = Math.max(5, Number(duree) || 60), P = Math.max(5, Number(pas) || Math.min(d, 30)) * 60e3;
  const occupes = pris.map((x) => { const t = debutDe(x, champ); if (t == null) return null; const dd = Number(x.duree ?? x.duree_min ?? d) || d; return [t, t + dd * 60e3]; }).filter(Boolean);
  const min = Date.now() + delaiMin * 60e3;
  const liste = [];
  for (let i = 0; i < jours; i++) {
    const j = new Date(); j.setHours(0, 0, 0, 0); j.setDate(j.getDate() + i);
    const plages = H[((j.getDay() + 6) % 7) + 1] ?? [];
    const cr = [];
    for (const [a, b] of plages) {
      const [ha, ma] = String(a).split(":").map(Number), [hb, mb] = String(b).split(":").map(Number);
      const s0 = new Date(j); s0.setHours(ha, ma || 0); const fin = new Date(j); fin.setHours(hb, mb || 0);
      for (let t = s0.getTime(); t + d * 60e3 <= fin.getTime(); t += P) if (t >= min && !occupes.some(([o0, o1]) => t < o1 && t + d * 60e3 > o0)) cr.push(t);
    }
    if (cr.length) liste.push({ jour: j, cr });
  }
  const [k, setK] = useState(0);
  if (!liste.length) return h(ui.Empty, { texte: "Aucun créneau libre pour l'instant." });
  const J = liste[Math.min(k, liste.length - 1)];
  const loc = (t) => { const x = new Date(t); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0") + "T" + String(x.getHours()).padStart(2, "0") + ":" + String(x.getMinutes()).padStart(2, "0"); };
  return h("div", { class: "space-y-3" },
    h("div", { class: "flex gap-2 overflow-x-auto pb-1" }, liste.slice(0, 14).map((x, i) => h("button", { type: "button", key: i, onClick: () => setK(i), class: cls("shrink-0 rounded-xl border px-3 py-2 text-center text-sm", i === Math.min(k, liste.length - 1) ? "border-[var(--c)] bg-[var(--c)] text-white" : "border-slate-200 bg-white hover:border-slate-300") },
      h("span", { class: "block text-[11px] uppercase opacity-80" }, x.jour.toLocaleDateString("fr-FR", { weekday: "short" })), h("span", { class: "block font-semibold" }, x.jour.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }))))),
    h("div", { class: "grid grid-cols-3 sm:grid-cols-4 gap-2" }, J.cr.map((t) => { const v = loc(t); return h("button", { type: "button", key: t, onClick: () => onChange?.(v), class: cls("rounded-xl border px-2 py-2 text-sm font-semibold tabular-nums", valeur === v ? "border-[var(--c)] bg-[var(--c)] text-white" : "border-slate-200 bg-white hover:border-[var(--c)]") }, new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })); })));
};
// Chrono et minuteur (séances de sport, révisions, recettes, travail) : bip et vibration à la fin du minuteur
ui.Chrono =({ mode = "chrono", duree = 60, titre, onFin, onStop }) => {
  const [t, setT] = useState(mode === "minuteur" ? Number(duree) || 60 : 0), [on, setOn] = useState(false), ref = useRef(null);
  useEffect(() => { if (!on) return; const id = setInterval(() => setT((x) => mode === "minuteur" ? Math.max(0, x - 1) : x + 1), 1000); return () => clearInterval(id); }, [on]);
  useEffect(() => { if (mode === "minuteur" && on && t === 0) { setOn(false); try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 880; o.start(); o.stop(a.currentTime + 0.6); } catch {} try { navigator.vibrate?.([300, 120, 300]); } catch {} onFin?.(); } }, [t, on]);
  const mm = String(Math.floor(t / 60)).padStart(2, "0"), ss = String(t % 60).padStart(2, "0");
  const remise = () => { setOn(false); if (mode !== "minuteur" && t > 0) onStop?.(t); setT(mode === "minuteur" ? Number(duree) || 60 : 0); };
  return h("div", { class: "rounded-2xl border border-slate-200 bg-white p-5 text-center" },
    titre ? h("p", { class: "text-sm font-semibold text-slate-500" }, titre) : null,
    h("p", { class: "mt-1 font-mono text-5xl font-bold tabular-nums text-slate-900" }, mm + ":" + ss),
    h("div", { class: "mt-4 flex justify-center gap-2" },
      h("button", { type: "button", onClick: () => setOn(!on), class: "rounded-xl bg-[var(--c)] px-5 py-2.5 text-sm font-semibold text-white" }, on ? "Pause" : t && (mode !== "minuteur" || t < (Number(duree) || 60)) ? "Reprendre" : "Démarrer"),
      h("button", { type: "button", onClick: remise, class: "rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700" }, mode === "minuteur" ? "Remettre" : "Terminer")));
};
// Classement d'une collection partagée : total d'un champ par membre (ou nombre d'éléments), le compte connecté mis en avant
ui.Classement = ({ lignes = [], champ, unite = "", titre, max = 10 }) => {
  const par = {}; for (const r of lignes) { const k = r._auteur_id ?? r._auteur ?? "?"; const x = par[k] ??= { nom: r._auteur ?? "Membre", moi: !!r._moi, total: 0 }; x.total += champ ? Number(r[champ]) || 0 : 1; if (r._moi) x.moi = true; }
  const L = Object.values(par).sort((a, b) => b.total - a.total).slice(0, max);
  if (!L.length) return h(ui.Empty, { texte: "Personne pour l'instant : soyez le premier !" });
  return h("div", { class: "rounded-2xl border border-slate-200 bg-white" }, titre ? h("p", { class: "border-b border-slate-100 px-4 py-3 font-semibold" }, titre) : null,
    L.map((x, i) => h("div", { key: x.nom + i, class: "flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0" + (x.moi ? " bg-[var(--c)]/[.06]" : "") },
      h("span", { class: "w-6 text-center font-bold " + (i < 3 ? "text-[var(--c)]" : "text-slate-400") }, String(i + 1)),
      h("span", { class: "flex-1 font-medium" }, x.nom + (x.moi ? " (vous)" : "")),
      h("span", { class: "font-semibold tabular-nums" }, (Math.round(x.total * 10) / 10).toLocaleString("fr-FR") + (unite ? " " + unite : "")))));
};
ui.Progress = ({ valeur = 0, max = 100, label }) => html\`<div>\${label && html\`<div class="flex justify-between text-xs text-slate-500 mb-1"><span>\${label}</span><span>\${Math.round(valeur / (max || 1) * 100)} %</span></div>\`}<div class="h-2 rounded-full bg-slate-100"><div class="h-2 rounded-full bg-[var(--c)]" style=\${"width:" + Math.min(100, valeur / (max || 1) * 100) + "%"}/></div></div>\`;

// Mes données : export et import Excel (CSV) de chaque type de données, pour démarrer avec ses vraies données
const lireCsv = (t) => { const sep = (t.split("\\n")[0].match(/;/g) ?? []).length >= (t.split("\\n")[0].match(/,/g) ?? []).length ? ";" : ","; const L = []; let r = [], c = "", q = false; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; } else if (ch === '"') q = true; else if (ch === sep) { r.push(c); c = ""; } else if (ch === "\\n" || ch === "\\r") { if (ch === "\\r" && t[i + 1] === "\\n") i++; r.push(c); c = ""; if (r.some((x) => x.trim())) L.push(r); r = []; } else c += ch; } r.push(c); if (r.some((x) => x.trim())) L.push(r); return L; };
const sansAccent = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");
function Donnees() {
  const cols = S.collections ?? [];
  const [n, setN] = useState({}), [busy, setBusy] = useState(null);
  const compter = () => Promise.all(cols.map((c) => db.list(c.nom).then((r) => [c.nom, r.length], () => [c.nom, 0]))).then((x) => setN(Object.fromEntries(x)));
  useEffect(() => { compter(); }, []);
  const exporter = async (c) => { const rows = await db.list(c.nom); const ch = c.champs ?? []; telecharger(c.label + ".csv", [ch.map((x) => celluleCsv(x.nom)).join(";"), ...rows.map((r) => ch.map((x) => celluleCsv(r[x.nom])).join(";"))].join("\\n")); };
  const importer = async (c, e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    setBusy(c.nom);
    try {
      const L = lireCsv(await f.text()); if (L.length < 2) throw new Error("Le fichier est vide ou n'a pas de ligne de titres.");
      const ch = c.champs ?? []; const tete = L[0].map((h) => ch.find((x) => sansAccent(x.nom) === sansAccent(h) || sansAccent(x.label ?? "") === sansAccent(h)));
      if (!tete.some(Boolean)) throw new Error("Aucune colonne reconnue. Titres attendus : " + ch.map((x) => x.nom).join(", "));
      let ok = 0;
      for (const ligne of L.slice(1, 501)) {
        const d = {}; tete.forEach((x, i) => { if (!x) return; let v = (ligne[i] ?? "").trim(); if (v === "") return; if (x.type === "nombre" || x.type === "montant") { const nb = Number(v.replace(/\\s/g, "").replace(",", ".").replace(/[€$]/g, "")); if (!isNaN(nb)) v = nb; } else if (x.type === "booleen") v = /^(oui|vrai|true|1|x)$/i.test(v); d[x.nom] = v; });
        if (Object.keys(d).length) { await db.add(c.nom, d); ok++; }
      }
      toast(ok + " ligne" + (ok > 1 ? "s" : "") + " importée" + (ok > 1 ? "s" : "") + " dans " + c.label); compter();
    } catch (x) { toast(x.message, "bad"); } finally { setBusy(null); }
  };
  return html\`<\${ui.Page} titre="Mes données" sous="Exportez vos données en un clic, ou importe celles que vous avez déjà (fichier Excel enregistré en CSV).">
    <div class="grid sm:grid-cols-2 gap-4">\${cols.map((c) => html\`<\${ui.Card} titre=\${c.label}><p class="text-3xl font-bold tabular-nums">\${n[c.nom] ?? "…"}</p><p class="text-sm text-slate-500">enregistrement\${n[c.nom] > 1 ? "s" : ""}</p>
      <p class="mt-3 text-xs text-slate-400">Colonnes : \${(c.champs ?? []).map((x) => x.nom).join(", ")}</p>
      <div class="mt-4 flex flex-wrap gap-2"><\${ui.Button} variant="secondary" onClick=\${() => exporter(c)}>Exporter</\${ui.Button}><label class=\${cls("inline-flex cursor-pointer items-center rounded-xl bg-[var(--c)] px-4 py-2 text-sm font-semibold text-white", busy && "opacity-50 pointer-events-none")}>\${busy === c.nom ? "Import…" : "Importer un fichier"}<input type="file" accept=".csv,text/csv" class="hidden" onChange=\${(e) => importer(c, e)}/></label></div></\${ui.Card}>\`)}</div>
  </\${ui.Page}>\`;
}
// Premiers pas : ce qu'un nouveau client fait en arrivant (masquable)
function PremiersPas({ user, publiques, lien }) {
  const cle = "pp:" + B.slug + ":" + (user.id ?? user.email);
  const [cache, setCache] = useState(() => { try { return localStorage.getItem(cle) === "1"; } catch (e) { return false; } });
  const [n0, setN0] = useState(null);
  const c0 = (S.collections ?? [])[0];
  useEffect(() => { if (c0) db.list(c0.nom).then((r) => setN0(r.length), () => setN0(0)); }, []);
  if (cache || /@demo\\.local$/.test(user.email ?? "") || !c0) return null;
  const cacher = () => { setCache(true); try { localStorage.setItem(cle, "1"); } catch (e) {} };
  const etapes = [[n0 > 0, "Ajoutez vos " + (/^[A-Z]{2,}/.test(c0.label) ? c0.label : c0.label.toLowerCase()), "Saisissez-en un ou importe votre fichier Excel.", () => nav("_donnees")], [false, "Invitez votre équipe", "Chacun a son accès, vous choisissez ce qu'il peut faire.", () => nav("_equipe")], ...(publiques[0] ? [[false, "Partagez « " + publiques[0].titre + " »", "Envoyez ce lien à vos clients.", () => { try { navigator.clipboard.writeText(lien(publiques[0])); toast("Lien copié"); } catch (e) {} }]] : [])];
  return html\`<div class="mb-6 rounded-2xl border border-[var(--c)]/20 bg-[var(--c)]/[0.04] p-5"><div class="flex items-start justify-between gap-3"><div><p class="font-semibold">Bienvenue sur \${S.nom}</p><p class="text-sm text-slate-500">Trois étapes pour bien démarrer.</p></div><button onClick=\${cacher} class="text-sm text-slate-400 hover:text-slate-700">Masquer</button></div>
    <div class="mt-4 grid gap-2 sm:grid-cols-3">\${etapes.map(([ok, t, d, f], i) => html\`<button onClick=\${f} class="rounded-xl bg-white p-3 text-left ring-1 ring-slate-200 hover:ring-[var(--c)]"><span class=\${cls("grid w-6 h-6 place-items-center rounded-full text-xs font-bold", ok ? "bg-emerald-500 text-white" : "bg-[var(--c)]/10 text-[var(--c)]")}>\${ok ? "✓" : i + 1}</span><p class="mt-2 text-sm font-semibold">\${t}</p><p class="text-xs text-slate-500">\${d}</p></button>\`)}</div></div>\`;
}

// ---------------------------------------------------------------- Écrans générés
let nav = () => {};
const go = (id, params) => { if (B.verif) VAPPELS.autre++; return nav(id, params); };
// IA intégrée : ia("Résume ce texte", { texte }) → texte ; { json: true } → objet
// E-mails aux clients de l'utilisateur : tout de suite, ou à une date (quand), éventuellement répétés (repeter : jour, semaine, mois)
const email = (m) => call("mail", m ?? {}).then((r) => { if (r?.demo) toast("Démo : l'e-mail est simulé, rien n'est envoyé. Dans votre vrai compte, il part vraiment."); return r; });
const annulerEmail = (id) => call("mail-annuler", { id });
const emailsEnvoyes = () => call("mails");
// Lien d'abonnement à l'agenda de l'espace (Google Agenda, Outlook, Apple)
const lienAgenda = () => call("agenda").then((r) => r.url);
// Document PDF téléchargé (devis, facture, bail, attestation…)
const rgb = (hx) => { const m = /^#?([0-9a-f]{6})$/i.exec(hx ?? ""); const n = parseInt(m ? m[1] : "4F46E5", 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
async function pdf(d = {}) {
  const { jsPDF } = await import("https://esm.sh/jspdf@2.5.2");
  const mAt = await import("https://esm.sh/jspdf-autotable@3.8.2");
  const autoTable = [mAt.default, mAt.autoTable, mAt.default?.default, mAt.default?.autoTable].find((f) => typeof f === "function");
  const doc = new jsPDF({ unit: "mm", format: "a4" }), M = 18, W = 210 - 2 * M, C = rgb(S.couleur);
  let y = 22;
  const saut = (h) => { if (y + h > 280) { doc.addPage(); y = 20; } };
  const txt = (v) => String(v ?? "").replace(/ | /g, " ");
  doc.setFont("helvetica", "bold"); doc.setFontSize(19); doc.setTextColor(C[0], C[1], C[2]); doc.text(txt(d.titre ?? S.nom), M, y); y += 7;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(100, 116, 139);
  if (d.sousTitre) { doc.text(doc.splitTextToSize(txt(d.sousTitre), W), M, y); y += 7; }
  if (d.emetteur || d.destinataire) {
    y += 3; doc.setTextColor(15, 23, 42); const top = y;
    const bloc = (titre, lignes, x) => { let yy = top; doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(txt(titre), x, yy); yy += 5; doc.setFont("helvetica", "normal"); for (const l of [].concat(lignes ?? [])) { doc.text(txt(l), x, yy); yy += 5; } return yy; };
    const y1 = d.emetteur ? bloc(d.emetteur.titre ?? "De", d.emetteur.lignes ?? d.emetteur, M) : top;
    const y2 = d.destinataire ? bloc(d.destinataire.titre ?? "Pour", d.destinataire.lignes ?? d.destinataire, M + W / 2 + 4) : top;
    y = Math.max(y1, y2) + 4;
  }
  doc.setFontSize(10.5); doc.setTextColor(15, 23, 42);
  for (const [l, v] of d.lignes ?? []) { saut(7); doc.setFont("helvetica", "bold"); doc.text(txt(l), M, y); doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(txt(v), W - 55), M + 55, y); y += 6.5; }
  if (d.tableau?.lignes?.length && autoTable) {
    autoTable(doc, { startY: y + 2, head: [d.tableau.colonnes ?? []], body: d.tableau.lignes.map((l) => l.map(txt)), margin: { left: M, right: M }, styles: { font: "helvetica", fontSize: 9.5, cellPadding: 2.4 }, headStyles: { fillColor: C, textColor: 255 }, alternateRowStyles: { fillColor: [248, 250, 252] } });
    y = doc.lastAutoTable.finalY + 6;
  }
  if (d.totaux) for (const [l, v] of d.totaux) { saut(7); doc.setFont("helvetica", "bold"); doc.text(txt(l), M + W - 70, y); doc.text(txt(v), M + W, y, { align: "right" }); y += 6.5; }
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
  for (const para of d.paragraphes ?? []) { const ls = doc.splitTextToSize(txt(para), W); for (const l of ls) { saut(6); doc.text(l, M, y); y += 5.2; } y += 2.5; }
  if (d.signature) { saut(26); y += 6; doc.text(txt(d.signature), M, y); y += 20; }
  if (d.mentions) { doc.setFontSize(8.5); doc.setTextColor(100, 116, 139); const ls = doc.splitTextToSize(txt(d.mentions), W); saut(ls.length * 4 + 4); doc.text(ls, M, Math.max(y + 4, 286 - ls.length * 4)); }
  const nomF = txt(d.nomFichier ?? d.titre ?? "document").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._ -]+/g, "").trim().replace(/\\s+/g, "-").slice(0, 80) || "document";
  const url = URL.createObjectURL(doc.output("blob")), a = document.createElement("a");
  a.href = url; a.download = nomF + ".pdf"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
const ia = (consigne, o = {}) => call("ia", { consigne, texte: o.texte ?? "", json: !!o.json }).then((r) => r.resultat);
const ctx = { html, h, Fragment, useState, useEffect, useMemo, useRef, useCallback, ui, fmt, db, useCollection, toast, go, Icone, ia, email, annulerEmail, emailsEnvoyes, pdf, lienAgenda };
const iaPublic = (consigne, o = {}) => call("public-ia", { page: PAGE?.id, espace: PAGE?.espace, consigne, texte: o.texte ?? "", json: !!o.json }).then((r) => r.resultat);
const ctxPublic = { ...ctx, db: dbPublic, useCollection: mkUseCollection(dbPublic), ia: refuse, email: refuse, annulerEmail: refuse, emailsEnvoyes: refuse, lienAgenda: refuse, go: () => {} };
const ECRANS = (S.ecrans ?? []).filter((e) => e.code).map((e) => {
  let Comp;
  try {
    const f = new Function("ctx", "const {html,h,Fragment,useState,useEffect,useMemo,useRef,useCallback,ui,fmt,db,useCollection,toast,go,Icone,ia,email,annulerEmail,emailsEnvoyes,pdf,lienAgenda,user,params}=ctx;\\n" + e.code + "\\n;return typeof Ecran==='function'?Ecran:null;");
    Comp = (props) => { const C = useMemo(() => f({ ...(e.public ? { ...ctxPublic, ia: e.ia ? iaPublic : refuse } : ctx), user: e.public ? null : props.user, params: props.params }), [props.params]); return C ? h(C, props) : html\`<\${Casse} titre=\${e.titre}/>\`; };
  } catch (err) { console.error(e.id, err); Comp = () => html\`<\${Casse} titre=\${e.titre}/>\`; }
  return { ...e, Comp };
});
function Casse({ titre }) { return html\`<\${ui.Card}><p class="font-semibold">\${titre}</p><p class="text-slate-500 text-sm mt-1">Cet écran n'a pas pu être chargé. Demandez sa correction depuis Bingoo!.</p></\${ui.Card}>\`; }
class Garde extends Component {
  componentDidCatch(err) { console.error(err); this.setState({ err: true }); }
  componentDidUpdate(p) { if (p.k !== this.props.k && this.state.err) this.setState({ err: false }); }
  render() { return this.state.err ? html\`<\${Casse} titre=\${this.props.titre}/>\` : this.props.children; }
}

// ---------------------------------------------------------------- Site public
const STY = ${JSON.stringify(STYLES)}[B.style] ?? {};
// Fond : celui choisi par le créateur, sinon celui de l'allure (ex. « nature » : crème)
if (!S.fond && STY.fond) S.fond = STY.fond;
const MENU_FONCE = STY.menu === "sombre" || STY.menu === "couleur";
// Logo du SaaS : l'image choisie par le créateur, sinon l'initiale sur sa couleur
const Logo = ({ taille = "w-8 h-8", clair = false }) => S.logo
  ? html\`<img src=\${S.logo} alt=\${S.nom} class=\${cls(taille, "rounded-xl object-contain", clair ? "bg-white p-0.5" : "")}/>\`
  : html\`<span class=\${cls(taille, "rounded-xl grid place-items-center font-bold", clair ? "bg-white text-[var(--c)]" : "bg-[var(--c)] text-white")}>\${(S.nom ?? "S")[0]}</span>\`;
// Icône d'une fonctionnalité, devinée d'après ses mots
const ICONE_MOTS = [["agenda", "planning|agenda|rendez|réserv|calend|créneau|séance"], ["graphique", "tableau de bord|statist|chiffre|analy|rapport|suivi"], ["contacts", "client|équipe|membre|contact|patient|élève|candidat"], ["mail", "e-mail|mail|relance|newsletter|notif"], ["fichier", "facture|devis|pdf|document|contrat|attestation"], ["panier", "paiement|vente|commande|boutique|encaiss|stripe"], ["message", "message|chat|avis|commentaire|support|réponse|assistant|question|conversation|échange|discussion"], ["reglages", "limite|règle|paramètr|contrôle|effac|supprim|confidenti|sécur|privé|accès|droit|légal"], ["horloge", "temps|heure|récurr|automati|rappel"], ["etoile", "avis|note|qualité|premium"], ["carte", "lien|page|site|en ligne|partag"], ["tag", "prix|tarif|prestation|catalogue|produit"]];
const iconeDe = (t, t2) => { const x = String(t ?? "").toLowerCase(); const r = (ICONE_MOTS.find(([, m]) => m.split("|").some((w) => x.includes(w))) ?? ["liste"])[0]; return r === "liste" && t2 ? iconeDe(t2) : r; };
// Aperçu d'une appli grand public, d'un outil ou d'un catalogue : pas une fenêtre de logiciel de gestion
const EMOJIS_APERCU = ["🔥", "⭐", "🎯", "✅", "📌", "💡", "🌿", "⚡"];
function ApercuAppli() {
  const ecr = (S.ecrans ?? []).filter((e) => !e.public);
  // Les données de la personne elle-même (pas une collection communauté), celles qui ressemblent à des actions d'abord
  const partage = new Set((S.collections ?? []).filter((c) => c.partage === true).map((c) => c.nom));
  const poids = (k) => (partage.has(k) ? 100 : 0) + (/seance|session|tache|plan|semaine|lecon|exercice|recette|habitude|objectif|entrainement|journal|depense/.test(k) ? 0 : 10);
  const cols = Object.entries(S.demo ?? {}).filter(([, xs]) => Array.isArray(xs) && xs.length > 1).sort((a, b) => poids(a[0]) - poids(b[0]) || b[1].length - a[1].length);
  const xs = cols[0]?.[1] ?? [];
  const texte = (x) => { const k = Object.keys(x ?? {}).find((c) => /^(nom|titre|name|libelle)$/.test(c)) ?? Object.keys(x ?? {}).find((c) => typeof x[c] === "string" && x[c].length > 3 && x[c].length < 60 && !/date|email|_id|statut/.test(c)); return k ? String(joli(x[k])).slice(0, 40) : ""; };
  const sous = (x) => { const k = Object.keys(x ?? {}).find((c) => /date|_le$/.test(c)) ?? Object.keys(x ?? {}).find((c) => typeof x[c] === "number"); return k ? String(joli(x[k])).slice(0, 24) : ""; };
  const items = xs.filter((x) => texte(x)).slice(0, 6);
  // Outils d'édition et de projets : l'aperçu montre leur vrai espace de travail (document ouvert, tableau de cartes), pas une appli « Aujourd'hui »
  const blocsDe = (x) => Object.values(x ?? {}).find((v) => Array.isArray(v) && v.length && v[0] && typeof v[0] === "object" && "texte" in v[0]);
  const tableauDe = (x) => Object.values(x ?? {}).find((v) => v && typeof v === "object" && Array.isArray(v.colonnes) && Array.isArray(v.cartes));
  const avecBlocs = xs.find(blocsDe), avecTableau = xs.find(tableauDe);
  const fenetre = (enfant) => h("div", { class: "mx-auto max-w-2xl overflow-hidden rounded-2xl bg-white text-left shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/10" },
    h("div", { class: "flex items-center gap-1.5 border-b border-slate-100 px-4 py-2.5" }, ["#f87171", "#fbbf24", "#34d399"].map((c) => h("span", { key: c, class: "h-2.5 w-2.5 rounded-full", style: "background:" + c })), h("span", { class: "ml-3 text-[11px] text-slate-400" }, S.nom)), enfant);
  if (S.famille === "projets" && avecTableau) { const t = tableauDe(avecTableau); return fenetre(h("div", { class: "flex gap-3 overflow-hidden bg-slate-50 p-4" }, t.colonnes.slice(0, 3).map((c) => h("div", { key: c.id ?? c.nom, class: "w-1/3 min-w-0 rounded-xl bg-slate-100 p-2" }, h("p", { class: "px-1 pb-2 text-[12px] font-bold text-slate-700" }, c.nom),
    t.cartes.filter((k) => k.colonne === c.id).slice(0, 3).map((k, i) => h("div", { key: i, class: "mb-2 rounded-lg bg-white p-2 text-[11.5px] font-medium shadow-sm ring-1 ring-slate-200" }, (k.etiquettes ?? []).length > 0 && h("span", { class: "mb-1 block h-1 w-6 rounded-full bg-[var(--c)]" }), k.titre)))))); }
  if (S.famille === "edition" && avecBlocs) return fenetre(h("div", { class: "grid grid-cols-[150px_1fr]" },
    h("div", { class: "space-y-1 border-r border-slate-100 bg-slate-50/60 p-3" }, xs.slice(0, 5).map((x, i) => h("p", { key: i, class: cls("truncate rounded-md px-2 py-1 text-[11.5px]", x === avecBlocs ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-500") }, (x.icone ? x.icone + " " : "") + (texte(x) || "Page")))),
    h("div", { class: "p-5" }, h("p", { class: "text-[20px] font-extrabold text-slate-900" }, (avecBlocs.icone ? avecBlocs.icone + " " : "") + texte(avecBlocs)),
      h("div", { class: "mt-2 space-y-1" }, blocsDe(avecBlocs).slice(0, 7).map((b, i) => b.type === "h1" || b.type === "h2" ? h("p", { key: i, class: "pt-1 text-[14px] font-bold text-slate-900" }, b.texte)
        : b.type === "todo" ? h("p", { key: i, class: cls("text-[12px]", b.fait ? "text-slate-400 line-through" : "text-slate-700") }, (b.fait ? "☑ " : "☐ ") + b.texte)
        : b.type === "quote" ? h("p", { key: i, class: "border-l-2 border-[var(--c)] pl-2 text-[12px] italic text-slate-500" }, b.texte)
        : h("p", { key: i, class: "text-[12px] text-slate-700" }, (b.type === "ul" ? "• " : "") + b.texte))))));
  // Résultat d'un outil : un chiffre calculé (rendement, score, total…) plutôt qu'une date de création
  const resultat = (x) => {
    const ks = Object.keys(x ?? {}).filter((c) => typeof x[c] === "number");
    const k = ks.find((c) => /rendement|taux|score|resultat|total|net|cash|marge|montant|economie|gain/.test(c)) ?? ks.find((c) => !/_id|annee|duree|nb_|quantite|portion/.test(c));
    if (!k) return "";
    const v = x[k], pct = /rendement|taux|pourcent|marge/.test(k);
    return (pct ? (Math.round(v * 10) / 10).toLocaleString("fr-FR") + " %" : Math.round(v).toLocaleString("fr-FR") + (/montant|total|cash|net|prix|economie|gain/.test(k) ? " €" : "")) + "";
  };
  const I = S.interface;
  if (I === "contenu") return h("div", { class: "rounded-3xl bg-white p-4 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/10 text-left" },
    h("div", { class: "flex items-center gap-2" }, h("div", { class: "flex-1 rounded-full bg-slate-100 px-4 py-2 text-[12px] text-slate-400" }, "Rechercher…"), h("span", { class: "rounded-full bg-[var(--c)] px-3 py-1.5 text-[11px] font-semibold text-white" }, ecr[0]?.titre ?? "Découvrir")),
    h("div", { class: "mt-3 grid grid-cols-3 gap-2.5" }, items.map((x, i) => h("div", { key: i, class: "overflow-hidden rounded-2xl ring-1 ring-slate-200" },
      h("div", { class: "grid aspect-[4/3] place-items-center text-3xl", style: "background:linear-gradient(135deg,color-mix(in srgb,var(--c) 20%,#fff),color-mix(in srgb,var(--c) 6%,#fff))" }, EMOJIS_APERCU[i % 8]),
      h("p", { class: "truncate px-2 py-1.5 text-[11px] font-semibold text-slate-800" }, texte(x))))));
  if (I === "outil") return h("div", { class: "mx-auto max-w-lg rounded-3xl bg-white p-5 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/10 text-left" },
    h("p", { class: "text-[15px] font-bold text-slate-900" }, ecr[0]?.titre ?? S.nom),
    h("div", { class: "mt-3 space-y-2" }, (ecr[0]?.fonctions ?? ["Votre demande"]).slice(0, 3).map((f, i) => h("div", { key: i, class: "rounded-xl bg-slate-50 px-3 py-2.5 text-[12px] text-slate-500 ring-1 ring-slate-200" }, String(f).slice(0, 48)))),
    h("div", { class: "mt-3 rounded-xl bg-[var(--c)] py-2.5 text-center text-[13px] font-semibold text-white" }, "Calculer / Générer"),
    h("div", { class: "mt-4 rounded-2xl p-4", style: "background:color-mix(in srgb,var(--c) 8%,#fff)" }, h("p", { class: "text-[11px] font-semibold uppercase tracking-wide text-[var(--c)]" }, "Résultat"),
      h("p", { class: "mt-1 text-[22px] font-extrabold text-slate-900" }, resultat(items[0]) || sous(items[0]) || "✓"), h("p", { class: "text-[12px] text-slate-500" }, texte(items[0]) || S.slogan)));
  // appli, communauté, apprentissage : un téléphone
  const tabs = ecr.slice(0, 4);
  return h("div", { class: "mx-auto w-[270px] rounded-[2.4rem] bg-slate-900 p-2.5 shadow-2xl shadow-slate-900/30" },
    h("div", { class: "overflow-hidden rounded-[1.9rem] bg-white text-left text-slate-900" },
      h("div", { class: "px-4 pt-5" }, h("p", { class: "text-[11px] text-slate-400" }, I === "communaute" ? "Fil" : I === "apprentissage" ? "Ta série du jour" : "Aujourd'hui"),
        h("p", { class: "text-[18px] font-extrabold text-slate-900" }, I === "communaute" ? "Quoi de neuf ?" : "Bonjour 👋"),
        h("div", { class: "mt-3 rounded-2xl bg-[var(--c)] p-3.5 text-white" }, h("p", { class: "text-[10px] font-semibold uppercase opacity-80" }, "À faire maintenant"), h("p", { class: "mt-0.5 text-[14px] font-bold leading-snug" }, (EMOJIS_APERCU[0] + " ") + (texte(items[0]) || ecr[0]?.titre || "")),
          h("div", { class: "mt-2.5 rounded-xl bg-white/20 py-1.5 text-center text-[11px] font-semibold" }, "C'est parti")),
        h("div", { class: "mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3" }, h(ui.Anneau, { valeur: 68, max: 100, taille: "petit" }), h("div", null, h("p", { class: "text-[12px] font-bold text-slate-900" }, "Cette semaine"), h("p", { class: "text-[11px] text-slate-500" }, "Belle progression"))),
        h("div", { class: "mt-3 space-y-2 pb-3" }, items.slice(1, 4).map((x, i) => h("div", { key: i, class: "flex items-center gap-2.5" }, h("span", { class: "grid h-8 w-8 place-items-center rounded-xl text-[15px]", style: "background:color-mix(in srgb,var(--c) 12%,transparent)" }, EMOJIS_APERCU[(i + 1) % 8]), h("span", { class: "min-w-0 flex-1" }, h("span", { class: "block truncate text-[12px] font-semibold text-slate-800" }, texte(x)), h("span", { class: "block truncate text-[10px] text-slate-400" }, sous(x))))))),
      h("div", { class: "grid border-t border-slate-100", style: "grid-template-columns:repeat(" + (tabs.length || 1) + ",1fr)" }, tabs.map((e, i) => h("div", { key: e.id, class: "flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium " + (i === 0 ? "text-[var(--c)]" : "text-slate-400") }, h(Icone, { nom: e.icone ?? iconeDe(e.titre), class: "w-4 h-4" }), h("span", { class: "max-w-full truncate px-0.5" }, e.titre))))));
}
// Aperçu du produit (page d'accueil) : construit avec les vrais écrans et les données d'exemple du SaaS
function Apercu() {
  // Image choisie dans l'atelier pour le haut de la page d'accueil
  if (S.image_accueil) return html\`<img src=\${S.image_accueil} alt=\${S.nom} class="w-full max-h-[560px] object-cover rounded-2xl shadow-2xl ring-1 ring-black/5"/>\`;
  if (S.interface && S.interface !== "gestion") return h(ApercuAppli);
  const ecr = (S.ecrans ?? []).filter((e) => !e.public).slice(0, 6);
  // Une collection à une seule ligne (réglages, fiche de l'entreprise) n'est pas une donnée à compter
  // Réglages (heures d'ouverture, paramètres) : ce ne sont pas des chiffres d'activité à afficher
  const cols = Object.entries(S.demo ?? {}).filter(([k, xs]) => Array.isArray(xs) && xs.length > 1 && !/dispo|horaire|reglage|parametre|entreprise/.test(k));
  const label = (k) => ((S.collections ?? []).find((c) => c.nom === k)?.label) ?? (k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " "));
  const [k0, xs0] = cols.sort((a, b) => b[1].length - a[1].length)[0] ?? ["", []];
  // Champs parlants d'abord (la base range les clés par longueur) : nom ou numéro, puis date, puis montant ; jamais un champ souvent vide
  const rang = (c) => /^(nom|titre|name)$/.test(c) ? 0 : /nom|titre|numero|libelle/.test(c) ? 1 : /^date$|date|_le$/.test(c) ? 2 : /montant|prix|total/.test(c) ? 3 : /statut/.test(c) ? 4 : 6;
  const plein = (c) => xs0.filter((x) => x?.[c] !== "" && x?.[c] != null).length >= xs0.length * 0.7;
  const champs = xs0.length ? [...new Set(xs0.flatMap((x) => Object.keys(x ?? {})))].filter((c) => c !== "ref" && c !== "id" && c !== "cree_le" && !c.endsWith("_id") && !/email|telephone|notes|tva|adresse/.test(c) && ["string", "number"].includes(typeof xs0[0][c]) && plein(c)).sort((a, b) => rang(a) - rang(b)).slice(0, 3) : [];
  const cd = champs.find((c) => rang(c) === 2), auj = new Date().toISOString().slice(0, 10);
  const lignes = (cd ? [...xs0].sort((a, b) => ((a[cd] <= auj) === (b[cd] <= auj) ? String(b[cd]).localeCompare(String(a[cd])) : a[cd] <= auj ? -1 : 1)) : xs0).filter((x) => champs[0] == null || (x[champs[0]] !== "" && x[champs[0]] != null));
  // Un nombre sans unité ne dit rien (« 35 ») : montant en euros, durée en minutes, selon le type ou le nom du champ
  const typeDe = (c) => ((S.collections ?? []).find((x) => x.nom === k0)?.champs ?? []).find((x) => x.nom === c)?.type;
  const val = (v, c) => typeof v === "number" && c && (typeDe(c) === "montant" || /montant|prix|total|tarif|ca$/.test(c)) ? fmt.eur(v)
    : typeof v === "number" && c && /duree|minutes/.test(c) ? v + " min" : String(joli(v)).slice(0, 28);
  const sombre = STY.menu === "sombre", couleur = STY.menu === "couleur";
  return html\`<div class="rounded-2xl bg-white shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/10 overflow-hidden text-left">
    <div class="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 bg-slate-50"><span class="w-2.5 h-2.5 rounded-full bg-red-300"/><span class="w-2.5 h-2.5 rounded-full bg-amber-300"/><span class="w-2.5 h-2.5 rounded-full bg-emerald-300"/><span class="ml-3 text-[11px] text-slate-400 truncate">\${S.nom}</span></div>
    <div class="flex min-h-[300px]">
      <div class=\${cls("w-40 shrink-0 p-3 space-y-1 hidden sm:block", sombre ? "bg-slate-900 text-slate-300" : couleur ? "bg-[var(--c)] text-white/80" : "bg-white border-r border-slate-100 text-slate-500")}>
        <div class="flex items-center gap-1.5 mb-3 text-[12px] font-bold"><\${Logo} taille="w-5 h-5" clair=\${sombre || couleur}/><span class=\${sombre || couleur ? "text-white" : "text-slate-900"}>\${S.nom}</span></div>
        \${ecr.map((e, i) => html\`<div class=\${cls("flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium", i === 0 && (sombre || couleur ? "bg-white/15 text-white" : "bg-[var(--c)]/10 text-[var(--c)]"))}><\${Icone} nom=\${e.icone ?? iconeDe(e.titre)} class="w-3.5 h-3.5"/>\${e.titre}</div>\`)}
      </div>
      <div class="flex-1 min-w-0 p-4 bg-slate-50/60">
        <p class="text-[13px] font-bold text-slate-900">\${ecr[0]?.titre ?? "Tableau de bord"}</p>
        <div class="mt-3 grid grid-cols-3 gap-2">\${cols.slice(0, 3).map(([k, xs]) => html\`<div class="rounded-xl bg-white ring-1 ring-slate-200/70 p-2.5"><p class="text-[10px] text-slate-500 truncate">\${label(k)}</p><p class="text-[17px] font-bold text-slate-900 tabular-nums">\${xs.length.toLocaleString("fr-FR")}</p><div class="mt-1 h-1 rounded-full bg-[var(--c)]/15"><div class="h-1 rounded-full bg-[var(--c)]" style=\${"width:" + Math.max(12, Math.round(100 * xs.length / (xs0.length || 1))) + "%"}/></div></div>\`)}</div>
        \${k0 && html\`<div class="mt-3 rounded-xl bg-white ring-1 ring-slate-200/70 overflow-hidden"><p class="px-3 pt-2.5 text-[11px] font-semibold text-slate-700">\${label(k0)}</p>
          \${lignes.slice(0, 4).map((x) => html\`<div class="flex items-center gap-2 px-3 py-2 border-t border-slate-100 text-[11px]">\${champs.map((c, j) => html\`<span class=\${cls("truncate", j === 0 ? "flex-1 font-medium text-slate-800" : "w-24 text-slate-500")}>\${val(x[c], c)}</span>\`)}</div>\`)}</div>\`}
      </div>
    </div>
  </div>\`;
}
// Documents légaux du SaaS (modèles remplis avec les informations saisies par le créateur dans Bingoo!)
const LG = S.legal ?? {};
const EDITEUR = LG.editeur || S.nom;
const MANQUE = (v, t) => v ? v : html\`<span class="rounded bg-amber-100 px-1 text-amber-800">\${t} à compléter</span>\`;
// Site web : pas de vente en ligne, donc pas de conditions générales de vente
const DOCS = S.type === "site" ? { mentions: "Mentions légales", confidentialite: "Politique de confidentialité" } : { mentions: "Mentions légales", cgv: "Conditions générales de vente", confidentialite: "Politique de confidentialité" };
function DocLegal({ k }) {
  const P = ({ children }) => html\`<p class="mt-2 text-[14.5px] leading-relaxed text-slate-600">\${children}</p>\`;
  const T = ({ children }) => html\`<h3 class="mt-6 text-[15px] font-semibold text-slate-900">\${children}</h3>\`;
  const f = S.formules ?? [];
  if (k === "mentions") return html\`<div>
    <\${T}>Éditeur<//><\${P}>\${S.nom} est édité par \${MANQUE(LG.editeur, "Nom ou raison sociale")}\${LG.forme ? ", " + LG.forme : ""}\${LG.siret ? ", SIRET " + LG.siret : ""}\${LG.rcs ? ", " + LG.rcs : ""}, dont l'adresse est \${MANQUE(LG.adresse, "Adresse")}.<//>
    <\${P}>Contact : \${MANQUE(LG.email, "E-mail")}.\${LG.tva ? " Numéro de TVA intracommunautaire : " + LG.tva + "." : ""} Directeur de la publication : \${EDITEUR}.<//>
    <\${T}>Hébergement<//><\${P}>Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Les données sont hébergées par Supabase Inc., sur des serveurs situés à Paris (France). Le service est construit et opéré techniquement avec Bingoo!.<//>
    <\${T}>Propriété intellectuelle<//><\${P}>Les textes, la marque \${S.nom} et les contenus du site appartiennent à \${EDITEUR}. Toute reproduction sans autorisation est interdite.<//></div>\`;
  if (k === "cgv") return html\`<div>
    <\${T}>1. Objet<//><\${P}>Les présentes conditions encadrent l'utilisation du service en ligne \${S.nom}, édité par \${EDITEUR}, et son abonnement. Créer un compte vaut acceptation de ces conditions.<//>
    <\${T}>2. Le service<//><\${P}>\${S.pitch ?? ""} Le service est accessible en ligne, depuis un ordinateur ou un téléphone, après création d'un compte.<//>
    \${ESSAI ? html\`<\${T}>3. Essai gratuit<//><\${P}>Chaque nouveau compte bénéficie de \${ESSAI} jours d'essai gratuit, sans carte bancaire. À la fin de l'essai, l'accès continue seulement après souscription d'un abonnement.<//>\` : null}
    <\${T}>4. Prix<//><\${P}>\${f.length ? f.map((x) => x.nom + " : " + x.prix + " € par mois").join(" ; ") + ". " : ""}Les prix sont indiqués en euros\${LG.tva ? ", toutes taxes comprises" : (LG.forme ?? "").toLowerCase().includes("micro") ? ", TVA non applicable (article 293 B du CGI)" : ""}. \${EDITEUR} peut faire évoluer ses prix ; tout changement est annoncé au moins 30 jours à l'avance et ne s'applique qu'à la période suivante.<//>
    <\${T}>5. Paiement et renouvellement<//><\${P}>Le paiement se fait par carte bancaire, par l'intermédiaire de Stripe. L'abonnement est payé d'avance et renouvelé automatiquement chaque mois, jusqu'à sa résiliation. Une facture est envoyée sur simple demande à \${LG.email || "l'adresse de contact"}.<//>
    <\${T}>6. Résiliation<//><\${P}>L'abonnement est sans engagement : il se résilie à tout moment depuis le compte, et prend fin à la fin de la période déjà payée. Aucun remboursement au prorata n'est dû.<//>
    <\${T}>7. Droit de rétractation<//><\${P}>Le client consommateur dispose de 14 jours pour se rétracter à compter de la souscription. En demandant l'accès immédiat au service, il accepte qu'il commence avant la fin de ce délai ; s'il se rétracte, il paie la part du service déjà fournie.<//>
    <\${T}>8. Données et responsabilité<//><\${P}>Le client reste propriétaire des données qu'il saisit et peut les exporter à tout moment. \${EDITEUR} met tout en œuvre pour assurer la disponibilité du service, sans pouvoir garantir une disponibilité totale ; sa responsabilité est limitée au montant payé sur les 12 derniers mois.<//>
    <\${T}>9. Litiges<//><\${P}>En cas de difficulté, contacte d'abord \${MANQUE(LG.email, "E-mail")}. Le client consommateur peut recourir gratuitement au médiateur de la consommation : \${MANQUE(LG.mediateur, "Médiateur")}. Ces conditions sont soumises au droit français.<//></div>\`;
  if (S.type === "site") return html\`<div>
    <\${T}>Responsable du traitement<//><\${P}>\${MANQUE(LG.editeur, "Nom ou raison sociale")}, \${MANQUE(LG.adresse, "Adresse")}, joignable à \${MANQUE(LG.email, "E-mail")}.<//>
    <\${T}>Données collectées<//><\${P}>Seulement ce que vous écrivez dans le formulaire de demande : votre nom, votre e-mail ou votre téléphone, le service qui vous intéresse, la date souhaitée et votre message. Les visites du site sont comptées sans cookie publicitaire.<//>
    <\${T}>Pourquoi<//><\${P}>Pour répondre à votre demande et, si vous devenez client, pour assurer le service demandé. Vos coordonnées ne servent à rien d'autre : pas de prospection, pas de revente.<//>
    <\${T}>Combien de temps<//><\${P}>3 ans après notre dernier échange, puis elles sont supprimées.<//>
    <\${T}>Qui y a accès<//><\${P}>\${EDITEUR} et ses prestataires techniques, qui agissent sur ses instructions : Bingoo! (fonctionnement du site), Supabase (hébergement des données, à Paris), Vercel (hébergement du site, États-Unis, encadré par les clauses contractuelles types de la Commission européenne), Resend (envoi des e-mails).<//>
    <\${T}>Vos droits<//><\${P}>Vous pouvez accéder à vos données, les corriger ou les faire supprimer, et vous opposer à leur traitement, en écrivant à \${MANQUE(LG.email, "E-mail")}. Vous pouvez aussi saisir la CNIL (cnil.fr).<//></div>\`;
  return html\`<div>
    <\${T}>Responsable du traitement<//><\${P}>\${MANQUE(LG.editeur, "Nom ou raison sociale")}, \${MANQUE(LG.adresse, "Adresse")}, joignable à \${MANQUE(LG.email, "E-mail")}.<//>
    <\${T}>Données collectées<//><\${P}>Votre nom et votre e-mail (compte), les données que vous saisissez dans le service, votre historique d'utilisation et, si vous vous abonnez, les informations de facturation. Le paiement par carte est traité par Stripe : \${S.nom} ne voit ni ne conserve votre numéro de carte. Les visites du site sont comptées sans cookie publicitaire.<//>
    <\${T}>Pourquoi<//><\${P}>Pour fournir le service, gérer votre compte et votre abonnement (exécution du contrat), vous envoyer les e-mails liés au service, et respecter nos obligations légales (factures).<//>
    <\${T}>Combien de temps<//><\${P}>Tant que votre compte est actif, puis 3 ans après votre dernière activité. Les factures sont conservées 10 ans (obligation comptable).<//>
    <\${T}>Qui y a accès<//><\${P}>\${EDITEUR} et ses prestataires techniques, qui agissent sur ses instructions : Bingoo! (fonctionnement du service), Supabase (hébergement des données, à Paris), Vercel (hébergement du site, États-Unis, encadré par les clauses contractuelles types de la Commission européenne), Stripe (paiement). Vos données ne sont jamais vendues.<//>
    <\${T}>Vos droits<//><\${P}>Vous pouvez accéder à vos données, les corriger, les exporter ou les faire supprimer, et vous opposer à leur traitement, en écrivant à \${MANQUE(LG.email, "E-mail")}. Vous pouvez aussi saisir la CNIL (cnil.fr).<//></div>\`;
}
function FenetreLegale() {
  const [k, setK] = useState(null);
  useEffect(() => bus.on("doc", (x) => setK(x)), []);
  if (!k) return null;
  return html\`<div class="fixed inset-0 z-[60] bg-slate-900/40 grid place-items-center p-4" onClick=\${(e) => e.target === e.currentTarget && setK(null)}><div class="anim w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[88vh] overflow-auto p-6 sm:p-8">
    <div class="flex items-start justify-between gap-4"><div><p class="text-sm font-semibold text-[var(--c)]">\${S.nom}</p><h2 class="text-2xl font-bold">\${DOCS[k]}</h2></div><button onClick=\${() => setK(null)} class="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button></div>
    <div class="mt-2 flex flex-wrap gap-2 text-sm">\${Object.entries(DOCS).filter(([x]) => x !== k).map(([x, t]) => html\`<button onClick=\${() => setK(x)} class="text-[var(--c)] hover:underline">\${t}</button>\`)}</div>
    <\${DocLegal} k=\${k}/></div></div>\`;
}
const LiensLegaux = ({ class: c = "" }) => html\`<span class=\${cls("flex flex-wrap gap-x-4 gap-y-1", c)}>\${Object.entries(DOCS).map(([k, t]) => html\`<button onClick=\${() => bus.emit("doc", k)} class="hover:text-slate-700 hover:underline">\${t}</button>\`)}</span>\`;

// Jamais de chiffres de succès dans la bouche du SaaS (ils venaient du SaaS modèle) : on retire ces phrases à l'affichage
const sansRevendication = (t) => String(t ?? "").split(/(?<=[.!?])\\s+/).filter((ph) => !/revendique|cela prouve|ce qui prouve|\\d[\\d\\s.,]*\\s*(?:\\+\\s*)?(?:000|k|millions?)?\\s*(?:clients?|entreprises?|utilisateurs?|abonnés?|prestations?|réservations?|commandes?|membres?|€|euros?|dollars?|\\$)/i.test(ph)).join(" ").trim();
// ---------------------------------------------------------------- Page d'accueil : le produit montré écran par écran
// Variante de mise en page propre à chaque SaaS (deux SaaS ne se ressemblent pas) : dérivée de son nom
const GRAINE = [...String(S.nom ?? "")].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
const VAR_PAGE = GRAINE % 3;
// Une icône différente par fonctionnalité : la mieux adaptée encore libre, sinon une icône de réserve
const ICONES_RESERVE = ["etoile", "carte", "horloge", "message", "tag", "fichier", "graphique", "contacts", "panier", "mail", "reglages", "agenda"];
function iconesUniques(items) {
  const prises = new Set();
  return items.map((x) => {
    let n = iconeDe(x.titre, x.texte);
    if (prises.has(n)) n = ICONES_RESERVE.find((r) => !prises.has(r)) ?? n;
    prises.add(n);
    return n;
  });
}
// Collection affichée par un écran : celle dont le nom apparaît dans l'identifiant ou le titre de l'écran
function collectionDe(e) {
  if (/planning|agenda|calend/i.test(String(e.id) + " " + e.titre) && S.agenda?.collection && (S.demo ?? {})[S.agenda.collection]) return S.agenda.collection;
  const cols = Object.entries(S.demo ?? {}).filter(([, xs]) => Array.isArray(xs) && xs.length);
  const t = (String(e.id ?? "") + " " + String(e.titre ?? "")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return (cols.find(([k]) => t.includes(k.replace(/s$/, ""))) ?? cols.find(([k]) => k.length > 3 && t.includes(k.slice(0, 4))) ?? [])[0];
}
// Maquette d'un écran avec les vraies données d'exemple : calendrier, colonnes ou liste selon l'écran
function MiniEcran({ e }) {
  const k = collectionDe(e), xs = (S.demo ?? {})[k] ?? [];
  const champ = (x, re) => Object.keys(x ?? {}).find((c) => re.test(c) && x[c] !== "" && x[c] != null);
  const titreDe = (x) => { const c = champ(x, /^(nom|titre|name|client_nom|libelle)$/) ?? champ(x, /nom|titre|client/); return c ? String(joli(x[c])).slice(0, 30) : ""; };
  const montantDe = (x) => { const c = champ(x, /montant|prix|total|tarif/); return c && typeof x[c] === "number" ? fmt.eur(x[c]) : ""; };
  const dateBrute = (x) => { const c = champ(x, /^date$|date|debut|echeance/); return c ? String(x[c]).slice(0, 10) : ""; };
  const dateDe = (x) => { const d = dateBrute(x); return /^\\d{4}-\\d{2}-\\d{2}$/.test(d) ? new Date(d + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : d; };
  const t = (String(e.id) + " " + e.titre).toLowerCase();
  const cadre = (corps) => h("div", { class: "rounded-2xl bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/10 overflow-hidden text-left" },
    h("div", { class: "flex items-center justify-between border-b border-slate-100 px-4 py-3" }, h("span", { class: "flex items-center gap-2 text-[13px] font-bold text-slate-900" }, h(Icone, { nom: e.icone ?? iconeDe(e.titre), class: "w-4 h-4 text-[var(--c)]" }), e.titre), h("span", { class: "rounded-lg bg-[var(--c)] px-2.5 py-1 text-[11px] font-semibold text-white" }, "Ajouter")),
    h("div", { class: "p-4" }, corps));
  if (/planning|agenda|calend/.test(t)) {
    const jours = ["L", "M", "M", "J", "V", "S", "D"], parJour = {};
    for (const x of xs) { const d = dateBrute(x); if (d) { const j = (new Date(d + "T12:00").getDay() + 6) % 7; (parJour[j] ??= []).push(x); } }
    return cadre(h("div", { class: "grid grid-cols-7 gap-1.5" }, jours.map((j, i) => h("div", { key: i, class: "min-h-[120px] rounded-lg bg-slate-50 p-1.5" }, h("p", { class: "text-center text-[10px] font-semibold text-slate-400" }, j),
      (parJour[i] ?? []).slice(0, 3).map((x, n) => h("div", { key: n, class: "mt-1 truncate rounded-md px-1.5 py-1 text-[9.5px] font-medium text-white", style: "background:var(--c);opacity:" + (1 - n * 0.22) }, titreDe(x)))))));
  }
  const statuts = [...new Set(xs.map((x) => x?.statut).filter((v) => typeof v === "string"))].slice(0, 3);
  if (statuts.length >= 2) return cadre(h("div", { class: "grid gap-2", style: "grid-template-columns:repeat(" + statuts.length + ",1fr)" }, statuts.map((st) => h("div", { key: st, class: "rounded-xl bg-slate-50 p-2" },
    h("p", { class: "text-[10px] font-semibold uppercase tracking-wide text-slate-400" }, String(joli(st)).slice(0, 16)),
    xs.filter((x) => x.statut === st).slice(0, 3).map((x, n) => h("div", { key: n, class: "mt-1.5 rounded-lg bg-white p-2 ring-1 ring-slate-200/70" }, h("p", { class: "truncate text-[11px] font-semibold text-slate-800" }, titreDe(x)), h("p", { class: "text-[10px] text-slate-500" }, [dateDe(x), montantDe(x)].filter(Boolean).join(" · "))))))));
  return cadre(h("div", { class: "divide-y divide-slate-100" }, xs.filter((x) => titreDe(x)).slice(0, 5).map((x, n) => h("div", { key: n, class: "flex items-center gap-3 py-2" },
    h("span", { class: "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold text-[var(--c)]", style: "background:color-mix(in srgb,var(--c) 12%,#fff)" }, titreDe(x)[0] ?? "•"),
    h("span", { class: "min-w-0 flex-1" }, h("span", { class: "block truncate text-[12px] font-semibold text-slate-800" }, titreDe(x)), h("span", { class: "block text-[10.5px] text-slate-400" }, dateDe(x))),
    h("span", { class: "text-[12px] font-semibold text-slate-700 tabular-nums" }, montantDe(x))))));
}
// Les écrans clés, un par bloc, texte et maquette en alternance
function Visite() {
  const ecr = (S.ecrans ?? []).filter((e) => !e.public && e.but && collectionDe(e)).slice(0, 3);
  if (!ecr.length) return null;
  return html\`<section class="py-20"><div class="max-w-6xl mx-auto px-5 space-y-20">\${ecr.map((e, i) => html\`<div class=\${cls("grid lg:grid-cols-2 gap-10 items-center", i % 2 === 1 && "lg:[&>*:first-child]:order-2")}>
    <div><span class="inline-flex items-center gap-2 rounded-full bg-[var(--c)]/10 px-3 py-1 text-sm font-semibold text-[var(--c)]"><\${Icone} nom=\${e.icone ?? iconeDe(e.titre)} class="w-4 h-4"/>\${e.titre}</span>
      <h3 class="fh mt-4 text-2xl sm:text-3xl font-bold tracking-tight leading-snug">\${e.but}</h3>
      \${(e.fonctions ?? []).length > 0 && html\`<ul class="mt-5 space-y-2 text-slate-600">\${e.fonctions.slice(0, 4).map((t) => html\`<li class="flex gap-2"><span class="mt-0.5 text-[var(--c)]"><\${Icone} nom="check" class="w-4 h-4"/></span>\${t}</li>\`)}</ul>\`}</div>
    <\${MiniEcran} e=\${e}/></div>\`)}</div></section>\`;
}
// Formules équilibrées : chaque formule annonce au moins 3 avantages (les suivantes reprennent la précédente)
function formulesPleines(f) {
  const atouts = ATOUTS.map((a) => a.titre).filter(Boolean);
  return f.map((x, i) => {
    let inclus = [...(x.inclus ?? [])];
    if (i > 0 && inclus.length < 3) inclus = ["Tout ce que contient " + f[i - 1].nom, ...inclus];
    for (const a of atouts) { if (inclus.length >= 3) break; if (!inclus.some((t) => t.toLowerCase().includes(a.toLowerCase().slice(0, 12)))) inclus.push(a); }
    return { ...x, inclus };
  });
}

function Site({ onAuth }) {
  const f = formulesPleines(S.formules ?? []);
  const icones = iconesUniques(ATOUTS);
  const probleme = sansRevendication(S.probleme);
  useEffect(() => { if (!B.apercu) call("vue", { variante: VARIANTE, source: B.source }).catch(() => {}); }, []);
  const ecr = (S.ecrans ?? []).filter((e) => !e.public && e.but);
  const col0 = ((S.collections ?? [])[0]?.label ?? "vos données").toLowerCase();
  const etapes = [["Créez votre compte", "En une minute, sans carte bancaire" + (ESSAI ? " : " + ESSAI + " jours pour tout essayer." : ".")], ["Ajoutez vos " + col0, "Importez ou saisissez ce que vous avez déjà, tout est rangé au même endroit."], [ATOUTS[0]?.titre ?? "Gagne du temps", (ATOUTS[0]?.texte ?? "Le reste se fait tout seul, vous vous concentrez sur votre métier.")]];
  const faq = [...(S.faq ?? []).filter((x) => x?.q && x?.r).map((x) => [x.q, x.r]), ["Est-ce que je peux essayer gratuitement ?", ESSAI ? "Oui : " + ESSAI + " jours d'essai, sans carte bancaire. Vous ne payez que si vous continuez." : "Oui, vous pouvez créer votre compte et découvrir l'outil avant de vous abonner."], ["Je suis engagé sur combien de temps ?", "Sur aucune durée : vous arrêtez quand vous voulez, en un clic depuis votre compte."], ["Mes données sont-elles en sécurité ?", "Elles sont hébergées en Europe, sauvegardées, et vous pouvez les exporter ou les supprimer à tout moment."], ["Je peux inviter mon équipe ?", "Oui, invitez vos collaborateurs et choisissez ce que chacun peut voir ou modifier."]];
  const hero = STY.hero ?? "cote";
  const fonce = hero === "sombre" || hero === "degrade";
  const Boutons = ({ centre }) => html\`<div class=\${cls("mt-8 flex flex-wrap gap-3", centre && "justify-center")}><\${ui.Button} class=\${cls("!px-6 !py-3 !text-base", hero === "degrade" && "!bg-white !text-slate-900")} onClick=\${() => onAuth("signup")}>Commencer gratuitement</\${ui.Button}><\${ui.Button} variant="secondary" class=\${cls("!px-6 !py-3 !text-base", fonce && "!bg-white/10 !text-white !border-white/20")} onClick=\${() => onAuth("tour")}>Voir la démo en 30 s</\${ui.Button}></div><p class=\${cls("mt-3 text-sm", fonce ? "text-white/60" : "text-slate-400", centre && "text-center")}>Sans carte bancaire\${ESSAI ? " · " + ESSAI + " jours d'essai" : ""}</p>\`;
  const Pastille = () => html\`<p class=\${cls("inline-block rounded-full px-3 py-1 text-sm font-semibold", fonce ? "bg-white/15 text-white" : "bg-[var(--c)]/10 text-[var(--c)]")}>\${S.cible_courte || S.nom}</p>\`;
  return html\`<div class="bg-white min-h-screen">
  <div class=\${cls(hero === "sombre" && "text-white", hero === "degrade" && "text-white bg-[var(--c)]")} style=\${hero === "sombre" ? "background:radial-gradient(1000px 460px at 50% -12%,color-mix(in srgb,var(--c) 60%,transparent),transparent),color-mix(in srgb,var(--c) 16%,#07070c)" : hero === "degrade" ? "background-image:radial-gradient(1200px 500px at 80% -10%,rgba(255,255,255,.28),transparent),linear-gradient(160deg,var(--c),#0f172a)" : hero === "centre" ? "background:linear-gradient(180deg,color-mix(in srgb,var(--c) 7%,white),white)" : ""}>
  <header class="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between gap-4"><div class="flex items-center gap-2.5 font-bold text-lg"><\${Logo} clair=\${fonce}/>\${S.nom}</div>
    <nav class=\${cls("hidden md:flex gap-6 text-sm font-medium", fonce ? "text-white/70" : "text-slate-500")}><a href="#fonctions">Fonctionnalités</a>\${f.length > 0 && html\`<a href="#tarifs">Tarifs</a>\`}<a href="#faq">Questions</a></nav>
    <div class="flex gap-2 whitespace-nowrap"><span class="hidden sm:inline"><\${ui.Button} variant="ghost" class=\${fonce ? "!text-white" : ""} onClick=\${() => onAuth("login")}>Se connecter</\${ui.Button}></span><\${ui.Button} class=\${fonce ? "!bg-white !text-slate-900" : ""} onClick=\${() => onAuth("signup")}>Essai gratuit</\${ui.Button}></div></header>
  \${hero === "cote" ? html\`<section class="max-w-6xl mx-auto px-5 pt-10 pb-20 grid lg:grid-cols-[1fr_1.15fr] gap-12 items-center"><div><\${Pastille}/><h1 class="mt-5 text-4xl sm:text-[54px] font-extrabold tracking-tight leading-[1.04]">\${S.slogan ?? S.pitch}</h1><p class="mt-5 text-lg text-slate-500">\${S.pitch}</p><\${Boutons}/></div><\${Apercu}/></section>\`
    : html\`<section class="max-w-6xl mx-auto px-5 pt-12 pb-16 text-center"><\${Pastille}/><h1 class="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.04]">\${S.slogan ?? S.pitch}</h1><p class=\${cls("mt-5 text-lg max-w-2xl mx-auto", fonce ? "text-white/75" : "text-slate-500")}>\${S.pitch}</p><\${Boutons} centre/><div class="mt-14 max-w-4xl mx-auto"><\${Apercu}/></div></section>\`}
  </div>
  \${probleme && html\`<section class="py-20"><div class="max-w-3xl mx-auto px-5 text-center"><p class="text-sm font-semibold text-[var(--c)] uppercase tracking-wide">Le problème</p><p class="fh mt-3 text-2xl sm:text-3xl font-semibold leading-snug">\${probleme}</p></div></section>\`}
  \${html\`<\${Visite}/>\`}
  <section id="fonctions" class=\${cls("py-20", VAR_PAGE === 0 ? "bg-slate-50" : VAR_PAGE === 1 ? "bg-white border-y border-slate-100" : "bg-[var(--c)]/[0.04]")}><div class="max-w-6xl mx-auto px-5"><p class="text-center text-sm font-semibold text-[var(--c)] uppercase tracking-wide">Fonctionnalités</p><h2 class="mt-2 text-3xl sm:text-4xl font-bold text-center tracking-tight">Tout ce qu'il vous faut, au même endroit</h2>
    <div class="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">\${ATOUTS.map((a, k) => html\`<div class=\${cls("rounded-2xl p-6 transition", VAR_PAGE === 1 ? "bg-transparent border-l-4 border-[var(--c)] rounded-none pl-5" : "bg-white border border-slate-200/80", VAR_PAGE === 2 && k === 0 && "sm:col-span-2 lg:row-span-2 bg-[var(--c)]/5", "hover:shadow-lg hover:shadow-slate-900/5")}><span class="w-11 h-11 rounded-xl bg-[var(--c)]/10 text-[var(--c)] grid place-items-center"><\${Icone} nom=\${icones[k]}/></span><p class="mt-4 font-semibold text-[17px]">\${a.titre}</p><p class="mt-1.5 text-slate-500 text-[15px] leading-relaxed">\${a.texte}</p></div>\`)}</div></div></section>
  <section class=\${cls("py-20", VAR_PAGE === 1 && "bg-slate-950 text-white")}><div class="max-w-6xl mx-auto px-5"><h2 class="text-3xl sm:text-4xl font-bold text-center tracking-tight">Prêt en 3 étapes</h2>
    <div class="mt-12 grid md:grid-cols-3 gap-8">\${etapes.map(([t, d], i) => html\`<div><span class="fh text-5xl font-extrabold text-[var(--c)]/25">\${"0" + (i + 1)}</span><p class="mt-2 font-semibold text-lg">\${t}</p><p class=\${cls("mt-1", VAR_PAGE === 1 ? "text-white/60" : "text-slate-500")}>\${d}</p></div>\`)}</div>
    \${ecr.length > 1 && html\`<div class="mt-16 grid sm:grid-cols-2 gap-x-10 gap-y-5 max-w-4xl mx-auto">\${ecr.slice(0, 8).map((e) => html\`<div class="flex gap-3"><span class="mt-0.5 w-8 h-8 shrink-0 rounded-lg bg-[var(--c)]/10 text-[var(--c)] grid place-items-center"><\${Icone} nom=\${e.icone ?? iconeDe(e.titre)} class="w-4 h-4"/></span><div><p class="font-semibold">\${e.titre}</p><p class=\${cls("text-sm", VAR_PAGE === 1 ? "text-white/60" : "text-slate-500")}>\${e.but}</p></div></div>\`)}</div>\`}</div></section>
  \${f.length > 0 && html\`<section id="tarifs" class="bg-slate-50 py-20"><div class="max-w-5xl mx-auto px-5"><h2 class="text-3xl sm:text-4xl font-bold text-center tracking-tight">Des prix simples</h2><p class="mt-2 text-center text-slate-500">Sans engagement\${ESSAI ? ", " + ESSAI + " jours d'essai gratuit" : ""}.</p><div class=\${"mt-10 grid gap-4 " + (f.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2")}>\${f.map((x, i) => html\`<div class=\${cls("rounded-2xl p-6 border flex flex-col", i === 1 ? "bg-slate-900 text-white border-slate-900 shadow-xl" : "bg-white border-slate-200")}>\${i === 1 && html\`<span class="self-start mb-3 rounded-full bg-[var(--c)] px-2.5 py-0.5 text-xs font-semibold text-white">Le plus choisi</span>\`}<p class="font-semibold">\${x.nom}</p><p class="mt-2"><span class="fh text-4xl font-extrabold">\${x.prix} €</span><span class=\${i === 1 ? "text-white/60" : "text-slate-400"}> /mois</span></p><p class=\${cls("mt-2 text-sm", i === 1 ? "text-white/70" : "text-slate-500")}>\${x.pour}</p><ul class="mt-4 space-y-2 text-sm flex-1">\${(x.inclus ?? []).map((t) => html\`<li class="flex gap-2"><span class="text-[var(--c)]"><\${Icone} nom="check" class="w-4 h-4"/></span>\${t}</li>\`)}</ul><\${ui.Button} class=\${cls("mt-6 w-full", i !== 1 && "!bg-white !text-slate-900 !border !border-slate-200")} onClick=\${() => onAuth("signup")}>Essayer \${ESSAI ? ESSAI + " jours" : "maintenant"}</\${ui.Button}></div>\`)}</div></div></section>\`}
  <section id="faq" class="py-20"><div class="max-w-3xl mx-auto px-5"><h2 class="text-3xl font-bold text-center tracking-tight">Questions fréquentes</h2><div class="mt-8 divide-y divide-slate-200 border-y border-slate-200">\${faq.map(([q, r]) => html\`<details class="group py-4"><summary class="flex cursor-pointer list-none items-center justify-between font-semibold">\${q}<span class="text-slate-400 group-open:rotate-45 transition text-xl leading-none">+</span></summary><p class="mt-2 text-slate-500">\${r}</p></details>\`)}</div></div></section>
  \${(B.articles ?? []).length > 0 && html\`<section class="max-w-6xl mx-auto px-5 pb-16"><h2 class="text-2xl font-bold">Ressources</h2><div class="mt-6 grid md:grid-cols-3 gap-4">\${B.articles.map((a) => html\`<a href=\${(B.blog ?? "") + a.slug} target="_blank" rel="noopener" class="block rounded-2xl border border-slate-200 p-5 hover:border-[var(--c)]"><p class="font-semibold">\${a.titre}</p><p class="mt-1 text-sm text-slate-500">\${a.resume ?? ""}</p></a>\`)}</div></section>\`}
  <section class="px-5 pb-20"><div class="max-w-5xl mx-auto rounded-3xl bg-[var(--c)] text-white px-8 py-14 text-center" style="background-image:radial-gradient(800px 300px at 50% -20%,rgba(255,255,255,.25),transparent)"><h2 class="text-3xl sm:text-4xl font-bold tracking-tight">Prêt à essayer \${S.nom} ?</h2><p class="mt-3 text-white/80">\${S.pitch}</p><\${ui.Button} class="mt-7 !px-6 !py-3 !text-base !bg-white !text-slate-900" onClick=\${() => onAuth("signup")}>Commencer gratuitement</\${ui.Button}></div></section>
  <footer class="border-t border-slate-100"><div class="max-w-6xl mx-auto px-5 py-8 text-sm text-slate-400 flex flex-wrap items-center justify-between gap-3"><span class="flex items-center gap-2 font-semibold text-slate-600"><\${Logo} taille="w-6 h-6"/>\${S.nom}</span><\${LiensLegaux}/><span>© \${new Date().getFullYear()} \${S.nom} · Construit avec Bingoo!</span></div></footer></div>\`;
}

// ---------------------------------------------------------------- Site web (spec.type « site ») : la vitrine d'un professionnel
// Textes écrits à la construction (S.site), services, horaires et coordonnées vivants (modifiables dans l'espace gérant)
const SITE = S.site ?? {};
const JOURS_S = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const heureS = (x) => String(x || "").replace(/^0/, "").replace(":00", " h").replace(":", " h ");
const prixS = (s) => s.prix == null || s.prix === "" || !(Number(s.prix) > 0) ? "Sur devis" : (s.prix_texte ? "À partir de " : "") + fmt.eur(s.prix);
const lienTel = (t) => "tel:" + String(t || "").replace(/[^\\d+]/g, "");
const MOD = SITE.modele ?? "vitrine";
function SiteVitrine({ onAuth }) {
  if (MOD === "lancement") return html\`<\${SiteLancement} onAuth=\${onAuth}/>\`;
  const [d, setD] = useState(null), [envoi, setEnvoi] = useState(null), [f, setF] = useState({ nom: "", email: "", telephone: "", service: "", date_souhaitee: "", message: "", site_web: "" }), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  useEffect(() => {
    if (!B.apercu) call("vue", { variante: "A", source: B.source }).catch(() => {});
    call("site-info").then(setD, () => setD({ services: S.demo?.services ?? [], horaires: S.demo?.horaires ?? [], infos: (S.demo?.infos ?? [])[0] ?? {} }));
  }, []);
  const services = d?.services ?? [], horaires = d?.horaires ?? [], inf = d?.infos ?? {}, realisations = d?.realisations ?? [];
  const portfolio = MOD === "portfolio";
  const [cat, setCat] = useState(""), [grand, setGrand] = useState(null);
  const cats = [...new Set(realisations.map((r) => r.categorie).filter(Boolean))];
  const auj = ((new Date().getDay() + 6) % 7) + 1;
  const hAuj = horaires.find((h) => Number(h.jour) === auj);
  const ouvertAuj = hAuj?.ouvert ? "Ouvert aujourd'hui · " + heureS(hAuj.debut) + " – " + heureS(hAuj.fin) : horaires.length ? "Fermé aujourd'hui" : "";
  const avecDate = SITE.demande === "rdv" || SITE.demande === "reservation";
  const hero = STY.hero ?? "cote";
  const fonce = hero === "sombre" || hero === "degrade";
  const choisir = (s) => { setF((x) => ({ ...x, service: s.titre })); document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); };
  const envoyer = async (e) => {
    e.preventDefault(); setErr("");
    if (!f.nom.trim()) { setErr("Indiquez votre nom."); return; }
    if (!f.email.trim() && !f.telephone.trim()) { setErr("Indiquez votre e-mail ou votre téléphone pour qu'on puisse vous répondre."); return; }
    setBusy(true);
    try { await call("site-contact", { data: f, source: B.source }); setEnvoi(f.nom.split(" ")[0]); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const Cta = ({ grand, clair }) => html\`<a href="#contact" class=\${cls("inline-flex items-center justify-center rounded-full font-semibold transition hover:brightness-110", grand ? "px-7 py-3.5 text-base" : "px-4 py-2 text-sm", clair ? "bg-white text-slate-900" : "bg-[var(--c)] text-white shadow-lg shadow-[var(--c)]/25")}>\${SITE.cta || "Me contacter"}</a>\`;
  const titreSection = (sur, titre) => html\`<p class="text-sm font-semibold uppercase tracking-wide text-[var(--c)]">\${sur}</p><h2 class="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">\${titre}</h2>\`;
  const photos = realisations.filter((r) => r.image).slice(0, 4);
  const Express = () => S.image_accueil ? html\`<img src=\${S.image_accueil} alt=\${S.nom} class="w-full max-h-[480px] object-cover rounded-3xl shadow-2xl ring-1 ring-black/5"/>\` : portfolio ? (photos.length >= 2 ? html\`<div class="grid grid-cols-2 gap-3">\${photos.map((r, i) => html\`<img src=\${r.image} alt=\${r.titre} class=\${cls("w-full rounded-2xl object-cover shadow-xl ring-1 ring-black/5", i % 3 === 0 ? "aspect-[4/5]" : "aspect-square")}/>\`)}</div>\` : html\`<div class="grid aspect-[4/3] place-items-center rounded-3xl text-8xl font-extrabold text-white shadow-2xl" style="background:linear-gradient(150deg,var(--c),color-mix(in srgb,var(--c) 55%,#0f172a))">\${(S.nom ?? "S")[0]}</div>\`) : html\`<div class="rounded-3xl bg-white p-6 text-left text-slate-900 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5">
    \${ouvertAuj && html\`<p class=\${cls("inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold", hAuj?.ouvert ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}><span class=\${cls("h-2 w-2 rounded-full", hAuj?.ouvert ? "bg-emerald-500" : "bg-slate-400")}></span>\${ouvertAuj}</p>\`}
    <div class="mt-4 divide-y divide-slate-100">\${services.slice(0, 4).map((s) => html\`<div class="flex items-baseline justify-between gap-4 py-3"><div class="min-w-0"><p class="truncate font-semibold">\${s.titre}</p>\${s.duree && html\`<p class="text-xs text-slate-400">\${s.duree}</p>\`}</div><p class="shrink-0 font-bold text-[var(--c)]">\${prixS(s)}</p></div>\`)}</div>
    \${(inf.zone || inf.adresse) && html\`<p class="mt-3 flex items-center gap-2 text-sm text-slate-500"><\${Icone} nom="carte" class="w-4 h-4"/>\${inf.adresse || inf.zone}</p>\`}
    <a href="#contact" class="mt-5 block rounded-2xl bg-[var(--c)] py-3 text-center font-semibold text-white hover:brightness-110">\${SITE.cta || "Me contacter"}</a></div>\`;
  const fondHero = hero === "sombre" ? "background:radial-gradient(1000px 460px at 50% -12%,color-mix(in srgb,var(--c) 60%,transparent),transparent),color-mix(in srgb,var(--c) 16%,#07070c)" : hero === "degrade" ? "background-image:radial-gradient(1200px 500px at 80% -10%,rgba(255,255,255,.28),transparent),linear-gradient(160deg,var(--c),#0f172a)" : "background:linear-gradient(180deg,color-mix(in srgb,var(--c) 8%,white),white)";
  const Pastille = () => html\`<p class=\${cls("inline-block rounded-full px-3 py-1 text-sm font-semibold", fonce ? "bg-white/15 text-white" : "bg-[var(--c)]/10 text-[var(--c)]")}>\${SITE.metier}\${SITE.ville ? " · " + SITE.ville : ""}</p>\`;
  const nav = [...(portfolio ? [["#realisations", "Réalisations"]] : []), ...(services.length || !portfolio ? [["#services", portfolio ? "Prestations" : "Services"]] : []), ["#apropos", "À propos"], ["#infos", portfolio ? "Contact" : "Infos pratiques"], ...((S.faq ?? []).length ? [["#faq", "Questions"]] : [])];
  const vues = realisations.filter((r) => !cat || r.categorie === cat);
  const reseaux = [["instagram", "Instagram"], ["facebook", "Facebook"]].filter(([k]) => /^https?:\\/\\//.test(inf[k] ?? ""));
  return html\`<div class=\${cls("min-h-screen scroll-smooth", S.fond === "creme" ? "bg-[#FAF7F2]" : "bg-white")}>
  <div class=\${cls(fonce && "text-white")} style=\${fondHero}>
    <header class="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between gap-4"><a href="#" class="flex items-center gap-2.5 font-bold text-lg"><\${Logo} clair=\${fonce}/>\${S.nom}</a>
      <nav class=\${cls("hidden md:flex gap-6 text-sm font-medium", fonce ? "text-white/75" : "text-slate-500")}>\${nav.map(([h, l]) => html\`<a href=\${h} class="hover:opacity-80">\${l}</a>\`)}</nav>
      <div class="flex items-center gap-2">\${inf.telephone && html\`<a href=\${lienTel(inf.telephone)} class=\${cls("hidden sm:inline text-sm font-semibold", fonce ? "text-white" : "text-slate-700")}>\${inf.telephone}</a>\`}<\${Cta} clair=\${hero === "degrade"}/></div></header>
    \${hero === "centre" || hero === "degrade"
      ? html\`<section class="max-w-4xl mx-auto px-5 pt-10 pb-20 text-center"><\${Pastille}/><h1 class="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">\${S.slogan}</h1><p class=\${cls("mt-5 text-lg max-w-2xl mx-auto", fonce ? "text-white/80" : "text-slate-500")}>\${S.pitch}</p><div class="mt-8 flex flex-wrap justify-center gap-3"><\${Cta} grand clair=\${hero === "degrade"}/><a href="#services" class=\${cls("inline-flex items-center rounded-full px-7 py-3.5 text-base font-semibold", fonce ? "bg-white/10 text-white ring-1 ring-white/25" : "bg-white text-slate-800 ring-1 ring-slate-200")}>Voir les services et les prix</a></div>\${ouvertAuj && html\`<p class=\${cls("mt-5 text-sm", fonce ? "text-white/60" : "text-slate-400")}>\${ouvertAuj}\${inf.zone ? " · " + inf.zone : ""}</p>\`}<div class="mt-12 max-w-md mx-auto"><\${Express}/></div></section>\`
      : html\`<section class="max-w-6xl mx-auto px-5 pt-8 pb-20 grid lg:grid-cols-[1.1fr_.9fr] gap-12 items-center"><div><\${Pastille}/><h1 class="mt-5 text-4xl sm:text-[56px] font-extrabold tracking-tight leading-[1.04]">\${S.slogan}</h1><p class=\${cls("mt-5 text-lg", fonce ? "text-white/80" : "text-slate-500")}>\${S.pitch}</p><div class="mt-8 flex flex-wrap gap-3"><\${Cta} grand/><a href="#services" class=\${cls("inline-flex items-center rounded-full px-7 py-3.5 text-base font-semibold", fonce ? "bg-white/10 text-white ring-1 ring-white/25" : "bg-white text-slate-800 ring-1 ring-slate-200")}>Services et prix</a></div></div><\${Express}/></section>\`}
  </div>
  \${(SITE.points_forts ?? []).length > 0 && html\`<section class="py-16"><div class="max-w-6xl mx-auto px-5 grid gap-5 md:grid-cols-3">\${SITE.points_forts.map((p) => html\`<div class="rounded-3xl bg-white p-6 ring-1 ring-slate-200/80"><span class="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--c)]/10 text-[var(--c)]"><\${Icone} nom=\${p.icone || "etoile"}/></span><p class="mt-4 text-lg font-semibold">\${p.titre}</p><p class="mt-1 text-slate-500 leading-relaxed">\${p.texte}</p></div>\`)}</div></section>\`}
  \${portfolio && html\`<section id="realisations" class="py-20 scroll-mt-4"><div class="max-w-6xl mx-auto px-5">\${titreSection("Réalisations", "Quelques projets")}
    \${cats.length > 1 && html\`<div class="mt-6 flex flex-wrap gap-2">\${[["", "Tout"], ...cats.map((c) => [c, c])].map(([k, l]) => html\`<button onClick=\${() => setCat(k)} class=\${cls("rounded-full px-4 py-1.5 text-sm font-semibold", cat === k ? "bg-[var(--c)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>\${l}</button>\`)}</div>\`}
    \${vues.length ? html\`<div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">\${vues.map((r) => html\`<button onClick=\${() => setGrand(r)} class="group overflow-hidden rounded-3xl bg-white text-left ring-1 ring-slate-200/80 transition hover:shadow-xl hover:shadow-slate-900/10">\${r.image ? html\`<img src=\${r.image} alt=\${r.titre} loading="lazy" class="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"/>\` : html\`<div class="grid aspect-[4/3] place-items-center text-5xl font-extrabold text-[var(--c)]/30" style="background:color-mix(in srgb,var(--c) 7%,white)">\${(r.titre ?? "")[0]}</div>\`}<div class="p-5"><p class="font-semibold">\${r.titre}</p>\${r.categorie && html\`<p class="text-sm text-[var(--c)]">\${r.categorie}</p>\`}</div></button>\`)}</div>\`
      : html\`<p class="mt-8 rounded-3xl bg-slate-50 p-8 text-center text-slate-500">Les réalisations arrivent très bientôt. En attendant, parlons de votre projet.</p>\`}</div></section>\`}
  \${grand && html\`<div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4" onClick=\${() => setGrand(null)}><div class="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white" onClick=\${(e) => e.stopPropagation()}>\${grand.image && html\`<img src=\${grand.image} alt=\${grand.titre} class="w-full object-contain"/>\`}<div class="p-6"><div class="flex items-start justify-between gap-4"><div><p class="text-2xl font-bold">\${grand.titre}</p>\${grand.categorie && html\`<p class="text-[var(--c)] font-medium">\${grand.categorie}</p>\`}</div><button onClick=\${() => setGrand(null)} aria-label="Fermer" class="text-3xl leading-none text-slate-400 hover:text-slate-700">×</button></div>\${grand.description && html\`<p class="mt-3 text-slate-600 leading-relaxed">\${grand.description}</p>\`}\${/^https?:\\/\\//.test(grand.lien ?? "") && html\`<a href=\${grand.lien} target="_blank" rel="noopener" class="mt-4 inline-block font-semibold text-[var(--c)]">Voir le projet ↗</a>\`}<div class="mt-5"><a href="#contact" onClick=\${() => setGrand(null)} class="inline-flex rounded-full bg-[var(--c)] px-5 py-2.5 text-sm font-semibold text-white">\${SITE.cta || "Me contacter"}</a></div></div></div></div>\`}
  \${(!portfolio || services.length > 0) && html\`<section id="services" class="py-20 bg-slate-50 scroll-mt-4"><div class="max-w-6xl mx-auto px-5">\${titreSection(portfolio ? "Prestations" : "Services et tarifs", "Ce que je vous propose")}
    <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">\${services.map((s) => html\`<div class="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-slate-200/80 transition hover:shadow-xl hover:shadow-slate-900/5"><div class="flex items-start justify-between gap-3"><p class="text-lg font-semibold leading-snug">\${s.titre}</p>\${s.duree && html\`<span class="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">\${s.duree}</span>\`}</div><p class="mt-2 flex-1 text-slate-500 leading-relaxed">\${s.description}</p><div class="mt-5 flex items-center justify-between gap-3"><p class="text-xl font-extrabold text-[var(--c)]">\${prixS(s)}</p><button onClick=\${() => choisir(s)} class="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold hover:border-[var(--c)] hover:text-[var(--c)]">Choisir</button></div></div>\`)}</div>
    \${!services.length && html\`<p class="mt-8 text-slate-500">Les services arrivent bientôt. Écrivez-moi pour en savoir plus.</p>\`}</div></section>\`}
  \${(SITE.etapes ?? []).length > 0 && html\`<section class="py-20"><div class="max-w-6xl mx-auto px-5">\${titreSection("Simple", "Comment ça se passe")}<div class="mt-10 grid gap-8 md:grid-cols-3">\${SITE.etapes.map((e, i) => html\`<div><span class="fh text-5xl font-extrabold text-[var(--c)]/25">0\${i + 1}</span><p class="mt-2 text-lg font-semibold">\${e.titre}</p><p class="mt-1 text-slate-500">\${e.texte}</p></div>\`)}</div></div></section>\`}
  \${SITE.apropos?.texte && html\`<section id="apropos" class="py-20 scroll-mt-4"><div class="max-w-5xl mx-auto px-5 grid gap-10 md:grid-cols-[.8fr_1.2fr] items-center"><div class="grid aspect-square max-w-xs place-items-center rounded-[2.5rem] text-7xl font-extrabold text-white" style="background:linear-gradient(150deg,var(--c),color-mix(in srgb,var(--c) 55%,#0f172a))">\${(S.nom ?? "S")[0]}</div><div>\${titreSection("À propos", SITE.apropos.titre)}<p class="mt-5 text-lg leading-relaxed text-slate-600 whitespace-pre-line">\${SITE.apropos.texte}</p></div></div></section>\`}
  <section id="infos" class="py-20 bg-slate-50 scroll-mt-4"><div class="max-w-6xl mx-auto px-5">\${titreSection(portfolio ? "Contact" : "Infos pratiques", portfolio ? "Travaillons ensemble" : "Quand et où me trouver")}
    <div class=\${cls("mt-10 grid gap-5", !portfolio && "lg:grid-cols-2")}>
      \${!portfolio && html\`<div class="rounded-3xl bg-white p-6 ring-1 ring-slate-200/80"><p class="font-semibold flex items-center gap-2"><\${Icone} nom="horloge" class="w-5 h-5 text-[var(--c)]"/>Horaires</p><div class="mt-3 divide-y divide-slate-100">\${[1, 2, 3, 4, 5, 6, 7].map((j) => { const h = horaires.find((x) => Number(x.jour) === j); return html\`<div class=\${cls("flex justify-between py-2 text-[15px]", j === auj && "font-semibold text-slate-900")}><span>\${JOURS_S[j]}\${j === auj ? " (aujourd'hui)" : ""}</span><span class=\${h?.ouvert ? "" : "text-slate-400"}>\${h?.ouvert ? heureS(h.debut) + " – " + heureS(h.fin) : "Fermé"}</span></div>\`; })}</div></div>\`}
      <div class="rounded-3xl bg-white p-6 ring-1 ring-slate-200/80"><p class="font-semibold flex items-center gap-2"><\${Icone} nom="carte" class="w-5 h-5 text-[var(--c)]"/>Me joindre</p><div class="mt-3 space-y-3 text-[15px]">
        \${inf.adresse && html\`<p><span class="block text-xs text-slate-400">Adresse</span>\${inf.adresse}</p>\`}
        \${inf.zone && html\`<p><span class="block text-xs text-slate-400">Zone d'intervention</span>\${inf.zone}</p>\`}
        \${inf.telephone && html\`<p><span class="block text-xs text-slate-400">Téléphone</span><a class="font-semibold text-[var(--c)]" href=\${lienTel(inf.telephone)}>\${inf.telephone}</a></p>\`}
        \${inf.email && html\`<p><span class="block text-xs text-slate-400">E-mail</span><a class="font-semibold text-[var(--c)]" href=\${"mailto:" + inf.email}>\${inf.email}</a></p>\`}
        \${reseaux.length > 0 && html\`<p class="flex gap-3">\${reseaux.map(([k, l]) => html\`<a href=\${inf[k]} target="_blank" rel="noopener" class="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium hover:border-[var(--c)]">\${l}</a>\`)}</p>\`}
        <a href="#contact" class="inline-flex rounded-full bg-[var(--c)] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110">\${SITE.cta || "Me contacter"}</a></div></div>
    </div></div></section>
  \${(S.faq ?? []).length > 0 && html\`<section id="faq" class="py-20 scroll-mt-4"><div class="max-w-3xl mx-auto px-5"><h2 class="text-3xl font-bold text-center tracking-tight">Questions fréquentes</h2><div class="mt-8 divide-y divide-slate-200 border-y border-slate-200">\${S.faq.map((x) => html\`<details class="group py-4"><summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">\${x.q}<span class="text-slate-400 group-open:rotate-45 transition text-xl leading-none">+</span></summary><p class="mt-2 text-slate-500">\${x.r}</p></details>\`)}</div></div></section>\`}
  <section id="contact" class="px-5 pb-20 scroll-mt-4"><div class="max-w-5xl mx-auto grid overflow-hidden rounded-[2rem] bg-white ring-1 ring-slate-200 shadow-2xl shadow-slate-900/10 md:grid-cols-[.85fr_1.15fr]">
    <div class="p-8 text-white" style="background:linear-gradient(160deg,var(--c),color-mix(in srgb,var(--c) 50%,#0f172a))"><h2 class="text-3xl font-bold tracking-tight">\${SITE.cta || "Me contacter"}</h2><p class="mt-3 text-white/80">Remplissez ce formulaire : je vous réponds au plus vite\${inf.telephone ? ", ou appelez-moi directement" : ""}.</p>\${inf.telephone && html\`<a href=\${lienTel(inf.telephone)} class="mt-6 inline-block text-2xl font-bold">\${inf.telephone}</a>\`}\${ouvertAuj && html\`<p class="mt-6 text-sm text-white/70">\${ouvertAuj}</p>\`}</div>
    \${envoi ? html\`<div class="grid place-items-center p-10 text-center"><div><span class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><\${Icone} nom="check"/></span><p class="mt-4 text-2xl font-bold">Merci \${envoi} !</p><p class="mt-2 text-slate-500">Votre demande est bien envoyée. Je vous réponds très vite.</p></div></div>\`
      : html\`<form onSubmit=\${envoyer} class="grid gap-3 p-8 sm:grid-cols-2">
        <label class="text-sm font-medium">Votre nom<input required value=\${f.nom} onInput=\${(e) => setF({ ...f, nom: e.target.value })} class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[var(--c)]"/></label>
        <label class="text-sm font-medium">Téléphone<input type="tel" value=\${f.telephone} onInput=\${(e) => setF({ ...f, telephone: e.target.value })} class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[var(--c)]"/></label>
        <label class="text-sm font-medium sm:col-span-2">E-mail<input type="email" value=\${f.email} onInput=\${(e) => setF({ ...f, email: e.target.value })} class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[var(--c)]"/></label>
        \${services.length > 0 && html\`<label class=\${cls("text-sm font-medium", !avecDate && "sm:col-span-2")}>Service<select value=\${f.service} onChange=\${(e) => setF({ ...f, service: e.target.value })} class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[var(--c)]"><option value="">Choisir…</option>\${services.map((s) => html\`<option value=\${s.titre}>\${s.titre}</option>\`)}</select></label>\`}
        \${avecDate && html\`<label class="text-sm font-medium">Date souhaitée<input type="date" min=\${new Date().toISOString().slice(0, 10)} value=\${f.date_souhaitee} onInput=\${(e) => setF({ ...f, date_souhaitee: e.target.value })} class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[var(--c)]"/></label>\`}
        <label class="text-sm font-medium sm:col-span-2">\${SITE.demande === "devis" ? "Votre besoin" : "Message"}<textarea rows="4" value=\${f.message} onInput=\${(e) => setF({ ...f, message: e.target.value })} placeholder=\${SITE.demande === "devis" ? "Décrivez votre projet : ce qu'il faut faire, où, pour quand…" : ""} class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[var(--c)]"></textarea></label>
        <input tabindex="-1" autocomplete="off" aria-hidden="true" value=\${f.site_web} onInput=\${(e) => setF({ ...f, site_web: e.target.value })} style="position:absolute;left:-9999px;width:1px;height:1px"/>
        \${err && html\`<p class="text-sm text-red-600 sm:col-span-2">\${err}</p>\`}
        <div class="sm:col-span-2 flex flex-wrap items-center gap-3"><button type="submit" disabled=\${busy} class="rounded-full bg-[var(--c)] px-7 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-60">\${busy ? "Envoi…" : "Envoyer ma demande"}</button><p class="text-xs text-slate-400">Vos coordonnées servent seulement à vous répondre. <button type="button" class="underline" onClick=\${() => bus.emit("doc", "confidentialite")}>En savoir plus</button></p></div>
      </form>\`}
  </div></section>
  <footer class="border-t border-slate-100"><div class="max-w-6xl mx-auto px-5 py-8 text-sm text-slate-400 flex flex-wrap items-center justify-between gap-3"><span class="flex items-center gap-2 font-semibold text-slate-600"><\${Logo} taille="w-6 h-6"/>\${S.nom}</span><\${LiensLegaux}/><span class="flex items-center gap-4"><button onClick=\${() => onAuth("login")} class="hover:text-slate-700 hover:underline">Espace gérant</button><span>Site créé avec Bingoo!</span></span></div></footer>
</div>\`;
}

// Page de lancement : un produit ou un projet à venir, on recueille les e-mails des intéressés
function SiteLancement({ onAuth }) {
  const [d, setD] = useState(null), [f, setF] = useState({ prenom: "", email: "", site_web: "" }), [ok, setOk] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  useEffect(() => { if (!B.apercu) call("vue", { variante: "A", source: B.source }).catch(() => {}); call("site-info").then(setD, () => setD({})); }, []);
  const L = SITE.lancement ?? {}, inf = d?.infos ?? {};
  const hero = STY.hero ?? "degrade", fonce = hero === "sombre" || hero === "degrade" || hero === "cote";
  const inscrire = async (e) => { e.preventDefault(); setErr(""); if (!/^[^@\\s]+@[^@\\s]+\\.[a-z]{2,}$/i.test(f.email.trim())) { setErr("Adresse e-mail invalide."); return; } setBusy(true); try { await call("site-contact", { data: f, source: B.source }); setOk(true); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  const Form = ({ clair }) => ok ? html\`<div class=\${cls("rounded-2xl px-5 py-4 font-semibold", clair ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-700")}>C'est noté\${f.prenom ? ", " + f.prenom : ""} ! Vous serez parmi les premiers prévenus.</div>\`
    : html\`<form onSubmit=\${inscrire} class="flex w-full max-w-xl flex-col gap-2 sm:flex-row"><input value=\${f.prenom} onInput=\${(e) => setF({ ...f, prenom: e.target.value })} placeholder="Prénom" class="rounded-full border border-slate-200 bg-white px-5 py-3.5 text-slate-900 outline-none focus:border-[var(--c)] sm:w-36"/><input type="email" required value=\${f.email} onInput=\${(e) => setF({ ...f, email: e.target.value })} placeholder="Votre e-mail" class="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-5 py-3.5 text-slate-900 outline-none focus:border-[var(--c)]"/><input tabindex="-1" autocomplete="off" aria-hidden="true" value=\${f.site_web} onInput=\${(e) => setF({ ...f, site_web: e.target.value })} style="position:absolute;left:-9999px;width:1px;height:1px"/><button disabled=\${busy} class=\${cls("rounded-full px-6 py-3.5 font-semibold transition hover:brightness-110 disabled:opacity-60", clair ? "bg-white text-slate-900" : "bg-[var(--c)] text-white")}>\${busy ? "…" : SITE.cta || "Être prévenu"}</button></form>\`;
  const Err = ({ clair }) => err ? html\`<p class=\${cls("mt-2 text-sm", clair ? "text-white/90" : "text-red-600")}>\${err}</p>\` : null;
  return html\`<div class="min-h-screen bg-white">
    <div class="text-white" style="background-image:radial-gradient(1200px 520px at 80% -10%,rgba(255,255,255,.22),transparent),linear-gradient(160deg,var(--c),#0f172a)">
      <header class="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between"><span class="flex items-center gap-2.5 font-bold text-lg"><\${Logo} clair/>\${S.nom}</span><span class="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">\${L.quand || "Bientôt"}</span></header>
      <section class="max-w-4xl mx-auto px-5 pt-14 pb-24 text-center"><p class="inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">\${SITE.metier}</p><h1 class="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.04]">\${S.slogan}</h1><p class="mt-5 text-lg text-white/80 max-w-2xl mx-auto">\${S.pitch}</p>
        <div class="mt-9 flex flex-col items-center"><\${Form} clair/><\${Err} clair/>\${L.offre && !ok && html\`<p class="mt-4 text-sm font-semibold text-white">🎁 \${L.offre}</p>\`}\${d?.inscrits ? html\`<p class="mt-3 text-sm text-white/70">Déjà \${d.inscrits} personnes inscrites</p>\` : null}</div></section>
    </div>
    \${(SITE.points_forts ?? []).length > 0 && html\`<section class="py-20"><div class="max-w-6xl mx-auto px-5"><h2 class="text-3xl sm:text-4xl font-bold text-center tracking-tight">Ce qui change pour vous</h2><div class="mt-10 grid gap-5 md:grid-cols-3">\${SITE.points_forts.map((p) => html\`<div class="rounded-3xl bg-slate-50 p-7"><span class="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--c)]/10 text-[var(--c)]"><\${Icone} nom=\${p.icone || "etoile"}/></span><p class="mt-4 text-lg font-semibold">\${p.titre}</p><p class="mt-1 text-slate-500 leading-relaxed">\${p.texte}</p></div>\`)}</div></div></section>\`}
    \${(SITE.etapes ?? []).length > 0 && html\`<section class="py-20 bg-slate-50"><div class="max-w-6xl mx-auto px-5"><h2 class="text-3xl sm:text-4xl font-bold text-center tracking-tight">Comment ça marche</h2><div class="mt-10 grid gap-8 md:grid-cols-3">\${SITE.etapes.map((e, i) => html\`<div><span class="fh text-5xl font-extrabold text-[var(--c)]/25">0\${i + 1}</span><p class="mt-2 text-lg font-semibold">\${e.titre}</p><p class="mt-1 text-slate-500">\${e.texte}</p></div>\`)}</div></div></section>\`}
    \${SITE.apropos?.texte && html\`<section class="py-20"><div class="max-w-3xl mx-auto px-5 text-center"><h2 class="text-3xl font-bold tracking-tight">\${SITE.apropos.titre}</h2><p class="mt-5 text-lg leading-relaxed text-slate-600">\${SITE.apropos.texte}</p></div></section>\`}
    \${(S.faq ?? []).length > 0 && html\`<section class="py-20 bg-slate-50"><div class="max-w-3xl mx-auto px-5"><h2 class="text-3xl font-bold text-center tracking-tight">Questions fréquentes</h2><div class="mt-8 divide-y divide-slate-200 border-y border-slate-200">\${S.faq.map((x) => html\`<details class="group py-4"><summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">\${x.q}<span class="text-slate-400 group-open:rotate-45 transition text-xl leading-none">+</span></summary><p class="mt-2 text-slate-500">\${x.r}</p></details>\`)}</div></div></section>\`}
    <section class="px-5 py-20"><div class="max-w-4xl mx-auto rounded-[2rem] px-8 py-14 text-center text-white" style="background:linear-gradient(160deg,var(--c),color-mix(in srgb,var(--c) 50%,#0f172a))"><h2 class="text-3xl sm:text-4xl font-bold tracking-tight">Soyez prévenu en premier</h2><p class="mt-3 text-white/80">Un e-mail le jour du lancement, rien d'autre.</p><div class="mt-7 flex flex-col items-center"><\${Form} clair/><\${Err} clair/></div></div></section>
    <footer class="border-t border-slate-100"><div class="max-w-6xl mx-auto px-5 py-8 text-sm text-slate-400 flex flex-wrap items-center justify-between gap-3"><span class="flex items-center gap-2 font-semibold text-slate-600"><\${Logo} taille="w-6 h-6"/>\${S.nom}</span><\${LiensLegaux}/><span class="flex items-center gap-4">\${inf.email && html\`<a href=\${"mailto:" + inf.email} class="hover:text-slate-700">\${inf.email}</a>\`}<button onClick=\${() => onAuth("login")} class="hover:text-slate-700 hover:underline">Espace gérant</button><span>Site créé avec Bingoo!</span></span></div></footer>
  </div>\`;
}

function Auth({ mode: m0, onDone, onBack }) {
  const [mode, setMode] = useState(m0 === "login" ? "login" : "signup");
  const [f, setF] = useState({ email: "", password: "", nom: "" }), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(""); try { onDone(await call(mode, { ...f, variante: VARIANTE, source: B.source, invite: mode === "signup" ? B.invite : null })); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return html\`<div class="min-h-screen grid place-items-center p-5 bg-slate-50"><form onSubmit=\${submit} class="anim w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
    <button type="button" onClick=\${onBack} class="text-sm text-slate-400 hover:text-slate-700">← \${S.nom}</button>
    <h1 class="text-xl font-bold">\${S.type === "site" && !B.invite ? (mode === "signup" ? "Créer votre accès gérant" : "Espace gérant") : mode === "signup" ? (B.invite ? "Rejoignez votre équipe" : "Créez votre compte") : "Content de vous revoir"}</h1>
    \${S.type === "site" && !B.invite && html\`<p class="text-sm text-slate-500">\${mode === "signup" ? "La première fois, créez votre accès avec l'adresse e-mail de votre compte Bingoo!." : "Vos demandes, vos services, vos horaires et vos coordonnées."}</p>\`}
    \${B.invite && mode === "signup" && html\`<p class="text-sm text-slate-500">Vous avez été invité sur \${S.nom}. Créez votre compte pour retrouver les données de votre équipe.</p>\`}
    \${mode === "signup" && html\`<\${ui.Input} label="Votre nom" value=\${f.nom} onInput=\${(v) => setF({ ...f, nom: v })}/>\`}
    <\${ui.Input} label="E-mail" type="email" required value=\${f.email} onInput=\${(v) => setF({ ...f, email: v })}/>
    <\${ui.Input} label="Mot de passe" type="password" required value=\${f.password} onInput=\${(v) => setF({ ...f, password: v })} placeholder=\${mode === "signup" ? "8 caractères au moins" : ""}/>
    \${err && html\`<p class="text-sm text-red-600">\${err}</p>\`}
    <\${ui.Button} type="submit" class="w-full !py-2.5" disabled=\${busy}>\${busy ? "…" : mode === "signup" ? "Créer mon compte" : "Se connecter"}</\${ui.Button}>
    \${mode === "signup" && S.type !== "site" && html\`<p class="text-xs text-slate-400 text-center">En créant votre compte, vous acceptez les <button type="button" class="underline" onClick=\${() => bus.emit("doc", "cgv")}>conditions générales</button> et la <button type="button" class="underline" onClick=\${() => bus.emit("doc", "confidentialite")}>politique de confidentialité</button>.</p>\`}
    <p class="text-sm text-center text-slate-500">\${mode === "signup" ? "Déjà un compte ? " : S.type === "site" ? "Première fois ? " : "Pas encore de compte ? "}<button type="button" class="font-semibold text-[var(--c)]" onClick=\${() => setMode(mode === "signup" ? "login" : "signup")}>\${mode === "signup" ? "Se connecter" : S.type === "site" ? "Créer mon accès" : "Créer un compte"}</button></p>
  </form></div>\`;
}

// ---------------------------------------------------------------- Avant la construction : liste d'attente et précommandes
function Precommande() {
  const V = B.validation, f = S.formules ?? [];
  const [email, setEmail] = useState(""), [busy, setBusy] = useState(null), [fait, setFait] = useState(false), [merci, setMerci] = useState(null);
  useEffect(() => {
    if (!B.apercu) call("vue", { source: B.source }).catch(() => {});
    if (B.precommande) call("precommande-ok", { session: B.precommande }).then((r) => setMerci(!!r.paye), () => setMerci(false));
  }, []);
  const rejoindre = async (e) => { e.preventDefault(); setBusy("liste"); try { await call("liste", { email, source: B.source }); setFait(true); } catch (x) { toast(x.message, "bad"); } finally { setBusy(null); } };
  const precommander = async (i) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast("Indiquez d'abord votre e-mail, juste au-dessus", "bad"); document.getElementById("pc-email")?.focus(); return; }
    setBusy(i); try { allerVers((await call("precommande", { email, formule: i, retour: RETOUR(), source: B.source })).url); } catch (x) { toast(x.message, "bad"); setBusy(null); }
  };
  const remise = Number(V.remise ?? 0), reduit = (p) => Math.round(Number(p) * (1 - remise / 100) * 100) / 100;
  return html\`<div class="bg-white min-h-screen">
  <header class="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between"><div class="flex items-center gap-2 font-bold text-lg"><span class="w-8 h-8 rounded-xl bg-[var(--c)] text-white grid place-items-center">\${(S.nom ?? "S")[0]}</span>\${S.nom}</div><span class="text-sm text-slate-500">Ouverture bientôt</span></header>
  \${merci !== null && html\`<div class="max-w-3xl mx-auto px-5"><div class=\${cls("rounded-2xl px-5 py-4 text-sm", merci ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800")}>\${merci ? "Merci ! Votre précommande est confirmée : vous serez parmi les tout premiers à utiliser " + S.nom + ", au prix réservé." : "Le paiement n'a pas abouti : vous pouvez réessayer ci-dessous."}</div></div>\`}
  <section class="max-w-4xl mx-auto px-5 pt-12 pb-14 text-center"><p class="inline-block rounded-full bg-[var(--c)]/10 text-[var(--c)] px-3 py-1 text-sm font-semibold">Bientôt disponible\${remise ? " · -" + remise + " % pour les premiers" : ""}</p>
    <h1 class="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">\${S.slogan || S.pitch}</h1>
    <p class="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">\${S.pitch}</p>
    \${fait ? html\`<p class="mt-8 inline-block rounded-xl bg-emerald-50 text-emerald-800 px-5 py-3">C'est noté : on vous prévient dès l'ouverture.</p>\` : html\`<form onSubmit=\${rejoindre} class="mt-8 mx-auto flex max-w-md flex-col sm:flex-row gap-2"><input id="pc-email" type="email" required value=\${email} onInput=\${(e) => setEmail(e.target.value)} placeholder="votre@email.fr" class="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--c)]"/><\${ui.Button} type="submit" class="!px-6 !py-3" disabled=\${busy !== null}>\${busy === "liste" ? "…" : "Me prévenir"}</\${ui.Button}></form>\`}
    \${V.inscrits >= 5 && html\`<p class="mt-3 text-sm text-slate-400">\${V.inscrits} personnes attendent déjà l'ouverture</p>\`}
  </section>
  \${S.probleme && html\`<section class="bg-slate-50 py-14"><div class="max-w-3xl mx-auto px-5 text-center"><p class="text-sm font-semibold text-[var(--c)] uppercase tracking-wide">Le problème</p><p class="mt-3 text-2xl font-semibold leading-snug">\${S.probleme}</p></div></section>\`}
  \${ATOUTS.length > 0 && html\`<section class="max-w-6xl mx-auto px-5 py-16"><h2 class="text-3xl font-bold text-center">Ce que \${S.nom} va faire pour vous</h2><div class="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">\${S.atouts.map((a) => html\`<div class="rounded-2xl border border-slate-200 p-5"><p class="font-semibold">\${a.titre}</p><p class="mt-1 text-sm text-slate-500">\${a.texte}</p></div>\`)}</div></section>\`}
  \${f.length > 0 && PAY.actif && html\`<section class="bg-slate-50 py-16"><div class="max-w-5xl mx-auto px-5"><h2 class="text-3xl font-bold text-center">Réservez votre prix de lancement</h2><p class="mt-2 text-center text-slate-500">\${UNIQUE ? "Paiement unique, accès à vie." : "Vous payez votre premier mois aujourd'hui, avec la remise des premiers clients."}</p>
    <div class=\${"mt-10 grid gap-4 " + (f.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2")}>\${f.map((x, i) => html\`<div class="rounded-2xl p-5 border bg-white border-slate-200"><p class="font-semibold">\${x.nom}</p><p class="mt-1"><span class="text-3xl font-extrabold">\${fmt.eur(reduit(x.prix))}</span>\${remise ? html\` <span class="text-slate-400 line-through">\${fmt.eur(x.prix)}</span>\` : ""}<span class="text-sm text-slate-400">\${UNIQUE ? " une fois" : " le 1er mois"}</span></p><p class="text-sm text-slate-500">\${x.pour}</p><ul class="mt-3 space-y-1.5 text-sm">\${(x.inclus ?? []).map((t) => html\`<li class="flex gap-2"><span class="text-[var(--c)]"><\${Icone} nom="check" class="w-4 h-4"/></span>\${t}</li>\`)}</ul><\${ui.Button} class="w-full mt-5" disabled=\${busy !== null} onClick=\${() => precommander(i)}>\${busy === i ? "Redirection…" : "Précommander"}</\${ui.Button}></div>\`)}</div></div></section>\`}
  <footer class="max-w-6xl mx-auto px-5 py-10 text-sm text-slate-400 flex justify-between"><span>© \${new Date().getFullYear()} \${S.nom}</span><span>Construit avec Bingoo!</span></footer></div>\`;
}

// ---------------------------------------------------------------- Abonnement
function Formules({ courante }) {
  const [busy, setBusy] = useState(null), f = S.formules ?? [];
  const payer = async (i) => { setBusy(i); try { allerVers((await call("checkout", { formule: i, retour: RETOUR() })).url); } catch (x) { toast(x.message, "bad"); setBusy(null); } };
  return html\`<div class=\${"grid gap-4 " + (f.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2")}>\${f.map((x, i) => html\`<div class=\${cls("rounded-2xl p-5 border bg-white", courante === x.nom ? "border-[var(--c)] ring-2 ring-[var(--c)]/20" : "border-slate-200")}><p class="font-semibold">\${x.nom}</p><p class="mt-1 text-3xl font-extrabold">\${fmt.eur(prixDe(x.prix))}<span class="text-sm font-normal text-slate-400">\${UNIQUE ? " une fois" : " /mois"}</span></p><p class="text-sm text-slate-500">\${x.pour}</p><ul class="mt-3 space-y-1.5 text-sm">\${(x.inclus ?? []).map((t) => html\`<li class="flex gap-2"><span class="text-[var(--c)]"><\${Icone} nom="check" class="w-4 h-4"/></span>\${t}</li>\`)}</ul><\${ui.Button} class="w-full mt-5" disabled=\${busy !== null || courante === x.nom} onClick=\${() => payer(i)}>\${courante === x.nom ? "Votre formule" : busy === i ? "Redirection…" : "Choisir"}</\${ui.Button}></div>\`)}</div>\`;
}
const jours = (iso) => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 864e5));
function Abonnement({ etat }) {
  const ab = etat.abonnement, actif = ["active", "trialing", "past_due"].includes(ab?.statut);
  const [busy, setBusy] = useState(false);
  const portail = async () => { setBusy(true); try { allerVers((await call("portail", { retour: RETOUR() })).url); } catch (x) { toast(x.message, "bad"); setBusy(false); } };
  if (UNIQUE) return html\`<\${ui.Page} titre="Mon accès" sous=\${actif ? "Accès à vie" + (ab.formule ? " · " + ab.formule : "") : etat.acces ? "Essai gratuit : " + jours(etat.essai_fin) + " jour(s) restant(s)" : "Votre essai est terminé"}>\${!actif && html\`<\${Formules} courante=\${null}/>\`}\${actif && html\`<p class="text-slate-600">Merci ! Votre accès est débloqué pour toujours.</p>\`}<p class="mt-4 text-xs text-slate-400">Paiement unique et sécurisé par Stripe : pas d'abonnement, rien à résilier.</p></\${ui.Page}>\`;
  return html\`<\${ui.Page} titre="Mon abonnement" sous=\${actif ? "Formule " + (ab.formule ?? "") + (ab.fin_periode ? (ab.annule ? " · se termine le " : " · prochain paiement le ") + fmt.date(ab.fin_periode) : "") : etat.acces ? "Essai gratuit : " + jours(etat.essai_fin) + " jour(s) restant(s)" : "Votre essai est terminé"}>
    \${ab?.statut === "past_due" && html\`<div class="mb-4 rounded-xl bg-amber-50 text-amber-800 px-4 py-3 text-sm">Le dernier paiement n'est pas passé : mets à jour votre carte pour garder l'accès.</div>\`}
    \${actif && html\`<div class="mb-6"><\${ui.Button} variant="secondary" icone="carte" disabled=\${busy} onClick=\${portail}>Factures, carte et résiliation</\${ui.Button}></div>\`}
    <\${Formules} courante=\${actif ? ab.formule : null}/>
    <p class="mt-4 text-xs text-slate-400">Paiement sécurisé par Stripe. Sans engagement : vous pouvez résilier à tout moment.</p>
  </\${ui.Page}>\`;
}
function Paywall({ etat, onLogout }) {
  return html\`<div class="min-h-screen bg-slate-50 p-5 sm:p-10"><div class="max-w-4xl mx-auto"><div class="flex items-center justify-between mb-8"><div class="flex items-center gap-2 font-bold"><span class="w-8 h-8 rounded-xl bg-[var(--c)] text-white grid place-items-center">\${(S.nom ?? "S")[0]}</span>\${S.nom}</div><\${ui.Button} variant="ghost" icone="sortie" onClick=\${onLogout}>Se déconnecter</\${ui.Button}></div>
    <h1 class="text-3xl font-extrabold tracking-tight">Votre essai est terminé</h1><p class="text-slate-500 mt-1 mb-8">Vos données vous attendent : choisissez une formule pour continuer à utiliser \${S.nom}.</p>
    <\${Formules}/></div></div>\`;
}

// ---------------------------------------------------------------- Équipe : invitations, rôles, places de la formule
const ROLE_TXT = { admin: "Administrateur", membre: "Membre", lecture: "Lecture seule" };
function Equipe({ user }) {
  const [d, setD] = useState(null), [lien, setLien] = useState(""), [f, setF] = useState({ email: "", role: "membre" }), [busy, setBusy] = useState(false);
  const charger = () => call("equipe").then(setD, (x) => toast(x.message, "bad"));
  useEffect(() => { charger(); }, []);
  const admin = d?.role === "admin";
  const inviter = async (e) => {
    e?.preventDefault(); setBusy(true);
    try {
      const { code } = await call("inviter", { email: f.email, role: f.role, retour: RETOUR() });
      const u = RETOUR(); setLien(u + (u.includes("?") ? "&" : "?") + "invite=" + code);
      toast(f.email ? "Invitation envoyée à " + f.email : "Lien d'invitation prêt"); setF({ ...f, email: "" }); charger();
    } catch (x) { toast(x.message, "bad"); } finally { setBusy(false); }
  };
  const act = async (a, body, msg) => { try { await call(a, body); if (msg) toast(msg); charger(); } catch (x) { toast(x.message, "bad"); } };
  const membres = d?.membres ?? [];
  return html\`<\${ui.Page} titre="Équipe" sous=\${d ? membres.length + " membre" + (membres.length > 1 ? "s" : "") + (d.places != null ? " sur " + d.places + " place" + (d.places > 1 ? "s" : "") + " de votre formule" : "") : ""}>
    \${admin && html\`<\${ui.Card} class="mb-4" titre="Inviter quelqu'un">
      <form onSubmit=\${inviter} class="grid sm:grid-cols-[1fr_180px_auto] gap-2 items-end">
        <\${ui.Input} label="E-mail (facultatif : sinon, un lien à envoyer vous-même)" type="email" value=\${f.email} onInput=\${(v) => setF({ ...f, email: v })} placeholder="camille@entreprise.fr"/>
        <\${ui.Select} label="Rôle" value=\${f.role} onChange=\${(v) => setF({ ...f, role: v })} options=\${[["membre", "Membre"], ["lecture", "Lecture seule"], ["admin", "Administrateur"]]}/>
        <\${ui.Button} type="submit" icone="plus" disabled=\${busy}>\${f.email ? "Envoyer l'invitation" : "Créer un lien"}</\${ui.Button}>
      </form>
      \${lien && html\`<div class="mt-3 flex gap-2"><input readonly value=\${lien} class="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50" onFocus=\${(e) => e.target.select()}/><\${ui.Button} variant="secondary" onClick=\${() => { try { navigator.clipboard.writeText(lien); toast("Lien copié"); } catch (e) { toast("Sélectionne le lien pour le copier"); } }}>Copier</\${ui.Button}></div><p class="text-xs text-slate-500 mt-1">Lien à usage unique, valable 14 jours.</p>\`}
      <p class="text-xs text-slate-500 mt-3"><b>Membre</b> : voit et modifie tout. <b>Lecture seule</b> : voit tout, ne modifie rien. <b>Administrateur</b> : invite, gère l'équipe et l'abonnement.</p>
    </\${ui.Card}>\`}
    \${admin && (d?.invitations ?? []).length > 0 && html\`<\${ui.Card} class="mb-4" titre="Invitations en attente">\${d.invitations.map((i) => html\`<div class="flex items-center justify-between gap-3 py-2 border-t border-slate-100 first:border-0 text-sm"><span>\${i.email || "Lien d'invitation"} · <\${ui.Badge}>\${ROLE_TXT[i.role] ?? i.role}</\${ui.Badge}> <span class="text-slate-400">\${fmt.date(i.at)}</span></span><\${ui.Button} variant="ghost" onClick=\${() => act("revoquer", { code: i.code }, "Invitation annulée")}>Annuler</\${ui.Button}></div>\`)}</\${ui.Card}>\`}
    <\${ui.Card}>\${d === null ? html\`<\${ui.Loading}/>\` : html\`<\${ui.Table} colonnes=\${[
      { cle: "nom", label: "Nom", rendu: (x) => html\`<span class="font-medium">\${x.nom}</span>\${x.moi ? html\` <\${ui.Badge}>vous</\${ui.Badge}>\` : null}\${x.titulaire ? html\` <\${ui.Badge} couleur="violet">titulaire</\${ui.Badge}>\` : null}\` },
      { cle: "email", label: "E-mail" },
      { cle: "role", label: "Rôle", rendu: (x) => admin && !x.titulaire ? html\`<select class="rounded-lg border border-slate-200 px-2 py-1 text-sm" value=\${x.role} onChange=\${(e) => act("role", { id: x.id, role: e.target.value }, "Rôle modifié")}>\${["admin", "membre", "lecture"].map((r) => html\`<option value=\${r}>\${ROLE_TXT[r]}</option>\`)}</select>\` : html\`<\${ui.Badge} couleur=\${x.role === "admin" ? "violet" : x.role === "lecture" ? "gris" : "bleu"}>\${ROLE_TXT[x.role] ?? x.role}</\${ui.Badge}>\` },
      { cle: "vu_at", label: "Dernière visite", rendu: (x) => fmt.date(x.vu_at) },
      { cle: "id", label: "", rendu: (x) => admin && !x.titulaire && !x.moi ? html\`<\${ui.Button} variant="ghost" onClick=\${async () => (await demander("Retirer " + x.nom + " de l'équipe ?", { ok: "Retirer", danger: true })) && act("retirer", { id: x.id }, "Membre retiré")}>Retirer</\${ui.Button}>\` : null },
    ]} lignes=\${membres}/>\`}</\${ui.Card}>
    \${d && !membres.find((m) => m.moi)?.titulaire && html\`<div class="mt-4"><\${ui.Button} variant="ghost" onClick=\${async () => { if (!await demander("Quitter l'équipe ? Vous retrouverez un espace vide, à vous.", { ok: "Quitter", danger: true })) return; try { await call("quitter"); location.reload(); } catch (x) { toast(x.message, "bad"); } }}>Quitter l'équipe</\${ui.Button}></div>\`}
  </\${ui.Page}>\`;
}

// ---------------------------------------------------------------- Mon compte : nom et mot de passe
function Compte({ user }) {
  const [nom, setNom] = useState(user.nom ?? ""), [p, setP] = useState({ ancien: "", nouveau: "" });
  const demo = /@demo\\.local$/.test(user.email);
  return html\`<\${ui.Page} titre="Mon compte" sous=\${demo ? "Compte de démonstration" : user.email}>
    <div class="grid md:grid-cols-2 gap-4">
      <\${ui.Card} titre="Mon nom"><form class="space-y-3" onSubmit=\${async (e) => { e.preventDefault(); try { await call("compte", { nom }); toast("Nom enregistré"); } catch (x) { toast(x.message, "bad"); } }}><\${ui.Input} label="Nom affiché" value=\${nom} onInput=\${setNom}/><\${ui.Button} type="submit">Enregistrer</\${ui.Button}></form></\${ui.Card}>
      \${!demo && html\`<\${ui.Card} titre="Mot de passe"><form class="space-y-3" onSubmit=\${async (e) => { e.preventDefault(); try { await call("motdepasse", p); setP({ ancien: "", nouveau: "" }); toast("Mot de passe changé"); } catch (x) { toast(x.message, "bad"); } }}><\${ui.Input} label="Mot de passe actuel" type="password" value=\${p.ancien} onInput=\${(v) => setP({ ...p, ancien: v })}/><\${ui.Input} label="Nouveau mot de passe" type="password" value=\${p.nouveau} onInput=\${(v) => setP({ ...p, nouveau: v })} placeholder="8 caractères au moins"/><\${ui.Button} type="submit">Changer</\${ui.Button}></form></\${ui.Card}>\`}
    </div>
    <div class="mt-6 text-sm text-slate-400"><\${LiensLegaux}/></div>
  </\${ui.Page}>\`;
}

// ---------------------------------------------------------------- Démo animée : l'app se présente toute seule, écran par écran
function Tour({ onFin }) {
  // Les pages publiques (réservation…) ne s'ouvrent pas depuis l'application : la visite ne passe que par ses écrans
  const ECRANS_V = ECRANS.filter((e) => !e.public);
  const [i, setI] = useState(0), [pause, setPause] = useState(false), barre = useRef(null);
  useEffect(() => { nav(ECRANS_V[0]?.id); }, []);
  // Le visiteur clique ou tape dans l'application : la visite s'arrête et le laisse essayer (elle ne lui reprend jamais l'écran)
  useEffect(() => {
    const stop = (ev) => { if (!barre.current?.contains(ev.target)) setPause(true); };
    document.addEventListener("pointerdown", stop, true); document.addEventListener("keydown", stop, true);
    return () => { document.removeEventListener("pointerdown", stop, true); document.removeEventListener("keydown", stop, true); };
  }, []);
  useEffect(() => {
    if (pause) return;
    const t = setTimeout(() => { const n = i + 1; if (n >= ECRANS_V.length) { setPause(true); return; } nav(ECRANS_V[n]?.id); setI(n); }, 4500);
    return () => clearTimeout(t);
  }, [i, pause]);
  // La barre de la visite est fixée en haut : on décale la page d'autant, pour ne jamais cacher le titre de l'écran
  useEffect(() => { const b = document.body.style; const avant = b.paddingTop; b.paddingTop = "56px"; return () => { b.paddingTop = avant; }; }, []);
  const e = ECRANS_V[i];
  return html\`<div ref=\${barre} class="fixed top-0 inset-x-0 z-50">\${pause ? null : html\`<div class="h-1 bg-[var(--c)]/20"><div key=\${i} class="h-1 bg-[var(--c)]" style="animation:barre 4.5s linear forwards"/></div>\`}
    <div class="mx-auto mt-3 w-fit max-w-[calc(100vw-2rem)] flex items-center gap-3 rounded-full bg-slate-900/90 text-white pl-4 pr-1.5 py-1.5 shadow-xl text-sm">
      <span class="truncate">\${pause ? html\`<b>Démo</b> — essayez librement, c'est un espace d'essai : aucun e-mail ne part\` : html\`<b>\${i + 1}/\${ECRANS_V.length} · \${e?.titre}</b>\${e?.but ? " — " + e.but : ""}\`}</span>
      \${pause && i < ECRANS_V.length - 1 ? html\`<button onClick=\${() => setPause(false)} class="shrink-0 rounded-full bg-white/15 px-3 py-1.5">Reprendre la visite</button>\` : null}
      <button onClick=\${onFin} class="shrink-0 rounded-full bg-[var(--c)] px-3 py-1.5 font-semibold">Essayer gratuitement</button></div></div>\`;
}

function Appli({ user, etat, onLogout, tour, onFinTour }) {
  const PRIVES = ECRANS.filter((e) => !e.public), PUBLIQUES = ECRANS.filter((e) => e.public);
  const [cur, setCur] = useState({ id: PRIVES.some((e) => e.id === B.ecran) ? B.ecran : PRIVES[0]?.id, params: null }), [menu, setMenu] = useState(false), [toasts, setToasts] = useState([]);
  nav = (id, params = null) => { if (id === "_abonnement" || id === "_equipe" || id === "_compte" || id === "_donnees" || PRIVES.some((e) => e.id === id)) { setCur({ id, params }); setMenu(false); } };
  useEffect(() => bus.on("toast", (t) => { setToasts((x) => [...x, t]); setTimeout(() => setToasts((x) => x.filter((y) => y.id !== t.id)), 3000); }), []);
  window.__bingooEcran = cur.id; // l'atelier sait sur quel écran un texte a été cliqué
  const E = cur.id === "_abonnement" ? { id: "_abonnement", titre: "Mon abonnement", Comp: Abonnement } : cur.id === "_equipe" ? { id: "_equipe", titre: "Équipe", Comp: Equipe } : cur.id === "_compte" ? { id: "_compte", titre: "Mon compte", Comp: Compte } : cur.id === "_donnees" ? { id: "_donnees", titre: "Mes données", Comp: Donnees } : PRIVES.find((e) => e.id === cur.id) ?? PRIVES[0];
  if (!etat.acces) return html\`<\${Paywall} etat=\${etat} onLogout=\${onLogout}/>\`;
  const lienPage = (e) => (B.retour || location.href.split("?")[0]).split("?")[0] + "?page=" + e.id + "&e=" + etat.espace;
  const Agenda = () => S.agenda?.collection ? html\`<button class="w-full text-left rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2" onClick=\${async () => { try { const u = await lienAgenda(); try { await navigator.clipboard.writeText(u); toast("Lien copié : colle-le dans Google Agenda (Autres agendas → À partir de l'URL) ou Outlook"); } catch (x) { prompt("Collez ce lien dans votre agenda (Google Agenda : Autres agendas → À partir de l'URL) :", u); } } catch (x) { toast(x.message, "bad"); } }}><\${Icone} nom="agenda" class="w-4 h-4"/>Ajouter à mon agenda</button>\` : null;
  const Partage = () => PUBLIQUES.length && etat.espace ? html\`<div class="rounded-xl bg-slate-50 p-3 text-sm"><p class="text-xs font-semibold text-slate-500 mb-1.5">À partager à vos clients</p>\${PUBLIQUES.map((e) => html\`<div class="flex items-center gap-1.5 py-1"><a href=\${lienPage(e)} target="_blank" rel="noopener" class="flex-1 truncate font-medium text-[var(--c)] hover:underline">\${e.titre} ↗</a><button title="Copier le lien" class="text-slate-400 hover:text-slate-700" onClick=\${() => { try { navigator.clipboard.writeText(lienPage(e)).then(() => toast("Lien copié"), () => prompt("Copiez ce lien :", lienPage(e))); } catch (x) { prompt("Copiez ce lien :", lienPage(e)); } }}>⧉</button></div>\`)}</div>\` : null;
  const Nav = () => html\`<nav class="space-y-0.5">\${[...PRIVES, { id: "_equipe", titre: "Équipe", icone: "contacts", sep: true }, ...((S.collections ?? []).length ? [{ id: "_donnees", titre: "Mes données", icone: "fichier" }] : [])].map((e) => html\`<button onClick=\${() => nav(e.id)} class=\${cls("w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium", e.sep && "mt-3", e.id === E?.id ? (MENU_FONCE ? "bg-white/15 text-white" : "bg-[var(--c)]/10 text-[var(--c)]") : (MENU_FONCE ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-slate-100"))}><\${Icone} nom=\${e.icone} class="w-[18px] h-[18px]"/>\${e.titre}</button>\`)}</nav>\`;
  const DISPO = ["haut", "onglets"].includes(S.disposition) ? S.disposition : "barre";
  const ITEMS = [...PRIVES, { id: "_equipe", titre: "Équipe", icone: "contacts" }, ...((S.collections ?? []).length ? [{ id: "_donnees", titre: "Mes données", icone: "fichier" }] : [])];
  const Entete = () => html\`<header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur"><div class="max-w-6xl mx-auto flex h-14 items-center gap-3 px-4 sm:px-8">
      <div class="flex shrink-0 items-center gap-2 font-bold"><\${Logo}/>\${S.nom}</div>
      <nav class="hidden md:flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">\${ITEMS.map((e) => html\`<button onClick=\${() => nav(e.id)} class=\${cls("shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium", e.id === E?.id ? "bg-[var(--c)]/10 text-[var(--c)]" : "text-slate-600 hover:bg-slate-100")}>\${e.titre}</button>\`)}</nav>
      <div class="ml-auto flex items-center gap-2"><button onClick=\${() => nav("_compte")} class="grid h-9 w-9 place-items-center rounded-full bg-[var(--c)] text-sm font-bold text-white" title=\${user.nom}>\${String(user.nom || "?").slice(0, 1).toUpperCase()}</button><button class="md:hidden" onClick=\${() => setMenu(true)}><\${Icone} nom="menu"/></button></div>
    </div></header>\`;
  const Onglets = () => html\`<nav class="md:hidden fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-200 bg-white/95 backdrop-blur" style=\${"grid-template-columns:repeat(" + (Math.min(4, PRIVES.length) + 1) + ",1fr);padding-bottom:env(safe-area-inset-bottom)"}>\${PRIVES.slice(0, 4).map((e) => html\`<button onClick=\${() => nav(e.id)} class=\${cls("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", e.id === E?.id ? "text-[var(--c)]" : "text-slate-500")}><\${Icone} nom=\${e.icone} class="w-5 h-5"/><span class="max-w-full truncate px-1">\${e.titre}</span></button>\`)}<button onClick=\${() => setMenu(true)} class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500"><\${Icone} nom="menu" class="w-5 h-5"/>Plus</button></nav>\`;
  return html\`<div class=\${cls("min-h-screen", DISPO === "barre" && "lg:flex", "forme-" + (["carre", "pilule"].includes(S.forme) ? S.forme : "arrondi"), ["creme", "gris", "sombre"].includes(S.fond) && "fond-" + S.fond)}>
    \${DISPO !== "barre" && html\`<\${Entete}/>\`}
    <aside class=\${cls("w-60 shrink-0 p-4 flex-col gap-6", DISPO === "barre" && "lg:flex lg:sticky lg:top-0 lg:h-screen", MENU_FONCE ? "menu-fonce" : "", STY.menu === "sombre" ? "bg-slate-900 text-slate-200" : STY.menu === "couleur" ? "bg-[var(--c)] text-white" : STY.menu === "teinte" ? "border-r border-slate-200" : "bg-white border-r border-slate-200", menu ? "flex fixed inset-y-0 left-0 z-40" : "hidden")} style=\${STY.menu === "teinte" ? "background:color-mix(in srgb,var(--c) 6%,white)" : ""}>
      <div class="flex items-center gap-2 font-bold"><\${Logo} clair=\${MENU_FONCE}/>\${S.nom}</div>
      <\${Nav}/>
      <\${Partage}/>
      <\${Agenda}/>
      \${etat.payant && html\`<button onClick=\${() => nav("_abonnement")} class=\${cls("mt-auto w-full text-left rounded-xl px-3 py-2.5 text-sm", E?.id === "_abonnement" ? "bg-[var(--c)]/10 text-[var(--c)]" : "bg-slate-50 hover:bg-slate-100")}><span class="flex items-center gap-2 font-medium"><\${Icone} nom="carte" class="w-4 h-4"/>Mon abonnement</span><span class="block text-xs text-slate-500 mt-0.5">\${["active", "trialing", "past_due"].includes(etat.abonnement?.statut) ? "Formule " + (etat.abonnement.formule ?? "") : "Essai : " + jours(etat.essai_fin) + " jour(s) restant(s)"}</span></button>\`}
      <div class=\${cls(etat.payant ? "" : "mt-auto", "border-t border-slate-100 pt-3 text-sm flex items-center gap-2.5")}><button onClick=\${() => nav("_compte")} title="Mon compte" class="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1 -m-1 text-left hover:bg-slate-500/10"><span class="grid w-9 h-9 shrink-0 place-items-center rounded-full bg-[var(--c)] text-xs font-bold text-white">\${String(user.nom || user.email || "?").trim().split(" ").filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase()}</span><span class="min-w-0"><span class="block font-medium truncate">\${user.nom}</span><span class="block text-xs opacity-60 truncate">\${/@demo\\.local$/.test(user.email) ? "Compte de démonstration" : user.role === "admin" || user.role === "owner" ? "Administrateur" : user.email}</span></span></button><button onClick=\${onLogout} title="Se déconnecter" aria-label="Se déconnecter" class="grid w-8 h-8 shrink-0 place-items-center rounded-lg opacity-60 hover:opacity-100 hover:bg-slate-500/10"><\${Icone} nom="sortie" class="w-4 h-4"/></button></div>
    </aside>
    \${menu && html\`<div class="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick=\${() => setMenu(false)}/>\`}
    <main class=\${cls("flex-1 min-w-0 min-h-screen", !["creme", "gris", "sombre"].includes(S.fond) && "bg-[#F7F7F9]", "pb-20 md:pb-0")}><div class=\${cls("lg:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3", DISPO !== "barre" && "!hidden")}><button onClick=\${() => setMenu(true)}><\${Icone} nom="menu"/></button><span class="font-bold">\${S.nom}</span><span class="w-5"/></div>
      \${user.role === "lecture" && html\`<div class="bg-amber-50 text-amber-800 text-sm px-5 py-2">Accès en lecture seule : vous voyez tout, mais vous ne pouvez rien modifier.</div>\`}
      <div class="max-w-6xl mx-auto p-5 sm:p-8">\${!tour && E?.id === PRIVES[0]?.id && html\`<\${PremiersPas} user=\${user} publiques=\${PUBLIQUES} lien=\${lienPage}/>\`}\${E ? html\`<\${Garde} k=\${E.id} titre=\${E.titre}><\${E.Comp} key=\${E.id + JSON.stringify(cur.params)} user=\${user} params=\${cur.params} etat=\${etat}/></\${Garde}>\` : null}</div></main>
    <\${Onglets}/>
    \${tour && html\`<\${Tour} onFin=\${onFinTour}/>\`}
    <div class="fixed bottom-24 md:bottom-4 right-4 z-50 space-y-2">\${toasts.map((t) => html\`<div class=\${cls("anim rounded-xl px-4 py-2.5 text-sm text-white shadow-lg", t.type === "bad" ? "bg-red-600" : "bg-slate-900")}>\${t.msg}</div>\`)}</div>
  </div>\`;
}

// Page publique partagée par un utilisateur de l'app à ses propres clients (sans compte)
function PagePublique() {
  const E = ECRANS.find((e) => e.public && e.id === PAGE.id);
  const [info, setInfo] = useState(undefined);
  useEffect(() => { call("public-info", { page: PAGE.id, espace: PAGE.espace }).then(setInfo, (x) => setInfo({ erreur: x.message })); }, []);
  if (!E) return html\`<div class="min-h-screen grid place-items-center text-slate-500 p-6">Cette page n'existe pas.</div>\`;
  if (info === undefined) return html\`<\${ui.Loading}/>\`;
  if (info.erreur) return html\`<div class="min-h-screen grid place-items-center text-slate-500 p-6 text-center">\${info.erreur}</div>\`;
  return html\`<div class="min-h-screen bg-slate-50"><div class="max-w-3xl mx-auto px-4 py-8 sm:py-12"><\${Garde} k=\${E.id} titre=\${E.titre}><\${E.Comp} user=\${null} params=\${null} espace=\${info.nom ?? ""}/></\${Garde}><p class="mt-10 text-center text-xs text-slate-400">Propulsé par \${S.nom}</p></div></div>\`;
}
// Chaque écran est ouvert à tour de rôle avec les données d'exemple ; le résultat part à la page Bingoo! qui encadre l'app
function Verif() {
  const [i, setI] = useState(0); const res = useRef([]);
  const E = ECRANS[i];
  useEffect(() => {
    if (!E) {
      for (const e of S.ecrans ?? []) if (!e.code) res.current.push({ id: e.id, ok: false, erreur: "Écran non écrit" });
      try { parent.postMessage({ type: "bingoo-verif", slug: B.slug, resultats: res.current, ecrans: (S.ecrans ?? []).length }, "*"); } catch (x) {}
      return;
    }
    const t = setTimeout(async () => {
      const txt = document.getElementById("verif-zone")?.innerText ?? "";
      const casse = txt.includes("n'a pas pu être chargé");
      const bizarre = (/\\bNaN\\b|\\bundefined\\b|\\[object Object\\]|Invalid Date/.exec(txt) ?? [])[0];
      // Avec les données d'exemple, un écran du SaaS doit être rempli : pas de bloc vide, pas de chiffres clés à zéro
      const zone = document.getElementById("verif-zone");
      const titreDe = (el) => { let n = el; for (let k = 0; n && k < 6; k++, n = n.parentElement) { const h = n.querySelector?.("h2, h3"); if (h && n.tagName === "SECTION") return h.textContent.trim(); } return ""; };
      const vides = E.public ? [] : [...(zone?.querySelectorAll("[data-vide]") ?? [])].map((el) => titreDe(el) || "un bloc");
      const kpis = [...(zone?.querySelectorAll("[data-kpi]") ?? [])].map((el) => ({ l: el.dataset.kpi, v: el.textContent.trim() }));
      const zeros = E.public ? [] : kpis.filter((k) => /\\d/.test(k.v) && !/[1-9]/.test(k.v)).map((k) => k.l);
      const vide = vides.length ? "Avec les données d'exemple, ce bloc reste vide : « " + vides.slice(0, 3).join(" », « ") + " ». Le calcul ne trouve rien : vérifie les noms exacts des collections et des champs des données d'exemple (et les valeurs de statut), et les dates (les exemples sont centrés sur aujourd'hui)." : null;
      const zero = zeros.length >= 2 || (zeros.length && zeros.length === kpis.length) ? "Avec les données d'exemple, ces chiffres clés affichent 0 : « " + zeros.slice(0, 4).join(" », « ") + " ». Vérifiez les noms des champs, les valeurs de statut et les filtres de dates utilisés dans le calcul." : null;
      // Boutons et pastilles sans aucun texte (ni icône, ni libellé) : le champ affiché n'existe pas dans les données
      const muets = [...(zone?.querySelectorAll("button, [role=button], a") ?? [])].filter((el) => !el.innerText.trim() && !el.querySelector("svg, img, canvas, video, input") && !el.getAttribute("aria-label") && !el.getAttribute("title") && el.getBoundingClientRect().width > 44);
      const muet = muets.length ? "Des boutons s'affichent sans aucun texte (" + muets.length + ") : le champ utilisé pour leur libellé n'existe pas (ou est vide) dans les données d'exemple. Vérifie le nom exact du champ affiché." : null;
      let erreur = VERRS[0] ?? (casse ? "L'écran ne se charge pas" : bizarre ? "Le texte affiché contient « " + bizarre + " »" : txt.trim().length < 30 ? "L'écran est presque vide" : [vide, zero, muet].filter(Boolean).join(" ") || null);
      // Écran bien rempli : on le teste maintenant comme un vrai utilisateur (créer, enregistrer, cliquer sur chaque action)
      let gestes = null;
      if (!erreur && zone) { try { const pbs = await gestesEcran(zone); gestes = pbs.length ? pbs : []; if (pbs.length) erreur = "En testant l'écran comme un utilisateur : " + pbs.join(" "); } catch (x) { gestes = null; } }
      res.current.push({ id: E.id, ok: !erreur, erreur: erreur && String(erreur).slice(0, 700), gestes: gestes != null });
      VERRS.length = 0;
      setI(i + 1);
    }, 1400);
    return () => clearTimeout(t);
  }, [i]);
  return E ? html\`<div id="verif-zone" class="p-6"><\${Garde} k=\${E.id} titre=\${E.titre}><\${E.Comp} user=\${{ id: "v", nom: "Test", email: "test@exemple.fr", role: "admin" }} params=\${null} etat=\${{ acces: true }}/></\${Garde}></div>\` : null;
}
// Vidéo pub : chaque écran demandé est affiché avec les données d'exemple, photographié, puis envoyé à la page Bingoo!
function Capture() {
  const ids = (B.capture ?? []).filter((id) => ECRANS.some((e) => e.id === id));
  const [i, setI] = useState(0); const E = ECRANS.find((e) => e.id === ids[i]);
  useEffect(() => {
    if (!E) { try { parent.postMessage({ type: "bingoo-capture-fin", slug: B.slug }, "*"); } catch (x) {} return; }
    const t = setTimeout(async () => {
      // On attend que l'écran soit rempli (données chargées, plus de « Chargement »), 8 secondes au plus
      for (let k = 0; k < 32; k++) {
        const z = document.querySelector("#cap main") ?? document.getElementById("cap");
        const txt = z?.innerText ?? "";
        if (txt.trim().length > 60 && !/Chargement/.test(txt)) break;
        await new Promise((ok) => setTimeout(ok, 250));
      }
      // Pas d'animation d'entrée dans la photo (sinon le contenu y reste à opacité 0)
      if (!document.getElementById("sans-anim")) { const st = document.createElement("style"); st.id = "sans-anim"; st.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;opacity:1}"; document.head.appendChild(st); }
      await new Promise((ok) => setTimeout(ok, 400));
      try {
        // Image vectorielle (SVG) : la page Bingoo! la dessine dans la vidéo (le rendu en PNG ne se termine pas dans un cadre isolé)
        const { toSvg } = await import("https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/+esm");
        const png = await Promise.race([toSvg(document.getElementById("cap"), { width: 1280, height: 800, skipFonts: true, backgroundColor: "#F8FAFC" }), new Promise((_, non) => setTimeout(() => non(new Error("Capture trop longue")), 10000))]);
        parent.postMessage({ type: "bingoo-capture", slug: B.slug, id: E.id, png, texte: (document.querySelector("#cap main")?.innerText ?? "").length }, "*");
      } catch (x) { try { parent.postMessage({ type: "bingoo-capture", slug: B.slug, id: E.id, erreur: String(x?.message ?? x).slice(0, 200) }, "*"); } catch (y) {} }
      setI(i + 1);
    }, 1800);
    return () => clearTimeout(t);
  }, [i]);
  if (!E) return null;
  const menu = ECRANS.filter((e) => !e.public).slice(0, 8);
  const ecran = html\`<\${Garde} k=\${E.id} titre=\${E.titre}><\${E.Comp} user=\${{ id: "v", nom: "Camille", email: "camille@exemple.fr", role: "admin" }} params=\${null} etat=\${{ acces: true }} espace="Atelier Exemple"/></\${Garde}>\`;
  if (E.public) return html\`<div id="cap" style="width:1280px;height:800px;overflow:hidden" class="bg-slate-50 text-slate-900"><div class="max-w-3xl mx-auto px-4 py-10">\${ecran}</div></div>\`;
  // Même allure que le vrai logiciel : menu (clair, teinté, sombre, couleur) et fond (blanc, crème, gris)
  const fonce = STY.menu === "sombre" || STY.menu === "couleur";
  return html\`<div id="cap" style="width:1280px;height:800px;overflow:hidden" class=\${cls("flex text-slate-900", ["creme", "gris", "sombre"].includes(S.fond) ? "fond-" + S.fond : "bg-[#F7F7F9]")}>
    <aside class=\${cls("w-60 shrink-0 p-4", STY.menu === "sombre" ? "bg-slate-900" : STY.menu === "couleur" ? "bg-[var(--c)]" : "bg-white border-r border-slate-200")} style=\${STY.menu === "teinte" ? "background:color-mix(in srgb,var(--c) 6%,white)" : ""}><div class=\${cls("flex items-center gap-2 font-bold mb-6 px-2", fonce && "text-white")}><span class=\${cls("w-8 h-8 rounded-xl grid place-items-center", fonce ? "bg-white/15 text-white" : "bg-[var(--c)] text-white")}>\${(S.nom ?? "S")[0]}</span>\${S.nom}</div>
      \${menu.map((e) => html\`<div class=\${cls("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm mb-1", e.id === E.id ? (fonce ? "bg-white/15 text-white font-semibold" : "bg-[var(--c)]/10 text-[var(--c)] font-semibold") : fonce ? "text-white/70" : "text-slate-600")}><\${Icone} nom=\${e.icone} class="w-4 h-4"/>\${e.titre}</div>\`)}</aside>
    <main class="flex-1 min-w-0 overflow-hidden p-8">\${ecran}</main></div>\`;
}
function Racine() {
  if (B.capture) return html\`<\${Capture}/>\`;
  if (B.verif) return html\`<\${Verif}/>\`;
  // Essai local : l'application complète, connectée, avec les données d'exemple (robot mobile, captures sur téléphone)
  if (B.essai) return html\`<\${Appli} user=\${{ id: "v", nom: "Camille Martin", email: "camille@exemple.fr", role: "admin" }} etat=\${{ acces: true }} onLogout=\${() => {}} tour=\${false} onFinTour=\${() => {}}/>\`;
  if (PAGE) return html\`<\${PagePublique}/>\`;
  if (B.validation && !(S.ecrans ?? []).length) return html\`<\${Precommande}/>\`;
  const [etat, setEtat] = useState(undefined), [auth, setAuth] = useState(B.invite ? "signup" : null), [tour, setTour] = useState(false);
  const verifier = (force) => token ? call("me", { verifier: !!force }).then((r) => { if (r.variante) VARIANTE = r.variante; setEtat(r); }, () => setEtat(null)) : setEtat(null);
  useEffect(() => {
    if (B.tour) ouvrir("tour"); else verifier(B.retourPaiement);
    if (B.retourPaiement) setTimeout(() => toast("Merci ! Votre abonnement est activé."), 1200);
    const a = bus.on("auth", () => setEtat(null)), b = bus.on("acces", () => verifier(true));
    return () => { a(); b(); };
  }, []);
  const ok = (r) => { persist(r.token); setAuth(null); verifier(); };
  // Démo animée : compte d'essai jetable, jamais gardé (la session de la personne n'est pas touchée)
  const ouvrir = async (m) => {
    if (m === "demo" || m === "tour") {
      try { const r = await call("demo"); token = r.token; if (m === "demo") persist(r.token); setTour(m === "tour"); setEtat(undefined); await verifier(); } catch (x) { avertir(x.message); setEtat(null); }
    } else setAuth(m);
  };
  const finTour = () => { setTour(false); token = null; setEtat(null); setAuth("signup"); };
  const sortir = async () => { try { await call("logout"); } catch (e) {} persist(null); setEtat(null); };
  if (etat === undefined) return html\`<\${ui.Loading}/>\`;
  if (etat) return html\`<\${Appli} user=\${etat.user} etat=\${etat} tour=\${tour} onFinTour=\${finTour} onLogout=\${tour ? finTour : sortir}/>\`;
  if (auth) return html\`<\${Auth} mode=\${auth} onDone=\${ok} onBack=\${() => setAuth(null)}/>\`;
  return S.type === "site" ? html\`<\${SiteVitrine} onAuth=\${ouvrir}/>\` : html\`<\${Site} onAuth=\${ouvrir}/>\`;
}
// Outils de l'atelier de Bingoo! : dans l'aperçu de l'atelier, le parent active « modifier un texte » ou « pointer un élément »
{
  let mode = null, parent = null, cible = null;
  const cadre = document.createElement("div");
  cadre.style.cssText = "position:fixed;pointer-events:none;z-index:2147483646;border:2px solid #E8571C;border-radius:6px;background:rgba(232,87,28,.07);display:none";
  document.body.appendChild(cadre);
  const permis = (o) => { try { const hst = new URL(o).hostname; return ["bingoo.fr", "maisonravita.fr", "localhost", "127.0.0.1"].some((d) => hst === d || hst.endsWith("." + d)); } catch (e) { return false; } };
  const envoyer = (m) => { if (parent) window.parent.postMessage(m, parent); };
  const texteDirect = (el) => [...el.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent).join(" ").replace(/ +/g, " ").trim();
  const montrer = (el) => { if (!el) { cadre.style.display = "none"; return; } const r = el.getBoundingClientRect(); Object.assign(cadre.style, { display: "block", left: r.left - 3 + "px", top: r.top - 3 + "px", width: r.width + 6 + "px", height: r.height + 6 + "px" }); };
  const cibleTexte = (el) => { for (let x = el, i = 0; x && i < 4; x = x.parentElement, i++) { if (["INPUT", "TEXTAREA", "SELECT"].includes(x.tagName)) return null; if (texteDirect(x)) return x; } return null; };
  const decrire = (el) => {
    const t = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("alt") || "").replace(/ +/g, " ").trim().slice(0, 90);
    const nature = el.closest("button,a") ? "bouton" : el.tagName === "IMG" ? "image" : /^H[1-4]$/.test(el.tagName) ? "titre" : el.closest("table") ? "tableau" : el.closest("form") ? "élément de formulaire" : el.closest("nav,aside") ? "menu" : "bloc";
    const sec = el.closest("section,div.rounded-2xl,div.rounded-xl"); const titre = sec && sec.querySelector("h1,h2,h3"); const ou = titre && titre !== el ? " dans la partie « " + titre.innerText.trim().slice(0, 50) + " »" : "";
    return nature + (t ? " « " + t + " »" : "") + ou;
  };
  let atelier = false, temporaire = false;
  addEventListener("message", (e) => { if (e.source !== window.parent || !permis(e.origin) || e.data?.type !== "bingoo-atelier-mode") return; parent = e.origin; atelier = true; mode = e.data.mode || null; cible = null; montrer(null); document.body.style.cursor = mode ? (mode === "texte" ? "text" : "crosshair") : ""; });
  addEventListener("mousemove", (e) => { if (!mode) return; const el = mode === "texte" ? cibleTexte(e.target) : e.target; cible = el; montrer(el); }, true);
  addEventListener("scroll", () => { if (mode && cible) montrer(cible); }, true);
  const bloquer = (e) => { if (!mode) return false; e.preventDefault(); e.stopPropagation(); return true; };
  addEventListener("mousedown", bloquer, true);
  // Dans l'atelier, un double-clic sur un texte le rend modifiable, même sans choisir l'outil
  addEventListener("dblclick", (e) => { if (!atelier || mode) return; const el = cibleTexte(e.target); if (!el) return; e.preventDefault(); e.stopPropagation(); mode = "texte"; temporaire = true; el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); }, true);
  addEventListener("click", (e) => {
    if (!bloquer(e)) return;
    if (mode === "pointer") { envoyer({ type: "bingoo-atelier-element", description: decrire(e.target), ecran: window.__bingooEcran || "_site" }); return; }
    const el = cibleTexte(e.target); if (!el) return;
    const avant = texteDirect(el); const m0 = temporaire ? null : mode; temporaire = false; mode = null; montrer(null); document.body.style.cursor = "";
    const fin = (garder) => { el.contentEditable = "false"; el.removeEventListener("keydown", touche); el.removeEventListener("blur", sortie); mode = m0; const apres = texteDirect(el); if (garder && apres && apres !== avant) envoyer({ type: "bingoo-atelier-texte", avant, apres, ecran: window.__bingooEcran || "_site" }); else if (!garder) el.innerText = avant; };
    const touche = (k) => { if (k.key === "Enter" && !k.shiftKey) { k.preventDefault(); el.blur(); } if (k.key === "Escape") { k.preventDefault(); fin(false); } };
    const sortie = () => fin(true);
    if (el.children.length) { const apres = window.prompt("Nouveau texte :", avant); mode = m0; if (apres != null && apres.trim() && apres.trim() !== avant) envoyer({ type: "bingoo-atelier-texte", avant, apres: apres.trim(), ecran: window.__bingooEcran || "_site" }); return; }
    el.contentEditable = "true"; el.focus(); const sel = getSelection(); const rg = document.createRange(); rg.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(rg);
    el.addEventListener("keydown", touche); el.addEventListener("blur", sortie);
  }, true);
  if (window.parent !== window) window.parent.postMessage({ type: "bingoo-atelier-pret" }, "*");
}
// Téléphone : chaque cellule d'un tableau porte le nom de sa colonne (data-label), affiché quand le tableau devient des cartes
{
  let attente = null;
  const etiqueter = () => { attente = null; for (const t of document.querySelectorAll("main table")) { const ths = [...t.querySelectorAll("thead th")].map((x) => x.textContent.replace(/[↑↓]/g, "").trim()); if (!ths.length) continue; for (const tr of t.querySelectorAll("tbody tr")) [...tr.children].forEach((td, i) => { const l = ths[i] ?? ""; if (td.getAttribute("data-label") !== l) l ? td.setAttribute("data-label", l) : td.removeAttribute("data-label"); }); } };
  new MutationObserver(() => { if (!attente) attente = setTimeout(etiqueter, 60); }).observe(document.body, { childList: true, subtree: true });
}
render(html\`<\${Racine}/>\`, document.getElementById("root"));
{ const d = document.createElement("div"); document.body.appendChild(d); render(html\`<\${FenetreLegale}/>\`, d); }
</script></body></html>`;
}

/** Ce que l'IA doit savoir pour écrire un écran (repris dans le prompt côté serveur : garder les deux alignés). */
export const ICONES = ["accueil", "liste", "contacts", "agenda", "graphique", "reglages", "fichier", "boite", "mail", "carte", "tag", "etoile", "horloge", "panier", "message"];
