// Explorer : REA observe les pages publiques du produit dans Chrome.
const { execFile } = require("child_process");
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
function rea(args, ms = 40_000) {
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

// Résumés du contenu visible
const court = (s, n = 160) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

async function pagesProduit(t, origine) {
  // Liens internes visibles depuis l'accueil (menu, pied de page) : on garde les pages produit, tarifs, fonctionnalités
  const liens = (await evalue(t, `[...new Set([...document.querySelectorAll('a[href]')].map(a => a.href))]`)) ?? [];
  const bons = /pric|tarif|plan|feature|fonctionnal|product|produit|solution|how-it-works|comment|use-case|integrat|template|demo|faq|docs?\b|guide|aide|help/i;
  const exclus = /login|signin|sign-in|connexion|account|compte|legal|privacy|terms|cgu|cgv|cookie|blog\/|careers|jobs|press|status\.|mailto:/i;
  const pages = liens.filter((u) => { try { const x = new URL(u); return x.origin === origine && bons.test(x.pathname) && !exclus.test(u); } catch { return false; } })
    .map((u) => { const x = new URL(u); return x.origin + x.pathname; });
  const priorite = (u) => /pric|tarif/.test(new URL(u).pathname) ? 1 : 0;
  return [...new Set(pages)].sort((a, b) => priorite(b) - priorite(a)).slice(0, 6);
}

async function analyserPage(t, url) {
  const origine = new URL(url).origin;
  const page = await rea(["inspect-web-page", CDP, t, "--allowed-origins", origine, "--observation-ms", "1500", "--include-accessibility-text"]);
  // Texte visible de la page (titres, boutons, formulaires) : depuis la page elle-même, pour une lecture fiable
  const visible = await evalue(t, `(() => {
    const t = (s) => [...document.querySelectorAll(s)].map(e => (e.innerText || e.value || e.getAttribute('aria-label') || '').replace(/\\s+/g,' ').trim()).filter(Boolean);
    return { titre: document.title, h: t('h1,h2,h3').slice(0, 40), boutons: [...new Set(t('button,a[role=button],.btn,[class*=button]'))].slice(0, 40),
      formulaires: [...document.querySelectorAll('form')].slice(0, 6).map(f => [...f.querySelectorAll('input,select,textarea')].map(i => i.name || i.placeholder || i.type).filter(Boolean)),
      texte: (document.body?.innerText || '').replace(/\\s+/g,' ').slice(0, 5000) };
  })()`);
  if (page?.erreur || page?.ok === false || page?.success === false) {
    throw new Error(String(page.erreur ?? page.code ?? "Inspection REA en échec").slice(0, 200));
  }
  const resultat = page?.summary?.normalized_result ?? page?.normalized_result;
  return {
    url, titre: court(visible?.titre, 140), visible,
    accessibilite: court(JSON.stringify(resultat?.accessibility ?? resultat?.accessibility_nodes ?? ""), 4000),
  };
}

(async () => {
  const t = await onglet();
  for (let i = 0; i < MAX && Date.now() < FIN; i++) {
    const [tache] = await q(`with suivant as (
      select d.domaine from public.saas_decortique d
      where (d.statut = 'attente' or (d.statut = 'en_cours' and d.at < now() - interval '12 minutes')) and d.essais < 3
      order by exists (
        select 1 from public.saas_projets p join public.saas s on s.id = p.saas_id
        where s.domaine = d.domaine and p.statut = 'attente_analyse'
      ) desc, d.at
      limit 1 for update of d skip locked
    )
    update public.saas_decortique d set statut = 'en_cours', essais = d.essais + 1, at = now()
    from suivant where d.domaine = suivant.domaine returning d.domaine, d.at::text as prise`);
    if (!tache) break;
    const { domaine, prise } = tache;
    const bail = `domaine = ${lit(domaine)} and statut = 'en_cours' and at = ${lit(prise)}::timestamptz`;
    console.log("→", domaine);
    try {
      await ouvrir(t, `https://${domaine}/`);
      const accueil = await evalue(t, "location.href");
      if (!accueil || !accueil.startsWith("https://")) throw new Error("Page d’accueil HTTPS indisponible");
      const origine = new URL(accueil).origin;
      const autres = await pagesProduit(t, origine);
      const pages = [await analyserPage(t, accueil)];
      for (const u of autres) {
        if (Date.now() > FIN) break;
        try {
          await ouvrir(t, u);
          const cible = await evalue(t, "location.href");
          if (cible && new URL(cible).origin === origine && !pages.some((p) => p.url === cible)) {
            pages.push(await analyserPage(t, cible));
          }
        } catch (e) {
          console.log("  Page ignorée :", e.message);
        }
      }
      const releve = { outil: "REA (rea-agents 6.9.0)", origine, pages, analyse_at: new Date().toISOString() };
      await q(`update public.saas_decortique set statut = 'analyse', rea = ${lit(JSON.stringify(releve))}::jsonb, erreur = null, at = now() where ${bail}`);
      console.log("  ✓", pages.length, "pages publiques");
    } catch (e) {
      console.log("  ✗", e.message);
      await q(`update public.saas_decortique set statut = case when essais >= 3 then 'erreur' else 'attente' end,
        erreur = ${lit(String(e.message).slice(0, 300))}, at = now() where ${bail}`);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
