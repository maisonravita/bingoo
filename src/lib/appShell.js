// Gabarit des SaaS construits par Bingoo! : une page complète (site public, connexion, application) assemblée
// à partir de la spec générée. Elle tourne dans un cadre isolé (sandbox sans same-origin) : le code généré
// n'a accès ni à la session Bingoo!, ni au stockage du site. Les écrans sont écrits par l'IA avec Preact + htm ;
// le gabarit fournit le reste (navigation, comptes, composants, accès aux données).
// Versions figées : un gabarit qui change d'un jour à l'autre casserait les applications déjà générées.
const PREACT = "https://esm.sh/preact@10.24.3";
const HOOKS = "https://esm.sh/preact@10.24.3/hooks";
const HTM = "https://esm.sh/htm@3.1.1";

const safe = (o) => JSON.stringify(o).replace(/</g, "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");

export function appHtml({ spec, slug, api, token = null, apercu = false, paiement = null, retour = null, retourPaiement = false, ab = null, variante = "A", invite = null, tour = false, articles = [], blog = null, source = null, ecran = null, validation = null, precommande = null, verif = false, page = null }) {
  const boot = { spec, slug, api, token, apercu, paiement: paiement ?? { actif: false, essai_jours: 14 }, retour, retourPaiement, ab: ab ?? { actif: false }, variante, invite, tour, articles, blog, source, ecran, validation, precommande, verif, page };
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${String(spec.nom ?? "Mon SaaS").replace(/[<&]/g, "")}</title>
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.13/dist/index.global.js"></script>
<style>:root{--c:${/^#[0-9a-f]{6}$/i.test(spec.couleur ?? "") ? spec.couleur : "#4F46E5"}}body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#F8FAFC;color:#0F172A}
main section{max-width:100%;overflow-x:auto}.anim{animation:a .18s ease-out}@keyframes barre{from{width:0}to{width:100%}}@keyframes a{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}</style>
</head><body><div id="root"><div style="min-height:100vh;display:grid;place-items:center;color:#94A3B8;font-size:14px">Chargement…</div></div>
<script>window.__BOOT=${safe(boot)};</script>
<script type="module">
import { h, render, Fragment, Component } from "${PREACT}";
import { useState, useEffect, useMemo, useRef, useCallback } from "${HOOKS}";
import htm from "${HTM}";
const html = htm.bind(h);
const B = window.__BOOT, S = B.spec;
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
  if (B.verif) return verifCall(action, body);
  const r = await fetch(B.api + "/" + B.slug + "/" + action, { method: "POST", headers: { "content-type": "application/json", ...(token ? { "x-app-token": token } : {}) }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && action !== "login") { persist(null); bus.emit("auth"); }
  if (r.status === 402) bus.emit("acces");
  if (!r.ok) throw new Error(d.error || "Erreur " + r.status);
  return d;
}
// Vérification avant livraison : données d'exemple en mémoire, aucune requête au serveur
const VSTORE = {}; let VSEQ = 0;
if (B.verif) {
  const refs = new Map(), items = [];
  for (const [col, xs] of Object.entries(S.demo ?? {})) for (const x of (Array.isArray(xs) ? xs : []).slice(0, 15)) { const id = "v" + (++VSEQ); if (x && x.ref != null) refs.set(String(x.ref), id); items.push({ id, col, x: x ?? {} }); }
  items.forEach(({ id, col, x }, i) => { const d = {}; for (const [k, v] of Object.entries(x)) if (k !== "ref" && k !== "id") d[k] = typeof v === "string" && refs.has(v) && /_id$/.test(k) ? refs.get(v) : v; (VSTORE[col] ??= []).push({ ...d, id, created_at: new Date(Date.now() - i * 25e6).toISOString(), updated_at: null }); });
}
async function verifCall(action, b) {
  if (action === "public-list") action = "list"; else if (action === "public-add") action = "add"; else if (action === "public-info") return { nom: "Atelier Exemple" };
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
ui.Card = ({ titre, actions, children, class: c }) => html\`<section class=\${cls("bg-white rounded-2xl border border-slate-200 p-5", c)}>\${(titre || actions) && html\`<div class="flex items-center justify-between mb-3"><h2 class="font-semibold">\${titre}</h2>\${actions}</div>\`}\${children}</section>\`;
ui.Button = ({ variant = "primary", onClick, type = "button", disabled, children, class: c, icone }) => html\`<button type=\${type} disabled=\${disabled} onClick=\${onClick} class=\${cls("inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50", variant === "primary" && "bg-[var(--c)] text-white hover:brightness-110", variant === "secondary" && "bg-white border border-slate-200 hover:border-slate-300", variant === "danger" && "bg-red-600 text-white hover:bg-red-700", variant === "ghost" && "hover:bg-slate-100 text-slate-600", c)}>\${icone && html\`<\${Icone} nom=\${icone} class="w-4 h-4"/>\`}\${children}</button>\`;
const champ = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--c)] focus:ring-2 focus:ring-[var(--c)]/15";
const Lab = ({ label, children }) => html\`<label class="block">\${label && html\`<span class="block text-xs font-medium text-slate-500 mb-1">\${label}</span>\`}\${children}</label>\`;
ui.Input = ({ label, value, onInput, type = "text", placeholder, required, min, step }) => html\`<\${Lab} label=\${label}><input class=\${champ} type=\${type} value=\${value ?? ""} placeholder=\${placeholder} required=\${required} min=\${min} step=\${step} onInput=\${(e) => onInput?.(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}/></\${Lab}>\`;
ui.Textarea = ({ label, value, onInput, rows = 3, placeholder }) => html\`<\${Lab} label=\${label}><textarea class=\${champ} rows=\${rows} placeholder=\${placeholder} value=\${value ?? ""} onInput=\${(e) => onInput?.(e.target.value)}/></\${Lab}>\`;
ui.Select = ({ label, value, onChange, options = [] }) => html\`<\${Lab} label=\${label}><select class=\${champ} value=\${value ?? ""} onChange=\${(e) => onChange?.(e.target.value)}>\${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return html\`<option value=\${v}>\${l}</option>\`; })}</select></\${Lab}>\`;
ui.Modal = ({ open, onClose, titre, children, actions }) => !open ? null : html\`<div class="fixed inset-0 z-50 bg-slate-900/40 grid place-items-center p-4" onClick=\${(e) => e.target === e.currentTarget && onClose?.()}><div class="anim w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-auto"><div class="flex items-center justify-between px-5 pt-4"><h3 class="font-semibold text-lg">\${titre}</h3><button onClick=\${onClose} class="text-slate-400 hover:text-slate-700"><\${Icone} nom="croix"/></button></div><div class="p-5 space-y-3">\${children}</div>\${actions && html\`<div class="px-5 pb-5 flex justify-end gap-2">\${actions}</div>\`}</div></div>\`;
ui.Table = ({ colonnes = [], lignes = [], onClick, vide = "Rien pour l'instant." }) => !lignes.length ? html\`<\${ui.Empty} texte=\${vide}/>\` : html\`<div class="overflow-x-auto -mx-5"><table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-500 border-b border-slate-100">\${colonnes.map((c) => html\`<th class="px-5 py-2 font-medium">\${c.label}</th>\`)}</tr></thead><tbody>\${lignes.map((l) => html\`<tr class=\${cls("border-b border-slate-50 last:border-0", onClick && "cursor-pointer hover:bg-slate-50")} onClick=\${() => onClick?.(l)}>\${colonnes.map((c) => html\`<td class="px-5 py-2.5">\${c.rendu ? c.rendu(l) : l[c.cle] ?? "—"}</td>\`)}</tr>\`)}</tbody></table></div>\`;
ui.Stat = ({ label, valeur, sous, icone }) => html\`<div class="bg-white rounded-2xl border border-slate-200 p-5"><div class="flex items-center justify-between text-slate-500 text-sm">\${label}\${icone && html\`<span class="text-[var(--c)]"><\${Icone} nom=\${icone}/></span>\`}</div><p class="text-2xl font-bold mt-1 tabular-nums">\${valeur}</p>\${sous && html\`<p class="text-xs text-slate-500 mt-0.5">\${sous}</p>\`}</div>\`;
const TEINTE = { vert: "bg-emerald-50 text-emerald-700", rouge: "bg-red-50 text-red-700", orange: "bg-amber-50 text-amber-700", bleu: "bg-sky-50 text-sky-700", violet: "bg-violet-50 text-violet-700", gris: "bg-slate-100 text-slate-600" };
ui.Badge = ({ couleur = "gris", children }) => html\`<span class=\${cls("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TEINTE[couleur] ?? TEINTE.gris)}>\${children}</span>\`;
ui.Empty = ({ texte = "Rien pour l'instant.", action }) => html\`<div class="text-center py-10 text-slate-500"><p>\${texte}</p>\${action && html\`<div class="mt-3">\${action}</div>\`}</div>\`;
ui.Loading = () => html\`<div class="py-10 grid place-items-center"><div class="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[var(--c)] animate-spin"/></div>\`;
ui.Tabs = ({ valeur, onChange, onglets = [] }) => html\`<div class="inline-flex rounded-xl bg-slate-100 p-1 text-sm">\${onglets.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return html\`<button onClick=\${() => onChange?.(v)} class=\${cls("px-3 py-1.5 rounded-lg font-medium", valeur === v ? "bg-white shadow-sm" : "text-slate-500")}>\${l}</button>\`; })}</div>\`;
ui.Bar = ({ donnees = [] }) => { const m = Math.max(1, ...donnees.map((d) => Number(d.valeur) || 0)); return html\`<div class="flex gap-2 h-44">\${donnees.map((d) => html\`<div class="flex-1 min-w-0 flex flex-col items-center gap-1"><div class="w-full flex-1 flex items-end"><div class="w-full rounded-t-lg bg-[var(--c)]/80" style=\${"height:" + Math.max(2, (Number(d.valeur) || 0) / m * 100) + "%"} title=\${d.valeur}/></div><span class="text-[11px] text-slate-500 truncate max-w-full">\${d.label}</span></div>\`)}</div>\`; };
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

// ---------------------------------------------------------------- Écrans générés
let nav = () => {};
const go = (id, params) => nav(id, params);
// IA intégrée : ia("Résume ce texte", { texte }) → texte ; { json: true } → objet
// E-mails aux clients de l'utilisateur : tout de suite, ou à une date (quand), éventuellement répétés (repeter : jour, semaine, mois)
const email = (m) => call("mail", m ?? {});
const annulerEmail = (id) => call("mail-annuler", { id });
const emailsEnvoyes = () => call("mails");
// Lien d'abonnement à l'agenda de l'espace (Google Agenda, Outlook, Apple)
const lienAgenda = () => call("agenda").then((r) => r.url);
// Document PDF téléchargé (devis, facture, bail, attestation…)
const rgb = (hx) => { const m = /^#?([0-9a-f]{6})$/i.exec(hx ?? ""); const n = parseInt(m ? m[1] : "4F46E5", 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
async function pdf(d = {}) {
  const { jsPDF } = await import("https://esm.sh/jspdf@2.5.2");
  const autoTable = (await import("https://esm.sh/jspdf-autotable@3.8.2")).default;
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
  if (d.tableau?.lignes?.length) {
    autoTable(doc, { startY: y + 2, head: [d.tableau.colonnes ?? []], body: d.tableau.lignes.map((l) => l.map(txt)), margin: { left: M, right: M }, styles: { font: "helvetica", fontSize: 9.5, cellPadding: 2.4 }, headStyles: { fillColor: C, textColor: 255 }, alternateRowStyles: { fillColor: [248, 250, 252] } });
    y = doc.lastAutoTable.finalY + 6;
  }
  if (d.totaux) for (const [l, v] of d.totaux) { saut(7); doc.setFont("helvetica", "bold"); doc.text(txt(l), M + W - 70, y); doc.text(txt(v), M + W, y, { align: "right" }); y += 6.5; }
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
  for (const para of d.paragraphes ?? []) { const ls = doc.splitTextToSize(txt(para), W); for (const l of ls) { saut(6); doc.text(l, M, y); y += 5.2; } y += 2.5; }
  if (d.signature) { saut(26); y += 6; doc.text(txt(d.signature), M, y); y += 20; }
  if (d.mentions) { doc.setFontSize(8.5); doc.setTextColor(100, 116, 139); const ls = doc.splitTextToSize(txt(d.mentions), W); saut(ls.length * 4 + 4); doc.text(ls, M, Math.max(y + 4, 286 - ls.length * 4)); }
  doc.save(txt(d.nomFichier ?? d.titre ?? "document").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80) + ".pdf");
}
const ia = (consigne, o = {}) => call("ia", { consigne, texte: o.texte ?? "", json: !!o.json }).then((r) => r.resultat);
const ctx = { html, h, Fragment, useState, useEffect, useMemo, useRef, useCallback, ui, fmt, db, useCollection, toast, go, Icone, ia, email, annulerEmail, emailsEnvoyes, pdf, lienAgenda };
const ctxPublic = { ...ctx, db: dbPublic, useCollection: mkUseCollection(dbPublic), ia: refuse, email: refuse, annulerEmail: refuse, emailsEnvoyes: refuse, lienAgenda: refuse, go: () => {} };
const ECRANS = (S.ecrans ?? []).filter((e) => e.code).map((e) => {
  let Comp;
  try {
    const f = new Function("ctx", "const {html,h,Fragment,useState,useEffect,useMemo,useRef,useCallback,ui,fmt,db,useCollection,toast,go,Icone,ia,email,annulerEmail,emailsEnvoyes,pdf,lienAgenda,user,params}=ctx;\\n" + e.code + "\\n;return typeof Ecran==='function'?Ecran:null;");
    Comp = (props) => { const C = useMemo(() => f({ ...(e.public ? ctxPublic : ctx), user: e.public ? null : props.user, params: props.params }), [props.params]); return C ? h(C, props) : html\`<\${Casse} titre=\${e.titre}/>\`; };
  } catch (err) { console.error(e.id, err); Comp = () => html\`<\${Casse} titre=\${e.titre}/>\`; }
  return { ...e, Comp };
});
function Casse({ titre }) { return html\`<\${ui.Card}><p class="font-semibold">\${titre}</p><p class="text-slate-500 text-sm mt-1">Cet écran n'a pas pu être chargé. Demande sa correction depuis Bingoo!.</p></\${ui.Card}>\`; }
class Garde extends Component {
  componentDidCatch(err) { console.error(err); this.setState({ err: true }); }
  componentDidUpdate(p) { if (p.k !== this.props.k && this.state.err) this.setState({ err: false }); }
  render() { return this.state.err ? html\`<\${Casse} titre=\${this.props.titre}/>\` : this.props.children; }
}

// ---------------------------------------------------------------- Site public
function Site({ onAuth }) {
  const f = S.formules ?? [];
  useEffect(() => { if (!B.apercu) call("vue", { variante: VARIANTE, source: B.source }).catch(() => {}); }, []);
  return html\`<div class="bg-white min-h-screen">
  <header class="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between"><div class="flex items-center gap-2 font-bold text-lg"><span class="w-8 h-8 rounded-xl bg-[var(--c)] text-white grid place-items-center">\${(S.nom ?? "S")[0]}</span>\${S.nom}</div><div class="flex gap-2"><\${ui.Button} variant="ghost" onClick=\${() => onAuth("login")}>Se connecter</\${ui.Button}><\${ui.Button} onClick=\${() => onAuth("signup")}>Essai gratuit</\${ui.Button}></div></header>
  <section class="max-w-6xl mx-auto px-5 pt-14 pb-20 text-center"><p class="inline-block rounded-full bg-[var(--c)]/10 text-[var(--c)] px-3 py-1 text-sm font-semibold">\${S.cible_courte || (ESSAI ? "Essai gratuit " + ESSAI + " jours" : S.nom)}</p>
    <h1 class="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.05]">\${S.slogan ?? S.pitch}</h1>
    <p class="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">\${S.pitch}</p>
    <div class="mt-8 flex flex-wrap justify-center gap-3"><\${ui.Button} class="!px-6 !py-3 !text-base" onClick=\${() => onAuth("signup")}>Commencer gratuitement</\${ui.Button}><\${ui.Button} variant="secondary" class="!px-6 !py-3 !text-base" onClick=\${() => onAuth("tour")}>Voir la démo en 30 s</\${ui.Button}></div>
    <p class="mt-3 text-sm text-slate-400">Sans carte bancaire</p></section>
  \${S.probleme && html\`<section class="bg-slate-50 py-16"><div class="max-w-3xl mx-auto px-5 text-center"><p class="text-sm font-semibold text-[var(--c)] uppercase tracking-wide">Le problème</p><p class="mt-3 text-2xl font-semibold leading-snug">\${S.probleme}</p></div></section>\`}
  <section class="max-w-6xl mx-auto px-5 py-20"><h2 class="text-3xl font-bold text-center">Tout ce qu'il te faut</h2><div class="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">\${(S.atouts ?? []).map((a) => html\`<div class="rounded-2xl border border-slate-200 p-6"><span class="w-10 h-10 rounded-xl bg-[var(--c)]/10 text-[var(--c)] grid place-items-center"><\${Icone} nom="check"/></span><p class="mt-4 font-semibold">\${a.titre}</p><p class="mt-1 text-sm text-slate-500">\${a.texte}</p></div>\`)}</div></section>
  \${f.length > 0 && html\`<section class="bg-slate-50 py-20"><div class="max-w-5xl mx-auto px-5"><h2 class="text-3xl font-bold text-center">Des prix simples</h2><div class=\${"mt-10 grid gap-4 " + (f.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2")}>\${f.map((x, i) => html\`<div class=\${cls("rounded-2xl p-6 border", i === 1 ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200")}><p class="font-semibold">\${x.nom}</p><p class="mt-2 text-4xl font-extrabold">\${fmt.eur(prixDe(x.prix))}<span class="text-sm font-normal opacity-60"> /mois</span></p><p class="mt-1 text-sm opacity-70">\${x.pour}</p><ul class="mt-4 space-y-2 text-sm">\${(x.inclus ?? []).map((t) => html\`<li class="flex gap-2"><span class="text-[var(--c)]"><\${Icone} nom="check" class="w-4 h-4"/></span>\${t}</li>\`)}</ul><\${ui.Button} class="w-full mt-6" variant=\${i === 1 ? "primary" : "secondary"} onClick=\${() => onAuth("signup")}>\${ESSAI ? "Essayer " + ESSAI + " jours" : "Commencer"}</\${ui.Button}></div>\`)}</div></div></section>\`}
  \${(B.articles ?? []).length > 0 && html\`<section class="max-w-6xl mx-auto px-5 py-16"><h2 class="text-2xl font-bold">Ressources</h2><div class="mt-6 grid md:grid-cols-3 gap-4">\${B.articles.map((a) => html\`<a href=\${(B.blog ?? "") + a.slug} target="_blank" rel="noopener" class="block rounded-2xl border border-slate-200 p-5 hover:border-[var(--c)]"><p class="font-semibold">\${a.titre}</p><p class="mt-1 text-sm text-slate-500">\${a.resume}</p></a>\`)}</div></section>\`}
  <footer class="max-w-6xl mx-auto px-5 py-10 text-sm text-slate-400 flex justify-between"><span>© \${new Date().getFullYear()} \${S.nom}</span><span>Construit avec Bingoo!</span></footer></div>\`;
}

function Auth({ mode: m0, onDone, onBack }) {
  const [mode, setMode] = useState(m0 === "login" ? "login" : "signup");
  const [f, setF] = useState({ email: "", password: "", nom: "" }), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(""); try { onDone(await call(mode, { ...f, variante: VARIANTE, source: B.source, invite: mode === "signup" ? B.invite : null })); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return html\`<div class="min-h-screen grid place-items-center p-5 bg-slate-50"><form onSubmit=\${submit} class="anim w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
    <button type="button" onClick=\${onBack} class="text-sm text-slate-400 hover:text-slate-700">← \${S.nom}</button>
    <h1 class="text-xl font-bold">\${mode === "signup" ? (B.invite ? "Rejoins ton équipe" : "Crée ton compte") : "Content de te revoir"}</h1>
    \${B.invite && mode === "signup" && html\`<p class="text-sm text-slate-500">Tu as été invité sur \${S.nom}. Crée ton compte pour retrouver les données de ton équipe.</p>\`}
    \${mode === "signup" && html\`<\${ui.Input} label="Ton nom" value=\${f.nom} onInput=\${(v) => setF({ ...f, nom: v })}/>\`}
    <\${ui.Input} label="E-mail" type="email" required value=\${f.email} onInput=\${(v) => setF({ ...f, email: v })}/>
    <\${ui.Input} label="Mot de passe" type="password" required value=\${f.password} onInput=\${(v) => setF({ ...f, password: v })} placeholder=\${mode === "signup" ? "8 caractères au moins" : ""}/>
    \${err && html\`<p class="text-sm text-red-600">\${err}</p>\`}
    <\${ui.Button} type="submit" class="w-full !py-2.5" disabled=\${busy}>\${busy ? "…" : mode === "signup" ? "Créer mon compte" : "Se connecter"}</\${ui.Button}>
    <p class="text-sm text-center text-slate-500">\${mode === "signup" ? "Déjà un compte ? " : "Pas encore de compte ? "}<button type="button" class="font-semibold text-[var(--c)]" onClick=\${() => setMode(mode === "signup" ? "login" : "signup")}>\${mode === "signup" ? "Se connecter" : "Créer un compte"}</button></p>
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
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast("Indique d'abord ton e-mail, juste au-dessus", "bad"); document.getElementById("pc-email")?.focus(); return; }
    setBusy(i); try { allerVers((await call("precommande", { email, formule: i, retour: RETOUR(), source: B.source })).url); } catch (x) { toast(x.message, "bad"); setBusy(null); }
  };
  const remise = Number(V.remise ?? 0), reduit = (p) => Math.round(Number(p) * (1 - remise / 100) * 100) / 100;
  return html\`<div class="bg-white min-h-screen">
  <header class="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between"><div class="flex items-center gap-2 font-bold text-lg"><span class="w-8 h-8 rounded-xl bg-[var(--c)] text-white grid place-items-center">\${(S.nom ?? "S")[0]}</span>\${S.nom}</div><span class="text-sm text-slate-500">Ouverture bientôt</span></header>
  \${merci !== null && html\`<div class="max-w-3xl mx-auto px-5"><div class=\${cls("rounded-2xl px-5 py-4 text-sm", merci ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800")}>\${merci ? "Merci ! Ta précommande est confirmée : tu seras parmi les tout premiers à utiliser " + S.nom + ", au prix réservé." : "Le paiement n'a pas abouti : tu peux réessayer ci-dessous."}</div></div>\`}
  <section class="max-w-4xl mx-auto px-5 pt-12 pb-14 text-center"><p class="inline-block rounded-full bg-[var(--c)]/10 text-[var(--c)] px-3 py-1 text-sm font-semibold">Bientôt disponible\${remise ? " · -" + remise + " % pour les premiers" : ""}</p>
    <h1 class="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">\${S.slogan || S.pitch}</h1>
    <p class="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">\${S.pitch}</p>
    \${fait ? html\`<p class="mt-8 inline-block rounded-xl bg-emerald-50 text-emerald-800 px-5 py-3">C'est noté : on te prévient dès l'ouverture.</p>\` : html\`<form onSubmit=\${rejoindre} class="mt-8 mx-auto flex max-w-md flex-col sm:flex-row gap-2"><input id="pc-email" type="email" required value=\${email} onInput=\${(e) => setEmail(e.target.value)} placeholder="ton@email.fr" class="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--c)]"/><\${ui.Button} type="submit" class="!px-6 !py-3" disabled=\${busy !== null}>\${busy === "liste" ? "…" : "Me prévenir"}</\${ui.Button}></form>\`}
    \${V.inscrits >= 5 && html\`<p class="mt-3 text-sm text-slate-400">\${V.inscrits} personnes attendent déjà l'ouverture</p>\`}
  </section>
  \${S.probleme && html\`<section class="bg-slate-50 py-14"><div class="max-w-3xl mx-auto px-5 text-center"><p class="text-sm font-semibold text-[var(--c)] uppercase tracking-wide">Le problème</p><p class="mt-3 text-2xl font-semibold leading-snug">\${S.probleme}</p></div></section>\`}
  \${(S.atouts ?? []).length > 0 && html\`<section class="max-w-6xl mx-auto px-5 py-16"><h2 class="text-3xl font-bold text-center">Ce que \${S.nom} va faire pour toi</h2><div class="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">\${S.atouts.map((a) => html\`<div class="rounded-2xl border border-slate-200 p-5"><p class="font-semibold">\${a.titre}</p><p class="mt-1 text-sm text-slate-500">\${a.texte}</p></div>\`)}</div></section>\`}
  \${f.length > 0 && PAY.actif && html\`<section class="bg-slate-50 py-16"><div class="max-w-5xl mx-auto px-5"><h2 class="text-3xl font-bold text-center">Réserve ton prix de lancement</h2><p class="mt-2 text-center text-slate-500">\${UNIQUE ? "Paiement unique, accès à vie." : "Tu paies ton premier mois aujourd'hui, avec la remise des premiers clients."}</p>
    <div class=\${"mt-10 grid gap-4 " + (f.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2")}>\${f.map((x, i) => html\`<div class="rounded-2xl p-5 border bg-white border-slate-200"><p class="font-semibold">\${x.nom}</p><p class="mt-1"><span class="text-3xl font-extrabold">\${fmt.eur(reduit(x.prix))}</span>\${remise ? html\` <span class="text-slate-400 line-through">\${fmt.eur(x.prix)}</span>\` : ""}<span class="text-sm text-slate-400">\${UNIQUE ? " une fois" : " le 1er mois"}</span></p><p class="text-sm text-slate-500">\${x.pour}</p><ul class="mt-3 space-y-1.5 text-sm">\${(x.inclus ?? []).map((t) => html\`<li class="flex gap-2"><span class="text-[var(--c)]"><\${Icone} nom="check" class="w-4 h-4"/></span>\${t}</li>\`)}</ul><\${ui.Button} class="w-full mt-5" disabled=\${busy !== null} onClick=\${() => precommander(i)}>\${busy === i ? "Redirection…" : "Précommander"}</\${ui.Button}></div>\`)}</div></div></section>\`}
  <footer class="max-w-6xl mx-auto px-5 py-10 text-sm text-slate-400 flex justify-between"><span>© \${new Date().getFullYear()} \${S.nom}</span><span>Construit avec Bingoo!</span></footer></div>\`;
}

// ---------------------------------------------------------------- Abonnement
function Formules({ courante }) {
  const [busy, setBusy] = useState(null), f = S.formules ?? [];
  const payer = async (i) => { setBusy(i); try { allerVers((await call("checkout", { formule: i, retour: RETOUR() })).url); } catch (x) { toast(x.message, "bad"); setBusy(null); } };
  return html\`<div class=\${"grid gap-4 " + (f.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2")}>\${f.map((x, i) => html\`<div class=\${cls("rounded-2xl p-5 border bg-white", courante === x.nom ? "border-[var(--c)] ring-2 ring-[var(--c)]/20" : "border-slate-200")}><p class="font-semibold">\${x.nom}</p><p class="mt-1 text-3xl font-extrabold">\${fmt.eur(prixDe(x.prix))}<span class="text-sm font-normal text-slate-400">\${UNIQUE ? " une fois" : " /mois"}</span></p><p class="text-sm text-slate-500">\${x.pour}</p><ul class="mt-3 space-y-1.5 text-sm">\${(x.inclus ?? []).map((t) => html\`<li class="flex gap-2"><span class="text-[var(--c)]"><\${Icone} nom="check" class="w-4 h-4"/></span>\${t}</li>\`)}</ul><\${ui.Button} class="w-full mt-5" disabled=\${busy !== null || courante === x.nom} onClick=\${() => payer(i)}>\${courante === x.nom ? "Ta formule" : busy === i ? "Redirection…" : "Choisir"}</\${ui.Button}></div>\`)}</div>\`;
}
const jours = (iso) => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 864e5));
function Abonnement({ etat }) {
  const ab = etat.abonnement, actif = ["active", "trialing", "past_due"].includes(ab?.statut);
  const [busy, setBusy] = useState(false);
  const portail = async () => { setBusy(true); try { allerVers((await call("portail", { retour: RETOUR() })).url); } catch (x) { toast(x.message, "bad"); setBusy(false); } };
  if (UNIQUE) return html\`<\${ui.Page} titre="Mon accès" sous=\${actif ? "Accès à vie" + (ab.formule ? " · " + ab.formule : "") : etat.acces ? "Essai gratuit : " + jours(etat.essai_fin) + " jour(s) restant(s)" : "Ton essai est terminé"}>\${!actif && html\`<\${Formules} courante=\${null}/>\`}\${actif && html\`<p class="text-slate-600">Merci ! Ton accès est débloqué pour toujours.</p>\`}<p class="mt-4 text-xs text-slate-400">Paiement unique et sécurisé par Stripe : pas d'abonnement, rien à résilier.</p></\${ui.Page}>\`;
  return html\`<\${ui.Page} titre="Mon abonnement" sous=\${actif ? "Formule " + (ab.formule ?? "") + (ab.fin_periode ? (ab.annule ? " · se termine le " : " · prochain paiement le ") + fmt.date(ab.fin_periode) : "") : etat.acces ? "Essai gratuit : " + jours(etat.essai_fin) + " jour(s) restant(s)" : "Ton essai est terminé"}>
    \${ab?.statut === "past_due" && html\`<div class="mb-4 rounded-xl bg-amber-50 text-amber-800 px-4 py-3 text-sm">Le dernier paiement n'est pas passé : mets à jour ta carte pour garder l'accès.</div>\`}
    \${actif && html\`<div class="mb-6"><\${ui.Button} variant="secondary" icone="carte" disabled=\${busy} onClick=\${portail}>Factures, carte et résiliation</\${ui.Button}></div>\`}
    <\${Formules} courante=\${actif ? ab.formule : null}/>
    <p class="mt-4 text-xs text-slate-400">Paiement sécurisé par Stripe. Sans engagement : tu peux résilier à tout moment.</p>
  </\${ui.Page}>\`;
}
function Paywall({ etat, onLogout }) {
  return html\`<div class="min-h-screen bg-slate-50 p-5 sm:p-10"><div class="max-w-4xl mx-auto"><div class="flex items-center justify-between mb-8"><div class="flex items-center gap-2 font-bold"><span class="w-8 h-8 rounded-xl bg-[var(--c)] text-white grid place-items-center">\${(S.nom ?? "S")[0]}</span>\${S.nom}</div><\${ui.Button} variant="ghost" icone="sortie" onClick=\${onLogout}>Se déconnecter</\${ui.Button}></div>
    <h1 class="text-3xl font-extrabold tracking-tight">Ton essai est terminé</h1><p class="text-slate-500 mt-1 mb-8">Tes données t'attendent : choisis une formule pour continuer à utiliser \${S.nom}.</p>
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
  return html\`<\${ui.Page} titre="Équipe" sous=\${d ? membres.length + " membre" + (membres.length > 1 ? "s" : "") + (d.places != null ? " sur " + d.places + " place" + (d.places > 1 ? "s" : "") + " de ta formule" : "") : ""}>
    \${admin && html\`<\${ui.Card} class="mb-4" titre="Inviter quelqu'un">
      <form onSubmit=\${inviter} class="grid sm:grid-cols-[1fr_180px_auto] gap-2 items-end">
        <\${ui.Input} label="E-mail (facultatif : sinon, un lien à envoyer toi-même)" type="email" value=\${f.email} onInput=\${(v) => setF({ ...f, email: v })} placeholder="camille@entreprise.fr"/>
        <\${ui.Select} label="Rôle" value=\${f.role} onChange=\${(v) => setF({ ...f, role: v })} options=\${[["membre", "Membre"], ["lecture", "Lecture seule"], ["admin", "Administrateur"]]}/>
        <\${ui.Button} type="submit" icone="plus" disabled=\${busy}>\${f.email ? "Envoyer l'invitation" : "Créer un lien"}</\${ui.Button}>
      </form>
      \${lien && html\`<div class="mt-3 flex gap-2"><input readonly value=\${lien} class="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50" onFocus=\${(e) => e.target.select()}/><\${ui.Button} variant="secondary" onClick=\${() => { try { navigator.clipboard.writeText(lien); toast("Lien copié"); } catch (e) { toast("Sélectionne le lien pour le copier"); } }}>Copier</\${ui.Button}></div><p class="text-xs text-slate-500 mt-1">Lien à usage unique, valable 14 jours.</p>\`}
      <p class="text-xs text-slate-500 mt-3"><b>Membre</b> : voit et modifie tout. <b>Lecture seule</b> : voit tout, ne modifie rien. <b>Administrateur</b> : invite, gère l'équipe et l'abonnement.</p>
    </\${ui.Card}>\`}
    \${admin && (d?.invitations ?? []).length > 0 && html\`<\${ui.Card} class="mb-4" titre="Invitations en attente">\${d.invitations.map((i) => html\`<div class="flex items-center justify-between gap-3 py-2 border-t border-slate-100 first:border-0 text-sm"><span>\${i.email || "Lien d'invitation"} · <\${ui.Badge}>\${ROLE_TXT[i.role] ?? i.role}</\${ui.Badge}> <span class="text-slate-400">\${fmt.date(i.at)}</span></span><\${ui.Button} variant="ghost" onClick=\${() => act("revoquer", { code: i.code }, "Invitation annulée")}>Annuler</\${ui.Button}></div>\`)}</\${ui.Card}>\`}
    <\${ui.Card}>\${d === null ? html\`<\${ui.Loading}/>\` : html\`<\${ui.Table} colonnes=\${[
      { cle: "nom", label: "Nom", rendu: (x) => html\`<span class="font-medium">\${x.nom}</span>\${x.moi ? html\` <\${ui.Badge}>toi</\${ui.Badge}>\` : null}\${x.titulaire ? html\` <\${ui.Badge} couleur="violet">titulaire</\${ui.Badge}>\` : null}\` },
      { cle: "email", label: "E-mail" },
      { cle: "role", label: "Rôle", rendu: (x) => admin && !x.titulaire ? html\`<select class="rounded-lg border border-slate-200 px-2 py-1 text-sm" value=\${x.role} onChange=\${(e) => act("role", { id: x.id, role: e.target.value }, "Rôle modifié")}>\${["admin", "membre", "lecture"].map((r) => html\`<option value=\${r}>\${ROLE_TXT[r]}</option>\`)}</select>\` : html\`<\${ui.Badge} couleur=\${x.role === "admin" ? "violet" : x.role === "lecture" ? "gris" : "bleu"}>\${ROLE_TXT[x.role] ?? x.role}</\${ui.Badge}>\` },
      { cle: "vu_at", label: "Dernière visite", rendu: (x) => fmt.date(x.vu_at) },
      { cle: "id", label: "", rendu: (x) => admin && !x.titulaire && !x.moi ? html\`<\${ui.Button} variant="ghost" onClick=\${() => confirm("Retirer " + x.nom + " de l'équipe ?") && act("retirer", { id: x.id }, "Membre retiré")}>Retirer</\${ui.Button}>\` : null },
    ]} lignes=\${membres}/>\`}</\${ui.Card}>
    \${d && !membres.find((m) => m.moi)?.titulaire && html\`<div class="mt-4"><\${ui.Button} variant="ghost" onClick=\${async () => { if (!confirm("Quitter l'équipe ? Tu retrouveras un espace vide, à toi.")) return; try { await call("quitter"); location.reload(); } catch (x) { toast(x.message, "bad"); } }}>Quitter l'équipe</\${ui.Button}></div>\`}
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
  </\${ui.Page}>\`;
}

// ---------------------------------------------------------------- Démo animée : l'app se présente toute seule, écran par écran
function Tour({ onFin }) {
  const [i, setI] = useState(0);
  useEffect(() => { nav(ECRANS[0]?.id); }, []);
  useEffect(() => {
    const t = setTimeout(() => { const n = (i + 1) % Math.max(1, ECRANS.length); nav(ECRANS[n]?.id); setI(n); }, 4500);
    return () => clearTimeout(t);
  }, [i]);
  const e = ECRANS[i];
  return html\`<div class="fixed top-0 inset-x-0 z-50"><div class="h-1 bg-[var(--c)]/20"><div key=\${i} class="h-1 bg-[var(--c)]" style="animation:barre 4.5s linear forwards"/></div>
    <div class="mx-auto mt-3 w-fit max-w-[calc(100vw-2rem)] flex items-center gap-3 rounded-full bg-slate-900/90 text-white pl-4 pr-1.5 py-1.5 shadow-xl text-sm">
      <span class="truncate"><b>\${i + 1}/\${ECRANS.length} · \${e?.titre}</b>\${e?.but ? " — " + e.but : ""}</span>
      <button onClick=\${onFin} class="shrink-0 rounded-full bg-[var(--c)] px-3 py-1.5 font-semibold">Essayer gratuitement</button></div></div>\`;
}

function Appli({ user, etat, onLogout, tour, onFinTour }) {
  const PRIVES = ECRANS.filter((e) => !e.public), PUBLIQUES = ECRANS.filter((e) => e.public);
  const [cur, setCur] = useState({ id: PRIVES.some((e) => e.id === B.ecran) ? B.ecran : PRIVES[0]?.id, params: null }), [menu, setMenu] = useState(false), [toasts, setToasts] = useState([]);
  nav = (id, params = null) => { if (id === "_abonnement" || id === "_equipe" || id === "_compte" || PRIVES.some((e) => e.id === id)) { setCur({ id, params }); setMenu(false); } };
  useEffect(() => bus.on("toast", (t) => { setToasts((x) => [...x, t]); setTimeout(() => setToasts((x) => x.filter((y) => y.id !== t.id)), 3000); }), []);
  const E = cur.id === "_abonnement" ? { id: "_abonnement", titre: "Mon abonnement", Comp: Abonnement } : cur.id === "_equipe" ? { id: "_equipe", titre: "Équipe", Comp: Equipe } : cur.id === "_compte" ? { id: "_compte", titre: "Mon compte", Comp: Compte } : PRIVES.find((e) => e.id === cur.id) ?? PRIVES[0];
  if (!etat.acces) return html\`<\${Paywall} etat=\${etat} onLogout=\${onLogout}/>\`;
  const lienPage = (e) => (B.retour || location.href.split("?")[0]).split("?")[0] + "?page=" + e.id + "&e=" + etat.espace;
  const Agenda = () => S.agenda?.collection ? html\`<button class="w-full text-left rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2" onClick=\${async () => { try { const u = await lienAgenda(); try { await navigator.clipboard.writeText(u); toast("Lien copié : colle-le dans Google Agenda (Autres agendas → À partir de l'URL) ou Outlook"); } catch (x) { prompt("Colle ce lien dans ton agenda (Google Agenda : Autres agendas → À partir de l'URL) :", u); } } catch (x) { toast(x.message, "bad"); } }}><\${Icone} nom="agenda" class="w-4 h-4"/>Ajouter à mon agenda</button>\` : null;
  const Partage = () => PUBLIQUES.length && etat.espace ? html\`<div class="rounded-xl bg-slate-50 p-3 text-sm"><p class="text-xs font-semibold text-slate-500 mb-1.5">À partager à tes clients</p>\${PUBLIQUES.map((e) => html\`<div class="flex items-center gap-1.5 py-1"><a href=\${lienPage(e)} target="_blank" rel="noopener" class="flex-1 truncate font-medium text-[var(--c)] hover:underline">\${e.titre} ↗</a><button title="Copier le lien" class="text-slate-400 hover:text-slate-700" onClick=\${() => { try { navigator.clipboard.writeText(lienPage(e)).then(() => toast("Lien copié"), () => prompt("Copie ce lien :", lienPage(e))); } catch (x) { prompt("Copie ce lien :", lienPage(e)); } }}>⧉</button></div>\`)}</div>\` : null;
  const Nav = () => html\`<nav class="space-y-0.5">\${[...PRIVES, { id: "_equipe", titre: "Équipe", icone: "contacts", sep: true }].map((e) => html\`<button onClick=\${() => nav(e.id)} class=\${cls("w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium", e.sep && "mt-3", e.id === E?.id ? "bg-[var(--c)]/10 text-[var(--c)]" : "text-slate-600 hover:bg-slate-100")}><\${Icone} nom=\${e.icone} class="w-[18px] h-[18px]"/>\${e.titre}</button>\`)}</nav>\`;
  return html\`<div class="min-h-screen lg:flex">
    <aside class=\${cls("bg-white border-r border-slate-200 w-60 shrink-0 p-4 flex-col gap-6 lg:flex lg:sticky lg:top-0 lg:h-screen", menu ? "flex fixed inset-y-0 left-0 z-40" : "hidden")}>
      <div class="flex items-center gap-2 font-bold"><span class="w-8 h-8 rounded-xl bg-[var(--c)] text-white grid place-items-center">\${(S.nom ?? "S")[0]}</span>\${S.nom}</div>
      <\${Nav}/>
      <\${Partage}/>
      <\${Agenda}/>
      \${etat.payant && html\`<button onClick=\${() => nav("_abonnement")} class=\${cls("mt-auto w-full text-left rounded-xl px-3 py-2.5 text-sm", E?.id === "_abonnement" ? "bg-[var(--c)]/10 text-[var(--c)]" : "bg-slate-50 hover:bg-slate-100")}><span class="flex items-center gap-2 font-medium"><\${Icone} nom="carte" class="w-4 h-4"/>Mon abonnement</span><span class="block text-xs text-slate-500 mt-0.5">\${["active", "trialing", "past_due"].includes(etat.abonnement?.statut) ? "Formule " + (etat.abonnement.formule ?? "") : "Essai : " + jours(etat.essai_fin) + " jour(s) restant(s)"}</span></button>\`}
      <div class=\${cls(etat.payant ? "" : "mt-auto", "border-t border-slate-100 pt-3 text-sm")}><button onClick=\${() => nav("_compte")} class="block w-full text-left hover:text-[var(--c)]"><p class="font-medium truncate">\${user.nom}</p></button><p class="text-slate-400 text-xs truncate">\${/@demo\\.local$/.test(user.email) ? "Compte de démonstration" : user.email}</p><button onClick=\${onLogout} class="mt-2 flex items-center gap-1.5 text-slate-500 hover:text-slate-800"><\${Icone} nom="sortie" class="w-4 h-4"/>Se déconnecter</button></div>
    </aside>
    \${menu && html\`<div class="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick=\${() => setMenu(false)}/>\`}
    <main class="flex-1 min-w-0"><div class="lg:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3"><button onClick=\${() => setMenu(true)}><\${Icone} nom="menu"/></button><span class="font-bold">\${S.nom}</span><span class="w-5"/></div>
      \${user.role === "lecture" && html\`<div class="bg-amber-50 text-amber-800 text-sm px-5 py-2">Accès en lecture seule : tu vois tout, mais tu ne peux rien modifier.</div>\`}
      <div class="max-w-6xl mx-auto p-5 sm:p-8">\${E ? html\`<\${Garde} k=\${E.id} titre=\${E.titre}><\${E.Comp} key=\${E.id + JSON.stringify(cur.params)} user=\${user} params=\${cur.params} etat=\${etat}/></\${Garde}>\` : null}</div></main>
    \${tour && html\`<\${Tour} onFin=\${onFinTour}/>\`}
    <div class="fixed bottom-4 right-4 z-50 space-y-2">\${toasts.map((t) => html\`<div class=\${cls("anim rounded-xl px-4 py-2.5 text-sm text-white shadow-lg", t.type === "bad" ? "bg-red-600" : "bg-slate-900")}>\${t.msg}</div>\`)}</div>
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
    const t = setTimeout(() => {
      const txt = document.getElementById("verif-zone")?.innerText ?? "";
      const casse = txt.includes("n'a pas pu être chargé");
      const bizarre = (/\\bNaN\\b|\\bundefined\\b|\\[object Object\\]|Invalid Date/.exec(txt) ?? [])[0];
      const erreur = VERRS[0] ?? (casse ? "L'écran ne se charge pas" : bizarre ? "Le texte affiché contient « " + bizarre + " »" : txt.trim().length < 30 ? "L'écran est presque vide" : null);
      res.current.push({ id: E.id, ok: !erreur, erreur: erreur && String(erreur).slice(0, 400) });
      VERRS.length = 0;
      setI(i + 1);
    }, 1400);
    return () => clearTimeout(t);
  }, [i]);
  return E ? html\`<div id="verif-zone" class="p-6"><\${Garde} k=\${E.id} titre=\${E.titre}><\${E.Comp} user=\${{ id: "v", nom: "Test", email: "test@exemple.fr", role: "admin" }} params=\${null} etat=\${{ acces: true }}/></\${Garde}></div>\` : null;
}
function Racine() {
  if (B.verif) return html\`<\${Verif}/>\`;
  if (PAGE) return html\`<\${PagePublique}/>\`;
  if (B.validation && !(S.ecrans ?? []).length) return html\`<\${Precommande}/>\`;
  const [etat, setEtat] = useState(undefined), [auth, setAuth] = useState(B.invite ? "signup" : null), [tour, setTour] = useState(false);
  const verifier = (force) => token ? call("me", { verifier: !!force }).then((r) => { if (r.variante) VARIANTE = r.variante; setEtat(r); }, () => setEtat(null)) : setEtat(null);
  useEffect(() => {
    if (B.tour) ouvrir("tour"); else verifier(B.retourPaiement);
    if (B.retourPaiement) setTimeout(() => toast("Merci ! Ton abonnement est activé."), 1200);
    const a = bus.on("auth", () => setEtat(null)), b = bus.on("acces", () => verifier(true));
    return () => { a(); b(); };
  }, []);
  const ok = (r) => { persist(r.token); setAuth(null); verifier(); };
  // Démo animée : compte d'essai jetable, jamais gardé (la session de la personne n'est pas touchée)
  const ouvrir = async (m) => {
    if (m === "demo" || m === "tour") {
      try { const r = await call("demo"); token = r.token; if (m === "demo") persist(r.token); setTour(m === "tour"); setEtat(undefined); await verifier(); } catch (x) { alert(x.message); setEtat(null); }
    } else setAuth(m);
  };
  const finTour = () => { setTour(false); token = null; setEtat(null); setAuth("signup"); };
  const sortir = async () => { try { await call("logout"); } catch (e) {} persist(null); setEtat(null); };
  if (etat === undefined) return html\`<\${ui.Loading}/>\`;
  if (etat) return html\`<\${Appli} user=\${etat.user} etat=\${etat} tour=\${tour} onFinTour=\${finTour} onLogout=\${tour ? finTour : sortir}/>\`;
  if (auth) return html\`<\${Auth} mode=\${auth} onDone=\${ok} onBack=\${() => setAuth(null)}/>\`;
  return html\`<\${Site} onAuth=\${ouvrir}/>\`;
}
render(html\`<\${Racine}/>\`, document.getElementById("root"));
</script></body></html>`;
}

/** Ce que l'IA doit savoir pour écrire un écran (repris dans le prompt côté serveur : garder les deux alignés). */
export const ICONES = ["accueil", "liste", "contacts", "agenda", "graphique", "reglages", "fichier", "boite", "mail", "carte", "tag", "etoile", "horloge", "panier", "message"];
