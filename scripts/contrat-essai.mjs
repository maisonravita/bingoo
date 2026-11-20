// Mesure (sans IA, sans rien modifier) de l'effet du contrat de données sur les PREMIÈRES versions livrées des SaaS :
// chaque première version est vérifiée telle quelle, puis avec ses écrans passés au contrat de données ; on compare les écrans en échec.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
const TOK = process.env.SUPABASE_ACCESS_TOKEN, REF = "fbsjbnnmzazylmquzryo";
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) });
  if (!r.ok) throw new Error(`SQL ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
execFileSync("npx", ["esbuild", "src/lib/appShell.js", "--bundle", "--format=esm", "--platform=node", "--outfile=/tmp/appShell.c.mjs", "--log-level=warning"], { stdio: "inherit" });
execFileSync("npx", ["esbuild", "supabase/functions/_shared/contrat-donnees.ts", "--bundle", "--format=esm", "--platform=node", "--outfile=/tmp/contrat.c.mjs", "--log-level=warning"], { stdio: "inherit" });
const { appHtml } = await import("/tmp/appShell.c.mjs");
const { alignerCode, couvrirDemo } = await import("/tmp/contrat.c.mjs");
const versions = await q(`select distinct on (v.app_id) v.app_id, a.slug, v.version, v.spec from saas_app_versions v join saas_apps a on a.id = v.app_id where v.spec ? 'ecrans' order by v.app_id, v.version asc`);
const actuels = await q(`select id app_id, slug, 0 version, spec from saas_apps where statut = 'pret' and spec->>'famille' is not null`);
let page = "";
const srv = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(page); }).listen(0);
const port = srv.address().port;
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
async function verifier(spec, slug) {
  let res = null;
  page = appHtml({ spec, slug, api: "https://exemple.invalid/api", verif: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" });
  const p = await ctx.newPage();
  await p.exposeFunction("__resultat", (r) => { res = r; });
  await p.addInitScript(() => addEventListener("message", (e) => { if (e.data?.type === "bingoo-verif") window.__resultat(e.data); }));
  await p.goto(`http://localhost:${port}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const fin = Date.now() + 25000 + (spec?.ecrans?.length ?? 8) * 9000;
  while (!res && Date.now() < fin) await p.waitForTimeout(500);
  await ctx.close();
  return (res?.resultats ?? []).filter((r) => !r.ok);
}
let avant = 0, apres = 0, nCorr = 0;
for (const v of [...versions, ...actuels]) {
  const spec = v.spec;
  const corr = [], alertes = [];
  const spec2 = { ...spec, ecrans: (spec.ecrans ?? []).map((e) => { if (!e.code) return e; const c = alignerCode(e.code, spec); corr.push(...c.corrections.map((x) => `${e.id}: ${x}`)); alertes.push(...c.alertes.map((x) => `${e.id}: ${x}`)); return { ...e, code: c.code }; }) };
  const cv = couvrirDemo(spec2); spec2.demo = cv.demo; corr.push(...cv.ajouts.map((x) => `exemples: ${x}`));
  if (!corr.length) { console.log(`= ${v.slug} v${v.version} : rien à corriger`); continue; }
  const ko1 = await verifier(spec, v.slug);
  const ko2 = corr.length ? await verifier(spec2, v.slug) : ko1;
  avant += ko1.length; apres += ko2.length; nCorr += corr.length;
  console.log(`${ko2.length < ko1.length ? "▲" : ko2.length > ko1.length ? "▼" : "="} ${v.slug} v${v.version} : ${ko1.length} écran(s) en échec → ${ko2.length} avec le contrat`);
  for (const c of corr.slice(0, 8)) console.log(`    corrigé  ${c}`);
  for (const c of alertes.slice(0, 5)) console.log(`    alerte   ${c}`);
  for (const r of ko2.filter((r) => !ko1.some((x) => x.id === r.id))) console.log(`    ⚠ NOUVEL échec ${r.id} : ${String(r.erreur).slice(0, 160)}`);
}
await browser.close(); srv.close();
console.log(`Bilan : ${nCorr} corrections ; écrans en échec ${avant} → ${apres}`);
