// Explorer – tarifs : pour les SaaS dont la page de tarifs ne se lit qu'avec JavaScript, un vrai navigateur (Playwright)
// affiche la page et en garde le texte (saas.prix_rendu). La fiche est ensuite relue par la tâche de nuit (lu_at remis à vide).
const { chromium } = require("playwright");
const TOK = process.env.SUPABASE_ACCESS_TOKEN, REF = "fbsjbnnmzazylmquzryo";
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json", "User-Agent": "bingoo-ci" }, body: JSON.stringify({ query: sql }) });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
// Règles robots.txt (« User-agent: * ») : une page interdite n'est pas ouverte
async function interditPar(domaine) {
  try {
    const r = await fetch(`https://${domaine}/robots.txt`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return [];
    const out = []; let tous = false, regle = false;
    for (const brut of (await r.text()).split(/\r?\n/)) {
      const l = brut.replace(/#.*/, "").trim(); const m = l.match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
      const k = m[1].toLowerCase(), v = m[2].trim();
      if (k === "user-agent") { if (regle) { tous = false; regle = false; } if (v === "*" || /bingoo/i.test(v)) tous = true; }
      else { regle = true; if (tous && k === "disallow" && v) out.push(v.replace(/\*.*$/, "")); }
    }
    return out;
  } catch { return []; }
}
const lit = (v) => "'" + String(v).replace(/'/g, "''") + "'";
(async () => {
  const max = Number(process.env.MAX || 150);
  const rows = await q(`select id, domaine, liens->>'prix' prix from public.saas where statut = 'ok' and prix_entree_eur is null and coalesce(sur_devis, false) = false and (prix_rendu_at is null or prix_rendu_at < now() - interval '7 days') order by score_croissance desc nulls last limit ${max}`);
  console.log("à rendre :", rows.length);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: "fr-FR", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 BingooBot/1.0 (+https://kairo.maisonravita.fr/#/retrait)" });
  let ok = 0;
  for (const r of rows) {
    const interdit = await interditPar(r.domaine);
    const urls = [r.prix, `https://${r.domaine}/pricing`, `https://${r.domaine}/tarifs`, `https://${r.domaine}/fr/tarifs`].filter(Boolean)
      .filter((u) => { try { const p = new URL(u).pathname; return !interdit.some((x) => x && p.startsWith(x)); } catch { return false; } });
    let texte = "";
    for (const u of urls) {
      const p = await ctx.newPage();
      try {
        const res = await p.goto(u, { waitUntil: "domcontentloaded", timeout: 25000 });
        if (res && res.ok()) {
          await p.waitForTimeout(3500);
          texte = (await p.evaluate(() => document.body ? document.body.innerText : "")).replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").slice(0, 7000);
        }
      } catch { /* page suivante */ }
      await p.close();
      if (/(€|\$|£)\s?\d|\d[\d,.]*\s?(€|\$|£)|\/\s?mois|per month|\/mo\b|par mois|HT\s*\/|\/user/i.test(texte)) break;
      texte = "";
    }
    if (texte) { await q(`update public.saas set prix_rendu = ${lit(texte)}, prix_rendu_at = now(), lu_at = null where id = ${lit(r.id)}`); ok++; }
    else await q(`update public.saas set prix_rendu_at = now() where id = ${lit(r.id)}`);
  }
  await browser.close();
  console.log("tarifs rendus :", ok, "/", rows.length);
})().catch((e) => { console.error(e); process.exit(1); });
