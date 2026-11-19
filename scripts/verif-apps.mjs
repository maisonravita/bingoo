// Vérification des SaaS livrés, côté serveur : chaque SaaS prêt dont la version n'a pas encore été vérifiée est ouvert
// dans un vrai navigateur, écran par écran, avec ses données d'exemple. Les résultats partent à « saas-app-verif »,
// qui fait réécrire automatiquement les écrans cassés (2 essais par écran) ; la version réparée est revérifiée au passage suivant.
// Avant, la vérification n'avait lieu que si le membre ouvrait la page de son SaaS dans Bingoo! et la laissait ouverte.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";

const TOK = process.env.SUPABASE_ACCESS_TOKEN, REF = "fbsjbnnmzazylmquzryo";
const MAX = Number(process.env.MAX || 15), SLUG = process.env.SLUG || "", BLANC = process.env.BLANC === "1";
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) });
  if (!r.ok) throw new Error(`SQL ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
const lit = (v) => "'" + String(v).replace(/'/g, "''") + "'";

// La coque des SaaS (src/lib/appShell.js) est regroupée en un module importable par Node
execFileSync("npx", ["esbuild", "src/lib/appShell.js", "--bundle", "--format=esm", "--platform=node", "--outfile=/tmp/appShell.verif.mjs", "--log-level=warning"], { stdio: "inherit" });
const { appHtml } = await import("/tmp/appShell.verif.mjs");
execFileSync("npx", ["esbuild", "supabase/functions/_shared/familles.ts", "--bundle", "--format=esm", "--platform=node", "--outfile=/tmp/familles.verif.mjs", "--log-level=warning"], { stdio: "inherit" });
const { FAMILLES } = await import("/tmp/familles.verif.mjs");

// Contrôle de fidélité (sans IA) : le SaaS ressemble-t-il à sa famille de logiciel, ou à un logiciel de gestion habillé ?
// Seulement pour les SaaS conçus avec une famille (les plus anciens ne sont pas concernés). Chaque écart part en réparation avec sa consigne.
const SIGNATURE = {
  edition: [/ui\.(Editeur|Toile|ConstructeurFormulaire|EditeurVitrine)\b/, "le vrai espace de création du produit : un éditeur de documents (ui.Editeur), une toile de création graphique (ui.Toile) ou un constructeur de formulaires (ui.ConstructeurFormulaire), selon ce que fait le produit d'origine"],
  ia: [/ui\.Chat|\bia\(/, "l'interaction IA du produit (ui.Chat pour une conversation, ou une grande zone de saisie avec un résultat généré par ia())"],
  projets: [/ui\.(Kanban|Tableau)\b/, "un tableau de colonnes personnalisables et de cartes déplaçables (ui.Kanban avec les colonnes du tableau ouvert)"],
  communaute: [/ui\.Fil/, "un fil de publications des membres (ui.Fil) avec une zone pour publier"],
  contenu: [/ui\.(Galerie|EditeurVitrine|Vitrine)\b/, "une galerie de cartes (ui.Galerie) avec recherche et filtres"],
  reservation: [/ui\.Calendrier|ui\.Creneaux/, "un vrai calendrier des réservations (ui.Calendrier)"],
};
function fidelite(spec) {
  const f = spec?.famille, F = FAMILLES[f]; if (!F) return {};
  const ecrans = (spec.ecrans ?? []).filter((e) => !e.public && e.code), out = {};
  const ref = spec.nature?.espace_principal ? ` L'espace principal du produit d'origine : ${spec.nature.espace_principal}.` : "";
  const premier = ecrans[0];
  if (premier && !["gestion", "analyse"].includes(f)) {
    const stats = (premier.code.match(/ui\.Stat\b/g) ?? []).length;
    if (/tableau de bord/i.test(premier.titre ?? "") || /ui\.Table\b/.test(premier.code) || stats >= 3)
      out[premier.id] = `Fidélité : cet écran d'accueil ressemble à un logiciel de gestion (tableau ou rangée d'indicateurs). Pour un logiciel de la famille « ${F.label} », le premier écran est : ${F.accueil}.${ref} Réécris-le comme cet espace principal, sans ui.Table ni rangée de ui.Stat, et change son titre s'il dit « Tableau de bord ».`;
  }
  const sig = SIGNATURE[f];
  if (sig && !ecrans.some((e) => sig[0].test(e.code)) && premier && !out[premier.id])
    out[premier.id] = `Fidélité : il manque ce qui définit un logiciel de la famille « ${F.label} » : ${sig[1]}.${ref} Ajoute-le à cet écran, il doit vraiment fonctionner et enregistrer ses données.`;
  for (const e of ecrans.slice(1)) if (!["gestion", "analyse", "crm", "reservation"].includes(f) && /ui\.Table\b/.test(e.code) && !out[e.id])
    out[e.id] = `Fidélité : un tableau de données n'a pas sa place dans un logiciel de la famille « ${F.label} ». Remplace ui.Table par les composants de la famille (${F.guide.split("\n")[1]?.slice(2, 220) ?? ""}).`;
  return out;
}

const apps = await q(`select id, workspace_id, slug, version, spec from saas_apps where statut = 'pret'
  ${SLUG ? `and slug = ${lit(SLUG)}` : BLANC ? "" : `and (verif is null or coalesce((verif->>'version')::int, -1) <> version) and maj < now() - interval '1 minute'`}
  order by maj desc limit ${MAX}`);
console.log(apps.length, "SaaS à vérifier");
if (!apps.length) process.exit(0);

// Petit serveur local : la page de chaque SaaS est servie depuis une vraie adresse (les modules ES en ont besoin)
let page = "";
const srv = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(page); }).listen(0);
const port = srv.address().port;
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
let total = 0, casses = 0;
for (const a of apps) {
  const t0 = Date.now();
  let resultats = null;
  try {
    page = appHtml({ spec: a.spec, slug: a.slug, api: "https://exemple.invalid/api", verif: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" });
    const p = await ctx.newPage();
    await p.exposeFunction("__resultat", (r) => { resultats = r; });
    await p.addInitScript(() => addEventListener("message", (e) => { if (e.data?.type === "bingoo-verif") window.__resultat(e.data); }));
    await p.goto(`http://localhost:${port}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const fin = Date.now() + 25000 + (a.spec?.ecrans?.length ?? 8) * 2500;
    while (!resultats && Date.now() < fin) await p.waitForTimeout(500);
    await ctx.close();
  } catch (e) { console.log("  page impossible à ouvrir :", String(e?.message ?? e).slice(0, 200)); }
  if (!resultats) { console.log(`✗ ${a.slug} : la vérification n'a pas abouti (coque qui ne démarre pas)`); casses++; continue; }
  // Un écran qui s'affiche bien mais trahit sa famille est aussi à reprendre
  const fid = fidelite(a.spec);
  resultats.resultats = resultats.resultats.map((r) => r.ok && fid[r.id] ? { ...r, ok: false, erreur: fid[r.id] } : r);
  const ko = resultats.resultats.filter((r) => !r.ok);
  total++; if (ko.length) casses++;
  console.log(`${ko.length ? "✗" : "✓"} ${a.slug} (${a.spec?.nom}) : ${resultats.resultats.length - ko.length}/${resultats.ecrans} écrans bons en ${Math.round((Date.now() - t0) / 1000)} s`);
  for (const r of ko) console.log(`    - ${r.id} : ${String(r.erreur ?? "").slice(0, 220)}`);
  // Envoi à Bingoo! (clé interne lue dans la base, jamais affichée) : enregistre le résultat et lance la réparation
  if (BLANC) continue;
  const corps = JSON.stringify({ workspace_id: a.workspace_id, app_id: a.id, resultats: resultats.resultats });
  await q(`select net.http_post(url := 'https://${REF}.supabase.co/functions/v1/r/saas-app-verif', body := ${lit(corps)}::jsonb,
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-key', (select value from app_secrets where name = 'cron_key')), timeout_milliseconds := 60000)`);
}
await browser.close(); srv.close();
console.log(`Bilan : ${total} SaaS vérifiés, ${casses} avec au moins un écran à réparer`);
fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY || "/dev/null", `${total} SaaS vérifiés, ${casses} à réparer\n`);
