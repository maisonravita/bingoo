// Explorer – décortiquer : analyse REA (Reverse Engineer Anything, licence MIT, paquet npm rea-agents) des pages
// PUBLIQUES d'un SaaS demandé depuis sa fiche. Un navigateur Chrome sans fenêtre ouvre l'accueil, la page de tarifs et
// les pages produit visibles par n'importe quel visiteur ; REA observe passivement :
//  - la structure de chaque page (titres, boutons, formulaires, texte d'accessibilité) ;
//  - les routes et les points d'API devinés dans le JavaScript public (noms seulement) ;
//  - les technologies reconnues.
// Garde-fous : aucune connexion à un compte, aucun formulaire envoyé, aucune page derrière une connexion ;
// le code source des scripts n'est JAMAIS gardé (option --include-script-sources jamais utilisée) ; seuls des noms,
// des chemins et du texte visible sont retenus, puis résumés par l'IA en fonctionnalités et en parcours.
const { execFile } = require("child_process");
const fs = require("fs");
const TOK = process.env.SUPABASE_ACCESS_TOKEN, REF = "fbsjbnnmzazylmquzryo";
const CDP = "http://127.0.0.1:9222", MAX = Number(process.env.MAX || 6), FIN = Date.now() + Number(process.env.MINUTES || 25) * 60_000;
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
const lit = (v) => (v == null ? "null" : "'" + String(v).replace(/'/g, "''") + "'");

async function q(sql, n = 0) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json", "User-Agent": "bingoo-ci" }, body: JSON.stringify({ query: sql }) });
  if ((r.status === 429 || r.status >= 500) && n < 6) { await dormir(5000 * (n + 1)); return q(sql, n + 1); }
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

// REA en ligne de commande, sortie JSON ; une erreur REA est rendue telle quelle (jamais bloquante pour la suite)
function rea(args, ms = 240_000) {
  return new Promise((ok) => execFile("npx", ["--no-install", "rea", ...args, "--format", "json"], { timeout: ms, maxBuffer: 64 * 1024 * 1024 }, (e, out) => {
    try { ok(JSON.parse(out)); } catch { ok({ erreur: (e?.message ?? "sortie illisible").slice(0, 300) }); }
  }));
}

// Pilotage minimal du navigateur par CDP (WebSocket natif de Node 22) : ouvrir une page, lire des valeurs dans la page
async function cdp(targetId, method, params = {}) {
  const t = (await (await fetch(`${CDP}/json/list`)).json()).find((x) => x.id === targetId);
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, k) => { ws.addEventListener("open", r); ws.addEventListener("error", k); });
  const rep = new Promise((r) => ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); if (d.id === 1) r(d.result); }));
  ws.send(JSON.stringify({ id: 1, method, params }));
  const out = await Promise.race([rep, dormir(30_000).then(() => null)]); ws.close(); return out;
}
const evalue = async (t, expr) => (await cdp(t, "Runtime.evaluate", { expression: expr, returnByValue: true }))?.result?.value;
async function ouvrir(t, url) {
  await cdp(t, "Page.navigate", { url });
  for (let i = 0; i < 20; i++) { await dormir(1000); if ((await evalue(t, "document.readyState")) === "complete") break; }
  await dormir(2500); // laisse les applis en JavaScript s'afficher
}
async function onglet() {
  const t = (await (await fetch(`${CDP}/json/list`)).json()).find((x) => x.type === "page");
  return t.id;
}

// Résumés compacts des preuves REA (noms, chemins, texte visible : jamais de code)
const court = (s, n = 160) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
function items(v) { return v?.summary?.normalized_result?.items ?? v?.normalized_result?.items ?? []; }

async function pagesProduit(t, origine) {
  // Liens internes visibles depuis l'accueil (menu, pied de page) : on garde les pages produit, tarifs, fonctionnalités
  const liens = (await evalue(t, `[...new Set([...document.querySelectorAll('a[href]')].map(a => a.href))]`)) ?? [];
  const bons = /pric|tarif|plan|feature|fonctionnal|product|produit|solution|how-it-works|comment|use-case|integrat|template|why|pourquoi/i;
  const exclus = /login|signin|sign-in|connexion|account|compte|legal|privacy|terms|cgu|cgv|cookie|blog\/|careers|jobs|press|status\.|mailto:/i;
  const pages = liens.filter((u) => { try { const x = new URL(u); return x.origin === origine && bons.test(x.pathname) && !exclus.test(u); } catch { return false; } })
    .map((u) => u.split("#")[0]);
  return [...new Set(pages)].slice(0, 4);
}

async function analyserPage(t, url) {
  await ouvrir(t, url);
  const origine = new URL(url).origin;
  // Origines des scripts réellement chargés par la page (son site et ses fichiers statiques), pour que REA les lise
  const origines = (await evalue(t, `[...new Set(performance.getEntriesByType('resource').filter(e => e.initiatorType === 'script').map(e => new URL(e.name).origin))]`)) ?? [];
  const autorisees = [origine, ...origines.filter((o) => o !== origine && /^https:/.test(o))].slice(0, 6);
  const flags = autorisees.flatMap((o) => ["--allowed-origins", o]);
  const page = await rea(["inspect-web-page", CDP, t, ...flags, "--observation-ms", "1500", "--include-accessibility-text"]);
  const ev = `/tmp/rea-${Date.now()}.json`;
  const bundle = await rea(["analyze-web-bundle", CDP, t, ...flags, "--observation-ms", "1500", "--detail", "summary", "--evidence_output", ev, "--view", JSON.stringify({ kind: "web-bundle", collection: "summary" })]);
  // Vues de la preuve complète gardée sur disque : { source: preuve retenue, view } avec --evidence-bundle
  const parent = bundle?.summary?.normalized_result?.parent_evidence_id;
  const vue = async (view) => (parent && fs.existsSync(ev)) ? await rea(["inspect-analysis-view", JSON.stringify({ source: { kind: "retained-evidence", evidence_id: parent }, view }), "--evidence-bundle", ev], 60_000) : null;
  const routes = await vue({ kind: "javascript-routes", collection: "routes", limit: 80 });
  const endpoints = await vue({ kind: "web-bundle", collection: "endpoints", limit: 80 });
  const inferences = await vue({ kind: "web-bundle", collection: "inferences", limit: 60 });
  try { fs.unlinkSync(ev); } catch { /* déjà absent */ }
  // Texte visible de la page (titres, boutons, formulaires) : depuis la page elle-même, pour une lecture fiable
  const visible = await evalue(t, `(() => {
    const t = (s) => [...document.querySelectorAll(s)].map(e => (e.innerText || e.value || e.getAttribute('aria-label') || '').replace(/\\s+/g,' ').trim()).filter(Boolean);
    return { titre: document.title, h: t('h1,h2,h3').slice(0, 40), boutons: [...new Set(t('button,a[role=button],.btn,[class*=button]'))].slice(0, 40),
      formulaires: [...document.querySelectorAll('form')].slice(0, 6).map(f => [...f.querySelectorAll('input,select,textarea')].map(i => i.name || i.placeholder || i.type).filter(Boolean)),
      texte: (document.body?.innerText || '').replace(/\\s+/g,' ').slice(0, 5000) };
  })()`);
  const nr = bundle?.summary?.normalized_result ?? bundle?.normalized_result ?? {};
  return {
    url, titre: court(visible?.titre, 140), visible,
    rea: {
      scripts: nr?.summary?.scripts_analyzed ?? null, compte: nr?.summary?.counts ?? null,
      routes: items(routes).map((x) => court(x.path ?? x.route ?? x.value ?? x.pattern ?? JSON.stringify(x), 120)).slice(0, 80),
      api: items(endpoints).map((x) => court([x.method, x.path ?? x.url ?? x.value].filter(Boolean).join(" "), 140)).slice(0, 80),
      techno: items(inferences).map((x) => court(x.name ?? x.vendor ?? x.kind ?? JSON.stringify(x), 100)).slice(0, 60),
      erreurs: [page?.erreur, bundle?.erreur ?? bundle?.code].filter(Boolean),
    },
    accessibilite: court(JSON.stringify(page?.normalized_result?.accessibility ?? page?.normalized_result?.accessibility_nodes ?? "").slice(0, 4000), 4000),
  };
}

(async () => {
  const lot = await q(`update public.saas_decortique set statut = 'en_cours', essais = essais + 1, at = now()
    where domaine in (select domaine from public.saas_decortique where (statut = 'attente' or (statut = 'en_cours' and at < now() - interval '40 minutes')) and essais < 3 order by at limit ${MAX})
    returning domaine`);
  if (!lot.length) { console.log("Rien à décortiquer"); return; }
  const t = await onglet();
  for (const { domaine } of lot) {
    if (Date.now() > FIN) break;
    console.log("→", domaine);
    try {
      const accueil = `https://${domaine}/`;
      await ouvrir(t, accueil);
      const origine = (await evalue(t, "location.origin")) || `https://${domaine}`;
      const autres = await pagesProduit(t, origine);
      const pages = [await analyserPage(t, accueil)];
      for (const u of autres) { if (Date.now() > FIN) break; pages.push(await analyserPage(t, u)); }
      const rea = { outil: "REA (rea-agents 6.9.0)", origine, pages, analyse_at: new Date().toISOString() };
      const json = JSON.stringify(rea).slice(0, 180_000);
      await q(`update public.saas_decortique set statut = 'analyse', rea = ${lit(json)}::jsonb, erreur = null, at = now() where domaine = ${lit(domaine)}`);
      console.log("  ✓", pages.length, "pages,", pages.reduce((n, p) => n + (p.rea.routes.length + p.rea.api.length), 0), "routes et points d'API");
    } catch (e) {
      console.log("  ✗", e.message);
      await q(`update public.saas_decortique set statut = case when essais >= 3 then 'erreur' else 'attente' end, erreur = ${lit(String(e.message).slice(0, 300))} where domaine = ${lit(domaine)}`);
    }
  }
  // Synthèse en français par l'IA (fonction r/saas-decortiquer-synthese) : déclenchée par la tâche minute de la base
})().catch((e) => { console.error(e); process.exit(1); });
